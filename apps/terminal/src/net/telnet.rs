//! Minimal telnet server side: we echo (so the client stays in character
//! mode), suppress go-ahead, and ask for the window size. Anything else the
//! client offers or asks for is refused.

use crate::ui::Size;

const IAC: u8 = 255;
const DONT: u8 = 254;
const DO: u8 = 253;
const WONT: u8 = 252;
const WILL: u8 = 251;
const SB: u8 = 250;
const SE: u8 = 240;

const ECHO: u8 = 1;
const SGA: u8 = 3;
const NAWS: u8 = 31;

/// Sent once when the client connects.
pub const HANDSHAKE: [u8; 12] = [IAC, WILL, ECHO, IAC, WILL, SGA, IAC, DO, SGA, IAC, DO, NAWS];

#[derive(Debug, Default, PartialEq, Eq)]
pub struct Decoded {
    /// Input bytes with telnet commands removed and CR LF / CR NUL as CR.
    pub data: Vec<u8>,
    /// Negotiation replies to send back.
    pub replies: Vec<u8>,
    /// Latest window size the client reported (NAWS), if any.
    pub size: Option<Size>,
}

#[derive(Debug, Default, Clone, Copy)]
enum State {
    #[default]
    Data,
    Iac,
    Option(u8),
    Sub,
    SubIac,
}

#[derive(Debug, Default)]
pub struct Telnet {
    state: State,
    sub: Vec<u8>,
    last_cr: bool,
}

impl Telnet {
    pub fn decode(&mut self, chunk: &[u8]) -> Decoded {
        let mut out = Decoded::default();
        for &byte in chunk {
            self.state = match (self.state, byte) {
                (State::Data, IAC) => State::Iac,
                (State::Data, b'\n' | 0) if self.last_cr => {
                    self.last_cr = false;
                    State::Data
                }
                (State::Data, _) => {
                    out.data.push(byte);
                    self.last_cr = byte == b'\r';
                    State::Data
                }
                (State::Iac, IAC) => {
                    out.data.push(IAC);
                    State::Data
                }
                (State::Iac, WILL | WONT | DO | DONT) => State::Option(byte),
                (State::Iac, SB) => {
                    self.sub.clear();
                    State::Sub
                }
                (State::Iac, _) => State::Data,
                (State::Option(verb), option) => {
                    match verb {
                        DO if option != ECHO && option != SGA => {
                            out.replies.extend([IAC, WONT, option]);
                        }
                        WILL if option != NAWS && option != SGA => {
                            out.replies.extend([IAC, DONT, option]);
                        }
                        _ => {}
                    }
                    State::Data
                }
                (State::Sub, IAC) => State::SubIac,
                (State::Sub, _) => {
                    self.sub.push(byte);
                    State::Sub
                }
                (State::SubIac, IAC) => {
                    self.sub.push(IAC);
                    State::Sub
                }
                (State::SubIac, SE) => {
                    if let [NAWS, c1, c0, r1, r0, ..] = self.sub[..] {
                        out.size = Some(Size {
                            cols: usize::from(u16::from_be_bytes([c1, c0])),
                            rows: usize::from(u16::from_be_bytes([r1, r0])),
                        });
                    }
                    State::Data
                }
                (State::SubIac, _) => State::Data,
            };
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strips_negotiation_and_reads_the_window_size() {
        let d = Telnet::default().decode(&[255, 251, 31, 255, 250, 31, 0, 80, 0, 24, 255, 240, 65]);
        assert_eq!(d.data, b"A");
        assert_eq!(d.size, Some(Size { cols: 80, rows: 24 }));
        assert!(d.replies.is_empty());
    }

    #[test]
    fn refuses_options_it_does_not_support() {
        let d = Telnet::default().decode(&[255, 253, 24, 255, 251, 32]);
        assert_eq!(d.replies, [255, 252, 24, 255, 254, 32]);
    }

    #[test]
    fn folds_cr_lf_and_cr_nul_into_cr_across_chunks() {
        let mut t = Telnet::default();
        assert_eq!(t.decode(b"a\r").data, b"a\r");
        assert_eq!(t.decode(b"\nb\r\0").data, b"b\r");
    }

    #[test]
    fn unescapes_iac_iac() {
        assert_eq!(Telnet::default().decode(&[255, 255]).data, [255]);
    }
}
