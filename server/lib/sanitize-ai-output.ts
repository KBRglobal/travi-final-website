/**
 * AI Output Sanitization
 * Phase 16: AI output is untrusted input - sanitize before storage/render
 */

const SCRIPT_PATTERN = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const EVENT_HANDLER_PATTERN = /\s*on\w+\s*=\s*["'][^"']*["']/gi;
const DANGEROUS_ATTRS = /\s*(javascript:|data:|vbscript:)/gi;
const STYLE_EXPRESSION = /expression\s*\([^)]*\)/gi;

export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== "string") return "";

  return input
    .replace(SCRIPT_PATTERN, "")
    .replace(EVENT_HANDLER_PATTERN, "")
    .replace(DANGEROUS_ATTRS, "")
    .replace(STYLE_EXPRESSION, "")
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, "")
    .replace(/<object[^>]*>.*?<\/object>/gi, "")
    .replace(/<embed[^>]*>/gi, "")
    .replace(/<link[^>]*>/gi, "");
}

export function sanitizeText(input: string, maxLength: number = 10000): string {
  if (!input || typeof input !== "string") return "";

  return input
    .replace(new RegExp(String.raw`[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]`, "g"), "")
    .slice(0, maxLength)
    .trim();
}

export function sanitizeForPrompt(input: string, maxLength: number = 500): string {
  if (!input || typeof input !== "string") return "";

  return input
    .replace(/\n{2,}/g, " ")
    .replace(/[<>{}[\]]/g, "")
    .replace(/ignore\s+(all\s+)?(previous|above|prior)/gi, "")
    .replace(/forget\s+(all\s+)?(previous|above|prior)/gi, "")
    .replace(/disregard\s+(all\s+)?(previous|above|prior)/gi, "")
    .slice(0, maxLength)
    .trim();
}

export interface ContentBlock {
  type: string;
  content?: string;
  text?: string;
  html?: string;
  [key: string]: unknown;
}

export function sanitizeContentBlocks(blocks: unknown[]): ContentBlock[] {
  if (!Array.isArray(blocks)) return [];

  return blocks.map(block => {
    if (typeof block !== "object" || block === null) {
      return { type: "text", content: "" };
    }

    const b = block as Record<string, unknown>;
    const sanitized: ContentBlock = {
      type: typeof b.type === "string" ? b.type : "text",
    };

    if (typeof b.content === "string") {
      sanitized.content = sanitizeHtml(b.content);
    }
    if (typeof b.text === "string") {
      sanitized.text = sanitizeText(b.text);
    }
    if (typeof b.html === "string") {
      sanitized.html = sanitizeHtml(b.html);
    }

    // Copy other safe properties
    for (const [key, value] of Object.entries(b)) {
      if (!["type", "content", "text", "html"].includes(key)) {
        if (typeof value === "string") {
          sanitized[key] = sanitizeText(value, 1000);
        } else if (typeof value === "number" || typeof value === "boolean") {
          sanitized[key] = value;
        } else if (Array.isArray(value)) {
          sanitized[key] = value.slice(0, 100);
        }
      }
    }

    return sanitized;
  });
}

export function sanitizeEntityName(name: string): string {
  if (!name || typeof name !== "string") return "";

  return name
    .replace(/[<>{}[\]"'`]/g, "")
    .replace(/\n/g, " ")
    .slice(0, 200)
    .trim();
}
