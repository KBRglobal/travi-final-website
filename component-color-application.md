# Component Color Application – Controlled Phase

**Phase**: Color Layer (Core Components Only)  
**Status**: December 2025 - Color Application  
**Scope**: Cards, section containers, grids only  
**Foundation**: Built on visual-foundations.md + component-visual-design.md  
**Color tokens**: From design_guidelines.md (no new tokens)  
**Constraints**: No page design, CTAs, hero changes, or new tokens

---

## 1. Color Palette (Locked Reference)

### 1.1 Primary Brand Colors
- **Purple** (#7B4BA4 / hsl 272 38% 47%): Primary brand
- **Pink** (#E84C9A / hsl 336 78% 60%): Energy, engagement
- **Yellow** (#F4C542 / hsl 44 88% 61%): Warmth, highlights
- **White** (#FFFFFF): Clean backgrounds

### 1.2 Semantic Colors
- **Success** (#02A65C): Positive states, affirmative actions
- **Warning** (#F4C542): Caution, alerts, highlights
- **Error** (#E84C9A): Errors, destructive actions
- **Info** (#01BEFF): Information, secondary actions

### 1.3 Neutrals (Light Mode)
- **Background**: #FFFFFF
- **Card**: #FFFFFF
- **Text Primary**: hsl(269 61% 15%) - Deep purple-black
- **Text Secondary**: hsl(264 23% 40%)
- **Text Muted**: hsl(270 10% 66%)
- **Border**: hsl(272 11% 83%)

### 1.4 Neutrals (Dark Mode)
- **Background**: hsl(269 61% 8%) - Deep purple-black
- **Card**: hsl(269 50% 10%)
- **Text Primary**: #FFFFFF
- **Text Secondary**: hsl(0 0% 80%)
- **Border**: hsl(269 30% 18%)

---

## 2. Core Component Color Rules

### 2.1 Destination Card

#### Light Mode
- **Background**: Card neutral (white)
- **Border**: None (uses shadow elevation)
- **Image**: Full color (no desaturation)
- **Text (name)**: Text Primary (deep purple-black)
- **Accent bar** (bottom): Optional brand color (purple/pink) - 1px height
- **Shadow**: Light gray (from shadow scale)
- **Hover state**: 
  - Background: Unchanged
  - Text: Unchanged
  - Shadow: Medium (increased elevation)
  - Accent: Unchanged

#### Dark Mode
- **Background**: Card neutral dark (dark blue-gray)
- **Border**: None (uses shadow elevation)
- **Image**: Full color (no desaturation)
- **Text (name)**: Text Primary (white)
- **Accent bar**: Optional brand color (purple/pink) - 1px height
- **Shadow**: Dark shadow (increased opacity per foundations)
- **Hover state**: Shadow increases only

#### Usage Rules
- **Accent bar**: Optional (not mandatory), use for destination importance or filtering
- **Disabled/coming soon**: Grayscale image + text secondary color (no accent bar)
- **No color changes on hover**: Only shadow elevation changes
- **Text contrast**: Maintains WCAG AA (4.5:1) minimum

---

### 2.2 Item Card (Attractions/Hotels/Dining)

#### Light Mode
- **Background**: Card neutral (white)
- **Border**: None (uses shadow elevation)
- **Image**: Full color
- **Title text**: Text Primary
- **Summary text**: Text Secondary
- **Metadata/info**: Text Muted + Semantic colors for status badges
- **Category badge** (if present): Light background with brand/semantic color
- **Shadow**: Light gray
- **Hover state**:
  - Background: Unchanged
  - Text colors: Unchanged
  - Shadow: Medium
  - Image: Slight brightness +5% (optional enhancement)

#### Dark Mode
- **Background**: Card neutral dark
- **Border**: None
- **Image**: Full color
- **Title text**: Text Primary (white)
- **Summary text**: Text Secondary (light gray)
- **Metadata**: Text Muted + Semantic colors
- **Category badge**: Dark background with brand/semantic color
- **Shadow**: Dark shadow (increased opacity)
- **Hover state**: Shadow increases only

#### Status Indicators
- **Available**: Success green (#02A65C) text + icon
- **Coming soon**: Warning yellow (#F4C542) text + icon
- **Limited availability**: Error pink (#E84C9A) text + icon
- **Featured**: Purple brand accent + badge

#### Usage Rules
- **Badges**: Use semantic colors (success/warning/error) for status
- **Category tags**: Use Text Secondary or brand color (purple) text
- **No overlay on image**: Images are full color, no tint/wash
- **Contrast check**: All text meets WCAG AA on card background

---

### 2.3 Article Card

#### Light Mode
- **Background**: Card neutral (white)
- **Border**: None (uses shadow elevation)
- **Featured image**: Full color (no overlay/tint)
- **Title**: Text Primary
- **Excerpt**: Text Secondary
- **Metadata** (date, category):
  - Date: Text Muted
  - Category: Brand purple or semantic color text
  - Author: Text Muted
- **Published badge** (if shown): Text Secondary + subtle background
- **Shadow**: Light gray
- **Hover state**:
  - Background: Unchanged
  - Text: Unchanged
  - Shadow: Medium
  - Image: Slight brightness increase (optional)

#### Dark Mode
- **Background**: Card neutral dark
- **Border**: None
- **Featured image**: Full color
- **Title**: Text Primary (white)
- **Excerpt**: Text Secondary (light gray)
- **Metadata**: Text Muted + semantic colors
- **Published badge**: Text Secondary + subtle dark background
- **Shadow**: Dark shadow (increased opacity)
- **Hover state**: Shadow increases only

#### Article Status Colors
- **Published**: Green success (#02A65C) indicator (if shown)
- **Pending**: Yellow warning (#F4C542) indicator
- **Featured**: Purple brand accent
- **Breaking**: Error pink (#E84C9A) indicator (optional)

#### Usage Rules
- **No gradient overlays**: Images stay pure color
- **Metadata styling**: Keep muted and compact
- **Category tagging**: Use brand purple for primary category
- **Recency**: Use date alone (no color coding needed)

---

## 3. Section Container Colors

### 3.1 Standard Section

#### Light Mode
- **Background**: White (default)
- **Text**: Text Primary
- **Headings**: Text Primary
- **Divider lines** (if used): Border color (light)
- **No border** on container

#### Dark Mode
- **Background**: Dark background (deep purple-black)
- **Text**: Text Primary (white)
- **Headings**: Text Primary (white)
- **Divider lines**: Border dark color
- **No border** on container

#### Usage Rules
- **Solid backgrounds only**: No gradients or overlays
- **High contrast**: Text always readable on background
- **Consistency**: All standard sections use same background

---

### 3.2 Accent/Featured Section

**Purpose**: Highlight specific sections while maintaining neutral-first approach

#### Light Mode
- **Background**: Slightly elevated (subtle off-white)
  - Option 1: Very light gray (hsl 270 10% 95%)
  - Option 2: White with subtle brand tint (hsl 272 50% 97%)
- **Text**: Text Primary (unchanged)
- **Border**: Optional subtle border (light gray)
- **Dividers**: Border color

#### Dark Mode
- **Background**: Slightly elevated from base (hsl 269 50% 12%)
- **Text**: Text Primary (white)
- **Border**: Optional subtle border (dark gray)
- **Dividers**: Border dark color

#### Usage Rules
- **Only one accent per page**: Don't overuse
- **Subtle elevation**: Must be barely noticeable
- **No color change**: Use background only, not color
- **Border is optional**: Elevation alone may be sufficient

---

## 4. Grid Component Colors

### 4.1 Card Grid (Any Card Type)

#### Container
- **Background**: Inherits from section (white/dark)
- **Grid lines**: None (gaps create visual separation)
- **Gap spacing**: No color applied (white/transparent space)

#### Cards within grid
- **Each card**: Uses card-specific colors (see Card Components)
- **Consistency**: All cards in grid use same color scheme
- **Contrast**: Cards visible against section background

#### Usage Rules
- **No colored grid background**: Grid background = section background
- **Card shadows provide separation**: Don't use border lines
- **Responsive gaps**: Gaps are neutral space (no color)

---

### 4.2 Two-Column Layout

#### Container
- **Background**: Section background (white/dark)
- **Column backgrounds**: Inherit from container or override with card color

#### Left/right content
- **Column 1**: Background + text (if card) or text only (if section)
- **Column 2**: Same as column 1
- **Gap**: No color (neutral space)

#### Usage Rules
- **Consistent background**: Both columns use same background unless intentional contrast
- **Text hierarchy**: Use Text Primary/Secondary as in sections
- **No divider line**: Gap provides separation

---

## 5. Badge & Status Color Usage

### 5.1 Status Badges (Within Cards)

| Status | Background | Text | Usage |
|--------|-----------|------|-------|
| Available | Success bg (light tint) | Success green | Attractions, hotels, availability |
| Coming Soon | Warning bg (light tint) | Warning yellow | Unreleased content |
| Limited | Error bg (light tint) | Error pink | Time-limited availability |
| Featured | Brand bg (light tint) | Brand purple | Highlighted items |
| New | Info bg (light tint) | Info cyan | Recently added |

#### Color Rules
- **Background**: Light tint of the color (10-20% opacity)
- **Text**: Full color (high contrast)
- **Dark mode**: Adjust opacity of background (lighter tint on dark)
- **No icons without text**: Always pair with label

### 5.2 Category/Tag Colors

**Primary category**: Brand purple (#7B4BA4)  
**Secondary category**: Brand pink (#E84C9A)  
**Type indicator**: Semantic color matching content type

#### Rules
- **One primary color per card**: Lead category uses purple
- **Additional tags**: Use Text Muted with border
- **No more than 2-3 tags**: Keep cards clean

---

## 6. Image Overlay & Treatment

### 6.1 No Overlays on Card Images
- **Card images**: Pure color, no gradient wash
- **Article featured images**: Pure color, no overlay
- **Destination images**: Pure color, no overlay
- **Hover brightening** (optional): +5% brightness only

### 6.2 Image Desaturation (Disabled State Only)
- **Disabled/unavailable**: Grayscale (0% saturation)
- **Coming soon items**: Grayscale + text secondary color
- **Featured items**: No desaturation (pure color)

### 6.3 Image Contrast
- **Text over images**: Not used in card components (text below image)
- **If text required over image**: Use dark overlay (20-30% opacity) + white text
- **No gradients**: Only solid overlays if needed

---

## 7. Hover & Interactive States

### 7.1 Card States

| State | Background | Text | Shadow | Other |
|-------|-----------|------|--------|-------|
| Default | Card neutral | Text Primary | Light | Image full color |
| Hover | Unchanged | Unchanged | Medium | Image brightness +5% (optional) |
| Focus | Unchanged | Unchanged | Medium | Focus ring (brand purple) |
| Disabled | Card neutral | Text Muted | None | Image grayscale |

#### Rules
- **Color on state change**: NONE (shadow elevation only)
- **Focus ring**: Brand purple, 2px width
- **Disabled**: Grayscale image + muted text only
- **No background highlight**: Elevation changes via shadow only

---

## 8. Dark Mode Color Mapping

### 8.1 Automatic Mapping
| Light Mode | Dark Mode | Rule |
|-----------|----------|------|
| White background | Dark background | Invert luminance |
| Text Primary | White text | Full contrast |
| Text Secondary | Light gray text | Maintain hierarchy |
| Text Muted | Muted gray text | Reduce emphasis |
| Border light | Border dark | Maintain contrast |
| Card white | Card dark blue-gray | Match background offset |

### 8.2 Implementation
- **CSS variables**: Same names, different values per mode
- **Automatic switching**: No color changes needed in components
- **Shadow adjustment**: Only shadows change opacity (per foundations)

---

## 9. Color Accessibility Rules

### 9.1 Contrast Ratios
- **Text on background**: WCAG AA minimum (4.5:1)
- **Large text** (18px+): WCAG AA minimum (3:1)
- **UI components**: WCAG AA minimum (3:1)

### 9.2 Checks
- **No color alone**: Don't use color to convey information (pair with icons/text)
- **Status badges**: Always have text label, not color only
- **Links in text**: Underline required (not color alone)

### 9.3 Dark Mode Contrast
- **Increased shadow opacity**: Compensates for reduced background contrast
- **Text contrast**: Maintained via CSS variables
- **No color changes**: Same semantic colors used in both modes

---

## 10. Implementation Rules

### 10.1 CSS Architecture
- **CSS variables for colors**: Define in :root and .dark mode
- **Component classes**: Use variables (not hard-coded hex)
- **Reusability**: Classes apply same colors across component instances

### 10.2 Tailwind Integration
- **Color classes**: Use Tailwind defaults + custom variables
- **No new tokens**: Use only existing palette from design_guidelines.md
- **Consistency**: All cards use bg-card, all text uses text-primary, etc.

### 10.3 Validation Checklist
- [ ] No new color tokens created
- [ ] All cards use card-neutral backgrounds
- [ ] All text uses text primary/secondary/muted
- [ ] Status badges use semantic colors only
- [ ] Shadow elevation only on hover (no color change)
- [ ] No overlays on card images
- [ ] Dark mode colors auto-applied via CSS variables
- [ ] Focus rings use brand purple
- [ ] Disabled states use grayscale + text muted
- [ ] No page-level color rules included
- [ ] No CTA styling included
- [ ] No hero changes

---

## 11. Non-Scope (Locked/Future)

❌ **NOT in this phase:**
- Page-level design
- CTA styling or colors
- Hero section changes
- New color tokens
- Navigation styling
- Form elements
- Animations/transitions
- Icon colors (covered in component use)
- Typography colors (handled by text-primary/secondary)

**Covered in previous phases:**
- Spacing, radius, shadows (Visual Foundations)
- Component structure (Component Visual Design)

**Will be covered in future phases:**
- Interactive states beyond shadow
- Motion and transitions
- Page layouts
- CTA design
- Form styling
