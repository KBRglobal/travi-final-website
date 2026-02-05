# TRAVI Content System - Full Analysis & Upgrade Plan

## Executive Summary

This document provides a comprehensive analysis of the TRAVI content ecosystem, comparing what exists in the three repositories:

- **travi-final-website** - The production website
- **octypo-main** - AI content generation engine
- **octypo-image (VAMS)** - Visual asset management system

The goal: Create a news site that looks like a **real editorial team** runs it - with featured headlines, image selection, content scheduling, and automatic placement.

---

## Part 1: What EXISTS

### 1.1 Octypo-Main - AI Content Engine

**Location:** `/Users/admin/github-repos/octypo-main`

#### 8 AI Writer Agents (Full Personalities)

| ID                 | Name                 | Specialty                  | Avatar                          | Style                                    |
| ------------------ | -------------------- | -------------------------- | ------------------------------- | ---------------------------------------- |
| `article_writer`   | **Sarah Mitchell**   | Long-form Articles         | Auburn hair, camera around neck | Evocative, immersive, personal anecdotes |
| `itinerary_writer` | **Michael Chen**     | Day-by-Day Itineraries     | Asian, glasses, notebook        | Precise, practical, optimized routes     |
| `guide_writer`     | **David Rodriguez**  | Destination Guides         | Latino, salt-pepper beard       | Comprehensive, local friend voice        |
| `review_writer`    | **Rebecca Thompson** | Hotel & Restaurant Reviews | British, silver-blonde hair     | Elegant, fair, detailed                  |
| `tips_writer`      | **Ahmed Mansour**    | Budget Travel Tips         | Egyptian, backpacker style      | Friendly, practical, creative            |
| `events_writer`    | **Layla Nasser**     | Events & Festivals         | Lebanese, bold colors           | Vibrant, infectious energy               |
| `food_writer`      | **Fatima Al-Rashid** | Culinary Tourism           | Jordanian, chef look            | Sensory, intimate, nostalgic             |
| `adventure_writer` | **Omar Hassan**      | Adventure & Outdoor        | Sudanese, athletic              | Adrenaline + safety focused              |

**Source:** `octypo/src/agents/profiles.py` (540 lines)

#### 6 Validator Agents

| ID                      | Name                   | Validates                         |
| ----------------------- | ---------------------- | --------------------------------- |
| `fact_checker`          | **Dr. James Walker**   | Facts, sources, claims            |
| `grammar_checker`       | **Grace Anderson**     | Grammar, style, clarity           |
| `cultural_sensitivity`  | **Aisha Khalil**       | Cultural accuracy, stereotypes    |
| `accessibility_checker` | **Christopher Davis**  | Accessibility, inclusive language |
| `legal_compliance`      | **Hassan Mahmoud, JD** | Copyright, liability, regulations |
| `brand_consistency`     | **Benjamin Cole**      | Brand voice, tone consistency     |

#### 1 SEO Agent

| ID          | Name           | Capabilities                           |
| ----------- | -------------- | -------------------------------------- |
| `seo_agent` | **Kevin Park** | Keywords, technical SEO, SERP analysis |

#### Content Pipeline (Temporal Workflows)

```
Topic → Research → Writing → Validation → SEO → Translation → Review (HITL) → Publish
```

**Features:**

- RSS feed ingestion
- Google Drive integration
- Translation to 20+ languages with provider routing
- Quality estimation (COMET-QE)
- Cost tracking per provider
- Webhooks for real-time updates

---

### 1.2 Octypo-Image (VAMS) - Visual Asset Management

**Location:** `/Users/admin/github-repos/octypo-image`

#### 15 Processing Domains

