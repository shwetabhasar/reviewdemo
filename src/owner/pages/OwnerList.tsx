// src/owner/pages/OwnerList.tsx
import React, { useState, useEffect } from 'react';
import { FolderOpen } from 'lucide-react';
import { Owner } from '../types/electronTypes';

const OwnerList: React.FC = () => {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [basePath] = useState<string>('D:\\Tri-Color Honda');

  useEffect(() => {
    loadOwners();
  }, []);

  const loadOwners = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const result = await window.electronAPI.getOwnerList(basePath);

      if (result.success) {
        setOwners(result.owners || []);
      } else {
        setError(result.error || 'Failed to load owners');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while loading owners';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFolder = async (folderPath: string): Promise<void> => {
    try {
      const result = await window.electronAPI.openOwnerFolder(folderPath);

      if (!result.success) {
        alert(`Failed to open folder: ${result.error}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      alert(`Error: ${errorMessage}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading owners...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h3 className="text-red-800 font-semibold mb-2">Error</h3>
          <p className="text-red-600">{error}</p>
          <button onClick={loadOwners} className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-lg">
          <h1 className="text-2xl font-bold">Owner List</h1>
          <p className="text-blue-100 text-sm mt-1">Total Owners: {owners.length}</p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile Number</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {owners.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No owners found
                  </td>
                </tr>
              ) : (
                owners.map((owner, index) => (
                  <tr key={`${owner.mobile}-${index}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{owner.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{owner.mobile}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleOpenFolder(owner.folderPath)}
                        className="inline-flex items-center justify-center p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                        title="Open Folder"
                      >
                        <FolderOpen className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {owners.length > 0 && (
          <div className="bg-gray-50 px-6 py-3 rounded-b-lg border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Base Path: <span className="font-mono text-gray-800">{basePath}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerList;
