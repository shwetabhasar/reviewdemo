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
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', pl: 0 }}>
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
                  color: '#0f745aff',
                  '&:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 0.08)'
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
        bgcolor: '#fafafa'
      }}
    >
      {/* OWNER LIST Header - Exact Match to Screenshot */}
      <Box
        sx={{
          px: 4,
          py: 7,
          background: '#1976d2w',
          color: '#0ea37eff',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <Box
  sx={{
    display: 'flex',
    alignItems: 'flex-start', // aligns top of title with top of button group
    justifyContent: 'space-between',
    mt: 1,
  }}
>

          {/* Left Section: Title and Chips BELOW it */}
<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
  {/* OWNER LIST Title */}
  <Typography
    sx={{
      fontSize: '26px',
      fontWeight: 700,
      color: '#17ad8dff',
      letterSpacing: '0.5px',
      textTransform: 'uppercase',
      lineHeight: 1.2,
      pb: 0.5, // small padding below title
    }}
  >
    OWNER LIST ({owners.length})
  </Typography>

  {/* Chips row below the title */}
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      mt: 0.5, // space between title and chips
    }}
  >
    <Chip
      label={onlineStatus ? 'Online' : 'Offline'}
      size="small"
      icon={onlineStatus ? <CloudIcon sx={{ fontSize: '14px !important' }} /> : <CloudOffIcon sx={{ fontSize: '14px !important' }} />}
      sx={{
        backgroundColor: onlineStatus ? '#18a381ff' : '#757575',
        color: '#ffffff',
        fontWeight: 600,
        fontSize: '11px',
        height: '26px',
        borderRadius: '4px',
        '& .MuiChip-icon': {
          color: '#ffffff',
          marginLeft: '6px',
        },
      }}
    />
    <Chip
      label="Cached: Never"
      size="small"
      sx={{
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        color: '#121313f8',
        fontWeight: 500,
        fontSize: '14px',
        height: '26px',
        borderRadius: '4px',
      }}
    />
    {showroomName && (
      <Chip
        label={`Showroom: ${showroomName}`}
        size="small"
        sx={{
          color: '#17a871ff',
          fontWeight: 500,
          fontSize: '14px',
          height: '26px',
          borderRadius: '4px',
        }}
      />
    )}
  </Box>
</Box>



          {/* Right Section: Sync + Menu */}
          <Box
  sx={{
    display: 'flex',
    alignItems: 'flex-start', // match alignment with title
    justifyContent: 'flex-end',
    gap: 1.5,
    pt: 0.5, // slight top padding to center visually
  }}
>

            <Button
              variant="contained"
              size="medium"
              startIcon={
                isManualRefreshing ? (
                  <CircularProgress size={16} sx={{ color: '#1976d2' }} />
                ) : (
                  <SyncIcon sx={{ fontSize: '18px' }} />
                )
              }
              onClick={handleManualRefresh}
              disabled={isManualRefreshing}
              sx={{
                backgroundColor: '#ffffff',
                color: 'rgba(0, 7, 6, 1)',
                fontWeight: 600,
                fontSize: '14px',
                px: 2.5,
                py: 0.8,
                textTransform: 'none',
                borderRadius: '4px',
                boxShadow: 'none',
                minWidth: 'auto',
                '&:hover': {
                  backgroundColor: '#fafafa',
                  boxShadow: 'none',
                },
                '&:disabled': {
                  backgroundColor: '#e0e0e0',
                  color: '#999',
                }
              }}
            >
              Sync
            </Button>

            <IconButton
              onClick={handleMenuClick}
              sx={{
                backgroundColor: 'transparent',
                color: '#0c0c0cff',
                width: '36px',
                height: '36px',
                borderRadius: '4px',
                '&:hover': { 
                  backgroundColor: 'rgba(255, 255, 255, 0.1)' 
                },
              }}
            >
              <MoreVertIcon />
            </IconButton>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              PaperProps={{
                sx: {
                  mt: 0.5,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  borderRadius: '4px'
                }
              }}
            >
              <MenuItem
                onClick={() => {
                  handleMenuClose();
                  handleManualRefresh();
                }}
                sx={{ 
                  fontWeight: 500,
                  fontSize: '14px',
                  py: 1.5,
                  px: 2
                }}
              >
                <RefreshIcon fontSize="small" sx={{ mr: 1.5 }} />
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
    py: 1, // reduced from 3 to 1.5
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f5f5f5',
  }}
>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress size={50} sx={{ color: '#1976d2' }} />
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
            backgroundColor: '#ffffff',
            borderRadius: '4px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            overflow: 'hidden',
            height: '100%',
            border: '1px solid #e0e0e0',
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
            '& thead th:first-child': {
              width: '60px !important',
              paddingRight: '8px !important',
              paddingLeft: '24px !important',
            },
            '& thead th:nth-child(2)': {
              paddingLeft: '8px !important',
              paddingRight: '16px !important',
            },
            '& thead th:nth-child(3)': {
              paddingLeft: '16px !important',
            },
            '& tbody td': {
              textAlign: 'left !important',
              paddingLeft: '16px !important',
              paddingRight: '16px !important',
              paddingTop: '12px !important',
              paddingBottom: '12px !important',
              verticalAlign: 'middle !important',
            },
            '& tbody td:first-child': {
              width: '60px !important',
              paddingRight: '8px !important',
              paddingLeft: '24px !important',
            },
            '& tbody td:nth-child(2)': {
              paddingLeft: '8px !important',
              paddingRight: '16px !important',
            },
            '& tbody td:nth-child(3)': {
              paddingLeft: '16px !important',
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