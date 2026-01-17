# TRAVI.world - Frontend Pages Complete Audit
> Last Updated: January 17, 2026
> Generated from: `client/src/routes/index.ts`, `client/src/routes/lazy-imports.ts`, `client/src/pages/`

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total Page Files | 161 |
| Public Routes Defined | 46 |
| Admin Routes | ~90 |
| Working Public Pages | ~50 |
| Pages Excluded from Sitemap | ~15 |
| Dynamic Attraction Pages | 3,408 |
| Commented/Not Implemented | ~40 |

---

## Classification Legend

| Status | Meaning | Sitemap | noIndex |
|--------|---------|---------|---------|
| ✅ PUBLIC | Working, public-facing | YES | NO |
| ⚠️ BROKEN | Route exists but broken | NO | YES |
| 🔒 AUTH | Requires authentication | NO | YES |
| 🔧 INTERNAL | Internal/dev tool | NO | YES |
| 🔄 REDIRECT | Redirects to another page | NO | - |
| 📝 ALIAS | Alternate URL for same page | OPTIONAL | NO (canonical) |
| 🛠️ ADMIN | Admin panel pages | NO | YES |
| ⏸️ NOT IMPL | Commented out/not implemented | NO | - |

---

## 1. CORE PUBLIC PAGES

### Main Hubs
| Path | Component File | Status | Notes |
|------|----------------|--------|-------|
| `/` | `homepage.tsx` | ✅ PUBLIC | Main landing page |
| `/destinations` | `destinations.tsx` | ✅ PUBLIC | Destinations hub |
| `/attractions` | `attractions.tsx` | ✅ PUBLIC | Attractions hub |
| `/hotels` | `hotels.tsx` | ✅ PUBLIC | Hotels hub |
| `/dining` | `global-dining.tsx` | ✅ PUBLIC | Dining hub |
| `/articles` | `public-articles.tsx` | ✅ PUBLIC | Articles hub |
| `/events` | `public-events.tsx` | ✅ PUBLIC | Events hub |
| `/news` | `public-news.tsx` | ✅ PUBLIC | News hub |
| `/shopping` | `public-shopping.tsx` | ✅ PUBLIC | Shopping hub |
| `/glossary` | `glossary-hub.tsx` | ✅ PUBLIC | Glossary hub |

---

## 2. SEARCH PAGE

| Path | Component File | Status | Sitemap | noIndex |
|------|----------------|--------|---------|---------|
| `/search` | `public-search.tsx` | 🔧 INTERNAL | ❌ REMOVED | ✅ ADDED |

**Notes:** Legacy Dubai search - shows "Search Dubai" - internal use only

---

## 3. HELP CENTER

| Path | Component File | Status | Sitemap | noIndex |
|------|----------------|--------|---------|---------|
| `/help` | `help/index.tsx` | ⚠️ BROKEN | ❌ REMOVED | ✅ ADDED |
| `/help/:slug` | `help/category.tsx` | ⚠️ BROKEN | ❌ REMOVED | - |
| `/help/:categorySlug/:articleSlug` | `help/article.tsx` | ⚠️ BROKEN | ❌ REMOVED | - |

**Notes:** Shows "Help center is currently unavailable" - all routes broken

---

## 4. DESTINATION PAGES

### 16 Active Cities
| Path | Status | Notes |
|------|--------|-------|
| `/destinations/dubai` | ✅ PUBLIC | Main destination |
| `/destinations/paris` | ✅ PUBLIC | |
| `/destinations/tokyo` | ✅ PUBLIC | |
| `/destinations/new-york` | ✅ PUBLIC | |
| `/destinations/london` | ✅ PUBLIC | |
| `/destinations/barcelona` | ✅ PUBLIC | |
| `/destinations/singapore` | ✅ PUBLIC | |
| `/destinations/bangkok` | ✅ PUBLIC | |
| `/destinations/abu-dhabi` | ✅ PUBLIC | |
| `/destinations/amsterdam` | ✅ PUBLIC | |
| `/destinations/hong-kong` | ✅ PUBLIC | |
| `/destinations/istanbul` | ✅ PUBLIC | |
| `/destinations/las-vegas` | ✅ PUBLIC | |
| `/destinations/los-angeles` | ✅ PUBLIC | |
| `/destinations/miami` | ✅ PUBLIC | |
| `/destinations/rome` | ✅ PUBLIC | |
| `/destinations/ras-al-khaimah` | ✅ PUBLIC | Special RAK page |

