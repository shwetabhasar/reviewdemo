// src/owner/components/WebsiteDocumentsSection.tsx
import React from 'react';
import { Box, Typography, Grid, Card, CardContent, CardActions, IconButton, Tooltip, CircularProgress } from '@mui/material';
import { Visibility as ViewIcon, CompressOutlined as CompressImageIcon, Folder as FolderIcon } from '@mui/icons-material';

interface WebsiteDocument {
  key: string;
  label: string;
  icon: string;
  size?: number;
}

interface WebsiteDocumentsSectionProps {
  stamping: string | null;
  compressing: string | null;
  documentSizes?: { [key: string]: number };
  documentSourceFolders?: { [key: string]: 'finalPdfs' | 'website' }; // ← ADDED THIS LINE
  onViewDocument: (documentKey: string) => void;
  onOpenWebsite: (e: React.MouseEvent, documentType?: string) => void;
  onStamp: (documentKey: string, signatureFormat: 'png' | 'svg') => void;
  onCompress: (documentKey: string) => void;
  onOpenWebsiteFolder: () => void;
}

// Helper function to format file size
const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const WebsiteCard: React.FC<{
  document: WebsiteDocument;
  documentSize?: number;
  isFromFinalPdfs?: boolean; // ← ADDED THIS LINE
  isStamping: boolean;
  isCompressing: boolean;
  onView: () => void;
  onOpenWebsite: (e: React.MouseEvent) => void;
  onStamp: () => void;
  onCompress: () => void;
}> = ({ document, documentSize, isFromFinalPdfs, isStamping, isCompressing, onView, onOpenWebsite, onStamp }) => {
  // ← ADDED isFromFinalPdfs
  const shouldShowStampButton = () => {
    return (
      document.key === 'form21' ||
      document.key === 'form20-3' ||
      document.key === 'disclaimer' ||
      document.key === 'invoice' ||
      document.key === 'insurance' ||
      document.key === 'form22'
    );
  };
  const showStamp = shouldShowStampButton();

  return (
    <Card
      sx={{
        height: 120,
        width: 160,
        borderRadius: 5,
        backgroundColor: '#f5f5f5',
        boxShadow: 3,
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        overflow: 'hidden',
        border: 'none',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6,
          backgroundColor: '#e8e8e8'
        }
      }}
    >
      <CardContent
        sx={{
          flexGrow: 1,
          textAlign: 'center',
          p: 0.5,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}
      >
        <Box sx={{ fontSize: 24, mb: 0 }}>{document.icon}</Box>
        <Typography
          variant="body1"
          sx={{
            fontWeight: 500,
            mb: 0.2,
            fontSize: '0.9rem',
            lineHeight: 1.2
          }}
        >
          {document.label}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            mb: 0.2,
            fontSize: '0.75rem',
            color: isFromFinalPdfs && documentSize ? 'rgb(248, 126, 4)' : '#999' // ← UPDATED THIS LINE
          }}
        >
          {isFromFinalPdfs && documentSize ? formatFileSize(documentSize) : 'Not uploaded'} {/* ← UPDATED THIS LINE */}
        </Typography>

        <Box
          sx={{
            my: 0.1,
            height: '1px',
            backgroundColor: '#ddd',
            width: '100%'
          }}
        />
      </CardContent>

      <CardActions
        sx={{
          justifyContent: 'center',
          pb: 0.2,
          pt: 0,
          minHeight: 'auto',
          gap: 0.1
        }}
      >
        <IconButton size="small" onClick={onView} sx={{ p: 0.5, color: 'rgb(153, 196, 203)' }}>
          <ViewIcon fontSize="small" />
        </IconButton>

        {showStamp && (
          <span>
            <IconButton
              size="small"
              sx={{
                color: 'rgb(76, 175, 80)',
                p: 0.5,
                '&:hover': {
                  backgroundColor: 'rgba(156, 39, 176, 0.08)'
                }
              }}
              onClick={onStamp}
              disabled={isStamping || isCompressing}
            >
              {isStamping || isCompressing ? <CircularProgress size={18} /> : <CompressImageIcon fontSize="small" />}
            </IconButton>
          </span>
        )}
      </CardActions>
    </Card>
  );
};

// Row 1: Invoice, Disclaimer, Form 21, Insurance
// Row 2: Form 22, Form 20-1, Form 20-2, Form 20-3
const websiteDocuments: WebsiteDocument[] = [
  { key: 'invoice', label: 'Invoice', icon: '🧾' },
  { key: 'disclaimer', label: 'Disclaimer', icon: '📝' },
  { key: 'form21', label: 'Form 21', icon: '📜' },
  { key: 'insurance', label: 'Insurance', icon: '🛡️' },
  { key: 'form22', label: 'Form 22', icon: '📋' },
  { key: 'form20-3', label: 'Form 20', icon: '📑' }
];

export const WebsiteDocumentsSection: React.FC<WebsiteDocumentsSectionProps> = ({
  stamping,
  compressing,
  documentSizes = {},
  documentSourceFolders = {}, // ← ADDED THIS LINE
  onViewDocument,
  onOpenWebsite,
  onStamp,
  onCompress,
  onOpenWebsiteFolder
}) => {
  // ALWAYS USE PNG - No state or toggle needed
  const SIGNATURE_FORMAT: 'png' = 'png';

  // Clean up localStorage if SVG was previously selected
  React.useEffect(() => {
    const savedFormat = localStorage.getItem('signatureFormat');
    if (savedFormat && savedFormat !== 'png') {
      localStorage.setItem('signatureFormat', 'png');
    }
  }, []);

  return (
    <Card
      sx={{
        m: '0 16px 16px 40px',
        p: 2,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        backgroundColor: '#f4f3f6',
        border: '1px solid #e0e0e0',
        width: '900px'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 600,
            color: '#555'
          }}
        >
          Website Documents
        </Typography>

        {/* Removed Signature Format Selector - Only show folder actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Open Website Folder">
            <IconButton
              onClick={onOpenWebsiteFolder}
              sx={{
                color: '#1976d2',
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.08)'
                }
              }}
            >
              <FolderIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ width: '900px' }}>
        {websiteDocuments.map((doc, index) => (
          <Grid item key={`${doc.key}-${index}`}>
            <WebsiteCard
              document={doc}
              documentSize={documentSizes[doc.key]}
              isFromFinalPdfs={documentSourceFolders[doc.key] === 'finalPdfs'}
              isStamping={stamping === doc.key}
              isCompressing={compressing === doc.key}
              onView={() => onViewDocument(doc.key)}
              onOpenWebsite={(e) => onOpenWebsite(e, doc.key)}
              onStamp={() => onStamp(doc.key, SIGNATURE_FORMAT)}
              onCompress={() => onCompress(doc.key)}
            />
          </Grid>
        ))}
      </Grid>
    </Card>
  );
};
