const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  quit:      () => ipcRenderer.send('app-quit'),
  setHeight: (h) => ipcRenderer.send('set-height', h),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  onServerLog: (callback) => {
    ipcRenderer.on('server-log', (_, log) => callback(log));
  },
  onServerError: (callback) => {
    ipcRenderer.on('server-error', (_, err) => callback(err));
  },
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (_, info) => callback(info));
  }
});

