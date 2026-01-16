# Page Templates

**Canonical Templates for Scalable Page Design**

---

## Template Philosophy

Templates are **content containers**, not visual themes. A template defines:
- Where content zones appear
- How information flows
- What density is appropriate
- How users navigate within the page

Templates do NOT define:
- Specific colors or decoration
- Brand-specific imagery
- Content itself

---

## Template Inventory

| # | Template | Primary Use | Content Focus |
|---|----------|-------------|---------------|
| 1 | **Editorial Detail** | Articles, guides, help docs | Reading, comprehension |
| 2 | **Discovery Grid** | Listings, events, search results | Browsing, scanning |
| 3 | **Hub Index** | Category homepages, help center | Navigation, orientation |
| 4 | **Search Results** | Search pages | Finding, filtering |
| 5 | **Commerce Showcase** | Shopping, deals | Converting, purchasing |
| 6 | **Curated Collection** | Top 10 lists, guides, itineraries | Narrative browsing |

---

## Template 1: Editorial Detail

**Purpose:** Long-form reading with focus and minimal distraction.

### Layout Zones

```
┌─────────────────────────────────────────────────┐
│                   NAVIGATION                     │
├─────────────────────────────────────────────────┤
│ [Breadcrumb trail]                              │
│                                                  │
│           ARTICLE HEADER                         │
│   Category • Date • Read time                    │
│                                                  │
│   Title (display-lg)                             │
│   Subtitle/excerpt (body-lg)                     │
│                                                  │
│          [Hero Image - 16:9]                     │
│                                                  │
├─────────────────────────────────────────────────┤
│                                                  │
│        ┌─────────────────────┐                  │
│        │                     │                  │
│        │   ARTICLE BODY      │                  │
│        │   (max-width: 720px)│                  │
│        │   centered          │                  │
│        │                     │                  │
│        │   [Table of Contents│                  │
│        │    sticky sidebar   │                  │
│        │    on large screens]│                  │
│        │                     │                  │
│        └─────────────────────┘                  │
│                                                  │
├─────────────────────────────────────────────────┤
│   Author bio • Share buttons • Feedback         │
├─────────────────────────────────────────────────┤
│                                                  │
│           RELATED CONTENT                        │
│   [3-4 cards in horizontal scroll/grid]         │
│                                                  │
├─────────────────────────────────────────────────┤
│          NEWSLETTER SIGNUP                       │
├─────────────────────────────────────────────────┤
│                   FOOTER                         │
└─────────────────────────────────────────────────┘
```

### Typography Hierarchy

| Element | Token | Style |
|---------|-------|-------|
| Page title | `display-lg` | Chillax Bold |
| Subtitle | `body-lg` | Satoshi Regular, muted |
| Section headings | `heading-lg` | Chillax Semibold |
| Subheadings | `heading-md` | Chillax Medium |
| Body text | `body-md` | Satoshi Regular |
| Image captions | `caption` | Satoshi Regular, muted |
| Meta info | `caption` | Satoshi Medium, muted |

### Content Density Rules

- **Reading column**: 720px max-width, centered
- **Paragraph spacing**: 24px between paragraphs
- **Image width**: Full reading column width or breakout to 900px
- **Pull quotes**: Breakout left, larger text
- **Related content**: Comfortable density (3-4 cards)

### UX Intent
- Maximize readability
- Reduce distraction
- Enable deep focus
- Provide escape routes (related content) at natural stopping points

---

## Template 2: Discovery Grid

**Purpose:** Browse and scan many items to find what interests you.

### Layout Zones

```
┌─────────────────────────────────────────────────┐
│                   NAVIGATION                     │
├─────────────────────────────────────────────────┤
│                                                  │
│              HERO / FEATURED                     │
│   [Large featured item or promotional banner]   │
│                                                  │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐ │
│ │  FILTER BAR (sticky)                        │ │
│ │  [Category] [Sort] [Filters] [View toggle]  │ │
│ └─────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│                                                  │
│              CONTENT GRID                        │
│   ┌────┐ ┌────┐ ┌────┐ ┌────┐                   │
│   │    │ │    │ │    │ │    │                   │
│   │    │ │    │ │    │ │    │                   │
│   └────┘ └────┘ └────┘ └────┘                   │
│   ┌────┐ ┌────┐ ┌────┐ ┌────┐                   │
│   │    │ │    │ │    │ │    │                   │
│   │    │ │    │ │    │ │    │                   │
│   └────┘ └────┘ └────┘ └────┘                   │
│                                                  │
│           [Load More / Pagination]              │
│                                                  │
├─────────────────────────────────────────────────┤
│                                                  │
│           CATEGORY QUICK LINKS                   │
│   Browse by: [Cat 1] [Cat 2] [Cat 3] ...        │
│                                                  │
├─────────────────────────────────────────────────┤
│               CTA SECTION                        │
│   [App download / Newsletter / Related action]  │
├─────────────────────────────────────────────────┤
│                   FOOTER                         │
└─────────────────────────────────────────────────┘
```

