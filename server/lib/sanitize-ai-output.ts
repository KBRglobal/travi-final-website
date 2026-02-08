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
    .replaceAll(SCRIPT_PATTERN, "")
    .replaceAll(EVENT_HANDLER_PATTERN, "")
    .replaceAll(DANGEROUS_ATTRS, "")
    .replaceAll(STYLE_EXPRESSION, "")
    .replaceAll(/<iframe[^>]*>.*?<\/iframe>/gi, "")
    .replaceAll(/<object[^>]*>.*?<\/object>/gi, "")
    .replaceAll(/<embed[^>]*>/gi, "")
    .replaceAll(/<link[^>]*>/gi, "");
}

export function sanitizeText(input: string, maxLength: number = 10000): string {
  if (!input || typeof input !== "string") return "";

  return input
    .replaceAll(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "") // NOSONAR - intentional control char stripping
    .slice(0, maxLength)
    .trim();
}

export function sanitizeForPrompt(input: string, maxLength: number = 500): string {
  if (!input || typeof input !== "string") return "";

  return input
    .replaceAll(/\n{2,}/g, " ")
    .replaceAll(/[<>{}[\]]/g, "")
    .replaceAll(/ignore\s+(all\s+)?(previous|above|prior)/gi, "")
    .replaceAll(/forget\s+(all\s+)?(previous|above|prior)/gi, "")
    .replaceAll(/disregard\s+(all\s+)?(previous|above|prior)/gi, "")
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
    .replaceAll(/[<>{}[\]"'`]/g, "")
    .replaceAll("\n", " ")
    .slice(0, 200)
    .trim();
}
