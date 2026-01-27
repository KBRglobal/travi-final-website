/**
 * DOC/DOCX File Upload Service
 *
 * Allows importing content directly from Word documents without AI modification.
 * The content is parsed and structured to fit the CMS content block format.
 *
 * Use Case: Import ready-written content (like 44 hotel pages) directly.
 */

import mammoth from "mammoth";
import type { ContentBlock } from "@shared/schema";
import { generateBlockId, generateSlug } from "./ai/utils";

// ============================================================================
// TYPES
// ============================================================================

interface ParsedDocContent {
  title: string;
  sections: Array<{
    heading: string;
    content: string;
    level: number; // h1=1, h2=2, etc
  }>;
  lists: Array<{
    items: string[];
    afterSection: number; // index of section this list follows
  }>;
  wordCount: number;
  rawHtml: string;
  rawText: string;
}

interface ImportedContent {
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  summary: string;
  content: {
    blocks: ContentBlock[];
    wordCount: number;
  };
  quickFacts: string[];
  proTips: string[];
  faqs: Array<{ question: string; answer: string }>;
  status: "draft" | "ready_for_review";
}

interface DocUploadResult {
  success: boolean;
  content?: ImportedContent;
  error?: string;
  warnings?: string[];
}

// ============================================================================
// DOCUMENT PARSING
// ============================================================================

/**
 * Parse a TXT file buffer into structured content
 * Uses conservative heading detection to preserve paragraph structure
 */
export async function parseTxtFile(buffer: Buffer): Promise<ParsedDocContent> {
  const rawText = buffer.toString("utf-8");
  const wordCount = rawText.split(/\s+/).filter(Boolean).length;

  // Split into paragraphs (double newlines), preserving original spacing
  const paragraphs = rawText
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  const sections: Array<{ heading: string; content: string; level: number }> = [];
  let title = "Untitled Document";

  // Detect if a paragraph is a heading:
  // - ALL CAPS with mostly letters
  // - Starts with number followed by period/colon (e.g., "1. Introduction")
  // - Very short line ending with colon
  function isHeading(text: string): boolean {
    const lines = text.split("\n");
    const firstLine = lines[0].trim();

    // Skip if too long or contains multiple sentences
    if (firstLine.length > 80 || firstLine.split(".").length > 2) return false;

    // ALL CAPS detection (must have at least 3 letter characters)
    const letters = firstLine.replace(/[^A-Za-z]/g, "");
    if (letters.length >= 3 && firstLine === firstLine.toUpperCase() && /[A-Z]/.test(firstLine)) {
      return true;
    }

    // Numbered heading: "1. Title" or "1: Title"
    if (/^\d+[\.:]\s*[A-Z]/.test(firstLine) && firstLine.length < 60) {
      return true;
    }

    // Short line ending with colon (title-like)
    if (firstLine.length < 50 && firstLine.endsWith(":") && !firstLine.includes(".")) {
      return true;
    }

    return false;
  }

  for (const paragraph of paragraphs) {
    if (isHeading(paragraph)) {
      const heading = paragraph.split("\n")[0].replace(/:$/, "").trim();
      const remainingContent = paragraph.split("\n").slice(1).join("\n").trim();

      if (sections.length === 0) {
        title = heading;
      }

      sections.push({
        heading,
        content: remainingContent,
        level: sections.length === 0 ? 1 : 2,
      });
    } else if (sections.length > 0) {
      // Append to last section
      const lastSection = sections[sections.length - 1];
      lastSection.content = lastSection.content
        ? lastSection.content + "\n\n" + paragraph
        : paragraph;
    } else {
      // Content before first heading - use first line as title
      const firstLine = paragraph.split("\n")[0];
      title = firstLine.length < 80 ? firstLine : "Imported Document";
      sections.push({
        heading: title,
        content: paragraph,
        level: 1,
      });
    }
  }

  // If no sections found, create one with all content
  if (sections.length === 0) {
    sections.push({
      heading: "Document Content",
      content: rawText,
      level: 1,
    });
    title = "Imported Document";
  }

  // Convert to simple HTML - escape content properly
  const html = sections
    .map(s => {
      const escapedHeading = s.heading.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const escapedContent = s.content
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n\n+/g, "</p><p>")
        .replace(/\n/g, " "); // Single newlines become spaces, not <br>
      return `<h${s.level}>${escapedHeading}</h${s.level}><p>${escapedContent}</p>`;
    })
    .join("");

  return {
    title,
    sections,
    lists: [],
    wordCount,
    rawHtml: html,
    rawText,
  };
}

/**
 * Parse a DOCX file buffer into structured content
 */