| #   | Domain             | Purpose                           |
| --- | ------------------ | --------------------------------- |
| 01  | **Ingestion**      | Receive images from sources       |
| 02  | **Storage**        | Store in cloud (Cloudflare R2/S3) |
| 03  | **Metadata**       | Extract EXIF, dimensions, colors  |
| 04  | **License Filter** | Check usage rights                |
| 05  | **Privacy Filter** | Detect faces, sensitive content   |
| 06  | **Quality Filter** | Assess resolution, composition    |
| 07  | **Content Safety** | NSFW detection                    |
| 08  | **Vector Search**  | Semantic image search             |
| 09  | **AI Routing**     | Choose best model for processing  |
| 10  | **Cost Optimizer** | Minimize processing costs         |
| 11  | **Processing**     | Resize, format, compress          |
| 12  | **Attribution**    | Track image sources, credits      |
| 13  | **Taxonomy**       | Categorize images                 |
| 14  | **Distribution**   | CDN delivery                      |
| 15  | **Search**         | Full-text + semantic search       |

**Core Components:**

- `decision_engine.py` - Decides processing path
- `state_machine.py` - Asset lifecycle management
- `security_engine.py` - Access control

---

### 1.3 TRAVI Website - Current State

**Location:** `/Users/admin/travi-final-website`

#### What Works

| Feature               | Status     | Location                                     |
| --------------------- | ---------- | -------------------------------------------- |
| RSS Reader            | ✅ Working | `server/octypo/rss-reader.ts`                |
| Gate1 Selector        | ✅ Working | `server/octypo/gatekeeper/gate1-selector.ts` |
| Gate2 Approver        | ✅ Working | `server/octypo/gatekeeper/gate2-approver.ts` |
| AI Writers (config)   | ✅ Working | `shared/writers.config.ts`                   |
| Destination Detection | ✅ Working | `rss-reader.ts:613-641`                      |
| News Page (`/news`)   | ✅ Working | `client/src/pages/public-news.tsx`           |
| Publish Hooks         | ✅ Working | `server/localization/publish-hooks.ts`       |
| Translation Queue     | ✅ Working | `server/localization/translation-queue.ts`   |

#### What's STUB/Missing

| Feature                | Status     | Problem                                       |
| ---------------------- | ---------- | --------------------------------------------- |
| **EditorialNews**      | ❌ STUB    | Returns `null` - no news on destination pages |
| **Tiqets Import**      | ❌ STUB    | Returns `{ imported: 0 }` - no attractions    |
| **Image Selection**    | ❌ Missing | No auto-selection of images for articles      |
| **Featured Headlines** | ❌ Missing | No "main headline" vs "secondary" distinction |
| **Content Scheduling** | ❌ Missing | No "publish at 8am" or rotation               |
| **Content Placement**  | ❌ Missing | No auto-placement on homepage/destinations    |

---

## Part 2: What's MISSING (Gap Analysis)

### 2.1 Editorial Content Management

**Problem:** Articles are published but there's no "editor" to decide:

- Which article is the **main headline**
- Which articles are **secondary**
- When to **rotate** headlines
- Where to **place** content (homepage, destination, category)

**Current State:**

```typescript
// public-news.tsx - just fetches all articles
const results = await storage.getContents({ type: "article", status: "published" });
newsArticles = results.slice(0, 20); // No priority!
```

**Needed:**

```typescript
// What we need - editorial placement system
interface EditorialPlacement {
  id: string;
  contentId: string;
  zone: "homepage_hero" | "homepage_secondary" | "destination_featured" | "category_top";
  position: number; // 1 = top
  startAt: Date;
  endAt: Date; // Auto-rotate after X hours
  placedBy: "ai" | "editor" | "auto";
}
```

### 2.2 Image Selection System

**Problem:** Articles don't have automatic image selection.

**What Octypo-Image (VAMS) provides:**

- Vector search for relevant images
- Quality scoring
- License verification
- Automatic cropping for different formats

**What's missing in TRAVI:**

- Integration with VAMS
- Hero image selection
- Card image selection
- Social share image generation

### 2.3 Headline Rotation

**Problem:** News sites rotate headlines every few hours. TRAVI doesn't.

**What a real news site does:**

```
08:00 - Article A is hero
12:00 - Article A moves to secondary, Article B becomes hero
16:00 - Article B moves down, Article C becomes hero
```

