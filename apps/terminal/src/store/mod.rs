//! The slice of the shared SQLite database the terminal needs. The API owns
//! the schema (`packages/db`), so the terminal only opens an existing db.

mod part;

use std::path::Path;
use std::time::Duration;

use rusqlite::{Connection, OpenFlags, OptionalExtension, Row, params};

pub use part::{Part, PartCode, PartSummary};

pub type Result<T> = rusqlite::Result<T>;

pub struct Store {
    conn: Connection,
}

impl Store {
    /// Opens the database the API created. Fails if it doesn't exist yet.
    pub fn open(path: &Path) -> Result<Self> {
        let flags = OpenFlags::SQLITE_OPEN_READ_WRITE | OpenFlags::SQLITE_OPEN_NO_MUTEX;
        Self::init(Connection::open_with_flags(path, flags)?)
    }

    /// An in-memory db with the API's schema, for tests.
    #[cfg(test)]
    pub fn open_in_memory() -> Result<Self> {
        let store = Self::init(Connection::open_in_memory()?)?;
        store.execute_batch(include_str!(
            "../../../../packages/db/migrations/001_initial.sql"
        ))?;
        Ok(store)
    }

    fn init(conn: Connection) -> Result<Self> {
        conn.busy_timeout(Duration::from_secs(5))?;
        conn.execute_batch("PRAGMA foreign_keys = ON;")?;
        Ok(Self { conn })
    }

    #[cfg(test)]
    pub fn execute_batch(&self, sql: &str) -> Result<()> {
        self.conn.execute_batch(sql)
    }

    pub fn part(&self, code: &PartCode) -> Result<Option<Part>> {
        let Some(mut part) = self
            .conn
            .query_row(
                "SELECT p.code, p.name, COALESCE(g.name, p.group_id), p.on_hand,
                        p.qty_per_build, p.status, p.notes
                   FROM parts p LEFT JOIN groupings g ON g.id = p.group_id
                  WHERE p.code = ?",
                [code.as_str()],
                |r| {
                    Ok(Part {
                        code: code.clone(),
                        name: r.get(1)?,
                        group: r.get(2)?,
                        on_hand: r.get(3)?,
                        qty_per_build: r.get(4)?,
                        status: r.get(5)?,
                        notes: r.get(6)?,
                        attributes: Vec::new(),
                    })
                },
            )
            .optional()?
        else {
            return Ok(None);
        };

        let mut stmt = self.conn.prepare_cached(
            "SELECT d.key, d.data_type, pa.value
               FROM part_attributes pa JOIN attribute_defs d ON d.id = pa.attribute_id
              WHERE pa.part_code = ?",
        )?;
        part.attributes = stmt
            .query_map([code.as_str()], |r| {
                let data_type: String = r.get(1)?;
                let value: String = r.get(2)?;
                Ok((r.get(0)?, display_value(&data_type, value)))
            })?
            .collect::<Result<_>>()?;
        Ok(Some(part))
    }

    /// Parts matching `query` by code, name, notes, attribute value or any
    /// grouping above them (e.g. "Tracks"). Empty matches everything.
    pub fn search(&self, query: &str) -> Result<Vec<PartSummary>> {
        let summary = |r: &Row| {
            Ok(PartSummary {
                code: PartCode::from_db(r.get(0)?),
                name: r.get(1)?,
                on_hand: r.get(2)?,
            })
        };
        if query.is_empty() {
            let mut stmt = self
                .conn
                .prepare_cached("SELECT code, name, on_hand FROM parts ORDER BY code")?;
            return stmt.query_map([], summary)?.collect();
        }
        let mut stmt = self.conn.prepare_cached(
            "SELECT p.code, p.name, p.on_hand FROM parts p
               JOIN groupings g ON g.id = p.group_id
               LEFT JOIN groupings s ON s.id = g.parent_id
              WHERE p.code LIKE ?1 OR p.name LIKE ?1 OR p.notes LIKE ?1
                 OR g.name LIKE ?1 OR s.name LIKE ?1
                 OR EXISTS (SELECT 1 FROM part_attributes pa
                             WHERE pa.part_code = p.code AND pa.value LIKE ?1)
              ORDER BY p.code",
        )?;
        stmt.query_map([format!("%{query}%")], summary)?.collect()
    }

    /// Sets the quantity on hand; returns the updated part.
    pub fn set_on_hand(&self, code: &PartCode, on_hand: i64) -> Result<Option<Part>> {
        self.conn.execute(
            "UPDATE parts SET on_hand = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
              WHERE code = ?",
            params![on_hand, code.as_str()],
        )?;
        self.part(code)
    }
}

/// Numeric attributes print like the web app (`12.50` → `12.5`).
fn display_value(data_type: &str, value: String) -> String {
    match data_type {
        "integer" | "number" | "currency" => {
            value.trim().parse::<f64>().map_or(value, |n| n.to_string())
        }
        _ => value,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn numeric_attributes_drop_trailing_zeros() {
        assert_eq!(display_value("currency", "12.50".into()), "12.5");
        assert_eq!(display_value("integer", "3".into()), "3");
        assert_eq!(display_value("text", "12.50".into()), "12.50");
    }
}
