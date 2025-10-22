// src/finance/api/FinanceCompanyEndPoints.ts
import { collection, doc, setDoc, updateDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from 'access/config/firebase';
import { IFinanceCompany } from '../types/IFinanceCompany';
import { v4 as uuidv4 } from 'uuid';
import useSWR from 'swr';
import { useMemo } from 'react';
import { useShowroom } from 'access/contexts/showRoomContext';

// Fetcher function for SWR
const fetcher = async (showroomId: string): Promise<IFinanceCompany[]> => {
  if (!showroomId) return [];

  const q = query(collection(db, 'financeCompanies'), where('showroomId', '==', showroomId), where('isDeleted', '==', false));

  const querySnapshot = await getDocs(q);
  const companies: IFinanceCompany[] = [];

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    companies.push({
      id: doc.id,
      companyName: data.companyName,
      stampPath: data.stampPath,
      showroomId: data.showroomId,
      isDeleted: data.isDeleted || false,
      createdAt: data.createdAt?.toDate() || new Date(),
      modifiedAt: data.modifiedAt?.toDate() || new Date(),
      createdBy: data.createdBy,
      modifiedBy: data.modifiedBy
    });
  });

  return companies;
};

// Hook to get all finance companies
export function useGetAllFinanceCompanies() {
  const { currentShowroom } = useShowroom();
  const showroomId = currentShowroom?.showroomId || null;

  const { data, isLoading, error, isValidating, mutate } = useSWR(
    showroomId ? ['financeCompanies', showroomId] : null,
    () => fetcher(showroomId!),
    {
      revalidateIfStale: true,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 5000 // Auto refresh every 5 seconds
    }
  );

  const memoizedValue = useMemo(
    () => ({
      financeCompanies: data || [],
      financeCompaniesLoading: isLoading,
      financeCompaniesError: error,
      financeCompaniesValidating: isValidating,
      financeCompaniesEmpty: !isLoading && !data?.length,
      revalidateFinanceCompanies: mutate
    }),
    [data, error, isLoading, isValidating, mutate]
  );

  return memoizedValue;
}

// Create finance company with stamp
export async function createFinanceCompany(
  companyData: Partial<IFinanceCompany>,
  stampFile: File | string,
  showroomId: string,
  showroomName: string
) {
  try {
    if (!showroomId) {
      throw new Error('No showroom selected. Please select a showroom before proceeding.');
    }

    const companyId = uuidv4();
    let stampPath = '';

    // Handle stamp save to local storage only
    if (stampFile) {
      let stampData: string = '';
      let fileName: string = '';

      if (stampFile instanceof File) {
        fileName = stampFile.name;
        // Read file as base64 for local storage
        const reader = new FileReader();
        stampData = await new Promise<string>((resolve, reject) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(stampFile);
        });
      } else {
        // It's already base64
        stampData = stampFile;
        fileName = `${companyData.companyName}_stamp.png`;
      }

      // Save stamp to local using Electron API
      if (window.electronAPI && stampData) {
        const saveResult = await window.electronAPI.saveFinanceStamp({
          companyName: companyData.companyName || 'Unknown Company',
          stampData,
          fileName,
          showroomName: showroomName || 'Unknown Showroom'
        });

        if (saveResult.success) {
          stampPath = saveResult.localPath || '';
        } else {
          throw new Error(saveResult.error || 'Failed to save stamp locally');
        }
      } else {
        throw new Error('Electron API not available for local storage');
      }
    }

    // Create finance company document in Firestore
    const financeCompanyData: any = {
      companyName: companyData.companyName,
      stampPath,
      showroomId,
      isDeleted: false,
      createdAt: Timestamp.now(),
      modifiedAt: Timestamp.now(),
      createdBy: companyData.createdBy || 'system',
      modifiedBy: companyData.modifiedBy || 'system'
    };

    await setDoc(doc(db, 'financeCompanies', companyId), financeCompanyData);

    // Return the created company data
    return {
      success: true,
      id: companyId,
      data: {
        id: companyId,
        ...financeCompanyData,
        createdAt: new Date(),
        modifiedAt: new Date()
      }
    };
  } catch (error) {
    console.error('Create Finance Company Error:', error);
    throw error;
  }
}

