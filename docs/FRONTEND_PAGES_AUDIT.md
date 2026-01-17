# TRAVI.world - Frontend Pages Audit
> Last Updated: January 2026

## Summary
Total Routes Analyzed: 80+
Working Public Pages: ~50
Pages to Exclude from Sitemap: ~15
Dynamic Pages: 3,400+

---

## Page Classification Legend

| Status | Meaning | Sitemap | Index |
|--------|---------|---------|-------|
| ✅ PUBLIC | Working, public-facing | YES | YES |
| ⚠️ BROKEN | Route exists but page broken | NO | NO |
| 🔒 AUTH | Requires authentication | NO | NO |
| 🔧 INTERNAL | Internal/dev tool | NO | NO |
| 🔄 REDIRECT | Redirects to another page | NO | NO |
| 📝 ALIAS | Alternate URL for same page | OPTIONAL | YES (with canonical) |

---

## 1. CORE PAGES

| Path | Status | Component | Notes |
|------|--------|-----------|-------|
| `/` | ✅ PUBLIC | Homepage | Main landing page |
| `/destinations` | ✅ PUBLIC | DestinationsLanding | Destinations hub |
| `/attractions` | ✅ PUBLIC | Attractions | Attractions hub |
| `/hotels` | ✅ PUBLIC | HotelsPage | Hotels hub |
| `/dining` | ✅ PUBLIC | PublicDining | Dining hub |
| `/articles` | ✅ PUBLIC | PublicArticles | Articles hub |
| `/events` | ✅ PUBLIC | PublicEvents | Events hub |
| `/news` | ✅ PUBLIC | PublicNews | News hub |
| `/shopping` | ✅ PUBLIC | PublicShopping | Shopping hub |
| `/glossary` | ✅ PUBLIC | GlossaryHub | Glossary hub |

---

## 2. SEARCH PAGE

| Path | Status | Component | Notes |
|------|--------|-----------|-------|
| `/search` | 🔧 INTERNAL | PublicSearch | Legacy Dubai search - shows "Search Dubai" - EXCLUDE from sitemap |

**Action Required:** Remove from sitemap, add noindex

---

## 3. HELP CENTER

| Path | Status | Component | Notes |
|------|--------|-----------|-------|
| `/help` | ⚠️ BROKEN | HelpCenterPublic | Shows "Help center is currently unavailable" |
| `/help/:slug` | ⚠️ BROKEN | HelpCategory | Depends on /help |
| `/help/:categorySlug/:articleSlug` | ⚠️ BROKEN | HelpArticle | Depends on /help |

**Action Required:** Remove all /help routes from sitemap until fixed

---

## 4. DESTINATION PAGES (16 Cities)

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

### Destination Redirects (Do NOT include in sitemap)

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

### Static Pages
| Path | Status | Notes |
|------|--------|-------|
| `/attractions` | ✅ PUBLIC | Main attractions hub |
| `/attractions/list/:destination` | ✅ PUBLIC | Per-city attraction lists (16 cities) |

### Dynamic Pages (3,408 from Tiqets)
| Path Pattern | Status | Notes |
|--------------|--------|-------|
| `/attractions/:seoSlug` | ✅ PUBLIC | Main canonical URL for attractions |
| `/attractions/:city/:slug` | 📝 ALIAS | Alternative URL format |
| `/:destination/attractions/:slug` | 📝 ALIAS | Alternative URL format |
| `/attractions/:destination/:attractionId` | 📝 ALIAS | Alternative URL format |

**Recommendation:** Only include `/attractions/:seoSlug` in sitemap (canonical URL)

---

## 6. GUIDES & TRAVEL CONTENT

### Guide Hub
| Path | Status | Notes |
|------|--------|-------|
| `/guides` | ✅ PUBLIC | Guides hub page |
| `/travel-guides` | 📝 ALIAS | Alias for /guides |

### RAK Guides (6 Implemented)
| Path | Status | Notes |
|------|--------|-------|
| `/guides/wynn-al-marjan-island` | ✅ PUBLIC | Wynn casino guide |
| `/guides/jebel-jais-adventure` | ✅ PUBLIC | Mountain adventure guide |
| `/guides/dubai-to-rak-transport` | ✅ PUBLIC | Transport guide |
| `/guides/dubai-vs-rak` | ✅ PUBLIC | Comparison guide |
| `/guides/where-to-stay-rak` | ✅ PUBLIC | Accommodation guide |
| `/guides/rak-real-estate-investment` | ✅ PUBLIC | Investment guide |

### Dynamic Guides
| Path | Status | Notes |
|------|--------|-------|
| `/guides/:slug` | ✅ PUBLIC | Dynamic guide pages (DB-driven) |
| `/travel-styles/:slug` | ✅ PUBLIC | Travel style articles |

---

## 7. HOTELS

| Path | Status | Notes |
|------|--------|-------|
| `/hotels` | ✅ PUBLIC | Hotels hub |
| `/hotels/:hotelId` | ✅ PUBLIC | Hotel detail by ID |
| `/hotels/:slug` | ✅ PUBLIC | Hotel detail by slug |

