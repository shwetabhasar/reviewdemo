// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Owner List APIs
  getOwnerList: (basePath) => ipcRenderer.invoke('get-owner-list', basePath),
  
  openOwnerFolder: (folderPath) => ipcRenderer.invoke('open-owner-folder', folderPath),
  
  comparePdfs: (ownerName, basePath) => ipcRenderer.invoke('compare-pdfs', ownerName, basePath),

  // Add your other existing APIs below...
  // Example:
  // loadSettings: () => ipcRenderer.invoke('load-settings'),
  // saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
});