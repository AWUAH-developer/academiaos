#!/usr/bin/env bash
set -euo pipefail

PATCH_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$HOME/workspace"
APP="$ROOT/artifacts/academia-os"
BACKUP="$ROOT/corrective-backup-$(date +%Y%m%d-%H%M%S)"

if [ ! -d "$APP" ]; then
  echo "ERROR: AcademiaOS web app not found at $APP"
  exit 1
fi

FILES=(
  'src/components/DevourLogo.tsx'
  'src/components/Brand.tsx'
  'src/components/marketing/HeroEntrance.tsx'
  'src/components/HomeworkPublishForm.tsx'
  'src/components/GhanaDateInput.tsx'
  'src/components/SchoolEnrolmentWizard.tsx'
  'src/app/actions/academics.ts'
  'src/app/actions/setup.ts'
  'src/app/(portal)/homework/page.tsx'
  'src/app/(portal)/setup/page.tsx'
  'src/app/(portal)/attendance/page.tsx'
  'src/app/(portal)/staff-attendance/page.tsx'
  'src/app/(portal)/fees/page.tsx'
  'src/app/(portal)/learners/page.tsx'
  'src/app/globals.css'
  'public/academia-os-desktop.zip'
  'public/desktop-src.zip'
)

mkdir -p "$BACKUP"
for rel in "${FILES[@]}"; do
  if [ -f "$APP/$rel" ]; then
    mkdir -p "$BACKUP/$(dirname "$rel")"
    cp -a "$APP/$rel" "$BACKUP/$rel"
  fi
done

for rel in "${FILES[@]}"; do
  if [ -f "$PATCH_DIR/web/$rel" ]; then
    mkdir -p "$APP/$(dirname "$rel")"
    cp -f "$PATCH_DIR/web/$rel" "$APP/$rel"
  fi
done

if [ -d "$ROOT/artifacts/academia-os-mobile" ]; then
  TMP_MOBILE="$(mktemp -d)"
  unzip -q "$PATCH_DIR/mobile/AcademiaOS-Mobile-v1.0.0-Corrected.zip" -d "$TMP_MOBILE"
  cp -a "$TMP_MOBILE/AcademiaOS-Mobile-v1.0.0/." "$ROOT/artifacts/academia-os-mobile/"
  rm -rf "$TMP_MOBILE"
fi

if [ -d "$ROOT/artifacts/academia-os-desktop" ]; then
  TMP_DESKTOP="$(mktemp -d)"
  unzip -q "$PATCH_DIR/desktop/academia-os-desktop-corrected.zip" -d "$TMP_DESKTOP"
  cp -a "$TMP_DESKTOP/artifacts/academia-os-desktop/." "$ROOT/artifacts/academia-os-desktop/"
  rm -rf "$TMP_DESKTOP"
fi

cp -f "$PATCH_DIR/mobile/AcademiaOS-Mobile-v1.0.0-Corrected.zip" "$ROOT/AcademiaOS-Mobile-v1.0.0-Corrected.zip"
cp -f "$PATCH_DIR/desktop/academia-os-desktop-corrected.zip" "$ROOT/academia-os-desktop-corrected.zip"

cd "$APP"
pnpm typecheck
pnpm build

echo
echo "============================================="
echo " ACADEMIAOS CORRECTIVE PATCH: APPLIED"
echo " PERMANENT BRAND ICON: RESTORED"
echo " WORD CYCLE: EAT -> REWRITE -> LONG HOLD"
echo " HOMEWORK FILE/IMAGE UPLOAD: RESTORED"
echo " CURRICULUM TOPIC REQUIREMENT: REMOVED"
echo " GHANA DATE FORMAT: DD/MM/YYYY"
echo " TYPECHECK: PASS"
echo " PRODUCTION BUILD: PASS"
echo "============================================="
echo "Backup saved at: $BACKUP"
echo "Check Preview, then Republish."
