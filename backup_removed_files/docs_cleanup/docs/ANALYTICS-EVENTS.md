# TRAVI CMS - Analytics Events Documentation

## Event Naming Convention

All analytics events follow the **object_action** format:
- `content_created`
- `user_logged_in`
- `page_viewed`

### Rules
1. Use lowercase with underscores
2. Object first, then action (verb in past tense)
3. Keep names concise but descriptive
4. Use consistent terminology across events

## Event Categories

| Category | Description | Examples |
|----------|-------------|----------|
| `user` | Authentication & user actions | `user_logged_in`, `user_registered` |
| `content` | Content CRUD operations | `content_created`, `content_published` |
| `navigation` | Page views & routing | `page_viewed`, `link_clicked` |
| `commerce` | Revenue-related actions | `lead_captured`, `affiliate_clicked` |
| `error` | Error tracking | `error_occurred`, `api_failed` |

## Core Events Schema

### User Events

```typescript
// user_logged_in
{
  event: 'user_logged_in',
  category: 'user',
  properties: {
    userId: string,
    method: 'password' | 'magic_link' | 'otp' | 'totp',
    timestamp: string
  }
}

// user_registered
{
  event: 'user_registered',
  category: 'user',
  properties: {
    userId: string,
    role: 'admin' | 'editor' | 'author' | 'contributor' | 'viewer',
    timestamp: string
  }
}

// user_logged_out
{
  event: 'user_logged_out',
  category: 'user',
  properties: {
    userId: string,
    sessionDuration: number, // seconds
    timestamp: string
  }
}
```

### Content Events

```typescript
// content_created
{
  event: 'content_created',
  category: 'content',
  properties: {
    contentId: string,
    contentType: 'attraction' | 'hotel' | 'article' | 'dining' | 'district',
    authorId: string,
    timestamp: string
  }
}

// content_published
{
  event: 'content_published',
  category: 'content',
  properties: {
    contentId: string,
    contentType: string,
    slug: string,
    authorId: string,
    publishedAt: string
  }
}

// content_updated
{
  event: 'content_updated',
  category: 'content',
  properties: {
    contentId: string,
    contentType: string,
    updatedFields: string[],
    updatedBy: string,
    timestamp: string
  }
}

// content_deleted
{
  event: 'content_deleted',
  category: 'content',
  properties: {
    contentId: string,
    contentType: string,
    deletedBy: string,
    timestamp: string
  }
}
```

### Navigation Events

```typescript
// page_viewed
{
  event: 'page_viewed',
  category: 'navigation',
  properties: {
    path: string,
    referrer: string | null,
    pageType: 'home' | 'content' | 'admin' | 'tool',
    language: string,
    timestamp: string
  }
}

// search_performed
{
  event: 'search_performed',
  category: 'navigation',
  properties: {
    query: string,
    resultsCount: number,
    filters: Record<string, string>,
    timestamp: string
  }
}
```

### Error Events

```typescript
// error_occurred
{
  event: 'error_occurred',
  category: 'error',
  properties: {
    errorType: 'api' | 'validation' | 'render' | 'network',
    errorMessage: string,
    errorCode: string | null,
    endpoint: string | null,
    userId: string | null,
    timestamp: string
  }
}

// api_failed
{
  event: 'api_failed',
  category: 'error',
  properties: {
    endpoint: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    statusCode: number,
    errorMessage: string,
    timestamp: string
  }
}
```

## Implementation

### TypeScript Types

See `shared/analytics-events.ts` for type definitions.

### Usage Example

```typescript
import { trackEvent, AnalyticsEvents } from '@shared/analytics-events';

// Track content creation
trackEvent({
  event: AnalyticsEvents.CONTENT_CREATED,
  category: 'content',
  properties: {
    contentId: 'uuid-here',
    contentType: 'article',
    authorId: 'user-uuid',
    timestamp: new Date().toISOString()
  }
});
```

## GDPR Compliance

- Events are only tracked when user has granted analytics consent
- Use `travi_cookie_prefs` localStorage key to check consent
- PII (email, name) should NOT be included in event properties
- Use anonymized user IDs only

## GTM Integration

Events are pushed to `dataLayer` for Google Tag Manager:

```javascript
window.dataLayer = window.dataLayer || [];
window.dataLayer.push({
  event: 'content_published',
  // ... properties
});
```
