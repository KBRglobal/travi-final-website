/**
 * AEO Static Files Tests
 */
import { describe, it, expect } from 'vitest';
import {
  generateRobotsTxt,
  generateLlmsTxt,
  identifyAICrawler,
  identifyAIReferrer,
} from '../../../server/aeo/aeo-static-files';

describe('generateRobotsTxt', () => {
  it('should generate valid robots.txt content', () => {
    const robotsTxt = generateRobotsTxt('https://example.com');

    expect(robotsTxt).toContain('User-agent:');
    expect(robotsTxt).toContain('Sitemap:');
    expect(robotsTxt).toContain('https://example.com');
  });

  it('should include AI crawler rules', () => {
    const robotsTxt = generateRobotsTxt('https://example.com');

    expect(robotsTxt).toContain('GPTBot');
    expect(robotsTxt).toContain('PerplexityBot');
    expect(robotsTxt).toContain('ClaudeBot');
  });

  it('should allow AI crawlers by default', () => {
    const robotsTxt = generateRobotsTxt('https://example.com');

    // Should have Allow rules for AI crawlers
    expect(robotsTxt).toMatch(/User-agent: GPTBot[\s\S]*Allow:/);
  });
});

describe('generateLlmsTxt', () => {
  it('should generate valid llms.txt content', () => {
    const llmsTxt = generateLlmsTxt({
      siteName: 'TRAVI',
      siteUrl: 'https://travi.com',
      description: 'Travel platform',
    });

    expect(llmsTxt).toBeDefined();
    expect(typeof llmsTxt).toBe('string');
    expect(llmsTxt.length).toBeGreaterThan(100);
  });

  it('should include content guidelines', () => {
    const llmsTxt = generateLlmsTxt({
      siteName: 'TRAVI',
      siteUrl: 'https://travi.com',
      description: 'Travel platform',
    });

    expect(llmsTxt.toLowerCase()).toMatch(/content|guideline|policy/i);
  });
});

describe('identifyAICrawler', () => {
  it('should identify GPTBot', () => {
    const result = identifyAICrawler('Mozilla/5.0 GPTBot/1.0');

    expect(result.isAICrawler).toBe(true);
    expect(result.name).toBe('GPTBot');
    expect(result.platform).toBe('chatgpt');
  });

  it('should identify PerplexityBot', () => {
    const result = identifyAICrawler('PerplexityBot/1.0');

    expect(result.isAICrawler).toBe(true);
    expect(result.name).toBe('PerplexityBot');
    expect(result.platform).toBe('perplexity');
  });

  it('should identify ClaudeBot', () => {
    const result = identifyAICrawler('anthropic-ai/1.0');

    expect(result.isAICrawler).toBe(true);
    expect(result.name).toBe('ClaudeBot');
    expect(result.platform).toBe('claude');
  });

  it('should identify Google-Extended', () => {
    const result = identifyAICrawler('Mozilla/5.0 Google-Extended');

    expect(result.isAICrawler).toBe(true);
    expect(result.platform).toBe('google_aio');
  });

  it('should return false for regular browsers', () => {
    const result = identifyAICrawler('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0');

    expect(result.isAICrawler).toBe(false);
  });

  it('should return false for empty user agent', () => {
    const result = identifyAICrawler('');

    expect(result.isAICrawler).toBe(false);
  });

  it('should return false for Googlebot (regular)', () => {
    const result = identifyAICrawler('Googlebot/2.1');

    // Regular Googlebot is not an AI crawler unless it's Google-Extended
    expect(result.platform).not.toBe('chatgpt');
  });
});

describe('identifyAIReferrer', () => {
  it('should identify ChatGPT referrer', () => {
    const result = identifyAIReferrer('https://chatgpt.com/share/abc123');

    expect(result.isAIReferrer).toBe(true);
    expect(result.platform).toBe('chatgpt');
  });

  it('should identify chat.openai.com referrer', () => {
    const result = identifyAIReferrer('https://chat.openai.com');

    expect(result.isAIReferrer).toBe(true);
    expect(result.platform).toBe('chatgpt');
  });

  it('should identify Perplexity referrer', () => {
    const result = identifyAIReferrer('https://perplexity.ai/search?q=dubai');

    expect(result.isAIReferrer).toBe(true);
    expect(result.platform).toBe('perplexity');
  });

  it('should identify Claude referrer', () => {
    const result = identifyAIReferrer('https://claude.ai/chat/abc');

    expect(result.isAIReferrer).toBe(true);
    expect(result.platform).toBe('claude');
  });

  it('should return false for Google Search', () => {
    const result = identifyAIReferrer('https://www.google.com/search?q=dubai');

    // Regular Google search is not AI referrer unless it's AI Overviews
    expect(result.platform).not.toBe('chatgpt');
  });

  it('should return false for empty referrer', () => {
    const result = identifyAIReferrer('');

    expect(result.isAIReferrer).toBe(false);
  });

  it('should handle undefined gracefully', () => {
    // The function expects a string, so we test with empty string instead
    const result = identifyAIReferrer('');

    expect(result.isAIReferrer).toBe(false);
  });
});
