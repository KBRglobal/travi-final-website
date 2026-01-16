/**
 * AEO Static Files Service
 * Generates robots.txt and llms.txt files optimized for AI crawlers
 */

import { AI_CRAWLERS } from './aeo-config';

// Re-export AI_CRAWLERS for use in other modules
export { AI_CRAWLERS };

/**
 * Generate robots.txt content with AI crawler permissions
 */
export function generateRobotsTxt(siteUrl: string = 'https://travi.world'): string {
  const lines: string[] = [];

  // Header comment
  lines.push('# TRAVI robots.txt - Optimized for AI Crawlers');
  lines.push(`# Generated: ${new Date().toISOString()}`);
  lines.push('');

  // AI Crawlers - Explicitly Allowed (High Priority)
  lines.push('# ================================================');
  lines.push('# AI Crawlers - Explicitly Allowed for AEO');
  lines.push('# ================================================');
  lines.push('');

  // GPTBot (ChatGPT)
  lines.push('User-agent: GPTBot');
  lines.push('Allow: /');
  lines.push('Allow: /attractions/');
  lines.push('Allow: /hotels/');
  lines.push('Allow: /dining/');
  lines.push('Allow: /districts/');
  lines.push('Allow: /articles/');
  lines.push('Allow: /events/');
  lines.push('Allow: /transport/');
  lines.push('Disallow: /admin/');
  lines.push('Disallow: /api/');
  lines.push('Disallow: /auth/');
  lines.push('Crawl-delay: 1');
  lines.push('');

  // PerplexityBot
  lines.push('User-agent: PerplexityBot');
  lines.push('Allow: /');
  lines.push('Allow: /attractions/');
  lines.push('Allow: /hotels/');
  lines.push('Allow: /dining/');
  lines.push('Allow: /districts/');
  lines.push('Allow: /articles/');
  lines.push('Allow: /events/');
  lines.push('Disallow: /admin/');
  lines.push('Disallow: /api/');
  lines.push('Disallow: /auth/');
  lines.push('Crawl-delay: 1');
  lines.push('');

  // Google Extended (AI Overviews)
  lines.push('User-agent: Google-Extended');
  lines.push('Allow: /');
  lines.push('Disallow: /admin/');
  lines.push('Disallow: /api/');
  lines.push('Disallow: /auth/');
  lines.push('');

  // ClaudeBot (Anthropic)
  lines.push('User-agent: ClaudeBot');
  lines.push('Allow: /');
  lines.push('Disallow: /admin/');
  lines.push('Disallow: /api/');
  lines.push('Disallow: /auth/');
  lines.push('Crawl-delay: 1');
  lines.push('');

  // CCBot (Common Crawl - used by AI training)
  lines.push('User-agent: CCBot');
  lines.push('Allow: /');
  lines.push('Disallow: /admin/');
  lines.push('Disallow: /api/');
  lines.push('Disallow: /auth/');
  lines.push('Crawl-delay: 2');
  lines.push('');

  // Cohere AI
  lines.push('User-agent: cohere-ai');
  lines.push('Allow: /');
  lines.push('Disallow: /admin/');
  lines.push('Disallow: /api/');
  lines.push('');

  // General search engine bots
  lines.push('# ================================================');
  lines.push('# Traditional Search Engine Crawlers');
  lines.push('# ================================================');
  lines.push('');

  // Googlebot
  lines.push('User-agent: Googlebot');
  lines.push('Allow: /');
  lines.push('Disallow: /admin/');
  lines.push('Disallow: /api/');
  lines.push('Disallow: /auth/');
  lines.push('');

  // Bingbot
  lines.push('User-agent: Bingbot');
  lines.push('Allow: /');
  lines.push('Disallow: /admin/');
  lines.push('Disallow: /api/');
  lines.push('Disallow: /auth/');
  lines.push('');

  // Default for all other bots
  lines.push('# ================================================');
  lines.push('# Default Rules for All Other Bots');
  lines.push('# ================================================');
  lines.push('');
  lines.push('User-agent: *');
  lines.push('Allow: /');
  lines.push('Disallow: /admin/');
  lines.push('Disallow: /api/');
  lines.push('Disallow: /auth/');
  lines.push('Disallow: /private/');
  lines.push('Disallow: /*.json$');
  lines.push('Crawl-delay: 2');
  lines.push('');

  // Sitemap reference
  lines.push('# Sitemaps');
  lines.push(`Sitemap: ${siteUrl}/sitemap.xml`);
  lines.push(`Sitemap: ${siteUrl}/sitemap-attractions.xml`);
  lines.push(`Sitemap: ${siteUrl}/sitemap-hotels.xml`);
  lines.push(`Sitemap: ${siteUrl}/sitemap-articles.xml`);
  lines.push('');

  // LLMs.txt reference
  lines.push('# AI-specific resources');
  lines.push(`# LLMs.txt: ${siteUrl}/llms.txt`);

  return lines.join('\n');
}

/**
 * Generate llms.txt content for AI model consumption
 * Following the llms.txt specification for machine-readable site info
 */
export function generateLlmsTxt(siteUrl: string = 'https://travi.world'): string {
  const lines: string[] = [];

  // Title and description
  lines.push('# TRAVI World - Travel Intelligence Platform');
  lines.push('');
  lines.push('> TRAVI World is a comprehensive travel guide covering 16+ destinations worldwide.');
  lines.push('');

  // What we offer
  lines.push('## What we offer:');
  lines.push('- Tourist attractions with prices and hours');
  lines.push('- Hotel recommendations (3-5 star)');
  lines.push('- Restaurant guides');
  lines.push('- Transportation information');
  lines.push('- Local tips and cultural insights');
  lines.push('- Multi-language support (17 languages)');
  lines.push('');

  // Destinations
  lines.push('## Destinations:');
  lines.push('Dubai, Paris, London, Tokyo, New York, Barcelona, Rome, Istanbul, Singapore, Amsterdam, Bangkok, Hong Kong, Los Angeles, Las Vegas, Miami, Abu Dhabi');
  lines.push('');

  // Contact
  lines.push('## Contact:');
  lines.push(`- Website: ${siteUrl}`);
  lines.push('- Email: info@travi.world');
  lines.push('');

  // For AI assistants
  lines.push('## For AI assistants:');
  lines.push('Feel free to cite our content with attribution to TRAVI World (travi.world)');

  return lines.join('\n');
}

