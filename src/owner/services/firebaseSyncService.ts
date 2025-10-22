// src/owner/services/firebaseSyncService.ts
import { IOwner } from 'owner/types/IOwner';
import { SyncOptions } from 'owner/types/electronTypes';

class FirebaseSyncService {
  /**
   * Sync a single owner's documents
   */
  async syncOwnerDocuments(
    showroomName: string,
    owner: IOwner,
    options?: SyncOptions
  ): Promise<{ success: boolean; ownerPath?: string; results?: any; error?: string }> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      // Log sync details for debugging
      console.log(`[FirebaseSync] Starting sync for ${owner.name}`);
      console.log(`[FirebaseSync] Documents to sync: ${owner.documents?.length || 0}`);
      console.log(`[FirebaseSync] Owner modifiedAt: ${owner.modifiedAt}`);

      // Ensure documents have proper metadata including server hash and version
      const documentsWithHash = (owner.documents || []).map((doc) => {
        // Log document details for debugging
        if (doc.metadata?.md5Hash) {
          console.log(`[FirebaseSync] Document ${doc.fileName}: MD5=${doc.metadata.md5Hash}, Version=${doc.version || 1}`);
        }

        return {
          fileName: doc.fileName,
          url: doc.url || doc.downloadURL,
          downloadURL: doc.downloadURL || doc.url,
          documentType: doc.documentType,

          // IMPORTANT: Include version from document level
          version: doc.version || 1,

          // Storage path if available
          storagePath: doc.storagePath || '',

          // Upload status
          isUploaded: doc.isUploaded !== false, // Default to true
          uploadedStatus: doc.uploadedStatus || 'completed',

          // Server hash for comparison (KEY FIELD)
          contentHash: doc.metadata?.md5Hash || '',

          // Full metadata object
          metadata: {
            md5Hash: doc.metadata?.md5Hash || '',
            fileSize: doc.metadata?.fileSize || doc.size || 0,
            generation: doc.metadata?.generation || '',
            contentType: doc.metadata?.contentType || '',
            uploadedAt: doc.metadata?.uploadedAt || '',
            uploadStatus: doc.metadata?.uploadStatus || 'completed'

            // DON'T include these - they don't belong in metadata:
            // - contentHash (redundant with md5Hash)
            // - fileName (at document level)
            // - downloadURL (at document level)
          }
        };
      });

      // Filter out documents that aren't ready for sync
      const syncableDocuments = documentsWithHash.filter((doc) => {
        if (!doc.isUploaded) {
          console.log(`[FirebaseSync] Skipping ${doc.fileName} - not uploaded`);
          return false;
        }
        if (doc.uploadedStatus === 'failed') {
          console.log(`[FirebaseSync] Skipping ${doc.fileName} - upload failed`);
          return false;
        }
        if (!doc.url && !doc.downloadURL) {
          console.log(`[FirebaseSync] Skipping ${doc.fileName} - no download URL`);
          return false;
        }
        return true;
      });

      console.log(`[FirebaseSync] Syncable documents: ${syncableDocuments.length}/${documentsWithHash.length}`);

      // If no documents to sync, return early
      if (syncableDocuments.length === 0) {
        console.log(`[FirebaseSync] No documents to sync for ${owner.name}`);
        return {
          success: true,
          ownerPath: '',
          results: {
            documentsProcessed: 0,
            documentsSkipped: documentsWithHash.length
          }
        };
      }

      // Call Electron API with properly formatted documents
      const result = await window.electronAPI.syncOwnerDocuments({
        showroomName,
        owner: {
          name: owner.name,
          contact: owner.contact,
          documents: syncableDocuments,

          // Include owner metadata for better sync tracking
          modifiedAt: owner.modifiedAt?.toISOString ? owner.modifiedAt.toISOString() : owner.modifiedAt,
          totalDocuments: owner.totalDocuments || syncableDocuments.length
        },
        options: {
          ...options,
          // Add sync metadata
          syncTimestamp: new Date().toISOString(),
          ownerVersion: owner.modifiedAt // Use modifiedAt as version indicator
        }
      });

      // Log results
      if (result.success) {
        console.log(`[FirebaseSync] ✓ Sync successful for ${owner.name}`);
        console.log(`[FirebaseSync] Results:`, result.results);
      } else {
        console.error(`[FirebaseSync] ✗ Sync failed for ${owner.name}:`, result.error);
      }

      return result;
    } catch (error) {
      console.error('[FirebaseSync] Error syncing owner documents:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if a document needs syncing based on hash
   */
  needsSync(localHash: string | undefined, remoteHash: string | undefined): boolean {
    // If either hash is missing, sync to be safe
    if (!localHash || !remoteHash) {
      return true;
    }

    // Compare hashes (both should be base64 MD5)
    return localHash !== remoteHash;
  }

  /**
   * Batch sync multiple owners
   */
  async batchSyncOwners(
    showroomName: string,
    owners: IOwner[],
    options?: SyncOptions
  ): Promise<{ successful: number; failed: number; results: any[] }> {
    const results: any[] = [];
    let successful = 0;
    let failed = 0;

    for (const owner of owners) {
      const result = await this.syncOwnerDocuments(showroomName, owner, options);

      if (result.success) {
        successful++;
      } else {
        failed++;
      }

      results.push({
        ownerName: owner.name,
        ownerId: owner.id,
        ...result
      });
    }

    return { successful, failed, results };
  }
}

// eslint-disable-next-line import/no-anonymous-default-export
export default new FirebaseSyncService();