// Update finance company
export async function updateFinanceCompany(
  companyId: string,
  companyData: Partial<IFinanceCompany>,
  newStampFile?: File | string,
  showroomId?: string,
  showroomName?: string
) {
  try {
    if (!companyId) {
      throw new Error('Company ID is required for update.');
    }

    const updateData: any = {
      ...companyData,
      modifiedAt: Timestamp.now(),
      modifiedBy: companyData.modifiedBy || 'system'
    };

    // Handle stamp update if provided
    if (newStampFile) {
      let stampData: string = '';
      let fileName: string = '';

      if (newStampFile instanceof File) {
        fileName = newStampFile.name;
        // Read file as base64 for local storage
        const reader = new FileReader();
        stampData = await new Promise<string>((resolve, reject) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(newStampFile);
        });
      } else {
        // It's already base64
        stampData = newStampFile;
        fileName = `${companyData.companyName}_stamp.png`;
      }

      // Save new stamp to local
      if (window.electronAPI && stampData) {
        const saveResult = await window.electronAPI.saveFinanceStamp({
          companyName: companyData.companyName || 'Unknown Company',
          stampData,
          fileName,
          isUpdate: true,
          showroomName: showroomName || 'Unknown Showroom'
        });

        if (saveResult.success) {
          updateData.stampPath = saveResult.localPath;
        } else {
          throw new Error(saveResult.error || 'Failed to update stamp locally');
        }
      } else {
        throw new Error('Electron API not available for local storage');
      }
    }

    await updateDoc(doc(db, 'financeCompanies', companyId), updateData);

    return { success: true };
  } catch (error) {
    console.error('Update Finance Company Error:', error);
    throw error;
  }
}

// Delete finance company (soft delete)
export async function deleteFinanceCompany(companyId: string, companyName?: string, showroomName?: string) {
  try {
    // Soft delete in database
    await updateDoc(doc(db, 'financeCompanies', companyId), {
      isDeleted: true,
      modifiedAt: Timestamp.now()
    });

    // Optionally delete local stamp file
    if (window.electronAPI && companyName && showroomName) {
      try {
        await window.electronAPI.deleteFinanceStamp(companyName, showroomName);
      } catch (error) {
        console.warn('Could not delete local stamp:', error);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Delete Finance Company Error:', error);
    throw error;
  }
}

// Get finance company by ID
export async function getFinanceCompanyById(companyId: string): Promise<IFinanceCompany | null> {
  try {
    const docSnap = await getDocs(query(collection(db, 'financeCompanies'), where('__name__', '==', companyId)));

    if (!docSnap.empty) {
      const data = docSnap.docs[0].data();
      return {
        id: docSnap.docs[0].id,
        companyName: data.companyName,
        stampPath: data.stampPath,
        showroomId: data.showroomId,
        isDeleted: data.isDeleted || false,
        createdAt: data.createdAt?.toDate() || new Date(),
        modifiedAt: data.modifiedAt?.toDate() || new Date(),
        createdBy: data.createdBy,
        modifiedBy: data.modifiedBy
      };
    }

    return null;
  } catch (error) {
    console.error('Get Finance Company by ID Error:', error);
    throw error;
  }
}

// Get local stamp for a finance company
export async function getLocalStamp(companyName: string, showroomName: string): Promise<string | null> {
  try {
    if (window.electronAPI) {
      const result = await window.electronAPI.getFinanceStamp(companyName, showroomName);
      if (result.success && result.stampData) {
        return result.stampData;
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting local stamp:', error);
    return null;
  }
}

// Get all finance companies by showroom (direct DB query without hooks)
export async function getAllFinanceCompanies(showroomId: string): Promise<IFinanceCompany[]> {
  try {
    if (!showroomId) return [];

    const q = query(collection(db, 'financeCompanies'), where('showroomId', '==', showroomId), where('isDeleted', '==', false));

    const querySnapshot = await getDocs(q);
    const companies: IFinanceCompany[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      companies.push({
        id: doc.id,
        companyName: data.companyName,
        stampPath: data.stampPath,
        showroomId: data.showroomId,
        isDeleted: data.isDeleted || false,
        createdAt: data.createdAt?.toDate() || new Date(),
        modifiedAt: data.modifiedAt?.toDate() || new Date(),
        createdBy: data.createdBy,
        modifiedBy: data.modifiedBy
      });
    });

    return companies;
  } catch (error) {
    console.error('Get All Finance Companies Error:', error);
    throw error;
  }
}