export async function parseDocxFile(buffer: Buffer): Promise<ParsedDocContent> {
  // Convert DOCX to HTML
  const result = await mammoth.convertToHtml({ buffer });
  const html = result.value;
  const messages = result.messages;

  // Log any warnings from conversion
  if (messages.length > 0) {
  }

  // Also get raw text for word count
  const textResult = await mammoth.extractRawText({ buffer });
  const rawText = textResult.value;
  const wordCount = rawText.split(/\s+/).filter(Boolean).length;

  // Parse HTML to extract structure
  const sections = extractSections(html);
  const lists = extractLists(html, sections);

  // Extract title (first h1 or first heading)
  const title = sections.length > 0 ? sections[0].heading : "Untitled Document";

  return {
    title,
    sections,
    lists,
    wordCount,
    rawHtml: html,
    rawText,
  };
}

/**
 * Detect file type from buffer and parse accordingly
 */
export async function parseDocument(buffer: Buffer): Promise<ParsedDocContent> {
  // Check if it looks like a DOCX (ZIP format starts with PK)
  const isDocx = buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;

  if (isDocx) {
    return parseDocxFile(buffer);
  } else {
    // Assume TXT for anything else
    return parseTxtFile(buffer);
  }
}

/**
 * Extract sections (headings + content) from HTML
 */
function extractSections(html: string): Array<{ heading: string; content: string; level: number }> {
  const sections: Array<{ heading: string; content: string; level: number }> = [];

  // Match headings and their content
  const headingRegex = /<h([1-6])>(.*?)<\/h\1>/gi;
  const matches = [...html.matchAll(headingRegex)];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const level = parseInt(match[1]);
    const heading = stripHtml(match[2]);

    // Get content between this heading and the next
    const startIndex = match.index! + match[0].length;
    const endIndex = i < matches.length - 1 ? matches[i + 1].index! : html.length;
    const contentHtml = html.substring(startIndex, endIndex);

    // Extract paragraph content
    const paragraphs = extractParagraphs(contentHtml);
    const content = paragraphs.join("\n\n");

    sections.push({ heading, content, level });
  }

  // If no headings found, treat entire content as one section
  if (sections.length === 0) {
    const paragraphs = extractParagraphs(html);
    if (paragraphs.length > 0) {
      sections.push({
        heading: "Content",
        content: paragraphs.join("\n\n"),
        level: 1,
      });
    }
  }

  return sections;
}

/**
 * Extract paragraphs from HTML
 */
function extractParagraphs(html: string): string[] {
  const paragraphs: string[] = [];
  const pRegex = /<p>(.*?)<\/p>/gis;
  const matches = [...html.matchAll(pRegex)];

  for (const match of matches) {
    const text = stripHtml(match[1]).trim();
    if (text) {
      paragraphs.push(text);
    }
  }

  return paragraphs;
}

/**
 * Extract lists from HTML
 */
function extractLists(
  html: string,
  sections: Array<{ heading: string; content: string; level: number }>
): Array<{ items: string[]; afterSection: number }> {
  const lists: Array<{ items: string[]; afterSection: number }> = [];

  // Match unordered and ordered lists
  const listRegex = /<[ou]l>(.*?)<\/[ou]l>/gis;
  const matches = [...html.matchAll(listRegex)];

  for (const match of matches) {
    const listHtml = match[1];
    const items: string[] = [];

    // Extract list items
    const liRegex = /<li>(.*?)<\/li>/gis;
    const liMatches = [...listHtml.matchAll(liRegex)];

    for (const liMatch of liMatches) {
      const text = stripHtml(liMatch[1]).trim();
      if (text) {
        items.push(text);
      }
    }

    if (items.length > 0) {
      // Find which section this list follows
      const listPosition = match.index!;
      let afterSection = -1;

      for (let i = 0; i < sections.length; i++) {
        const sectionIndex = html.indexOf(`<h${sections[i].level}>`);
        if (sectionIndex < listPosition) {
          afterSection = i;
        }
      }

      lists.push({ items, afterSection });
    }
  }

  return lists;
}

/**
 * Strip HTML tags from a string
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

// ============================================================================
// CONTENT STRUCTURE MAPPING
// ============================================================================

// generateBlockId and generateSlug imported from ./ai/utils (single source of truth)

/**
 * Convert parsed document to CMS content blocks
 */
