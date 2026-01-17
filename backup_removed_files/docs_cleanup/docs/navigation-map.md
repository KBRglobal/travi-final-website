# Navigation Architecture Map

> **Audit Date:** 2026-01-01
> **Status:** Complete audit of all navigation entry points

---

## Table of Contents

1. [Navigation Entry Points Overview](#navigation-entry-points-overview)
2. [Header Navigation](#header-navigation)
3. [Footer Navigation](#footer-navigation)
4. [Homepage Navigation](#homepage-navigation)
5. [Destination-Level Navigation](#destination-level-navigation)
6. [Route Inventory](#route-inventory)
7. [Critical Mismatches Identified](#critical-mismatches-identified)

---

## Navigation Entry Points Overview

| Entry Point | Location | Component File |
|------------|----------|----------------|
| Global Header | All pages | `public-nav.tsx` |
| Global Footer | All pages | `public-footer.tsx` |
| Homepage Header | Homepage only | `homepage-new.tsx` (inline) |
| Homepage Sections | Homepage only | `homepage-new.tsx` |
| Destination Nav | Destination pages | `DestinationNav.tsx` |
| V2 Header | V2 routes only | `public-v2/header.tsx` |
| V2 Footer | V2 routes only | `public-v2/footer.tsx` |

---

## Header Navigation

### Source: `client/src/components/public-nav.tsx`

#### Fallback Navigation Items (Lines 35-42)
| Label | Hebrew Label | Path | Icon | Status |
|-------|--------------|------|------|--------|
| Attractions | אטרקציות | `/attractions` | Camera | OK |
| Hotels | מלונות | `/hotels` | Building2 | OK |
| Districts | שכונות | `/districts` | MapPin | OK |
| Dining | מסעדות | `/dining` | Utensils | **MISMATCH** - Hebrew says "Restaurants" |
| Shopping | קניות | `/shopping` | ShoppingBag | OK |
| News | חדשות | `/news` | Compass | **WRONG ICON** - Should be Newspaper |

#### Highlighted Links (Lines 83-85)
| Label | Path | Icon |
|-------|------|------|
| Real Estate | `/dubai-off-plan-properties` | Sparkles |

#### Dynamic Navigation
- Fetches from API: `/api/site-config/public/navigation/main`
- Falls back to hardcoded items if API fails

---

## Footer Navigation

### Source: `client/src/components/public-footer.tsx`

#### Explore Column (Lines 26-33)
| Label | Path | Actual Page Intent | Status |
|-------|------|-------------------|--------|
| Destinations | `/destinations` | Destination hub | OK |
| Hotels | `/hotels` | Hotel listings | OK |
| Attractions | `/attractions` | Attraction listings | OK |
| Restaurants | `/dining` | Restaurant/Dining listings | **LABEL MISMATCH** |
| Travel Guides | `/guides` | Travel guides | **ROUTE 404** |
| Articles | `/news` | News portal | **LABEL MISMATCH** |

#### Company/Legal Column (Lines 36-43)
| Label | Path | Status |
|-------|------|--------|
| About Us | `/about` | OK |
| Contact | `/contact` | OK |
| Terms & Conditions | `/terms` | OK |
| Privacy Policy | `/privacy` | OK |
| Cookie Policy | `/cookies` | OK |
| Security Policy | `/security` | OK |

---

## Homepage Navigation

### Source: `client/src/pages/homepage-new.tsx`

#### Header Navigation (Lines 157-165)
| Label | Path | Status |
|-------|------|--------|
| Destinations | `/destinations` | OK |
| Hotels | `/hotels` | OK |
| Attractions | `/attractions` | OK |
| Restaurants | `/restaurants` | **ROUTE 404** |
| Things to Do | `/things-to-do` | **ROUTE 404** |
| Travel Guides | `/travel-guides` | **ROUTE 404** |
| Travel News | `/news` | OK |

#### Quick Categories Section (Lines 189-196)
| Title | Subtitle | Path | Status |
|-------|----------|------|--------|
| Hotels | Find your perfect stay | `/hotels` | OK |
| Attractions | Discover must-see places | `/attractions` | OK |
| Restaurants | Explore dining options | `/restaurants` | **ROUTE 404** |
| Things to Do | Activities and experiences | `/things-to-do` | **ROUTE 404** |
| Travel News | Latest travel updates | `/news` | OK |
| Travel Guides | Complete destination guides | `/travel-guides` | **ROUTE 404** |

#### Experience Categories Section (Lines 198-205)
Links to `/experiences/{slug}` - routes exist.

#### Region Links Section (Lines 207-211)
Links to `/destinations/{slug}` - routes exist.

---

## Destination-Level Navigation

### Source: `client/src/components/destination/DestinationNav.tsx`

#### In-Page Section Navigation (Lines 19-26)
| ID | Label | Icon | Type |
|----|-------|------|------|
| attractions | Attractions | MapPin | Anchor |
| hotels | Stay | Hotel | Anchor |
| news | News | Newspaper | Anchor |
| best-time | When to Go | Calendar | Anchor |
| getting-around | Getting Around | Car | Anchor |
| faq | FAQ | HelpCircle | Anchor |

**Note:** These are in-page anchor links, not route navigations.

---

## Route Inventory

### Public Routes (from `App.tsx`)

#### Content Listing Routes
| Path | Component | Actual Content |
|------|-----------|----------------|
| `/attractions` | PublicAttractions | Attraction listings |
| `/attractions/:slug` | PublicContentViewer | Single attraction |
| `/hotels` | PublicHotels | Hotel listings |
| `/hotels/:slug` | PublicContentViewer | Single hotel |
| `/dining` | PublicDining | Restaurant listings |
| `/dining/:slug` | PublicContentViewer | Single restaurant |
| `/articles` | PublicArticles | Article listings (old page) |
| `/articles/:slug` | PublicContentViewer | Single article |
| `/news` | PublicNews | News portal (new page) |
| `/events` | PublicEvents | Event listings |
| `/shopping` | PublicShopping | Shopping listings |

#### Static/Utility Routes
| Path | Component | Purpose |
|------|-----------|---------|
| `/` | HomepageNew | Homepage |
| `/search` | PublicSearch | Site search |
| `/destinations` | DestinationsLanding | Destination hub |
| `/destinations/:slug` | DestinationPage | Single destination |

#### Non-Existent Routes (Referenced but 404)
| Path | Referenced In | Should Map To |
|------|---------------|---------------|
| `/restaurants` | Homepage | `/dining` |
| `/things-to-do` | Homepage | N/A (concept page) |
| `/travel-guides` | Homepage | `/guides` or articles |
| `/guides` | Footer | N/A (no route) |

---

## Critical Mismatches Identified

### 1. Dining vs Restaurants Inconsistency

**Current State:**
- Route exists: `/dining`
- Header label: "Dining"
- Footer label: "Restaurants"
- Homepage label: "Restaurants"
- Homepage path: `/restaurants` (404!)
- Hebrew translation: "מסעדות" (Restaurants)

**Page Content:** Lists restaurants, uses "Restaurant" in singular form.

**Problem:** Inconsistent terminology across navigation surfaces and broken link on homepage.

---

### 2. News vs Articles Dual System

**Current State:**
- `/news` → `PublicNews` - Full news portal with categories, sidebar, breaking news ticker
- `/articles` → `PublicArticles` - Simple article list with basic layout

**Navigation References:**
- Header: "News" → `/news`
- Footer: "Articles" → `/news` (mislabeled)
- Both routes exist but serve different UI experiences

**Problem:** Two separate pages for similar content type, confusing labeling.

---

### 3. Missing Guide Routes

**Current State:**
- Footer references `/guides` - No route exists
- Homepage references `/travel-guides` - No route exists
- No public "guides" or "travel guides" page

**Problem:** Footer and homepage link to non-existent pages.

---

### 4. Icon Inconsistencies

| Navigation Item | Current Icon | Expected Icon |
|-----------------|--------------|---------------|
| News (Header) | Compass | Newspaper |

---

### 5. V2 Navigation (Incomplete)

**Source:** `client/src/components/public-v2/header.tsx`

Navigation items have `label: null` for all entries (Lines 9-15), suggesting incomplete migration or placeholder state:
```typescript
const NAVIGATION_ITEMS = [
  { id: "attractions", label: null },
  { id: "hotels", label: null },
  { id: "dining", label: null },
  { id: "news", label: null },
  { id: "explore", label: null },
] as const;
```

---

## Navigation Flow Diagram

```
                    ┌─────────────────────────────────────────┐
                    │             GLOBAL HEADER               │
                    │  (Attractions, Hotels, Districts,       │
                    │   Dining, Shopping, News, Real Estate)  │
                    └────────────────────┬────────────────────┘
                                         │
                    ┌────────────────────┴────────────────────┐
                    ▼                                         ▼
          ┌─────────────────┐                      ┌─────────────────┐
          │    HOMEPAGE     │                      │  CONTENT PAGES  │
          │   Quick Links   │                      │  (via header)   │
          │   Categories    │                      │                 │
          │   Destinations  │                      │                 │
          └────────┬────────┘                      └────────┬────────┘
                   │                                        │
                   ▼                                        ▼
          ┌─────────────────┐                      ┌─────────────────┐
          │  DESTINATION    │                      │  CONTENT LIST   │
          │     PAGE        │                      │    PAGES        │
          │ (DestinationNav)│                      │                 │
          └────────┬────────┘                      └────────┬────────┘
                   │                                        │
                   ▼                                        ▼
          ┌─────────────────┐                      ┌─────────────────┐
          │  SECTION ANCHORS│                      │  DETAIL PAGES   │
          │ (In-page nav)   │                      │  (/slug routes) │
          └─────────────────┘                      └─────────────────┘
                                         │
                    ┌────────────────────┴────────────────────┐
                    ▼                                         ▼
                    ┌─────────────────────────────────────────┐
                    │             GLOBAL FOOTER               │
                    │  (Explore, Guides, Company/Legal)       │
                    └─────────────────────────────────────────┘
```

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total Navigation Entry Points | 7 |
| Total Unique Navigation Items | 23 |
| Label Mismatches | 3 |
| Broken Links (404) | 4 |
| Icon Inconsistencies | 1 |
| Incomplete Components | 1 |

---

*Document generated by Navigation Architecture Audit*
