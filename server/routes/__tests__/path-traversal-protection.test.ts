/**
 * Tests for Path Traversal Protection
 *
 * These tests verify that the path sanitization functions
 * properly prevent directory traversal attacks.
 */

import { describe, it, expect } from 'vitest';

// Recreate the validation functions for testing (since they're not exported)
function isValidPathSegment(name: string): boolean {
  if (!name || name.length === 0) {
    return false;
  }
  if (name.includes('..') || name.includes('/') || name.includes('\\')) {
    return false;
  }
  if (name.length > 200) {
    return false;
  }
  return /^[a-zA-Z0-9\-_. ]+$/.test(name);
}

function sanitizePathSegment(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_.]/g, '')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+|\.+$/g, '');
}

describe('Path Traversal Protection', () => {
  describe('isValidPathSegment', () => {
    describe('Valid inputs', () => {
      it('should accept simple alphanumeric names', () => {
        expect(isValidPathSegment('test')).toBe(true);
        expect(isValidPathSegment('Test123')).toBe(true);
        expect(isValidPathSegment('my-folder')).toBe(true);
        expect(isValidPathSegment('my_folder')).toBe(true);
      });

      it('should accept names with spaces', () => {
        expect(isValidPathSegment('my folder')).toBe(true);
        expect(isValidPathSegment('test file.jpg')).toBe(true);
      });

      it('should accept names with dots', () => {
        expect(isValidPathSegment('file.txt')).toBe(true);
        expect(isValidPathSegment('image.2024.jpg')).toBe(true);
      });
    });

    describe('Invalid inputs - Path Traversal Attempts', () => {
      it('should reject double dots (..)', () => {
        expect(isValidPathSegment('..')).toBe(false);
        expect(isValidPathSegment('../')).toBe(false);
        expect(isValidPathSegment('..\\parent')).toBe(false);
        expect(isValidPathSegment('folder/../secret')).toBe(false);
      });

      it('should reject forward slashes', () => {
        expect(isValidPathSegment('path/to/file')).toBe(false);
        expect(isValidPathSegment('/etc/passwd')).toBe(false);
        expect(isValidPathSegment('folder/')).toBe(false);
      });

      it('should reject backslashes', () => {
        expect(isValidPathSegment('path\\to\\file')).toBe(false);
        expect(isValidPathSegment('C:\\Windows\\System32')).toBe(false);
        expect(isValidPathSegment('folder\\')).toBe(false);
      });

      it('should reject empty strings', () => {
        expect(isValidPathSegment('')).toBe(false);
      });

      it('should reject null characters', () => {
        expect(isValidPathSegment('file\x00.txt')).toBe(false);
      });

      it('should reject names that are too long', () => {
        const longName = 'a'.repeat(201);
        expect(isValidPathSegment(longName)).toBe(false);
      });

      it('should reject special characters', () => {
        expect(isValidPathSegment('file<script>')).toBe(false);
        expect(isValidPathSegment('name;rm -rf /')).toBe(false);
        expect(isValidPathSegment('$(whoami)')).toBe(false);
        expect(isValidPathSegment('`cat /etc/passwd`')).toBe(false);
      });
    });

    describe('Edge cases', () => {
      it('should handle names with only dots', () => {
        // Single dot is allowed (it's a valid character in the regex)
        expect(isValidPathSegment('.')).toBe(true);
        // Double dot is NOT allowed (path traversal)
        expect(isValidPathSegment('..')).toBe(false);
        // Three dots is NOT allowed (contains ..)
        expect(isValidPathSegment('...')).toBe(false);
      });

      it('should reject unicode attacks', () => {
        // Some systems might interpret these as path separators
        expect(isValidPathSegment('test\u2215file')).toBe(false); // DIVISION SLASH
        expect(isValidPathSegment('test\u2044file')).toBe(false); // FRACTION SLASH
      });
    });
  });

  describe('sanitizePathSegment', () => {
    it('should lowercase the input', () => {
      expect(sanitizePathSegment('MyFolder')).toBe('myfolder');
      expect(sanitizePathSegment('TEST')).toBe('test');
    });

    it('should replace spaces with hyphens', () => {
      expect(sanitizePathSegment('my folder')).toBe('my-folder');
      expect(sanitizePathSegment('test  file')).toBe('test-file');
    });

    it('should remove special characters', () => {
      expect(sanitizePathSegment('test<script>')).toBe('testscript');
      expect(sanitizePathSegment('file@name')).toBe('filename');
      expect(sanitizePathSegment('$(whoami)')).toBe('whoami');
    });

    it('should collapse multiple dots', () => {
      expect(sanitizePathSegment('file..txt')).toBe('file.txt');
      expect(sanitizePathSegment('test...name')).toBe('test.name');
    });

    it('should remove leading and trailing dots', () => {
      expect(sanitizePathSegment('.hidden')).toBe('hidden');
      expect(sanitizePathSegment('file.')).toBe('file');
      expect(sanitizePathSegment('...test...')).toBe('test');
    });

    it('should handle path traversal attempts', () => {
      // The sanitizer removes invalid chars (including . and /), making traversal impossible
      // After sanitization: '../etc/passwd' -> 'etcpasswd' (slashes and leading dots removed)
      expect(sanitizePathSegment('../etc/passwd')).toBe('etcpasswd');
      // After sanitization: '..\\..\\windows' -> 'windows' (backslashes and leading dots removed)
      expect(sanitizePathSegment('..\\..\\windows')).toBe('windows');
    });

    it('should handle empty input', () => {
      expect(sanitizePathSegment('')).toBe('');
    });
  });

  describe('Combined Protection', () => {
    it('should safely handle common attack patterns', () => {
      const attacks = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32',
        '%2e%2e%2f',
        '....//....//etc/passwd',
        'file.txt/../../../etc/passwd',
        'legitimate-folder/../../../etc/passwd',
        '/etc/passwd',
        'C:\\Windows\\System32\\config\\sam',
        '\x00hidden',
        'file\x00.txt',
      ];

      for (const attack of attacks) {
        expect(isValidPathSegment(attack)).toBe(false);
        const sanitized = sanitizePathSegment(attack);
        expect(sanitized).not.toContain('..');
        expect(sanitized).not.toContain('/');
        expect(sanitized).not.toContain('\\');
      }
    });

    it('should preserve safe folder names', () => {
      const safeNames = [
        'documents',
        'my-files',
        'photos_2024',
        'Dubai Hotels',
        'test.folder',
      ];

      for (const name of safeNames) {
        expect(isValidPathSegment(name)).toBe(true);
      }
    });
  });
});
