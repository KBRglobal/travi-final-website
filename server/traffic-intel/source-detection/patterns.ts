/**
 * Traffic Source Detection - Pattern Definitions
 *
 * Patterns for identifying traffic sources from referrers and user agents.
 */

import type { SearchEngine, AIPlatform, SocialPlatform } from '../types';

// Search engine patterns
export const SEARCH_ENGINE_PATTERNS: Record<SearchEngine, RegExp[]> = {
  google: [
    /google\.[a-z.]+\/(search|url)/i,
    /google\.[a-z.]+$/i,
    /^https?:\/\/(www\.)?google\./i,
  ],
  bing: [
    /bing\.com\//i,
    /^https?:\/\/(www\.)?bing\./i,
  ],
  yahoo: [
    /search\.yahoo\./i,
    /yahoo\.com\/search/i,
  ],
  duckduckgo: [
    /duckduckgo\.com/i,
  ],
  baidu: [
    /baidu\.com/i,
  ],
  yandex: [
    /yandex\.[a-z]+/i,
  ],
  other: [],
};

// AI platform patterns (referrer-based)
export const AI_REFERRER_PATTERNS: Record<AIPlatform, RegExp[]> = {
  chatgpt: [
    /chat\.openai\.com/i,
    /chatgpt\.com/i,
    /openai\.com/i,
  ],
  perplexity: [
    /perplexity\.ai/i,
  ],
  gemini: [
    /gemini\.google\.com/i,
    /bard\.google\.com/i,
  ],
  claude: [
    /claude\.ai/i,
    /anthropic\.com/i,
  ],
  bing_chat: [
    /bing\.com\/chat/i,
    /copilot\.microsoft\.com/i,
  ],
  google_aio: [
    /google\.com\/search.*ai_overview/i,
    /google\.com\/ai\//i,
  ],
  other_ai: [],
};

// AI platform patterns (user-agent based)
export const AI_USER_AGENT_PATTERNS: Record<AIPlatform, RegExp[]> = {
  chatgpt: [
    /ChatGPT-User/i,
    /GPTBot/i,
    /OpenAI/i,
  ],
  perplexity: [
    /PerplexityBot/i,
  ],
  gemini: [
    /Google-Extended/i,
    /Gemini/i,
  ],
  claude: [
    /anthropic-ai/i,
    /Claude-Web/i,
    /ClaudeBot/i,
  ],
  bing_chat: [
    /BingPreview/i,
    /bingbot.*chat/i,
  ],
  google_aio: [
    /Google-InspectionTool/i,
  ],
  other_ai: [
    /cohere-ai/i,
    /AI2Bot/i,
    /CCBot/i,
  ],
};

// Social platform patterns
export const SOCIAL_PATTERNS: Record<SocialPlatform, RegExp[]> = {
  facebook: [
    /facebook\.com/i,
    /fb\.com/i,
    /fb\.me/i,
    /m\.facebook\.com/i,
    /l\.facebook\.com/i,
  ],
  twitter: [
    /twitter\.com/i,
    /\/\/t\.co\//i,
    /^https?:\/\/(www\.)?x\.com/i,
  ],
  instagram: [
    /instagram\.com/i,
    /l\.instagram\.com/i,
  ],
  linkedin: [
    /linkedin\.com/i,
    /lnkd\.in/i,
  ],
  pinterest: [
    /pinterest\./i,
  ],
  tiktok: [
    /tiktok\.com/i,
  ],
  youtube: [
    /youtube\.com/i,
    /youtu\.be/i,
  ],
  reddit: [
    /reddit\.com/i,
    /redd\.it/i,
  ],
  whatsapp: [
    /whatsapp\.com/i,
    /wa\.me/i,
  ],
  telegram: [
    /t\.me/i,
    /telegram\.org/i,
  ],
  other_social: [],
};

// Email patterns
export const EMAIL_PATTERNS: RegExp[] = [
  /mail\.google\.com/i,
  /outlook\.live\.com/i,
  /outlook\.office\.com/i,
  /mail\.yahoo\.com/i,
  /mail\.zoho\.com/i,
  /webmail\./i,
  /email/i,
];

// Paid traffic patterns (UTM-based mostly)
export const PAID_UTM_MEDIUMS: string[] = [
  'cpc',
  'ppc',
  'paid',
  'paidsearch',
  'paid_search',
  'cpm',
  'cpv',
  'display',
  'banner',
  'retargeting',
  'remarketing',
];

// Bot user agent patterns (to filter out)
export const BOT_PATTERNS: RegExp[] = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
  /slurp/i,
  /mediapartners/i,
  /facebookexternalhit/i,
  /Twitterbot/i,
  /LinkedInBot/i,
  /WhatsApp/i,
  /TelegramBot/i,
  /Discordbot/i,
  /Slackbot/i,
  /AhrefsBot/i,
  /SemrushBot/i,
  /MJ12bot/i,
  /DotBot/i,
  /PetalBot/i,
  /Googlebot/i,
  /bingbot/i,
  /YandexBot/i,
  /Baiduspider/i,
];

// Patterns to detect preview bots (should still track)
export const PREVIEW_BOT_PATTERNS: RegExp[] = [
  /facebookexternalhit/i,
  /Twitterbot/i,
  /LinkedInBot/i,
  /WhatsApp/i,
  /TelegramBot/i,
  /Discordbot/i,
  /Slackbot/i,
];
