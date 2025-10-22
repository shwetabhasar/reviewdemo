// src/owner/types/electronTypes.ts
export interface SyncOptions {}

export interface SyncProgress {
  current: number;
  total: number;
  owner: string;
  documentsProcessed?: number;
  totalDocuments?: number;
}

export interface SyncResults {
  totalOwners: number;
  processedOwners: number;
  totalDocuments: number;
  downloadedDocuments: number;
  errors: Array<{
    owner: string;
    document?: string;
    error: string;
  }>;
  syncTime?: number;
}

export interface PrintAllPDFsParams {
  showroomName: string;
  ownerName: string;
  ownerContact: string;
}

export interface PrintAllPDFsResult {
  success: boolean;
  message?: string;
  count: number;
  total?: number;
  errors?: Array<{ file: string; error: string }>;
  folderPath?: string;
}

export interface SaveCompressedImageResult {
  success: boolean;
  message?: string;
  savedPath?: string;
  fileName?: string;
  compressionRatio?: string;
  error?: string;
}

export interface WebsiteDocument {
  sourceFolder: any;
  key: any;
  fileName: string;
  size: number;
  localPath: string;
  isLocal: boolean;
  documentType: string;
  downloadedAt: Date;
  modifiedAt: Date;
}

export interface WebsiteDownloadStats {
  active: number;
  completed: number;
  failed: number;
  total: number;
}

// Compression-related types
export interface CompressionProgress {
  status: 'starting' | 'compressing' | 'completed' | 'error';
  fileName: string;
  originalSize?: number;
  compressedSize?: number;
  compressionRatio?: string;
  method?: string;
  message?: string;
  error?: string;
}

export interface CompressionCapabilities {
  ghostscript: boolean;
  pdfLib: boolean;
  recommended: 'ghostscript' | 'pdf-lib';
}

export interface CompressionOptions {
  id: 'split' | 'extreme' | 'extract';
  label: string;
  description: string;
}

// Update CompressionResult interface (around line 64)
export interface CompressionResult {
  success: boolean;
  originalSize?: number;
  compressedSize?: number;
  compressionRatio?: string;
  method?: string;
  message?: string;
  error?: string;
  newFileName?: string;
  newFilePath?: string; // ADD THIS - full path of compressed file
  attemptedSize?: number;
  requiresAction?: boolean;
  analysis?: {
    compressionRatioNeeded: number;
    [key: string]: any;
  };
  options?: CompressionOptions[];
}

// PDF Merger types
export interface Form20FileInfo {
  fileName: string;
  path: string;
  size: number;
  sizeKB: string;
}

export interface Form20CheckResult {
  canMerge: boolean;
  foundFiles: Form20FileInfo[];
  missingFiles: string[];
  totalSizeKB: string;
}

export interface MergeResult {
  success: boolean;
  outputPath?: string;
  size?: number;
  sizeKB?: number;
  pageCount?: number;
  message?: string;
  warning?: string | null;
  error?: string;
}

// PDF Stamp-related types
export interface StampConfig {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  opacity?: number;
  rotation?: number;
  pageIndex?: number;
  outputPath?: string;
  includeSignature?: boolean;
  signatureX?: number;
  signatureY?: number;
  signatureWidth?: number;
  signatureHeight?: number;
  signatureOpacity?: number;
  documentType?: string;
  defaultPath?: string;
  showroomName?: string;
  ownerName?: string;
  ownerContact?: string;
  signatureFormat?: 'png' | 'svg';
  // ADD THESE NEW PROPERTIES:
  stampWidth?: number;
  stampHeight?: number;
  stampOpacity?: number;
}

export interface ProcessSignatureParams {
  inputPath: string;
  outputFolder: string;
  deleteOriginal?: boolean;
  createPng?: boolean; // New: whether to create PNG (false if input is already PNG)
  createSvg?: boolean; // New: whether to create SVG (usually true for signatures)
  preserveColors?: boolean;
  pngOptions?: {
    quality?: number;
    colors?: number;
    dither?: boolean;
  };
  svgOptions?: {
    preserveOriginalColors?: boolean;
    colorPrecision?: string;
    color?: string;
    threshold?: number;
    turnpolicy?: string;
    turdsize?: number;
    alphamax?: number;
    optcurve?: boolean;
    opttolerance?: number;
  };
}

