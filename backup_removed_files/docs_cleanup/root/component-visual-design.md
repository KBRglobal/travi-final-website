# Component Visual Design – Core Surfaces

**Phase**: Component Layer (Structural Design)  
**Status**: December 2025 - Core Surface Definition  
**Scope**: Cards, section containers, grid layouts, hero structure  
**Foundation**: Built on visual-foundations.md tokens and rules  
**Constraints**: No colors, typography, CTAs, or page-level design

---

## 1. Card Components

### 1.1 Destination Card

**Purpose**: Browse/selection interface for destination content  
**Context**: Grid layouts on destination browse pages

#### Structure
```
┌─────────────────────┐
│                     │ <- Image slot (4:3 aspect)
│    Image Container  │
│                     │
├─────────────────────┤
│  Destination Name   │ <- Text content
│  (Single line)      │
└─────────────────────┘
```

#### Dimensions & Spacing
- **Width**: Responsive (use grid layout rules)
- **Image aspect ratio**: 4:3 (landscape)
- **Image container**: Full card width
- **Interior padding**: `lg` (24px)
- **Rounded corners**: `lg` (16px) for entire card
- **Border radius application**: Card corners only

#### Elevation & Shadow
- **Resting state**: `light` shadow
- **Hover state**: `medium` shadow (transition smooth)
- **Interaction**: No scale change on hover (elevation only)

#### Layout Rules
- **Image to text spacing**: md (16px) [internal padding creates this]
- **Text alignment**: Left-aligned
- **Text line clamp**: 1 line (overflow hidden)
- **Card gaps in grid**: See Grid Layouts section

#### Responsive Behavior
- **Mobile (< 640px)**: Full width with md margins
- **Tablet (640px - 1024px)**: 2-column grid
- **Desktop (> 1024px)**: 3-4 column grid
- **Padding consistency**: Maintains lg interior padding across all sizes

---

### 1.2 Item Card (Attractions/Hotels/Dining)

**Purpose**: Featured or browsable content for attractions, hotels, dining  
**Context**: Grid layouts or single-item detail preview

#### Structure
```
┌─────────────────────┐
│                     │ <- Image slot (4:3 aspect)
│  Card Image         │    for listings, hero-image
│                     │    for single detail
├─────────────────────┤
│ Title (2 lines)     │ <- Content area
│ Summary (2 lines)   │
│ Category/Info       │
│ (Inline elements)   │
└─────────────────────┘
```

#### Dimensions & Spacing
- **Width**: Responsive (use grid layout rules)
- **Image aspect ratio**: 4:3 (landscape)
- **Interior padding**: 
  - Card padding: `lg` (24px)
  - Element spacing within content: `md` (16px) between lines
  - Icon-text spacing: `sm` (8px)
- **Rounded corners**: `lg` (16px)
- **Border radius**: Card corners only

#### Elevation & Shadow
- **Resting state**: `light` shadow
- **Hover state**: `medium` shadow (transition 200-300ms)
- **Active/selection state**: `medium` shadow with indicator
- **No scale changes**: Elevation only via shadow

#### Content Spacing Rules
- **Title to summary**: `md` (16px)
- **Summary to metadata**: `md` (16px)
- **Inline element gaps**: `sm` (8px) between icon and label
- **Multiple metadata items**: `md` (16px) between groups

#### Responsive Behavior
- **Mobile**: Single column (full width)
- **Tablet**: 2-column grid
- **Desktop**: 3-4 column grid
- **Interior padding**: Maintains `lg` on all breakpoints
- **Text clamps**: Title 2 lines, summary 2 lines (may reduce on mobile)

---

### 1.3 Article Card

**Purpose**: News/editorial content preview in lists  
**Context**: Article browse pages, related articles sections

