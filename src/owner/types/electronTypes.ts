// src/owner/types/electronTypes.ts

export interface Owner {
  name: string;
  mobile: string;
  folderPath: string;
}

export interface OwnerListResult {
  success: boolean;
  owners?: Owner[];
  error?: string;
}

export interface OpenFolderResult {
  success: boolean;
  error?: string;
}

export interface IElectronAPI {
  // Get list of owners from the base folder path
  getOwnerList: (basePath: string) => Promise<OwnerListResult>;

  // Open owner folder in system file explorer
  openOwnerFolder: (folderPath: string) => Promise<OpenFolderResult>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}

export {};
