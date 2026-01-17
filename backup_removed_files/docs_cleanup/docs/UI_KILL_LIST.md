# TRAVI Design Kill List
## Prioritized Refactoring Plan

**Created:** January 14, 2026  
**Status:** Ready for Implementation  
**Source:** docs/UI_VIOLATIONS_REPORT.md

---

## Kill List Summary

### Deprecated Elements to Remove

| Item | Type | Files Affected | Priority |
|------|------|----------------|----------|
| `#E84C9A` (TRAVI Pink) | Color | 4 files | 🔴 HIGH |
| `#0B0A1F` (Midnight Indigo) | Color | 3 files | 🔴 HIGH |
| `#F24294` (Magenta) | Color | 1 file | 🔴 HIGH |
| `brand` variant (button) | Component Variant | 1 file | 🟡 MEDIUM |
| Amber CTAs | Color Pattern | 2 files | 🟢 LOW |

---

## Phase 1: Core Component Fixes (Day 1)

### Sprint 1A: Button Variant (15 min)

**File:** `client/src/components/ui/button.tsx`

**Action:** Update or deprecate `brand` variant

```diff
- brand: "bg-[#F24294] hover:bg-[#D93A82] text-white"
+ brand: "bg-[#6443F4] hover:bg-[#5539d4] text-white"
```

**Or deprecate:**
```tsx
// @deprecated Use "default" variant with custom className instead
brand: "bg-[#6443F4] hover:bg-[#5539d4] text-white"
```

### Sprint 1B: Category Page Layout (30 min)

**File:** `client/src/components/category-page-layout.tsx`

**Line-by-line fixes:**

| Line | From | To |
|------|------|-----|
| 176 | `bg-[#0B0A1F]` | `bg-slate-950` |
| 178 | `from-[#0B0A1F]` | `from-slate-950` |
| 253 | `from-[#0B0A1F]` | `from-slate-950` |
| 254 | `from-[#0B0A1F]` | `from-slate-950` |
| 316 | `bg-[#0B0A1F]` | `bg-slate-950` |
| 382 | `from-[#0B0A1F]` | `from-slate-950` |
| 386 | `text-[#0B0A1F]` | `text-slate-950` |
| 439 | `from-[#0B0A1F]` | `from-slate-950` |
| 514 | `from-[#0B0A1F]` | `from-slate-950` |
| 591 | `from-[#0B0A1F]` | `from-slate-950` |

**Verification:** Test category pages (/hotels, /attractions, /dining, /guides)

### Sprint 1C: Destinations Hero Versions (30 min)

**File:** `client/src/components/destinations-hero-versions.tsx`

**Global replace:**
```
Find: #E84C9A
Replace with: #8B5CF6 (for decorative) or #6443F4 (for interactive)
```

**Line-by-line fixes:**

| Line | Element | From | To |
|------|---------|------|-----|
| 39 | Gradient | `#E84C9A 60%` | `#8B5CF6 60%` |
| 94 | Stats icon | `to-[#E84C9A]/10` | `to-[#8B5CF6]/10` |
| 129 | Decorative dot | `bg-[#E84C9A]/40` | `bg-[#8B5CF6]/40` |
| 149 | Decorative icon | `text-[#E84C9A]/20` | `text-[#8B5CF6]/20` |
| 666 | SVG gradient | `#E84C9A` | `#8B5CF6` |
| 970 | Blob | `to-[#E84C9A]/5` | `to-[#8B5CF6]/5` |
| 971 | Blob | `from-[#E84C9A]/5` | `from-[#8B5CF6]/5` |
| 984 | Animated dot | `to-[#E84C9A]` | `to-[#8B5CF6]` |
| 1001 | Gradient text | `to-[#E84C9A]` | `to-[#8B5CF6]` |
| 1030 | CTA button | `to-[#E84C9A]` | `to-[#8B5CF6]` |

**Verification:** Test destinations list page hero

---

## Phase 2: Page-Level Fixes (Day 1-2)

### Sprint 2A: Destinations Page (45 min)

**File:** `client/src/pages/destinations.tsx`

**All pink replacements:**

| Line | Context | From | To |
|------|---------|------|-----|
| 533 | Gradient | `to-[#E84C9A]/10` | `to-[#8B5CF6]/10` |
| 628 | Overlay | `from-[#0B0A1F]/80` | `from-slate-950/80` |
| 636 | Gradient | `from-[#6443F4] to-[#E84C9A]` | `from-[#6443F4] to-[#8B5CF6]` |
| 657 | Icon | `text-[#E84C9A]` | `text-[#8B5CF6]` |
| 672 | Button | `from-[#6443F4] to-[#E84C9A]` | `bg-[#6443F4]` |
| 702 | Element | `#E84C9A` usage | `#8B5CF6` |
| 751 | Element | `#E84C9A` usage | `#8B5CF6` |
| 766 | Element | `#E84C9A` usage | `#8B5CF6` |
| 774 | Icon | `text-[#E84C9A]` | `text-[#8B5CF6]` |

