/**
 * Traffic Source Detection - Unit Tests
 */
import { describe, it, expect } from 'vitest';
import {
  detectTrafficSource,
  isAITraffic,
  getChannelDisplayName,
} from '../../../server/traffic-intel/source-detection';

describe('detectTrafficSource', () => {
  describe('Direct Traffic', () => {
    it('should detect direct traffic with no referrer or UTM', () => {
      const result = detectTrafficSource({});

      expect(result.channel).toBe('direct');
      expect(result.source).toBe('direct');
      expect(result.medium).toBe('none');
    });

    it('should have lower confidence for direct traffic', () => {
      const result = detectTrafficSource({});

      expect(result.confidence).toBeLessThanOrEqual(0.5);
    });
  });

  describe('Organic Search', () => {
    it('should detect Google organic search', () => {
      const result = detectTrafficSource({
        referrer: 'https://www.google.com/search?q=test',
      });

      expect(result.channel).toBe('organic_search');
      expect(result.searchEngine).toBe('google');
      expect(result.source).toBe('google');
    });

    it('should detect Bing organic search', () => {
      const result = detectTrafficSource({
        referrer: 'https://www.bing.com/search?q=test',
      });

      expect(result.channel).toBe('organic_search');
      expect(result.searchEngine).toBe('bing');
    });

    it('should detect DuckDuckGo organic search', () => {
      const result = detectTrafficSource({
        referrer: 'https://duckduckgo.com/?q=test',
      });

      expect(result.channel).toBe('organic_search');
      expect(result.searchEngine).toBe('duckduckgo');
    });

    it('should detect Yahoo organic search', () => {
      const result = detectTrafficSource({
        referrer: 'https://search.yahoo.com/search?p=test',
      });

      expect(result.channel).toBe('organic_search');
      expect(result.searchEngine).toBe('yahoo');
    });
  });

  describe('AI Search', () => {
    it('should detect ChatGPT from user agent', () => {
      const result = detectTrafficSource({
        userAgent: 'ChatGPT-User',
      });

      expect(result.channel).toBe('ai_search');
      expect(result.aiPlatform).toBe('chatgpt');
    });

    it('should detect GPTBot from user agent', () => {
      const result = detectTrafficSource({
        userAgent: 'GPTBot/1.0',
      });

      expect(result.channel).toBe('ai_search');
      expect(result.aiPlatform).toBe('chatgpt');
    });

    it('should detect Perplexity from user agent', () => {
      const result = detectTrafficSource({
        userAgent: 'PerplexityBot',
      });

      expect(result.channel).toBe('ai_search');
      expect(result.aiPlatform).toBe('perplexity');
    });

    it('should detect Claude from user agent', () => {
      const result = detectTrafficSource({
        userAgent: 'anthropic-ai',
      });

      expect(result.channel).toBe('ai_search');
      expect(result.aiPlatform).toBe('claude');
    });

    it('should detect ChatGPT from referrer', () => {
      const result = detectTrafficSource({
        referrer: 'https://chat.openai.com/share/abc',
      });

      expect(result.channel).toBe('ai_search');
      expect(result.aiPlatform).toBe('chatgpt');
    });

    it('should detect Perplexity from referrer', () => {
      const result = detectTrafficSource({
        referrer: 'https://perplexity.ai/search/test',
      });

      expect(result.channel).toBe('ai_search');
      expect(result.aiPlatform).toBe('perplexity');
    });

    it('should detect Gemini from referrer', () => {
      const result = detectTrafficSource({
        referrer: 'https://gemini.google.com/',
      });

      expect(result.channel).toBe('ai_search');
      expect(result.aiPlatform).toBe('gemini');
    });
  });

  describe('Social Traffic', () => {
    it('should detect Facebook traffic', () => {
      const result = detectTrafficSource({
        referrer: 'https://www.facebook.com/posts/123',
      });

      expect(result.channel).toBe('social');
      expect(result.socialPlatform).toBe('facebook');
    });

    it('should detect Twitter/X traffic', () => {
      const result = detectTrafficSource({
        referrer: 'https://twitter.com/user/status/123',
      });

      expect(result.channel).toBe('social');
      expect(result.socialPlatform).toBe('twitter');
    });

    it('should detect LinkedIn traffic', () => {
      const result = detectTrafficSource({
        referrer: 'https://www.linkedin.com/posts/user',
      });

      expect(result.channel).toBe('social');
      expect(result.socialPlatform).toBe('linkedin');
    });

    it('should detect Reddit traffic', () => {
      const result = detectTrafficSource({
        referrer: 'https://www.reddit.com/r/travel',
      });

      expect(result.channel).toBe('social');
      expect(result.socialPlatform).toBe('reddit');
    });
  });

  describe('Paid Traffic', () => {
    it('should detect paid traffic from CPC UTM', () => {
      const result = detectTrafficSource({
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'summer_sale',
      });

      expect(result.channel).toBe('paid');
      expect(result.source).toBe('google');
      expect(result.campaign).toBe('summer_sale');
    });

    it('should detect paid traffic from PPC UTM', () => {
      const result = detectTrafficSource({
        utmSource: 'facebook',
        utmMedium: 'ppc',
      });

      expect(result.channel).toBe('paid');
      expect(result.source).toBe('facebook');
    });

    it('should prioritize paid over organic', () => {
      const result = detectTrafficSource({
        referrer: 'https://www.google.com/search?q=test',
        utmMedium: 'cpc',
        utmSource: 'google',
      });

      expect(result.channel).toBe('paid');
    });
  });

  describe('Email Traffic', () => {
    it('should detect email from Gmail referrer', () => {
      const result = detectTrafficSource({
        referrer: 'https://mail.google.com/mail/u/0/',
      });

      expect(result.channel).toBe('email');
    });

    it('should detect email from Outlook referrer', () => {
      const result = detectTrafficSource({
        referrer: 'https://outlook.live.com/mail/',
      });

      expect(result.channel).toBe('email');
    });

    it('should detect email from UTM source', () => {
      const result = detectTrafficSource({
        utmSource: 'newsletter',
        utmMedium: 'email',
      });

      expect(result.channel).toBe('email');
    });
  });

  describe('Referral Traffic', () => {
    it('should detect generic referral', () => {
      const result = detectTrafficSource({
        referrer: 'https://blog.example.com/article',
      });

      expect(result.channel).toBe('referral');
      expect(result.referrerDomain).toBe('blog.example.com');
    });
  });

  describe('Bot Detection', () => {
    it('should detect Googlebot as bot', () => {
      const result = detectTrafficSource({
        userAgent: 'Googlebot/2.1 (+http://www.google.com/bot.html)',
      });

      expect(result.isBot).toBe(true);
    });

    it('should not detect regular browser as bot', () => {
      const result = detectTrafficSource({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      });

      expect(result.isBot).toBe(false);
    });
  });
});

describe('isAITraffic', () => {
  it('should return true for AI search traffic', () => {
    const source = detectTrafficSource({
      userAgent: 'ChatGPT-User',
    });

    expect(isAITraffic(source)).toBe(true);
  });

  it('should return false for organic search traffic', () => {
    const source = detectTrafficSource({
      referrer: 'https://www.google.com/search?q=test',
    });

    expect(isAITraffic(source)).toBe(false);
  });
});

describe('getChannelDisplayName', () => {
  it('should return correct display names', () => {
    expect(getChannelDisplayName('organic_search')).toBe('Organic Search');
    expect(getChannelDisplayName('ai_search')).toBe('AI Search');
    expect(getChannelDisplayName('social')).toBe('Social Media');
    expect(getChannelDisplayName('direct')).toBe('Direct');
    expect(getChannelDisplayName('referral')).toBe('Referral');
    expect(getChannelDisplayName('paid')).toBe('Paid');
  });
});