---

## 8. OFF-PLAN REAL ESTATE

| Path | Status | Notes |
|------|--------|-------|
| `/dubai-real-estate` | ✅ PUBLIC | Real estate hub |
| `/dubai-off-plan-properties` | ✅ PUBLIC | Off-plan properties |

### NOT Implemented (Commented Out)
- /dubai-off-plan-investment-guide
- /how-to-buy-dubai-off-plan
- /dubai-off-plan-payment-plans
- /best-off-plan-projects-dubai-2026
- All area-specific off-plan pages
- All developer-specific pages

---

## 9. LEGAL PAGES

### Canonical URLs
| Path | Status | Notes |
|------|--------|-------|
| `/privacy` | ✅ PUBLIC | Privacy policy |
| `/terms` | ✅ PUBLIC | Terms & conditions |
| `/cookies` | ✅ PUBLIC | Cookie policy |
| `/security` | ✅ PUBLIC | Security policy |
| `/affiliate-disclosure` | ✅ PUBLIC | Affiliate disclosure |

### Alias URLs (Same content, different URL)
| Path | Status | Canonical |
|------|--------|-----------|
| `/privacy-policy` | 📝 ALIAS | /privacy |
| `/terms-conditions` | 📝 ALIAS | /terms |
| `/cookie-policy` | 📝 ALIAS | /cookies |

**Recommendation:** Include aliases in sitemap with rel=canonical pointing to main URL

---

## 10. ABOUT & CONTACT

| Path | Status | Notes |
|------|--------|-------|
| `/about` | ✅ PUBLIC | About page |
| `/contact` | ✅ PUBLIC | Contact page |

---

## 11. PARTNERS

| Path | Status | Notes |
|------|--------|-------|
| `/partners/join` | ✅ PUBLIC | Partner signup |
| `/partners/dashboard` | 🔒 AUTH | Partner dashboard - requires login |

---

## 12. DOCUMENTATION

| Path | Status | Notes |
|------|--------|-------|
| `/docs` | 🔧 INTERNAL | API/Dev documentation |
| `/docs/:path*` | 🔧 INTERNAL | Doc subpages |

**Action Required:** Remove from sitemap, add noindex

---

## 13. AUTHENTICATION & UTILITY

| Path | Status | Notes |
|------|--------|-------|
| `/login` | 🔒 AUTH | Login page |
| `/access-denied` | 🔧 INTERNAL | Access denied error |
| `/test` | 🔧 INTERNAL | Test page |
| `/coming-soon` | 🔧 INTERNAL | Coming soon placeholder |

**Action Required:** Remove all from sitemap, add noindex

---

## 14. SURVEYS

| Path | Status | Notes |
|------|--------|-------|
| `/survey/:slug` | 🔧 INTERNAL | Survey pages - internal |

**Action Required:** Remove from sitemap

---

## 15. DYNAMIC CONTENT PAGES

| Path | Status | Notes |
|------|--------|-------|
| `/articles/:slug` | ✅ PUBLIC | Article detail |
| `/events/:slug` | ✅ PUBLIC | Event detail |
| `/dining/:slug` | ✅ PUBLIC | Dining/restaurant detail |
| `/transport/:slug` | ✅ PUBLIC | Transport info |

---

## 16. LOCALIZED ROUTES

All public routes are duplicated with locale prefixes:
- `/ar/...` (Arabic)
- `/he/...` (Hebrew)
- `/zh/...` (Chinese)
- etc.

**Current Status:** Only English (`/en` or no prefix) is active. All other locales blocked in robots.txt.

---

## SITEMAP CLEANUP ACTIONS

### REMOVE from Sitemap:
1. `/search` - Legacy internal search
2. `/help` - Broken
3. `/help/:slug` - Broken (depends on /help)
4. `/help/:categorySlug/:articleSlug` - Broken
5. `/docs` - Internal documentation
6. `/docs/:path*` - Internal documentation
7. `/test` - Test page
8. `/login` - Auth page
9. `/access-denied` - Error page
10. `/coming-soon` - Placeholder
11. `/partners/dashboard` - Auth required
12. `/survey/:slug` - Internal surveys
13. All destination redirects (`/bangkok`, `/paris`, etc.)

### KEEP in Sitemap:
1. Homepage
2. All category hubs (destinations, attractions, hotels, etc.)
3. All 17 destination pages
4. All 16 attraction list pages
5. All 3,408 attraction detail pages
6. All 7 guide pages
7. Legal pages (both canonical and aliases)
8. About, Contact
9. Partners join page
10. Dynamic content (articles, events, dining, transport) from DB

---

## ESTIMATED FINAL SITEMAP COUNT

| Category | Count |
|----------|-------|
| Homepage | 1 |
| Core Hubs | 10 |
| Destination Pages | 17 |
| Attraction List Pages | 16 |
| Guide Pages | 7 |
| Legal Pages | 8 |
| About/Contact/Partners | 3 |
| Real Estate | 2 |
| Attraction Details (Tiqets) | 3,408 |
| Dynamic Content (DB) | Variable |
| **TOTAL** | ~3,472+ |
