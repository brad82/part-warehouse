#!/usr/bin/env bash
# Builds the terminal image from this working copy, copies it to the server
# over SSH and restarts the terminal on it. No registry or git push.
#
#   apps/terminal/deploy.sh
#
# Expects the server's docker-compose.terminal.yml from the first deploy;
# only its image line is changed. Override the target with
# DEPLOY_HOST=dvl.lan DEPLOY_DIR=/home/brad/projects/erp.
set -euo pipefail

host=${DEPLOY_HOST:-dvl.lan}
dir=${DEPLOY_DIR:-/home/brad/projects/erp}
app_dir=$(cd "$(dirname "$0")" && pwd)
compose="docker compose -f docker-compose.yml -f docker-compose.terminal.yml"

case $(ssh "$host" uname -m) in
  x86_64) platform=linux/amd64 ;;
  *) platform=linux/arm64 ;;
esac

sha=$(git -C "$app_dir" rev-parse --short HEAD)
[ -z "$(git -C "$app_dir" status --porcelain -- .)" ] || sha="$sha-dirty"
tag="parts-terminal:$sha-$(date +%Y%m%d%H%M%S)"

echo "==> Building $tag ($platform)"
docker build --platform "$platform" -t "$tag" "$app_dir"

echo "==> Copying to $host"
docker save "$tag" | gzip | ssh "$host" 'gunzip | docker load'

echo "==> Restarting the terminal"
ssh "$host" "cd '$dir' &&
  sed -i 's|^\(    image: \).*|\1$tag|' docker-compose.terminal.yml &&
  $compose up -d --no-deps terminal &&
  sleep 2 && $compose logs --tail 3 terminal"