### Destination Redirects (NOT in Sitemap)
| Path | Status | Redirects To |
|------|--------|--------------|
| `/bangkok` | 🔄 REDIRECT | /destinations/bangkok |
| `/paris` | 🔄 REDIRECT | /destinations/paris |
| `/istanbul` | 🔄 REDIRECT | /destinations/istanbul |
| `/london` | 🔄 REDIRECT | /destinations/london |
| `/new-york` | 🔄 REDIRECT | /destinations/new-york |
| `/singapore` | 🔄 REDIRECT | /destinations/singapore |

---

## 5. ATTRACTION PAGES

### Static Routes
| Path | Component File | Status |
|------|----------------|--------|
| `/attractions` | `attractions.tsx` | ✅ PUBLIC |
| `/attractions/list/:destination` | `destination-attractions.tsx` | ✅ PUBLIC |

### Dynamic Routes (3,408 Tiqets Attractions)
| Path Pattern | Component File | Status | Notes |
|--------------|----------------|--------|-------|
| `/attractions/:slug` | `public-content-viewer.tsx` | ✅ PUBLIC | Canonical URL |
| `/attractions/:seoSlug` | `public-content-viewer.tsx` | ✅ PUBLIC | SEO-optimized slug |

---

## 6. HOTELS

| Path | Component File | Status |
|------|----------------|--------|
| `/hotels` | `hotels.tsx` | ✅ PUBLIC |
| `/hotels/:slug` | `public-content-viewer.tsx` | ✅ PUBLIC |

---

## 7. DINING

| Path | Component File | Status |
|------|----------------|--------|
| `/dining` | `global-dining.tsx` | ✅ PUBLIC |
| `/dining/:slug` | `public-content-viewer.tsx` | ✅ PUBLIC |

---

## 8. ARTICLES & EVENTS

| Path | Component File | Status |
|------|----------------|--------|
| `/articles` | `public-articles.tsx` | ✅ PUBLIC |
| `/articles/:slug` | `public-content-viewer.tsx` | ✅ PUBLIC |
| `/events` | `public-events.tsx` | ✅ PUBLIC |
| `/events/:slug` | `public-content-viewer.tsx` | ✅ PUBLIC |

---

## 9. TRANSPORT

| Path | Component File | Status |
|------|----------------|--------|
| `/transport/:slug` | `public-content-viewer.tsx` | ✅ PUBLIC |

---

## 10. GUIDES & TRAVEL CONTENT

### Guide Hub
| Path | Component File | Status |
|------|----------------|--------|
| `/guides` | `global-guides.tsx` | ✅ PUBLIC |
| `/travel-guides` | `travel-guides.tsx` | 📝 ALIAS |

### RAK Guides (6 Implemented)
| Path | Component File | Status |
|------|----------------|--------|
| `/guides/wynn-al-marjan-island` | `public/guides/wynn-al-marjan-guide.tsx` | ✅ PUBLIC |
| `/guides/jebel-jais-adventure` | `public/guides/jebel-jais-adventure-guide.tsx` | ✅ PUBLIC |
| `/guides/dubai-to-rak-transport` | `public/guides/dubai-to-rak-transport.tsx` | ✅ PUBLIC |
| `/guides/dubai-vs-rak` | `public/guides/dubai-vs-rak-comparison.tsx` | ✅ PUBLIC |
| `/guides/where-to-stay-rak` | `public/guides/where-to-stay-rak.tsx` | ✅ PUBLIC |
| `/guides/rak-real-estate-investment` | `public/guides/rak-real-estate-investment.tsx` | ✅ PUBLIC |

### Dynamic Guides
| Path | Component File | Status |
|------|----------------|--------|
| `/guides/:slug` | `guide-detail.tsx` | ✅ PUBLIC |
| `/travel-styles/:slug` | `travel-style-article.tsx` | ✅ PUBLIC |

---

## 11. OFF-PLAN REAL ESTATE

