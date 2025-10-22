// src/owner/components/InsurancePageSelector.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  CircularProgress,
  Alert,
  IconButton,
  Paper
} from '@mui/material';
import { Close as CloseIcon, Description as DocumentIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';

interface InsurancePageSelectorProps {
  open: boolean;
  onClose: () => void;
  fileName: string;
  pageCount: number;
  onSelectPage: (pageNumber: number) => void;
  loading?: boolean;
}

export const InsurancePageSelector: React.FC<InsurancePageSelectorProps> = ({
  open,
  onClose,
  fileName,
  pageCount,
  onSelectPage,
  loading = false
}) => {
  const [selectedPage, setSelectedPage] = useState<number>(1); // Default to first page

  useEffect(() => {
    if (open) {
      setSelectedPage(1); // Reset to first page when dialog opens
    }
  }, [open]);

  const handleConfirm = () => {
    onSelectPage(selectedPage);
  };

  const handlePageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedPage(parseInt(event.target.value, 10));
  };

  const pageOptions = Array.from({ length: pageCount }, (_, i) => i + 1);

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="md"
      fullWidth
      sx={{ '& .MuiDialog-paper': { minHeight: '400px' } }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <DocumentIcon color="primary" />
            <Typography variant="h6">Select Page to Keep</Typography>
          </Box>
          <IconButton onClick={onClose} disabled={loading}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            The insurance PDF <strong>"{fileName}"</strong> contains <strong>{pageCount} pages</strong>.
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Select which page to keep for compression. Other pages will be removed to reduce file size.
          </Typography>
        </Alert>

        <Paper elevation={1} sx={{ p: 3, backgroundColor: '#fafafa' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            Choose Page to Keep:
          </Typography>

          <FormControl component="fieldset">
            <RadioGroup
              value={selectedPage.toString()}
              onChange={handlePageChange}
              sx={{
                display: 'grid',
                gridTemplateColumns: pageCount <= 6 ? 'repeat(auto-fit, minmax(150px, 1fr))' : 'repeat(3, 1fr)',
                gap: 2
              }}
            >
              {pageOptions.map((pageNum) => (
                <FormControlLabel
                  key={pageNum}
                  value={pageNum.toString()}
                  control={<Radio color="primary" disabled={loading} sx={{ '&.Mui-checked': { color: '#9c27b0' } }} />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1">Page {pageNum}</Typography>
                      {pageNum === 1 && (
                        <Typography
                          variant="caption"
                          sx={{
                            backgroundColor: '#e3f2fd',
                            color: '#1976d2',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            fontWeight: 500
                          }}
                        >
                          Default
                        </Typography>
                      )}
                      {pageNum === pageCount && (
                        <Typography
                          variant="caption"
                          sx={{
                            backgroundColor: '#fce4ec',
                            color: '#c2185b',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            fontWeight: 500
                          }}
                        >
                          Last
                        </Typography>
                      )}
                    </Box>
                  }
                />
              ))}
            </RadioGroup>
          </FormControl>

          <Box sx={{ mt: 3, p: 2, backgroundColor: '#e8f5e9', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleIcon sx={{ fontSize: 20, color: '#4caf50' }} />
              <Typography variant="body2" sx={{ color: '#2e7d32' }}>
                <strong>Recommendation:</strong> Usually, the first page contains the main insurance certificate. Select the last page only
                if it contains important information.
              </Typography>
            </Box>
          </Box>
        </Paper>

        <Box sx={{ mt: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Selected:</strong> Page {selectedPage} of {pageCount}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Only this page will be kept and compressed to reduce file size below 299KB.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
        <Button onClick={onClose} variant="outlined" disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
          sx={{ backgroundColor: '#ff9800', '&:hover': { backgroundColor: '#f57c00' } }}
        >
          {loading ? 'Processing...' : `Keep Page ${selectedPage} & Compress`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InsurancePageSelector;
