// src/owner/utils/ownerDocumentUtils.ts

export const getSimplifiedName = (fileName: string): string => {
  const name = fileName.toLowerCase();

  if (name.includes('aadhaar') || name.includes('adhr')) return 'Aadhaar Card';
  if (name.includes('pan')) return 'Pan Card';
  if (name.includes('form60')) return 'Form60';
  if (name.includes('medical')) return 'Medical';
  if (name.includes('form20') || (name.includes('form') && !name.includes('form60'))) return 'Form20';
  if (name.includes('chassis') || name.includes('chss')) return 'Chassis';
  if (name.includes('vehicle') || name.includes('vhcl')) return 'Vehicle Photo';
  if (name.includes('sign')) return 'Sign';
  if (name.includes('other') || name.includes('othr')) return 'Other';
  if (name.includes('extra') || name.includes('extr')) return 'Extra';

  return fileName;
};

// Updated shouldShowDocument function in ownerDocumentUtils.ts
// Replace the existing function with this version

export const shouldShowDocument = (fileName: string): boolean => {
  const name = fileName.toLowerCase();

  // First check if it's a valid document type (pdf, jpg, jpeg, png)
  const isValidType = name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.pdf');

  if (!isValidType) return false;

  // Document type checks
  if (name.includes('aadhaar') || name.includes('adhr')) return true;
  if (name.includes('pan')) return true;
  if (name.includes('form60')) return true; // Add this
  if (name.includes('medical')) return true; // Add this
  if (name.includes('chassis') || name.includes('chss')) return true;
  if (name.includes('vehicle') || name.includes('vhcl')) return true;
  if (name.includes('sign')) return true;
  if (name.includes('form')) return true;
  if (name.includes('other') || name.includes('othr')) return true;
  if (name.includes('extra') || name.includes('extr')) return true;

  // Check for exact renamed files - Including PDFs
  const baseNameWithoutExt = name.replace(/\.(jpg|jpeg|png|pdf)$/i, '');
  const validExactNames = ['adhr', 'pan', 'chss', 'vhcl', 'sign', 'form20', 'form60', 'medical', 'othr', 'extr']; // Updated

  if (validExactNames.includes(baseNameWithoutExt)) return true;

  // Don't show backup files or temporary files
  if (name.includes('backup') || name.includes('temp') || name.includes('compressed')) return false;

  // Don't show files in Original folder
  if (name.includes('original/') || name.includes('original\\')) return false;

  return false;
};

export const getDocumentOrder = (fileName: string): number => {
  const name = fileName.toLowerCase();

  if (name.includes('aadhaar') || name.includes('adhr')) return 1;
  if (name.includes('pan')) return 2;
  if (name.includes('vehicle') || name.includes('vhcl')) return 3;
  if (name.includes('chassis') || name.includes('chss')) return 4;
  if (name.includes('sign')) return 5;
  if (name.includes('form60')) return 6; // Add this
  if (name.includes('form20') || name.includes('form')) return 7; // Update order
  if (name.includes('medical')) return 8; // Add this
  if (name.includes('other') || name.includes('othr')) return 9; // Update order
  if (name.includes('extra') || name.includes('extr')) return 10; // Update order

  return 99;
};

export const getDocumentIcon = (fileName: string): string => {
  const name = fileName.toLowerCase();
  if (name.includes('aadhaar') || name.includes('adhr')) return '🆔';
  if (name.includes('pan')) return '💳';
  if (name.includes('form60')) return '📋';
  if (name.includes('medical')) return '🏥';
  if (name.includes('form20') || (name.includes('form') && !name.includes('form60'))) return '📑';
  if (name.includes('chassis') || name.includes('chss')) return '🚗';
  if (name.includes('vehicle') || name.includes('vhcl')) return '🚙';
  if (name.includes('sign')) return '✍️';
  if (name.includes('other') || name.includes('othr')) return '📄';
  if (name.includes('extra') || name.includes('extr')) return '📋';
  return '📄';
};

export const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

export const isImageFile = (fileName: string): boolean => {
  const name = fileName.toLowerCase();

  // First check: actual image file extensions
  if (name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.bmp') || name.endsWith('.webp')) {
    return true;
  }

  // Second check: if it's a PDF, it's NOT an image
  if (name.endsWith('.pdf')) {
    return false;
  }

  // Third check: document types that are typically images (but could be PDFs)
  if (
    name.includes('aadhaar') ||
    name.includes('adhr') ||
    name.includes('pan') ||
    name.includes('form60') ||
    name.includes('medical') ||
    name.includes('vehicle') ||
    name.includes('vhcl') ||
    name.includes('chassis') ||
    name.includes('chss') ||
    name.includes('form20') ||
    name.includes('form') ||
    name.includes('sign') ||
    name.includes('photo') ||
    name.includes('other') ||
    name.includes('extra')
  ) {
    // Only return true if it's NOT a PDF
    return !name.endsWith('.pdf');
  }

  return false;
};
