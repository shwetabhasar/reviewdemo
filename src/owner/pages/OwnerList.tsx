/* eslint-disable react-hooks/exhaustive-deps */
// src/owner/components/OwnerList.tsx

import { ColumnDef } from '@tanstack/react-table';
import { useMemo, useState, useEffect } from 'react';
import ReactTable from 'components/appseeds/react-table/ReactTable';
import { getSelectAndIdColumns } from 'components/appseeds/react-table/ReactTableUtils';
import { Snackbar, IconButton, Tooltip, Alert, Button, Box, Chip, Menu, MenuItem, CircularProgress, Typography } from '@mui/material';
import {
  Folder as FolderIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  Cloud as CloudIcon,
  CloudOff as CloudOffIcon,
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
      // Check if electronAPI exists
      if (!window.electronAPI || !window.electronAPI.getOwnerList) {
        throw new Error('Electron API not available. Please ensure the app is running in Electron.');
      }

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

  // Define table columns with proper alignment
  const columns = useMemo<ColumnDef<Owner>[]>(() => {
    const baseColumns: ColumnDef<Owner>[] = [
      {
        id: 'name',
        header: 'NAME',
        accessorKey: 'name',
        size: 350,
        cell: ({ row }) => (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 500,
              fontSize: '14px',
              lineHeight: '40px',
              color: '#333'
            }}
          >
            {row.original.name}
          </Typography>
          </Box>
        )
      },
      {
        id: 'contact',
        header: 'CONTACT',
        accessorKey: 'contact',
        size: 250,
        cell: ({ row }) => (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Typography 
            variant="body2"
            sx={{ 
              fontSize: '14px',
              lineHeight: '40px',
              color: '#666'
            }}
          >
            {row.original.contact}
          </Typography>
          </Box>
        )
      },
      {
        id: 'actions',
        header: 'ACTIONS',
        size: 150,
        cell: ({ row }) => (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Tooltip title="Open Folder">
              <IconButton 
                size="medium" 
                onClick={() => handleOpenFolder(row.original.folderPath)} 
                sx={{ 
                  color: '#008080',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 128, 128, 0.08)'
                  }
                }}
              >
                <FolderIcon />
              </IconButton>
            </Tooltip>
          </Box>
        )
      }
    ];

    const selectAndIdColumns = getSelectAndIdColumns<Owner>();
    return [...selectAndIdColumns, ...baseColumns];
  }, []);

  // Export columns (for export functionality)
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
        bgcolor: '#ffffff'
      }}
    >
      {/* Header Section - Enhanced Visibility */}
      <Box 
        sx={{ 
          px: 4, 
          py: 5,
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          borderBottom: '3px solid #0d47a1'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography 
              sx={{ 
                fontSize: '32px',
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
                mb: 1.5
              }}
            >
              Owner List ({owners.length})
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip
                label={onlineStatus ? 'Online' : 'Offline'}
                size="small"
                icon={onlineStatus ? <CloudIcon /> : <CloudOffIcon />}
                sx={{
                  backgroundColor: onlineStatus ? '#4caf50' : '#757575',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '12px'
                }}
              />
              <Chip 
                label="Cached: Never" 
                size="small"
                sx={{ 
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '12px',
                  border: '1px solid rgba(255,255,255,0.3)'
                }} 
              />
              {showroomName && (
                <Chip 
                  label={`Showroom: ${showroomName}`} 
                  size="small"
                  sx={{ 
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '12px',
                    border: '1px solid rgba(255,255,255,0.3)'
                  }}
                />
              )}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="contained"
              size="large"
              startIcon={isManualRefreshing ? <CircularProgress size={18} sx={{ color: 'white' }} /> : <SyncIcon />}
              onClick={handleManualRefresh}
              disabled={isManualRefreshing}
              sx={{
                backgroundColor: '#ffffff',
                color: '#1976d2',
                fontWeight: 700,
                fontSize: '14px',
                px: 3,
                py: 1,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                '&:hover': {
                  backgroundColor: '#f5f5f5',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                },
                transition: 'all 0.3s ease'
              }}
            >
              Sync
            </Button>

            <IconButton 
              onClick={handleMenuClick}
              sx={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '2px solid rgba(255,255,255,0.3)',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.3)'
                }
              }}
            >
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
                sx={{ fontWeight: 600 }}
              >
                <RefreshIcon fontSize="small" sx={{ mr: 1 }} />
                Refresh List
              </MenuItem>
            </Menu>
          </Box>
        </Box>
      </Box>

      {/* Table Section */}
      <Box
        sx={{
          flexGrow: 1,
          px: 3,
          py: 3,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#fafafa'
        }}
      >
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress size={50} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2, fontSize: '14px', fontWeight: 600 }}>
            {error}
            <Button size="small" onClick={loadOwners} sx={{ ml: 2, fontWeight: 700 }}>
              Retry
            </Button>
          </Alert>
      ) : (
          <Box sx={{ 
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            overflow: 'hidden',
            height: '100%',
            '& table': {
              width: '100%',
              tableLayout: 'fixed',
            },
            '& thead th': {
              textAlign: 'left !important',
              paddingLeft: '16px !important',
              paddingRight: '16px !important',
              paddingTop: '12px !important',
              paddingBottom: '12px !important',
              verticalAlign: 'middle !important',
            },
            '& tbody td': {
              textAlign: 'left !important',
              paddingLeft: '16px !important',
              paddingRight: '16px !important',
              paddingTop: '12px !important',
              paddingBottom: '12px !important',
              verticalAlign: 'middle !important',
            },
            '& thead th:last-child': {
              textAlign: 'center !important',
            },
            '& tbody td:last-child': {
              textAlign: 'center !important',
            }
          }}>
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
          </Box>
        )}
      </Box>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%', fontWeight: 600 }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default OwnerList;
