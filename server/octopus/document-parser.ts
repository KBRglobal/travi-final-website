/**
 * Octopus Engine - Document Parser
 * Parses PDF and Word documents to extract raw text content
 * Supports large documents (50-200+ pages)
 */

import * as fs from 'fs';
import * as path from 'path';
import mammoth from 'mammoth';
import { log } from '../lib/logger';

const octopusLogger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[Octopus Parser] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) => log.error(`[Octopus Parser] ${msg}`, undefined, data),
  warn: (msg: string, data?: Record<string, unknown>) => log.warn(`[Octopus Parser] ${msg}`, data),
};

export interface ParsedDocument {
  filename: string;
  fileType: 'pdf' | 'docx' | 'doc' | 'txt';
  totalPages: number;
  totalWords: number;
  totalCharacters: number;
  sections: DocumentSection[];
  rawText: string;
  metadata: DocumentMetadata;
  parseTime: number;
}

export interface DocumentSection {
  index: number;
  title?: string;
  content: string;
  wordCount: number;
  pageRange?: { start: number; end: number };
}

export interface DocumentMetadata {
  title?: string;
  author?: string;
  createdAt?: Date;
  modifiedAt?: Date;
  language?: string;
  keywords?: string[];
}

export interface ParseOptions {
  extractMetadata?: boolean;
  splitBySections?: boolean;
  maxSectionSize?: number; // max words per section for processing
  preserveFormatting?: boolean;
}

const DEFAULT_OPTIONS: ParseOptions = {
  extractMetadata: true,
  splitBySections: true,
  maxSectionSize: 3000,
  preserveFormatting: false,
};

/**
 * Parse a document file (PDF or Word)
 */
export async function parseDocument(
  filePath: string,
  options: ParseOptions = {}
): Promise<ParsedDocument> {
  const startTime = Date.now();
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const filename = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase().slice(1);

  let result: ParsedDocument;

  switch (ext) {
    case 'pdf':
      result = await parsePDF(filePath, filename, opts);
      break;
    case 'docx':
    case 'doc':
      result = await parseWord(filePath, filename, ext as 'docx' | 'doc', opts);
      break;
    case 'txt':
      result = await parsePlainText(filePath, filename, opts);
      break;
    default:
      throw new Error(`Unsupported file type: ${ext}. Supported: pdf, docx, doc, txt`);
  }

  result.parseTime = Date.now() - startTime;

  octopusLogger.info('Document parsed successfully', {
    filename,
    fileType: result.fileType,
    totalWords: result.totalWords,
    sections: result.sections.length,
    parseTime: result.parseTime,
  });

  return result;
}

/**
 * Parse PDF document
 */
async function parsePDF(
  filePath: string,
  filename: string,
  options: ParseOptions
): Promise<ParsedDocument> {
  try {
    // Try to load pdf-parse dynamically
    const pdfParse = await import('pdf-parse').catch(() => null);

    if (!pdfParse) {
      octopusLogger.warn('pdf-parse not installed. Install with: npm install pdf-parse');
      throw new Error('PDF parsing requires pdf-parse package. Install with: npm install pdf-parse');
    }

    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse.default(dataBuffer);

    const rawText = cleanText(data.text);
    const sections = splitIntoSections(rawText, options);

    return {
      filename,
      fileType: 'pdf',
      totalPages: data.numpages || estimatePages(rawText),
      totalWords: countWords(rawText),
      totalCharacters: rawText.length,
      sections,
      rawText,
      metadata: {
        title: data.info?.Title || extractTitleFromText(rawText),
        author: data.info?.Author,
        createdAt: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
        language: detectLanguage(rawText),
      },
      parseTime: 0,
    };
  } catch (error) {
    octopusLogger.error('PDF parsing failed', { error, filePath });
    throw error;
  }
}

/**
 * Parse Word document using mammoth
 */
async function parseWord(
  filePath: string,
  filename: string,
  fileType: 'docx' | 'doc',
  options: ParseOptions
): Promise<ParsedDocument> {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    const rawText = cleanText(result.value);
    const sections = splitIntoSections(rawText, options);

    // Also get HTML for structure detection
    const htmlResult = await mammoth.convertToHtml({ path: filePath });
    const structuredSections = extractSectionsFromHtml(htmlResult.value, options);

    // Merge structured sections if available
    const finalSections = structuredSections.length > 0 ? structuredSections : sections;

    return {
      filename,
      fileType,
      totalPages: estimatePages(rawText),
      totalWords: countWords(rawText),
      totalCharacters: rawText.length,
      sections: finalSections,
      rawText,
      metadata: {
        title: extractTitleFromText(rawText),
        language: detectLanguage(rawText),
      },
      parseTime: 0,
    };
  } catch (error) {
    octopusLogger.error('Word document parsing failed', { error, filePath });
    throw error;
  }
}

/**
 * Parse plain text file
 */
