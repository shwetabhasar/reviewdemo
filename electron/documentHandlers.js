const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { sanitizeFolderName } = require('./folderHandlers'); // Import from folderHandlers
const { shell } = require('electron');

function getBaseDocumentType(fileName) {
  const lowerName = fileName.toLowerCase();

  // Remove extension
  const nameWithoutExt = lowerName.replace(/\.(jpg|jpeg|png|pdf)$/i, '');

  // Check for standard document types
  if (nameWithoutExt === 'adhr' || nameWithoutExt.includes('aadhaar') || nameWithoutExt.includes('adhr')) return 'adhr';
  if (nameWithoutExt === 'pan' || nameWithoutExt.includes('pan')) return 'pan';
  if (nameWithoutExt === 'form60' || nameWithoutExt.includes('form60')) return 'form60';
  if (nameWithoutExt === 'medical' || nameWithoutExt.includes('medical')) return 'medical';
  if (
    nameWithoutExt === 'form20' ||
    (nameWithoutExt.includes('form') && !nameWithoutExt.includes('form60')) ||
    nameWithoutExt.includes('fm20')
  )
    return 'form20';
  if (nameWithoutExt === 'chss' || nameWithoutExt.includes('chassis') || nameWithoutExt.includes('chss')) return 'chss';
  if (nameWithoutExt === 'vhcl' || nameWithoutExt.includes('vehicle') || nameWithoutExt.includes('vhcl')) return 'vhcl';
  if (nameWithoutExt === 'sign' || nameWithoutExt.includes('sign')) return 'sign';
  if (nameWithoutExt === 'othr' || nameWithoutExt.includes('other') || nameWithoutExt.includes('othr')) return 'othr';
  if (nameWithoutExt === 'extr' || nameWithoutExt.includes('extra') || nameWithoutExt.includes('extr')) return 'extr';

  return null; // Unknown document type
}

async function calculateFileHash(filePath) {
  const fileBuffer = await fs.readFile(filePath);
  const hash = crypto.createHash('md5');
  hash.update(fileBuffer);
  return hash.digest('base64'); // Returns base64 like Firebase
}

