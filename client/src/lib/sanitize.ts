import DOMPurify from 'dompurify';

/**
 * DOMPurify configuration for HTML sanitization
 * Prevents XSS attacks while allowing safe HTML elements
 */
const defaultConfig = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'pre', 'code',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'div', 'span', 'figure', 'figcaption', 'iframe'
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'class', 'id', 'target', 'rel',
    'width', 'height', 'style', 'data-*', 'loading',
    'allow', 'allowfullscreen', 'frameborder', 'scrolling'
  ],
  ALLOW_DATA_ATTR: true,
  ADD_ATTR: ['target'], // Allow target="_blank"
  FORBID_TAGS: ['script', 'style', 'form', 'input', 'button', 'textarea', 'select'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur']
};

/**
 * Sanitize HTML content to prevent XSS attacks
 * Uses DOMPurify with a safe configuration
 *
 * @param dirty - The HTML string to sanitize
 * @returns Sanitized HTML string
 *
 * @example
 * ```tsx
 * import { sanitizeHTML } from '@/lib/sanitize';
 *
 * <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(content) }} />
 * ```
 */
export function sanitizeHTML(dirty: string): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, defaultConfig);
}

/**
 * Strict sanitization for user-generated content
 * Only allows basic formatting tags, no links or images
 *
 * @param dirty - The HTML string to sanitize
 * @returns Strictly sanitized HTML string
 */
export function sanitizeHTMLStrict(dirty: string): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's'],
    ALLOWED_ATTR: []
  });
}

/**
 * Sanitize HTML for comments/reviews
 * Allows links but with nofollow
 *
 * @param dirty - The HTML string to sanitize
 * @returns Sanitized HTML string safe for comments
 */
export function sanitizeComment(dirty: string): string {
  if (!dirty) return '';

  const sanitized = DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a'],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel']
  });

  // Ensure all links have rel="nofollow noopener"
  return sanitized.replace(
    /<a([^>]*)>/gi,
    '<a$1 rel="nofollow noopener" target="_blank">'
  );
}

/**
 * Strip all HTML tags, leaving only text content
 *
 * @param dirty - The HTML string to strip
 * @returns Plain text without any HTML
 */
export function stripHTML(dirty: string): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
}

/**
 * Check if a string contains potentially dangerous HTML
 *
 * @param html - The HTML string to check
 * @returns true if the HTML contains dangerous content
 */
export function containsDangerousHTML(html: string): boolean {
  if (!html) return false;

  const dangerous = [
    /<script\b/i,
    /javascript:/i,
    /on\w+\s*=/i,  // Event handlers like onclick=, onerror=
    /<iframe\b/i,
    /<object\b/i,
    /<embed\b/i,
    /data:/i       // Data URLs can be used for attacks
  ];

  return dangerous.some(pattern => pattern.test(html));
}
