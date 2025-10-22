// electron/pdfMerger.js - Merge Form 20 PDFs from compressed_files folder
const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

/* ------------------------------ Core Merge ------------------------------- */

/**
 * Merge multiple PDFs into a single PDF without compression
 * @param {string[]} pdfPaths
 * @param {string} outputPath
 */
async function mergePDFs(pdfPaths, outputPath) {
  try {
    console.log('[PDF Merger] Starting merge process...');
    console.log('[PDF Merger] Input files:', pdfPaths);
    console.log('[PDF Merger] Output path:', outputPath);

    // Create a new PDF document
    const mergedPdf = await PDFDocument.create();

    // Check inputs exist
    for (const pdfPath of pdfPaths) {
      try {
        await fs.access(pdfPath);
      } catch {
        console.error(`[PDF Merger] File not found: ${pdfPath}`);
        throw new Error(`File not found: ${path.basename(pdfPath)}`);
      }
    }

    // Load and merge
    for (const pdfPath of pdfPaths) {
      try {
        const pdfBytes = await fs.readFile(pdfPath);
        const pdf = await PDFDocument.load(pdfBytes);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach((p) => mergedPdf.addPage(p));
        console.log(`[PDF Merger] Added ${pages.length} pages from ${path.basename(pdfPath)}`);
      } catch (error) {
        console.error(`[PDF Merger] Error loading PDF ${pdfPath}:`, error);
        throw new Error(`Error loading PDF: ${path.basename(pdfPath)}`);
      }
    }

    // Save with default settings (no compression attempts)
    const pdfBytes = await mergedPdf.save();
    const currentSize = pdfBytes.length;
    console.log(`[PDF Merger] Merged size: ${(currentSize / 1024).toFixed(1)}KB`);

    // Save merged file
    await fs.writeFile(outputPath, pdfBytes);

    const finalSize = pdfBytes.length;
    const finalSizeKB = (finalSize / 1024).toFixed(1);

    console.log(`[PDF Merger] Merge complete! Final size: ${finalSizeKB}KB`);
    console.log(`[PDF Merger] Saved to: ${outputPath}`);

    return {
      success: true,
      outputPath,
      size: finalSize,
      sizeKB: parseFloat(finalSizeKB),
      pageCount: mergedPdf.getPageCount(),
      message: `Successfully merged ${pdfPaths.length} PDFs into ${path.basename(outputPath)} (${finalSizeKB}KB)`
    };
  } catch (error) {
    console.error('[PDF Merger] Error during merge:', error);
    return {
      success: false,
      error: error.message || 'Error merging PDFs'
    };
  }
}

/**
 * Check if Form 20 documents exist and can be merged from compressed_files folder
 * @param {string} compressedFilesFolderPath
 */
async function checkForm20Files(compressedFilesFolderPath) {
  const requiredFiles = ['201.pdf', '202.pdf', '203.pdf'];
  const foundFiles = [];
  const missingFiles = [];

  for (const fileName of requiredFiles) {
    const filePath = path.join(compressedFilesFolderPath, fileName);
    try {
      await fs.access(filePath);
      const stats = await fs.stat(filePath);
      foundFiles.push({
        fileName,
        path: filePath,
        size: stats.size,
        sizeKB: (stats.size / 1024).toFixed(1)
      });
      console.log(`[PDF Merger] Found: ${fileName} (${(stats.size / 1024).toFixed(1)}KB)`);
    } catch {
      missingFiles.push(fileName);
      console.log(`[PDF Merger] Missing: ${fileName}`);
    }
  }

  return {
    canMerge: missingFiles.length === 0,
    foundFiles,
    missingFiles,
    totalSizeKB: foundFiles.reduce((sum, file) => sum + file.size / 1024, 0).toFixed(1)
  };
}

