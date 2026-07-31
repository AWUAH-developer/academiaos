#!/usr/bin/env bash
set -Eeuo pipefail

APP="/home/runner/workspace/artifacts/academia-os-desktop"
ROOT="/home/runner/workspace"
REPO="AWUAH-developer/academiaos"
WORKFLOW="desktop-windows.yml"
VERSION="1.0.11"
DEST="$APP/releases/$VERSION"
LOG="$ROOT/AcademiaOS-$VERSION-build.log"

exec > >(tee "$LOG") 2>&1
trap 'echo; echo "FAILED: $BASH_COMMAND"; echo "LINE: $LINENO"; echo "LOG: $LOG"' ERR

cd "$ROOT"

python3 - <<'PY'
from pathlib import Path
import json
import re

app = Path("/home/runner/workspace/artifacts/academia-os-desktop")

titlebar = r"""import React from 'react';
import { media } from '../api/client';

declare module 'react' {
  interface CSSProperties {
    WebkitAppRegion?: 'drag' | 'no-drag';
  }
}

interface Props {
  schoolName?: string;
  schoolLogoUrl?: string | null;
  userName?: string;
  onLogout(): void;
}

function schoolInitials(name: string) {
  const ignored = new Set(['and', 'of', 'the', '&']);
  const words = String(name || '')
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^A-Za-z0-9]/g, ''))
    .filter(Boolean);
  const meaningful = words.filter(
    (word) => !ignored.has(word.toLowerCase()),
  );
  const source = meaningful.length ? meaningful : words;

  if (!source.length) return 'SCH';
  if (source.length === 1) return source[0].slice(0, 3).toUpperCase();

  return source
    .slice(0, 3)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

function resolveLogoUrl(value?: string | null) {
  const logo = String(value ?? '').trim();

  if (!logo || ['null', 'undefined', 'none'].includes(logo.toLowerCase())) {
    return null;
  }

  if (/^(data:|https?:\/\/)/i.test(logo)) return logo;
  if (logo.startsWith('//')) return `https:${logo}`;

  try {
    return new URL(logo, 'https://academiaos.cc').toString();
  } catch {
    return null;
  }
}

export default function TitleBar({
  schoolName,
  schoolLogoUrl,
  userName,
  onLogout,
}: Props) {
  const resolvedLogoUrl = React.useMemo(
    () => resolveLogoUrl(schoolLogoUrl),
    [schoolLogoUrl],
  );
  const [logoSrc, setLogoSrc] = React.useState<string | null>(null);
  const [logoFailed, setLogoFailed] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    setLogoSrc(null);
    setLogoFailed(false);

    if (!resolvedLogoUrl) {
      return () => {
        active = false;
      };
    }

    if (resolvedLogoUrl.startsWith('data:image/')) {
      setLogoSrc(resolvedLogoUrl);
      return () => {
        active = false;
      };
    }

    void media.loadImage(resolvedLogoUrl)
      .then((result) => {
        if (!active) return;
        setLogoSrc(result.ok ? result.dataUrl : resolvedLogoUrl);
      })
      .catch(() => {
        if (active) setLogoSrc(resolvedLogoUrl);
      });

    return () => {
      active = false;
    };
  }, [resolvedLogoUrl]);

  const showLogo = Boolean(logoSrc && !logoFailed);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 'var(--titlebar-h)',
        background: 'var(--chalk-dark)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 100,
        WebkitAppRegion: 'drag',
        userSelect: 'none',
        padding: '0 16px 0 80px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          minWidth: 0,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: '.04em',
            flexShrink: 0,
          }}
          aria-label="AcademiaOS"
        >
          <span style={{ color: '#fff8ea' }}>Academia</span>
          <span style={{ color: '#f4c542' }}>OS</span>
        </span>

        {schoolName && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginLeft: 14,
              paddingLeft: 14,
              borderLeft: '1px solid rgba(255,255,255,.22)',
              minWidth: 0,
            }}
          >
            {showLogo ? (
              <img
                src={logoSrc ?? undefined}
                alt={`${schoolName} logo`}
                onError={() => setLogoFailed(true)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  objectFit: 'contain',
                  background: '#fff',
                  padding: 2,
                  flexShrink: 0,
                }}
              />
            ) : (
              <span
                title={`${schoolName} logo unavailable`}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'rgba(255,255,255,.12)',
                  color: '#f4c542',
                  fontSize: 9,
                  fontWeight: 900,
                  flexShrink: 0,
                }}
              >
                {schoolInitials(schoolName)}
              </span>
            )}

            <span
              style={{
                fontSize: 12,
                opacity: 0.82,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {schoolName}
            </span>
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          WebkitAppRegion: 'no-drag',
          flexShrink: 0,
        }}
      >
        {userName && (
          <span style={{ fontSize: 12, opacity: 0.65 }}>{userName}</span>
        )}

        <button
          onClick={onLogout}
          style={{
            background: 'rgba(255,255,255,.12)',
            border: 'none',
            color: '#fff',
            padding: '3px 10px',
            borderRadius: 4,
            fontSize: 11,
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
"""

