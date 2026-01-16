export type FallbackType = 
  | 'SEARCH_NO_RESULTS'
  | 'CHAT_UNAVAILABLE'
  | 'CONTENT_NOT_FOUND'
  | 'AI_OVERLOADED'
  | 'GENERIC_ERROR'
  | 'NETWORK_ERROR'
  | 'RATE_LIMITED'
  | 'SESSION_EXPIRED';

export interface FallbackMessage {
  title: string;
  description: string;
  suggestion: string;
  icon?: string;
  actionLabel?: string;
  actionUrl?: string;
}

export const FALLBACK_MESSAGES: Record<FallbackType, FallbackMessage> = {
  SEARCH_NO_RESULTS: {
    title: "No results found",
    description: "We couldn't find any matches for your search. This might be because the content hasn't been added yet or the search terms are too specific.",
    suggestion: "Try using different keywords, checking your spelling, or browsing our popular destinations instead.",
    icon: "search",
    actionLabel: "Browse Destinations",
    actionUrl: "/destinations"
  },

  CHAT_UNAVAILABLE: {
    title: "Chat is temporarily unavailable",
    description: "We're sorry, but our chat assistant is currently experiencing high demand or undergoing maintenance.",
    suggestion: "Please try again in a few moments, or explore our comprehensive guides for immediate help.",
    icon: "message-circle-off",
    actionLabel: "Browse Guides",
    actionUrl: "/destinations"
  },

  CONTENT_NOT_FOUND: {
    title: "Content not found",
    description: "The page or content you're looking for doesn't exist or may have been moved.",
    suggestion: "Check the URL for typos, or explore our homepage to find what you're looking for.",
    icon: "file-question",
    actionLabel: "Go to Homepage",
    actionUrl: "/"
  },

  AI_OVERLOADED: {
    title: "Our AI is taking a breather",
    description: "We're experiencing unusually high traffic and our AI assistant needs a moment to catch up.",
    suggestion: "Please wait a few seconds and try your request again. We appreciate your patience.",
    icon: "cpu",
    actionLabel: "Try Again"
  },

  GENERIC_ERROR: {
    title: "Something went wrong",
    description: "We encountered an unexpected issue while processing your request.",
    suggestion: "Please refresh the page and try again. If the problem persists, our team has been notified.",
    icon: "alert-circle",
    actionLabel: "Refresh Page"
  },

  NETWORK_ERROR: {
    title: "Connection issue",
    description: "We're having trouble connecting to our servers. This could be due to your internet connection or temporary server issues.",
    suggestion: "Check your internet connection and try again. If you're offline, some features may be limited.",
    icon: "wifi-off",
    actionLabel: "Retry"
  },

  RATE_LIMITED: {
    title: "Too many requests",
    description: "You've made too many requests in a short period. We've temporarily limited your access to ensure fair usage for everyone.",
    suggestion: "Please wait a moment before trying again. Your access will be restored shortly.",
    icon: "clock",
    actionLabel: "Wait and Retry"
  },

  SESSION_EXPIRED: {
    title: "Session expired",
    description: "Your session has expired for security reasons.",
    suggestion: "Please sign in again to continue where you left off.",
    icon: "log-out",
    actionLabel: "Sign In",
    actionUrl: "/login"
  }
} as const;

export function getFallbackMessage(type: FallbackType): FallbackMessage {
  return FALLBACK_MESSAGES[type] || FALLBACK_MESSAGES.GENERIC_ERROR;
}

export function isValidFallbackType(type: string): type is FallbackType {
  return type in FALLBACK_MESSAGES;
}
