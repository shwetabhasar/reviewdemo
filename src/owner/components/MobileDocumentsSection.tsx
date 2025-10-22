// src/owner/components/MobileDocumentsSection.tsx
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Tooltip,
  CircularProgress,
  LinearProgress,
  Button,
  Collapse
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Folder as FolderIcon,
  CompressOutlined as CompressImageIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { IOwnerDocument } from 'owner/types/IOwner';

interface ExtendedOwnerDocument extends IOwnerDocument {
  isFromFinalPdfs?: boolean;
}

interface MobileDocumentTile {
  key: string;
  label: string;
  icon: string;
  document?: ExtendedOwnerDocument;
  hasFile: boolean;
  isOptional?: boolean;
}

interface MobileDocumentsSectionProps {
  documents: ExtendedOwnerDocument[];
  compressingImage: string | null;
  compressionProgress: number;
  onViewDocument: (document: ExtendedOwnerDocument) => void;
  onCompressImage: (document?: ExtendedOwnerDocument, documentTypeKey?: string) => void;
  onOpenMobileFolder: () => void;
  onRefresh: () => void;
}

const REQUIRED_MOBILE_DOCUMENTS = [
  { key: 'aadhaar', label: 'Aadhaar Card', icon: '🆔', patterns: ['aadhaar', 'adhr'], isOptional: false },
  { key: 'pan', label: 'Pan Card', icon: '💳', patterns: ['pan'], isOptional: false },
  { key: 'chassis', label: 'Chassis', icon: '🚗', patterns: ['chassis', 'chss'], isOptional: false },
  { key: 'vehicle', label: 'Vehicle Photo', icon: '🚙', patterns: ['vehicle', 'vhcl'], isOptional: false },
  { key: 'signature', label: 'Signature', icon: '✍️', patterns: ['sign'], isOptional: false }
];

const OPTIONAL_MOBILE_DOCUMENTS = [
  { key: 'form20', label: 'Form20', icon: '📑', patterns: ['form20', 'form'], isOptional: true },
  { key: 'form60', label: 'Form60', icon: '📋', patterns: ['form60'], isOptional: true },
  { key: 'medical', label: 'Medical', icon: '🏥', patterns: ['medical'], isOptional: true },
  { key: 'extra', label: 'Extra', icon: '📋', patterns: ['extra', 'extr'], isOptional: true },
  { key: 'other', label: 'Other', icon: '📄', patterns: ['other', 'othr'], isOptional: true }
];

const ALL_MOBILE_DOCUMENTS = [...REQUIRED_MOBILE_DOCUMENTS, ...OPTIONAL_MOBILE_DOCUMENTS];

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const matchFileToDocumentType = (fileName: string): string | null => {
  const lowerFileName = fileName.toLowerCase();

  if (lowerFileName.includes('form60')) {
    return 'form60';
  }

  for (const docType of ALL_MOBILE_DOCUMENTS) {
    for (const pattern of docType.patterns) {
      if (lowerFileName.includes(pattern)) {
        return docType.key;
      }
    }
  }

  return null;
};

