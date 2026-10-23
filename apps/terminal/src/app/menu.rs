use super::command::Command;
use super::screen::{Action, Ctx, Outcome, Screen};
use crate::ui::layout::header;
use crate::ui::{Canvas, Field, Form, Style};

const ITEMS: [(&str, &str); 4] = [
    ("1", "Work with parts"),
    ("2", "Display part"),
    ("3", "Adjust stock"),
    ("90", "Sign off"),
];

/// PRTMNU: the main menu, with a command line that also takes scans.
pub struct Menu;

impl Screen for Menu {
    fn keys(&self) -> &'static [&'static str] {
        &["F3=Exit"]
    }

    fn draw(&mut self, c: &mut Canvas, ctx: &Ctx) {
        let narrow = c.narrow();
        let title = if narrow {
            "PARTS MENU"
        } else {
            "Parts Main Menu"
        };
        header(c, "PRTMNU", title, ctx.system_name);
        let prompt = if narrow {
            "Select one of:"
        } else {
            "Select one of the following:"
        };
        c.text(3, 0, prompt, Style::Normal);
        let (first, width) = if narrow { (4, 2) } else { (5, 5) };
        for (i, (n, label)) in ITEMS.iter().enumerate() {
            c.text(
                first + i,
                0,
                &format!("{n:>width$}. {label}"),
                Style::Normal,
            );
        }
        let rows = c.rows();
        let hint = if narrow {
            "Selection or scan"
        } else {
            "Selection, command or part code"
        };
        c.text(rows - 5, 0, hint, Style::Normal);
        c.text(rows - 4, 0, "===>", Style::Normal);
        c.field(Field::new("cmd", rows - 4, 5, c.cols() - 6).max(80));
    }

    fn handle(&mut self, action: Action, ctx: &Ctx, form: &mut Form) -> Outcome {
        let input = form.get("cmd").trim();
        if action != Action::Enter || input.is_empty() {
            return Ok(None);
        }
        match input.parse::<Command>() {
            Ok(command) => {
                form.set("cmd", "");
                command.open(ctx).map(Some)
            }
            Err(err) => {
                form.error(err.to_string());
                Ok(None)
            }
        }
    }
}
