// src/owner/components/FinanceCompanySelector.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Alert,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Search as SearchIcon, Close as CloseIcon } from '@mui/icons-material';
import { useGetAllFinanceCompanies, getLocalStamp } from 'finance/api/FinanceCompanyEndPoints';
import { IFinanceCompany } from 'finance/types/IFinanceCompany';
import { useShowroom } from 'access/contexts/showRoomContext';

interface FinanceCompanySelectorProps {
  open: boolean;
  onClose: () => void;
  onSelectCompany: (company: IFinanceCompany) => void;
}

export const FinanceCompanySelector: React.FC<FinanceCompanySelectorProps> = ({ open, onClose, onSelectCompany }) => {
  const { financeCompanies, financeCompaniesLoading } = useGetAllFinanceCompanies();
  const { currentShowroom } = useShowroom();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<IFinanceCompany | null>(null);
  const [companyStamps, setCompanyStamps] = useState<{ [key: string]: string | null }>({});

  // Load stamps from local storage when companies change
  useEffect(() => {
    const loadStamps = async () => {
      if (financeCompanies.length > 0 && currentShowroom?.showroomName) {
        const stamps: { [key: string]: string | null } = {};

        for (const company of financeCompanies) {
          if (company.stampPath && company.id) {
            try {
              const stampData = await getLocalStamp(company.companyName, currentShowroom.showroomName);
              if (stampData) {
                stamps[company.id] = stampData;
              }
            } catch (error) {
              console.error(`Failed to load stamp for ${company.companyName}:`, error);
              stamps[company.id] = null;
            }
          }
        }

        setCompanyStamps(stamps);
      }
    };

    if (open) {
      loadStamps();
    }
  }, [financeCompanies, currentShowroom, open]);

  // Filter companies based on search term
  const filteredCompanies = financeCompanies.filter((company) => company.companyName.toLowerCase().includes(searchTerm.toLowerCase()));

  // Sort filtered companies alphabetically by name
  const sortedCompanies = [...filteredCompanies].sort((a, b) =>
    a.companyName.localeCompare(b.companyName, undefined, { sensitivity: 'base' })
  );

  const handleSelectCompany = () => {
    if (selectedCompany) {
      onSelectCompany(selectedCompany);
      // Clear selection and search when closing
      setSelectedCompany(null);
      setSearchTerm('');
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedCompany(null);
    setSearchTerm('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: 3
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f5f5f5',
          borderBottom: '1px solid #e0e0e0'
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Select Finance Company
        </Typography>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2, pt: 3 }}>
        <TextField
          fullWidth
          placeholder="Search finance companies..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
        />

        {financeCompaniesLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : sortedCompanies.length === 0 ? (
          <Alert severity="info">
            {searchTerm
              ? `No finance companies found matching "${searchTerm}".`
              : 'No finance companies found. Please add finance companies first.'}
          </Alert>
        ) : (
          <List sx={{ width: '100%', maxHeight: 400, overflow: 'auto' }}>
            {sortedCompanies.map((company) => (
              <ListItem key={company.id} disablePadding sx={{ mb: 1 }}>
                <ListItemButton
                  onClick={() => setSelectedCompany(company)}
                  selected={selectedCompany?.id === company.id}
                  sx={{
                    borderRadius: 2,
                    border: '1px solid #e0e0e0',
                    '&.Mui-selected': {
                      backgroundColor: '#e3f2fd',
                      borderColor: '#2196f3'
                    },
                    '&:hover': {
                      backgroundColor: selectedCompany?.id === company.id ? '#e3f2fd' : '#f5f5f5'
                    }
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      src={company.id ? companyStamps[company.id] || undefined : undefined}
                      sx={{
                        width: 40,
                        height: 40,
                        backgroundColor: company.id && companyStamps[company.id] ? 'transparent' : '#2196f3'
                      }}
                    >
                      {company.companyName.charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={company.companyName}
                    secondary={company.stampPath ? 'Stamp available' : 'No stamp'}
                    primaryTypographyProps={{
                      fontWeight: selectedCompany?.id === company.id ? 600 : 400
                    }}
                    secondaryTypographyProps={{
                      color: company.stampPath ? 'text.secondary' : 'text.disabled'
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}

        {/* Optional: Show total count when there are results */}
        {!financeCompaniesLoading && sortedCompanies.length > 0 && (
          <Typography variant="caption" sx={{ mt: 1, display: 'block', textAlign: 'center', color: 'text.secondary' }}>
            Showing {sortedCompanies.length} {sortedCompanies.length === 1 ? 'company' : 'companies'}
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleSelectCompany}
          variant="contained"
          disabled={!selectedCompany}
          sx={{
            backgroundColor: '#2196f3',
            '&:hover': {
              backgroundColor: '#1976d2'
            }
          }}
        >
          Select Company
        </Button>
      </DialogActions>
    </Dialog>
  );
};
