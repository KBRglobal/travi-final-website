/**
 * Test Setup File
 * Runs before each test file to configure the test environment
 */

import { vi } from 'vitest';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.SESSION_SECRET = 'test-session-secret-for-testing-only';
process.env.ISSUER_URL = 'https://test.replit.com/oidc';

// Mock console methods to reduce test noise (can be overridden per test)
const originalConsole = { ...console };

beforeAll(() => {
  // Silence console during tests unless DEBUG is set
  if (!process.env.DEBUG) {
    console.log = vi.fn();
    console.info = vi.fn();
    console.warn = vi.fn();
    // Keep console.error for debugging test failures
  }
});

afterAll(() => {
  // Restore console
  Object.assign(console, originalConsole);
});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Global test utilities
declare global {
  namespace Vi {
    interface JestAssertion<T = unknown> {
      toBeWithinRange(floor: number, ceiling: number): void;
    }
  }
}

// Custom matcher example
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});