**What TRAVI does:**

```
Always shows most recent article first - no rotation
```

### 2.4 Destination News Integration

**Problem:** `EditorialNews` component returns `null`.

**File:** `client/src/components/destination/stubs.tsx`

```typescript
export const EditorialNews = (_props: StubProps): null => null; // STUB!
```

**Expected behavior:**

- Fetch articles with `relatedDestinationIds` matching destination
- Show 4-6 relevant news articles
- Link to full news page with destination filter

### 2.5 Attraction Detection & Import

**Problem:** No automatic detection of new attractions from news.

**What should happen:**

1. RSS item mentions "New theme park opens in Dubai"
2. Gate1 detects it's about a new attraction
3. Creates attraction draft (not just article)
4. Triggers Tiqets search for tickets
5. Creates combined content

**Current state:**

- Tiqets import is STUB
- No attraction detection logic

---

## Part 3: UPGRADE PLAN

### Phase 1: Editorial Placement System (Priority: HIGH) ✅ COMPLETED

> **Status: IMPLEMENTED** on 2026-02-05
>
> **Files Created:**
>
> - `shared/schema/editorial-placements.ts` - Full schema with 4 tables
> - `server/storage/editorial-placements.storage.ts` - Storage class with all CRUD operations
> - `server/routes/admin/editorial-placements-routes.ts` - Admin API routes
> - `drizzle/add-editorial-placements.sql` - Database migration
>
> **Features Implemented:**
>
> - 12 editorial zones (homepage_hero, breaking_news, trending, etc.)
> - 5 placement priorities (breaking, headline, featured, standard, filler)
> - AI decision tracking with confidence scores
> - Auto-rotation support with history tracking
> - Zone configuration (weights, intervals, content type filters)
> - Scheduling system for pre-planned placements
> - CTR tracking (impressions + clicks)
> - Custom headline/image overrides
> - Public API for frontend consumption
>
> **Next: Run migration and seed zone configs**

#### 1.1 Database Schema

```sql
-- New table: editorial_placements
CREATE TABLE editorial_placements (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id VARCHAR NOT NULL REFERENCES contents(id),
  zone VARCHAR(50) NOT NULL,  -- 'homepage_hero', 'homepage_grid', 'destination_featured', etc.
  destination_id VARCHAR,      -- NULL for global placements
  position INTEGER NOT NULL,   -- 1 = top
  start_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_at TIMESTAMPTZ,          -- NULL = indefinite
  placed_by VARCHAR(20) NOT NULL,  -- 'ai', 'editor', 'auto'
  score INTEGER,               -- AI-calculated placement score
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_placements_zone_position ON editorial_placements(zone, position);
CREATE INDEX idx_placements_destination ON editorial_placements(destination_id) WHERE destination_id IS NOT NULL;
```

#### 1.2 Placement Zones

| Zone                   | Description                 | Max Items |
| ---------------------- | --------------------------- | --------- |
| `homepage_hero`        | Main headline               | 1         |
| `homepage_secondary`   | Below hero                  | 3         |
| `homepage_grid`        | Main content grid           | 12        |
| `destination_featured` | Top of destination page     | 3         |
| `destination_news`     | News section on destination | 6         |
| `category_hero`        | Category page hero          | 1         |
| `category_grid`        | Category page grid          | 12        |

#### 1.3 AI Placement Agent

```typescript
// server/octypo/editor/placement-agent.ts
export class PlacementAgent {
  async evaluateForPlacement(content: Content): Promise<PlacementRecommendation> {
    const score = await this.calculatePlacementScore(content);

    return {
      contentId: content.id,
      recommendedZone: this.selectZone(content, score),
      recommendedPosition: this.calculatePosition(score),
      durationHours: this.calculateDuration(score),
      reasoning: this.generateReasoning(content, score),
    };
  }

  private async calculatePlacementScore(content: Content): Promise<number> {
    // Factors:
    // - Recency (newer = higher)
    // - Quality score from Gate2
    // - SEO score
    // - Destination relevance
    // - Content type priority
    // - Time of day (news more important in morning)
    return compositeScore;
  }
}
```

