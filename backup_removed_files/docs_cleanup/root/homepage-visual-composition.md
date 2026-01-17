# Homepage Visual Composition – Implementation

**Phase**: Page Design (Implementation)  
**Status**: December 2025 - Homepage Design  
**Scope**: Complete homepage visual structure  
**Foundation**: Visual Foundations + Component Visual Design + Component Color Application  
**Brand Tone**: Young, smart, playful (not corporate)  
**Constraints**: NO new systems, tokens, or rules

---

## Section-by-Section Composition

### 1. Hero Section (Full Viewport)

**Structure**: Full-bleed rotating hero image with text overlay

**Dimensions** (from visual-foundations)
- Width: 100% (full viewport)
- Min-height: 60vh mobile, 70vh tablet, 80vh desktop
- No border-radius (extends edge-to-edge)
- No shadows

**Content Area**
- Position: Relative/absolute overlay (bottom-left to center)
- Horizontal padding: lg (24px) mobile, xl (32px) desktop
- Vertical padding bottom: 2xl (48px) mobile, 4xl (96px) desktop
- Max-width: 50-100% depending on layout
- Left-aligned text (playful tone)

**Image Treatment**
- Object-fit: cover (full bleed)
- Aspect ratio: Full height to width
- NO overlays, NO gradient wash (CMS contract locked)
- Rotation: 6 seconds per image with crossfade
- Image quality: 1920×1080 minimum

**Text Styling** (from design_guidelines)
- Destination name (H1): White text, large size, bold
- Tagline (subtitle): White text, 20px, light opacity (0.9)
- Spacing between destination and tagline: md (16px)
- All text white regardless of dark/light mode (hero is dark)

**Z-index**: Image layer 0, text overlay 10

**Interactive Elements**
- Header transitions to scrolled state (white background, dark text)
- Logo inverts on hero (white) when not scrolled
- Nav text white while on hero, changes on scroll
- Smooth 500ms transitions

---

### 2. Categories Browse Section

**Purpose**: Show 6 content type categories (destinations, hotels, attractions, restaurants, neighborhoods, articles)

**Container** (Standard Section from component-visual-design)
- Horizontal padding: lg (24px) mobile → xl (32px) desktop
- Vertical padding: xl (32px) top/bottom
- Max-width: 1280px (centered)
- Background: Card neutral (white light mode, dark blue-gray dark mode)
- No border, no rounded corners on section itself

**Layout Structure**
- Grid: 1 column mobile, 2 columns tablet (640px-1024px), 3 columns desktop (1024px+)
- Gap: md (16px) mobile, lg (24px) tablet/desktop
- Responsive breakpoints follow visual-foundations

**Section Heading** (Before grid)
- Style: H2 (48px desktop, 30px mobile) from design_guidelines
- Color: Text Primary
- Margin bottom: xl (32px) from heading to grid
- Font: Chillax (bold)
- Content: "Explore Content" or "How to Travel Smarter"

**Each Category Card** (Item Card from component-visual-design)
- **Image**:
  - Aspect ratio: 4:3 (landscape)
  - Height: auto (calculated)
  - Object-fit: cover
  - No overlay, no gradient (CMS contract)
  - Full color (no desaturation)

- **Interior Content**:
  - Padding: lg (24px)
  - Background: Card neutral
  - Border-radius: lg (16px)
  - Title: Text Primary, H3 size (24px desktop, 20px mobile)
  - Description: Text Secondary, 16px, 2-line clamp
  - CTA text: Brand purple, smaller text

- **Shadows**:
  - Resting: Light shadow
  - Hover: Medium shadow (transition 200-300ms)
  - No color changes on hover

- **States**:
  - Default: Full color
  - Hover: Medium shadow only
  - No elevation scale changes

**Spacing Rules**
- Between cards (grid): md/lg gap (see breakpoints)
- Card interior: lg padding (24px)
- Image to title: md (16px) [created by padding]
- Title to description: sm (8px)
- Description to CTA: md (16px)

**Color Application**
- Light mode: White cards, dark text, purple links
- Dark mode: Dark blue-gray cards, white text, purple links
- No brand color overlays on images
- Badge colors: semantic (success/warning/error) if status shown