export interface ProcessSignatureResult {
  success: boolean;
  message?: string;
  png?: {
    path: string;
    sizeKB: string;
    sizeBytes: number;
    wasOriginal?: boolean; // New: indicates if PNG was preserved from original
  };
  svg?: {
    path: string;
    sizeKB: string;
    sizeBytes: number;
  };
  compressionAttempts?: number;
  error?: string;
  colorPreserved?: boolean;
  sourceType?: string; // New: original file type (e.g., '.jpg', '.png')
}

export interface StampResult {
  success: boolean;
  message?: string;
  inputSize?: number;
  outputSize?: number;
  outputPath?: string;
  error?: string;
  skipReason?: string;
  documentType?: string;
  stampApplied?: boolean;
  signatureApplied?: boolean;
  pageNumber?: number;
  finalName?: string;
  originalDeleted?: boolean;
  replacedExisting?: boolean;
  copiedFromMobile?: boolean;
}

export interface MobileConnection {
  isConnected: boolean;
  serverUrl: string | null;
}

export interface MobileOwner {
  id: string;
  name: string;
  contact?: string;
  mobile?: string;
  showroomId?: string;
  documents?: number;
}

export interface MobileDocument {
  id: string;
  fileName: string;
  documentType: string;
  contentHash: string;
  fileSize: number;
  filePath?: string;
  uploadedAt?: string;
}

export interface MobileSyncResult {
  success: boolean;
  total: number;
  synced: number;
  skipped: number;
  failed: number;
  errors?: Array<{
    document: string;
    error: string;
  }>;
  path?: string;
}

export interface MobileShowroom {
  name: string;
  path: string;
  metadata?: any;
}

export interface StampPreview {
  success: boolean;
  stampData?: string;
  stampPath?: string;
  error?: string;
}

export interface MoveOwnerFolderParams {
  showroomName: string;
  ownerName: string;
  ownerContact: string;
  moveDate?: Date;
}

export interface MoveOwnerFolderResult {
  success: boolean;
  message?: string;
  error?: string;
  sourcePath?: string;
  targetPath?: string;
  archiveLocation?: string;
}

export interface StampExistsResult {
  exists: boolean;
  path: string;
}

export interface LocalDocument {
  fileName: string;
  size: number;
  localPath: string;
  isLocal: boolean;
  isOriginal?: boolean; // indicates if file is in Original folder
  isFromFinalPdfs?: boolean; // ADD THIS - indicates if file is from Final PDFs folder
  documentType?: string; // ADD THIS - file type (jpg, png, pdf, etc.)
  fileSize?: number; // for compatibility
  contentHash?: string; // for hash comparison
  hash?: string; // backward compatibility
  modifiedAt?: Date; // modification time
}

export interface RenameFileParams {
  oldPath: string;
  newPath: string;
}

export interface RenameFileResult {
  success: boolean;
  message?: string;
  newPath?: string;
  error?: string;
}

export interface ConvertJpgToPngParams {
  inputPath: string;
  outputPath: string;
  deleteOriginal?: boolean;
}

export interface ConvertJpgToPngResult {
  success: boolean;
  message?: string;
  outputPath?: string;
  sizeBytes?: number;
  sizeKB?: string;
  error?: string;
}

export interface SaveFileParams {
  filePath: string;
  base64Data: string;
}

export interface SaveFileResult {
  success: boolean;
  message?: string;
  savedPath?: string;
  sizeBytes?: number;
  sizeKB?: string;
  error?: string;
}

export interface IElectronAPI {
  // Folder operations
  createOwnerFolders: (data: { showroomName: string; owners?: any[] }) => Promise<{
    success: boolean;
    created?: number;
    existing?: number;
    total?: number;
    errors?: Array<{ owner: string; error: string }>;
    message?: string;
  }>;

