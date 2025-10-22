// src/services/folderService.ts
export interface FolderOperationResult {
  success: boolean;
  created?: number;
  existing?: number;
  total?: number;
  errors?: Array<{ owner: string; error: string }>;
  path?: string;
  message?: string;
  websiteFolderExists?: boolean;
  websitePath?: string;
}

class FolderService {
  /**
   * Create folders for all owners
   */
  async createOwnerFolders(showroomName: string, owners?: any[]): Promise<FolderOperationResult> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const result = await window.electronAPI.createOwnerFolders({ showroomName, owners });
      return result;
    } catch (error) {
      console.error('Error creating folders:', error);
      throw error;
    }
  }

  /**
   * Open a specific owner folder in file explorer
   */
  async openOwnerFolder(
    showroomName: string,
    name: string,
    contact: string,
    folderType?: 'mobile' | 'website' | 'finalPdfs'
  ): Promise<FolderOperationResult> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      // If no folderType specified, open root owner folder
      // Otherwise open the specific subfolder (mobile/website/finalPdfs)
      const result = await window.electronAPI.openOwnerFolder({
        showroomName,
        name,
        contact,
        folderType // undefined = root folder, or 'mobile'/'website'/'finalPdfs'
      });

      if (!result.success) {
        return result;
      }

      // Only create subfolders if we're opening the root folder
      if (!folderType) {
        // Create mobile folder if it doesn't exist
        await window.electronAPI.createFolderIfNotExists({
          showroomName,
          name,
          contact,
          folderType: 'mobile'
        });

        // Create website folder if it doesn't exist
        await window.electronAPI.createFolderIfNotExists({
          showroomName,
          name,
          contact,
          folderType: 'website'
        });

        // Create Final PDFs folder if it doesn't exist
        await window.electronAPI.createFolderIfNotExists({
          showroomName,
          name,
          contact,
          folderType: 'finalPdfs'
        });

        return {
          ...result,
          message: 'Owner folder opened successfully'
        };
      }

      return result;
    } catch (error) {
      console.error('Error opening folder:', error);
      throw error;
    }
  }

  async openFinalPdfsFolder(showroomName: string, name: string, contact: string): Promise<FolderOperationResult> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const result = await window.electronAPI.openOwnerFolder({
        showroomName,
        name,
        contact,
        folderType: 'finalPdfs'
      });
      return result;
    } catch (error) {
      console.error('Error opening Final PDFs folder:', error);
      throw error;
    }
  }

  async openWebsiteFolder(showroomName: string, name: string, contact: string): Promise<FolderOperationResult> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const result = await window.electronAPI.openOwnerFolder({
        showroomName,
        name,
        contact,
        folderType: 'website'
      });
      return result;
    } catch (error) {
      console.error('Error opening website folder:', error);
      throw error;
    }
  }

  /**
   * Check if a folder exists
   */
  async checkFolderExists(path: string): Promise<boolean> {
    try {
      // Check if we're in Electron environment
      if (!window.electronAPI) {
        console.warn('Electron API not available');
        return false;
      }

      const exists = await window.electronAPI.checkFolderExists(path);
      return exists;
    } catch (error) {
      console.error('Error checking folder:', error);
      return false;
    }
  }

  async checkWebsiteFolderExists(showroomName: string, name: string, contact: string): Promise<boolean> {
    const basePath = `D:\\${showroomName}\\1 FromMobiles\\${name}_${contact}\\website`;
    return this.checkFolderExists(basePath);
  }
}

// eslint-disable-next-line import/no-anonymous-default-export
export default new FolderService();
