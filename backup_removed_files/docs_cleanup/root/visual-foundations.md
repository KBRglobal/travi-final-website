# TRAVI Visual Foundations

**Phase**: Structural Layer (Tokens & Rules Only)  
**Status**: December 2025 - Foundation Definition  
**Scope**: Surface hierarchy, spacing, border-radius, shadows  
**Constraints**: No colors, typography, CTAs, or layout changes

---

## 1. Surface Hierarchy

### 1.1 App Shell
**Definition**: The persistent container that frames all content.

- **Background**: Default background color (no specific rule)
- **Fixed Elements**: Header, sidebar (if present), footer
- **Property Constraints**:
  - Header height: 80px (desktop), 64px (mobile)
  - Footer height: Dynamic based on content
  - Sidebar width: 16rem (default), 4rem (collapsed)
  - Z-index: 40 (sticky header), 30 (content above background)

### 1.2 Content Surfaces
**Definition**: Primary scrollable content areas within the app shell.

- **Hero Surface**: Full-width, dynamic height (min 60vh)
  - Contains: Full-bleed image or gradient
  - Z-index: 0 (behind text overlay)
  - No padding/margins on hero itself (extends to viewport edges)

- **Section Surface**: Standard content containers
  - Padding: Consistent horizontal padding with spacing scale (lg/xl based on screen size)
  - Max-width: 1280px (centered on lg+ screens)
  - Z-index: 10 (above hero background)
  - Margin between sections: 2xl spacing token

- **Card Surface**: Grouped content within sections
  - Container: Bordered or shadowed container
  - Interior padding: md/lg spacing tokens
  - Z-index: 15 (above section background)
  - Spacing between cards: gap uses spacing scale

### 1.3 Modal/Dialog Surface
**Definition**: Overlay surfaces for focused interactions.

- **Backdrop**: Positioned fixed, full viewport
  - Z-index: 50 (above all content)
  - Backdrop blur or overlay effect

- **Modal Container**: Centered or positioned overlay
  - Z-index: 51 (above backdrop)
  - Max-width: 90% (mobile), 600px (desktop)
  - Padding: xl spacing token (interior)
  - Border-radius: lg scale

- **Sidebar/Drawer Surface**: Side-anchored overlay
  - Z-index: 51 (same as modal)
  - Width: 320px (standard), 64px (icon-only)
  - Height: Full viewport with scrolling
  - Shadow: Drop shadow on right edge

### 1.4 Floating Surface
**Definition**: Elements floating above content (tooltips, popovers, dropdowns).

- **Position**: Fixed or absolute relative to trigger
- **Z-index**: 40-45 (above sticky header but below modal)
- **Spacing from trigger**: sm spacing token
- **Shadow**: md scale (elevated appearance)
- **Max-width**: 320px (constrained for readability)

---

## 2. Spacing Scale

**Philosophy**: Progressive spacing that creates clear visual hierarchy and breathing room.

### 2.1 Scale Definition

| Token | px Value | Usage |
|-------|----------|-------|
| `xs` | 4px | Micro-spacing (icon-text gaps, tight lists) |
| `sm` | 8px | Small gaps (form fields, compact sections) |
| `md` | 16px | Standard padding (cards, inputs, small containers) |
| `lg` | 24px | Comfortable padding (cards at rest, content blocks) |
| `xl` | 32px | Generous padding (section internal spacing, large cards) |
| `2xl` | 48px | Section spacing (between major content blocks) |
| `3xl` | 64px | Major divisions (between distinct page sections) |
| `4xl` | 96px | Hero spacing (large padding for hero content areas) |

### 2.2 Application Rules

#### Section Padding (Horizontal)
- **Mobile (< 640px)**: md to lg (16-24px per side)
- **Tablet (640px - 1024px)**: lg to xl (24-32px per side)
- **Desktop (> 1024px)**: xl to 2xl (32-48px per side)

#### Section Spacing (Vertical, Between Sections)
- **Standard spacing**: 2xl (48px)
- **Major transitions**: 3xl (64px)
- **Hero to first section**: 2xl minimum

