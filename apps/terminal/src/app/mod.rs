//! One connected terminal: a stack of screens and the keys driving them.
//! No I/O happens here; the connection feeds keys in and drains output.

mod adjust_stock;
mod command;
mod display_part;
mod menu;
mod screen;
#[cfg(test)]
mod tests;
mod work_with_parts;

pub use screen::Ctx;
use screen::{Action, Nav, Screen};

use crate::net::Key;
use crate::ui::layout::legend;
use crate::ui::{Canvas, Field, Form, Size, Style, move_to};

const MIN_SIZE: Size = Size { cols: 20, rows: 14 };
const MAX_SIZE: Size = Size {
    cols: 132,
    rows: 60,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Control {
    Continue,
    /// Signed off: send the remaining output and hang up.
    Close,
}

struct Page {
    screen: Box<dyn Screen>,
    form: Form,
    /// Fields from the last paint, in tab order.
    fields: Vec<Field>,
    /// Text of the last paint, for tests.
    lines: Vec<String>,
}

impl Page {
    /// The focused field, else the first.
    fn focused(&self) -> Option<&Field> {
        self.fields
            .iter()
            .find(|f| self.form.focused.as_deref() == Some(f.name.as_str()))
            .or(self.fields.first())
    }
}

fn clamp(size: Size) -> Size {
    Size {
        cols: size.cols.clamp(MIN_SIZE.cols, MAX_SIZE.cols),
        rows: size.rows.clamp(MIN_SIZE.rows, MAX_SIZE.rows),
    }
}

/// Shows a failed database call on the message line.
fn report(form: &mut Form, err: &rusqlite::Error) {
    eprintln!("{err}");
    form.error(err.to_string());
}

pub struct App<'a> {
    ctx: Ctx<'a>,
    size: Size,
    stack: Vec<Page>,
    out: String,
    ended: bool,
}

impl<'a> App<'a> {
    pub fn new(ctx: Ctx<'a>, size: Size) -> Self {
        Self {
            ctx,
            size: clamp(size),
            stack: Vec::new(),
            out: String::new(),
            ended: false,
        }
    }

    pub fn start(&mut self) {
        self.push(Box::new(menu::Menu));
        self.paint();
    }

    /// Output produced since the last call.
    pub fn take_output(&mut self) -> Vec<u8> {
        std::mem::take(&mut self.out).into_bytes()
    }

    pub fn resize(&mut self, size: Size) {
        if size.cols == 0 || size.rows == 0 {
            return;
        }
        let size = clamp(size);
        if size != self.size {
            self.size = size;
            if !self.stack.is_empty() {
                self.paint();
            }
        }
    }

    /// The current screen as plain text.
    #[cfg(test)]
    pub fn lines(&self) -> &[String] {
        self.stack.last().map_or(&[], |p| &p.lines)
    }

    pub fn key(&mut self, key: Key) -> Control {
        if self.ended {
            return Control::Close;
        }
        match key {
            Key::Char(ch) => self.type_char(ch),
            Key::Backspace => {
                self.edit_focused(|_, value| {
                    value.pop();
                    true
                });
            }
            Key::Tab | Key::Down => self.move_focus(true),
            Key::BackTab | Key::Up => self.move_focus(false),
            Key::Enter => return self.act(Action::Enter),
            Key::F(n) => return self.act(Action::F(n)),
            Key::PageUp => return self.act(Action::F(7)),
            Key::PageDown => return self.act(Action::F(8)),
            Key::Escape => return self.act(Action::F(2)),
            Key::Redraw => self.paint(),
            Key::Left | Key::Right => {}
        }
        Control::Continue
    }

    fn top(&mut self) -> &mut Page {
        self.stack
            .last_mut()
            .expect("the menu is always on the stack")
    }

    fn type_char(&mut self, ch: char) {
        let typed = self.edit_focused(|f, value| {
            let ch = if f.upper { ch.to_ascii_uppercase() } else { ch };
            // A one-character field (a choice like R/I/C) is overtyped.
            let ok = if f.max == 1 {
                f.accepts("", ch)
            } else {
                f.accepts(value, ch)
            };
            if ok && f.max == 1 {
                value.clear();
            }
            if ok {
                value.push(ch);
            }
            ok
        });
        if !typed {
            self.out.push('\x07');
        }
    }

