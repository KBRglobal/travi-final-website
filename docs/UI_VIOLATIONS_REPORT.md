# TRAVI Design Violations Report
## Comprehensive Audit Summary

**Audit Date:** January 14, 2026  
**Baseline:** docs/TRAVI_HOME_DESIGN_BASELINE.md  
**Source Audits:** 
- docs/UI_AUDIT_TEMPLATES.md (Templates)
- docs/UI_AUDIT_COMPONENTS.md (Components)

---

## Executive Summary

### Total Files Audited: 26+
- **Templates/Layouts:** 10
- **Reusable Components:** 16

### Compliance Status

| Status | Count | Percentage |
|--------|-------|------------|
| COMPLIANT | 18 | ~70% |
| NEEDS_REFACTOR | 8 | ~30% |
| DEPRECATED | 0 | 0% |

---

## Critical Violations by Severity

### 🔴 HIGH SEVERITY - Immediate Action Required

#### 1. Deprecated TRAVI Pink (#E84C9A)
**Impact:** Visual inconsistency with brand guidelines

| File | Line Numbers | Instances |
|------|--------------|-----------|
| `destinations-hero-versions.tsx` | 39, 94, 129, 149, 666, 970, 971, 984, 1001, 1030 | 10+ |
| `destinations.tsx` | 533, 628, 636, 657, 672, 702, 751, 766, 774 | 9+ |
| `guide-detail.tsx` | 152, 160, 248, 284, 300, 316, 325, 355, 398, 435, 681, 706 | 12+ |
| `news-portal-v2-page.tsx` | 170, 174, 178, 183 | 4 |

**Total Pink Violations:** 35+ instances across 4 files

#### 2. Deprecated Midnight Indigo (#0B0A1F)
**Impact:** Dark backgrounds not using Tailwind semantic colors

| File | Line Numbers | Instances |
|------|--------------|-----------|
| `category-page-layout.tsx` | 176, 178, 253, 254, 316, 382, 386, 439, 514, 591 | 10+ |
| `destinations.tsx` | 628 | 1 |
| `guide-detail.tsx` | 248, 681, 706 | 3 |

**Total Midnight Indigo Violations:** 14+ instances across 3 files

#### 3. Deprecated Magenta in Button Variant (#F24294)
**Impact:** Inconsistent button styling

| File | Line Numbers | Instances |
|------|--------------|-----------|
| `ui/button.tsx` | 25 | 1 |

---

### 🟡 MEDIUM SEVERITY - Schedule for Refactor

#### Amber/Orange Usage Where Purple Preferred

| File | Line Numbers | Issue |
|------|--------------|-------|
| `category-page-layout.tsx` | 182, 194, 243, 386 | Amber badges/labels |
| `NewsletterSection.tsx` | 139, 143 | Amber sparkle icons |

---

## File-by-File Classification

### NEEDS REFACTOR (High Priority)

| File | Path | Violations | Decision |
|------|------|------------|----------|
| `destinations-hero-versions.tsx` | client/src/components/ | 10+ deprecated pink | **REFACTOR** |
| `category-page-layout.tsx` | client/src/components/ | 10+ deprecated indigo | **REFACTOR** |
| `button.tsx` | client/src/components/ui/ | 1 deprecated magenta variant | **REFACTOR** |
| `destinations.tsx` | client/src/pages/ | 10+ deprecated colors | **REFACTOR** |
| `guide-detail.tsx` | client/src/pages/ | 12+ deprecated colors | **REFACTOR** |
| `news-portal-v2-page.tsx` | client/src/pages/public-v2/ | 4 deprecated pink | **REFACTOR** |

### NEEDS REFACTOR (Low Priority)

| File | Path | Violations | Decision |
|------|------|------------|----------|
| `NewsletterSection.tsx` | client/src/components/homepage/ | 2 amber icons | **REFACTOR** |

### COMPLIANT (No Action Required)

| File | Path | Status |
|------|------|--------|
| `DestinationPageTemplate.tsx` | client/src/components/destination/ | ✅ KEEP |
| `DestinationHero.tsx` | client/src/components/destination/ | ✅ KEEP |
| `public-footer.tsx` | client/src/components/ | ✅ KEEP |
| `public-nav.tsx` | client/src/components/ | ✅ KEEP |
| `badge.tsx` | client/src/components/ui/ | ✅ KEEP |
| `card.tsx` | client/src/components/ui/ | ✅ KEEP |
| `editorial-cards.tsx` | client/src/components/ | ✅ KEEP |
| `public-hero.tsx` | client/src/components/ | ✅ KEEP |
| `category-hero.tsx` | client/src/components/ | ✅ KEEP |
| `hero-section.tsx` | client/src/components/public-v2/sections/ | ✅ KEEP |
| `featured-section.tsx` | client/src/components/public-v2/sections/ | ✅ KEEP |
| `destination-grid.tsx` | client/src/components/public-v2/sections/ | ✅ KEEP |
| `bento-results-grid.tsx` | client/src/components/public-v2/sections/ | ✅ KEEP |
| `popular-now-section.tsx` | client/src/components/public-v2/sections/ | ✅ KEEP |

### INCOMPLETE (Need Full Implementation)

