/**
 * TRAVI CMS Analytics Events
 * 
 * Standardized event types and helpers for analytics tracking.
 * See docs/ANALYTICS-EVENTS.md for full documentation.
 */

// Event name constants
export const AnalyticsEvents = {
  // User events
  USER_LOGGED_IN: 'user_logged_in',
  USER_REGISTERED: 'user_registered',
  USER_LOGGED_OUT: 'user_logged_out',
  USER_UPDATED_PROFILE: 'user_updated_profile',
  
  // Content events
  CONTENT_CREATED: 'content_created',
  CONTENT_UPDATED: 'content_updated',
  CONTENT_PUBLISHED: 'content_published',
  CONTENT_UNPUBLISHED: 'content_unpublished',
  CONTENT_DELETED: 'content_deleted',
  CONTENT_VIEWED: 'content_viewed',
  
  // Navigation events
  PAGE_VIEWED: 'page_viewed',
  SEARCH_PERFORMED: 'search_performed',
  LINK_CLICKED: 'link_clicked',
  
  // Commerce events
  LEAD_CAPTURED: 'lead_captured',
  AFFILIATE_CLICKED: 'affiliate_clicked',
  
  // Error events
  ERROR_OCCURRED: 'error_occurred',
  API_FAILED: 'api_failed',
} as const;

export type AnalyticsEventName = typeof AnalyticsEvents[keyof typeof AnalyticsEvents];

// Event categories
export type EventCategory = 'user' | 'content' | 'navigation' | 'commerce' | 'error';

// Base event interface
export interface BaseAnalyticsEvent {
  event: AnalyticsEventName;
  category: EventCategory;
  timestamp: string;
}

// User event properties
export interface UserEventProperties {
  userId: string;
  method?: 'password' | 'magic_link' | 'otp' | 'totp';
  role?: string;
  sessionDuration?: number;
}

// Content event properties
export interface ContentEventProperties {
  contentId: string;
  contentType: 'attraction' | 'hotel' | 'article' | 'dining' | 'district' | 'landing_page';
  authorId?: string;
  slug?: string;
  updatedFields?: string[];
  updatedBy?: string;
  deletedBy?: string;
  publishedAt?: string;
}

// Navigation event properties
export interface NavigationEventProperties {
  path: string;
  referrer?: string | null;
  pageType?: 'home' | 'content' | 'admin' | 'tool';
  language?: string;
  query?: string;
  resultsCount?: number;
  filters?: Record<string, string>;
}

// Error event properties
export interface ErrorEventProperties {
  errorType: 'api' | 'validation' | 'render' | 'network';
  errorMessage: string;
  errorCode?: string | null;
  endpoint?: string | null;
  userId?: string | null;
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  statusCode?: number;
}

// Union type for all event properties
export type AnalyticsEventProperties = 
  | UserEventProperties 
  | ContentEventProperties 
  | NavigationEventProperties 
  | ErrorEventProperties;

// Full event type
export interface AnalyticsEvent extends BaseAnalyticsEvent {
  properties: AnalyticsEventProperties;
}

/**
 * Check if analytics consent is granted
 */
export function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const prefs = localStorage.getItem('travi_cookie_prefs');
    if (!prefs) return false;
    
    const parsed = JSON.parse(prefs);
    return parsed.analytics === true;
  } catch {
    return false;
  }
}

/**
 * Track an analytics event
 * Respects GDPR consent settings
 */
export function trackEvent(event: Omit<AnalyticsEvent, 'timestamp'>): void {
  if (typeof window === 'undefined') return;
  
  // Check consent before tracking
  if (!hasAnalyticsConsent()) {
    console.debug('[Analytics] Skipped event (no consent):', event.event);
    return;
  }
  
  const fullEvent: AnalyticsEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };
  
  // Push to GTM dataLayer
  const dataLayer = (window as unknown as { dataLayer?: unknown[] }).dataLayer || [];
  dataLayer.push({
    event: fullEvent.event,
    eventCategory: fullEvent.category,
    ...fullEvent.properties,
    eventTimestamp: fullEvent.timestamp,
  });
  
  console.debug('[Analytics] Event tracked:', fullEvent.event);
}

/**
 * Create a standardized event object
 */
export function createEvent(
  eventName: AnalyticsEventName,
  category: EventCategory,
  properties: AnalyticsEventProperties
): AnalyticsEvent {
  return {
    event: eventName,
    category,
    timestamp: new Date().toISOString(),
    properties,
  };
}