### Active Pages
| Path | Component File | Status |
|------|----------------|--------|
| `/dubai-real-estate` | `public-off-plan.tsx` | ✅ PUBLIC |
| `/dubai-off-plan-properties` | `public-off-plan.tsx` | ✅ PUBLIC |

### NOT Implemented (Commented Out in routes/index.ts)
- `/dubai-off-plan-investment-guide`
- `/how-to-buy-dubai-off-plan`
- `/dubai-off-plan-payment-plans`
- `/best-off-plan-projects-dubai-2026`
- `/dubai-off-plan-business-bay`
- `/dubai-off-plan-marina`
- `/dubai-off-plan-jvc`
- `/dubai-off-plan-palm-jumeirah`
- `/dubai-off-plan-creek-harbour`
- `/dubai-off-plan-al-furjan`
- `/dubai-off-plan-villas`
- `/off-plan-emaar`
- `/off-plan-damac`
- `/off-plan-nakheel`
- `/off-plan-meraas`
- `/off-plan-sobha`
- `/off-plan-crypto-payments`
- `/off-plan-usdt`
- `/off-plan-golden-visa`
- `/off-plan-post-handover`
- `/off-plan-escrow`
- `/off-plan-vs-ready`

---

## 12. LEGAL PAGES

### Canonical URLs
| Path | Component File | Status |
|------|----------------|--------|
| `/privacy` | `privacy.tsx` | ✅ PUBLIC |
| `/terms` | `terms.tsx` | ✅ PUBLIC |
| `/cookies` | `cookies.tsx` | ✅ PUBLIC |
| `/security` | `security.tsx` | ✅ PUBLIC |
| `/affiliate-disclosure` | `affiliate-disclosure.tsx` | ✅ PUBLIC |

### Alias URLs
| Path | Canonical | Status |
|------|-----------|--------|
| `/privacy-policy` | `/privacy` | 📝 ALIAS |
| `/terms-conditions` | `/terms` | 📝 ALIAS |
| `/cookie-policy` | `/cookies` | 📝 ALIAS |

---

## 13. ABOUT & CONTACT

| Path | Component File | Status |
|------|----------------|--------|
| `/about` | `about.tsx` | ✅ PUBLIC |
| `/contact` | `contact.tsx` | ✅ PUBLIC |

---

## 14. PARTNERS / REFERRAL

| Path | Component File | Status | Sitemap | noIndex |
|------|----------------|--------|---------|---------|
| `/partners/join` | `partners-join.tsx` | ✅ PUBLIC | YES | NO |
| `/partners/dashboard` | `partners-dashboard.tsx` | 🔒 AUTH | NO | ✅ ADDED |

---

## 15. SURVEYS

| Path | Component File | Status | Sitemap | noIndex |
|------|----------------|--------|---------|---------|
| `/survey/:slug` | `public-survey.tsx` | 🔧 INTERNAL | NO | ✅ ADDED |

---

## 16. AUTHENTICATION & UTILITY PAGES

| Path | Component File | Status | Sitemap | noIndex |
|------|----------------|--------|---------|---------|
| `/login` | `login.tsx` | 🔒 AUTH | ❌ REMOVED | ✅ ADDED |
| `/access-denied` | `access-denied.tsx` | 🔧 INTERNAL | ❌ REMOVED | ✅ ADDED |
| `/coming-soon` | - | 🔧 INTERNAL | NO | - |
| `/test` | `test.tsx` | 🔧 INTERNAL | ❌ REMOVED | ✅ ADDED |

---

## 17. DOCUMENTATION

| Path | Component File | Status | Sitemap | noIndex |
|------|----------------|--------|---------|---------|
| `/docs` | `public-docs.tsx` | 🔧 INTERNAL | ❌ REMOVED | ✅ ADDED |
| `/docs/:path*` | `public-docs.tsx` | 🔧 INTERNAL | ❌ REMOVED | ✅ ADDED |

---

## 18. NOT IMPLEMENTED ROUTES (Commented Out)

### Comparison Pages
- `/compare-off-plan-vs-ready`
- `/compare-jvc-vs-dubai-south`
- `/compare-emaar-vs-damac`
- `/compare-downtown-vs-marina`
- `/compare-60-40-vs-80-20`
- `/compare-sobha-vs-meraas`
- `/compare-crypto-vs-bank-transfer`
- `/compare-business-bay-vs-jlt`
- `/compare-new-vs-resale`
- `/compare-nakheel-vs-azizi`
- `/compare-villa-vs-apartment`
- `/compare-studio-vs-1bed`

