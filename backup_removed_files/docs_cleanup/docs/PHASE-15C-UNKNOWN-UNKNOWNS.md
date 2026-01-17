# Phase 15C: Unknown Unknowns

**Date:** 2026-01-01
**Author:** System Architect
**Purpose:** Identify problems we haven't discussed yet - things teams discover too late

---

## Executive Summary

This document captures **non-obvious failure modes** and **emergent problems** that typically surface only after production deployment. These are patterns I've observed in similar AI-powered content platforms.

---

## 1. AI Model Drift

### Problem
AI models (Claude, GPT) change behavior over time without notice. Your prompts will produce different outputs after model updates.

### How It Manifests
- Content quality suddenly degrades
- JSON parsing starts failing (model stops following format)
- Entity extraction misses previously-detected entities
- Writing style changes noticeably

### Why It's Hidden
- No monitoring for output quality drift
- Tests pass because they use mocked responses
- Gradual degradation not immediately noticed

### Evidence in Codebase
```typescript
// server/ai/providers.ts - models hardcoded
model: options.model || "gpt-4o-mini"
model: options.model || "claude-sonnet-4-5"
```

No version pinning. No output quality monitoring. No A/B comparison.

### Mitigation
- Store sample outputs for regression testing
- Monitor entity extraction rates over time
- Alert when JSON parse failure rate increases

---

## 2. Semantic Search Quality Degradation

### Problem
Semantic search embeddings become stale as vocabulary and context evolve.

### How It Manifests
- New terms (e.g., "metaverse hotel experience") don't match well
- Search relevance scores decline without code changes
- Users complain about irrelevant results

### Why It's Hidden
- No baseline relevance metrics
- A/B testing not implemented
- User feedback loop not connected to search team

### Evidence in Codebase
```typescript
// server/search/search-service.ts
// No embedding freshness tracking
// No relevance feedback collection
```

### Mitigation
- Periodic embedding refresh for popular content
- Collect click-through rates per search query
- Implement relevance feedback loop

---

## 3. Entity Canonicalization Failures

### Problem
The same real-world entity gets multiple database entries.

### How It Manifests
- "Burj Khalifa" vs "Burj Al Khalifa" vs "Khalifa Tower" = 3 entities
- Internal linking spreads authority across duplicates
- Search returns multiple entries for same place
- Analytics fragmented across duplicates

### Why It's Hidden
- Extraction confidence thresholds don't detect this
- No duplicate detection in upsert
- Gradual accumulation over time

### Evidence in Codebase
```typescript
// server/octopus/entity-upsert.ts:431
// Fingerprint-based matching, but fingerprints differ for name variants
```

### Mitigation
- Implement fuzzy matching on entity names
- Periodic duplicate detection job
- Canonical entity registry with aliases

---

## 4. Content Cascade Failures

### Problem
Updating one piece of content breaks dependent content.

### How It Manifests
- Change hotel name → internal links across site break
- Delete attraction → cached pages show 404 links
- Update pricing → translated versions show old prices

### Why It's Hidden
- No dependency graph
- Internal links stored as strings, not references
- Translation sync not triggered on source update

### Evidence in Codebase
```typescript
// server/ai/internal-linking-engine.ts
// Links stored as URL strings, not content references
slug: `/hotels/${slug}`  // If slug changes, links break
```

### Mitigation
- Store internal links as contentId references
- Implement dependency invalidation
- Trigger translation refresh on source update

---

## 5. Localization Temporal Inconsistency

### Problem
Content in different languages shows different states.

### How It Manifests
- English page updated, Arabic still shows old content
- Pricing changed in source, translations stale
- New section added, only visible in some languages

### Why It's Hidden
- Translation is async (job queue)
- No "translation freshness" indicator
- Users see whatever version is available

### Evidence in Codebase
```typescript
// server/auto-pilot.ts:310
// Translation jobs queued but completion not tracked
await jobQueue.addJob("translate", {...});
// No mechanism to mark content as "awaiting translation"
```

### Mitigation
- Show "translation pending" indicator
- Block serving stale translations after major updates
- Priority queue for critical content

---

## 6. Rate Limit Exhaustion Across Providers

### Problem
Multiple features compete for same AI provider quota.

### How It Manifests
- Chat stops working during Octopus batch processing
- AEO generation blocked by content refresh jobs
- Translation queue causes article generation to fail

### Why It's Hidden
- Per-feature rate limiting, not global coordination
- No visibility into queue depth across features
- Priority inversion not monitored

