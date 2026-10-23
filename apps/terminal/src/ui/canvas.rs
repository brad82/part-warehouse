use std::fmt::Write as _;

use unicode_normalization::UnicodeNormalization;
use unicode_normalization::char::is_combining_mark;

use super::{Form, Pos, Size};

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub enum Style {
    #[default]
    Normal,
    High,
    Head,
    Field,
}

impl Style {
    fn sgr(self) -> &'static str {
        match self {
            Style::Normal => "\x1b[0;32;40m",
            Style::High => "\x1b[0;1;37;40m",
            Style::Head => "\x1b[0;36;40m",
            Style::Field => "\x1b[0;4;32;40m",
        }
    }
}

/// An input field. Build with [`Field::new`] and the option methods, then
/// place it with [`Canvas::field`].
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Field {
    pub name: String,
    pub pos: Pos,
    /// Visible width.
    pub len: usize,
    /// Longest value accepted.
    pub max: usize,
    pub upper: bool,
    pub numeric: bool,
}

impl Field {
    pub fn new(name: impl Into<String>, row: usize, col: usize, len: usize) -> Self {
        Self {
            name: name.into(),
            pos: Pos { row, col },
            len,
            max: len,
            upper: false,
            numeric: false,
        }
    }

    pub fn max(mut self, max: usize) -> Self {
        self.max = max;
        self
    }

    pub fn upper(mut self) -> Self {
        self.upper = true;
        self
    }

    pub fn numeric(mut self) -> Self {
        self.numeric = true;
        self
    }

    /// Whether `ch` may be typed into this field after `value`.
    pub fn accepts(&self, value: &str, ch: char) -> bool {
        (!self.numeric || ch.is_ascii_digit()) && value.len() < self.max
    }

    /// What the field shows: the tail of its value, padded to its width.
    fn text(&self, value: &str) -> String {
        let skip = value.chars().count().saturating_sub(self.len);
        let tail: String = value.chars().skip(skip).collect();
        format!("{tail:<width$}", width = self.len)
    }

    /// Where the cursor sits: after the value, inside the field.
    pub fn cursor(&self, value: &str) -> Pos {
        Pos {
            row: self.pos.row,
            col: self.pos.col + value.chars().count().min(self.len - 1),
        }
    }

    /// Repaints the field in place (typing echo).
    pub fn paint(&self, value: &str) -> String {
        let c = self.cursor(value);
        format!(
            "{}{}{}{}",
            move_to(self.pos),
            Style::Field.sgr(),
            self.text(value),
            move_to(c)
        )
    }
}

pub fn move_to(p: Pos) -> String {
    format!("\x1b[{};{}H", p.row + 1, p.col + 1)
}

/// `s` as the terminal shows it: accents stripped, anything else as `?`.
pub fn ascii(s: &str) -> String {
    to_ascii(s).map(char::from).collect()
}

fn to_ascii(s: &str) -> impl Iterator<Item = u8> + '_ {
    s.nfkd().filter(|c| !is_combining_mark(*c)).map(|c| {
        if matches!(c, ' '..='~') {
            c as u8
        } else {
            b'?'
        }
    })
}

#[derive(Clone, Copy, Default)]
struct Cell {
    ch: u8,
    style: Style,
}

pub struct Canvas {
    size: Size,
    cells: Vec<Cell>,
    fields: Vec<Field>,
}

impl Canvas {
    pub fn new(size: Size) -> Self {
        Self {
            size,
            cells: vec![
                Cell {
                    ch: b' ',
                    style: Style::Normal
                };
                size.cols * size.rows
            ],
            fields: Vec::new(),
        }
    }

    pub fn cols(&self) -> usize {
        self.size.cols
    }

    pub fn rows(&self) -> usize {
        self.size.rows
    }

    /// Handheld layout: labels abbreviated and lists on two lines.
    pub fn narrow(&self) -> bool {
        self.size.cols < 40
    }

    pub fn fields(&self) -> &[Field] {
        &self.fields
    }

    /// Writes `s` at `row`/`col`, clipped to the screen.
    pub fn text(&mut self, row: usize, col: usize, s: &str, style: Style) {
        if row >= self.size.rows {
            return;
        }
        let start = row * self.size.cols;
        for (c, ch) in (col..self.size.cols).zip(to_ascii(s)) {
            self.cells[start + c] = Cell { ch, style };
        }
    }

    pub fn center(&mut self, row: usize, s: &str, style: Style) {
        let len = to_ascii(s).count().min(self.size.cols);
        self.text(row, (self.size.cols - len) / 2, s, style);
    }

    pub fn right(&mut self, row: usize, s: &str, style: Style) {
        let len = to_ascii(s).count().min(self.size.cols);
        self.text(row, self.size.cols - len, s, style);
    }

    /// Declares an input field, clipped to the screen edge. Its value is
    /// filled in by [`Canvas::fill`].
    pub fn field(&mut self, mut f: Field) {
        let visible = f.len.min(self.size.cols.saturating_sub(f.pos.col));
        if f.pos.row >= self.size.rows || visible == 0 {
            return;
        }
        f.len = visible;
        self.fields.push(f);
    }

    /// Draws every field with its current value.
    pub fn fill(&mut self, form: &Form) {
        for f in std::mem::take(&mut self.fields) {
            self.text(
                f.pos.row,
                f.pos.col,
                &f.text(form.get(&f.name)),
                Style::Field,
            );
            self.fields.push(f);
        }
    }

    /// Plain text of each row, for tests.
    pub fn lines(&self) -> Vec<String> {
        self.cells
            .chunks(self.size.cols)
            .map(|row| {
                let s: String = row.iter().map(|c| char::from(c.ch)).collect();
                s.trim_end().to_owned()
            })
            .collect()
    }

    /// Full repaint. The bottom-right cell is skipped so nothing scrolls.
    pub fn render(&self, cursor: Option<Pos>) -> String {
        let mut out = format!("\x1b[?25l{}\x1b[2J", Style::Normal.sgr());
        for (r, row) in self.cells.chunks(self.size.cols).enumerate() {
            let _ = write!(out, "\x1b[{};1H", r + 1);
            let width = if r + 1 == self.size.rows {
                row.len() - 1
            } else {
                row.len()
            };
            let mut current = None;
            for cell in &row[..width] {
                if current != Some(cell.style) {
                    out.push_str(cell.style.sgr());
                    current = Some(cell.style);
                }
                out.push(char::from(cell.ch));
            }
        }
        if let Some(c) = cursor {
            out.push_str(&move_to(c));
            out.push_str("\x1b[?25h");
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strips_accents_and_replaces_other_characters() {
        let mut c = Canvas::new(Size { cols: 20, rows: 1 });
        c.text(0, 0, "Café ☃ ok", Style::Normal);
        assert_eq!(c.lines(), ["Cafe ? ok"]);
    }

    #[test]
    fn clips_fields_to_the_screen_edge() {
        let mut c = Canvas::new(Size { cols: 10, rows: 2 });
        c.field(Field::new("a", 0, 6, 8).max(80));
        c.field(Field::new("b", 5, 0, 3));
        assert_eq!(c.fields().len(), 1);
        assert_eq!(c.fields()[0].len, 4);
        assert_eq!(c.fields()[0].max, 80);
    }

    #[test]
    fn fields_show_the_tail_of_long_values() {
        let f = Field::new("a", 0, 0, 4).max(80);
        assert_eq!(f.text("ABCDEF"), "CDEF");
        assert_eq!(f.text("AB"), "AB  ");
        assert_eq!(f.cursor("ABCDEF").col, 3);
    }
}