### Tools
- `/tools-roi-calculator`
- `/tools-payment-calculator`
- `/tools-affordability-calculator`
- `/tools-currency-converter`
- `/tools-fees-calculator`
- `/tools-rental-yield-calculator`
- `/tools-mortgage-calculator`

### Case Studies
- `/case-study-jvc-investor`
- `/case-study-crypto-buyer`
- `/case-study-golden-visa`
- `/case-study-expat-family`
- `/case-study-investor-flip`
- `/case-study-portfolio-diversification`
- `/case-study-off-plan-launch`
- `/case-study-retirement-planning`

### Pillar Pages
- `/dubai-roi-rental-yields`
- `/dubai-legal-security-guide`

### Landing Pages
- `/dubai/free-things-to-do`
- `/dubai/laws-for-tourists`
- `/dubai/sheikh-mohammed-bin-rashid`
- `/dubai/24-hours-open`

### Districts
- `/districts`
- `/districts/downtown-dubai`
- `/districts/dubai-marina`
- `/districts/jbr-jumeirah-beach-residence`
- `/districts/palm-jumeirah`
- `/districts/jumeirah`
- `/districts/business-bay`
- `/districts/old-dubai`
- `/districts/dubai-creek-harbour`
- `/districts/dubai-south`
- `/districts/al-barsha`
- `/districts/difc`
- `/districts/dubai-hills-estate`
- `/districts/jvc`
- `/districts/bluewaters-island`
- `/districts/international-city`
- `/districts/al-karama`

---

## 19. ADMIN PAGES (90+ Pages)

All admin pages are under `/admin/*` and require authentication.
**Sitemap:** NO | **noIndex:** YES (implicit - not public)

### Content Management
| Path | Component File |
|------|----------------|
| `/admin` | `dashboard.tsx` |
| `/admin/content` | `content-list.tsx` |
| `/admin/content/:id` | `content-editor.tsx` |
| `/admin/content/:id/versions` | - |
| `/admin/ai-article` | `ai-article-generator.tsx` |
| `/admin/topic-bank` | `topic-bank.tsx` |
| `/admin/keywords` | `keywords.tsx` |
| `/admin/clusters` | `clusters.tsx` |
| `/admin/tags` | `tags.tsx` |
| `/admin/templates` | `content-templates.tsx` |
| `/admin/calendar` | `admin/Calendar.tsx` |

### RSS & Affiliate
| Path | Component File |
|------|----------------|
| `/admin/rss` | `rss-feeds.tsx` |
| `/admin/affiliate-links` | `affiliate-links.tsx` |

### Media & Images
| Path | Component File |
|------|----------------|
| `/admin/media` | `media-library.tsx` |
| `/admin/image-engine` | `admin-image-engine.tsx` |

### Destinations
| Path | Component File |
|------|----------------|
| `/admin/destinations` | `admin/destinations/destinations-list.tsx` |
| `/admin/destinations/:id` | `admin/destinations/destination-hub.tsx` |
| `/admin/destination-intelligence` | `admin/destination-intelligence.tsx` |

### Tiqets Integration
| Path | Component File |
|------|----------------|
| `/admin/tiqets` | `admin/tiqets/dashboard.tsx` |
| `/admin/tiqets/destinations` | `admin/tiqets/destinations.tsx` |
| `/admin/tiqets/integrations` | `admin/tiqets/integrations.tsx` |
| `/admin/tiqets/configuration` | `admin/tiqets/configuration.tsx` |
| `/admin/tiqets/content-quality` | `admin/tiqets/content-quality.tsx` |
| `/admin/tiqets/attraction/:id` | `admin/tiqets/attraction-detail.tsx` |

### TRAVI Content Engine
| Path | Component File |
|------|----------------|
| `/admin/travi` | `admin/travi/locations-list.tsx` |
| `/admin/travi/edit/:id` | `admin/travi/location-edit.tsx` |
| `/admin/travi/preview/:id` | `admin/travi/location-preview.tsx` |
| `/admin/travi/configuration` | `admin/travi/configuration.tsx` |
| `/admin/travi/data-collection` | `admin/travi/data-collection.tsx` |
| `/admin/travi/api-keys` | `admin/travi/api-keys.tsx` |

