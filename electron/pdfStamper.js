// electron/pdfStamper.js - FIXED FINANCE STAMP PATH
// Fixed to look for finance stamps by company name instead of ID

const fs = require('fs').promises;
const path = require('path');
const { PDFDocument, degrees } = require('pdf-lib');
const { dialog } = require('electron');
const { compressPDF } = require('./pdfCompressor');

// High-quality SVG to PNG conversion for signatures
async function convertSvgToHighQualityPng(svgPath, options = {}) {
  const sharp = require('sharp');
  const fs = require('fs').promises;

  try {
    // Read SVG file
    const svgBuffer = await fs.readFile(svgPath);

    // Convert at higher resolution for better quality
    const scaleFactor = 3; // 3x resolution
    const baseWidth = options.width || 100;
    const baseHeight = options.height || 50;

    // Convert SVG to PNG at higher resolution to preserve quality
    const pngBuffer = await sharp(svgBuffer)
      .resize(baseWidth * scaleFactor, baseHeight * scaleFactor, {
        fit: 'inside',
        background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent
      })
      .png({
        quality: 100, // Maximum quality
        compressionLevel: 0, // No compression
        adaptiveFiltering: false,
        palette: false // Full color to preserve blue
      })
      .toBuffer();

    return pngBuffer;
  } catch (error) {
    console.error('Error converting SVG to high-quality PNG:', error);
    throw error;
  }
}

