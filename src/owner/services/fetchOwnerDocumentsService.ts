// src/owner/services/fetchOwnerDocumentsService.ts

import { IOwner, IOwnerWithSync } from '../types/IOwner';

interface FetchResult {
  success: boolean;
  ownerId: string;
  ownerName: string;
  documentsCount: number;
  downloadedFiles: string[];
  savePath?: string;
  error?: string;
  timestamp: Date;
  // ADD: Track sync details
  hashMatches?: number;
  hashMismatches?: number;
}

class FetchOwnerDocumentsService {
  private isFetching: boolean = false;
  private currentFetchId: string | null = null;

  /**
   * Fetch documents for a single selected owner only
   * This is a dedicated function that ONLY handles single owner document fetching
   */
  async fetchSingleOwnerDocuments(params: { showroomName: string; owner: IOwner | IOwnerWithSync }): Promise<FetchResult> {
    const { showroomName, owner } = params;

    // Prevent concurrent fetches
    if (this.isFetching) {
      return {
        success: false,
        ownerId: owner.id || '',
        ownerName: owner.name,
        documentsCount: 0,
        downloadedFiles: [],
        error: 'Another fetch operation is in progress',
        timestamp: new Date()
      };
    }

    // Validate that we have documents to fetch
    if (!owner.documents || owner.documents.length === 0) {
      return {
        success: false,
        ownerId: owner.id || '',
        ownerName: owner.name,
        documentsCount: 0,
        downloadedFiles: [],
        error: 'No documents to fetch for this owner',
        timestamp: new Date()
      };
    }

    this.isFetching = true;
    this.currentFetchId = owner.id || `${showroomName}_${owner.name}`;

    try {
      console.log(`[FetchService] Starting fetch for single owner: ${owner.name}`);
      console.log(`[FetchService] Documents to fetch: ${owner.documents.length}`);
      console.log(`[FetchService] Owner modifiedAt: ${owner.modifiedAt}`);

      // Check if Electron API is available
      if (!window.electronAPI) {
        throw new Error('Electron API not available - cannot fetch documents');
      }

      // Prepare documents with all required metadata for download
      const documentsToFetch = owner.documents.map((doc) => {
        // Log document details for debugging
        console.log(`[FetchService] Document ${doc.fileName}:`, {
          version: doc.version || 1,
          md5Hash: doc.metadata?.md5Hash || 'none',
          isUploaded: doc.isUploaded !== false,
          uploadedStatus: doc.uploadedStatus || 'unknown'
        });

        return {
          fileName: doc.fileName,
          url: doc.url || doc.downloadURL,
          downloadURL: doc.downloadURL || doc.url,
          documentType: doc.documentType,

          // ADD: Version from document level
          version: doc.version || 1,

          // ADD: Storage path if available
          storagePath: doc.storagePath || '',

          // ADD: Upload status
          isUploaded: doc.isUploaded !== false,
          uploadedStatus: doc.uploadedStatus || 'completed',

          // IMPORTANT: Server hash for comparison
          contentHash: doc.metadata?.md5Hash || '',

          // Updated metadata structure
          metadata: {
            md5Hash: doc.metadata?.md5Hash || '', // Server-calculated hash
            fileSize: doc.metadata?.fileSize || doc.size || 0,
            generation: doc.metadata?.generation || '',
            contentType: doc.metadata?.contentType || '',
            uploadedAt: doc.metadata?.uploadedAt || new Date().toISOString()

            // REMOVE these - they don't belong in metadata:
            // size -> use fileSize
            // lastModified -> use uploadedAt
          }
        };
      });

      // Filter out documents that aren't ready for download
      const downloadableDocuments = documentsToFetch.filter((doc) => {
        if (!doc.isUploaded) {
          console.log(`[FetchService] Skipping ${doc.fileName} - not uploaded`);
          return false;
        }
        if (doc.uploadedStatus === 'failed' || doc.uploadedStatus === 'pending') {
          console.log(`[FetchService] Skipping ${doc.fileName} - status: ${doc.uploadedStatus}`);
          return false;
        }
        if (!doc.url && !doc.downloadURL) {
          console.log(`[FetchService] Skipping ${doc.fileName} - no URL`);
          return false;
        }
        return true;
      });

      console.log(`[FetchService] Downloadable: ${downloadableDocuments.length}/${documentsToFetch.length}`);

      if (downloadableDocuments.length === 0) {
        return {
          success: false,
          ownerId: owner.id || '',
          ownerName: owner.name,
          documentsCount: 0,
          downloadedFiles: [],
          error: 'No documents ready for download',
          timestamp: new Date()
        };
      }

      // Call the Electron API to fetch ONLY this owner's documents
      const result = await window.electronAPI.syncOwnerDocuments({
        showroomName,
        owner: {
          name: owner.name,
          contact: owner.contact,
          documents: downloadableDocuments,

          // ADD: Owner metadata for sync tracking
          modifiedAt: owner.modifiedAt,
          totalDocuments: owner.totalDocuments || downloadableDocuments.length
        },
        options: {
          forceDownload: true, // Force re-download even if files exist
          createBackup: false, // Don't create backups
          singleOwnerOnly: true, // Single owner operation
          useServerHash: true // Use server MD5 hash for comparison
        }
      });

      if (result.success) {
        const downloadedFiles = downloadableDocuments.map((doc) => doc.fileName);

        console.log(`[FetchService] ✓ Successfully fetched documents for ${owner.name}`);
        console.log(`[FetchService] Results:`, {
          downloaded: result.results?.documentsDownloaded || 0,
          updated: result.results?.documentsUpdated || 0,
          skipped: result.results?.documentsSkipped || 0,
          errors: result.results?.errors?.length || 0
        });
        console.log(`[FetchService] Save path:`, result.ownerPath);

        return {
          success: true,
          ownerId: owner.id || '',
          ownerName: owner.name,
          documentsCount: downloadableDocuments.length,
          downloadedFiles,
          savePath: result.ownerPath,
          timestamp: new Date(),
          // ADD: Hash match statistics
          hashMatches: result.results?.documentsSkipped || 0,
          hashMismatches: result.results?.documentsUpdated || 0
        };
      } else {
        throw new Error(result.error || 'Failed to fetch documents');
      }
    } catch (error) {
      console.error(`[FetchService] ✗ Error fetching documents for ${owner.name}:`, error);

      return {
        success: false,
        ownerId: owner.id || '',
        ownerName: owner.name,
        documentsCount: 0,
        downloadedFiles: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date()
      };
    } finally {
      this.isFetching = false;
      this.currentFetchId = null;
    }
  }

