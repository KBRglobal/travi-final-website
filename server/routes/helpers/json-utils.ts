/**
 * JSON Utilities for AI Response Processing
 * Handles markdown-wrapped JSON and common AI response quirks
 */

/**
 * Clean JSON from markdown code blocks
 * DeepSeek and other models sometimes wrap JSON in ```json ... ```
 */
export function cleanJsonFromMarkdown(content: string): string {
  if (!content) return "{}";
  let cleaned = content.trim();
  // Remove markdown code blocks with optional language identifier
  if (cleaned.startsWith("```")) {
    // Find the end of the first line (language identifier line)
    const firstNewline = cleaned.indexOf("\n");
    if (firstNewline !== -1) {
      cleaned = cleaned.substring(firstNewline + 1);
    }
    // Remove trailing ```
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }
  }
  cleaned = cleaned.trim() || "{}";

  // Fix common JSON issues from AI responses:
  // 1. Replace unescaped control characters in strings (newlines, tabs, etc.)
  // This regex finds strings and escapes control characters within them
  cleaned = cleaned.replaceAll(/"([^"\\]|\\.)*"/g, match => {
    return match.replaceAll(new RegExp("[\\x00-\\x1F\\x7F]", "g"), char => {
      const code = char.codePointAt(0)!;
      if (code === 0x09) return String.raw`\t`; // Tab
      if (code === 0x0a) return String.raw`\n`; // Newline
      if (code === 0x0d) return String.raw`\r`; // Carriage return
      return String.raw`\u` + code.toString(16).padStart(4, "0");
    });
  });

  return cleaned;
}

/**
 * Safe JSON parse that handles markdown-wrapped JSON
 * Returns Record<string, unknown> - callers should type assert if needed for specific properties
 */
export function safeParseJson(
  content: string,
  fallback: Record<string, unknown> = {}
): Record<string, unknown> {
  try {
    const cleaned = cleanJsonFromMarkdown(content);
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch (e) {
    return fallback;
  }
}
