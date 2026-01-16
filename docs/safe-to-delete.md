# Safe to Delete - Dead Code Removal Checklist

**Generated:** 2026-01-01
**Reference:** See `dead-code-report.md` for full analysis

---

## Quick Stats

| Category | Safe to Delete | Legacy (Flag First) | Dangerous |
|----------|----------------|---------------------|-----------|
| Service Exports | 35 | 4 | 6 |
| Client Pages | 1 | 3 | 0 |
| Client Components | 5 | 4 | 0 |
| Database Tables | 1 | 0 | 0 |

---

## SAFE TO DELETE (Immediate Removal OK)

### Server Service Exports

#### auto-translation.ts
```typescript
// DELETE these exports:
export function getDestinationTranslations() { ... }
export function getAllDestinationTranslations() { ... }
export function getDestinationTranslationCoverage() { ... }
export function processPendingTranslations() { ... }
export function backfillTranslationsFromLogs() { ... }
```

#### content-freshness.ts
```typescript
// DELETE these exports:
export const freshnessConfig: FreshnessConfig = { ... }
export function checkContentFreshness() { ... }
export function refreshStaleContent() { ... }
export function getTodayRefreshCount() { ... }
export function updateFreshnessConfig() { ... }
```

#### image-processing.ts
```typescript
// DELETE these exports:
export const DEFAULT_QUALITY = 85;
export const DEFAULT_THUMBNAIL_SIZE = 200;
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
export function isValidMimeType() { ... }
export function isValidSize() { ... }
export function convertToWebP() { ... }
export function resizeImage() { ... }
export function generateThumbnail() { ... }
```

#### image-seo-service.ts
```typescript
// DELETE these exports:
export interface ImageObjectSchema { ... }
export interface OpenGraphImage { ... }
export class ImageSEOService { ... }
export function generateImageSEOMetadata() { ... }
export function generateAIImagePrompt() { ... }
```

#### image-service.ts
```typescript
// DELETE these exports:
export class ImageService { ... }  // Keep singleton getter only
export function resetImageService() { ... }
```

#### seo-auto-fixer.ts
```typescript
// DELETE these exports:
export interface FixResult { ... }
export interface AutoFixResult { ... }
export class SEOAutoFixer { ... }  // Keep singleton getter only
```

#### seo-validation-agent.ts
```typescript
// DELETE this export:
export class SEOValidationAgent { ... }  // Keep singleton getter only
```

#### sitemap-service.ts
```typescript
// DELETE this export:
export function generateAllSitemaps() { ... }
```

#### storage-adapter.ts
```typescript
// DELETE these exports:
export interface StorageAdapter { ... }
export class ObjectStorageAdapter { ... }
export class LocalStorageAdapter { ... }
export class StorageManager { ... }  // Keep singleton getter only
export function resetStorageManager() { ... }
export const IMAGE_CACHE_CONFIG = { ... }
export function getCacheHeaders() { ... }
export function imageCacheMiddleware() { ... }
export function applyCacheHeaders() { ... }
```

#### translation-service.ts
```typescript
// DELETE these exports:
export function translateTags() { ... }
export function getTranslationProgress() { ... }
```

### Client Components (Safe)

Delete these files entirely:
```
client/src/components/affiliate-cta.tsx
client/src/components/article-newsletter-cta.tsx
client/src/components/image-engine-picker.tsx
client/src/components/image-seo-editor.tsx
client/src/components/stats-card.tsx
client/src/components/pre-publish-checklist.tsx
```

### Database Schema

Remove from `shared/schema.ts`:
```typescript
// DELETE this table definition:
export const imageCollections = pgTable("image_collections", { ... });

// Also remove related insertSchema/selectSchema if present
```

Create migration to drop table:
```sql
-- migrations/drop-image-collections.sql
DROP TABLE IF EXISTS image_collections;
```

---

## LEGACY - ADD FEATURE FLAG FIRST

These items may be work-in-progress or deprecated features. Add a feature flag and monitor for 2 weeks before deletion.

### Server Services

#### external-image-service.ts
```typescript
// Entire file may be legacy - check if Freepik integration is still needed
// Functions: searchFreepik(), downloadFromFreepik(), ExternalImageService
// Action: Add FEATURE_FREEPIK_ENABLED flag
```

### Client Pages

Add to feature flags config before removal:
```typescript
// client/src/pages/public-v2/city-page.tsx - CityPageV2
// client/src/pages/public-districts.tsx - PublicDistricts
// client/src/pages/public-home.tsx - PublicHome (HomepageNew is used instead)
```

### Client Components

These may be V2 design components in progress:
```
client/src/components/live-edit/renderers/PageRenderer.tsx
client/src/components/public-v2/sections/discovery-section.tsx
client/src/components/public-v2/sections/item-card.tsx
```

---

## DANGEROUS - DO NOT DELETE WITHOUT INVESTIGATION

These exports appear unused but may have hidden dependencies (admin UI, future features, etc.):

### log-service.ts
```typescript
// These may be used by admin console UI:
export function getLogs() { ... }
export function getLogStats() { ... }
export function clearLogs() { ... }
export function exportLogs() { ... }
export function getCategories() { ... }
export function getCategoryDisplayNames() { ... }

// Action: Check if admin/logs page uses these via API
```

---

## Deletion Procedure

### Step 1: Create Branch
```bash
git checkout -b cleanup/dead-code-removal
```

### Step 2: Remove Safe Items
1. Delete unused exports from service files
2. Delete unused component files
3. Update any barrel exports (index.ts files)

### Step 3: Test Build
```bash
npm run build
npm run type-check
npm run test
```

### Step 4: Remove Database Table
```bash
# Create migration
npm run drizzle:generate

# Apply migration (after code deployment)
npm run drizzle:migrate
```

### Step 5: Deploy & Monitor
1. Deploy to staging
2. Run E2E tests
3. Monitor error logs for 24 hours
4. Deploy to production

---

## Estimated Impact

| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| Service file LOC | ~5000 | ~4600 | ~8% |
| Component files | 144 | 138 | 4% |
| Bundle size | TBD | TBD | ~2-3% |

---

## Post-Cleanup Tasks

1. [ ] Update TypeScript strict mode if applicable
2. [ ] Run `npm run lint --fix` after deletions
3. [ ] Update any documentation referencing deleted code
4. [ ] Remove feature flags after 2-week monitoring period
