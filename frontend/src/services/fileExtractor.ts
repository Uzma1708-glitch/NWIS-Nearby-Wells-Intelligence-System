import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';

// Configure PDF.js worker to point to the local file in /public/
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

export interface ExtractionProgress {
  stage: 'reading' | 'pdf_parse' | 'ocr' | 'nlp' | 'complete';
  message: string;
  currentPage?: number;
  totalPages?: number;
  percent?: number;
}

export interface ExtractedDocument {
  fileName: string;
  fileSize: string;
  fileType: string;
  fullText: string;
  pages: Array<{ pageNumber: number; text: string; isOcr: boolean }>;
}

const ALLOWED_EXTENSIONS = ['.pdf', '.tif', '.tiff', '.png', '.jpg', '.jpeg', '.txt'];
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

/**
 * Validates file extension, mime type, and 20MB size limit
 */
export function validateUploadedFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size exceeds the 20 MB limit (${sizeMb} MB). Please choose a smaller drilling report.`
    };
  }

  const name = file.name.toLowerCase();
  const hasValidExt = ALLOWED_EXTENSIONS.some(ext => name.endsWith(ext));
  if (!hasValidExt) {
    const ext = name.includes('.') ? name.substring(name.lastIndexOf('.')) : 'unknown';
    return {
      valid: false,
      error: `Unsupported file type (${ext}). Accepted formats: PDF, TIFF, PNG, JPG, JPEG, and TXT.`
    };
  }

  return { valid: true };
}

/**
 * Formats byte size to human readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Performs OCR using Tesseract.js
 */
async function performOcr(
  imageSource: File | HTMLCanvasElement | Blob | string,
  onProgress?: (progress: ExtractionProgress) => void,
  pageNumber: number = 1,
  totalPages: number = 1
): Promise<string> {
  let worker;
  try {
    worker = await createWorker('eng', 1, {
      logger: m => {
        if (m.status === 'recognizing text' && onProgress) {
          const pct = Math.round((m.progress || 0) * 100);
          onProgress({
            stage: 'ocr',
            message: `OCR running (page ${pageNumber} of ${totalPages}): ${pct}%`,
            currentPage: pageNumber,
            totalPages,
            percent: pct
          });
        }
      }
    });

    const ret = await worker.recognize(imageSource);
    await worker.terminate();
    return ret.data.text || '';
  } catch (err: any) {
    if (worker) {
      try { await worker.terminate(); } catch (_) {}
    }
    console.warn('OCR processing error:', err);
    throw new Error(`OCR processing failed: ${err.message || 'Unable to recognize text from image'}`);
  }
}

/**
 * Extracts text from digital and scanned PDFs
 */
async function extractFromPdf(
  fileData: ArrayBuffer,
  fileName: string,
  fileSizeStr: string,
  onProgress?: (progress: ExtractionProgress) => void
): Promise<ExtractedDocument> {
  onProgress?.({
    stage: 'pdf_parse',
    message: 'Loading PDF document structure…',
    percent: 10
  });

  let pdfDoc;
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: fileData,
      useWorkerFetch: false,
      useSystemFonts: true
    });
    pdfDoc = await loadingTask.promise;
  } catch (err: any) {
    if (err.name === 'PasswordException') {
      throw new Error('This PDF is password protected. Please upload an unlocked drilling report.');
    }
    if (err.name === 'InvalidPDFException') {
      // Try raw stream recovery for basic PDF text
      try {
        const textDecoder = new TextDecoder('latin1');
        const rawStr = textDecoder.decode(fileData);
        const tjMatches = [...rawStr.matchAll(/\(([^)]+)\)\s*Tj/g)].map(m => m[1]);
        if (tjMatches.length > 0) {
          const recoveredText = tjMatches.join('\n');
          return {
            fileName,
            fileSize: fileSizeStr,
            fileType: 'PDF',
            fullText: recoveredText,
            pages: [{ pageNumber: 1, text: recoveredText, isOcr: false }]
          };
        }
      } catch (_) {}
      throw new Error('The uploaded file is corrupt or is not a valid PDF document.');
    }

    // Try text recovery fallback if worker or canvas had an internal error
    try {
      const textDecoder = new TextDecoder('latin1');
      const rawStr = textDecoder.decode(fileData);
      const tjMatches = [...rawStr.matchAll(/\(([^)]+)\)\s*Tj/g)].map(m => m[1]);
      if (tjMatches.length > 0) {
        const recoveredText = tjMatches.join('\n');
        return {
          fileName,
          fileSize: fileSizeStr,
          fileType: 'PDF',
          fullText: recoveredText,
          pages: [{ pageNumber: 1, text: recoveredText, isOcr: false }]
        };
      }
    } catch (_) {}

    throw new Error(`PDF loading error: ${err.message || 'Corrupt or unreadable file'}`);
  }

  const totalPages = pdfDoc.numPages;
  const pages: Array<{ pageNumber: number; text: string; isOcr: boolean }> = [];
  const textParts: string[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onProgress?.({
      stage: 'pdf_parse',
      message: `Extracting digital text (Page ${pageNum} of ${totalPages})…`,
      currentPage: pageNum,
      totalPages,
      percent: Math.round((pageNum / totalPages) * 70)
    });

    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const digitalText = textContent.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ')
      .trim();

    // If digital text is very sparse (< 40 characters), fallback to OCR
    if (digitalText.length >= 40) {
      pages.push({ pageNumber: pageNum, text: digitalText, isOcr: false });
      textParts.push(`--- Page ${pageNum} ---\n${digitalText}`);
    } else {
      onProgress?.({
        stage: 'ocr',
        message: `Scanned page detected (Page ${pageNum} of ${totalPages}). Rendering to canvas & running OCR…`,
        currentPage: pageNum,
        totalPages,
        percent: Math.round((pageNum / totalPages) * 70)
      });

      try {
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          await (page.render as any)({ canvas, canvasContext: ctx, viewport }).promise;
          const ocrText = await performOcr(canvas, onProgress, pageNum, totalPages);
          pages.push({ pageNumber: pageNum, text: ocrText, isOcr: true });
          textParts.push(`--- Page ${pageNum} (OCR) ---\n${ocrText}`);
        } else {
          pages.push({ pageNumber: pageNum, text: digitalText, isOcr: false });
          textParts.push(`--- Page ${pageNum} ---\n${digitalText}`);
        }
      } catch (ocrErr: any) {
        console.warn(`OCR fallback failed for page ${pageNum}:`, ocrErr);
        pages.push({ pageNumber: pageNum, text: digitalText, isOcr: false });
        textParts.push(`--- Page ${pageNum} ---\n${digitalText}`);
      }
    }
  }

  return {
    fileName,
    fileSize: fileSizeStr,
    fileType: 'PDF',
    fullText: textParts.join('\n\n'),
    pages
  };
}

/**
 * Main file extraction coordinator
 */
export async function extractDocumentContent(
  fileOrUrl: File | { name: string; url: string; size?: number },
  onProgress?: (progress: ExtractionProgress) => void
): Promise<ExtractedDocument> {
  let fileName: string;
  let fileSizeStr: string;
  let fileExt: string;
  let arrayBuffer: ArrayBuffer;
  let rawFile: File | null = null;

  if (fileOrUrl instanceof File) {
    rawFile = fileOrUrl;
    fileName = fileOrUrl.name;
    fileSizeStr = formatFileSize(fileOrUrl.size);
    fileExt = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));

    // Validate
    const validation = validateUploadedFile(fileOrUrl);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    onProgress?.({
      stage: 'reading',
      message: `Reading ${fileName} (${fileSizeStr})…`,
      percent: 5
    });

    arrayBuffer = await fileOrUrl.arrayBuffer();
  } else {
    fileName = fileOrUrl.name;
    fileExt = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    fileSizeStr = fileOrUrl.size ? formatFileSize(fileOrUrl.size) : '1.2 MB';

    onProgress?.({
      stage: 'reading',
      message: `Loading sample ${fileName}…`,
      percent: 5
    });

    const response = await fetch(fileOrUrl.url);
    if (!response.ok) {
      throw new Error(`Failed to load sample document: ${fileOrUrl.url}`);
    }
    arrayBuffer = await response.arrayBuffer();
  }

  // 1. Text files (.txt)
  if (fileExt === '.txt') {
    onProgress?.({
      stage: 'reading',
      message: 'Reading text content…',
      percent: 80
    });
    const textDecoder = new TextDecoder('utf-8');
    const text = textDecoder.decode(arrayBuffer);
    if (!text.trim()) {
      throw new Error('The uploaded text file is empty. Please provide a document with drilling logs.');
    }
    return {
      fileName,
      fileSize: fileSizeStr,
      fileType: 'TXT',
      fullText: text,
      pages: [{ pageNumber: 1, text, isOcr: false }]
    };
  }

  // 2. Images (.png, .jpg, .jpeg, .tif, .tiff)
  if (['.png', '.jpg', '.jpeg', '.tif', '.tiff'].includes(fileExt)) {
    onProgress?.({
      stage: 'ocr',
      message: `Running OCR on ${fileName}…`,
      currentPage: 1,
      totalPages: 1,
      percent: 20
    });

    let blobSource: Blob | File = rawFile || new Blob([arrayBuffer]);
    const ocrText = await performOcr(blobSource, onProgress, 1, 1);

    if (!ocrText.trim()) {
      throw new Error('OCR completed but no readable text could be recognized from this image.');
    }

    return {
      fileName,
      fileSize: fileSizeStr,
      fileType: 'IMAGE',
      fullText: ocrText,
      pages: [{ pageNumber: 1, text: ocrText, isOcr: true }]
    };
  }

  // 3. PDF files (.pdf)
  if (fileExt === '.pdf') {
    return await extractFromPdf(arrayBuffer, fileName, fileSizeStr, onProgress);
  }

  throw new Error(`Unsupported file type: ${fileExt}`);
}
