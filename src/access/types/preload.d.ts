// src/types/electron.d.ts or electron/preload.d.ts

export interface ElectronAPI {
  // Owner List APIs
  getOwnerList: (basePath: string) => Promise<{
    success: boolean;
    owners?: Array<{
      name: string;
      mobile: string;
      folderName: string;
      folderPath: string;
    }>;
    count?: number;
    error?: string;
  }>;

  openOwnerFolder: (folderPath: string) => Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }>;

  comparePdfs: (ownerName: string, basePath: string) => Promise<{
    success: boolean;
    canceled?: boolean;
    message?: string;
    files?: string[];
    count?: number;
    selectedCount?: number;
    error?: string;
  }>;

  // Add other existing APIs here...
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};