async function parsePlainText(
  filePath: string,
  filename: string,
  options: ParseOptions
): Promise<ParsedDocument> {
  const rawText = cleanText(fs.readFileSync(filePath, 'utf-8'));
  const sections = splitIntoSections(rawText, options);

  return {
    filename,
    fileType: 'txt',
    totalPages: estimatePages(rawText),
    totalWords: countWords(rawText),
    totalCharacters: rawText.length,
    sections,
    rawText,
    metadata: {
      title: extractTitleFromText(rawText),
      language: detectLanguage(rawText),
    },
    parseTime: 0,
  };
}

/**
 * Parse document from buffer (for file uploads)
 */
export async function parseDocumentBuffer(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  options: ParseOptions = {}
): Promise<ParsedDocument> {
  const startTime = Date.now();
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Determine file type from mime type
  let fileType: 'pdf' | 'docx' | 'doc' | 'txt';

  if (mimeType === 'application/pdf') {
    fileType = 'pdf';
  } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    fileType = 'docx';
  } else if (mimeType === 'application/msword') {
    fileType = 'doc';
  } else if (mimeType.startsWith('text/')) {
    fileType = 'txt';
  } else {
    throw new Error(`Unsupported mime type: ${mimeType}`);
  }

  let result: ParsedDocument;

  switch (fileType) {
    case 'pdf':
      result = await parsePDFBuffer(buffer, filename, opts);
      break;
    case 'docx':
    case 'doc':
      result = await parseWordBuffer(buffer, filename, fileType, opts);
      break;
    case 'txt':
      result = await parsePlainTextBuffer(buffer, filename, opts);
      break;
  }

  result.parseTime = Date.now() - startTime;

  octopusLogger.info('Document buffer parsed successfully', {
    filename,
    fileType: result.fileType,
    totalWords: result.totalWords,
    sections: result.sections.length,
    parseTime: result.parseTime,
  });

  return result;
}

/**
 * Parse PDF from buffer
 */
async function parsePDFBuffer(
  buffer: Buffer,
  filename: string,
  options: ParseOptions
): Promise<ParsedDocument> {
  try {
    const pdfParse = await import('pdf-parse').catch(() => null);

    if (!pdfParse) {
      throw new Error('PDF parsing requires pdf-parse package. Install with: npm install pdf-parse');
    }

    const data = await pdfParse.default(buffer);
    const rawText = cleanText(data.text);
    const sections = splitIntoSections(rawText, options);

    return {
      filename,
      fileType: 'pdf',
      totalPages: data.numpages || estimatePages(rawText),
      totalWords: countWords(rawText),
      totalCharacters: rawText.length,
      sections,
      rawText,
      metadata: {
        title: data.info?.Title || extractTitleFromText(rawText),
        author: data.info?.Author,
        language: detectLanguage(rawText),
      },
      parseTime: 0,
    };
  } catch (error) {
    octopusLogger.error('PDF buffer parsing failed', { error, filename });
    throw error;
  }
}

/**
 * Parse Word from buffer
 */
async function parseWordBuffer(
  buffer: Buffer,
  filename: string,
  fileType: 'docx' | 'doc',
  options: ParseOptions
): Promise<ParsedDocument> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const rawText = cleanText(result.value);
    const sections = splitIntoSections(rawText, options);

    const htmlResult = await mammoth.convertToHtml({ buffer });
    const structuredSections = extractSectionsFromHtml(htmlResult.value, options);
    const finalSections = structuredSections.length > 0 ? structuredSections : sections;

    return {
      filename,
      fileType,
      totalPages: estimatePages(rawText),
      totalWords: countWords(rawText),
      totalCharacters: rawText.length,
      sections: finalSections,
      rawText,
      metadata: {
        title: extractTitleFromText(rawText),
        language: detectLanguage(rawText),
      },
      parseTime: 0,
    };
  } catch (error) {
    octopusLogger.error('Word buffer parsing failed', { error, filename });
    throw error;
  }
}

/**
 * Parse plain text from buffer
 */
