// electron/main.js - Cleaned and Modularized
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Import handler modules
const { registerFolderHandlers } = require('./folderHandlers');
const { registerDocumentHandlers } = require('./documentHandlers');
const { registerImageHandlers } = require('./imageHandlers');
const { registerPdfHandlers } = require('./pdfHandlers');

// Import external handler modules
const { registerFirebaseDocumentSync } = require('./firebaseDocumentSync');
const { registerWebsiteDownloadHandlers } = require('./websiteDownloadManager');
const { registerFinanceStampHandlers } = require('./financeStampHandlers');
const { registerPdfMergerHandlers } = require('./pdfMerger');
const { registerPdfPrinterHandlers } = require('./pdfPrinter');
const { registerPdfPageHandlers } = require('./pdfPageExtractor');
const { registerPdfStampHandlers } = require('./pdfStamper');

app.disableHardwareAcceleration();

let mainWindow;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.js');
  console.log('=== Electron Path Debug ===');
  console.log('isDev:', isDev);
  console.log('__dirname:', __dirname);
  console.log('app.getAppPath():', app.getAppPath());
  console.log('Preload path:', preloadPath);
  console.log('Preload exists:', require('fs').existsSync(preloadPath));

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadPath
    },
    icon: path.join(__dirname, '../public/icon.ico')
  });

  // Handle external links - prevent them from opening in Electron window
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    console.log('Window open handler triggered for:', url);
    if (url.startsWith('http://') || url.startsWith('https://')) {
      require('electron').shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Handle navigation attempts to external URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    console.log('Will navigate triggered for:', url);
    const isLocalFile = url.startsWith('file://');
    const isDevServer = isDev && url.startsWith('http://localhost:5173');

    if (!isLocalFile && !isDevServer) {
      event.preventDefault();
      require('electron').shell.openExternal(url);
    }
  });

  // Handle new window attempts
  mainWindow.webContents.on('new-window', (event, url) => {
    console.log('New window attempted for:', url);
    event.preventDefault();
    require('electron').shell.openExternal(url);
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    console.log('Loading index.html from:', indexPath);
    console.log('File exists:', require('fs').existsSync(indexPath));

    const distPath = path.join(__dirname, '..', 'dist');
    console.log('Dist directory path:', distPath);
    console.log('Dist directory exists:', require('fs').existsSync(distPath));

    if (require('fs').existsSync(distPath)) {
      console.log('Files in dist directory:');
      const files = require('fs').readdirSync(distPath);
      files.forEach((file) => {
        console.log('  -', file);
        if (file === 'assets') {
          const assetsPath = path.join(distPath, 'assets');
          const assetFiles = require('fs').readdirSync(assetsPath);
          console.log('  Assets folder contents:');
          assetFiles.forEach((assetFile) => {
            console.log('    -', assetFile);
          });
        }
      });
    }

    mainWindow.loadFile(indexPath, { hash: '/' }).catch((err) => {
      console.error('Failed to load index.html:', err);
      console.error('Looking for file at:', indexPath);

      if (require('fs').existsSync(indexPath)) {
        const htmlContent = require('fs').readFileSync(indexPath, 'utf8');
        console.log('First 500 chars of index.html:', htmlContent.substring(0, 500));
      }

      mainWindow.loadURL(`data:text/html,
        <h1>Error: Could not load application</h1>
        <p>Looking for: ${indexPath}</p>
        <p>Error: ${err.message}</p>
      `);
    });

    mainWindow.webContents.on('did-finish-load', () => {
      console.log('Page loaded successfully');

      mainWindow.webContents.executeJavaScript(`
        console.log('Current URL:', window.location.href);
        console.log('Base URI:', document.baseURI);
        
        document.querySelectorAll('script').forEach((script, index) => {
          if (script.src) {
            console.log('Script src:', script.src);
            if (script.src.startsWith('file://')) {
              console.log('  -> File protocol detected');
            }
          }
        });
        
        document.querySelectorAll('link[rel="stylesheet"]').forEach((link, index) => {
          console.log('Stylesheet href:', link.href);
          if (link.href.startsWith('file://')) {
            console.log('  -> File protocol detected');
          }
        });
      `);
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error('Failed to load resource:');
      console.error('  Error Code:', errorCode);
      console.error('  Description:', errorDescription);
      console.error('  URL:', validatedURL);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle management
app.whenReady().then(() => {
  createWindow();

  // Register modular handlers
  registerFolderHandlers(ipcMain);
  registerDocumentHandlers(ipcMain);
  registerImageHandlers(ipcMain);
  registerPdfHandlers(ipcMain);
  registerPdfPageHandlers(ipcMain);

  // Register external handlers
  registerFirebaseDocumentSync(ipcMain);
  registerPdfStampHandlers(ipcMain, mainWindow);
  registerWebsiteDownloadHandlers(ipcMain, mainWindow);
  registerFinanceStampHandlers(ipcMain);
  registerPdfMergerHandlers(ipcMain);
  registerPdfPrinterHandlers(ipcMain);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Export mainWindow for handlers that need it
module.exports = { getMainWindow: () => mainWindow };
