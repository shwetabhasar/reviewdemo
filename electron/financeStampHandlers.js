// electron/financeStampHandlers.js
const fs = require('fs').promises;
const path = require('path');
const { shell } = require('electron');

// Base path - same as owner folders
const BASE_PATH = 'D:/';

// Helper function to sanitize names
function sanitizeName(name) {
  if (!name || typeof name !== 'string') {
    return 'Unknown';
  }
  return name.replace(/[<>:"/\\|?*]/g, '_').trim();
}

// Helper function to ensure directory exists
async function ensureDirectoryExists(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

// Helper function to convert base64 to buffer
function base64ToBuffer(base64String) {
  // Remove data URL prefix if present
  const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

// Register finance stamp handlers
function registerFinanceStampHandlers(ipcMain) {
  // Save finance company stamp
  ipcMain.handle('save-finance-stamp', async (event, data) => {
    try {
      const { companyName, stampData, fileName, isUpdate = false, showroomName } = data;

      if (!companyName || !stampData || !showroomName) {
        return {
          success: false,
          error: 'Company name, stamp data, and showroom name are required'
        };
      }

      // Create path: D:\<ShowroomName>\2 FinanceStamps
      const showroomPath = path.join(BASE_PATH, sanitizeName(showroomName));
      const stampsPath = path.join(showroomPath, '2 FinanceStamps');

      // Ensure directories exist
      await ensureDirectoryExists(stampsPath);

      // Sanitize company name for filename
      const sanitizedCompanyName = sanitizeName(companyName);

      // Create filename - just use company name (no _stamp suffix)
      const extension = path.extname(fileName || 'stamp.png') || '.png';
      const stampFileName = `${sanitizedCompanyName}${extension}`;

      const stampPath = path.join(stampsPath, stampFileName);

      // If updating, try to delete old stamp first
      if (isUpdate) {
        try {
          // Find and delete existing stamps for this company
          const files = await fs.readdir(stampsPath);
          const oldStamps = files.filter((file) => {
            const fileNameWithoutExt = path.basename(file, path.extname(file));
            return fileNameWithoutExt.toLowerCase() === sanitizedCompanyName.toLowerCase();
          });

          for (const oldStamp of oldStamps) {
            await fs.unlink(path.join(stampsPath, oldStamp));
            console.log(`Deleted old stamp: ${oldStamp}`);
          }
        } catch (error) {
          console.warn('Could not delete old stamps:', error);
        }
      }

      // Convert base64 to buffer and save
      const imageBuffer = base64ToBuffer(stampData);
      await fs.writeFile(stampPath, imageBuffer);

      console.log(`Stamp saved successfully: ${stampPath}`);

      return {
        success: true,
        localPath: stampPath,
        fileName: stampFileName
      };
    } catch (error) {
      console.error('Error saving finance stamp:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Open finance stamps folder for a showroom
  ipcMain.handle('open-finance-stamp-folder', async (event, showroomName) => {
    try {
      if (!showroomName) {
        return {
          success: false,
          error: 'Showroom name is required'
        };
      }

      // Create path: D:\<ShowroomName>\2 FinanceStamps
      const showroomPath = path.join(BASE_PATH, sanitizeName(showroomName));
      const stampsPath = path.join(showroomPath, '2 FinanceStamps');

      // Ensure folder exists
      await ensureDirectoryExists(stampsPath);

      // Open in file explorer
      await shell.openPath(stampsPath);

      return {
        success: true,
        path: stampsPath
      };
    } catch (error) {
      console.error('Error opening stamps folder:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Get stamp by company name
  ipcMain.handle('get-finance-stamp', async (event, companyName, showroomName) => {
    try {
      if (!companyName || !showroomName) {
        return {
          success: false,
          error: 'Company name and showroom name are required'
        };
      }

      const sanitizedCompanyName = sanitizeName(companyName);
      const showroomPath = path.join(BASE_PATH, sanitizeName(showroomName));
      const stampsPath = path.join(showroomPath, '2 FinanceStamps');

      // Check if stamps directory exists
      try {
        await fs.access(stampsPath);
      } catch {
        return {
          success: false,
          error: 'Stamps directory does not exist'
        };
      }

      // Find stamp file for this company - look for exact match or with common extensions
      const files = await fs.readdir(stampsPath);

      // Try to find the stamp file - check for exact match or with extensions
      let stampFile = null;
      for (const file of files) {
        const fileNameWithoutExt = path.basename(file, path.extname(file));
        if (fileNameWithoutExt.toLowerCase() === sanitizedCompanyName.toLowerCase()) {
          stampFile = file;
          break;
        }
      }

      if (!stampFile) {
        // Also try looking for the file with common image extensions
        const extensions = ['.png', '.jpg', '.jpeg', '.PNG', '.JPG', '.JPEG'];
        for (const ext of extensions) {
          const possibleFile = sanitizedCompanyName + ext;
          if (files.includes(possibleFile)) {
            stampFile = possibleFile;
            break;
          }
        }
      }

      if (!stampFile) {
        console.log(`Stamp not found for company: ${companyName} in path: ${stampsPath}`);
        console.log('Available files:', files);
        return {
          success: false,
          error: `Stamp not found for company: ${companyName}`
        };
      }

      const stampPath = path.join(stampsPath, stampFile);
      const stampBuffer = await fs.readFile(stampPath);
      const base64 = stampBuffer.toString('base64');
      const extension = path.extname(stampFile).substring(1).toLowerCase();
      const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';

      return {
        success: true,
        stampData: `data:${mimeType};base64,${base64}`,
        localPath: stampPath,
        fileName: stampFile
      };
    } catch (error) {
      console.error('Error getting finance stamp:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Delete finance stamp
  ipcMain.handle('delete-finance-stamp', async (event, companyName, showroomName) => {
    try {
      if (!companyName || !showroomName) {
        return {
          success: false,
          error: 'Company name and showroom name are required'
        };
      }

      const sanitizedCompanyName = sanitizeName(companyName);
      const showroomPath = path.join(BASE_PATH, sanitizeName(showroomName));
      const stampsPath = path.join(showroomPath, '2 FinanceStamps');

      // Find and delete stamp files for this company
      const files = await fs.readdir(stampsPath);
      const stampFiles = files.filter((file) => {
        const fileNameWithoutExt = path.basename(file, path.extname(file));
        return fileNameWithoutExt.toLowerCase() === sanitizedCompanyName.toLowerCase();
      });

      let deletedCount = 0;
      for (const stampFile of stampFiles) {
        try {
          await fs.unlink(path.join(stampsPath, stampFile));
          deletedCount++;
          console.log(`Deleted stamp: ${stampFile}`);
        } catch (error) {
          console.error(`Error deleting stamp ${stampFile}:`, error);
        }
      }

      return {
        success: true,
        deletedCount,
        message: `Deleted ${deletedCount} stamp(s)`
      };
    } catch (error) {
      console.error('Error deleting finance stamp:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // List all finance stamps for a showroom
  ipcMain.handle('list-finance-stamps', async (event, showroomName) => {
    try {
      if (!showroomName) {
        return {
          success: false,
          error: 'Showroom name is required'
        };
      }

      const showroomPath = path.join(BASE_PATH, sanitizeName(showroomName));
      const stampsPath = path.join(showroomPath, '2 FinanceStamps');

      // Check if stamps directory exists
      try {
        await fs.access(stampsPath);
      } catch {
        return {
          success: true,
          stamps: []
        };
      }

      const files = await fs.readdir(stampsPath);
      const stamps = [];

      for (const file of files) {
        const filePath = path.join(stampsPath, file);
        const stats = await fs.stat(filePath);

        // Extract company name from filename (remove extension)
        const companyName = path.basename(file, path.extname(file));

        stamps.push({
          fileName: file,
          companyName,
          path: filePath,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime
        });
      }

      return {
        success: true,
        stamps: stamps.sort((a, b) => b.modifiedAt - a.modifiedAt)
      };
    } catch (error) {
      console.error('Error listing finance stamps:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });
}

module.exports = { registerFinanceStampHandlers };
