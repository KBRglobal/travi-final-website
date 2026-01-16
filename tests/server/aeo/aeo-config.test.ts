/**
 * AEO Configuration Tests
 */
import { describe, it, expect } from 'vitest';
import {
  AI_CRAWLERS,
  AI_REFERRERS,
  ANSWER_CAPSULE_CONFIG,
  PLATFORM_PREFERENCES,
  AEO_SCHEMA_TYPES,
  CONTENT_PRIORITY,
  PROGRAMMATIC_TEMPLATES,
  TRAVELER_PERSONAS,
  AEO_LOCALE_PRIORITY,
  AEO_METRICS,
} from '../../../server/aeo/aeo-config';

describe('AI_CRAWLERS', () => {
  it('should have all major AI crawlers defined', () => {
    expect(AI_CRAWLERS).toHaveProperty('GPTBot');
    expect(AI_CRAWLERS).toHaveProperty('PerplexityBot');
    expect(AI_CRAWLERS).toHaveProperty('GoogleExtended');
    expect(AI_CRAWLERS).toHaveProperty('ClaudeBot');
    expect(AI_CRAWLERS).toHaveProperty('BingChat');
    expect(AI_CRAWLERS).toHaveProperty('Gemini');
  });

  it('should have valid user agent patterns', () => {
    expect(AI_CRAWLERS.GPTBot.userAgentPattern.test('GPTBot/1.0')).toBe(true);
    expect(AI_CRAWLERS.PerplexityBot.userAgentPattern.test('PerplexityBot')).toBe(true);
    expect(AI_CRAWLERS.ClaudeBot.userAgentPattern.test('anthropic-ai')).toBe(true);
  });

  it('should have platform mappings for each crawler', () => {
    Object.values(AI_CRAWLERS).forEach((crawler) => {
      expect(crawler).toHaveProperty('platform');
      expect(crawler).toHaveProperty('name');
      expect(crawler).toHaveProperty('priority');
    });
  });
});

describe('AI_REFERRERS', () => {
  it('should have patterns for all major AI platforms', () => {
    expect(AI_REFERRERS).toHaveProperty('chatgpt');
    expect(AI_REFERRERS).toHaveProperty('perplexity');
    expect(AI_REFERRERS).toHaveProperty('google_aio');
    expect(AI_REFERRERS).toHaveProperty('claude');
  });

  it('should match ChatGPT referrers correctly', () => {
    const chatgptPatterns = AI_REFERRERS.chatgpt.patterns;
    expect(chatgptPatterns.some((p) => p.test('https://chatgpt.com/share/abc'))).toBe(true);
    expect(chatgptPatterns.some((p) => p.test('https://chat.openai.com'))).toBe(true);
  });

  it('should match Perplexity referrers correctly', () => {
    const perplexityPatterns = AI_REFERRERS.perplexity.patterns;
    expect(perplexityPatterns.some((p) => p.test('https://perplexity.ai/search'))).toBe(true);
  });
});

describe('ANSWER_CAPSULE_CONFIG', () => {
  it('should have valid word count limits', () => {
    expect(ANSWER_CAPSULE_CONFIG.minWords).toBeGreaterThan(0);
    expect(ANSWER_CAPSULE_CONFIG.maxWords).toBeGreaterThan(ANSWER_CAPSULE_CONFIG.minWords);
    expect(ANSWER_CAPSULE_CONFIG.minWords).toBe(40);
    expect(ANSWER_CAPSULE_CONFIG.maxWords).toBe(60);
  });

  it('should have quality thresholds in correct order', () => {
    const { qualityThresholds } = ANSWER_CAPSULE_CONFIG;
    expect(qualityThresholds.excellent).toBeGreaterThan(qualityThresholds.good);
    expect(qualityThresholds.good).toBeGreaterThan(qualityThresholds.acceptable);
    expect(qualityThresholds.acceptable).toBeGreaterThan(qualityThresholds.needsWork);
  });

  it('should have proper quick answer limits', () => {
    expect(ANSWER_CAPSULE_CONFIG.quickAnswerMinWords).toBe(15);
    expect(ANSWER_CAPSULE_CONFIG.quickAnswerMaxWords).toBe(20);
  });

  it('should enforce factual tone settings', () => {
    expect(ANSWER_CAPSULE_CONFIG.tone).toBe('factual');
    expect(ANSWER_CAPSULE_CONFIG.avoidMarkdown).toBe(true);
    expect(ANSWER_CAPSULE_CONFIG.avoidEmojis).toBe(true);
  });
});

describe('PLATFORM_PREFERENCES', () => {
  it('should have preferences for all major platforms', () => {
    expect(PLATFORM_PREFERENCES).toHaveProperty('chatgpt');
    expect(PLATFORM_PREFERENCES).toHaveProperty('perplexity');
    expect(PLATFORM_PREFERENCES).toHaveProperty('google_aio');
    expect(PLATFORM_PREFERENCES).toHaveProperty('claude');
    expect(PLATFORM_PREFERENCES).toHaveProperty('bing_chat');
    expect(PLATFORM_PREFERENCES).toHaveProperty('gemini');
  });

  it('should have citation triggers for each platform', () => {
    Object.values(PLATFORM_PREFERENCES).forEach((platform) => {
      expect(platform.citationTriggers).toBeDefined();
      expect(Array.isArray(platform.citationTriggers)).toBe(true);
      expect(platform.citationTriggers.length).toBeGreaterThan(0);
    });
  });

  it('should have content types for each platform', () => {
    Object.values(PLATFORM_PREFERENCES).forEach((platform) => {
      expect(platform.contentTypes).toBeDefined();
      expect(Array.isArray(platform.contentTypes)).toBe(true);
    });
  });
});

