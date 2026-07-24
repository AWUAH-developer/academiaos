---
name: Desktop app architecture
description: Key decisions for the AcademiaOS Electron desktop app (artifacts/academia-os-desktop)
---

## Rule
The desktop Electron app lives in `artifacts/academia-os-desktop/` but is **excluded from the pnpm workspace** via `!artifacts/academia-os-desktop` in pnpm-workspace.yaml. It must be installed and built independently on Windows.

**Why:** Electron, keytar, and better-sqlite3 are platform-native binaries. Installing them in the Linux Replit workspace breaks the monorepo.

**How to apply:** Always `cd artifacts/academia-os-desktop && pnpm install` — never from the workspace root.

## Schema note
`desktopOutboxIdempotencyKeys` id column: uses `pgUuid` (a `customType<{ data: string }>` returning `'uuid'`) — NOT the `id()` text helper — to match `0009_desktop_outbox_idempotency.sql` exactly. `customType` IS exported from drizzle-orm 0.45.2 pg-core CJS index despite `uuid` not being in the ESM index. `idempotency_key` column is `text` everywhere (schema.ts, 0009 SQL, start.mjs).

## Migration authority
Single authority: Drizzle only. `start.mjs` no longer has duplicate DDL. Step 1 = Drizzle migrate, Step 2 = post-migration schema verification (read-only information_schema checks, fails startup with precise error if anything missing), Step 3 = Next.js start.

## 0007 migration
Was rewritten: no longer contains a hardcoded bcrypt hash. Only does lockout recovery (clear failed_login_count, locked_until, delete login_attempts). Password recovery uses `scripts/superadmin-recovery.mjs` which reads from SUPERADMIN_RECOVERY_PASSWORD Replit Secret.

## safeStorage
Uses async API: `safeStorage.isAsyncEncryptionAvailable()` → `encryptStringAsync()` / `decryptStringAsync({ value, shouldReEncrypt })`. Sync fallback only for migration of legacy credentials. Never falls back to plaintext — throws if encryption unavailable. tsconfig.electron.json must include `"DOM"` in lib for `console` to be typed.

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
