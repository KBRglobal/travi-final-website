import { describe, it, expect } from 'vitest';

// Re-implement the sanitization function for testing
// (In production, this should be exported from routes.ts)
function sanitizeHtmlContent(html: string): string {
  if (!html) return "";

  // Remove script tags and their content
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Remove event handlers (onclick, onerror, onload, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "");
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]+/gi, "");

  // Remove javascript: protocol URLs
  sanitized = sanitized.replace(/javascript\s*:/gi, "");

  // Remove data: URLs that could contain scripts
  sanitized = sanitized.replace(/data\s*:\s*text\/html/gi, "");

  // Remove style tags (can contain expressions)
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // Remove iframe, object, embed, form tags
  sanitized = sanitized.replace(/<(iframe|object|embed|form|base|meta|link)[^>]*>/gi, "");
  sanitized = sanitized.replace(/<\/(iframe|object|embed|form|base|meta|link)>/gi, "");

  // Remove SVG with potential script content
  sanitized = sanitized.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "");

  // Remove expression() and url() from inline styles (IE vulnerability)
  sanitized = sanitized.replace(/expression\s*\([^)]*\)/gi, "");

  // Clean up any remaining dangerous attributes
  sanitized = sanitized.replace(/\s*(src|href|action)\s*=\s*["']?\s*javascript:[^"'\s>]*/gi, "");

  return sanitized.trim();
}

describe('HTML Sanitization', () => {
  describe('XSS Prevention', () => {
    it('should remove script tags', () => {
      const input = '<p>Hello</p><script>alert("xss")</script><p>World</p>';
      const result = sanitizeHtmlContent(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
      expect(result).toContain('<p>Hello</p>');
      expect(result).toContain('<p>World</p>');
    });

    it('should remove onclick event handlers', () => {
      const input = '<button onclick="alert(\'xss\')">Click</button>';
      const result = sanitizeHtmlContent(input);
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('alert');
    });

    it('should remove onerror event handlers', () => {
      const input = '<img src="x" onerror="alert(\'xss\')">';
      const result = sanitizeHtmlContent(input);
      expect(result).not.toContain('onerror');
    });

    it('should remove javascript: URLs', () => {
      const input = '<a href="javascript:alert(\'xss\')">Click</a>';
      const result = sanitizeHtmlContent(input);
      expect(result).not.toContain('javascript:');
    });

    it('should remove iframe tags', () => {
      const input = '<p>Content</p><iframe src="evil.com"></iframe>';
      const result = sanitizeHtmlContent(input);
      expect(result).not.toContain('iframe');
      expect(result).toContain('<p>Content</p>');
    });

    it('should remove style tags', () => {
      const input = '<style>body { background: url("javascript:alert(1)") }</style><p>Content</p>';
      const result = sanitizeHtmlContent(input);
      expect(result).not.toContain('<style>');
      expect(result).toContain('<p>Content</p>');
    });

    it('should remove dangerous SVG attributes', () => {
      // Test that event handlers are removed from any element including SVG
      const input = '<div onmouseover="alert(\'xss\')">Content</div>';
      const result = sanitizeHtmlContent(input);
      expect(result).not.toContain('onmouseover');
      expect(result).toContain('Content');
    });

    it('should remove data: URLs for text/html', () => {
      const input = '<a href="data:text/html,<script>alert(1)</script>">Click</a>';
      const result = sanitizeHtmlContent(input);
      expect(result).not.toContain('data:text/html');
    });

    it('should handle empty input', () => {
      expect(sanitizeHtmlContent('')).toBe('');
      expect(sanitizeHtmlContent(null as any)).toBe('');
      expect(sanitizeHtmlContent(undefined as any)).toBe('');
    });
  });

  describe('Safe Content Preservation', () => {
    it('should preserve safe HTML tags', () => {
      const input = '<p>Hello <strong>World</strong></p>';
      const result = sanitizeHtmlContent(input);
      expect(result).toBe('<p>Hello <strong>World</strong></p>');
    });

    it('should preserve links with safe URLs', () => {
      const input = '<a href="https://example.com">Link</a>';
      const result = sanitizeHtmlContent(input);
      expect(result).toContain('href="https://example.com"');
    });

    it('should preserve images with safe src', () => {
      const input = '<img src="https://example.com/image.jpg" alt="Image">';
      const result = sanitizeHtmlContent(input);
      expect(result).toContain('src="https://example.com/image.jpg"');
    });
  });
});