    /// Edits the focused field's value and echoes it. False (nothing
    /// echoed) when there's no field or `edit` refuses.
    fn edit_focused(&mut self, edit: impl FnOnce(&Field, &mut String) -> bool) -> bool {
        let page = self
            .stack
            .last_mut()
            .expect("the menu is always on the stack");
        let Some(field) = page.focused().cloned() else {
            return false;
        };
        let value = page.form.value_mut(&field.name);
        if !edit(&field, value) {
            return false;
        }
        self.out.push_str(&field.paint(value));
        true
    }

    fn move_focus(&mut self, forward: bool) {
        let page = self
            .stack
            .last_mut()
            .expect("the menu is always on the stack");
        let Some(current) = page.focused() else {
            return;
        };
        let n = page.fields.len();
        let i = page.fields.iter().position(|f| f == current).unwrap_or(0);
        let next = page.fields[if forward {
            (i + 1) % n
        } else {
            (i + n - 1) % n
        }]
        .clone();
        page.form.focus(&next.name);
        self.out
            .push_str(&move_to(next.cursor(page.form.get(&next.name))));
    }

    fn act(&mut self, action: Action) -> Control {
        let ctx = self.ctx;
        let depth = self.stack.len();
        self.top().form.message = None;

        let result = match action {
            // F3 = Exit: back to the menu, or sign off from it.
            Action::F(3) if depth == 1 => Ok(Some(Nav::SignOff)),
            Action::F(3) => {
                self.stack.truncate(1);
                let page = self.top();
                page.screen.resume(&ctx, &mut page.form).map(|()| None)
            }
            // F2 = Cancel (the MC9090 stops at F10); F12 kept for desktops.
            Action::F(2 | 12) => Ok((depth > 1).then_some(Nav::Pop(None))),
            _ => {
                let page = self.top();
                page.screen.handle(action, &ctx, &mut page.form)
            }
        };

        match result {
            Ok(Some(Nav::SignOff)) => return self.sign_off(),
            Ok(Some(Nav::Push(screen))) => self.push(screen),
            Ok(Some(Nav::Pop(info))) => {
                self.stack.pop();
                let page = self.top();
                if let Err(err) = page.screen.resume(&ctx, &mut page.form) {
                    report(&mut page.form, &err);
                } else if let Some(info) = info {
                    page.form.info(info);
                }
            }
            Ok(None) => {}
            Err(err) => report(&mut self.top().form, &err),
        }
        self.paint();
        Control::Continue
    }

    fn push(&mut self, mut screen: Box<dyn Screen>) {
        let mut form = Form::default();
        if let Err(err) = screen.init(&self.ctx, &mut form) {
            report(&mut form, &err);
        }
        self.stack.push(Page {
            screen,
            form,
            fields: Vec::new(),
            lines: Vec::new(),
        });
    }

    fn sign_off(&mut self) -> Control {
        self.ended = true;
        self.out
            .push_str("\x1b[0m\x1b[2J\x1b[H\x1b[?25hSigned off.\r\n");
        Control::Close
    }

    fn paint(&mut self) {
        let ctx = self.ctx;
        let size = self.size;
        let page = self
            .stack
            .last_mut()
            .expect("the menu is always on the stack");

        let mut c = Canvas::new(size);
        page.screen.draw(&mut c, &ctx);
        c.fill(&page.form);
        if let Some(m) = &page.form.message {
            c.text(size.rows - 2, 0, &m.text, Style::High);
        }
        c.text(
            size.rows - 1,
            0,
            &legend(page.screen.keys(), size.cols - 1),
            Style::Normal,
        );
        page.fields = c.fields().to_vec();

        let focus = page
            .focused()
            .map(|f| (f.name.clone(), f.cursor(page.form.get(&f.name))));
        let cursor = focus.map(|(name, pos)| {
            page.form.focus(&name);
            pos
        });
        if page.form.message.as_ref().is_some_and(|m| m.error) {
            self.out.push('\x07');
        }
        self.out.push_str(&c.render(cursor));
        page.lines = c.lines();
    }
}
