// src/owner/components/OwnerList.tsx

/* eslint-disable react-hooks/exhaustive-deps */
import { ColumnDef } from '@tanstack/react-table';
import { unarchiveOwnerInFirebase, useGetAllOwners } from 'owner/api/OwnerEndPoints';
import { useMemo, useState, useEffect, useCallback } from 'react';
import ReactTable from 'components/appseeds/react-table/ReactTable';
import ReactEmptyTable from 'components/appseeds/react-table/ReactEmptyTable';
import { getSelectAndIdColumns } from 'components/appseeds/react-table/ReactTableUtils';
import { IOwner, IOwnerWithSync } from 'owner/types/IOwner';
import folderCleanupService from 'owner/services/folderCleanupService';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { useRefreshShortcut } from 'access/hooks/useRefreshShortcut';
import { fetchOwnerDocumentsService } from 'owner/services/fetchOwnerDocumentsService';
import { Sync as SyncIcon } from '@mui/icons-material';
// REMOVED: Duplicate import of SyncIcon

import {
  Snackbar,
  IconButton,
  Tooltip,
  Alert,
  Button,
  Box,
  Dialog,
  DialogActions,
  Typography,
  Chip,
  Menu,
  MenuItem,
  CircularProgress,
  DialogContent,
  DialogTitle,
  Divider,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Folder as FolderIcon,
  Visibility as VisibilityIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  SettingsBackupRestore as SettingsBackupRestoreIcon,
  Storage as StorageIcon,
  CloudOff as CloudOffIcon,
  Cloud as CloudIcon,
  FolderDelete as FolderDeleteIcon,
  Store as StoreIcon,
  Storefront as StorefrontIcon,
  Print as PrintIcon
} from '@mui/icons-material';

import { CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { useOwnerStore } from 'owner/store/ownerStore';
import folderService from 'owner/services/folderService';
import { useNavigate } from 'react-router-dom';
import { useShowroom } from 'access/contexts/showRoomContext';
import { CleanupResult } from 'owner/services/folderCleanupService';
import { autoSyncService } from 'owner/services/autoSyncService';

const OwnerList = () => {
  const navigate = useNavigate();

  // Get store state and actions
  const { owners, isLoading, clearCache } = useOwnerStore();

  // Get owners data with optimized fetching
  const { ownersError, revalidateOwners } = useGetAllOwners();

  const { currentShowroom } = useShowroom();
  const showroomName = currentShowroom?.showroomName || '';
  const currentShowroomId = currentShowroom?.showroomId || '';

  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);

  // State variables
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [onlineStatus, setOnlineStatus] = useState(navigator.onLine);
  const [ownerStatuses, setOwnerStatuses] = useState<Record<string, string>>({});
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    action: () => void;
    severity: 'warning' | 'error' | 'info';
  } | null>(null);

  const selectedOwners = useMemo(() => {
    const selectedIndices = Object.keys(rowSelection)
      .filter((key) => rowSelection[key])
      .map((key) => parseInt(key, 10));
    return selectedIndices.map((index) => owners[index]).filter((owner): owner is IOwnerWithSync => owner !== undefined);
  }, [rowSelection, owners]);

  const hasSelection = selectedOwners.length === 1;
  const selectedOwner = hasSelection ? selectedOwners[0] : null;

  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [revertDialogOpen, setRevertDialogOpen] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Filter owners based on archived status
  const filteredOwners = useMemo(() => {
    console.log('=== FILTER DEBUG ===');
    console.log('showMoved:', showArchived);
    console.log('Total owners:', owners.length);
    console.log('Moved owners:', owners.filter((o) => o.isDeleted).length);
    console.log('Active owners:', owners.filter((o) => !o.isDeleted).length);

    if (showArchived) {
      console.log('Returning all owners');
      return owners;
    }
    const filtered = owners.filter((owner) => !owner.isDeleted);
    console.log('Returning filtered owners:', filtered.length);
    return filtered;
  }, [owners, showArchived]);

  // Debug effect
  useEffect(() => {
    console.log('showMoved changed to:', showArchived);
    console.log('filteredOwners count:', filteredOwners.length);
  }, [showArchived, filteredOwners]);

  // Add this too
  useEffect(() => {
    console.log('showMoved changed to:', showArchived);
    console.log('filteredOwners count:', filteredOwners.length);
  }, [showArchived, filteredOwners]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const checkOwnerStatuses = async () => {
      if (!showroomName || owners.length === 0) return;

      const statuses: Record<string, string> = {};

      // Check status for each owner
      for (const owner of owners) {
        try {
          const result = await window.electronAPI.listDocumentStatus({
            showroomName,
            ownerName: owner.name,
            ownerContact: owner.contact
          });

          statuses[owner.id] = result.status || 'pending';
        } catch (error) {
          console.error(`Error checking status for ${owner.name}:`, error);
          statuses[owner.id] = 'pending';
        }
      }

      setOwnerStatuses(statuses);
    };

    checkOwnerStatuses();
  }, [owners, showroomName]);

  useEffect(() => {
    if (!showroomName) {
      console.warn('No showroom selected');
    } else {
      console.log('Current showroom:', showroomName, 'ID:', currentShowroomId);
      // Auto-sync status can be checked here if needed
      const syncStatus = autoSyncService.getSyncStatus();
      if (syncStatus.recentSyncs.length > 0) {
        const lastSync = new Date(syncStatus.recentSyncs[0].timestamp);
        console.log('Last auto-sync:', lastSync.toLocaleString());
      }
    }
  }, [showroomName, currentShowroomId]);

  // Error handling
  useEffect(() => {
    if (ownersError) {
      setSnackbarMessage(`Error loading owners: ${ownersError.message}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  }, [ownersError]);

  useEffect(() => {
    console.log('Selection Debug:', {
      rowSelection,
      selectedOwnersCount: selectedOwners.length,
      selectedOwner: selectedOwner
        ? {
            id: selectedOwner.id,
            name: selectedOwner.name,
            contact: selectedOwner.contact,
            documentsCount: selectedOwner.documents?.length || 0
          }
        : null
    });
  }, [rowSelection, selectedOwners, selectedOwner]);

  const handleManualRefresh = useCallback(async () => {
    if (isManualRefreshing || !onlineStatus) return;

    setIsManualRefreshing(true);
    setSnackbarMessage('Refreshing data...');
    setSnackbarSeverity('info');
    setSnackbarOpen(true);

    try {
      await revalidateOwners(); // Remove the 'soft' argument
      setSnackbarMessage('Data refreshed');
      setSnackbarSeverity('success');
    } catch (error) {
      setSnackbarMessage('Refresh failed. Please try again.');
      setSnackbarSeverity('error');
    } finally {
      setIsManualRefreshing(false);
      setSnackbarOpen(true);
    }
  }, [isManualRefreshing, onlineStatus, revalidateOwners]);

  useRefreshShortcut(handleManualRefresh);

  const handleSnackbarClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  // ADD THIS ENTIRE FUNCTION after handleFolderClick:
  const handlePrintAllPDFs = async (owner: IOwner) => {
    try {
      if (!showroomName) {
        setSnackbarMessage('Showroom name not available. Please select a showroom.');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        return;
      }

      if (!owner.contact) {
        setSnackbarMessage('Owner mobile number is missing');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        return;
      }

      setIsPrinting(true);
      setSnackbarMessage(`Opening PDFs for ${owner.name}...`);
      setSnackbarSeverity('info');
      setSnackbarOpen(true);

      // Call electron API to print all PDFs
      const result = await window.electronAPI.printAllOwnerPDFs({
        showroomName,
        ownerName: owner.name,
        ownerContact: owner.contact
      });

      if (result.success) {
        setSnackbarMessage(`Opened ${result.count} PDF(s) for printing`);
        setSnackbarSeverity('success');
      } else {
        setSnackbarMessage(result.message || 'Failed to open PDFs');
        setSnackbarSeverity('error');
      }
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error printing PDFs:', error);
      const errorMessage = error instanceof Error ? `Error: ${error.message}` : 'Error printing PDFs';
      setSnackbarMessage(errorMessage);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleRevertOwner = () => {
    if (!selectedOwner) {
      setSnackbarMessage('Please select an owner to revert');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }

    if (!selectedOwner.isDeleted) {
      setSnackbarMessage('This owner is not moved');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }

    setRevertDialogOpen(true);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleForceSync = async () => {
    handleMenuClose();
    setSnackbarMessage('Clearing cache and re-syncing...');
    setSnackbarSeverity('info');
    setSnackbarOpen(true);

    // Clear cache and force reload
    clearCache();
    revalidateOwners();
  };

  const confirmRevertOwner = async () => {
    if (!selectedOwner || !currentShowroom) {
      setSnackbarMessage('Missing required information');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    setIsReverting(true);

    try {
      console.log('Step 1: Reverting folder from archive...');

      const revertResult = await window.electronAPI.revertOwnerFolder({
        showroomName: currentShowroom.showroomName,
        ownerName: selectedOwner.name,
        ownerContact: selectedOwner.contact
      });

      if (!revertResult.success) {
        setSnackbarMessage(`Failed to revert folder: ${revertResult.error}`);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        setIsReverting(false);
        return;
      }

      console.log('Folder reverted successfully from:', revertResult.archivedFrom);

      // Check if manual cleanup is needed
      if (revertResult.needsManualCleanup) {
        setSnackbarMessage(`Folder reverted but moved copy remains at: ${revertResult.archivedFrom}. Please delete it manually.`);
        setSnackbarSeverity('warning');
        setSnackbarOpen(true);
      }

      console.log('Step 2: Updating Firebase (unarchiving)...');
      const unarchiveResult = await unarchiveOwnerInFirebase(selectedOwner.id);

      if (!unarchiveResult.success) {
        console.error('Firebase update failed:', unarchiveResult.error);
        setSnackbarMessage(`Folder reverted but database update failed: ${unarchiveResult.error}`);
        setSnackbarSeverity('warning');
        setSnackbarOpen(true);
        setIsReverting(false);
        return;
      }

      console.log('Firebase updated successfully');

      console.log('Step 3: Updating cache...');
      const { updateOwner } = useOwnerStore.getState();
      updateOwner(selectedOwner.id, {
        isDeleted: false,
        modifiedAt: new Date()
      });

      if (!revertResult.needsManualCleanup) {
        setSnackbarMessage(`Successfully reverted ${selectedOwner.name} from archive`);
        setSnackbarSeverity('success');
      }

      setSnackbarOpen(true);
      setRevertDialogOpen(false);
      setRowSelection({});
    } catch (error) {
      console.error('Error reverting owner:', error);
      setSnackbarMessage('Error reverting owner from archive');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsReverting(false);
    }
  };

  const handleRemoveFromCache = (ownerId: string, ownerName: string) => {
    const { removeOwnerFromCache } = useOwnerStore.getState();
    removeOwnerFromCache(ownerId);

    // Clear the row selection
    setRowSelection({});

    setSnackbarMessage(`${ownerName} removed from cache`);
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };
  // Add this function to perform the actual cleanup
  const performFolderCleanup = async () => {
    // Add null check at the beginning
    if (!currentShowroom?.showroomName) {
      setSnackbarMessage('No showroom selected');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    setIsCleaningUp(true);
    setCleanupResult(null);

    try {
      // Get active owners (not deleted)
      const activeOwners = owners
        .filter((owner) => !owner.isDeleted) // Only non-deleted owners
        .map((owner) => ({
          name: owner.name,
          contact: owner.contact
        }));

      console.log(`Performing cleanup with ${activeOwners.length} active owners`);

      // Now TypeScript knows currentShowroom.showroomName is not null
      const result = await folderCleanupService.cleanupDeletedOwnerFolders(currentShowroom.showroomName, activeOwners);

      setCleanupResult(result);

      if (result.success) {
        if (result.deletedCount && result.deletedCount > 0) {
          setSnackbarMessage(`Successfully deleted ${result.deletedCount} folder${result.deletedCount > 1 ? 's' : ''}`);
          setSnackbarSeverity('success');
        } else {
          setSnackbarMessage('No orphaned folders found to delete');
          setSnackbarSeverity('info');
        }
      } else {
        setSnackbarMessage(`Cleanup failed: ${result.error}`);
        setSnackbarSeverity('error');
      }
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error during folder cleanup:', error);
      setSnackbarMessage('Error performing folder cleanup');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handleFolderClick = async (owner: IOwner) => {
    try {
      if (!showroomName) {
        setSnackbarMessage('Showroom name not available. Please select a showroom.');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        return;
      }

      const name = owner.name || 'Unknown';

      if (!owner.contact) {
        setSnackbarMessage('Owner mobile number is missing');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        return;
      }

      console.log('Opening folder for:', {
        showroomName,
        name,
        contact: owner.contact
      });

      const result = await folderService.openOwnerFolder(showroomName, name, owner.contact);

      if (result.success) {
        console.log('Folder opened successfully:', result.path);
      } else {
        setSnackbarMessage(result.message || 'Failed to open folder');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Error opening folder:', error);
      const errorMessage = error instanceof Error ? `Error: ${error.message}` : 'Error opening folder';
      setSnackbarMessage(errorMessage);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleSyncDocuments = async () => {
    if (!selectedOwner || !currentShowroom?.showroomName) {
      setSnackbarMessage('Please select one owner to sync');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }

    // Validate before sync
    const validation = fetchOwnerDocumentsService.validateOwnerForFetch(selectedOwner);
    if (!validation.isValid) {
      setSnackbarMessage(`Cannot sync: ${validation.reason}`);
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }

    // Open sync dialog to show documents list
    setSyncDialogOpen(true);
    setIsSyncing(true);

    try {
      console.log(`[SYNC] Starting sync for: ${selectedOwner.name}`);
      console.log(`[SYNC] Owner has ${selectedOwner.documents?.length || 0} documents`);

      // Fetch documents
      const result = await fetchOwnerDocumentsService.fetchSingleOwnerDocuments({
        showroomName: currentShowroom.showroomName,
        owner: selectedOwner
      });

      // In handleSyncDocuments, update the success message
      if (result.success) {
        const message = `✅ Synced ${result.documentsCount} documents for ${selectedOwner.name}`;
        const hashInfo =
          result.hashMatches !== undefined && result.hashMismatches !== undefined
            ? ` (${result.hashMatches} unchanged, ${result.hashMismatches} updated)`
            : '';

        setSnackbarMessage(message + hashInfo);
        setSnackbarSeverity('success');
        setSnackbarOpen(true);

        // Update the owner's sync status in store
        const { updateOwner } = useOwnerStore.getState();
        updateOwner(selectedOwner.id, {
          lastSynced: new Date().toISOString(),
          syncStatus: 'synced'
        });
      } else {
        setSnackbarMessage(`Sync failed: ${result.error}`);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        setSyncDialogOpen(false);
      }
    } catch (error) {
      console.error('[SYNC] Error:', error);
      setSnackbarMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setSyncDialogOpen(false);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleViewOwner = (owner: IOwner) => {
    navigate(`/owner/view/${owner.id}`);
  };

  const formatLastSync = () => {
    // Get sync status from autoSyncService
    const syncStatus = autoSyncService.getSyncStatus();

    if (syncStatus.recentSyncs.length === 0) return 'Never';

    const lastSync = new Date(syncStatus.recentSyncs[0].timestamp);
    const now = new Date();
    const diff = now.getTime() - lastSync.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return lastSync.toLocaleDateString();
  };

  const columns = useMemo<ColumnDef<IOwner>[]>(
    () => [
      ...getSelectAndIdColumns<IOwner>(),
      // Owner NAME column (existing)
      {
        header: 'Owner NAME',
        accessorKey: 'name',
        cell: ({ row }) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography>{row.original.name}</Typography>
            {row.original.isDeleted && (
              <Chip
                label="Moved"
                size="small"
                color="error"
                variant="outlined"
                sx={{
                  fontSize: '0.7rem',
                  height: '20px',
                  fontWeight: 600
                }}
              />
            )}
          </Box>
        ),
        meta: {
          className: 'cell-left',
          width: 700
        }
      },
      // MOBILE column (existing)
      {
        header: 'MOBILE',
        accessorKey: 'contact',
        meta: {
          className: 'cell-left',
          width: 250
        }
      },
      // NEW TYPE column
      {
        header: 'TYPE',
        id: 'type',
        accessorFn: (row) => row.isSalePoint,
        cell: ({ row }) => {
          const isSalePoint = row.original.isSalePoint;

          return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Chip
                icon={
                  isSalePoint ? <StorefrontIcon sx={{ fontSize: '16px !important' }} /> : <StoreIcon sx={{ fontSize: '16px !important' }} />
                }
                label={isSalePoint ? 'Sale Point' : 'Showroom'}
                size="small"
                variant="outlined"
                sx={{
                  fontWeight: 500,
                  fontSize: '0.75rem',
                  borderColor: isSalePoint ? '#ff9800' : '#009688',
                  color: isSalePoint ? '#ff9800' : '#009688',
                  '& .MuiChip-icon': {
                    marginLeft: '4px',
                    marginRight: '-2px',
                    color: isSalePoint ? '#ff9800' : '#009688'
                  },
                  '&:hover': {
                    backgroundColor: isSalePoint ? 'rgba(255, 152, 0, 0.08)' : 'rgba(0, 150, 136, 0.08)'
                  }
                }}
              />
            </Box>
          );
        },
        meta: {
          className: 'cell-center',
          width: 150
        }
      },
      // DOCUMENTS column (existing)
      {
        header: 'DOCUMENTS',
        id: 'documents',
        accessorFn: (row) => row.documents?.length || 0,
        cell: ({ row }) => <Typography>{row.original.documents?.length || 0}</Typography>,
        meta: {
          className: 'cell-center',
          width: 120
        }
      },
      {
        header: 'SYNC',
        id: 'syncStatus',
        cell: ({ row }) => {
          const owner = row.original as IOwnerWithSync;

          // Show "Archived" status for deleted owners
          if (owner.isDeleted) {
            return (
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Chip icon={<FolderDeleteIcon />} label="Moved" size="small" color="error" variant="outlined" sx={{ minWidth: 80 }} />
              </Box>
            );
          }

          const needsSync = owner.modifiedAt && owner.lastSynced ? new Date(owner.modifiedAt) > new Date(owner.lastSynced) : false;

          return (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Tooltip
                title={
                  needsSync
                    ? `Last modified: ${new Date(owner.modifiedAt).toLocaleString()}`
                    : owner.lastSynced
                      ? `Last synced: ${new Date(owner.lastSynced).toLocaleString()}`
                      : 'Never synced'
                }
              >
                <Chip
                  icon={needsSync ? <SyncIcon /> : <CheckCircleIcon />}
                  label={needsSync ? 'Pending' : 'Synced'}
                  size="small"
                  color={needsSync ? 'warning' : 'success'}
                  variant="outlined"
                  sx={{ minWidth: 80 }}
                />
              </Tooltip>
            </Box>
          );
        },
        meta: {
          className: 'cell-center',
          width: 100
        }
      },
      // ACTIONS column (existing)
      {
        header: 'ACTIONS',
        id: 'actions',
        cell: ({ row }) => {
          const isArchived = row.original.isDeleted;

          return (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title={isArchived ? 'Cannot view moved owner' : 'View Details'}>
                <span>
                  <IconButton
                    size="small"
                    color="info"
                    onClick={() => handleViewOwner(row.original)}
                    disabled={isArchived}
                    sx={{
                      '&:hover': {
                        backgroundColor: 'rgba(25, 118, 210, 0.08)'
                      }
                    }}
                  >
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title={isArchived ? 'Cannot open moved folder' : 'Open Folder'}>
                <span>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => handleFolderClick(row.original)}
                    disabled={isArchived}
                    sx={{
                      '&:hover': {
                        backgroundColor: 'rgba(0, 150, 136, 0.08)'
                      }
                    }}
                  >
                    <FolderIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title={isArchived ? 'Cannot print moved owner' : 'Print All PDFs'}>
                <span>
                  <IconButton
                    size="small"
                    color="secondary"
                    onClick={() => handlePrintAllPDFs(row.original)}
                    disabled={isArchived || isPrinting}
                    sx={{
                      '&:hover': {
                        backgroundColor: 'rgba(156, 39, 176, 0.08)'
                      }
                    }}
                  >
                    {isPrinting ? <CircularProgress size={18} /> : <PrintIcon fontSize="small" />}
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          );
        },
        meta: {
          className: 'cell-center',
          width: 180
        }
      }
    ],
    // Add ownerStatuses to dependencies
    [showroomName, handleSyncDocuments, handleViewOwner, handleFolderClick, ownerStatuses, isPrinting]
  );

  const exportColumns = useMemo(() => ['name', 'contact', 'isSalePoint'], []);

  if (isLoading && owners.length === 0) {
    return <ReactEmptyTable<IOwner> columns={columns} data={[]} />;
  }

  return (
    <Box
      sx={{
        height: 'calc(100vh - 88px)',
        display: 'flex',
        flexDirection: 'column',
        p: '48px 24px 8px 40px'
      }}
    >
      <Box sx={{ px: 3, py: 1.5, pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <h4
              style={{
                margin: 0,
                fontWeight: 600,
                fontSize: '1.25rem',
                lineHeight: 1.4,
                fontFamily: 'Poppins, sans-serif',
                color: '#009688'
              }}
            >
              Owner List ({filteredOwners.length})
              {showArchived && owners.filter((o) => o.isDeleted).length > 0 && (
                <span style={{ fontSize: '0.875rem', fontWeight: 400, marginLeft: '8px', color: '#666' }}>
                  ({owners.filter((o) => o.isDeleted).length} moved)
                </span>
              )}
            </h4>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                icon={onlineStatus ? <CloudIcon /> : <CloudOffIcon />}
                label={onlineStatus ? 'Online' : 'Offline'}
                size="small"
                color={onlineStatus ? 'success' : 'default'}
                variant="outlined"
              />
              <Chip icon={<StorageIcon />} label={`Cached: ${formatLastSync()}`} size="small" variant="outlined" />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {selectedOwners.length > 0 && (
              <Typography variant="caption" sx={{ color: 'text.secondary', mr: 1 }}>
                {selectedOwners.length} selected
                {selectedOwner && ` - ${selectedOwner.name}`}
              </Typography>
            )}

            <Button
              variant="contained"
              size="small"
              startIcon={isSyncing ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
              onClick={handleSyncDocuments}
              disabled={!hasSelection || isSyncing}
              sx={{
                textTransform: 'none',
                bgcolor: '#009688',
                color: 'white',
                minWidth: 100,
                '&:hover': {
                  bgcolor: '#00796b'
                },
                '&:disabled': {
                  bgcolor: '#ccc',
                  color: '#999'
                }
              }}
            >
              {isSyncing ? 'Syncing...' : 'Sync'}
            </Button>

            <IconButton onClick={handleMenuOpen} size="small">
              <MoreVertIcon />
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
              <MenuItem
                onClick={() => {
                  setShowArchived(!showArchived);
                  handleMenuClose();
                }}
              >
                <FolderDeleteIcon fontSize="small" sx={{ mr: 1, color: '#ff9800' }} />
                {showArchived ? 'Hide Moved Owners' : 'Show Moved Owners'}
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleMenuClose();
                  handleRevertOwner();
                }}
                disabled={!selectedOwner || !selectedOwner.isDeleted}
              >
                <SettingsBackupRestoreIcon fontSize="small" sx={{ mr: 1, color: 'success.main' }} />
                Revert from Moved
              </MenuItem>

              <MenuItem divider />
              <MenuItem
                onClick={() => {
                  if (selectedOwner) {
                    handleRemoveFromCache(selectedOwner.id, selectedOwner.name);
                  } else {
                    setSnackbarMessage('Please select an owner first');
                    setSnackbarSeverity('warning');
                    setSnackbarOpen(true);
                  }
                  handleMenuClose();
                }}
                disabled={!selectedOwner}
              >
                <DeleteIcon fontSize="small" sx={{ mr: 1, color: 'error.main' }} />
                Remove from Cache
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleMenuClose();
                  setConfirmAction({
                    title: 'Refresh Data',
                    message: 'This will fetch the latest owner data from Firebase server.',
                    action: handleManualRefresh,
                    severity: 'info'
                  });
                  setConfirmDialogOpen(true);
                }}
                disabled={isManualRefreshing || !onlineStatus}
              >
                <RefreshIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                Refresh Data
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleMenuClose();
                  setConfirmAction({
                    title: 'Force Sync (Clear & Reload)',
                    message: 'This will clear all cached data and fetch fresh data from Firebase server.',
                    action: handleForceSync,
                    severity: 'warning'
                  });
                  setConfirmDialogOpen(true);
                }}
                disabled={!onlineStatus}
              >
                <RefreshIcon fontSize="small" sx={{ mr: 1 }} />
                Force Sync (Clear & Reload)
              </MenuItem>
            </Menu>
          </Box>
        </Box>
      </Box>

      <Dialog open={cleanupDialogOpen} onClose={() => !isCleaningUp && setCleanupDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FolderDeleteIcon color="error" />
            <Typography variant="h6">Clean Up Deleted Owner Folders</Typography>
          </Box>
        </DialogTitle>

        <DialogContent>
          {!cleanupResult ? (
            <>
              <Typography variant="body1" gutterBottom>
                This will scan the showroom folder and delete any folders that belong to owners who have been removed from the system.
              </Typography>

              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Warning:</strong> This action cannot be undone. Folders and all their contents will be permanently deleted.
                </Typography>
              </Alert>

              <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Current Status:
                </Typography>
                <Typography variant="body2">
                  • Showroom: <strong>{currentShowroom?.showroomName || 'None'}</strong>
                </Typography>
                <Typography variant="body2">
                  • Active owners: <strong>{owners.filter((o) => !o.isDeleted).length}</strong>
                </Typography>
                <Typography variant="body2">
                  • Total owners: <strong>{owners.length}</strong>
                </Typography>
              </Box>

              {isCleaningUp && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Scanning folders...
                  </Typography>
                  <LinearProgress />
                </Box>
              )}
            </>
          ) : (
            <Box sx={{ mt: 2 }}>
              {cleanupResult.success ? (
                <>
                  <Alert severity={cleanupResult.deletedCount && cleanupResult.deletedCount > 0 ? 'success' : 'info'} sx={{ mb: 2 }}>
                    {cleanupResult.deletedCount && cleanupResult.deletedCount > 0
                      ? `Successfully deleted ${cleanupResult.deletedCount} folder${cleanupResult.deletedCount > 1 ? 's' : ''}`
                      : 'No orphaned folders found to delete'}
                  </Alert>

                  {cleanupResult.deletedFolders && cleanupResult.deletedFolders.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Deleted folders:
                      </Typography>
                      <Box
                        sx={{
                          maxHeight: 200,
                          overflow: 'auto',
                          bgcolor: 'grey.50',
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1,
                          p: 1
                        }}
                      >
                        {cleanupResult.deletedFolders.map((folder: string, index: number) => (
                          <Typography
                            key={index}
                            variant="body2"
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: '0.875rem',
                              py: 0.5,
                              color: 'error.main',
                              '&:hover': {
                                bgcolor: 'action.hover',
                                px: 1,
                                mx: -1
                              }
                            }}
                          >
                            📁 {folder}
                          </Typography>
                        ))}
                      </Box>
                    </Box>
                  )}

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      📊 Total folders scanned: <strong>{cleanupResult.totalFolders || 0}</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ✅ Folders kept: <strong>{cleanupResult.skippedCount || 0}</strong>
                    </Typography>
                    {cleanupResult.deletedCount && cleanupResult.deletedCount > 0 && (
                      <Typography variant="body2" color="error">
                        🗑️ Folders deleted: <strong>{cleanupResult.deletedCount}</strong>
                      </Typography>
                    )}
                  </Box>
                </>
              ) : (
                <Alert severity="error" sx={{ mb: 2 }}>
                  Cleanup failed: {cleanupResult.error || 'Unknown error'}
                </Alert>
              )}

              {cleanupResult.errors && cleanupResult.errors.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Alert severity="warning" sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Some folders could not be deleted:
                    </Typography>
                  </Alert>
                  <Box
                    sx={{
                      maxHeight: 150,
                      overflow: 'auto',
                      bgcolor: 'error.50',
                      border: 1,
                      borderColor: 'error.200',
                      borderRadius: 1,
                      p: 1
                    }}
                  >
                    {cleanupResult.errors.map((err: { folder: string; error: string }, index: number) => (
                      <Typography
                        key={index}
                        variant="body2"
                        color="error"
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          py: 0.25
                        }}
                      >
                        ❌ {err.folder}: {err.error}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          {!cleanupResult ? (
            <>
              <Button onClick={() => setCleanupDialogOpen(false)} disabled={isCleaningUp} variant="outlined">
                Cancel
              </Button>
              <Button
                onClick={performFolderCleanup}
                color="error"
                variant="contained"
                disabled={isCleaningUp || !currentShowroom}
                startIcon={isCleaningUp ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
              >
                {isCleaningUp ? 'Cleaning...' : 'Delete Folders'}
              </Button>
            </>
          ) : (
            <>
              {cleanupResult.deletedCount && cleanupResult.deletedCount > 0 && (
                <Button
                  onClick={() => {
                    // Optionally refresh the owner list or perform other actions
                    setCleanupDialogOpen(false);
                    setCleanupResult(null);
                  }}
                  color="primary"
                  variant="text"
                >
                  Refresh List
                </Button>
              )}
              <Button
                onClick={() => {
                  setCleanupDialogOpen(false);
                  setCleanupResult(null);
                }}
                variant="contained"
              >
                Close
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Revert Dialog */}
      <Dialog open={revertDialogOpen} onClose={() => !isReverting && setRevertDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <RefreshIcon color="success" />
            <Typography variant="h6">Revert Owner from Archive</Typography>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to revert <strong>{selectedOwner?.name}</strong> from the archive?
          </Typography>

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">This will:</Typography>
            <Box component="ul" sx={{ pl: 2, mt: 1, mb: 0 }}>
              <li>
                Move the folder back to <strong>1 FromMobiles</strong>
              </li>
              <li>Restore the owner and documents in the database</li>
              <li>Make the owner active again</li>
            </Box>
          </Alert>

          {isReverting && (
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Reverting folder...
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setRevertDialogOpen(false)} disabled={isReverting} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={confirmRevertOwner}
            color="success"
            variant="contained"
            disabled={isReverting}
            startIcon={isReverting ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
          >
            {isReverting ? 'Reverting...' : 'Revert Owner'}
          </Button>
        </DialogActions>
      </Dialog>

      <Box
        sx={{
          flexGrow: 1,
          px: 3,
          pb: 2,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <ReactTable<IOwner>
          columns={columns}
          exportColumns={exportColumns}
          data={filteredOwners}
          isAddButtonVisible={false}
          entityName="Owner"
          rowSelection={rowSelection}
          onRowSelection={(value) => setRowSelection(value)}
          enablePagination={true}
        />
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
      <Dialog open={syncDialogOpen} onClose={() => !isSyncing && setSyncDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SyncIcon color="primary" />
            <Typography variant="h6">Syncing Documents for {selectedOwner?.name}</Typography>
          </Box>
        </DialogTitle>

        <DialogContent>
          {/* Show loading while syncing */}
          {isSyncing && (
            <Box sx={{ mb: 2, textAlign: 'center' }}>
              <CircularProgress sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                Fetching documents...
              </Typography>
            </Box>
          )}

          {/* Document List */}
          {selectedOwner?.documents && selectedOwner.documents.length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Documents ({selectedOwner.documents.length}):
              </Typography>
              <List
                dense
                sx={{
                  maxHeight: 400,
                  overflow: 'auto',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'background.paper'
                }}
              >
                {selectedOwner.documents.map((doc) => (
                  <ListItem key={doc.fileName}>
                    <ListItemIcon>
                      <CheckCircleIcon color={doc.isUploaded === false ? 'error' : isSyncing ? 'disabled' : 'success'} fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={doc.fileName}
                      secondary={
                        <Box component="span">
                          {doc.documentType}
                          {doc.version && ` • v${doc.version}`}
                          {doc.metadata?.md5Hash && ' • Hash: ✓'}
                          {doc.uploadedStatus === 'pending' && ' • Pending'}
                        </Box>
                      }
                      primaryTypographyProps={{
                        variant: 'body2'
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setSyncDialogOpen(false)} disabled={isSyncing}>
            {isSyncing ? 'Syncing...' : 'Close'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {confirmAction?.severity === 'error' && <DeleteIcon color="error" />}
            {confirmAction?.severity === 'warning' && <RefreshIcon color="warning" />}
            {confirmAction?.severity === 'info' && <CloudIcon color="info" />}
            <Typography variant="h6">{confirmAction?.title}</Typography>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Typography variant="body1" gutterBottom>
            {confirmAction?.message}
          </Typography>

          <Alert severity={confirmAction?.severity || 'warning'} sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Note:</strong> This action will fetch data from Firebase and may incur charges.
            </Typography>
          </Alert>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={() => {
              confirmAction?.action();
              setConfirmDialogOpen(false);
            }}
            variant="contained"
            color={confirmAction?.severity === 'error' ? 'error' : 'primary'}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OwnerList;