function registerDocumentHandlers(ipcMain) {
  // Updated list-local-documents handler for main.js
  ipcMain.handle('list-local-documents', async (event, data) => {
    console.log('[LEGACY] list-local-documents called - redirecting to sync handler');
    return ipcMain.handle('list-local-documents-for-sync', event, data);
  });

  ipcMain.handle('list-document-status', async (event, data) => {
    const { showroomName, ownerName, ownerContact } = data;

    if (!showroomName || !ownerName || !ownerContact) {
      return {
        success: false,
        error: 'Missing required fields',
        status: 'pending',
        details: {}
      };
    }

    try {
      const basePath = 'D:/';
      const showroomPath = path.join(basePath, sanitizeFolderName(showroomName));
      const ownerFolderName = `${sanitizeFolderName(ownerName)}_${ownerContact}`;

      let ownerPath;
      let mobilePath;

      const fromMobilesPath = path.join(showroomPath, '1 FromMobiles');
      ownerPath = path.join(fromMobilesPath, ownerFolderName);
      mobilePath = path.join(ownerPath, 'mobile');

      const finalPdfsPath = path.join(ownerPath, 'Final PDFs');

      // Get JPG files from mobile folder
      const jpgFiles = [];
      try {
        await fs.access(mobilePath);
        const mobileFiles = await fs.readdir(mobilePath);

        for (const fileName of mobileFiles) {
          const ext = fileName.toLowerCase();
          if (ext.endsWith('.jpg') || ext.endsWith('.jpeg')) {
            // Normalize the filename to get the base type
            const baseType = getBaseDocumentType(fileName);
            if (baseType) {
              jpgFiles.push(baseType);
            }
          }
        }
      } catch {
        console.log(`[Status Check] ${'mobile'} folder does not exist`);
      }

      // Get PDF files from Final PDFs folder
      const pdfFiles = [];
      try {
        await fs.access(finalPdfsPath);
        const finalPdfFiles = await fs.readdir(finalPdfsPath);

        for (const fileName of finalPdfFiles) {
          if (fileName.toLowerCase().endsWith('.pdf')) {
            // Normalize the filename to get the base type
            const baseType = getBaseDocumentType(fileName);
            if (baseType) {
              pdfFiles.push(baseType);
            }
          }
        }
      } catch {
        console.log('[Status Check] Final PDFs folder does not exist');
      }

      // Check if all JPG files have corresponding PDFs
      const missingPdfs = jpgFiles.filter((jpg) => !pdfFiles.includes(jpg));
      const isCompleted = jpgFiles.length > 0 && missingPdfs.length === 0;

      console.log(
        `[Status Check] ${ownerName}: JPGs: ${jpgFiles.join(', ')}, PDFs: ${pdfFiles.join(', ')}, Missing: ${missingPdfs.join(', ')}`
      );

      return {
        success: true,
        status: isCompleted ? 'completed' : 'pending',
        details: {
          jpgCount: jpgFiles.length,
          pdfCount: pdfFiles.length,
          jpgFiles: jpgFiles,
          pdfFiles: pdfFiles,
          missingPdfs: missingPdfs
        }
      };
    } catch (error) {
      console.error('[Status Check] Error:', error);
      return {
        success: false,
        error: error.message,
        status: 'pending',
        details: {}
      };
    }
  });

  ipcMain.handle('list-local-documents-for-sync', async (event, data) => {
    console.log('[SYNC] Checking local documents for sync');
    const { showroomName, name, ownerName, contact, ownerContact } = data;
    const actualOwnerName = ownerName || name;
    const actualOwnerContact = ownerContact || contact;

    if (!showroomName || !actualOwnerName || !actualOwnerContact) {
      return {
        success: false,
        error: 'Missing required fields',
        documents: []
      };
    }

    try {
      const basePath = 'D:/';
      const showroomPath = path.join(basePath, sanitizeFolderName(showroomName));
      const ownerFolderName = `${sanitizeFolderName(actualOwnerName)}_${actualOwnerContact}`;

      let ownerPath;
      let mobilePath;

      const fromMobilesPath = path.join(showroomPath, '1 FromMobiles');
      ownerPath = path.join(fromMobilesPath, ownerFolderName);
      mobilePath = path.join(ownerPath, 'mobile');

      // Check if mobile folder exists
      try {
        await fs.access(mobilePath);
      } catch {
        return {
          success: true,
          documents: []
        };
      }

      // Read ONLY the mobile folder
      const files = await fs.readdir(mobilePath);
      const documents = [];

      for (const fileName of files) {
        // Only process image files
        const ext = fileName.toLowerCase();
        if (!ext.endsWith('.jpg') && !ext.endsWith('.jpeg') && !ext.endsWith('.png') && !ext.endsWith('.pdf')) {
          continue;
        }

        const filePath = path.join(mobilePath, fileName);

        try {
          const stats = await fs.stat(filePath);

          if (!stats.isFile()) {
            continue;
          }

          // Calculate hash for sync comparison
          const contentHash = await calculateFileHash(filePath);

          documents.push({
            fileName: fileName,
            size: stats.size,
            localPath: filePath,
            isLocal: true,
            isFromFinalPdfs: false,
            documentType: ext.replace('.', ''),
            contentHash: contentHash,
            hash: contentHash,
            fileSize: stats.size,
            modifiedAt: stats.mtime
          });
        } catch (error) {
          console.error(`[SYNC] Error processing ${fileName}:`, error);
        }
      }

      console.log(`[SYNC] Found ${documents.length} images in 'mobile'} folder`);

      return {
        success: true,
        documents: documents
      };
    } catch (error) {
      console.error('[SYNC] Error:', error);
      return {
        success: false,
        error: error.message,
        documents: []
      };
    }
  });

  ipcMain.handle('list-local-documents-for-display', async (event, data) => {
    console.log('[DISPLAY] Getting documents for owner view');

    const { showroomName, name, ownerName, contact, ownerContact } = data;
    const actualOwnerName = ownerName || name;
    const actualOwnerContact = ownerContact || contact;

    if (!showroomName || !actualOwnerName || !actualOwnerContact) {
      return {
        success: false,
        error: 'Missing required fields',
        documents: []
      };
    }

    try {
      const basePath = 'D:/';
      const showroomPath = path.join(basePath, sanitizeFolderName(showroomName));
      const ownerFolderName = `${sanitizeFolderName(actualOwnerName)}_${actualOwnerContact}`;

      let ownerPath;
      let mobilePath;

      const fromMobilesPath = path.join(showroomPath, '1 FromMobiles');
      ownerPath = path.join(fromMobilesPath, ownerFolderName);
      mobilePath = path.join(ownerPath, 'mobile');

      const finalPdfsPath = path.join(ownerPath, 'Final PDFs');
      const websitePath = path.join(ownerPath, 'website');
      const allDocuments = [];

      // Check mobile folder for images
      try {
        await fs.access(mobilePath);
        const mobileFiles = await fs.readdir(mobilePath);

        for (const fileName of mobileFiles) {
          const ext = fileName.toLowerCase();
          if (!ext.endsWith('.jpg') && !ext.endsWith('.jpeg') && !ext.endsWith('.png') && !ext.endsWith('.pdf')) {
            continue;
          }

          const filePath = path.join(mobilePath, fileName);

          try {
            const stats = await fs.stat(filePath);

            if (stats.isFile()) {
              allDocuments.push({
                fileName: fileName,
                size: stats.size,
                localPath: filePath,
                isLocal: true,
                isFromFinalPdfs: false,
                documentType: ext.replace('.', ''),
                fileSize: stats.size,
                modifiedAt: stats.mtime
              });
            }
          } catch (error) {
            console.error(`[DISPLAY] Error processing ${fileName}:`, error);
          }
        }
      } catch {
        console.log(`[DISPLAY] mobile folder does not exist`);
      }

      // Check Final PDFs folder
      try {
        await fs.access(finalPdfsPath);
        const pdfFiles = await fs.readdir(finalPdfsPath);

        for (const fileName of pdfFiles) {
          if (!fileName.toLowerCase().endsWith('.pdf')) {
            continue;
          }

          const filePath = path.join(finalPdfsPath, fileName);

          try {
            const stats = await fs.stat(filePath);

            if (stats.isFile()) {
              // Special handling for fm20.pdf - display it as form20.pdf
              let displayFileName = fileName;
              if (fileName.toLowerCase() === 'fm20.pdf') {
                displayFileName = 'form20.pdf';
                console.log('[DISPLAY] Found merged fm20.pdf in Final PDFs, displaying as form20.pdf');
              }

              allDocuments.push({
                fileName: displayFileName,
                size: stats.size,
                localPath: filePath,
                isLocal: true,
                isFromFinalPdfs: true,
                documentType: 'pdf',
                fileSize: stats.size,
                modifiedAt: stats.mtime,
                actualFileName: fileName // Keep track of actual file name
              });
            }
          } catch (error) {
            console.error(`[DISPLAY] Error processing PDF ${fileName}:`, error);
          }
        }
      } catch {
        console.log('[DISPLAY] Final PDFs folder does not exist');
      }

      // Check if fm20.pdf exists in Final PDFs
      const hasFm20InFinalPdfs = allDocuments.some(
        (doc) => doc.actualFileName && doc.actualFileName.toLowerCase() === 'fm20.pdf' && doc.isFromFinalPdfs
      );

      // Only check website folder for Form 20-3 if fm20.pdf doesn't exist in Final PDFs
      if (!hasFm20InFinalPdfs) {
        try {
          await fs.access(websitePath);
          const websiteFiles = await fs.readdir(websitePath);

          for (const fileName of websiteFiles) {
            // Check for Form 20-3 PDF in website folder
            if (fileName === '203.pdf' || fileName === 'Form 20-3.pdf') {
              const filePath = path.join(websitePath, fileName);

              try {
                const stats = await fs.stat(filePath);

                if (stats.isFile()) {
                  allDocuments.push({
                    fileName: 'form20.pdf', // Display as form20.pdf
                    size: stats.size,
                    localPath: filePath,
                    isLocal: true,
                    isFromFinalPdfs: true, // Treat as final PDF for display purposes
                    documentType: 'pdf',
                    fileSize: stats.size,
                    modifiedAt: stats.mtime,
                    actualLocation: 'website' // Track actual location for debugging
                  });

                  console.log(`[DISPLAY] No fm20.pdf found, using Form 20-3 from website folder: ${fileName}`);
                  break; // Only add once
                }
              } catch (error) {
                console.error(`[DISPLAY] Error processing website Form 20:`, error);
              }
            }
          }
        } catch {
          console.log('[DISPLAY] Website folder does not exist');
        }
      }

      const entityType = 'Owner';
      console.log(`[DISPLAY] ${entityType}: Found ${allDocuments.length} total documents`);
      console.log(`[DISPLAY] Images: ${allDocuments.filter((d) => !d.isFromFinalPdfs).length}`);
      console.log(`[DISPLAY] PDFs: ${allDocuments.filter((d) => d.isFromFinalPdfs).length}`);

      // Log Form 20 status
      const form20Doc = allDocuments.find((d) => d.fileName.toLowerCase() === 'form20.pdf');
      if (form20Doc) {
        const source = form20Doc.actualFileName === 'fm20.pdf' ? 'Final PDFs (merged)' : form20Doc.actualLocation || 'Final PDFs';
        console.log(`[DISPLAY] Form 20 PDF source: ${source}`);
      }

      return {
        success: true,
        documents: allDocuments
      };
    } catch (error) {
      console.error('[DISPLAY] Error:', error);
      return {
        success: false,
        error: error.message,
        documents: []
      };
    }
  });

  // - open-website-document
  ipcMain.handle('open-website-document', async (event, data) => {
    const { websiteFolderPath, possibleFileNames, documentKey } = data;

    try {
      // Check each possible filename
      for (const fileName of possibleFileNames) {
        const filePath = path.join(websiteFolderPath, fileName);

        try {
          await fs.access(filePath);
          // File exists, open it
          const result = await shell.openPath(filePath);

          if (result) {
            // If result is not empty string, there was an error
            console.error(`Error opening ${fileName}:`, result);
            continue; // Try next filename
          }

          console.log(`Successfully opened: ${filePath}`);
          return {
            success: true,
            fileName,
            path: filePath
          };
        } catch (error) {
          // File doesn't exist, continue to next filename
          continue;
        }
      }

      // No file found
      return {
        success: false,
        error: `${documentKey} document not found.}`
      };
    } catch (error) {
      console.error('Error opening website document:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // - get-website-document-url
  ipcMain.handle('get-website-document-url', async (event, data) => {
    const { websiteFolderPath, possibleFileNames, documentKey } = data;

    try {
      // Check each possible filename
      for (const fileName of possibleFileNames) {
        const filePath = path.join(websiteFolderPath, fileName);

        try {
          await fs.access(filePath);
          // File exists, read it and return as data URL
          const fileBuffer = await fs.readFile(filePath);
          const base64 = fileBuffer.toString('base64');

          console.log(`Successfully loaded: ${filePath}`);
          return {
            success: true,
            dataUrl: `data:application/pdf;base64,${base64}`,
            fileName,
            path: filePath
          };
        } catch (error) {
          // File doesn't exist, continue to next filename
          continue;
        }
      }

      // No file found
      return {
        success: false,
        error: `${documentKey} document not found.}`
      };
    } catch (error) {
      console.error('Error getting website document URL:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // - get-local-file-info
  ipcMain.handle('get-local-file-info', async (event, filePath) => {
    try {
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('Invalid file path');
      }

      // Check if file exists
      await fs.access(filePath);

      // Get file stats
      const stats = await fs.stat(filePath);

      return {
        success: true,
        size: stats.size,
        fileName: path.basename(filePath),
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        modifiedTime: stats.mtime,
        createdTime: stats.birthtime
      };
    } catch (error) {
      console.error('Error getting file info:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Handler to get local PDF as base64 for viewing
  ipcMain.handle('get-local-file-url', async (event, filePath) => {
    try {
      // Validate file path
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('Invalid file path');
      }

      // Check if file exists
      await fs.access(filePath);

      const fileBuffer = await fs.readFile(filePath);
      const base64 = fileBuffer.toString('base64');

      return {
        success: true,
        dataUrl: `data:application/pdf;base64,${base64}`
      };
    } catch (error) {
      console.error('Error reading file:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Handler to delete local file - UPDATED for mobile subfolder
  ipcMain.handle('delete-local-file', async (event, data) => {
    const { showroomName, name, ownerName, contact, ownerContact, fileName } = data;

    // Use the values with fallback
    const actualOwnerName = ownerName || name;
    const actualOwnerContact = ownerContact || contact;

    if (!showroomName || !actualOwnerName || !actualOwnerContact || !fileName) {
      return {
        success: false,
        error: 'Missing required parameters'
      };
    }

    try {
      const basePath = 'D:/';
      const showroomPath = path.join(basePath, sanitizeFolderName(showroomName));
      const ownerFolderName = `${sanitizeFolderName(actualOwnerName)}_${actualOwnerContact}`;

      let ownerPath;
      let mobilePath;

      const fromMobilesPath = path.join(showroomPath, '1 FromMobiles');
      ownerPath = path.join(fromMobilesPath, ownerFolderName);
      mobilePath = path.join(ownerPath, 'mobile');

      const filePath = path.join(mobilePath, fileName);

      // Check if file exists before deleting
      await fs.access(filePath);

      // Delete the file
      await fs.unlink(filePath);

      return {
        success: true,
        message: 'File deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting file:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Update your existing handler - rename it from 'delete-local-file' to 'delete-local-document'
  ipcMain.handle('delete-local-document', async (event, data) => {
    const { showroomName, name, ownerName, contact, ownerContact, fileName } = data;

    // Use the values with fallback
    const actualOwnerName = ownerName || name;
    const actualOwnerContact = ownerContact || contact;

    if (!showroomName || !actualOwnerName || !actualOwnerContact || !fileName) {
      return {
        success: false,
        error: 'Missing required parameters'
      };
    }

    try {
      const basePath = 'D:/';
      const showroomPath = path.join(basePath, sanitizeFolderName(showroomName));
      const ownerFolderName = `${sanitizeFolderName(actualOwnerName)}_${actualOwnerContact}`;

      let ownerPath;
      let mobilePath;

      const fromMobilesPath = path.join(showroomPath, '1 FromMobiles');
      ownerPath = path.join(fromMobilesPath, ownerFolderName);
      mobilePath = path.join(ownerPath, 'mobile');

      const filePath = path.join(mobilePath, fileName);

      // Check if file exists before deleting
      await fs.access(filePath);

      // Delete the file
      await fs.unlink(filePath);

      console.log(`[Electron] Deleted local file: ${filePath}`);

      // ADD THIS: Check if the folder is empty and delete it
      try {
        const remainingFiles = await fs.readdir(mobilePath);

        if (remainingFiles.length === 0) {
          await fs.rmdir(mobilePath);
          console.log(`[Electron] Removed empty 'mobile folder: ${mobilePath}`);

          // Also check if owner folder is empty
          const ownerFiles = await fs.readdir(ownerPath);
          if (ownerFiles.length === 0) {
            await fs.rmdir(ownerPath);
            console.log(`[Electron] Removed empty ${'owner'} folder: ${ownerPath}`);
          }
        }
      } catch (err) {
        // Ignore errors in cleanup
        console.log('Cleanup check error (non-critical):', err.message);
      }

      return {
        success: true,
        message: `Deleted ${fileName}`,
        filePath
      };
    } catch (error) {
      // ADD THIS: Handle file not found gracefully
      if (error.code === 'ENOENT') {
        return {
          success: true,
          message: 'File already removed',
          filePath: ''
        };
      }

      console.error('Error deleting file:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // - get-local-file-data
  ipcMain.handle('get-local-file-data', async (_event, filePath) => {
    try {
      if (!filePath || typeof filePath !== 'string') {
        return {
          success: false,
          error: 'Invalid file path'
        };
      }

      // Check if file exists
      await fs.access(filePath);

      // Read file as buffer
      const fileBuffer = await fs.readFile(filePath);

      // Convert to base64
      const base64Data = fileBuffer.toString('base64');

      return {
        success: true,
        data: base64Data,
        size: fileBuffer.length
      };
    } catch (error) {
      console.error('Error reading file data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // - get-file-stats Handler to get file statistics
  ipcMain.handle('get-file-stats', async (event, filePath) => {
    try {
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('Invalid file path');
      }

      // Check if file exists
      await fs.access(filePath);

      // Get file stats
      const stats = await fs.stat(filePath);

      return {
        success: true,
        size: stats.size,
        fileName: path.basename(filePath),
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        modifiedTime: stats.mtime,
        createdTime: stats.birthtime
      };
    } catch (error) {
      console.error('Error getting file stats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // - get-file-size
  ipcMain.handle('get-file-size', async (event, filePath) => {
    try {
      const fs = require('fs').promises;
      const stats = await fs.stat(filePath);

      return {
        success: true,
        sizeBytes: stats.size,
        sizeKB: (stats.size / 1024).toFixed(1),
        sizeMB: (stats.size / (1024 * 1024)).toFixed(2)
      };
    } catch (error) {
      console.error('Error getting file size:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // - copy-file
  ipcMain.handle('copy-file', async (event, data) => {
    const { sourcePath, destinationPath } = data;

    try {
      const fs = require('fs').promises;
      const path = require('path');

      // Ensure destination directory exists
      const destDir = path.dirname(destinationPath);
      await fs.mkdir(destDir, { recursive: true });

      // Copy the file
      await fs.copyFile(sourcePath, destinationPath);

      // Get the size of the copied file for confirmation
      const stats = await fs.stat(destinationPath);

      console.log(`[File Copy] ${sourcePath} -> ${destinationPath} (${(stats.size / 1024).toFixed(1)}KB)`);

      return {
        success: true,
        destinationPath: destinationPath,
        sizeBytes: stats.size,
        sizeKB: (stats.size / 1024).toFixed(1)
      };
    } catch (error) {
      console.error('Error copying file:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // - delete-file Handler to delete a file by path
  ipcMain.handle('delete-file', async (event, filePath) => {
    if (!filePath) {
      return {
        success: false,
        error: 'File path is required'
      };
    }

    try {
      await fs.unlink(filePath);
      return {
        success: true,
        message: 'File deleted successfully'
      };
    } catch (error) {
      // Ignore if file doesn't exist
      if (error.code === 'ENOENT') {
        return {
          success: true,
          message: 'File already deleted'
        };
      }

      console.error('Error deleting file:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  console.log('Registering process-signature handler...');

  ipcMain.handle('process-signature', async (event, data) => {
    console.log('process-signature called with:', data);

    const {
      inputPath,
      outputFolder,
      deleteOriginal = false,
      createPng = true, // New parameter - whether to create PNG
      createSvg = true, // New parameter - whether to create SVG
      preserveColors = true,
      pngOptions = {},
      svgOptions = {}
    } = data;

    const sharp = require('sharp');
    const fs = require('fs').promises;
    const path = require('path');
    const potrace = require('potrace');

    try {
      // Check if input file exists
      try {
        await fs.access(inputPath);
        console.log('Input file exists:', inputPath);
      } catch (err) {
        console.error('Input file not found:', inputPath);
        return {
          success: false,
          error: `Input file not found: ${inputPath}`
        };
      }

      // Check if output folder exists, create if not
      try {
        await fs.mkdir(outputFolder, { recursive: true });
        console.log('Output folder ready:', outputFolder);
      } catch (err) {
        console.error('Failed to create output folder:', err);
      }

      const signPngPath = path.join(outputFolder, 'sign.png');
      const signSvgPath = path.join(outputFolder, 'sign.svg');

      // Determine input file type
      const inputExt = path.extname(inputPath).toLowerCase();
      const isPngInput = inputExt === '.png';

      let pngStats = null;
      let svgStats = null;

      // Step 1: Handle PNG creation/copying
      if (createPng && !isPngInput) {
        // Only create PNG if input is not already PNG
        console.log('Creating PNG from non-PNG source...');
        try {
          let sharpInstance = sharp(inputPath).resize(400, 200, {
            fit: 'inside',
            withoutEnlargement: true,
            background: { r: 255, g: 255, b: 255, alpha: 0 }
          });

          if (!preserveColors) {
            sharpInstance = sharpInstance.grayscale();
          }

          const pngConfig = preserveColors
            ? {
                compressionLevel: 6,
                quality: pngOptions.quality || 95,
                palette: false,
                colors: pngOptions.colors || 256,
                dither: pngOptions.dither !== undefined ? pngOptions.dither : 1.0
              }
            : {
                compressionLevel: 9,
                palette: true,
                colors: 4
              };

          const pngBuffer = await sharpInstance.png(pngConfig).toBuffer();
          await fs.writeFile(signPngPath, pngBuffer);
          console.log('PNG created with', preserveColors ? 'preserved colors' : 'grayscale', 'size:', pngBuffer.length, 'bytes');

          pngStats = await fs.stat(signPngPath);
        } catch (pngErr) {
          console.error('PNG creation failed:', pngErr);
          throw pngErr;
        }
      } else if (isPngInput) {
        // If input is PNG, just copy it (this is handled in the frontend now)
        console.log('Input is PNG, will be copied by frontend');
        // Check if the PNG was copied successfully
        try {
          pngStats = await fs.stat(signPngPath);
          console.log('PNG file exists at destination:', pngStats.size, 'bytes');
        } catch (err) {
          console.log('PNG not found at destination (expected if copied by frontend)');
        }
      }

      // Step 2: Create SVG (always create if requested)
      if (createSvg) {
        console.log('Creating SVG...');
        try {
          if (preserveColors && svgOptions.preserveOriginalColors) {
            const stats = await sharp(inputPath).stats();
            let dominantColor = '#0000FF';

            if (stats && stats.channels) {
              const channels = stats.channels;
              if (channels.length >= 3) {
                const [r, g, b] = channels.map((ch) => ch.mean || 128);
                if (b > r && b > g) {
                  dominantColor = '#0000FF';
                } else if (r > g && r > b) {
                  dominantColor = '#FF0000';
                } else if (g > r && g > b) {
                  dominantColor = '#00FF00';
                } else {
                  dominantColor = `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
                }
              }
            }

            await new Promise((resolve, reject) => {
              potrace.trace(
                inputPath,
                {
                  color: svgOptions.color || dominantColor,
                  threshold: svgOptions.threshold || 180,
                  turnpolicy: svgOptions.turnpolicy || 'minority',
                  turdsize: svgOptions.turdsize || 4,
                  alphamax: svgOptions.alphamax || 1,
                  optcurve: svgOptions.optcurve !== undefined ? svgOptions.optcurve : true,
                  opttolerance: svgOptions.opttolerance || 0.5
                },
                async (err, svg) => {
                  if (err) {
                    console.error('Potrace error:', err);
                    reject(err);
                  } else {
                    try {
                      if (preserveColors && dominantColor !== '#000000') {
                        svg = svg.replace(/fill="#000000"/g, `fill="${dominantColor}"`);
                        svg = svg.replace(/stroke="#000000"/g, `stroke="${dominantColor}"`);
                      }

                      await fs.writeFile(signSvgPath, svg);
                      console.log('SVG saved with color:', dominantColor, 'length:', svg.length);
                      svgStats = await fs.stat(signSvgPath);
                      resolve();
                    } catch (writeErr) {
                      console.error('SVG write error:', writeErr);
                      reject(writeErr);
                    }
                  }
                }
              );
            });
          } else {
            // Grayscale SVG creation
            await new Promise((resolve, reject) => {
              potrace.trace(
                inputPath,
                {
                  color: '#000000',
                  threshold: 128,
                  turnpolicy: 'minority',
                  turdsize: 4,
                  alphamax: 1,
                  optcurve: true,
                  opttolerance: 0.5
                },
                async (err, svg) => {
                  if (err) {
                    console.error('Potrace error:', err);
                    reject(err);
                  } else {
                    try {
                      await fs.writeFile(signSvgPath, svg);
                      console.log('SVG saved (grayscale), length:', svg.length);
                      svgStats = await fs.stat(signSvgPath);
                      resolve();
                    } catch (writeErr) {
                      console.error('SVG write error:', writeErr);
                      reject(writeErr);
                    }
                  }
                }
              );
            });
          }
        } catch (svgErr) {
          console.error('SVG creation failed:', svgErr);
        }
      }

      // Delete original if requested
      if (deleteOriginal) {
        try {
          await fs.unlink(inputPath);
          console.log('Original file deleted');
        } catch (err) {
          console.log('Could not delete original:', err.message);
        }
      }

      const result = {
        success: true,
        message: 'Signature processed successfully',
        colorPreserved: preserveColors,
        sourceType: inputExt
      };

      if (pngStats) {
        result.png = {
          path: signPngPath,
          sizeKB: (pngStats.size / 1024).toFixed(1),
          sizeBytes: pngStats.size
        };
      }

      if (svgStats) {
        result.svg = {
          path: signSvgPath,
          sizeKB: (svgStats.size / 1024).toFixed(1),
          sizeBytes: svgStats.size
        };
      }

      console.log('Returning result:', result);
      return result;
    } catch (error) {
      console.error('Error processing signature:', error);
      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  });

  // Handler to rename a file
  ipcMain.handle('rename-file', async (event, data) => {
    const { oldPath, newPath } = data;
    const fs = require('fs').promises;

    try {
      // Check if source file exists
      await fs.access(oldPath);

      // Check if target already exists
      try {
        await fs.access(newPath);
        // If file already exists with target name, delete it first
        await fs.unlink(newPath);
      } catch {
        // Target doesn't exist, which is fine
      }

      // Rename the file
      await fs.rename(oldPath, newPath);

      return {
        success: true,
        message: 'File renamed successfully',
        newPath: newPath
      };
    } catch (error) {
      console.error('Error renaming file:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Handler to convert JPG to PNG with color preservation
  ipcMain.handle('convert-jpg-to-png', async (event, data) => {
    const { inputPath, outputPath, deleteOriginal = false, preserveColors = true } = data;
    const sharp = require('sharp');
    const fs = require('fs').promises;

    try {
      // Convert JPG to PNG using sharp with color preservation
      await sharp(inputPath)
        .png({
          quality: preserveColors ? 100 : 95,
          compressionLevel: preserveColors ? 3 : 6, // Less compression for color preservation
          adaptiveFiltering: true,
          palette: false // Don't reduce to palette to preserve colors
        })
        .toFile(outputPath);

      // Delete original if requested
      if (deleteOriginal) {
        try {
          await fs.unlink(inputPath);
        } catch (err) {
          console.log('Could not delete original file:', err.message);
        }
      }

      // Get file size of the PNG
      const stats = await fs.stat(outputPath);

      return {
        success: true,
        message: 'Image converted to PNG successfully',
        outputPath: outputPath,
        sizeBytes: stats.size,
        sizeKB: (stats.size / 1024).toFixed(1),
        colorPreserved: preserveColors
      };
    } catch (error) {
      console.error('Error converting JPG to PNG:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Handler to save a file from base64 data with color preservation
  ipcMain.handle('save-file', async (event, data) => {
    const { filePath, base64Data, preserveColors = true } = data;
    const fs = require('fs').promises;
    const path = require('path');
    const sharp = require('sharp');

    try {
      // Extract base64 content (remove data URL prefix if present)
      let base64Content = base64Data;
      if (base64Data.includes(',')) {
        base64Content = base64Data.split(',')[1];
      }

      // Convert base64 to buffer
      const buffer = Buffer.from(base64Content, 'base64');

      // Ensure directory exists
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });

      // If it's an image and we want to preserve colors, process it
      if (preserveColors && (filePath.endsWith('.png') || filePath.endsWith('.jpg') || filePath.endsWith('.jpeg'))) {
        try {
          // Process with sharp to ensure color preservation
          const processedBuffer = await sharp(buffer)
            .png({
              quality: 100,
              compressionLevel: 3,
              adaptiveFiltering: true,
              palette: false
            })
            .toBuffer();

          await fs.writeFile(filePath, processedBuffer);
        } catch (err) {
          // If sharp fails, save original buffer
          await fs.writeFile(filePath, buffer);
        }
      } else {
        // Write the file directly
        await fs.writeFile(filePath, buffer);
      }

      // Get file stats
      const stats = await fs.stat(filePath);

      return {
        success: true,
        message: 'File saved successfully',
        savedPath: filePath,
        sizeBytes: stats.size,
        sizeKB: (stats.size / 1024).toFixed(1),
        colorPreserved: preserveColors
      };
    } catch (error) {
      console.error('Error saving file:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });
}

module.exports = { registerDocumentHandlers };
