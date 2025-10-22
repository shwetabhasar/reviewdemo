// src/owner/services/autoSyncService.ts

import { IOwner, IOwnerWithSync } from '../types/IOwner';

interface SyncQueueItem {
  promise: Promise<any>;
  timestamp: number;
  ownerModifiedAt?: Date;
}

class AutoSyncService {
  private syncQueue: Map<string, SyncQueueItem> = new Map();
  private syncHistory: Map<string, number> = new Map();
  private MIN_SYNC_INTERVAL = 5000; // Minimum 5 seconds between syncs
  private ownerVersions: Map<string, Date> = new Map(); // Track owner modifiedAt

  /**
   * Automatically sync owner documents when changes detected
   * Prevents duplicate syncs and implements throttling
   */
  async autoSyncOwnerDocuments(params: {
    showroomName: string;
    owner: IOwner;
    forceSync?: boolean;
  }): Promise<{ success: boolean; results?: any; error?: string }> {
    const { showroomName, owner, forceSync = false } = params;
    const syncKey = `${showroomName}_${owner.id}`;

    // Check if sync is already in progress
    const existingSync = this.syncQueue.get(syncKey);
    if (existingSync) {
      console.log(`[AutoSync] Sync already in progress for ${owner.name}, waiting...`);
      return existingSync.promise;
    }

    // Check if owner's modifiedAt has changed (indicates document changes)
    const lastKnownModifiedAt = this.ownerVersions.get(syncKey);
    const currentModifiedAt = new Date(owner.modifiedAt);

    if (lastKnownModifiedAt && currentModifiedAt <= lastKnownModifiedAt && !forceSync) {
      console.log(`[AutoSync] No changes detected for ${owner.name} (modifiedAt unchanged)`);
      return { success: true, results: { skipped: true, reason: 'no_changes' } };
    }

    // Throttle syncs - prevent too frequent syncing
    if (!forceSync) {
      const lastSyncTime = this.syncHistory.get(syncKey);
      if (lastSyncTime) {
        const timeSinceLastSync = Date.now() - lastSyncTime;
        if (timeSinceLastSync < this.MIN_SYNC_INTERVAL) {
          console.log(`[AutoSync] Throttled for ${owner.name} - too soon (${timeSinceLastSync}ms)`);
          return { success: true, results: { skipped: true, reason: 'throttled' } };
        }
      }
    }

    // Create new sync promise
    const syncPromise = this.performSync(showroomName, owner);
    this.syncQueue.set(syncKey, {
      promise: syncPromise,
      timestamp: Date.now(),
      ownerModifiedAt: currentModifiedAt
    });

    try {
      const result = await syncPromise;

      // Update tracking on success
      if (result.success) {
        this.syncHistory.set(syncKey, Date.now());
        this.ownerVersions.set(syncKey, currentModifiedAt);
      }

      return result;
    } finally {
      this.syncQueue.delete(syncKey);
    }
  }

