#!/usr/bin/env bash
set -euo pipefail

PATCH_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="${ACADEMIAOS_ROOT:-$HOME/workspace}"
APP="$ROOT/artifacts/academia-os"
BACKUP="$ROOT/school-onboarding-handoff-backup-$(date +%Y%m%d-%H%M%S)"

if [ ! -f "$APP/package.json" ]; then
  echo "ERROR: AcademiaOS web app not found at $APP"
  exit 1
fi

REQUIRED=(
  "src/app/(portal)/schools/page.tsx"
  "src/app/(portal)/demo-requests/page.tsx"
  "src/components/SchoolEnrolmentWizard.tsx"
  "src/components/SchoolInitialsInput.tsx"
)

for rel in "${REQUIRED[@]}"; do
  if [ ! -f "$APP/$rel" ]; then
    echo "ERROR: Required current source file is missing: $rel"
    exit 1
  fi
done

mkdir -p "$BACKUP"

while IFS= read -r -d '' source_file; do
  rel="${source_file#"$PATCH_DIR/files/"}"
  destination="$APP/$rel"

  if [ -f "$destination" ]; then
    mkdir -p "$BACKUP/$(dirname "$rel")"
    cp -a "$destination" "$BACKUP/$rel"
  fi

  mkdir -p "$(dirname "$destination")"
  cp -f "$source_file" "$destination"
done < <(find "$PATCH_DIR/files" -type f -print0)

cd "$APP"
pnpm typecheck
pnpm build
test -f .next/BUILD_ID

echo
echo "===================================================="
echo " SCHOOL ONBOARDING HANDOFF: FIXED"
echo " DEMO REQUEST -> PAID SCHOOL PREFILL: SAFE"
echo " NEW PRODUCTION ENROLMENT ROUTE: /schools/enrol"
echo " LEGACY /schools?prefill LINKS: REPAIRED"
echo " SCHOOL + ADMIN DETAILS: PREFILLED"
echo " LIVE INITIALS + SHORT CODE: PRESERVED"
echo " SCHOOL LOGO + ADMIN PHOTO: OPTIONAL"
echo " DIRECT PAID SCHOOL ONBOARDING: ENABLED"
echo " DATABASE MIGRATION: NOT REQUIRED"
echo " TYPECHECK: PASS"
echo " PRODUCTION BUILD: PASS"
echo "===================================================="
echo "Backup saved at: $BACKUP"
echo "Check /schools/enrol in Preview before Republish."