---

### 3. Popular Destinations Grid Section

**Purpose**: Showcase featured destinations in a browsable grid

**Container** (Featured/Card-Based Section)
- Horizontal padding: lg-xl (24-32px)
- Vertical padding: xl (32px)
- Background: Section background (white/dark)
- Max-width: 1280px
- No rounded corners on container

**Section Heading**
- H2: "Popular Destinations" or "Travel Inspiration Awaits"
- Color: Text Primary
- Margin bottom: xl (32px)

**Grid Layout** (Standard Grid from component-visual-design)
- Mobile (< 640px): 1 column
- Tablet (640px-1024px): 2 columns
- Desktop (1024px+): 3-4 columns
- Gap: md (16px) mobile, lg (24px) tablet+
- Responsive: Smooth transitions at breakpoints

**Destination Card Component** (from component-visual-design)
- **Image**:
  - Aspect ratio: 4:3
  - Full color, no overlay
  - Object-fit: cover
  - Border-radius: lg (16px) on card

- **Content**:
  - Padding: lg (24px)
  - Title: Text Primary, H3 (24px)
  - Metadata: Region (Text Secondary), Climate (Text Muted), Known for (Text Secondary)
  - Spacing: md (16px) between title and metadata

- **Elevation**:
  - Resting: Light shadow
  - Hover: Medium shadow

- **Accent**:
  - Optional: 1px accent bar bottom (brand purple or pink)
  - Only if destination is highlighted/featured

**Playful Touch**
- Slight hover brightening (+5% optional)
- Smooth transitions (200-300ms)
- No jarring color changes (elevation only)

---

### 4. Featured Articles Section

**Purpose**: Showcase travel articles and guides

**Container** (Standard Section)
- Same padding and sizing as destinations section
- Background: Section background

**Section Heading**
- H2: "Travel Stories & Guides" or "Learn & Explore"
- Color: Text Primary
- Margin bottom: xl (32px)

**Grid Layout** (Standard Grid)
- Mobile: 1 column
- Tablet: 2 columns
- Desktop: 2-3 columns (slightly wider cards)
- Gap: md/lg (16-24px)

**Article Card Component** (from component-visual-design)
- **Image**:
  - Aspect ratio: 16:9 (wider for editorial)
  - No overlay or gradient
  - Object-fit: cover
  - Border-radius: lg (16px)

- **Content** (Interior padding: lg):
  - Title: H3 (24px), 2-line clamp, Text Primary
  - Excerpt: Text Secondary, 2-line clamp, 16px
  - Metadata: Date + Category (Text Muted, smaller)
  - Category badge: Brand purple text (no background)

- **Shadows**:
  - Resting: Light
  - Hover: Medium

- **Color**:
  - Light mode: White background
  - Dark mode: Dark blue-gray background
  - Published indicator: Green (success) if shown

---

### 5. World Regions Section

**Purpose**: Show regional content groupings (Europe, Asia, Americas, etc.)

**Container** (Featured/Card Section)
- Same padding and max-width as previous sections
- Background: Section background
- Vertical spacing from previous section: 2xl (48px)

**Section Heading**
- H2: "Explore by Region" or "The World Awaits"
- Margin bottom: xl (32px)

**Grid Layout**
- Mobile: 1 column
- Tablet: 2 columns
- Desktop: 3 columns
- Gap: lg (24px)

**Region Card**
- **Image**: 4:3 aspect, no overlay
- **Content**: lg padding (24px)
- **Title**: H3, Text Primary
- **Description**: Text Secondary, 2-line clamp
- **Shadows**: Light → Medium progression
- **Border-radius**: lg (16px)

**Playful Element**
- Emoji or icon next to region name (optional, non-CMS locked)
- Upbeat copy reflecting regional character (young, smart tone)

---

### 6. Seasonal Content Section

**Purpose**: Guide travel by season

**Container** (Standard Section)
- Padding: xl (32px)
- Background: Accent section (subtle elevated background - optional light tint)
- Vertical spacing: 2xl (48px) from previous

**Section Heading**
- H2: "Travel by Season" or "Plan Your Adventure"
- Margin bottom: xl (32px)

