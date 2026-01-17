# TRAVI UI Template Audit Report
## Comparison Against Home Page Design Baseline

**Audit Date:** January 14, 2026  
**Baseline Document:** docs/TRAVI_HOME_DESIGN_BASELINE.md  
**Auditor:** Automated Analysis

---

## Executive Summary

This audit examines all public-facing page templates and layouts against the canonical Home Page Design Baseline. The baseline establishes:
- **Primary Color:** #6443F4 (TRAVI Purple) for CTAs and active states
- **Deprecated Colors:** #E84C9A (Pink), #0B0A1F (Midnight Indigo), Amber/Orange CTAs
- **Typography:** Chillax for headlines, Satoshi for body
- **Card Pattern:** border-0, shadow-sm hover:shadow-2xl, hover:-translate-y-2
- **Button Pattern:** rounded-full bg-[#6443F4]

### Violation Summary

| Severity | Count | Description |
|----------|-------|-------------|
| 🔴 HIGH | 4 | Files using deprecated #E84C9A (Pink) or #0B0A1F (Midnight Indigo) |
| 🟡 MEDIUM | 3 | Files using #F4C542 (Amber) in non-accent contexts |
| 🟢 LOW | 6 | Minor styling inconsistencies |

---

## Template Analysis

### 1. category-page-layout.tsx

**Path:** `client/src/components/category-page-layout.tsx`  
**Status:** 🔴 **NEEDS_REFACTOR**

#### Violations Found:

| Line | Issue | Severity |
|------|-------|----------|
| 176 | Uses deprecated `bg-[#0B0A1F]` for background | 🔴 HIGH |
| 178 | Uses `from-[#0B0A1F]` gradient overlay | 🔴 HIGH |
| 253-254 | Uses `from-[#0B0A1F]` multiple times in overlays | 🔴 HIGH |
| 316 | Uses `bg-[#0B0A1F]` for stats band section | 🔴 HIGH |
| 382, 439, 514 | Uses `from-[#0B0A1F]` in card gradients | 🔴 HIGH |
| 182, 194, 243 | Uses `#F4C542` (Amber) for category label and accents | 🟡 MEDIUM |
| 386 | Uses `bg-[#F4C542] text-[#0B0A1F]` for badge | 🔴 HIGH |

#### Positive Compliance:
- ✅ Uses `#6443F4` for primary CTAs (line 223, 325)
- ✅ Uses Chillax font via `font-display` class
- ✅ Has proper hover effects with `group-hover:scale-110` on images
- ✅ Uses framer-motion-like IntersectionObserver for reveals
- ✅ Proper card structure with `border-0`, `shadow-lg`

#### Recommended Actions:
1. Replace all `#0B0A1F` with `slate-900` or `slate-950`
2. Replace `#F4C542` amber accents with purple tones or remove
3. Update badge colors to use TRAVI Purple gradient

---

### 2. DestinationPageTemplate.tsx

**Path:** `client/src/components/destination/DestinationPageTemplate.tsx`  
**Status:** 🟢 **COMPLIANT**

#### Analysis:
- ✅ Uses semantic color tokens (no hardcoded deprecated colors)
- ✅ Proper SEO head with structured data
- ✅ Modular component architecture
- ✅ Accessibility features (SkipLink, semantic HTML)
- ✅ Clean section structure matching baseline

#### Notes:
- Template is a composition of child components; individual components need separate audit
- Uses `bg-transparent` for main section, delegating colors to child components

---

### 3. DestinationHero.tsx

**Path:** `client/src/components/destination/DestinationHero.tsx`  
**Status:** 🟢 **COMPLIANT**

#### Positive Compliance:
- ✅ Uses Chillax font: `fontFamily: "'Chillax', var(--font-sans)"` (line 188)
- ✅ Uses framer-motion with proper animations (cinematicText, revealFromBlur)
- ✅ Parallax scroll with `useScroll` and `useTransform`
- ✅ Proper image hover transitions: `duration-700` (line 120)
- ✅ Glassmorphism CTA button with backdrop-blur
- ✅ Uses carousel with cross-fade animations
- ✅ Respects `prefers-reduced-motion`

#### Notes:
- Uses dynamic mood-based gradients from CMS data (not hardcoded deprecated colors)
- Button style uses glassmorphism (`bg-white/85`) rather than solid TRAVI Purple - this is acceptable for hero context over images

---

### 4. public-footer.tsx

**Path:** `client/src/components/public-footer.tsx`  
**Status:** 🟢 **COMPLIANT**

#### Positive Compliance:
- ✅ Uses semantic colors: `bg-white dark:bg-slate-950` (line 51)
- ✅ Uses Chillax font for headline: `fontFamily: "'Chillax', var(--font-sans)"` (line 64)
- ✅ Proper text hierarchy with `text-foreground` and `text-muted-foreground`
- ✅ Uses `max-w-7xl` container (line 57)
- ✅ RTL support with `dir` attribute
- ✅ Accessibility with `role="contentinfo"` and `aria-label`
- ✅ Semantic HTML structure

---

### 5. EditorialDetailLayout.tsx

**Path:** `client/src/components/templates/editorial-detail/EditorialDetailLayout.tsx`  
**Status:** 🟡 **NEEDS_REFACTOR** (Incomplete Implementation)

#### Analysis:
- Uses semantic class names (not Tailwind utilities)
- Template is a structural skeleton with TODO comments
- No actual styling implemented yet

#### Recommended Actions:
1. Implement Tailwind styling following baseline patterns
2. Add proper typography classes (`font-display` for headlines)
3. Implement max-width constraints per baseline (`max-w-7xl`)

---

### 6. DiscoveryGridLayout.tsx

**Path:** `client/src/components/templates/discovery-grid/DiscoveryGridLayout.tsx`  
**Status:** 🟡 **NEEDS_REFACTOR** (Incomplete Implementation)

#### Analysis:
- Structural skeleton only, no actual styling
- Uses semantic class names without Tailwind utilities

#### Recommended Actions:
1. Add Tailwind grid classes: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6`
2. Implement section spacing: `py-12 sm:py-16 md:py-20`
3. Add filter bar sticky behavior with proper z-index

---

### 7. HubIndexLayout.tsx

**Path:** `client/src/components/templates/hub-index/HubIndexLayout.tsx`  
**Status:** 🟡 **NEEDS_REFACTOR** (Incomplete Implementation)

#### Analysis:
- Minimal structure with semantic class names
- No Tailwind styling applied

#### Recommended Actions:
1. Implement baseline typography hierarchy
2. Add proper container width and padding
3. Style category cards following baseline card pattern

---

### 8. CuratedCollectionLayout.tsx

**Path:** `client/src/components/templates/curated-collection/CuratedCollectionLayout.tsx`  
**Status:** 🟡 **NEEDS_REFACTOR** (Incomplete Implementation)

#### Analysis:
- Structural template with no styling
- TOC and hero image placeholders exist

#### Recommended Actions:
1. Add hero image styling with proper aspect ratio
2. Implement sticky TOC with baseline patterns
3. Add numbered list styling with TRAVI Purple accents

---

### 9. CommerceShowcaseLayout.tsx

**Path:** `client/src/components/templates/commerce-showcase/CommerceShowcaseLayout.tsx`  
**Status:** 🟡 **NEEDS_REFACTOR** (Incomplete Implementation)

#### Analysis:
- Basic structure only
- No styling implemented

#### Recommended Actions:
1. Add promo banner styling with gradient backgrounds
2. Implement product grid with baseline card patterns
3. Style sidebar with proper spacing

---

### 10. SearchResultsLayout.tsx

**Path:** `client/src/components/templates/search-results/SearchResultsLayout.tsx`  
**Status:** 🟡 **NEEDS_REFACTOR** (Incomplete Implementation)

#### Analysis:
- Functional structure with basic logic
- No Tailwind styling

#### Recommended Actions:
1. Style search hero with proper sizing
2. Add results list styling
3. Implement empty state following baseline patterns

---

## Additional Files with Violations

### destinations.tsx (Pages)

**Path:** `client/src/pages/destinations.tsx`  
**Status:** 🔴 **NEEDS_REFACTOR**

#### Violations:
| Line | Issue |
|------|-------|
| 533 | Uses `to-[#E84C9A]/10` gradient |
| 628 | Uses `from-[#0B0A1F]/80` overlay |
| 636 | Uses `from-[#6443F4] to-[#E84C9A]` gradient |
| 657, 774 | Uses `text-[#E84C9A]` for icons |
| 672 | Uses `from-[#6443F4] to-[#E84C9A]` button gradient |
| 702, 751, 766 | Multiple pink gradient usages |

---

### guide-detail.tsx (Pages)

**Path:** `client/src/pages/guide-detail.tsx`  
**Status:** 🔴 **NEEDS_REFACTOR**

#### Violations:
| Line | Issue |
|------|-------|
| 152, 160 | Progress bar uses `from-[#6443F4] to-[#E84C9A]` |
| 248 | Uses `from-[#0B0A1F]` hero overlay |
| 284 | Badge uses pink gradient |
| 300 | Text gradient includes `#E84C9A` |
| 316, 325 | Icons use `text-[#E84C9A]` |
| 355, 398, 435 | Multiple pink references |
| 681, 706 | Cards use `from-[#0B0A1F]` and `from-[#E84C9A]` |

---

### news-portal-v2-page.tsx (Pages)

**Path:** `client/src/pages/public-v2/news-portal-v2-page.tsx`  
**Status:** 🔴 **NEEDS_REFACTOR**

#### Violations:
| Line | Issue |
|------|-------|
| 170, 174, 178 | Category badges use `bg-[#E84C9A]` |
| 183 | Default category uses `from-[#E84C9A]` gradient |

---

## Compliant Patterns Reference

### Card Pattern (Baseline)
```tsx
<Card className="group overflow-hidden border-0 shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white dark:bg-slate-900 h-full">
  <div className="relative h-48 sm:h-56 overflow-hidden bg-slate-100">
    <img className="transition-transform duration-700 group-hover:scale-110" />
  </div>
  <CardContent className="p-4 sm:p-5">
    <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg mb-1">{name}</h3>
    <p className="text-sm text-slate-500">{subtitle}</p>
  </CardContent>
</Card>
```

### Button Pattern (Baseline)
```tsx
<Button className="rounded-full bg-[#6443F4] hover:bg-[#5539d4] text-white gap-2">
  View All <ArrowRight className="w-4 h-4" />
</Button>
```

### Typography Pattern (Baseline)
```tsx
<h1 style={{ fontFamily: "'Chillax', var(--font-sans)" }} 
    className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold">
```

---

## Migration Priority

### Priority 1 (High Impact)
1. `category-page-layout.tsx` - Core category pages, heavy deprecated color usage
2. `destinations.tsx` - High-traffic destinations page
3. `guide-detail.tsx` - Guide detail with extensive pink usage

### Priority 2 (Medium Impact)
4. `news-portal-v2-page.tsx` - News section category badges

### Priority 3 (Low Impact - Incomplete Templates)
5-10. All templates in `client/src/components/templates/*` - Need full implementation

---

## Color Migration Guide

| Deprecated | Replacement |
|------------|-------------|
| `#E84C9A` (Pink) | `#6443F4` (TRAVI Purple) or remove |
| `#0B0A1F` (Midnight Indigo) | `slate-900` or `slate-950` |
| `#F4C542` (Amber for CTAs) | `#6443F4` (TRAVI Purple) |
| `from-[#6443F4] to-[#E84C9A]` | `bg-[#6443F4]` solid or `from-[#6443F4] to-[#8B5CF6]` |

---

*Report generated for TRAVI Design System compliance audit.*