### Typography Hierarchy

| Element | Token | Style |
|---------|-------|-------|
| Page title | `display-lg` | In hero or filter bar |
| Featured title | `heading-xl` | Chillax Bold |
| Card titles | `heading-md` | Chillax Semibold |
| Card descriptions | `body-sm` | Satoshi, line-clamp-2 |
| Filter labels | `body-sm` | Satoshi Medium |
| Category links | `body-md` | Satoshi Medium |

### Content Density Rules

- **Grid columns**: 2 (mobile) → 3 (tablet) → 4 (desktop)
- **Card gap**: 24px
- **Featured section**: 1-2 items at 2× card size
- **Cards per page**: 12-20 before pagination/load more
- **Filter bar**: Always visible (sticky on scroll)

### UX Intent
- Enable rapid scanning
- Provide filtering to narrow results
- Feature standout content
- Balance density with breathing room

---

## Template 3: Hub Index

**Purpose:** Orientation and navigation to sub-sections.

### Layout Zones

```
┌─────────────────────────────────────────────────┐
│                   NAVIGATION                     │
├─────────────────────────────────────────────────┤
│                                                  │
│              HERO SECTION                        │
│   Welcome message / Value proposition           │
│   [Optional search bar]                         │
│                                                  │
├─────────────────────────────────────────────────┤
│                                                  │
│           CATEGORY CARDS                         │
│   ┌──────────────┐  ┌──────────────┐            │
│   │   Category   │  │   Category   │            │
│   │   Icon       │  │   Icon       │            │
│   │   + Count    │  │   + Count    │            │
│   └──────────────┘  └──────────────┘            │
│   ┌──────────────┐  ┌──────────────┐            │
│   │   Category   │  │   Category   │            │
│   │   Icon       │  │   Icon       │            │
│   │   + Count    │  │   + Count    │            │
│   └──────────────┘  └──────────────┘            │
│                                                  │
├─────────────────────────────────────────────────┤
│                                                  │
│           FEATURED / POPULAR                     │
│   [Highlighted items within hub]                │
│                                                  │
├─────────────────────────────────────────────────┤
│           QUICK LINKS / FAQ                      │
├─────────────────────────────────────────────────┤
│                   FOOTER                         │
└─────────────────────────────────────────────────┘
```

### Typography Hierarchy

| Element | Token | Style |
|---------|-------|-------|
| Hub title | `display-lg` | Chillax Bold |
| Hub description | `body-lg` | Satoshi Regular |
| Category names | `heading-md` | Chillax Semibold |
| Category counts | `caption` | Satoshi, muted |
| Section titles | `heading-lg` | Chillax Semibold |

### Content Density Rules

- **Category cards**: 2-3 columns, comfortable spacing
- **Featured items**: 3-4 cards max
- **Hierarchy**: Categories first, featured second
- **Search**: Prominent if hub is large (10+ categories)

### UX Intent
- Help users orient themselves
- Provide clear pathways
- Show breadth of content
- Don't overwhelm with choices

---

## Template 4: Search Results

**Purpose:** Find specific content through query-based search.

### Layout Zones