**Grid Layout**
- Mobile: 1 column
- Tablet: 2 columns
- Desktop: 4 columns (one per season)
- Gap: lg (24px)

**Season Card**
- **Structure**: Simpler than standard cards (focus on season concept)
- Icon: Large season icon (Snowflake, Leaf, Sun, Cloud)
- Title: H4 (20px), Text Primary
- Description: Text Secondary, 2-line clamp
- CTA link: Brand purple

- **Styling**:
  - Border-radius: lg (16px)
  - Shadow: Light
  - Background: Card neutral
  - No image (icon-only)

- **Spacing**:
  - Icon to title: md (16px)
  - Title to description: sm (8px)
  - Padding: lg (24px)

---

### 7. Features/How It Works Section

**Purpose**: Show TRAVI's main features (young, playful tone)

**Container** (Standard Section)
- Padding: xl (32px)
- Background: White/dark (section background)
- Vertical spacing: 2xl (48px)

**Section Heading**
- H2: "Why Choose TRAVI?" or "Travel Smarter"
- Playful subheading: "No corporate nonsense. Just honest travel info."
- Margin bottom: xl (32px)

**Grid Layout**
- Mobile: 1 column
- Tablet: 2 columns
- Desktop: 3 columns
- Gap: lg (24px)

**Feature Card** (Simple layout, no image)
- **Icon**: Brand purple or gradient
- **Title**: H4, Text Primary
- **Description**: Text Secondary, 2-3 lines
- **Padding**: md (16px)
- **Border-radius**: lg (16px)
- **Shadow**: Light
- **No CTA** (informational only)

**Spacing**
- Icon to title: md (16px)
- Title to description: sm (8px)
- Content padding: md (16px)

---

### 8. FAQ Section

**Purpose**: Answer common questions

**Container** (Standard Section)
- Padding: xl (32px)
- Background: White/dark
- Vertical spacing: 2xl (48px)

**Section Heading**
- H2: "Frequently Asked Questions"
- Margin bottom: xl (32px)

**Layout**
- Single column (full width)
- Max-width: 800px (narrower for readability)
- Centered

**Accordion Items**
- Using shadcn Accordion component
- Each item: Trigger (H4, Text Primary) + Content (body text, Text Secondary)
- Border-radius: lg (16px) per item
- Background: Card neutral
- Spacing: md (16px) between items

**Color**:
- Light mode: White background, dark text
- Dark mode: Dark blue-gray background, light text
- No fancy colors (neutral design)

---

### 9. Footer Section

**Purpose**: Navigation and legal

**Container**
- Full width (100%)
- Background: Dark (or slightly offset from page background)
- Padding: xl-2xl (32-48px) horizontal, 2xl (48px) vertical
- No border-radius (extends to edge)

**Layout**
- Desktop: 4-5 columns (footer links)
- Mobile: Single column, stacked
- Gap: xl (32px)

**Content Groups**
- Logo/branding
- Quick links (Destinations, Hotels, Attractions, etc.)
- Social links
- Legal/copyright

**Text Colors**:
- Light mode: Text Muted (lighter gray)
- Dark mode: Text Secondary (light gray)
- Links: Brand purple (hover brighter)

---

## Spacing Rhythm (Page-Level)

**Vertical Spacing Between Sections** (Consistent throughout)
- Between major sections: 2xl (48px)
- Between subsections: xl (32px)
- At top/bottom of page: xl-2xl (32-48px)

**Horizontal Spacing** (Consistent throughout)
- All sections: Responsive padding rules (lg-xl per side)
- All grids: md/lg gaps (16-24px)
- All cards: lg interior padding (24px)

**Rhythm**
- Every element respects spacing scale (no random pixel values)
- Consistent gap sizes across all grids
- Consistent padding in all cards
- Creates visual harmony and predictable flow

---

## Color Scheme Application

