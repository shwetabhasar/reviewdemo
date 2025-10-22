// electron/pdfCompressor.js
const fs = require('fs').promises;
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');
const path = require('path');
const os = require('os');
const pdfPoppler = require('pdf-poppler');

// ----- Pretty logging helpers -----
function _fmtKB(bytes) {
  if (bytes == null) return '-';
  return `${(bytes / 1024).toFixed(1)}KB`;
}
function _pct(before, after) {
  if (before == null || after == null) return '-';
  const p = (1 - after / before) * 100;
  return `${p.toFixed(1)}%`;
}
function _logSummary(method, beforeBytes, afterBytes, band, success, error) {
  if (!success) {
    console.log(`[PDFCompressor] [${method}] FAILED ${error ? `→ ${error}` : ''}`);
    return;
  }
  const deltaKB = afterBytes == null ? '-' : `${((afterBytes - beforeBytes) / 1024).toFixed(1)}KB`;
  const pct = _pct(beforeBytes, afterBytes);
  const met = afterBytes == null ? '-' : afterBytes / 1024 >= band.min && afterBytes / 1024 <= band.max ? 'Yes' : 'No';
  console.log(
    `[PDFCompressor] [${method}] Before: ${_fmtKB(beforeBytes)} | After: ${_fmtKB(afterBytes)} | Δ ${deltaKB} (${pct}) | in ${band.min}-${band.max}KB: ${met}`
  );
}

// Default “tight band” around 290KB
const DEFAULT_BAND = { min: 275, max: 295, target: 290 };