```
┌─────────────────────────────────────────────────┐
│                   NAVIGATION                     │
├─────────────────────────────────────────────────┤
│                                                  │
│              SEARCH HERO                         │
│   ┌─────────────────────────────────┐           │
│   │  🔍  Search for anything...     │           │
│   └─────────────────────────────────┘           │
│   [Popular searches: link, link, link]          │
│                                                  │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐ │
│ │  RESULTS BAR                                │ │
│ │  "42 results for 'beach'" [Filters] [Sort]  │ │
│ └─────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│                                                  │
│              RESULTS LIST                        │
│   ┌─────────────────────────────────────────┐   │
│   │ [img] Title                              │   │
│   │       Snippet with **highlighted** terms │   │
│   │       Type badge • Date • Source         │   │
│   └─────────────────────────────────────────┘   │
│   ┌─────────────────────────────────────────┐   │
│   │ [img] Title                              │   │
│   │       Snippet with **highlighted** terms │   │
│   │       Type badge • Date • Source         │   │
│   └─────────────────────────────────────────┘   │
│                                                  │
│           [Load More / Pagination]              │
│                                                  │
├─────────────────────────────────────────────────┤
│                                                  │
│           EMPTY STATE (when no results)          │
│   [Illustration]                                │
│   "No results found for 'xyz'"                  │
│   Try: [Suggestion 1] [Suggestion 2]            │
│   Browse categories: [...]                      │
│                                                  │
├─────────────────────────────────────────────────┤
│                   FOOTER                         │
└─────────────────────────────────────────────────┘
```

### Typography Hierarchy

| Element | Token | Style |
|---------|-------|-------|
| Search placeholder | `body-lg` | Satoshi Regular |
| Results count | `body-md` | Satoshi Medium |
| Result title | `heading-sm` | Chillax Semibold, link color |
| Result snippet | `body-sm` | Satoshi, muted |
| Type badges | `overline` | Uppercase, colored |
| Empty state title | `heading-lg` | Chillax Semibold |

### Content Density Rules

- **Results format**: List (not grid) for scannability
- **Results per page**: 10-15
- **Snippet length**: 150-200 characters
- **Thumbnail**: Small (64-80px), optional
- **Filters**: Collapsible on mobile, sidebar on desktop

### UX Intent
- Search input always prominent
- Show relevant results quickly
- Provide context via snippets
- Graceful empty states with alternatives

---

## Template 5: Commerce Showcase

**Purpose:** Drive purchases through promotional content.

### Layout Zones

```
┌─────────────────────────────────────────────────┐
│                   NAVIGATION                     │
├─────────────────────────────────────────────────┤
│                                                  │
│              PROMO BANNER                        │
│   [Countdown timer / Flash sale / Deal hero]    │
│   [Strong CTA button]                           │
│                                                  │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐ │
│ │  FILTER / CATEGORY TABS                     │ │
│ │  [All] [Fashion] [Tech] [Home] [More ▾]     │ │
│ └─────────────────────────────────────────────┘ │
├───────────────────────────────┬─────────────────┤
│                               │                 │
│       PRODUCT GRID            │   SIDEBAR       │
│   ┌────┐ ┌────┐ ┌────┐       │                 │
│   │    │ │    │ │    │       │  Top Picks      │
│   │💰  │ │💰  │ │💰  │       │  ────────────   │
│   └────┘ └────┘ └────┘       │  [item]         │
│   ┌────┐ ┌────┐ ┌────┐       │  [item]         │
│   │    │ │    │ │    │       │  [item]         │
│   │💰  │ │💰  │ │💰  │       │                 │
│   └────┘ └────┘ └────┘       │  Quiz           │
│                               │  [Find style]   │
│                               │                 │
├───────────────────────────────┴─────────────────┤
│                                                  │
│           FEATURED RETAILERS                     │
│   [Logo] [Logo] [Logo] [Logo]                   │
│                                                  │
├─────────────────────────────────────────────────┤
│              CROSS-SELL SECTION                  │
│   "You might also like..."                      │
│   [Cards...]                                    │
├─────────────────────────────────────────────────┤
│                   FOOTER                         │
└─────────────────────────────────────────────────┘
```

### Typography Hierarchy

| Element | Token | Style |
|---------|-------|-------|
| Promo headline | `display-lg` | Chillax Bold |
| Countdown | `heading-xl` | Chillax Bold, brand color |
| Product titles | `heading-sm` | Chillax Medium |
| Prices | `heading-md` | Satoshi Bold |
| Original prices | `body-sm` | Strikethrough, muted |
| Discount badges | `overline` | Uppercase, accent bg |

### Content Density Rules

- **Product grid**: Dense (3-4 columns)
- **Sidebar**: Always visible on desktop
- **Cards**: Price prominent, description minimal
- **Promo banners**: High contrast, urgent tone
- **Trust signals**: Visible (ratings, reviews, badges)

