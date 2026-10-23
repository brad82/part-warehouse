use std::str::FromStr;

use super::adjust_stock::AdjustStock;
use super::display_part::DisplayPart;
use super::screen::{Ctx, Nav};
use super::work_with_parts::WorkWithParts;
use crate::store::{self, PartCode};

/// A menu selection (`1`), command (`WRKPRT tracks`, `DSPPRT A01-001-001`)
/// or bare scanned part code.
#[derive(Debug, PartialEq, Eq)]
pub enum Command {
    WorkWithParts(String),
    DisplayPart(Option<PartCode>),
    AdjustStock(Option<PartCode>),
    SignOff,
}

#[derive(Debug, PartialEq, Eq, thiserror::Error)]
pub enum CommandError {
    #[error("Selection {0} not valid.")]
    Selection(String),
    #[error("Command {0} not found.")]
    Unknown(String),
}

impl FromStr for Command {
    type Err = CommandError;

    fn from_str(input: &str) -> Result<Self, CommandError> {
        let mut words = input.split_whitespace();
        let verb = words.next().unwrap_or_default().to_ascii_uppercase();
        let arg = words.collect::<Vec<_>>().join(" ");
        Ok(match verb.as_str() {
            "1" | "WRKPRT" => Self::WorkWithParts(arg),
            "2" | "DSPPRT" => Self::DisplayPart(arg.parse().ok()),
            "3" | "ADJSTK" => Self::AdjustStock(arg.parse().ok()),
            "90" | "SIGNOFF" => Self::SignOff,
            _ => {
                if let Ok(code) = input.parse() {
                    return Ok(Self::DisplayPart(Some(code)));
                }
                return Err(if verb.bytes().all(|b| b.is_ascii_digit()) {
                    CommandError::Selection(verb)
                } else {
                    CommandError::Unknown(verb)
                });
            }
        })
    }
}

impl Command {
    pub fn open(self, ctx: &Ctx) -> store::Result<Nav> {
        Ok(match self {
            Self::WorkWithParts(query) => Nav::push(WorkWithParts::new(ctx.store, query)?),
            Self::DisplayPart(code) => Nav::push(DisplayPart::new(ctx.store, code)?),
            Self::AdjustStock(code) => Nav::push(AdjustStock::new(code)),
            Self::SignOff => Nav::SignOff,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn code(s: &str) -> Option<PartCode> {
        s.parse().ok()
    }

    #[test]
    fn parses_selections_commands_and_scans() {
        assert_eq!("1".parse(), Ok(Command::WorkWithParts(String::new())));
        assert_eq!(
            "wrkprt  big tracks".parse(),
            Ok(Command::WorkWithParts("big tracks".into()))
        );
        assert_eq!(
            "DSPPRT a01-001-001".parse(),
            Ok(Command::DisplayPart(code("A01-001-001")))
        );
        assert_eq!("3".parse(), Ok(Command::AdjustStock(None)));
        assert_eq!("signoff".parse(), Ok(Command::SignOff));
        assert_eq!(
            "http://x/parts/A01-001-002".parse(),
            Ok(Command::DisplayPart(code("A01-001-002")))
        );
    }

    #[test]
    fn rejects_unknown_input() {
        assert_eq!(
            "7".parse::<Command>(),
            Err(CommandError::Selection("7".into()))
        );
        assert_eq!(
            "foo bar".parse::<Command>(),
            Err(CommandError::Unknown("FOO".into()))
        );
    }
}
