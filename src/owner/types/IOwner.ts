// src/owner/types/IOwner.ts - CORRECTED VERSION

export interface IOwner {
  id: string;

  // Showroom information
  showroomId: string;
  showroomUserId: string;

  contact: string;
  name: string;

  // Type indicator
  isSalePoint?: boolean;

  // Documents
  documents?: IOwnerDocument[];

  // Metadata
  isDeleted: boolean;
  createdAt: Date;
  modifiedAt: Date; // KEY: Updates when documents change
  createdBy: string;
  modifiedBy: string;

  // Optional fields
  createdByName?: string;
  totalDocuments?: number;
  lastDocumentUpload?: Date;
  lastDocumentUpdate?: Date;
  lastDocumentDelete?: Date;
}

export interface IOwnerDocument {
  id?: string;
  fileName: string;
  documentType: string;
  url?: string;
  downloadURL?: string;

  // Storage fields
  storagePath?: string;
  version?: number; // CRITICAL: Version at document level

  // Upload status
  isUploaded?: boolean;
  uploadedStatus?: string;

  // Local sync
  uploadDate?: Date;
  size?: number;
  isLocal?: boolean;
  localPath?: string;

  // Metadata with server hash
  metadata?: IDocumentMetadata;
  lastChecked?: string;
}

export interface IDocumentMetadata {
  // Server-calculated hash (from Firebase Storage)
  md5Hash?: string; // THIS IS THE KEY FIELD

  // Storage metadata
  fileSize?: number;
  generation?: string;
  contentType?: string;
  uploadedAt?: string;

  // Status fields
  uploadStatus?: string;
  errorMessage?: string;
  retryCount?: number;
}

// Rest of the interfaces remain the same...
export interface IOwnerWithSync extends IOwner {
  lastSynced?: string;
  documentVersions?: Record<string, IDocumentMetadata>;
  syncStatus?: 'synced' | 'pending' | 'error';
}

export interface IDocumentChanges {
  added: string[];
  modified: string[];
  removed: string[];
}

export interface ISyncResult {
  documents: IOwnerDocument[];
  hasChanges: boolean;
  changes: IDocumentChanges;
  syncedAt?: string;
}

export interface IOwnerSyncProgress {
  ownerId: string;
  ownerName: string;
  status: 'pending' | 'checking' | 'syncing' | 'completed' | 'error';
  documentsChecked: number;
  documentsTotal: number;
  changes?: IDocumentChanges;
  error?: string;
}

export interface ICacheMetadata {
  version: number;
  lastFullSync: string | null;
  totalOwners: number;
  totalDocuments: number;
  cacheSize?: number;
}

// Type guards
export function isOwnerWithSync(owner: IOwner | IOwnerWithSync): owner is IOwnerWithSync {
  return 'lastSynced' in owner || 'documentVersions' in owner;
}

export function hasDocumentMetadata(doc: IOwnerDocument): doc is IOwnerDocument & { metadata: IDocumentMetadata } {
  return doc.metadata !== undefined;
}

export function isSalePoint(owner: IOwner): boolean {
  return owner.isSalePoint === true;
}

export function isShowroom(owner: IOwner): boolean {
  return owner.isSalePoint !== true;
}
