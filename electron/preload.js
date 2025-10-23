// electron/preload.js - Simplified with only Owner List
console.log('Preload script loading...');

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Get list of owners from folder structure
  getOwnerList: (basePath) => ipcRenderer.invoke('get-owner-list', basePath),

  // Opens the owner folder in file explorer
  openOwnerFolder: (folderPath) => ipcRenderer.invoke('open-owner-folder', folderPath)
});

console.log('electronAPI exposed with Owner List features!');