**Overall Page**
- Light mode: White backgrounds (#FFFFFF)
- Dark mode: Deep purple-black backgrounds (hsl 269 61% 8%)

**Text Hierarchy**
- Headings: Text Primary (dark in light mode, white in dark mode)
- Body text: Text Primary (headings), Text Secondary (descriptions)
- Metadata: Text Muted (tertiary info)

**Cards**
- Background: Card neutral (white/dark)
- No brand color overlays
- Shadows: Light → Medium progression
- Accent bars: Optional brand colors (purple/pink)

**Status Indicators**
- Available: Success green (#02A65C)
- Coming soon: Warning yellow (#F4C542)
- Featured: Brand purple (#7B4BA4)
- New: Info cyan (#01BEFF)

**Links**
- Color: Brand purple (#7B4BA4)
- Hover: Slightly brighter purple
- No underline (hover brightens)

---

## Responsive Behavior

**Mobile First** (< 640px)
- Single column layouts
- lg padding (24px) per side
- md gaps (16px)
- Hero: 60vh minimum
- Text: Smaller (h3 → 20px, h4 → 18px)
- Touch targets: 44px minimum

**Tablet** (640px - 1024px)
- 2-column grids
- lg padding (24px)
- lg gaps (24px)
- Hero: 70vh minimum

**Desktop** (1024px+)
- 3-4 column grids
- xl padding (32px)
- lg gaps (24px)
- Hero: 80vh minimum
- Max-width constraints (1280px)

**Smooth Transitions**
- No jarring breakpoint changes
- Consider fluid spacing where appropriate
- Consistent visual rhythm across all sizes

---

## Motion & Interactions

**Scroll Animations**
- Hero: Parallax effect (image scales on scroll)
- Sections: Fade-in on scroll (800ms duration)
- Stagger: 50-100ms between items in grid

**Hover States**
- Cards: Shadow elevation (Light → Medium)
- No color changes on hover
- Smooth 200-300ms transitions
- Optional: +5% image brightness

**Header Transitions**
- Smooth 500ms transition on scroll
- Logo and nav text color changes

**No Excessive Animation**
- Keep young/playful but not distracting
- Respect prefers-reduced-motion
- Smooth, confident movements (not bouncy)

---

## Accessibility Checks

✓ Color contrast: All text meets WCAG AA (4.5:1)  
✓ Touch targets: All interactive elements ≥ 44px  
✓ Focus states: Visible focus ring (brand purple)  
✓ Skip links: Navigation accessible via keyboard  
✓ Alt text: All images have descriptive alt text  
✓ ARIA labels: Icon-only buttons have labels  
✓ Reduced motion: Respects prefers-reduced-motion  
✓ Semantic HTML: Proper heading hierarchy  

---

## Implementation Notes

**Component Reuse**
- Use existing shadcn/ui components (Button, Card, Badge, Input, Accordion)
- Use existing layout components (Section Container, Grid layouts)
- Apply color tokens from design_guidelines.md (no new colors)

**No New Systems**
- All spacing from visual-foundations tokens
- All card styling from component-visual-design rules
- All colors from component-color-application rules
- All layout patterns from existing component definitions

**Testing Checklist**
- [ ] All spacing uses scale tokens only
- [ ] All cards use lg border-radius
- [ ] All sections use section padding rules
- [ ] All grids use md/lg gaps
- [ ] Light/dark mode works perfectly
- [ ] Mobile responsive at all breakpoints
- [ ] No new color tokens created
- [ ] Focus states visible
- [ ] Touch targets ≥ 44px
- [ ] All alt text present
- [ ] Playful tone (not corporate)

---

## Brand Tone Implementation

**Young, Smart, Playful** (Throughout)
- Language: Conversational, friendly, not stiff
- Design: Clean but approachable, not minimal
- CTA copy: Action-oriented, exciting ("Explore," "Discover," not "Learn More")
- Spacing: Generous and breathing, not cramped
- Motion: Confident and smooth, not frenetic

**NOT Corporate**
- No heavy formal language
- No stuffy design patterns
- No excessive branding
- No corporate color gradients (keep neutral)
- No overly complex layouts

---

## Next Implementation Steps

1. Build hero section with rotating images
2. Add category browse grid with item cards
3. Add destinations grid with destination cards
4. Add featured articles section with article cards
5. Add regions section
6. Add seasonal section
7. Add features/how it works
8. Add FAQ accordion
9. Add footer
10. Test responsive behavior
11. Verify dark mode
12. Test accessibility
13. Validate against all locked design systems
