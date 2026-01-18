# Dubai Routing Audit - Migration Plan
> Last Updated: January 18, 2026
> Purpose: Migrate all Dubai content under `/destinations/dubai/` hierarchy

---

## Current Problem

The site started as Dubai-only and expanded to multiple destinations. This created scattered Dubai routes:

### ❌ WRONG (Current Routes Outside /destinations/dubai/)
```
/dubai-real-estate              → Should be /destinations/dubai/real-estate
/dubai-off-plan-properties      → Should be /destinations/dubai/off-plan
/search                         → Shows "Search Dubai" - internal only
/attractions/:slug              → Dubai attractions should be /destinations/dubai/attractions/:slug
/attractions/list/dubai         → Should be /destinations/dubai/attractions
/districts/downtown-dubai       → Should be /destinations/dubai/districts/downtown
/guides/dubai-to-rak-transport  → Should be /destinations/dubai/guides/rak-transport
```

### ✅ CORRECT (Target Structure)
```
/destinations/dubai/                          → Dubai home
/destinations/dubai/attractions               → Attractions list
/destinations/dubai/attractions/:slug         → Individual attraction
/destinations/dubai/real-estate               → Real estate hub
/destinations/dubai/off-plan                  → Off-plan properties
/destinations/dubai/search                    → Dubai search
/destinations/dubai/districts                 → Districts hub
/destinations/dubai/districts/:slug           → District page
/destinations/dubai/guides                    → Guides hub
/destinations/dubai/guides/:slug              → Guide page
/destinations/dubai/hotels                    → Hotels
/destinations/dubai/dining                    → Dining
/destinations/dubai/help                      → Help center
```

---

## Files Requiring Changes (104 Total)

### 1. ROUTES (1 file) - CRITICAL
| File | Changes Needed |
|------|----------------|
| `routes/index.ts` | Move all Dubai routes under `/destinations/dubai/` |

### 2. FILES WITH DUBAI LINKS (16 files) - HIGH PRIORITY
| File | Link Type |
|------|-----------|
| `App.tsx` | Route definitions |
| `pages/homepage.tsx` | Dubai destination links |
| `pages/hotels.tsx` | Dubai hotel links |
| `pages/test.tsx` | Dubai hotel links |
| `pages/glossary-hub.tsx` | Dubai links |
| `pages/not-found.tsx` | Dubai suggestions |
| `pages/public-off-plan.tsx` | Internal Dubai links |
| `components/public-footer.tsx` | Footer Dubai links |
| `data/destinationCategoryImages.ts` | Dubai image paths |
| `pages/public/guides/dubai-vs-rak-comparison.tsx` | Dubai links |
| `pages/public/guides/dubai-to-rak-transport.tsx` | Dubai links |
| `pages/admin/real-estate-management.tsx` | Dubai admin links |
| `pages/admin/off-plan-management.tsx` | Dubai admin links |
| `pages/admin/landing-pages-management.tsx` | Dubai landing page links |
| `pages/admin/districts-management.tsx` | Dubai district links |

### 3. PAGES WITH DUBAI CONTENT (32 files) - Need Link Updates
| File | Content Type |
|------|-------------|
| `homepage.tsx` | Featured destinations |
| `homepage-fast.tsx` | Featured destinations |
| `attractions.tsx` | "Burj Khalifa in Dubai" hero |
| `attraction-detail.tsx` | Dubai attractions |
| `destination-attractions.tsx` | Dubai attractions list |
| `hotels.tsx` | Dubai hotels |
| `destinations.tsx` | Dubai in grid |
| `destination-page.tsx` | Dubai destination |
| `global-dining.tsx` | Dubai dining |
| `destination-dining.tsx` | Dubai dining |
| `global-things-to-do.tsx` | Dubai activities |
| `global-guides.tsx` | Dubai guides |
| `guide-detail.tsx` | Dubai guides |
| `travel-guides.tsx` | Dubai guides |
| `public-search.tsx` | "Search Dubai" - Legacy |
| `public-off-plan.tsx` | 50+ Dubai mentions |
| `public-shopping.tsx` | Dubai shopping |
| `public-events.tsx` | Dubai events |
| `public-content-viewer.tsx` | Dubai content |
| `glossary-hub.tsx` | Dubai terms |
| `not-found.tsx` | Dubai suggestions |
| `dashboard.tsx` | Dubai stats |
| `campaigns.tsx` | Dubai campaigns |
| `clusters.tsx` | Dubai clusters |
| `content-editor.tsx` | Dubai content |
| `content-rules.tsx` | Dubai rules |
| `keywords.tsx` | Dubai keywords |
| `topic-bank.tsx` | Dubai topics |
| `newsletter-subscribers.tsx` | Dubai newsletter |
| `rss-feeds.tsx` | Dubai RSS |
| `settings.tsx` | Dubai settings |
| `ai-article-generator.tsx` | Dubai articles |
| `admin-image-engine.tsx` | Dubai images |

