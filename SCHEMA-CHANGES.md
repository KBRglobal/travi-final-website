# Schema Changes - Database Sync (2026-02-07)

## Problem

The Drizzle ORM schema defined ~50 columns for the `destinations` table, but the live PostgreSQL database only had 14 columns. This caused `/api/public/destinations` to return 500 errors because Drizzle tried to query non-existent columns.

Additionally, the schema defined `destinations.id` as `varchar`, but the live DB uses `serial` (integer auto-increment). This type mismatch would have caused drizzle-kit push to attempt destructive changes.

## Changes Made

### 1. Destinations Schema (`shared/schema/destinations.ts`)

- Changed `id` from `varchar("id").primaryKey()` to `serial("id").primaryKey()` to match live DB (integer)
- Changed `status` from `destinationStatusEnum` to `varchar("status")` with default `"published"` to match live DB
- Made `slug` nullable (removed `.notNull()`) to match live DB
- Added legacy columns that exist in live DB: `continent`, `image`, `rating`, `reviews`, `trending`, `description`, `countrySlug`
- Removed `.notNull()` from several columns to match live DB behavior
- Removed FK `.references()` from `destinationContent` and `categoryPages` to avoid type mismatch (varchar referencing integer)
- Added `serial`, `numeric` to pg-core imports

### 2. Live Database - Added Missing Columns

42 columns added to `destinations` table via SQL ALTER TABLE:

- `normalized_name`, `destination_level`, `parent_destination_id`, `summary`, `brand_color`
- `is_active`, `has_page`, `seo_score`, `word_count`, `internal_links`, `external_links`, `h2_count`
- `meta_title`, `meta_description`, `primary_keyword`, `secondary_keywords`
- `hero_image`, `hero_image_alt`, `hero_images`, `hero_title`, `hero_subtitle`, `hero_cta_text`, `hero_cta_link`
- `mood_vibe`, `mood_tagline`, `mood_primary_color`, `mood_gradient_from`, `mood_gradient_to`
- `og_title`, `og_description`, `og_image`, `canonical_url`
- `card_image`, `card_image_alt`, `images`
- `featured_attractions`, `featured_areas`, `featured_highlights`, `translations`
- `last_generated`, `last_published`, `last_image_generated`

Set `is_active = true` for 17 published destinations.

### 3. Type Fixes Across Server Code

Updated all files that used `eq(destinations.id, stringVar)` to `eq(destinations.id, Number(stringVar))` since `id` is now `number`:

- `server/routes/public-api.ts` (3 locations)
- `server/routes/public-content-routes.ts` (2 locations)
- `server/routes/admin-api.ts` (6 locations)
- `server/routes/admin/homepage-routes.ts` (3 locations)
- `server/aeo/aeo-schema-generator.ts` (1 location)
- `server/localization/aeo-generator.ts` (2 locations)
- `server/ai/auto-image-generator.ts` (5 locations)
- `server/ai/internal-linking-engine.ts` (1 location)
- `server/search/search-index.ts` (2 locations)
- `server/seeds/seed-rss-feeds.ts` (1 location)
- `server/index.ts` (1 location)
- `server/lib/homepage-fallbacks.ts` (HomepageDbResult interface)

### 4. Fixed Broken Schema Module Imports

Replaced `declare const` forward reference stubs with proper imports (drizzle-kit runtime doesn't support TypeScript `declare`):

- `shared/schema/jobs.ts` - Added imports for `contents` (from content-base) and `users` (from auth)
- `shared/schema/ai-writers.ts` - Added import for `contents` (from content-base)
- `shared/schema/octopus.ts` - Added imports for `destinations`, `users`, `contents`, `attractions`, `hotels`, `districts`
- `shared/schema/tags.ts` - Added imports for `users` and `contents`
- `shared/schema/cms-pages.ts` - Added imports for `users` and `contents`
- `shared/schema/localization.ts` - Added imports for `contents` and `rssFeeds`
- `shared/schema/content-base.ts` - Removed unused `declare` stubs

### 5. Removed FK References to destinations.id (Type Mismatch)

Since `destinations.id` is `integer` and related tables use `varchar` for `destination_id`, removed `.references(() => destinations.id)` from:

- `shared/schema/tiqets-integrations.ts` (4 locations: travi_processing_jobs, travel_advisories, health_alerts, destination_events)
- `shared/schema/octopus.ts` (1 location: octopus_jobs)
- `shared/schema/destinations.ts` (2 locations: destination_content, category_pages)

### 6. Locale Enum

Already contains `hi`, `fa`, `ur` - no changes needed.

### 7. Sessions Table

Schema matches live DB (sid, sess, expire) - no changes needed.

### 8. Other Critical Tables Verified

- **users**: Schema matches DB (15 columns) - OK
- **attractions**: Schema matches DB (25 columns) - OK
- **contents**: Schema matches DB (38 columns) - OK
- **translations**: Schema matches DB (16 columns) - OK
- **tiqets_attractions**: Schema matches DB (63 columns) - OK

## Final State

- `destinations` table: 56 columns (was 14)
- All 17 destinations have `is_active = true`
- TypeScript check: 0 errors
- No existing columns were dropped
