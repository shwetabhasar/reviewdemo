// electron/handlers/pdfHandlers.js
const fs = require('fs').promises;
const path = require('path');
const { sanitizeFolderName } = require('./folderHandlers');
const {
  compressPDF,
  analyzePDF,
  splitPDF,
  extremeCompression,
  extractImagesFromPDF,
  checkGhostscriptInstalled
} = require('./pdfCompressor');

function registerPdfHandlers(ipcMain) {
  function getPaths(showroomName, ownerName, ownerContact) {
    const basePath = 'D:/';
    const showroomPath = path.join(basePath, sanitizeFolderName(showroomName));
    const parentFolder = '1 FromMobiles';
    const fromMobilesPath = path.join(showroomPath, parentFolder);
    const ownerFolderName = `${sanitizeFolderName(ownerName)}_${ownerContact}`;
    const ownerPath = path.join(fromMobilesPath, ownerFolderName);
    const mobileFolderName = 'mobile';
    const mobilePath = path.join(ownerPath, mobileFolderName);

    return { basePath, showroomPath, fromMobilesPath, ownerPath, mobilePath };
  }

  // - compress-pdf
  ipcMain.handle('compress-pdf', async (event, data) => {
    console.log('[Electron compress-pdf] Handler called with data:', {
      showroomName: data.showroomName,
      fileName: data.fileName,
      filePath: data.filePath ? 'provided' : 'not provided',
      outputFileName: data.outputFileName || 'not provided' // ✅ NEW LOG
    });

    // ✅ CHANGE #1: Added outputFileName to destructuring
    const { showroomName, name, ownerName, contact, ownerContact, fileName, filePath: providedFilePath, outputFileName } = data;

    const actualOwnerName = ownerName || name;
    const actualOwnerContact = ownerContact || contact;

    // If a full file path is provided, use it directly
    if (providedFilePath) {
      try {
        await fs.access(providedFilePath);

        console.log('[Electron] Compressing file:', providedFilePath);

        // First analyze the PDF
        const analysis = await analyzePDF(providedFilePath);
        console.log('[Electron] PDF Analysis:', analysis);

        // If compression ratio needed is too high, return with options
        if (analysis.compressionRatioNeeded > 20) {
          return {
            success: false,
            requiresAction: true,
            analysis: analysis,
            message: 'File too large for direct compression. Choose an option:',
            options: [
              {
                id: 'split',
                label: 'Split PDF into smaller parts',
                description: 'Each part can be compressed separately'
              },
              {
                id: 'extreme',
                label: 'Apply extreme compression',
                description: 'Significant quality loss but smaller size'
              },
              {
                id: 'extract',
                label: 'Extract as images',
                description: 'Convert pages to images and compress'
              }
            ]
          };
        }

        // ========== ALWAYS Save to Final PDFs folder when owner info is available ==========
        let compressedFilePath;
        let compressedFileName;

        if (actualOwnerName && actualOwnerContact) {
          // Save to Final PDFs folder
          const paths = getPaths(showroomName, actualOwnerName, actualOwnerContact);
          const finalPdfsPath = path.join(paths.ownerPath, 'Final PDFs');

          // Ensure Final PDFs folder exists
          await fs.mkdir(finalPdfsPath, { recursive: true });

          // ✅ CHANGE #2: Use outputFileName if provided, otherwise auto-detect
          if (outputFileName) {
            // Use explicit filename from frontend (based on tile clicked)
            compressedFileName = outputFileName;
            console.log('[Electron compress-pdf] Using explicit outputFileName from frontend:', compressedFileName);
          } else {
            // Fallback: Auto-detect from file name (backward compatibility)
            console.log('[Electron compress-pdf] No outputFileName provided, auto-detecting...');
            const originalName = path.basename(providedFilePath, '.pdf').toLowerCase();

            // Map common document types to their final names
            if (originalName.includes('pan')) {
              compressedFileName = 'pan.pdf';
            } else if (originalName.includes('aadhaar') || originalName.includes('adhr')) {
              compressedFileName = 'adhr.pdf';
            } else if (originalName.includes('chassis') || originalName.includes('chss')) {
              compressedFileName = 'chss.pdf';
            } else if (originalName.includes('vehicle') || originalName.includes('vhcl')) {
              compressedFileName = 'vhcl.pdf';
            } else if (originalName.includes('sign')) {
              compressedFileName = 'sign.pdf';
            } else if (originalName.includes('medical')) {
              compressedFileName = 'medical.pdf';
            } else if (originalName.includes('form60')) {
              compressedFileName = 'form60.pdf';
            } else if (originalName.includes('form20')) {
              compressedFileName = 'form20.pdf';
            } else if (originalName.includes('other') || originalName.includes('othr')) {
              compressedFileName = 'othr.pdf';
            } else if (originalName.includes('extra') || originalName.includes('extr')) {
              compressedFileName = 'extr.pdf';
            } else if (originalName.includes('insu') || originalName.includes('insurance')) {
              compressedFileName = 'insu.pdf';
            } else if (originalName.includes('invo') || originalName.includes('invoice')) {
              compressedFileName = 'invo.pdf';
            } else if (originalName.includes('form22') || originalName.includes('fm22')) {
              compressedFileName = 'fm22.pdf';
            } else if (originalName.includes('disc') || originalName.includes('disclaimer')) {
              compressedFileName = 'disc.pdf';
            } else if (originalName.includes('form21') || originalName.includes('fm21')) {
              compressedFileName = 'fm21.pdf';
            } else {
              // Keep original name if no match
              compressedFileName = path.basename(providedFilePath);
            }

            console.log('[Electron compress-pdf] Auto-detected filename:', compressedFileName);
          }

          compressedFilePath = path.join(finalPdfsPath, compressedFileName);
          console.log('[Electron compress-pdf] Saving to Final PDFs:', compressedFilePath);
        } else {
          // Fallback: Save to same directory (when owner info not available)
          const dirPath = path.dirname(providedFilePath);
          const fileNameOnly = path.basename(providedFilePath);
          const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_');
          const fileNameWithoutExt = fileNameOnly.replace(/\.pdf$/i, '');
          compressedFileName = `${fileNameWithoutExt}_compressed_${timestamp}.pdf`;
          compressedFilePath = path.join(dirPath, compressedFileName);
          console.log('[Electron compress-pdf] Saving to same directory:', compressedFilePath);
        }

        console.log('[Electron compress-pdf] Starting compression process...');
        console.log('[Electron compress-pdf] Target size:', 299, 'KB');

        const result = await compressPDF(providedFilePath, compressedFilePath, 299);

        if (result.success) {
          const compressedStats = await fs.stat(compressedFilePath);
          console.log('[Electron compress-pdf] Compressed file created successfully');
          console.log('[Electron compress-pdf] Compressed file size:', (compressedStats.size / 1024).toFixed(2), 'KB');

          return {
            ...result,
            newFileName: compressedFileName,
            newFilePath: compressedFilePath
          };
        }

        return result;
      } catch (error) {
        console.error('[Electron compress-pdf] Exception during compression:', error);
        return {
          success: false,
          error: error.message || 'Unknown compression error'
        };
      }
    }

    // Original logic for mobile folder files
    if (!showroomName || !actualOwnerName || !actualOwnerContact || !fileName) {
      return {
        success: false,
        error: 'Missing required parameters'
      };
    }

    try {
      const paths = getPaths(showroomName, actualOwnerName, actualOwnerContact);
      const filePath = path.join(paths.mobilePath, fileName);

      // Check if file exists
      await fs.access(filePath);

      // First analyze the PDF
      const analysis = await analyzePDF(filePath);

      // If compression ratio needed is too high, return with options
      if (analysis.compressionRatioNeeded > 20) {
        return {
          success: false,
          requiresAction: true,
          analysis: analysis,
          message: 'File too large for direct compression. Choose an option:',
          options: [
            {
              id: 'split',
              label: 'Split PDF into smaller parts',
              description: 'Each part can be compressed separately'
            },
            {
              id: 'extreme',
              label: 'Apply extreme compression',
              description: 'Significant quality loss but smaller size'
            },
            {
              id: 'extract',
              label: 'Extract as images',
              description: 'Convert pages to images and compress'
            }
          ]
        };
      }

      // Continue with normal compression
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_');
      const fileNameWithoutExt = fileName.replace(/\.pdf$/i, '');
      const compressedFileName = `${fileNameWithoutExt}_${timestamp}.pdf`;
      const compressedFilePath = path.join(paths.mobilePath, compressedFileName);

      const result = await compressPDF(filePath, compressedFilePath, 290);

      if (result.success) {
        return {
          ...result,
          newFileName: compressedFileName
        };
      } else if (result.alternativeActions) {
        return {
          ...result,
          requiresAction: true
        };
      }

      return result;
    } catch (error) {
      console.error('Error compressing PDF:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // - split-pdf
  ipcMain.handle('split-pdf', async (event, data) => {
    const { showroomName, ownerName, ownerContact, fileName, pagesPerFile = 1 } = data;

    if (!showroomName || !ownerName || !ownerContact || !fileName) {
      return {
        success: false,
        error: 'Missing required parameters'
      };
    }

    try {
      const paths = getPaths(showroomName, ownerName, ownerContact);
      const filePath = path.join(paths.mobilePath, fileName);

      // Check if file exists
      await fs.access(filePath);

      const result = await splitPDF(filePath, paths.mobilePath, pagesPerFile);

      if (result.success) {
        // Now compress each split file
        const compressedFiles = [];

        for (const splitFile of result.files) {
          const splitFileName = path.basename(splitFile);
          const timestamp = new Date().getTime();
          const compressedName = splitFileName.replace('.pdf', `_compressed_${timestamp}.pdf`);
          const compressedPath = path.join(paths.mobilePath, compressedName);

          const compressResult = await compressPDF(splitFile, compressedPath, 290);

          if (compressResult.success) {
            compressedFiles.push({
              original: splitFile,
              compressed: compressedPath,
              size: compressResult.compressedSize
            });
          }
        }

        return {
          success: true,
          splitFiles: result.files,
          compressedFiles: compressedFiles,
          totalPages: result.pageCount
        };
      }

      return result;
    } catch (error) {
      console.error('Error splitting PDF:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // - extreme-compress-pdf
  ipcMain.handle('extreme-compress-pdf', async (event, data) => {
    const { showroomName, ownerName, ownerContact, fileName } = data;

    if (!showroomName || !ownerName || !ownerContact || !fileName) {
      return {
        success: false,
        error: 'Missing required parameters'
      };
    }

    try {
      const paths = getPaths(showroomName, ownerName, ownerContact);
      const filePath = path.join(paths.mobilePath, fileName);

      // Check if file exists
      await fs.access(filePath);

      const timestamp = new Date().getTime();
      const compressedFileName = fileName.replace('.pdf', `_extreme_${timestamp}.pdf`);
      const compressedPath = path.join(paths.mobilePath, compressedFileName);

      const result = await extremeCompression(filePath, compressedPath);

      if (result.success) {
        const stats = await fs.stat(compressedPath);
        return {
          success: true,
          newFileName: compressedFileName,
          size: stats.size,
          sizeKB: (stats.size / 1024).toFixed(1),
          warning: 'Extreme compression applied. Quality is significantly reduced.'
        };
      }

      return result;
    } catch (error) {
      console.error('Error in extreme compression:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // - extract-pdf-images
  ipcMain.handle('extract-pdf-images', async (event, data) => {
    const { showroomName, ownerName, ownerContact, fileName } = data;

    if (!showroomName || !ownerName || !ownerContact || !fileName) {
      return {
        success: false,
        error: 'Missing required parameters'
      };
    }

    try {
      const paths = getPaths(showroomName, ownerName, ownerContact);
      const filePath = path.join(paths.mobilePath, fileName);

      // Check if file exists
      await fs.access(filePath);

      const result = await extractImagesFromPDF(filePath, paths.mobilePath);

      return result;
    } catch (error) {
      console.error('Error extracting images:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // - convert-pdf-to-jpeg
  ipcMain.handle('convert-pdf-to-jpeg', async (_event, data) => {
    try {
      const { pdfPath, jpegPath, quality = 100, dpi = 300 } = data;

      if (!pdfPath || !jpegPath) {
        return {
          success: false,
          error: 'PDF path and JPEG path are required'
        };
      }

      const sharp = require('sharp');
      const pdfPoppler = require('pdf-poppler');
      const path = require('path');
      const os = require('os');

      // Check if PDF exists
      await fs.access(pdfPath);

      // Create temp directory for conversion
      const tempDir = path.join(os.tmpdir(), 'pdf-to-jpeg-' + Date.now());
      await fs.mkdir(tempDir, { recursive: true });

      try {
        console.log(`[PDF to JPEG] Converting ${pdfPath} to ${jpegPath}`);

        // Convert PDF to PNG first using pdf-poppler
        const opts = {
          format: 'png',
          out_dir: tempDir,
          out_prefix: 'page',
          page: null, // Convert all pages (in this case, just one since it's extracted)
          scale: 2048, // High resolution
          r: dpi // DPI setting
        };

        await pdfPoppler.convert(pdfPath, opts);

        // Find the generated PNG file
        const files = await fs.readdir(tempDir);
        const pngFile = files.find((f) => f.endsWith('.png'));

        if (!pngFile) {
          throw new Error('Failed to convert PDF to PNG');
        }

        const pngPath = path.join(tempDir, pngFile);

        // Ensure target directory exists
        const jpegDir = path.dirname(jpegPath);
        await fs.mkdir(jpegDir, { recursive: true });

        // Convert PNG to high-quality JPEG
        await sharp(pngPath)
          .jpeg({
            quality: quality,
            mozjpeg: true, // Use mozjpeg encoder for better quality
            chromaSubsampling: '4:4:4' // Preserve all color information
          })
          .toFile(jpegPath);

        // Get JPEG file info
        const jpegStats = await fs.stat(jpegPath);

        console.log(`[PDF to JPEG] Successfully created: ${jpegPath} (${(jpegStats.size / 1024).toFixed(1)}KB)`);

        // Clean up temp files
        try {
          await fs.unlink(pngPath);
          await fs.rmdir(tempDir);
        } catch (cleanupError) {
          console.log('[PDF to JPEG] Cleanup error (non-critical):', cleanupError.message);
        }

        return {
          success: true,
          jpegPath: jpegPath,
          jpegSize: jpegStats.size,
          jpegSizeKB: (jpegStats.size / 1024).toFixed(1)
        };
      } catch (conversionError) {
        // Clean up on error
        try {
          const files = await fs.readdir(tempDir);
          for (const file of files) {
            await fs.unlink(path.join(tempDir, file));
          }
          await fs.rmdir(tempDir);
        } catch (cleanupError) {
          // Ignore cleanup errors
        }

        throw conversionError;
      }
    } catch (error) {
      console.error('[PDF to JPEG] Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to convert PDF to JPEG'
      };
    }
  });

  // - check-compression-capabilities
  ipcMain.handle('check-compression-capabilities', async () => {
    try {
      const hasGhostscript = await checkGhostscriptInstalled();

      return {
        success: true,
        capabilities: {
          ghostscript: hasGhostscript,
          pdfLib: true,
          recommended: hasGhostscript ? 'ghostscript' : 'pdf-lib'
        }
      };
    } catch (error) {
      console.error('Error checking compression capabilities:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });
}

module.exports = { registerPdfHandlers };