### Sprint 2B: Guide Detail Page (45 min)

**File:** `client/src/pages/guide-detail.tsx`

**All replacements:**

| Line | Context | From | To |
|------|---------|------|-----|
| 152, 160 | Progress bar | `from-[#6443F4] to-[#E84C9A]` | `from-[#6443F4] to-[#8B5CF6]` |
| 248 | Hero overlay | `from-[#0B0A1F]` | `from-slate-950` |
| 284 | Badge | pink gradient | purple gradient |
| 300 | Text gradient | `#E84C9A` | `#8B5CF6` |
| 316, 325 | Icons | `text-[#E84C9A]` | `text-[#8B5CF6]` |
| 355, 398, 435 | Various | `#E84C9A` refs | `#8B5CF6` |
| 681 | Card | `from-[#0B0A1F]` | `from-slate-950` |
| 706 | Card | `from-[#E84C9A]` | `from-[#8B5CF6]` |

### Sprint 2C: News Portal v2 (20 min)

**File:** `client/src/pages/public-v2/news-portal-v2-page.tsx`

**All replacements:**

| Line | Context | From | To |
|------|---------|------|-----|
| 170, 174, 178 | Category badges | `bg-[#E84C9A]` | `bg-[#6443F4]` |
| 183 | Default category | `from-[#E84C9A]` | `from-[#6443F4]` |

---

## Phase 3: Minor Fixes (Day 2)

### Sprint 3A: Newsletter Section (5 min)

**File:** `client/src/components/homepage/NewsletterSection.tsx`

| Line | From | To |
|------|------|-----|
| 139 | `text-amber-500` | `text-[#F4C542]` |
| 143 | `text-amber-500` | `text-[#F4C542]` |

---

## Verification Checklist

### After Phase 1
- [ ] All category pages load without errors (/hotels, /attractions, /dining, /guides)
- [ ] Buttons render correctly with updated brand variant
- [ ] Destinations hero displays with purple accents

### After Phase 2
- [ ] Destinations list page renders correctly
- [ ] Guide detail pages render correctly
- [ ] News portal categories display with purple badges
- [ ] No console errors related to styling

### After Phase 3
- [ ] Newsletter section on homepage displays correctly
- [ ] Sparkle icons use TRAVI Yellow or Purple

---

## Search Patterns for Verification

### Find Remaining Pink
```bash
grep -r "E84C9A\|#E84C9A\|e84c9a" client/src/ --include="*.tsx" --include="*.css"
```

### Find Remaining Midnight Indigo
```bash
grep -r "0B0A1F\|#0B0A1F\|0b0a1f" client/src/ --include="*.tsx" --include="*.css"
```

### Find Remaining Magenta
```bash
grep -r "F24294\|#F24294\|f24294" client/src/ --include="*.tsx" --include="*.css"
```

---

## Risk Mitigation

### Low Risk
- Color changes are visual only, no functionality impact
- All changes are straightforward find/replace operations
- Tailwind semantic classes (`slate-950`) are well-tested

### Testing Required
- Visual regression testing on key pages
- Dark mode verification (slate-950 has dark mode variants)
- Mobile responsive testing

### Rollback Plan
- Git revert if critical issues found
- Each phase can be reverted independently

---

## Success Metrics

After completing all phases:

| Metric | Target |
|--------|--------|
| `#E84C9A` occurrences | 0 |
| `#0B0A1F` occurrences | 0 |
| `#F24294` occurrences | 0 |
| Brand color consistency | 100% |
| Homepage baseline compliance | 100% |

---

## Post-Refactor Actions

1. **Update CI/CD**: Add linting rule to flag deprecated color hex codes
2. **Update Documentation**: Mark deprecated colors in design_guidelines.md
3. **Component Library**: Create color constant exports to prevent hardcoding
4. **Design Tokens**: Consider migrating to CSS custom properties for all brand colors

---

## Timeline

| Phase | Duration | Owner |
|-------|----------|-------|
| Phase 1 | 1.5 hours | Developer |
| Phase 2 | 2 hours | Developer |
| Phase 3 | 0.5 hours | Developer |
| Testing | 1 hour | QA |
| **Total** | **5 hours** | |

---

*Kill List generated for TRAVI Design System refactoring*
*Status: Ready for implementation*
