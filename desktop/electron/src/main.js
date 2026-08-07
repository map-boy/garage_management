const Sentry = require('@sentry/electron/main');
Sentry.init({ dsn: 'https://66213e0e7054b0122b8c69717e016afa@o4511678051778560.ingest.de.sentry.io/4511678073405520' });
const { app, BrowserWindow, shell, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const path = require('path');
log.transports.file.level = 'info';
autoUpdater.logger = log;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
let mainWindow;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    title: 'Garage Management Pro',
    icon: path.join(__dirname, '../../assets/icons/icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
    backgroundColor: '#f9fafb',
  });
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(process.resourcesPath, 'app', 'index.html');
    log.info('Loading from:', indexPath);
    mainWindow.loadFile(indexPath);
  }
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.includes('accounts.google.com') || url.includes('firebaseapp.com')) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 500,
          height: 650,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          },
        },
      };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}
app.whenReady().then(() => {
  createWindow();
  // Auto-update disabled: no GitHub releases feed is published yet.
  // Re-enable once a real repo with releases exists by uncommenting below
  // and setting the correct owner/repo in package.json "build.publish".
  // if (!isDev) {
  //   setTimeout(() => {
  //     autoUpdater.checkForUpdatesAndNotify();
  //   }, 3000);
  // }
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
autoUpdater.on('update-available', (info) => {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Available',
    message: `Garage Management Pro v${info.version} is available.`,
    buttons: ['OK'],
  });
});
autoUpdater.on('update-downloaded', (info) => {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Ready',
    message: `v${info.version} ready. Restart to apply.`,
    buttons: ['Restart Now', 'Later'],
  }).then((result) => {
    if (result.response === 0) autoUpdater.quitAndInstall();
  });
});
autoUpdater.on('error', (err) => {
  log.error('Auto-updater error:', err);
});
ipcMain.handle('app-version', () => app.getVersion());
ipcMain.handle('check-update', () => autoUpdater.checkForUpdatesAndNotify());