# Build context: apps/terminal. The API owns the db schema; this only
# opens the db it creates on the shared volume.
#   docker build apps/terminal

FROM rust:1-bookworm AS build
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src src
RUN cargo build --release --locked

FROM debian:bookworm-slim
ENV HOST=0.0.0.0 \
  PORT=2323 \
  DB_PATH=/data/parts.db
COPY --from=build /app/target/release/parts-terminal /usr/local/bin/
# Same uid as the api's node user, so both can write the shared db volume.
RUN useradd --system --uid 1000 --no-create-home terminal \
  && mkdir -p /data && chown terminal:terminal /data
USER terminal
VOLUME /data
EXPOSE 2323
CMD ["parts-terminal"]