describe('AEO_SCHEMA_TYPES', () => {
  it('should have all required schema types', () => {
    expect(AEO_SCHEMA_TYPES).toHaveProperty('FAQPage');
    expect(AEO_SCHEMA_TYPES).toHaveProperty('HowTo');
    expect(AEO_SCHEMA_TYPES).toHaveProperty('TouristAttraction');
    expect(AEO_SCHEMA_TYPES).toHaveProperty('Hotel');
    expect(AEO_SCHEMA_TYPES).toHaveProperty('Restaurant');
    expect(AEO_SCHEMA_TYPES).toHaveProperty('BreadcrumbList');
  });

  it('should have applicableTo array for each schema', () => {
    Object.values(AEO_SCHEMA_TYPES).forEach((schema) => {
      expect(schema.applicableTo).toBeDefined();
      expect(Array.isArray(schema.applicableTo)).toBe(true);
    });
  });

  it('should have priority levels for each schema', () => {
    Object.values(AEO_SCHEMA_TYPES).forEach((schema) => {
      expect(schema.priority).toBeDefined();
      expect(schema.priority).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('CONTENT_PRIORITY', () => {
  it('should have three priority tiers', () => {
    expect(CONTENT_PRIORITY).toHaveProperty('tier1');
    expect(CONTENT_PRIORITY).toHaveProperty('tier2');
    expect(CONTENT_PRIORITY).toHaveProperty('tier3');
  });

  it('should have correct priority levels', () => {
    expect(CONTENT_PRIORITY.tier1.priority).toBe('high');
    expect(CONTENT_PRIORITY.tier2.priority).toBe('medium');
    expect(CONTENT_PRIORITY.tier3.priority).toBe('normal');
  });

  it('should have AI value for each tier', () => {
    expect(CONTENT_PRIORITY.tier1.aiValue).toBe('Maximum');
    expect(CONTENT_PRIORITY.tier2.aiValue).toBe('High');
    expect(CONTENT_PRIORITY.tier3.aiValue).toBe('Medium');
  });
});

describe('PROGRAMMATIC_TEMPLATES', () => {
  it('should have common template types', () => {
    expect(PROGRAMMATIC_TEMPLATES).toHaveProperty('comparison');
    expect(PROGRAMMATIC_TEMPLATES).toHaveProperty('bestTime');
    expect(PROGRAMMATIC_TEMPLATES).toHaveProperty('costGuide');
    expect(PROGRAMMATIC_TEMPLATES).toHaveProperty('faqHub');
    expect(PROGRAMMATIC_TEMPLATES).toHaveProperty('topList');
  });

  it('should have pattern and variables for each template', () => {
    Object.values(PROGRAMMATIC_TEMPLATES).forEach((template) => {
      expect(template.pattern).toBeDefined();
      expect(typeof template.pattern).toBe('string');
      expect(template.variables).toBeDefined();
      expect(typeof template.variables).toBe('object');
    });
  });
});

describe('TRAVELER_PERSONAS', () => {
  it('should have all 8 traveler personas', () => {
    expect(Object.keys(TRAVELER_PERSONAS).length).toBe(8);
    expect(TRAVELER_PERSONAS).toHaveProperty('luxurySeeker');
    expect(TRAVELER_PERSONAS).toHaveProperty('familyTraveler');
    expect(TRAVELER_PERSONAS).toHaveProperty('budgetExplorer');
    expect(TRAVELER_PERSONAS).toHaveProperty('adventureSeeker');
    expect(TRAVELER_PERSONAS).toHaveProperty('cultureEnthusiast');
    expect(TRAVELER_PERSONAS).toHaveProperty('businessTraveler');
    expect(TRAVELER_PERSONAS).toHaveProperty('soloExplorer');
    expect(TRAVELER_PERSONAS).toHaveProperty('honeymoonCouple');
  });

  it('should have keywords for each persona', () => {
    Object.values(TRAVELER_PERSONAS).forEach((persona) => {
      expect(persona.keywords).toBeDefined();
      expect(Array.isArray(persona.keywords)).toBe(true);
      expect(persona.keywords.length).toBeGreaterThan(0);
    });
  });

  it('should have price range for each persona', () => {
    Object.values(TRAVELER_PERSONAS).forEach((persona) => {
      expect(persona.priceRange).toBeDefined();
    });
  });
});

describe('AEO_LOCALE_PRIORITY', () => {
  it('should have English and Arabic as tier 1', () => {
    expect(AEO_LOCALE_PRIORITY.tier1).toContain('en');
    expect(AEO_LOCALE_PRIORITY.tier1).toContain('ar');
  });

  it('should have secondary markets in tier 2', () => {
    expect(AEO_LOCALE_PRIORITY.tier2).toContain('hi');
    expect(AEO_LOCALE_PRIORITY.tier2).toContain('zh');
    expect(AEO_LOCALE_PRIORITY.tier2).toContain('ru');
  });
});

describe('AEO_METRICS', () => {
  it('should have year 1 targets', () => {
    expect(AEO_METRICS.targets.year1).toBeDefined();
    expect(AEO_METRICS.targets.year1.aiTrafficShare).toBeDefined();
    expect(AEO_METRICS.targets.year1.citationsPerMonth).toBeGreaterThan(0);
  });

  it('should have GA4 tracking configuration', () => {
    expect(AEO_METRICS.tracking.ga4).toBeDefined();
    expect(AEO_METRICS.tracking.ga4.sourceFilter).toBeDefined();
    expect(Array.isArray(AEO_METRICS.tracking.ga4.sourceFilter)).toBe(true);
  });
});
