#!/usr/bin/env bash
set -euo pipefail

APP="$HOME/workspace/artifacts/academia-os"
PATCH_ROOT="$(cd "$(dirname "$0")" && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$HOME/workspace/demo-paid-separation-backup-$STAMP"

[ -d "$APP" ] || { echo "ERROR: AcademiaOS app not found at $APP"; exit 1; }
[ -f "$PATCH_ROOT/apply.mjs" ] || { echo "ERROR: apply.mjs missing from patch"; exit 1; }

mkdir -p "$BACKUP"
for rel in \
  'src/app/(portal)/demo-requests/page.tsx' \
  'src/app/(portal)/schools/enrol/page.tsx' \
  'src/app/actions/auth.ts' \
  'src/lib/auth.ts' \
  'src/app/api/mobile/v1/auth/login/route.ts' \
  'src/app/api/desktop/v1/auth/login/route.ts'; do
  if [ -f "$APP/$rel" ]; then
    mkdir -p "$BACKUP/$(dirname "$rel")"
    cp "$APP/$rel" "$BACKUP/$rel"
  fi
done

APP="$APP" PATCH_ROOT="$PATCH_ROOT" node "$PATCH_ROOT/apply.mjs"

cd "$APP"
pnpm typecheck
pnpm build

echo
echo "===================================================="
echo " DEMO + PAID SCHOOL WORKFLOWS: SEPARATED"
echo " CREATE 7-DAY DEMO: ENABLED"
echo " DEMO EXPIRY: AUTOMATIC AFTER 7 DAYS"
echo " DEMO EXTEND + REVOKE: ENABLED"
echo " CONVERT TO PAID SCHOOL: SEPARATE ROUTE"
echo " PAID ENROLMENT ROUTE: /schools/enrol"
echo " DEMO AND PRODUCTION DATA: NOT AUTO-MERGED"
echo " SCHOOL/ADMIN PHOTOS: OPTIONAL"
echo " SCHOOL INITIALS: PRESERVED"
echo " DATABASE MIGRATION: NOT REQUIRED"
echo " TYPECHECK: PASS"
echo " PRODUCTION BUILD: PASS"
echo "===================================================="
echo "Backup saved at: $BACKUP"
echo "Check Preview before Republish."