#### Structure
```
┌─────────────────────┐
│                     │ <- Featured image (16:9 aspect)
│  Featured Image     │
│                     │
├─────────────────────┤
│ Article Title       │ <- Content area
│ (2 lines)           │
│                     │
│ Excerpt (2 lines)   │
│ Date, Category      │
└─────────────────────┘
```

#### Dimensions & Spacing
- **Width**: Responsive (use grid layout rules)
- **Image aspect ratio**: 16:9 (wider than card/item)
- **Interior padding**: `lg` (24px)
- **Element spacing**: 
  - Image to title: md (16px) [created by padding]
  - Title to excerpt: md (16px)
  - Excerpt to metadata: md (16px)
- **Rounded corners**: `lg` (16px)

#### Elevation & Shadow
- **Resting state**: `light` shadow
- **Hover state**: `medium` shadow (transition 200-300ms)
- **Published indicator**: No elevation change (use color/text only)

#### Content Layout
- **Title**: 2-line maximum (overflow ellipsis)
- **Excerpt**: 2-line maximum (overflow ellipsis)
- **Metadata line**: Single line, compact spacing (`sm` gaps)
- **Metadata elements**: Date, category, author if present

#### Responsive Behavior
- **Mobile (< 640px)**: Full width, single column
- **Tablet (640px - 1024px)**: 2-column grid
- **Desktop (> 1024px)**: 2-3 column grid
- **Interior padding**: Consistent `lg` across sizes
- **Text clamps**: Maintain 2-line limit on all breakpoints

---

## 2. Section Containers

### 2.1 Standard Section Container

**Purpose**: Wrapper for grouped content (cards, text, forms)  
**Context**: Any page section between hero and footer

#### Structure
```
┌────────────────────────────────────────┐
│ Section Padding (responsive)           │
│  ┌──────────────────────────────────┐  │
│  │  Max-width: 1280px               │  │
│  │  Interior: Variable by content   │  │
│  └──────────────────────────────────┘  │
│ Section Padding (responsive)           │
└────────────────────────────────────────┘
```

#### Padding Rules
- **Horizontal padding**:
  - Mobile (< 640px): `lg` per side (24px)
  - Tablet (640px - 1024px): `lg` per side (24px)
  - Desktop (> 1024px): `xl` per side (32px)
- **Vertical padding**:
  - Top/bottom: `xl` (32px) standard, `2xl` (48px) for prominent sections
- **No border radius on container** (extends edge-to-edge)
- **No shadow on container** (background color only)

#### Sizing
- **Max-width**: 1280px (centered on lg+ screens)
- **Width**: 100% (full viewport)
- **Responsive width**: Follows padding rules

#### Interior Spacing
- **Content element spacing**: 
  - Between cards in grid: Use Grid Layouts section
  - Between content blocks: `2xl` (48px)
  - Between section heading and content: `xl` (32px)

#### Layout Behavior
- **Horizontal centering**: Auto margins on max-width container
- **Vertical stacking**: Sections stack with `2xl` vertical spacing
- **Nested sections**: Interior section padding = `xl` per side

---

### 2.2 Featured/Card-Based Section

**Purpose**: Section containing cards in a grid  
**Context**: Destination grid, related items, article lists

#### Structure
- Uses Standard Section Container structure
- Interior follows Grid Layouts rules (gaps, sizing)
- No additional styling on container

#### Spacing Rules
- **Section container padding**: Apply standard rules
- **Grid gap**: See Grid Layouts section
- **Card sizing**: See Card Components section
- **Between sections**: `2xl` (48px) vertical spacing

---

### 2.3 Content Section (Text/Mixed)

**Purpose**: Sections with text content, not cards  
**Context**: Guides, informational content, form sections

#### Structure
```
┌────────────────────────────────┐
│ Section Padding                │
│  ┌──────────────────────────┐  │
│  │ Heading                  │  │
│  │                          │  │
│  │ Body Content             │  │
│  │ (Text, lists, forms)     │  │
│  └──────────────────────────┘  │
│ Section Padding                │
└────────────────────────────────┘
```

