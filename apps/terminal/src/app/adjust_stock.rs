use std::str::FromStr;

use super::screen::{Action, Ctx, Nav, Outcome, Screen};
use crate::store::{self, Part, PartCode, Store};
use crate::ui::layout::{header, leader};
use crate::ui::{Canvas, Field, Form, Style};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Adjustment {
    Receive,
    Issue,
    Count,
}

#[derive(Debug, PartialEq, Eq, thiserror::Error)]
pub enum AdjustError {
    #[error("Action must be R, I or C.")]
    Action,
    #[error("Only {0} on hand.")]
    Short(i64),
}

impl FromStr for Adjustment {
    type Err = AdjustError;

    fn from_str(s: &str) -> Result<Self, AdjustError> {
        match s.trim().to_ascii_uppercase().as_str() {
            "R" => Ok(Self::Receive),
            "I" => Ok(Self::Issue),
            "C" => Ok(Self::Count),
            _ => Err(AdjustError::Action),
        }
    }
}

impl Adjustment {
    /// The new quantity on hand.
    pub fn apply(self, on_hand: i64, qty: i64) -> Result<i64, AdjustError> {
        match self {
            Self::Receive => Ok(on_hand + qty),
            Self::Issue if qty > on_hand => Err(AdjustError::Short(on_hand)),
            Self::Issue => Ok(on_hand - qty),
            Self::Count => Ok(qty),
        }
    }
}

/// ADJSTK: scan a part, pick Receive / Issue / Count, key a quantity.
/// Opened from the menu it stays put for the next scan; opened for one part
/// (from a list or display) it returns there once saved.
pub struct AdjustStock {
    initial: Option<PartCode>,
    part: Option<Part>,
}

impl AdjustStock {
    pub fn new(initial: Option<PartCode>) -> Self {
        Self {
            initial,
            part: None,
        }
    }

    /// Loads the part in the Part field if it changed. False when the user
    /// has something to fix first.
    fn load_part(&mut self, store: &Store, form: &mut Form) -> store::Result<bool> {
        let raw = form.get("part").trim().to_owned();
        let Ok(code) = raw.parse::<PartCode>() else {
            form.focus("part");
            form.error(if raw.is_empty() {
                "Scan or type a part code.".to_owned()
            } else {
                format!("Not a part code: {raw}")
            });
            return Ok(false);
        };
        if self.part.as_ref().is_some_and(|p| p.code == code) {
            return Ok(true);
        }
        self.part = store.part(&code)?;
        form.set("part", code.as_str());
        if self.part.is_none() {
            form.focus("part");
            form.error(format!("Part {code} not found."));
            return Ok(false);
        }
        if form.get("qty").is_empty() {
            form.focus("qty");
            return Ok(false);
        }
        Ok(true)
    }
}

impl Screen for AdjustStock {
    fn keys(&self) -> &'static [&'static str] {
        &["F3=Exit", "F2=Cancel", "F5=Refresh"]
    }

    fn init(&mut self, ctx: &Ctx, form: &mut Form) -> store::Result<()> {
        form.set("action", "R");
        if let Some(code) = &self.initial {
            form.set("part", code.as_str());
            self.part = ctx.store.part(code)?;
            if self.part.is_some() {
                form.focus("qty");
            } else {
                form.error(format!("Part {code} not found."));
            }
        }
        Ok(())
    }

    fn draw(&mut self, c: &mut Canvas, ctx: &Ctx) {
        let narrow = c.narrow();
        let title = if narrow {
            "ADJUST STOCK"
        } else {
            "Adjust Stock"
        };
        header(c, "ADJSTK", title, ctx.system_name);
        let label = |c: &mut Canvas, row: usize, short: &str, long: &str| {
            let text = if narrow {
                format!("{short:<7}")
            } else {
                leader(long, 24)
            };
            c.text(row, 0, &text, Style::Normal);
            text.len()
        };

        let col = label(c, 3, "Part", "Part code");
        c.field(
            Field::new("part", 3, col, (c.cols() - col - 1).min(20))
                .max(80)
                .upper(),
        );
        if let Some(part) = &self.part {
            c.text(4, col, &part.name, Style::High);
            label(c, 5, "OnHand", "Quantity on hand");
            c.text(5, col, &part.on_hand.to_string(), Style::High);
        }
        label(c, 7, "Action", "Action");
        c.field(Field::new("action", 7, col, 1).upper());
        if narrow {
            c.text(8, col, "R=Receive I=Issue", Style::Normal);
            c.text(9, col, "C=Count", Style::Normal);
        } else {
            c.text(7, col + 3, "R=Receive, I=Issue, C=Count", Style::Normal);
        }
        let qty_row = if narrow { 10 } else { 9 };
        label(c, qty_row, "Qty", "Quantity");
        c.field(Field::new("qty", qty_row, col, 5).numeric());
    }

    fn handle(&mut self, action: Action, ctx: &Ctx, form: &mut Form) -> Outcome {
        match action {
            Action::F(5) => {
                if let Some(code) = self.part.as_ref().map(|p| p.code.clone()) {
                    self.part = ctx.store.part(&code)?;
                }
                return Ok(None);
            }
            Action::F(_) => return Ok(None),
            Action::Enter => {}
        }
        if !self.load_part(ctx.store, form)? {
            return Ok(None);
        }
        let Some(part) = self.part.clone() else {
            return Ok(None);
        };

        let Ok(qty) = form.get("qty").parse::<i64>() else {
            form.focus("qty");
            form.info("Enter a quantity.");
            return Ok(None);
        };
        let next = form
            .get("action")
            .parse::<Adjustment>()
            .and_then(|a| a.apply(part.on_hand, qty));
        let next = match next {
            Ok(next) => next,
            Err(err) => {
                form.focus(if err == AdjustError::Action {
                    "action"
                } else {
                    "qty"
                });
                form.error(err.to_string());
                return Ok(None);
            }
        };

        self.part = ctx.store.set_on_hand(&part.code, next)?;
        let done = format!("{} {} -> {next}", part.code, part.on_hand);
        if self.initial.is_some() {
            return Ok(Some(Nav::Pop(Some(done))));
        }
        form.set("part", "");
        form.set("qty", "");
        form.focus("part");
        form.info(done);
        Ok(None)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn applies_receive_issue_and_count() {
        assert_eq!(Adjustment::Receive.apply(4, 3), Ok(7));
        assert_eq!(Adjustment::Issue.apply(4, 3), Ok(1));
        assert_eq!(Adjustment::Issue.apply(4, 5), Err(AdjustError::Short(4)));
        assert_eq!(Adjustment::Count.apply(4, 9), Ok(9));
    }

    #[test]
    fn parses_actions() {
        assert_eq!("i".parse(), Ok(Adjustment::Issue));
        assert_eq!("X".parse::<Adjustment>(), Err(AdjustError::Action));
    }
}
