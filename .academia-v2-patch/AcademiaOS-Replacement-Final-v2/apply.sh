#!/usr/bin/env bash
set -euo pipefail

PATCH_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="${ACADEMIAOS_ROOT:-$HOME/workspace}"
APP="$ROOT/artifacts/academia-os"
BACKUP="$ROOT/replacement-final-backup-$(date +%Y%m%d-%H%M%S)"

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

if [ -d "$ROOT/artifacts/academia-os-mobile" ]; then
  mobile_tmp="$(mktemp -d)"
  unzip -q "$PATCH_DIR/mobile/AcademiaOS-Mobile-v1.0.0-Final.zip" -d "$mobile_tmp"
  cp -a "$mobile_tmp/AcademiaOS-Mobile-v1.0.0/." "$ROOT/artifacts/academia-os-mobile/"
  rm -rf "$mobile_tmp"
fi

if [ -d "$ROOT/artifacts/academia-os-desktop" ]; then
  desktop_tmp="$(mktemp -d)"
  unzip -q "$PATCH_DIR/desktop/academia-os-desktop-final.zip" -d "$desktop_tmp"
  cp -a "$desktop_tmp/artifacts/academia-os-desktop/." "$ROOT/artifacts/academia-os-desktop/"
  rm -rf "$desktop_tmp"
fi

cp -f "$PATCH_DIR/mobile/AcademiaOS-Mobile-v1.0.0-Final.zip" "$ROOT/AcademiaOS-Mobile-v1.0.0-Final.zip"
cp -f "$PATCH_DIR/desktop/academia-os-desktop-final.zip" "$ROOT/academia-os-desktop-final.zip"

if [ "${SKIP_BUILD:-0}" != "1" ]; then
  cd "$APP"
  pnpm typecheck
  pnpm build
  test -f .next/BUILD_ID
fi

echo
echo "===================================================="
echo " SCHOOL CREATION + FULL SETUP: SUPER ADMIN ONLY"
echo " PROPRIETOR SCHOOL SETUP: REMOVED"
echo " PROPRIETOR LEARNER/STAFF VIEW: ENABLED"
echo " PROPRIETOR LEARNER/STAFF CREATION: BLOCKED"
echo " HOMEWORK TOPICS: ADMIN PAGE + SUPER ADMIN SETUP"
echo " SCHOOL ADMIN LEARNER/STAFF CREATION: SUPER ADMIN SWITCHES"
echo " WEB APP ANIMATION: SIGN-IN ONLY"
echo " MOBILE ANIMATION: SIGN-IN ONLY"
echo " DESKTOP ANIMATION: SIGN-IN ONLY"
echo " PUBLIC WEBSITE ANIMATION: CONTINUOUS"
echo " PERMANENT ACADEMIAOS LOGO ICON: RESTORED"
echo " HOMEWORK PDF/IMAGE UPLOAD: VISIBLE"
echo " GHANA DATE FORMAT: DD/MM/YYYY"
if [ "${SKIP_BUILD:-0}" != "1" ]; then
  echo " TYPECHECK: PASS"
  echo " PRODUCTION BUILD: PASS"
fi
echo "===================================================="
echo "Backup saved at: $BACKUP"
echo "Check Preview before Republish."