function sanitizeFolderName(name) {
  if (!name || typeof name !== 'string') {
    return 'Unknown';
  }
  return name.replace(/[<>:"/\\|?*]/g, '_').trim();
}

function getPaths(showroomName, ownerName, ownerContact) {
  const parentFolder = '1 FromMobiles';
  const basePath = `D:\\${sanitizeFolderName(showroomName)}\\${parentFolder}\\${sanitizeFolderName(ownerName)}_${ownerContact}`;
  const compressedFilesFolderPath = path.join(basePath, 'compressed_files');
  const finalPdfsFolderPath = path.join(basePath, 'Final PDFs');

  return { basePath, compressedFilesFolderPath, finalPdfsFolderPath };
}

/* ------------------------------ IPC Handlers ----------------------------- */

function registerPdfMergerHandlers(ipcMain) {
  // Check readiness for merging (are 201/202/203 present in compressed_files?)
  ipcMain.handle('check-form20-merge-ready', async (event, data) => {
    const { showroomName, ownerName, ownerContact } = data;
    if (!showroomName || !ownerName || !ownerContact) {
      return { success: false, error: 'Missing required parameters' };
    }

    try {
      const paths = getPaths(showroomName, ownerName, ownerContact);
      const checkResult = await checkForm20Files(paths.compressedFilesFolderPath);
      return { success: true, ...checkResult };
    } catch (error) {
      console.error('Error checking Form 20 files:', error);
      return { success: false, error: error.message };
    }
  });

  // Merge 201 + 202 + 203 from compressed_files -> Final PDFs/fm20.pdf (without compression)
  ipcMain.handle('merge-form20-documents', async (event, data) => {
    const { showroomName, ownerName, ownerContact } = data;
    if (!showroomName || !ownerName || !ownerContact) {
      return { success: false, error: 'Missing required parameters' };
    }

    try {
      const paths = getPaths(showroomName, ownerName, ownerContact);

      // Check files in compressed_files folder
      const checkResult = await checkForm20Files(paths.compressedFilesFolderPath);
      if (!checkResult.canMerge) {
        return {
          success: false,
          error: `Missing required files in compressed_files folder: ${checkResult.missingFiles.join(', ')}`,
          missingFiles: checkResult.missingFiles
        };
      }

      await fs.mkdir(paths.finalPdfsFolderPath, { recursive: true });

      const pdfPaths = checkResult.foundFiles.map((f) => f.path);
      const outputPath = path.join(paths.finalPdfsFolderPath, 'fm20.pdf');

      // Backup existing if present
      try {
        await fs.access(outputPath);
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_');
        const backupPath = path.join(paths.finalPdfsFolderPath, `fm20_backup_${timestamp}.pdf`);
        await fs.rename(outputPath, backupPath);
        console.log(`[PDF Merger] Created backup: ${backupPath}`);
      } catch {
        // File doesn't exist, no backup needed
      }

      // Merge without compression
      const mergeResult = await mergePDFs(pdfPaths, outputPath);

      if (mergeResult.success) {
        mergeResult.sourceFilesDeleted = false;
        mergeResult.sourceFilesPath = paths.compressedFilesFolderPath;
        mergeResult.mergedFilePath = outputPath;

        console.log(`[PDF Merger] Form 20 merged successfully from compressed_files folder without compression`);
      }

      return mergeResult;
    } catch (error) {
      console.error('Error merging Form 20 documents:', error);
      return { success: false, error: error.message };
    }
  });

  // Generic merger (for other PDFs if needed)
  ipcMain.handle('merge-pdfs', async (event, data) => {
    const { inputPaths, outputPath } = data;
    if (!inputPaths || !Array.isArray(inputPaths) || inputPaths.length === 0 || !outputPath) {
      return { success: false, error: 'Invalid parameters: inputPaths array and outputPath are required' };
    }
    try {
      return await mergePDFs(inputPaths, outputPath);
    } catch (error) {
      console.error('Error in merge-pdfs handler:', error);
      return { success: false, error: error.message };
    }
  });

  // Check if merged fm20.pdf exists in Final PDFs
  ipcMain.handle('check-merged-form20-exists', async (event, data) => {
    const { showroomName, ownerName, ownerContact } = data;
    if (!showroomName || !ownerName || !ownerContact) {
      return { success: false, error: 'Missing required parameters' };
    }

    try {
      const paths = getPaths(showroomName, ownerName, ownerContact);
      const mergedFilePath = path.join(paths.finalPdfsFolderPath, 'fm20.pdf');

      try {
        const stats = await fs.stat(mergedFilePath);
        return {
          success: true,
          exists: true,
          path: mergedFilePath,
          size: stats.size,
          sizeKB: (stats.size / 1024).toFixed(1)
        };
      } catch {
        return { success: true, exists: false };
      }
    } catch (error) {
      console.error('Error checking merged file:', error);
      return { success: false, error: error.message };
    }
  });
}

/* -------------------------------- Exports -------------------------------- */

module.exports = {
  mergePDFs,
  checkForm20Files,
  registerPdfMergerHandlers
};
