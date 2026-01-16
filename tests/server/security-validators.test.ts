import { describe, it, expect } from 'vitest';
import {
  sanitizeHtml,
  sanitizeText,
  sanitizeUrl,
  detectSqlInjection,
  detectXss,
  sanitizeFilename,
  removeControlCharacters,
} from '../../server/security/validators';

describe('Security Validators', () => {
  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const input = '<p>Hello</p><script>alert("xss")</script><p>World</p>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
      expect(result).toContain('Hello');
      expect(result).toContain('World');
    });

    it('should preserve safe HTML', () => {
      const input = '<p>Hello <strong>World</strong></p>';
      const result = sanitizeHtml(input);
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
      expect(result).toContain('Hello');
      expect(result).toContain('World');
    });

    it('should remove event handlers', () => {
      const input = '<div onclick="alert(1)">Click</div>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('onclick');
      expect(result).toContain('Click');
    });
  });

  describe('sanitizeText', () => {
    it('should escape HTML entities', () => {
      const input = '<script>alert("xss")</script>';
      const result = sanitizeText(input);
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
      expect(result).not.toContain('<script>');
    });

    it('should handle special characters', () => {
      const input = 'Hello & "World" <test>';
      const result = sanitizeText(input);
      expect(result).toContain('&amp;');
      expect(result).toContain('&quot;');
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
    });
  });

  describe('sanitizeUrl', () => {
    it('should accept valid HTTPS URLs', () => {
      const input = 'https://example.com/path';
      const result = sanitizeUrl(input);
      expect(result).toBe(input);
    });

    it('should reject javascript: URLs', () => {
      const input = 'javascript:alert(1)';
      const result = sanitizeUrl(input);
      expect(result).toBeNull();
    });

    it('should reject data: URLs', () => {
      const input = 'data:text/html,<script>alert(1)</script>';
      const result = sanitizeUrl(input);
      expect(result).toBeNull();
    });

    it('should reject invalid URLs', () => {
      const input = 'not a url';
      const result = sanitizeUrl(input);
      expect(result).toBeNull();
    });
  });

  describe('detectSqlInjection', () => {
    it('should detect SELECT statements', () => {
      const input = "' OR 1=1; SELECT * FROM users --";
      const result = detectSqlInjection(input);
      expect(result).toBe(true);
    });

    it('should detect UNION attacks', () => {
      const input = "' UNION SELECT password FROM users --";
      const result = detectSqlInjection(input);
      expect(result).toBe(true);
    });

    it('should not flag normal text', () => {
      const input = "This is a normal sentence about selection.";
      const result = detectSqlInjection(input);
      expect(result).toBe(false);
    });
  });

  describe('detectXss', () => {
    it('should detect script tags', () => {
      const input = '<script>alert(1)</script>';
      const result = detectXss(input);
      expect(result).toBe(true);
    });

    it('should detect event handlers', () => {
      const input = '<img src=x onerror=alert(1)>';
      const result = detectXss(input);
      expect(result).toBe(true);
    });

    it('should detect javascript: URLs', () => {
      const input = '<a href="javascript:alert(1)">Click</a>';
      const result = detectXss(input);
      expect(result).toBe(true);
    });

    it('should not flag normal HTML', () => {
      const input = '<p>Hello World</p>';
      const result = detectXss(input);
      expect(result).toBe(false);
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove dangerous characters', () => {
      const input = '../../../etc/passwd';
      const result = sanitizeFilename(input);
      expect(result).not.toContain('..');
      expect(result).not.toContain('/');
    });

    it('should preserve extension', () => {
      const input = 'my-file.jpg';
      const result = sanitizeFilename(input);
      expect(result).toContain('.jpg');
    });

    it('should handle special characters', () => {
      const input = 'file with spaces & special!@#.pdf';
      const result = sanitizeFilename(input);
      expect(result).not.toContain(' ');
      expect(result).not.toContain('&');
      expect(result).toContain('.pdf');
    });
  });

  describe('removeControlCharacters', () => {
    it('should remove null bytes', () => {
      const input = 'Hello\0World';
      const result = removeControlCharacters(input);
      expect(result).not.toContain('\0');
      expect(result).toBe('HelloWorld');
    });

    it('should preserve newlines and tabs', () => {
      const input = 'Hello\nWorld\tTest';
      const result = removeControlCharacters(input);
      expect(result).toContain('\n');
      expect(result).toContain('\t');
    });
  });
});
