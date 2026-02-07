import DOMPurify from "isomorphic-dompurify";

export function sanitizeHtml(html: string): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "em",
      "u",
      "s",
      "a",
      "ul",
      "ol",
      "li",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "blockquote",
      "pre",
      "code",
      "img",
      "figure",
      "figcaption",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "span",
      "div",
      "hr",
      "sub",
      "sup",
    ],
    ALLOWED_ATTR: [
      "href",
      "target",
      "rel",
      "src",
      "alt",
      "title",
      "class",
      "id",
      "width",
      "height",
      "style",
      "data-*",
    ],
    ALLOW_DATA_ATTR: true,
  });
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replaceAll(/[&<>"']/g, m => map[m] || m);
}

/**
 * Sanitize plain text by escaping HTML entities and removing control characters
 */
export function sanitizeText(text: string): string {
  if (!text) return "";
  // Escape HTML entities
  let result = escapeHtml(text);
  // Remove control characters except newlines and tabs
  result = result.replaceAll(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  return result.trim();
}

/**
 * Sanitize URL by validating and removing dangerous protocols
 */
export function sanitizeUrl(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // Block dangerous protocols
  const dangerousProtocols = ["javascript:", "data:", "vbscript:", "file:"];
  const lowerUrl = trimmed.toLowerCase();
  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return null;
    }
  }

  try {
    const parsed = new URL(trimmed);
    // Only allow http, https, mailto, tel
    if (!["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol)) {
      return null;
    }
    return trimmed;
  } catch {
    // Relative URLs are OK
    if (trimmed.startsWith("/") || trimmed.startsWith("#") || trimmed.startsWith("?")) {
      return trimmed;
    }
    return null;
  }
}

/**
 * Detect potential SQL injection patterns
 */
export function detectSqlInjection(input: string): boolean {
  if (!input) return false;
  const patterns = [
    /['"]\s*(OR|AND)\s*['"]/i,
    /;\s*(DROP|DELETE|UPDATE|INSERT|ALTER|TRUNCATE)/i,
    /UNION\s+(ALL\s+)?SELECT/i,
    /--\s*$/m,
    /\/\*.*\*\//,
    /\bEXEC\s*\(/i,
    /\bxp_/i,
    /(SLEEP|WAITFOR|BENCHMARK)\s*\(/i,
    /\b(1=1|1='1'|'1'='1')\b/,
  ];

  return patterns.some(pattern => pattern.test(input));
}

/**
 * Detect potential XSS patterns
 */
export function detectXss(input: string): boolean {
  if (!input) return false;
  const patterns = [
    /<script[^>]*>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe[^>]*>/i,
    /<object[^>]*>/i,
    /<embed[^>]*>/i,
    /<svg[^>]*onload/i,
    /expression\s*\(/i,
    /url\s*\(\s*['"]?\s*data:/i,
  ];

  return patterns.some(pattern => pattern.test(input));
}

/**
 * Sanitize filename for safe file system operations
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return "";

  // Remove path traversal attempts
  let safe = filename.replaceAll("..", "");

  // Remove path separators
  safe = safe.replaceAll(/[/\\]/g, "");

  // Remove dangerous and special characters (keep only alphanumeric, dash, underscore, dot)
  safe = safe.replaceAll(/[^a-zA-Z0-9._-]/g, "");

  // Remove leading/trailing dots and spaces
  safe = safe.replaceAll(/^[\s.]+|[\s.]+$/g, "");

  // Limit length
  if (safe.length > 255) {
    const ext = safe.lastIndexOf(".");
    if (ext > 0) {
      const extension = safe.slice(ext);
      safe = safe.slice(0, 255 - extension.length) + extension;
    } else {
      safe = safe.slice(0, 255);
    }
  }

  return safe || "unnamed";
}

/**
 * Remove control characters from text, preserving newlines and tabs
 */
export function removeControlCharacters(text: string): string {
  if (!text) return "";
  // Remove ASCII control characters except \t (0x09), \n (0x0A), \r (0x0D)
  return text.replaceAll(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}