### UX Intent
- Create urgency (countdowns, limited offers)
- Make prices scannable
- Reduce friction to action
- Build trust through social proof

---

## Template 6: Curated Collection

**Purpose:** Guide users through a sequenced narrative (e.g., "Top 10 Beaches").

### Layout Zones

```
┌─────────────────────────────────────────────────┐
│                   NAVIGATION                     │
├─────────────────────────────────────────────────┤
│                                                  │
│              HERO IMAGE                          │
│   [Full-width atmospheric image]                │
│                                                  │
│   Category • Date                               │
│   "10 Best Beaches in Dubai"                    │
│   Subtitle describing the curation              │
│                                                  │
├─────────────────────────────────────────────────┤
│ ┌─────────────────┐                             │
│ │ TABLE OF        │  INTRO PARAGRAPH            │
│ │ CONTENTS        │  Setting context for the    │
│ │ (sticky)        │  collection...              │
│ │                 │                             │
│ │ 1. Item One     │  ─────────────────────────  │
│ │ 2. Item Two     │                             │
│ │ 3. Item Three   │  #1 ITEM TITLE              │
│ │ ...             │  [Large Image]              │
│ │                 │  Description paragraph...   │
│ │                 │  Key highlights...          │
│ │                 │  [CTA: Learn More / Book]   │
│ │                 │                             │
│ │                 │  ─────────────────────────  │
│ │                 │                             │
│ │                 │  #2 ITEM TITLE              │
│ │                 │  ...                        │
│ └─────────────────┘                             │
│                                                  │
├─────────────────────────────────────────────────┤
│   SHARE / SAVE / PRINT ACTIONS                  │
├─────────────────────────────────────────────────┤
│                                                  │
│           RELATED COLLECTIONS                    │
│   [Collection card] [Collection card]           │
│                                                  │
├─────────────────────────────────────────────────┤
│                   FOOTER                         │
└─────────────────────────────────────────────────┘
```

### Typography Hierarchy

| Element | Token | Style |
|---------|-------|-------|
| Collection title | `display-lg` | Chillax Bold |
| Collection subtitle | `body-lg` | Satoshi Regular |
| Item number | `display-xl` | Chillax Bold, muted |
| Item title | `heading-lg` | Chillax Semibold |
| Item description | `body-md` | Satoshi Regular |
| TOC items | `body-sm` | Satoshi Medium |

### Content Density Rules

- **Items per collection**: 5-15 (sweet spot: 7-10)
- **Image size**: Large per item (full column width)
- **Description length**: 100-200 words per item
- **TOC**: Sticky on desktop, collapsible on mobile
- **Progress indicator**: Optional scroll progress

### UX Intent
- Tell a story through sequence
- Make navigation easy (jump to any item)
- Provide rich context per item
- Enable saving/sharing the collection

---

## Page Violation Analysis

### Current Pages vs. Templates

| Page | Current Issues | Recommended Template |
|------|----------------|---------------------|
| `/news` | Mixes Discovery Grid + Hub Index patterns; too many sections | **Discovery Grid** |
| `/events` | Good structure but filter UI differs from Search | **Discovery Grid** |
| `/shopping` | Commerce but missing urgency patterns; sidebar underused | **Commerce Showcase** |
| `/search` | Correct template but card layout differs from Discovery Grid | **Search Results** |
| `/help` | Good Hub Index but article pages lack reading optimization | **Hub Index** (index), **Editorial Detail** (articles) |
| `/articles` | Missing featured section, no filters | **Discovery Grid** |
| `/articles/:slug` | Good reading layout but breadcrumbs inconsistent | **Editorial Detail** |

### Specific Violations

#### `/news` (public-news.tsx)
**Violations:**
1. Hero section uses magazine-style complex layout (hero + 2 sidebar articles)
2. 5+ distinct section types on one page (breaks consistency)
3. Breaking news ticker adds cognitive load
4. Typography scale varies between sections
5. Category navigation pattern differs from other listing pages

**Recommendation:** Simplify to Discovery Grid with featured hero card, unified section treatment.

#### `/events` (public-events.tsx)
**Violations:**
1. Filter UI uses custom Select components instead of shared Filter component
2. Month filter is dropdown but category is buttons (inconsistent)
3. Featured event card is 2-column but grid is 3-column (visual disconnect)

**Recommendation:** Adopt standard Discovery Grid filter bar; make featured card span 2 grid columns.

