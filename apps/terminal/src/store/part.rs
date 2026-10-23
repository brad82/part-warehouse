use std::fmt;
use std::str::FromStr;

/// A part code like `A01-001-001`: module letter, sub-assembly, group, part.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PartCode(String);

#[derive(Debug, thiserror::Error)]
#[error("no part code in input")]
pub struct NoPartCode;

impl PartCode {
    const LEN: usize = 11;

    fn matches(w: &[u8]) -> bool {
        w.iter().enumerate().all(|(i, b)| match i {
            0 => b.is_ascii_uppercase(),
            3 | 7 => *b == b'-',
            _ => b.is_ascii_digit(),
        })
    }

    /// A code read back from the database, which only holds valid ones.
    pub(super) fn from_db(code: String) -> Self {
        Self(code)
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

/// Pulls a part code out of scanned text: a bare code (`a01-001-001`) or any
/// text containing one, e.g. a URL ending `/parts/A01-001-001`.
impl FromStr for PartCode {
    type Err = NoPartCode;

    fn from_str(text: &str) -> Result<Self, NoPartCode> {
        let upper = text.trim().to_ascii_uppercase();
        upper
            .as_bytes()
            .windows(Self::LEN)
            .find(|w| Self::matches(w))
            .map(|w| Self(String::from_utf8_lossy(w).into_owned()))
            .ok_or(NoPartCode)
    }
}

impl fmt::Display for PartCode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

/// A part as the detail screens show it.
#[derive(Debug, Clone)]
pub struct Part {
    pub code: PartCode,
    pub name: String,
    /// The group's name, or its id if the group is missing.
    pub group: String,
    pub on_hand: i64,
    pub qty_per_build: i64,
    pub status: String,
    pub notes: Option<String>,
    /// Attribute key → display value.
    pub attributes: Vec<(String, String)>,
}

impl Part {
    pub fn attribute(&self, key: &str) -> Option<&str> {
        self.attributes
            .iter()
            .find(|(k, _)| k == key)
            .map(|(_, v)| v.as_str())
    }
}

/// One row of the part list.
#[derive(Debug, Clone)]
pub struct PartSummary {
    pub code: PartCode,
    pub name: String,
    pub on_hand: i64,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn scan(s: &str) -> Option<String> {
        s.parse::<PartCode>().ok().map(|c| c.to_string())
    }

    #[test]
    fn parses_bare_codes_scans_and_urls() {
        assert_eq!(scan("A01-001-001").as_deref(), Some("A01-001-001"));
        assert_eq!(scan("  a06-050-004\r\n").as_deref(), Some("A06-050-004"));
        assert_eq!(
            scan("http://localhost:3000/parts/A03-002-001").as_deref(),
            Some("A03-002-001")
        );
    }

    #[test]
    fn rejects_text_without_a_code() {
        assert_eq!(scan("hello"), None);
        assert_eq!(scan("A01-001"), None);
        assert_eq!(scan("é01-001-001"), None);
    }
}
