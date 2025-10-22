// src/finance/pages/FinanceCompanyList.tsx
import { useTheme } from '@mui/material/styles';
import { ColumnDef } from '@tanstack/react-table';
import { deleteFinanceCompany, useGetAllFinanceCompanies, getLocalStamp } from '../api/FinanceCompanyEndPoints';
import { useMemo, useState, MouseEvent, useEffect } from 'react';
import ReactTable from 'components/appseeds/react-table/ReactTable';
import { getSelectAndIdColumns } from 'components/appseeds/react-table/ReactTableUtils';
import { IFinanceCompany } from '../types/IFinanceCompany';
import { DeleteOutlined, EditOutlined, EyeOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { useShowroom } from 'access/contexts/showRoomContext';
import {
  Alert,
  IconButton,
  Snackbar,
  Stack,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  Grid,
  Avatar,
  Box,
  CircularProgress
} from '@mui/material';
import { mutate } from 'swr';
import { useNavigate } from 'react-router';
import { useFinanceCompanyStore } from '../stores/financeCompanyStore';

// Type for table display with string dates and local stamp
interface IFinanceCompanyDisplay extends Omit<IFinanceCompany, 'createdAt' | 'modifiedAt'> {
  createdAt: string;
  modifiedAt: string;
  stampPreview?: string; // Added for local stamp preview
}

const FinanceCompanyList = () => {
  const theme = useTheme();
  const { currentShowroom } = useShowroom();
  const { financeCompanies, isLoading, setFinanceCompanies, setLoading } = useFinanceCompanyStore();
  const { financeCompanies: apiCompanies, financeCompaniesLoading } = useGetAllFinanceCompanies();

  const [tableData, setTableData] = useState<IFinanceCompanyDisplay[]>([]);
  const [stampsLoading, setStampsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (apiCompanies) {
      setFinanceCompanies(apiCompanies);
    }
    setLoading(financeCompaniesLoading);
  }, [apiCompanies, financeCompaniesLoading, setFinanceCompanies, setLoading]);

  // Load stamps from local storage
  useEffect(() => {
    const loadStamps = async () => {
      if (financeCompanies && financeCompanies.length > 0 && currentShowroom?.showroomName) {
        setStampsLoading(true);
        const companiesWithStamps = await Promise.all(
          financeCompanies.map(async (company) => {
            let stampPreview: string | undefined;

            // Try to load stamp from local storage if stampPath exists
            if (company.stampPath) {
              try {
                const stampData = await getLocalStamp(company.companyName, currentShowroom.showroomName);
                if (stampData) {
                  stampPreview = stampData;
                }
              } catch (error) {
                console.error(`Failed to load stamp for ${company.companyName}:`, error);
              }
            }

            return {
              ...company,
              createdAt: company.createdAt ? new Date(company.createdAt).toLocaleDateString() : '',
              modifiedAt: company.modifiedAt ? new Date(company.modifiedAt).toLocaleDateString() : '',
              stampPreview
            };
          })
        );
        setTableData(companiesWithStamps);
        setStampsLoading(false);
      } else {
        setTableData([]);
        setStampsLoading(false);
      }
    };

    loadStamps();
  }, [financeCompanies, currentShowroom?.showroomName]);

  const [rowSelection, setRowSelection] = useState({});
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info'>('info');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<IFinanceCompany | null>(null);
  const [previewDialog, setPreviewDialog] = useState<{ open: boolean; stampData: string | null; companyName: string }>({
    open: false,
    stampData: null,
    companyName: ''
  });

  const navigate = useNavigate();

  const isMultipleRowsSelected = Object.keys(rowSelection).length > 1;

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleEditCompany = (company: IFinanceCompany) => {
    navigate('/finance/add', { state: { companyData: company, isEditMode: true } });
  };

  const handleSnackbarClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  const openDeleteDialog = (company: IFinanceCompany) => {
    setSelectedCompany(company);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (selectedCompany && selectedCompany.id) {
      try {
        setDeleteDialogOpen(false);
        showSnackbar('Deleting finance company...', 'info');

        if (!currentShowroom?.showroomId) {
          showSnackbar('Please select a showroom before deleting.', 'error');
          return;
        }

        await deleteFinanceCompany(selectedCompany.id, selectedCompany.companyName, currentShowroom.showroomName);

        mutate(['financeCompanies', currentShowroom.showroomId]);
        setRowSelection({});

        setTimeout(() => {
          showSnackbar('Finance company deleted successfully', 'success');
        }, 300);
      } catch (error) {
        console.error('Error deleting finance company:', error);
        showSnackbar('Failed to delete finance company', 'error');
      } finally {
        setSelectedCompany(null);
      }
    }
  };

  const handleViewStamp = (stampData: string | undefined, companyName: string) => {
    if (stampData) {
      setPreviewDialog({ open: true, stampData, companyName });
    } else {
      showSnackbar('Stamp not available', 'info');
    }
  };

  const handleOpenStampFolder = async () => {
    if (window.electronAPI && currentShowroom?.showroomName) {
      const result = await window.electronAPI.openFinanceStampFolder(currentShowroom.showroomName);
      if (!result.success) {
        showSnackbar('Failed to open stamp folder', 'error');
      }
    } else {
      showSnackbar('Showroom name not available', 'error');
    }
  };

  const columns = useMemo<ColumnDef<IFinanceCompanyDisplay>[]>(
    () => [
      ...getSelectAndIdColumns<IFinanceCompanyDisplay>(),
      {
        header: 'Stamp',
        accessorKey: 'stampPreview',
        cell: ({ row }) => (
          <Avatar
            src={row.original.stampPreview}
            sx={{
              width: 40,
              height: 40,
              cursor: row.original.stampPreview ? 'pointer' : 'default',
              backgroundColor: row.original.stampPreview ? 'transparent' : 'grey.300'
            }}
            onClick={() => handleViewStamp(row.original.stampPreview, row.original.companyName)}
          >
            {!row.original.stampPreview && row.original.companyName.charAt(0)}
          </Avatar>
        ),
        meta: {
          className: 'cell-center',
          width: 400
        }
      },
      {
        header: 'Company Name',
        accessorKey: 'companyName',
        meta: {
          className: 'cell-left',
          width: 600
        }
      },
      {
        header: 'Local Path',
        accessorKey: 'stampPath',
        cell: ({ row }) => (
          <Box
            sx={{
              fontSize: '0.75rem',
              color: 'text.secondary',
              fontFamily: 'monospace',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            title={row.original.stampPath || 'Not saved locally'}
          >
            {row.original.stampPath || 'Not saved locally'}
          </Box>
        ),
        meta: {
          className: 'cell-left',
          width: 500
        }
      },
      {
        header: 'Actions',
        meta: {
          className: 'cell-center'
        },
        cell: ({ row }) => (
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
            <Tooltip title="View Stamp">
              <span>
                <IconButton
                  color="secondary"
                  disabled={isMultipleRowsSelected || !row.original.stampPreview}
                  onClick={(e: MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    handleViewStamp(row.original.stampPreview, row.original.companyName);
                  }}
                >
                  <EyeOutlined />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Edit">
              <IconButton
                color="primary"
                disabled={isMultipleRowsSelected}
                onClick={(e: MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  // Convert back to original IFinanceCompany format with Date objects
                  const originalCompany: IFinanceCompany = {
                    id: row.original.id,
                    companyName: row.original.companyName,
                    stampPath: row.original.stampPath,
                    showroomId: row.original.showroomId,
                    isDeleted: row.original.isDeleted,
                    createdAt: new Date(row.original.createdAt),
                    modifiedAt: new Date(row.original.modifiedAt),
                    createdBy: row.original.createdBy,
                    modifiedBy: row.original.modifiedBy
                  };
                  handleEditCompany(originalCompany);
                }}
              >
                <EditOutlined />
              </IconButton>
            </Tooltip>

            <Tooltip title="Delete">
              <IconButton
                color="error"
                disabled={isMultipleRowsSelected}
                onClick={(e: MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  const originalCompany: IFinanceCompany = {
                    id: row.original.id,
                    companyName: row.original.companyName,
                    stampPath: row.original.stampPath,
                    showroomId: row.original.showroomId,
                    isDeleted: row.original.isDeleted,
                    createdAt: new Date(row.original.createdAt),
                    modifiedAt: new Date(row.original.modifiedAt),
                    createdBy: row.original.createdBy,
                    modifiedBy: row.original.modifiedBy
                  };
                  openDeleteDialog(originalCompany);
                }}
              >
                <DeleteOutlined />
              </IconButton>
            </Tooltip>
          </Stack>
        )
      }
    ],
    [theme, isMultipleRowsSelected]
  );

  const exportColumns = useMemo(() => ['companyName', 'stampPath'], []);

  if (isLoading || stampsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!currentShowroom?.showroomId) {
    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        Please select a showroom to view finance companies.
      </Alert>
    );
  }

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
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
              Finance Companies
            </h4>
            {window.electronAPI && (
              <Button variant="outlined" startIcon={<FolderOpenOutlined />} onClick={handleOpenStampFolder} size="small">
                Open Stamp Folder
              </Button>
            )}
          </Box>
          <ReactTable<IFinanceCompanyDisplay>
            columns={columns}
            exportColumns={exportColumns}
            data={tableData}
            isAddButtonVisible={true}
            addRoute="/finance/add"
            entityName="Finance Company"
            rowSelection={rowSelection}
            onRowSelection={(value) => setRowSelection(value)}
            enablePagination={true}
          />
        </Grid>
      </Grid>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }} elevation={6}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the finance company "{selectedCompany?.companyName}"? This will also delete the local stamp
            file. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={previewDialog.open}
        onClose={() => setPreviewDialog({ open: false, stampData: null, companyName: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{previewDialog.companyName} - Stamp Preview</DialogTitle>
        <DialogContent>
          {previewDialog.stampData && (
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <img
                src={previewDialog.stampData}
                alt={`${previewDialog.companyName} Stamp`}
                style={{
                  maxWidth: '100%',
                  maxHeight: '400px',
                  objectFit: 'contain'
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialog({ open: false, stampData: null, companyName: '' })}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FinanceCompanyList;