smart_id = r"""import React, { useRef, useState } from 'react';
import {
  db as localDb,
  type LocalLearner,
} from '../api/client';
import { useAuth } from '../store/auth';

function localDateIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000)
    .toISOString()
    .slice(0, 10);
}

export default function SmartIdScreen() {
  const { authState } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [result, setResult] =
    useState<LocalLearner | null | 'not-found'>(null);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  const [message, setMessage] = useState('');

  async function scan(event?: React.FormEvent) {
    event?.preventDefault();

    const value = query.trim();
    if (!value) {
      inputRef.current?.focus();
      return;
    }

    setLoading(true);
    setMessage('');

    const response = await localDb.getLearners({ search: value });

    setLoading(false);

    if (response.ok && response.learners.length > 0) {
      setResult(response.learners[0]);
    } else {
      setResult('not-found');
    }

    inputRef.current?.focus();
  }

  async function markPresent() {
    if (!result || result === 'not-found') return;
    if (authState.status !== 'authenticated') return;
    if (!authState.user.school) return;

    setMarking(true);
    setMessage('');

    const response = await localDb.saveAttendance({
      learnerId: result.id,
      date: localDateIso(),
      status: 'PRESENT',
      schoolId: authState.user.school.id,
      userId: authState.user.id,
      deviceId: authState.session.deviceId,
    });

    setMarking(false);

    setMessage(
      response.ok
        ? `${result.first_name} ${result.last_name} marked PRESENT today.`
        : 'Attendance could not be saved.',
    );

    inputRef.current?.focus();
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h1>Smart ID and Barcode Attendance</h1>

      <p
        style={{
          color: 'var(--text-muted)',
          marginTop: 4,
          marginBottom: 20,
          fontSize: 13,
        }}
      >
        Scan a learner barcode or enter a badge code, admission number, or name.
        The scanner works like a keyboard and submits when it sends Enter.
      </p>

      <form
        onSubmit={scan}
        className="card"
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 20,
          padding: 16,
        }}
      >
        <input
          ref={inputRef}
          className="input"
          placeholder="Scan barcode or enter badge code..."
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setResult(null);
            setMessage('');
          }}
          autoComplete="off"
          autoFocus
          style={{ flex: 1 }}
        />

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ minWidth: 150 }}
        >
          {loading ? 'Searching...' : 'Scan / Look up'}
        </button>
      </form>

      {result === 'not-found' && (
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 32 }}>🔍</div>
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
            No learner found for "{query}"
          </p>
        </div>
      )}

      {result && result !== 'not-found' && (
        <div
          className="card"
          style={{
            borderLeft: '4px solid var(--chalk)',
            padding: 20,
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 20 }}>
            {result.first_name} {result.last_name}
          </div>

          <div
            style={{
              color: 'var(--text-muted)',
              fontSize: 13,
              marginTop: 5,
            }}
          >
            Admission: {result.admission_no}
            {' · '}
            Class: {result.class_name ?? 'Not assigned'}
            {result.class_stream ? ` ${result.class_stream}` : ''}
          </div>

          <div style={{ marginTop: 10 }}>
            <span
              className={`pill ${
                result.status === 'ACTIVE' ? 'pill-green' : 'pill-red'
              }`}
            >
              {result.status}
            </span>

            {result.badge_code && (
              <span
                style={{
                  marginLeft: 10,
                  fontFamily: 'monospace',
                  fontSize: 12,
                  color: 'var(--text-muted)',
                }}
              >
                Badge: {result.badge_code}
              </span>
            )}
          </div>

          <button
            className="btn btn-primary"
            onClick={markPresent}
            disabled={marking}
            style={{ marginTop: 18, minWidth: 190 }}
          >
            {marking ? 'Saving...' : 'Mark Present Today'}
          </button>

          {message && (
            <div
              style={{
                marginTop: 12,
                fontSize: 13,
                fontWeight: 700,
                color: message.includes('marked PRESENT')
                  ? '#166534'
                  : '#991b1b',
              }}
            >
              {message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
"""