#### Spacing
- **Section padding**: Standard rules
- **Heading to content**: `xl` (32px)
- **Paragraph spacing**: `md` (16px) between blocks
- **List spacing**: `sm` (8px) between items, `md` between lists
- **Form spacing**: `md` between inputs, `lg` between sections

#### Layout
- **Content max-width**: Inherits from section (1280px)
- **Text column width**: Consider legibility (no line > 75 chars)
- **No border radius**: Content section has no rounded edges
- **No elevation**: Use background color only

---

## 3. Grid Layouts

### 3.1 Standard Grid Container

**Purpose**: Responsive grid for cards  
**Context**: Card grids across all breakpoints

#### Column Rules
- **Mobile (< 640px)**: 1 column
- **Tablet (640px - 768px)**: 2 columns
- **Tablet (768px - 1024px)**: 2-3 columns
- **Desktop (1024px+)**: 3-4 columns

#### Gap Rules
- **Mobile**: `md` gap (16px) between all cards
- **Tablet+**: `lg` gap (24px) between cards
- **No minimum card sizing**: Cards expand/contract per grid

#### Responsive Behavior
- **Smooth transition**: Gaps increase at breakpoints (not abrupt)
- **Column count**: Changes at breakpoints only
- **Card width**: Calculated automatically by grid

#### Padding
- Grid lives within Section Container
- Section padding rules apply (not grid-specific)

---

### 3.2 Two-Column Grid (Special)

**Purpose**: Side-by-side layouts  
**Context**: Feature comparisons, hero + content, form + preview

#### Column Setup
- **Column widths**: 50/50 split (equal), or asymmetric if needed
- **Gap**: `xl` (32px) between columns
- **Alignment**: Top-align content by default

#### Responsive Behavior
- **Desktop (> 1024px)**: Two columns
- **Tablet (640px - 1024px)**: Stack to single column (gap: `2xl`)
- **Mobile (< 640px)**: Single column (gap: `2xl`)

#### Rules
- **Gap increases on stack**: Use `2xl` for vertical stacking
- **Interior padding**: Each column maintains section padding rules
- **No nesting**: Don't nest grids within two-column layouts

---

### 3.3 Flex Row (Horizontal Lists)

**Purpose**: Horizontal scrollable or flex layouts  
**Context**: Related items, horizontal browsing

#### Structure
- **Direction**: Row (horizontal)
- **Wrap**: None (scrollable) or wrap depending on use case
- **Gap**: 
  - Compact: `sm` (8px)
  - Standard: `md` (16px)
  - Generous: `lg` (24px)

#### Responsive Behavior
- **Desktop**: Flex row with wrap or scroll
- **Mobile**: Horizontal scroll or stack to column (depending on context)
- **Gap consistency**: Maintain chosen gap on all breakpoints

---

## 4. Hero Container

**Purpose**: Full-width hero section structure  
**Context**: Page headers, destination introductions