  openOwnerFolder: (data: {
    showroomName: string;
    name: string;
    contact: string;
    folderType?: 'mobile' | 'website' | 'finalPdfs';
  }) => Promise<{
    success: boolean;
    path?: string;
    message?: string;
  }>;

  revertOwnerFolder: (data: { showroomName: string; ownerName: string; ownerContact: string }) => Promise<{
    success: boolean;
    message?: string;
    error?: string;
    sourcePath?: string;
    targetPath?: string;
    archivedFrom?: string;
    warning?: string;
    deleteError?: string;
    needsManualCleanup?: boolean; // ADD THIS
    archivedFolderDeleted?: boolean; // ADD THIS
  }>;

  moveOwnerFolder: (params: MoveOwnerFolderParams) => Promise<MoveOwnerFolderResult>;

  checkFolderExists: (path: string) => Promise<boolean>;

  // External URL operations
  openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;

  mobileConnect: (serverUrl: string) => Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }>;

  mobileDisconnect: () => Promise<{
    success: boolean;
  }>;

  mobileConnectionStatus: () => Promise<MobileConnection>;

  mobileGetShowrooms: () => Promise<{
    success: boolean;
    showrooms?: MobileShowroom[];
    error?: string;
  }>;

  mobileGetOwners: (showroomName: string) => Promise<{
    success: boolean;
    owners?: MobileOwner[];
    error?: string;
  }>;

  mobileSyncOwner: (data: { showroomName: string; owner: MobileOwner }) => Promise<{
    success: boolean;
    results?: MobileSyncResult;
    path?: string;
    error?: string;
  }>;

  processSignature: (params: ProcessSignatureParams) => Promise<ProcessSignatureResult>;

  mobileSyncShowroom: (showroomName: string) => Promise<{
    success: boolean;
    results?: {
      totalOwners: number;
      syncedOwners: number;
      failedOwners: number;
      details: Array<{
        owner: string;
        success: boolean;
        total?: number;
        synced?: number;
        skipped?: number;
        failed?: number;
        error?: string;
      }>;
    };
    error?: string;
  }>;

  mobileGetStorageReport: () => Promise<{
    success: boolean;
    report?: {
      totalSize: number;
      readableSize: string;
      showrooms: Array<{
        name: string;
        size: number;
        documentsCount: number;
        owners?: any[];
      }>;
      documentsCount: number;
    };
    error?: string;
  }>;

  openExternalWithDownloadPath?: (data: {
    url: string;
    showroomName: string;
    ownerName: string;
    ownerContact: string;
  }) => Promise<{ success: boolean; error?: string }>;

  createDownloadSession?: (data: {
    showroomName: string;
    ownerName: string;
    ownerContact: string;
  }) => Promise<{ success: boolean; downloadPath?: string; error?: string }>;

  selectPdfForPreview: (data: { defaultPath?: string; documentType?: string }) => Promise<{
    success: boolean;
    filePath?: string;
    fileName?: string;
    documentType?: string;
    error?: string;
  }>;

  copyDownloadPath: (data: {
    showroomName: string;
    ownerName: string;
    ownerContact: string;
  }) => Promise<{ success: boolean; message?: string; path?: string; error?: string }>;

  renameFile: (params: RenameFileParams) => Promise<RenameFileResult>;
  convertJpgToPng: (params: ConvertJpgToPngParams) => Promise<ConvertJpgToPngResult>;
  saveFile: (params: SaveFileParams) => Promise<SaveFileResult>;

  // Local document operations
  listLocalDocuments: (data: {
    showroomName: string;
    name?: string;
    ownerName?: string;
    contact?: string;
    ownerContact?: string;
    includeOriginalFolder?: boolean;
  }) => Promise<{
    success: boolean;
    documents: LocalDocument[];
    mobileCount?: number;
    originalCount?: number;
    error?: string;
  }>;

  listDocumentStatus: (data: { showroomName: string; ownerName: string; ownerContact: string }) => Promise<{
    success: boolean;
    status: 'completed' | 'pending';
    details: {
      jpgCount: number;
      pdfCount: number;
      jpgFiles: string[];
      pdfFiles: string[];
      missingPdfs: string[];
    };
    error?: string;
  }>;

  listLocalDocumentsForSync: (data: {
    showroomName: string;
    name?: string;
    ownerName?: string;
    contact?: string;
    ownerContact?: string;
  }) => Promise<{
    success: boolean;
    documents: LocalDocument[];
    error?: string;
  }>;

  listLocalDocumentsForDisplay: (data: {
    showroomName: string;
    name?: string;
    ownerName?: string;
    contact?: string;
    ownerContact?: string;
  }) => Promise<{
    success: boolean;
    documents: LocalDocument[];
    error?: string;
  }>;

  // PDF Merger operations
  checkForm20MergeReady: (data: { showroomName: string; ownerName: string; ownerContact: string }) => Promise<{
    success: boolean;
    canMerge?: boolean;
    foundFiles?: Form20FileInfo[];
    missingFiles?: string[];
    totalSizeKB?: string;
    error?: string;
  }>;

  getLocalFileData: (filePath: string) => Promise<{
    success: boolean;
    data?: string; // base64 encoded file data
    size?: number;
    error?: string;
  }>;

  convertPdfToJpeg: (data: {
    pdfPath: string;
    jpegPath: string;
    quality?: number; // 1-100, default 100
    dpi?: number; // default 300
  }) => Promise<{
    success: boolean;
    jpegPath?: string;
    jpegSize?: number;
    jpegSizeKB?: string;
    error?: string;
  }>;

  getPdfPageCount: (filePath: string) => Promise<{ success: boolean; pageCount?: number; error?: string }>;
  extractPdfPage: (data: { inputPath: string; outputPath: string; pageNumber: number }) => Promise<{
    success: boolean;
    originalSize?: number;
    newSize?: number;
    pageExtracted?: number;
    totalPages?: number;
    outputPath?: string;
    error?: string;
  }>;

  deleteFile: (data: { filePath: string }) => Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }>;

  mergeForm20Documents: (data: { showroomName: string; ownerName: string; ownerContact: string }) => Promise<MergeResult>;

  mergePdfs: (data: { inputPaths: string[]; outputPath: string; targetSizeKB?: number }) => Promise<MergeResult>;

  processForm203: (data: {
    inputPath: string;
    paymentType: 'cash' | 'finance' | 'mobile';
    financeCompanyId?: string; // This is already optional with ?
    signatureFormat?: 'png' | 'svg';
    customConfig?: StampConfig;
    showroomName: string;
    ownerName: string;
    ownerContact: string;
  }) => Promise<StampResult>;

  // NEW: Copy file from mobile to website folder
  copyMobileToWebsite: (data: {
    inputPath: string;
    showroomName: string;
    ownerName: string;
    ownerContact: string;
    fileName: string;
  }) => Promise<{
    success: boolean;
    message?: string;
    outputPath?: string;
    finalName?: string;
    error?: string;
  }>;

  createFolderIfNotExists: (data: {
    showroomName: string;
    name: string;
    contact: string;
    folderType?: 'mobile' | 'website' | 'finalPdfs' | 'compressed_files' | string;
  }) => Promise<{
    success: boolean;
    existed?: boolean;
    path?: string;
    message?: string;
  }>;

  getLocalFileUrl: (filePath: string) => Promise<{
    success: boolean;
    dataUrl?: string;
    error?: string;
  }>;

  // Add these to the IElectronAPI interface in electronTypes.ts

  selectImageForCompression: (data: { defaultPath: string; showroomName: string; ownerName: string; ownerContact: string; documentTypeKey?: string }) => Promise<{
    success: boolean;
    canceled?: boolean;
    inputPath?: string;
    outputPath?: string;
    fileName?: string;
    outputFileName?: string;
    fileData?: string;
    mimeType?: string;
    error?: string;
  }>;

  printAllOwnerPDFs: (params: PrintAllPDFsParams) => Promise<PrintAllPDFsResult>;

  getFileStats: (filePath: string) => Promise<{
    success: boolean;
    size?: number;
    fileName?: string;
    isFile?: boolean;
    isDirectory?: boolean;
    modifiedTime?: Date;
    createdTime?: Date;
    error?: string;
  }>;

  openWebsiteDocument: (data: { websiteFolderPath: string; possibleFileNames: string[]; documentKey: string }) => Promise<{
    success: boolean;
    fileName?: string;
    path?: string;
    error?: string;
  }>;

  saveCompressedImageToFolder: (data: { outputPath: string; base64Data: string; originalSize: number; compressedSize: number }) => Promise<{
    success: boolean;
    message?: string;
    outputPath?: string;
    error?: string;
  }>;

  saveCompressedImage: (data: {
    showroomName: string;
    ownerName: string;
    ownerContact: string;
    fileName: string;
    base64Data: string;
    originalSize: number;
    compressedSize: number;
  }) => Promise<{
    success: boolean;
    message?: string;
    backupFile?: string;
    compressionRatio?: string;
    error?: string;
  }>;

  // NEW METHOD: Move images to Original folder
  moveImagesToOriginalFolder: (data: {
    showroomName: string;
    ownerName: string;
    ownerContact: string;
    originalImagePath: string;
    compressedImagePath: string;
  }) => Promise<{
    success: boolean;
    message?: string;
    error?: string;
    movedFile?: string; // ADD THIS - filename that was moved
    destination?: string; // ADD THIS - where file was moved to
    movedFiles?: Array<{
      // This can stay for backward compatibility
      fileName: string;
      from: string;
      to: string;
    }>;
    originalFolderPath?: string;
  }>;

  // Website Download Management APIs
  openWebsiteForDocument: (data: { documentKey: string; showroomName: string; ownerName: string; ownerContact: string }) => Promise<{
    success: boolean;
    portal?: string;
    message?: string;
    error?: string;
  }>;

  getWebsiteDownloadStats: () => Promise<WebsiteDownloadStats>;

  listWebsiteDocuments: (data: { showroomName: string; ownerName: string; ownerContact: string }) => Promise<{
    success: boolean;
    documents: WebsiteDocument[];
    error?: string;
  }>;

  openWebsiteFolder: (data: { showroomName: string; ownerName: string; ownerContact: string }) => Promise<{
    success: boolean;
    path?: string;
    error?: string;
  }>;

  closeAllPortalWindows: () => Promise<{
    success: boolean;
  }>;

  deleteLocalFile: (data: {
    showroomName: string;
    name?: string;
    ownerName?: string;
    contact?: string;
    ownerContact?: string;
    fileName: string;
  }) => Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }>;

  getWebsiteDocumentUrl: (data: { websiteFolderPath: string; possibleFileNames: string[]; documentKey: string }) => Promise<{
    success: boolean;
    dataUrl?: string;
    fileName?: string;
    path?: string;
    error?: string;
  }>;

  convertImageToPdf: (data: {
    imagePath: string;
    showroomName: string;
    ownerName: string;
    ownerContact: string;
    targetSizeKB?: number;
    outputFileName?: string;
  }) => Promise<{
    success: boolean;
    pdfPath?: string;
    pdfFileName?: string;
    pdfSize?: number;
    pdfSizeKB?: string;
    originalImagePath?: string; // ADDED THIS
    message?: string;
    error?: string;
  }>;

  // Add these to the IElectronAPI interface:

  compressImageToTarget: (data: { imagePath: string; documentType: string; targetSizeKB: number; outputPath: string }) => Promise<{
    success: boolean;
    outputPath?: string;
    originalSize?: number;
    compressedSize?: number;
    compressionRatio?: string;
    finalQuality?: number;
    finalDimensions?: {
      width: number;
      height: number;
    };
    error?: string;
  }>;

  createA4PdfFromCompressedImage: (data: { imagePath: string; outputPath: string }) => Promise<{
    success: boolean;
    outputPath?: string;
    pdfSize?: number;
    pdfSizeKB?: string;
    error?: string;
  }>;

  getFileSize: (filePath: string) => Promise<{
    success: boolean;
    sizeBytes?: number;
    sizeKB?: string;
    sizeMB?: string;
    error?: string;
  }>;

  copyFile: (data: { sourcePath: string; destinationPath: string }) => Promise<{
    success: boolean;
    destinationPath?: string;
    sizeBytes?: number;
    sizeKB?: string;
    error?: string;
  }>;

  getLocalFileInfo: (filePath: string) => Promise<{
    success: boolean;
    size?: number;
    fileName?: string;
    isFile?: boolean;
    isDirectory?: boolean;
    modifiedTime?: Date;
    createdTime?: Date;
    error?: string;
  }>;

  // Update the compressPDF method (around line 358)
  compressPDF: (data: {
    showroomName: string;
    name?: string;
    ownerName?: string;
    contact?: string;
    ownerContact?: string;
    fileName: string;
    filePath?: string; // ADD THIS - optional full file path
    outputFileName?: string;
  }) => Promise<CompressionResult>;

  checkCompressionCapabilities: () => Promise<{
    success: boolean;
    capabilities?: CompressionCapabilities;
    error?: string;
  }>;

  splitPDF?: (data: { showroomName: string; ownerName: string; ownerContact: string; fileName: string; pagesPerFile?: number }) => Promise<{
    success: boolean;
    splitFiles?: string[];
    compressedFiles?: Array<{
      original: string;
      compressed: string;
      size: number;
    }>;
    totalPages?: number;
    error?: string;
  }>;

  // In electronTypes.ts, add to IElectronAPI interface:
  checkPortalBrowserPreference?: (documentKey: string) => Promise<{
    preferExternal: boolean;
    portalName: string;
  }>;

  extremeCompressPDF?: (data: { showroomName: string; ownerName: string; ownerContact: string; fileName: string }) => Promise<{
    success: boolean;
    newFileName?: string;
    size?: number;
    sizeKB?: string;
    warning?: string;
    error?: string;
  }>;

  extractPDFImages?: (data: { showroomName: string; ownerName: string; ownerContact: string; fileName: string }) => Promise<{
    success: boolean;
    images?: string[];
    error?: string;
  }>;

  // PDF Stamping operations
  selectAndStampPdf: (stampConfig?: StampConfig) => Promise<StampResult>;

  stampPdfFile: (data: { inputPath: string; stampConfig?: StampConfig }) => Promise<StampResult>;

  getStampPreview: () => Promise<StampPreview>;

  checkStampExists: () => Promise<StampExistsResult>;

  stampWebsiteDocument: (data: {
    documentType: string;
    defaultPath?: string; // ADD THIS LINE
    showroomName?: string; // ADD THIS
    ownerName?: string; // ADD THIS
    ownerContact?: string; // ADD THIS
    customConfig?: {
      stampWidth?: number;
      stampHeight?: number;
      stampOpacity?: number;
      signatureWidth?: number;
      signatureHeight?: number;
      signatureOpacity?: number;
    };
  }) => Promise<StampResult>;

  getStampingRules: (documentType: string) => Promise<{
    success: boolean;
    documentType?: string;
    rules?: {
      stamp: boolean;
      signature: boolean;
      position?: string;
      pageIndex?: number;
      skipStamping?: boolean;
      note?: string;
    };
    error?: string;
  }>;

  // Firebase sync operations
  syncFirebaseDocuments: (data: {
    showroomName: string;
    owners: Array<{
      name: string;
      contact?: string;
      mobile?: string;
      documents?: Array<{
        fileName?: string;
        name?: string;
        url?: string;
        downloadURL?: string;
        documentType?: string;
      }>;
    }>;
    options?: SyncOptions;
  }) => Promise<{
    success: boolean;
    paused?: boolean;
    results?: SyncResults;
    error?: string;
  }>;

  syncOwnerDocuments: (data: {
    showroomName: string;
    owner: {
      name: string;
      contact?: string;
      mobile?: string;
      documents?: Array<{
        fileName?: string;
        name?: string;
        url?: string;
        downloadURL?: string;
        documentType?: string;
        version?: number; // Add this
        storagePath?: string; // Add this
        isUploaded?: boolean; // Add this
        uploadedStatus?: string; // Add this
        metadata?: {
          // Add this
          md5Hash?: string;
          fileSize?: number;
          generation?: string;
          contentType?: string;
          uploadedAt?: string;
          uploadStatus?: string;
        };
        contentHash?: string; // Add this for backward compatibility
      }>;
      modifiedAt?: string | Date; // ADD THIS
      totalDocuments?: number; // ADD THIS
    };
    options?: SyncOptions;
    autoSync?: boolean;
  }) => Promise<{
    success: boolean;
    ownerPath?: string;
    results?: {
      documentsProcessed: number;
      documentsDownloaded: number;
      documentsUpdated?: number;
      documentsDeleted?: number;
      documentsSkipped?: number;
      documentsRenamed?: number;
      errors: Array<{
        document: string;
        error: string;
      }>;
    };
    error?: string;
  }>;

  saveFinanceStamp: (data: {
    companyName: string;
    stampData: string;
    fileName: string;
    isUpdate?: boolean;
    showroomName: string;
  }) => Promise<{
    success: boolean;
    localPath?: string;
    fileName?: string;
    error?: string;
  }>;

  cleanupDeletedOwnerFoldersV2: (data: { showroomName: string; activeOwners: Array<{ name: string; contact: string }> }) => Promise<{
    success: boolean;
    deletedCount?: number;
    deletedFolders?: string[];
    skippedCount?: number;
    totalFolders?: number;
    errors?: Array<{ folder: string; error: string }>;
    error?: string;
  }>;

  openFinanceStampFolder: (showroomName: string) => Promise<{
    success: boolean;
    path?: string;
    error?: string;
  }>;

  getFinanceStamp: (
    companyName: string,
    showroomName: string
  ) => Promise<{
    success: boolean;
    stampData?: string;
    localPath?: string;
    fileName?: string;
    error?: string;
  }>;

  deleteFinanceStamp: (
    companyName: string,
    showroomName: string
  ) => Promise<{
    success: boolean;
    deletedCount?: number;
    message?: string;
    error?: string;
  }>;

  openFolder: (path: string) => Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }>;

  listFinanceStamps: (showroomName: string) => Promise<{
    success: boolean;
    stamps?: Array<{
      fileName: string;
      companyName: string;
      path: string;
      size: number;
      createdAt: Date;
      modifiedAt: Date;
    }>;
    error?: string;
  }>;

  // Progress listeners
  onSyncProgress: (callback: (progress: SyncProgress) => void) => void;
  removeSyncProgressListener: () => void;
  onCompressionProgress: (callback: (progress: CompressionProgress) => void) => void;
  removeCompressionProgressListener: () => void;

  // Document operations (legacy - optional)
  saveDocument?: (data: { name: string; fileData: string; documentType: string; firstFive: string }) => Promise<{
    success: boolean;
    path?: string;
    error?: string;
  }>;

  readDocument?: (filePath: string) => Promise<{
    success: boolean;
    data?: string;
    mimeType?: string;
    error?: string;
  }>;

  listOwnerDocuments?: (name: string) => Promise<{
    success: boolean;
    documents?: Array<{
      fileName: string;
      documentType: string;
      firstFive: string;
      path: string;
    }>;
    error?: string;
  }>;

  deleteDocument?: (filePath: string) => Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
    fs?: {
      readFile: (filepath: string, options?: { encoding?: string }) => Promise<string | Uint8Array>;
    };
  }
}