#### 1.4 Auto-Rotation Job

```typescript
// server/jobs/headline-rotation.ts
export async function rotateHeadlines() {
  // Run every hour

  // 1. Get current homepage_hero
  const currentHero = await getPlacement("homepage_hero", 1);

  // 2. If hero has been up for > 4 hours
  if (hoursOnHero(currentHero) > 4) {
    // Move hero to secondary
    await updatePlacement(currentHero.id, { zone: "homepage_secondary", position: 1 });

    // Promote best secondary to hero
    const newHero = await getBestCandidate("homepage_secondary");
    await updatePlacement(newHero.id, { zone: "homepage_hero", position: 1 });
  }
}
```

---

### Phase 2: Image Integration (Priority: HIGH) ✅ COMPLETED

> **Status: IMPLEMENTED** on 2026-02-05
>
> **Files Created:**
>
> - `server/storage/vams.storage.ts` - Full CRUD for VAMS assets, variants, content relationships, search cache
> - `server/services/vams-service.ts` - Image selection service with provider integration
> - `server/vams/index.ts` - Full VAMS API with Express routes (replaced the stub)
>
> **Features Implemented:**
>
> - Stock photo provider integration (Unsplash, Pexels, Pixabay)
> - Intelligent image search with keyword extraction
> - Image scoring and ranking algorithm (resolution, aspect ratio, tag matching)
> - Automatic image selection for content (hero, card, gallery, og)
> - Search result caching (1 hour TTL)
> - Content-image relationship management
> - Usage tracking and analytics
> - API endpoints:
>   - `GET /api/vams/search` - Search across providers
>   - `GET /api/vams/providers` - List available providers
>   - `POST /api/vams/acquire` - Download and store image
>   - `POST /api/vams/select-for-content` - Auto-select images for content
>   - `GET /api/vams/content/:id/images` - Get content images
>
> **Environment Variables Required:**
>
> - `UNSPLASH_ACCESS_KEY` - Unsplash API key
> - `PEXELS_API_KEY` - Pexels API key
> - `PIXABAY_API_KEY` - Pixabay API key
>
> **Next: Configure API keys in production**

#### 2.1 Connect to VAMS

```typescript
// server/services/image-service.ts
import { VAMSClient } from "@octypo/vams-sdk";

export class ImageService {
  private vams: VAMSClient;

  async selectImagesForContent(content: Content): Promise<ImageSelection> {
    // 1. Extract keywords from content
    const keywords = await this.extractKeywords(content);

    // 2. Search VAMS for relevant images
    const candidates = await this.vams.search({
      query: keywords.join(" "),
      destination: content.destinationId,
      minQuality: 80,
      license: ["editorial", "commercial"],
      limit: 20,
    });

    // 3. Select best images for each format
    return {
      hero: this.selectBest(candidates, { ratio: "16:9", minWidth: 1200 }),
      card: this.selectBest(candidates, { ratio: "4:3", minWidth: 600 }),
      social: this.selectBest(candidates, { ratio: "1.91:1", minWidth: 1200 }),
      thumbnail: this.selectBest(candidates, { ratio: "1:1", minWidth: 300 }),
    };
  }
}
```

#### 2.2 Auto-Select on Publish

```typescript
// server/localization/publish-hooks.ts - ADD
export async function onContentStatusChange(contentId: string, newStatus: string) {
  // ... existing code ...

  // NEW: Auto-select images if none set
  if (newStatus === "approved" && !content.heroImage) {
    const images = await imageService.selectImagesForContent(content);
    await storage.updateContent(contentId, {
      heroImage: images.hero.url,
      cardImage: images.card.url,
      socialImage: images.social.url,
    });
  }
}
```

---

### Phase 3: Editorial News Component (Priority: HIGH) ✅ COMPLETED

