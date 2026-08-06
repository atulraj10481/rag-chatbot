import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

// Polyfill DOMMatrix for pdfjs-dist / pdf-parse in Node.js server environment
if (typeof globalThis.DOMMatrix === 'undefined') {
  // @ts-ignore
  globalThis.DOMMatrix = class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    m11 = 1; m12 = 0; m21 = 0; m22 = 1; m41 = 0; m42 = 0;
    constructor() {}
    multiply() { return this; }
    translate() { return this; }
    scale() { return this; }
    rotate() { return this; }
    inverse() { return this; }
  };
}

export interface ProcessedChunk {
  content: string;
  metadata: {
    page_num?: number;
    chunk_index: number;
    total_chunks: number;
  };
}

export async function processPDF(buffer: Buffer): Promise<{ text: string; pageCount: number; chunks: ProcessedChunk[] }> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const rawPdfParse = require('pdf-parse');

  // pdf-parse 1.x exports the function directly.
  // pdf-parse 2.x+ exports an object with `PDFParse` method, which is a Class constructor.
  const PDFParse = rawPdfParse?.PDFParse || rawPdfParse?.default || rawPdfParse;

  if (typeof PDFParse !== 'function') {
    throw new Error('pdf-parse module failed to resolve as a callable function or class constructor.');
  }

  let text = '';
  let pageCount = 0;

  try {
    let isClass = false;
    
    // Check if prototype contains v2.x methods
    if (PDFParse.prototype && typeof PDFParse.prototype.getText === 'function') {
      isClass = true;
    } else {
      // Fallback: Test invocation exception to see if it's a native ES6 class
      try {
        (PDFParse as any)();
      } catch (e: any) {
        if (e.message && e.message.includes("without 'new'")) {
          isClass = true;
        }
      }
    }

    if (isClass) {
      const parser = new (PDFParse as any)({ data: buffer });
      const textResult = await parser.getText();
      text = textResult.text;
      pageCount = textResult.total || textResult.pages?.length || 0;
      if (typeof parser.destroy === 'function') {
        await parser.destroy();
      }
    } else {
      // Fallback for pdf-parse v1
      const pdfData = await (PDFParse as any)(buffer);
      text = pdfData.text;
      pageCount = pdfData.numpages;
    }
  } catch (error: any) {
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }

  // Normalize the text
  const normalizedText = text
    .replace(/\u0000/g, '') // Remove null bytes
    .replace(/\r\n/g, '\n') // Normalize newlines
    .replace(/\n{3,}/g, '\n\n') // Collapse excessive newlines
    .replace(/[\x00-\x09\x0B-\x1F\x7F]/g, '') // Remove hidden control characters
    .trim();

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,      // ~250 tokens
    chunkOverlap: 200,    // 20% overlap for context preservation
    separators: ["\n\n", "\n", " ", ""],
  });

  const docs = await splitter.createDocuments([normalizedText]);

  const chunks: ProcessedChunk[] = docs.map((doc, idx) => ({
    content: doc.pageContent,
    metadata: {
      chunk_index: idx,
      total_chunks: docs.length,
    },
  }));

  return {
    text,
    pageCount,
    chunks,
  };
}
