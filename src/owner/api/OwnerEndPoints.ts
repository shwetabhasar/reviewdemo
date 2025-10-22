// src/owner/api/OwnerEndPoints.ts
import { collection, doc, getDoc, query, where, orderBy, onSnapshot, Timestamp, writeBatch, getDocs } from 'firebase/firestore';
import { ref, getMetadata, listAll, getDownloadURL } from 'firebase/storage';
import { storage, db } from '../../access/config/firebase';
import { IOwnerDocument, IOwnerWithSync } from 'owner/types/IOwner';
import { useShowroom } from 'access/contexts/showRoomContext';
import { useState, useEffect, useRef } from 'react';
import useAuth from 'access/hooks/useAuth';
import { useOwnerStore } from 'owner/store/ownerStore';
import { autoSyncService } from 'owner/services/autoSyncService';

// Helper function to convert Timestamp to Date
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  return timestamp instanceof Date ? timestamp : new Date(timestamp);
};

// Fetch documents from Firestore first, then Storage as fallback
async function fetchOwnerDocuments(showroomId: string, ownerId: string): Promise<IOwnerDocument[]> {
  try {
    // First, try to get documents from Firestore (primary source)
    const documentsQuery = query(
      collection(db, 'documents'),
      where('ownerId', '==', ownerId),
      where('showroomId', '==', showroomId),
      where('isDeleted', '==', false)
    );

    const documentsSnapshot = await getDocs(documentsQuery);

    if (documentsSnapshot.size > 0) {
      console.log(`[fetchOwnerDocuments] Found ${documentsSnapshot.size} documents in Firestore for owner ${ownerId}`);

      const documents: IOwnerDocument[] = [];

      for (const docSnapshot of documentsSnapshot.docs) {
        const docData = docSnapshot.data();

        // Build document with all fields from Firestore
        documents.push({
          id: docSnapshot.id,
          fileName: docData.documentName || docData.documentType || 'unknown',
          documentType: docData.documentType || 'unknown',
          url: docData.documentUrl || '',
          downloadURL: docData.documentUrl || '',

          // Storage fields
          storagePath: docData.storagePath || '',
          version: docData.version || 1, // VERSION AT DOCUMENT LEVEL

          // Upload status
          isUploaded: docData.isUploaded === true,
          uploadedStatus: docData.uploadedStatus || 'completed',

          // Size
          size: docData.metadata?.fileSize || 0,

          // Server metadata (from Firebase Storage)
          metadata: docData.metadata
            ? {
                md5Hash: docData.metadata.md5Hash || '', // SERVER HASH
                fileSize: docData.metadata.fileSize || 0,
                generation: docData.metadata.generation || '',
                contentType: docData.metadata.contentType || '',
                uploadedAt: docData.metadata.uploadedAt || '',
                uploadStatus: docData.metadata.uploadStatus || 'completed'
              }
            : undefined,

          lastChecked: new Date().toISOString()
        });
      }

      return documents;
    }

    // Fallback to Storage if no Firestore documents (legacy support)
    console.log(`[fetchOwnerDocuments] No Firestore documents, falling back to Storage for owner ${ownerId}`);
    const documentsRef = ref(storage, `showrooms/${showroomId}/owners/${ownerId}/documents`);
    const result = await listAll(documentsRef);
    const documents: IOwnerDocument[] = [];

    for (const itemRef of result.items) {
      const metadata = await getMetadata(itemRef);
      const downloadURL = await getDownloadURL(itemRef);

      documents.push({
        fileName: itemRef.name,
        documentType: itemRef.name.split('.').pop() || 'unknown',
        downloadURL,
        url: downloadURL,
        version: 1, // Default version for Storage-only documents
        isUploaded: true,
        uploadedStatus: 'completed',
        metadata: {
          md5Hash: metadata.md5Hash, // Storage MD5
          fileSize: metadata.size,
          generation: metadata.generation || '',
          contentType: metadata.contentType || '',
          uploadedAt: metadata.updated,
          uploadStatus: 'completed'
        },
        lastChecked: new Date().toISOString()
      });
    }

    return documents;
  } catch (error) {
    console.error('[fetchOwnerDocuments] Error:', error);
    return [];
  }
}

