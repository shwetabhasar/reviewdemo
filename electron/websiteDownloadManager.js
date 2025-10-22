// electron/websiteDownloadManager.js
const { BrowserWindow, shell, Notification, Menu } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { notificationScript } = require('./browserNotificationInjector');

class WebsiteDownloadManager {
  constructor() {
    this.portalWindows = new Map();
    this.activeDownloads = new Map();
    this.downloadConfig = null;
  }

  // Portal URLs configuration
  getPortalConfig() {
    return {
      parivahan: {
        url: 'https://vahan.parivahan.gov.in/vahan/vahan/ui/login/login.xhtml',
        name: 'Parivahan Portal',
        documents: ['disclaimer', 'form21', 'form20-1', 'form20-2', 'form20-3'],
        preferExternal: false // Can be opened in Electron
      },
      insurancedekho: {
        url: 'https://www.insurancedekho.com/',
        name: 'Insurance',
        documents: ['insurance'],
        preferExternal: true // Some insurance sites work better in Chrome
      },
      autonet: {
        url: 'http://192.168.1.100:8080',
        name: 'AutoNet Local',
        documents: ['invoice', 'form22'],
        preferExternal: false // Local sites usually work fine in Electron
      }
    };
  }

  // Determine which portal to use based on document type
  getPortalForDocument(documentKey) {
    const portals = this.getPortalConfig();

    for (const [portalKey, config] of Object.entries(portals)) {
      if (config.documents.includes(documentKey)) {
        return { key: portalKey, ...config };
      }
    }

    // Default to parivahan if not found
    return { key: 'parivahan', ...portals.parivahan };
  }

  // Set download configuration for current session
  setDownloadConfig(config) {
    this.downloadConfig = config;
    console.log('Download config set:', config);
  }

  // Send notification to browser window
  sendBrowserNotification(portalKey, eventType, data) {
    const portalWindow = this.portalWindows.get(portalKey);
    if (portalWindow && !portalWindow.isDestroyed()) {
      console.log(`Sending notification to browser window: ${eventType}`, data);

      const script = `
        if (window.electronDownloadHandlers && window.electronDownloadHandlers.${eventType}) {
          window.electronDownloadHandlers.${eventType}(${JSON.stringify(data)});
        }
      `;

      portalWindow.webContents.executeJavaScript(script).catch((err) => {
        console.error('Error sending browser notification:', err);
      });
    }
  }

  getOwnerPaths(showroomName, ownerName, ownerContact) {
    const basePath = 'D:/';
    const showroomPath = path.join(basePath, this.sanitizeFolderName(showroomName));
    const parentFolder = '1 FromMobiles';
    const ownerFolderName = `${this.sanitizeFolderName(ownerName)}_${ownerContact}`;
    const ownerPath = path.join(showroomPath, parentFolder, ownerFolderName);
    const websitePath = path.join(ownerPath, 'website');
    const finalPdfsPath = path.join(ownerPath, 'Final PDFs');
    const compressedFilesPath = path.join(ownerPath, 'compressed_files');

    return { ownerPath, websitePath, finalPdfsPath, compressedFilesPath };
  }

