#!/usr/bin/env bash
set -euo pipefail

APP="$HOME/workspace/artifacts/academia-os"
PAGE="$APP/src/app/(portal)/demo-requests/page.tsx"
COMPONENT="$APP/src/components/DeleteDemoRequestButton.tsx"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$HOME/workspace/demo-requests-fix-backup-$STAMP"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -f "$PAGE" ]; then
  echo "ERROR: Demo requests page not found: $PAGE"
  exit 1
fi

mkdir -p "$BACKUP/src/app/(portal)/demo-requests" "$BACKUP/src/components"
cp "$PAGE" "$BACKUP/src/app/(portal)/demo-requests/page.tsx"
if [ -f "$COMPONENT" ]; then
  cp "$COMPONENT" "$BACKUP/src/components/DeleteDemoRequestButton.tsx"
fi

mkdir -p "$(dirname "$COMPONENT")"
cp "$SCRIPT_DIR/files/src/components/DeleteDemoRequestButton.tsx" "$COMPONENT"

python3 - "$PAGE" <<'PY'
from pathlib import Path
import re
import sys

path = Path(sys.argv[1])
text = path.read_text()

# Keep the server page server-rendered, but move browser confirmation logic
# into a dedicated client component.
text = text.replace(
    "import { deleteDemoRequestAction, updateDemoRequestAction } from '@/app/actions/demo-requests';",
    "import { updateDemoRequestAction } from '@/app/actions/demo-requests';",
)

if "@/components/DeleteDemoRequestButton" not in text:
    marker = "import { PageHeader } from '@/components/PageHeader';\n"
    if marker not in text:
        raise SystemExit("ERROR: Could not find PageHeader import in demo requests page")
    text = text.replace(
        marker,
        marker + "import { DeleteDemoRequestButton } from '@/components/DeleteDemoRequestButton';\n",
        1,
    )

pattern = re.compile(
    r"\n\s*\{\/\* Delete \*\/\}\s*"
    r"<form action=\{deleteDemoRequestAction\}>.*?<\/form>",
    re.DOTALL,
)
replacement = "\n\n                  {/* Delete */}\n                  <DeleteDemoRequestButton id={req.id} />"
text, count = pattern.subn(replacement, text, count=1)

if count == 0 and "<DeleteDemoRequestButton id={req.id} />" not in text:
    raise SystemExit("ERROR: Could not locate the old server-side Delete form")

path.write_text(text)
PY

cd "$APP"
pnpm typecheck
pnpm build

echo
echo "===================================================="
echo " DEMO REQUESTS RUNTIME FIX: APPLIED"
echo " SERVER-COMPONENT EVENT HANDLER: REMOVED"
echo " DELETE CONFIRMATION: MOVED TO CLIENT COMPONENT"
echo " DATABASE AND EXISTING REQUESTS: UNCHANGED"
echo " TYPECHECK: PASS"
echo " PRODUCTION BUILD: PASS"
echo "===================================================="
echo "Backup saved at: $BACKUP"
echo "Check /demo-requests in Preview before Republish."