const DocumentCard: React.FC<{
  tile: MobileDocumentTile;
  isCompressingImg: boolean;
  compressionProgress: number;
  onView: () => void;
  onCompressImage: () => void;
}> = ({ tile, isCompressingImg, compressionProgress, onView, onCompressImage }) => {
  const hasFile = tile.hasFile;
  const document = tile.document;

  const isImageType = ['aadhaar', 'pan', 'form60', 'medical', 'form20', 'vehicle', 'chassis', 'signature', 'other', 'extra'].includes(
    tile.key
  );

  return (
    <Card
      sx={{
        height: 120,
        width: 160,
        borderRadius: 5,
        backgroundColor: '#f5f5f5', // Always active background
        boxShadow: 3, // Always active shadow
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        overflow: 'hidden',
        border: 'none', // No dashed border
        opacity: 1, // Always full opacity
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6,
          backgroundColor: '#e8e8e8' // Same hover for all cards
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
        <Box sx={{ fontSize: 24, mb: 0, opacity: 1 }}>{tile.icon}</Box>
        <Typography
          variant="body1"
          sx={{
            fontWeight: 500,
            mb: 0.2,
            fontSize: '0.9rem',
            lineHeight: 1.2,
            color: 'inherit' // Always active color
          }}
        >
          {tile.label}
        </Typography>

        <Typography
          variant="caption"
          sx={{
            fontSize: '0.75rem',
            mb: 0.2,
            color: hasFile && document && document.isFromFinalPdfs ? 'rgb(248, 126, 4)' : '#999'
          }}
        >
          {hasFile && document && document.isFromFinalPdfs && document.size ? formatFileSize(document.size) : 'Not uploaded'}
        </Typography>

        {isCompressingImg && hasFile && (
          <LinearProgress variant="determinate" value={compressionProgress} sx={{ width: '100%', height: 3, mt: 0.5 }} />
        )}

        <Box sx={{ my: 0.1, height: '1px', backgroundColor: '#ddd', width: '100%' }} />
      </CardContent>

      <CardActions sx={{ justifyContent: 'center', pb: 0.2, pt: 0, minHeight: 'auto', gap: 0.1 }}>
        <IconButton
          size="small"
          onClick={onView}
          disabled={!hasFile}
          sx={{
            p: 0.5,
            color: hasFile ? 'rgb(153, 196, 203)' : '#ccc',
            '&:disabled': {
              color: '#ccc'
            }
          }}
        >
          <ViewIcon fontSize="small" />
        </IconButton>

        {isImageType && (
          <IconButton
            size="small"
            onClick={onCompressImage}
            disabled={isCompressingImg}
            sx={{
              p: 0.5,
              color: 'rgb(76, 175, 80)',
              '&:disabled': {
                color: '#ccc'
              }
            }}
          >
            {isCompressingImg ? <CircularProgress size={18} /> : <CompressImageIcon fontSize="small" />}
          </IconButton>
        )}
      </CardActions>
    </Card>
  );
};

export const MobileDocumentsSection: React.FC<MobileDocumentsSectionProps> = ({
  documents,
  compressingImage,
  compressionProgress,
  onViewDocument,
  onCompressImage,
  onOpenMobileFolder,
  onRefresh
}) => {
  const [showOptional, setShowOptional] = useState(false);

  const requiredTiles: MobileDocumentTile[] = REQUIRED_MOBILE_DOCUMENTS.map((expectedDoc) => {
    const matchingDoc = documents.find((doc) => {
      const docType = matchFileToDocumentType(doc.fileName);
      return docType === expectedDoc.key;
    });

    return {
      key: expectedDoc.key,
      label: expectedDoc.label,
      icon: expectedDoc.icon,
      document: matchingDoc,
      hasFile: !!matchingDoc,
      isOptional: false
    };
  });

  const optionalTiles: MobileDocumentTile[] = OPTIONAL_MOBILE_DOCUMENTS.map((expectedDoc) => {
    const matchingDoc = documents.find((doc) => {
      const docType = matchFileToDocumentType(doc.fileName);
      return docType === expectedDoc.key;
    });

    return {
      key: expectedDoc.key,
      label: expectedDoc.label,
      icon: expectedDoc.icon,
      document: matchingDoc,
      hasFile: !!matchingDoc,
      isOptional: true
    };
  });

  const requiredUploaded = requiredTiles.filter((tile) => tile.hasFile).length;
  const optionalUploaded = optionalTiles.filter((tile) => tile.hasFile).length;
  const totalRequired = REQUIRED_MOBILE_DOCUMENTS.length;
  const totalOptional = OPTIONAL_MOBILE_DOCUMENTS.length;

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
        <Typography variant="h5" sx={{ fontWeight: 600, color: '#555' }}>
          Mobile Uploads ({requiredUploaded}/{totalRequired})
          {optionalUploaded > 0 && (
            <Typography component="span" variant="body2" sx={{ ml: 1, color: '#888' }}>
              +{optionalUploaded} optional
            </Typography>
          )}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh Documents">
            <IconButton
              onClick={onRefresh}
              sx={{
                color: '#ff9800',
                '&:hover': {
                  backgroundColor: 'rgba(255, 152, 0, 0.08)'
                }
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Open Mobile Folder">
            <IconButton
              onClick={onOpenMobileFolder}
              sx={{
                color: '#009688',
                '&:hover': {
                  backgroundColor: 'rgba(0, 150, 136, 0.08)'
                }
              }}
            >
              <FolderIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ width: '900px' }}>
        {requiredTiles.map((tile, index) => (
          <Grid item key={`${tile.key}-${index}`}>
            <DocumentCard
              tile={tile}
              isCompressingImg={tile.document ? compressingImage === tile.document.fileName : false}
              compressionProgress={compressionProgress}
              onView={() => tile.document && onViewDocument(tile.document)}
              onCompressImage={() => onCompressImage(tile.document, tile.key)}
            />
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
        <Button
          onClick={() => setShowOptional(!showOptional)}
          endIcon={showOptional ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          sx={{
            color: '#009688',
            textTransform: 'none',
            '&:hover': {
              backgroundColor: 'rgba(0, 150, 136, 0.08)'
            }
          }}
        >
          {showOptional ? 'Hide' : 'Show'} Optional Documents ({optionalUploaded}/{totalOptional})
        </Button>
      </Box>

      <Collapse in={showOptional}>
        <Grid container spacing={2} sx={{ width: '900px', mt: 1 }}>
          {optionalTiles.map((tile, index) => (
            <Grid item key={`${tile.key}-${index}`}>
              <DocumentCard
                tile={tile}
                isCompressingImg={tile.document ? compressingImage === tile.document.fileName : false}
                compressionProgress={compressionProgress}
                onView={() => tile.document && onViewDocument(tile.document)}
                onCompressImage={() => onCompressImage(tile.document, tile.key)}
              />
            </Grid>
          ))}
        </Grid>
      </Collapse>
    </Card>
  );
};
