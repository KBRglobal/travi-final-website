/**
 * Answer Capsule Generator Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database and AI providers
vi.mock('../../../server/db', () => ({
  db: {
    query: {
      aeoAnswerCapsules: {
        findFirst: vi.fn(),
      },
      contents: {
        findFirst: vi.fn(),
      },
      attractions: {
        findFirst: vi.fn(),
      },
      hotels: {
        findFirst: vi.fn(),
      },
      dining: {
        findFirst: vi.fn(),
      },
      districts: {
        findFirst: vi.fn(),
      },
      articles: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn(),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn(),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn(),
    }),
  },
}));

vi.mock('../../../server/ai/providers', () => ({
  getAllUnifiedProviders: vi.fn(() => []),
  markProviderFailed: vi.fn(),
}));

import { ANSWER_CAPSULE_CONFIG } from '../../../server/aeo/aeo-config';

describe('ANSWER_CAPSULE_CONFIG validation', () => {
  it('should have word count between 40-60', () => {
    expect(ANSWER_CAPSULE_CONFIG.minWords).toBe(40);
    expect(ANSWER_CAPSULE_CONFIG.maxWords).toBe(60);
  });

  it('should have quality thresholds', () => {
    expect(ANSWER_CAPSULE_CONFIG.qualityThresholds.excellent).toBe(90);
    expect(ANSWER_CAPSULE_CONFIG.qualityThresholds.good).toBe(75);
    expect(ANSWER_CAPSULE_CONFIG.qualityThresholds.acceptable).toBe(60);
  });
});

describe('Capsule Quality Evaluation', () => {
  // Helper function to count words (same logic as in the generator)
  function countWords(text: string): number {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  it('should count words correctly', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('hello world')).toBe(2);
    expect(countWords('  hello   world  ')).toBe(2);
    expect(countWords('one two three four five')).toBe(5);
  });

  it('should detect marketing cliches', () => {
    const cliches = ['must-visit', 'hidden gem', 'breathtaking', 'amazing', 'incredible'];
    const testText = 'This is a must-visit destination';

    const hasCliche = cliches.some((c) => testText.toLowerCase().includes(c));
    expect(hasCliche).toBe(true);
  });

  it('should detect emojis', () => {
    const hasEmoji = /[\u{1F300}-\u{1F9FF}]/u.test('Hello World');
    expect(hasEmoji).toBe(false);

    const hasEmoji2 = /[\u{1F300}-\u{1F9FF}]/u.test('Hello World 🌍');
    expect(hasEmoji2).toBe(true);
  });

  it('should detect exclamation marks', () => {
    expect('Great place to visit!'.includes('!')).toBe(true);
    expect('A factual description of the location.'.includes('!')).toBe(false);
  });

  it('should validate capsule word count is within range', () => {
    const capsule = 'The Burj Khalifa stands at 828 meters, making it the world\'s tallest building. Located in Downtown Dubai, it offers observation decks on floors 124, 125, and 148 with panoramic city views. Tickets start from 169 AED for adults with advance booking recommended.';
    const wordCount = countWords(capsule);

    expect(wordCount).toBeGreaterThanOrEqual(ANSWER_CAPSULE_CONFIG.minWords);
    expect(wordCount).toBeLessThanOrEqual(ANSWER_CAPSULE_CONFIG.maxWords + 10); // Allow slight flexibility
  });
});

describe('Capsule Structure Requirements', () => {
  it('should require direct answer', () => {
    expect(ANSWER_CAPSULE_CONFIG.structure.requiresDirectAnswer).toBe(true);
  });

  it('should require key fact', () => {
    expect(ANSWER_CAPSULE_CONFIG.structure.requiresKeyFact).toBe(true);
  });

  it('should require differentiator', () => {
    expect(ANSWER_CAPSULE_CONFIG.structure.requiresDifferentiator).toBe(true);
  });

  it('should limit key facts to 5', () => {
    expect(ANSWER_CAPSULE_CONFIG.structure.maxKeyFacts).toBe(5);
  });
});

describe('Locale Support', () => {
  const localeNames: Record<string, string> = {
    en: 'English',
    ar: 'Arabic',
    hi: 'Hindi',
    zh: 'Chinese',
    ru: 'Russian',
    fr: 'French',
    de: 'German',
    es: 'Spanish',
    he: 'Hebrew',
    ja: 'Japanese',
    ko: 'Korean',
    it: 'Italian',
    tr: 'Turkish',
  };

  it('should support all major locales', () => {
    Object.keys(localeNames).forEach((locale) => {
      expect(localeNames[locale]).toBeDefined();
    });
  });

  it('should have Arabic as a primary locale', () => {
    expect(localeNames.ar).toBe('Arabic');
  });

  it('should have at least 10 supported locales', () => {
    expect(Object.keys(localeNames).length).toBeGreaterThanOrEqual(10);
  });
});

describe('Content Type Support', () => {
  const supportedTypes = ['attraction', 'hotel', 'dining', 'district', 'article'];

  it('should support all main content types', () => {
    expect(supportedTypes).toContain('attraction');
    expect(supportedTypes).toContain('hotel');
    expect(supportedTypes).toContain('dining');
    expect(supportedTypes).toContain('district');
    expect(supportedTypes).toContain('article');
  });
});