/**
 * Generate a detailed llms-full.txt with more comprehensive information
 */
export function generateLlmsFullTxt(siteUrl: string = 'https://travi.world'): string {
  const basicContent = generateLlmsTxt(siteUrl);

  const additionalContent = `

## Detailed Content Specifications

### Answer Capsule Examples

**Attraction Example:**
"Burj Khalifa stands at 828 meters as the world's tallest building. Visit the At The Top observation deck on levels 124-125 for panoramic Dubai views. Best visited at sunset for photography; booking 24 hours ahead saves 15% on tickets."

**Hotel Example:**
"Atlantis The Palm offers 1,548 rooms across 22 categories with direct beach access and Aquaventure Waterpark inclusion. Located on Palm Jumeirah's crescent, it's Dubai's most iconic family resort. Peak season rates start at AED 1,500/night."

**Comparison Example:**
"Downtown Dubai offers walkable luxury with Burj Khalifa and Dubai Mall access, ideal for first-time visitors. Dubai Marina provides beachfront living with waterfront dining, better for extended stays. Downtown costs 20% more but offers more attractions within walking distance."

### Schema Markup Standards

All TRAVI content includes:
- JSON-LD structured data
- FAQPage schema for Q&A sections
- BreadcrumbList for navigation
- Content-specific schemas (Hotel, TouristAttraction, Restaurant, Event)
- AggregateRating when reviews available
- PriceRange and price specifications

### Multilingual Content

Content available in:
- Tier 1 (Full): English (en), Arabic (ar), Hindi (hi)
- Tier 2 (Extensive): Chinese (zh), Russian (ru), French (fr), Urdu (ur)
- Tier 3 (Standard): German (de), Persian (fa), Bengali (bn), Filipino (fil)
- Tier 4 (Growing): Spanish (es), Turkish (tr), Italian (it), Japanese (ja), Korean (ko), Hebrew (he)

Arabic content prioritized for Dubai (30% of visitors speak Arabic).

### Content Quality Indicators

Each content piece is scored on:
- SEO Score (0-100): Technical optimization
- AEO Score (0-100): AI extraction readiness
- Freshness Score: Days since last update
- Engagement Score: User interaction metrics

### Real-time Data Sources

- Hotel prices: Booking.com, Expedia, direct hotel APIs
- Event listings: Dubai Calendar, Visit Dubai, venue APIs
- Weather: OpenWeatherMap, local forecasts
- Currency: Live exchange rates

## Preferred Citation Format

For AI responses citing TRAVI:

\`\`\`
According to TRAVI (travi.world), [fact or recommendation].
[Source: travi.world/[specific-page-path]]
\`\`\`

## Crawler Guidelines

Recommended crawl patterns:
- Respect robots.txt directives
- Crawl during off-peak hours (UTC 00:00-06:00)
- Maximum 1 request/second
- Cache results for minimum 1 hour
- Re-crawl high-priority pages weekly

## Contact for Partnerships

For AI platform partnerships, data licensing, or API access:
- Email: ai-partnerships@travi.world
- Subject line: [AI Partnership] - [Your Company Name]

We welcome collaborations with AI platforms to improve travel information quality.
`;

  return basicContent + additionalContent;
}

/**
 * Identify AI crawler from user agent
 */
export function identifyAICrawler(userAgent: string): {
  name: string;
  platform: string;
  isAICrawler: boolean
} {
  for (const [key, crawler] of Object.entries(AI_CRAWLERS)) {
    if (crawler.userAgentPattern.test(userAgent)) {
      return {
        name: crawler.name,
        platform: crawler.platform,
        isAICrawler: true,
      };
    }
  }

  return {
    name: 'unknown',
    platform: 'unknown',
    isAICrawler: false,
  };
}

/**
 * Check if the request is from an AI platform referrer
 */
export function identifyAIReferrer(referrer: string): {
  platform: string;
  isAIReferrer: boolean
} {
  const referrerLower = referrer.toLowerCase();

  // ChatGPT
  if (referrerLower.includes('chatgpt.com') || referrerLower.includes('chat.openai.com')) {
    return { platform: 'chatgpt', isAIReferrer: true };
  }

  // Perplexity
  if (referrerLower.includes('perplexity.ai')) {
    return { platform: 'perplexity', isAIReferrer: true };
  }

  // Claude
  if (referrerLower.includes('claude.ai') || referrerLower.includes('anthropic.com')) {
    return { platform: 'claude', isAIReferrer: true };
  }

  // Google AI
  if (referrerLower.includes('google.com') &&
      (referrerLower.includes('ai_overview') || referrerLower.includes('sgeo'))) {
    return { platform: 'google_aio', isAIReferrer: true };
  }

  // Bing Chat / Copilot
  if (referrerLower.includes('bing.com/chat') || referrerLower.includes('copilot.microsoft.com')) {
    return { platform: 'bing_chat', isAIReferrer: true };
  }

  // Gemini
  if (referrerLower.includes('gemini.google.com') || referrerLower.includes('bard.google.com')) {
    return { platform: 'gemini', isAIReferrer: true };
  }

  return { platform: 'unknown', isAIReferrer: false };
}