### SEO & Analytics
| Path | Component File |
|------|----------------|
| `/admin/seo-audit` | `seo-audit.tsx` |
| `/admin/seo-engine` | `admin/seo-engine/index.tsx` |
| `/admin/analytics` | `analytics.tsx` |
| `/admin/aeo` | `admin/aeo-dashboard.tsx` |
| `/admin/growth` | `admin/growth-dashboard.tsx` |
| `/admin/intelligence` | `admin/IntelligenceDashboard.tsx` |

### Site Configuration
| Path | Component File |
|------|----------------|
| `/admin/settings` | `settings.tsx` |
| `/admin/site-settings` | `admin/site-settings.tsx` |
| `/admin/navigation` | `admin/navigation-manager.tsx` |
| `/admin/footer` | `admin/footer-manager.tsx` |
| `/admin/homepage` | `admin/homepage-editor.tsx` |
| `/admin/homepage-promotions` | `homepage-promotions.tsx` |
| `/admin/static-pages` | `admin/static-pages.tsx` |
| `/admin/static-pages/:id` | `admin/static-page-editor.tsx` |
| `/admin/page-builder` | `admin/page-builder.tsx` |

### Monetization
| Path | Component File |
|------|----------------|
| `/admin/premium` | `admin/monetization/premium-content.tsx` |
| `/admin/listings` | `admin/monetization/business-listings.tsx` |
| `/admin/leads` | `admin/monetization/lead-management.tsx` |
| `/admin/affiliate-dashboard` | `admin/monetization/affiliate-dashboard.tsx` |
| `/admin/referrals` | `admin/referrals.tsx` |

### Enterprise
| Path | Component File |
|------|----------------|
| `/admin/teams` | `admin/enterprise/teams.tsx` |
| `/admin/workflows` | `admin/enterprise/workflows.tsx` |
| `/admin/webhooks` | `admin/enterprise/webhooks.tsx` |
| `/admin/activity` | `admin/enterprise/activity-feed.tsx` |

### Governance
| Path | Component File |
|------|----------------|
| `/admin/governance` | `admin/governance/index.tsx` |
| `/admin/governance/roles` | `admin/governance/roles.tsx` |
| `/admin/governance/users` | `admin/governance/users.tsx` |
| `/admin/governance/policies` | `admin/governance/policies.tsx` |
| `/admin/governance/approvals` | `admin/governance/approvals.tsx` |
| `/admin/governance/audit` | `admin/governance/audit.tsx` |

### Operations
| Path | Component File |
|------|----------------|
| `/admin/operations` | `admin/operations-dashboard.tsx` |
| `/admin/system-health` | `admin/system-health.tsx` |
| `/admin/security` | `admin/security.tsx` |
| `/admin/logs` | `admin-logs.tsx` |
| `/admin/audit-logs` | `audit-logs.tsx` |
| `/admin/console` | `admin/console.tsx` |

### Other Admin
| Path | Component File |
|------|----------------|
| `/admin/users` | `users.tsx` |
| `/admin/newsletter` | `newsletter-subscribers.tsx` |
| `/admin/campaigns` | `campaigns.tsx` |
| `/admin/translations` | `translations.tsx` |
| `/admin/help` | `admin/help/index.tsx` |
| `/admin/help/article/:id` | `admin/help/article-editor.tsx` |
| `/admin/surveys` | `surveys.tsx` |
| `/admin/surveys/:id` | `survey-builder.tsx` |
| `/admin/surveys/:id/responses` | `survey-responses.tsx` |
| `/admin/social` | `admin/social/social-dashboard.tsx` |
| `/admin/auto-pilot` | `admin/auto-pilot.tsx` |
| `/admin/octopus` | `admin/octopus-dashboard.tsx` |
| `/admin/qa` | `admin/qa-dashboard.tsx` |
| `/admin/alerts` | `admin/alerts.tsx` |

---

## 20. LOCALIZED ROUTES

