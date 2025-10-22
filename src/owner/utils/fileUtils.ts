interface SaveDocumentParams {
  name: string;
  fileData: string;
  documentType: string;
  firstFive: string | null;
}

interface SaveDocumentResult {
  success: boolean;
  path?: string;
  pathSvr?: string;
  error?: string;
}

export const saveDocumentToLocal = async ({ name, fileData, documentType, firstFive }: SaveDocumentParams): Promise<SaveDocumentResult> => {
  try {
    const response = await fetch('/api/save-document', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        fileData,
        documentType,
        firstFive
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save document');
    }

    const result = await response.json();
    if (!result.path) {
      throw new Error('No path returned from save operation');
    }

    return {
      success: true,
      path: result.path,
      pathSvr: result.pathSvr
    };
  } catch (error) {
    console.error('Error saving document:', error);
    return {
      success: false,
      error: String(error)
    };
  }
};
