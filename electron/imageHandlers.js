// electron/handlers/imageHandlers.js
const fs = require('fs').promises;
const path = require('path');
const { dialog } = require('electron');
const { sanitizeFolderName } = require('./folderHandlers'); // Import helper function

function registerImageHandlers(ipcMain) {
  // Updated select-image-for-compression handler in main.js
  ipcMain.handle('select-image-for-compression', async (event, data) => {
    const { defaultPath, showroomName, ownerName, ownerContact, documentTypeKey } = data;

    try {
      // Build the mobile folder path
      let mobileFolderPath;
      if (defaultPath) {
        mobileFolderPath = defaultPath;
      } else {
        mobileFolderPath = `D:\\${showroomName}\\1 FromMobiles\\${ownerName}_${ownerContact}\\mobile`;
      }

      // Determine file filters based on document type
      let filters;
      let title;

      if (documentTypeKey === 'signature') {
        // Only PNG files for signature
        filters = [
          { name: 'PNG Images', extensions: ['png'] },
          { name: 'All Files', extensions: ['*'] }
        ];
        title = 'Select PNG Image for Signature';
      } else {
        // All supported formats for other document types
        filters = [
          { name: 'Images & PDFs', extensions: ['jpg', 'jpeg', 'png', 'pdf'] },
          { name: 'Images', extensions: ['jpg', 'jpeg', 'png'] },
          { name: 'PDFs', extensions: ['pdf'] },
          { name: 'All Files', extensions: ['*'] }
        ];
        title = 'Select Image or PDF to Compress';
      }

      // Open file dialog starting in the mobile folder
      const result = await dialog.showOpenDialog({
        defaultPath: mobileFolderPath,
        properties: ['openFile'],
        filters: filters,
        title: title
      });

      if (result.canceled || !result.filePaths.length) {
        return { success: false, canceled: true };
      }

      const inputPath = result.filePaths[0];
      const fileBuffer = await fs.readFile(inputPath);

      // Get file info
      const parsedPath = path.parse(inputPath);

      // Determine mime type
      let mimeType = 'image/jpeg';
      // eslint-disable-next-line default-case
      switch (parsedPath.ext.toLowerCase()) {
        case '.png':
          mimeType = 'image/png';
          break;
        case '.bmp':
          mimeType = 'image/bmp';
          break;
        case '.webp':
          mimeType = 'image/webp';
          break;
        case '.jpg':
        case '.jpeg':
          mimeType = 'image/jpeg';
          break;
      }

      return {
        success: true,
        inputPath,
        fileName: parsedPath.base,
        fileData: fileBuffer.toString('base64'),
        mimeType
        // Removed outputPath and outputFileName since we're not saving compressed file
      };
    } catch (error) {
      console.error('Error selecting image:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Handler to save compressed image to the same folder
  ipcMain.handle('save-compressed-image-to-folder', async (event, data) => {
    const { outputPath, base64Data, originalSize, compressedSize } = data;

    try {
      // Extract base64 data and convert to buffer
      const base64String = base64Data.split(',')[1];
      const buffer = Buffer.from(base64String, 'base64');

      // Save to the output path
      await fs.writeFile(outputPath, buffer);

      console.log(`[Electron] Saved compressed image: ${outputPath}`);
      console.log(`[Electron] Original size: ${originalSize}, Compressed size: ${compressedSize}`);
      console.log(`[Electron] Compression ratio: ${((1 - compressedSize / originalSize) * 100).toFixed(1)}%`);

      return {
        success: true,
        message: 'Image compressed and saved successfully',
        outputPath
      };
    } catch (error) {
      console.error('Error saving compressed image:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Handler to save compressed image
  ipcMain.handle('save-compressed-image', async (event, data) => {
    const { showroomName, ownerName, ownerContact, fileName, base64Data, originalSize, compressedSize } = data;

    if (!showroomName || !ownerName || !ownerContact || !fileName || !base64Data) {
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

      // Create compressed_files folder
      const compressedFilesPath = path.join(ownerPath, 'compressed_files');

      // Ensure compressed_files folder exists
      try {
        await fs.access(compressedFilesPath);
      } catch {
        await fs.mkdir(compressedFilesPath, { recursive: true });
        console.log(`[Electron] Created compressed_files folder: ${compressedFilesPath}`);
      }

      // Use original filename (overwrite if exists)
      const compressedFilePath = path.join(compressedFilesPath, fileName);

      // Extract base64 data and convert to buffer
      const base64String = base64Data.split(',')[1];
      const buffer = Buffer.from(base64String, 'base64');

      // Save compressed file (overwrites if exists)
      await fs.writeFile(compressedFilePath, buffer);

      console.log(`[Electron] Saved compressed files: ${fileName} in compressed_files folder`);
      console.log(`[Electron] Original size: ${originalSize}, Compressed size: ${compressedSize}`);
      console.log(`[Electron] Compression ratio: ${((1 - compressedSize / originalSize) * 100).toFixed(1)}%`);

      return {
        success: true,
        message: `Image compressed and saved`,
        savedPath: compressedFilePath,
        fileName: fileName,
        compressionRatio: ((1 - compressedSize / originalSize) * 100).toFixed(1)
      };
    } catch (error) {
      console.error('Error saving compressed image:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Handler for compress-image-to-target
  ipcMain.handle('compress-image-to-target', async (event, data) => {
    const { imagePath, documentType, targetSizeKB, outputPath } = data;

    try {
      const sharp = require('sharp');
      const fs = require('fs').promises;

      // Read original image
      const imageBuffer = await fs.readFile(imagePath);
      const metadata = await sharp(imageBuffer).metadata();

      console.log(
        `[Image Compress] Original: ${documentType} ${metadata.width}x${metadata.height} = ${(imageBuffer.length / 1024).toFixed(1)}KB`
      );
      console.log(`[Image Compress] Target: ${targetSizeKB}KB`);

      // Check if already below target
      if (imageBuffer.length <= targetSizeKB * 1024) {
        await fs.writeFile(outputPath, imageBuffer);
        console.log(`[Image Compress] Already below target, saved as-is`);

        return {
          success: true,
          outputPath: outputPath,
          originalSize: imageBuffer.length,
          compressedSize: imageBuffer.length,
          compressionRatio: '0',
          finalQuality: 100
        };
      }

      let quality = 95; // Start higher for better quality
      let compressedBuffer;
      let attempts = 0;
      const maxAttempts = 20; // Increased attempts
      let dimensions = { width: metadata.width, height: metadata.height };

      // Iteratively compress image until it meets target size
      while (attempts < maxAttempts) {
        attempts++;

        // Create sharp instance with current dimensions
        let sharpInstance = sharp(imageBuffer);

        // Apply resizing if dimensions were reduced
        if (dimensions.width !== metadata.width || dimensions.height !== metadata.height) {
          sharpInstance = sharpInstance.resize({
            width: Math.round(dimensions.width),
            height: Math.round(dimensions.height),
            fit: 'inside',
            kernel: sharp.kernel.lanczos3
          });
        }

        // Compress with current quality
        compressedBuffer = await sharpInstance
          .jpeg({
            quality: quality,
            progressive: true,
            optimizeScans: true,
            chromaSubsampling: '4:2:0' // Better compression for larger reductions
          })
          .toBuffer();

        const currentSizeKB = compressedBuffer.length / 1024;
        console.log(
          `[Image Compress] Attempt ${attempts}: ${Math.round(dimensions.width)}x${Math.round(dimensions.height)} Q${quality}% = ${currentSizeKB.toFixed(1)}KB`
        );

        // Check if target reached
        if (compressedBuffer.length <= targetSizeKB * 1024) {
          break;
        }

        // Adjust compression strategy
        if (targetSizeKB <= 90) {
          // Form 20 documents - more aggressive
          if (quality > 30) {
            quality -= 15;
          } else {
            // Reduce dimensions for Form 20 if quality is already low
            const scale = 0.85;
            dimensions.width *= scale;
            dimensions.height *= scale;
            quality = 60; // Reset quality when reducing dimensions
          }
        } else if (targetSizeKB <= 250) {
          // Disclaimer, Invoice, Form 21 - moderate compression
          if (quality > 40) {
            quality -= 10;
          } else {
            // Reduce dimensions slightly
            const scale = 0.9;
            dimensions.width *= scale;
            dimensions.height *= scale;
            quality = 70;
          }
        } else {
          // Insurance, Form 22 - gentle compression
          if (quality > 50) {
            quality -= 8;
          } else {
            // Very slight dimension reduction
            const scale = 0.95;
            dimensions.width *= scale;
            dimensions.height *= scale;
            quality = 75;
          }
        }

        // Safety bounds
        if (quality < 10) quality = 10;
        if (dimensions.width < 400 || dimensions.height < 400) {
          console.log(
            `[Image Compress] Warning: Dimensions too small, stopping at ${Math.round(dimensions.width)}x${Math.round(dimensions.height)}`
          );
          break;
        }
      }

      // Save compressed image
      await fs.writeFile(outputPath, compressedBuffer);

      const finalSizeKB = compressedBuffer.length / 1024;
      const compressionRatio = ((1 - compressedBuffer.length / imageBuffer.length) * 100).toFixed(1);

      console.log(`[Image Compress] Final: ${finalSizeKB.toFixed(1)}KB (target: ${targetSizeKB}KB) - ${compressionRatio}% reduction`);

      if (finalSizeKB > targetSizeKB) {
        console.log(`[Image Compress] Warning: Could not reach target size after ${attempts} attempts`);
      }

      return {
        success: true,
        outputPath: outputPath,
        originalSize: imageBuffer.length,
        compressedSize: compressedBuffer.length,
        compressionRatio: compressionRatio,
        finalQuality: quality,
        finalDimensions: {
          width: Math.round(dimensions.width),
          height: Math.round(dimensions.height)
        }
      };
    } catch (error) {
      console.error('Error compressing image:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Add this new handler in main.js
  ipcMain.handle('create-a4-pdf-from-compressed-image', async (event, data) => {
    const { imagePath, outputPath } = data;

    try {
      const fs = require('fs').promises;
      const { PDFDocument } = require('pdf-lib');
      const sharp = require('sharp');

      // A4 dimensions in points
      const A4_WIDTH = 595;
      const A4_HEIGHT = 842;
      const MARGIN = 20;

      // Get compressed image metadata
      const imageBuffer = await fs.readFile(imagePath);
      const metadata = await sharp(imageBuffer).metadata();

      // Calculate dimensions to fit A4 with margin
      const maxWidth = A4_WIDTH - 2 * MARGIN;
      const maxHeight = A4_HEIGHT - 2 * MARGIN;
      const widthRatio = maxWidth / metadata.width;
      const heightRatio = maxHeight / metadata.height;
      const ratio = Math.min(widthRatio, heightRatio);

      const targetWidth = Math.round(metadata.width * ratio);
      const targetHeight = Math.round(metadata.height * ratio);

      // Create A4 PDF
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

      // Embed compressed image (no additional compression)
      const image = await pdfDoc.embedJpg(imageBuffer);

      // Center image on A4 page
      const x = (A4_WIDTH - targetWidth) / 2;
      const y = (A4_HEIGHT - targetHeight) / 2;

      page.drawImage(image, {
        x: x,
        y: y,
        width: targetWidth,
        height: targetHeight
      });

      // Save PDF
      const pdfBytes = await pdfDoc.save();
      await fs.writeFile(outputPath, pdfBytes);

      console.log(`[A4 PDF] Created from compressed image: ${(pdfBytes.length / 1024).toFixed(1)}KB`);

      return {
        success: true,
        outputPath: outputPath,
        pdfSize: pdfBytes.length,
        pdfSizeKB: (pdfBytes.length / 1024).toFixed(1)
      };
    } catch (error) {
      console.error('Error creating A4 PDF from compressed image:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // This replaces the existing handler in your main.js file
  ipcMain.handle('convert-image-to-pdf', async (event, data) => {
    const { imagePath, showroomName, ownerName, ownerContact, targetSizeKB = 299, outputFileName } = data;

    if (!imagePath || !showroomName || !ownerName || !ownerContact) {
      return {
        success: false,
        error: 'Missing required parameters'
      };
    }

    try {
      const path = require('path');
      const fs = require('fs').promises;
      const { PDFDocument } = require('pdf-lib');
      const sharp = require('sharp');

      // Get image metadata and buffer
      const imageBuffer = await fs.readFile(imagePath);
      const metadata = await sharp(imageBuffer).metadata();

      // Check if this is a Form 20 document
      const parsedPath = path.parse(imagePath);
      const fileName = parsedPath.name.toLowerCase();
      let actualTargetSizeKB = targetSizeKB;
      let isForm20 = false;

      // CRITICAL FIX: Check both the input filename AND the outputFileName parameter
      if (
        fileName.includes('form20') ||
        (fileName.includes('form') && !fileName.includes('form60')) ||
        fileName.includes('fm20') ||
        outputFileName === 'form20.pdf'
      ) {
        // ← ADDED THIS CHECK
        actualTargetSizeKB = 93; // Set to 93KB for Form 20 documents
        isForm20 = true;
        console.log('[Electron] Detected Form 20 document - setting target size to 93KB');
        console.log(`[Electron] Detection method: ${outputFileName === 'form20.pdf' ? 'outputFileName parameter' : 'filename pattern'}`);
      }

      // CRITICAL CHANGE: Use A4 dimensions in points (72 points = 1 inch)
      // A4 is 8.27 x 11.69 inches
      const A4_WIDTH = 8.27 * 72; // 595.44 points
      const A4_HEIGHT = 11.69 * 72; // 841.68 points
      const MARGIN = 20; // Points margin

      // Calculate scaling to fit image within A4 with margins
      const maxWidth = A4_WIDTH - 2 * MARGIN;
      const maxHeight = A4_HEIGHT - 2 * MARGIN;

      // Calculate aspect ratio
      const imageAspectRatio = metadata.width / metadata.height;
      const pageAspectRatio = maxWidth / maxHeight;

      let displayWidth, displayHeight;

      if (imageAspectRatio > pageAspectRatio) {
        // Image is wider - fit to width
        displayWidth = maxWidth;
        displayHeight = maxWidth / imageAspectRatio;
      } else {
        // Image is taller - fit to height
        displayHeight = maxHeight;
        displayWidth = maxHeight * imageAspectRatio;
      }

      // Start with initial image quality
      let quality = 85;
      let attempts = 0;
      const maxAttempts = 15;
      let pdfBytes;

      // Iterative compression loop
      do {
        attempts++;

        // Prepare image buffer (compress if needed)
        let processedImageBuffer;
        if (attempts === 1) {
          // First attempt - use original image
          processedImageBuffer = imageBuffer;
        } else {
          // Subsequent attempts - reduce quality
          quality -= actualTargetSizeKB === 93 ? 15 : 10;

          if (quality < 10) {
            quality = 10;
            // Also reduce dimensions if needed
            const scale = 0.8;
            displayWidth *= scale;
            displayHeight *= scale;
          }

          // Recompress image
          processedImageBuffer = await sharp(imageBuffer).jpeg({ quality }).toBuffer();
        }

        // Create fresh PDF document for each attempt
        const tempPdfDoc = await PDFDocument.create();
        const tempPage = tempPdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

        // Embed the image
        let embeddedImage;
        const imageFormat = metadata.format?.toLowerCase();

        if (imageFormat === 'png') {
          embeddedImage = await tempPdfDoc.embedPng(processedImageBuffer);
        } else if (imageFormat === 'jpg' || imageFormat === 'jpeg') {
          embeddedImage = await tempPdfDoc.embedJpg(processedImageBuffer);
        } else {
          // Convert to JPEG if unsupported format
          const jpegBuffer = await sharp(processedImageBuffer).jpeg({ quality }).toBuffer();
          embeddedImage = await tempPdfDoc.embedJpg(jpegBuffer);
        }

        // Draw the image centered on A4 page
        const x = (A4_WIDTH - displayWidth) / 2;
        const y = (A4_HEIGHT - displayHeight) / 2;

        tempPage.drawImage(embeddedImage, {
          x: x,
          y: y,
          width: displayWidth,
          height: displayHeight
        });

        // Generate PDF
        pdfBytes = await tempPdfDoc.save();
      } while (pdfBytes.length > actualTargetSizeKB * 1024 && attempts < maxAttempts);

      // Generate output filename and path based on document type
      let pdfFileName;
      let outputPath;

      const basePath = 'D:/';
      const showroomPath = path.join(basePath, sanitizeFolderName(showroomName));

      const ownerFolderName = `${sanitizeFolderName(ownerName)}_${ownerContact}`;
      let ownerPath;

      const fromMobilesPath = path.join(showroomPath, '1 FromMobiles');
      ownerPath = path.join(fromMobilesPath, ownerFolderName);

      if (isForm20) {
        // SPECIAL HANDLING FOR FORM 20: Save to website folder as Form 20-3.pdf
        const websitePath = path.join(ownerPath, 'website');
        pdfFileName = 'Form 20-3.pdf';
        outputPath = websitePath;

        // Create website folder if it doesn't exist
        try {
          await fs.access(websitePath);
        } catch {
          await fs.mkdir(websitePath, { recursive: true });
          console.log(`[Electron] Created website folder: ${websitePath}`);
        }

        console.log('[Electron] Form 20 detected - saving to website folder as Form 20-3.pdf');
      } else {
        // Normal documents: Save to Final PDFs folder
        const finalPdfsPath = path.join(ownerPath, 'Final PDFs');
        outputPath = finalPdfsPath;

        // CRITICAL FIX: Prioritize outputFileName parameter from card selection
        if (outputFileName) {
          // Use the explicitly provided output filename from the card
          pdfFileName = outputFileName;
          console.log(`[Electron] Using provided outputFileName: ${outputFileName}`);
        } else {
          // Fallback: Auto-detect from filename
          console.log(`[Electron] No outputFileName provided, auto-detecting from filename: ${fileName}`);

          if (fileName.includes('aadhaar') || fileName.includes('adhr')) {
            pdfFileName = 'adhr.pdf';
          } else if (fileName.includes('pan')) {
            pdfFileName = 'pan.pdf';
          } else if (fileName.includes('form60')) {
            pdfFileName = 'form60.pdf';
          } else if (fileName.includes('medical')) {
            pdfFileName = 'medical.pdf';
          } else if (fileName.includes('form20') || (fileName.includes('form') && !fileName.includes('form60'))) {
            pdfFileName = 'form20.pdf';
          } else if (fileName.includes('chassis') || fileName.includes('chss')) {
            pdfFileName = 'chss.pdf';
          } else if (fileName.includes('vehicle') || fileName.includes('vhcl')) {
            pdfFileName = 'vhcl.pdf';
          } else if (fileName.includes('sign')) {
            pdfFileName = 'sign.pdf';
          } else if (fileName.includes('other') || fileName.includes('othr')) {
            pdfFileName = 'othr.pdf';
          } else if (fileName.includes('extra') || fileName.includes('extr')) {
            pdfFileName = 'extr.pdf';
          } else {
            pdfFileName = 'othr.pdf';
          }
        }

        // Create Final PDFs folder if it doesn't exist
        try {
          await fs.access(finalPdfsPath);
        } catch {
          await fs.mkdir(finalPdfsPath, { recursive: true });
          console.log(`[Electron] Created Final PDFs folder: ${finalPdfsPath}`);
        }
      }

      const pdfPath = path.join(outputPath, pdfFileName);

      // Save the PDF
      await fs.writeFile(pdfPath, pdfBytes);

      const finalSize = pdfBytes.length;
      const folderType = '1 FromMobiles';
      console.log(`[Electron] Created A4 PDF: ${pdfFileName} in ${isForm20 ? 'website' : 'Final PDFs'} folder`);
      console.log(`[Electron] Full path: ${pdfPath}`);
      console.log(`[Electron] PDF size: ${(finalSize / 1024).toFixed(1)}KB`);
      console.log(`[Electron] Target was: ${actualTargetSizeKB}KB`);
      console.log(`[Electron] Quality used: ${quality}%`);
      console.log(`[Electron] Page dimensions: ${A4_WIDTH.toFixed(2)} x ${A4_HEIGHT.toFixed(2)} points (A4)`);
      console.log(`[Electron] Entity type: Owner (${folderType})`);

      return {
        success: true,
        pdfPath,
        pdfFileName,
        pdfSize: finalSize,
        pdfSizeKB: (finalSize / 1024).toFixed(1),
        originalImagePath: imagePath,
        message: isForm20
          ? `Form 20-3 created successfully as Form 20-3.pdf in website folder (${(finalSize / 1024).toFixed(1)}KB) - A4 size`
          : `PDF created successfully as ${pdfFileName} in Final PDFs folder (${(finalSize / 1024).toFixed(1)}KB) - A4 size`
      };
    } catch (error) {
      console.error('Error converting image to PDF:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });
}

module.exports = { registerImageHandlers };
