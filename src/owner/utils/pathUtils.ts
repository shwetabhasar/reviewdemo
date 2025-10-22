/**
 * Extract filename from a full path (browser-compatible)
 * Works like path.basename() but runs in browser
 */
export function getFileName(filePath: string): string {
  if (!filePath) return '';

  // Handle both forward and backward slashes
  const normalizedPath = filePath.replace(/\\/g, '/');
  const parts = normalizedPath.split('/');
  return parts[parts.length - 1] || '';
}

/**
 * Extract filename without extension
 */
export function getFileNameWithoutExt(filePath: string): string {
  const fileName = getFileName(filePath);
  const lastDotIndex = fileName.lastIndexOf('.');
  return lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
}

/**
 * Extract file extension
 */
export function getFileExtension(filePath: string): string {
  const fileName = getFileName(filePath);
  const lastDotIndex = fileName.lastIndexOf('.');
  return lastDotIndex > 0 ? fileName.substring(lastDotIndex) : '';
}
