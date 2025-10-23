// electron/ownerListHandlers.js
const { shell } = require('electron');
const fs = require('fs').promises;
const path = require('path');

function registerOwnerListHandlers(ipcMain) {
  // Get list of owners from the folder structure
  ipcMain.handle('get-owner-list', async (event, basePath) => {
    try {
      const fromMobilesPath = path.join(basePath, '1 FromMobiles');

      // Check if the directory exists
      try {
        await fs.access(fromMobilesPath);
      } catch (error) {
        throw new Error(`Directory not found: ${fromMobilesPath}`);
      }

      // Read all folders in "1 FromMobiles"
      const items = await fs.readdir(fromMobilesPath, { withFileTypes: true });

      // Filter only directories and parse owner info
      const owners = items
        .filter((item) => item.isDirectory())
        .map((item) => {
          const folderName = item.name;
          // Split by underscore to get name and mobile
          const parts = folderName.split('_');

          if (parts.length >= 2) {
            const name = parts[0].trim();
            const mobile = parts[1].trim();
            return {
              name,
              mobile,
              folderName,
              folderPath: path.join(fromMobilesPath, folderName)
            };
          }

          // If format doesn't match, return as is
          return {
            name: folderName,
            mobile: 'N/A',
            folderName,
            folderPath: path.join(fromMobilesPath, folderName)
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically by name

      return {
        success: true,
        owners,
        count: owners.length
      };
    } catch (error) {
      console.error('Error getting owner list:', error);
      return {
        success: false,
        error: error.message,
        owners: []
      };
    }
  });

  // Open owner folder in file explorer
  ipcMain.handle('open-owner-folder', async (event, folderPath) => {
    try {
      // Check if folder exists
      await fs.access(folderPath);

      // Open folder in system file explorer
      await shell.openPath(folderPath);

      return {
        success: true,
        message: 'Folder opened successfully'
      };
    } catch (error) {
      console.error('Error opening folder:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });
}

module.exports = { registerOwnerListHandlers };
