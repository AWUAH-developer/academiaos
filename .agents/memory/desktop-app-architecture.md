---
name: Desktop app architecture
description: Key decisions for the AcademiaOS Electron desktop app (artifacts/academia-os-desktop)
---

## Rule
The desktop Electron app lives in `artifacts/academia-os-desktop/` but is **excluded from the pnpm workspace** via `!artifacts/academia-os-desktop` in pnpm-workspace.yaml. It must be installed and built independently on Windows.

**Why:** Electron, keytar, and better-sqlite3 are platform-native binaries. Installing them in the Linux Replit workspace breaks the monorepo.

**How to apply:** Always `cd artifacts/academia-os-desktop && pnpm install` — never from the workspace root.

## Desktop auth
- Reuses `mobileDevices` + `mobileSessions` DB tables (server-side)
- Platform values: `'windows' | 'mac' | 'linux'`
- Token prefixes: `ados_access` / `ados_refresh` (desktop-only, can't be used in mobile endpoints)
- Full desktop API at `/api/desktop/v1/`

## Security model
- Main process holds all tokens (OS keychain via keytar)
- Renderer has NO network access — only `window.electronAPI.invoke(channel, args)`
- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
- Channel allowlist in preload.ts

## Local DB (SQLite)
- `better-sqlite3` (synchronous, safe in main process)
- For production encryption: swap to `better-sqlite3-multiple-ciphers`, add `PRAGMA key` after open
- DB key generated once via `ensureDbKey()`, stored in OS keychain — NOT in SQLite itself
- Outbox pattern: PENDING → UPLOADING → SYNCED/CONFLICT/REJECTED

## Build
- Windows only: `pnpm dist:win` from the desktop dir on Windows/GitHub Actions windows-latest
- Output: `release/AcademiaOS-Desktop-Windows-1.0.0-Setup.exe`
- See `artifacts/academia-os-desktop/BUILD.md` for full CI/CD recipe and code-signing instructions
