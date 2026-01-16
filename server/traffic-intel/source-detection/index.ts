/**
 * Traffic Source Detection - Module Exports
 */

export {
  detectTrafficSource,
  detectFromRequest,
  extractDetectionInput,
  isAITraffic,
  getChannelDisplayName,
} from './detector';

export {
  SEARCH_ENGINE_PATTERNS,
  AI_REFERRER_PATTERNS,
  AI_USER_AGENT_PATTERNS,
  SOCIAL_PATTERNS,
  EMAIL_PATTERNS,
  PAID_UTM_MEDIUMS,
  BOT_PATTERNS,
} from './patterns';
