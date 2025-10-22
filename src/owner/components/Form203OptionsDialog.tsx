// src/owner/components/Form203OptionsDialog.tsx
import React from 'react';
import { Dialog, DialogTitle, DialogContent, Typography, Box, IconButton, Button, Stack } from '@mui/material';
import { Close as CloseIcon, AttachMoney as CashIcon, AccountBalance as FinanceIcon, FolderOpen as FolderIcon } from '@mui/icons-material';

interface Form203OptionsDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectOption: (option: 'cash' | 'finance' | 'mobile') => void;
}

export const Form203OptionsDialog: React.FC<Form203OptionsDialogProps> = ({ open, onClose, onSelectOption }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          minHeight: 400
        }
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            Select Form 20-3 Processing Option
          </Typography>
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{
              color: (theme) => theme.palette.grey[500]
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 4 }}>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{
            mb: 4,
            pl: 1
          }}
        >
          Please select how you want to process Form 20-3:
        </Typography>

        <Stack spacing={2}>
          <Button
            variant="outlined"
            fullWidth
            onClick={() => onSelectOption('cash')}
            sx={{
              py: 2.5,
              px: 3,
              justifyContent: 'flex-start',
              borderColor: '#e0e0e0',
              '&:hover': {
                borderColor: '#4caf50',
                backgroundColor: 'rgba(76, 175, 80, 0.04)'
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  backgroundColor: '#4caf50',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 3
                }}
              >
                <CashIcon sx={{ color: 'white', fontSize: 24 }} />
              </Box>
              <Box sx={{ textAlign: 'left' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#333', mb: 0.5 }}>
                  Cash Payment
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Apply customer signature only
                </Typography>
              </Box>
            </Box>
          </Button>

          <Button
            variant="outlined"
            fullWidth
            onClick={() => onSelectOption('finance')}
            sx={{
              py: 2.5,
              px: 3,
              justifyContent: 'flex-start',
              borderColor: '#e0e0e0',
              '&:hover': {
                borderColor: '#2196f3',
                backgroundColor: 'rgba(33, 150, 243, 0.04)'
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  backgroundColor: '#2196f3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 3
                }}
              >
                <FinanceIcon sx={{ color: 'white', fontSize: 24 }} />
              </Box>
              <Box sx={{ textAlign: 'left' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#333', mb: 0.5 }}>
                  Finance
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Apply showroom stamp, signature & finance stamps
                </Typography>
              </Box>
            </Box>
          </Button>

          <Button
            variant="outlined"
            fullWidth
            onClick={() => onSelectOption('mobile')}
            sx={{
              py: 2.5,
              px: 3,
              justifyContent: 'flex-start',
              borderColor: '#e0e0e0',
              '&:hover': {
                borderColor: '#ff9800',
                backgroundColor: 'rgba(255, 152, 0, 0.04)'
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  backgroundColor: '#ff9800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 3
                }}
              >
                <FolderIcon sx={{ color: 'white', fontSize: 24 }} />
              </Box>
              <Box sx={{ textAlign: 'left' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#333', mb: 0.5 }}>
                  From Mobile Folder
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Select from mobile folder & copy to website
                </Typography>
              </Box>
            </Box>
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};
