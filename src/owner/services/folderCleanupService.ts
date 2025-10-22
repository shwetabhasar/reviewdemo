// src/owner/services/folderCleanupService.ts

export interface CleanupResult {
  success: boolean;
  deletedCount?: number;
  deletedFolders?: string[];
  skippedCount?: number;
  totalFolders?: number;
  errors?: Array<{ folder: string; error: string }>;
  error?: string;
}

class FolderCleanupService {
  /**
   * Clean up folders for deleted owners
   * Compares active owners in Firebase with folders on disk
   * and removes folders that don't have corresponding active owners
   */
  async cleanupDeletedOwnerFolders(showroomName: string, activeOwners: Array<{ name: string; contact: string }>): Promise<CleanupResult> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      if (!showroomName || !activeOwners) {
        throw new Error('Showroom name and active owners list required');
      }

      console.log(`Starting folder cleanup for showroom: ${showroomName}`);
      console.log(`Active owners count: ${activeOwners.length}`);

      // Call the Electron API to perform cleanup
      const result = await window.electronAPI.cleanupDeletedOwnerFoldersV2({
        showroomName,
        activeOwners
      });

      return result;
    } catch (error) {
      console.error('Error cleaning up folders:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Preview which folders would be deleted without actually deleting them
   */
  async previewCleanup(
    showroomName: string,
    activeOwners: Array<{ name: string; contact: string }>
  ): Promise<{
    foldersToDelete: string[];
    foldersToKeep: string[];
    error?: string;
  }> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      // This would require a separate Electron handler that only checks
      // without deleting. For now, we'll return a placeholder
      console.log('Preview cleanup not implemented yet');

      return {
        foldersToDelete: [],
        foldersToKeep: [],
        error: 'Preview not implemented'
      };
    } catch (error) {
      return {
        foldersToDelete: [],
        foldersToKeep: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export default new FolderCleanupService();
