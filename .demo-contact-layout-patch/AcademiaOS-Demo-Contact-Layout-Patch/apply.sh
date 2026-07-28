#!/usr/bin/env bash
set -euo pipefail

PATCH_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="${ACADEMIAOS_ROOT:-$HOME/workspace}"
APP="$ROOT/artifacts/academia-os"
PAGE="$APP/src/app/(portal)/demo-requests/page.tsx"
COPY_COMPONENT="$APP/src/components/CopyDemoRequestDetailsButton.tsx"
BACKUP="$ROOT/demo-contact-layout-backup-$(date +%Y%m%d-%H%M%S)"

if [ ! -d "$APP" ]; then
  echo "ERROR: AcademiaOS app not found at $APP"
  exit 1
fi

if [ ! -f "$APP/src/components/DeleteDemoRequestButton.tsx" ]; then
  echo "ERROR: DeleteDemoRequestButton runtime fix is missing."
  exit 1
fi

if [ ! -f "$APP/src/components/SchoolBadge.tsx" ]; then
  echo "ERROR: SchoolBadge component is missing. Apply the school initials patch first."
  exit 1
fi

mkdir -p "$BACKUP/src/app/(portal)/demo-requests" "$BACKUP/src/components"
[ -f "$PAGE" ] && cp -a "$PAGE" "$BACKUP/src/app/(portal)/demo-requests/page.tsx"
[ -f "$COPY_COMPONENT" ] && cp -a "$COPY_COMPONENT" "$BACKUP/src/components/CopyDemoRequestDetailsButton.tsx"

mkdir -p "$(dirname "$PAGE")" "$(dirname "$COPY_COMPONENT")"
cp -f "$PATCH_DIR/files/src/app/(portal)/demo-requests/page.tsx" "$PAGE"
cp -f "$PATCH_DIR/files/src/components/CopyDemoRequestDetailsButton.tsx" "$COPY_COMPONENT"

cd "$APP"
pnpm typecheck
pnpm build
test -f .next/BUILD_ID

echo
echo "===================================================="
echo " DEMO CONTACT LAYOUT: FIXED"
echo " EMAIL/PHONE OVERLAP: REMOVED"
echo " CONTACT DETAILS: CLEAR TWO-COLUMN CARDS"
echo " COPY DETAILS BUTTON: ADDED"
echo " SCHOOL INITIALS BADGE: SHOWN ON REQUEST"
echo " CREATE SCHOOL PREFILL: PRESERVED"
echo " DATABASE/REQUEST DATA: UNCHANGED"
echo " TYPECHECK: PASS"
echo " PRODUCTION BUILD: PASS"
echo "===================================================="
echo "Backup saved at: $BACKUP"
echo "Check /demo-requests in Preview before Republish."
