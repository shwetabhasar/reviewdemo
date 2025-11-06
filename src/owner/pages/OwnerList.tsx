/* eslint-disable react-hooks/exhaustive-deps */
// src/owner/components/OwnerList.tsx

import { ColumnDef } from '@tanstack/react-table';
import { useMemo, useState, useEffect } from 'react';
import ReactTable from 'components/appseeds/react-table/ReactTable';
import { getSelectAndIdColumns } from 'components/appseeds/react-table/ReactTableUtils';
import {
  Snackbar,
  IconButton,
  Tooltip,
  Alert,
  Button,
  Box,
  Chip,
  Menu,
  MenuItem,
  CircularProgress,
  Typography
} from '@mui/material';
import {
  Folder as FolderIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  Cloud as CloudIcon,
  CloudOff as CloudOffIcon,
  Sync as SyncIcon,
  Compare as CompareIcon
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
  const [snackbarSeverity, setSnackbarSeverity] =
    useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [onlineStatus, setOnlineStatus] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  const { currentShowroom } = useShowroom();
  const showroomName = currentShowroom?.showroomName || '';

  // Load owners from localStorage/electron API
  const loadOwners = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!window.electronAPI || !window.electronAPI.getOwnerList) {
        throw new Error(
          'Electron API not available. Please ensure the app is running in Electron.'
        );
      }

      const result = await window.electronAPI.getOwnerList(basePath);

      if (result.success) {
        const transformedOwners: Owner[] = (result.owners || []).map(
          (owner: any, index: number) => ({
            id: owner.mobile || `owner-${index}`,
            name: owner.name,
            contact: owner.mobile,
            mobile: owner.mobile,
            folderPath: owner.folderPath,
            status: 'active',
            syncStatus: 'synced'
          })
        );

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
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'An error occurred while loading owners';
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
      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred';
      setSnackbarMessage(`Error: ${errorMessage}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // Handle compare action
  // NEW CODE - Replace with this:
const handleCompare = async (owner: Owner) => {
  try {
    setSnackbarMessage(`Opening PDF selector for ${owner.name}...`);
    setSnackbarSeverity('info');
    setSnackbarOpen(true);

    const result = await window.electronAPI.comparePdfs(owner.name, basePath);

    if (result.canceled) {
      setSnackbarMessage('PDF selection cancelled');
      setSnackbarSeverity('info');
      setSnackbarOpen(true);
      return;
    }

    if (!result.success) {
      setSnackbarMessage(result.error || 'Failed to select PDFs for comparison');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    if (!result.files || result.files.length === 0) {
      setSnackbarMessage('No PDFs were selected');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }

    console.log('Selected PDFs for comparison:', result.files);
setSnackbarMessage(
  `${result.count || result.files?.length || 0} PDFs selected for ${owner.name}. Ready to compare!`  // <-- NEW LINE
);
setSnackbarSeverity('success');
    setSnackbarOpen(true);

    handlePDFComparison(result.files, owner.name);

  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : 'An error occurred during comparison';
    console.error('Compare error:', err);
    setSnackbarMessage(`Error: ${errorMessage}`);
    setSnackbarSeverity('error');
    setSnackbarOpen(true);
  }
};

// Add this helper function right after handleCompare:
const handlePDFComparison = (pdfPaths: string[] | undefined, ownerName: string) => {
  if (!pdfPaths || pdfPaths.length === 0) {
    console.log('No PDF paths provided for comparison');
    return;
  }
  
  console.log(`Comparing PDFs for ${ownerName}:`, pdfPaths);
  // TODO: Implement what you want to do with the selected PDFs
};

  // Manual refresh
  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    await loadOwners();
  };

  useEffect(() => {
    loadOwners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, []);

  // Define table columns (kept as you had, left-aligned cells)
  const columns = useMemo<ColumnDef<Owner>[]>(() => {
    const baseColumns: ColumnDef<Owner>[] = [
      {
  id: 'name',
  header: () => (
    <Typography sx={{ textAlign: 'left', fontWeight: 600 }}>
      NAME
    </Typography>
  ),
  accessorKey: 'name',
  size: 350,
  cell: ({ row }) => (
    <Typography
      variant="body2"
      sx={{
        fontWeight: 500,
        fontSize: '14px',
        color: '#333',
        textAlign: 'left'
      }}
    >
      {row.original.name}
    </Typography>
  )
},
{
  id: 'contact',
  header: () => (
    <Typography sx={{ textAlign: 'left', fontWeight: 600 }}>
      CONTACT
    </Typography>
  ),
  accessorKey: 'contact',
  size: 250,
  cell: ({ row }) => (
    <Typography
      variant="body2"
      sx={{
        fontSize: '14px',
        color: '#666',
        textAlign: 'left'
      }}
    >
      {row.original.contact}
    </Typography>
  )
},

      {
        id: 'actions',
        header: 'ACTIONS',
        size: 150,
        cell: ({ row }) => (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 1
            }}
          >
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
            <Tooltip title="Compare">
              <IconButton
                size="medium"
                onClick={() => handleCompare(row.original)}
                sx={{
                  color: '#1976d2',
                  '&:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 0.08)'
                  }
                }}
              >
                <CompareIcon />
              </IconButton>
            </Tooltip>
          </Box>
        )
      }
    ];

    const selectAndIdColumns = getSelectAndIdColumns<Owner>();
    return [...selectAndIdColumns, ...baseColumns];
  }, []);

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

  // NOTE: outer container is the single scroll container now (no nested scrollbars).
  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto', // single scrollbar for entire screen
        overflowX: 'hidden',
        '&::-webkit-scrollbar': {
          width: '6px'
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: '#bfbfbf',
          borderRadius: '4px'
        },
        '&::-webkit-scrollbar-thumb:hover': {
          backgroundColor: '#999'
        }
      }}
    >
      {/* OWNER LIST Header - Fixed at top of the flow (not position:fixed) */}
      <Box
        sx={{
          px: 4,
          py: 7,
          background: '#ffffff',
          color: '#0ea37eff',
          flexShrink: 0
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            mt: 0.5
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
                pb: 0.5
              }}
            >
              OWNER LIST ({owners.length})
            </Typography>

            {/* Chips row below the title */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mt: 0.5
              }}
            >
              <Chip
                label={onlineStatus ? 'Online' : 'Offline'}
                size="small"
                icon={
                  onlineStatus ? (
                    <CloudIcon sx={{ fontSize: '14px !important' }} />
                  ) : (
                    <CloudOffIcon sx={{ fontSize: '14px !important' }} />
                  )
                }
                sx={{
                  backgroundColor: onlineStatus ? '#18a381ff' : '#757575',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '11px',
                  height: '26px',
                  borderRadius: '4px',
                  '& .MuiChip-icon': {
                    color: '#ffffff',
                    marginLeft: '6px'
                  }
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
                  borderRadius: '4px'
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
                    borderRadius: '4px'
                  }}
                />
              )}
            </Box>
          </Box>

          {/* Right Section: Sync + Menu */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'flex-end',
              gap: 1,
              pt: 0.5
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
                  boxShadow: 'none'
                },
                '&:disabled': {
                  backgroundColor: '#e0e0e0',
                  color: '#999'
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
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
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

      {/* Table Section - no nested scroll */}
      <Box sx={{ flex: 1, px: 1, pb: 1 }}>
        {isLoading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              overflow: 'hidden'
            }}
          >
            <CircularProgress size={50} sx={{ color: '#1976d2' }} />
          </Box>
        ) : error ? (
          <Alert
            severity="error"
            sx={{ mb: 2, fontSize: '14px', fontWeight: 600 }}
          >
            {error}
            <Button
              size="small"
              onClick={loadOwners}
              sx={{ ml: 2, fontWeight: 700 }}
            >
              Retry
            </Button>
          </Alert>
        ) : (
          <Box
            sx={{
              backgroundColor: '#ffffff',
              borderRadius: '4px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              border: '1px solid #e0e0e0',
              overflow: 'visible',
              '& *': {
                overflow: 'visible !important',
                maxHeight: 'none !important'
              },
              '& > div': {
                overflow: 'visible !important',
                height: 'auto !important',
                maxHeight: 'none !important'
              },
              '& .MuiTableContainer-root': {
                overflow: 'visible !important',
                maxHeight: 'none !important',
                height: 'auto !important'
              },
              '& .MuiTable-root': {
                overflow: 'visible !important'
              },
              '& .MuiPaper-root': {
                overflow: 'visible !important',
                boxShadow: 'none !important',
                maxHeight: 'none !important',
                height: 'auto !important'
              },
              '& .ReactTable': {
                overflow: 'visible !important',
                maxHeight: 'none !important',
                height: 'auto !important'
              },
              '& [class*="Table"]': {
                overflow: 'visible !important',
                maxHeight: 'none !important',
                height: 'auto !important'
              },
              '& table': {
                width: '100%',
                tableLayout: 'fixed'
              },
              '& thead th': {
                textAlign: 'left !important',
                paddingLeft: '16px !important',
                paddingRight: '16px !important',
                paddingTop: '12px !important',
                paddingBottom: '12px !important',
                verticalAlign: 'middle !important'
              },
              '& thead th:first-of-type': {
                width: '60px !important',
                paddingRight: '8px !important',
                paddingLeft: '24px !important'
              },
              '& thead th:nth-of-type(2)': {
                paddingLeft: '8px !important',
                paddingRight: '16px !important'
              },
              '& thead th:nth-of-type(3)': {
                paddingLeft: '16px !important'
              },
              '& tbody td': {
                textAlign: 'left !important',
                paddingLeft: '16px !important',
                paddingRight: '16px !important',
                paddingTop: '12px !important',
                paddingBottom: '12px !important',
                verticalAlign: 'middle !important'
              },
              '& tbody td:first-of-type': {
                width: '60px !important',
                paddingRight: '8px !important',
                paddingLeft: '24px !important'
              },
              '& tbody td:nth-of-type(2)': {
              paddingLeft: '8px !important',
              paddingRight: '16px !important'
            },
            '& tbody td:nth-of-type(3)': {
              paddingLeft: '16px !important'
            },

            // 👇 Add this part
            '& thead th:nth-of-type(2), & tbody td:nth-of-type(2)': {
              textAlign: 'left !important'
            },
            '& thead th:nth-of-type(3), & tbody td:nth-of-type(3)': {
              textAlign: 'left !important'
            },

              '& thead th:last-child': {
                textAlign: 'center !important'
              },
              '& tbody td:last-child': {
                textAlign: 'center !important'
              }
            }}
          >
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