(app / "src/components/TitleBar.tsx").write_text(
    titlebar,
    encoding="utf-8",
)
(app / "src/screens/SmartIdScreen.tsx").write_text(
    smart_id,
    encoding="utf-8",
)

ipc_path = app / "electron/ipc-handlers.ts"
ipc = ipc_path.read_text(encoding="utf-8")

old_session = """      const res = await apiRequest('/session', 'GET', undefined, accessToken);
      if (!res.ok) return { ok: false, loggedIn: false, error: errOf(res) };

      return { ok: true, loggedIn: true, ...data(res) };"""

new_session = """      const res = await apiRequest('/session', 'GET', undefined, accessToken);
      if (!res.ok) return { ok: false, loggedIn: false, error: errOf(res) };

      const sessionData = data(res);
      const sessionUser = (sessionData.user ?? {}) as ApiData;
      const sessionSchool = (sessionUser.school ?? {}) as ApiData;
      const currentLogo =
        sessionSchool.logoUrl ??
        sessionSchool.logo_url ??
        sessionSchool.logo ??
        sessionSchool.schoolLogoUrl;

      if (!currentLogo) {
        try {
          const syncResponse = await apiRequest(
            '/sync/initial',
            'POST',
            {},
            accessToken,
          );

          if (syncResponse.ok) {
            const initialData = data(syncResponse);
            const syncedSchool = (initialData.school ?? {}) as ApiData;
            const syncedLogo =
              syncedSchool.logoUrl ??
              syncedSchool.logo_url ??
              syncedSchool.logo ??
              syncedSchool.schoolLogoUrl ??
              null;

            sessionUser.school = {
              ...syncedSchool,
              ...sessionSchool,
              logoUrl: syncedLogo,
            };
            sessionData.user = sessionUser;
          }
        } catch {
          // Keep the valid session even if logo enrichment fails.
        }
      }

      return { ok: true, loggedIn: true, ...sessionData };"""

if old_session not in ipc:
    raise SystemExit("Could not find auth:getSession block to repair.")
ipc = ipc.replace(old_session, new_session, 1)

old_search = """    if (opts.search) {
      const q = `%${opts.search}%`;
      sql += `
        AND (
          l.first_name LIKE ?
          OR l.last_name LIKE ?
          OR l.admission_no LIKE ?
        )
      `;
      args.push(q, q, q);
    }

    sql += ` ORDER BY l.last_name, l.first_name LIMIT 500`;"""

