//! 5250-style screens on a VT220: protected text plus named input fields,
//! drawn onto a character grid and painted as one block.

mod canvas;
mod form;
pub mod layout;

pub use canvas::{Canvas, Field, Style, ascii, move_to};
pub use form::Form;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Size {
    pub cols: usize,
    pub rows: usize,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Pos {
    pub row: usize,
    pub col: usize,
}
