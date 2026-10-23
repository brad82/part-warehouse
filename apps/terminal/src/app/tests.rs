//! Whole-session tests: keys in, screen text and database changes out.

use super::{App, Control, Ctx};
use crate::net::Key;
use crate::store::Store;
use crate::ui::Size;

fn seeded_store() -> Store {
    let store = Store::open_in_memory().unwrap();
    let mut sql = String::from(
        "INSERT INTO groupings (id, taxonomy, name, revision, parent_id) VALUES
           ('A', 'module', 'Chassis', 0, NULL),
           ('A01', 'subassembly', 'Tracks', 0, 'A'),
           ('A01-001', 'group', 'Grousers', 0, 'A01');",
    );
    for i in 1..=9 {
        sql += &format!(
            "INSERT INTO parts (code, group_id, part, name, qty_per_build)
             VALUES ('A01-001-00{i}', 'A01-001', '0{i}', 'Grouser {i}', 12);"
        );
    }
    store.execute_batch(&sql).unwrap();
    store
}

fn start(store: &Store, cols: usize, rows: usize) -> App<'_> {
    let mut app = App::new(
        Ctx {
            store,
            system_name: "SNOWCAT",
        },
        Size { cols, rows },
    );
    app.start();
    app
}

fn type_text(app: &mut App, text: &str) {
    for ch in text.chars() {
        app.key(if ch == '\r' {
            Key::Enter
        } else {
            Key::Char(ch)
        });
    }
}

fn press(app: &mut App, keys: &[Key]) {
    for &k in keys {
        app.key(k);
    }
}

fn screen(app: &App) -> String {
    app.lines().join("\n")
}

fn on_hand(store: &Store, code: &str) -> i64 {
    store.part(&code.parse().unwrap()).unwrap().unwrap().on_hand
}

#[test]
fn shows_the_menu_within_a_26x16_handheld_screen() {
    let store = seeded_store();
    let app = start(&store, 26, 16);
    assert_eq!(app.lines().len(), 16);
    assert!(app.lines().iter().all(|l| l.len() <= 26));
    assert!(screen(&app).contains("PARTS MENU"));
    assert!(screen(&app).contains(" 3. Adjust stock"));
}

#[test]
fn uses_the_wide_layout_after_a_resize() {
    let store = seeded_store();
    let mut app = start(&store, 26, 16);
    app.resize(Size { cols: 80, rows: 24 });
    assert_eq!(app.lines().len(), 24);
    assert!(screen(&app).contains("Parts Main Menu"));
    assert!(screen(&app).contains("SNOWCAT"));
}

#[test]
fn opens_a_part_from_a_scan_on_the_menu() {
    let store = seeded_store();
    let mut app = start(&store, 26, 16);
    type_text(&mut app, "a01-001-003\r");
    let s = screen(&app);
    assert!(s.contains("DISPLAY PART"));
    assert!(s.contains("Grouser 3"));
    assert!(s.contains("Grousers"));
}

#[test]
fn reports_unknown_commands() {
    let store = seeded_store();
    let mut app = start(&store, 26, 16);
    app.take_output();
    type_text(&mut app, "FOO\r");
    assert_eq!(app.lines()[14], "Command FOO not found.");
    assert!(app.take_output().contains(&0x07));
}

#[test]
fn pages_the_part_list_and_opens_an_option() {
    let store = seeded_store();
    let mut app = start(&store, 26, 16);
    type_text(&mut app, "1\r");
    assert!(screen(&app).contains("WORK WITH PARTS"));
    assert!(screen(&app).contains("More..."));
    press(&mut app, &[Key::PageDown]);
    assert!(screen(&app).contains("A01-001-005"));
    assert!(!screen(&app).contains("A01-001-001"));
    press(&mut app, &[Key::Tab]);
    type_text(&mut app, "5\r");
    assert!(screen(&app).contains("DISPLAY PART"));
    assert!(screen(&app).contains("Grouser 5"));
    press(&mut app, &[Key::F(2)]);
    assert!(screen(&app).contains("WORK WITH PARTS"));
}

#[test]
fn filters_the_list_by_search_text() {
    let store = seeded_store();
    let mut app = start(&store, 80, 24);
    type_text(&mut app, "WRKPRT\r");
    type_text(&mut app, "Grouser 7\r");
    let s = screen(&app);
    assert!(s.contains("A01-001-007"));
    assert!(!s.contains("A01-001-001"));
    assert!(s.contains("Bottom"));
}

#[test]
fn receives_and_issues_stock_from_scans() {
    let store = seeded_store();
    let mut app = start(&store, 26, 16);
    type_text(&mut app, "3\r");
    type_text(&mut app, "A01-001-002\r");
    type_text(&mut app, "10\r");
    assert_eq!(app.lines()[14], "A01-001-002 0 -> 10");
    press(&mut app, &[Key::Tab, Key::Backspace]);
    type_text(&mut app, "I");
    press(&mut app, &[Key::BackTab]);
    type_text(&mut app, "A01-001-002\r");
    type_text(&mut app, "25\r");
    assert_eq!(app.lines()[14], "Only 10 on hand.");
    press(&mut app, &[Key::Backspace, Key::Backspace]);
    type_text(&mut app, "4\r");
    assert_eq!(on_hand(&store, "A01-001-002"), 6);
}

#[test]
fn returns_to_the_list_after_adjusting_a_listed_part() {
    let store = seeded_store();
    let mut app = start(&store, 26, 16);
    type_text(&mut app, "WRKPRT\r");
    press(&mut app, &[Key::Tab]);
    type_text(&mut app, "2\r");
    assert!(screen(&app).contains("ADJUST STOCK"));
    type_text(&mut app, "3\r");
    assert!(screen(&app).contains("WORK WITH PARTS"));
    assert_eq!(app.lines()[14], "A01-001-001 0 -> 3");
    let row = &app.lines()[5];
    assert!(
        row.contains("A01-001-001") && row.ends_with(" 3"),
        "{row:?}"
    );
}

#[test]
fn overtypes_the_action_without_clearing_it() {
    let store = seeded_store();
    store
        .set_on_hand(&"A01-001-001".parse().unwrap(), 10)
        .unwrap();
    let mut app = start(&store, 26, 16);
    type_text(&mut app, "ADJSTK A01-001-001\r");
    press(&mut app, &[Key::Up]);
    type_text(&mut app, "c");
    press(&mut app, &[Key::Down]);
    type_text(&mut app, "7\r");
    assert_eq!(on_hand(&store, "A01-001-001"), 7);
}

#[test]
fn rejects_letters_in_numeric_fields() {
    let store = seeded_store();
    let mut app = start(&store, 26, 16);
    type_text(&mut app, "ADJSTK A01-001-001\r");
    app.take_output();
    type_text(&mut app, "x");
    assert_eq!(app.take_output(), [0x07]);
}

#[test]
fn signs_off_with_f3_from_the_menu() {
    let store = seeded_store();
    let mut app = start(&store, 26, 16);
    type_text(&mut app, "1\r");
    assert_eq!(app.key(Key::F(3)), Control::Continue);
    assert!(screen(&app).contains("PARTS MENU"));
    assert_eq!(app.key(Key::F(3)), Control::Close);
    assert!(
        String::from_utf8(app.take_output())
            .unwrap()
            .ends_with("Signed off.\r\n")
    );
}
