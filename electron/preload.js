// electron/preload.js
console.log('Preload script loading...');

const { contextBridge, ipcRenderer } = require('electron');

// Store listener references for cleanup
const listenerMap = new Map();

contextBridge.exposeInMainWorld('electronAPI', {
  //Handle Compress
  selectImageForCompression: (data) => ipcRenderer.invoke('select-image-for-compression', data),
  saveCompressedImage: (data) => ipcRenderer.invoke('save-compressed-image', data),
  convertImageToPdf: (data) => ipcRenderer.invoke('convert-image-to-pdf', data),
  listLocalDocumentsForDisplay: (data) => ipcRenderer.invoke('list-local-documents-for-display', data),

  //Handle Open mobile Folder
  openOwnerFolder: (data) => ipcRenderer.invoke('open-owner-folder', data),

  //HandleViewDocument
  getLocalFileUrl: (filePath) => ipcRenderer.invoke('get-local-file-url', filePath),

  // Folder operations
  createOwnerFolders: (data) => ipcRenderer.invoke('create-owner-folders', data),

  checkFolderExists: (path) => ipcRenderer.invoke('check-folder-exists', path),

  // External URL operations
  openExternal: async (url) => {
    return ipcRenderer.invoke('open-external', url);
  },

  // NEW: Open external URL with custom download path
  openExternalWithDownloadPath: (data) => ipcRenderer.invoke('open-external-with-download-path', data),

  // NEW: Create download session with info window
  createDownloadSession: (data) => ipcRenderer.invoke('create-download-session', data),

  checkForm20MergeReady: (data) => ipcRenderer.invoke('check-form20-merge-ready', data),
  mergeForm20Documents: (data) => ipcRenderer.invoke('merge-form20-documents', data),

  // NEW: Copy download path to clipboard
  copyDownloadPath: (data) => ipcRenderer.invoke('copy-download-path', data),

  // Add this with the other API methods
  getFileStats: (filePath) => ipcRenderer.invoke('get-file-stats', filePath),

  // Document operations
  saveDocument: (data) => ipcRenderer.invoke('save-document', data),
  readDocument: (filePath) => ipcRenderer.invoke('read-document', filePath),
  listOwnerDocuments: (name) => ipcRenderer.invoke('list-owner-documents', name),
  deleteDocument: (filePath) => ipcRenderer.invoke('delete-document', filePath),

  getWebsiteDocumentUrl: (data) => ipcRenderer.invoke('get-website-document-url', data),

  splitPDF: (data) => ipcRenderer.invoke('split-pdf', data),
  extremeCompressPDF: (data) => ipcRenderer.invoke('extreme-compress-pdf', data),
  extractPDFImages: (data) => ipcRenderer.invoke('extract-pdf-images', data),

  // Enhanced Firebase sync operations
  syncFirebaseDocuments: (data) => ipcRenderer.invoke('sync-firebase-documents', data),
  syncOwnerDocuments: (data) => ipcRenderer.invoke('sync-owner-documents', data),
  printAllOwnerPDFs: (params) => {
    return ipcRenderer.invoke('print-all-owner-pdfs', params);
  },

  saveCompressedImageToFolder: (data) => ipcRenderer.invoke('save-compressed-image-to-folder', data),

  openWebsiteDocument: (data) => ipcRenderer.invoke('open-website-document', data),
  revertOwnerFolder: (data) => ipcRenderer.invoke('revert-owner-folder', data),

  compressImageToTarget: (data) => ipcRenderer.invoke('compress-image-to-target', data),
  createA4PdfFromCompressedImage: (data) => ipcRenderer.invoke('create-a4-pdf-from-compressed-image', data),
  getFileSize: (filePath) => ipcRenderer.invoke('get-file-size', filePath),
  copyFile: (data) => ipcRenderer.invoke('copy-file', data),
  moveOwnerFolder: (data) => ipcRenderer.invoke('move-owner-folder', data),

  // PDF operations
  compressPDF: (data) => ipcRenderer.invoke('compress-pdf', data),
  checkCompressionCapabilities: () => ipcRenderer.invoke('check-compression-capabilities'),
  processSignature: (params) => ipcRenderer.invoke('process-signature', params),

  renameFile: (params) => ipcRenderer.invoke('rename-file', params),
  convertJpgToPng: (params) => ipcRenderer.invoke('convert-jpg-to-png', params),
  saveFile: (params) => ipcRenderer.invoke('save-file', params),

  // In preload.js, add this to your electronAPI:
  checkPortalBrowserPreference: (documentKey) => ipcRenderer.invoke('check-portal-browser-preference', documentKey),
  listDocumentStatus: (data) => ipcRenderer.invoke('list-document-status', data),

  // Local document operations
  listLocalDocuments: (data) => ipcRenderer.invoke('list-local-documents', data),
  listLocalDocumentsForSync: (data) => ipcRenderer.invoke('list-local-documents-for-sync', data),

  getLocalFileInfo: (filePath) => ipcRenderer.invoke('get-local-file-info', filePath), // ADD THIS LINE
  deleteLocalFile: (data) => ipcRenderer.invoke('delete-local-file', data),
  deleteLocalDocument: (data) => ipcRenderer.invoke('delete-local-document', data),
  // cleanupEmptyFolders: (data) => ipcRenderer.invoke('cleanup-empty-folders', data),
  createFolderIfNotExists: (data) => ipcRenderer.invoke('create-folder-if-not-exists', data),
  processForm203: (data) => ipcRenderer.invoke('process-form20-3', data),
  cleanupDeletedOwnerFoldersV2: (data) => ipcRenderer.invoke('cleanup-deleted-owner-folders-v2', data),

  openWebsiteForDocument: (data) => ipcRenderer.invoke('open-website-for-document', data),
  getWebsiteDownloadStats: () => ipcRenderer.invoke('get-website-download-stats'),
  listWebsiteDocuments: (data) => ipcRenderer.invoke('list-website-documents', data),
  openWebsiteFolder: (data) => ipcRenderer.invoke('open-website-folder', data),
  closeAllPortalWindows: () => ipcRenderer.invoke('close-all-portal-windows'),

  getPdfPageCount: (filePath) => ipcRenderer.invoke('get-pdf-page-count', filePath),
  extractPdfPage: (data) => ipcRenderer.invoke('extract-pdf-page', data),
  extractPdfPages: (data) => ipcRenderer.invoke('extract-pdf-pages', data),
  deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),

  // PDF stamping operations
  selectAndStampPdf: (stampConfig) => ipcRenderer.invoke('select-and-stamp-pdf', stampConfig),
  stampPdfFile: (data) => ipcRenderer.invoke('stamp-pdf-file', data),
  getStampPreview: () => ipcRenderer.invoke('get-stamp-preview'),
  checkStampExists: () => ipcRenderer.invoke('check-stamp-exists'),
  copyMobileToWebsite: (data) => ipcRenderer.invoke('copy-mobile-to-website', data),
  getLocalFileData: (filePath) => ipcRenderer.invoke('get-local-file-data', filePath),

  saveFinanceStamp: (data) => ipcRenderer.invoke('save-finance-stamp', data),
  openFinanceStampFolder: (showroomName) => ipcRenderer.invoke('open-finance-stamp-folder', showroomName),
  getFinanceStamp: (companyName, showroomName) => ipcRenderer.invoke('get-finance-stamp', companyName, showroomName),
  deleteFinanceStamp: (companyName, showroomName) => ipcRenderer.invoke('delete-finance-stamp', companyName, showroomName),
  listFinanceStamps: (showroomName) => ipcRenderer.invoke('list-finance-stamps', showroomName),
  convertPdfToJpeg: (data) => ipcRenderer.invoke('convert-pdf-to-jpeg', data),

  // NEW: Document-type specific stamping
  stampWebsiteDocument: (data) => ipcRenderer.invoke('stamp-online-document', data),
  getStampingRules: (documentType) => ipcRenderer.invoke('get-stamping-rules', documentType),

  selectPdfForPreview: (data) => ipcRenderer.invoke('select-pdf-for-preview', data),

  openFolder: (path) => ipcRenderer.invoke('open-folder', path),

  // Progress listeners with proper cleanup
  onSyncProgress: (callback) => {
    // Remove any existing listener
    const existingListener = listenerMap.get('sync-progress');
    if (existingListener) {
      ipcRenderer.removeListener('sync-progress', existingListener);
    }

    // Create wrapper function to handle event
    const listener = (event, data) => callback(data);

    // Store reference for cleanup
    listenerMap.set('sync-progress', listener);

    // Add listener
    ipcRenderer.on('sync-progress', listener);
  },

  removeSyncProgressListener: () => {
    const listener = listenerMap.get('sync-progress');
    if (listener) {
      ipcRenderer.removeListener('sync-progress', listener);
      listenerMap.delete('sync-progress');
    }
  },

  onCompressionProgress: (callback) => {
    // Remove any existing listener
    const existingListener = listenerMap.get('compression-progress');
    if (existingListener) {
      ipcRenderer.removeListener('compression-progress', existingListener);
    }

    // Create wrapper function to handle event
    const listener = (event, data) => callback(data);

    // Store reference for cleanup
    listenerMap.set('compression-progress', listener);

    // Add listener
    ipcRenderer.on('compression-progress', listener);
  },

  removeCompressionProgressListener: () => {
    const listener = listenerMap.get('compression-progress');
    if (listener) {
      ipcRenderer.removeListener('compression-progress', listener);
      listenerMap.delete('compression-progress');
    }
  }
});

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    on: (channel, func) => {
      const validChannels = ['download-started', 'download-completed', 'download-progress', 'download-error'];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    },
    removeListener: (channel, func) => {
      const validChannels = ['download-started', 'download-completed', 'download-progress', 'download-error'];
      if (validChannels.includes(channel)) {
        ipcRenderer.removeListener(channel, func);
      }
    },
    removeAllListeners: (channel) => {
      const validChannels = ['download-started', 'download-completed', 'download-progress', 'download-error'];
      if (validChannels.includes(channel)) {
        ipcRenderer.removeAllListeners(channel);
      }
    }
  }
});

console.log('electronAPI exposed with enhanced features!');
