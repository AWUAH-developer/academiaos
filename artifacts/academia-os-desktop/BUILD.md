# AcademiaOS Desktop — Build Guide

## Architecture

```
artifacts/academia-os-desktop/
├── electron/                   Main process (Node.js / Electron)
│   ├── main.ts                 Window creation, CSP, nav guard, DB init
│   ├── preload.ts              contextBridge API (narrow channel allowlist)
│   ├── secure-storage.ts       Electron safeStorage (DPAPI on Windows)
│   ├── sqlite.ts               SQLCipher encrypted local database
│   └── ipc-handlers.ts         All IPC channels — only place HTTP happens
├── src/                        Renderer (React / Vite)
│   ├── api/client.ts           IPC wrapper — no direct network calls
│   ├── store/                  Auth + sync state
│   ├── components/             Sidebar, TitleBar, StatusBar
│   └── screens/                14 screens
├── .github/workflows/
│   └── desktop-windows.yml     Windows CI release pipeline
└── package.json / tsconfigs / vite.config.ts
```

## Key library versions

| Component            | Library / Version                        |
|----------------------|------------------------------------------|
| Electron             | **43.2.0**                               |
| Secure storage       | Electron `safeStorage` (DPAPI on Windows)|
| Local database       | `better-sqlite3-multiple-ciphers` ^9.6.0 |
| Encryption           | SQLCipher via better-sqlite3-multiple-ciphers |
| Native rebuild       | `@electron/rebuild` ^3.6.0               |
| Installer            | `electron-builder` ^25.1.8, NSIS Windows x64 |

**Note:** keytar has been removed. The project uses Electron's built-in
`safeStorage` API exclusively for credential storage.

## Security model

| Property                  | Value                    |
|---------------------------|--------------------------|
| `contextIsolation`        | **true** — enforced, must not change |
| `nodeIntegration`         | **false** — enforced, must not change |
| `sandbox`                 | **true** — enforced, must not change |
| Secure credential storage | Electron `safeStorage` (DPAPI/Keychain/libsecret) |
| At-rest DB encryption     | SQLCipher via `PRAGMA key` applied before schema access |
| DB key derivation         | Cryptographically random 256-bit key — never derived from user data |
| Network access            | Main process only, HTTPS-only to `academiaos.cc` |
| CSP (production)          | `default-src 'self'`; blocks inline, eval, external origins |
| Navigation                | Allowlisted in `will-navigate` handler |

## Startup order (security-critical — do not reorder)

```
app.whenReady()
  → ensureDbKey()       OS DPAPI vault → get or generate encryption key
  → initializeDb(key)   Open SQLCipher DB with key applied before any query
  → setupIpcHandlers()  Register IPC (DB is ready at this point)
  → createWindow()      BrowserWindow with contextIsolation + sandbox
```

## Encryption proof

After first sign-in and sync, open the local database without a key:

**Windows**
```cmd
sqlite3 "%APPDATA%\AcademiaOS\academiaos.db" ".tables"
```
Expected: `Error: file is not a database`

**macOS / Linux (dev)**
```bash
sqlite3 ~/Library/Application\ Support/AcademiaOS/academiaos.db ".tables"
# or on Linux:
sqlite3 ~/.config/AcademiaOS/academiaos.db ".tables"
```
Expected: `Error: file is not a database`

Then reopen AcademiaOS — it retrieves the key from DPAPI and opens normally.

## Dev → production DB migration

If a plaintext SQLite database exists from an earlier development build
(before encryption was added), `openOrMigrate()` in `sqlite.ts` detects it
automatically:

1. Tries to open with key → fails (plaintext file, key mismatch)
2. Tries to open without key → succeeds (confirms plaintext)
3. Runs `sqlcipher_export()` to produce an encrypted copy
4. Renames original to `.plaintext-backup` (preserved as safety net)
5. Opens the new encrypted copy normally

No data is lost. The backup file can be removed manually once confirmed.

## Prerequisites

- **Node.js 20+**
- **pnpm 9+**
- **Windows 10 x64 or later** for the final Windows production build
  (or GitHub Actions `windows-latest` — see CI pipeline below)

## ⚠ Workspace isolation

This package is **excluded from the pnpm monorepo workspace** via
`!artifacts/academia-os-desktop` in the root `pnpm-workspace.yaml`.

`better-sqlite3-multiple-ciphers`, Electron, and `@electron/rebuild` are
Windows/macOS/Linux native binaries. They must be installed inside the
desktop directory independently and compiled for the target platform.

**Always:**
```bash
cd artifacts/academia-os-desktop
pnpm install          # independent install, NOT from monorepo root
```

**Never:**
```bash
# From the monorepo root — this will break the Linux workspace
pnpm install  # ← Do NOT run for desktop dependencies
```

## Development

```bash
# Terminal 1 — Vite dev server (renderer hot-reload)
cd artifacts/academia-os-desktop
pnpm install
pnpm dev:renderer

# Terminal 2 — Electron main process
pnpm build:electron
pnpm electron:dev
```

## Production build — Windows (preferred: GitHub Actions)

The recommended approach is the CI pipeline in `.github/workflows/desktop-windows.yml`.

### Manual build on Windows

```powershell
cd artifacts\academia-os-desktop
pnpm install
pnpm build:renderer
pnpm build:electron
pnpm run rebuild:native          # Rebuild better-sqlite3-multiple-ciphers for Electron 43
pnpm exec electron-builder --win --x64
# Output: release\AcademiaOS-Desktop-Windows-1.0.0-Setup.exe
```

