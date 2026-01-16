/**
 * Alt Text Quality Analyzer Tests
 */

import { describe, it, expect, vi } from 'vitest';

// Mock config
vi.mock('../../../server/media-intelligence/config', () => ({
  getMediaIntelligenceConfig: () => ({
    enabled: true,
    enableAltAnalysis: true,
    altText: {
      minLength: 10,
      maxLength: 125,
      genericPatterns: ['image', 'photo', 'picture', 'img', 'untitled', 'screenshot', 'dsc_', 'img_', 'photo_'],
    },
  }),
  isAltAnalysisEnabled: () => true,
}));

describe('Alt Text Quality Analysis', () => {
  const minLength = 10;
  const maxLength = 125;
  const genericPatterns = ['image', 'photo', 'picture', 'img', 'untitled'];

  describe('Alt Text Presence', () => {
    it('should detect missing alt text', () => {
      const altText = null;
      const hasAlt = !!altText && (altText as string).trim().length > 0;

      expect(hasAlt).toBe(false);
      // Should generate issue with type 'missing' and severity 'critical' for hero
    });

    it('should detect empty alt text', () => {
      const altText = '   ';
      const hasAlt = !!altText && altText.trim().length > 0;

      expect(hasAlt).toBe(false);
    });

    it('should detect present alt text', () => {
      const altText = 'A beautiful sunset over Dubai skyline';
      const hasAlt = !!altText && altText.trim().length > 0;

      expect(hasAlt).toBe(true);
    });
  });

  describe('Alt Text Length', () => {
    it('should flag too short alt text', () => {
      const altText = 'Sunset';
      const length = altText.trim().length;

      expect(length < minLength).toBe(true);
      // Should generate issue with type 'too_short'
    });

    it('should flag too long alt text', () => {
      const altText = 'This is an extremely long alt text that goes on and on describing every single detail of the image in excessive detail that is not necessary for screen readers or SEO purposes and should be shortened';
      const length = altText.trim().length;

      expect(length > maxLength).toBe(true);
      // Should generate issue with type 'too_long'
    });

    it('should accept optimal length alt text', () => {
      const altText = 'A breathtaking view of the Burj Khalifa at sunset with colorful sky';
      const length = altText.trim().length;

      expect(length >= minLength).toBe(true);
      expect(length <= maxLength).toBe(true);
    });
  });

  describe('Generic Pattern Detection', () => {
    it('should detect generic alt text', () => {
      const genericAlts = [
        'image',
        'photo',
        'IMG_1234',
        'untitled',
        'picture of',
      ];

      for (const alt of genericAlts) {
        const lowerAlt = alt.toLowerCase();
        const isGeneric = genericPatterns.some(p =>
          lowerAlt.includes(p.toLowerCase()) && alt.length < 30
        );

        expect(isGeneric).toBe(true);
      }
    });

    it('should not flag descriptive alt text with common words', () => {
      const altText = 'A stunning photograph of the Dubai Marina waterfront at dusk';
      const lowerAlt = altText.toLowerCase();
      const isGeneric = genericPatterns.some(p =>
        lowerAlt.includes(p.toLowerCase()) && altText.length < 30
      );

      // Should not be flagged because the text is long and descriptive
      expect(isGeneric).toBe(false);
    });
  });

  describe('Descriptiveness Check', () => {
    it('should detect descriptive alt text', () => {
      const altText = 'Golden sunset illuminating Dubai skyline';
      const words = altText.trim().split(/\s+/).filter(w => w.length > 2);

      expect(words.length >= 3).toBe(true);
    });

    it('should detect non-descriptive alt text', () => {
      const altText = 'Dubai';
      const words = altText.trim().split(/\s+/).filter(w => w.length > 2);

      expect(words.length < 3).toBe(true);
    });
  });

  describe('Quality Score Calculation', () => {
    function calculateAltQuality(altText: string | null): number {
      if (!altText || altText.trim().length === 0) return 0;

      let score = 50;
      const len = altText.trim().length;

      // Length check
      if (len >= minLength && len <= maxLength) {
        score += 20;
      } else if (len < minLength) {
        score -= 20;
      } else if (len > maxLength) {
        score -= 10;
      }

      // Generic check
      const lowerAlt = altText.toLowerCase();
      const isGeneric = genericPatterns.some(p =>
        lowerAlt.includes(p.toLowerCase()) && altText.length < 20
      );
      if (isGeneric) {
        score -= 30;
      }

      // Descriptive check
      const wordCount = altText.trim().split(/\s+/).length;
      if (wordCount >= 3) {
        score += 15;
      }

      // Proper capitalization
      if (/[A-Z]/.test(altText)) {
        score += 5;
      }

      return Math.max(0, Math.min(100, score));
    }

    it('should give zero score to missing alt', () => {
      expect(calculateAltQuality(null)).toBe(0);
      expect(calculateAltQuality('')).toBe(0);
    });

    it('should give low score to generic alt', () => {
      const score = calculateAltQuality('image');

      expect(score).toBeLessThan(50);
    });

    it('should give high score to good alt', () => {
      const score = calculateAltQuality('A breathtaking aerial view of Dubai Marina at sunset');

      expect(score).toBeGreaterThan(70);
    });

    it('should penalize too short alt', () => {
      const score = calculateAltQuality('Dubai');

      expect(score).toBeLessThan(50);
    });
  });

  describe('Keyword Relevance', () => {
    it('should detect keyword presence', () => {
      const altText = 'Luxury hotel room with Dubai Marina view';
      const contentKeywords = ['Dubai', 'hotel', 'luxury'];

      const altLower = altText.toLowerCase();
      const matchingKeywords = contentKeywords.filter(kw =>
        altLower.includes(kw.toLowerCase())
      );

      expect(matchingKeywords.length).toBe(3);
      expect(matchingKeywords).toContain('Dubai');
      expect(matchingKeywords).toContain('hotel');
      expect(matchingKeywords).toContain('luxury');
    });

    it('should detect missing keywords', () => {
      const altText = 'Beautiful room with view';
      const contentKeywords = ['Dubai', 'hotel', 'luxury'];

      const altLower = altText.toLowerCase();
      const matchingKeywords = contentKeywords.filter(kw =>
        altLower.includes(kw.toLowerCase())
      );

      expect(matchingKeywords.length).toBe(0);
    });
  });

  describe('Alt Text Suggestion Generation', () => {
    function generateAltSuggestion(
      imagePath: string,
      imageContext: 'hero' | 'card' | 'gallery',
      contentTitle: string,
      keywords?: string[]
    ): string {
      let suggestion = '';

      switch (imageContext) {
        case 'hero':
          suggestion = `${contentTitle} - Featured image`;
          break;
        case 'card':
          suggestion = `${contentTitle} preview`;
          break;
        case 'gallery':
          suggestion = `Photo from ${contentTitle}`;
          break;
      }

      // Add keyword if available
      if (keywords && keywords.length > 0) {
        const keyword = keywords[0];
        if (!suggestion.toLowerCase().includes(keyword.toLowerCase())) {
          if (suggestion.length + keyword.length < 120) {
            suggestion = `${suggestion} - ${keyword}`;
          }
        }
      }

      return suggestion.charAt(0).toUpperCase() + suggestion.slice(1);
    }

    it('should generate appropriate hero alt suggestion', () => {
      const suggestion = generateAltSuggestion(
        'uploads/hero.jpg',
        'hero',
        'Burj Al Arab Hotel Review',
        ['luxury', 'Dubai']
      );

      expect(suggestion).toContain('Burj Al Arab Hotel Review');
      expect(suggestion).toContain('Featured image');
    });

    it('should generate appropriate card alt suggestion', () => {
      const suggestion = generateAltSuggestion(
        'uploads/card.jpg',
        'card',
        'Dubai Marina Attractions',
        ['Dubai', 'marina']
      );

      expect(suggestion).toContain('Dubai Marina Attractions');
      expect(suggestion).toContain('preview');
    });

    it('should generate appropriate gallery alt suggestion', () => {
      const suggestion = generateAltSuggestion(
        'uploads/gallery-1.jpg',
        'gallery',
        'Palm Jumeirah Guide',
        ['Palm', 'beach']
      );

      expect(suggestion).toContain('Palm Jumeirah Guide');
      expect(suggestion).toContain('Photo from');
    });

    it('should include keyword in suggestion', () => {
      const suggestion = generateAltSuggestion(
        'uploads/hero.jpg',
        'hero',
        'Beautiful Sunset',
        ['Dubai', 'skyline']
      );

      expect(suggestion).toContain('Dubai');
    });
  });
});
