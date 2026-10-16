# Build context: the repo root (the CLI imports packages/shared and packages/db).
#   docker build -f apps/cli/.docker/Dockerfile .

FROM node:24-bookworm-slim AS deps
WORKDIR /app
# Toolchain in case better-sqlite3 has no prebuilt binary for this platform.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/cli/package.json apps/cli/
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
RUN npm ci --workspace @snowcat/cli

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production \
  DB_PATH=/data/parts.db \
  PARTS_INDEX_CSV=/import/parts-index.csv
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY packages/shared ./packages/shared
COPY packages/db ./packages/db
COPY apps/cli ./apps/cli
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
# The shared packages ship TypeScript source, so run through tsx.
ENTRYPOINT ["node", "--import", "tsx", "apps/cli/src/index.ts"]
