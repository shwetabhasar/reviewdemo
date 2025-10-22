// src/owner/pages/OwnerView.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Skeleton,
  Alert,
  Snackbar,
  Grid,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';

import { ArrowBack as BackIcon } from '@mui/icons-material';
import { Folder as FolderIcon } from '@mui/icons-material';
import { doc, getDoc } from 'firebase/firestore';
import { db } from 'access/config/firebase';
import { IOwner, IOwnerDocument } from 'owner/types/IOwner';
import { useShowroom } from 'access/contexts/showRoomContext';
import PDFPreviewDialog from 'owner/components/PDFPreviewDialog';
import { Form203OptionsDialog } from '../components/Form203OptionsDialog';
import { FinanceCompanySelector } from '../components/FinanceCompanySelector';
import { InsurancePageSelector } from '../components/InsurancePageSelector';
import { IFinanceCompany } from 'finance/types/IFinanceCompany';
import imageCompression from 'browser-image-compression';
import { getFileName } from 'owner/utils/pathUtils';
import { DriveFileMove as DriveFileMoveIcon } from '@mui/icons-material';
import { archiveOwnerInFirebase } from 'owner/api/OwnerEndPoints';
import { LinearProgress } from '@mui/material';

// Import the new components
import { MobileDocumentsSection } from '../components/MobileDocumentsSection';
import { WebsiteDocumentsSection } from '../components/WebsiteDocumentsSection';
import { shouldShowDocument, getDocumentOrder, formatFileSize } from '../utils/ownerDocumentUtils';
import { SaveCompressedImageResult } from 'owner/types/electronTypes';
import { useOwnerStore } from 'owner/store/ownerStore';
import folderService from 'owner/services/folderService';

interface ExtendedOwnerDocument extends IOwnerDocument {}