// Helper function to sanitize names
function sanitizeName(name) {
  if (!name || typeof name !== 'string') {
    return 'Unknown';
  }
  return name.replace(/[<>:"/\\|?*]/g, '_').trim();
}

// Helper function to calculate optimal stamp dimensions
function calculateStampDimensions(originalWidth, originalHeight, stampType = 'regular') {
  const aspectRatio = originalWidth / originalHeight;

  // Define max widths based on stamp type and aspect ratio
  let maxWidth;

  if (aspectRatio > 2) {
    // Very wide stamps (like 518x300)
    maxWidth = 120;
  } else if (aspectRatio > 1.5) {
    // Wide stamps
    maxWidth = 100;
  } else if (aspectRatio > 1) {
    // Slightly wide stamps
    maxWidth = 80;
  } else {
    // Square or tall stamps
    maxWidth = 70;
  }

  // For finance stamps on Form 20-3, allow slightly larger
  // if (stampType === 'finance') {
  //   maxWidth = maxWidth * 1.1;
  // }
  const stampWidth = maxWidth;
  const stampHeight = stampWidth / aspectRatio;

  return {
    width: Math.round(stampWidth),
    height: Math.round(stampHeight),
    aspectRatio: aspectRatio
  };
}

function getOwnerPaths(showroomName, ownerName, ownerContact) {
  const basePath = 'D:/';
  const showroomPath = path.join(basePath, sanitizeName(showroomName));
  const parentFolder = '1 FromMobiles';
  const ownerFolder = `${sanitizeName(ownerName)}_${ownerContact}`;
  const ownerPath = path.join(showroomPath, parentFolder, ownerFolder);
  const mobileFolderName = 'mobile';
  const mobilePath = path.join(ownerPath, mobileFolderName);
  const websitePath = path.join(ownerPath, 'website');
  const finalPdfsPath = path.join(ownerPath, 'Final PDFs');
  const compressedFilesPath = path.join(ownerPath, 'compressed_files');

  return {
    ownerPath,
    mobilePath,
    websitePath,
    finalPdfsPath,
    compressedFilesPath,
    parentFolder,
    mobileFolderName
  };
}

// Enhanced function to get stamp and signature paths with format preference
function getStampPaths(showroomName, ownerName, ownerContact, signatureFormat = 'png') {
  const basePath = 'D:/';

  // Stamp is at showroom level: D:\<ShowroomName>\2 FinanceStamps\stamp.png
  const stampPath = path.join(basePath, sanitizeName(showroomName), '2 FinanceStamps', 'stamp.png');

  // Signature paths - return based on user preference
  let signaturePath = null;

  if (ownerName && ownerContact) {
    const paths = getOwnerPaths(showroomName, ownerName, ownerContact);

    let signatureBasePath = paths.mobilePath;

    // Return paths based on user preference
    if (signatureFormat === 'svg') {
      signaturePath = {
        primary: path.join(signatureBasePath, 'sign.svg'),
        fallback: path.join(signatureBasePath, 'sign.png'),
        preferredFormat: 'svg'
      };
    } else {
      signaturePath = {
        primary: path.join(signatureBasePath, 'sign.png'),
        fallback: path.join(signatureBasePath, 'sign.svg'),
        preferredFormat: 'png'
      };
    }
  }

  return { stampPath, signaturePath };
}

// New helper function to embed signature with format preference
async function embedSignature(pdfDoc, signaturePath, customConfig = {}) {
  if (!signaturePath) return null;

  try {
    let signatureBytes = null;
    let format = null;

    // Try primary format first (based on user preference)
    try {
      await fs.access(signaturePath.primary);

      if (signaturePath.preferredFormat === 'svg') {
        // Convert SVG to high-quality PNG
        signatureBytes = await convertSvgToHighQualityPng(signaturePath.primary, {
          width: customConfig.signatureWidth || 100,
          height: customConfig.signatureHeight || 50
        });
        format = 'svg';
        console.log('Using SVG signature (user preference)');
      } else {
        // Use PNG directly
        signatureBytes = await fs.readFile(signaturePath.primary);
        format = 'png';
        console.log('Using PNG signature (user preference)');
      }
    } catch (primaryError) {
      // Primary format not available, try fallback
      console.log(`Primary ${signaturePath.preferredFormat} not found, trying fallback...`);

      try {
        await fs.access(signaturePath.fallback);

        if (signaturePath.preferredFormat === 'svg') {
          // Fallback to PNG
          signatureBytes = await fs.readFile(signaturePath.fallback);
          format = 'png';
          console.log('SVG not found, using PNG signature as fallback');
        } else {
          // Fallback to SVG
          signatureBytes = await convertSvgToHighQualityPng(signaturePath.fallback, {
            width: customConfig.signatureWidth || 100,
            height: customConfig.signatureHeight || 50
          });
          format = 'svg';
          console.log('PNG not found, using SVG signature as fallback');
        }
      } catch (fallbackError) {
        console.log('No signature file found in either format');
        return null;
      }
    }

    if (signatureBytes) {
      const signatureImage = await pdfDoc.embedPng(signatureBytes);
      return { image: signatureImage, format: format };
    }
  } catch (error) {
    console.error('Error embedding signature:', error);
    return null;
  }

  return null;
}

// Document type configurations with rename rules
const DOCUMENT_CONFIG = {
  insurance: {
    stamp: false,
    signature: false,
    skipStamping: true,
    finalName: 'insu.pdf',
    skipReason: 'Insurance documents do not require stamping',
    saveToFinalPdfs: true,
    requiresCompression: true
  },
  invoice: {
    stamp: true,
    signature: false,
    position: 'bottom-right-invoice',
    pageIndex: 0,
    finalName: 'invo.pdf',
    saveToFinalPdfs: true,
    requiresCompression: false
  },
  form21: {
    stamp: true,
    signature: false,
    position: 'bottom-right-21',
    pageIndex: 0,
    finalName: 'fm21.pdf',
    saveToFinalPdfs: true,
    requiresCompression: false
  },
  disclaimer: {
    stamp: true,
    signature: false,
    position: 'bottom-right-disc',
    pageIndex: 0,
    finalName: 'disc.pdf',
    saveToFinalPdfs: true,
    requiresCompression: false
  },
  form22: {
    stamp: false,
    signature: false,
    skipStamping: true,
    finalName: 'fm22.pdf',
    skipReason: 'Form 22 does not require stamping',
    saveToFinalPdfs: true,
    requiresCompression: true
  },
  'form20-1': {
    stamp: false,
    signature: false,
    skipStamping: true,
    finalName: '201.pdf',
    skipReason: 'Form 20 Page 1 does not require stamping',
    saveToCompressedFiles: true,
    requiresCompression: true
  },
  'form20-2': {
    stamp: true,
    signature: true,
    position: 'bottom-right-Form20',
    pageIndex: 0,
    finalName: '202.pdf',
    saveToCompressedFiles: true,
    requiresCompression: false
  },
  'form20-3': {
    skipStamping: false,
    finalName: '203.pdf',
    requiresOption: true,
    options: ['cash', 'finance', 'mobile'],
    saveToCompressedFiles: true,
    requiresCompression: false
  }
};

/**
 * Get document type from key or filename
 */
function getDocumentType(documentKey) {
  const key = documentKey.toLowerCase();

  // Direct mapping for online documents
  if (DOCUMENT_CONFIG[key]) {
    return key;
  }

  // For file names, check patterns
  if (key.includes('insurance') || key.includes('insu')) return 'insurance';
  if (key.includes('invoice') || key.includes('inv')) return 'invoice';
  if (key.includes('form') && key.includes('21')) return 'form21';
  if (key.includes('disclaimer') || key.includes('disc')) return 'disclaimer';
  if (key.includes('form') && key.includes('22')) return 'form22';
  if (key.includes('form') && key.includes('20')) {
    if (key.includes('page2') || key.includes('p2') || key.includes('-2')) return 'form20-2';
    if (key.includes('page3') || key.includes('p3') || key.includes('-3')) return 'form20-3';
    return 'form20-1';
  }

  return null;
}

// Updated processForm203WithOption with signature format support - FIXED FINANCE STAMP PATH
async function processForm203WithOption(
  inputPath,
  paymentType,
  financeCompanyId,
  customConfig = {},
  showroomName,
  ownerName,
  ownerContact,
  signatureFormat = 'png' // Added parameter
) {
  try {
    const paths = getOwnerPaths(showroomName, ownerName, ownerContact);

    // For mobile option, copy to website folder
    if (paymentType === 'mobile') {
      const finalPath = path.join(paths.websitePath, '203.pdf');

      // Ensure website folder exists
      try {
        await fs.mkdir(paths.websitePath, { recursive: true });
      } catch (error) {
        console.log('Website folder already exists or error creating:', error.message);
      }

      // Copy the file from mobile to website folder
      await fs.copyFile(inputPath, finalPath);

      return {
        success: true,
        message: 'Form 20-3 copied from mobile to website folder',
        documentType: 'form20-3',
        stampApplied: false,
        signatureApplied: false,
        outputPath: finalPath,
        finalName: '203.pdf',
        originalDeleted: false,
        copiedFromMobile: true
      };
    }

    // For cash and finance options, save to compressed_files folder
    try {
      await fs.mkdir(paths.compressedFilesPath, { recursive: true });
    } catch (error) {
      console.log('Compressed files folder already exists or error creating:', error.message);
    }

    const finalPath = path.join(paths.compressedFilesPath, '203.pdf');

    // Determine compression threshold based on payment type
    let compressionThreshold = 75; // Default for cash
    if (paymentType === 'finance') {
      compressionThreshold = 60; // 60KB for finance
    }

    // Check if file needs compression
    const stats = await fs.stat(inputPath);
    const currentSizeKB = stats.size / 1024;
    let needsCompression = currentSizeKB > compressionThreshold;

    console.log(`[Form 20-3] Current size: ${currentSizeKB.toFixed(1)}KB, Threshold: ${compressionThreshold}KB, Payment: ${paymentType}`);

    // Compression logic
    if (needsCompression) {
      console.log(`[Form 20-3] File needs compression for ${paymentType} payment`);

      try {
        const sharp = require('sharp');
        const pdfPoppler = require('pdf-poppler');
        const os = require('os');

        const tempDir = path.join(os.tmpdir(), 'pdf-compress-' + Date.now());
        await fs.mkdir(tempDir, { recursive: true });

        try {
          const opts = {
            format: 'png',
            out_dir: tempDir,
            out_prefix: 'page',
            page: null,
            scale: 2048,
            r: 300
          };

          await pdfPoppler.convert(inputPath, opts);
          const files = await fs.readdir(tempDir);
          const pngFile = files.find((f) => f.endsWith('.png'));

          if (pngFile) {
            const pngPath = path.join(tempDir, pngFile);

            let quality = 90;
            let compressedBuffer;
            let attempts = 0;
            const maxAttempts = 20;

            while (attempts < maxAttempts) {
              attempts++;
              compressedBuffer = await sharp(pngPath)
                .jpeg({
                  quality: quality,
                  progressive: true,
                  optimizeScans: true,
                  chromaSubsampling: '4:2:0'
                })
                .toBuffer();

              const currentKB = compressedBuffer.length / 1024;
              console.log(`[Form 20-3] Compression attempt ${attempts}: Quality ${quality}%, Size: ${currentKB.toFixed(1)}KB`);

              if (compressedBuffer.length <= compressionThreshold * 1024) {
                console.log(`[Form 20-3] Target reached: ${currentKB.toFixed(1)}KB`);
                break;
              }

              if (compressionThreshold <= 60) {
                quality -= 15;
              } else {
                quality -= 10;
              }

              if (quality < 15) break;
            }

            const { PDFDocument } = require('pdf-lib');
            const pdfDoc = await PDFDocument.create();
            const page = pdfDoc.addPage([595, 842]);
            const image = await pdfDoc.embedJpg(compressedBuffer);

            const { width: imgWidth, height: imgHeight } = image.scale(1);
            const maxWidth = 555;
            const maxHeight = 802;

            const widthRatio = maxWidth / imgWidth;
            const heightRatio = maxHeight / imgHeight;
            const ratio = Math.min(widthRatio, heightRatio);

            const finalWidth = imgWidth * ratio;
            const finalHeight = imgHeight * ratio;

            const x = (595 - finalWidth) / 2;
            const y = (842 - finalHeight) / 2;

            page.drawImage(image, {
              x: x,
              y: y,
              width: finalWidth,
              height: finalHeight
            });

            const compressedPdfBytes = await pdfDoc.save();
            await fs.writeFile(finalPath, compressedPdfBytes);

            console.log(`[Form 20-3] Compressed PDF created: ${(compressedPdfBytes.length / 1024).toFixed(1)}KB`);

            await fs.unlink(pngPath);
            await fs.rmdir(tempDir);
          } else {
            throw new Error('Failed to convert PDF to image');
          }
        } catch (compressionError) {
          console.error('[Form 20-3] Compression failed:', compressionError);
          await fs.copyFile(inputPath, finalPath);
        }
      } catch (error) {
        console.error('[Form 20-3] Compression error:', error);
        await fs.copyFile(inputPath, finalPath);
      }
    } else {
      console.log(`[Form 20-3] File already below threshold, copying as-is`);
      await fs.copyFile(inputPath, finalPath);
    }

    // Apply stamping based on payment type with signature format preference
    const pdfBytes = await fs.readFile(finalPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const page = pages[0];
    const { width: pageWidth } = page.getSize();

    if (paymentType === 'cash') {
      // Apply customer signature for cash with format preference
      const { signaturePath } = getStampPaths(showroomName, ownerName, ownerContact, signatureFormat);

      const signatureData = await embedSignature(pdfDoc, signaturePath, customConfig);

      if (signatureData) {
        const signatureWidth = customConfig.signatureWidth || 100;
        const signatureHeight = customConfig.signatureHeight || 50;

        page.drawImage(signatureData.image, {
          x: pageWidth - signatureWidth - 80,
          y: 670,
          width: signatureWidth,
          height: signatureHeight,
          opacity: customConfig.signatureOpacity || 0.9
        });

        console.log(`[Form 20-3] Applied customer signature for cash payment (${signatureData.format} format)`);
      }
    } else if (paymentType === 'finance' && financeCompanyId) {
      // FIXED: Look for finance stamp by company name, not ID
      const financeStampFolder = path.join('D:/', sanitizeName(showroomName), '2 FinanceStamps');

      // Try to find the finance stamp with various extensions
      let financeStampPath = null;
      const possibleExtensions = ['.png', '.jpg', '.jpeg', '.PNG', '.JPG', '.JPEG'];

      for (const ext of possibleExtensions) {
        const testPath = path.join(financeStampFolder, `${financeCompanyId}${ext}`);
        try {
          await fs.access(testPath);
          financeStampPath = testPath;
          console.log(`[Form 20-3] Found finance stamp at: ${testPath}`);
          break;
        } catch {
          // File doesn't exist with this extension, try next
        }
      }

      if (!financeStampPath) {
        console.error(`[Form 20-3] Finance stamp not found for company: ${financeCompanyId}`);
        console.error(`[Form 20-3] Looked in folder: ${financeStampFolder}`);
        return {
          success: false,
          error: `Finance company stamp not found for ${financeCompanyId}. Please ensure the stamp file exists in the FinanceStamps folder.`
        };
      }

      try {
        const financeStampBytes = await fs.readFile(financeStampPath);
        const financeStampImage = await pdfDoc.embedPng(financeStampBytes);

        // Get original dimensions
        const originalWidth = financeStampImage.width;
        const originalHeight = financeStampImage.height;

        // Calculate optimal dimensions automatically
        const stampDimensions = calculateStampDimensions(originalWidth, originalHeight, 'finance');

        // Allow override from customConfig if provided
        const stampWidth = stampDimensions.width;
        const stampHeight = stampDimensions.height;

        console.log(
          `[Form 20-3] Finance stamp dimensions: Original ${originalWidth}x${originalHeight}, Applied ${stampWidth}x${stampHeight}`
        );

        // Top position
        page.drawImage(financeStampImage, {
          x: 160,
          y: 650,
          width: stampWidth,
          height: stampHeight,
          opacity: 0.95
        });

        // Middle position
        page.drawImage(financeStampImage, {
          x: 160,
          y: 350,
          width: stampWidth,
          height: stampHeight,
          opacity: 0.95
        });

        // Bottom position
        page.drawImage(financeStampImage, {
          x: 80,
          y: 100,
          width: stampWidth,
          height: stampHeight,
          opacity: 0.95
        });

        console.log(`[Form 20-3] Applied finance company stamps: ${financeCompanyId}`);
      } catch (error) {
        console.error('[Form 20-3] Error applying finance stamp:', error);
        return {
          success: false,
          error: `Failed to apply finance company stamp: ${error.message}`
        };
      }

      // Add customer signature with format preference
      const { signaturePath } = getStampPaths(showroomName, ownerName, ownerContact, signatureFormat);

      const signatureData = await embedSignature(pdfDoc, signaturePath, customConfig);

      if (signatureData) {
        const signatureWidth = customConfig.signatureWidth || 100;
        const signatureHeight = customConfig.signatureHeight || 50;

        page.drawImage(signatureData.image, {
          x: pageWidth - signatureWidth - 80,
          y: 670,
          width: signatureWidth,
          height: signatureHeight,
          opacity: customConfig.signatureOpacity || 0.9
        });

        console.log(`[Form 20-3] Applied customer signature for finance payment (${signatureData.format} format)`);
      }
    }

    // Save the final stamped PDF
    const stampedPdfBytes = await pdfDoc.save();
    await fs.writeFile(finalPath, stampedPdfBytes);

    const finalSizeKB = stampedPdfBytes.length / 1024;
    console.log(`[Form 20-3] Final PDF size: ${finalSizeKB.toFixed(1)}KB`);

    return {
      success: true,
      message: `Form 20-3 processed successfully (${paymentType}) - ${needsCompression ? 'compressed to' : 'already below'} ${compressionThreshold}KB threshold`,
      documentType: 'form20-3',
      paymentType: paymentType,
      stampApplied: paymentType === 'finance',
      signatureApplied: paymentType === 'cash' || paymentType === 'finance',
      outputPath: finalPath,
      finalName: '203.pdf',
      originalDeleted: false,
      compressionApplied: needsCompression,
      finalSizeKB: finalSizeKB.toFixed(1)
    };
  } catch (error) {
    console.error('Error processing Form 20-3:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Helper function for Form 20-2 and Form 20-1 compression with different thresholds
async function compressForm20Document(inputPath, outputPath, thresholdKB, documentType) {
  try {
    const sharp = require('sharp');
    const pdfPoppler = require('pdf-poppler');
    const os = require('os');
    const { PDFDocument } = require('pdf-lib');

    const stats = await fs.stat(inputPath);
    const currentSizeKB = stats.size / 1024;

    if (currentSizeKB <= thresholdKB) {
      await fs.copyFile(inputPath, outputPath);
      return {
        success: true,
        message: `${documentType} already below ${thresholdKB}KB threshold`,
        compressed: false,
        finalSizeKB: currentSizeKB.toFixed(1)
      };
    }

    console.log(`[${documentType}] Compressing from ${currentSizeKB.toFixed(1)}KB to ${thresholdKB}KB`);

    const tempDir = path.join(os.tmpdir(), `pdf-compress-${documentType}-` + Date.now());
    await fs.mkdir(tempDir, { recursive: true });

    try {
      const opts = {
        format: 'png',
        out_dir: tempDir,
        out_prefix: 'page',
        page: null,
        scale: 2048,
        r: 300
      };

      await pdfPoppler.convert(inputPath, opts);
      const files = await fs.readdir(tempDir);
      const pngFile = files.find((f) => f.endsWith('.png'));

      if (!pngFile) {
        throw new Error('Failed to convert PDF to image');
      }

      const pngPath = path.join(tempDir, pngFile);

      let quality = 90;
      let compressedBuffer;
      let attempts = 0;
      const maxAttempts = 20;

      while (attempts < maxAttempts) {
        attempts++;
        compressedBuffer = await sharp(pngPath)
          .jpeg({
            quality: quality,
            progressive: true,
            optimizeScans: true,
            chromaSubsampling: '4:2:0'
          })
          .toBuffer();

        const currentKB = compressedBuffer.length / 1024;
        console.log(`[${documentType}] Compression attempt ${attempts}: Quality ${quality}%, Size: ${currentKB.toFixed(1)}KB`);

        if (compressedBuffer.length <= thresholdKB * 1024) {
          break;
        }

        if (thresholdKB <= 50) {
          quality -= 20;
        } else if (thresholdKB <= 60) {
          quality -= 15;
        } else {
          quality -= 10;
        }

        if (quality < 10) break;
      }

      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]);
      const image = await pdfDoc.embedJpg(compressedBuffer);

      const { width: imgWidth, height: imgHeight } = image.scale(1);
      const maxWidth = 555;
      const maxHeight = 802;

      const widthRatio = maxWidth / imgWidth;
      const heightRatio = maxHeight / imgHeight;
      const ratio = Math.min(widthRatio, heightRatio);

      const finalWidth = imgWidth * ratio;
      const finalHeight = imgHeight * ratio;

      const x = (595 - finalWidth) / 2;
      const y = (842 - finalHeight) / 2;

      page.drawImage(image, {
        x: x,
        y: y,
        width: finalWidth,
        height: finalHeight
      });

      const compressedPdfBytes = await pdfDoc.save();
      await fs.writeFile(outputPath, compressedPdfBytes);

      await fs.unlink(pngPath);
      await fs.rmdir(tempDir);

      const finalSizeKB = compressedPdfBytes.length / 1024;
      console.log(`[${documentType}] Compressed to ${finalSizeKB.toFixed(1)}KB`);

      return {
        success: true,
        message: `${documentType} compressed successfully`,
        compressed: true,
        finalSizeKB: finalSizeKB.toFixed(1),
        originalSizeKB: currentSizeKB.toFixed(1)
      };
    } catch (error) {
      try {
        const files = await fs.readdir(tempDir);
        for (const file of files) {
          await fs.unlink(path.join(tempDir, file));
        }
        await fs.rmdir(tempDir);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      throw error;
    }
  } catch (error) {
    console.error(`[${documentType}] Compression failed:`, error);
    await fs.copyFile(inputPath, outputPath);
    return {
      success: false,
      error: error.message,
      message: `Compression failed, using original file`
    };
  }
}

// Updated stampPDFWithRules with signature format support
async function stampPDFWithRules(
  inputPath,
  outputPath,
  documentType,
  customConfig = {},
  showroomName,
  ownerName,
  ownerContact,
  signatureFormat = 'png' // Added parameter
) {
  try {
    const rules = DOCUMENT_CONFIG[documentType];

    if (!rules) {
      return {
        success: false,
        error: `Unknown document type: ${documentType}`
      };
    }

    if (rules.skipStamping) {
      await fs.copyFile(inputPath, outputPath);

      return {
        success: true,
        message: rules.skipReason || `No stamping required for ${documentType}`,
        skipReason: rules.skipReason,
        documentType: documentType,
        stampApplied: false,
        signatureApplied: false,
        outputPath: outputPath
      };
    }

    const pdfBytes = await fs.readFile(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const pages = pdfDoc.getPages();
    const pageIndex = rules.pageIndex || 0;

    if (pageIndex >= pages.length) {
      return {
        success: false,
        error: `Page ${pageIndex + 1} not found in PDF. Document has ${pages.length} pages.`
      };
    }

    const page = pages[pageIndex];
    const { width: pageWidth } = page.getSize();

    // Apply stamp if required
    if (rules.stamp) {
      const { stampPath } = getStampPaths(showroomName, ownerName, ownerContact);

      try {
        await fs.access(stampPath);
      } catch (error) {
        return {
          success: false,
          error: `Stamp not found at ${stampPath}. Please ensure stamp.png exists in the showroom folder.`
        };
      }

      const stampBytes = await fs.readFile(stampPath);
      const stampImage = await pdfDoc.embedPng(stampBytes);

      const stampWidth = customConfig.stampWidth || 100;
      const stampHeight = customConfig.stampHeight || 100;

      let stampX, stampY;
      if (rules.position === 'bottom-right-invoice') {
        stampX = pageWidth - stampWidth - 50;
        stampY = 150;
      } else if (rules.position === 'bottom-right-21') {
        stampX = pageWidth - stampWidth - 50;
        stampY = 60;
      } else if (rules.position === 'bottom-right-disc') {
        stampX = pageWidth - stampWidth - 50;
        stampY = 60;
      } else if (rules.position === 'bottom-right-Form20') {
        stampX = pageWidth - stampWidth - 100;
        stampY = 90;
      } else {
        stampX = pageWidth - stampWidth - 50;
        stampY = 100;
      }

      page.drawImage(stampImage, {
        x: stampX,
        y: stampY,
        width: stampWidth,
        height: stampHeight,
        opacity: customConfig.stampOpacity || 0.9
      });
    }

    // Apply signature if required with format preference
    if (rules.signature) {
      try {
        const { signaturePath } = getStampPaths(showroomName, ownerName, ownerContact, signatureFormat);

        const signatureData = await embedSignature(pdfDoc, signaturePath, customConfig);

        if (signatureData) {
          const signatureWidth = customConfig.signatureWidth || 80;
          const signatureHeight = customConfig.signatureHeight || 40;

          let signatureX, signatureY;
          if (rules.position === 'bottom-right-Form20') {
            signatureX = pageWidth - signatureWidth - 100;
            signatureY = 25;
          } else {
            signatureX = customConfig.signatureX || 50;
            signatureY = customConfig.signatureY || 50;
          }

          page.drawImage(signatureData.image, {
            x: signatureX,
            y: signatureY,
            width: signatureWidth,
            height: signatureHeight,
            opacity: customConfig.signatureOpacity || 0.9
          });

          console.log(`Signature applied successfully (${signatureData.format} format)`);
        }
      } catch (error) {
        console.log('Signature not found, proceeding with stamp only');
      }
    }

    const stampedPdfBytes = await pdfDoc.save();
    await fs.writeFile(outputPath, stampedPdfBytes);

    return {
      success: true,
      message: `PDF stamped successfully for ${documentType}`,
      documentType: documentType,
      stampApplied: rules.stamp,
      signatureApplied: rules.signature,
      pageNumber: pageIndex + 1,
      outputPath: outputPath
    };
  } catch (error) {
    console.error('Error stamping PDF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Updated processWebsiteDocument with signature format support
async function processWebsiteDocument(
  inputPath,
  documentType,
  customConfig = {},
  showroomName,
  ownerName,
  ownerContact,
  signatureFormat = 'png' // Added parameter
) {
  try {
    const config = DOCUMENT_CONFIG[documentType];
    if (!config) {
      return {
        success: false,
        error: `Unknown document type: ${documentType}`
      };
    }

    const paths = getOwnerPaths(showroomName, ownerName, ownerContact);

    let targetFolderPath;
    if (config.saveToFinalPdfs) {
      targetFolderPath = paths.finalPdfsPath;
    } else if (config.saveToCompressedFiles) {
      targetFolderPath = paths.compressedFilesPath;
    } else {
      targetFolderPath = paths.websitePath;
    }

    await fs.mkdir(targetFolderPath, { recursive: true });
    const finalPath = path.join(targetFolderPath, config.finalName);

    const compressionOnlyDocs = ['insurance', 'form22', 'form20-1'];
    const stampingOnlyDocs = ['invoice', 'disclaimer', 'form21'];
    const stampingWithOptionalCompression = ['form20-2'];

    if (compressionOnlyDocs.includes(documentType)) {
      // Compression-only documents logic (unchanged)
      if (config.requiresCompression) {
        const stats = await fs.stat(inputPath);
        const sizeKB = Math.ceil(stats.size / 1024);

        if (sizeKB > 299) {
          const tempCompressedPath = path.join(targetFolderPath, `temp_compressed_${Date.now()}.pdf`);
          const compressResult = await compressPDF(inputPath, tempCompressedPath, 290);

          if (compressResult && compressResult.success) {
            await fs.rename(tempCompressedPath, finalPath);
            return {
              success: true,
              message: `${documentType} compressed and renamed to ${config.finalName}`,
              documentType: documentType,
              outputPath: finalPath,
              finalName: config.finalName,
              compressed: true,
              originalSize: stats.size,
              finalSize: compressResult.compressedSize
            };
          } else {
            await fs.copyFile(inputPath, finalPath);
            return {
              success: true,
              message: `${documentType} renamed to ${config.finalName} (compression failed)`,
              documentType: documentType,
              outputPath: finalPath,
              finalName: config.finalName,
              warning: 'Could not compress below 299KB'
            };
          }
        }
      }

      await fs.copyFile(inputPath, finalPath);
      return {
        success: true,
        message: `${documentType} renamed to ${config.finalName}`,
        documentType: documentType,
        outputPath: finalPath,
        finalName: config.finalName
      };
    }

    if (stampingOnlyDocs.includes(documentType)) {
      const tempStampedPath = path.join(targetFolderPath, `temp_stamped_${Date.now()}.pdf`);
      const stampResult = await stampPDFWithRules(
        inputPath,
        tempStampedPath,
        documentType,
        customConfig,
        showroomName,
        ownerName,
        ownerContact,
        signatureFormat // Pass signature format
      );

      if (!stampResult.success) {
        return stampResult;
      }

      await fs.rename(tempStampedPath, finalPath);
      const stampedStats = await fs.stat(finalPath);

      return {
        success: true,
        message: `${documentType} stamped and saved as ${config.finalName}`,
        documentType: documentType,
        stampApplied: true,
        outputPath: finalPath,
        finalName: config.finalName,
        fileSize: stampedStats.size,
        fileSizeKB: Math.ceil(stampedStats.size / 1024)
      };
    }

    if (stampingWithOptionalCompression.includes(documentType)) {
      const tempStampedPath = path.join(targetFolderPath, `temp_stamped_${Date.now()}.pdf`);
      const stampResult = await stampPDFWithRules(
        inputPath,
        tempStampedPath,
        documentType,
        customConfig,
        showroomName,
        ownerName,
        ownerContact,
        signatureFormat // Pass signature format
      );

      if (!stampResult.success) {
        return stampResult;
      }

      await fs.rename(tempStampedPath, finalPath);
      return {
        ...stampResult,
        outputPath: finalPath,
        finalName: config.finalName
      };
    }

    if (config.skipStamping) {
      await fs.copyFile(inputPath, finalPath);
      return {
        success: true,
        message: config.skipReason || `No processing required for ${documentType}`,
        skipReason: config.skipReason,
        documentType: documentType,
        stampApplied: false,
        signatureApplied: false,
        outputPath: finalPath
      };
    }

    const tempPath = path.join(targetFolderPath, `temp_${Date.now()}.pdf`);
    const stampResult = await stampPDFWithRules(
      inputPath,
      tempPath,
      documentType,
      customConfig,
      showroomName,
      ownerName,
      ownerContact,
      signatureFormat // Pass signature format
    );

    if (!stampResult.success) {
      return stampResult;
    }

    await fs.rename(tempPath, finalPath);
    return {
      ...stampResult,
      outputPath: finalPath,
      finalName: config.finalName
    };
  } catch (error) {
    console.error('Error processing website document:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Register IPC handlers for PDF stamping
 */
function registerPdfStampHandlers(ipcMain, mainWindow) {
  // Handler to select and stamp a PDF with automatic type detection
  ipcMain.handle('select-and-stamp-pdf', async (_event, stampConfig = {}) => {
    try {
      const { showroomName, ownerName, ownerContact, signatureFormat = 'png' } = stampConfig;

      if (!showroomName) {
        return {
          success: false,
          error: 'Showroom name is required for stamping'
        };
      }

      const { stampPath } = getStampPaths(showroomName, ownerName, ownerContact);

      try {
        await fs.access(stampPath);
      } catch (error) {
        return {
          success: false,
          error: `Stamp not found at ${stampPath}. Please ensure stamp.png exists in the showroom folder.`
        };
      }

      const dialogOptions = {
        title: 'Select PDF to Stamp',
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
        properties: ['openFile']
      };

      if (stampConfig.defaultPath) {
        dialogOptions.defaultPath = stampConfig.defaultPath;
      }

      const result = await dialog.showOpenDialog(mainWindow, dialogOptions);

      if (result.canceled || result.filePaths.length === 0) {
        return {
          success: false,
          error: 'No file selected'
        };
      }

      const inputPath = result.filePaths[0];
      const fileName = path.basename(inputPath);

      let documentType = stampConfig.documentType;
      if (!documentType) {
        documentType = getDocumentType(fileName);
        if (!documentType) {
          const paths = getOwnerPaths(showroomName, ownerName, ownerContact);
          await fs.mkdir(paths.finalPdfsPath, { recursive: true });

          const inputName = path.basename(inputPath, '.pdf');
          const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_');
          const outputPath = path.join(paths.finalPdfsPath, `${inputName}_stamped_${timestamp}.pdf`);
          return await stampPDF(inputPath, outputPath, {
            ...stampConfig,
            showroomName,
            ownerName,
            ownerContact,
            signatureFormat
          });
        }
      }

      return await processWebsiteDocument(inputPath, documentType, stampConfig, showroomName, ownerName, ownerContact, signatureFormat);
    } catch (error) {
      console.error('Error in select-and-stamp-pdf:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // Handler to stamp a specific PDF (when path is known)
  ipcMain.handle('stamp-pdf-file', async (_event, data) => {
    try {
      const { inputPath, stampConfig = {} } = data;
      const { showroomName, ownerName, ownerContact, signatureFormat = 'png' } = stampConfig;

      try {
        await fs.access(inputPath);
      } catch (error) {
        return {
          success: false,
          error: `PDF not found at ${inputPath}`
        };
      }

      let documentType = stampConfig.documentType;
      if (!documentType) {
        const fileName = path.basename(inputPath);
        documentType = getDocumentType(fileName);
        if (!documentType) {
          const paths = getOwnerPaths(showroomName, ownerName, ownerContact);
          await fs.mkdir(paths.finalPdfsPath, { recursive: true });

          const outputPath =
            stampConfig.outputPath || path.join(paths.finalPdfsPath, `${path.basename(inputPath, '.pdf')}_stamped_${Date.now()}.pdf`);
          return await stampPDF(inputPath, outputPath, {
            ...stampConfig,
            showroomName,
            ownerName,
            ownerContact,
            signatureFormat
          });
        }
      }

      return await processWebsiteDocument(inputPath, documentType, stampConfig, showroomName, ownerName, ownerContact, signatureFormat);
    } catch (error) {
      console.error('Error in stamp-pdf-file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // Updated handler for Form 20-3 with signature format
  ipcMain.handle('process-form20-3', async (_event, data) => {
    try {
      const {
        inputPath,
        paymentType,
        financeCompanyId,
        customConfig = {},
        showroomName,
        ownerName,
        ownerContact,
        signatureFormat = 'png' // Accept signature format
      } = data;

      if (!inputPath || !paymentType) {
        return {
          success: false,
          error: 'Input path and payment type are required'
        };
      }

      return await processForm203WithOption(
        inputPath,
        paymentType,
        financeCompanyId,
        customConfig,
        showroomName,
        ownerName,
        ownerContact,
        signatureFormat // Pass it through
      );
    } catch (error) {
      console.error('Error in process-form20-3:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // Other handlers remain the same...
  ipcMain.handle('copy-mobile-to-website', async (_event, data) => {
    try {
      const { inputPath, showroomName, ownerName, ownerContact, fileName } = data;

      if (!inputPath || !showroomName || !ownerName || !ownerContact || !fileName) {
        return {
          success: false,
          error: 'Missing required parameters'
        };
      }

      const paths = getOwnerPaths(showroomName, ownerName, ownerContact);

      let targetFolderPath;
      if (fileName === '203.pdf') {
        targetFolderPath = paths.websitePath;
      } else {
        targetFolderPath = paths.finalPdfsPath;
      }

      const finalPath = path.join(targetFolderPath, fileName);

      await fs.mkdir(targetFolderPath, { recursive: true });
      await fs.copyFile(inputPath, finalPath);

      return {
        success: true,
        message: `File copied to ${fileName === '203.pdf' ? 'website' : 'Final PDFs'} folder as ${fileName}`,
        outputPath: finalPath,
        finalName: fileName
      };
    } catch (error) {
      console.error('Error copying file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  ipcMain.handle('select-pdf-for-preview', async (_event, data) => {
    try {
      const { defaultPath, documentType } = data;

      const dialogOptions = {
        title: `Select ${documentType || 'PDF'} to Preview`,
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
        properties: ['openFile']
      };

      if (defaultPath) {
        dialogOptions.defaultPath = defaultPath;
      }

      const result = await dialog.showOpenDialog(mainWindow, dialogOptions);

      if (result.canceled || result.filePaths.length === 0) {
        return {
          success: false,
          error: 'No file selected'
        };
      }

      const filePath = result.filePaths[0];
      const fileName = path.basename(filePath);

      return {
        success: true,
        filePath: filePath,
        fileName: fileName,
        documentType: documentType
      };
    } catch (error) {
      console.error('Error in select-pdf-for-preview:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  ipcMain.handle('get-stamping-rules', async (_event, documentType) => {
    const rules = DOCUMENT_CONFIG[documentType];
    if (!rules) {
      return {
        success: false,
        error: `Unknown document type: ${documentType}`
      };
    }

    return {
      success: true,
      documentType: documentType,
      rules: rules
    };
  });

  ipcMain.handle('get-stamp-preview', async (_event, data) => {
    try {
      const { showroomName } = data || {};
      if (!showroomName) {
        return {
          success: false,
          error: 'Showroom name is required'
        };
      }

      const { stampPath } = getStampPaths(showroomName, null, null);
      const stampBytes = await fs.readFile(stampPath);
      const base64 = stampBytes.toString('base64');

      return {
        success: true,
        stampData: `data:image/png;base64,${base64}`,
        stampPath: stampPath
      };
    } catch (error) {
      return {
        success: false,
        error: `Stamp not found at showroom`
      };
    }
  });

  ipcMain.handle('check-stamp-exists', async (_event, showroomName) => {
    try {
      if (!showroomName) {
        return { exists: false, error: 'Showroom name required' };
      }

      const { stampPath } = getStampPaths(showroomName);
      await fs.access(stampPath);
      return { exists: true, path: stampPath };
    } catch (error) {
      const { stampPath } = getStampPaths(showroomName);
      return { exists: false, path: stampPath };
    }
  });

  // Updated handlers for Form 20-2 and Form 20-1 with signature format
  ipcMain.handle('process-form20-2-finance', async (_event, data) => {
    try {
      const { inputPath, showroomName, ownerName, ownerContact, signatureFormat = 'png' } = data;

      if (!inputPath || !showroomName || !ownerName || !ownerContact) {
        return {
          success: false,
          error: 'Missing required parameters'
        };
      }

      const paths = getOwnerPaths(showroomName, ownerName, ownerContact);

      await fs.mkdir(paths.compressedFilesPath, { recursive: true });
      const outputPath = path.join(paths.compressedFilesPath, '202.pdf');

      const compressResult = await compressForm20Document(inputPath, outputPath, 60, 'Form20-2');

      if (compressResult.success) {
        const stampResult = await stampPDFWithRules(
          outputPath,
          outputPath,
          'form20-2',
          {},
          showroomName,
          ownerName,
          ownerContact,
          signatureFormat // Pass signature format
        );

        return {
          success: true,
          message: `Form 20-2 processed for finance: ${compressResult.finalSizeKB}KB (stamped)`,
          documentType: 'form20-2',
          finalName: '202.pdf',
          outputPath: outputPath,
          compressed: compressResult.compressed,
          stampApplied: stampResult.success
        };
      }

      return compressResult;
    } catch (error) {
      console.error('Error processing Form 20-2 for finance:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  ipcMain.handle('process-form20-1-finance', async (_event, data) => {
    try {
      const { inputPath, showroomName, ownerName, ownerContact } = data;

      if (!inputPath || !showroomName || !ownerName || !ownerContact) {
        return {
          success: false,
          error: 'Missing required parameters'
        };
      }

      const paths = getOwnerPaths(showroomName, ownerName, ownerContact);

      await fs.mkdir(paths.compressedFilesPath, { recursive: true });
      const outputPath = path.join(paths.compressedFilesPath, '201.pdf');

      const compressResult = await compressForm20Document(inputPath, outputPath, 50, 'Form20-1');

      return {
        success: true,
        message: `Form 20-1 processed for finance: ${compressResult.finalSizeKB}KB (no stamping)`,
        documentType: 'form20-1',
        finalName: '201.pdf',
        outputPath: outputPath,
        compressed: compressResult.compressed,
        stampApplied: false
      };
    } catch (error) {
      console.error('Error processing Form 20-1 for finance:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });
}

// Updated backward compatibility stampPDF function with signature format support
async function stampPDF(inputPath, outputPath, stampConfig) {
  const { showroomName, ownerName, ownerContact, signatureFormat = 'png' } = stampConfig;

  if (!showroomName) {
    return {
      success: false,
      error: 'Showroom name is required for stamping'
    };
  }

  try {
    const pdfBytes = await fs.readFile(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const { stampPath, signaturePath } = getStampPaths(showroomName, ownerName, ownerContact, signatureFormat);
    const stampBytes = await fs.readFile(stampPath);
    const stampImage = await pdfDoc.embedPng(stampBytes);

    let signatureImage = null;
    if (signaturePath && stampConfig.includeSignature !== false) {
      try {
        const signatureData = await embedSignature(pdfDoc, signaturePath, stampConfig);
        if (signatureData) {
          signatureImage = signatureData.image;
        }
      } catch (error) {
        console.log('Signature not found, proceeding with stamp only');
      }
    }

    const stampWidth = stampConfig.width || 100;
    const stampHeight = stampConfig.height || 100;
    const pages = pdfDoc.getPages();
    const page = pages[stampConfig.pageIndex || 0];
    const { width: pageWidth } = page.getSize();

    const x = stampConfig.x !== undefined ? stampConfig.x : pageWidth - stampWidth - 100;
    const y = stampConfig.y !== undefined ? stampConfig.y : 90;

    page.drawImage(stampImage, {
      x: x,
      y: y,
      width: stampWidth,
      height: stampHeight,
      rotate: stampConfig.rotation ? degrees(stampConfig.rotation) : undefined,
      opacity: stampConfig.opacity || 0.9
    });

    if (signatureImage && stampConfig.includeSignature !== false) {
      const signatureWidth = stampConfig.signatureWidth || 80;
      const signatureHeight = stampConfig.signatureHeight || 40;
      const signatureX = stampConfig.signatureX !== undefined ? stampConfig.signatureX : x + (stampWidth - signatureWidth) / 2;
      const signatureY = stampConfig.signatureY !== undefined ? stampConfig.signatureY : y - 60;

      page.drawImage(signatureImage, {
        x: signatureX,
        y: signatureY,
        width: signatureWidth,
        height: signatureHeight,
        opacity: stampConfig.signatureOpacity || 0.9
      });
    }

    const stampedPdfBytes = await pdfDoc.save();
    await fs.writeFile(outputPath, stampedPdfBytes);

    return {
      success: true,
      message: `PDF stamped successfully`,
      inputSize: pdfBytes.length,
      outputSize: stampedPdfBytes.length,
      outputPath: outputPath
    };
  } catch (error) {
    console.error('Error stamping PDF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

module.exports = {
  registerPdfStampHandlers,
  // Export internal functions to avoid linting warnings
  compressForm20Document
};
