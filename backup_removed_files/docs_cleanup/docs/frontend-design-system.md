# Frontend Design System

**Content-First Design Foundations**

---

## Overview

This design system prioritizes content readability, visual rhythm, and user intent over visual decoration. Every decision traces back to: *"Does this help the user consume content better?"*

---

## Design Principles

### 1. Content-First, Not Catalog-First
- Pages exist to serve content, not to display capabilities
- Layout decisions start with "What does the user need to read/do?" not "What can we show?"
- Reduce visual noise; amplify content signal

### 2. Rhythm Over Rigidity
- Consistent vertical rhythm creates scannable pages
- Predictable patterns reduce cognitive load
- White space is intentional, not leftover

### 3. Progressive Density
- Landing/hub pages: low density, clear navigation
- Listing pages: medium density, scannable cards
- Detail pages: high density in reading zone, low elsewhere

---

## Typography Hierarchy

### Font Stack
| Role | Font | Weights | Usage |
|------|------|---------|-------|
| **Display** | Chillax | 600-700 | Hero headlines, page titles |
| **Heading** | Chillax | 500-600 | Section headers, card titles |
| **Body** | Satoshi | 400-500 | Paragraphs, descriptions |
| **UI** | Satoshi | 500-700 | Buttons, labels, navigation |
| **Meta** | Satoshi | 400 | Timestamps, bylines, badges |

### Type Scale (Desktop)

| Token | Size | Line Height | Letter Spacing | Usage |
|-------|------|-------------|----------------|-------|
| `display-xl` | 56px / 3.5rem | 1.1 | -0.02em | Hero headlines |
| `display-lg` | 48px / 3rem | 1.15 | -0.02em | Page titles |
| `heading-xl` | 36px / 2.25rem | 1.2 | -0.01em | Section titles |
| `heading-lg` | 28px / 1.75rem | 1.25 | -0.01em | Subsection titles |
| `heading-md` | 22px / 1.375rem | 1.3 | 0 | Card titles, component headers |
| `heading-sm` | 18px / 1.125rem | 1.35 | 0 | Small headings, list titles |
| `body-lg` | 18px / 1.125rem | 1.6 | 0 | Lead paragraphs |
| `body-md` | 16px / 1rem | 1.6 | 0 | Body text (default) |
| `body-sm` | 14px / 0.875rem | 1.5 | 0 | Secondary text |
| `caption` | 12px / 0.75rem | 1.4 | 0.01em | Meta text, timestamps |
| `overline` | 11px / 0.6875rem | 1.4 | 0.1em | Labels, badges (uppercase) |

### Responsive Type Scale

```
Mobile (< 640px):     Base scale × 0.85
Tablet (640-1024px):  Base scale × 0.925
Desktop (> 1024px):   Base scale × 1.0
```

### Typography Rules

1. **One Hero Per Page**: Only one `display-*` element per page
2. **Heading Depth**: Maximum 4 levels of heading hierarchy (h1-h4)
3. **Line Length**: Body text max 65-75 characters (readable)
4. **Contrast Ratio**: Minimum 4.5:1 for body, 3:1 for large text

---

## Spacing System

### Spacing Scale (8px base unit)

| Token | Value | Usage |
|-------|-------|-------|
| `space-0` | 0 | Reset |
| `space-1` | 4px | Tight: icon-text gap |
| `space-2` | 8px | Compact: form elements |
| `space-3` | 12px | Default: card internal |
| `space-4` | 16px | Standard: element gaps |
| `space-5` | 20px | Medium: related groups |
| `space-6` | 24px | Large: card padding |
| `space-8` | 32px | XL: section inner spacing |
| `space-10` | 40px | 2XL: component separation |
| `space-12` | 48px | 3XL: section breaks |
| `space-16` | 64px | 4XL: major sections |
| `space-20` | 80px | Page section dividers |
| `space-24` | 96px | Hero/footer spacing |

### Vertical Rhythm

```
Hero → Section:        space-20 (80px)
Section → Section:     space-16 (64px)
Section header → content: space-8 (32px)
Cards within grid:     space-6 (24px) gap
Card internal:         space-4 (16px)
Text lines:            space-2 (8px)
```