export function useGetAllOwners() {
  const { currentShowroom } = useShowroom();
  const { user } = useAuth();
  const [error, setError] = useState<Error | null>(null);

  const {
    owners,
    isLoading,
    setOwners,
    addOwner,
    updateOwner,
    updateOwnerDocuments,
    removeOwner,
    setLoading,
    setError: setStoreError,
    showroomId: storedShowroomId,
    setShowroomId
  } = useOwnerStore();

  const lastShowroomIdRef = useRef<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const processingRef = useRef(false);

  useEffect(() => {
    if (!currentShowroom?.showroomId || !user) {
      setLoading(false);
      return;
    }

    // Check if showroom changed
    const showroomChanged = lastShowroomIdRef.current !== currentShowroom.showroomId;
    if (showroomChanged) {
      console.log('Showroom changed, resetting');
      lastShowroomIdRef.current = currentShowroom.showroomId;
      setShowroomId(currentShowroom.showroomId);
    }

    // Show cached data immediately if available
    if (owners.length > 0 && !showroomChanged && storedShowroomId === currentShowroom.showroomId) {
      console.log('Using cached data');
      setLoading(false);
    } else {
      setLoading(true);
    }

    // Build query
    const ownersQuery = query(
      collection(db, 'owners'),
      where('showroomId', '==', currentShowroom.showroomId),
      where('isDeleted', '==', false),
      ...(user.role !== 'admin' ? [where('showroomUserId', '==', user.id)] : []),
      orderBy('createdAt', 'desc')
    );

    // Process owner data and trigger auto-sync
    const processOwnerData = async (docData: any, docId: string): Promise<IOwnerWithSync> => {
      // Get creator name for admin view
      let createdByName = '';
      if (user.role === 'admin' && docData.showroomUserId) {
        try {
          const userDocRef = doc(db, 'users', docData.showroomUserId);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data() as { name?: string; email?: string };
            createdByName = userData.name || userData.email || 'Unknown';
          }
        } catch (err) {
          console.error('Error fetching user:', err);
        }
      }

      // Fetch documents from Firestore/Storage
      const documents = await fetchOwnerDocuments(currentShowroom.showroomId, docId);
      console.log(`[processOwnerData] Processing ${docData.name} with ${documents.length} documents`);
      console.log(`[processOwnerData] ModifiedAt: ${docData.modifiedAt}`);

      // Build owner data with all fields
      const ownerData: IOwnerWithSync = {
        id: docId,
        showroomId: docData.showroomId || currentShowroom.showroomId,
        showroomUserId: docData.showroomUserId || user.id,
        contact: docData.contact || '',
        name: docData.name || '',
        isSalePoint: docData.isSalePoint === true,
        isDeleted: docData.isDeleted || false,
        createdAt: convertTimestamp(docData.createdAt || new Date()),
        modifiedAt: convertTimestamp(docData.modifiedAt || new Date()),
        createdBy: docData.createdBy || docData.showroomUserId || user.id || '',
        modifiedBy: docData.modifiedBy || docData.showroomUserId || user.id || '',
        createdByName,
        documents,

        // Additional tracking fields
        totalDocuments: docData.totalDocuments || documents.length,
        lastDocumentUpload: docData.lastDocumentUpload ? convertTimestamp(docData.lastDocumentUpload) : undefined,
        lastDocumentUpdate: docData.lastDocumentUpdate ? convertTimestamp(docData.lastDocumentUpdate) : undefined,
        lastDocumentDelete: docData.lastDocumentDelete ? convertTimestamp(docData.lastDocumentDelete) : undefined,

        // Sync tracking
        lastSynced: new Date().toISOString(),
        syncStatus: 'pending' // Will be updated after sync
      };

      // Only trigger auto-sync if owner has been modified or has new documents
      if (documents.length > 0 && currentShowroom.showroomName) {
        // Check if sync is needed based on modifiedAt
        const needsSync = autoSyncService.needsSync(currentShowroom.showroomName, ownerData);

        if (needsSync) {
          console.log(`[processOwnerData] Auto-sync needed for ${ownerData.name} - modifiedAt indicates changes`);

          autoSyncService
            .autoSyncOwnerDocuments({
              showroomName: currentShowroom.showroomName,
              owner: ownerData
            })
            .then((result) => {
              if (result.success) {
                console.log(`[processOwnerData] Auto-sync successful for ${ownerData.name}`);
                // Update sync status in store
                updateOwner(docId, { syncStatus: 'synced' });
              }
            })
            .catch((err) => {
              console.error(`[processOwnerData] Auto-sync failed for ${ownerData.name}:`, err);
              updateOwner(docId, { syncStatus: 'error' });
            });
        } else {
          console.log(`[processOwnerData] No sync needed for ${ownerData.name} - no changes detected`);
          ownerData.syncStatus = 'synced';
        }
      }

      return ownerData;
    };

    // Clean up previous listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      ownersQuery,
      { includeMetadataChanges: false },
      async (snapshot) => {
        if (processingRef.current) {
          console.log('Already processing, skipping');
          return;
        }

        processingRef.current = true;

        try {
          // Handle initial load
          if (snapshot.docs.length > 0 && owners.length === 0) {
            console.log(`Initial load: ${snapshot.docs.length} owners`);
            const ownersData: IOwnerWithSync[] = [];

            // Process in batches for performance
            const batchSize = 5;
            for (let i = 0; i < snapshot.docs.length; i += batchSize) {
              const batch = snapshot.docs.slice(i, i + batchSize);

              const batchResults = await Promise.all(batch.map((docSnapshot) => processOwnerData(docSnapshot.data(), docSnapshot.id)));

              ownersData.push(...batchResults);
            }

            setOwners(ownersData);

            // Trigger batch auto-sync in background
            if (currentShowroom.showroomName) {
              setTimeout(() => {
                autoSyncService
                  .batchSyncOwners({
                    showroomName: currentShowroom.showroomName,
                    owners: ownersData,
                    concurrency: 3,
                    onlyChanged: true
                  })
                  .then((result) => {
                    console.log(
                      `Batch auto-sync complete: ${result.successful} successful, ${result.failed} failed, ${result.skipped} skipped`
                    );
                  });
              }, 1000);
            }
          } else {
            // Handle incremental updates
            for (const change of snapshot.docChanges()) {
              const docData = change.doc.data();
              const docId = change.doc.id;

              if (change.type === 'added') {
                const existingOwner = owners.find((o) => o.id === docId);
                if (!existingOwner) {
                  console.log('New owner added:', docData.name);

                  const newOwner = await processOwnerData(docData, docId);
                  addOwner(newOwner);
                }
              } else if (change.type === 'modified') {
                // When an owner is archived, keep it in cache but mark as deleted
                if (docData.isDeleted === true) {
                  console.log('Owner marked as deleted, updating in cache:', docData.name);
                  const existingOwner = owners.find((o) => o.id === docId);
                  if (existingOwner) {
                    updateOwner(docId, {
                      isDeleted: true,
                      modifiedAt: convertTimestamp(docData.modifiedAt || new Date())
                    });
                  }
                  continue; // Skip further processing
                }

                // Check if owner is being unarchived
                const existingOwner = owners.find((o) => o.id === docId);
                if (existingOwner?.isDeleted === true && docData.isDeleted === false) {
                  console.log('Owner unarchived, restoring in cache:', docData.name);
                  // Continue to process the full owner data below
                }

                // Check if modifiedAt changed (indicates document changes)
                const oldModifiedAt = existingOwner?.modifiedAt;
                const newModifiedAt = convertTimestamp(docData.modifiedAt);

                if (oldModifiedAt && newModifiedAt > oldModifiedAt) {
                  console.log(`Owner ${docData.name} has document changes - modifiedAt updated`);
                }

                // Process full owner data (for both regular updates and unarchive)
                const updatedOwner = await processOwnerData(docData, docId);

                updateOwner(docId, updatedOwner);

                if (updatedOwner.documents) {
                  updateOwnerDocuments(docId, updatedOwner.documents);
                }
              } else if (change.type === 'removed') {
                console.log('Owner removed:', docData.name);
                removeOwner(docId);
              }
            }
          }

          setLoading(false);
          setError(null);
        } catch (err) {
          console.error('Error processing snapshot:', err);
          setError(err as Error);
          setStoreError(err instanceof Error ? err.message : 'Unknown error');
          setLoading(false);
        } finally {
          processingRef.current = false;
        }
      },
      (err) => {
        console.error('Snapshot listener error:', err);
        setError(err as Error);
        setStoreError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
        processingRef.current = false;
      }
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      console.log('Cleaning up owners listener');
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [currentShowroom?.showroomId, currentShowroom?.showroomName, user?.id, user?.role, storedShowroomId]);

  // Manual refresh function
  const revalidateOwners = async () => {
    console.log('Manual refresh triggered');
    setLoading(true);

    const { clearCache } = useOwnerStore.getState();
    clearCache();

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  };

  return {
    owners,
    ownersLoading: isLoading,
    ownersError: error,
    ownersEmpty: !isLoading && owners.length === 0,
    revalidateOwners
  };
}

