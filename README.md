# Snowcat Parts

Local app for the 4x3D Snowcat parts index: browse/search parts, track stock
and print data, preview STLs, scan labels, and print bag labels.

```sh
npm install
npm run import   # Parts Index.csv → data/parts.db (re-runnable; keeps stock/print data)
npm run dev      # API on :4000, web on http://localhost:3000
npm test && npm run typecheck && npm run lint
```

- Layout: `apps/api` (Fastify), `apps/web` (React), `apps/cli` (import and
  other one-off commands), `packages/db` (SQLite schema + repositories),
  `packages/shared` (zod schemas, used everywhere).
- CLI: `npm run cli -- --help`. Other CSV or db:
  `npm run cli -- import --csv <path> --db <path>`.

- SQLite (`data/parts.db`) is the source of truth after import. Schema:
  `packages/db/migrations/001_initial.sql` (edit it, delete the db, re-import).
- Parts have a type (Printed, Purchased, …) and typed attributes (colour,
  material, print time, SKU, supplier, price in CAD, …). Edit both on the
  Settings page (gear icon). Built-in attributes (colour, material, print time,
  filament, file path/version) are read by the app, so their key and type are
  fixed. Values live in `part_attributes`; the import only writes colour,
  material and file path/version.
- STL viewer colours: Settings → STL Preview (`preview_colours` table). A part
  previews in the colour whose name matches its Colour attribute (ignoring
  case); no match shows Black with a dismissible notice.
- Add parts (e.g. purchased hardware) with the + next to the search box. The
  code uses the same `A00-000-000` scheme; the next free number is suggested.
- Frontend follows the ExpressPass web architecture (feature folders,
  Container/Provider/Page, `model/` hooks, RTK Query, MUI).
- Labels: print dialog → Brother QL-800 driver, paper "62mm x 100mm". Sizes in
  `apps/web/src/features/labels/model/templates.ts`.
- Barcodes (Code128 + QR) encode the part code only, e.g. `A01-001-001`.
- Camera scanning needs `localhost` or HTTPS (browser rule). Handheld USB
  scanners work anywhere via the dialog's text field.
- iPad: `npm run dev` prints a `Network:` URL. Open it in Safari on the same
  Wi-Fi → Share → Add to Home Screen. It opens full screen like an app. The
  Mac must stay on with `npm run dev` running.
- iPad camera scanning needs HTTPS with a cert the iPad trusts:
  `brew install mkcert && mkcert -install`, then in `parts-app/`:
  `mkdir certs && mkcert -cert-file certs/cert.pem -key-file certs/key.pem <mac-ip> localhost`.
  AirDrop `$(mkcert -CAROOT)/rootCA.pem` to the iPad, install the profile, and
  enable it under Settings → General → About → Certificate Trust Settings.
  Restart `npm run dev`; the URL becomes `https://`. Re-add the home screen icon.

## Docker

```sh
cp docker-compose.override.example.yml docker-compose.override.yml   # then edit paths
docker compose run --rm cli import   # first run: CSV → volume
docker compose up -d --build   # http://localhost:3000 (WEB_PORT=8080 to change)
```

- The database lives in the `parts-data` volume, not `data/`. To bring over
  a local db, stop `npm run dev` first (flushes `parts.db-wal`), then:
  `docker compose stop api && docker compose run --rm -v "$PWD/data:/src:ro" api cp /src/parts.db /data/parts.db && docker compose start api`.
- Host paths (e.g. model files for `api`) go in the
  gitignored `docker-compose.override.yml`, which compose loads automatically.
  The `cli` service is in the `tools` profile, so `up` doesn't start it.
- "Open in PrusaSlicer" doesn't work from a container; use `npm run dev` for that.
- Served over plain HTTP, so camera scanning only works on `localhost`.