### Container Widths

| Breakpoint | Container | Padding |
|------------|-----------|---------|
| Mobile | 100% | 16px (space-4) |
| Tablet (sm) | 100% | 24px (space-6) |
| Desktop (lg) | 1280px max | 32px (space-8) |
| Wide (xl) | 1440px max | 48px (space-12) |

**Standard Content Container:**
```
max-width: 1280px
margin: 0 auto
padding-inline: clamp(16px, 5vw, 48px)
```

---

## Layout Zones

Every page template uses these semantic layout zones:

### Zone Definitions

```
┌─────────────────────────────────────────────────┐
│                   NAVIGATION                     │
├─────────────────────────────────────────────────┤
│                                                  │
│                   HERO ZONE                      │
│            (primary message/action)              │
│                                                  │
├─────────────────────────────────────────────────┤
│                                                  │
│                  FILTER ZONE                     │
│           (search, filters, sorting)             │
│                                                  │
├────────────┬──────────────────────┬─────────────┤
│            │                      │             │
│   ASIDE    │     PRIMARY          │   ASIDE     │
│   (LEFT)   │     CONTENT          │   (RIGHT)   │
│            │     ZONE             │             │
│            │                      │             │
├────────────┴──────────────────────┴─────────────┤
│                                                  │
│               SECONDARY ZONE                     │
│          (related, recommended)                  │
│                                                  │
├─────────────────────────────────────────────────┤
│                   CTA ZONE                       │
│           (conversion actions)                   │
├─────────────────────────────────────────────────┤
│                   FOOTER                         │
└─────────────────────────────────────────────────┘
```

### Zone Usage by Template

| Template | Hero | Filter | Aside-L | Primary | Aside-R | Secondary | CTA |
|----------|------|--------|---------|---------|---------|-----------|-----|
| Editorial Detail | Minimal | - | - | Full | - | Related | Newsletter |
| Discovery Grid | Featured | Sticky | - | Grid | Optional | Categories | App promo |
| Hub Index | Full | - | Nav | Categories | - | Featured | - |
| Search Results | Search | Sticky | - | Results | - | Suggestions | - |
| Commerce | Deal | Sticky | - | Products | Sidebar | Cross-sell | Checkout |
| Curated List | Visual | - | TOC | Narrative | - | Related | Share |

---

## Content Density Rules

### Density Levels

| Level | Cards/Viewport | Content Ratio | White Space | Use Case |
|-------|----------------|---------------|-------------|----------|
| **Sparse** | 1-2 | 40% | 60% | Hero, landing, conversion |
| **Comfortable** | 3-6 | 55% | 45% | Browsing, discovery |
| **Dense** | 8-12 | 65% | 35% | Listings, catalogs |
| **Compact** | 12+ | 75% | 25% | Data tables, admin |

### Density by Page Section

```
Hero sections:        Sparse
Category grids:       Comfortable
Search results:       Dense
Article body:         Comfortable (max-width 720px)
Footer:               Dense
Navigation:           Compact
```

### Card Density Patterns

**Featured Card (Sparse)**
- Aspect ratio: 16:9 or 3:2
- Title: heading-lg
- Description: 2-3 lines visible
- Full metadata visible

**Standard Card (Comfortable)**
- Aspect ratio: 4:3 or 1:1
- Title: heading-md
- Description: 1-2 lines (line-clamp)
- Essential metadata only

**Compact Card (Dense)**
- Aspect ratio: 16:9 thumbnail or no image
- Title: heading-sm
- Description: 1 line or hidden
- Minimal metadata

---

## Grid System

### Responsive Columns

| Breakpoint | Listing Grid | Article Body | Sidebar Layout |
|------------|--------------|--------------|----------------|
| Mobile | 1 col | 1 col | Stack |
| Tablet (sm) | 2 col | 1 col (centered) | Stack |
| Desktop (lg) | 3 col | 1 col (centered) | Side-by-side |
| Wide (xl) | 4 col | 1 col (centered) | Side-by-side |

### Grid Gap Scale

| Context | Gap |
|---------|-----|
| Card grids | space-6 (24px) |
| Tight lists | space-4 (16px) |
| Related content | space-5 (20px) |
| Form fields | space-4 (16px) |

