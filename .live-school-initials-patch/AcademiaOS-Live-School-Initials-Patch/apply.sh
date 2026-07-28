#!/usr/bin/env bash
set -euo pipefail

PATCH_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="${ACADEMIAOS_ROOT:-$HOME/workspace}"
APP="$ROOT/artifacts/academia-os"
BACKUP="$ROOT/live-school-initials-backup-$(date +%Y%m%d-%H%M%S)"

if [ ! -d "$APP" ]; then
  echo "ERROR: AcademiaOS web app not found at $APP"
  exit 1
fi

mkdir -p "$BACKUP"

while IFS= read -r -d '' source_file; do
  rel="${source_file#"$PATCH_DIR/web/"}"
  destination="$APP/$rel"

  if [ -f "$destination" ]; then
    mkdir -p "$BACKUP/$(dirname "$rel")"
    cp -a "$destination" "$BACKUP/$rel"
  fi

  mkdir -p "$(dirname "$destination")"
  cp -f "$source_file" "$destination"
done < <(find "$PATCH_DIR/web" -type f -print0)

cd "$APP"
pnpm typecheck
pnpm build
test -f .next/BUILD_ID

echo
echo "===================================================="
echo " LIVE SCHOOL INITIALS: APPLIED"
echo " DEMO REQUEST TYPING PREVIEW: ENABLED"
echo " REGISTER SCHOOL TYPING PREVIEW: ENABLED"
echo " ENROLL SCHOOL TYPING PREVIEW: ENABLED"
echo " EXISTING SCHOOL SETUP TYPING PREVIEW: ENABLED"
echo " SHORT CODE FROM INITIALS: AUTOMATIC"
echo " EXAMPLE: PAUL LAWRENCE ACADEMY -> PLA"
echo " DATABASE MIGRATION: NOT REQUIRED"
echo " OTHER WORKING FEATURES: UNCHANGED"
echo " TYPECHECK: PASS"
echo " PRODUCTION BUILD: PASS"
echo "===================================================="
echo "Backup saved at: $BACKUP"
echo "Check Preview before Republish."