  /**
   * Check if a fetch operation is currently in progress
   */
  isCurrentlyFetching(): boolean {
    return this.isFetching;
  }

  /**
   * Get the ID of the owner currently being fetched
   */
  getCurrentFetchId(): string | null {
    return this.currentFetchId;
  }

  /**
   * Cancel current fetch operation (if supported by Electron API)
   */
  async cancelCurrentFetch(): Promise<boolean> {
    if (!this.isFetching) {
      return false;
    }

    console.log(`[FetchService] Cancelling fetch for ${this.currentFetchId}`);

    // Reset flags
    this.isFetching = false;
    this.currentFetchId = null;

    return true;
  }

  /**
   * Validate owner before fetching
   */
  validateOwnerForFetch(owner: IOwner | IOwnerWithSync): {
    isValid: boolean;
    reason?: string;
  } {
    if (!owner) {
      return { isValid: false, reason: 'No owner provided' };
    }

    if (!owner.name) {
      return { isValid: false, reason: 'Owner name is required' };
    }

    if (!owner.documents || owner.documents.length === 0) {
      return { isValid: false, reason: 'No documents to fetch' };
    }

    // Check if all documents have valid URLs
    const invalidDocs = owner.documents.filter((doc) => !doc.url && !doc.downloadURL);

    if (invalidDocs.length > 0) {
      return {
        isValid: false,
        reason: `${invalidDocs.length} documents have no download URL`
      };
    }

    // ADD: Check for upload status
    const notUploadedDocs = owner.documents.filter(
      (doc) => doc.isUploaded === false || doc.uploadedStatus === 'pending' || doc.uploadedStatus === 'failed'
    );

    if (notUploadedDocs.length === owner.documents.length) {
      return {
        isValid: false,
        reason: 'All documents are pending or failed upload'
      };
    }

    return { isValid: true };
  }

  /**
   * Check if documents need sync based on owner's modifiedAt
   */
  needsSync(owner: IOwner | IOwnerWithSync): boolean {
    if (!owner.modifiedAt) return false;

    // Check if lastSynced exists and compare with modifiedAt
    if ('lastSynced' in owner && owner.lastSynced) {
      const lastSync = new Date(owner.lastSynced);
      const modified = new Date(owner.modifiedAt);
      return modified > lastSync;
    }

    // No sync history, needs sync
    return true;
  }
}

// Export singleton instance
export const fetchOwnerDocumentsService = new FetchOwnerDocumentsService();

// Also export the class for testing purposes
export { FetchOwnerDocumentsService };