  /**
   * Perform the actual sync operation
   */
  private async performSync(showroomName: string, owner: IOwner): Promise<{ success: boolean; results?: any; error?: string }> {
    if (!window.electronAPI) {
      console.error('[AutoSync] Electron API not available');
      return {
        success: false,
        error: 'Electron API not available'
      };
    }

    try {
      console.log(`[AutoSync] Starting sync for ${owner.name}`);
      console.log(`[AutoSync] Owner modifiedAt: ${owner.modifiedAt}`);

      // Prepare documents for sync with all metadata
      const documentsToSync = (owner.documents || []).map((doc) => {
        // Log document details for debugging
        if (doc.metadata?.md5Hash) {
          console.log(`[AutoSync] Doc ${doc.fileName}: MD5=${doc.metadata.md5Hash}, V=${doc.version || 1}`);
        }

        return {
          fileName: doc.fileName,
          url: doc.url || doc.downloadURL,
          downloadURL: doc.downloadURL || doc.url,
          documentType: doc.documentType,

          // ADD: Version from document level
          version: doc.version || 1,

          // ADD: Storage and upload status
          storagePath: doc.storagePath || '',
          isUploaded: doc.isUploaded !== false,
          uploadedStatus: doc.uploadedStatus || 'completed',

          // Server hash for comparison (KEY FIELD)
          contentHash: doc.metadata?.md5Hash || '',

          // Full metadata
          metadata: {
            md5Hash: doc.metadata?.md5Hash || '',
            fileSize: doc.metadata?.fileSize || 0,
            generation: doc.metadata?.generation || '',
            contentType: doc.metadata?.contentType || '',
            uploadedAt: doc.metadata?.uploadedAt || '',
            uploadStatus: doc.metadata?.uploadStatus || 'completed'
          }
        };
      });

      // Filter out documents not ready for sync
      const syncableDocuments = documentsToSync.filter((doc) => {
        if (!doc.isUploaded) {
          console.log(`[AutoSync] Skipping ${doc.fileName} - not uploaded`);
          return false;
        }
        if (doc.uploadedStatus === 'pending' || doc.uploadedStatus === 'failed') {
          console.log(`[AutoSync] Skipping ${doc.fileName} - status: ${doc.uploadedStatus}`);
          return false;
        }
        if (!doc.url && !doc.downloadURL) {
          console.log(`[AutoSync] Skipping ${doc.fileName} - no URL`);
          return false;
        }
        return true;
      });

      if (syncableDocuments.length === 0) {
        console.log(`[AutoSync] No syncable documents for ${owner.name}`);
        return {
          success: true,
          results: {
            documentsProcessed: 0,
            documentsSkipped: documentsToSync.length,
            reason: 'no_syncable_documents'
          }
        };
      }

      console.log(`[AutoSync] Syncing ${syncableDocuments.length}/${documentsToSync.length} documents`);

      // Call Electron API for actual file sync
      const result = await window.electronAPI.syncOwnerDocuments({
        showroomName,
        owner: {
          name: owner.name,
          contact: owner.contact,
          documents: syncableDocuments,
          // ADD: Owner metadata for better tracking
          modifiedAt: owner.modifiedAt,
          totalDocuments: owner.totalDocuments || syncableDocuments.length
        },
        autoSync: true, // Flag for auto-sync mode
        // ADD: Options for better sync control
        options: {
          useServerHash: true,
          checkVersions: true
        }
      });

      if (result.success) {
        console.log(`[AutoSync] ✓ Synced ${owner.name}:`, {
          downloaded: result.results?.documentsDownloaded || 0,
          updated: result.results?.documentsUpdated || 0,
          deleted: result.results?.documentsDeleted || 0,
          skipped: result.results?.documentsSkipped || 0,
          processed: result.results?.documentsProcessed || 0,
          errors: result.results?.errors?.length || 0
        });
      } else {
        console.error(`[AutoSync] ✗ Failed to sync ${owner.name}:`, result.error);
      }

      return result;
    } catch (error) {
      console.error(`[AutoSync] Error syncing ${owner.name}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if owner needs sync based on modifiedAt
   */
  needsSync(showroomName: string, owner: IOwner | IOwnerWithSync): boolean {
    const syncKey = `${showroomName}_${owner.id}`;
    const lastKnownModifiedAt = this.ownerVersions.get(syncKey);
    const currentModifiedAt = new Date(owner.modifiedAt);

    // No previous sync or modifiedAt changed
    if (!lastKnownModifiedAt || currentModifiedAt > lastKnownModifiedAt) {
      return true;
    }

    // Check if it's been too long since last sync (e.g., 1 hour)
    const lastSyncTime = this.syncHistory.get(syncKey);
    if (lastSyncTime) {
      const hoursSinceSync = (Date.now() - lastSyncTime) / (1000 * 60 * 60);
      if (hoursSinceSync > 1) {
        return true;
      }
    }

    return false;
  }

  /**
   * Batch sync multiple owners
   */
  async batchSyncOwners(params: {
    showroomName: string;
    owners: IOwner[];
    concurrency?: number;
    onlyChanged?: boolean;
  }): Promise<{ successful: number; failed: number; skipped: number; results: any[] }> {
    const { showroomName, owners, concurrency = 3, onlyChanged = true } = params;
    const results: any[] = [];
    let successfulCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    // Filter owners if only syncing changed ones
    const ownersToSync = onlyChanged ? owners.filter((owner) => this.needsSync(showroomName, owner)) : owners;

    console.log(`[AutoSync] Batch sync: ${ownersToSync.length}/${owners.length} owners need sync`);

    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < ownersToSync.length; i += concurrency) {
      const batch = ownersToSync.slice(i, i + concurrency);

      const batchResults = await Promise.allSettled(batch.map((owner) => this.autoSyncOwnerDocuments({ showroomName, owner })));

      // Process results
      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const batchOwner = batch[j];

        if (result.status === 'fulfilled') {
          if (result.value.success) {
            if (result.value.results?.skipped) {
              skippedCount++;
            } else {
              successfulCount++;
            }
            results.push({ owner: batchOwner.name, ...result.value });
          } else {
            failedCount++;
            results.push({ owner: batchOwner.name, ...result.value });
          }
        } else {
          failedCount++;
          results.push({
            owner: batchOwner.name,
            error: result.reason instanceof Error ? result.reason.message : String(result.reason)
          });
        }
      }
    }

    console.log(`[AutoSync] Batch complete: ${successfulCount} successful, ${failedCount} failed, ${skippedCount} skipped`);
    return { successful: successfulCount, failed: failedCount, skipped: skippedCount, results };
  }

  /**
   * Clear sync history for an owner
   */
  clearSyncHistory(showroomName: string, ownerId: string): void {
    const syncKey = `${showroomName}_${ownerId}`;
    this.syncHistory.delete(syncKey);
    this.ownerVersions.delete(syncKey);
  }

  /**
   * Clear all sync history
   */
  clearAllHistory(): void {
    this.syncHistory.clear();
    this.ownerVersions.clear();
    this.syncQueue.clear();
  }

  /**
   * Get sync status
   */
  getSyncStatus(): {
    queueSize: number;
    activeSync: string[];
    recentSyncs: Array<{ owner: string; timestamp: number }>;
    needingSync: number;
  } {
    const activeSync = Array.from(this.syncQueue.keys());
    const recentSyncs = Array.from(this.syncHistory.entries())
      .map(([key, timestamp]) => ({
        owner: key.split('_').pop() || '',
        timestamp
      }))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);

    return {
      queueSize: this.syncQueue.size,
      activeSync,
      recentSyncs,
      needingSync: this.ownerVersions.size
    };
  }
}

// Export singleton instance
export const autoSyncService = new AutoSyncService();
