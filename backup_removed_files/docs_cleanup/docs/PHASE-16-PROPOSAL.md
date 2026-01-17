# Phase 16 Proposal: Production Hardening

**Date:** 2026-01-01
**Author:** System Architect
**Status:** PROPOSAL - Design Only

---

## Executive Summary

Phase 15C established core intelligence wiring. Phase 16 focuses on **production hardening** - making the system reliable, observable, and scalable before launch.

**Theme:** "Make it unbreakable, then make it fast."

---

## 1. Goals

### Primary Goals

1. **Zero-Downtime Reliability**
   - All external API calls have timeouts
   - All multi-table operations are transactional
   - All failures are recoverable

2. **Full Observability**
   - Every event handler success/failure tracked
   - Every cache hit/miss measured
   - Every slow query identified

3. **Security Baseline**
   - Prompt injection prevented
   - AI output sanitized
   - Auth gaps closed

### Secondary Goals

4. **Scale Preparation**
   - N+1 queries eliminated
   - Cache bounded
   - Job queue parallelized

5. **Developer Experience**
   - routes.ts split by domain
   - Clear error messages
   - Runnable tests

---

## 2. Non-Goals

### Explicitly Out of Scope

1. **New Features**
   - No new content types
   - No new AI capabilities
   - No new integrations

2. **UI/Frontend Work**
   - No admin dashboard changes
   - No public site changes
   - No mobile optimization

3. **Performance Optimization**
   - No caching strategy changes
   - No CDN configuration
   - No database query optimization (beyond N+1 fixes)

4. **Multi-Tenancy**
   - No tenant isolation
   - No per-tenant configuration
   - No tenant data separation

**Rationale:** Phase 16 is about hardening the existing system, not extending it.

---

## 3. Workstreams

### Workstream A: Request Resilience (Week 1-2)

**Goal:** No request can hang indefinitely or crash the server.

#### A.1 Timeout Wrapper

```typescript
// New utility: server/lib/fetch-with-timeout.ts
export async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}
```

**Files to Update:**
- `server/octopus/intelligence-client.ts`
- `server/localization/translation-worker.ts`
- `server/services/external-image-service.ts`
- `server/services/translation-service.ts`
- `server/octopus/google-maps-enricher.ts`
- `server/octopus/web-search-enricher.ts`

#### A.2 Database Transactions

Wrap multi-table operations:
- Content publish (routes.ts:4467-4486)
- Content creation with type-specific records
- Bulk status updates

#### A.3 Error Boundaries

```typescript
// New middleware: server/middleware/error-boundary.ts
export function withErrorBoundary<T>(
  handler: () => Promise<T>,
  fallback: T,
  context: string
): Promise<T> {
  return handler().catch((error) => {
    log.error(`[${context}] Error boundary caught:`, error);
    metrics.increment('error_boundary.triggered', { context });
    return fallback;
  });
}
```

---

### Workstream B: Observability (Week 2-3)

**Goal:** Every significant operation is measured and alertable.

#### B.1 Event Handler Metrics

```typescript
// Enhanced: server/events/content-subscribers.ts
async function handleSearchIndexOnPublish(event) {
  const start = Date.now();
  try {
    await searchIndexer.indexContent(event.contentId);
    metrics.timing('event_handler.duration', Date.now() - start, {
      handler: 'SearchIndexer',
      status: 'success',
    });
  } catch (error) {
    metrics.increment('event_handler.failure', {
      handler: 'SearchIndexer',
      error_type: error.name,
    });
    throw error;
  }
}
```

#### B.2 Cache Observability

```typescript
// Enhanced: server/cache.ts
async get(key: string): Promise<T | null> {
  const cached = this.cache.get(key);
  metrics.increment('cache.access', {
    result: cached ? 'hit' : 'miss',
    cache: 'memory',
  });
  return cached?.value ?? null;
}
```

#### B.3 Slow Query Detection

```typescript
// New: server/lib/query-monitor.ts
const SLOW_QUERY_THRESHOLD_MS = 100;

export function monitorQuery<T>(
  name: string,
  query: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  return query().finally(() => {
    const duration = Date.now() - start;
    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      log.warn(`[SlowQuery] ${name} took ${duration}ms`);
      metrics.increment('slow_query', { name });
    }
  });
}
```

---

### Workstream C: Security Hardening (Week 3-4)

**Goal:** Close all critical and high severity vulnerabilities.

#### C.1 Prompt Injection Prevention

```typescript
// New: server/lib/prompt-sanitizer.ts
export function sanitizeForPrompt(input: string): string {
  return input
    .replace(/\n/g, ' ')           // No newlines
    .replace(/[<>{}[\]]/g, '')     // No special chars
    .replace(/ignore|forget|disregard/gi, '') // No instruction words
    .slice(0, 500);                // Length limit
}

// Usage in chat-prompts.ts
const safeName = sanitizeForPrompt(context.entityName || '');
basePrompt += `\n\nCURRENT DESTINATION: ${safeName}`;
```

#### C.2 AI Output Sanitization

```typescript
// Enhanced: server/routes.ts
import DOMPurify from 'isomorphic-dompurify';

function sanitizeAIBlocks(blocks: unknown[]): ContentBlock[] {
  return blocks.map(block => ({
    ...block,
    content: DOMPurify.sanitize(block.content || ''),
  }));
}

// Before storage
const sanitizedBlocks = sanitizeAIBlocks(generatedArticle.blocks);
await storage.updateContent(id, { blocks: sanitizedBlocks });
```