const OwnerView: React.FC = () => {
  const { ownerId } = useParams<{ ownerId: string }>();
  const navigate = useNavigate();
  const { currentShowroom } = useShowroom();
  const [owner, setOwner] = useState<IOwner | null>(null);
  const [documents, setDocuments] = useState<ExtendedOwnerDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<ExtendedOwnerDocument | null>(null);
  const [compressing, setCompressing] = useState<string | null>(null);
  const [stamping, setStamping] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({ open: false, message: '', severity: 'info' });
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedPdfForStamp, setSelectedPdfForStamp] = useState<{
    path: string;
    url: string;
    fileName: string;
    documentType: string;
  } | null>(null);
  const [stampLoading, setStampLoading] = useState(false);
  const [form203DialogOpen, setForm203DialogOpen] = useState(false);
  const [financeCompanySelectorOpen, setFinanceCompanySelectorOpen] = useState(false);
  const [selectedForm203Path, setSelectedForm203Path] = useState<string | null>(null);

  const [compressingImage, setCompressingImage] = useState<string | null>(null);
  const [compressionProgress, setCompressionProgress] = useState<number>(0);
  const [websiteDocumentSizes, setWebsiteDocumentSizes] = useState<{ [key: string]: number }>({});
  const [websiteDocumentSourceFolders, setWebsiteDocumentSourceFolders] = useState<{ [key: string]: 'finalPdfs' | 'website' }>({});

  const [insurancePageSelectorOpen, setInsurancePageSelectorOpen] = useState(false);
  const [insurancePdfInfo, setInsurancePdfInfo] = useState<{
    path: string;
    fileName: string;
    pageCount: number;
  } | null>(null);
  const [processingInsurance, setProcessingInsurance] = useState(false);
  const [signatureFormat, setSignatureFormat] = useState<'png' | 'svg'>('png');

  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  const getCurrentSignatureFormat = (): 'png' | 'svg' => {
    const savedFormat = localStorage.getItem('signatureFormat') as 'png' | 'svg';
    return savedFormat === 'svg' || savedFormat === 'png' ? savedFormat : 'png';
  };

  const getPaths = () => {
    if (!currentShowroom || !owner) return null;

    const basePath = `D:\\${currentShowroom.showroomName}\\1 FromMobiles\\${owner.name}_${owner.contact}`;

    return {
      mobile: `${basePath}\\mobile`,
      website: `${basePath}\\website`,
      finalPdfs: `${basePath}\\Final PDFs`,
      compressedFiles: `${basePath}\\compressed_files`
    };
  };

  const getDocumentType = (fileName: string): string => {
    const name = fileName.toLowerCase();
    if (name.includes('pan')) return 'pan';
    if (name.includes('aadhaar') || name.includes('adhr')) return 'aadhaar';
    if (name.includes('form60')) return 'form60';
    if (name.includes('medical')) return 'medical';
    if (name.includes('form20') || (name.includes('form') && !name.includes('form60'))) return 'form20';
    if (name.includes('chassis') || name.includes('chss')) return 'chassis';
    if (name.includes('vehicle') || name.includes('vhcl')) return 'vehicle';
    if (name.includes('sign')) return 'sign';
    if (name.includes('other') || name.includes('othr')) return 'other';
    if (name.includes('extra') || name.includes('extr')) return 'extra';
    return fileName.replace(/\.(jpg|jpeg|png|pdf|bmp|webp)$/i, '');
  };

  const getOutputFileNameFromDocumentType = (documentTypeKey: string): string => {
    const mapping: { [key: string]: string } = {
      aadhaar: 'adhr.pdf',
      pan: 'pan.pdf',
      chassis: 'chss.pdf',
      vehicle: 'vhcl.pdf',
      signature: 'sign.pdf',
      form20: 'form20.pdf',
      form60: 'form60.pdf',
      medical: 'medical.pdf',
      other: 'othr.pdf',
      extra: 'extr.pdf'
    };

    return mapping[documentTypeKey] || 'othr.pdf';
  };

  const handleMoveOwner = () => {
    setMoveDialogOpen(true);
  };

  const handleOpenRootFolder = async () => {
    if (!owner || !currentShowroom) return;

    try {
      const result = await folderService.openOwnerFolder(currentShowroom.showroomName, owner.name, owner.contact, 'finalPdfs');

      if (!result.success) {
        setSnackbar({
          open: true,
          message: result.message || 'Failed to open owner folder',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error opening owner folder:', error);
      setSnackbar({
        open: true,
        message: 'Error opening owner folder',
        severity: 'error'
      });
    }
  };

  const confirmMoveOwner = async () => {
    if (!owner || !currentShowroom) {
      setSnackbar({
        open: true,
        message: 'Missing required information',
        severity: 'error'
      });
      return;
    }

    setIsMoving(true);

    try {
      // Step 1: Move the physical folder to archive
      console.log('Step 1: Moving folder to archive...');

      const moveResult = await window.electronAPI.moveOwnerFolder({
        showroomName: currentShowroom.showroomName,
        ownerName: owner.name,
        ownerContact: owner.contact,
        moveDate: new Date()
      });

      if (!moveResult.success) {
        setSnackbar({
          open: true,
          message: `Failed to move folder: ${moveResult.error}`,
          severity: 'error'
        });
        setIsMoving(false);
        return;
      }

      console.log('Folder moved successfully to:', moveResult.archiveLocation);

      // Step 2: Update Firebase
      console.log('Step 2: Updating Firebase (marking as deleted)...');
      const archiveResult = await archiveOwnerInFirebase(owner.id);

      if (!archiveResult.success) {
        console.error('Firebase update failed:', archiveResult.error);
        setSnackbar({
          open: true,
          message: `Folder moved but database update failed: ${archiveResult.error}`,
          severity: 'warning'
        });
        setIsMoving(false);
        return;
      }

      console.log('Firebase updated successfully');

      // Step 3: Manually update the cache (since Firebase listener won't catch this)
      console.log('Step 3: Updating cache...');
      const { updateOwner } = useOwnerStore.getState();
      updateOwner(owner.id, {
        isDeleted: true,
        modifiedAt: new Date()
      });

      setSnackbar({
        open: true,
        message: `Successfully archived ${owner.name}. Location: ${moveResult.archiveLocation}`,
        severity: 'success'
      });

      setMoveDialogOpen(false);

      // Redirect after short delay
      setTimeout(() => {
        navigate('/owner/list');
      }, 1500);
    } catch (error) {
      console.error('Error moving owner to archive:', error);
      setSnackbar({
        open: true,
        message: 'Error moving owner to archive',
        severity: 'error'
      });
    } finally {
      setIsMoving(false);
    }
  };

  // Update the useEffect where documents are fetched:
  useEffect(() => {
    const fetchOwnerAndDocuments = async () => {
      if (!ownerId || !currentShowroom?.showroomId) return;

      try {
        setLoading(true);

        // Fetch owner data from Firestore (still needed for owner info)
        const ownerDoc = await getDoc(doc(db, 'owners', ownerId));

        if (ownerDoc.exists()) {
          const ownerData = {
            id: ownerDoc.id,
            ...ownerDoc.data()
          } as IOwner;

          setOwner(ownerData);

          // Only check local documents
          if (window.electronAPI && window.electronAPI.listLocalDocumentsForDisplay) {
            console.log('Electron API available');
            console.log('Owner data:', ownerData);
            console.log('Current showroom:', currentShowroom);

            const apiParams = {
              showroomName: currentShowroom.showroomName,
              name: ownerData.name,
              contact: ownerData.contact
              // Pass the flag to API
            };

            console.log('Calling listLocalDocuments with:', apiParams);

            try {
              const localResult = await window.electronAPI.listLocalDocumentsForDisplay(apiParams);

              console.log('Local documents result:', localResult);
              console.log('Result success:', localResult?.success);
              console.log('Result documents:', localResult?.documents);
              console.log('Result error:', localResult?.error);

              if (localResult.success && localResult.documents) {
                console.log('Found local documents:', localResult.documents.length);
                console.log('All documents:', localResult.documents);

                // Debug: Check what shouldShowDocument is doing
                console.log('Testing shouldShowDocument function:');
                localResult.documents.forEach((doc: any) => {
                  const shouldShow = shouldShowDocument(doc.fileName);
                  console.log(`File: ${doc.fileName} -> Should show: ${shouldShow} -> From Final PDFs: ${doc.isFromFinalPdfs}`);
                });

                // Get all documents that should be shown
                const allDocuments = localResult.documents.filter((doc: { fileName: string }) => shouldShowDocument(doc.fileName));

                console.log('After shouldShowDocument filter:', allDocuments);
                console.log('Number of documents after filter:', allDocuments.length);

                // Group documents by typec
                const documentGroups = new Map<string, any[]>();

                allDocuments.forEach((doc: any) => {
                  const docType = getDocumentType(doc.fileName);
                  console.log(`Document: ${doc.fileName} -> Type: ${docType} -> From Final PDFs: ${doc.isFromFinalPdfs}`);

                  if (!documentGroups.has(docType)) {
                    documentGroups.set(docType, []);
                  }
                  documentGroups.get(docType)!.push(doc);
                });

                console.log('Document groups:', documentGroups);

                // For each document type, choose the best version to show
                const documentsToShow: any[] = [];

                documentGroups.forEach((docs, docType) => {
                  console.log(`\nProcessing document type: ${docType}`);
                  console.log(
                    'Documents in this group:',
                    docs.map((d: any) => `${d.fileName} (${d.isFromFinalPdfs ? 'Final PDFs' : 'Mobile'})`)
                  );

                  // First check if there's a PDF from Final PDFs folder
                  const finalPdfDoc = docs.find((doc: any) => {
                    return doc.fileName.toLowerCase().endsWith('.pdf') && doc.isFromFinalPdfs;
                  });

                  if (finalPdfDoc) {
                    console.log(`Found PDF in Final PDFs folder: ${finalPdfDoc.fileName}`);
                    documentsToShow.push({
                      fileName: finalPdfDoc.fileName,
                      documentType: '',
                      size: finalPdfDoc.size,
                      isLocal: true,
                      localPath: finalPdfDoc.localPath,
                      isFromFinalPdfs: true
                    });
                  } else {
                    // No PDF in Final PDFs, look for image in mobile folder
                    const imageDoc = docs.find((doc: any) => {
                      const fileName = doc.fileName.toLowerCase();
                      return (
                        (fileName.endsWith('.jpg') ||
                          fileName.endsWith('.jpeg') ||
                          fileName.endsWith('.png') ||
                          fileName.endsWith('.bmp') ||
                          fileName.endsWith('.webp') ||
                          fileName.endsWith('.pdf')) &&
                        !doc.isFromFinalPdfs
                      );
                    });

                    if (imageDoc) {
                      console.log(`No PDF found, using image: ${imageDoc.fileName}`);
                      documentsToShow.push({
                        fileName: imageDoc.fileName,
                        documentType: '',
                        size: imageDoc.size,
                        isLocal: true,
                        localPath: imageDoc.localPath,
                        isFromFinalPdfs: false
                      });
                    } else {
                      console.log(`No suitable document found for type: ${docType}`);
                    }
                  }
                });

                console.log('\nFinal documents to show:', documentsToShow);
                console.log('Number of documents to show:', documentsToShow.length);

                // Sort documents
                const sortedDocuments = documentsToShow.sort((a: { fileName: string }, b: { fileName: string }) => {
                  return getDocumentOrder(a.fileName) - getDocumentOrder(b.fileName);
                });

                console.log('Sorted documents:', sortedDocuments);

                setDocuments(sortedDocuments);
              } else {
                // No documents found locally
                console.log('No documents found or API returned success: false');
                setDocuments([]);
              }
            } catch (apiError) {
              console.error('Error calling listLocalDocuments:', apiError);
              setSnackbar({
                open: true,
                message: 'Error fetching local documents',
                severity: 'error'
              });
              setDocuments([]);
            }
          } else {
            // Not in Electron environment
            setSnackbar({
              open: true,
              message: 'This feature requires the desktop app',
              severity: 'warning'
            });
            setDocuments([]);
          }
        } else {
          setSnackbar({
            open: true,
            message: `${'Owner'} not found`,
            severity: 'error'
          });
          navigate(-1);
        }
      } catch (error) {
        console.error('Error fetching owner or documents:', error);
        setSnackbar({
          open: true,
          message: `Error loading ${'owner'} data`,
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOwnerAndDocuments();
  }, [ownerId, currentShowroom, navigate]);

  useEffect(() => {
    const checkCapabilities = async () => {
      if (window.electronAPI && window.electronAPI.checkCompressionCapabilities) {
        const result = await window.electronAPI.checkCompressionCapabilities();
        if (result.success && result.capabilities && !result.capabilities.ghostscript) {
          console.warn('Ghostscript not installed. PDF compression will use fallback methods.');
        }
      }
    };

    checkCapabilities();
  }, []);

  useEffect(() => {
    localStorage.setItem('signatureFormat', signatureFormat);
  }, [signatureFormat]);

  // Load saved preference on mount
  useEffect(() => {
    const savedFormat = localStorage.getItem('signatureFormat') as 'png' | 'svg';
    if (savedFormat && (savedFormat === 'png' || savedFormat === 'svg')) {
      setSignatureFormat(savedFormat);
    }
  }, []);

  useEffect(() => {
    if (!owner || !currentShowroom) return;
    // Initial fetch
    refreshWebsiteDocuments();
    // Refresh every 5 seconds while the component is mounted
    const interval = setInterval(refreshWebsiteDocuments, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner, currentShowroom]);

  useEffect(() => {
    // Listen for download events from Electron
    if (window.electronAPI && (window as any).electron?.ipcRenderer) {
      // Download started
      const handleDownloadStarted = (data: any) => {
        console.log('Download started:', data);

        // Show immediate feedback
        setSnackbar({
          open: true,
          message: data.message || 'Download started...',
          severity: 'info'
        });
      };

      // Download completed
      const handleDownloadComplete = (data: any) => {
        console.log('Download completed:', data);

        // Show success message
        setSnackbar({
          open: true,
          message: data.message || `Downloaded: ${data.fileName}`,
          severity: 'success'
        });

        // Refresh website documents list if function exists
        if (refreshWebsiteDocuments) {
          refreshWebsiteDocuments();
        }
      };

      // Add listeners
      (window as any).electron.ipcRenderer.on('download-started', handleDownloadStarted);
      (window as any).electron.ipcRenderer.on('download-completed', handleDownloadComplete);

      // Cleanup
      return () => {
        (window as any).electron.ipcRenderer.removeListener('download-started', handleDownloadStarted);
        (window as any).electron.ipcRenderer.removeListener('download-completed', handleDownloadComplete);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCompressImage = async (document?: ExtendedOwnerDocument, documentTypeKey?: string) => {
    if (!owner || !currentShowroom) return;

    const paths = getPaths();
    if (!paths) return;

    try {
      setCompressingImage(document?.fileName || 'selecting');
      setCompressionProgress(0);

      if (window.electronAPI && window.electronAPI.selectImageForCompression) {
        const selectResult = await window.electronAPI.selectImageForCompression({
          defaultPath: paths.mobile,
          showroomName: currentShowroom.showroomName,
          ownerName: owner.name,
          ownerContact: owner.contact,
          documentTypeKey: documentTypeKey
        });

        if (!selectResult.success || selectResult.canceled) {
          setCompressingImage(null);
          setCompressionProgress(0);
          return;
        }

        if (selectResult.fileData && selectResult.mimeType && selectResult.fileName && selectResult.inputPath) {
          // Check if this is a signature document
          const isSignatureDocument =
            document?.fileName?.toLowerCase().includes('sign') ||
            selectResult.fileName.toLowerCase().includes('sign') ||
            documentTypeKey === 'signature';

          const isPDF = selectResult.fileName.toLowerCase().endsWith('.pdf');

          // ============================================================
          // ✅ UPDATED: PDF COMPRESSION SECTION
          // ============================================================
          if (isPDF) {
            setSnackbar({
              open: true,
              message: 'Compressing PDF...',
              severity: 'info'
            });

            // ✅ NEW: Determine output filename from documentTypeKey (same as JPG case)
            let outputFileName: string;
            if (documentTypeKey) {
              // Use the document type key passed from the card/tile
              outputFileName = getOutputFileNameFromDocumentType(documentTypeKey);
              console.log(`[PDF Compression] Using document type from tile: ${documentTypeKey} → ${outputFileName}`);
            } else {
              // Fallback to existing logic if no document type key provided
              outputFileName = undefined as any; // Let the backend auto-detect
              console.log(`[PDF Compression] No document type key provided, using auto-detection`);
            }

            // ✅ MODIFIED: Now passing outputFileName parameter
            const compressResult = await window.electronAPI.compressPDF({
              showroomName: currentShowroom.showroomName,
              name: owner.name,
              contact: owner.contact,
              fileName: selectResult.fileName,
              filePath: selectResult.inputPath,
              outputFileName: outputFileName // ← NEW: Explicit output filename based on tile
            });

            if (compressResult.success) {
              setSnackbar({
                open: true,
                message: `✅ PDF compressed successfully! ${formatFileSize(compressResult.originalSize)} → ${formatFileSize(compressResult.compressedSize)} saved in Final PDFs as ${outputFileName || compressResult.newFileName}`,
                severity: 'success'
              });

              // Refresh documents list
              await handleRefreshDocuments();
            } else {
              setSnackbar({
                open: true,
                message: `Failed to compress PDF: ${compressResult.error}`,
                severity: 'error'
              });
            }

            setCompressingImage(null);
            setCompressionProgress(0);
            return;
          }
          // ============================================================
          // END OF UPDATED PDF COMPRESSION SECTION
          // ============================================================

          // Special handling for Signatures (UNCHANGED)
          if (isSignatureDocument) {
            console.log('Processing Owner signature...');

            // Check if file is PNG
            const fileExtension = selectResult.fileName.split('.').pop()?.toLowerCase() || '';
            const isPng = fileExtension === 'png';

            // ONLY accept PNG files for signatures
            if (!isPng) {
              console.log('Non-PNG file selected for signature:', fileExtension);
              setSnackbar({
                open: true,
                message: '❌ Only PNG files are accepted for signatures. Please select a PNG file.',
                severity: 'error'
              });
              setCompressingImage(null);
              setCompressionProgress(0);
              return;
            }

            setSnackbar({
              open: true,
              message: 'Processing signature PNG...',
              severity: 'info'
            });

            if (window.electronAPI && window.electronAPI.processSignature) {
              const signatureFolderPath = paths.mobile;
              let copyResult: any = null;

              if (window.electronAPI.copyFile) {
                const pngDestPath = `${signatureFolderPath}\\sign.png`;
                copyResult = await window.electronAPI.copyFile({
                  sourcePath: selectResult.inputPath,
                  destinationPath: pngDestPath
                });

                if (!copyResult.success) {
                  console.error('Failed to copy PNG:', copyResult.error);
                  setSnackbar({
                    open: true,
                    message: `Failed to copy PNG: ${copyResult.error}`,
                    severity: 'error'
                  });
                  setCompressingImage(null);
                  setCompressionProgress(0);
                  return;
                }
                console.log('PNG copied successfully to mobile folder:', copyResult.sizeKB, 'KB');
              }

              console.log('Creating SVG from PNG in mobile folder...');

              try {
                const result = await window.electronAPI.processSignature({
                  inputPath: selectResult.inputPath,
                  outputFolder: signatureFolderPath,
                  deleteOriginal: false,
                  createPng: false,
                  createSvg: true,
                  preserveColors: true,
                  svgOptions: {
                    preserveOriginalColors: true,
                    colorPrecision: 'high'
                  }
                });

                console.log('processSignature result:', result);

                if (result.success || copyResult?.success) {
                  let message = `✅ Signature saved in mobile folder!\n`;
                  message += `• PNG: Original preserved (${copyResult?.sizeKB || 'unknown'} KB)\n`;

                  if (result.svg) {
                    message += `• SVG: ${result.svg.sizeKB}KB (vector format)`;
                  }

                  setSnackbar({
                    open: true,
                    message: message,
                    severity: 'success'
                  });

                  // Refresh documents to show the signature
                  const localResult = await window.electronAPI.listLocalDocumentsForDisplay({
                    showroomName: currentShowroom.showroomName,
                    name: owner.name,
                    contact: owner.contact
                  });

                  if (localResult.success && localResult.documents) {
                    const allDocuments = localResult.documents.filter((doc: { fileName: string }) => shouldShowDocument(doc.fileName));

                    const documentGroups = new Map<string, any[]>();
                    allDocuments.forEach((doc: any) => {
                      const docType = getDocumentType(doc.fileName);
                      if (!documentGroups.has(docType)) {
                        documentGroups.set(docType, []);
                      }
                      documentGroups.get(docType)!.push(doc);
                    });

                    const documentsToShow: any[] = [];
                    documentGroups.forEach((docs) => {
                      const finalPdfDoc = docs.find((doc: any) => doc.fileName.toLowerCase().endsWith('.pdf') && doc.isFromFinalPdfs);

                      if (finalPdfDoc) {
                        documentsToShow.push({
                          fileName: finalPdfDoc.fileName,
                          documentType: '',
                          size: finalPdfDoc.size,
                          isLocal: true,
                          localPath: finalPdfDoc.localPath,
                          isFromFinalPdfs: true
                        });
                      } else {
                        const imageDoc = docs.find((doc: any) => {
                          const fileName = doc.fileName.toLowerCase();
                          return (
                            (fileName.endsWith('.jpg') ||
                              fileName.endsWith('.jpeg') ||
                              fileName.endsWith('.png') ||
                              fileName.endsWith('.svg') ||
                              fileName.endsWith('.pdf')) &&
                            !doc.isFromFinalPdfs
                          );
                        });

                        if (imageDoc) {
                          documentsToShow.push({
                            fileName: imageDoc.fileName,
                            documentType: '',
                            size: imageDoc.size,
                            isLocal: true,
                            localPath: imageDoc.localPath,
                            isFromFinalPdfs: false
                          });
                        }
                      }
                    });

                    const sortedDocuments = documentsToShow.sort((a: { fileName: string }, b: { fileName: string }) => {
                      return getDocumentOrder(a.fileName) - getDocumentOrder(b.fileName);
                    });

                    setDocuments(sortedDocuments);
                  }
                } else {
                  setSnackbar({
                    open: true,
                    message: result.error || 'Failed to process signature',
                    severity: 'error'
                  });
                }
              } catch (err) {
                console.error('Error processing signature:', err);
                setSnackbar({
                  open: true,
                  message: 'Error processing signature: ' + (err instanceof Error ? err.message : String(err)),
                  severity: 'error'
                });
              }
            } else {
              console.error('processSignature API not available');
              setSnackbar({
                open: true,
                message: 'Signature processing not available',
                severity: 'error'
              });
            }

            setCompressingImage(null);
            setCompressionProgress(0);
            return;
          }

          // IMAGE COMPRESSION SECTION (UNCHANGED)
          const response = await fetch(`data:${selectResult.mimeType};base64,${selectResult.fileData}`);
          const blob = await response.blob();
          const file = new File([blob], selectResult.fileName, { type: selectResult.mimeType });

          const isAlreadyOptimized = file.size <= 299 * 1024;
          let finalImagePath = selectResult.inputPath;
          let finalFileSize = file.size;

          if (isAlreadyOptimized) {
            setSnackbar({
              open: true,
              message: `Image already optimized (${formatFileSize(file.size)}). Converting to PDF...`,
              severity: 'info'
            });
            console.log(`Skipping compression for ${selectResult.fileName} - already ${formatFileSize(file.size)}`);
          } else {
            setSnackbar({
              open: true,
              message: `Compressing image (${formatFileSize(file.size)} → target <299KB)...`,
              severity: 'info'
            });

            const options = {
              maxSizeMB: 0.3,
              maxWidthOrHeight: 1920,
              useWebWorker: true,
              onProgress: (progress: number) => {
                setCompressionProgress(progress);
              }
            };

            const compressedFile = await imageCompression(file, options);

            const reader = new FileReader();
            const base64Data = await new Promise<string>((resolve, reject) => {
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(compressedFile);
            });

            const saveResult = (await window.electronAPI.saveCompressedImage({
              showroomName: currentShowroom.showroomName,
              ownerName: owner.name,
              ownerContact: owner.contact,
              fileName: selectResult.fileName,
              base64Data: base64Data,
              originalSize: file.size,
              compressedSize: compressedFile.size
            })) as SaveCompressedImageResult;

            if (!saveResult.success || !saveResult.savedPath) {
              setSnackbar({
                open: true,
                message: saveResult.error || 'Failed to save compressed image',
                severity: 'error'
              });
              return;
            }

            finalImagePath = saveResult.savedPath;
            finalFileSize = compressedFile.size;

            setSnackbar({
              open: true,
              message: `Image compressed (${formatFileSize(file.size)} → ${formatFileSize(compressedFile.size)}). Converting to PDF...`,
              severity: 'info'
            });
          }

          // Use documentTypeKey to determine the output filename
          let outputFileName: string;
          if (documentTypeKey) {
            // Use the document type key passed from the card
            outputFileName = getOutputFileNameFromDocumentType(documentTypeKey);
            console.log(`[PDF Conversion] Using document type from card: ${documentTypeKey} → ${outputFileName}`);
          } else {
            // Fallback to existing logic if no document type key provided
            outputFileName = undefined as any; // Let the backend auto-detect
            console.log(`[PDF Conversion] No document type key provided, using auto-detection`);
          }

          const pdfResult = await window.electronAPI.convertImageToPdf({
            imagePath: finalImagePath,
            showroomName: currentShowroom.showroomName,
            ownerName: owner.name,
            ownerContact: owner.contact,
            targetSizeKB: 299,
            outputFileName: outputFileName
          });

          if (pdfResult.success) {
            let successMessage = '';
            const fileName = document?.fileName || selectResult.fileName;
            const isForm20 =
              fileName.toLowerCase().includes('form20') ||
              (fileName.toLowerCase().includes('form') && !fileName.toLowerCase().includes('form60')) ||
              documentTypeKey === 'form20';

            if (isAlreadyOptimized) {
              if (isForm20) {
                successMessage = `✅ Complete! Form 20 (${formatFileSize(file.size)}) converted to PDF: ${formatFileSize(pdfResult.pdfSize || 0)} saved in website folder as 203.pdf`;
              } else {
                successMessage = `✅ Complete! Original image (${formatFileSize(file.size)}) converted to PDF: ${formatFileSize(pdfResult.pdfSize || 0)} saved in Final PDFs as ${outputFileName || pdfResult.pdfFileName}`;
              }
            } else {
              if (isForm20) {
                successMessage = `✅ Complete! Form 20 compressed: ${formatFileSize(finalFileSize)} | PDF: ${formatFileSize(pdfResult.pdfSize || 0)} saved in website folder as 203.pdf`;
              } else {
                successMessage = `✅ Complete! Compressed: ${formatFileSize(finalFileSize)} | PDF: ${formatFileSize(pdfResult.pdfSize || 0)} saved in Final PDFs as ${outputFileName || pdfResult.pdfFileName}`;
              }
            }

            setSnackbar({
              open: true,
              message: successMessage,
              severity: 'success'
            });

            // Refresh documents
            const localResult = await window.electronAPI.listLocalDocumentsForDisplay({
              showroomName: currentShowroom.showroomName,
              name: owner.name,
              contact: owner.contact
            });

            if (localResult.success && localResult.documents) {
              const allDocuments = localResult.documents.filter((doc: { fileName: string }) => shouldShowDocument(doc.fileName));

              const documentGroups = new Map<string, any[]>();
              allDocuments.forEach((doc: any) => {
                const docType = getDocumentType(doc.fileName);
                if (!documentGroups.has(docType)) {
                  documentGroups.set(docType, []);
                }
                documentGroups.get(docType)!.push(doc);
              });

              const documentsToShow: any[] = [];
              documentGroups.forEach((docs) => {
                const finalPdfDoc = docs.find((doc: any) => doc.fileName.toLowerCase().endsWith('.pdf') && doc.isFromFinalPdfs);

                if (finalPdfDoc) {
                  documentsToShow.push({
                    fileName: finalPdfDoc.fileName,
                    documentType: '',
                    size: finalPdfDoc.size,
                    isLocal: true,
                    localPath: finalPdfDoc.localPath,
                    isFromFinalPdfs: true
                  });
                } else {
                  const imageDoc = docs.find((doc: any) => {
                    const fileName = doc.fileName.toLowerCase();
                    return (
                      (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png') || fileName.endsWith('.pdf')) &&
                      !doc.isFromFinalPdfs
                    );
                  });

                  if (imageDoc) {
                    documentsToShow.push({
                      fileName: imageDoc.fileName,
                      documentType: '',
                      size: imageDoc.size,
                      isLocal: true,
                      localPath: imageDoc.localPath,
                      isFromFinalPdfs: false
                    });
                  }
                }
              });

              const sortedDocuments = documentsToShow.sort((a: { fileName: string }, b: { fileName: string }) => {
                return getDocumentOrder(a.fileName) - getDocumentOrder(b.fileName);
              });

              setDocuments(sortedDocuments);
            }
          } else {
            setSnackbar({
              open: true,
              message: `PDF conversion failed: ${pdfResult.error || 'Unknown error'}`,
              severity: 'error'
            });
          }
        }
      }
    } catch (error) {
      console.error('Error processing image:', error);
      setSnackbar({
        open: true,
        message: 'Error processing image',
        severity: 'error'
      });
    } finally {
      setCompressingImage(null);
      setCompressionProgress(0);
    }
  };

  // ============================================================
  // SUMMARY OF CHANGES:
  // ============================================================
  // Lines 559-593: PDF Compression Section
  // - Added outputFileName determination logic (lines 567-577)
  // - Added outputFileName to compressPDF API call (line 585)
  // - Updated success message to show outputFileName (line 591)
  //
  // Result: PDF files now use the same naming logic as JPG files
  //         Output filename is determined by TILE clicked, not file selected
  // ============================================================

  const handleRefreshDocuments = async () => {
    if (!owner || !currentShowroom) return;

    try {
      console.log('[Refresh] Refreshing documents list...');

      // Call the same API used in useEffect to fetch documents
      if (window.electronAPI && window.electronAPI.listLocalDocumentsForDisplay) {
        const apiParams = {
          showroomName: currentShowroom.showroomName,
          name: owner.name,
          contact: owner.contact
        };

        const localResult = await window.electronAPI.listLocalDocumentsForDisplay(apiParams);

        if (localResult.success && localResult.documents) {
          console.log('[Refresh] Found local documents:', localResult.documents.length);

          // Filter and process documents (same logic as useEffect)
          const allDocuments = localResult.documents.filter((doc: { fileName: string }) => shouldShowDocument(doc.fileName));

          const documentGroups = new Map<string, any[]>();
          allDocuments.forEach((doc: any) => {
            const docType = getDocumentType(doc.fileName);
            if (!documentGroups.has(docType)) {
              documentGroups.set(docType, []);
            }
            documentGroups.get(docType)!.push(doc);
          });

          const documentsToShow: any[] = [];
          documentGroups.forEach((docs) => {
            const finalPdfDoc = docs.find((doc: any) => doc.fileName.toLowerCase().endsWith('.pdf') && doc.isFromFinalPdfs);

            if (finalPdfDoc) {
              documentsToShow.push({
                fileName: finalPdfDoc.fileName,
                documentType: '',
                size: finalPdfDoc.size,
                isLocal: true,
                localPath: finalPdfDoc.localPath,
                isFromFinalPdfs: true
              });
            } else {
              const imageDoc = docs.find((doc: any) => {
                const fileName = doc.fileName.toLowerCase();
                return (
                  (fileName.endsWith('.jpg') ||
                    fileName.endsWith('.jpeg') ||
                    fileName.endsWith('.png') ||
                    fileName.endsWith('.bmp') ||
                    fileName.endsWith('.webp') ||
                    fileName.endsWith('.pdf')) &&
                  !doc.isFromFinalPdfs
                );
              });

              if (imageDoc) {
                documentsToShow.push({
                  fileName: imageDoc.fileName,
                  documentType: '',
                  size: imageDoc.size,
                  isLocal: true,
                  localPath: imageDoc.localPath,
                  isFromFinalPdfs: false
                });
              }
            }
          });

          const sortedDocuments = documentsToShow.sort((a: { fileName: string }, b: { fileName: string }) => {
            return getDocumentOrder(a.fileName) - getDocumentOrder(b.fileName);
          });

          setDocuments(sortedDocuments);

          setSnackbar({
            open: true,
            message: `Refreshed! Found ${sortedDocuments.length} documents`,
            severity: 'success'
          });

          console.log('[Refresh] Documents updated successfully');
        } else {
          setSnackbar({
            open: true,
            message: 'No documents found',
            severity: 'info'
          });
          setDocuments([]);
        }
      }
    } catch (error) {
      console.error('[Refresh] Error refreshing documents:', error);
      setSnackbar({
        open: true,
        message: 'Error refreshing documents',
        severity: 'error'
      });
    }
  };

  const handleOpenMobileFolder = async () => {
    if (!owner || !currentShowroom) return;

    try {
      const result = await window.electronAPI.openOwnerFolder({
        showroomName: currentShowroom.showroomName,
        name: owner.name,
        contact: owner.contact,
        folderType: 'mobile'
      });

      if (!result.success) {
        setSnackbar({
          open: true,
          message: result.message || `Failed to open 'mobile'} folder`,
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error opening mobile folder:', error);
      setSnackbar({
        open: true,
        message: `Error opening 'mobile'} folder`,
        severity: 'error'
      });
    }
  };

  const handleViewDocument = async (document: ExtendedOwnerDocument) => {
    if (document.downloadURL) {
      // For Website documents, open the download URL in a new tab
      window.open(document.downloadURL, '_blank');
    } else if (document.localPath && window.electronAPI && window.electronAPI.getLocalFileUrl) {
      const result = await window.electronAPI.getLocalFileUrl(document.localPath);
      if (result.success && result.dataUrl) {
        setPdfUrl(result.dataUrl);
        setPdfDialogOpen(true);
      } else {
        setSnackbar({
          open: true,
          message: result.error || 'Error loading file',
          severity: 'error'
        });
      }
    } else {
      setSnackbar({
        open: true,
        message: 'Document not available',
        severity: 'error'
      });
    }
  };

  const refreshWebsiteDocuments = async () => {
    if (!owner || !currentShowroom || !window.electronAPI?.listWebsiteDocuments) return;

    try {
      const result = await window.electronAPI.listWebsiteDocuments({
        showroomName: currentShowroom.showroomName,
        ownerName: owner.name,
        ownerContact: owner.contact
      });

      if (result.success && result.documents) {
        console.log('Website documents:', result.documents);

        const sizes: { [key: string]: number } = {};
        const sourceFolders: { [key: string]: 'finalPdfs' | 'website' } = {};

        result.documents.forEach((doc: any) => {
          let key = doc.key || '';

          // Map 'form20' (merged) to 'form20-3' for display
          if (key === 'form20') {
            key = 'form20-3';
          }

          if (key && doc.size) {
            sizes[key] = doc.size;
            sourceFolders[key] = doc.isFromFinalPdfs ? 'finalPdfs' : 'website';
            console.log(`${key}: ${(doc.size / 1024).toFixed(1)}KB from ${doc.isFromFinalPdfs ? 'Final PDFs' : 'website'}`);
          }
        });

        setWebsiteDocumentSizes(sizes);
        setWebsiteDocumentSourceFolders(sourceFolders);

        console.log('Document sizes map:', sizes);
        console.log('Document source folders map:', sourceFolders);
      }
    } catch (error) {
      console.error('Error fetching website documents:', error);
    }
  };

  const handleViewWebsiteDocument = async (documentKey: string) => {
    if (!owner || !currentShowroom) return;

    const paths = getPaths();
    if (!paths) return;

    try {
      // Build both the Final PDFs folder path and website folder path
      const finalPdfsPath = paths.finalPdfs;
      const websiteFolderPath = paths.website;

      // Map document keys to expected file names - UPDATED WITH SHORT FORMS
      const fileNameMap: { [key: string]: string[] } = {
        insurance: ['insu.pdf', 'insurance.pdf', 'Insurance.pdf'],
        invoice: ['invo.pdf', 'invoice.pdf', 'Invoice.pdf'],
        form22: ['form22.pdf', 'Form22.pdf', 'form 22.pdf', 'Form 22.pdf', 'fm22.pdf'],
        disclaimer: ['disclaimer.pdf', 'Disclaimer.pdf', 'disc.pdf'],
        form21: ['form21.pdf', 'Form21.pdf', 'form 21.pdf', 'Form 21.pdf', 'fm21.pdf'],
        // UPDATED: For form20, prioritize fm20.pdf (merged) from Final PDFs
        'form20-3': ['fm20.pdf', '203.pdf', 'form20-3.pdf', 'Form20-3.pdf', 'form 20-3.pdf', 'Form 20-3.pdf'],
        'form20-1': ['form20-1.pdf', 'Form20-1.pdf', 'form 20-1.pdf', 'Form 20-1.pdf', '201.pdf'],
        'form20-2': ['form20-2.pdf', 'Form20-2.pdf', 'form 20-2.pdf', 'Form 20-2.pdf', '202.pdf']
      };

      const possibleFileNames = fileNameMap[documentKey] || [`${documentKey}.pdf`];

      // Try to find the document - CHECK FINAL PDFs FOLDER FIRST
      if (window.electronAPI && window.electronAPI.getWebsiteDocumentUrl) {
        // First, try to find in Final PDFs folder
        const finalPdfsResult = await window.electronAPI.getWebsiteDocumentUrl({
          websiteFolderPath: finalPdfsPath, // Use Final PDFs path
          possibleFileNames,
          documentKey
        });

        if (finalPdfsResult.success && finalPdfsResult.dataUrl) {
          // Found in Final PDFs folder - show in Document Viewer dialog
          setPdfUrl(finalPdfsResult.dataUrl);
          setPdfDialogOpen(true);

          // Special logging for Form 20
          if (documentKey === 'form20-3' && possibleFileNames.includes('fm20.pdf')) {
            const foundFile = finalPdfsResult.fileName || 'unknown';
            if (foundFile === 'fm20.pdf') {
              console.log('Viewing merged Form 20 (fm20.pdf) from Final PDFs folder');
            } else {
              console.log(`Viewing ${documentKey} from Final PDFs folder`);
            }
          } else {
            console.log(`Viewing ${documentKey} from Final PDFs folder`);
          }
          return;
        }

        // If not found in Final PDFs, fallback to website folder (for individual Form 20 parts)
        const websiteResult = await window.electronAPI.getWebsiteDocumentUrl({
          websiteFolderPath,
          possibleFileNames: possibleFileNames.filter((name) => name !== 'fm20.pdf'), // Don't look for fm20.pdf in website
          documentKey
        });

        if (websiteResult.success && websiteResult.dataUrl) {
          // Show in Document Viewer dialog like mobile documents
          setPdfUrl(websiteResult.dataUrl);
          setPdfDialogOpen(true);
          console.log(`Viewing ${documentKey} from website folder (fallback)`);
        } else if (!websiteResult.success) {
          setSnackbar({
            open: true,
            message: websiteResult.error || `${documentKey} document not found in Final PDFs or website folder`,
            severity: 'warning'
          });
        }
      } else if (window.electronAPI && window.electronAPI.getLocalFileUrl) {
        // Fallback approach: Try each possible filename using the existing getLocalFileUrl API
        let foundFilePath = null;

        // First check Final PDFs folder
        for (const fileName of possibleFileNames) {
          const fullPath = `${finalPdfsPath}\\${fileName}`;

          // Check if file exists using getLocalFileUrl
          const testResult = await window.electronAPI.getLocalFileUrl(fullPath);
          if (testResult.success && testResult.dataUrl) {
            foundFilePath = fullPath;
            setPdfUrl(testResult.dataUrl);
            setPdfDialogOpen(true);

            if (fileName === 'fm20.pdf') {
              console.log('Viewing merged Form 20 (fm20.pdf) from Final PDFs folder');
            } else {
              console.log(`Viewing ${documentKey} from Final PDFs folder`);
            }
            break;
          }
        }

        // If not found in Final PDFs, check website folder (excluding fm20.pdf)
        if (!foundFilePath) {
          const websiteFileNames = possibleFileNames.filter((name) => name !== 'fm20.pdf');
          for (const fileName of websiteFileNames) {
            const fullPath = `${websiteFolderPath}\\${fileName}`;

            // Check if file exists using getLocalFileUrl
            const testResult = await window.electronAPI.getLocalFileUrl(fullPath);
            if (testResult.success && testResult.dataUrl) {
              foundFilePath = fullPath;
              setPdfUrl(testResult.dataUrl);
              setPdfDialogOpen(true);
              console.log(`Viewing ${documentKey} from website folder (fallback)`);
              break;
            }
          }
        }

        if (!foundFilePath) {
          setSnackbar({
            open: true,
            message: `${documentKey} document not found in Final PDFs or website folder`,
            severity: 'warning'
          });
        }
      } else {
        setSnackbar({
          open: true,
          message: 'View functionality requires desktop app',
          severity: 'info'
        });
      }
    } catch (error) {
      console.error('Error viewing website document:', error);
      setSnackbar({
        open: true,
        message: 'Error opening document',
        severity: 'error'
      });
    }
  };

  const handleOpenWebsiteFolder = async () => {
    if (!owner || !currentShowroom) return;

    try {
      const result = await window.electronAPI.openOwnerFolder({
        showroomName: currentShowroom.showroomName,
        name: owner.name,
        contact: owner.contact,
        folderType: 'website'
      });

      if (!result.success) {
        setSnackbar({
          open: true,
          message: result.message || 'Failed to open website folder',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error opening website folder:', error);
      setSnackbar({
        open: true,
        message: 'Error opening website folder',
        severity: 'error'
      });
    }
  };

  // Add this new handler function after handleCompress
  const handleWebsiteCompress = async (documentKey: string) => {
    if (!owner || !currentShowroom) return;

    const paths = getPaths();
    if (!paths) return;

    try {
      setCompressing(documentKey);

      // Build the website folder path
      const websiteFolderPath = paths.website;

      // Let user select the file to compress
      if (window.electronAPI && window.electronAPI.selectPdfForPreview) {
        const selectResult = await window.electronAPI.selectPdfForPreview({
          defaultPath: websiteFolderPath,
          documentType: documentKey
        });

        if (selectResult.success && selectResult.filePath) {
          // Set up progress listener
          if (window.electronAPI && window.electronAPI.onCompressionProgress) {
            window.electronAPI.onCompressionProgress((progress) => {
              console.log('Compression progress:', progress);

              if (progress.status === 'completed') {
                setSnackbar({
                  open: true,
                  message: `PDF compressed successfully! Reduced from ${formatFileSize(progress.originalSize)} to ${formatFileSize(progress.compressedSize)} (${progress.compressionRatio}% reduction)`,
                  severity: 'success'
                });
              } else if (progress.status === 'error') {
                setSnackbar({
                  open: true,
                  message: `Compression failed: ${progress.error}`,
                  severity: 'error'
                });
              }
            });
          }

          // Compress the selected file
          const result = await window.electronAPI.compressPDF({
            showroomName: currentShowroom.showroomName,
            name: owner.name,
            contact: owner.contact,
            fileName: getFileName(selectResult.filePath),
            filePath: selectResult.filePath // Pass the full path
          });

          if (result.success) {
            setSnackbar({
              open: true,
              message: result.message || 'PDF compressed successfully',
              severity: 'success'
            });

            // Refresh website documents
            if (refreshWebsiteDocuments) {
              refreshWebsiteDocuments();
            }
          } else {
            if (result.error === 'Could not achieve target compression') {
              setSnackbar({
                open: true,
                message: 'Unable to compress below 299KB without significant quality loss. Try removing some pages or images.',
                severity: 'warning'
              });
            } else {
              setSnackbar({
                open: true,
                message: result.error || 'Failed to compress PDF',
                severity: 'error'
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error compressing PDF:', error);
      setSnackbar({
        open: true,
        message: 'Error compressing PDF',
        severity: 'error'
      });
    } finally {
      setCompressing(null);
      if (window.electronAPI && window.electronAPI.removeCompressionProgressListener) {
        window.electronAPI.removeCompressionProgressListener();
      }
    }
  };

  const handleConfirmStamp = async () => {
    if (!selectedPdfForStamp || !window.electronAPI) return;

    try {
      setStampLoading(true);

      // Check if this is any form20-3 variant
      if (selectedPdfForStamp.documentType?.startsWith('form20-3')) {
        const option = selectedPdfForStamp.documentType.split('-')[2]; // Get 'cash', 'finance', or 'mobile'

        if (option === 'mobile') {
          // Copy from mobile to website folder
          if (!owner || !currentShowroom) {
            setSnackbar({
              open: true,
              message: 'Missing owner or showroom information',
              severity: 'error'
            });
            return;
          }

          const result = await window.electronAPI.copyMobileToWebsite({
            inputPath: selectedPdfForStamp.path,
            showroomName: currentShowroom.showroomName,
            ownerName: owner.name,
            ownerContact: owner.contact,
            fileName: '203.pdf'
          });

          if (result.success) {
            setSnackbar({
              open: true,
              message: 'Form 20-3 copied from mobile to website folder successfully!',
              severity: 'success'
            });
            setPreviewDialogOpen(false);
            setSelectedPdfForStamp(null);
            if (refreshWebsiteDocuments) {
              refreshWebsiteDocuments();
            }
            setTimeout(() => {
              checkAndAutoMergeForm20();
            }, 1500);
          } else {
            setSnackbar({
              open: true,
              message: result.error || 'Error copying file',
              severity: 'error'
            });
          }
        } else if (option === 'finance') {
          // Close preview and open finance selector
          setPreviewDialogOpen(false);
          setFinanceCompanySelectorOpen(true);
        } else if (option === 'cash') {
          // Process cash option
          await processForm203(selectedPdfForStamp.path, 'cash', null);
          setPreviewDialogOpen(false);
          setSelectedPdfForStamp(null);
        }

        return;
      }

      // Continue with normal stamping for other document types
      const result = await window.electronAPI.stampPdfFile({
        inputPath: selectedPdfForStamp.path,
        stampConfig: {
          documentType: selectedPdfForStamp.documentType,
          width: 100,
          height: 100,
          opacity: 0.9,
          includeSignature: selectedPdfForStamp.documentType === 'form20-2',
          signatureFormat: getCurrentSignatureFormat(),
          showroomName: currentShowroom!.showroomName,
          ownerName: owner!.name,
          ownerContact: owner!.contact
        }
      });

      // Process the result
      if (result.success) {
        // Show detailed success message
        let message = '';

        if (selectedPdfForStamp.documentType === 'insurance') {
          message = `Insurance document processed successfully! Saved as ${result.finalName}`;
        } else if (selectedPdfForStamp.documentType === 'invoice') {
          message = `Invoice stamped and saved as ${result.finalName}`;
        } else if (selectedPdfForStamp.documentType === 'form22') {
          message = `Form 22 processed successfully! Saved as ${result.finalName}`;
        } else if (selectedPdfForStamp.documentType === 'form20-1') {
          message = `Form 20-1 processed successfully! Saved as ${result.finalName}`;
        } else if (selectedPdfForStamp.documentType === 'disclaimer') {
          message = `Disclaimer stamped and saved as ${result.finalName}`;
        } else if (selectedPdfForStamp.documentType === 'form21') {
          message = `Form 21 stamped and saved as ${result.finalName}`;
        } else if (selectedPdfForStamp.documentType === 'form20-2') {
          message = `Form 20-2 stamped with signature and saved as ${result.finalName}`;
        } else {
          message = `PDF processed successfully!`;
          if (result.documentType) {
            message += ` (${result.documentType})`;
          }
          if (result.stampApplied && result.signatureApplied) {
            message += ' - Stamp and signature applied';
          } else if (result.stampApplied) {
            message += ' - Stamp applied';
          }
          if (result.pageNumber) {
            message += ` on page ${result.pageNumber}`;
          }
          if (result.finalName) {
            message += ` - Saved as ${result.finalName}`;
          }
        }

        if (result.originalDeleted) {
          message += ' - Original file removed';
        }

        setSnackbar({
          open: true,
          message: message,
          severity: 'success'
        });

        // Close the preview dialog
        setPreviewDialogOpen(false);
        setSelectedPdfForStamp(null);

        // Refresh the website documents list
        if (owner && currentShowroom) {
          refreshWebsiteDocuments();
        }
      } else if (result.skipReason) {
        // Document doesn't need stamping but was processed
        if (result.finalName) {
          setSnackbar({
            open: true,
            message: `${result.skipReason}. File saved as ${result.finalName}`,
            severity: 'info'
          });
        } else {
          setSnackbar({
            open: true,
            message: result.error || result.skipReason,
            severity: 'info'
          });
        }

        // Close dialog even for skipped documents
        setPreviewDialogOpen(false);
        setSelectedPdfForStamp(null);
      } else {
        // Error occurred
        setSnackbar({
          open: true,
          message: result.error || 'Error processing document',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error processing document:', error);
      setSnackbar({
        open: true,
        message: 'Error processing document',
        severity: 'error'
      });
    } finally {
      setStampLoading(false);
      setStamping(null);
    }
  };

  // // Fallback function for direct stamping without preview
  // const performDirectStamping = async (documentKey: string, websiteFolderPath: string) => {
  //   if (!window.electronAPI || !window.electronAPI.stampWebsiteDocument) {
  //     // Fallback to old API if new one doesn't exist
  //     if (window.electronAPI.selectAndStampPdf) {
  //       const result = await window.electronAPI.selectAndStampPdf({
  //         defaultPath: websiteFolderPath,
  //         width: 100,
  //         height: 100,
  //         opacity: 0.9,
  //         includeSignature: documentKey === 'form20-2',
  //         documentType: documentKey,
  //         showroomName: currentShowroom!.showroomName, // ADD THIS
  //         ownerName: owner!.name, // ADD THIS
  //         ownerContact: owner!.contact // ADD THIS
  //       });

  //       if (result.success) {
  //         setSnackbar({
  //           open: true,
  //           message: result.skipReason
  //             ? result.skipReason
  //             : `PDF stamped successfully! ${result.documentType ? `(${result.documentType})` : ''} Saved to: ${result.outputPath}`,
  //           severity: result.skipReason ? 'info' : 'success'
  //         });
  //       } else {
  //         setSnackbar({
  //           open: true,
  //           message: result.error || 'Error stamping document',
  //           severity: result.skipReason ? 'info' : 'error'
  //         });
  //       }
  //     } else {
  //       setSnackbar({
  //         open: true,
  //         message: 'This feature requires the desktop app',
  //         severity: 'error'
  //       });
  //     }
  //     return;
  //   }

  //   // Use new API for document-type-specific stamping
  //   const result = await window.electronAPI.stampWebsiteDocument({
  //     documentType: documentKey,
  //     defaultPath: websiteFolderPath,
  //     showroomName: currentShowroom!.showroomName, // ADD THIS
  //     ownerName: owner!.name, // ADD THIS
  //     ownerContact: owner!.contact, // ADD THIS
  //     customConfig: {
  //       stampWidth: 100,
  //       stampHeight: 100,
  //       stampOpacity: 0.9,
  //       signatureWidth: 80,
  //       signatureHeight: 40,
  //       signatureOpacity: 0.9
  //     }
  //   });

  //   if (result.success) {
  //     // Show detailed success message
  //     let message = `PDF stamped successfully!`;
  //     if (result.documentType) {
  //       message += ` (${result.documentType})`;
  //     }
  //     if (result.stampApplied && result.signatureApplied) {
  //       message += ' - Stamp and signature applied';
  //     } else if (result.stampApplied) {
  //       message += ' - Stamp applied';
  //     }
  //     if (result.pageNumber) {
  //       message += ` on page ${result.pageNumber}`;
  //     }

  //     setSnackbar({
  //       open: true,
  //       message: message,
  //       severity: 'success'
  //     });
  //   } else if (result.skipReason) {
  //     // Document doesn't need stamping
  //     setSnackbar({
  //       open: true,
  //       message: result.error || result.skipReason,
  //       severity: 'info'
  //     });
  //   } else {
  //     // Error occurred
  //     setSnackbar({
  //       open: true,
  //       message: result.error || 'Error stamping document',
  //       severity: 'error'
  //     });
  //   }
  // };

  // Modify the handleStamp function to include Form 22 processing
  const handleStamp = async (documentKey: string) => {
    try {
      setStamping(documentKey);

      if (!owner || !currentShowroom) {
        setSnackbar({
          open: true,
          message: 'Missing owner or showroom information',
          severity: 'error'
        });
        return;
      }

      const paths = getPaths();
      if (!paths) return;

      const websiteFolderPath = paths.website;

      if (documentKey === 'form20-3') {
        setForm203DialogOpen(true);
        return;
      }

      // Special handling for insurance documents
      if (documentKey === 'insurance') {
        if (window.electronAPI && window.electronAPI.selectPdfForPreview) {
          const selectResult = await window.electronAPI.selectPdfForPreview({
            defaultPath: websiteFolderPath,
            documentType: documentKey
          });

          if (selectResult.success && selectResult.filePath) {
            // CHECK FILE SIZE FIRST
            const sizeResult = await window.electronAPI.getFileSize(selectResult.filePath);

            if (sizeResult.success && sizeResult.sizeBytes) {
              const sizeKB = sizeResult.sizeBytes / 1024;

              // If already 299KB or less, copy directly to Final PDFs
              if (sizeKB <= 299) {
                setSnackbar({
                  open: true,
                  message: `Insurance already optimized (${sizeKB.toFixed(1)}KB). Copying to Final PDFs...`,
                  severity: 'info'
                });

                const finalPdfsPath = paths.finalPdfs;
                const outputPath = `${finalPdfsPath}\\insu.pdf`;

                const copyResult = await window.electronAPI.copyFile({
                  sourcePath: selectResult.filePath,
                  destinationPath: outputPath
                });

                if (copyResult.success) {
                  setSnackbar({
                    open: true,
                    message: `✅ Insurance saved successfully! (${sizeKB.toFixed(1)}KB - no compression needed)`,
                    severity: 'success'
                  });

                  // Refresh website documents
                  if (refreshWebsiteDocuments) {
                    refreshWebsiteDocuments();
                  }
                } else {
                  setSnackbar({
                    open: true,
                    message: copyResult.error || 'Failed to copy file',
                    severity: 'error'
                  });
                }

                setStamping(null);
                return;
              }
            }

            // File is larger than 299KB, proceed with page count check
            if (window.electronAPI.getPdfPageCount) {
              const pageCountResult = await window.electronAPI.getPdfPageCount(selectResult.filePath);

              if (pageCountResult.success && pageCountResult.pageCount && pageCountResult.pageCount > 1) {
                // Multi-page insurance PDF - show page selector
                setInsurancePdfInfo({
                  path: selectResult.filePath,
                  fileName: selectResult.fileName || getFileName(selectResult.filePath),
                  pageCount: pageCountResult.pageCount
                });
                setInsurancePageSelectorOpen(true);
                setStamping(null); // Clear stamping state
                return;
              }
            }

            // Single page and larger than 299KB - proceed normally
            setSelectedPdfForStamp({
              path: selectResult.filePath,
              url: '',
              fileName: selectResult.fileName || getFileName(selectResult.filePath),
              documentType: documentKey
            });
            setPreviewDialogOpen(true);
          } else if (!selectResult.success && selectResult.error !== 'No file selected') {
            setSnackbar({
              open: true,
              message: selectResult.error || 'Error selecting file',
              severity: 'error'
            });
          }
        }
        return;
      }

      // Special handling for Form 22 documents (NEW)
      if (documentKey === 'form22') {
        if (window.electronAPI && window.electronAPI.selectPdfForPreview) {
          const selectResult = await window.electronAPI.selectPdfForPreview({
            defaultPath: websiteFolderPath,
            documentType: documentKey
          });

          if (selectResult.success && selectResult.filePath) {
            const sizeResult = await window.electronAPI.getFileSize(selectResult.filePath);
            if (sizeResult.success && sizeResult.sizeBytes) {
              const sizeKB = sizeResult.sizeBytes / 1024;

              // If already 299KB or less, copy directly to Final PDFs
              if (sizeKB <= 299) {
                const finalPdfsPath = paths.finalPdfs;
                const outputPath = `${finalPdfsPath}\\fm22.pdf`;

                const copyResult = await window.electronAPI.copyFile({
                  sourcePath: selectResult.filePath,
                  destinationPath: outputPath
                });

                if (copyResult.success) {
                  setSnackbar({
                    open: true,
                    message: `✅ Form 22 saved successfully! (${sizeKB.toFixed(1)}KB - no compression needed)`,
                    severity: 'success'
                  });
                  setStamping(null);
                  return;
                }
              }
            }
            // Form 22 is always single page, so directly process it
            await handleForm22Processing(selectResult.filePath, selectResult.fileName || getFileName(selectResult.filePath));
          } else if (!selectResult.success && selectResult.error !== 'No file selected') {
            setSnackbar({
              open: true,
              message: selectResult.error || 'Error selecting file',
              severity: 'error'
            });
          }
        }
        return;
      }

      // Special handling for Invoice, Disclaimer, Form21 documents
      if (documentKey === 'invoice' || documentKey === 'disclaimer' || documentKey === 'form21') {
        if (window.electronAPI && window.electronAPI.selectPdfForPreview) {
          const selectResult = await window.electronAPI.selectPdfForPreview({
            defaultPath: websiteFolderPath,
            documentType: documentKey
          });

          if (selectResult.success && selectResult.filePath) {
            // CHECK FILE SIZE FIRST (240KB threshold for these documents)
            const sizeResult = await window.electronAPI.getFileSize(selectResult.filePath);

            if (sizeResult.success && sizeResult.sizeBytes) {
              const sizeKB = sizeResult.sizeBytes / 1024;

              // If already 240KB or less, just apply stamping
              if (sizeKB <= 240) {
                setSnackbar({
                  open: true,
                  message: `${documentKey} already optimized (${sizeKB.toFixed(1)}KB). Applying stamp...`,
                  severity: 'info'
                });

                // Apply stamping directly
                const finalPdfsPath = paths.finalPdfs;

                let outputFileName;
                if (documentKey === 'invoice') outputFileName = 'invo.pdf';
                else if (documentKey === 'disclaimer') outputFileName = 'disc.pdf';
                else if (documentKey === 'form21') outputFileName = 'fm21.pdf';
                else outputFileName = `${documentKey}.pdf`;

                const outputPath = `${finalPdfsPath}\\${outputFileName}`;

                // Copy file to Final PDFs first
                const copyResult = await window.electronAPI.copyFile({
                  sourcePath: selectResult.filePath,
                  destinationPath: outputPath
                });

                if (copyResult.success) {
                  // Apply stamping
                  const stampResult = await window.electronAPI.stampPdfFile({
                    inputPath: outputPath,
                    stampConfig: {
                      documentType: documentKey,
                      signatureFormat: getCurrentSignatureFormat(),
                      showroomName: currentShowroom.showroomName,
                      ownerName: owner.name,
                      ownerContact: owner.contact
                    }
                  });

                  if (stampResult.success) {
                    setSnackbar({
                      open: true,
                      message: `✅ ${documentKey} stamped successfully! (${sizeKB.toFixed(1)}KB - ${outputFileName})`,
                      severity: 'success'
                    });

                    // Refresh website documents
                    if (refreshWebsiteDocuments) {
                      refreshWebsiteDocuments();
                    }
                  } else {
                    setSnackbar({
                      open: true,
                      message: stampResult.error || 'Failed to apply stamp',
                      severity: 'error'
                    });
                  }
                } else {
                  setSnackbar({
                    open: true,
                    message: copyResult.error || 'Failed to copy file',
                    severity: 'error'
                  });
                }

                setStamping(null);
                return;
              }
            }

            // File is larger than 240KB, proceed with compression processing
            await handleInvoiceDisclaimerForm21Processing(
              selectResult.filePath,
              selectResult.fileName || getFileName(selectResult.filePath),
              documentKey
            );
          } else if (!selectResult.success && selectResult.error !== 'No file selected') {
            setSnackbar({
              open: true,
              message: selectResult.error || 'Error selecting file',
              severity: 'error'
            });
          }
        }
        return;
      }

      // For non-insurance and non-form22 documents
      const skipPreviewDocs: string[] = [];

      if (window.electronAPI && window.electronAPI.selectPdfForPreview) {
        const selectResult = await window.electronAPI.selectPdfForPreview({
          defaultPath: websiteFolderPath,
          documentType: documentKey
        });

        if (selectResult.success && selectResult.filePath) {
          // For skip-preview documents, show a confirmation dialog instead
          if (skipPreviewDocs.includes(documentKey)) {
            setSelectedPdfForStamp({
              path: selectResult.filePath,
              url: '',
              fileName: selectResult.fileName || getFileName(selectResult.filePath),
              documentType: documentKey
            });
            setPreviewDialogOpen(true);
          } else {
            // For stamping documents, try to show preview
            const urlResult = await window.electronAPI.getLocalFileUrl(selectResult.filePath);

            setSelectedPdfForStamp({
              path: selectResult.filePath,
              url: urlResult.success && urlResult.dataUrl ? urlResult.dataUrl : '',
              fileName: selectResult.fileName || getFileName(selectResult.filePath),
              documentType: documentKey
            });
            setPreviewDialogOpen(true);
          }
        } else if (!selectResult.success && selectResult.error !== 'No file selected') {
          setSnackbar({
            open: true,
            message: selectResult.error || 'Error selecting file',
            severity: 'error'
          });
        }
      }
    } catch (error) {
      console.error('Error in stamp process:', error);
      setSnackbar({
        open: true,
        message: 'Error during stamp process',
        severity: 'error'
      });
    } finally {
      if (documentKey !== 'form20-3' && documentKey !== 'form22') {
        setStamping(null);
      }
    }
  };

  // Add this new handler function after handleInsurancePageSelected
  const handleForm22Processing = async (filePath: string, fileName: string) => {
    if (!owner || !currentShowroom) return;

    const paths = getPaths();
    if (!paths) return;

    try {
      setStamping('form22');

      const compressedFilesPath = paths.compressedFiles;

      setSnackbar({
        open: true,
        message: 'Form 22 size > 299KB. Converting to JPEG for compression...',
        severity: 'info'
      });

      // Step 1: Convert PDF to JPEG (no page extraction needed for single page)
      const jpegPath = `${compressedFilesPath}\\form22.jpeg`;
      const jpegResult = await window.electronAPI.convertPdfToJpeg({
        pdfPath: filePath,
        jpegPath: jpegPath,
        quality: 100,
        dpi: 300
      });

      if (jpegResult.success) {
        setSnackbar({
          open: true,
          message: `JPEG created (${jpegResult.jpegSizeKB}KB). Compressing to 299KB...`,
          severity: 'info'
        });

        // Step 2: Compress image to target size
        const compressedJpegPath = `${compressedFilesPath}\\form22_compressed.jpeg`;
        const compressResult = await window.electronAPI.compressImageToTarget({
          imagePath: jpegPath,
          documentType: 'form22',
          targetSizeKB: 299,
          outputPath: compressedJpegPath
        });

        if (compressResult.success && compressResult.compressedSize) {
          setSnackbar({
            open: true,
            message: `Image compressed to ${(compressResult.compressedSize / 1024).toFixed(1)}KB. Creating A4 PDF...`,
            severity: 'info'
          });

          // Step 3: Create A4 PDF from compressed image
          const finalPdfsPath = paths.finalPdfs;
          const outputPath = `${finalPdfsPath}\\fm22.pdf`;

          const pdfResult = await window.electronAPI.createA4PdfFromCompressedImage({
            imagePath: compressedJpegPath,
            outputPath: outputPath
          });

          if (pdfResult.success) {
            setSnackbar({
              open: true,
              message: `✅ Form 22 processed successfully!\n• Original JPEG: ${jpegResult.jpegSizeKB}KB\n• Compressed JPEG: ${(compressResult.compressedSize / 1024).toFixed(1)}KB\n• Final A4 PDF: ${pdfResult.pdfSizeKB}KB (fm22.pdf)`,
              severity: 'success'
            });

            // Refresh website documents
            if (refreshWebsiteDocuments) {
              refreshWebsiteDocuments();
            }
          } else {
            setSnackbar({
              open: true,
              message: pdfResult.error || 'Failed to create A4 PDF',
              severity: 'error'
            });
          }
        } else {
          setSnackbar({
            open: true,
            message: compressResult.error || 'Failed to compress image',
            severity: 'error'
          });
        }
      } else {
        setSnackbar({
          open: true,
          message: jpegResult.error || 'Failed to convert PDF to JPEG',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error processing Form 22:', error);
      setSnackbar({
        open: true,
        message: 'Error processing Form 22 document',
        severity: 'error'
      });
    } finally {
      setStamping(null);
    }
  };

  const handleInsurancePageSelected = async (pageNumber: number) => {
    if (!insurancePdfInfo || !owner || !currentShowroom) return;

    const paths = getPaths();
    if (!paths) return;

    try {
      setProcessingInsurance(true);
      setInsurancePageSelectorOpen(false);

      const websiteFolderPath = paths.website;
      const compressedFilesPath = paths.compressedFiles;

      // Step 1: Extract the selected page
      const timestamp = Date.now();
      const tempFileName = `temp_insurance_${timestamp}.pdf`;
      const tempPath = `${websiteFolderPath}\\${tempFileName}`;

      const extractResult = await window.electronAPI.extractPdfPage({
        inputPath: insurancePdfInfo.path,
        outputPath: tempPath,
        pageNumber: pageNumber
      });

      if (extractResult.success) {
        setSnackbar({
          open: true,
          message: `Extracted page ${pageNumber} of ${insurancePdfInfo.pageCount}. Converting to JPEG...`,
          severity: 'info'
        });

        // Step 2: Convert to JPEG
        const jpegPath = `${compressedFilesPath}\\insurance.jpeg`;
        const jpegResult = await window.electronAPI.convertPdfToJpeg({
          pdfPath: tempPath,
          jpegPath: jpegPath,
          quality: 100,
          dpi: 300
        });

        if (jpegResult.success) {
          setSnackbar({
            open: true,
            message: `JPEG created (${jpegResult.jpegSizeKB}KB). Compressing to 299KB...`,
            severity: 'info'
          });

          // Step 3: Compress image to target size
          const compressedJpegPath = `${compressedFilesPath}\\insurance_compressed.jpeg`;
          const compressResult = await window.electronAPI.compressImageToTarget({
            imagePath: jpegPath,
            documentType: 'insurance',
            targetSizeKB: 299,
            outputPath: compressedJpegPath
          });

          if (compressResult.success && compressResult.compressedSize) {
            setSnackbar({
              open: true,
              message: `Image compressed to ${(compressResult.compressedSize / 1024).toFixed(1)}KB. Creating A4 PDF...`,
              severity: 'info'
            });

            // Step 4: Create A4 PDF from compressed image
            const finalPdfsPath = paths.finalPdfs;
            const outputPath = `${finalPdfsPath}\\insu.pdf`;

            const pdfResult = await window.electronAPI.createA4PdfFromCompressedImage({
              imagePath: compressedJpegPath,
              outputPath: outputPath
            });

            if (pdfResult.success) {
              setSnackbar({
                open: true,
                message: `✅ Insurance processed successfully!\n• Original JPEG: ${jpegResult.jpegSizeKB}KB\n• Compressed JPEG: ${(compressResult.compressedSize / 1024).toFixed(1)}KB\n• Final A4 PDF: ${pdfResult.pdfSizeKB}KB (insu.pdf)`,
                severity: 'success'
              });

              // Refresh website documents
              if (refreshWebsiteDocuments) {
                refreshWebsiteDocuments();
              }
            } else {
              setSnackbar({
                open: true,
                message: pdfResult.error || 'Failed to create A4 PDF',
                severity: 'error'
              });
            }
          } else {
            setSnackbar({
              open: true,
              message: compressResult.error || 'Failed to compress image',
              severity: 'error'
            });
          }
        } else {
          setSnackbar({
            open: true,
            message: jpegResult.error || 'Failed to convert PDF to JPEG',
            severity: 'error'
          });
        }

        // Clean up temp file
        await window.electronAPI.deleteFile({ filePath: tempPath });
      } else {
        setSnackbar({
          open: true,
          message: extractResult.error || 'Failed to extract page',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error processing insurance page:', error);
      setSnackbar({
        open: true,
        message: 'Error processing insurance document',
        severity: 'error'
      });
    } finally {
      setProcessingInsurance(false);
      setInsurancePdfInfo(null);
      setStamping(null);
    }
  };

  // Add this new handler function after handleForm22Processing
  const handleInvoiceDisclaimerForm21Processing = async (filePath: string, fileName: string, documentType: string) => {
    if (!owner || !currentShowroom) return;

    const paths = getPaths();
    if (!paths) return;

    try {
      setStamping(documentType);

      const compressedFilesPath = paths.compressedFiles;

      setSnackbar({
        open: true,
        message: `${documentType} size > 240KB. Converting to JPEG for compression...`,
        severity: 'info'
      });

      // Step 1: Convert PDF to JPEG (single page)
      const jpegPath = `${compressedFilesPath}\\${documentType}.jpeg`;
      const jpegResult = await window.electronAPI.convertPdfToJpeg({
        pdfPath: filePath,
        jpegPath: jpegPath,
        quality: 100,
        dpi: 300
      });

      if (jpegResult.success) {
        setSnackbar({
          open: true,
          message: `JPEG created (${jpegResult.jpegSizeKB}KB). Compressing to 240KB...`,
          severity: 'info'
        });

        // Step 2: Compress image to target size (240KB for these document types)
        const compressedJpegPath = `${compressedFilesPath}\\${documentType}_compressed.jpeg`;
        const compressResult = await window.electronAPI.compressImageToTarget({
          imagePath: jpegPath,
          documentType: documentType,
          targetSizeKB: 240,
          outputPath: compressedJpegPath
        });

        if (compressResult.success && compressResult.compressedSize) {
          setSnackbar({
            open: true,
            message: `Image compressed to ${(compressResult.compressedSize / 1024).toFixed(1)}KB. Creating A4 PDF...`,
            severity: 'info'
          });

          // Step 3: Create A4 PDF from compressed image
          const finalPdfsPath = paths.finalPdfs;

          // Determine output filename based on document type
          let outputFileName;
          if (documentType === 'invoice') outputFileName = 'invo.pdf';
          else if (documentType === 'disclaimer') outputFileName = 'disc.pdf';
          else if (documentType === 'form21') outputFileName = 'fm21.pdf';
          else outputFileName = `${documentType}.pdf`;

          const outputPath = `${finalPdfsPath}\\${outputFileName}`;

          const pdfResult = await window.electronAPI.createA4PdfFromCompressedImage({
            imagePath: compressedJpegPath,
            outputPath: outputPath
          });

          if (pdfResult.success) {
            setSnackbar({
              open: true,
              message: `A4 PDF created (${pdfResult.pdfSizeKB}KB). Applying stamp...`,
              severity: 'info'
            });

            // Step 4: Apply stamping to the compressed A4 PDF
            const stampResult = await window.electronAPI.stampPdfFile({
              inputPath: outputPath,
              stampConfig: {
                documentType: documentType,
                signatureFormat: getCurrentSignatureFormat(),
                showroomName: currentShowroom.showroomName,
                ownerName: owner.name,
                ownerContact: owner.contact
              }
            });

            if (stampResult.success) {
              setSnackbar({
                open: true,
                message: `✅ ${documentType} processed successfully!\n• Original JPEG: ${jpegResult.jpegSizeKB}KB\n• Compressed JPEG: ${(compressResult.compressedSize / 1024).toFixed(1)}KB\n• Final A4 PDF: ${pdfResult.pdfSizeKB}KB\n• Stamped and saved as ${outputFileName}`,
                severity: 'success'
              });

              // Refresh website documents
              if (refreshWebsiteDocuments) {
                refreshWebsiteDocuments();
              }
            } else {
              setSnackbar({
                open: true,
                message: stampResult.error || 'Failed to apply stamp',
                severity: 'error'
              });
            }
          } else {
            setSnackbar({
              open: true,
              message: pdfResult.error || 'Failed to create A4 PDF',
              severity: 'error'
            });
          }
        } else {
          setSnackbar({
            open: true,
            message: compressResult.error || 'Failed to compress image',
            severity: 'error'
          });
        }
      } else {
        setSnackbar({
          open: true,
          message: jpegResult.error || 'Failed to convert PDF to JPEG',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error(`Error processing ${documentType}:`, error);
      setSnackbar({
        open: true,
        message: `Error processing ${documentType} document`,
        severity: 'error'
      });
    } finally {
      setStamping(null);
    }
  };

  const handleForm203Option = async (option: 'cash' | 'finance' | 'mobile') => {
    setForm203DialogOpen(false);

    if (option === 'cash') {
      // Start the Form 20 Cash processing workflow
      await handleForm20CashProcessing();
      return;
    }

    if (option === 'finance') {
      // Start the Form 20 Finance processing workflow - open finance company selector
      setFinanceCompanySelectorOpen(true);
      return;
    }

    if (option === 'mobile') {
      // Start the Form 20 Mobile processing workflow (same as finance but different Form 20-3 compression)
      await handleForm20ProcessingUnified('mobile');
      return;
    }

    // Existing logic for mobile option...
    if (!owner || !currentShowroom) {
      setSnackbar({
        open: true,
        message: 'Missing required information',
        severity: 'error'
      });
      setStamping(null);
      return;
    }

    const paths = getPaths();
    if (!paths) return;

    const mobileFolderPath = paths.mobile;

    if (window.electronAPI && window.electronAPI.selectPdfForPreview) {
      const selectResult = await window.electronAPI.selectPdfForPreview({
        defaultPath: mobileFolderPath,
        documentType: 'form20-3'
      });

      if (selectResult.success && selectResult.filePath) {
        // Get the file URL for preview
        const urlResult = await window.electronAPI.getLocalFileUrl(selectResult.filePath);

        setSelectedForm203Path(selectResult.filePath);

        setSelectedPdfForStamp({
          path: selectResult.filePath,
          url: urlResult.success && urlResult.dataUrl ? urlResult.dataUrl : '',
          fileName: selectResult.fileName || getFileName(selectResult.filePath),
          documentType: `form20-3-${option}`
        });

        setPreviewDialogOpen(true);
      } else {
        if (!selectResult.success && selectResult.error !== 'No file selected') {
          setSnackbar({
            open: true,
            message: selectResult.error || 'Error selecting file',
            severity: 'error'
          });
        }
        setStamping(null);
      }
    } else {
      setSnackbar({
        open: true,
        message: 'File selection not available',
        severity: 'error'
      });
      setStamping(null);
    }
  };

  // Add this new handler function for Form 20 Cash processing
  const handleForm20CashProcessing = async () => {
    if (!owner || !currentShowroom) return;

    const paths = getPaths();
    if (!paths) return;

    try {
      setStamping('form20-cash');

      const websiteFolderPath = paths.website;

      // Process Form 20-3 first - Show persistent message
      setSnackbar({
        open: true,
        message: 'Please select Form 20-3...',
        severity: 'info'
      });

      const form203Result = await window.electronAPI.selectPdfForPreview({
        defaultPath: websiteFolderPath,
        documentType: 'form20-3'
      });

      if (!form203Result.success || !form203Result.filePath) {
        setSnackbar({
          open: true,
          message: 'Form 20-3 selection cancelled. Process stopped.',
          severity: 'warning'
        });
        setStamping(null);
        return;
      }

      // Close the selection message and show processing message
      setSnackbar({
        open: true,
        message: 'Processing Form 20-3...',
        severity: 'info'
      });

      // Process Form 20-3 (75KB threshold, with stamp and signature)
      await processForm20File(form203Result.filePath, 'form20-3', '203.pdf', 75, true, true, signatureFormat);

      // Process Form 20-2 SECOND - Show persistent message that doesn't auto-close
      setSnackbar({
        open: true,
        message: 'Please select Form 20-2...',
        severity: 'info'
      });

      const form202Result = await window.electronAPI.selectPdfForPreview({
        defaultPath: websiteFolderPath,
        documentType: 'form20-2'
      });

      if (!form202Result.success || !form202Result.filePath) {
        setSnackbar({
          open: true,
          message: 'Form 20-2 selection cancelled. Process stopped.',
          severity: 'warning'
        });
        setStamping(null);
        return;
      }

      // Show processing message
      setSnackbar({
        open: true,
        message: 'Processing Form 20-2...',
        severity: 'info'
      });

      // Process Form 20-2 (75KB threshold, with stamp and signature)
      await processForm20File(form202Result.filePath, 'form20-2', '202.pdf', 75, true, true, signatureFormat);

      // Process Form 20-1 THIRD - Show persistent message that doesn't auto-close
      setSnackbar({
        open: true,
        message: 'Please select Form 20-1...',
        severity: 'info'
      });

      const form201Result = await window.electronAPI.selectPdfForPreview({
        defaultPath: websiteFolderPath,
        documentType: 'form20-1'
      });

      if (!form201Result.success || !form201Result.filePath) {
        setSnackbar({
          open: true,
          message: 'Form 20-1 selection cancelled. Process stopped.',
          severity: 'warning'
        });
        setStamping(null);
        return;
      }

      // Show processing message
      setSnackbar({
        open: true,
        message: 'Processing Form 20-1...',
        severity: 'info'
      });

      // Process Form 20-1 (75KB threshold, no stamping for form20-1)
      await processForm20File(form201Result.filePath, 'form20-1', '201.pdf', 75, false, false, signatureFormat);

      setSnackbar({
        open: true,
        message: '✅ All Form 20 documents processed successfully for Cash payment!',
        severity: 'success'
      });

      // Refresh website documents
      if (refreshWebsiteDocuments) {
        refreshWebsiteDocuments();
      }

      setTimeout(() => {
        checkAndAutoMergeForm20();
      }, 2000);
    } catch (error) {
      console.error('Error in Form 20 Cash processing:', error);
      setSnackbar({
        open: true,
        message: 'Error processing Form 20 documents',
        severity: 'error'
      });
    } finally {
      setStamping(null);
    }
  };

  const handleForm20ProcessingUnified = async (processingType: 'finance' | 'mobile', financeCompanyName?: string) => {
    if (!owner || !currentShowroom) return;

    const paths = getPaths();
    if (!paths) return;

    try {
      setStamping(`form20-${processingType}`);

      const websiteFolderPath = paths.website;

      // Use mobile folder for mobile processing, website folder for finance
      const defaultPath = websiteFolderPath;

      // Process Form 20-3 FIRST - Only difference between finance and mobile
      setSnackbar({
        open: true,
        message: `Please select Form 20-3 from ${processingType === 'mobile' ? 'mobile' : 'website'} folder...`,
        severity: 'info'
      });

      const form203Result = await window.electronAPI.selectPdfForPreview({
        defaultPath: defaultPath,
        documentType: 'form20-3'
      });

      if (!form203Result.success || !form203Result.filePath) {
        setSnackbar({
          open: true,
          message: 'Form 20-3 selection cancelled. Process stopped.',
          severity: 'warning'
        });
        setStamping(null);
        return;
      }

      setSnackbar({
        open: true,
        message: `Processing Form 20-3 for ${processingType}...`,
        severity: 'info'
      });

      // Form 20-3: Different compression threshold and stamping logic
      const form203Threshold = processingType === 'finance' ? 60 : 120; // Finance: 60KB, Mobile: 120KB
      const form203NeedsStamp = processingType === 'finance'; // Only finance needs stamping
      await processForm20FileUnified(
        form203Result.filePath,
        'form20-3',
        '203.pdf',
        form203Threshold,
        form203NeedsStamp,
        false,
        financeCompanyName,
        signatureFormat
      );

      // Process Form 20-2 SECOND - Same logic for both finance and mobile
      setSnackbar({
        open: true,
        message: `Please select Form 20-2 from ${processingType === 'mobile' ? 'mobile' : 'website'} folder...`,
        severity: 'info'
      });

      const form202Result = await window.electronAPI.selectPdfForPreview({
        defaultPath: defaultPath,
        documentType: 'form20-2'
      });

      if (!form202Result.success || !form202Result.filePath) {
        setSnackbar({
          open: true,
          message: 'Form 20-2 selection cancelled. Process stopped.',
          severity: 'warning'
        });
        setStamping(null);
        return;
      }

      setSnackbar({
        open: true,
        message: `Processing Form 20-2 for ${processingType} (compressing to 60KB)...`,
        severity: 'info'
      });

      // Form 20-2: Same logic for both finance and mobile (60KB, with stamping)
      await processForm20FileUnified(form202Result.filePath, 'form20-2', '202.pdf', 60, true, true, financeCompanyName, signatureFormat);

      // Process Form 20-1 THIRD - Same logic for both finance and mobile
      setSnackbar({
        open: true,
        message: `Please select Form 20-1 from ${processingType === 'mobile' ? 'mobile' : 'website'} folder...`,
        severity: 'info'
      });

      const form201Result = await window.electronAPI.selectPdfForPreview({
        defaultPath: defaultPath,
        documentType: 'form20-1'
      });

      if (!form201Result.success || !form201Result.filePath) {
        setSnackbar({
          open: true,
          message: 'Form 20-1 selection cancelled. Process stopped.',
          severity: 'warning'
        });
        setStamping(null);
        return;
      }

      setSnackbar({
        open: true,
        message: `Processing Form 20-1 for ${processingType} (compressing to 50KB)...`,
        severity: 'info'
      });

      // Form 20-1: Same logic for both finance and mobile (50KB, no stamping)
      await processForm20FileUnified(form201Result.filePath, 'form20-1', '201.pdf', 50, false, false, financeCompanyName, signatureFormat);

      setSnackbar({
        open: true,
        message: `✅ All Form 20 documents processed successfully for ${processingType.charAt(0).toUpperCase() + processingType.slice(1)}${financeCompanyName ? ` (${financeCompanyName})` : ''}!`,
        severity: 'success'
      });

      // Refresh website documents
      if (refreshWebsiteDocuments) {
        refreshWebsiteDocuments();
      }

      setTimeout(() => {
        checkAndAutoMergeForm20();
      }, 2000);
    } catch (error) {
      console.error(`Error in Form 20 ${processingType} processing:`, error);
      setSnackbar({
        open: true,
        message: `Error processing Form 20 documents for ${processingType}`,
        severity: 'error'
      });
    } finally {
      setStamping(null);
    }
  };

  // Unified helper function to process individual Form 20 files for both Finance and Mobile
  const processForm20FileUnified = async (
    filePath: string,
    documentType: string,
    outputFileName: string,
    thresholdKB: number,
    needsStamp: boolean,
    needsSignature: boolean,
    financeCompanyName?: string,
    signatureFormat: 'png' | 'svg' = 'png'
  ) => {
    // Add null checks at the beginning
    if (!currentShowroom || !owner) {
      throw new Error('Missing showroom or owner information');
    }

    const paths = getPaths();
    if (!paths) {
      throw new Error('Unable to get paths');
    }

    const compressedFilesPath = paths.compressedFiles;

    // Ensure compressed_files folder exists
    if (window.electronAPI.createFolderIfNotExists) {
      await window.electronAPI.createFolderIfNotExists({
        showroomName: currentShowroom.showroomName,
        name: owner.name,
        contact: owner.contact,
        folderType: 'compressed_files'
      });
    }

    // Check file size
    const sizeResult = await window.electronAPI.getFileSize(filePath);

    if (sizeResult.success && sizeResult.sizeBytes) {
      const sizeKB = sizeResult.sizeBytes / 1024;

      // If already below threshold, copy and stamp directly
      if (sizeKB <= thresholdKB) {
        const outputPath = `${compressedFilesPath}\\${outputFileName}`;

        // Copy file first to compressed_files folder
        const copyResult = await window.electronAPI.copyFile({
          sourcePath: filePath,
          destinationPath: outputPath
        });

        if (copyResult.success) {
          // Apply stamping if needed
          if (needsStamp || needsSignature) {
            // For Form 20-3 finance processing, use the processForm203 function
            if (documentType === 'form20-3' && financeCompanyName) {
              const form203Result = await window.electronAPI.processForm203({
                inputPath: outputPath,
                paymentType: 'finance',
                financeCompanyId: financeCompanyName,
                signatureFormat: getCurrentSignatureFormat(),
                customConfig: {
                  stampWidth: 80,
                  stampHeight: 80,
                  stampOpacity: 0.9,
                  signatureWidth: 60,
                  signatureHeight: 30,
                  signatureOpacity: 0.9
                },
                showroomName: currentShowroom.showroomName,
                ownerName: owner.name,
                ownerContact: owner.contact
              });

              if (form203Result.success) {
                setSnackbar({
                  open: true,
                  message: `${documentType} processed: ${sizeKB.toFixed(1)}KB → ${outputFileName} (finance stamped)`,
                  severity: 'success'
                });
              } else {
                throw new Error(`Failed to process ${documentType} for finance: ${form203Result.error}`);
              }
            } else {
              // For Form 20-2, use regular stamping
              const stampResult = await window.electronAPI.stampPdfFile({
                inputPath: outputPath,
                stampConfig: {
                  documentType: documentType,
                  signatureFormat: getCurrentSignatureFormat(),
                  showroomName: currentShowroom.showroomName,
                  ownerName: owner.name,
                  ownerContact: owner.contact
                }
              });

              if (stampResult.success) {
                setSnackbar({
                  open: true,
                  message: `${documentType} processed: ${sizeKB.toFixed(1)}KB → ${outputFileName} (stamped)`,
                  severity: 'success'
                });
              } else {
                throw new Error(`Failed to stamp ${documentType}: ${stampResult.error}`);
              }
            }
          } else {
            setSnackbar({
              open: true,
              message: `${documentType} processed: ${sizeKB.toFixed(1)}KB → ${outputFileName} (already below ${thresholdKB}KB)`,
              severity: 'success'
            });
          }
        } else {
          throw new Error(`Failed to copy ${documentType}: ${copyResult.error}`);
        }
      } else {
        // File is larger than threshold, compress first
        setSnackbar({
          open: true,
          message: `${documentType} size (${sizeKB.toFixed(1)}KB) > ${thresholdKB}KB. Compressing...`,
          severity: 'info'
        });

        // Convert to JPEG
        const jpegPath = `${compressedFilesPath}\\${documentType}_unified.jpeg`;
        const jpegResult = await window.electronAPI.convertPdfToJpeg({
          pdfPath: filePath,
          jpegPath: jpegPath,
          quality: 100,
          dpi: 300
        });

        if (jpegResult.success) {
          // Compress image
          const compressedJpegPath = `${compressedFilesPath}\\${documentType}_unified_compressed.jpeg`;
          const compressResult = await window.electronAPI.compressImageToTarget({
            imagePath: jpegPath,
            documentType: documentType,
            targetSizeKB: thresholdKB,
            outputPath: compressedJpegPath
          });

          if (compressResult.success && compressResult.compressedSize) {
            // Create A4 PDF in compressed_files folder
            const outputPath = `${compressedFilesPath}\\${outputFileName}`;
            const pdfResult = await window.electronAPI.createA4PdfFromCompressedImage({
              imagePath: compressedJpegPath,
              outputPath: outputPath
            });

            if (pdfResult.success) {
              // Apply stamping if needed
              if (needsStamp || needsSignature) {
                if (documentType === 'form20-3' && financeCompanyName) {
                  // Use processForm203 for Form 20-3 finance processing
                  const form203Result = await window.electronAPI.processForm203({
                    inputPath: outputPath,
                    paymentType: 'finance',
                    financeCompanyId: financeCompanyName,
                    signatureFormat: getCurrentSignatureFormat(),
                    customConfig: {
                      stampWidth: 80,
                      stampHeight: 80,
                      stampOpacity: 0.9,
                      signatureWidth: 60,
                      signatureHeight: 30,
                      signatureOpacity: 0.9
                    },
                    showroomName: currentShowroom.showroomName,
                    ownerName: owner.name,
                    ownerContact: owner.contact
                  });

                  if (form203Result.success) {
                    setSnackbar({
                      open: true,
                      message: `${documentType} compressed: ${(compressResult.compressedSize / 1024).toFixed(1)}KB → ${outputFileName} (finance stamped)`,
                      severity: 'success'
                    });
                  } else {
                    throw new Error(`Failed to process compressed ${documentType} for finance: ${form203Result.error}`);
                  }
                } else {
                  // Regular stamping for Form 20-2
                  const stampResult = await window.electronAPI.stampPdfFile({
                    inputPath: outputPath,
                    stampConfig: {
                      documentType: documentType,
                      signatureFormat: getCurrentSignatureFormat(),
                      showroomName: currentShowroom.showroomName,
                      ownerName: owner.name,
                      ownerContact: owner.contact
                    }
                  });

                  if (stampResult.success) {
                    setSnackbar({
                      open: true,
                      message: `${documentType} compressed: ${(compressResult.compressedSize / 1024).toFixed(1)}KB → ${outputFileName} (stamped)`,
                      severity: 'success'
                    });
                  } else {
                    throw new Error(`Failed to stamp compressed ${documentType}: ${stampResult.error}`);
                  }
                }
              } else {
                setSnackbar({
                  open: true,
                  message: `${documentType} compressed: ${(compressResult.compressedSize / 1024).toFixed(1)}KB → ${outputFileName}`,
                  severity: 'success'
                });
              }
            } else {
              throw new Error(`Failed to create A4 PDF for ${documentType}: ${pdfResult.error}`);
            }
          } else {
            throw new Error(`Failed to compress ${documentType}: ${compressResult.error}`);
          }
        } else {
          throw new Error(`Failed to convert ${documentType} to JPEG: ${jpegResult.error}`);
        }
      }
    } else {
      throw new Error(`Failed to get file size for ${documentType}`);
    }
  };

  // Helper function to process individual Form 20 files
  const processForm20File = async (
    filePath: string,
    documentType: string,
    outputFileName: string,
    thresholdKB: number,
    needsStamp: boolean,
    needsSignature: boolean,
    signatureFormat: 'png' | 'svg' = 'png'
  ) => {
    // Add null checks at the beginning
    if (!currentShowroom || !owner) {
      throw new Error('Missing showroom or owner information');
    }

    const paths = getPaths();
    if (!paths) {
      throw new Error('Unable to get paths');
    }

    const compressedFilesPath = paths.compressedFiles;

    // Ensure compressed_files folder exists
    if (window.electronAPI.createFolderIfNotExists) {
      await window.electronAPI.createFolderIfNotExists({
        showroomName: currentShowroom.showroomName,
        name: owner.name,
        contact: owner.contact,
        folderType: 'compressed_files'
      });
    }

    // Check file size
    const sizeResult = await window.electronAPI.getFileSize(filePath);

    if (sizeResult.success && sizeResult.sizeBytes) {
      const sizeKB = sizeResult.sizeBytes / 1024;

      // If already below threshold, copy and stamp directly
      if (sizeKB <= thresholdKB) {
        const outputPath = `${compressedFilesPath}\\${outputFileName}`;

        // Copy file first to compressed_files folder
        const copyResult = await window.electronAPI.copyFile({
          sourcePath: filePath,
          destinationPath: outputPath
        });

        if (copyResult.success) {
          // Apply stamping if needed (FOR FORM 20-3 WITH CASH)
          if (needsStamp || needsSignature) {
            // For Form 20-3 cash processing, use the processForm203 function
            if (documentType === 'form20-3') {
              const form203Result = await window.electronAPI.processForm203({
                inputPath: outputPath,
                paymentType: 'cash',
                signatureFormat: getCurrentSignatureFormat(),
                customConfig: {
                  stampWidth: 80,
                  stampHeight: 80,
                  stampOpacity: 0.9,
                  signatureWidth: 60,
                  signatureHeight: 30,
                  signatureOpacity: 0.9
                },
                showroomName: currentShowroom.showroomName,
                ownerName: owner.name,
                ownerContact: owner.contact
              });

              if (form203Result.success) {
                setSnackbar({
                  open: true,
                  message: `${documentType} processed: ${sizeKB.toFixed(1)}KB → ${outputFileName} (cash stamped & signed)`,
                  severity: 'success'
                });
              } else {
                throw new Error(`Failed to process ${documentType} for cash: ${form203Result.error}`);
              }
            } else {
              // For Form 20-2, use regular stamping
              const stampResult = await window.electronAPI.stampPdfFile({
                inputPath: outputPath,
                stampConfig: {
                  documentType: documentType,
                  signatureFormat: getCurrentSignatureFormat(),
                  showroomName: currentShowroom.showroomName,
                  ownerName: owner.name,
                  ownerContact: owner.contact
                }
              });

              if (stampResult.success) {
                setSnackbar({
                  open: true,
                  message: `${documentType} processed: ${sizeKB.toFixed(1)}KB → ${outputFileName} (stamped)`,
                  severity: 'success'
                });
              } else {
                throw new Error(`Failed to stamp ${documentType}: ${stampResult.error}`);
              }
            }
          } else {
            setSnackbar({
              open: true,
              message: `${documentType} processed: ${sizeKB.toFixed(1)}KB → ${outputFileName}`,
              severity: 'success'
            });
          }
        } else {
          throw new Error(`Failed to copy ${documentType}: ${copyResult.error}`);
        }
      } else {
        // File is larger than threshold, compress first
        setSnackbar({
          open: true,
          message: `${documentType} size (${sizeKB.toFixed(1)}KB) > ${thresholdKB}KB. Compressing...`,
          severity: 'info'
        });

        // Convert to JPEG
        const jpegPath = `${compressedFilesPath}\\${documentType}.jpeg`;
        const jpegResult = await window.electronAPI.convertPdfToJpeg({
          pdfPath: filePath,
          jpegPath: jpegPath,
          quality: 100,
          dpi: 300
        });

        if (jpegResult.success) {
          // Compress image
          const compressedJpegPath = `${compressedFilesPath}\\${documentType}_compressed.jpeg`;
          const compressResult = await window.electronAPI.compressImageToTarget({
            imagePath: jpegPath,
            documentType: documentType,
            targetSizeKB: thresholdKB,
            outputPath: compressedJpegPath
          });

          if (compressResult.success && compressResult.compressedSize) {
            // Create A4 PDF in compressed_files folder
            const outputPath = `${compressedFilesPath}\\${outputFileName}`;
            const pdfResult = await window.electronAPI.createA4PdfFromCompressedImage({
              imagePath: compressedJpegPath,
              outputPath: outputPath
            });

            if (pdfResult.success) {
              // Apply stamping if needed
              if (needsStamp || needsSignature) {
                if (documentType === 'form20-3') {
                  // Use processForm203 for Form 20-3 cash processing
                  const form203Result = await window.electronAPI.processForm203({
                    inputPath: outputPath,
                    paymentType: 'cash',
                    signatureFormat: getCurrentSignatureFormat(),
                    customConfig: {
                      stampWidth: 80,
                      stampHeight: 80,
                      stampOpacity: 0.9,
                      signatureWidth: 60,
                      signatureHeight: 30,
                      signatureOpacity: 0.9
                    },
                    showroomName: currentShowroom.showroomName,
                    ownerName: owner.name,
                    ownerContact: owner.contact
                  });

                  if (form203Result.success) {
                    setSnackbar({
                      open: true,
                      message: `${documentType} compressed: ${(compressResult.compressedSize / 1024).toFixed(1)}KB → ${outputFileName} (cash stamped & signed)`,
                      severity: 'success'
                    });
                  } else {
                    throw new Error(`Failed to process compressed ${documentType} for cash: ${form203Result.error}`);
                  }
                } else {
                  // Regular stamping for Form 20-2
                  const stampResult = await window.electronAPI.stampPdfFile({
                    inputPath: outputPath,
                    stampConfig: {
                      documentType: documentType,
                      signatureFormat: getCurrentSignatureFormat(),
                      showroomName: currentShowroom.showroomName,
                      ownerName: owner.name,
                      ownerContact: owner.contact
                    }
                  });

                  if (stampResult.success) {
                    setSnackbar({
                      open: true,
                      message: `${documentType} compressed: ${(compressResult.compressedSize / 1024).toFixed(1)}KB → ${outputFileName} (stamped)`,
                      severity: 'success'
                    });
                  } else {
                    throw new Error(`Failed to stamp compressed ${documentType}: ${stampResult.error}`);
                  }
                }
              } else {
                setSnackbar({
                  open: true,
                  message: `${documentType} compressed: ${(compressResult.compressedSize / 1024).toFixed(1)}KB → ${outputFileName}`,
                  severity: 'success'
                });
              }
            } else {
              throw new Error(`Failed to create A4 PDF for ${documentType}: ${pdfResult.error}`);
            }
          } else {
            throw new Error(`Failed to compress ${documentType}: ${compressResult.error}`);
          }
        } else {
          throw new Error(`Failed to convert ${documentType} to JPEG: ${jpegResult.error}`);
        }
      }
    } else {
      throw new Error(`Failed to get file size for ${documentType}`);
    }
  };

  const processForm203 = async (filePath: string, paymentType: 'cash' | 'finance', financeCompanyName: string | null) => {
    try {
      setStamping('form20-3');

      if (!window.electronAPI || !window.electronAPI.processForm203) {
        setSnackbar({
          open: true,
          message: 'Form 20-3 processing not available',
          severity: 'error'
        });
        return;
      }

      const result = await window.electronAPI.processForm203({
        inputPath: filePath,
        paymentType: paymentType,
        financeCompanyId: financeCompanyName || undefined, // Convert null to undefined
        signatureFormat: getCurrentSignatureFormat(),
        customConfig: {
          stampWidth: 80,
          stampHeight: 80,
          stampOpacity: 0.9,
          signatureWidth: 60,
          signatureHeight: 30,
          signatureOpacity: 0.9
        },
        showroomName: currentShowroom!.showroomName,
        ownerName: owner!.name,
        ownerContact: owner!.contact
      });

      if (result.success) {
        let message = `Form 20-3 processed successfully!`;
        if (paymentType === 'cash') {
          message += ' (Cash payment - stamp and signature applied)';
        } else if (paymentType === 'finance') {
          message += ` (Finance: ${financeCompanyName} - stamps applied at 3 positions)`;
        }

        setSnackbar({
          open: true,
          message: message,
          severity: 'success'
        });

        // Refresh website documents
        if (refreshWebsiteDocuments) {
          refreshWebsiteDocuments();
        }

        // Auto-merge Form 20 documents after 203 is processed
        setTimeout(() => {
          checkAndAutoMergeForm20();
        }, 1500); // Wait 1.5 seconds to ensure file is fully written and detected
      } else {
        setSnackbar({
          open: true,
          message: result.error || 'Error processing Form 20-3',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error processing Form 20-3:', error);
      setSnackbar({
        open: true,
        message: 'Error processing Form 20-3',
        severity: 'error'
      });
    } finally {
      setStamping(null);
      setSelectedForm203Path(null);
    }
  };

  const checkAndAutoMergeForm20 = async () => {
    if (!owner || !currentShowroom || !window.electronAPI?.checkForm20MergeReady) {
      console.log('[Auto-Merge] Missing requirements:', {
        owner: !!owner,
        currentShowroom: !!currentShowroom,
        checkForm20MergeReady: !!window.electronAPI?.checkForm20MergeReady
      });
      return;
    }

    try {
      console.log('[Auto-Merge] Checking if Form 20 documents are ready...');

      // Check if all Form 20 documents are ready
      const checkResult = await window.electronAPI.checkForm20MergeReady({
        showroomName: currentShowroom.showroomName,
        ownerName: owner.name,
        ownerContact: owner.contact
      });

      console.log('[Auto-Merge] Check result:', checkResult);

      if (checkResult.success && checkResult.canMerge) {
        // All Form 20 documents are present, proceed with auto-merge
        console.log('[Auto-Merge] All Form 20 documents found, initiating merge...');

        setSnackbar({
          open: true,
          message: 'All Form 20 documents ready. Auto-merging to fm20.pdf...',
          severity: 'info'
        });

        // Small delay to ensure user sees the message
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Perform the merge
        const mergeResult = await window.electronAPI.mergeForm20Documents({
          showroomName: currentShowroom.showroomName,
          ownerName: owner.name,
          ownerContact: owner.contact
        });

        console.log('[Auto-Merge] Merge result:', mergeResult);

        if (mergeResult.success) {
          setSnackbar({
            open: true,
            message: `✅ Auto-merged Form 20 documents! Created fm20.pdf (${mergeResult.sizeKB}KB)`,
            severity: 'success'
          });

          // Refresh website documents
          if (refreshWebsiteDocuments) {
            setTimeout(refreshWebsiteDocuments, 500);
          }
        } else if (mergeResult.warning) {
          setSnackbar({
            open: true,
            message: `⚠️ Form 20 merged with warning: ${mergeResult.warning}`,
            severity: 'warning'
          });

          if (refreshWebsiteDocuments) {
            setTimeout(refreshWebsiteDocuments, 500);
          }
        } else {
          console.error('[Auto-Merge] Merge failed:', mergeResult.error);
          setSnackbar({
            open: true,
            message: `❌ Auto-merge failed: ${mergeResult.error}`,
            severity: 'error'
          });
        }
      } else {
        console.log('[Auto-Merge] Cannot merge yet. Missing files:', checkResult.missingFiles);
      }
    } catch (error) {
      console.error('[Auto-Merge] Error checking/merging Form 20:', error);
      setSnackbar({
        open: true,
        message: `❌ Auto-merge error: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'error'
      });
    }
  };

  const handleFinanceCompanySelect = async (company: IFinanceCompany) => {
    setFinanceCompanySelectorOpen(false);

    if (!company.companyName) {
      setSnackbar({
        open: true,
        message: 'Missing finance company information',
        severity: 'error'
      });
      return;
    }

    // Check if we're in the context of processing all Form 20 documents for finance
    if (stamping === 'form20-3') {
      // Start the complete Form 20 Finance processing workflow
      await handleForm20ProcessingUnified('finance', company.companyName);
    } else if (selectedForm203Path) {
      // Original single Form 20-3 processing
      await processForm203(selectedForm203Path, 'finance', company.companyName);
    } else {
      setSnackbar({
        open: true,
        message: 'Missing Form 20-3 file path',
        severity: 'error'
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!documentToDelete || !owner || !currentShowroom) return;

    try {
      // Delete from local folder
      if (window.electronAPI && window.electronAPI.deleteLocalFile) {
        const result = await window.electronAPI.deleteLocalFile({
          showroomName: currentShowroom.showroomName,
          name: owner.name,
          contact: owner.contact,
          fileName: documentToDelete.fileName
        });

        if (result.success) {
          // Update local state
          setDocuments(documents.filter((doc) => doc.fileName !== documentToDelete.fileName));

          setSnackbar({
            open: true,
            message: 'Document removed successfully',
            severity: 'success'
          });
        } else {
          throw new Error(result.error || 'Failed to delete file');
        }
      }
    } catch (error) {
      console.error('Error removing document:', error);
      setSnackbar({
        open: true,
        message: 'Failed to remove document',
        severity: 'error'
      });
    } finally {
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  const handleOpenWebsite = async (e: React.MouseEvent, documentType?: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!documentType || !owner || !currentShowroom) {
      setSnackbar({
        open: true,
        message: 'Missing required information',
        severity: 'error'
      });
      return;
    }

    // Determine URL based on document type
    let url = 'https://vahan.parivahan.gov.in/vahan/vahan/ui/login/login.xhtml';

    if (documentType === 'invoice' || documentType === 'form22') {
      url = 'http://192.168.1.100:8080';
    } else if (documentType === 'insurance') {
      url = 'https://www.insurancedekho.com/';
    }

    // Always open in external browser (Chrome)
    if (window.electronAPI && window.electronAPI.openExternal) {
      await window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }

    setSnackbar({
      open: true,
      message: `Opening ${documentType} website in Chrome...`,
      severity: 'info'
    });
  };

  // const handleOpenFinalPdfsFolder = async () => {
  //   if (!owner || !currentShowroom) return;

  //   try {
  //     const result = await window.electronAPI.openOwnerFolder({
  //       showroomName: currentShowroom.showroomName,
  //       name: owner.name,
  //       contact: owner.contact,
  //       folderType: 'finalPdfs'
  //     });

  //     if (!result.success) {
  //       setSnackbar({
  //         open: true,
  //         message: result.message || 'Failed to open Final PDFs folder',
  //         severity: 'error'
  //       });
  //     }
  //   } catch (error) {
  //     console.error('Error opening Final PDFs folder:', error);
  //     setSnackbar({
  //       open: true,
  //       message: 'Error opening Final PDFs folder',
  //       severity: 'error'
  //     });
  //   }
  // };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Skeleton variant="text" width={200} height={40} />
        <Skeleton variant="text" width={300} height={30} />
        <Grid container spacing={3} sx={{ mt: 2 }}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
              <Skeleton variant="rectangular" height={200} />
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  if (!owner) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">Owner not found</Alert>
      </Container>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        p: 0,
        mt: 0,
        overflow: 'hidden'
      }}
    >
      {/* Header Section */}
      <Box
        sx={{
          p: '60px 24px 8px 40px'
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Owner Name and Phone/Showroom stacked */}
            <Box>
              {/* Owner Name - First line */}
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 600,
                  color: '#333',
                  lineHeight: 1.2
                }}
              >
                👨‍💼 {owner.name}
              </Typography>

              {/* Phone and Showroom - Second line with Folder Icon */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <Typography
                  variant="h6"
                  sx={{
                    color: '#666',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5
                  }}
                >
                  <span style={{ fontSize: '0.8em' }}>📞</span>
                  {owner.contact}
                  <span style={{ color: owner.isSalePoint ? '#ff9800' : '#009688' }}>
                    ({owner.isSalePoint ? 'Sale Point' : 'Showroom'})
                  </span>
                </Typography>

                {/* Folder Icon - Yellow color, Opens root owner folder */}
                <Tooltip title="Open Owner Folder">
                  <IconButton
                    size="small"
                    onClick={handleOpenRootFolder}
                    sx={{
                      color: '#f9a825',
                      '&:hover': {
                        backgroundColor: 'rgba(249, 168, 37, 0.08)'
                      }
                    }}
                  >
                    <FolderIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              onClick={handleMoveOwner}
              variant="outlined"
              startIcon={<DriveFileMoveIcon />}
              sx={{
                borderColor: '#f44336',
                color: '#f44336',
                '&:hover': {
                  borderColor: '#d32f2f',
                  backgroundColor: 'rgba(244, 67, 54, 0.08)'
                }
              }}
            >
              Move to Archive
            </Button>

            <Button
              onClick={() => navigate('/owner/list')}
              variant="contained"
              startIcon={<BackIcon />}
              sx={{
                backgroundColor: '#009688',
                '&:hover': {
                  backgroundColor: '#00796B'
                }
              }}
            >
              {'Owners List'}
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Main Content Container */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden', pb: 2 }}>
        <MobileDocumentsSection
          documents={documents}
          compressingImage={compressingImage}
          compressionProgress={compressionProgress}
          onViewDocument={handleViewDocument}
          onCompressImage={handleCompressImage}
          onOpenMobileFolder={handleOpenMobileFolder}
          onRefresh={handleRefreshDocuments}
        />

        <WebsiteDocumentsSection
          stamping={stamping}
          compressing={compressing}
          documentSizes={websiteDocumentSizes}
          documentSourceFolders={websiteDocumentSourceFolders}
          onViewDocument={handleViewWebsiteDocument}
          onOpenWebsite={handleOpenWebsite}
          onStamp={handleStamp}
          onCompress={handleWebsiteCompress}
          onOpenWebsiteFolder={handleOpenWebsiteFolder}
        />
      </Box>

      {/* PDF Viewer Dialog */}
      <Dialog
        open={pdfDialogOpen}
        onClose={() => setPdfDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        sx={{ '& .MuiDialog-paper': { height: '90vh' } }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Document Viewer</Typography>
            <IconButton onClick={() => setPdfDialogOpen(false)}>✕</IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {pdfUrl && <iframe src={pdfUrl} width="100%" height="100%" style={{ border: 'none' }} title="PDF Viewer" />}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to remove "{documentToDelete?.fileName}"?</Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            {'This will delete the document from your local storage permanently.'}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      {/* Move to Archive Dialog */}
      <Dialog open={moveDialogOpen} onClose={() => !isMoving && setMoveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DriveFileMoveIcon color="error" />
            <Typography variant="h6">Move {'Owner'} to Archive</Typography>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to move this {'owner'}'s folder to the archive?
          </Typography>

          {owner && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {'Owner'} Details:
              </Typography>
              <Typography variant="body2">
                • Name: <strong>{owner.name}</strong>
              </Typography>
              <Typography variant="body2">
                • Contact: <strong>{owner.contact}</strong>
              </Typography>
              <Typography variant="body2">
                • Documents: <strong>{documents?.length || 0}</strong>
              </Typography>
            </Box>
          )}

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              The folder will be moved to:
              <br />
              <strong>
                D:\{currentShowroom?.showroomName}\3 Previous\
                {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}\{new Date().getDate()}{' '}
                {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </strong>
            </Typography>
          </Alert>

          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Note:</strong> This action will move the entire {'owner'} folder including all documents to the archive. You will be
              redirected to the {'owner'} list after archiving.
            </Typography>
          </Alert>

          {isMoving && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Moving folder to archive...
              </Typography>
              <LinearProgress />
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setMoveDialogOpen(false)} disabled={isMoving} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={confirmMoveOwner}
            color="error"
            variant="contained"
            disabled={isMoving || !owner}
            startIcon={isMoving ? <CircularProgress size={16} color="inherit" /> : <DriveFileMoveIcon />}
          >
            {isMoving ? 'Moving...' : 'Move to Archive'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* PDF Preview Dialog - ADD THIS */}
      {selectedPdfForStamp && (
        <PDFPreviewDialog
          open={previewDialogOpen}
          onClose={() => {
            setPreviewDialogOpen(false);
            setSelectedPdfForStamp(null);
            setStampLoading(false);
          }}
          pdfUrl={selectedPdfForStamp.url}
          fileName={selectedPdfForStamp.fileName}
          documentType={selectedPdfForStamp.documentType}
          onConfirmStamp={handleConfirmStamp}
          loading={stampLoading}
        />
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={
          snackbar.message.includes('Please select') ? null : 3000 // Don't auto-close for "Please select" messages
        }
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{
          '& .MuiSnackbarContent-root': {
            minWidth: '500px',
            maxWidth: '800px',
            width: 'fit-content'
          }
        }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{
            minWidth: '500px',
            maxWidth: '800px',
            fontSize: '1rem',
            '& .MuiAlert-message': {
              padding: '8px 0',
              lineHeight: 1.5,
              whiteSpace: 'pre-line'
            }
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Form203OptionsDialog
        open={form203DialogOpen}
        onClose={() => {
          setForm203DialogOpen(false);
          setSelectedForm203Path(null);
          setStamping(null);
        }}
        onSelectOption={handleForm203Option}
      />

      {/* Finance Company Selector Dialog */}
      <FinanceCompanySelector
        open={financeCompanySelectorOpen}
        onClose={() => {
          setFinanceCompanySelectorOpen(false);
          setSelectedForm203Path(null);
          setStamping(null);
        }}
        onSelectCompany={handleFinanceCompanySelect}
      />
      {insurancePageSelectorOpen && insurancePdfInfo && (
        <InsurancePageSelector
          open={insurancePageSelectorOpen}
          onClose={() => {
            setInsurancePageSelectorOpen(false);
            setInsurancePdfInfo(null);
            setStamping(null);
          }}
          fileName={insurancePdfInfo.fileName}
          pageCount={insurancePdfInfo.pageCount}
          onSelectPage={handleInsurancePageSelected}
          loading={processingInsurance}
        />
      )}
    </Box>
  );
};

export default OwnerView;
