// electron/firebaseDocumentSync.js - Updated for PDF support

const fs = require('fs').promises;
const path = require('path');
const { net } = require('electron');
const crypto = require('crypto');

// Helper function to sanitize folder names
function sanitizeFolderName(name) {
  return name.replace(/[<>:"/\\|?*]/g, '_').trim();
}

// Rename file with proper prefix
function getRenamedFileName(originalFileName) {
  const lowerFileName = originalFileName.toLowerCase();

  // Extract the file extension from original file
  const extMatch = originalFileName.match(/\.(jpg|jpeg|png|pdf)$/i);
  const ext = extMatch ? extMatch[0] : '.jpg'; // Default to .jpg if no match

  if (lowerFileName.includes('aadhaar') || lowerFileName.includes('adhr')) {
    return `adhr${ext}`;
  }
  if (lowerFileName.includes('pan')) {
    return `pan${ext}`;
  }
  if (lowerFileName.includes('form60')) {
    return `form60${ext}`;
  }
  if (lowerFileName.includes('medical')) {
    return `medical${ext}`;
  }
  if (lowerFileName.includes('form20') || (lowerFileName.includes('form') && !lowerFileName.includes('form60'))) {
    return `form20${ext}`;
  }
  if (lowerFileName.includes('chassis') || lowerFileName.includes('chss')) {
    return `chss${ext}`;
  }
  if (lowerFileName.includes('vehicle') || lowerFileName.includes('vhcl')) {
    return `vhcl${ext}`;
  }
  if (lowerFileName.includes('sign')) {
    return 'sign.png';
  }
  if (lowerFileName.includes('other') || lowerFileName.includes('othr')) {
    return `othr${ext}`;
  }
  if (lowerFileName.includes('extra') || lowerFileName.includes('extr')) {
    return `extr${ext}`;
  }

  return originalFileName;
}

// CRITICAL: Calculate hash in the same format as Firebase Storage
async function calculateFileHash(filePath) {
  try {
    const fileBuffer = await fs.readFile(filePath);
    const hash = crypto.createHash('md5');
    hash.update(fileBuffer);
    // IMPORTANT: Firebase Storage uses base64 encoding for MD5
    return hash.digest('base64');
  } catch (error) {
    console.error(`Error calculating hash for ${filePath}:`, error);
    return null;
  }
}

// Download function
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const request = net.request(url);
    const chunks = [];

    request.on('response', (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      response.on('data', (chunk) => {
        chunks.push(chunk);
      });

      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });

      response.on('error', (error) => {
        reject(error);
      });
    });

    request.on('error', (error) => {
      reject(error);
    });

    request.end();
  });
}

