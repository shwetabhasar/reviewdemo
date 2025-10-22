// electron/folderHandlers.js - Converted from TypeScript
const { ipcMain, shell, clipboard } = require('electron');
const fs = require('fs/promises');
const path = require('path');

// Helper function to sanitize folder names
function sanitizeFolderName(name) {
  if (!name || typeof name !== 'string') {
    return 'Unknown';
  }
  return name.replace(/[<>:"/\\|?*]/g, '_').trim();
}

// Register IPC handlers in your main process
function registerFolderHandlers() {
  // Find the create-owner-folders handler and update it:
  ipcMain.handle('create-owner-folders', async (event, data) => {
    try {
      const { showroomName, owners } = data;

      if (!showroomName || !owners || !Array.isArray(owners)) {
        throw new Error('Showroom name and owners array are required');
      }

      const basePath = 'D:/';
      const showroomPath = path.join(basePath, sanitizeFolderName(showroomName));
      const fromMobilesPath = path.join(showroomPath, '1 FromMobiles');

      let createdCount = 0;
      let existingCount = 0;
      const errors = [];

      // Create showroom folder if it doesn't exist
      try {
        await fs.mkdir(fromMobilesPath, { recursive: true });
      } catch (error) {
        console.error('Error creating showroom folder:', error);
      }

      // Create folders for each owner
      for (const owner of owners) {
        const name = owner.name || owner.nameMarathi || 'Unknown';
        const ownerMobile = owner.contact || owner.mobile || '';

        if (!ownerMobile) {
          console.warn(`Skipping owner ${name} - no mobile number`);
          errors.push({
            owner: name,
            error: 'No mobile number provided'
          });
          continue;
        }

        const ownerFolderName = `${sanitizeFolderName(name)}_${ownerMobile}`;
        const ownerPath = path.join(fromMobilesPath, ownerFolderName);
        const mobilePath = path.join(ownerPath, 'mobile');
        const websitePath = path.join(ownerPath, 'website');
        const finalPdfsPath = path.join(ownerPath, 'Final PDFs'); // ADD THIS LINE

        try {
          // Check if all folders exist
          await fs.access(mobilePath);
          await fs.access(websitePath);
          await fs.access(finalPdfsPath); // ADD THIS LINE
          existingCount++;
          console.log(`Folders already exist for: ${name}`);
        } catch {
          // One or more folders don't exist, create them
          try {
            await fs.mkdir(mobilePath, { recursive: true });
            await fs.mkdir(websitePath, { recursive: true });
            await fs.mkdir(finalPdfsPath, { recursive: true }); // ADD THIS LINE
            createdCount++;
            console.log(`Created folders for: ${name}`);
            console.log(`  - Mobile: ${mobilePath}`);
            console.log(`  - Website: ${websitePath}`);
            console.log(`  - Final PDFs: ${finalPdfsPath}`); // ADD THIS LINE
          } catch (error) {
            console.error(`Error creating folders for ${name}:`, error);
            errors.push({
              owner: name,
              error: error.message
            });
          }
        }
      }

      return {
        success: true,
        created: createdCount,
        existing: existingCount,
        total: owners.length,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      console.error('Error in create-owner-folders:', error);
      return {
        success: false,
        message: error.message
      };
    }
  });

  // Update the open-owner-folder handler to support 'finalPdfs' folder type
  ipcMain.handle('open-owner-folder', async (event, data) => {
    try {
      const { showroomName, name, contact, folderType } = data;

      if (!showroomName || !name || !contact) {
        throw new Error('Missing required parameters: showroomName, name, and contact');
      }

      const basePath = 'D:/';
      const showroomPath = path.join(basePath, sanitizeFolderName(showroomName));
      const ownerFolderName = `${sanitizeFolderName(name)}_${contact}`;
      const fromMobilesPath = path.join(showroomPath, '1 FromMobiles');
      const ownerPath = path.join(fromMobilesPath, ownerFolderName);

      let targetPath;

      // If folderType is specified, open that subfolder
      // Otherwise, open the root owner folder
      if (folderType === 'finalPdfs') {
        targetPath = path.join(ownerPath, 'Final PDFs');
      } else if (folderType === 'mobile' || folderType === 'website') {
        targetPath = path.join(ownerPath, folderType);
      } else {
        // No folderType specified - open root owner folder
        targetPath = ownerPath;
      }

      console.log(`Opening folder:`, targetPath);

      // Create folders if they don't exist
      try {
        await fs.access(targetPath);
      } catch {
        await fs.mkdir(targetPath, { recursive: true });
        console.log(`Created folder: ${targetPath}`);
      }

      // Open folder in file explorer
      const result = await shell.openPath(targetPath);

      if (result) {
        throw new Error(result);
      }

      return {
        success: true,
        path: targetPath,
        message: 'Folder opened successfully'
      };
    } catch (error) {
      console.error('Error opening folder:', error);
      return {
        success: false,
        message: error.message
      };
    }
  });

  // Replace the move-owner-folder handler in main.js with this version that doesn't require fs-extra
  ipcMain.handle('move-owner-folder', async (event, data) => {
    const { showroomName, ownerName, ownerContact, moveDate = new Date() } = data;

    if (!showroomName || !ownerName || !ownerContact) {
      return {
        success: false,
        error: 'Missing required parameters'
      };
    }

    try {
      const path = require('path');
      const fs = require('fs').promises;

      // Helper function for recursive copy
      async function copyFolderRecursive(source, target) {
        // Create target directory
        await fs.mkdir(target, { recursive: true });

        // Read source directory
        const entries = await fs.readdir(source, { withFileTypes: true });

        // Copy each entry
        for (const entry of entries) {
          const sourcePath = path.join(source, entry.name);
          const targetPath = path.join(target, entry.name);

          if (entry.isDirectory()) {
            // Recursively copy subdirectory
            await copyFolderRecursive(sourcePath, targetPath);
          } else {
            // Copy file
            await fs.copyFile(sourcePath, targetPath);
          }
        }
      }

      // Helper function to delete folder with retry logic
      async function deleteFolderWithRetry(folderPath, maxRetries = 3) {
        for (let i = 0; i < maxRetries; i++) {
          try {
            await fs.rm(folderPath, { recursive: true, force: true, maxRetries: 3 });
            return { success: true };
          } catch (error) {
            console.log(`Delete attempt ${i + 1} failed:`, error.message);
            if (i < maxRetries - 1) {
              // Wait a bit before retrying
              await new Promise((resolve) => setTimeout(resolve, 1000));
            } else {
              return { success: false, error: error.message };
            }
          }
        }
      }

      // Source folder path
      const basePath = 'D:/';
      const showroomPath = path.join(basePath, sanitizeFolderName(showroomName));
      const fromMobilesPath = path.join(showroomPath, '1 FromMobiles');
      const ownerFolderName = `${sanitizeFolderName(ownerName)}_${ownerContact}`;
      const sourcePath = path.join(fromMobilesPath, ownerFolderName);

      // Check if source folder exists
      try {
        await fs.access(sourcePath);
      } catch {
        return {
          success: false,
          error: 'Owner folder does not exist'
        };
      }

      // Create 3 Previous folder structure
      const previousPath = path.join(showroomPath, '3 Previous');

      // Create 12 month folders from current month
      const currentDate = new Date(moveDate);
      const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December'
      ];

      // Create month folders only for the current move operation
      const moveMonthName = monthNames[currentDate.getMonth()];
      const moveYear = currentDate.getFullYear();
      const moveDay = currentDate.getDate();

      // Create the specific month and day folders needed for this move
      const targetMonthFolder = `${moveMonthName}-${moveYear}`;
      const targetDayFolder = `${moveDay} ${moveMonthName} ${moveYear}`;
      const targetMonthPath = path.join(previousPath, targetMonthFolder);
      const targetDayPath = path.join(targetMonthPath, targetDayFolder);

      // Create the necessary folders
      await fs.mkdir(targetDayPath, { recursive: true });
      console.log(`Created/verified path: ${targetDayPath}`);

      // Final target path
      const targetPath = path.join(targetDayPath, ownerFolderName);

      console.log(`Source: ${sourcePath}`);
      console.log(`Target: ${targetPath}`);

      // Check if target already exists
      try {
        await fs.access(targetPath);
        return {
          success: false,
          error: `Folder already exists in archive: ${targetDayFolder}/${ownerFolderName}`
        };
      } catch {
        // Target doesn't exist, proceed with move
      }

      // Try to move the folder
      let finalMessage = '';

      // First, try direct rename (fastest if on same drive)
      try {
        await fs.rename(sourcePath, targetPath);
        finalMessage = `Successfully moved ${ownerFolderName} to archive`;
        console.log('Direct rename succeeded');
      } catch (renameError) {
        console.log('Direct rename failed, trying copy approach:', renameError.code);

        // If rename fails, copy then delete
        try {
          console.log('Starting folder copy...');

          // Copy the entire folder recursively
          await copyFolderRecursive(sourcePath, targetPath);

          console.log('Copy completed successfully');

          // Verify the copy by checking if target exists and has content
          const targetStats = await fs.stat(targetPath);
          if (!targetStats.isDirectory()) {
            throw new Error('Target is not a directory after copy');
          }

          // Try to delete the source folder
          console.log('Attempting to delete source folder...');
          const deleteResult = await deleteFolderWithRetry(sourcePath);

          if (deleteResult.success) {
            finalMessage = `Successfully moved ${ownerFolderName} to archive`;
            console.log('Source folder deleted successfully');
          } else {
            // Copy succeeded but delete failed
            finalMessage = `Folder copied to archive. Original folder could not be deleted automatically - please delete it manually.`;
            console.log('Warning: Could not delete source folder');

            return {
              success: true,
              message: finalMessage,
              sourcePath,
              targetPath,
              archiveLocation: `3 Previous/${targetMonthFolder}/${targetDayFolder}/${ownerFolderName}`,
              warning: `Please manually delete: ${sourcePath}`
            };
          }
        } catch (copyError) {
          console.error('Copy operation failed:', copyError);

          // Try to clean up partial copy if it exists
          try {
            await fs.rm(targetPath, { recursive: true, force: true });
            console.log('Cleaned up partial copy');
          } catch {
            // Ignore cleanup errors
          }

          return {
            success: false,
            error: `Failed to move folder: ${copyError.message}. Please close all files from this folder and try again.`
          };
        }
      }

      return {
        success: true,
        message: finalMessage,
        sourcePath,
        targetPath,
        archiveLocation: `3 Previous/${targetMonthFolder}/${targetDayFolder}/${ownerFolderName}`
      };
    } catch (error) {
      console.error('Error in move-owner-folder:', error);
      return {
        success: false,
        error: `Operation failed: ${error.message}`
      };
    }
  });

  ipcMain.handle('revert-owner-folder', async (event, data) => {
    const { showroomName, ownerName, ownerContact } = data;

    if (!showroomName || !ownerName || !ownerContact) {
      return {
        success: false,
        error: 'Missing required parameters'
      };
    }

    try {
      const path = require('path');
      const fs = require('fs').promises;

      // Helper function for recursive copy
      async function copyFolderRecursive(source, target) {
        await fs.mkdir(target, { recursive: true });
        const entries = await fs.readdir(source, { withFileTypes: true });

        for (const entry of entries) {
          const sourcePath = path.join(source, entry.name);
          const targetPath = path.join(target, entry.name);

          if (entry.isDirectory()) {
            await copyFolderRecursive(sourcePath, targetPath);
          } else {
            await fs.copyFile(sourcePath, targetPath);
          }
        }
      }

      // Helper function to delete folder with retry logic
      async function deleteFolderWithRetry(folderPath, maxRetries = 5) {
        for (let i = 0; i < maxRetries; i++) {
          try {
            // Force close any file handles by waiting a bit
            await new Promise((resolve) => setTimeout(resolve, 500));

            await fs.rm(folderPath, {
              recursive: true,
              force: true,
              maxRetries: 3,
              retryDelay: 1000
            });

            console.log(`Successfully deleted: ${folderPath}`);
            return { success: true };
          } catch (error) {
            console.log(`Delete attempt ${i + 1}/${maxRetries} failed:`, error.message);

            if (i < maxRetries - 1) {
              // Wait progressively longer between retries
              await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
            } else {
              return {
                success: false,
                error: error.message,
                path: folderPath
              };
            }
          }
        }
      }

      const basePath = 'D:/';
      const showroomPath = path.join(basePath, sanitizeFolderName(showroomName));
      const previousPath = path.join(showroomPath, '3 Previous');
      const fromMobilesPath = path.join(showroomPath, '1 FromMobiles');
      const ownerFolderName = `${sanitizeFolderName(ownerName)}_${ownerContact}`;

      // Search for the folder in the archive
      let sourcePath = null;
      let archiveLocation = null;

      console.log(`Searching for archived folder: ${ownerFolderName}`);

      const monthFolders = await fs.readdir(previousPath, { withFileTypes: true });

      for (const monthFolder of monthFolders) {
        if (!monthFolder.isDirectory()) continue;

        const monthPath = path.join(previousPath, monthFolder.name);
        const dayFolders = await fs.readdir(monthPath, { withFileTypes: true });

        for (const dayFolder of dayFolders) {
          if (!dayFolder.isDirectory()) continue;

          const potentialPath = path.join(monthPath, dayFolder.name, ownerFolderName);

          try {
            await fs.access(potentialPath);
            sourcePath = potentialPath;
            archiveLocation = `3 Previous/${monthFolder.name}/${dayFolder.name}/${ownerFolderName}`;
            console.log(`Found archived folder at: ${sourcePath}`);
            break;
          } catch {
            // Folder doesn't exist here, continue searching
          }
        }

        if (sourcePath) break;
      }

      if (!sourcePath) {
        return {
          success: false,
          error: 'Owner folder not found in archive'
        };
      }

      // Target path in FromMobiles
      const targetPath = path.join(fromMobilesPath, ownerFolderName);

      // Check if target already exists
      try {
        await fs.access(targetPath);
        return {
          success: false,
          error: `Folder already exists in FromMobiles: ${ownerFolderName}`
        };
      } catch {
        // Target doesn't exist, proceed with revert
      }

      let finalMessage = '';
      let deleteSuccessful = false;

      // Try to move the folder back
      try {
        console.log(`Attempting direct rename from ${sourcePath} to ${targetPath}`);
        await fs.rename(sourcePath, targetPath);
        finalMessage = `Successfully reverted ${ownerFolderName} from archive`;
        deleteSuccessful = true;
        console.log('Direct rename succeeded - archived folder automatically removed');
      } catch (renameError) {
        console.log('Direct rename failed, trying copy approach:', renameError.code);

        try {
          console.log('Starting folder copy...');
          await copyFolderRecursive(sourcePath, targetPath);
          console.log('Copy completed successfully');

          // Verify the copy
          const targetStats = await fs.stat(targetPath);
          if (!targetStats.isDirectory()) {
            throw new Error('Target is not a directory after copy');
          }

          console.log('Attempting to delete archived folder...');
          const deleteResult = await deleteFolderWithRetry(sourcePath);

          if (deleteResult.success) {
            finalMessage = `Successfully reverted ${ownerFolderName} from archive`;
            deleteSuccessful = true;
            console.log('Archived folder deleted successfully');
          } else {
            finalMessage = `Folder copied back to FromMobiles. Archived folder could not be deleted automatically.`;

            return {
              success: true,
              message: finalMessage,
              sourcePath,
              targetPath,
              archivedFrom: archiveLocation,
              warning: `Please manually delete: ${sourcePath}`,
              deleteError: deleteResult.error,
              needsManualCleanup: true
            };
          }
        } catch (copyError) {
          console.error('Copy operation failed:', copyError);

          // Clean up partial copy
          try {
            await fs.rm(targetPath, { recursive: true, force: true });
            console.log('Cleaned up partial copy');
          } catch (cleanupError) {
            console.error('Cleanup also failed:', cleanupError);
          }

          return {
            success: false,
            error: `Failed to revert folder: ${copyError.message}. Please close all files and try again.`
          };
        }
      }

      return {
        success: true,
        message: finalMessage,
        sourcePath,
        targetPath,
        archivedFrom: archiveLocation,
        archivedFolderDeleted: deleteSuccessful
      };
    } catch (error) {
      console.error('Error in revert-owner-folder:', error);
      return {
        success: false,
        error: `Operation failed: ${error.message}`
      };
    }
  });

  // Handler for checking if folder exists
  ipcMain.handle('check-folder-exists', async (event, folderPath) => {
    try {
      if (!folderPath || typeof folderPath !== 'string') {
        return false;
      }
      await fs.access(folderPath);
      return true;
    } catch {
      return false;
    }
  });

  // Handler for opening folder
  ipcMain.handle('open-folder', async (event, folderPath) => {
    try {
      await shell.openPath(folderPath);
      return { success: true };
    } catch (error) {
      console.error('Error opening folder:', error);
      return {
        success: false,
        message: `Failed to open folder: ${error.message}`
      };
    }
  });

  // Handler for copying owner folder path to clipboard - UPDATED for website subfolder
  ipcMain.handle('copy-download-path', async (event, data) => {
    const { showroomName, ownerName, ownerContact } = data;

    if (!showroomName || !ownerName || !ownerContact) {
      return {
        success: false,
        error: 'Missing required parameters'
      };
    }

    try {
      const basePath = 'D:/';
      const showroomPath = path.join(basePath, sanitizeFolderName(showroomName));
      const ownerFolderName = `${sanitizeFolderName(ownerName)}_${ownerContact}`;

      let ownerPath;

      const fromMobilesPath = path.join(showroomPath, '1 FromMobiles');
      ownerPath = path.join(fromMobilesPath, ownerFolderName);

      const websitePath = path.join(ownerPath, 'website');

      // Ensure folders exist
      try {
        await fs.access(websitePath);
      } catch {
        await fs.mkdir(websitePath, { recursive: true });
      }

      // Copy website path to clipboard
      clipboard.writeText(websitePath);

      return {
        success: true,
        message: 'Folder path copied to clipboard',
        path: websitePath
      };
    } catch (error) {
      console.error('Error copying path:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  ipcMain.handle('create-folder-if-not-exists', async (event, data) => {
    try {
      const { showroomName, name, contact, folderType = 'website' } = data;

      if (!showroomName || !name || !contact) {
        throw new Error('Missing required parameters: showroomName, name, and contact');
      }

      const basePath = 'D:/';
      const showroomPath = path.join(basePath, sanitizeFolderName(showroomName));
      const ownerFolderName = `${sanitizeFolderName(name)}_${contact}`;

      let ownerPath;

      const fromMobilesPath = path.join(showroomPath, '1 FromMobiles');
      ownerPath = path.join(fromMobilesPath, ownerFolderName);

      let targetPath;
      if (folderType === 'finalPdfs') {
        targetPath = path.join(ownerPath, 'Final PDFs');
      } else if (folderType === 'compressed_files') {
        targetPath = path.join(ownerPath, 'compressed_files');
      } else {
        targetPath = path.join(ownerPath, folderType);
      }

      // Check if folder exists
      try {
        await fs.access(targetPath);
        return {
          success: true,
          existed: true,
          path: targetPath,
          message: 'Folder already exists'
        };
      } catch {
        // Folder doesn't exist, create it
        await fs.mkdir(targetPath, { recursive: true });
        console.log(`Created folder: ${targetPath}`);
        return {
          success: true,
          existed: false,
          path: targetPath,
          message: 'Folder created successfully'
        };
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      return {
        success: false,
        message: error.message
      };
    }
  });

  ipcMain.handle('cleanup-deleted-owner-folders-v2', async (event, data) => {
    const { showroomName, activeOwners } = data;

    if (!showroomName || !activeOwners || !Array.isArray(activeOwners)) {
      return {
        success: false,
        error: 'Invalid parameters: showroomName and activeOwners array required'
      };
    }

    try {
      const basePath = 'D:/';
      const showroomPath = path.join(basePath, sanitizeFolderName(showroomName));
      const fromMobilesPath = path.join(showroomPath, '1 FromMobiles');

      // Check if showroom folder exists
      try {
        await fs.access(fromMobilesPath);
      } catch {
        return {
          success: true,
          message: 'Showroom folder does not exist',
          deletedCount: 0
        };
      }

      // Create a Set of expected folder names for active owners
      const activeFolderNames = new Set();
      activeOwners.forEach((owner) => {
        const folderName = `${sanitizeFolderName(owner.name)}_${owner.contact}`;
        activeFolderNames.add(folderName);
      });

      console.log(`Active owner folders (${activeFolderNames.size}):`, Array.from(activeFolderNames));

      // Get all folders in the showroom directory
      const allFolders = await fs.readdir(fromMobilesPath);
      console.log(`Total folders in FromMobiles: ${allFolders.length}`);

      let deletedCount = 0;
      const deletedFolders = [];
      const errors = [];
      const skippedFolders = [];

      // Process each folder
      for (const folderName of allFolders) {
        const folderPath = path.join(fromMobilesPath, folderName);

        try {
          // Check if it's a directory
          const stats = await fs.stat(folderPath);
          if (!stats.isDirectory()) {
            continue;
          }

          // Check if this folder belongs to an active owner
          if (!activeFolderNames.has(folderName)) {
            // This folder doesn't belong to any active owner - delete it
            console.log(`Deleting orphaned folder: ${folderName}`);

            // Recursively delete the folder and all its contents
            await fs.rm(folderPath, { recursive: true, force: true });

            deletedCount++;
            deletedFolders.push(folderName);
          } else {
            skippedFolders.push(folderName);
          }
        } catch (error) {
          console.error(`Error processing folder ${folderName}:`, error);
          errors.push({
            folder: folderName,
            error: error.message
          });
        }
      }

      console.log(`Cleanup complete: Deleted ${deletedCount} folders, Kept ${skippedFolders.length} folders`);

      return {
        success: true,
        deletedCount,
        deletedFolders,
        skippedCount: skippedFolders.length,
        totalFolders: allFolders.length,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      console.error('Error in cleanup-deleted-owner-folders:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Handler for opening external URLs
  ipcMain.handle('open-external', async (event, url) => {
    console.log('IPC open-external called with URL:', url);
    try {
      await shell.openExternal(url);
      console.log('Successfully opened external URL');
      return { success: true };
    } catch (error) {
      console.error('Error opening external URL:', error);
      return { success: false, error: error.message };
    }
  });
}

// Export the function
module.exports = { registerFolderHandlers, sanitizeFolderName };