---

## Component Standards

### Cards

**Border Radius**
- Cards: 16px
- Buttons: 8px
- Inputs: 6px
- Badges: 4px (or full for pills)

**Shadows**
```css
--shadow-card: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);
--shadow-elevated: 0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06);
--shadow-modal: 0 20px 25px rgba(0,0,0,0.15), 0 10px 10px rgba(0,0,0,0.04);
```

**Hover States**
- Scale: 1.02 (subtle)
- Shadow: elevate from card → elevated
- Transition: 200ms ease-out

### Images

**Aspect Ratios by Context**
| Context | Ratio | Use |
|---------|-------|-----|
| Hero | 21:9 or 16:9 | Full-width headers |
| Featured | 16:9 | Primary content |
| Standard | 4:3 | Cards, listings |
| Portrait | 3:4 | People, vertical subjects |
| Square | 1:1 | Avatars, logos, thumbnails |

**Image Loading**
- Use lazy loading for below-fold images
- Provide low-res placeholder (blur-up)
- Specify width/height to prevent layout shift

---

## Color Usage

### Semantic Color Mapping

| Intent | Color Variable | Usage |
|--------|----------------|-------|
| Primary action | `--color-primary` | CTAs, active states |
| Secondary action | `--color-secondary` | Secondary buttons |
| Informational | `--color-info` | Tips, highlights |
| Success | `--color-success` | Confirmations |
| Warning | `--color-warning` | Cautions |
| Error | `--color-error` | Errors |
| Muted | `--color-muted` | De-emphasized text |

### Background Zones

| Zone | Background | Purpose |
|------|------------|---------|
| Navigation | Solid white/dark | Clear, stable |
| Hero | Gradient or image | Attention, brand |
| Primary content | White | Reading focus |
| Alternate sections | Gray-50 | Visual break |
| Footer | Dark | Finality |

---

## Interaction Patterns

### Focus States
- Visible focus ring: 2px offset, brand color
- Skip links for keyboard navigation
- Focus trap in modals/dialogs

### Loading States
- Skeleton screens for content areas
- Spinner for actions in progress
- Progress bar for multi-step operations

### Empty States
- Illustration (optional)
- Clear message explaining the state
- Actionable next step

---

## Accessibility Requirements

### Minimum Standards (WCAG 2.1 AA)

- **Color contrast**: 4.5:1 for text, 3:1 for UI
- **Touch targets**: 44×44px minimum
- **Focus visible**: Always visible, never removed
- **Motion**: Respect `prefers-reduced-motion`
- **Text resize**: Support up to 200% zoom

### Screen Reader Considerations

- Semantic HTML elements (nav, main, article, aside)
- ARIA labels for interactive elements without visible text
- Live regions for dynamic content updates
- Logical heading hierarchy (no skipped levels)

---

## Implementation Notes

### CSS Custom Properties to Define

```css
:root {
  /* Typography */
  --font-display: 'Chillax', sans-serif;
  --font-body: 'Satoshi', sans-serif;

  /* Type Scale */
  --text-display-xl: 3.5rem;
  --text-display-lg: 3rem;
  --text-heading-xl: 2.25rem;
  --text-heading-lg: 1.75rem;
  --text-heading-md: 1.375rem;
  --text-heading-sm: 1.125rem;
  --text-body-lg: 1.125rem;
  --text-body-md: 1rem;
  --text-body-sm: 0.875rem;
  --text-caption: 0.75rem;

  /* Spacing */
  --space-unit: 8px;
  --space-1: calc(var(--space-unit) * 0.5);
  --space-2: var(--space-unit);
  --space-3: calc(var(--space-unit) * 1.5);
  --space-4: calc(var(--space-unit) * 2);
  /* ... continue scale */

  /* Layout */
  --container-max: 1280px;
  --content-max: 720px;
  --sidebar-width: 280px;
}
```

### Tailwind Extensions

Add these to `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      fontSize: {
        'display-xl': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-lg': ['3rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        // ... complete scale
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        // ... fill gaps in scale
      }
    }
  }
}
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-01 | Initial design system documentation |

---

**Next:** [Page Templates](./page-templates.md)
