#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REMOTE="${GIT_REMOTE:-origin}"
BRANCH="${1:-main}"
BACKUP_DIR="$ROOT_DIR/backups"
DB_PATH="$ROOT_DIR/data/star-wiki.db"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

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

require_command git
require_command npm
require_command node

cd "$ROOT_DIR"

if ! git diff --quiet || ! git diff --cached --quiet; then
  fail "working tree is not clean; commit or stash local changes before upgrading"
fi

log "repository: $ROOT_DIR"
log "remote: $REMOTE"
log "branch: $BRANCH"

mkdir -p "$BACKUP_DIR"

if [[ -f "$DB_PATH" ]]; then
  BACKUP_PATH="$BACKUP_DIR/star-wiki-$TIMESTAMP.db"
  cp "$DB_PATH" "$BACKUP_PATH"
  log "database backup created: $BACKUP_PATH"
else
  log "database file not found, skipping backup"
fi

log "fetching latest code"
git fetch "$REMOTE" "$BRANCH"

CURRENT_BRANCH="$(git branch --show-current)"
if [[ "$CURRENT_BRANCH" != "$BRANCH" ]]; then
  log "switching branch from $CURRENT_BRANCH to $BRANCH"
  git checkout "$BRANCH"
fi

log "pulling latest commits"
git pull --ff-only "$REMOTE" "$BRANCH"

log "installing dependencies with npm ci"
npm ci

log "running database initialization/migrations"
npm run init-db

log "building application"
npm run build

log "upgrade completed successfully"
log "application was not started; start it with your own process manager"