async function parsePlainTextBuffer(
  buffer: Buffer,
  filename: string,
  options: ParseOptions
): Promise<ParsedDocument> {
  const rawText = cleanText(buffer.toString('utf-8'));
  const sections = splitIntoSections(rawText, options);

  return {
    filename,
    fileType: 'txt',
    totalPages: estimatePages(rawText),
    totalWords: countWords(rawText),
    totalCharacters: rawText.length,
    sections,
    rawText,
    metadata: {
      title: extractTitleFromText(rawText),
      language: detectLanguage(rawText),
    },
    parseTime: 0,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Clean and normalize text
 */
function cleanText(text: string): string {
  return text
    // Normalize line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove excessive whitespace
    .replace(/[ \t]+/g, ' ')
    // Remove excessive line breaks
    .replace(/\n{4,}/g, '\n\n\n')
    // Trim each line
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .trim();
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Estimate page count based on word count (~300 words per page)
 */
function estimatePages(text: string): number {
  const words = countWords(text);
  return Math.ceil(words / 300);
}

/**
 * Extract title from first meaningful line
 */
function extractTitleFromText(text: string): string {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  for (const line of lines.slice(0, 5)) {
    const trimmed = line.trim();
    if (trimmed.length >= 5 && trimmed.length <= 200) {
      return trimmed;
    }
  }
  return 'Untitled Document';
}

/**
 * Simple language detection
 */
function detectLanguage(text: string): string {
  const sample = text.slice(0, 1000).toLowerCase();

  // Hebrew detection
  if (/[\u0590-\u05FF]/.test(sample)) return 'he';
  // Arabic detection
  if (/[\u0600-\u06FF]/.test(sample)) return 'ar';
  // Chinese detection
  if (/[\u4E00-\u9FFF]/.test(sample)) return 'zh';
  // Japanese detection
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(sample)) return 'ja';
  // Korean detection
  if (/[\uAC00-\uD7AF]/.test(sample)) return 'ko';
  // Russian detection
  if (/[\u0400-\u04FF]/.test(sample)) return 'ru';

  // Default to English
  return 'en';
}

/**
 * Split text into sections based on patterns
 */
function splitIntoSections(text: string, options: ParseOptions): DocumentSection[] {
  if (!options.splitBySections) {
    return [{
      index: 0,
      content: text,
      wordCount: countWords(text),
    }];
  }

  const maxSize = options.maxSectionSize || 3000;
  const sections: DocumentSection[] = [];

  // Try to split by headings or major breaks
  const headingPattern = /\n(?=[A-Z][A-Za-z\s]{2,50}(?:\n|$))|(?:\n{3,})/g;
  const parts = text.split(headingPattern).filter(part => part.trim().length > 0);

  let currentSection = '';
  let currentWords = 0;
  let sectionIndex = 0;

  for (const part of parts) {
    const partWords = countWords(part);

    if (currentWords + partWords > maxSize && currentSection.length > 0) {
      // Save current section
      sections.push({
        index: sectionIndex++,
        title: extractSectionTitle(currentSection),
        content: currentSection.trim(),
        wordCount: currentWords,
      });
      currentSection = part;
      currentWords = partWords;
    } else {
      currentSection += '\n\n' + part;
      currentWords += partWords;
    }
  }

  // Add remaining section
  if (currentSection.trim().length > 0) {
    sections.push({
      index: sectionIndex,
      title: extractSectionTitle(currentSection),
      content: currentSection.trim(),
      wordCount: currentWords,
    });
  }

  // If no sections created, return whole text as one section
  if (sections.length === 0) {
    sections.push({
      index: 0,
      content: text,
      wordCount: countWords(text),
    });
  }

  return sections;
}

/**
 * Extract section title from first line
 */
function extractSectionTitle(text: string): string | undefined {
  const firstLine = text.trim().split('\n')[0];
  if (firstLine && firstLine.length <= 100 && firstLine.length >= 3) {
    return firstLine;
  }
  return undefined;
}

/**
 * Extract sections from HTML structure
 */
function extractSectionsFromHtml(html: string, options: ParseOptions): DocumentSection[] {
  const sections: DocumentSection[] = [];

  // Match h1, h2, h3 headings and their following content
  const headingPattern = /<h([1-3])[^>]*>(.*?)<\/h\1>/gi;
  const headings: { level: number; title: string; position: number }[] = [];

  let match;
  while ((match = headingPattern.exec(html)) !== null) {
    headings.push({
      level: parseInt(match[1]),
      title: stripHtml(match[2]),
      position: match.index,
    });
  }

  if (headings.length === 0) {
    return [];
  }

  // Split content by headings
  for (let i = 0; i < headings.length; i++) {
    const start = headings[i].position;
    const end = i < headings.length - 1 ? headings[i + 1].position : html.length;
    const sectionHtml = html.slice(start, end);
    const content = stripHtml(sectionHtml);

    sections.push({
      index: i,
      title: headings[i].title,
      content: content.trim(),
      wordCount: countWords(content),
    });
  }

  return sections;
}

/**
 * Strip HTML tags from text
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Get document stats for preview
 */
export function getDocumentStats(doc: ParsedDocument): {
  wordCount: number;
  pageEstimate: number;
  sectionCount: number;
  language: string;
  fileType: string;
  processingComplexity: 'low' | 'medium' | 'high';
} {
  const complexity = doc.totalWords < 10000 ? 'low' :
                     doc.totalWords < 50000 ? 'medium' : 'high';

  return {
    wordCount: doc.totalWords,
    pageEstimate: doc.totalPages,
    sectionCount: doc.sections.length,
    language: doc.metadata.language || 'en',
    fileType: doc.fileType,
    processingComplexity: complexity,
  };
}