// Archive function
export async function archiveOwnerInFirebase(ownerId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const batch = writeBatch(db);

    const ownerRef = doc(db, 'owners', ownerId);
    batch.update(ownerRef, {
      isDeleted: true,
      deletedAt: new Date(),
      modifiedAt: new Date()
    });

    const documentsQuery = query(collection(db, 'documents'), where('ownerId', '==', ownerId), where('isDeleted', '==', false));

    const documentsSnapshot = await getDocs(documentsQuery);

    documentsSnapshot.forEach((docSnapshot) => {
      batch.update(docSnapshot.ref, {
        isDeleted: true,
        deletedAt: new Date(),
        modifiedAt: new Date()
      });
    });

    await batch.commit();

    console.log(`Archived owner ${ownerId} and ${documentsSnapshot.size} documents`);

    return { success: true };
  } catch (error) {
    console.error('Error archiving owner:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function unarchiveOwnerInFirebase(ownerId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const batch = writeBatch(db);

    const ownerRef = doc(db, 'owners', ownerId);
    batch.update(ownerRef, {
      isDeleted: false,
      deletedAt: null,
      modifiedAt: new Date()
    });

    const documentsQuery = query(collection(db, 'documents'), where('ownerId', '==', ownerId), where('isDeleted', '==', true));

    const documentsSnapshot = await getDocs(documentsQuery);

    documentsSnapshot.forEach((docSnapshot) => {
      batch.update(docSnapshot.ref, {
        isDeleted: false,
        deletedAt: null,
        modifiedAt: new Date()
      });
    });

    await batch.commit();

    console.log(`Unarchived owner ${ownerId} and ${documentsSnapshot.size} documents`);

    return { success: true };
  } catch (error) {
    console.error('Error unarchiving owner:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
