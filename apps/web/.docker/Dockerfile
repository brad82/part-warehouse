# Build context: the repo root (the web app imports packages/shared).
#   docker build -f apps/web/.docker/Dockerfile .

FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/cli/package.json apps/cli/
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
RUN npm ci --workspace @snowcat/web
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
RUN npm run build --workspace @snowcat/web

FROM nginx:1.27-alpine
COPY apps/web/.docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
