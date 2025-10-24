// src/owner/components/OwnerList.tsx

import { ColumnDef } from '@tanstack/react-table';
import { useMemo, useState, useEffect } from 'react';
import ReactTable from 'components/appseeds/react-table/ReactTable';
import { getSelectAndIdColumns } from 'components/appseeds/react-table/ReactTableUtils';
import { Snackbar, IconButton, Tooltip, Alert, Button, Box, Chip, Menu, MenuItem, CircularProgress, Typography } from '@mui/material';
import {
  Folder as FolderIcon,
  Visibility as VisibilityIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  Cloud as CloudIcon,
  CloudOff as CloudOffIcon,
  Print as PrintIcon,
  Sync as SyncIcon
} from '@mui/icons-material';
import { useShowroom } from 'access/contexts/showRoomContext';

// Define the Owner interface matching your electron types
interface Owner {
  id: string;
  name: string;
  contact: string;
  mobile: string;
  folderPath: string;
  status?: string;
  syncStatus?: string;
}

const OwnerList = () => {
  // State for owners data
  const [owners, setOwners] = useState<Owner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [basePath] = useState<string>('D:\\Tri-Color Honda');

  // UI state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [onlineStatus, setOnlineStatus] = useState(navigator.onLine);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  const { currentShowroom } = useShowroom();
  const showroomName = currentShowroom?.showroomName || '';

  // Load owners from localStorage/electron API
  const loadOwners = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get owner list from electron API (which reads from local storage)
      const result = await window.electronAPI.getOwnerList(basePath);

      if (result.success) {
        // Transform the data to match the expected format
        const transformedOwners: Owner[] = (result.owners || []).map((owner: any, index: number) => ({
          id: owner.mobile || `owner-${index}`,
          name: owner.name,
          contact: owner.mobile,
          mobile: owner.mobile,
          folderPath: owner.folderPath,
          status: 'active',
          syncStatus: 'synced'
        }));

        setOwners(transformedOwners);
        setSnackbarMessage(`Loaded ${transformedOwners.length} owners`);
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } else {
        setError(result.error || 'Failed to load owners');
        setSnackbarMessage(result.error || 'Failed to load owners');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while loading owners';
      setError(errorMessage);
      setSnackbarMessage(errorMessage);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsLoading(false);
      setIsManualRefreshing(false);
    }
  };

  // Handle opening folder
  const handleOpenFolder = async (folderPath: string) => {
    try {
      const result = await window.electronAPI.openOwnerFolder(folderPath);

      if (!result.success) {
        setSnackbarMessage(`Failed to open folder: ${result.error}`);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setSnackbarMessage(`Error: ${errorMessage}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // Handle view owner
  const handleViewOwner = (owner: Owner) => {
    // You can customize this to navigate to a detail view or open a dialog
    handleOpenFolder(owner.folderPath);
  };

  // Handle print
  const handlePrint = (owner: Owner) => {
    setSnackbarMessage(`Print functionality for ${owner.name} - Coming soon`);
    setSnackbarSeverity('info');
    setSnackbarOpen(true);
  };

  // Manual refresh
  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    await loadOwners();
  };

  // Load owners on component mount
  useEffect(() => {
    loadOwners();
  }, []);

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

  // Define table columns
  const columns = useMemo<ColumnDef<Owner>[]>(() => {
    const baseColumns: ColumnDef<Owner>[] = [
      {
        id: 'name',
        header: 'Name',
        accessorKey: 'name',
        cell: ({ row }) => (
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {row.original.name}
            </Typography>
          </Box>
        )
      },
      {
        id: 'contact',
        header: 'Contact',
        accessorKey: 'contact',
        cell: ({ row }) => (
          <Typography variant="body2" color="text.secondary">
            {row.original.contact}
          </Typography>
        )
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => (
          <Chip
            label="Showroom"
            size="small"
            color="primary"
            icon={<FolderIcon sx={{ fontSize: 16 }} />}
            sx={{
              backgroundColor: 'rgba(0, 128, 128, 0.1)',
              color: 'teal',
              '& .MuiChip-icon': {
                color: 'teal'
              }
            }}
          />
        )
      },
      {
        id: 'syncStatus',
        header: 'Sync Status',
        accessorKey: 'syncStatus',
        cell: ({ row }) => (
          <Chip
            label="Synced"
            size="small"
            color="success"
            icon={<CloudIcon sx={{ fontSize: 16 }} />}
            sx={{
              backgroundColor: 'rgba(76, 175, 80, 0.1)',
              color: 'success.main'
            }}
          />
        )
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
            <Tooltip title="View">
              <IconButton size="small" onClick={() => handleViewOwner(row.original)} sx={{ color: 'teal' }}>
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Open Folder">
              <IconButton size="small" onClick={() => handleOpenFolder(row.original.folderPath)} sx={{ color: 'teal' }}>
                <FolderIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Print">
              <IconButton size="small" onClick={() => handlePrint(row.original)} sx={{ color: 'gray' }}>
                <PrintIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )
      }
    ];

    // Combine select/id columns with base columns
    // If getSelectAndIdColumns doesn't accept arguments, we need to spread the columns
    const selectAndIdColumns = getSelectAndIdColumns<Owner>();
    return [...selectAndIdColumns, ...baseColumns];
  }, []);

  // Export columns (for export functionality) - should be string array of column IDs
  const exportColumns = useMemo<string[]>(() => {
    return ['name', 'contact', 'folderPath'];
  }, []);

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        bgcolor: 'background.default'
      }}
    >
      {/* Header */}
      <Box sx={{ px: 3, pt: 3, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="h5" fontWeight="bold" color="primary.main" gutterBottom>
              Owner List ({owners.length})
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip
                label={onlineStatus ? 'Online' : 'Offline'}
                size="small"
                color={onlineStatus ? 'success' : 'default'}
                icon={onlineStatus ? <CloudIcon /> : <CloudOffIcon />}
                sx={{
                  backgroundColor: onlineStatus ? 'rgba(76, 175, 80, 0.1)' : 'rgba(0, 0, 0, 0.08)'
                }}
              />
              <Chip label="Cached: Never" size="small" variant="outlined" sx={{ borderColor: 'divider' }} />
              {showroomName && <Chip label={`Showroom: ${showroomName}`} size="small" color="info" variant="outlined" />}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={isManualRefreshing ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
              onClick={handleManualRefresh}
              disabled={isManualRefreshing}
              sx={{
                borderColor: 'divider',
                color: 'text.primary',
                '&:hover': {
                  backgroundColor: 'action.hover'
                }
              }}
            >
              Sync
            </Button>

            <IconButton onClick={handleMenuClick} size="small">
              <MoreVertIcon />
            </IconButton>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right'
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right'
              }}
            >
              <MenuItem
                onClick={() => {
                  handleMenuClose();
                  handleManualRefresh();
                }}
              >
                <RefreshIcon fontSize="small" sx={{ mr: 1 }} />
                Refresh List
              </MenuItem>
            </Menu>
          </Box>
        </Box>
      </Box>

      {/* Table */}
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
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
            <Button size="small" onClick={loadOwners} sx={{ ml: 2 }}>
              Retry
            </Button>
          </Alert>
        ) : (
          <ReactTable<Owner>
            columns={columns}
            exportColumns={exportColumns}
            data={owners}
            isAddButtonVisible={false}
            entityName="Owner"
            rowSelection={rowSelection}
            onRowSelection={(value) => setRowSelection(value)}
            enablePagination={true}
          />
        )}
      </Box>

      {/* Snackbar for notifications */}
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
    </Box>
  );
};

export default OwnerList;
