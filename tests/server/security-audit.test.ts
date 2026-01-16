import { describe, it, expect } from 'vitest';
import {
  maskPii,
  SecurityEventType,
  SecuritySeverity,
} from '../../server/security/audit-logger';

describe('Security Audit Logger', () => {
  describe('maskPii', () => {
    it('should mask email addresses', () => {
      const email = 'user@example.com';
      const masked = maskPii(email, 'email');
      expect(masked).toContain('@example.com');
      expect(masked).toContain('***');
      expect(masked).not.toContain('user');
    });

    it('should mask phone numbers', () => {
      const phone = '1234567890';
      const masked = maskPii(phone, 'phone');
      expect(masked).toContain('***');
      expect(masked).toContain('7890'); // Last 4 digits
      expect(masked).not.toContain('1234');
    });

    it('should mask IPv4 addresses', () => {
      const ip = '192.168.1.100';
      const masked = maskPii(ip, 'ip');
      expect(masked).toContain('192.168.1');
      expect(masked).toContain('***');
      expect(masked).not.toContain('100');
    });

    it('should mask IPv6 addresses', () => {
      const ip = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
      const masked = maskPii(ip, 'ip');
      expect(masked).toContain('***');
      expect(masked).not.toContain('7334');
    });

    it('should handle short emails', () => {
      const email = 'a@b.com';
      const masked = maskPii(email, 'email');
      expect(masked).toContain('@b.com');
      expect(masked).toContain('***');
    });

    it('should handle short phone numbers', () => {
      const phone = '123';
      const masked = maskPii(phone, 'phone');
      expect(masked).toBe('***');
    });
  });

  describe('SecurityEventType', () => {
    it('should have login event types', () => {
      expect(SecurityEventType.LOGIN_SUCCESS).toBeDefined();
      expect(SecurityEventType.LOGIN_FAILED).toBeDefined();
      expect(SecurityEventType.LOGOUT).toBeDefined();
    });

    it('should have attack detection event types', () => {
      expect(SecurityEventType.SQL_INJECTION_ATTEMPT).toBeDefined();
      expect(SecurityEventType.XSS_ATTEMPT).toBeDefined();
      expect(SecurityEventType.BRUTE_FORCE_ATTEMPT).toBeDefined();
    });

    it('should have permission event types', () => {
      expect(SecurityEventType.PERMISSION_DENIED).toBeDefined();
      expect(SecurityEventType.UNAUTHORIZED_ACCESS).toBeDefined();
    });
  });

  describe('SecuritySeverity', () => {
    it('should have severity levels', () => {
      expect(SecuritySeverity.LOW).toBe('low');
      expect(SecuritySeverity.MEDIUM).toBe('medium');
      expect(SecuritySeverity.HIGH).toBe('high');
      expect(SecuritySeverity.CRITICAL).toBe('critical');
    });
  });
});
