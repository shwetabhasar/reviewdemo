// electron/pdfPageExtractor.js
const fs = require('fs').promises;
const { PDFDocument } = require('pdf-lib');

/**
 * Get the page count of a PDF
 */
async function getPdfPageCount(pdfPath) {
  try {
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    return pdfDoc.getPageCount();
  } catch (error) {
    console.error('Error getting PDF page count:', error);
    throw error;
  }
}

/**
 * Extract a specific page from a PDF
 */
async function extractPdfPage(inputPath, outputPath, pageNumber) {
  try {
    // Read the input PDF
    const pdfBytes = await fs.readFile(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const totalPages = pdfDoc.getPageCount();

    // Validate page number
    if (pageNumber < 1 || pageNumber > totalPages) {
      throw new Error(`Invalid page number. PDF has ${totalPages} pages.`);
    }

    // Create a new PDF document
    const newPdfDoc = await PDFDocument.create();

    // Copy the specified page (pageNumber is 1-based, but getPages() is 0-based)
    const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pageNumber - 1]);
    newPdfDoc.addPage(copiedPage);

    // Save the new PDF
    const newPdfBytes = await newPdfDoc.save();
    await fs.writeFile(outputPath, newPdfBytes);

    // Get file sizes for logging
    const originalSize = pdfBytes.length;
    const newSize = newPdfBytes.length;

    return {
      success: true,
      originalSize,
      newSize,
      pageExtracted: pageNumber,
      totalPages,
      outputPath
    };
  } catch (error) {
    console.error('Error extracting PDF page:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Extract multiple pages from a PDF
 */
async function extractPdfPages(inputPath, outputPath, pageNumbers) {
  try {
    // Read the input PDF
    const pdfBytes = await fs.readFile(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const totalPages = pdfDoc.getPageCount();

    // Validate page numbers
    for (const pageNum of pageNumbers) {
      if (pageNum < 1 || pageNum > totalPages) {
        throw new Error(`Invalid page number ${pageNum}. PDF has ${totalPages} pages.`);
      }
    }

    // Create a new PDF document
    const newPdfDoc = await PDFDocument.create();

    // Convert 1-based page numbers to 0-based indices
    const pageIndices = pageNumbers.map((num) => num - 1);

    // Copy the specified pages
    const copiedPages = await newPdfDoc.copyPages(pdfDoc, pageIndices);
    copiedPages.forEach((page) => newPdfDoc.addPage(page));

    // Save the new PDF
    const newPdfBytes = await newPdfDoc.save();
    await fs.writeFile(outputPath, newPdfBytes);

    // Get file sizes
    const originalSize = pdfBytes.length;
    const newSize = newPdfBytes.length;

    return {
      success: true,
      originalSize,
      newSize,
      pagesExtracted: pageNumbers,
      totalPages,
      outputPath
    };
  } catch (error) {
    console.error('Error extracting PDF pages:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Register IPC handlers for PDF page operations
 */
function registerPdfPageHandlers(ipcMain) {
  // Handler to get PDF page count
  ipcMain.handle('get-pdf-page-count', async (_event, filePath) => {
    try {
      if (!filePath) {
        return {
          success: false,
          error: 'File path is required'
        };
      }

      const pageCount = await getPdfPageCount(filePath);

      return {
        success: true,
        pageCount
      };
    } catch (error) {
      console.error('Error in get-pdf-page-count:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Handler to extract a single page
  ipcMain.handle('extract-pdf-page', async (_event, data) => {
    try {
      const { inputPath, outputPath, pageNumber } = data;

      if (!inputPath || !outputPath || !pageNumber) {
        return {
          success: false,
          error: 'Input path, output path, and page number are required'
        };
      }

      return await extractPdfPage(inputPath, outputPath, pageNumber);
    } catch (error) {
      console.error('Error in extract-pdf-page:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Handler to extract multiple pages
  ipcMain.handle('extract-pdf-pages', async (_event, data) => {
    try {
      const { inputPath, outputPath, pageNumbers } = data;

      if (!inputPath || !outputPath || !pageNumbers || !Array.isArray(pageNumbers)) {
        return {
          success: false,
          error: 'Input path, output path, and page numbers array are required'
        };
      }

      return await extractPdfPages(inputPath, outputPath, pageNumbers);
    } catch (error) {
      console.error('Error in extract-pdf-pages:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });
}

module.exports = {
  getPdfPageCount,
  extractPdfPage,
  extractPdfPages,
  registerPdfPageHandlers
};
