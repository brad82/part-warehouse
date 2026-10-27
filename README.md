# Parts Warehouse

Local parts index app: browse/search parts, track stock
and print data, preview STLs, scan labels, and print bag labels.

```sh
npm install
npm run import   # Parts Index.csv → data/parts.db (re-runnable; keeps stock/print data)
npm run dev      # API on :4000, web on http://localhost:3000, image scraper on :50051
npm run dev:core # the same without the image scraper
npm test && npm run typecheck && npm run lint
```

- Layout: `apps/api` (Fastify), `apps/web` (React), `apps/cli` (import and
  other one-off commands), `apps/image-scraper` (optional, gRPC),
  `packages/db` (SQLite schema + repositories), `packages/shared` (zod
  schemas, used everywhere), `packages/image-scraper-proto` (the scraper's
  gRPC contract and client).
- Part images: any part can have one (Image tab, or the only preview for
  parts without an STL). Upload, drop, paste or take a photo; images are
  centre-cropped to a 1024 px square in `data/part-images/`. Without an STL,
  labels print the image instead of the 3D render.
- Image scraper (optional): with `IMAGE_SCRAPER_URL` set, the API asks
  `apps/image-scraper` to find the image on a part's Supplier link. It
  tries a plain fetch, then headless Chromium (`npm run browser:install -w
  apps/image-scraper` once). It never solves robot checks; to solve one
  yourself, run with `PAGE_BROWSER_HEADED=1` and a Chromium window opens
  for it. Its cookies stay in `data/browser-profile/`.
- CLI: `npm run cli -- --help`. Other CSV or db:
  `npm run cli -- import --csv <path> --db <path>`.
- Label sheets: `npm run cli -- labels [codes…] --query <text> --start <1-30>`
  writes `labels.pdf` (Avery 5160). Templates are stored in the db (built-ins
  from `apps/api/templates/*.json`), rendered to SVG by `packages/shared` and
  to PDF by `packages/label-pdf`, so the CLI and the web app's labels match.
- One `import` command takes any parts CSV (e.g. `Parts Index.csv`,
  `Purchased Parts (proposed).csv`). Required columns: Code, Module, Module
  name, Sub-assembly, Sub-assembly name, Group, Group name, Part, Revision,
  Part name, Qty per build, Notes. Optional `Part type` (id or name; without
  it, existing parts keep their type and new ones are Printed) and
  `Colour / material` (split into colour + material). Every other column is
  matched to an attribute by key or label, ignoring case; unmatched columns
  are skipped with a warning. An empty cell clears that attribute.

- SQLite (`data/parts.db`) is the source of truth after import. Schema:
  `packages/db/migrations/001_initial.sql` (edit it, delete the db, re-import).
- Parts have a type (Printed, Purchased, …) and typed attributes (colour,
  material, print time, SKU, supplier, price in CAD, …). Edit both on the
  Settings page (gear icon). Built-in attributes (colour, material, print time,
  filament, file path/version) are read by the app, so their key and type are
  fixed. Values live in `part_attributes`; the import only writes the
  attributes that have a column in the CSV.
- STL viewer colours: Settings → STL Preview (`preview_colours` table). A part
  previews in the colour whose name matches its Colour attribute (ignoring
  case); no match shows Black with a dismissible notice.
- Add parts (e.g. purchased hardware) with the + next to the search box. The
  code uses the same `A00-000-000` scheme; the next free number is suggested.
- Frontend follows the ExpressPass web architecture (feature folders,
  Container/Provider/Page, `model/` hooks, RTK Query, MUI).
- Labels: the API renders each label as a PDF the size of its template (bag:
  58.76×101.6mm, the DYMO LabelWriter 450's 30857 badge page). Pick the
  printer in Settings → Printers & devices (the API machine's CUPS printers)
  and Print sends labels straight to it, picking the driver's matching paper
  size. With none picked, Print opens the PDF in a new tab to print with ⌘P.
  In Docker, set `CUPS_SERVER=host.docker.internal` and share the printer on
  the host.
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
docker compose run --rm -v "$PWD/../Purchased Parts (proposed).csv:/import/purchased.csv:ro" \
  cli import --csv /import/purchased.csv   # any other CSV
docker compose up -d --build   # http://localhost:3000 (WEB_PORT=8080 to change)
```

- The database lives in the `parts-data` volume, not `data/`. To bring over
  a local db, stop `npm run dev` first (flushes `parts.db-wal`), then:
  `docker compose stop api && docker compose run --rm -v "$PWD/data:/src:ro" api cp /src/parts.db /data/parts.db && docker compose start api`.
- Host paths (e.g. model files for `api`) go in the
  gitignored `docker-compose.override.yml`, which compose loads automatically.
  The `cli` service is in the `tools` profile, so `up` doesn't start it.
- Image scraper: off unless you start its profile and point the API at it:
  `IMAGE_SCRAPER_URL=image-scraper:50051 docker compose --profile scraper up -d --build`.
  Its browser cookies live in the `scraper-data` volume. There's no display
  in the container, so robot checks can't be solved there.
- "Open in PrusaSlicer" doesn't work from a container; use `npm run dev` for that.
- Served over plain HTTP, so camera scanning only works on `localhost`.