#### C.3 Auth Gap Fixes

```typescript
// Fix: server/routes.ts
// Add requireAuth to recovery code endpoint
app.post("/api/totp/validate-recovery",
  requireAuth,  // ADD THIS
  loginRateLimiter,
  async (req, res) => {...}
);

// Add ownership check to metrics
app.get("/api/content/metrics/:contentId",
  requireAuth,
  async (req, res) => {
    const content = await storage.getContentById(req.params.contentId);
    if (content?.authorId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    // ...
  }
);
```

---

### Workstream D: Scale Preparation (Week 4-5)

**Goal:** System handles 10x current load without degradation.

#### D.1 N+1 Query Fixes

```typescript
// Enhanced: server/storage.ts
async getContentById(id: string): Promise<ContentWithRelations | undefined> {
  // Single query with JOINs
  const result = await db
    .select()
    .from(contents)
    .leftJoin(hotels, eq(hotels.contentId, contents.id))
    .leftJoin(attractions, eq(attractions.contentId, contents.id))
    // ... other joins
    .where(eq(contents.id, id))
    .limit(1);

  return mapResultToContentWithRelations(result[0]);
}
```

#### D.2 Bounded Caches

```typescript
// Enhanced: server/cache.ts
class BoundedMemoryCache {
  private maxEntries: number = 100000;
  private cache = new Map<string, CacheEntry>();

  set(key: string, value: unknown, ttlSeconds: number): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxEntries) {
      const oldest = this.cache.keys().next().value;
      this.cache.delete(oldest);
    }
    this.cache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }
}
```

#### D.3 Job Queue Parallelization

```typescript
// Enhanced: server/job-queue.ts
class JobQueue {
  private maxConcurrent: number = 20;  // Up from 3

  // Add job prioritization
  private queues = {
    critical: [],  // Translation for live content
    high: [],      // AEO generation
    normal: [],    // SEO fixes
    low: [],       // Analytics
  };
}
```

---

### Workstream E: Code Organization (Week 5-6)

**Goal:** Enable parallel development without merge conflicts.

#### E.1 Split routes.ts

```
server/
├── routes/
│   ├── index.ts           # Route aggregator
│   ├── auth.ts            # Auth endpoints
│   ├── content.ts         # Content CRUD
│   ├── content-types.ts   # Type-specific (hotels, etc.)
│   ├── ai.ts              # AI generation endpoints
│   ├── search.ts          # Search endpoints
│   ├── analytics.ts       # Analytics endpoints
│   ├── admin.ts           # Admin endpoints
│   ├── public.ts          # Public/unauthenticated
│   └── webhooks.ts        # Webhook handlers
```

---

## 4. Risks

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Transaction deadlocks | Medium | High | Start with low-contention operations |
| Cache eviction performance | Low | Medium | Benchmark before deploying |
| routes.ts split breaks imports | Medium | Low | Comprehensive testing |

### Process Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Scope creep into new features | High | Medium | Strict code review |
| Incomplete observability | Medium | Medium | Define metrics upfront |
| Security fixes break functionality | Low | High | Shadow testing |

---

## 5. What to Delay

### Delay to Phase 17+

1. **RSS → Entity Extraction wiring**
   - Not critical for launch
   - Can be background project

2. **Octopus → Auto-Publish**
   - Manual workflow acceptable
   - Requires more design

3. **Search → Dynamic Entity Recognition**
   - Current hardcoded works for Dubai
   - Scale to other destinations later

4. **Multi-region deployment**
   - Premature optimization
   - No current user demand

5. **Advanced A/B testing**
   - Nice to have
   - Not launch blocker

---

## 6. Success Criteria

### Phase 16 Complete When:

1. **All fetch() calls have 30s timeout** - 0 hanging requests
2. **All multi-table updates use transactions** - 0 partial writes
3. **All event handlers emit metrics** - 100% visibility
4. **All critical security fixes deployed** - 0 critical vulns
5. **N+1 queries in hot paths fixed** - <5 queries per content fetch
6. **Cache bounded to 100K entries** - 0 OOM risk
7. **Job queue handles 20 concurrent** - <1min backlog normal load
8. **routes.ts split into modules** - <500 lines per file

---

## 7. Timeline

```
Week 1-2: Workstream A (Request Resilience)
Week 2-3: Workstream B (Observability)
Week 3-4: Workstream C (Security Hardening)
Week 4-5: Workstream D (Scale Preparation)
Week 5-6: Workstream E (Code Organization)
Week 6:   Testing & Documentation
```

**Total Duration:** 6 weeks
**Team Size:** 2-3 engineers

---

## 8. Dependencies

### External Dependencies
- None (all work is internal)

### Internal Dependencies
- Phase 15C complete (DONE)
- Access to production logs for baseline metrics
- Test environment matching production

---

## Appendix: Files to Touch

### High-Change Files
- `server/routes.ts` → Split into 10 files
- `server/storage.ts` → Add JOINs
- `server/cache.ts` → Add bounds
- `server/job-queue.ts` → Increase concurrency

### New Files
- `server/lib/fetch-with-timeout.ts`
- `server/lib/prompt-sanitizer.ts`
- `server/lib/query-monitor.ts`
- `server/middleware/error-boundary.ts`
- `server/routes/*.ts` (10 files)

### Modified Files (Security)
- `server/chat/chat-prompts.ts`
- `server/events/content-subscribers.ts`
- All files with `fetch()` calls (~30 files)