### 4. GUIDE FILES (6 files)
| File | New Path |
|------|----------|
| `public/guides/dubai-to-rak-transport.tsx` | `/destinations/dubai/guides/rak-transport` |
| `public/guides/dubai-vs-rak-comparison.tsx` | `/destinations/dubai/guides/rak-comparison` |
| `public/guides/jebel-jais-adventure-guide.tsx` | Keep as RAK guide |
| `public/guides/rak-real-estate-investment.tsx` | Keep as RAK guide |
| `public/guides/where-to-stay-rak.tsx` | Keep as RAK guide |
| `public/guides/wynn-al-marjan-guide.tsx` | Keep as RAK guide |

### 5. ADMIN FILES (12 files)
| File | Changes Needed |
|------|----------------|
| `admin/districts-management.tsx` | Update Dubai district paths |
| `admin/homepage-editor.tsx` | Update Dubai placeholders |
| `admin/auto-pilot.tsx` | Update Dubai content references |
| `admin/ai-quality-tools.tsx` | Update Dubai references |
| `admin/destination-intelligence.tsx` | Update Dubai config |
| `admin/content-intelligence.tsx` | Update Dubai references |
| `admin/off-plan-management.tsx` | Update Dubai links |
| `admin/real-estate-management.tsx` | Update Dubai links |
| `admin/landing-pages-management.tsx` | Update Dubai landing pages |
| `admin/octopus-dashboard.tsx` | Update Dubai references |
| `admin/site-settings.tsx` | Update Dubai settings |
| `admin/research/index.tsx` | Update Dubai research |
| `admin/travi/locations-list.tsx` | Update Dubai locations |

### 6. COMPONENTS (21 files)
| Component | Changes Needed |
|-----------|----------------|
| `destinations-hero.tsx` | Dubai hero links |
| `public-hero.tsx` | Dubai hero |
| `public-footer.tsx` | Dubai footer links |
| `off-plan-shared.tsx` | Dubai off-plan data |
| `ai-assistant.tsx` | Dubai AI prompts |
| `ai-title-suggestions.tsx` | Dubai suggestions |
| `seo-head.tsx` | Dubai meta tags |
| `seo/structured-data.tsx` | Dubai JSON-LD |
| `breadcrumbs.tsx` | Dubai breadcrumb paths |
| `ui/breadcrumbs.tsx` | Dubai breadcrumbs |
| `hotel-seo-editor.tsx` | Dubai hotel SEO |
| `district-seo-editor.tsx` | Dubai district SEO |
| `dining-seo-editor.tsx` | Dubai dining SEO |
| `attraction-seo-editor.tsx` | Dubai attraction SEO |
| `destination/safety-banner.tsx` | Dubai safety |
| `destination/quick-info-rail.tsx` | Dubai info |
| `guide-insights.tsx` | Dubai insights |
| `app-sidebar.tsx` | Dubai navigation |
| `article/NewsletterSignup.tsx` | Dubai newsletter |
| `ui/lazy-image.tsx` | Dubai images |

### 7. DATA FILES (3 files)
| File | Changes Needed |
|------|----------------|
| `data/destinations.ts` | Update Dubai paths, neighborhoods |
| `data/category-destinations.ts` | Update Dubai category paths |
| `data/destinationCategoryImages.ts` | Update Dubai image paths |

### 8. LOCALE FILES (16 files)
All need Dubai translation updates:
- `locales/en/common.json` through all 16 languages

### 9. LIB/UTILS (5 files)
| File | Changes Needed |
|------|----------------|
| `hooks/use-destination-context.ts` | Dubai context |
| `lib/navigation-aliases.tsx` | Dubai navigation aliases |
| `lib/seo-analyzer.ts` | Dubai SEO |
| `lib/image-seo-utils.ts` | Dubai images |
| `lib/i18n/translations.ts` | Dubai translations |
| `types/destination.ts` | Dubai types |

---

## Migration Order

### Phase 1: Routes (routes/index.ts)
Change all Dubai routes to `/destinations/dubai/...` structure

### Phase 2: High-Priority Links (16 files)
Fix direct Dubai links that will break immediately

### Phase 3: Components (21 files)
Fix component links and data

### Phase 4: Pages (32 files)
Fix page links and references

### Phase 5: Data Files (3 files)
Fix data file paths

### Phase 6: Redirects
Add redirects from old paths to new paths

### Phase 7: Sitemap
Update sitemap service

### Phase 8: Final Audit
Verify all Dubai content is under `/destinations/dubai/`

---

## Redirects Needed (SEO Preservation)

| Old Path | New Path |
|----------|----------|
| `/dubai-real-estate` | `/destinations/dubai/real-estate` |
| `/dubai-off-plan-properties` | `/destinations/dubai/off-plan` |
| `/attractions/list/dubai` | `/destinations/dubai/attractions` |
| `/districts/downtown-dubai` | `/destinations/dubai/districts/downtown` |
| `/districts/dubai-marina` | `/destinations/dubai/districts/marina` |
| `/guides/dubai-to-rak-transport` | `/destinations/dubai/guides/rak-transport` |
| `/guides/dubai-vs-rak` | `/destinations/dubai/guides/rak-comparison` |
