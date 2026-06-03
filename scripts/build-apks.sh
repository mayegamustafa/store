#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# TotalStore — Build & Deploy Mobile APKs
# Usage:  ./scripts/build-apks.sh [buyer|seller|rider|all]
# ──────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB_PUBLIC="$ROOT/apps/web/public/apps"
VERSION_FILE="$WEB_PUBLIC/version.json"

# App config: directory → pubspec version key
declare -A APP_DIRS=(
  [buyer]="$ROOT/apps/mobile-buyer"
  [seller]="$ROOT/apps/mobile-seller"
  [rider]="$ROOT/apps/mobile-rider"
)

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${BLUE}[build]${NC} $1"; }
ok()   { echo -e "${GREEN}  ✓${NC} $1"; }
warn() { echo -e "${YELLOW}  ⚠${NC} $1"; }
fail() { echo -e "${RED}  ✗${NC} $1"; exit 1; }

# Extract version from pubspec.yaml
get_version() {
  grep '^version:' "$1/pubspec.yaml" | head -1 | sed 's/version: //' | cut -d'+' -f1
}

get_version_code() {
  grep '^version:' "$1/pubspec.yaml" | head -1 | sed 's/version: //' | cut -d'+' -f2
}

# Build a single app
build_app() {
  local name="$1"
  local dir="${APP_DIRS[$name]}"
  local version
  version=$(get_version "$dir")
  local version_code
  version_code=$(get_version_code "$dir")
  local apk_src="$dir/build/app/outputs/flutter-apk/app-release.apk"
  local dest_dir="$WEB_PUBLIC/$name"
  local versioned_name="${name}-app-v${version}.apk"

  log "Building $name app (v${version}+${version_code})..."

  # Kill stale Gradle daemons to prevent Metaspace OOM
  pkill -f "GradleDaemon" 2>/dev/null || true
  sleep 1

  pushd "$dir" > /dev/null

  flutter clean > /dev/null 2>&1
  flutter pub get > /dev/null 2>&1
  
  log "  Running flutter build apk --release (this takes ~5-10 min)..."
  if flutter build apk --release 2>&1 | tail -5; then
    ok "Built $name APK"
  else
    fail "Build failed for $name"
  fi

  popd > /dev/null

  # Verify APK exists
  [[ -f "$apk_src" ]] || fail "APK not found at $apk_src"

  # Copy to versioned directory
  mkdir -p "$dest_dir"
  cp "$apk_src" "$dest_dir/$versioned_name"
  cp "$apk_src" "$dest_dir/latest.apk"
  ok "Deployed: $dest_dir/$versioned_name"
  ok "Updated:  $dest_dir/latest.apk"

  # Update version.json
  update_version_json "$name" "$version" "$version_code"
}

# Update version.json entry for an app
update_version_json() {
  local name="$1"
  local version="$2"
  local version_code="$3"
  local date
  date=$(date +%Y-%m-%d)

  # Create version.json if missing
  if [[ ! -f "$VERSION_FILE" ]]; then
    echo '{}' > "$VERSION_FILE"
  fi

  # Use node to safely update JSON (jq may not be installed)
  node -e "
    const fs = require('fs');
    const data = JSON.parse(fs.readFileSync('$VERSION_FILE', 'utf8'));
    data['$name'] = {
      version: '$version',
      versionCode: parseInt('$version_code'),
      url: '/apps/$name/latest.apk',
      releaseDate: '$date',
      changelog: data['$name']?.changelog || 'Production release',
      forceUpdate: false,
      minVersion: data['$name']?.minVersion || '1.0.0'
    };
    fs.writeFileSync('$VERSION_FILE', JSON.stringify(data, null, 2) + '\n');
  "
  ok "Updated version.json: $name → v$version"
}

# ── Main ─────────────────────────────────────────────────────
target="${1:-all}"

mkdir -p "$WEB_PUBLIC"

log "TotalStore APK Build Pipeline"
log "=============================="
echo ""

if [[ "$target" == "all" ]]; then
  for app in buyer seller rider; do
    build_app "$app"
    echo ""
  done
else
  if [[ -z "${APP_DIRS[$target]+x}" ]]; then
    fail "Unknown app: $target (choose: buyer, seller, rider, all)"
  fi
  build_app "$target"
fi

echo ""
log "Build complete! APK summary:"
echo ""
ls -lh "$WEB_PUBLIC"/*/latest.apk 2>/dev/null || true
echo ""
log "Version manifest:"
cat "$VERSION_FILE"
echo ""
ok "All done. Footer download links point to /apps/<app>/latest.apk"