export function convertToContentBlocks(
  parsed: ParsedDocContent,
  contentType: "hotel" | "article" | "attraction" | "dining" | "district"
): ImportedContent {
  const blocks: ContentBlock[] = [];
  let blockOrder = 0;

  // 1. Hero block from title
  blocks.push({
    id: generateBlockId(),
    type: "hero",
    order: blockOrder++,
    data: {
      title: parsed.title,
      subtitle: parsed.sections.length > 1 ? parsed.sections[1].heading : "",
      overlayText: `Explore ${parsed.title}`,
    },
  });

  // 2. Convert sections to text blocks
  const mainSections = parsed.sections.slice(1); // Skip first (title) section

  for (const section of mainSections) {
    if (section.content.length > 50) {
      // Only include sections with substantial content
      blocks.push({
        id: generateBlockId(),
        type: "text",
        order: blockOrder++,
        data: {
          title: section.heading,
          content: section.content,
        },
      });
    }
  }

  // 3. Extract tips from lists (if any list has "tip" in context or items start with action words)
  const tips: string[] = [];
  const facts: string[] = [];
  const faqs: Array<{ question: string; answer: string }> = [];

  for (const list of parsed.lists) {
    for (const item of list.items) {
      // Detect tips (action-oriented items)
      if (
        item.match(/^(visit|try|book|avoid|don't|make sure|remember|tip:|pro tip:)/i) ||
        item.length > 100
      ) {
        tips.push(item);
      }
      // Detect facts (short informational items)
      else if (item.length < 100 && !item.includes("?")) {
        facts.push(item);
      }
      // Detect Q&A format
      else if (item.includes("?")) {
        const parts = item.split("?");
        if (parts.length >= 2) {
          faqs.push({
            question: parts[0].trim() + "?",
            answer: parts.slice(1).join("?").trim(),
          });
        }
      }
    }
  }

  // 4. Add tips block if we have tips
  if (tips.length > 0) {
    blocks.push({
      id: generateBlockId(),
      type: "tips",
      order: blockOrder++,
      data: {
        tips: tips.slice(0, 10), // Max 10 tips
      },
    });
  }

  // 5. Add FAQ block if we have FAQs
  if (faqs.length > 0) {
    blocks.push({
      id: generateBlockId(),
      type: "faq",
      order: blockOrder++,
      data: {
        faqs: faqs.slice(0, 10), // Max 10 FAQs
      },
    });
  }

  // 6. Add highlights block from first section's key points
  if (facts.length >= 3) {
    blocks.push({
      id: generateBlockId(),
      type: "highlights",
      order: blockOrder++,
      data: {
        items: facts.slice(0, 8), // Max 8 highlights
      },
    });
  }

  // 7. Add CTA block
  blocks.push({
    id: generateBlockId(),
    type: "cta",
    order: blockOrder++,
    data: {
      title: contentType === "hotel" ? "Book Your Stay" : "Plan Your Visit",
      text: `Discover everything ${parsed.title} has to offer`,
      buttonText: contentType === "hotel" ? "Check Availability" : "Learn More",
    },
  });

  // Generate meta content
  const firstParagraph = parsed.sections[0]?.content || "";
  const summary = firstParagraph.substring(0, 300) + (firstParagraph.length > 300 ? "..." : "");
  const metaDescription =
    firstParagraph.substring(0, 155) + (firstParagraph.length > 155 ? "..." : "");

  return {
    title: parsed.title,
    slug: generateSlug(parsed.title),
    metaTitle: `${parsed.title} | Dubai Travel Guide`,
    metaDescription,
    summary,
    content: {
      blocks,
      wordCount: parsed.wordCount,
    },
    quickFacts: facts.slice(0, 5),
    proTips: tips.slice(0, 7),
    faqs: faqs.slice(0, 8),
    status: parsed.wordCount >= 500 ? "ready_for_review" : "draft",
  };
}

// ============================================================================
// MAIN UPLOAD FUNCTION
// ============================================================================

/**
 * Process an uploaded DOCX file and return structured content
 */
export async function processDocUpload(
  buffer: Buffer,
  contentType: "hotel" | "article" | "attraction" | "dining" | "district",
  options?: {
    overrideTitle?: string;
    category?: string;
    locale?: string;
  }
): Promise<DocUploadResult> {
  const warnings: string[] = [];

  try {
    // Parse the document (auto-detects DOCX vs TXT)
    const parsed = await parseDocument(buffer);

    // Warn if word count is low
    if (parsed.wordCount < 500) {
      warnings.push(`Low word count: ${parsed.wordCount} words. Consider adding more content.`);
    }

    // Warn if few sections
    if (parsed.sections.length < 3) {
      warnings.push(
        `Only ${parsed.sections.length} sections found. Consider adding more headings for better structure.`
      );
    }

    // Convert to content blocks
    const content = convertToContentBlocks(parsed, contentType);

    // Apply overrides if provided
    if (options?.overrideTitle) {
      content.title = options.overrideTitle;
      content.slug = generateSlug(options.overrideTitle);
      content.metaTitle = `${options.overrideTitle} | Dubai Travel Guide`;
    }

    return {
      success: true,
      content,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error processing document",
    };
  }
}

/**
 * Batch process multiple DOCX files
 */
export async function processBatchDocUpload(
  files: Array<{ buffer: Buffer; filename: string }>,
  contentType: "hotel" | "article" | "attraction" | "dining" | "district"
): Promise<Array<DocUploadResult & { filename: string }>> {
  const results: Array<DocUploadResult & { filename: string }> = [];

  for (const file of files) {
    const result = await processDocUpload(file.buffer, contentType);
    results.push({ ...result, filename: file.filename });
  }

  const successful = results.filter(r => r.success).length;

  return results;
}

export const docUploadService = {
  parseDocxFile,
  parseTxtFile,
  parseDocument,
  convertToContentBlocks,
  processDocUpload,
  processBatchDocUpload,
};

export default docUploadService;
