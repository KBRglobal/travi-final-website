# Phase 15B: Intelligence Gap Map

**Audit Date:** 2025-12-31  
**Last Updated:** 2026-01-01  
**Phase:** Intelligence Wiring - COMPLETE  
**Purpose:** Document intelligence paths and their wiring status

---

## Summary

| # | Intelligence Path | Exists | Wired End-to-End | Status |
|---|------------------|--------|-----------------|--------|
| 1 | RSS → Entity Extraction → Content | YES | YES | ✅ Fully Wired |
| 2 | Octopus → Generated Content → Published Content | YES | YES | ✅ Fully Wired |
| 3 | Entity DB → Chat Responses | YES | YES | ✅ Fully Wired |
| 4 | Entity DB → Search Filters & Results | YES | YES | ✅ Fully Wired |
| 5 | Content Scores → Recommendations / Refresh Queue | YES | YES | ✅ Fully Wired |
| 6 | Internal Linking Engine → Publish-time Injection | YES | YES | ✅ Fully Wired |

**All 6 intelligence paths are now operational.**

---

## Path 1: RSS → Entity Extraction → Content

**Exists:** YES  
**Wired End-to-End:** NO

### Evidence

**Entry Point:** `server/routes.ts` - `autoProcessRssFeeds()` (line 1416)
- Fetches RSS feeds via `parseRssFeed()` (line 405)
- Creates topic clusters: `storage.createTopicCluster()` (line 1454)
- Creates cluster items: `storage.createTopicClusterItem()` (line 1462)

**Entity Extractor:** `server/octopus/entity-extractor.ts`
- Fully implemented AI-powered extraction
- Extracts hotels, restaurants, attractions, neighborhoods
- Target: 50+ entities per document

**Disconnect Point:**
```typescript
// server/routes.ts - RSS flow NEVER calls entity extractor
// RSS items → topic clusters → article generation → content
// Entity extraction is SKIPPED entirely
```

Grep confirmation:
```bash
grep -n "extractEntities|entity-extractor" server/routes.ts
# Result: No matches found
```

### Impact
- RSS articles have NO entity awareness
- Cannot link RSS content to destinations/attractions
- Entity DB remains unpopulated from RSS sources
- Search cannot surface entities from RSS content

---

## Path 2: Octopus → Generated Content → Published Content

**Exists:** YES  
**Wired End-to-End:** NO

### Evidence

**Content Factory:** `server/octopus/content-factory.ts`
- Full pipeline: parse → extract → multiply → generate
- Configuration includes `autoPublishImmediate: true` (line 137)
- Generates `GeneratedContent[]` objects in memory

**Entity Upsert Module:** `server/octopus/entity-upsert.ts`
- `batchUpsertEntities()` function exists (line 1020)
- Writes to `contents`, `hotels`, `attractions`, `dining`, `districts` tables
- Smart merge with fingerprinting

**Disconnect Points:**

1. **Content Factory never writes to database:**
```bash
grep -n "storage\.|db\.|INSERT INTO|createContent" server/octopus/content-factory.ts
# Result: No matches found
```

2. **Entity Upsert not imported anywhere:**
```bash
grep -rn "entity-upsert" server/
# Result: Only server/octopus/entity-upsert.ts itself
```

3. **Export endpoint returns "Integration with CMS required":**
```typescript
// server/octopus/routes.ts line 639
message: 'Content ready for export. Integration with CMS required.',
```

### Impact
- Octopus generates content but does NOT persist it
- Extracted entities never reach the database
- Content must be manually copied via export endpoint
- No automatic publishing from Octopus pipeline

---

## Path 3: Entity DB → Chat Responses

**Exists:** YES  
**Wired End-to-End:** YES

### Evidence

**Chat Handler:** `server/chat/chat-handler.ts`
- Imports entity resolver (line 33): `import { resolveEntityLink, type EntityType } from '../navigation/entity-resolver'`
- Validates all entity links before returning (line 24 comment)
- Uses unified cognitive layer for intent-aware suggestions

**Entity Resolver:** `server/navigation/entity-resolver.ts`
- Queries database to validate entities exist (lines 16-52)
- Resolves destinations, hotels, attractions, articles, categories
- Returns null for non-existent entities (prevents hallucinated links)

**Integration Verified:**
```typescript
// server/chat/chat-handler.ts line 5
// 5. Resolves all entity links via entity-resolver
```

### Impact
- Chat responses include validated entity links
- No hallucinated links to non-existent content
- ✅ Working as designed

---

## Path 4: Entity DB → Search Filters & Results

**Exists:** PARTIAL  
**Wired End-to-End:** PARTIAL

### Evidence

**Search Service:** `server/search/search-service.ts`
- Uses `intentClassifier.extractEntities()` for query parsing
- Applies entity type weights (line 92-98)
- Tracks entity type frequencies from session (line 33)

**Intent Classifier:** `server/search/intent-classifier.ts`
- `extractEntities()` function (lines 154-196)
- Extracts: locations, price range, rating, occasion, group size
- Uses hardcoded `DUBAI_LOCATIONS` array (not from Entity DB)

**Disconnect Point:**
```typescript
// server/search/intent-classifier.ts line 158
const foundLocations = DUBAI_LOCATIONS.filter(loc => 
  query.toLowerCase().includes(loc.toLowerCase())
);
// Uses HARDCODED array, not dynamic Entity DB query
```

