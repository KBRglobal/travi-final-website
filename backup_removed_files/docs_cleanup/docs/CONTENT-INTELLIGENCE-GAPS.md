# TRAVI Content Intelligence - Gap Analysis

## Phase 15 System Interrogation Results

**Date**: December 31, 2025  
**Purpose**: Map what exists, what's disconnected, and what's missing to activate content intelligence

---

## 1. How Content Enters the System Today

### RSS Path
1. RSS feeds are parsed via `parseRssFeed()` 
2. Items are fingerprinted for deduplication
3. Items are grouped into `topic_clusters` and `topic_cluster_items` tables
4. AI article generation runs on pending clusters (max 5 per run)
5. Generated articles go to `contents` table with status "draft"

### Document Upload Path (Octopus)
1. Document uploaded to `/api/octopus/upload`
2. Document parsed via `document-parser.ts`
3. Entities extracted via AI (`entity-extractor.ts`)
4. Entities enriched via Google Maps and web search
5. Content pages generated via `content-generators.ts`
6. Entities upserted to database via `entity-upsert.ts`

---

## 2. Gap Analysis: Three-Column Matrix

| Capability | Exists & Wired | Exists But Disconnected | Missing Entirely |
|------------|----------------|-------------------------|------------------|
| **RSS Ingestion** | Feeds parsed, items fingerprinted, clusters created | Clusters → article generation (manual/scheduled only) | RSS → Octopus entity extraction |
| **Entity Extraction** | AI extraction from documents (50+ entities/doc) | Extraction → Chat knowledge | Entity extraction from RSS content |
| **Entity Database** | Hotels, attractions, dining, districts tables | Entity DB → Chat answers | Entity popularity/trending signals |
| **Content Generation** | Page generators, article generators, multipliers | Generation → Search indexing | Automatic generation triggers |
| **Search Indexing** | Full indexer with embeddings | Content publish → auto-index | Real-time index updates |
| **Search Service** | 4-stage fallback, synonyms, spell-check | Search results → Chat context | Entity-aware search ranking |
| **Chat Handler** | Intent detection, AI orchestrator, fallbacks | Chat → Entity resolution | Chat → Entity DB direct queries |
| **SEO Module** | Prompt registry, output normalizer, regen guard | SEO → Content publish pipeline | SEO score → publish gate |
| **AEO Module** | Capsule generator, schema generator, cache | AEO hooks (onContentPublished) → event bus | Automatic capsule generation |
| **Content Scoring** | Value scorer, performance metrics | Scores → Content recommendations | Score → auto-refresh triggers |
| **Internal Linking** | Link builder, entity resolver | Links → Content generation | Auto-linking on publish |
| **Translation** | DeepL + multi-provider chain | Translation queue → content lifecycle | Priority locale automation |
| **Content Lifecycle** | Draft → Review → Approved → Scheduled → Published | Lifecycle events → downstream triggers | Event bus for state changes |

---

## 3. Critical Disconnections Identified

### A. RSS → Octopus Pipeline (Not Wired)
- **Current**: RSS creates clusters, but clusters just sit there
- **Missing**: Route RSS cluster content through Octopus for entity extraction
- **Impact**: RSS articles don't have entity awareness

### B. Content Publish → Search Index (Not Automatic)
- **Current**: Manual call to `/api/search/index/:contentId` required
- **Missing**: Automatic index on publish event
- **Impact**: Published content not searchable until manual reindex

### C. Content Publish → AEO Capsule (Not Wired)
- **Current**: `onContentPublished()` hook exists but not called
- **Missing**: Event trigger when content status → published
- **Impact**: No automatic answer capsules for new content

### D. Entity DB → Chat Knowledge (Not Connected)
- **Current**: Chat uses search + AI, doesn't query entity tables
- **Missing**: Direct entity lookups for specific questions
- **Impact**: Chat can't answer "What are the top hotels in Marina?"

### E. Content Scores → Recommendations (Disconnected)
- **Current**: Scores calculated but not used for recommendations
- **Missing**: Score → homepage promotion, score → refresh priority
- **Impact**: Manual curation required

---

## 4. What Each Subsystem Does (Verified from Code)

### Octopus Engine
- `document-parser.ts`: Parses PDF/DOCX/TXT documents
- `entity-extractor.ts`: AI extracts 50+ entities per document
- `google-maps-enricher.ts`: Adds location data, ratings, hours
- `web-search-enricher.ts`: Adds descriptions, images, context
- `content-generators.ts`: Generates full content pages
- `article-generators.ts`: Generates long-form articles
- `entity-upsert.ts`: Smart merge into database tables
- `graph-resolver.ts`: Resolves entity relationships

### Search Engine
- `search-index.ts`: Database queries across all content types
- `indexer.ts`: Builds searchable text + embeddings
- `search-service.ts`: Public API with fallbacks
- `query-processor.ts`: Tokenization, normalization
- `spell-checker.ts`: Typo correction
- `synonyms.ts`: Query expansion

### Chat System
- `chat-handler.ts`: Main request handler with 30s timeout
- `intent-detector.ts`: Keyword-based intent detection
- `chat-prompts.ts`: System prompts by context
- `cognitive/unified-layer.ts`: Intent signals from search + chat

### SEO/AEO
- `seo/prompt-registry.ts`: Versioned SEO prompts
- `seo/output-normalizer.ts`: Constraint enforcement
- `aeo/answer-capsule-generator.ts`: FAQ/snippet generation
- `aeo/aeo-schema-generator.ts`: JSON-LD markup
- `aeo/aeo-cache.ts`: Capsule caching (TTL-based)
- `aeo/aeo-jobs.ts`: Background automation (not triggered)

---

## 5. Event Wiring Required

```
┌─────────────┐     ┌─────────────────┐     ┌────────────────┐
│  RSS Feed   │────▶│  Topic Cluster  │────▶│  Octopus Job   │
│  Ingestion  │     │  (pending)      │     │  (entity-aware)│
└─────────────┘     └─────────────────┘     └───────┬────────┘
                                                    │
                                                    ▼
┌─────────────┐     ┌─────────────────┐     ┌────────────────┐
│  Content    │◀────│  Entity Upsert  │◀────│  Extraction +  │
│  Database   │     │  + Graph        │     │  Enrichment    │
└──────┬──────┘     └─────────────────┘     └────────────────┘
       │
       │ status = 'published'
       ▼
┌──────────────────────────────────────────────────────────────┐
│                    EVENT BUS (Missing)                       │
├──────────────────┬───────────────────┬───────────────────────┤
│  Search Index    │  AEO Capsule      │  Internal Links       │
│  (auto-update)   │  (auto-generate)  │  (auto-inject)        │
└──────────────────┴───────────────────┴───────────────────────┘
```

---

## 6. Summary

### Exists & Wired (Working End-to-End)
- RSS feed parsing and fingerprinting
- Document upload and parsing
- Entity extraction from documents
- Content page generation
- Search fallback chain (Phase 14)
- Chat reliability with timeouts (Phase 14)
- Job watchdog (Phase 14)

### Exists But Disconnected
- RSS clusters → need Octopus routing
- Entity DB → need Chat integration
- Publish event → need Search indexing trigger
- Publish event → need AEO capsule trigger
- Content scores → need recommendation system
- Internal linker → need publish-time injection

### Missing Entirely
- Content lifecycle event bus
- Real-time search index updates
- Entity-aware Chat responses
- Automatic content refresh based on scores
- RSS → Entity extraction pipeline