All public routes support 16 locale prefixes:
- Tier 1: `ar`, `hi`
- Tier 2: `zh`, `ru`, `ur`, `fr`
- Tier 3: `de`, `fa`, `bn`, `fil`
- Tier 4: `es`, `tr`, `it`, `ja`, `ko`, `he`

**Current Status:** Only English (no prefix or `/en`) is active. Other locales blocked in robots.txt.

---

## SITEMAP STATUS SUMMARY

### Excluded from Sitemap ❌
| Route | Reason |
|-------|--------|
| `/search` | Legacy internal |
| `/help` (all routes) | Broken |
| `/docs` (all routes) | Internal |
| `/test` | Internal |
| `/login` | Auth |
| `/access-denied` | Internal |
| `/coming-soon` | Internal |
| `/partners/dashboard` | Auth required |
| `/survey/:slug` | Internal |
| `/admin/*` | Admin (100+ routes) |
| All destination redirects | Redirects |

### noIndex Added ✅
| Route | File |
|-------|------|
| `/search` | `public-search.tsx` |
| `/help` | `help/index.tsx` |
| `/login` | `login.tsx` |
| `/access-denied` | `access-denied.tsx` |
| `/docs` | `public-docs.tsx` |
| `/test` | `test.tsx` |
| `/partners/dashboard` | `partners-dashboard.tsx` |
| `/survey/:slug` | `public-survey.tsx` |

---

## ESTIMATED SITEMAP COUNT

| Category | Count |
|----------|-------|
| Homepage | 1 |
| Core Hubs | 10 |
| Destination Pages | 17 |
| Attraction List Pages | 16 |
| Guide Pages | 7 |
| Legal Pages | 8 |
| About/Contact/Partners Join | 3 |
| Real Estate | 2 |
| Attraction Details (Tiqets) | 3,408 |
| Dynamic Content (DB) | Variable |
| **TOTAL** | ~3,472+ |

---

## ALL PAGE FILES (161 Total)

