//! Turns VT100 / VT220 / xterm / Linux console input bytes into keys.

const ESC: u8 = 0x1b;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Key {
    Char(char),
    /// Function key F1-F12.
    F(u8),
    Enter,
    Tab,
    BackTab,
    Backspace,
    Up,
    Down,
    Left,
    Right,
    PageUp,
    PageDown,
    Escape,
    Redraw,
}

enum Match {
    /// Could be the start of a sequence; wait for more input.
    Incomplete,
    /// Not a sequence: the ESC stands alone.
    Invalid,
    /// A sequence of `len` bytes; `None` for ones we ignore.
    Seq { len: usize, key: Option<Key> },
}

fn arrow(c: u8) -> Option<Key> {
    match c {
        b'A' => Some(Key::Up),
        b'B' => Some(Key::Down),
        b'C' => Some(Key::Right),
        b'D' => Some(Key::Left),
        _ => None,
    }
}

/// `ESC [ n ~` keys (VT220 / xterm). Unlisted numbers are dropped.
fn tilde(n: u32) -> Option<Key> {
    Some(match n {
        5 => Key::PageUp,
        6 => Key::PageDown,
        11..=15 => Key::F((n - 10) as u8),
        17..=21 => Key::F((n - 11) as u8),
        23 | 24 => Key::F((n - 12) as u8),
        _ => return None,
    })
}

/// Recognises the escape sequence at the start of `s` (which starts with ESC).
fn match_escape(s: &[u8]) -> Match {
    match s {
        [_] => Match::Incomplete,
        // SS3: VT100 PF1-PF4 and application-mode arrows / keypad Enter.
        [_, b'O'] => Match::Incomplete,
        [_, b'O', c, ..] => {
            let key = match c {
                b'P'..=b'S' => Some(Key::F(c - b'P' + 1)),
                b'M' => Some(Key::Enter),
                _ => arrow(*c),
            };
            Match::Seq { len: 3, key }
        }
        // Linux console F1-F5: ESC [ [ A..E
        [_, b'[', b'['] => Match::Incomplete,
        [_, b'[', b'[', c, ..] => Match::Seq {
            len: 4,
            key: matches!(c, b'A'..=b'E').then(|| Key::F(c - b'A' + 1)),
        },
        [_, b'[', rest @ ..] => {
            let params = rest
                .iter()
                .take_while(|b| b.is_ascii_digit() || **b == b';')
                .count();
            let Some(&final_byte) = rest.get(params) else {
                return if s.len() < 16 {
                    Match::Incomplete
                } else {
                    Match::Invalid
                };
            };
            let len = 2 + params + 1;
            let key = match final_byte {
                b'~' => std::str::from_utf8(&rest[..params])
                    .ok()
                    .and_then(|p| p.split(';').next()?.parse().ok())
                    .and_then(tilde),
                b'Z' => Some(Key::BackTab),
                c if c.is_ascii_alphabetic() => arrow(c),
                _ => return Match::Invalid,
            };
            Match::Seq { len, key }
        }
        _ => Match::Invalid,
    }
}

/// A lone ESC can't be told apart from the start of a sequence, so it stays
/// pending until more input arrives or the caller gives up waiting and
/// calls [`KeyDecoder::flush`].
#[derive(Debug, Default)]
pub struct KeyDecoder {
    buf: Vec<u8>,
}

impl KeyDecoder {
    pub fn pending(&self) -> bool {
        !self.buf.is_empty()
    }

    pub fn feed(&mut self, input: &[u8]) -> Vec<Key> {
        // 8-bit VT220 controls (e.g. MochaSoft): SS3 0x8F and CSI 0x9B are
        // the one-byte forms of ESC O and ESC [.
        for &b in input {
            match b {
                0x8f => self.buf.extend([ESC, b'O']),
                0x9b => self.buf.extend([ESC, b'[']),
                _ => self.buf.push(b),
            }
        }
        self.drain(false)
    }

    pub fn flush(&mut self) -> Vec<Key> {
        self.drain(true)
    }

    fn drain(&mut self, force: bool) -> Vec<Key> {
        let mut keys = Vec::new();
        let mut i = 0;
        while i < self.buf.len() {
            let b = self.buf[i];
            if b == ESC {
                match match_escape(&self.buf[i..]) {
                    Match::Incomplete if !force => break,
                    Match::Incomplete | Match::Invalid => {
                        keys.push(Key::Escape);
                        i += 1;
                    }
                    Match::Seq { len, key } => {
                        keys.extend(key);
                        i += len;
                    }
                }
                continue;
            }
            i += 1;
            keys.extend(match b {
                b'\r' | b'\n' => Some(Key::Enter),
                b'\t' => Some(Key::Tab),
                0x7f | 0x08 => Some(Key::Backspace),
                0x0c => Some(Key::Redraw),
                b' '..=b'~' => Some(Key::Char(b.into())),
                _ => None,
            });
        }
        self.buf.drain(..i);
        keys
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decodes_characters_and_control_keys() {
        assert_eq!(
            KeyDecoder::default().feed(b"a1\r\t\x7f"),
            [
                Key::Char('a'),
                Key::Char('1'),
                Key::Enter,
                Key::Tab,
                Key::Backspace
            ]
        );
    }

    #[test]
    fn decodes_vt220_and_vt100_function_keys() {
        assert_eq!(
            KeyDecoder::default().feed(b"\x1bOR\x1b[24~\x1b[18~\x1b[6~\x1b[Z"),
            [
                Key::F(3),
                Key::F(12),
                Key::F(7),
                Key::PageDown,
                Key::BackTab
            ]
        );
    }

    #[test]
    fn decodes_linux_console_function_keys() {
        assert_eq!(
            KeyDecoder::default().feed(b"\x1b[[C\x1b[A"),
            [Key::F(3), Key::Up]
        );
    }

    #[test]
    fn decodes_8_bit_ss3_and_csi_controls() {
        assert_eq!(
            KeyDecoder::default().feed(b"\x8fR\x9b6~\x9b24~"),
            [Key::F(3), Key::PageDown, Key::F(12)]
        );
    }

    #[test]
    fn waits_for_a_split_sequence_then_flushes_a_lone_esc() {
        let mut d = KeyDecoder::default();
        assert_eq!(d.feed(b"\x1b[1"), []);
        assert_eq!(d.feed(b"3~"), [Key::F(3)]);
        assert_eq!(d.feed(b"\x1b"), []);
        assert!(d.pending());
        assert_eq!(d.flush(), [Key::Escape]);
        assert!(!d.pending());
    }
}
