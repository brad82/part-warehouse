use std::env;
use std::path::PathBuf;
use std::str::FromStr;

use crate::ui::Size;

pub struct Config {
    pub host: String,
    /// Telnet port. 23 needs root, so the default is 2323.
    pub port: u16,
    pub db_path: PathBuf,
    /// Screen size until the client reports its own (telnet NAWS).
    pub size: Size,
    /// Ignore the client's reported size. For emulators that report a large
    /// virtual screen (e.g. 80x24) but show only part of it.
    pub ignore_naws: bool,
    /// Shown top right of every screen, like an AS/400 system name, so you
    /// can tell which environment a handheld is on (SCPROD, SCDEV, ...).
    pub system_name: String,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            host: env::var("HOST").unwrap_or_else(|_| "0.0.0.0".into()),
            port: parsed("PORT", 2323),
            db_path: env::var_os("DB_PATH").map_or_else(
                || concat!(env!("CARGO_MANIFEST_DIR"), "/../../data/parts.db").into(),
                PathBuf::from,
            ),
            size: Size {
                cols: parsed("TERM_COLS", 28),
                rows: parsed("TERM_ROWS", 16),
            },
            ignore_naws: env::var("TERM_IGNORE_NAWS").is_ok_and(|v| v == "1"),
            system_name: env::var("SYSTEM_NAME").unwrap_or_else(|_| "SCDEV".into()),
        }
    }
}

fn parsed<T: FromStr>(name: &str, default: T) -> T {
    env::var(name)
        .ok()
        .and_then(|v| v.trim().parse().ok())
        .unwrap_or(default)
}