```
client/src/pages/
├── about.tsx
├── access-denied.tsx
├── admin/
│   ├── aeo-dashboard.tsx
│   ├── ai-quality-tools.tsx
│   ├── alerts.tsx
│   ├── analytics/
│   │   ├── customer-journey.tsx
│   │   ├── plagiarism-check.tsx
│   │   └── semantic-search.tsx
│   ├── api-keys-setup.tsx
│   ├── AutonomyControlPlane.tsx
│   ├── auto-pilot.tsx
│   ├── Calendar.tsx
│   ├── change-management.tsx
│   ├── chat-inbox.tsx
│   ├── console.tsx
│   ├── content-intelligence.tsx
│   ├── destination-intelligence.tsx
│   ├── destinations/
│   │   ├── destination-hub.tsx
│   │   ├── destinations-list.tsx
│   │   ├── index.tsx
│   │   └── tabs/
│   │       ├── destination-hero-tab.tsx
│   │       ├── destination-mobility-tab.tsx
│   │       ├── destination-sections-tab.tsx
│   │       └── destination-seo-tab.tsx
│   ├── districts-management.tsx
│   ├── enterprise/
│   │   ├── activity-feed.tsx
│   │   ├── teams.tsx
│   │   ├── webhooks.tsx
│   │   └── workflows.tsx
│   ├── entity-merge.tsx
│   ├── external-data-explorer.tsx
│   ├── footer-manager.tsx
│   ├── governance/
│   │   ├── approvals.tsx
│   │   ├── audit.tsx
│   │   ├── index.tsx
│   │   ├── policies.tsx
│   │   ├── roles.tsx
│   │   └── users.tsx
│   ├── growth-dashboard.tsx
│   ├── help/
│   │   ├── article-editor.tsx
│   │   └── index.tsx
│   ├── homepage-editor.tsx
│   ├── ingestion/
│   │   └── dashboard.tsx
│   ├── IntelligenceDashboard.tsx
│   ├── landing-pages-management.tsx
│   ├── links/
│   │   └── dashboard.tsx
│   ├── monetization/
│   │   ├── affiliate-dashboard.tsx
│   │   ├── business-listings.tsx
│   │   ├── lead-management.tsx
│   │   └── premium-content.tsx
│   ├── navigation-manager.tsx
│   ├── octopus-dashboard.tsx
│   ├── off-plan-management.tsx
│   ├── operations-dashboard.tsx
│   ├── page-builder.tsx
│   ├── qa-dashboard.tsx
│   ├── real-estate-editor.tsx
│   ├── real-estate-management.tsx
│   ├── referrals.tsx
│   ├── research/
│   │   ├── index.tsx
│   │   └── suggestions.tsx
│   ├── search-debug.tsx
│   ├── security.tsx
│   ├── seo-engine/
│   │   ├── index.tsx
│   │   ├── SeoEngineActionsQueue.tsx
│   │   ├── SeoEngineContentReport.tsx
│   │   └── SeoEngineDashboard.tsx
│   ├── site-settings.tsx
│   ├── social/
│   │   └── social-dashboard.tsx
│   ├── static-page-editor.tsx
│   ├── static-pages.tsx
│   ├── system-health.tsx
│   ├── tiqets/
│   │   ├── attraction-detail.tsx
│   │   ├── configuration.tsx
│   │   ├── content-quality.tsx
│   │   ├── dashboard.tsx
│   │   ├── destinations.tsx
│   │   └── integrations.tsx
│   ├── travi/
│   │   ├── api-keys.tsx
│   │   ├── configuration.tsx
│   │   ├── data-collection.tsx
│   │   ├── location-edit.tsx
│   │   ├── location-preview.tsx
│   │   └── locations-list.tsx
│   ├── visual-editor/
│   │   ├── components/
│   │   │   ├── blocks/
│   │   │   │   └── index.tsx
│   │   │   └── BlockSettings.tsx
│   │   ├── site-editor.tsx
│   │   └── sites-dashboard.tsx
│   └── writers/
│       ├── NewsroomDashboard.tsx
│       └── WritersManagement.tsx
├── admin-image-engine.tsx
├── admin-logs.tsx
├── affiliate-disclosure.tsx
├── affiliate-links.tsx
├── ai-article-generator.tsx
├── analytics.tsx
├── article-page.tsx
├── attraction-detail.tsx
├── attractions.tsx
├── audit-logs.tsx
├── campaigns.tsx
├── clusters.tsx
├── contact.tsx
├── content-calendar.tsx
├── content-editor.tsx
├── content-list.tsx
├── content-rules.tsx
├── content-templates.tsx
├── cookies.tsx
├── dashboard.tsx
├── destination-attractions.tsx
├── destination-browser.tsx
├── destination-dining.tsx
├── destination-page.tsx
├── destinations.tsx
├── global-dining.tsx
├── global-guides.tsx
├── global-things-to-do.tsx
├── glossary-hub.tsx
├── guide-detail.tsx
├── help/
│   ├── article.tsx
│   ├── category.tsx
│   └── index.tsx
├── homepage-fast.tsx
├── homepage-promotions.tsx
├── homepage.tsx
├── hotel-detail.tsx
├── hotels.tsx
├── keywords.tsx
├── login.tsx
├── media-library.tsx
├── newsletter-subscribers.tsx
├── not-found.tsx
├── partners-dashboard.tsx
├── partners-join.tsx
├── poi-explorer.tsx
├── privacy.tsx
├── public/
│   ├── category-listing-page.tsx
│   ├── guides/
│   │   ├── dubai-to-rak-transport.tsx
│   │   ├── dubai-vs-rak-comparison.tsx
│   │   ├── jebel-jais-adventure-guide.tsx
│   │   ├── rak-real-estate-investment.tsx
│   │   ├── where-to-stay-rak.tsx
│   │   └── wynn-al-marjan-guide.tsx
│   ├── ras-al-khaimah.tsx
│   └── travi-location-page.tsx
├── public-articles.tsx
├── public-content-viewer.tsx
├── public-docs.tsx
├── public-events.tsx
├── public-holidays.tsx
├── public-news.tsx
├── public-off-plan.tsx
├── public-search.tsx
├── public-shopping.tsx
├── public-survey.tsx
├── rss-feeds.tsx
├── security.tsx
├── seo-audit.tsx
├── settings.tsx
├── survey-builder.tsx
├── survey-responses.tsx
├── surveys.tsx
├── tags.tsx
├── terms.tsx
├── test.tsx
├── topic-bank.tsx
├── translations.tsx
├── travel-guides.tsx
├── travel-style-article.tsx
└── users.tsx
```
