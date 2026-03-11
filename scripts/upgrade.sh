#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REMOTE="${GIT_REMOTE:-origin}"
BRANCH="${1:-main}"
BACKUP_DIR="$ROOT_DIR/backups"
DB_PATH="$ROOT_DIR/data/star-wiki.db"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
STASH_NAME="upgrade-$TIMESTAMP"

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

if ! git diff --quiet || ! git diff --cached --quiet || [[ -n "$(git ls-files --others --exclude-standard)" ]]; then
  log "working tree is not clean, stashing local changes"
  git stash push --include-untracked -m "$STASH_NAME" >/dev/null
fi

log "pulling latest code from $REMOTE/$BRANCH"
git pull --ff-only "$REMOTE" "$BRANCH"

log "installing dependencies with npm ci"
npm ci

log "running database initialization/migrations"
npm run init-db

log "building application"
npm run build

log "upgrade completed successfully"
log "database is preserved"
log "application was not started; start it with your own process manager"
log "if needed, inspect stashed local changes with: git stash list"
