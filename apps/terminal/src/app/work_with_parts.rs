use super::adjust_stock::AdjustStock;
use super::display_part::DisplayPart;
use super::screen::{Action, Ctx, Nav, Outcome, Screen};
use crate::store::{self, PartCode, PartSummary, Store};
use crate::ui::layout::{header, leader};
use crate::ui::{Canvas, Field, Form, Style};

/// WRKPRT: searchable, paged part list with 2=Adjust / 5=Display options.
pub struct WorkWithParts {
    query: String,
    parts: Vec<PartSummary>,
    /// Index of the first part shown.
    top: usize,
    /// Parts per page at the last draw; paging moves by this much.
    page_size: usize,
}

fn option_field(code: &PartCode) -> String {
    format!("opt_{code}")
}

impl WorkWithParts {
    pub fn new(store: &Store, query: String) -> store::Result<Self> {
        let mut screen = Self {
            query,
            parts: Vec::new(),
            top: 0,
            page_size: 1,
        };
        screen.load(store)?;
        Ok(screen)
    }

    fn load(&mut self, store: &Store) -> store::Result<()> {
        // A scanned label searches by its code, not the whole URL.
        let search = match self.query.parse::<PartCode>() {
            Ok(code) => code.to_string(),
            Err(_) => self.query.clone(),
        };
        self.parts = store.search(&search)?;
        self.top = 0;
        Ok(())
    }

    fn page(&self) -> &[PartSummary] {
        let end = (self.top + self.page_size).min(self.parts.len());
        &self.parts[self.top.min(end)..end]
    }

    fn clear_options(&self, form: &mut Form) {
        for p in &self.parts {
            form.set(&option_field(&p.code), "");
        }
    }

    fn enter(&mut self, ctx: &Ctx, form: &mut Form) -> Outcome {
        let chosen = self.page().iter().find_map(|p| {
            let opt = form.get(&option_field(&p.code)).trim();
            (!opt.is_empty()).then(|| (p.code.clone(), opt.to_owned()))
        });
        if let Some((code, opt)) = chosen {
            form.focus(&option_field(&code));
            let screen = match opt.as_str() {
                "2" => Nav::push(AdjustStock::new(Some(code))),
                "5" => Nav::push(DisplayPart::new(ctx.store, Some(code))?),
                _ => {
                    form.error(format!("Option {opt} not valid."));
                    return Ok(None);
                }
            };
            self.clear_options(form);
            return Ok(Some(screen));
        }

        let search = form.get("search").trim().to_owned();
        if search != self.query {
            self.query = search;
            self.load(ctx.store)?;
            if self.parts.is_empty() {
                form.info("No parts match.");
            }
        }
        Ok(None)
    }
}

impl Screen for WorkWithParts {
    fn keys(&self) -> &'static [&'static str] {
        &["F3=Exit", "F2=Cancel", "F5=Refresh"]
    }

    fn init(&mut self, _ctx: &Ctx, form: &mut Form) -> store::Result<()> {
        // Cursor starts in Search so a scan never lands in an option field.
        form.set("search", self.query.as_str());
        form.focus("search");
        Ok(())
    }

    fn resume(&mut self, ctx: &Ctx, _form: &mut Form) -> store::Result<()> {
        let top = self.top;
        self.load(ctx.store)?;
        self.top = top.min(self.parts.len().saturating_sub(1));
        Ok(())
    }

    fn draw(&mut self, c: &mut Canvas, ctx: &Ctx) {
        let narrow = c.narrow();
        let (cols, rows) = (c.cols(), c.rows());
        let title = if narrow {
            "WORK WITH PARTS"
        } else {
            "Work with Parts"
        };
        header(c, "WRKPRT", title, ctx.system_name);

        let (list_top, per_part) = if narrow {
            c.text(2, 0, "Search", Style::Normal);
            c.field(Field::new("search", 2, 7, cols - 8).max(80));
            c.text(3, 0, "2=Adjust 5=Display", Style::Normal);
            let heading = format!("{:<w$}OnHand", "O Code", w = cols - 6);
            c.text(4, 0, &heading, Style::Head);
            (5, 2)
        } else {
            c.text(2, 0, &leader("Search", 24), Style::Normal);
            c.field(Field::new("search", 2, 24, (cols - 25).min(30)).max(80));
            c.text(4, 0, "Type options, press Enter.", Style::Normal);
            c.text(5, 2, "2=Adjust stock   5=Display", Style::Normal);
            let heading = format!(
                "{:<w$}On hand",
                "Opt  Code         Description",
                w = cols - 8
            );
            c.text(7, 0, &heading, Style::Head);
            (8, 1)
        };
        self.page_size = ((rows - 3 - list_top) / per_part).max(1);

        if self.parts.is_empty() {
            c.text(
                list_top,
                if narrow { 2 } else { 5 },
                "(No parts found)",
                Style::Normal,
            );
            return;
        }
        for (i, p) in self.page().iter().enumerate() {
            let row = list_top + i * per_part;
            let on_hand = p.on_hand.to_string();
            let code = p.code.as_str();
            if narrow {
                c.field(Field::new(option_field(&p.code), row, 0, 1));
                c.text(row, 2, code, Style::Normal);
                c.right(row, &on_hand, Style::Normal);
                c.text(row + 1, 2, &p.name, Style::Normal);
            } else {
                c.field(Field::new(option_field(&p.code), row, 1, 1));
                c.text(row, 5, code, Style::Normal);
                let name: String = p.name.chars().take(cols - 18 - 9).collect();
                c.text(row, 18, &name, Style::Normal);
                c.right(row, &on_hand, Style::Normal);
            }
        }
        let more = self.top + self.page_size < self.parts.len();
        c.right(
            rows - 3,
            if more { "More..." } else { "Bottom" },
            Style::Normal,
        );
    }

    fn handle(&mut self, action: Action, ctx: &Ctx, form: &mut Form) -> Outcome {
        match action {
            Action::Enter => return self.enter(ctx, form),
            Action::F(5) => {
                self.load(ctx.store)?;
                self.clear_options(form);
            }
            Action::F(7) if self.top == 0 => form.error("Already at top of list."),
            Action::F(7) => {
                self.clear_options(form);
                self.top = self.top.saturating_sub(self.page_size);
            }
            Action::F(8) if self.top + self.page_size >= self.parts.len() => {
                form.error("Already at bottom of list.");
            }
            Action::F(8) => {
                self.clear_options(form);
                self.top += self.page_size;
            }
            Action::F(_) => {}
        }
        Ok(None)
    }
}
