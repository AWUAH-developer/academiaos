#!/usr/bin/env bash
set -euo pipefail

PATCH_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="${ACADEMIAOS_ROOT:-$HOME/workspace}"
APP="$ROOT/artifacts/academia-os"
BACKUP="$ROOT/school-initials-backup-$(date +%Y%m%d-%H%M%S)"

if [ ! -d "$APP" ]; then
  echo "ERROR: AcademiaOS web app not found at $APP"
  exit 1
fi

mkdir -p "$BACKUP"

while IFS= read -r -d '' source_file; do
  rel="${source_file#"$PATCH_DIR/web/"}"
  destination="$APP/$rel"

  if [ -f "$destination" ]; then
    mkdir -p "$BACKUP/web/$(dirname "$rel")"
    cp -a "$destination" "$BACKUP/web/$rel"
  fi

  mkdir -p "$(dirname "$destination")"
  cp -f "$source_file" "$destination"
done < <(find "$PATCH_DIR/web" -type f -print0)

# Update existing mobile source without rebuilding it here.
if [ -d "$ROOT/artifacts/academia-os-mobile" ]; then
  mobile_tmp="$(mktemp -d)"
  unzip -q "$PATCH_DIR/mobile/AcademiaOS-Mobile-v1.0.0-School-Initials.zip" -d "$mobile_tmp"
  rel="src/components/ui.tsx"
  if [ -f "$ROOT/artifacts/academia-os-mobile/$rel" ]; then
    mkdir -p "$BACKUP/mobile/$(dirname "$rel")"
    cp -a "$ROOT/artifacts/academia-os-mobile/$rel" "$BACKUP/mobile/$rel"
  fi
  cp -f "$mobile_tmp/AcademiaOS-Mobile-v1.0.0/$rel" "$ROOT/artifacts/academia-os-mobile/$rel"
  rm -rf "$mobile_tmp"
fi

# Update existing desktop source without rebuilding it here.
if [ -d "$ROOT/artifacts/academia-os-desktop" ]; then
  desktop_tmp="$(mktemp -d)"
  unzip -q "$PATCH_DIR/desktop/academia-os-desktop-school-initials.zip" -d "$desktop_tmp"
  for rel in src/components/TitleBar.tsx src/App.tsx; do
    if [ -f "$ROOT/artifacts/academia-os-desktop/$rel" ]; then
      mkdir -p "$BACKUP/desktop/$(dirname "$rel")"
      cp -a "$ROOT/artifacts/academia-os-desktop/$rel" "$BACKUP/desktop/$rel"
    fi
    cp -f "$desktop_tmp/artifacts/academia-os-desktop/$rel" "$ROOT/artifacts/academia-os-desktop/$rel"
  done
  rm -rf "$desktop_tmp"
fi

cp -f "$PATCH_DIR/mobile/AcademiaOS-Mobile-v1.0.0-School-Initials.zip" "$ROOT/AcademiaOS-Mobile-v1.0.0-School-Initials.zip"
cp -f "$PATCH_DIR/desktop/academia-os-desktop-school-initials.zip" "$ROOT/academia-os-desktop-school-initials.zip"

cd "$APP"
pnpm typecheck
pnpm build
test -f .next/BUILD_ID

echo
echo "===================================================="
echo " SCHOOL INITIALS BADGE: APPLIED"
echo " EXAMPLE: PAUL LAWRENCE ACADEMY -> PLA"
echo " CUSTOM SCHOOL LOGOS: PRESERVED"
echo " SCHOOL LOGO DURING ENROLMENT: OPTIONAL"
echo " REMOVE CUSTOM LOGO -> INITIALS: ENABLED"
echo " WEB SIDEBAR/SCHOOL LIST/SETUP/ID CARDS: UPDATED"
echo " MOBILE SOURCE FALLBACK BADGE: UPDATED"
echo " DESKTOP SOURCE TITLE BAR BADGE: UPDATED"
echo " DATABASE MIGRATION: NOT REQUIRED"
echo " PERMISSIONS/HOMEWORK/DATES/ANIMATION: UNCHANGED"
echo " TYPECHECK: PASS"
echo " PRODUCTION BUILD: PASS"
echo "===================================================="
echo "Backup saved at: $BACKUP"
echo "Check Preview before Republish."