#### Grid Gaps
- **Card grids**: md (16px) on mobile, lg (24px) on desktop
- **Flex lists**: sm (8px) for compact, md (16px) for standard
- **Feature rows**: lg (24px) for breathing room

#### Component Interior Spacing
- **Buttons**: Built into component (no manual override)
- **Card padding**: 
  - Small cards: md (16px)
  - Standard cards: lg (24px)
  - Large cards: xl (32px)
- **Form groups**: md between inputs, lg between sections
- **List items**: sm between items (vertical), md between sections

#### Content Spacing
- **Heading to paragraph**: md (16px)
- **Paragraph to paragraph**: md (16px)
- **List items**: sm (8px)

### 2.3 Responsive Behavior
- Spacing scales up at breakpoints (not abruptly)
- Use fluid spacing where possible (`calc()` for gradual transitions)
- Never skip scale levels (don't use random px values)
- Maintain proportional spacing across breakpoints

---

## 3. Border Radius Scale

**Philosophy**: Subtle curvature that doesn't dominate, with specific sizes for different component types.

### 3.1 Scale Definition

| Token | Value | Usage |
|-------|-------|-------|
| `sm` | 8px | Buttons, small badges, tight components |
| `md` | 12px | Small cards, dropdown menus, form elements |
| `lg` | 16px | Standard cards, modals, larger components |
| `xl` | 24px | Large cards, hero search, prominent cards |
| `full` | 999px | Pills, circular elements, badges |

### 3.2 Application Rules

#### By Component Type
- **Buttons**: sm (8px) - except pill variants use full
- **Input fields**: sm (8px)
- **Badges**: sm (8px) for rect, full for pill
- **Small cards**: md (12px)
- **Standard cards**: lg (16px)
- **Large featured cards**: xl (24px)
- **Modals**: lg (16px)
- **Search bars**: lg to xl (16-24px) depending on prominence
- **Images in cards**: Inherit from card unless specific override

#### Rules
- **Consistency within surface types**: All cards on a page use same radius
- **Never override**: Once a component type has a radius, maintain it
- **No fractional radii**: Always use scale values (8, 12, 16, 24, 999)
- **Rounded corners must have context**: Never use border-radius on elements with borders less than full perimeter (see design guidelines for exception cases)

---

## 4. Shadow Scale

**Philosophy**: Minimal shadows that convey elevation without visual noise. Maximum 3 levels only.

### 4.1 Scale Definition

| Level | Style | Semantics | Usage |
|-------|-------|-----------|-------|
| `light` | `0 2px 4px rgba(0,0,0,0.08)` | Subtle depth | Resting state, subtle elevation |
| `medium` | `0 4px 12px rgba(0,0,0,0.12)` | Clear elevation | Cards on hover, active states |
| `heavy` | `0 8px 24px rgba(0,0,0,0.16)` | Floating/modal | Modals, floating panels, dropdowns |

### 4.2 Application Rules

#### By State
- **Resting cards**: light (minimal depth)
- **Hovered cards**: medium (clear lift)
- **Modals/overlays**: heavy (distinct from content)
- **Dropdowns/popovers**: medium (elevated but not heavy)
- **Sticky header on scroll**: light to medium (subtle depth)
- **Buttons**: No shadow by default (use hover-elevate utility for interaction)

#### By Component Type
- **Card at rest**: light
- **Card on hover**: medium
- **Modal backdrop**: heavy (on modal container, not backdrop)
- **Floating action button**: medium
- **Navigation dropdown**: medium
- **Search suggestions**: medium
- **Tooltips**: light

#### Rules
- **Never combine shadows**: One shadow level per element
- **No custom shadows**: Always use scale values
- **Elevation = interaction**: Greater shadows for interactive/floating elements
- **Consistency**: All cards of same type use same shadow level
- **Dark mode**: Increase opacity slightly (add 0.04 to rgba values) for visibility
- **No glow effects**: Shadow scale is structural only (no decorative glows)

---

## 5. Token Implementation

### 5.1 CSS Custom Properties (in index.css)
```css
:root {
  /* Spacing Scale */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;
  --spacing-3xl: 64px;
  --spacing-4xl: 96px;

  /* Border Radius Scale */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 999px;

  /* Shadow Scale */
  --shadow-light: 0 2px 4px rgba(0, 0, 0, 0.08);
  --shadow-medium: 0 4px 12px rgba(0, 0, 0, 0.12);
  --shadow-heavy: 0 8px 24px rgba(0, 0, 0, 0.16);
}

.dark {
  --shadow-light: 0 2px 4px rgba(0, 0, 0, 0.12);
  --shadow-medium: 0 4px 12px rgba(0, 0, 0, 0.16);
  --shadow-heavy: 0 8px 24px rgba(0, 0, 0, 0.20);
}
```

### 5.2 Tailwind Configuration (existing approach)
- Spacing: Use Tailwind defaults + custom scale
- Border radius: Define custom radius scale
- Shadows: Use CSS custom properties or Tailwind defaults

### 5.3 No Page-Specific Tokens
- All tokens are global/surface-level
- No component-level token overrides
- No page-specific spacing adjustments
- Rules apply uniformly across entire app

---

## 6. Surface Behavior Rules

### 6.1 Stack Management
- **Logical Z-index progression**:
  - 0: Hero backgrounds
  - 10: Section surfaces
  - 15: Card surfaces
  - 30: Content layers (tabs, expansions)
  - 40-45: Floating elements (tooltips, dropdowns)
  - 50: Modal backdrop
  - 51: Modal container

### 6.2 Padding Inheritance
- **App Shell**: No padding (edges flush)
- **Hero Surface**: No padding (extends edge-to-edge)
- **Section Surface**: Inherits horizontal padding from breakpoint rules
- **Card Surface**: Interior padding per sizing
- **Modal Surface**: Interior padding via xl token

### 6.3 Spacing Composition
- **Vertical rhythm**: Use 2xl between sections consistently
- **Horizontal rhythm**: Scale padding per breakpoint
- **Grid composition**: Use md/lg gaps consistently
- **Never mix scales**: Don't combine unrelated spacing tokens

---

## 7. Dark Mode Adaptation

### 7.1 Shadow Adjustments
- Increase opacity by 0.04 (light: 0.12, medium: 0.16, heavy: 0.20)
- Rationale: Dark backgrounds reduce shadow contrast

### 7.2 No Other Changes
- Spacing scale: Identical light/dark
- Border radius: Identical light/dark
- Surface hierarchy: Identical light/dark

---

## 8. Accessibility Implications

### 8.1 Spacing
- **Touch targets**: All interactive elements minimum 44px × 44px
- Sufficient spacing prevents mis-clicks on mobile

### 8.2 Border Radius
- **Reduced motion**: Radius remains static (motion preference doesn't affect)
- Visual hierarchy maintained without animation

### 8.3 Shadows
- **Contrast**: Shadows alone don't convey state
- Always pair shadow changes with other indicators (text, color, position)
- Sufficient contrast for low-vision users

---

## 9. Implementation Checklist

- [ ] Add CSS custom properties to index.css
- [ ] Update Tailwind config with custom spacing scale
- [ ] Update Tailwind config with custom radius scale
- [ ] Create Tailwind utilities for shadow scale
- [ ] Document all z-index usage in codebase
- [ ] Audit existing components for scale violations
- [ ] Create component examples using scale tokens
- [ ] Add to design system documentation

---

## 10. Future Phases

This foundational layer enables:
1. **Color & Typography Phase**: Add color tokens on top of spacing
2. **Component Phase**: Define component-specific behaviors
3. **Interactive Phase**: Add motion and interaction states
4. **Content Phase**: Page-level layout and content rules

**NOT included in this phase**:
- Color palettes
- Typography sizes/weights
- CTA styling
- Page layouts
- Component-specific rules
- Interactive states