#### `/shopping` (public-shopping.tsx)
**Violations:**
1. Style quiz takes excessive page space before products
2. Mega malls section breaks product focus
3. No sidebar for recommendations/filters on desktop
4. Countdown timer styling differs from other timed content

**Recommendation:** Lead with promotional hero + products. Move quiz to sidebar. Standardize countdown component.

#### `/search` (public-search.tsx)
**Violations:**
1. Results display as cards instead of list (slower scanning)
2. No query persistence in URL (can't share/bookmark searches)
3. Empty state categories should match Hub Index card style

**Recommendation:** Switch to list-based results. Add URL query params. Reuse category cards.

#### `/help` (help-center.tsx, help-article.tsx)
**Violations:**
1. Category page uses full cards for articles (too heavy)
2. Article page has narrow TOC that could be sticky
3. Related articles at bottom instead of sidebar

**Recommendation:** Use compact list for articles within category. Make TOC sticky. Add related sidebar on desktop.

---

## Reuse Matrix

### Pages That Should Reuse Templates

| Template | Reuse For |
|----------|-----------|
| **Editorial Detail** | `/articles/:slug`, `/help/:cat/:article`, `/news/:slug`, `/case-studies/:slug` |
| **Discovery Grid** | `/events`, `/news`, `/articles`, `/attractions`, `/hotels`, `/dining`, `/districts` |
| **Hub Index** | `/help`, `/tools`, `/public` (homepage categories section) |
| **Search Results** | `/search` |
| **Commerce Showcase** | `/shopping`, `/deals` (future) |
| **Curated Collection** | `/guides/:slug`, `/itineraries/:slug`, `/top-lists/:slug` (future) |

### Pages Needing Custom Variants

| Page | Base Template | Custom Variant Reason |
|------|---------------|----------------------|
| `/` (Homepage) | None (unique) | Combines Hub Index + Discovery Grid + Commerce elements |
| `/off-plan/*` | Discovery Grid | Real estate-specific filters, map integration |
| `/tools/calculators` | Hub Index | Interactive tool cards need special treatment |

---

## Implementation Priority

### Phase 1: Foundation (High Impact)
1. Create `<EditorialDetailLayout>` component
2. Create `<DiscoveryGridLayout>` component
3. Create shared `<FilterBar>` component
4. Migrate `/articles/:slug` to Editorial Detail

### Phase 2: Listings (Medium Impact)
5. Migrate `/events` to Discovery Grid
6. Migrate `/articles` index to Discovery Grid
7. Migrate `/news` to Discovery Grid
8. Create shared `<SearchResultsList>` component

### Phase 3: Specialized (Lower Impact)
9. Create `<CommerceShowcaseLayout>` component
10. Migrate `/shopping` to Commerce Showcase
11. Create `<CuratedCollectionLayout>` component
12. Create `<HubIndexLayout>` component

---

## Component Stub Requirements

Each template needs these stub components:

```
/client/src/components/templates/
├── editorial-detail/
│   ├── EditorialDetailLayout.tsx
│   ├── ArticleHeader.tsx
│   ├── ArticleBody.tsx
│   ├── TableOfContents.tsx
│   └── RelatedContent.tsx
├── discovery-grid/
│   ├── DiscoveryGridLayout.tsx
│   ├── FilterBar.tsx
│   ├── FeaturedHero.tsx
│   ├── ContentGrid.tsx
│   └── CategoryQuickLinks.tsx
├── hub-index/
│   ├── HubIndexLayout.tsx
│   ├── HubHero.tsx
│   ├── CategoryCards.tsx
│   └── FeaturedSection.tsx
├── search-results/
│   ├── SearchResultsLayout.tsx
│   ├── SearchHero.tsx
│   ├── ResultsList.tsx
│   ├── ResultItem.tsx
│   └── EmptyState.tsx
├── commerce-showcase/
│   ├── CommerceShowcaseLayout.tsx
│   ├── PromoBanner.tsx
│   ├── ProductGrid.tsx
│   ├── Sidebar.tsx
│   └── CrossSell.tsx
└── curated-collection/
    ├── CuratedCollectionLayout.tsx
    ├── CollectionHero.tsx
    ├── CollectionTOC.tsx
    ├── CollectionItem.tsx
    └── ShareActions.tsx
```

---

**Previous:** [Frontend Design System](./frontend-design-system.md)
