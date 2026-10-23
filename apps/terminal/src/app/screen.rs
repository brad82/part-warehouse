use crate::store::{self, Store};
use crate::ui::{Canvas, Form};

/// What a screen is shared with: the database and the system name.
#[derive(Clone, Copy)]
pub struct Ctx<'a> {
    pub store: &'a Store,
    pub system_name: &'a str,
}

/// Keys a screen handles itself: Enter, and function keys other than
/// F3 (Exit) and F2 / F12 (Cancel), which the app handles.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Action {
    Enter,
    F(u8),
}

pub enum Nav {
    Push(Box<dyn Screen>),
    /// Close this screen, optionally leaving a message on the one below.
    Pop(Option<String>),
    SignOff,
}

impl Nav {
    pub fn push(screen: impl Screen + 'static) -> Self {
        Self::Push(Box::new(screen))
    }
}

pub type Outcome = store::Result<Option<Nav>>;

/// One screen. Screens draw rows 0 to rows-3; the app draws the message
/// line (rows-2) and the function-key legend (rows-1).
pub trait Screen {
    /// Legend entries, most important first; those that don't fit drop off.
    fn keys(&self) -> &'static [&'static str];

    /// Called once when the screen is first shown.
    fn init(&mut self, _ctx: &Ctx, _form: &mut Form) -> store::Result<()> {
        Ok(())
    }

    /// Called when the screen above it closes.
    fn resume(&mut self, _ctx: &Ctx, _form: &mut Form) -> store::Result<()> {
        Ok(())
    }

    fn draw(&mut self, c: &mut Canvas, ctx: &Ctx);

    fn handle(&mut self, action: Action, ctx: &Ctx, form: &mut Form) -> Outcome;
}
