#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANCH="${1:-main}"
REPO_SLUG="${GITHUB_REPO_SLUG:-Kxiandaoyan/Github-Star-Wiki}"
ZIP_URL="${GITHUB_REPO_ZIP_URL:-https://github.com/${REPO_SLUG}/archive/refs/heads/${BRANCH}.zip}"
BACKUP_DIR="$ROOT_DIR/backups"
DB_PATH="$ROOT_DIR/data/star-wiki.db"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
TMP_DIR="${TMPDIR:-/tmp}/star-wiki-upgrade-$TIMESTAMP"
ZIP_PATH="$TMP_DIR/app.zip"
EXTRACT_DIR="$TMP_DIR/extracted"

log() {
  printf '[upgrade] %s\n' "$1"
}

fail() {
  printf '[upgrade] ERROR: %s\n' "$1" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "missing required command: $1"
}

require_downloader() {
  if command -v curl >/dev/null 2>&1; then
    DOWNLOADER="curl"
    return
  fi

  if command -v wget >/dev/null 2>&1; then
    DOWNLOADER="wget"
    return
  fi

  fail "missing required command: curl or wget"
}

cleanup() {
  rm -rf "$TMP_DIR"
}

trap cleanup EXIT

require_command unzip
require_command rsync
require_command npm
require_command node
require_downloader

cd "$ROOT_DIR"

log "repository dir: $ROOT_DIR"
log "branch: $BRANCH"
log "zip url: $ZIP_URL"

mkdir -p "$BACKUP_DIR"
mkdir -p "$TMP_DIR"
mkdir -p "$EXTRACT_DIR"

if [[ -f "$DB_PATH" ]]; then
  BACKUP_PATH="$BACKUP_DIR/star-wiki-$TIMESTAMP.db"
  cp "$DB_PATH" "$BACKUP_PATH"
  log "database backup created: $BACKUP_PATH"
else
  log "database file not found, skipping backup"
fi

log "downloading source archive"
if [[ "$DOWNLOADER" == "curl" ]]; then
  curl -fL "$ZIP_URL" -o "$ZIP_PATH"
else
  wget -O "$ZIP_PATH" "$ZIP_URL"
fi

log "extracting archive"
unzip -q "$ZIP_PATH" -d "$EXTRACT_DIR"

SOURCE_DIR="$(find "$EXTRACT_DIR" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
[[ -n "$SOURCE_DIR" ]] || fail "failed to locate extracted source directory"

log "syncing files into deployment directory"
rsync -a --delete \
  --exclude '.env' \
  --exclude '.env.local' \
  --exclude 'data/' \
  --exclude 'node_modules/' \
  --exclude 'logs/' \
  --exclude 'backups/' \
  --exclude '.git/' \
  "$SOURCE_DIR/" "$ROOT_DIR/"

log "installing dependencies with npm ci"
npm ci

log "running database initialization/migrations"
npm run init-db

log "building application"
npm run build

log "upgrade completed successfully"
log "database and .env were preserved"
log "application was not started; start it with your own process manager"
