# SYSTEM_MAP.md - Subsystems & Entry Points

**Branch:** `agent-pilot-audit`
**Audit Date:** 2026-01-01

---

## 1. Core Subsystems

### 1.1 AI Orchestrator (`server/ai-orchestrator/`)
Central AI governance layer for rate limiting, credit monitoring, and provider routing.

| File | Purpose | Size |
|------|---------|------|
| `ai-orchestrator.ts` | Main orchestration logic | 15KB |
| `provider-pool.ts` | AI provider connection pool | 13KB |
| `provider-strategy.ts` | Provider selection strategy | 20KB |
| `rate-policy.ts` | Rate limiting policies | 11KB |
| `credit-monitor.ts` | Credit/quota tracking | 13KB |
| `credit-guard.ts` | Hard stop credit enforcement | 9KB |
| `task-governance.ts` | Task category enforcement | 12KB |
| `health-tracker.ts` | Provider health monitoring | 7KB |
| `cost-analytics.ts` | AI cost tracking | 25KB |
| `diagnostics.ts` | Debug visibility | 6KB |
| `future-hooks.ts` | Inactive future hooks | 6KB |
| `types.ts` | Type definitions | 4KB |
| `index.ts` | Module exports | 4KB |

**Entry Points:**
- Import via `server/ai-orchestrator/index.ts`
- Used by routes via task governance

---

### 1.2 Octopus Content Engine (`server/octopus/`)
Document parsing, entity extraction, and content generation system.

| File | Purpose | Size |
|------|---------|------|
| `orchestrator.ts` | Main job orchestrator | 64KB |
| `content-generators.ts` | Content generation | 67KB |
| `content-factory.ts` | Content creation factory | 41KB |
| `content-multiplier.ts` | Content scaling | 60KB |
| `content-templates.ts` | Template definitions | 37KB |
| `content-corrector.ts` | Content correction | 20KB |
| `entity-extractor.ts` | Entity extraction | 36KB |
| `entity-upsert.ts` | Entity persistence | 36KB |
| `aeo-generator.ts` | AEO content generation | 29KB |
| `aeo-optimizer.ts` | AEO optimization | 23KB |
| `article-generators.ts` | Article generation | 37KB |
| `graph-resolver.ts` | Entity graph resolution | 23KB |
| `internal-linker.ts` | Internal link suggestions | 15KB |
| `localizer.ts` | Localization support | 17KB |
| `document-parser.ts` | Document parsing | 16KB |
| `queue-manager.ts` | Queue management | 19KB |
| `job-persistence.ts` | Job state persistence | 11KB |
| `routes.ts` | API routes | 57KB |
| `types.ts` | Type definitions | 5KB |
| `index.ts` | Module exports | 14KB |
| `paa-researcher.ts` | PAA research | 16KB |
| `fact-checker.ts` | Fact checking | 20KB |
| `research-parser.ts` | Research parsing | 23KB |
| `schema-generator.ts` | Schema.org generation | 20KB |
| `tagging-agent.ts` | Auto-tagging | 17KB |
| `auto-tagger.ts` | Automatic tagging | 16KB |
| `bulk-generator.ts` | Bulk content generation | 25KB |
| `placement-engine.ts` | Content placement | 23KB |
| `image-orchestrator.ts` | Image orchestration | 15KB |
| `image-placement-engine.ts` | Image placement | 10KB |
| `image-metrics.ts` | Image metrics | 6KB |
| `image-fallback-strategy.ts` | Image fallbacks | 13KB |
| `intelligence-client.ts` | Intelligence API client | 8KB |
| `web-search-enricher.ts` | Web search enrichment | 15KB |
| `google-maps-enricher.ts` | Google Maps enrichment | 16KB |

**Entry Points:**
- `POST /api/octopus/upload` - Document upload
- `GET /api/octopus/jobs` - List jobs
- `GET /api/octopus/jobs/:id` - Get job status
- Routes registered via `server/octopus/routes.ts`