### Evidence in Codebase
```typescript
// Multiple rate limiters that don't coordinate:
// server/ai/request-queue.ts - per-provider limits
// server/ai-orchestrator/rate-policy.ts - separate limits
// server/security/rate-limiter.ts - per-endpoint limits
```

### Mitigation
- Global AI budget manager
- Cross-feature priority system
- Real-time quota dashboard

---

## 7. Event Handler Ordering Assumptions

### Problem
Event handlers assume execution order that isn't guaranteed.

### How It Manifests
- Internal links reference entity not yet persisted
- Search indexes content before AEO capsule generated
- Cache cleared before new data available

### Why It's Hidden
- Works in testing (sequential execution)
- Race conditions only appear under load
- Non-deterministic failures hard to reproduce

### Evidence in Codebase
```typescript
// server/events/content-subscribers.ts
// All handlers registered to same event
// No explicit ordering or dependency declaration
contentEvents.onPublished(handleSearchIndexOnPublish, 'SearchIndexer');
contentEvents.onPublished(handleAEOGenerationOnPublish, 'AEOGenerator');
// Which runs first? Undefined.
```

### Mitigation
- Document handler dependencies
- Implement ordered event chains
- Add correlation IDs for tracing

---

## 8. Memory Leak from Long-Running Processes

### Problem
In-memory caches and maps grow unbounded over days.

### How It Manifests
- Server restarts needed weekly
- Response times degrade gradually
- OOM kills during traffic spikes

### Why It's Hidden
- Fresh deployments mask the issue
- Memory grows slowly
- Only visible in long-running production

### Evidence in Codebase
```typescript
// Multiple unbounded Maps identified:
// - server/cache.ts (MemoryCache)
// - server/security/abuse-detection.ts (ipReputations, etc.)
// - server/session/intent-memory.ts (memoryStore)
// - server/octopus/orchestrator.ts (legacyJobsCache)
```

### Mitigation
- Add memory monitoring
- Implement LRU eviction everywhere
- Alert on memory growth rate

---

## 9. Circular Dependency in Content Generation

### Problem
AI-generated content references other AI-generated content, creating loops.

### How It Manifests
- Article A cites Article B, which cites Article A
- Internal linking creates circular navigation
- SEO score degrades due to link loops

### Why It's Hidden
- No cycle detection in linking engine
- Each content piece generated independently
- Graph structure not analyzed

### Evidence in Codebase
```typescript
// server/ai/internal-linking-engine.ts
// Suggests links based on keyword matching
// No check if target already links back to source
```

### Mitigation
- Build content link graph
- Detect and break cycles
- Limit bidirectional linking

---

## 10. Third-Party API Contract Changes

### Problem
External APIs (DeepL, Google Maps, Replicate) change responses without notice.

### How It Manifests
- Translation formatting changes break parsing
- Maps API returns different field names
- Image generation output format changes

### Why It's Hidden
- No schema validation on responses
- Tests mock external APIs
- Only discovered when production breaks

### Evidence in Codebase
```typescript
// server/octopus/google-maps-enricher.ts
const place = result.candidates[0];
entity.googlePlaceId = place.place_id;  // Field name hardcoded
// No validation that field exists
```

### Mitigation
- Add response schema validation
- Integration tests against real APIs (staging)
- Monitor API response structure

---

## Summary Table

| # | Unknown | Detection Difficulty | Impact | Discovery Timing |
|---|---------|---------------------|--------|------------------|
| 1 | AI Model Drift | Hard | HIGH | Weeks after deploy |
| 2 | Semantic Search Degradation | Hard | MEDIUM | Months |
| 3 | Entity Canonicalization | Medium | HIGH | Weeks |
| 4 | Content Cascade Failures | Medium | HIGH | First major update |
| 5 | Localization Inconsistency | Easy | MEDIUM | First translation cycle |
| 6 | Rate Limit Exhaustion | Medium | HIGH | First traffic spike |
| 7 | Event Handler Ordering | Hard | MEDIUM | Under load |
| 8 | Memory Leaks | Medium | CRITICAL | Days to weeks |
| 9 | Circular Dependencies | Medium | LOW | Content audit |
| 10 | API Contract Changes | Hard | HIGH | External change |

---

## Recommendations

### Pre-Production
1. Implement memory monitoring and alerting
2. Add response schema validation for external APIs
3. Build content dependency graph

### First Month
4. Implement AI output quality regression tests
5. Add duplicate entity detection
6. Global AI quota management

### First Quarter
7. Search relevance feedback loop
8. Translation freshness tracking
9. Event handler dependency documentation
10. Periodic link cycle detection
