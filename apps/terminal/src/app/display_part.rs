use super::adjust_stock::AdjustStock;
use super::screen::{Action, Ctx, Nav, Outcome, Screen};
use crate::store::{self, Part, PartCode, Store};
use crate::ui::layout::{Detail, details, header};
use crate::ui::{Canvas, Field, Form, Style};

/// Attributes worth showing on a handheld, in display order:
/// (key, short label, long label).
const ATTRIBUTES: [(&str, &str, &str); 5] = [
    ("supplier", "Suppl", "Supplier"),
    ("sku", "SKU", "Supplier SKU"),
    ("price", "Price", "Price"),
    ("colour", "Colour", "Colour"),
    ("material", "Matl", "Material"),
];

/// DSPPRT: one part's details, with a scan field to jump to the next.
pub struct DisplayPart {
    code: Option<PartCode>,
    part: Option<Part>,
}

impl DisplayPart {
    pub fn new(store: &Store, code: Option<PartCode>) -> store::Result<Self> {
        let part = match &code {
            Some(code) => store.part(code)?,
            None => None,
        };
        Ok(Self { code, part })
    }

    fn reload(&mut self, store: &Store) -> store::Result<()> {
        if let Some(code) = &self.code {
            self.part = store.part(code)?;
        }
        Ok(())
    }
}

fn detail_items(p: &Part) -> Vec<Detail<'_>> {
    let detail = |short, long, value| Detail { short, long, value };
    let mut items = vec![
        detail("Part", "Part code", p.code.to_string()),
        detail("Name", "Description", p.name.clone()),
        detail("Group", "Group", p.group.clone()),
        detail("On hand", "Quantity on hand", p.on_hand.to_string()),
        detail("Per bld", "Quantity per build", p.qty_per_build.to_string()),
        detail("Status", "Status", p.status.to_uppercase()),
    ];
    items.extend(ATTRIBUTES.iter().filter_map(|&(key, short, long)| {
        p.attribute(key).map(|v| detail(short, long, v.to_owned()))
    }));
    if let Some(notes) = p.notes.as_deref().filter(|n| !n.is_empty()) {
        items.push(detail("Notes", "Notes", notes.to_owned()));
    }
    items
}

impl Screen for DisplayPart {
    fn keys(&self) -> &'static [&'static str] {
        if self.part.is_some() {
            &["F3=Exit", "F4=Adjust", "F2=Cancel", "F5=Refresh"]
        } else {
            &["F3=Exit", "F2=Cancel"]
        }
    }

    fn init(&mut self, _ctx: &Ctx, form: &mut Form) -> store::Result<()> {
        if let (Some(code), None) = (&self.code, &self.part) {
            form.error(format!("Part {code} not found."));
        }
        Ok(())
    }

    fn resume(&mut self, ctx: &Ctx, _form: &mut Form) -> store::Result<()> {
        self.reload(ctx.store)
    }

    fn draw(&mut self, c: &mut Canvas, ctx: &Ctx) {
        let title = if c.narrow() {
            "DISPLAY PART"
        } else {
            "Display Part"
        };
        header(c, "DSPPRT", title, ctx.system_name);
        let rows = c.rows();
        match &self.part {
            Some(p) => details(c, 2, rows - 5, &detail_items(p)),
            None => c.text(3, 0, "Scan or type a part code.", Style::Normal),
        }
        c.text(rows - 4, 0, "Scan ===>", Style::Normal);
        c.field(Field::new("scan", rows - 4, 10, c.cols() - 11).max(80));
    }

    fn handle(&mut self, action: Action, ctx: &Ctx, form: &mut Form) -> Outcome {
        match action {
            Action::F(5) => self.reload(ctx.store)?,
            Action::F(4) => {
                if let Some(p) = &self.part {
                    return Ok(Some(Nav::push(AdjustStock::new(Some(p.code.clone())))));
                }
            }
            Action::F(_) => {}
            Action::Enter => {
                let input = form.get("scan").trim().to_owned();
                if input.is_empty() {
                    return Ok(None);
                }
                form.set("scan", "");
                let Ok(code) = input.parse::<PartCode>() else {
                    form.error(format!("Not a part code: {input}"));
                    return Ok(None);
                };
                match ctx.store.part(&code)? {
                    Some(part) => {
                        self.code = Some(code);
                        self.part = Some(part);
                    }
                    None => form.error(format!("Part {code} not found.")),
                }
            }
        }
        Ok(None)
    }
}