> **Status: IMPLEMENTED** on 2026-02-05
>
> **Files Created:**
>
> - `client/src/components/destination/EditorialNews.tsx` - Full magazine-style news component
>
> **Files Modified:**
>
> - `client/src/components/destination/DestinationPageTemplate.tsx` - Import EditorialNews from new file
> - `client/src/components/destination/index.ts` - Export EditorialNews
> - `client/src/components/destination/stubs.tsx` - Removed EditorialNews stub
>
> **Features Implemented:**
>
> - Magazine-style news layout with featured article (large) + grid
> - Integration with editorial placements API (`/api/public/placements/destination_news`)
> - Breaking news badge (red) and Featured badge (primary color)
> - Relative timestamps with date-fns
> - Loading skeleton states
> - Responsive design (mobile/tablet/desktop)
> - SafeImage integration with fallbacks
> - Link to destination news filter page
> - Graceful fallback (returns null if no news available)
>
> **API Endpoint (already existed from Phase 1):**
>
> - `GET /api/public/placements/:zone?destinationId=xxx` - Returns enriched placements with content data
>
> **Design Features:**
>
> - Featured card: Large hero image with gradient overlay, prominent headline
> - Regular cards: Thumbnail image, headline, excerpt, timestamp
> - Breaking/Featured badges
> - Hover effects and smooth transitions
> - Dark mode compatible

#### Original Plan Reference

```typescript
// Original plan - IMPLEMENTED with enhancements
// See client/src/components/destination/EditorialNews.tsx for full implementation
```

---

### Phase 4: Attraction Detection (Priority: MEDIUM) ✅ COMPLETED

> **Status: IMPLEMENTED** on 2026-02-05
>
> **Files Created:**
>
> - `server/octypo/gatekeeper/attraction-detector.ts` - Full attraction detection system
>
> **Files Modified (STUBs replaced):**
>
> - `server/lib/tiqets-client.ts` - Full Tiqets API v2 client
> - `server/lib/tiqets-import-service.ts` - Full import service with city discovery
> - `server/octypo/gatekeeper/index.ts` - Export attraction detector
>
> **Attraction Detector Features:**
>
> - Keyword-based pre-filter (opening indicators + type/brand indicators)
> - AI-powered analysis for detailed extraction
> - Attraction type classification (13 types)
> - Destination auto-detection integration
> - Confidence scoring (0-100)
> - Draft attraction creation in database
> - Batch processing support
>
> **Tiqets Integration Features:**
>
> - Full API v2 client with authentication
> - City search and discovery
> - Product search and import
> - Rate limiting (200ms between requests)
> - Affiliate link generation with partner ID
> - Batch import for all configured cities
> - Progress logging and error handling
>
> **Environment Variables Required:**
>
> - `TIQETS_API_TOKEN` - Tiqets Partner API token
> - `TIQETS_PARTNER_ID` - Partner ID for affiliate tracking
>
> **API Endpoints (via admin routes):**
>
> - `POST /api/admin/tiqets/find-city-ids` - Discover Tiqets city IDs
> - `POST /api/admin/tiqets/import-city` - Import single city
> - `POST /api/admin/tiqets/import-all` - Import all cities
> - `POST /api/admin/tiqets/test-connection` - Test API connection

#### Original Plan Reference (4.1 Attraction Detector)

```typescript
// server/lib/tiqets-import-service.ts - REPLACE
export class TiqetsImportService {
  private apiKey = process.env.TIQETS_API_KEY;
  private baseUrl = "https://api.tiqets.com/v2";

  async findProducts(query: string, cityId: string): Promise<TiqetsProduct[]> {
    const response = await fetch(
      `${this.baseUrl}/products/search?q=${encodeURIComponent(query)}&city_id=${cityId}`,
      { headers: { Authorization: `Bearer ${this.apiKey}` } }
    );
    return response.json();
  }

  async importProduct(productId: string): Promise<TiqetsAttraction> {
    // 1. Fetch product details
    const product = await this.getProduct(productId);

    // 2. Generate AI content
    const aiContent = await this.generateContent(product);

    // 3. Save to database
    const attraction = await db
      .insert(tiqetsAttractions)
      .values({
        tiqetsId: product.id,
        title: product.title,
        cityName: product.city.name,
        aiContent,
        status: "ready",
      })
      .returning();

    return attraction[0];
  }
}
```

