#!/usr/bin/env bash
set -Eeuo pipefail

WORKSPACE="/home/runner/workspace"
APP="$WORKSPACE/artifacts/academia-os-desktop"
REPO="AWUAH-developer/academiaos"
WORKFLOW="desktop-windows.yml"
DEST="$APP/releases/1.0.10"
LOG="$WORKSPACE/AcademiaOS-1.0.10-build.log"

exec > >(tee -a "$LOG") 2>&1
trap 'echo; echo "FAILED: $BASH_COMMAND"; echo "LINE: $LINENO"; echo "LOG: $LOG"' ERR

cd "$APP"
mkdir -p public

if [[ -f brand-logo.jpg ]]; then
  cp brand-logo.jpg public/brand-logo.jpg
elif [[ -f build-resources/icons/icon.png ]]; then
  cp build-resources/icons/icon.png public/brand-logo.jpg
else
  echo "No AcademiaOS logo file found."
  exit 1
fi

python3 - <<'PY'
from pathlib import Path
import json

app = Path('/home/runner/workspace/artifacts/academia-os-desktop')

title_path = app / 'src/components/TitleBar.tsx'
title = title_path.read_text(encoding='utf-8')

if 'alt="AcademiaOS logo"' not in title:
    marker = '''        <span
          style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.04em' }}
          aria-label="AcademiaOS"
        >'''
    image = '''        <img
          src="./brand-logo.jpg"
          alt="AcademiaOS logo"
          style={{
            width: 30,
            height: 30,
            borderRadius: 7,
            objectFit: 'cover',
            background: '#fff',
          }}
        />

'''
    if marker not in title:
        raise SystemExit('TitleBar AcademiaOS marker not found.')
    title = title.replace(marker, image + marker, 1)

if 'v1.0.10' not in title:
    old = '''          <span style={{ color: '#f4c542' }}>OS</span>
        </span>'''
    new = '''          <span style={{ color: '#f4c542' }}>OS</span>
        </span>
        <span style={{ fontSize: 9, opacity: 0.55 }}>v1.0.10</span>'''
    if old not in title:
        raise SystemExit('TitleBar version marker not found.')
    title = title.replace(old, new, 1)

title_path.write_text(title, encoding='utf-8')

attendance_path = app / 'src/screens/AttendanceScreen.tsx'
attendance = attendance_path.read_text(encoding='utf-8')
attendance = attendance.replace('<h1>Attendance</h1>', '<h1>Attendance & Barcode Scanner</h1>')
attendance = attendance.replace('Barcode attendance', 'Barcode Attendance Scanner')
attendance = attendance.replace('Mark Present', 'Scan Barcode & Mark Present')
attendance_path.write_text(attendance, encoding='utf-8')

package_path = app / 'package.json'
package = json.loads(package_path.read_text(encoding='utf-8'))
package['version'] = '1.0.10'
package_path.write_text(json.dumps(package, indent=2) + '\n', encoding='utf-8')

print('Logo bundled, barcode scanner made visible, version set to 1.0.10.')
PY

echo "===== TYPECHECK ====="
pnpm typecheck

echo "===== BUILD ====="
pnpm build

cd "$WORKSPACE"

git add \
  artifacts/academia-os-desktop/package.json \
  artifacts/academia-os-desktop/public/brand-logo.jpg \
  artifacts/academia-os-desktop/src/components/TitleBar.tsx \
  artifacts/academia-os-desktop/src/screens/AttendanceScreen.tsx

if ! git diff --cached --quiet; then
  git commit -m "Release desktop 1.0.10 with visible logo and barcode scanner"
fi

git push origin main

SHA="$(git rev-parse HEAD)"

gh workflow run "$WORKFLOW" -R "$REPO" --ref main

RUN=""
for _ in $(seq 1 30); do
  sleep 4
  RUN="$(gh run list -R "$REPO" -w "$WORKFLOW" -b main -c "$SHA" -L 1 --json databaseId --jq '.[0].databaseId // empty')"
  [[ -n "$RUN" ]] && break
done

[[ -n "$RUN" ]] || { echo "1.0.10 workflow run not found."; exit 1; }

gh run watch "$RUN" -R "$REPO" --exit-status

rm -rf "$DEST"
mkdir -p "$DEST"
gh run download "$RUN" -R "$REPO" -D "$DEST"

EXE="$(find "$DEST" -type f -iname '*1.0.10*Setup.exe' -print -quit)"
[[ -n "$EXE" ]] || { echo "1.0.10 installer not found."; find "$DEST" -type f; exit 1; }

FINAL="$WORKSPACE/AcademiaOS-Desktop-Windows-1.0.10-Setup.exe"
cp "$EXE" "$FINAL"

echo
echo "===== VERSION 1.0.10 READY ====="
ls -lh "$FINAL"
echo "LOG: $LOG"
