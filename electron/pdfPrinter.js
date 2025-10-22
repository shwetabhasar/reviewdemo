// electronAPI-handlers.js (Add this to your existing handlers)

const { ipcMain } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');

function sanitizeFolderName(name) {
  if (!name || typeof name !== 'string') {
    return 'Unknown';
  }
  return name.replace(/[<>:"/\\|?*]/g, '_').trim();
}

/**
 * Handler to print all PDF files from an owner's folder
 * NOTE: Only processes files from WEBSITE folder (mobile folder excluded)
 */
// Add this handler to registerFolderHandlers() function
ipcMain.handle('print-all-owner-pdfs', async (event, data) => {
  const { showroomName, ownerName, ownerContact } = data;

  if (!showroomName || !ownerName || !ownerContact) {
    return {
      success: false,
      message: 'Missing required parameters',
      count: 0
    };
  }

  try {
    const basePath = 'D:/';
    const showroomPath = path.join(basePath, sanitizeFolderName(showroomName));
    const fromMobilesPath = path.join(showroomPath, '1 FromMobiles');
    const ownerFolderName = `${sanitizeFolderName(ownerName)}_${ownerContact}`;
    const ownerPath = path.join(fromMobilesPath, ownerFolderName);

    const websitePath = path.join(ownerPath, 'website');

    console.log(`Looking for images and PDFs in website folder only...`);

    // Check if owner folder exists
    try {
      await fs.access(ownerPath);
    } catch (error) {
      return {
        success: false,
        message: `Owner folder not found: ${ownerPath}`,
        count: 0
      };
    }

    // Ensure website folder exists
    try {
      await fs.access(websitePath);
    } catch {
      await fs.mkdir(websitePath, { recursive: true });
    }

    let allFiles = [];

    // Only collect files from WEBSITE folder (mobile folder excluded)
    try {
      await fs.access(websitePath);
      const websiteFiles = await fs.readdir(websitePath);

      websiteFiles.forEach((file) => {
        const ext = file.toLowerCase();
        // Skip all.pdf to avoid recursive merging
        if (file.toLowerCase() === '0000-all.pdf') {
          console.log(`Skipping 0000-all.pdf to avoid recursive merge`);
          return;
        }

        if (ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.pdf')) {
          allFiles.push({
            path: path.join(websitePath, file),
            name: file,
            type: ext.endsWith('.pdf') ? 'pdf' : 'image',
            source: 'website'
          });
        }
      });

      console.log(`Found ${allFiles.length} files in website folder`);
    } catch (error) {
      console.log('Website folder not accessible');
    }

    if (allFiles.length === 0) {
      return {
        success: false,
        message: 'No JPG/JPEG/PDF files found in website folder',
        count: 0
      };
    }

    console.log(`Processing ${allFiles.length} files from website folder...`);

    // Create merged PDF
    const mergedPdf = await PDFDocument.create();

    let processedCount = 0;

    for (const file of allFiles) {
      try {
        console.log(`Processing: ${file.name} (${file.type}) from ${file.source}`);

        if (file.type === 'pdf') {
          // Add existing PDF pages
          const pdfBytes = await fs.readFile(file.path);
          const pdf = await PDFDocument.load(pdfBytes);
          const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
          copiedPages.forEach((page) => mergedPdf.addPage(page));
        } else if (file.type === 'image') {
          // Convert image to PDF page
          const imageBuffer = await fs.readFile(file.path);

          // Process image with sharp
          const processedImage = await sharp(imageBuffer)
            .resize(1654, 2339, {
              // A4 size at 200 DPI
              fit: 'inside',
              withoutEnlargement: true
            })
            .jpeg({ quality: 85 })
            .toBuffer();

          // Embed image in merged PDF
          const image = await mergedPdf.embedJpg(processedImage);

          // Create new page
          const page = mergedPdf.addPage([595.28, 841.89]); // A4 size
          const { width, height } = page.getSize();

          // Scale image to fit page
          const imgDims = image.scale(1);
          const scale = Math.min(width / imgDims.width, height / imgDims.height);

          const scaledWidth = imgDims.width * scale;
          const scaledHeight = imgDims.height * scale;

          page.drawImage(image, {
            x: (width - scaledWidth) / 2,
            y: (height - scaledHeight) / 2,
            width: scaledWidth,
            height: scaledHeight
          });
        }

        processedCount++;
        console.log(`Added: ${file.name}`);
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
      }
    }

    if (processedCount === 0) {
      return {
        success: false,
        message: 'Failed to process any files',
        count: 0
      };
    }

    // Save merged PDF in website folder with fixed name
    const mergedFileName = `0000-all.pdf`;
    const mergedPdfPath = path.join(websitePath, mergedFileName);

    const mergedPdfBytes = await mergedPdf.save();
    await fs.writeFile(mergedPdfPath, mergedPdfBytes);

    console.log(`Merged PDF saved: ${mergedPdfPath}`);

    // Open the merged PDF
    const { shell } = require('electron');
    await shell.openPath(mergedPdfPath);

    return {
      success: true,
      message: `Merged ${processedCount} documents (images + PDFs) from website folder`,
      count: processedCount,
      total: allFiles.length,
      mergedFile: mergedFileName,
      mergedPath: mergedPdfPath
    };
  } catch (error) {
    console.error('Error in print-all-owner-pdfs handler:', error);
    return {
      success: false,
      message: error.message || 'Unknown error occurred',
      count: 0
    };
  }
});
