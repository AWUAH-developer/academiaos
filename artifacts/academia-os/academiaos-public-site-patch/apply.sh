#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-$HOME/workspace/artifacts/academia-os}"
PATCH_DIR="$(cd "$(dirname "$0")" && pwd)"

cd "$PROJECT_DIR"

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR=".public-site-backup/$STAMP"

FILES=(
  "src/app/actions/demo-requests.ts"
  "src/components/marketing/HeroEntrance.tsx"
  "src/lib/public-plans.ts"
  "src/components/marketing/PublicFooter.tsx"
  "src/components/marketing/PricingRequestForm.tsx"
  "src/app/features/page.tsx"
  "src/app/pricing/page.tsx"
  "src/app/page.tsx"
)

for FILE in "${FILES[@]}"; do
  if [ -f "$FILE" ]; then
    mkdir -p "$BACKUP_DIR/$(dirname "$FILE")"
    cp "$FILE" "$BACKUP_DIR/$FILE"
  fi
done

cp -R "$PATCH_DIR/files/src/." "$PROJECT_DIR/src/"

python3 - <<'PY'
from pathlib import Path

path = Path('src/app/page.tsx')
text = path.read_text()

old = '<Link href="/login" className="text-xs font-bold text-white/60 hover:text-white">School sign in</Link>'
new = '''<Link href="/features" className="text-xs font-bold text-white/60 hover:text-white">Features</Link>
            <Link href="/pricing" className="text-xs font-bold text-white/60 hover:text-white">Packages</Link>
            <Link href="/login" className="text-xs font-bold text-white/60 hover:text-white">School sign in</Link>'''

if old in text and 'href="/pricing" className="text-xs font-bold text-white/60' not in text:
    text = text.replace(old, new, 1)

path.write_text(text)
PY

echo
echo "Checking new routes and form integration..."
grep -RIn \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  -E "FeaturesPage|PricingPage|PricingRequestForm|Package interest" \
  src/app src/components src/lib \
  | head -80

echo
echo "Running production build..."
pnpm build

echo
echo "======================================================"
echo "PUBLIC WEBSITE BUILD PASSED"
echo "Created /features"
echo "Created /pricing"
echo "Added Starter, Standard and Premium comparison"
echo "Highlighted Standard as Most Popular"
echo "Added sticky comparison headings"
echo "Added green checks, grey dashes and add-on badges"
echo "Added package-prefilled pricing and demo form"
echo "Reused the existing demo request database and Super Admin review"
echo "No public GHS prices were invented"
echo "Backup saved in: $BACKUP_DIR"
echo "======================================================"