function registerFirebaseDocumentSync(ipcMain) {
  ipcMain.handle('sync-owner-documents', async (event, data) => {
    try {
      const { showroomName, owner, options = {} } = data;

      if (!showroomName || !owner) {
        throw new Error('Invalid data: showroomName and owner required');
      }

      const basePath = 'D:/';
      const showroomPath = path.join(basePath, sanitizeFolderName(showroomName));

      const name = owner.name || 'Unknown';
      const contact = owner.contact || '';
      const ownerFolderName = `${sanitizeFolderName(name)}_${contact}`;

      const parentFolder = '1 FromMobiles';
      const fromMobilesPath = path.join(showroomPath, parentFolder);
      const ownerPath = path.join(fromMobilesPath, ownerFolderName);

      const mobileFolderName = 'mobile';
      const mobilePath = path.join(ownerPath, mobileFolderName);
      const websitePath = path.join(ownerPath, 'website');
      const finalPdfsPath = path.join(ownerPath, 'Final PDFs');

      // Create folders
      await fs.mkdir(mobilePath, { recursive: true });
      await fs.mkdir(websitePath, { recursive: true });
      await fs.mkdir(finalPdfsPath, { recursive: true });

      const results = {
        documentsProcessed: 0,
        documentsDownloaded: 0,
        documentsUpdated: 0,
        documentsDeleted: 0,
        documentsSkipped: 0,
        errors: []
      };

      // Log owner metadata if available
      if (owner.modifiedAt) {
        console.log(`[SYNC] Owner modifiedAt: ${owner.modifiedAt}`);
      }
      if (owner.totalDocuments !== undefined) {
        console.log(`[SYNC] Owner total documents: ${owner.totalDocuments}`);
      }

      // Get existing local files
      const localFiles = await fs.readdir(mobilePath).catch(() => []);
      const localFileMap = new Map();

      // Build local file map with hashes
      for (const localFile of localFiles) {
        const localPath = path.join(mobilePath, localFile);
        const hash = await calculateFileHash(localPath);
        const normalizedName = localFile.replace(/\.(jpg|jpeg|png|pdf)$/i, '');
        localFileMap.set(normalizedName, {
          fileName: localFile,
          hash,
          path: localPath
        });
      }

      // Process documents
      const processedFiles = new Set();

      for (const doc of owner.documents || []) {
        // Skip documents not ready for sync
        if (doc.isUploaded === false) {
          console.log(`[SYNC] Skipping ${doc.fileName} - not uploaded`);
          continue;
        }
        if (doc.uploadedStatus === 'pending' || doc.uploadedStatus === 'failed') {
          console.log(`[SYNC] Skipping ${doc.fileName} - status: ${doc.uploadedStatus}`);
          continue;
        }

        const url = doc.url || doc.downloadURL;
        if (!url) {
          console.log(`[SYNC] Skipping ${doc.fileName} - no URL`);
          continue;
        }

        const originalFileName = doc.fileName || `document_${Date.now()}`;
        const renamedFileName = getRenamedFileName(originalFileName);
        const normalizedName = renamedFileName.replace(/\.(jpg|jpeg|png|pdf)$/i, '');
        const filePath = path.join(mobilePath, renamedFileName);

        processedFiles.add(normalizedName);

        try {
          let shouldDownload = true;
          let isUpdate = false;

          // Get server hash (from Firebase Storage metadata)
          const remoteHash = doc.metadata?.md5Hash || doc.contentHash || '';
          const remoteVersion = doc.version || 1;

          // Check if file exists locally
          const localFile = localFileMap.get(normalizedName);

          if (localFile && localFile.hash && remoteHash) {
            // Compare hashes (both should be base64 MD5)
            if (localFile.hash === remoteHash) {
              shouldDownload = false;
              results.documentsSkipped++;
              console.log(`[SYNC] Skipped ${renamedFileName} - hash match`);
              console.log(`  Local MD5: ${localFile.hash}`);
              console.log(`  Remote MD5: ${remoteHash}`);
              console.log(`  Version: ${remoteVersion}`);
            } else {
              isUpdate = true;
              console.log(`[SYNC] Updating ${renamedFileName} - hash mismatch`);
              console.log(`  Local MD5: ${localFile.hash}`);
              console.log(`  Remote MD5: ${remoteHash}`);
              console.log(`  Version: ${remoteVersion}`);
            }
          } else if (localFile) {
            // File exists but no hash to compare
            if (options.forceDownload) {
              isUpdate = true;
              console.log(`[SYNC] Force updating ${renamedFileName}`);
            } else {
              shouldDownload = false;
              results.documentsSkipped++;
              console.log(`[SYNC] Skipped ${renamedFileName} - exists locally, no hash`);
            }
          } else {
            // New file
            console.log(`[SYNC] New file: ${renamedFileName}`);
            if (remoteHash) {
              console.log(`  Remote MD5: ${remoteHash}`);
            }
          }

          if (shouldDownload) {
            console.log(`[SYNC] Downloading: ${originalFileName} → ${renamedFileName}`);
            const fileBuffer = await downloadFile(url);
            await fs.writeFile(filePath, fileBuffer);

            // Verify downloaded file hash
            if (remoteHash) {
              const downloadedHash = await calculateFileHash(filePath);
              if (downloadedHash === remoteHash) {
                console.log(`[SYNC] ✓ Hash verified for ${renamedFileName}`);
              } else {
                console.warn(`[SYNC] ⚠ Hash mismatch after download for ${renamedFileName}`);
                console.warn(`  Expected: ${remoteHash}`);
                console.warn(`  Got: ${downloadedHash}`);
              }
            }

            if (isUpdate) {
              results.documentsUpdated++;
            } else {
              results.documentsDownloaded++;
            }
          }

          results.documentsProcessed++;
        } catch (error) {
          console.error(`[SYNC] Error processing ${originalFileName}:`, error.message);
          results.errors.push({
            document: originalFileName,
            error: error.message
          });
        }
      }

      // Delete files that no longer exist in Firebase
      for (const [normalizedName, localFile] of localFileMap) {
        if (!processedFiles.has(normalizedName)) {
          try {
            await fs.unlink(localFile.path);
            console.log(`[SYNC] Deleted local file: ${localFile.fileName} (not in Firebase)`);
            results.documentsDeleted++;
          } catch (error) {
            console.error(`[SYNC] Error deleting ${localFile.fileName}:`, error);
          }
        }
      }

      console.log(`[SYNC] Complete for ${owner.name}:`, {
        processed: results.documentsProcessed,
        downloaded: results.documentsDownloaded,
        updated: results.documentsUpdated,
        deleted: results.documentsDeleted,
        skipped: results.documentsSkipped,
        errors: results.errors.length
      });

      return {
        success: true,
        ownerPath: mobilePath,
        results: results
      };
    } catch (error) {
      console.error('[SYNC] Error in sync-owner-documents:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Add a hash verification endpoint for debugging
  ipcMain.handle('verify-file-hash', async (event, filePath) => {
    try {
      const hash = await calculateFileHash(filePath);
      const stats = await fs.stat(filePath);
      return {
        success: true,
        hash,
        size: stats.size,
        modified: stats.mtime
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  });
}

module.exports = { registerFirebaseDocumentSync };
