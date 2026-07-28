#!/usr/bin/env bash
set -euo pipefail

PATCH_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="${ACADEMIAOS_ROOT:-$HOME/workspace}"
APP="$ROOT/artifacts/academia-os"
BACKUP="$ROOT/brand-colour-backup-$(date +%Y%m%d-%H%M%S)"

if [ ! -d "$APP" ]; then
  echo "ERROR: AcademiaOS web app not found at $APP"
  exit 1
fi

mkdir -p "$BACKUP/web/src/components" "$BACKUP/web/src/app" "$BACKUP/web/public"

for rel in \
  src/components/DevourLogo.tsx \
  src/components/Brand.tsx \
  src/app/globals.css \
  public/desktop-src.zip \
  public/academia-os-desktop.zip; do
  if [ -f "$APP/$rel" ]; then
    mkdir -p "$BACKUP/web/$(dirname "$rel")"
    cp -a "$APP/$rel" "$BACKUP/web/$rel"
  fi
  cp -f "$PATCH_DIR/web/$rel" "$APP/$rel"
done

if [ -d "$ROOT/artifacts/academia-os-mobile" ]; then
  mobile_tmp="$(mktemp -d)"
  unzip -q "$PATCH_DIR/mobile/AcademiaOS-Mobile-v1.0.0-Brand-Colour.zip" -d "$mobile_tmp"
  mobile_rel="src/components/DevourLogo.tsx"
  if [ -f "$ROOT/artifacts/academia-os-mobile/$mobile_rel" ]; then
    mkdir -p "$BACKUP/mobile/$(dirname "$mobile_rel")"
    cp -a "$ROOT/artifacts/academia-os-mobile/$mobile_rel" "$BACKUP/mobile/$mobile_rel"
  fi
  cp -f "$mobile_tmp/AcademiaOS-Mobile-v1.0.0/$mobile_rel" "$ROOT/artifacts/academia-os-mobile/$mobile_rel"
  rm -rf "$mobile_tmp"
fi

if [ -d "$ROOT/artifacts/academia-os-desktop" ]; then
  desktop_tmp="$(mktemp -d)"
  unzip -q "$PATCH_DIR/desktop/academia-os-desktop-brand-colour.zip" -d "$desktop_tmp"
  for rel in \
    src/components/DevourLogo.tsx \
    src/index.css \
    src/components/TitleBar.tsx \
    src/screens/SplashScreen.tsx; do
    if [ -f "$ROOT/artifacts/academia-os-desktop/$rel" ]; then
      mkdir -p "$BACKUP/desktop/$(dirname "$rel")"
      cp -a "$ROOT/artifacts/academia-os-desktop/$rel" "$BACKUP/desktop/$rel"
    fi
    cp -f "$desktop_tmp/artifacts/academia-os-desktop/$rel" "$ROOT/artifacts/academia-os-desktop/$rel"
  done
  rm -rf "$desktop_tmp"
fi

cp -f "$PATCH_DIR/mobile/AcademiaOS-Mobile-v1.0.0-Brand-Colour.zip" "$ROOT/AcademiaOS-Mobile-v1.0.0-Brand-Colour.zip"
cp -f "$PATCH_DIR/desktop/academia-os-desktop-brand-colour.zip" "$ROOT/academia-os-desktop-brand-colour.zip"

cd "$APP"
pnpm typecheck
pnpm build
test -f .next/BUILD_ID

echo
echo "===================================================="
echo " BRAND COLOUR PATCH: APPLIED"
echo " ACADEMIA: DEEP GREEN ON LIGHT BACKGROUNDS"
echo " ACADEMIA: WARM WHITE ON DARK BACKGROUNDS"
echo " OS + EATING CHARACTER: GOLDEN YELLOW"
echo " EAT/REWRITE TIMING: UNCHANGED"
echo " POST-LOGIN BRAND: STATIC"
echo " PERMISSIONS/HOMEWORK/DATES: UNCHANGED"
echo " TYPECHECK: PASS"
echo " PRODUCTION BUILD: PASS"
echo "===================================================="
echo "Backup saved at: $BACKUP"
echo "Check Preview before Republish."
