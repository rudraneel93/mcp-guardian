/**
 * Electron shell for MCP Guardian SOC (enterprise desktop install).
 * Expects GUARDIAN_DESKTOP_URL or argv[2] from `mcp-guardian desktop`.
 */
import { app, BrowserWindow } from 'electron';

const appUrl = process.env.GUARDIAN_DESKTOP_URL || process.argv[2];
if (!appUrl || !/^https?:\/\/127\.0\.0\.1:\d+\/?/.test(appUrl)) {
  console.error('[guardian-desktop] Missing or invalid app URL. Launch via: mcp-guardian desktop');
  process.exit(1);
}

/** Keep all navigation inside the desktop shell; block external browser opens for app URLs. */
function isAppNavigation(url) {
  try {
    const u = new URL(url);
    return u.hostname === '127.0.0.1' && u.protocol.startsWith('http');
  } catch {
    return false;
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'MCP Guardian SOC',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isAppNavigation(url)) {
      void win.loadURL(url);
      return { action: 'deny' };
    }
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (!isAppNavigation(url)) {
      event.preventDefault();
    }
  });

  void win.loadURL(appUrl);
  return win;
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    if (!isAppNavigation(url)) return { action: 'deny' };
    return { action: 'deny' };
  });
});
