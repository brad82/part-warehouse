//! Layout pieces shared by every screen.

use super::{Canvas, Style, ascii};

/// Title centred on row 0; screen id left and system name right on row 1.
pub fn header(c: &mut Canvas, id: &str, title: &str, system_name: &str) {
    c.center(0, title, Style::High);
    c.text(1, 0, id, Style::Normal);
    if c.cols() > id.len() + system_name.len() + 1 {
        c.right(1, system_name, Style::Normal);
    }
}

/// AS/400 prompt leader: `"Part code . . . . : "` padded to `width`.
pub fn leader(label: &str, width: usize) -> String {
    let mut s = label.to_owned();
    while s.len() + 2 < width {
        s.push(if (s.len() - label.len()) % 2 == 1 {
            '.'
        } else {
            ' '
        });
    }
    s + ": "
}

/// Word-wraps `text` into lines of at most `width`, splitting long words.
pub fn wrap(text: &str, width: usize) -> Vec<String> {
    let mut lines = Vec::new();
    let mut line = String::new();
    for word in text.split_whitespace() {
        if line.is_empty() {
            line = word.to_owned();
        } else if line.len() + 1 + word.len() <= width {
            line.push(' ');
            line.push_str(word);
        } else {
            lines.push(std::mem::replace(&mut line, word.to_owned()));
        }
        while line.len() > width {
            let rest = line.split_off(line.floor_char_boundary(width).max(1));
            lines.push(std::mem::replace(&mut line, rest));
        }
    }
    if !line.is_empty() {
        lines.push(line);
    }
    lines
}

pub struct Detail<'a> {
    pub short: &'a str,
    pub long: &'a str,
    pub value: String,
}

/// Draws label/value pairs from `row`, wrapping values under the value
/// column. Stops before `last_row`.
pub fn details(c: &mut Canvas, mut row: usize, last_row: usize, items: &[Detail]) {
    let label_width = if c.narrow() { 9 } else { 24 };
    for item in items {
        if row >= last_row {
            break;
        }
        let label = if c.narrow() {
            format!("{:<w$}: ", item.short, w = label_width - 2)
        } else {
            leader(item.long, label_width)
        };
        c.text(row, 0, &label, Style::Normal);
        let mut lines = wrap(&ascii(&item.value), c.cols() - label.len());
        if lines.is_empty() {
            lines.push(String::new());
        }
        for line in lines {
            if row >= last_row {
                break;
            }
            c.text(row, label.len(), &line, Style::High);
            row += 1;
        }
    }
}

/// Joins as many function-key legend entries as fit in `width`.
pub fn legend(keys: &[&str], width: usize) -> String {
    let mut out = String::new();
    for k in keys {
        let extra = if out.is_empty() { k.len() } else { k.len() + 1 };
        if out.len() + extra > width {
            break;
        }
        if !out.is_empty() {
            out.push(' ');
        }
        out.push_str(k);
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn leader_pads_with_dots() {
        assert_eq!(leader("Part code", 24), "Part code . . . . . . : ");
        assert_eq!(leader("Part code", 24).len(), 24);
    }

    #[test]
    fn wrap_splits_words_and_long_runs() {
        assert_eq!(wrap("one two three", 7), ["one two", "three"]);
        assert_eq!(wrap("abcdefghij", 4), ["abcd", "efgh", "ij"]);
        assert!(wrap("   ", 4).is_empty());
    }

    #[test]
    fn legend_drops_entries_that_do_not_fit() {
        assert_eq!(
            legend(&["F3=Exit", "F2=Cancel", "F5=Refresh"], 25),
            "F3=Exit F2=Cancel"
        );
    }
}