## CI/CD Pipeline (GitHub Actions)

File: `.github/workflows/desktop-windows.yml`

Trigger:
- Push of a `desktop-v*` tag
- Manual `workflow_dispatch` with version input

Steps:
1. Checkout repository
2. Set up Node.js 20 + pnpm 9
3. `cd artifacts/academia-os-desktop && pnpm install --frozen-lockfile`
4. `electron-rebuild` — native module compilation for Electron 43 x64
5. TypeScript typecheck (renderer + main process)
6. `vite build` — renderer
7. `tsc -p tsconfig.electron.json` — main/preload
8. `electron-builder --win --x64` — NSIS installer
9. `Get-FileHash … SHA256` — compute hash
10. Upload `.exe` + `SHA256SUMS.txt` as workflow artifact (90-day retention)
11. Create draft GitHub Release (on tag push)

### Code signing

Supply via repository secrets — **never commit certificates**:

```
WIN_CSC_LINK         Base64-encoded PFX certificate
WIN_CSC_KEY_PASSWORD Certificate password
```

Uncomment the env lines in `desktop-windows.yml` when a certificate is available.

## WINDOWS SIGNING STATUS: UNSIGNED

The unsigned installer is acceptable for controlled internal acceptance testing.

The final public release on academiaos.cc must use a properly signed installer
obtained with a valid EV code-signing certificate from DigiCert or Sectigo.

Do not describe this build as digitally signed until signing is confirmed.

## Real website download

Do NOT enable the website download button until:

1. The genuine tested installer has been uploaded to a stable HTTPS URL.
2. The URL is set as: `DESKTOP_WINDOWS_URL=<real HTTPS URL>`
3. The marketing page shows:
   - AcademiaOS for Windows
   - Version 1.0.0
   - Windows 10/11 64-bit
   - Download for Windows (linked to real URL)

Do not point to a Replit workspace file or development preview URL.

## Installer acceptance test checklist

Run on a **clean Windows 10/11 x64 machine** (no Node.js, no Vite, no dev tools):

- [ ] Installer opens without SmartScreen blocking (or user accepts unsigned warning)
- [ ] AcademiaOS installs to Program Files
- [ ] Start Menu entry appears
- [ ] Desktop shortcut works
- [ ] App starts without Node.js or Vite running
- [ ] No localhost dependency visible in traffic
- [ ] Production HTTPS API only (`academiaos.cc`)
- [ ] Real AcademiaOS login works
- [ ] Wrong password is rejected with clear error
- [ ] User without school membership is rejected (403 NO_SCHOOL_MEMBERSHIP)
- [ ] Correct school, role and package features appear
- [ ] Restricted modules remain hidden
- [ ] Offline mode works (attendance records queue locally)
- [ ] Reconnect sync uploads pending outbox and pulls incremental changes
- [ ] Same outbox operation sent twice → server records it exactly once
- [ ] Logout clears DPAPI vault tokens
- [ ] Reinstall / upgrade does not expose secrets
- [ ] Uninstall works cleanly

## Server API endpoints verified

All 10 endpoints are implemented at `academiaos.cc/api/desktop/v1/`:

| Method | Path                      | Purpose                        |
|--------|---------------------------|--------------------------------|
| GET    | /status                   | Health check                   |
| POST   | /auth/login               | Device login + session create  |
| POST   | /auth/refresh             | Token rotation                 |
| POST   | /auth/logout              | Session revocation             |
| GET    | /session                  | Current user + session         |
| GET    | /entitlements             | Role + package feature flags   |
| POST   | /sync/initial             | Full data dump                 |
| POST   | /sync/incremental         | Delta sync since cursor        |
| POST   | /sync/outbox              | Offline operation upload       |
| GET    | /sync/status              | Active session count           |

Login authorization verifies: active user · active school membership ·
membership status · school status · role · permissions · package ·
add-ons · feature entitlement · term subscription · device status.

Non-SUPER_ADMIN users without an active school membership are rejected (403).

## Outbox idempotency

Idempotency keys are persisted in the `desktop_outbox_idempotency_keys`
PostgreSQL table (migration 0009). Duplicate transmissions of the same
offline operation produce exactly one server mutation, even across
server restarts and multi-pod deployments.

Financial conflicts return `CONFLICT` status (not silent last-write-wins).
HIGH-RISK operations (financial postings, approvals, user creation) are
explicitly blocked and must be performed via the web interface.

## Remaining blockers for public release

1. **Windows installer not yet built** — run the GitHub Actions CI pipeline on
   `windows-latest` to produce `AcademiaOS-Desktop-Windows-1.0.0-Setup.exe`.

2. **Production redeploy needed** — migration 0009 (outbox idempotency table)
   and migration 0008 (per-learner pricing columns) are applied on startup
   via `start.mjs`. A production redeploy is required.

3. **Code signing: UNSIGNED** — obtain an EV code-signing certificate and
   configure `WIN_CSC_LINK` / `WIN_CSC_KEY_PASSWORD` secrets before
   public website release.

4. **Superadmin access confirmation** — confirm `superadmin` / `Kwaku@2026`
   works in production, then remove `src/app/internal/unlock/route.ts`.

5. **DESKTOP_WINDOWS_URL** — set to real HTTPS installer URL once built and
   uploaded; only then enable the website download button.

6. **SQLCipher build confirmation** — verify `better-sqlite3-multiple-ciphers`
   native module compiles correctly for Electron 43 on Windows x64 in CI.