class PDFCompressor {
  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'pdf-compress');

    try {
      require('pdf-lib');
      console.log('[PDFCompressor] pdf-lib is available');
    } catch (e) {
      console.error('[PDFCompressor] pdf-lib is NOT installed!');
    }

    try {
      require('sharp');
      console.log('[PDFCompressor] sharp is available');
    } catch (e) {
      console.error('[PDFCompressor] sharp is NOT installed!');
    }
  }

  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Error creating temp directory:', error);
    }
  }

  /**
   * Compress to ~290 KB; “in-band” is 275–295 KB by default.
   * If input is 300 KB – 1000 MB, use Ghostscript first; otherwise go straight to image-based.
   */
  async compress(inputPath, outputPath, targetSizeKB = 290, opts = {}) {
    try {
      await this.ensureTempDir();
      const stats = await fs.stat(inputPath);
      const originalSizeKB = stats.size / 1024;

      console.log(`[PDFCompressor] Original size: ${originalSizeKB.toFixed(1)}KB`);

      if (originalSizeKB <= targetSizeKB) {
        await fs.copyFile(inputPath, outputPath);
        console.log(`[PDFCompressor] Already ≤ target. Copied as-is: ${_fmtKB(stats.size)}.`);
        return { success: true, originalSize: stats.size, compressedSize: stats.size, compressionRatio: '0', method: 'none' };
      }

      const hasGhostscript = await this.checkGhostscript();

      if (hasGhostscript && originalSizeKB >= 300 && originalSizeKB <= 1000 * 1024) {
        console.log('[PDFCompressor] Trying Ghostscript compression...');
        const result = await this.compressWithGhostscript(inputPath, outputPath, targetSizeKB, opts);
        if (result.success && result.compressedSize / 1024 >= 275 && result.compressedSize / 1024 <= 295) {
          return result; // in-band → done
        }
        console.log('[PDFCompressor] Ghostscript miss or fail → switching to image-based…');
      } else {
        console.log('[PDFCompressor] Ghostscript not available or input out of GS range; using image-based…');
      }

      // Fall back to image-based with the same opts
      return await this.compressViaImages(inputPath, outputPath, { min: 275, max: 295, target: 290 }, opts);
    } catch (error) {
      console.error('[PDFCompressor] Error:', error);
      return { success: false, error: error.message };
    }
  }

  async checkGhostscript() {
    try {
      const platform = process.platform;
      let gsCommand;

      switch (platform) {
        case 'win32':
          gsCommand = 'gswin64c';
          break;
        case 'darwin':
        case 'linux':
          gsCommand = 'gs';
          break;
        default:
          return false;
      }

      await execAsync(`${gsCommand} --version`);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Ghostscript pass.
   * We can’t precisely target a size, so we tune dpi & JPEGQ by required ratio,
   * then check if result lands within band.
   */
  async compressWithGhostscript(inputPath, outputPath, targetSizeKB, opts = {}) {
    let beforeBytes = null;
    try {
      const platform = process.platform;
      const gsCommand = platform === 'win32' ? 'gswin64c' : 'gs';

      const stats = await fs.stat(inputPath);
      beforeBytes = stats.size;

      const ratioNeeded = (targetSizeKB * 1024) / beforeBytes;
      let dpi, jpegQ, preset;
      if (ratioNeeded < 0.1) {
        dpi = 72;
        jpegQ = 45;
        preset = 'screen';
      } else if (ratioNeeded < 0.3) {
        dpi = 96;
        jpegQ = 50;
        preset = 'screen';
      } else if (ratioNeeded < 0.5) {
        dpi = 120;
        jpegQ = 60;
        preset = 'ebook';
      } else {
        dpi = 150;
        jpegQ = 65;
        preset = 'ebook';
      }

      const args = [
        '-sDEVICE=pdfwrite',
        '-dCompatibilityLevel=1.4',
        `-dPDFSETTINGS=/${preset}`,
        '-dNOPAUSE',
        '-dBATCH',
        '-dQUIET',

        // downsample/encode
        '-dDownsampleColorImages=true',
        '-dColorImageDownsampleType=/Bicubic',
        '-dColorImageDownsampleThreshold=1.5',
        '-dDownsampleGrayImages=true',
        '-dGrayImageDownsampleType=/Bicubic',
        '-dGrayImageDownsampleThreshold=1.5',
        '-dDownsampleMonoImages=true',
        '-dMonoImageDownsampleType=/Subsample',
        '-dMonoImageDownsampleThreshold=1.5',

        '-dAutoFilterColorImages=false',
        '-dAutoFilterGrayImages=false',
        '-sColorImageFilter=/DCTEncode',
        '-sGrayImageFilter=/DCTEncode',
        `-dJPEGQ=${jpegQ}`,

        `-dColorImageResolution=${dpi}`,
        `-dGrayImageResolution=${dpi}`,
        `-dMonoImageResolution=${dpi * 2}`,

        '-dDetectDuplicateImages=true',
        '-dEncodeColorImages=true',
        '-dEncodeGrayImages=true',
        '-dCompressFonts=true',
        '-dSubsetFonts=true'
      ];

      if (opts.grayscale) {
        // Convert all page content to grayscale
        // (these are the standard switches for GS → gray output)
        args.push(
          '-sProcessColorModel=DeviceGray',
          '-sColorConversionStrategy=Gray',
          '-dProcessColorModel=/DeviceGray',
          '-dConvertCMYKImagesToRGB=false' // ensure no odd conversions back to RGB
        );
      }

      args.push(`-sOutputFile="${outputPath}"`, `"${inputPath}"`);

      await execAsync(`${gsCommand} ${args.join(' ')}`);

      const compressedStats = await fs.stat(outputPath);
      _logSummary(`Ghostscript/${preset}${opts.grayscale ? ' (grayscale)' : ''}`, beforeBytes, compressedStats.size, targetSizeKB, true);

      return {
        success: true,
        originalSize: beforeBytes,
        compressedSize: compressedStats.size,
        compressionRatio: ((1 - compressedStats.size / beforeBytes) * 100).toFixed(1),
        method: `ghostscript:${preset}${opts.grayscale ? ':gray' : ''}`
      };
    } catch (error) {
      _logSummary('Ghostscript', beforeBytes, null, targetSizeKB, false, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Image-based, band-seeking compression (tight 275–295 KB by default).
   * 1) Binary search JPEG Q with 4:4:4 (text crisp)
   * 2) 4:2:0 if still big at Qmin
   * 3) Tiny per-page nudges
   * 4) Gentle downscale (≤8%)
   * 5) If undershoot, “inflate” with PNG to land in band
   */
  async compressViaImages(inputPath, outputPath, band, opts = {}) {
    // band = { min, max, target }, e.g. { min: 275, max: 295, target: 290 }
    const TOL = 2;
    const QMIN = 70;
    const QMAX = 100;
    const START_Q = 90;
    const DOWNSCALE_FLOOR = 0.92;
    const DOWNSCALE_STEP = 0.03;

    const applyReadabilityBoost = (sharpInst) => {
      // optional tiny boost to improve small text legibility after grayscale
      const boost = Math.max(0, Math.min(0.2, opts.contrastBoost ?? 0));
      if (boost > 0) {
        // linear(a, b): a = contrast scale (1 + boost*0.6), b = bias
        sharpInst = sharpInst.linear(1 + boost * 0.6, 0).gamma(1 - boost * 0.2);
      }
      return sharpInst;
    };

    let beforeBytes = null;

    const buildJpgPdf = async (pages, metas, perPageQ, subsampling = '4:4:4', scale = 1) => {
      const doc = await PDFDocument.create();
      for (let i = 0; i < pages.length; i++) {
        const imgPath = pages[i];
        const meta = metas[i] || {};
        let w = Math.max(1, meta.width || 0);
        let h = Math.max(1, meta.height || 0);
        if (scale !== 1 && w && h) {
          w = Math.max(1, Math.round(w * scale));
          h = Math.max(1, Math.round(h * scale));
        }
        const q = Array.isArray(perPageQ) ? perPageQ[i] : perPageQ;

        let s = sharp(imgPath).resize({ width: w, height: h, fit: 'fill', kernel: sharp.kernel.lanczos3 });
        if (opts.grayscale) s = s.grayscale();
        s = applyReadabilityBoost(s);

        const buf = await s
          .jpeg({
            quality: q,
            progressive: true,
            optimizeScans: true,
            chromaSubsampling: '4:4:4' // valid value; ignored for truly gray but fine
          })
          .toBuffer();

        const jpg = await doc.embedJpg(buf);
        const page = doc.addPage([w, h]);
        page.drawImage(jpg, { x: 0, y: 0, width: w, height: h });
      }
      return await doc.save({ useObjectStreams: true });
    };

    const buildMixedPngBump = async (pages, metas, jpgQ, pngIndex, pngCompressionLevel = 9) => {
      const doc = await PDFDocument.create();
      for (let i = 0; i < pages.length; i++) {
        const imgPath = pages[i];
        const meta = metas[i] || {};
        let w = Math.max(1, meta.width || 0);
        let h = Math.max(1, meta.height || 0);

        let s = sharp(imgPath).resize({ width: w, height: h, fit: 'fill', kernel: sharp.kernel.lanczos3 });
        if (opts.grayscale) s = s.grayscale();
        s = applyReadabilityBoost(s);

        let buf, embed, page;
        if (i === pngIndex) {
          buf = await s.png({ compressionLevel: pngCompressionLevel, adaptiveFiltering: true }).toBuffer();
          embed = await doc.embedPng(buf);
        } else {
          buf = await s.jpeg({ quality: jpgQ, progressive: true, optimizeScans: true, chromaSubsampling: '4:4:4' }).toBuffer();
          embed = await doc.embedJpg(buf);
        }
        page = doc.addPage([w, h]);
        page.drawImage(embed, { x: 0, y: 0, width: w, height: h });
      }
      return await doc.save({ useObjectStreams: true });
    };

    try {
      console.log('[PDFCompressor] Starting image-based band-seeking compression...');
      const stats = await fs.stat(inputPath);
      beforeBytes = stats.size;

      const pages = await this.extractPagesAsImages(inputPath);
      const metas = await Promise.all(
        pages.map((p) =>
          sharp(p)
            .metadata()
            .catch(() => ({}))
        )
      );

      // 1) First attempt @ START_Q
      let qLow = QMIN,
        qHigh = QMAX,
        q = START_Q;
      let bytes = await buildJpgPdf(pages, metas, q, '4:4:4', 1);
      let kb = bytes.length / 1024;

      if (kb >= band.min && kb <= band.max) {
        await fs.writeFile(outputPath, bytes);
        await this.cleanupTempFiles();
        _logSummary(`Image-based${opts.grayscale ? ' (grayscale)' : ''}`, beforeBytes, bytes.length, band.target, true);
        return {
          success: true,
          originalSize: beforeBytes,
          compressedSize: bytes.length,
          compressionRatio: ((1 - bytes.length / beforeBytes) * 100).toFixed(1),
          method: `image-based${opts.grayscale ? ':gray' : ''}`
        };
      }

      // 2) Binary search in Q
      let best = { bytes, kb, q, subsampling: '4:4:4', scale: 1, dist: Math.abs(kb - band.target) };
      for (let i = 0; i < 8; i++) {
        if (kb > band.max) qHigh = Math.min(qHigh, q - 1);
        else if (kb < band.min) qLow = Math.max(qLow, q + 1);
        else {
          if (Math.abs(kb - band.target) <= TOL) break;
          if (kb > band.target) qHigh = Math.min(qHigh, q - 1);
          else qLow = Math.max(qLow, q + 1);
        }
        if (qLow > qHigh) break;
        q = Math.floor((qLow + qHigh) / 2);
        const test = await buildJpgPdf(pages, metas, q, '4:4:4', 1);
        const testKB = test.length / 1024;
        const dist = Math.abs(testKB - band.target);
        const better = (testKB >= band.min && testKB <= band.max && !(best.kb >= band.min && best.kb <= band.max)) || dist < best.dist;
        if (better) best = { bytes: test, kb: testKB, q, subsampling: '4:4:4', scale: 1, dist };
        kb = testKB;
        if (kb >= band.min && kb <= band.max && Math.abs(kb - band.target) <= TOL) break;
      }

      // 3) If over band, tiny downscale then try 4:2:0
      if (best.kb > band.max) {
        let scale = 1.0;
        while (scale > DOWNSCALE_FLOOR && best.kb > band.max) {
          scale = +(scale - DOWNSCALE_STEP).toFixed(2);
          const test = await buildJpgPdf(pages, metas, best.q, best.subsampling, scale);
          const testKB = test.length / 1024;
          const dist = Math.abs(testKB - band.target);
          if (testKB <= best.kb) best = { bytes: test, kb: testKB, q: best.q, subsampling: best.subsampling, scale, dist };
          if (testKB >= band.min && testKB <= band.max) break;
        }
        if (best.kb > band.max) {
          const test = await buildJpgPdf(pages, metas, best.q, '4:2:0', best.scale);
          const testKB = test.length / 1024;
          const dist = Math.abs(testKB - band.target);
          if (testKB <= best.kb) best = { bytes: test, kb: testKB, q: best.q, subsampling: '4:2:0', scale: best.scale, dist };
        }
      }

      // 4) If below band, add one PNG page to bump size
      if (best.kb < band.min) {
        const areas = metas.map((m) => (m.width || 0) * (m.height || 0));
        const order = areas
          .map((a, i) => ({ a, i }))
          .sort((x, y) => x.a - y.a)
          .map((x) => x.i);

        let bumped = best;
        for (const idx of order) {
          for (let cl = 9; cl >= 0; cl--) {
            const mixed = await buildMixedPngBump(pages, metas, best.q, idx, cl);
            const mkb = mixed.length / 1024;
            const mdist = Math.abs(mkb - band.target);
            if (mdist < bumped.dist)
              bumped = { bytes: mixed, kb: mkb, q: best.q, subsampling: 'mixed-png', scale: best.scale, dist: mdist };
            if (mkb >= band.min && mkb <= band.max) {
              bumped = { ...bumped, bytes: mixed, kb: mkb, dist: mdist };
              break;
            }
          }
          if (bumped.kb >= band.min && bumped.kb <= band.max) break;
        }
        best = bumped;
      }

      await fs.writeFile(outputPath, best.bytes);
      await this.cleanupTempFiles();
      _logSummary(`Image-based${opts.grayscale ? ' (grayscale)' : ''}`, beforeBytes, best.bytes.length, band.target, true);

      return {
        success: true,
        originalSize: beforeBytes,
        compressedSize: best.bytes.length,
        compressionRatio: ((1 - best.bytes.length / beforeBytes) * 100).toFixed(1),
        method: `image-based${opts.grayscale ? ':gray' : ''}`
      };
    } catch (error) {
      await this.cleanupTempFiles();
      _logSummary('Image-based', beforeBytes, null, band.target, false, error.message);
      return { success: false, error: error.message };
    }
  }

  // ----- Rasterize PDF pages to PNGs (via pdf-poppler) -----
  async extractPagesAsImages(pdfPath) {
    const imagePaths = [];
    try {
      const opts = {
        format: 'png',
        out_dir: this.tempDir,
        out_prefix: path.basename(pdfPath, '.pdf'),
        page: null
      };
      await pdfPoppler.convert(pdfPath, opts);

      const files = await fs.readdir(this.tempDir);
      const prefix = opts.out_prefix;

      for (const file of files) {
        if (file.startsWith(prefix) && file.endsWith('.png')) {
          imagePaths.push(path.join(this.tempDir, file));
        }
      }

      // Sort by page number suffix "-<n>.png"
      imagePaths.sort((a, b) => {
        const pageNumA = parseInt(a.match(/-(\d+)\.png$/)?.[1] || '0', 10);
        const pageNumB = parseInt(b.match(/-(\d+)\.png$/)?.[1] || '0', 10);
        return pageNumA - pageNumB;
      });
    } catch (error) {
      console.error('[PDFCompressor] Error extracting images:', error);
      throw error;
    }
    return imagePaths;
  }

  // ----- Cleanup temp PNGs -----
  async cleanupTempFiles() {
    try {
      const files = await fs.readdir(this.tempDir);
      for (const file of files) {
        await fs.unlink(path.join(this.tempDir, file)).catch(() => {});
      }
    } catch (_) {
      // ignore
    }
  }
}

