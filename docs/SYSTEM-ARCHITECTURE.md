# TRAVI CMS - System Architecture

## Overview

This document defines the architectural boundaries, responsibilities, and invariants for the TRAVI CMS platform. It serves as the authoritative reference for system behavior and integration patterns.

**Last Updated:** 2024-12-31  
**Version:** 1.3.0

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                  FRONTEND                                        │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │  React + Vite                                                              │  │
│  │  - Passive consumer only                                                   │  │
│  │  - NO orchestration logic                                                  │  │
│  │  - NO fallbacks                                                            │  │
│  │  - Renders what API returns                                                │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              PUBLIC API LAYER                                    │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │  /api/public/*                                                             │  │
│  │  - Guarantees render-safe payloads                                         │  │
│  │  - Never returns empty arrays                                              │  │
│  │  - Never returns null images                                               │  │
│  │  - Uses server-side fallbacks when DB empty                                │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐
│       CMS / ADMIN       │  │       IMAGE ENGINE      │  │        OCTOPUS v2       │
│  ┌───────────────────┐  │  │  ┌───────────────────┐  │  │  ┌───────────────────┐  │
│  │ Content Management│  │  │  │ Image Processing  │  │  │  │ Content Generation│  │
│  │ Draft → Publish   │  │  │  │ Stock/AI Images   │  │  │  │ Graph-based Jobs  │  │
│  │ Section Editors   │  │  │  │ SEO Metadata      │  │  │  │ Entity Extraction │  │
│  │ Idempotent Seeds  │  │  │  │ Rate Limiting     │  │  │  │ Image Orchestratn │  │
│  └───────────────────┘  │  │  └───────────────────┘  │  │  └───────────────────┘  │
└─────────────────────────┘  └─────────────────────────┘  └─────────────────────────┘
                                        │                           │
                                        │                           │
                                        ▼                           │
                    ┌─────────────────────────────────┐             │
                    │      EXTERNAL PROVIDERS         │◄────────────┘
                    │  ┌───────────────────────────┐  │
                    │  │ Freepik (Stock Images)    │  │
                    │  │ OpenAI (AI Generation)    │  │
                    │  │ Anthropic (Claude)        │  │
                    │  │ DeepL (Translation)       │  │
                    │  └───────────────────────────┘  │
                    └─────────────────────────────────┘
```

---

## System Responsibilities

### 1. Frontend (React + Vite)

**Role:** Passive Consumer

| DO | DO NOT |
|----|--------|
| Render exactly what API returns | Make image placement decisions |
| Display loading states | Implement fallback logic |
| Handle user interactions | Call external APIs directly |
| Adapt to viewport sizes | Modify data before rendering |

**Invariants:**
- Frontend receives complete, render-safe payloads
- No empty arrays reach the frontend
- No null images reach the frontend
- All orchestration happens server-side

---

### 2. CMS / Public APIs

**Role:** Render-Safe Data Provider

| DO | DO NOT |
|----|--------|
| Guarantee non-empty arrays | Return raw database results |
| Apply server-side fallbacks | Expose incomplete data |
| Validate data completeness | Delegate rendering decisions to frontend |
| Patch null images with defaults | Rely on client-side error handling |

**Key File:** `server/lib/homepage-fallbacks.ts`

**Invariants:**
- `/api/public/homepage-config` NEVER returns empty arrays
- All destination cards have valid `cardImage` paths
- All hero slides have valid `imageUrl` paths
- Fallback usage is logged for monitoring

---

### 3. Image Engine

**Role:** Isolated Image Service

| DO | DO NOT |
|----|--------|
| Handle all Freepik/stock API calls | Make business decisions about placement |
| Process and optimize images | Know about Octopus or content context |
| Generate SEO metadata | Bypass rate limits |
| Deduplicate image storage | Store images without SEO context |
| Expose `/api/v1/images/*` API | Allow direct external provider access |

**Key Files:**
- `server/services/image-service.ts`
- `server/services/image-processing.ts`
- `server/services/image-seo-service.ts`
- `server/routes/image-routes.ts`

**Invariants:**
- Image Engine is the ONLY component that talks to Freepik
- All images include SEO metadata (alt, title, schema)
- Rate limits are enforced at this layer
- No component bypasses Image Engine for external images

---

### 4. Octopus v2

**Role:** Intelligent Content & Image Orchestration

| DO | DO NOT |
|----|--------|
| Deterministic image usage decisions | Guarantee content existence |
| Enforce hero uniqueness per entity | Validate homepage completeness |
| Track image reuse via `image_usage` | Manage external providers directly |
| Graph-based content generation | Make real-time rendering decisions |
| Entity extraction and tagging | Handle basic CMS rendering |
| Placement rule enforcement | Bypass Image Engine |

**Key Files:**
- `server/octopus/image-orchestrator.ts`
- `server/octopus/image-placement-engine.ts`
- `server/octopus/image-usage-persistence.ts`
- `server/octopus/orchestrator.ts`
- `server/octopus/queue-manager.ts`

**Invariants:**
- NO IMAGE appears without a corresponding `image_usage` record (when Octopus processes it)
- Hero images are unique per entity (no reuse)
- Placement decisions are deterministic (same input → same output)
- Octopus accesses images ONLY via Image Engine APIs

---

## Hard Invariants

These rules are absolute and must never be violated:

### Image Access Chain

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Octopus    │────▶│ Image Engine │────▶│   Freepik    │
└──────────────┘     └──────────────┘     └──────────────┘
                            ▲
                            │
┌──────────────┐            │
│     CMS      │────────────┘
└──────────────┘

Frontend ──────────X──────────▶ Freepik (BLOCKED)
CMS ───────────────X──────────▶ Freepik (BLOCKED)
Octopus ───────────X──────────▶ Freepik (BLOCKED)
```

1. **Octopus accesses images ONLY via Image Engine APIs**
2. **Image Engine is the ONLY component that talks to Freepik**
3. **Frontend and CMS NEVER talk to Freepik directly**
4. **AI orchestration may throttle Image Engine calls but NEVER bypass it**

### Rendering Guarantees

1. **API-first fallbacks:** Fallbacks happen at API layer, not frontend
2. **No empty arrays:** Public APIs never return `[]` for required sections
3. **No null images:** All image fields are populated (fallback or real)
4. **Deterministic placement:** Same entity + role = same image decision

### SEO/AEO Guarantees

1. **SEO-safe images:** All images include alt, title, schema from Image Engine
2. **AEO compatibility:** Consistent image usage, no duplication spam
3. **Hero uniqueness:** One hero image per entity, never reused elsewhere
4. **Deterministic reuse:** Rules define when images can be reused

### Operational Invariants (Phase 14)

1. **No hanging jobs:** Watchdog enforces 5-minute maximum execution time. Jobs exceeding this are auto-failed with status `stale`.
2. **AI tasks require explicit category:** All AI tasks MUST specify a category (news, evergreen, content, translation, etc.). Tasks without a category are REJECTED.
3. **Affiliate links in forbidden zones:** Affiliate links CANNOT appear in:
   - Legal pages (`/privacy-policy`, `/terms`, `/cookie-policy`)
   - Error pages (404, 500)
   - User-generated content

### Kill-Switch Controls

| Environment Variable | Feature | Default |
|---------------------|---------|---------|
| `ENABLE_WEEKLY_DIGEST` | Weekly email newsletter | `false` |
| `ENABLE_MONETIZATION` | Monetization features | `false` |
| `ENABLE_AFFILIATE_HOOKS` | Affiliate link injection | `false` |

**Invariant:** Setting any kill-switch to `false` immediately disables the feature at runtime.

---

## Data Flow Patterns

### Pattern 1: Homepage Rendering

```
1. Frontend requests /api/public/homepage-config
2. API fetches from database
3. If data incomplete → apply server-side fallbacks
4. Return guaranteed render-safe payload
5. Frontend renders without modification
```

**Octopus is NOT involved** in homepage rendering.

### Pattern 2: Content Generation (Octopus)

```
1. Job enters Octopus queue
2. Entity extraction → graph resolution
3. Image orchestrator requests image from Image Engine
4. Image Engine calls Freepik/AI/stock
5. Orchestrator creates image_usage record
6. Placement engine makes deterministic decision
7. Content saved with image references
```

### Pattern 3: Image Upload (CMS)

```
1. Admin uploads image via CMS
2. Request goes to Image Engine
3. Image Engine processes (WebP, SEO metadata)
4. Image stored in Object Storage
5. Metadata returned to CMS
6. CMS saves reference to content
```

---

## Boundary Violations (Anti-Patterns)

### NEVER DO:

```typescript
// BAD: Frontend making image decisions
if (!image) {
  image = getFallbackImage(); // Frontend fallback - WRONG
}

// BAD: CMS calling Freepik directly
const image = await freepikClient.search(query); // Bypass - WRONG

// BAD: Octopus bypassing Image Engine
const image = await fetch('https://api.freepik.com/...'); // Direct call - WRONG

// BAD: API returning empty arrays
return { destinations: [] }; // Empty array - WRONG
```

### ALWAYS DO:

```typescript
// GOOD: API applies fallbacks
const destinations = await db.query(...);
if (destinations.length === 0) {
  return FALLBACK_DESTINATIONS; // Server-side fallback
}

// GOOD: Octopus uses Image Engine
const image = await imageEngine.acquire({
  entityType: 'hotel',
  entityId: 'hotel-123',
  role: 'hero'
});

// GOOD: Image Engine handles external calls
class ImageEngine {
  async acquire(request) {
    return await this.freepikClient.search(request);
  }
}
```

---

## Monitoring & Telemetry

### Key Metrics

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| Fallback usage rate | API logs | > 5% |
| Image Engine latency | Image Service | > 2s p95 |
| Octopus queue depth | Queue Manager | > 100 jobs |
| Image reuse violations | Placement Engine | Any |
| Empty array responses | Public API | Any |

### Log Patterns

```
[HomepageFallback] Applied fallback for quickCategories (count: 0 → 6)
[ImageOrchestrator][AUDIT] Image approved: hotel-123/hero
[ImageEngine] Freepik rate limit applied, retrying in 2s
[PlacementEngine] Decision: APPROVE for entity=hotel-123, role=gallery
```

---

## Phase 9: Search, Chat & AI Governance

### 5. Search Loop

**Role:** Central Search Index with Deterministic Fallbacks

| DO | DO NOT |
|----|--------|
| Return popular content when no matches | Return empty arrays |
| Use deterministic fallback ordering | Let frontend handle empty states |
| Index destinations, articles, hotels | Search external sources |
| Log all fallback usage | Silently fail |

**API Endpoint:** `GET /api/public/search?q={query}`

**Key Files:**
- `server/search/search-service.ts`
- `server/search/search-index.ts`

**Invariants:**
- Search NEVER returns empty results
- Fallbacks are deterministic (popular destinations + recent articles)
- All searches are logged for analytics

---

### 6. Chat Loop

**Role:** Stateless Contextual Chat via AI Orchestrator

| DO | DO NOT |
|----|--------|
| Route all AI calls through Orchestrator | Call AI providers directly |
| Include page context in prompts | Store chat history server-side |
| Return structured actions with responses | Hallucinate entity links |
| Use fallback response when AI unavailable | Expose raw AI errors |

**API Endpoint:** `POST /api/chat`

**Key Files:**
- `server/chat/chat-handler.ts`
- `server/chat/chat-prompts.ts`

**Invariants:**
- Chat ALWAYS uses AI Orchestrator (no direct provider calls)
- All entity references validated via Navigation Intelligence
- Fallback response provided when AI overloaded

---

### 7. Content Lifecycle

**Role:** State Machine for Content Publishing

```
draft → in_review → reviewed → approved → scheduled → published → archived
                                                          ↓
                                                        draft (restore)
```

| DO | DO NOT |
|----|--------|
| Enforce valid state transitions | Allow arbitrary status changes |
| Audit log all transitions | Skip validation |
| Support scheduled publishing | Publish without approval workflow |
| Enable archive → draft restore | Permanently delete without archive |

**Key File:** `server/content/content-lifecycle.ts`

**Invariants:**
- Invalid transitions are rejected with clear errors
- All state changes are audit logged
- `publishedAt` set only on first publish

---

### 8. AI Task Governance

**Role:** Per-Category Rate & Token Limits

| DO | DO NOT |
|----|--------|
| Enforce per-category request limits | Allow unlimited AI requests |
| Track token usage per category | Process tasks without category |
| Log all rejections and fallbacks | Silently drop requests |
| Expose metrics for monitoring | Hide governance decisions |

**API Endpoint:** `GET /api/ai/metrics/tasks`

**Key File:** `server/ai-orchestrator/task-governance.ts`

**Category Limits:**
| Category | Requests/Hour | Max Tokens |
|----------|---------------|------------|
| news | 50 | 10,000 |
| evergreen | 30 | 15,000 |
| content | 100 | 8,000 |
| translation | 200 | 5,000 |
| image | 50 | 1,000 |

**Invariants:**
- AI tasks without explicit category are REJECTED
- All fallbacks are logged
- No single category exhausts system resources

---

### 9. User Context

**Role:** Session-Based Memory (No PII)

| DO | DO NOT |
|----|--------|
| Store last searches (max 10) | Store emails, names, IPs |
| Track visited pages | Persist beyond session |
| Enable contextual recommendations | Share context across users |
| Auto-expire after 1 hour | Store indefinitely |

**Key File:** `server/session/user-context.ts`

**Invariants:**
- No PII stored in user context
- FIFO limit of 10 items per list
- 1-hour automatic expiry
- In-memory storage only (ephemeral)

---

### 10. Navigation Intelligence

**Role:** Entity Link Resolution & Hallucination Prevention

| DO | DO NOT |
|----|--------|
| Validate entities exist before linking | Return URLs for non-existent entities |
| Support batch resolution | Allow AI to hallucinate links |
| Build URLs via centralized mapper | Hardcode URL patterns |
| Return null for missing entities | Return broken links |

**Key Files:**
- `server/navigation/entity-resolver.ts`
- `server/navigation/url-mapper.ts`

**Invariants:**
- Links returned only for entities that exist in database
- URL patterns centralized in url-mapper.ts
- Batch resolution for performance

---

### 11. Admin Visibility

**Role:** Read-Only System Health Dashboard

**Dashboard:** `/admin/system-health`

**Metrics Displayed:**
- AI task governance metrics
- Search fallback rates
- Chat availability status
- Content lifecycle distribution
- Active session count

**Invariants:**
- Read-only (no mutations)
- Accessible to admin roles only
- Real-time data from service layers

---

### 12. Failure Modes

**Role:** Unified Fallback Message System

| Fallback Type | When Used |
|---------------|-----------|
| `SEARCH_NO_RESULTS` | Search returns no matches |
| `CHAT_UNAVAILABLE` | AI Orchestrator overloaded |
| `CONTENT_NOT_FOUND` | Entity doesn't exist |
| `AI_OVERLOADED` | Rate limits exceeded |
| `RATE_LIMITED` | Too many requests |
| `SESSION_EXPIRED` | Session timeout |

**Key Files:**
- `shared/fallback-messages.ts` (definitions)
- `server/fallbacks/fallback-handler.ts` (implementation)

**Invariants:**
- All fallbacks use centralized message definitions
- Every fallback includes: title, description, suggestion, action
- Fallback events are logged for monitoring

---

## Phase 9 Hard Invariants

These rules are absolute for Phase 9 features:

### Search Guarantees

```
Search Query ──────▶ Search Index ──────▶ Results Found? ──────▶ Return Results
                                                │
                                                ▼ (No)
                                         Return Fallback Results
                                         (Popular + Recent)
```

1. **Search NEVER returns empty results**
2. **Fallbacks are deterministic** (same algorithm, predictable content)
3. **All search events logged** for analytics

### Chat Guarantees

```
Chat Request ──────▶ AI Orchestrator ──────▶ Provider Available? ──────▶ AI Response
                                                      │
                                                      ▼ (No)
                                               Fallback Response
```

1. **Chat ALWAYS uses AI Orchestrator** (no direct provider calls)
2. **Entity links validated** before inclusion in responses
3. **Graceful degradation** with helpful fallback

### AI Governance Guarantees

```
AI Task ──────▶ Category Check ──────▶ Has Category? ──────▶ Rate Check ──────▶ Execute
                                             │
                                             ▼ (No)
                                        REJECT TASK
```

1. **AI tasks without category are REJECTED**
2. **Per-category limits enforced**
3. **All rejections logged**

### Privacy Guarantees

1. **No PII stored in user context**
2. **Session data ephemeral** (1-hour max)
3. **No cross-session tracking**

---

## Phase 9 Anti-Patterns

### NEVER DO:

```typescript
// BAD: Chat calling AI provider directly
const response = await openai.chat.completions.create({...}); // WRONG

// BAD: Search returning empty array
if (results.length === 0) {
  return { results: [] }; // WRONG - must use fallback
}

// BAD: AI task without category
await orchestrator.submitTask({
  prompt: "...",
  // Missing category - WILL BE REJECTED
});

// BAD: Storing PII in user context
updateSessionContext(sessionId, {
  email: "user@example.com", // WRONG - no PII
  name: "John Doe",          // WRONG - no PII
});

// BAD: Returning unvalidated entity links
const url = `/destinations/${suggestedSlug}`; // WRONG - may not exist
```

### ALWAYS DO:

```typescript
// GOOD: Chat using AI Orchestrator
const response = await getAIOrchestrator().submitTask({
  category: 'content',
  prompt: buildChatPrompt(message, context),
});

// GOOD: Search with fallback
const results = await searchAll(query);
if (results.length === 0) {
  return await getFallbackResults(limit); // Server-side fallback
}

// GOOD: AI task with explicit category
await orchestrator.submitTask({
  category: 'translation', // Explicit category
  prompt: "...",
});

// GOOD: Session context without PII
updateSessionContext(sessionId, {
  lastSearches: [query], // Behavioral only
  visitedPages: [path],  // Behavioral only
});

// GOOD: Validated entity links
const url = await resolveEntityLink('destination', slug);
if (!url) return null; // Entity doesn't exist
```

---

## Phase 10: System Hardening & Optimization

### 13. Search Intelligence

**Role:** Advanced Query Processing & Ranking

| Capability | Description |
|------------|-------------|
| Ranking Signals | Popularity (views/clicks), recency (7-day boost), entity type weighting |
| Query Expansion | Synonym expansion, city alias resolution (NYC→New York), misspelling correction |
| Telemetry | Query volume, click-through rates, zero-result tracking |

**Key Files:**
- `server/search/query-expander.ts`
- `server/search/search-metrics.ts`

**Invariants:**
- Misspelling map is deterministic (no AI)
- Ranking is reproducible (same query → same order)
- All search events logged for analytics

---

### 14. Chat → Action Conversion

**Role:** Intent Detection & Entity-Resolved Suggestions

| Intent | Trigger Patterns | Output |
|--------|------------------|--------|
| `browse` | "show me", "find", "best hotels in" | Entity list with links |
| `compare` | "vs", "difference between", "which is better" | Comparison table |
| `plan` | "itinerary", "3 days in", "weekend trip" | Trip plan outline |
| `learn` | "what is", "tell me about", "history of" | Informational response |

**Key File:** `server/chat/intent-detector.ts`

**Invariants:**
- Intent detection is keyword-based (no AI call)
- All entity suggestions validated via Navigation Intelligence
- Structured output format consistent across intents

---

### 15. Content Quality Signals

**Role:** Performance Tracking & AI Regeneration Guard

| Metric | Weight | Purpose |
|--------|--------|---------|
| Click-through rate | 30% | Engagement signal |
| Scroll depth | 20% | Content value indicator |
| Impressions | 25% | Visibility signal |
| Time on page | 25% | Quality indicator |

**Key File:** `server/content/metrics/content-performance.ts`

**Invariants:**
- High-performing content (score > 80) protected from AI regeneration
- Modification cooldown: 24 hours minimum between updates
- All performance data persisted to disk

---

### 16. AI Cost & Value Analytics

**Role:** Cost Tracking & ROI Analysis

| Provider | Rate ($/1K tokens) | Value Category |
|----------|-------------------|----------------|
| OpenAI (GPT-4) | $0.030 | High precision |
| Anthropic (Claude) | $0.015 | Balanced |
| Gemini | $0.0075 | Cost-effective |
| DeepSeek | $0.002 | Budget option |

**Key File:** `server/ai-orchestrator/cost-analytics.ts`

**Invariants:**
- All AI calls tracked with estimated cost
- High-value tasks (content, SEO) prioritized
- Cost alerts when daily spend exceeds threshold

---

### 17. Multi-Language Hardening

**Role:** Canonical Source & Translation Freshness

| Rule | Description |
|------|-------------|
| Canonical Source | English (en) is ALWAYS the source of truth |
| Translation Chain | en → target locale (never locale → locale) |
| Freshness Check | Compare translation.lastUpdated vs source.lastUpdated |
| Fallback Hierarchy | Requested locale → English → error |

**Key Files:**
- `server/localization/canonical-rules.ts`
- `server/localization/freshness-checker.ts`

**Invariants:**
- No translation derived from non-English source
- Stale translations flagged for regeneration
- Source hash tracked for change detection

---

### 18. User Journey Coherence

**Role:** Journey Stage Tracking & Dead End Prevention

| Stage | Pages | Valid Next Stages |
|-------|-------|-------------------|
| `entry` | Homepage, /destinations | exploration, deep_dive |
| `exploration` | Category pages, destination detail | deep_dive, retention |
| `deep_dive` | Individual hotels, attractions, articles | retention, exploration |
| `retention` | Newsletter, saved items, compare | exploration, deep_dive |

**Key File:** `server/navigation/journey-analyzer.ts`

**Invariants:**
- Dead ends detected and flagged
- Suggested links generated from related content
- Journey metrics logged for analysis

---

### 19. Rate & Queue Stress Modes

**Role:** Graceful Degradation Under Load

| Tier | Capacity | Behavior |
|------|----------|----------|
| GREEN | < 50% | All features enabled |
| YELLOW | 50-80% | Defer non-critical AI tasks |
| RED | > 80% | Serve cached content only |

**Key File:** `server/system/load-tiers.ts`

**Invariants:**
- Tier transitions logged with timestamp
- Deferred tasks queued for green tier
- No hard failures under load

---

### 20. Background Optimizers

**Role:** Low-Priority Job Processing

| Job Type | Priority | Description |
|----------|----------|-------------|
| `seo-improvement` | low | Enhance meta descriptions |
| `internal-linking` | low | Add related content links |
| `content-enrichment` | low | Add missing fields |

**Key File:** `server/jobs/background-scheduler.ts`

**Invariants:**
- Auto-pause when tier is yellow/red
- Resume when tier returns to green
- No blocking of user-facing requests

---

### 21. Failure Simulation (Resilience Tests)

**Role:** Verify Graceful Degradation

| Scenario | Test | Expected Behavior |
|----------|------|-------------------|
| AI Provider Outage | All providers unavailable | Fallback response, no 500 |
| Empty CMS | Zero destinations/articles | Server-side fallbacks |
| Image Failure | Freepik/OpenAI unavailable | Placeholder images |

**Test Files:**
- `tests/resilience/ai-provider-outage.test.ts`
- `tests/resilience/empty-cms.test.ts`
- `tests/resilience/image-provider-failure.test.ts`

**Invariants:**
- No user-facing 500 errors in failure scenarios
- All failures logged with context
- Fallback responses are helpful and actionable

---

## Phase 11: System Leverage & Scale Readiness

### 22. Growth Loop Architecture

**Role:** Self-Reinforcing Traffic & Engagement Loops

**Search Loop:** `Search → Content Discovery → Internal Links → Improved Rankings → More Search`

**Chat Loop:** `Chat Session → Exploration → Deep Dive → Retention → Return Visits`

| Leverage Point | Mechanism | Metric |
|----------------|-----------|--------|
| Internal linking | Related content suggestions | Pages/session |
| Session depth | Context-aware recommendations | Avg. session depth |
| Return visits | Newsletter + intent memory | Return rate |

**Key File:** `docs/GROWTH-LOOPS.md`

**Invariants:**
- All internal links validated via entity-resolver
- Suggestion algorithms are deterministic
- Growth metrics logged for analysis

---

### 23. Monetization Readiness

**Role:** SEO-Safe Commercial Integration Points

| Surface | Type | Status |
|---------|------|--------|
| Hotel pages (post-content) | Affiliate booking links | Ready (disabled) |
| Experience listings | Activity booking | Ready (disabled) |
| Email newsletters | Curated deals | Ready (disabled) |

**Activation:** Set `ENABLE_MONETIZATION=true` environment variable.

**Key File:** `docs/MONETIZATION-STRATEGY.md`

**Invariants:**
- All affiliate hooks disabled by default
- Affiliate links placed AFTER editorial content only
- Clear disclosure required on all monetized pages
- No ranking manipulation based on commission rates

---

### 24. Content Value Automation

**Role:** AI-Powered Content Improvement Queue

| Metric | Formula | Decision |
|--------|---------|----------|
| Value Score | `performance ÷ AI cost` | Queue priority |
| Low-Cost Win | `cost < $0.02 AND score < 40` | Auto-queue |
| Protection | `score > 80` | NEVER modify |

**Key File:** `server/content/value-automation.ts`

**Invariants:**
- High-performing content (score > 80) is protected from AI regeneration
- Improvement tasks use existing background-scheduler
- All decisions logged for audit

---

### 25. User Intent Memory

**Role:** Session-Based Personalization Without PII

| Limit | Value | Purpose |
|-------|-------|---------|
| Max entities | 10 | FIFO queue of viewed items |
| Max intents | 5 | Recent intent signals |
| TTL | 1 hour | Hard expiry |

**Key File:** `server/session/intent-memory.ts`

**Invariants:**
- NO PII stored (only entity IDs and intent types)
- Session-scoped only (ephemeral)
- Hard TTL enforced via pruning job

---

### 26. Search ↔ Chat Symbiosis

**Role:** Unified Cognitive Layer for Intent-Aware Operations

| Function | Purpose |
|----------|---------|
| `getUnifiedIntent(sessionId)` | Get all intent signals |
| `applyIntentToSearch(intent, options)` | Modify search ranking |
| `applySearchToChat(results, context)` | Enhance chat with search |

**Key Files:**
- `shared/intent-schema.ts` (shared types)
- `server/cognitive/unified-layer.ts` (implementation)

**Invariants:**
- Intent schema shared between search and chat
- All entity links validated before inclusion
- Additive integration only (no breaking changes)

---

### 27. AI Provider Strategy

**Role:** Provider Scorecards & Recommendation Engine

| Provider | Cost/1K | Latency | Quality | Availability |
|----------|---------|---------|---------|--------------|
| OpenAI | $0.030 | Medium | High | High |
| Anthropic | $0.015 | Medium | High | High |
| Gemini | $0.0075 | Fast | Medium | High |
| DeepSeek | $0.002 | Slow | Medium | Medium |

**Functions:**
- `getProviderScorecard(provider)` - Current provider metrics
- `getProviderRecommendation(category)` - Best provider for task
- `simulateProviderRemoval(provider)` - Impact analysis

**Key File:** `server/ai-orchestrator/provider-strategy.ts`

**Invariants:**
- Simulations are read-only (no actual provider changes)
- Recommendations based on real telemetry data
- All provider decisions logged

---

### 28. Operational Alerting

**Role:** Human-Safe Alert System

| Alert Type | Threshold | Cooldown |
|------------|-----------|----------|
| Cost spike | > 150% daily avg | 15 min |
| Provider degraded | > 3 failures/5min | 15 min |
| Search empty rate | > 10% | 15 min |
| Red tier activated | > 5 min duration | 15 min |

**Functions:**
- `checkAlertConditions()` - Check all conditions
- `formatAlertForHumans(alert)` - Plain English message
- `getActiveAlerts()` - Non-expired alerts

**Key File:** `server/system/alerts/alert-handler.ts`

**Invariants:**
- 15-minute cooldown per alert type (no spam)
- Human-readable messages (no jargon)
- Max 100 alerts retained, 24-hour TTL

---

### 29. Platform Guardrails

**Role:** Invariant Enforcement at Runtime

| Location | Purpose |
|----------|---------|
| `shared/invariants.ts` | System-wide constants |
| `server/lib/guards.ts` | Runtime assertions |

**Key Guards:**
- `assertInvariant(condition, message)` - Generic assertion
- `guardImageAccess()` - Block direct image provider calls
- `guardLocaleCanonical(locale)` - Ensure English as source

**Invariants:**
- Invariant violations throw `InvariantError`
- All guards logged in development
- Impossible states are asserted at compile time where possible

---

### 30. Simulation Mode

**Role:** Read-Only "What If" Analysis

| Scenario | Description | Key Metrics |
|----------|-------------|-------------|
| Traffic spike (10x) | Simulate 10x normal load | Bottlenecks, tier transitions |
| Provider outage | Single/multi provider failure | Fallback rate, impact |
| Content explosion | 1000+ new articles | Queue depth, processing time |

**Function:** `runSimulation(scenario, params): SimulationResult`

**Key File:** `server/simulation/simulator.ts`

**Invariants:**
- `isSimulationMode = true` flag during simulation
- All writes blocked in simulation mode
- No production side effects

---

## Platform Identity

### What This Platform IS

TRAVI is a **travel content CMS with AI-powered intelligence** that:

- Publishes high-quality travel content (destinations, hotels, attractions, articles)
- Uses AI for content generation, translation, and optimization
- Provides search and chat interfaces for content discovery
- Enforces strict SEO/AEO standards for organic traffic
- Operates as a read-heavy, content-first platform

### What This Platform IS NOT

| Not This | Why |
|----------|-----|
| **Booking engine** | Use affiliate links; no inventory management |
| **Social network** | No user-to-user messaging; content-first |
| **Real-time system** | Background jobs for AI; cached content delivery |
| **User-generated content platform** | Editorial control; no public reviews/ratings |
| **E-commerce platform** | Affiliate revenue model; no transactions |

---

## Future Roadmap (Non-Binding)

### Phase 12 Possibilities

| Feature | Complexity | Architectural Impact |
|---------|------------|---------------------|
| Advanced personalization | Medium | Extends intent-memory; may need persistent profiles |
| A/B testing framework | Medium | Additive; feature flags infrastructure |
| Premium content tiers | Low | Extends monetization; gated content |
| Multi-tenant support | High | Major schema changes; auth overhaul |
| Real-time collaboration | High | WebSocket infrastructure; conflict resolution |

### Architectural Change Requirements

**Would Require Schema Changes:**
- User accounts with persistent preferences
- Multi-tenant content isolation
- Subscription billing integration

**Would Require Infrastructure Changes:**
- Real-time collaboration (WebSockets, CRDTs)
- CDN-level personalization
- Multi-region deployment

**Can Be Built Additively:**
- A/B testing (feature flags)
- Premium content (access control)
- Enhanced analytics (more telemetry)

---

## System Loop Diagrams

### User Loop

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER JOURNEY LOOP                               │
└─────────────────────────────────────────────────────────────────────────────┘

      ┌──────────┐         ┌──────────────┐         ┌──────────────┐
      │  Entry   │────────▶│  Exploration │────────▶│  Deep Dive   │
      │ Homepage │         │  Categories  │         │   Articles   │
      └──────────┘         └──────────────┘         └──────────────┘
           │                      │                        │
           │                      │                        │
           ▼                      ▼                        ▼
      ┌──────────────────────────────────────────────────────────┐
      │                    Search / Chat                          │
      │  Query → Expand → Rank → Filter → Results/Fallback        │
      └──────────────────────────────────────────────────────────┘
                                  │
                                  ▼
      ┌──────────────────────────────────────────────────────────┐
      │                    Retention                              │
      │  Newsletter, Saved Items, Compare, Return Visits          │
      └──────────────────────────────────────────────────────────┘
```

### AI Loop

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AI TASK LOOP                                    │
└─────────────────────────────────────────────────────────────────────────────┘

  Task Submitted
        │
        ▼
  ┌──────────────┐    No     ┌────────────────┐
  │ Has Category?│──────────▶│ REJECT (logged)│
  └──────────────┘           └────────────────┘
        │ Yes
        ▼
  ┌──────────────┐    Exceeded  ┌────────────────┐
  │ Rate Limit?  │─────────────▶│ DEFER (queued) │
  └──────────────┘              └────────────────┘
        │ OK
        ▼
  ┌──────────────┐    RED/YELLOW ┌────────────────┐
  │ Load Tier?   │──────────────▶│ DEFER non-crit │
  └──────────────┘               └────────────────┘
        │ GREEN
        ▼
  ┌──────────────┐
  │ Select       │    Primary unavailable
  │ Provider     │──────────────▶ Fallback Chain
  └──────────────┘
        │
        ▼
  ┌──────────────┐
  │ Execute +    │
  │ Track Cost   │
  └──────────────┘
```

### Content Loop

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CONTENT LIFECYCLE LOOP                            │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────┐   ┌───────────┐   ┌──────────┐   ┌──────────┐   ┌───────────┐
  │  Draft  │──▶│ In Review │──▶│ Reviewed │──▶│ Approved │──▶│ Scheduled │
  └─────────┘   └───────────┘   └──────────┘   └──────────┘   └───────────┘
       ▲                                                            │
       │                                                            ▼
       │          ┌──────────┐                              ┌───────────┐
       └──────────│ Archived │◀─────────────────────────────│ Published │
      (restore)   └──────────┘                              └───────────┘
                                                                   │
                                                                   ▼
                                              ┌─────────────────────────────┐
                                              │ Performance Monitoring      │
                                              │ - Click-through rate        │
                                              │ - Scroll depth              │
                                              │ - Quality score             │
                                              └─────────────────────────────┘
                                                           │
                                                           ▼
                                              ┌─────────────────────────────┐
                                              │ AI Regeneration Guard       │
                                              │ Score > 80? PROTECTED       │
                                              │ Score < 40? Flag for review │
                                              └─────────────────────────────┘
```

---

## WHAT NOT TO BUILD

**Anti-patterns and scope boundaries to prevent over-engineering.**

### Never Build

| Category | Anti-Pattern | Why Not |
|----------|--------------|---------|
| **Real-time AI** | Live AI in request path | Latency kills UX; use background jobs |
| **Client-side AI** | AI calls from frontend | Exposes API keys; breaks caching |
| **Custom ML Models** | Train bespoke models | Use existing providers; focus on integration |
| **Blockchain/Web3** | NFTs, crypto payments | Off-brand; adds complexity |
| **Social Network** | User-to-user messaging | We're a content platform, not social |
| **Booking Engine** | Direct hotel/flight booking | Use affiliate links; no inventory risk |
| **User-Generated Content** | Reviews, ratings, forums | Quality control nightmare; SEO spam risk |

### Avoid Over-Engineering

| Bad Pattern | What To Do Instead |
|-------------|---------------------|
| Build custom rate limiter | Use `express-rate-limit` + load tiers |
| Build custom cache layer | Use in-memory stores + fallbacks |
| Build custom search engine | Use PostgreSQL full-text + query expansion |
| Build custom image CDN | Use Object Storage + Image Engine |
| Build custom auth system | Use Replit Auth integration |
| Build custom analytics | Use PostHog + server-side telemetry |

### Scope Traps

```
❌ DO NOT: Add features for hypothetical future users
❌ DO NOT: Build admin features before public features work
❌ DO NOT: Add database columns "just in case"
❌ DO NOT: Create abstractions before you have 3 use cases
❌ DO NOT: Optimize before you have performance data

✅ DO: Ship working features incrementally
✅ DO: Use existing libraries over custom code
✅ DO: Fallback gracefully instead of blocking on edge cases
✅ DO: Log everything, alert on anomalies
✅ DO: Keep the API contract stable; extend, don't break
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.3.0 | 2024-12-31 | Phase 11: Growth Loops, Monetization Readiness, Content Value Automation, Intent Memory, Search↔Chat Symbiosis, Provider Strategy, Alerting, Guardrails, Simulation Mode |
| 1.2.0 | 2024-12-31 | Phase 10: Search Intelligence, Chat Actions, Content Quality, AI Cost, i18n Hardening, Journey Coherence, Load Tiers, Background Jobs, Resilience Tests |
| 1.1.0 | 2024-12-31 | Phase 9: Search, Chat, AI Governance, User Context |
| 1.0.0 | 2024-12-31 | Initial architecture documentation |

---

## Frozen Contracts

**These contracts are LOCKED and must not be changed without explicit approval.**

### Image Engine API Contract

```typescript
// Endpoint: /api/v1/images/*
// Owner: Image Engine (server/services/image-service.ts)
// Consumers: Octopus, CMS Admin

interface ImageAcquireRequest {
  entityType: string;
  entityId: string;
  role: 'hero' | 'card' | 'gallery' | 'thumbnail';
  keywords?: string[];
}

interface ImageAcquireResponse {
  success: boolean;
  imageUrl: string;
  seoMetadata: {
    alt: string;
    title: string;
    schema: Record<string, unknown>;
  };
  source: 'freepik' | 'stock' | 'uploaded' | 'ai-generated';
}
```

**FROZEN:** This API shape is stable. Changes require migration plan.

### Octopus Image Enforcement Contract

```typescript
// Owner: Octopus Image Orchestrator (server/octopus/image-orchestrator.ts)
// Invariant: NO IMAGE without image_usage record

interface ImageUsageRecord {
  assetPath: string;
  entityType: string;
  entityId: string;
  role: 'hero' | 'card' | 'gallery' | 'thumbnail';
  approved: boolean;
  approvedAt: Date;
}
```

**FROZEN:** All Octopus-processed images MUST have usage records.

### Freepik Access Path

```
                    ONLY PATH
Octopus ───────────────────────▶ Image Engine ───────────────────────▶ Freepik
CMS ───────────────────────────▶ Image Engine ───────────────────────▶ Freepik

BLOCKED PATHS (will throw errors):
- Frontend → Freepik
- CMS → Freepik (direct)
- Octopus → Freepik (direct)
- AI Orchestrator → Freepik
```

**FROZEN:** Image Engine is the ONLY component that talks to Freepik.

### Intelligence Layer Outputs

```typescript
// Owner: Image Intelligence (server/octopus/intelligence-client.ts)
// Consumer: Image Orchestrator

interface IntelligenceOutput {
  confidence: number;  // 0.0 - 1.0
  suggestedRole: 'hero' | 'card' | 'gallery';
  duplicateOf?: string;
  qualityScore: number;
  seoScore: number;
}
```

**FROZEN:** Intelligence outputs feed placement decisions deterministically.

### Explicit Rules

1. **Image Engine is the ONLY path to Freepik**
   - No exceptions
   - AI Orchestrator throws error if image task submitted directly
   - Validated at provider-pool.ts level

2. **AI Orchestrator MUST NOT touch images**
   - Image tasks are explicitly blocked
   - Task category 'image' throws error in selectProvider()
   - See: server/ai-orchestrator/provider-pool.ts:159-168

3. **Frontend NEVER calls Freepik or AI directly**
   - All image URLs come from backend
   - All AI responses come from backend APIs
   - No external API keys exposed to client

---

## Related Documents

- `docs/API.md` - API reference
- `docs/SECURITY.md` - Security controls
- `replit.md` - Project overview and recent changes