#### Structure
```
┌────────────────────────────────────┐
│                                    │
│  Hero Image/Background             │ <- Full viewport width
│  (min-height: 60vh)                │
│                                    │
│  ┌──────────────────────────────┐  │
│  │ Hero Content Overlay         │  │ <- Text overlay
│  │ (Title, subtitle, optional)  │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

#### Dimensions
- **Width**: 100% (full viewport)
- **Min-height**: 60vh mobile, 70vh tablet, 80vh desktop
- **Max-height**: None (content-driven)
- **Aspect ratio**: No fixed aspect (driven by image)

#### Content Area Positioning
- **Position**: Absolute/relative within hero
- **Alignment**: Bottom-left to bottom-right
- **Padding**: 
  - Horizontal: Section padding rules (lg-xl per side)
  - Vertical: `4xl` (96px) from bottom (spacious)
- **Max-width**: 50% of hero width or full width (content-dependent)

#### Background
- **Coverage**: Full bleed (edge-to-edge, no margins)
- **No border radius**: Hero extends to viewport edges
- **Image sizing**: Cover entire hero area (object-fit: cover)

#### Responsiveness
- **Mobile (< 640px)**: 
  - Min-height: 60vh
  - Horizontal padding: `lg` (24px)
  - Vertical padding bottom: `2xl` (48px)
- **Tablet (640px - 1024px)**:
  - Min-height: 70vh
  - Horizontal padding: `lg` (24px)
  - Vertical padding bottom: `3xl` (64px)
- **Desktop (> 1024px)**:
  - Min-height: 80vh
  - Horizontal padding: `xl` (32px)
  - Vertical padding bottom: `4xl` (96px)

#### Structure Rules
- **Image layer**: Z-index 0 (behind text)
- **Content layer**: Z-index 10 (above image)
- **Overlay/wash**: If used, behind content, Z-index 5
- **No border radius on image or container**
- **No drop shadows on hero elements**

#### Content Constraints
- **Text spacing**: 
  - Heading to subtitle: `md` (16px)
  - Subtitle to CTA: `xl` (32px) if CTA present
- **CTA positioning**: At bottom of content block, not floating
- **Content alignment**: Left-aligned, not centered

---

## 5. Component Composition Rules

### 5.1 Card Nesting Rules
- **No cards inside cards**: Cards are atomic components
- **No sections inside cards**: Content is flat
- **Multi-element cards**: Use padding rules for internal spacing

### 5.2 Container Nesting Rules
- **Sections can nest**: Section inside section uses interior padding (`xl`)
- **Grids inside sections**: Standard container spacing applies
- **No double padding**: Each level uses appropriate padding (no accumulation)

### 5.3 Spacing Consistency Rules
- **All cards of type use same spacing**: No exceptions
- **All grids of type use same gaps**: No exceptions
- **Scale tokens only**: Never use custom values
- **Breakpoint precision**: Use defined breakpoints only

---

## 6. Implementation Rules

### 6.1 Component Isolation
- **Each component self-contained**: Padding and spacing internal
- **No margin-based composition**: Use padding and gaps
- **No external spacing rules**: Spacing comes from parent container, not component

### 6.2 Responsive Implementation
- **Mobile-first CSS**: Mobile rules first, then breakpoint expansions
- **Breakpoint variables**: Use Tailwind breakpoints consistently
- **Fluid spacing**: Consider `calc()` for gradual transitions between breakpoints

### 6.3 Validation Checklist
- [ ] All cards use only `sm`, `md`, `lg` border-radius
- [ ] All cards use only `light` or `medium` shadow
- [ ] All grids use only `md` or `lg` gaps
- [ ] All sections use defined padding scale
- [ ] Hero dimensions match specification
- [ ] No color changes from design_guidelines.md
- [ ] No typography changes
- [ ] No CTA styling included
- [ ] Responsive behavior follows breakpoint rules

---

## 7. Relationship to Foundations

**Visual Foundations provides:**
- Spacing scale tokens
- Border-radius scale tokens
- Shadow scale tokens
- Z-index hierarchy
- Dark mode shadow adjustments

**Component Visual Design uses:**
- All spacing tokens per component type
- All radius tokens per component type
- Shadow progression (light → medium)
- Z-index positioning rules
- Responsive breakpoint structure

**Next phases will add:**
- Color application (Component Color Design)
- Typography specifics (Component Typography Design)
- Interactive states (Component Interactive Design)
- Page layouts (Layout & Content Design)

---

## 8. Non-Scope (Locked/Future)

❌ **NOT in this phase:**
- CTAs or button styling
- Color definitions
- Typography sizing/weight
- Icon styling
- Form elements
- Page-level layouts
- Navigation structure
- Footer specifics
- Modal design
- Animation/motion

**These will be addressed in subsequent phases.**