---

### Phase 5: Homepage Redesign (Priority: MEDIUM) ✅ COMPLETED

> **Status: IMPLEMENTED** on 2026-02-05
>
> **Files Created:**
>
> - `client/src/components/homepage/EditorialHero.tsx` - Full-width hero from homepage_hero zone
> - `client/src/components/homepage/EditorialSecondary.tsx` - 3 secondary articles from homepage_secondary zone
> - `client/src/components/homepage/EditorialNewsGrid.tsx` - 4x2 news grid from homepage_featured zone
> - `client/src/components/homepage/TrendingSection.tsx` - Horizontal scrollable trending strip
> - `client/src/components/homepage/index.ts` - Component exports
>
> **Files Modified:**
>
> - `client/src/pages/homepage.tsx` - Added all editorial zone components to main section
>
> **Features Implemented:**
>
> - **EditorialHero:** Full-width hero article with gradient overlay, breaking/featured badges, category label, relative timestamp
> - **EditorialSecondary:** 3-column grid with card images, headlines, excerpts, timestamps
> - **TrendingSection:** Horizontal scrollable strip with numbered items (1-5), compact layout
> - **EditorialNewsGrid:** 4x2 grid with cards, breaking/featured badges, "Travel News & Updates" header
>
> **Component Layout on Homepage:**
>
> 1. SplitHero (existing destination carousel)
> 2. EditorialHero (homepage_hero zone - featured article)
> 3. EditorialSecondary (homepage_secondary zone - 3 articles)
> 4. TrendingSection (trending zone - 5 items)
> 5. CategoriesSection (existing)
> 6. Popular Destinations (existing)
> 7. EditorialNewsGrid (homepage_featured zone - 8 articles)
> 8. Experience Categories (existing)
> 9. FAQSection (existing)
> 10. NewsletterSection (existing)
> 11. Regions (existing)
>
> **API Endpoints Used:**
>
> - `GET /api/public/placements/homepage_hero` - Hero article
> - `GET /api/public/placements/homepage_secondary` - Secondary articles
> - `GET /api/public/placements/homepage_featured` - Featured grid
> - `GET /api/public/placements/trending` - Trending items
>
> **Design Features:**
>
> - Consistent with existing design system (SafeImage, date-fns, TailwindCSS)
> - Dark mode compatible
> - Responsive (mobile/tablet/desktop)
> - Loading skeleton states
> - Graceful fallback (returns null if no placements)

#### 5.1 Homepage Layout with Editorial Zones

