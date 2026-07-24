/**
 * AcademiaOS Desktop — Electron main process
 *
 * Startup order (security-critical — do not reorder):
 *   1. app.whenReady()
 *   2. ensureDbKey()        — generate/retrieve AES key from OS DPAPI vault
 *   3. initializeDb(key)    — open sqleet-encrypted DB, apply key, create schema
 *   4. setupIpcHandlers()   — register IPC channels (DB is ready at this point)
 *   5. createWindow()       — create BrowserWindow with contextIsolation + sandbox
 *
 * Security properties:
 *   - contextIsolation: true   (renderer cannot access Node.js)
 *   - nodeIntegration:  false  (renderer has no Node.js APIs)
 *   - sandbox:          true   (renderer process is sandboxed)
 *   - safeStorage DPAPI vault  (no plaintext tokens on disk)
 *   - sqleet at-rest encryption (via better-sqlite3-multiple-ciphers)
 *   - CSP blocks inline scripts in production
 *   - Navigation allowlist rejects unexpected origins
 *   - New windows always open in external browser, never in-app
 */
import { app, BrowserWindow, ipcMain, shell, session } from 'electron';
import path from 'path';
import { setupIpcHandlers } from './ipc-handlers';
import { ensureDbKey } from './secure-storage';
import { initializeDb } from './sqlite';

const isDev  = process.env.NODE_ENV === 'development';
const isProd = !isDev;

// ── Security: restrict navigation & new windows ────────────────────────────────
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, url) => {
    const allowed = isDev
      ? ['http://localhost:5173']
      : ['app://.'];
    if (!allowed.some((a) => url.startsWith(a))) {
      event.preventDefault();
    }
  });

  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
});

// ── Window factory ─────────────────────────────────────────────────────────────
function createWindow(): BrowserWindow {
  const preloadPath = path.join(__dirname, 'preload.js');

  const win = new BrowserWindow({
    width:           1280,
    height:          800,
    minWidth:        960,
    minHeight:       600,
    title:           'AcademiaOS',
    titleBarStyle:   'hiddenInset',
    backgroundColor: '#1f5b45',
    show:            false,
    webPreferences: {
      preload:          preloadPath,
      contextIsolation: true,   // ← MUST remain true
      nodeIntegration:  false,  // ← MUST remain false
      sandbox:          true,   // ← MUST remain true
      webSecurity:      true,
      allowRunningInsecureContent: false,
    },
  });

  // Content-Security-Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          isProd
            ? [
                "default-src 'self'",
                "script-src 'self'",
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' data: https:",
                "connect-src https://academiaos.cc https://*.academiaos.cc",
                "font-src 'self' data:",
                "frame-src 'none'",
                "object-src 'none'",
              ].join('; ')
            : [
                "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:5173 ws://localhost:5173",
                "img-src * data:",
                "connect-src *",
              ].join('; '),
        ],
      },
    });
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  win.once('ready-to-show', () => win.show());

  return win;
}

// ── App lifecycle ──────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  // Step 1 — get or create the database encryption key (stored in OS DPAPI vault)
  const dbKey = await ensureDbKey();

  // Step 2 — open the SQLCipher database (applies key, creates/migrates schema)
  initializeDb(dbKey);

  // Step 3 — register all IPC handlers (DB is fully open now)
  setupIpcHandlers(ipcMain);

  // Step 4 — create the browser window
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Block localhost in production (dev server must not be reachable)
if (isProd) {
  app.on('ready', () => {
    session.defaultSession.webRequest.onBeforeRequest(
      { urls: ['http://localhost/*', 'http://127.0.0.1/*'] },
      (_, cb) => cb({ cancel: true }),
    );
  });
}
