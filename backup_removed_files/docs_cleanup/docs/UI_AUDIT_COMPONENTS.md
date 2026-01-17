# TRAVI UI Components Audit Report

**Audit Date:** January 14, 2026  
**Baseline Document:** `docs/TRAVI_HOME_DESIGN_BASELINE.md`  
**Scope:** All reusable UI components in `client/src/components/`

---

## Executive Summary

This audit reviewed 25+ reusable UI components against the TRAVI Home Page Design Baseline. Key findings:

- **6 components** require refactoring due to deprecated color usage
- **15+ components** are fully compliant
- **3 components** have minor issues (amber accents where purple preferred)
- **1 button variant** should be deprecated (`brand` variant uses deprecated #F24294)

### Critical Violations Found

| Color | Hex | Status | Replacement |
|-------|-----|--------|-------------|
| TRAVI Pink | `#E84C9A` | DEPRECATED | Use `#6443F4` (TRAVI Purple) |
| Midnight Indigo | `#0B0A1F` | DEPRECATED | Use `slate-900`/`slate-950` |
| Magenta | `#F24294` | DEPRECATED | Use `#6443F4` (TRAVI Purple) |
| Amber CTAs | `amber-*` | CONDITIONAL | OK for status, not for CTAs |

---

## Component Audit Results

### 1. Base UI Components (`client/src/components/ui/`)

#### button.tsx
- **Status:** NEEDS_REFACTOR
- **Classification:** REFACTOR
- **Violations:**
  - Line 25: `brand` variant uses deprecated `#F24294` (magenta)
  - Line 25: Uses `#D93A82` for hover state (also deprecated)
- **Typography:** N/A (text inherited)
- **Shadow Pattern:** Compliant (uses CSS variables)
- **Recommended Actions:**
  1. Deprecate or remove `brand` variant
  2. If needed, replace with `bg-[#6443F4] hover:bg-[#5539d4]`

#### badge.tsx
- **Status:** COMPLIANT
- **Classification:** KEEP
- **Colors:** Uses semantic tokens (`bg-primary`, `bg-secondary`)
- **Typography:** Proper font-semibold, text-xs
- **Notes:** No deprecated colors, uses `hover-elevate` properly

#### card.tsx
- **Status:** COMPLIANT
- **Classification:** KEEP
- **Colors:** Uses `bg-card`, `border-card-border` (semantic)
- **Typography:** Uses `font-heading` for CardTitle
- **Shadow:** Uses `var(--shadow-level-1)` correctly
- **Notes:** Fully aligned with baseline

---

### 2. Navigation Components

#### public-nav.tsx
- **Status:** COMPLIANT
- **Classification:** KEEP
- **Violations:** None
- **Colors:**
  - Line 114, 117, 194: Uses `#6443F4` ✓
  - Text: `text-white/70 hover:text-white` ✓
- **Typography:** Uses proper font weights
- **Animations:** Smooth transitions (500ms)
- **Notes:** Matches homepage nav exactly

#### public-footer.tsx
- **Status:** COMPLIANT
- **Classification:** KEEP
- **Violations:** None
- **Colors:** Uses semantic tokens (`text-foreground`, `text-muted-foreground`)
- **Typography:** Line 64 uses Chillax for heading ✓
- **Notes:** Clean, minimal footer matching baseline

---

### 3. Hero Components

#### destinations-hero-versions.tsx
- **Status:** NEEDS_REFACTOR
- **Classification:** REFACTOR
- **Violations (10+ instances of deprecated #E84C9A):**
  - Line 39: Gradient uses `#E84C9A 60%`
  - Line 94: Stats icon background uses `to-[#E84C9A]/10`
  - Line 129: Decorative dot uses `bg-[#E84C9A]/40`
  - Line 149: Decorative icon uses `text-[#E84C9A]/20`
  - Line 666: SVG gradient uses `#E84C9A`
  - Line 970: Decorative blob uses `to-[#E84C9A]/5`
  - Line 971: Decorative blob uses `from-[#E84C9A]/5`
  - Line 984: Animated dot uses `to-[#E84C9A]`
  - Line 1001: Gradient text uses `to-[#E84C9A]`
  - Line 1030: CTA button uses `to-[#E84C9A]`
- **Typography:** Compliant - uses Chillax for headlines (lines 63-70)
- **Animations:** Compliant - uses framer-motion properly
- **Recommended Actions:**
  1. Replace all `#E84C9A` with `#8B5CF6` (purple-500) or `#A78BFA` (purple-400)
  2. Update gradient to match homepage: `#6443F4, #8B5CF6, #A78BFA, #F24294, #8B5CF6, #6443F4`
  3. Note: The homepage gradient does include #F24294 but in the animated gradient only

#### public-hero.tsx
- **Status:** COMPLIANT
- **Classification:** KEEP
- **Violations:** None
- **Colors:**
  - Line 114: Uses `#6443F4/20` ✓
  - Line 109: Uses proper dark overlay gradient ✓
- **Typography:** Line 157 uses `font-heading` ✓
- **Notes:** Clean implementation matching baseline

#### category-hero.tsx
- **Status:** COMPLIANT
- **Classification:** KEEP
- **Violations:** None
- **Colors:**
  - Line 46: Uses `#1e1b4b` (close to indigo-950, acceptable for hero)
  - Line 50, 102, 148: Uses `#6443F4` ✓
- **Typography:** Line 83 uses Chillax ✓
- **Animations:** Uses framer-motion properly
- **Notes:** Modern split-screen layout matches baseline

---

### 4. Category Page Layout

#### category-page-layout.tsx
- **Status:** NEEDS_REFACTOR
- **Classification:** REFACTOR
- **Violations (10+ instances of deprecated #0B0A1F):**
  - Line 176: Split hero uses `bg-[#0B0A1F]`
  - Line 178: Gradient uses `from-[#0B0A1F]`
  - Line 253: Side gradient uses `from-[#0B0A1F]`
  - Line 254: Vertical gradient uses `from-[#0B0A1F]`
  - Line 316: Section uses `bg-[#0B0A1F]`
  - Line 382: Card gradient uses `from-[#0B0A1F]`
  - Line 386: Badge uses `text-[#0B0A1F]` (acceptable for text)
  - Line 439: Card gradient uses `from-[#0B0A1F]`
  - Line 514: Card gradient uses `from-[#0B0A1F]`
  - Line 591: CTA section uses `from-[#0B0A1F]`
- **Typography:** Uses Chillax where appropriate
- **Recommended Actions:**
  1. Replace `bg-[#0B0A1F]` with `bg-slate-950 dark:bg-slate-950`
  2. Replace `from-[#0B0A1F]` with `from-slate-950`
  3. Keep badge text color as-is (semantic purpose)

---

### 5. Editorial Components

#### editorial-cards.tsx
- **Status:** COMPLIANT
- **Classification:** KEEP
- **Violations:** None
- **Colors:** Uses semantic tokens throughout
  - Line 47: `categoryColor` prop defaults to `bg-primary` ✓
  - Line 114: `categoryColor` defaults to `text-primary` ✓
- **Typography:**
  - Line 56-58: Uses Chillax for FeaturedCard title ✓
  - Line 166-169: Uses Chillax for EditorialCard title ✓
  - Line 217-219: Uses Chillax for vertical card title ✓
  - Line 288: Uses Chillax for SectionHeader ✓
- **Hover Effects:** Uses `group-hover:scale-105` (compliant)
- **Shadow Pattern:** Missing shadow-sm on cards (minor)
- **Recommended Actions:**
  - Consider adding `shadow-sm hover:shadow-lg` to cards for consistency

---

### 6. Homepage Components

#### homepage/NewsletterSection.tsx
- **Status:** NEEDS_REFACTOR (minor)
- **Classification:** REFACTOR
- **Violations:**
  - Line 139, 143: Uses `text-amber-500` for sparkle icons
- **Colors:**
  - Line 191, 199: Uses `#6443F4` correctly ✓
- **Typography:**
  - Line 153-154: Uses Chillax for headline ✓
- **Animations:** Uses framer-motion properly with viewport triggers ✓
- **Glass Effect:** Proper implementation (lines 122-127)
- **Recommended Actions:**
  1. Replace `text-amber-500` with `text-[#F4C542]` (travi-yellow) or `text-[#6443F4]`

---

### 7. Public V2 Section Components (`client/src/components/public-v2/sections/`)

#### hero-section.tsx
- **Status:** COMPLIANT
- **Classification:** KEEP
- **Colors:** Uses semantic `bg-muted`
- **Typography:** Line 22 uses Chillax ✓
- **Notes:** Clean slot-based architecture

#### featured-section.tsx
- **Status:** COMPLIANT
- **Classification:** KEEP
- **Violations:** None
- **Colors:**
  - Line 88: Uses `#6443F4` ✓
  - Line 108: Uses `#F4C542` (travi-yellow) for stars ✓
- **Typography:** Lines 42, 116 use Chillax ✓
- **Hover Effects:** Proper scale and shadow transitions
- **Notes:** Uses `brand-gradient-text` class (line 45) - verify class exists

#### destination-grid.tsx
- **Status:** COMPLIANT
- **Classification:** KEEP
- **Violations:** None
- **Notes:** Simple grid wrapper, no direct color usage

#### bento-results-grid.tsx
- **Status:** COMPLIANT
- **Classification:** KEEP
- **Violations:** None
- **Colors:**
  - Lines 51, 138, 148, 318: Uses `#6443F4` ✓
  - Lines 79, 159: Uses `#F4C542` for stars ✓
- **Typography:** Lines 87, 149, 230 use Chillax ✓
- **Animations:** Proper hover scale (110) and transitions
- **Shadow Pattern:** Uses shadow-lg, shadow-2xl properly

#### popular-now-section.tsx
- **Status:** COMPLIANT
- **Classification:** KEEP
- **Violations:** None
- **Colors:**
  - Lines 38, 92, 102: Uses `#6443F4` ✓
  - Lines 38, 113: Uses `#F4C542` ✓
- **Typography:** Lines 43, 103 use Chillax ✓
- **Gradient:** Line 38 uses purple-to-yellow gradient (acceptable)

---

## Summary Table

| Component | Status | Classification | Priority |
|-----------|--------|----------------|----------|
| `ui/button.tsx` | NEEDS_REFACTOR | REFACTOR | HIGH |
| `ui/badge.tsx` | COMPLIANT | KEEP | - |
| `ui/card.tsx` | COMPLIANT | KEEP | - |
| `public-nav.tsx` | COMPLIANT | KEEP | - |
| `public-footer.tsx` | COMPLIANT | KEEP | - |
| `public-hero.tsx` | COMPLIANT | KEEP | - |
| `category-hero.tsx` | COMPLIANT | KEEP | - |
| `destinations-hero-versions.tsx` | NEEDS_REFACTOR | REFACTOR | HIGH |
| `category-page-layout.tsx` | NEEDS_REFACTOR | REFACTOR | HIGH |
| `editorial-cards.tsx` | COMPLIANT | KEEP | - |
| `homepage/NewsletterSection.tsx` | NEEDS_REFACTOR | REFACTOR | LOW |
| `public-v2/sections/hero-section.tsx` | COMPLIANT | KEEP | - |
| `public-v2/sections/featured-section.tsx` | COMPLIANT | KEEP | - |
| `public-v2/sections/destination-grid.tsx` | COMPLIANT | KEEP | - |
| `public-v2/sections/bento-results-grid.tsx` | COMPLIANT | KEEP | - |
| `public-v2/sections/popular-now-section.tsx` | COMPLIANT | KEEP | - |

---

## Refactoring Recommendations

### High Priority

1. **destinations-hero-versions.tsx**
   - Replace all 10+ instances of `#E84C9A` with purple tones
   - Estimated effort: 30 minutes

2. **category-page-layout.tsx**
   - Replace all 10+ instances of `#0B0A1F` with `slate-950`
   - Estimated effort: 30 minutes

3. **ui/button.tsx**
   - Deprecate or update `brand` variant
   - Estimated effort: 15 minutes

### Low Priority

4. **homepage/NewsletterSection.tsx**
   - Replace `amber-500` sparkle icons with brand purple
   - Estimated effort: 5 minutes

---

## Color Reference (Correct Usage)

```css
/* Primary Brand - Use for CTAs, links, active states */
--travi-purple: #6443F4;

/* Warm Accent - Use for ratings, highlights */
--travi-yellow: #F4C542;

/* Neutral Dark - Use for dark backgrounds */
--slate-950: Use instead of #0B0A1F

/* Animated Gradient (headlines only) */
linear-gradient(135deg, #6443F4, #8B5CF6, #A78BFA, #F24294, #8B5CF6, #6443F4)
```

---

## Typography Reference

```jsx
/* Headlines (H1-H6) */
style={{ fontFamily: "'Chillax', var(--font-sans)" }}

/* Body text */
Uses Satoshi via CSS (default)
```

---

## Appendix: Files with Deprecated Colors

### #E84C9A (Pink) Occurrences
- `destinations-hero-versions.tsx`: Lines 39, 94, 129, 149, 666, 970, 971, 984, 1001, 1030

### #0B0A1F (Midnight Indigo) Occurrences
- `category-page-layout.tsx`: Lines 176, 178, 253, 254, 316, 382, 386, 439, 514, 591

### #F24294 (Magenta) Occurrences
- `ui/button.tsx`: Line 25

### Amber Usage (Review Case-by-Case)
- `NewsletterSection.tsx`: Lines 139, 143 (should be purple)
- `content-blocks-renderer.tsx`: Multiple (acceptable for tips/warnings)
- `destination/safety-banner.tsx`: Acceptable for warning states
- `destination/quick-info-rail.tsx`: Acceptable for info states

---

*Report generated by TRAVI Design System Audit*
*Next audit recommended: After completing high-priority refactors*
