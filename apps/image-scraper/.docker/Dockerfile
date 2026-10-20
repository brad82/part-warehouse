# Build context: the repo root (the scraper imports packages/image-scraper-proto).
#   docker build -f apps/image-scraper/.docker/Dockerfile .
#
# Optional module: the API calls it over gRPC when IMAGE_SCRAPER_URL is set.

FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/cli/package.json apps/cli/
COPY apps/image-scraper/package.json apps/image-scraper/
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
COPY packages/image-scraper-proto/package.json packages/image-scraper-proto/
COPY packages/shared/package.json packages/shared/
RUN npm ci --workspace @parts-warehouse/image-scraper

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production \
  IMAGE_SCRAPER_ADDRESS=0.0.0.0:50051 \
  BROWSER_PROFILE_DIR=/data/browser-profile \
  PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
COPY --from=deps /app/node_modules ./node_modules
# Headless Chromium and its system libraries, for supplier pages that need
# a real browser (src/lib/pageRenderer.ts).
RUN node node_modules/playwright-core/cli.js install --with-deps chromium \
  && rm -rf /var/lib/apt/lists/*
COPY package.json ./
COPY packages/image-scraper-proto ./packages/image-scraper-proto
COPY apps/image-scraper ./apps/image-scraper
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 50051
# The proto package ships TypeScript source, so run through tsx (as `npm start` does).
CMD ["node", "--import", "tsx", "apps/image-scraper/src/server.ts"]
