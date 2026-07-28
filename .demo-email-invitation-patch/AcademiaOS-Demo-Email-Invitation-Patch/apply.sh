#!/usr/bin/env bash
set -euo pipefail

APP="$HOME/workspace/artifacts/academia-os"
PATCH_ROOT="$(cd "$(dirname "$0")" && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$HOME/workspace/demo-email-invitation-backup-$STAMP"

[ -d "$APP" ] || { echo "ERROR: AcademiaOS app not found at $APP"; exit 1; }
[ -f "$PATCH_ROOT/apply.mjs" ] || { echo "ERROR: apply.mjs missing from patch"; exit 1; }

mkdir -p "$BACKUP"
for rel in \
  'src/lib/email.ts' \
  'src/app/actions/demo-access.ts' \
  'src/components/DemoAccessWizard.tsx' \
  'src/components/CopyDemoInvitationButton.tsx' \
  'src/app/(portal)/demo-requests/[id]/create/page.tsx'; do
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
echo " DEMO EMAIL INVITATIONS: INSTALLED"
echo " AUTOMATIC EMAIL AFTER DEMO CREATION: ENABLED"
echo " EXISTING DEMO PASSWORD RESET + EMAIL: ENABLED"
echo " COPY INVITATION DETAILS: ENABLED"
echo " EMAIL PROVIDER: RESEND API"
echo " DATABASE MIGRATION: NOT REQUIRED"
echo " TYPECHECK: PASS"
echo " PRODUCTION BUILD: PASS"
if [ -n "${RESEND_API_KEY:-}" ] && [ -n "${EMAIL_FROM:-}" ]; then
  echo " EMAIL SECRETS: DETECTED"
else
  echo " EMAIL SECRETS: NOT YET CONFIGURED"
  echo " ADD: RESEND_API_KEY"
  echo " ADD: EMAIL_FROM=AcademiaOS <no-reply@academiaos.cc>"
fi
echo "===================================================="
echo "Backup saved at: $BACKUP"
echo "Configure the email secrets, test in Preview, then Republish."
