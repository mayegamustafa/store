#!/bin/bash
# TotalStore Deploy Script
# Usage: ./deploy.sh [app]
# Apps: api, web, admin, seller, all
# Example: ./deploy.sh web    - rebuild and restart web only
#          ./deploy.sh all    - rebuild and restart everything
#
# Env flags:
#   SKIP_MIGRATIONS=1      Skip prisma migrate deploy (e.g. for code-only hotfixes)
#   SKIP_DB_BACKUP=1       Skip pg_dump pre-migration safety backup
#   DB_BACKUP_DIR=/path    Directory for pre-migration backups (default: $PROJECT_DIR/backups)

set -e

PROJECT_DIR="/home/mustafa/total-store"
cd "$PROJECT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err() { echo -e "${RED}[ERROR]${NC} $1"; }

# Pre-migration safety backup (best-effort; never blocks deploy unless DB unreachable).
db_backup() {
  if [ "$SKIP_DB_BACKUP" = "1" ]; then
    warn "SKIP_DB_BACKUP=1 → skipping pre-migration backup"
    return 0
  fi
  local backup_dir="${DB_BACKUP_DIR:-$PROJECT_DIR/backups}"
  mkdir -p "$backup_dir"
  local ts; ts=$(date -u +"%Y%m%dT%H%M%SZ")
  local out="$backup_dir/pre-migrate-$ts.sql.gz"
  log "Backing up DB → $out"
  # Use DATABASE_URL from apps/api/.env; pg_dump must be available on the host.
  if [ -f "$PROJECT_DIR/apps/api/.env" ]; then
    # shellcheck disable=SC2046
    export $(grep -E '^DATABASE_URL=' "$PROJECT_DIR/apps/api/.env" | xargs -d '\n' -I{} echo {})
  fi
  if [ -z "$DATABASE_URL" ]; then
    warn "DATABASE_URL unset — skipping backup"
    return 0
  fi
  if ! command -v pg_dump >/dev/null 2>&1; then
    warn "pg_dump not installed — skipping backup"
    return 0
  fi
  if pg_dump "$DATABASE_URL" | gzip -c > "$out"; then
    log "Backup written: $(du -h "$out" | cut -f1)"
    # Keep the last 14 backups; prune older.
    ls -1t "$backup_dir"/pre-migrate-*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm -f
  else
    err "Backup failed (deploy continuing — review before re-running)"
    return 0
  fi
}

# Apply Prisma migrations safely.
# Aborts deploy on schema drift (schema.prisma vs applied migrations) — operator must reconcile.
db_migrate() {
  if [ "$SKIP_MIGRATIONS" = "1" ]; then
    warn "SKIP_MIGRATIONS=1 → skipping prisma migrate deploy"
    return 0
  fi
  cd "$PROJECT_DIR/apps/api"
  log "Generating Prisma client..."
  npx prisma generate >/dev/null 2>&1 || true
  log "Checking for pending migrations..."
  # `migrate status` exits non-zero if pending migrations or drift detected.
  # We allow pending (will apply) but warn on drift.
  if ! npx prisma migrate status 2>&1 | tee /tmp/prisma-migrate-status.log >/dev/null; then
    if grep -q "drift" /tmp/prisma-migrate-status.log; then
      err "Schema drift detected. Reconcile manually before deploying:"
      cat /tmp/prisma-migrate-status.log
      exit 1
    fi
  fi
  cat /tmp/prisma-migrate-status.log
  log "Applying migrations (prisma migrate deploy)..."
  npx prisma migrate deploy
  log "Migrations applied ✓"
}

deploy_api() {
  log "Building API..."
  cd "$PROJECT_DIR/apps/api"
  npx prisma generate 2>/dev/null || true
  npm run build
  log "Restarting ts-api..."
  pm2 restart ts-api --update-env
  log "API deployed!"
}

deploy_web() {
  log "Building Web (buyer storefront)..."
  cd "$PROJECT_DIR/apps/web"
  npx next build
  log "Restarting ts-web..."
  pm2 restart ts-web --update-env
  log "Web deployed!"
}

deploy_admin() {
  log "Building Admin panel..."
  cd "$PROJECT_DIR/apps/admin"
  npx next build
  log "Restarting ts-admin..."
  pm2 restart ts-admin --update-env
  log "Admin deployed!"
}

deploy_seller() {
  log "Building Seller panel..."
  cd "$PROJECT_DIR/apps/seller"
  npx next build
  log "Restarting ts-seller..."
  pm2 restart ts-seller --update-env
  log "Seller deployed!"
}

APP="${1:-all}"

case "$APP" in
  api)
    db_backup
    db_migrate
    deploy_api
    ;;
  web)
    deploy_web
    ;;
  admin)
    deploy_admin
    ;;
  seller)
    deploy_seller
    ;;
  all)
    db_backup
    db_migrate
    deploy_api
    deploy_web
    deploy_admin
    deploy_seller
    log "Restarting proxy..."
    pm2 restart ts-proxy
    ;;
  *)
    err "Unknown app: $APP"
    echo "Usage: $0 [api|web|admin|seller|all]"
    exit 1
    ;;
esac

pm2 save
log "Deploy complete! ✓"
