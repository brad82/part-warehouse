-- Single schema file, applied at startup when tables are missing.
-- Nothing is released, so change this file and delete data/parts.db
-- (then `npm run import`) rather than adding migrations.

-- Every level above a part: module (A), sub-assembly (A01), group (A01-001).
CREATE TABLE IF NOT EXISTS groupings (
  id        TEXT PRIMARY KEY,
  taxonomy  TEXT NOT NULL CHECK (taxonomy IN ('module', 'subassembly', 'group')),
  name      TEXT NOT NULL,
  revision  INTEGER NOT NULL DEFAULT 0,
  parent_id TEXT REFERENCES groupings (id)
);

CREATE INDEX IF NOT EXISTS groupings_parent_idx ON groupings (parent_id);

-- Kinds of part (Printed, Purchased). Decides which attributes a part shows.
CREATE TABLE IF NOT EXISTS part_types (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);

-- Typed per-part fields. `system` ones are read by code (STL path, totals,
-- viewer colour), so their key and type are fixed and they can't be deleted.
CREATE TABLE IF NOT EXISTS attribute_defs (
  id        INTEGER PRIMARY KEY,
  key       TEXT NOT NULL UNIQUE,
  label     TEXT NOT NULL,
  data_type TEXT NOT NULL
            CHECK (data_type IN ('text', 'integer', 'number', 'currency', 'url', 'select')),
  unit      TEXT,
  options   TEXT,                  -- JSON string array, select only
  system    INTEGER NOT NULL DEFAULT 0,
  sort      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS part_type_attributes (
  part_type_id TEXT NOT NULL REFERENCES part_types (id) ON DELETE CASCADE,
  attribute_id INTEGER NOT NULL REFERENCES attribute_defs (id) ON DELETE CASCADE,
  PRIMARY KEY (part_type_id, attribute_id)
);

CREATE TABLE IF NOT EXISTS parts (
  code           TEXT PRIMARY KEY,
  group_id       TEXT NOT NULL REFERENCES groupings (id),
  part           TEXT NOT NULL,
  revision       INTEGER NOT NULL DEFAULT 0,
  name           TEXT NOT NULL,
  part_type_id   TEXT NOT NULL DEFAULT 'printed' REFERENCES part_types (id),
  qty_per_build  INTEGER NOT NULL DEFAULT 1,
  notes          TEXT,
  on_hand        INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'planned'
                 CHECK (status IN ('planned', 'completed')),
  source         TEXT NOT NULL DEFAULT 'csv',
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS parts_group_idx ON parts (group_id);

-- One row per set value; an unset attribute has no row.
CREATE TABLE IF NOT EXISTS part_attributes (
  part_code    TEXT NOT NULL REFERENCES parts (code) ON DELETE CASCADE,
  attribute_id INTEGER NOT NULL REFERENCES attribute_defs (id) ON DELETE CASCADE,
  value        TEXT NOT NULL,
  PRIMARY KEY (part_code, attribute_id)
);

-- Seeds run once, on a fresh db, so attributes deleted in Settings stay
-- deleted.
CREATE TABLE IF NOT EXISTS seeded (id INTEGER PRIMARY KEY);

INSERT OR IGNORE INTO part_types (id, name, sort)
SELECT * FROM (VALUES ('printed', 'Printed', 1), ('purchased', 'Purchased', 2))
WHERE NOT EXISTS (SELECT 1 FROM seeded);

INSERT OR IGNORE INTO attribute_defs (id, key, label, data_type, unit, options, system, sort)
SELECT * FROM (VALUES
  (1,  'colour',         'Colour',        'text',     NULL,  NULL, 1, 10),
  (2,  'material',       'Material',      'select',   NULL,  '["PETG","TPU","TPU 85A-90A"]', 1, 20),
  (3,  'print_time_min', 'Print time',    'integer',  'min', NULL, 1, 30),
  (4,  'filament_g',     'Filament',      'number',   'g',   NULL, 1, 40),
  (5,  'file_version',   'File version',  'text',     NULL,  NULL, 1, 50),
  (6,  'file_path',      'File path',     'text',     NULL,  NULL, 1, 60),
  (7,  'sku',            'SKU',           'text',     NULL,  NULL, 0, 70),
  (8,  'supplier',       'Supplier',      'text',     NULL,  NULL, 0, 80),
  (9,  'price',          'Price',         'currency', 'CAD', NULL, 0, 90),
  (10, 'supplier_url',   'Supplier link', 'url',      NULL,  NULL, 0, 100),
  (12, 'variant',        'Variant / option', 'text',  NULL,  NULL, 0, 110),
  (13, 'packs',          'Packs to buy',  'integer',  NULL,  NULL, 0, 120))
WHERE NOT EXISTS (SELECT 1 FROM seeded);

INSERT OR IGNORE INTO part_type_attributes (part_type_id, attribute_id)
SELECT * FROM (VALUES
  ('printed', 1), ('printed', 2), ('printed', 3), ('printed', 4),
  ('printed', 5), ('printed', 6),
  ('purchased', 1), ('purchased', 2), ('purchased', 7), ('purchased', 8),
  ('purchased', 9), ('purchased', 10), ('purchased', 12), ('purchased', 13))
WHERE NOT EXISTS (SELECT 1 FROM seeded);

INSERT OR IGNORE INTO seeded (id) VALUES (1);

-- Colours the STL viewer can show. A part whose colour attribute matches a
-- name (case-insensitive) previews in that colour. Seeded separately (seeded
-- id 2) so dbs created before this table still get the defaults.
CREATE TABLE IF NOT EXISTS preview_colours (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  hex  TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO preview_colours (name, hex, sort)
SELECT * FROM (VALUES
  ('Black',      '#2b2d30', 10),
  ('Dark Grey',  '#4a4e52', 20),
  ('Light Grey', '#b0b4b8', 30),
  ('Red',        '#c0392b', 40),
  ('Yellow',     '#f1c40f', 50))
WHERE NOT EXISTS (SELECT 1 FROM seeded WHERE id = 2);

INSERT OR IGNORE INTO seeded (id) VALUES (2);

-- Label templates (Settings → Label templates; printing). `elements` is the
-- template's JSON element list. Built-ins are inserted from the API's
-- templates/ folder on start-up if missing; they can be edited, not deleted.
CREATE TABLE IF NOT EXISTS label_templates (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE COLLATE NOCASE,
  description TEXT,
  width_mm    REAL NOT NULL,
  height_mm   REAL NOT NULL,
  elements    TEXT NOT NULL,
  builtin     INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- One preview image per part (uploaded, or scraped from its supplier link).
-- The file lives in the API's PART_IMAGES_DIR; `candidates` is the JSON list
-- of image URLs found by the last scrape, so another can be picked.
CREATE TABLE IF NOT EXISTS part_images (
  part_code  TEXT PRIMARY KEY REFERENCES parts (code) ON DELETE CASCADE,
  file       TEXT NOT NULL,
  source     TEXT NOT NULL CHECK (source IN ('upload', 'scrape')),
  source_url TEXT,
  candidates TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
