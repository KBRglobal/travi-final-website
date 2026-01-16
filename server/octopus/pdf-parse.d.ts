/**
 * Type declarations for pdf-parse module
 * This module is optionally installed for PDF parsing
 */

declare module 'pdf-parse' {
  interface PDFInfo {
    Title?: string;
    Author?: string;
    Creator?: string;
    Producer?: string;
    CreationDate?: string;
    ModDate?: string;
  }

  interface PDFResult {
    numpages: number;
    numrender: number;
    info: PDFInfo;
    metadata: any;
    version: string;
    text: string;
  }

  function pdfParse(dataBuffer: Buffer, options?: any): Promise<PDFResult>;
  export = pdfParse;
}