new_search = """    if (opts.search) {
      const exact = opts.search.trim();
      const q = `%${exact}%`;
      sql += `
        AND (
          l.first_name LIKE ?
          OR l.last_name LIKE ?
          OR l.admission_no LIKE ?
          OR l.badge_code LIKE ?
        )
      `;
      args.push(q, q, q, q);

      sql += `
        ORDER BY
          CASE
            WHEN lower(COALESCE(l.badge_code, '')) = lower(?) THEN 0
            WHEN lower(COALESCE(l.admission_no, '')) = lower(?) THEN 1
            ELSE 2
          END,
          l.last_name,
          l.first_name
        LIMIT 500
      `;
      args.push(exact, exact);
    } else {
      sql += ` ORDER BY l.last_name, l.first_name LIMIT 500`;
    }"""

if old_search not in ipc:
    raise SystemExit("Could not find learner search block to repair.")
ipc = ipc.replace(old_search, new_search, 1)
ipc_path.write_text(ipc, encoding="utf-8")

attendance_path = app / "src/screens/AttendanceScreen.tsx"
attendance = attendance_path.read_text(encoding="utf-8")
attendance = re.sub(
    r"Barcode attendance scanner\s*·\s*v1\.0\.10",
    "Barcode attendance",
    attendance,
)
attendance_path.write_text(attendance, encoding="utf-8")

package_path = app / "package.json"
package = json.loads(package_path.read_text(encoding="utf-8"))
package["version"] = "1.0.11"
package_path.write_text(
    json.dumps(package, indent=2) + "\n",
    encoding="utf-8",
)

print("Applied 1.0.11: title bar restored, school logo enriched, badge search fixed.")
PY

echo "===== TYPECHECK ====="
cd "$APP"
pnpm typecheck

echo "===== BUILD ====="
pnpm build

echo "===== COMMIT ====="
cd "$ROOT"
git add \
  artifacts/academia-os-desktop/package.json \
  artifacts/academia-os-desktop/electron/ipc-handlers.ts \
  artifacts/academia-os-desktop/src/components/TitleBar.tsx \
  artifacts/academia-os-desktop/src/screens/SmartIdScreen.tsx \
  artifacts/academia-os-desktop/src/screens/AttendanceScreen.tsx

if ! git diff --cached --quiet; then
  git commit -m "Fix school logo layout and Smart ID barcode lookup"
else
  echo "Version 1.0.11 changes are already committed."
fi

echo "===== PUSH ====="
git push origin main

SHA="$(git rev-parse HEAD)"

echo "===== START WINDOWS BUILD ====="
gh workflow run "$WORKFLOW" -R "$REPO" --ref main

RUN=""
for _ in $(seq 1 40); do
  sleep 4
  RUN="$(
    gh run list \
      -R "$REPO" \
      -w "$WORKFLOW" \
      -b main \
      -c "$SHA" \
      -L 1 \
      --json databaseId \
      --jq '.[0].databaseId // empty'
  )"
  [ -n "$RUN" ] && break
done

[ -n "$RUN" ] || {
  echo "The 1.0.11 workflow run was not found."
  exit 1
}

echo "Watching workflow run: $RUN"
gh run watch "$RUN" -R "$REPO" --exit-status

echo "===== DOWNLOAD INSTALLER ====="
rm -rf "$DEST"
mkdir -p "$DEST"
gh run download "$RUN" -R "$REPO" -D "$DEST"

EXE="$(
  find "$DEST" \
    -type f \
    -iname "*${VERSION}*Setup.exe" \
    -print \
    -quit
)"

[ -n "$EXE" ] || {
  echo "The 1.0.11 installer was not found."
  find "$DEST" -type f
  exit 1
}

cp "$EXE" "$ROOT/AcademiaOS-Desktop-Windows-${VERSION}-Setup.exe"

echo
echo "===== VERSION ${VERSION} READY ====="
ls -lh "$ROOT/AcademiaOS-Desktop-Windows-${VERSION}-Setup.exe"
echo "LOG: $LOG"
