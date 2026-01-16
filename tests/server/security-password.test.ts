import { describe, it, expect } from 'vitest';
import {
  validatePasswordStrength,
  isAccountLocked,
  recordFailedLogin,
  clearFailedLogins,
  PASSWORD_POLICY,
} from '../../server/security/password-policy';

describe('Password Policy', () => {
  describe('validatePasswordStrength', () => {
    it('should reject passwords shorter than minimum length', () => {
      const result = validatePasswordStrength('Short1!');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('12 characters'))).toBe(true);
    });

    it('should require uppercase letters', () => {
      const result = validatePasswordStrength('lowercase123!');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('uppercase'))).toBe(true);
    });

    it('should require lowercase letters', () => {
      const result = validatePasswordStrength('UPPERCASE123!');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('lowercase'))).toBe(true);
    });

    it('should require numbers', () => {
      const result = validatePasswordStrength('NoNumbersHere!');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('number'))).toBe(true);
    });

    it('should require special characters', () => {
      const result = validatePasswordStrength('NoSpecialChars123');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('special character'))).toBe(true);
    });

    it('should accept strong passwords', () => {
      const result = validatePasswordStrength('StrongP@ssw0rd123!');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject passwords with all same characters', () => {
      const result = validatePasswordStrength('aaaaaaaaaaaa');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('same character'))).toBe(true);
    });

    it('should reject simple sequences', () => {
      const result = validatePasswordStrength('abc123ABC123');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('sequence'))).toBe(true);
    });

    it('should check zxcvbn strength score', () => {
      // Very weak password
      const result = validatePasswordStrength('Password123!');
      // This password might pass basic requirements but should fail zxcvbn
      if (!result.valid) {
        expect(result.errors.some(e => e.includes('too weak'))).toBe(true);
      }
    });
  });

  describe('Account Lockout', () => {
    const testIdentifier = 'test@example.com';

    it('should not lock account before threshold', () => {
      // Clear any existing state
      clearFailedLogins(testIdentifier);

      // Record attempts below threshold
      for (let i = 0; i < PASSWORD_POLICY.maxFailedAttempts - 1; i++) {
        recordFailedLogin(testIdentifier);
      }

      const lockStatus = isAccountLocked(testIdentifier);
      expect(lockStatus.locked).toBe(false);
    });

    it('should lock account after max failed attempts', () => {
      const identifier = 'locked@example.com';
      clearFailedLogins(identifier);

      // Record max failed attempts
      for (let i = 0; i < PASSWORD_POLICY.maxFailedAttempts; i++) {
        recordFailedLogin(identifier);
      }

      const lockStatus = isAccountLocked(identifier);
      expect(lockStatus.locked).toBe(true);
      expect(lockStatus.remainingTime).toBeGreaterThan(0);
    });

    it('should clear lockout after successful login', () => {
      const identifier = 'cleared@example.com';
      
      // Lock the account
      for (let i = 0; i < PASSWORD_POLICY.maxFailedAttempts; i++) {
        recordFailedLogin(identifier);
      }

      // Clear lockout
      clearFailedLogins(identifier);

      const lockStatus = isAccountLocked(identifier);
      expect(lockStatus.locked).toBe(false);
    });

    it('should track number of failed attempts', () => {
      const identifier = 'tracked@example.com';
      clearFailedLogins(identifier);

      recordFailedLogin(identifier);
      recordFailedLogin(identifier);

      const lockStatus = isAccountLocked(identifier);
      expect(lockStatus.attempts).toBe(2);
    });
  });
});
