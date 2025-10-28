/* eslint-disable react-hooks/exhaustive-deps */
// src/owner/components/OwnerList.tsx

import { ColumnDef } from '@tanstack/react-table';
import { useMemo, useState, useEffect } from 'react';
import ReactTable from 'components/appseeds/react-table/ReactTable';
import { getSelectAndIdColumns } from 'components/appseeds/react-table/ReactTableUtils';
import { Snackbar, IconButton, Tooltip, Alert, Button, Box, Chip, Menu, MenuItem, CircularProgress, Typography } from '@mui/material';
import { Folder as FolderIcon, MoreVert as MoreVertIcon, Refresh as RefreshIcon, Cloud as CloudIcon, CloudOff as CloudOffIcon, Sync as SyncIcon } from '@mui/icons-material';
import { useShowroom } from 'access/contexts/showRoomContext';

interface Owner {
  id: string;
  name: string;
  contact: string;
  mobile: string;
  folderPath: string;
}

const OwnerList = () => {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [basePath] = useState<string>('C:\\Tri-Color Honda');

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [onlineStatus, setOnlineStatus] = useState(navigator.onLine);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  const { currentShowroom } = useShowroom();
  const showroomName = currentShowroom?.showroomName || '';

  const loadOwners = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!window.electronAPI || !window.electronAPI.getOwnerList) {
        throw new Error('Electron API not available.');
      }

      const result = await window.electronAPI.getOwnerList(basePath);

      if (result.success) {
        const transformedOwners: Owner[] = (result.owners || []).map((owner: any, index: number) => ({
          id: owner.mobile || `owner-${index}`,
          name: owner.name,
          contact: owner.mobile,
          mobile: owner.mobile,
          folderPath: owner.folderPath,
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

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    await loadOwners();
  };

  useEffect(() => {
    loadOwners();
  }, []);

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

  // TABLE COLUMNS – aligned neatly in a single line
  const columns = useMemo<ColumnDef<Owner>[]>(() => {
    const baseColumns: ColumnDef<Owner>[] = [
      {
        id: 'name',
        header: 'Name',
        accessorKey: 'name',
        size: 250,
        cell: ({ row }) => (
          <Typography variant="body2" sx={{ lineHeight: 1, py: 0 }}>
            {row.original.name}
          </Typography>
        ),
      },
      {
        id: 'contact',
        header: 'Contact',
        accessorKey: 'contact',
        size: 200,
        cell: ({ row }) => (
          <Typography variant="body2" sx={{ lineHeight: 1, py: 0 }}>
            {row.original.contact}
          </Typography>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        size: 100,
        cell: ({ row }) => (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 0 }}>
            <Tooltip title="Open Folder">
              <IconButton size="small" onClick={() => handleOpenFolder(row.original.folderPath)} sx={{ color: 'teal' }}>
                <FolderIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ];

    const selectAndIdColumns = getSelectAndIdColumns<Owner>();
    return [...selectAndIdColumns, ...baseColumns];
  }, []);

  const exportColumns = useMemo<string[]>(() => ['name', 'contact', 'folderPath'], []);

  const handleSnackbarClose = () => setSnackbarOpen(false);
  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'background.default' }}>
      <Box sx={{ px: 3, pt: 3, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="h5" fontWeight="bold" color="primary.main" gutterBottom>
              Owner List ({owners.length})
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip label={onlineStatus ? 'Online' : 'Offline'} size="small" color={onlineStatus ? 'success' : 'default'} icon={onlineStatus ? <CloudIcon /> : <CloudOffIcon />} />
              <Chip label="Cached: Never" size="small" variant="outlined" />
              {showroomName && <Chip label={`Showroom: ${showroomName}`} size="small" color="info" variant="outlined" />}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={isManualRefreshing ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
              onClick={handleManualRefresh}
              disabled={isManualRefreshing}
            >
              Sync
            </Button>

            <IconButton onClick={handleMenuClick} size="small">
              <MoreVertIcon />
            </IconButton>

            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
              <MenuItem
                onClick={() => {
                  handleMenuClose();
                  handleManualRefresh();
                }}
              >
                <RefreshIcon fontSize="small" sx={{ mr: 1 }} /> Refresh List
              </MenuItem>
            </Menu>
          </Box>
        </Box>
      </Box>

      <Box sx={{ flexGrow: 1, px: 3, pb: 2, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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

      <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default OwnerList;
