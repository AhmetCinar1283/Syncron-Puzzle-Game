const { app, BrowserWindow, Menu, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const isDev = process.argv.includes('--dev');

// Register custom protocol scheme before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      allowServiceWorkers: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    fullscreen: true,
    autoHideMenuBar: true,
    backgroundColor: '#030712', // match game bg — no white flash on load
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // ── Disable native context menu (Inspect Element etc.) ──────────────────
  win.webContents.on('context-menu', (e) => {
    e.preventDefault();
  });

  // ── Disable DevTools in production ────────────────────────────────────────
  if (!isDev) {
    win.webContents.on('before-input-event', (event, input) => {
      if (
        (input.key === 'F12') ||
        (input.control && input.shift && input.key === 'I') ||
        (input.control && input.shift && input.key === 'J') ||
        (input.control && input.key === 'U')
      ) {
        event.preventDefault();
      }
    });
  }

  // ── F11 toggles fullscreen, Escape exits fullscreen ───────────────────────
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    }
    if (input.key === 'Escape' && win.isFullScreen()) {
      win.setFullScreen(false);
      event.preventDefault();
    }
  });

  // ── Load the app ──────────────────────────────────────────────────────────
  if (isDev) {
    win.loadURL('http://localhost:3000');
    win.webContents.openDevTools();
  } else {
    win.loadURL('app://localhost/index.html');
  }
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);

  if (!isDev) {
    const baseDir = app.isPackaged
      ? path.join(process.resourcesPath, 'app', 'out')
      : path.join(__dirname, '..', 'out');

    protocol.handle('app', (request) => {
      const url = new URL(request.url);
      let relativePath = decodeURIComponent(url.pathname);
      if (relativePath === '/' || relativePath === '') {
        relativePath = '/index.html';
      }

      let filePath = path.join(baseDir, relativePath);

      // If path doesn't have an extension, try .html or index.html
      if (!path.extname(filePath)) {
        if (fs.existsSync(filePath + '.html')) {
          filePath = filePath + '.html';
        } else if (fs.existsSync(path.join(filePath, 'index.html'))) {
          filePath = path.join(filePath, 'index.html');
        }
      }

      return net.fetch(pathToFileURL(filePath).toString());
    });
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

