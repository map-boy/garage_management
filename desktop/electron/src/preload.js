const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs to the renderer (your React app)
contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('app-version'),
  checkForUpdate: () => ipcRenderer.invoke('check-update'),
  platform: process.platform,
});