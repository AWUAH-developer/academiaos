import { app, BrowserWindow, ipcMain, shell, session } from 'electron';
import path from 'path';
import { setupIpcHandlers } from './ipc-handlers';

const isDev  = process.env.NODE_ENV === 'development';
const isProd = !isDev;

// ── Security: restrict navigation & new windows ───────────────────────────────
app.on('web-contents-created', (_, contents) => {
  // Block navigation to unexpected origins
  contents.on('will-navigate', (event, url) => {
    const allowed = isDev
      ? ['http://localhost:5173']
      : ['app://.']; // custom protocol in prod
    const origin = new URL(url).origin;
    if (!allowed.some((a) => url.startsWith(a))) {
      event.preventDefault();
    }
  });

  // Block new window creation (open in browser instead)
  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
});

function createWindow() {
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
      contextIsolation: true,
      nodeIntegration:  false,
      sandbox:          true,
      webSecurity:      true,
      allowRunningInsecureContent: false,
      // Never expose the renderer to node APIs — all IPC through contextBridge
    },
  });

  // Set Content-Security-Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          isProd
            ? "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src https://academiaos.cc https://*.academiaos.cc"
            : "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:5173 ws://localhost:5173; img-src * data:; connect-src *",
        ],
      },
    });
  });

  // Load the renderer
  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Show window after it finishes loading (prevents white flash)
  win.once('ready-to-show', () => win.show());

  return win;
}

// ── IPC handlers ──────────────────────────────────────────────────────────────
setupIpcHandlers(ipcMain);

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Block requests to localhost/internal URLs in production
if (isProd) {
  app.on('ready', () => {
    session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://localhost/*', 'http://127.0.0.1/*'] }, (_, cb) => {
      cb({ cancel: true });
    });
  });
}
