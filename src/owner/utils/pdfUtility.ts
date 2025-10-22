import { PDFDocument } from 'pdf-lib';

export async function mergePDFs(pdfFiles: File[]): Promise<string> {
  const mergedPdf = await PDFDocument.create();

  for (const pdfFile of pdfFiles) {
    const pdfBytes = await pdfFile.arrayBuffer();
    const pdf = await PDFDocument.load(pdfBytes);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const pdfBytes = await mergedPdf.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  return URL.createObjectURL(blob);
}
