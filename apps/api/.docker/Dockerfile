# Build context: the repo root (the API imports packages/shared and packages/db).
#   docker build -f apps/api/.docker/Dockerfile .

FROM node:24-bookworm-slim AS deps
WORKDIR /app
# Toolchain in case better-sqlite3 has no prebuilt binary for this platform.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/cli/package.json apps/cli/
COPY apps/image-scraper/package.json apps/image-scraper/
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
COPY packages/label-pdf/package.json packages/label-pdf/
COPY packages/image-scraper-proto/package.json packages/image-scraper-proto/
COPY packages/shared/package.json packages/shared/
RUN npm ci --workspace @parts-warehouse/api

FROM node:24-bookworm-slim
WORKDIR /app
# lpstat/lp for label printing, through the CUPS server in CUPS_SERVER.
RUN apt-get update \
  && apt-get install -y --no-install-recommends cups-client \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
  HOST=0.0.0.0 \
  PORT=4000 \
  DB_PATH=/data/parts.db \
  MODEL_FILES_DIR=/models \
  PART_IMAGES_DIR=/data/part-images
# IMAGE_SCRAPER_URL (host:port of the optional image-scraper app) is set
# at run time; unset, supplier-link scraping is off.
# CUPS_SERVER (e.g. host.docker.internal) lists the printers offered in
# Settings → Printers & devices.
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY packages/shared ./packages/shared
COPY packages/db ./packages/db
COPY packages/label-pdf ./packages/label-pdf
COPY packages/image-scraper-proto ./packages/image-scraper-proto
COPY apps/api ./apps/api
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 4000
# The shared packages ship TypeScript source, so run through tsx (as `npm start` does).
CMD ["node", "--import", "tsx", "apps/api/src/server.ts"]
