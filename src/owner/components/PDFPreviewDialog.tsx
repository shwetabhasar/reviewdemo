// src/owner/components/PDFPreviewDialog.tsx

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  Paper
} from '@mui/material';
import {
  Close as CloseIcon,
  CompressOutlined as CompressImageIcon,
  Visibility as VisibilityIcon,
  Description as DocumentIcon
} from '@mui/icons-material';

interface PDFPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  pdfUrl: string;
  fileName: string;
  onConfirmStamp: () => void;
  loading?: boolean;
  documentType?: string;
}

const PDFPreviewDialog: React.FC<PDFPreviewDialogProps> = ({
  open,
  onClose,
  pdfUrl,
  fileName,
  onConfirmStamp,
  loading = false,
  documentType
}) => {
  const [previewError, setPreviewError] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);

  useEffect(() => {
    if (open) {
      setPreviewError(false);
      // Check if we have a URL and it's not empty
      if (!pdfUrl) {
        setPreviewError(true);
        setIsLoadingPreview(false);
      } else {
        setIsLoadingPreview(true);
        // Give iframe time to load
        const timer = setTimeout(() => {
          setIsLoadingPreview(false);
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [open, pdfUrl]);

  const handleStampConfirm = () => {
    onConfirmStamp();
  };

  const handleIframeLoad = () => {
    setIsLoadingPreview(false);
  };

  const handleIframeError = () => {
    setIsLoadingPreview(false);
    setPreviewError(true);
  };

  // Determine button text based on document type
  // In PDFPreviewDialog.tsx, update getButtonText function:
  const getButtonText = () => {
    if (loading) {
      if (documentType?.startsWith('form20-3')) {
        return 'Processing...';
      }
      if (documentType === 'insurance' || documentType === 'form22') {
        return 'Processing...';
      } else if (documentType === 'form20-1') {
        return 'Renaming...';
      }
      return 'Stamping...';
    }

    // Form 20-3 variants
    if (documentType === 'form20-3-mobile') {
      return 'Copy to Website';
    }
    if (documentType === 'form20-3-cash') {
      return 'Apply Signature';
    }
    if (documentType === 'form20-3-finance') {
      return 'Select Finance Company';
    }

    if (documentType === 'insurance' || documentType === 'form22') {
      return 'Compress/Rename';
    } else if (documentType === 'form20-1') {
      return 'Rename';
    }
    return 'Apply Stamp';
  };

  // Determine dialog action text
  const getDialogActionText = () => {
    if (loading) {
      if (documentType === 'insurance' || documentType === 'form22') {
        return 'Compressing and renaming...';
      } else if (documentType === 'form20-1') {
        return 'Renaming...';
      }
      return 'Applying stamp...';
    }
    return '';
  };

  // Get action description
  const getActionDescription = () => {
    switch (documentType) {
      case 'insurance':
        return 'The file will be compressed (if >299KB) and renamed to insu.pdf';
      case 'form22':
        return 'The file will be compressed (if >299KB) and renamed to fm22.pdf';
      case 'form20-1':
        return 'The file will be renamed to 201.pdf';
      case 'invoice':
        return 'A stamp will be applied and the file will be renamed to invo.pdf';
      case 'disclaimer':
        return 'A stamp will be applied and the file will be renamed to disc.pdf';
      case 'form21':
        return 'A stamp will be applied and the file will be renamed to fm21.pdf';
      case 'form20-2':
        return 'Stamp and signature will be applied, renamed to 202.pdf';
      default:
        return 'The file will be processed according to its type';
    }
  };

  const showNoPreview = !pdfUrl || previewError;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          height: '90vh',
          maxHeight: '900px'
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <VisibilityIcon />
            <Typography variant="h6">Preview Document</Typography>
          </Box>
          <IconButton onClick={onClose} disabled={loading}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, position: 'relative' }}>
        <Box sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
          <Typography variant="body2" color="text.secondary">
            File: {fileName}
            {documentType && ` • Type: ${documentType}`}
          </Typography>
        </Box>

        {isLoadingPreview && !showNoPreview ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: 'calc(100% - 60px)',
              p: 4
            }}
          >
            <CircularProgress />
            <Typography variant="body2" sx={{ mt: 2 }}>
              Loading preview...
            </Typography>
          </Box>
        ) : showNoPreview ? (
          <Box sx={{ p: 4 }}>
            {/* Main info alert */}
            <Alert severity="info" icon={<DocumentIcon />} sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Preview not available
              </Typography>
              <Typography variant="body2">
                This PDF cannot be previewed in the browser. This is common for encrypted or protected documents, especially insurance PDFs.
              </Typography>
            </Alert>

            {/* File details card */}
            <Paper elevation={1} sx={{ p: 3, mb: 3, backgroundColor: '#fafafa' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#555' }}>
                File Details
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 100 }}>
                    Filename:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {fileName}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 100 }}>
                    Document:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {documentType || 'Unknown'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 100 }}>
                    Action:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {getActionDescription()}
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* Success message */}
            <Alert severity="success">
              <Typography variant="body2">
                Click <strong>"{getButtonText()}"</strong> below to process this file. The operation will complete successfully even without
                the preview.
              </Typography>
            </Alert>
          </Box>
        ) : (
          <Box sx={{ flex: 1, height: 'calc(100% - 60px)', position: 'relative' }}>
            <iframe
              src={pdfUrl}
              width="100%"
              height="100%"
              style={{ border: 'none' }}
              title="PDF Preview"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
            />
          </Box>
        )}

        {loading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              zIndex: 1
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <CircularProgress />
              <Typography variant="body2" sx={{ mt: 2 }}>
                {getDialogActionText()}
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
        <Button onClick={onClose} variant="outlined" disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleStampConfirm}
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CompressImageIcon />}
          disabled={loading}
          sx={{
            backgroundColor:
              documentType === 'insurance' || documentType === 'form22' || documentType === 'form20-1' ? '#ff9800' : '#9c27b0',
            '&:hover': {
              backgroundColor:
                documentType === 'insurance' || documentType === 'form22' || documentType === 'form20-1' ? '#f57c00' : '#7b1fa2'
            }
          }}
        >
          {getButtonText()}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PDFPreviewDialog;