---

### 1.3 AEO System (`server/aeo/`)
Answer Engine Optimization for AI-friendly content.

| File | Purpose | Size |
|------|---------|------|
| `aeo-routes.ts` | API routes | 38KB |
| `seo-aeo-validator.ts` | SEO/AEO validation | 26KB |
| `aeo-analytics.ts` | AEO analytics | 21KB |
| `answer-capsule-generator.ts` | Capsule generation | 18KB |
| `aeo-schema-generator.ts` | JSON-LD schema | 18KB |
| `aeo-tracking.ts` | Citation tracking | 19KB |
| `aeo-static-files.ts` | Static file generation | 15KB |
| `aeo-jobs.ts` | Background jobs | 13KB |
| `aeo-multilang.ts` | Multi-language support | 12KB |
| `aeo-ab-testing.ts` | A/B testing | 12KB |
| `aeo-integrations.ts` | External integrations | 11KB |
| `aeo-config.ts` | Configuration | 11KB |
| `aeo-cache.ts` | Caching layer | 5KB |
| `index.ts` | Module exports | 3KB |

**Entry Points:**
- `GET /api/aeo/capsule/:contentId` - Get answer capsule
- `POST /api/aeo/capsule/:contentId/generate` - Generate capsule
- Routes registered via `server/aeo/aeo-routes.ts`

---

### 1.4 Event Bus System (`server/events/`)
Content lifecycle event system (Phase 15A).

| File | Purpose | Size |
|------|---------|------|
| `content-events.ts` | Event bus singleton | 7KB |
| `content-subscribers.ts` | Event handlers | 6KB |
| `index.ts` | Module exports | 359B |

**Events Emitted:**
- `content.published` - Content transitions to published state
- `content.updated` - Published content is updated

**Subscribers Registered:**
- `SearchIndexer` → `content.published`, `content.updated`
- `AEOGenerator` → `content.published`

**Entry Points:**
- `emitContentPublished()` - Emit from routes
- `emitContentUpdated()` - Emit from routes
- `initializeContentSubscribers()` - Called at server startup

---

### 1.5 Search System (`server/search/`)
Full-text search, semantic search, and query processing.

| File | Purpose | Size |
|------|---------|------|
| `search-service.ts` | Main search service | 21KB |
| `routes.ts` | API routes | 11KB |
| `search-index.ts` | Index management | 10KB |
| `query-expander.ts` | Query expansion | 8KB |
| `synonyms.ts` | Synonym handling | 8KB |
| `intent-classifier.ts` | Intent classification | 8KB |
| `spell-checker.ts` | Spell checking | 7KB |
| `query-rewriter.ts` | Query rewriting | 7KB |
| `search-telemetry.ts` | Search analytics | 6KB |
| `hybrid-ranker.ts` | Hybrid ranking | 6KB |
| `indexer.ts` | Content indexing | 5KB |
| `index.ts` | Module exports | 5KB |
| `semantic-search.ts` | Semantic search | 5KB |
| `query-processor.ts` | Query processing | 3KB |
| `embeddings.ts` | Embedding generation | 3KB |

**Entry Points:**
- `GET /api/search` - Main search
- `GET /api/search/spell-check` - Spell check
- `GET /api/search/expand` - Query expansion
- `GET /api/search/semantic` - Semantic search

---

### 1.6 Job Queue (`server/job-queue.ts`, `server/jobs/`)
Background job processing system.

| File | Purpose | Size |
|------|---------|------|
| `job-queue.ts` | Main queue class | 11KB |
| `jobs/background-scheduler.ts` | Background scheduler | 20KB |
| `jobs/index.ts` | Module exports | 541B |

**Job Types:**
- `seo-improvement`
- `internal-linking`
- `content-enrichment`
- `content-value-improvement`

**Entry Points:**
- `jobQueue.addJob()` - Add job
- `jobQueue.addJobSync()` - Sync add (backward compat)
- `jobQueue.start()` - Start processing
- Jobs stored in `background_jobs` table