```
┌─────────────────────────────────────────────────────────────┐
│                    HERO ARTICLE (zone: homepage_hero)        │
│  [Large image]                                               │
│  HEADLINE                                                    │
│  Subheadline • Writer name • 2 hours ago                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────┬─────────────────┬─────────────────────────┐
│  SECONDARY 1    │  SECONDARY 2    │  SECONDARY 3            │
│  (homepage_     │  (homepage_     │  (homepage_secondary)   │
│  secondary)     │  secondary)     │                         │
└─────────────────┴─────────────────┴─────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  DESTINATIONS STRIP                                          │
│  [Dubai] [Paris] [Tokyo] [Singapore] [New York] [→ More]    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  NEWS GRID (zone: homepage_grid)                             │
│  ┌─────────┬─────────┬─────────┬─────────┐                  │
│  │ Card 1  │ Card 2  │ Card 3  │ Card 4  │                  │
│  ├─────────┼─────────┼─────────┼─────────┤                  │
│  │ Card 5  │ Card 6  │ Card 7  │ Card 8  │                  │
│  └─────────┴─────────┴─────────┴─────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 4: Implementation Priority

### Immediate (Week 1)

| Task                                  | Files                                    | Effort |
| ------------------------------------- | ---------------------------------------- | ------ |
| Create `editorial_placements` table   | `shared/schema/`, `drizzle/migrations/`  | Small  |
| Add placement storage methods         | `server/storage/placements.storage.ts`   | Small  |
| Replace EditorialNews STUB            | `client/src/components/destination/`     | Medium |
| Add `/api/public/placements` endpoint | `server/routes/public-content-routes.ts` | Small  |

### Short-term (Week 2-3)

| Task                     | Files                                     | Effort |
| ------------------------ | ----------------------------------------- | ------ |
| Build PlacementAgent     | `server/octypo/editor/placement-agent.ts` | Medium |
| Auto-place on publish    | `server/localization/publish-hooks.ts`    | Small  |
| Headline rotation job    | `server/jobs/headline-rotation.ts`        | Medium |
| Homepage editorial zones | `client/src/pages/public-home.tsx`        | Large  |

### Medium-term (Week 4-6)

| Task                    | Files                                             | Effort |
| ----------------------- | ------------------------------------------------- | ------ |
| VAMS integration        | `server/services/image-service.ts`                | Large  |
| Auto image selection    | Multiple                                          | Medium |
| Attraction detector     | `server/octypo/gatekeeper/attraction-detector.ts` | Medium |
| Tiqets real integration | `server/lib/tiqets-import-service.ts`             | Large  |

---

## Part 5: Success Metrics

### Before vs After

| Metric                       | Before               | After                     |
| ---------------------------- | -------------------- | ------------------------- |
| **Destination news**         | ❌ Empty (STUB)      | ✅ 6 relevant articles    |
| **Homepage hero**            | Static first article | Rotating every 4 hours    |
| **Article images**           | Manual only          | Auto-selected from VAMS   |
| **New attraction detection** | ❌ None              | ✅ Auto-detected from RSS |
| **Tiqets import**            | ❌ STUB (0 imports)  | ✅ Real imports           |

### User Experience

| Before                         | After                                     |
| ------------------------------ | ----------------------------------------- |
| News page looks static         | News page feels alive with rotation       |
| Destination pages have no news | Each destination shows relevant news      |
| No visual consistency          | Professional hero images on every article |
| Generic content order          | Editorial-prioritized content             |

---

## Appendix A: File Locations Reference

### Octypo-Main

```
/Users/admin/github-repos/octypo-main/
├── SCALING_ROADMAP.md          # Vision document
├── REMEDIATION_PLAN.md         # Bug fixes needed
├── docs/
│   ├── COMPLETE_SETUP_GUIDE.md # Full setup guide
│   └── FRONTEND_INTEGRATION_GUIDE.md # API reference
└── octypo/src/
    ├── agents/
    │   ├── profiles.py         # All 15 agent profiles
    │   ├── writers/            # 8 writers
    │   └── validators/         # 6 validators
    ├── localization/           # Translation system
    ├── workflows/              # Temporal workflows
    └── services/               # 35+ services
```

### Octypo-Image (VAMS)

```
/Users/admin/github-repos/octypo-image/
└── vams/src/
    ├── domains/                # 15 processing domains
    ├── core/
    │   ├── decision_engine.py
    │   ├── state_machine.py
    │   └── security_engine.py
    └── api/                    # REST API
```

### TRAVI Website

```
/Users/admin/travi-final-website/
├── server/
│   ├── octypo/                 # Content engine
│   │   ├── gatekeeper/         # Gate1 + Gate2
│   │   └── rss-reader.ts       # RSS ingestion
│   ├── localization/           # Translation + publish hooks
│   ├── lib/
│   │   └── tiqets-import-service.ts  # STUB!
│   └── storage/                # 26 storage modules
└── client/src/
    ├── pages/
    │   └── public-news.tsx     # News page
    └── components/destination/
        └── stubs.tsx           # EditorialNews = null!
```

---

_Document generated: February 2026_
_Last updated: v1.0_
