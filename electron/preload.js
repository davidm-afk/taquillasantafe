const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  refocus: () => ipcRenderer.send('refocus-window')
});