// Create single instance
const compressor = new PDFCompressor();

// Export the main compression function
async function compressPDF(inputPath, outputPath, targetSizeKB = 290, opts = {}) {
  return await compressor.compress(inputPath, outputPath, targetSizeKB, opts);
}

// Export other utility functions
async function analyzePDF(inputPath) {
  try {
    const stats = await fs.stat(inputPath);
    const sizeMB = stats.size / 1024 / 1024;
    return {
      originalSizeMB: sizeMB,
      targetSizeKB: DEFAULT_BAND.target,
      compressionRatioNeeded: (stats.size / 1024 / DEFAULT_BAND.target).toFixed(1),
      feasible: sizeMB < 1000, // arbitrary sanity bound
      recommendations: [{ action: 'compress', method: 'hybrid', description: 'Ghostscript → Image-based (band-seeking)' }]
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function checkGhostscriptInstalled() {
  return await compressor.checkGhostscript();
}

// For backward compatibility with extreme compression (not band-limited)
async function extremeCompression(inputPath, outputPath) {
  // Force image-based to ~100 KB (not used in normal band workflow)
  const band = { min: 95, max: 105, target: 100 };
  return await compressor.compressViaImages(inputPath, outputPath, band);
}

module.exports = {
  compressPDF,
  analyzePDF,
  checkGhostscriptInstalled,
  extremeCompression,
  splitPDF: async () => ({ success: false, error: 'Not implemented' }),
  extractImagesFromPDF: async () => ({ success: false, error: 'Not implemented' })
};