  // Open website for document download
  async openWebsiteForDocument(documentKey, ownerConfig) {
    try {
      const { showroomName, ownerName, ownerContact } = ownerConfig;

      // Set the download configuration
      this.setDownloadConfig({
        showroomName,
        ownerName,
        ownerContact,
        documentKey
      });

      // Get portal configuration
      const portal = this.getPortalForDocument(documentKey);
      console.log(`Opening ${portal.name} for ${documentKey}`);

      // Check if window already exists for this portal
      let portalWindow = this.portalWindows.get(portal.key);

      if (!portalWindow || portalWindow.isDestroyed()) {
        // Create new window with toolbar
        portalWindow = new BrowserWindow({
          width: 1200,
          height: 800,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            partition: `persist:${portal.key}`, // Separate session for each portal
            devTools: true // Enable DevTools
          },
          title: `${portal.name} - ${ownerName}`,
          autoHideMenuBar: false,
          frame: true // Ensure window has frame with close button
        });

        // Create menu bar with navigation
        this.createWindowMenu(portalWindow);

        // Set up download handler for this window
        this.setupDownloadHandler(portalWindow, portal.key);

        // Store window reference
        this.portalWindows.set(portal.key, portalWindow);

        // Clean up on close
        portalWindow.on('closed', () => {
          this.portalWindows.delete(portal.key);
        });
      }

      // Load the portal URL
      await portalWindow.loadURL(portal.url);

      // Function to inject script with retry
      const injectScript = async (retries = 3) => {
        for (let i = 0; i < retries; i++) {
          try {
            await portalWindow.webContents.executeJavaScript(notificationScript);
            console.log(`Notification script injected successfully (attempt ${i + 1})`);

            // Verify injection worked
            const check = await portalWindow.webContents.executeJavaScript('typeof window.electronDownloadHandlers !== "undefined"');

            if (check) {
              console.log('✓ Injection verified - handlers are available');
              return true;
            } else {
              console.log('✗ Injection failed - handlers not found, retrying...');
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          } catch (err) {
            console.error(`Error injecting notification script (attempt ${i + 1}):`, err);
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
        return false;
      };

      // Inject on various events to handle SPAs
      portalWindow.webContents.on('did-finish-load', async () => {
        console.log('Page finished loading, injecting notification script...');
        await injectScript();
      });

      portalWindow.webContents.on('dom-ready', async () => {
        console.log('DOM ready, injecting notification script...');
        await injectScript();
      });

      // For SPAs, inject after navigation with delay
      portalWindow.webContents.on('did-navigate-in-page', async (event, url) => {
        console.log('In-page navigation detected:', url);
        setTimeout(async () => {
          await injectScript();
        }, 1000);
      });

      // Also monitor for frame navigation
      portalWindow.webContents.on('did-frame-navigate', async (event, url) => {
        console.log('Frame navigation detected:', url);
        setTimeout(async () => {
          await injectScript();
        }, 1000);
      });

      // Inject periodically for stubborn SPAs
      const injectionInterval = setInterval(async () => {
        const exists = await portalWindow.webContents
          .executeJavaScript('typeof window.electronDownloadHandlers !== "undefined"')
          .catch(() => false);

        if (!exists) {
          console.log('Handlers missing, re-injecting...');
          await injectScript(1);
        }
      }, 5000); // Check every 5 seconds

      // Clear interval when window closes
      portalWindow.on('closed', () => {
        clearInterval(injectionInterval);
      });

      portalWindow.show();
      portalWindow.focus();

      return {
        success: true,
        portal: portal.name,
        message: `Opened ${portal.name} for ${documentKey}`
      };
    } catch (error) {
      console.error('Error opening website:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Setup download handler for a window
  setupDownloadHandler(window, portalKey) {
    const windowSession = window.webContents.session;

    // Set download path and handle download events
    windowSession.on('will-download', async (event, item, webContents) => {
      try {
        if (!this.downloadConfig) {
          console.error('No download configuration set');
          return;
        }

        const { showroomName, ownerName, ownerContact, documentKey } = this.downloadConfig;

        // Construct the save path using dynamic paths
        const paths = this.getOwnerPaths(showroomName, ownerName, ownerContact);

        // Ensure website folder exists
        await this.ensureDirectoryExists(paths.websitePath);

        // Get original filename
        const originalFileName = item.getFilename();

        // Create a unique filename with timestamp and document type
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const ext = path.extname(originalFileName);
        const baseName = path.basename(originalFileName, ext);

        // Include document type in filename for better organization
        const documentTypePrefix = this.getDocumentPrefix(documentKey);
        const uniqueFileName = `${documentTypePrefix}_${baseName}_${timestamp}${ext}`;
        const savePath = path.join(paths.websitePath, uniqueFileName);

        // Set the save path
        item.setSavePath(savePath);

        // Track download
        const downloadId = Date.now().toString();
        this.activeDownloads.set(downloadId, {
          id: downloadId,
          fileName: uniqueFileName,
          originalName: originalFileName,
          portal: portalKey,
          documentType: documentKey,
          startTime: Date.now(),
          savePath,
          status: 'downloading'
        });

        // Send download started notification to browser window
        this.sendBrowserNotification(portalKey, 'onDownloadStarted', {
          fileName: uniqueFileName,
          documentType: documentTypePrefix,
          message: `Downloading ${documentTypePrefix}...`,
          downloadId,
          status: 'downloading'
        });

        // Handle download progress
        let lastProgress = 0;
        item.on('updated', (event, state) => {
          if (state === 'interrupted') {
            console.log('Download interrupted:', uniqueFileName);
            this.updateDownloadStatus(downloadId, 'interrupted');

            // Send error to browser window
            this.sendBrowserNotification(portalKey, 'onDownloadError', {
              fileName: uniqueFileName,
              error: 'Download was interrupted',
              downloadId,
              status: 'error'
            });
          } else if (state === 'progressing') {
            if (item.isPaused()) {
              console.log('Download paused:', uniqueFileName);
              this.updateDownloadStatus(downloadId, 'paused');
            } else {
              const received = item.getReceivedBytes();
              const total = item.getTotalBytes();
              const progress = total > 0 ? Math.round((received / total) * 100) : 0;

              // Send progress updates every 10%
              if (progress - lastProgress >= 10) {
                lastProgress = progress;

                // Send to browser window
                this.sendBrowserNotification(portalKey, 'onDownloadProgress', {
                  fileName: uniqueFileName,
                  progress,
                  received,
                  total,
                  downloadId
                });
              }
            }
          }
        });

        // Handle download completion
        item.once('done', (event, state) => {
          if (state === 'completed') {
            console.log('Download completed:', uniqueFileName);
            console.log('Saved to:', savePath);
            this.updateDownloadStatus(downloadId, 'completed');

            // Send completion notification to browser window
            this.sendBrowserNotification(portalKey, 'onDownloadCompleted', {
              fileName: uniqueFileName,
              documentType: documentTypePrefix,
              message: `${documentTypePrefix} downloaded successfully!`,
              savePath,
              downloadId,
              status: 'completed'
            });

            // Show system notification
            this.showNotification('Download Complete', `${documentTypePrefix} saved successfully`, savePath);
          } else if (state === 'cancelled') {
            console.log('Download cancelled:', uniqueFileName);
            this.updateDownloadStatus(downloadId, 'cancelled');

            // Send error to browser window
            this.sendBrowserNotification(portalKey, 'onDownloadError', {
              fileName: uniqueFileName,
              error: 'Download was cancelled',
              downloadId,
              status: 'error'
            });
          } else {
            console.log(`Download failed (${state}):`, uniqueFileName);
            this.updateDownloadStatus(downloadId, 'failed');

            // Send error to browser window
            this.sendBrowserNotification(portalKey, 'onDownloadError', {
              fileName: uniqueFileName,
              error: `Download failed: ${state}`,
              downloadId,
              status: 'error'
            });
          }

          // Clean up after a delay
          setTimeout(() => {
            this.activeDownloads.delete(downloadId);
          }, 5000);
        });
      } catch (error) {
        console.error('Error in download handler:', error);

        // Send error to browser window
        this.sendBrowserNotification(portalKey, 'onDownloadError', {
          error: error.message,
          status: 'error'
        });
      }
    });

    // Also handle direct navigation to PDFs
    window.webContents.on('will-navigate', (event, url) => {
      if (url.toLowerCase().endsWith('.pdf')) {
        console.log('PDF navigation detected:', url);
        // Prevent navigation to PDF and download it instead
        event.preventDefault();

        // Notify browser window about PDF detection
        this.sendBrowserNotification(portalKey, 'onPdfDetected', {
          url,
          message: 'PDF detected, starting download...',
          status: 'info'
        });

        // Download the PDF instead of navigating to it
        window.webContents.downloadURL(url);
      }
    });

    // Handle new window requests (for PDFs opening in new windows)
    window.webContents.setWindowOpenHandler(({ url }) => {
      if (url.toLowerCase().endsWith('.pdf')) {
        console.log('PDF popup detected:', url);

        // Notify browser window about PDF popup
        this.sendBrowserNotification(portalKey, 'onPdfDetected', {
          url,
          message: 'PDF popup detected, starting download...',
          status: 'info'
        });

        // Download instead of opening new window
        window.webContents.downloadURL(url);
        return { action: 'deny' };
      }
      return { action: 'allow' };
    });
  }

  // Get document prefix for filename
  getDocumentPrefix(documentKey) {
    const prefixes = {
      insurance: 'Insurance',
      invoice: 'Invoice',
      form22: 'Form22',
      disclaimer: 'Disclaimer',
      form21: 'Form21',
      'form20-1': 'Form20-1',
      'form20-2': 'Form20-2',
      'form20-3': 'Form20-3'
    };
    return prefixes[documentKey] || 'Document';
  }

  // Update download status
  updateDownloadStatus(downloadId, status) {
    const download = this.activeDownloads.get(downloadId);
    if (download) {
      download.status = status;
      download.completedTime = Date.now();
    }
  }

  // Show system notification
  showNotification(title, body, filePath) {
    // For now, just show basic notification
    // Note: Full notification actions require additional setup in Electron
    new Notification(title, { body }).show();
  }

  // Ensure directory exists
  async ensureDirectoryExists(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
      console.log('Created directory:', dirPath);
    }
  }

  // Sanitize folder names
  sanitizeFolderName(name) {
    if (!name || typeof name !== 'string') {
      return 'Unknown';
    }
    return name.replace(/[<>:"/\\|?*]/g, '_').trim();
  }

  // Get download statistics
  getDownloadStats() {
    const stats = {
      active: 0,
      completed: 0,
      failed: 0,
      total: this.activeDownloads.size
    };

    for (const download of this.activeDownloads.values()) {
      if (download.status === 'downloading' || download.status === 'progressing') {
        stats.active++;
      } else if (download.status === 'completed') {
        stats.completed++;
      } else if (download.status === 'failed' || download.status === 'cancelled') {
        stats.failed++;
      }
    }

    return stats;
  }

  // List downloaded files from website folder
  async listWebsiteDocuments(showroomName, ownerName, ownerContact) {
    try {
      const paths = this.getOwnerPaths(showroomName, ownerName, ownerContact);

      const documents = [];

      // Document configurations with their expected filenames and source folders
      const documentConfigs = [
        // Documents that should be read from Final PDFs folder
        { key: 'insurance', fileNames: ['insu.pdf', 'insurance.pdf', 'Insurance.pdf'], sourceFolder: paths.finalPdfsPath },
        { key: 'invoice', fileNames: ['invo.pdf', 'invoice.pdf', 'Invoice.pdf'], sourceFolder: paths.finalPdfsPath },
        { key: 'form22', fileNames: ['fm22.pdf', 'form22.pdf', 'Form22.pdf'], sourceFolder: paths.finalPdfsPath },
        { key: 'disclaimer', fileNames: ['disc.pdf', 'disclaimer.pdf', 'Disclaimer.pdf'], sourceFolder: paths.finalPdfsPath },
        { key: 'form21', fileNames: ['fm21.pdf', 'form21.pdf', 'Form21.pdf'], sourceFolder: paths.finalPdfsPath },
        { key: 'form60', fileNames: ['form60.pdf', 'Form60.pdf', 'fm60.pdf'], sourceFolder: paths.finalPdfsPath },
        { key: 'medical', fileNames: ['medical.pdf', 'Medical.pdf', 'med.pdf'], sourceFolder: paths.finalPdfsPath },
        // Form 20 documents - these should ONLY be read from website folder
        { key: 'form20', fileNames: ['fm20.pdf', 'form20.pdf', 'Form20.pdf'], sourceFolder: paths.finalPdfsPath },
        { key: 'form20-1', fileNames: ['201.pdf', 'form20-1.pdf', 'Form20-1.pdf'], sourceFolder: paths.websitePath, onlyFromWebsite: true },
        { key: 'form20-2', fileNames: ['202.pdf', 'form20-2.pdf', 'Form20-2.pdf'], sourceFolder: paths.websitePath, onlyFromWebsite: true },
        { key: 'form20-3', fileNames: ['203.pdf', 'form20-3.pdf', 'Form20-3.pdf'], sourceFolder: paths.websitePath, onlyFromWebsite: true }
      ];

      // Check each document configuration
      for (const config of documentConfigs) {
        // If this document should ONLY be read from website folder (Form 20 documents)
        if (config.onlyFromWebsite) {
          for (const fileName of config.fileNames) {
            const filePath = path.join(config.sourceFolder, fileName);

            try {
              await fs.access(filePath);
              const stats = await fs.stat(filePath);

              documents.push({
                fileName,
                size: stats.size,
                localPath: filePath,
                isLocal: true,
                documentType: 'pdf',
                downloadedAt: stats.birthtime,
                modifiedAt: stats.mtime,
                key: config.key,
                sourceFolder: 'website',
                isFromFinalPdfs: false // ← ADDED (same as mobile)
              });

              console.log(`[Website Documents] Found ${fileName} in website folder: ${(stats.size / 1024).toFixed(1)}KB`);
              break;
            } catch {
              // File doesn't exist, continue to next filename
            }
          }
        } else {
          // For all other documents, read from Final PDFs folder
          for (const fileName of config.fileNames) {
            const filePath = path.join(config.sourceFolder, fileName);

            try {
              await fs.access(filePath);
              const stats = await fs.stat(filePath);

              documents.push({
                fileName,
                size: stats.size,
                localPath: filePath,
                isLocal: true,
                documentType: 'pdf',
                downloadedAt: stats.birthtime,
                modifiedAt: stats.mtime,
                key: config.key,
                sourceFolder: 'finalPdfs', // ← CHANGED to camelCase
                isFromFinalPdfs: true // ← ADDED (same as mobile)
              });

              console.log(`[Website Documents] Found ${fileName} in Final PDFs folder: ${(stats.size / 1024).toFixed(1)}KB`);
              break;
            } catch {
              // File doesn't exist, continue to next filename
            }
          }
        }
      }

      // Special handling for files with exact names from your Final PDFs folder
      const specialMappings = {
        'adhr.pdf': 'aadhaar',
        'chss.pdf': 'chassis',
        'vhcl.pdf': 'vehicle',
        'pan.pdf': 'pan',
        'form20.pdf': 'form20',
        'form60.pdf': 'form60',
        'medical.pdf': 'medical'
      };

      // Check for these special files in Final PDFs
      for (const [fileName, documentKey] of Object.entries(specialMappings)) {
        const filePath = path.join(paths.finalPdfsPath, fileName);

        try {
          await fs.access(filePath);
          const stats = await fs.stat(filePath);

          // Only add if not already in documents (avoid duplicates)
          if (!documents.some((doc) => doc.fileName === fileName)) {
            documents.push({
              fileName,
              size: stats.size,
              localPath: filePath,
              isLocal: true,
              documentType: 'pdf',
              downloadedAt: stats.birthtime,
              modifiedAt: stats.mtime,
              key: documentKey,
              sourceFolder: 'finalPdfs', // ← CHANGED to camelCase
              isFromFinalPdfs: true // ← ADDED (same as mobile)
            });

            console.log(`[Website Documents] Found ${fileName} in Final PDFs folder: ${(stats.size / 1024).toFixed(1)}KB`);
          }
        } catch {
          // File doesn't exist, continue
        }
      }

      return {
        success: true,
        documents: documents.sort((a, b) => b.downloadedAt - a.downloadedAt)
      };
    } catch (error) {
      console.error('Error listing website documents:', error);
      return {
        success: false,
        error: error.message,
        documents: []
      };
    }
  }

  // Extract document type from filename
  extractDocumentType(fileName) {
    const types = ['Insurance', 'Invoice', 'Form22', 'Disclaimer', 'Form21', 'Form20-1', 'Form20-2', 'Form20-3'];

    for (const type of types) {
      if (fileName.includes(type)) {
        return type.toLowerCase().replace('-', '');
      }
    }

    return 'unknown';
  }

  // Create window menu with navigation controls
  createWindowMenu(window) {
    const template = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Save Current Page',
            accelerator: 'Ctrl+S',
            click: () => {
              const currentUrl = window.webContents.getURL();
              if (currentUrl.toLowerCase().endsWith('.pdf')) {
                // If it's a PDF, download it
                window.webContents.downloadURL(currentUrl);
              } else {
                // For regular pages, save as PDF
                const { dialog } = require('electron');
                dialog.showMessageBox(window, {
                  type: 'info',
                  title: 'Save Page',
                  message: 'This will download any PDFs on the current page.',
                  buttons: ['OK']
                });
              }
            }
          },
          {
            label: 'Open Downloads Folder',
            click: async () => {
              if (this.downloadConfig) {
                const { showroomName, ownerName, ownerContact } = this.downloadConfig;
                await this.openWebsiteFolder(showroomName, ownerName, ownerContact);
              }
            }
          },
          { type: 'separator' },
          {
            label: 'Close',
            accelerator: 'Ctrl+W',
            click: () => window.close()
          }
        ]
      },
      {
        label: '◀',
        accelerator: 'Alt+Left',
        click: () => {
          if (window.webContents.canGoBack()) {
            window.webContents.goBack();
          }
        }
      },
      {
        label: '▶',
        accelerator: 'Alt+Right',
        click: () => {
          if (window.webContents.canGoForward()) {
            window.webContents.goForward();
          }
        }
      },
      {
        label: '🔄',
        accelerator: 'F5',
        click: () => window.webContents.reload()
      },
      {
        label: '📁',
        click: async () => {
          if (this.downloadConfig) {
            const { showroomName, ownerName, ownerContact } = this.downloadConfig;
            await this.openWebsiteFolder(showroomName, ownerName, ownerContact);
          }
        }
      },
      {
        label: 'View',
        submenu: [
          {
            label: 'Inject Notification Script',
            accelerator: 'Ctrl+Shift+N',
            click: () => {
              console.log('Manually injecting notification script...');
              window.webContents
                .executeJavaScript(notificationScript)
                .then(() => {
                  console.log('Manual injection successful');
                  const { dialog } = require('electron');
                  dialog.showMessageBox(window, {
                    type: 'info',
                    title: 'Script Injected',
                    message: 'Notification script has been injected. Check the console.',
                    buttons: ['OK']
                  });
                })
                .catch((err) => {
                  console.error('Manual injection failed:', err);
                  const { dialog } = require('electron');
                  dialog.showMessageBox(window, {
                    type: 'error',
                    title: 'Injection Failed',
                    message: 'Failed to inject notification script. Check console for errors.',
                    buttons: ['OK']
                  });
                });
            }
          },
          { type: 'separator' },
          {
            label: 'Zoom In',
            accelerator: 'Ctrl+Plus',
            click: () => {
              const zoom = window.webContents.getZoomFactor();
              window.webContents.setZoomFactor(zoom + 0.1);
            }
          },
          {
            label: 'Zoom Out',
            accelerator: 'Ctrl+-',
            click: () => {
              const zoom = window.webContents.getZoomFactor();
              window.webContents.setZoomFactor(Math.max(0.5, zoom - 0.1));
            }
          },
          {
            label: 'Reset Zoom',
            accelerator: 'Ctrl+0',
            click: () => window.webContents.setZoomFactor(1)
          },
          { type: 'separator' },
          {
            label: 'Toggle Full Screen',
            accelerator: 'F11',
            click: () => {
              window.setFullScreen(!window.isFullScreen());
            }
          },
          { type: 'separator' },
          {
            label: 'Developer Tools',
            accelerator: 'F12',
            click: () => window.webContents.toggleDevTools()
          }
        ]
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'Navigation Shortcuts',
            click: () => {
              const { dialog } = require('electron');
              dialog.showMessageBox(window, {
                type: 'info',
                title: 'Navigation Shortcuts',
                message: 'Keyboard Shortcuts',
                detail:
                  'Alt + ← : Go Back\nAlt + → : Go Forward\nF5 : Reload Page\nCtrl + W : Close Window\nCtrl + Plus : Zoom In\nCtrl + Minus : Zoom Out\nCtrl + 0 : Reset Zoom\nF11 : Full Screen\nF12 : Developer Tools',
                buttons: ['OK']
              });
            }
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    window.setMenu(menu);
  }

  // Close all portal windows
  closeAllWindows() {
    for (const window of this.portalWindows.values()) {
      if (!window.isDestroyed()) {
        window.close();
      }
    }
    this.portalWindows.clear();
  }

  // Open website folder in file explorer
  async openWebsiteFolder(showroomName, ownerName, ownerContact) {
    try {
      const paths = this.getOwnerPaths(showroomName, ownerName, ownerContact);

      // Ensure folder exists
      await this.ensureDirectoryExists(paths.websitePath);

      // Open in file explorer
      await shell.openPath(paths.websitePath);

      return {
        success: true,
        path: paths.websitePath
      };
    } catch (error) {
      console.error('Error opening website folder:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Create singleton instance
const websiteDownloadManager = new WebsiteDownloadManager();

// Register IPC handlers
function registerWebsiteDownloadHandlers(ipcMain, mainWindow) {
  // Open website for document download
  ipcMain.handle('open-website-for-document', async (event, data) => {
    const { documentKey, showroomName, ownerName, ownerContact } = data;
    return await websiteDownloadManager.openWebsiteForDocument(documentKey, {
      showroomName,
      ownerName,
      ownerContact
    });
  });

  // Check if external browser is preferred for a portal
  ipcMain.handle('check-portal-browser-preference', async (event, documentKey) => {
    const portal = websiteDownloadManager.getPortalForDocument(documentKey);
    return {
      preferExternal: portal.preferExternal || false,
      portalName: portal.name
    };
  });

  // Get download statistics
  ipcMain.handle('get-website-download-stats', async () => {
    return websiteDownloadManager.getDownloadStats();
  });

  // List website documents
  ipcMain.handle('list-website-documents', async (event, data) => {
    const { showroomName, ownerName, ownerContact } = data;
    return await websiteDownloadManager.listWebsiteDocuments(showroomName, ownerName, ownerContact);
  });

  // Open website folder
  ipcMain.handle('open-website-folder', async (event, data) => {
    const { showroomName, ownerName, ownerContact } = data;
    return await websiteDownloadManager.openWebsiteFolder(showroomName, ownerName, ownerContact);
  });

  // Close all portal windows
  ipcMain.handle('close-all-portal-windows', async () => {
    websiteDownloadManager.closeAllWindows();
    return { success: true };
  });
}

module.exports = {
  registerWebsiteDownloadHandlers,
  websiteDownloadManager
};