---

### 1.7 AI Providers (`server/ai/`)
AI provider integrations and content generation.

| File | Purpose | Size |
|------|---------|------|
| `content-generator.ts` | Content generation | 27KB |
| `request-queue.ts` | Request queuing | 26KB |
| `providers.ts` | Provider integrations | 20KB |
| `auto-image-generator.ts` | Image generation | 18KB |
| `internal-linking-engine.ts` | Internal linking | 15KB |
| `image-generation.ts` | Image gen utilities | 15KB |
| `alt-text-generator.ts` | Alt text generation | 10KB |
| `types.ts` | Type definitions | 10KB |
| `visual-search.ts` | Visual search | 8KB |
| `plagiarism-detector.ts` | Plagiarism detection | 7KB |
| `content-scorer.ts` | Content scoring | 7KB |
| `seo-tools.ts` | SEO utilities | 6KB |
| `index.ts` | Module exports | 3KB |
| `utils.ts` | Utilities | 434B |
| `simple-seo-prompt.ts` | Simple SEO prompts | 1KB |
| `prompts/` | Prompt templates directory |
| `writers/` | AI writer personas directory |

---

### 1.8 Security Layer (`server/security.ts`, `server/security/`, `server/advanced-security.ts`)
Rate limiting, IDOR protection, and security enforcement.

**Key Files:**
- `server/security.ts` - Core security (40KB)
- `server/advanced-security.ts` - Advanced security (29KB)
- `server/enterprise-security.ts` - Enterprise features (39KB)
- `server/security/rate-limiter.ts` - Rate limiting
- `server/middleware/idor-protection.ts` - IDOR protection

---

### 1.9 Monetization (`server/monetization/`)
Affiliate and monetization hooks (disabled by default).

| File | Purpose |
|------|---------|
| `hooks.ts` | Monetization hooks |
| `commercial-zones.ts` | Commercial zone definitions |

**Status:** Requires `ENABLE_MONETIZATION=true` to activate

---

## 2. Key API Entry Points

### 2.1 Main Routes (`server/routes.ts`)
**Size:** 570KB (very large file)
- Content CRUD operations
- User management
- Settings management
- Translation endpoints
- All primary API routes

### 2.2 Specialized Route Files
| File | Prefix |
|------|--------|
| `server/aeo/aeo-routes.ts` | `/api/aeo/*` |
| `server/search/routes.ts` | `/api/search/*` |
| `server/octopus/routes.ts` | `/api/octopus/*` |
| `server/auto-pilot-routes.ts` | `/api/auto-pilot/*` |
| `server/automation-routes.ts` | `/api/automation/*` |
| `server/enterprise-routes.ts` | `/api/enterprise/*` |
| `server/research-routes.ts` | `/api/research/*` |

---

## 3. Background Jobs & Cron

### 3.1 Server Startup Jobs (`server/index.ts`)
- **RSS Auto-Process:** Runs every 30 minutes
- **Content Event Subscribers:** Initialized at startup

### 3.2 AEO Scheduler (`server/aeo/aeo-jobs.ts`)
- `runAutoGenerateCapsules()`
- `runRegenerateLowQualityCapsules()`
- `runCitationScan()`
- `runPerformanceReport()`
- `runCleanup()`

### 3.3 Translation Queue (`server/localization/translation-queue.ts`)
- Background translation processing
- Exponential backoff retry

---

## 4. Database Schema (`shared/schema.ts`)
Primary tables include:
- `contents` - Main content storage
- `users` - User management
- `translations` - Translation storage
- `audit_logs` - Audit trail
- `background_jobs` - Job queue
- `octopus_jobs` - Octopus job tracking
- `analytics_events` - Analytics

---

*Note: File sizes are approximate. Some directories may have additional files not listed.*
*For complete file listings, see: https://github.com/KBRglobal/traviseoaeowebsite/tree/agent-pilot-audit/server*