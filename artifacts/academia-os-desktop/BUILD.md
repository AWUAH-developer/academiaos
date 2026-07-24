# AcademiaOS Desktop — Build Guide

## Architecture

```
artifacts/academia-os-desktop/
├── electron/          Main process (Node.js / Electron)
│   ├── main.ts        Window creation, CSP, navigation guard
│   ├── preload.ts     contextBridge API (narrow allowlist)
│   ├── secure-storage.ts  OS keychain (keytar)
│   ├── sqlite.ts      Local encrypted SQLite (better-sqlite3)
│   └── ipc-handlers.ts    All IPC channels
├── src/               Renderer (React / Vite)
│   ├── api/client.ts  IPC wrapper — no direct network
│   ├── store/         Auth + sync state
│   ├── components/    Sidebar, TitleBar, StatusBar
│   └── screens/       14 screens
└── electron-builder.yml / package.json
```

## Prerequisites

- Node.js 20+
- pnpm 9+
- Windows 10 x64 or later **for the final Windows build**
- Wine (optional, for cross-compiling from Linux/macOS — not recommended)

## Environment setup

> ⚠ The pnpm monorepo root uses platform-specific exclusions for Linux.
> Build the desktop app **inside its own directory** to avoid conflicts.

```bash
cd artifacts/academia-os-desktop
pnpm install
```

This installs Electron, better-sqlite3 (native), keytar (native), and Vite.

## Development

```bash
# Terminal 1 — Vite dev server (renderer hot-reload)
pnpm dev:renderer

# Terminal 2 — Electron main process (rebuild required after changes)
pnpm electron:dev
```

The renderer loads from `http://localhost:5173` in dev mode.

## Production build (Windows)

Run on a **Windows x64** machine (or GitHub Actions windows-latest runner):

```bash
cd artifacts/academia-os-desktop
pnpm install
pnpm dist:win
```

Output: `release/AcademiaOS-Desktop-Windows-1.0.0-Setup.exe`

## Recommended CI/CD (GitHub Actions)

```yaml
jobs:
  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: pnpm install
        working-directory: artifacts/academia-os-desktop
      - run: pnpm dist:win
        working-directory: artifacts/academia-os-desktop
      - uses: actions/upload-artifact@v4
        with:
          name: windows-installer
          path: artifacts/academia-os-desktop/release/*.exe
```

## SQLCipher at-rest encryption (production)

Replace `better-sqlite3` with `better-sqlite3-multiple-ciphers`:

```bash
pnpm remove better-sqlite3
pnpm add better-sqlite3-multiple-ciphers
pnpm add -D @types/better-sqlite3
```

In `electron/sqlite.ts`, after `new Database(dbPath)`, add:
```ts
_db.pragma(`key = '${encryptionKey}'`);
_db.pragma('cipher = sqlcipher');
```

The encryption key is generated once and stored in the OS keychain via `ensureDbKey()`.

## Security checklist

- [x] `contextIsolation: true`
- [x] `nodeIntegration: false`
- [x] `sandbox: true`
- [x] Content-Security-Policy header
- [x] Navigation allowlist (blocks unexpected URLs)
- [x] `setWindowOpenHandler` blocks new windows
- [x] Tokens stored in OS keychain (keytar), not localStorage or SQLite
- [x] Production blocks localhost requests
- [x] HTTPS-only API communication
- [ ] SQLCipher at-rest encryption (replace better-sqlite3 — see above)
- [ ] Code signing certificate (Windows: EV cert from DigiCert/Sectigo)

## Code signing (Windows)

```yaml
env:
  WIN_CSC_LINK:        ${{ secrets.WIN_CERT_PFX_BASE64 }}
  WIN_CSC_KEY_PASSWORD: ${{ secrets.WIN_CERT_PASSWORD }}
```

electron-builder reads these automatically when building the NSIS installer.

## pnpm workspace isolation

The monorepo root `pnpm-workspace.yaml` excludes platform-specific packages
for Linux. The desktop build runs `pnpm install` **inside**
`artifacts/academia-os-desktop/` independently, so Windows/macOS native
packages (Electron, keytar, better-sqlite3) install correctly for the
target platform without touching the Replit Linux workspace.

Never run `pnpm install` from the monorepo root for the desktop build —
always `cd artifacts/academia-os-desktop && pnpm install` first.