| File | Path | Decision |
|------|------|----------|
| `EditorialDetailLayout.tsx` | client/src/components/templates/editorial-detail/ | IMPLEMENT |
| `DiscoveryGridLayout.tsx` | client/src/components/templates/discovery-grid/ | IMPLEMENT |
| `HubIndexLayout.tsx` | client/src/components/templates/hub-index/ | IMPLEMENT |
| `CuratedCollectionLayout.tsx` | client/src/components/templates/curated-collection/ | IMPLEMENT |
| `CommerceShowcaseLayout.tsx` | client/src/components/templates/commerce-showcase/ | IMPLEMENT |
| `SearchResultsLayout.tsx` | client/src/components/templates/search-results/ | IMPLEMENT |

---

## Public Pages Catalog

### High-Traffic Public Pages (Priority Review)

| Page | Path | Status | Notes |
|------|------|--------|-------|
| Homepage | `homepage-new.tsx` | ✅ BASELINE | Single Source of Truth |
| Destinations | `destinations.tsx` | 🔴 NEEDS_REFACTOR | Heavy pink/indigo usage |
| Attractions | `attractions.tsx` | ⚠️ Needs Review | Check for deprecated colors |
| Hotels | `hotels.tsx` | ⚠️ Needs Review | Check for deprecated colors |
| Guides | `travel-guides.tsx` | ⚠️ Needs Review | Category page layout |
| Guide Detail | `guide-detail.tsx` | 🔴 NEEDS_REFACTOR | Heavy pink/indigo usage |
| About | `public-about.tsx` | ⚠️ Needs Review | |
| News | `public-news.tsx` | ⚠️ Needs Review | |
| News Portal v2 | `news-portal-v2-page.tsx` | 🔴 NEEDS_REFACTOR | Pink category badges |

### Destination-Specific Pages

| Page | Status | Notes |
|------|--------|-------|
| `destination-singapore.tsx` | ⚠️ Needs Review | Uses DestinationPageTemplate |
| `destination-paris.tsx` | ⚠️ Needs Review | Uses DestinationPageTemplate |
| `destination-london.tsx` | ⚠️ Needs Review | Uses DestinationPageTemplate |
| `destination-nyc.tsx` | ⚠️ Needs Review | Uses DestinationPageTemplate |
| `destination-istanbul.tsx` | ⚠️ Needs Review | Uses DestinationPageTemplate |
| `destination-bangkok-new.tsx` | ⚠️ Needs Review | Uses DestinationPageTemplate |

### Public v2 Pages

| Page | Path | Status |
|------|------|--------|
| `attractions.tsx` | public-v2/ | ⚠️ Needs Review |
| `hotels.tsx` | public-v2/ | ⚠️ Needs Review |
| `attraction-page.tsx` | public-v2/ | ⚠️ Needs Review |
| `city-page.tsx` | public-v2/ | ⚠️ Needs Review |
| `hotel-page.tsx` | public-v2/ | ⚠️ Needs Review |
| `ras-al-khaimah.tsx` | public-v2/ | ⚠️ Needs Review |
| RAK Guides (6 files) | public-v2/guides/ | ⚠️ Needs Review |

---

## Color Migration Reference

### Replace These Colors

| From | To | Context |
|------|------|---------|
| `#E84C9A` | `#8B5CF6` (purple-500) | Decorative elements |
| `#E84C9A` | `#A78BFA` (purple-400) | Light accents |
| `#E84C9A` | `#6443F4` (TRAVI Purple) | CTAs, links |
| `#0B0A1F` | `slate-950` | Dark backgrounds |
| `#0B0A1F` | `slate-900` | Lighter dark surfaces |
| `#F24294` | `#6443F4` | Button variant |
| `from-[#6443F4] to-[#E84C9A]` | `bg-[#6443F4]` | Solid button |
| `from-[#6443F4] to-[#E84C9A]` | `from-[#6443F4] to-[#8B5CF6]` | Purple gradient |

### Keep These Colors

| Color | Hex | Usage |
|-------|-----|-------|
| TRAVI Purple | `#6443F4` | Primary CTAs, links, brand |
| TRAVI Yellow | `#F4C542` | Star ratings, warm accents |
| Purple 500 | `#8B5CF6` | Secondary purple |
| Purple 400 | `#A78BFA` | Light purple accents |

---

## Impact Assessment

### SEO Impact
- Deprecated colors don't affect SEO directly
- Consistent design improves user experience → lower bounce rate

### User Experience Impact
- **High:** Inconsistent brand colors create confusion
- **High:** Pink/magenta CTAs may not match marketing materials
- **Medium:** Dark indigo vs slate-950 is subtle but noticeable

### Developer Experience Impact
- **High:** Multiple color systems increase maintenance burden
- **High:** New developers may copy deprecated patterns
- **Medium:** Audit documents now provide clear guidance

---

## Estimated Refactoring Effort

| Priority | Files | Est. Time | Complexity |
|----------|-------|-----------|------------|
| HIGH | `destinations-hero-versions.tsx` | 30 min | Medium |
| HIGH | `category-page-layout.tsx` | 30 min | Medium |
| HIGH | `destinations.tsx` | 45 min | Medium |
| HIGH | `guide-detail.tsx` | 45 min | Medium |
| MEDIUM | `button.tsx` | 15 min | Low |
| MEDIUM | `news-portal-v2-page.tsx` | 20 min | Low |
| LOW | `NewsletterSection.tsx` | 5 min | Low |

**Total Estimated Time:** ~3 hours

---

*Report generated for TRAVI Design System compliance audit*
*Next step: Create prioritized kill list for refactoring*
