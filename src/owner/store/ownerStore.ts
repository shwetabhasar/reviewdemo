// src/owner/store/ownerStore.ts
import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import { IOwnerDocument, IOwnerWithSync } from '../types/IOwner';

interface OwnerState {
  // Data
  owners: IOwnerWithSync[];
  selectedOwner: IOwnerWithSync | null;

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Cache management
  lastFetchTime: number | null;
  showroomId: string | null;

  // Actions
  setOwners: (owners: IOwnerWithSync[]) => void;
  addOwner: (owner: IOwnerWithSync) => void;
  updateOwner: (id: string, updates: Partial<IOwnerWithSync>) => void;
  updateOwnerDocuments: (id: string, documents: IOwnerDocument[]) => void;
  removeOwner: (id: string) => void;
  removeOwnerFromCache: (id: string) => void;

  setSelectedOwner: (owner: IOwnerWithSync | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Cache actions
  setShowroomId: (id: string | null) => void;
  clearCache: () => void;

  // Utility functions
  getOwnerById: (id: string) => IOwnerWithSync | undefined;
  deleteOwner: (id: string) => void;
  getCacheAge: () => number | null;

  checkOwnerNeedsSync: (id: string, newModifiedAt: Date) => boolean;
  getOwnersNeedingSync: () => IOwnerWithSync[];
  getDocumentHash: (ownerId: string, fileName: string) => string | undefined;
}

export const useOwnerStore = create<OwnerState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        owners: [],
        selectedOwner: null,
        isLoading: false,
        error: null,
        lastFetchTime: null,
        showroomId: null,

        // Actions
        setOwners: (owners) => {
          console.log(`Setting ${owners.length} owners in store`);
          set({
            owners,
            lastFetchTime: Date.now(),
            error: null
          });
        },

        addOwner: (owner) => {
          set((state) => {
            const existingIndex = state.owners.findIndex((o) => o.id === owner.id);
            if (existingIndex !== -1) {
              // Update existing owner
              console.log('Updating existing owner:', owner.name);
              const updatedOwners = [...state.owners];
              updatedOwners[existingIndex] = owner;
              return { owners: updatedOwners };
            }
            // Add new owner
            console.log('Adding new owner:', owner.name);
            return { owners: [...state.owners, owner] };
          });
        },

        removeOwnerFromCache: (id: string) => {
          console.log(`Removing owner ${id} from cache`);
          set((state) => ({
            owners: state.owners.filter((owner) => owner.id !== id),
            selectedOwner: state.selectedOwner?.id === id ? null : state.selectedOwner
          }));
        },

        updateOwner: (id, updates) => {
          set((state) => {
            // Log if documents have changed
            const existingOwner = state.owners.find((o) => o.id === id);
            if (existingOwner && updates.documents) {
              const oldCount = existingOwner.documents?.length || 0;
              const newCount = updates.documents?.length || 0;
              if (oldCount !== newCount) {
                console.log(`Document count changed for ${existingOwner.name}: ${oldCount} → ${newCount}`);
              }
            }

            return {
              owners: state.owners.map((owner) =>
                owner.id === id
                  ? {
                      ...owner,
                      ...updates,
                      lastSynced: new Date().toISOString(),
                      // Preserve document versions if documents updated
                      documentVersions: updates.documents
                        ? updates.documents.reduce(
                            (acc, doc) => {
                              acc[doc.fileName] = {
                                md5Hash: doc.metadata?.md5Hash,
                                version: doc.version,
                                fileSize: doc.metadata?.fileSize
                              };
                              return acc;
                            },
                            {} as Record<string, any>
                          )
                        : owner.documentVersions
                    }
                  : owner
              ),
              selectedOwner:
                state.selectedOwner?.id === id
                  ? { ...state.selectedOwner, ...updates, lastSynced: new Date().toISOString() }
                  : state.selectedOwner
            };
          });
        },

        updateOwnerDocuments: (id, documents) => {
          set((state) => ({
            owners: state.owners.map((owner) => (owner.id === id ? { ...owner, documents, lastSynced: new Date().toISOString() } : owner)),
            selectedOwner:
              state.selectedOwner?.id === id
                ? { ...state.selectedOwner, documents, lastSynced: new Date().toISOString() }
                : state.selectedOwner
          }));
        },

        removeOwner: (id) => {
          set((state) => ({
            owners: state.owners.filter((owner) => owner.id !== id),
            selectedOwner: state.selectedOwner?.id === id ? null : state.selectedOwner
          }));
        },

        setSelectedOwner: (owner) => set({ selectedOwner: owner }),
        setLoading: (loading) => set({ isLoading: loading }),
        setError: (error) => set({ error }),

        // Cache actions
        setShowroomId: (id) => {
          set((state) => {
            // If showroom changed, clear the cache
            if (state.showroomId !== id && id !== null) {
              console.log('Showroom changed, clearing cache');
              return {
                showroomId: id,
                owners: [],
                lastFetchTime: null,
                selectedOwner: null,
                error: null
              };
            }
            return { showroomId: id };
          });
        },

        clearCache: () => {
          console.log('Clearing owner cache manually');
          set({
            owners: [],
            selectedOwner: null,
            lastFetchTime: null,
            error: null
          });
        },

        // Utility functions
        getOwnerById: (id) => {
          return get().owners.find((owner) => owner.id === id);
        },

        deleteOwner: (id) => {
          get().removeOwner(id);
        },

        checkOwnerNeedsSync: (id, newModifiedAt) => {
          const owner = get().owners.find((o) => o.id === id);
          if (!owner) return true;

          const currentModifiedAt = new Date(owner.modifiedAt);
          return newModifiedAt > currentModifiedAt;
        },

        getOwnersNeedingSync: () => {
          const { owners } = get();
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

          return owners.filter((owner) => {
            if (!owner.lastSynced) return true;
            const lastSync = new Date(owner.lastSynced);
            if (lastSync < oneHourAgo) return true;
            if (owner.modifiedAt > lastSync) return true;
            return false;
          });
        },

        getDocumentHash: (ownerId, fileName) => {
          const owner = get().owners.find((o) => o.id === ownerId);
          const doc = owner?.documents?.find((d) => d.fileName === fileName);
          return doc?.metadata?.md5Hash;
        },

        getCacheAge: () => {
          const { lastFetchTime } = get();
          if (!lastFetchTime) return null;
          return Date.now() - lastFetchTime;
        }
      }),
      {
        name: 'owner-storage',
        version: 5, // Increment version to force migration
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          // Only persist these fields
          owners: state.owners,
          lastFetchTime: state.lastFetchTime,
          showroomId: state.showroomId
        }),
        onRehydrateStorage: () => {
          console.log('Rehydrating owner store from localStorage');
          return (state, error) => {
            if (error) {
              console.error('Error rehydrating store:', error);
            } else if (state) {
              console.log(`Loaded ${state.owners.length} owners from cache`);
            }
          };
        }
      }
    ),
    {
      name: 'owner-store'
    }
  )
);