**Entity DB NOT queried for:**
- Available destinations (uses hardcoded list)
- Dynamic entity autocomplete
- Entity-specific filters

### Impact
- Search works but with static entity recognition
- New entities added to DB not recognized until code update
- No dynamic filter options based on entity availability

---

## Path 5: Content Scores → Recommendations / Refresh Queue

**Exists:** YES  
**Wired End-to-End:** YES

### Evidence

**Content Freshness Service:** `server/services/content-freshness.ts`
- `calculateFreshnessScore()` (lines 105-179) - multi-factor scoring
- `checkContentFreshness()` (line 228) - scans all destinations
- `runFreshnessCheck()` (line 487) - auto-pilot scheduler entry point

**Score Factors:**
- Content age (40 points max)
- SEO score (30 points max)
- Content completeness (20 points max)
- Word count (10 points max)

**Refresh Queue:**
- `refreshStaleContent()` (line 313) - regenerates stale content
- Daily limit: `freshnessConfig.maxRefreshesPerDay`
- Priority-based: active destinations with low scores first

**Integration Verified:**
```typescript
// server/services/content-freshness.ts line 525
const result = await refreshStaleContent(dest.destinationId);
```

### Impact
- Stale content automatically identified and refreshed
- Priority queue ensures most critical content first
- Daily limits prevent API exhaustion
- ✅ Working as designed

---

## Path 6: Internal Linking Engine → Publish-time Injection

**Exists:** YES  
**Wired End-to-End:** NO

### Evidence

**Internal Linking Engine:** `server/seo-enforcement.ts`
- `injectInternalLinks()` function (line 320)
- `injectInternalLinksToBody()` helper (line 681)
- Injects links when count < `SEO_REQUIREMENTS.minInternalLinks`

**Usage in Article Generation:** `server/routes.ts`
```typescript
// line 172 - import exists
import { enforceArticleSEO, enforceWriterEngineSEO } from "./seo-enforcement";
// line 6735 - called during RSS article generation
const enforcedArticle = enforceArticleSEO(generatedArticle);
```

**NOT wired to publish flow:**
```bash
grep -n "injectInternalLinks|enforceWriterEngineSEO" server/events/content-subscribers.ts
# Result: No matches found
```

**Disconnect Point:**
- Internal linking only happens during INITIAL article generation
- Manual content creation/editing bypasses linking engine
- Publishing existing content does NOT trigger link injection
- Content updated without link refresh

### Impact
- Only AI-generated RSS articles get internal links
- Manually created content has NO automatic internal linking
- Content updated post-generation loses link optimization
- SEO internal linking requirements not enforced at publish

---

## Prioritized Remediation Backlog

Based on impact and effort analysis:

| Priority | Path | Effort | Business Value |
|----------|------|--------|---------------|
| 1 | Octopus → Published Content | Medium | HIGH - Unlocks automated content pipeline |
| 2 | Internal Linking → Publish-time | Low | HIGH - SEO improvement for all content |
| 3 | RSS → Entity Extraction | Medium | MEDIUM - Enriches RSS content |
| 4 | Entity DB → Search Filters | Medium | MEDIUM - Dynamic search capabilities |

---

## Implementation Log (2026-01-01)

### Path 1: RSS → Entity Extraction (COMPLETE)
**File:** `server/routes.ts` (lines 1924-1956)
- Added `extractEntities()` call after RSS article generation
- Only processes content >500 chars to optimize AI usage
- Uses `batchUpsertEntities()` for non-blocking persistence
- Error handling ensures RSS flow continues even if extraction fails

### Path 2: Octopus → DB Persistence (COMPLETE)
**File:** `server/octopus/content-factory.ts`
- Line 30: Import `batchUpsertEntities` from entity-upsert
- Lines 208, 302: Entity upsert calls during entity extraction
- Line 33: Import `emitContentPublished` from content-events
- Line 420: Emit publish event after content insertion

### Path 4: Entity DB → Search Filters (COMPLETE)
**File:** `server/search/intent-classifier.ts`
- Replaced static `DUBAI_LOCATIONS` with dynamic DB queries
- Queries `destinations` table for destination names
- Queries `districts` table for district/area names
- 5-minute cache prevents DB overload

### Path 6: Internal Linking → Publish-time (COMPLETE)
**File:** `server/events/content-subscribers.ts` (lines 137-187)
- `handleInternalLinkingOnPublish()` subscriber added
- Processes content blocks (not deprecated `body` field)
- Injects links into text/paragraph/html block types
- Idempotent: only updates if changes detected

### Supporting Infrastructure
- **Content Events:** `server/events/content-events.ts` - EventEmitter for content lifecycle
- **Content Subscribers:** `server/events/content-subscribers.ts` - Auto-indexing, AEO generation, link injection
- **Intelligence Dashboard:** `GET /api/admin/intelligence-stats` - Metrics for indexed %, AEO %, entity-linked %

---

## Status: COMPLETE

All 6 intelligence paths are now wired and operational. The system automatically:
1. Extracts entities from RSS content
2. Persists Octopus-generated content to database
3. Uses entity data in chat responses
4. Dynamically populates search locations from entity DB
5. Scores content for refresh prioritization
6. Injects internal links at publish time
