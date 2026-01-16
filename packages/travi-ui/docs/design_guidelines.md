# TRAVI Category Pages Design System
## Premium Travel Editorial Experience

---

## Design Philosophy

TRAVI category pages (Hotels, Attractions, Dining, Things to Do, Guides) embody **Premium Editorial Magazine** aesthetics with cinematic motion and immersive storytelling. The design combines Apple's spatial polish, high-fashion editorial layouts, and scroll-driven narratives.

**Core Principles:**
- Photography and video-first immersion
- Asymmetric layouts that feel curated, not templated
- Cinematic depth through layering and parallax
- Magazine-quality typography hierarchy
- Premium spacing with generous breathing room

---

## Color Palette

### Primary Colors
- **TRAVI Purple**: #6443F4 (primary brand, CTAs, interactive elements)
- **TRAVI Pink**: #E84C9A (accents, gradients, highlights)
- **Midnight Indigo**: #0B0A1F (backgrounds, depth)
- **Pure White**: #FFFFFF (text on dark, cards)

### Gradients
```
Primary Brand Gradient: from-[#6443F4] to-[#E84C9A]
Primary Hero Overlay: from-[#0B0A1F]/90 via-[#0B0A1F]/60 to-transparent
Glow Effect: from-[#6443F4]/40 via-[#E84C9A]/30 to-transparent (blur-2xl)
```

### Semantic
- Success: #02A65C
- Warning: #F4C542
- Error: #FF4F9A
- White/90 for glass cards on dark backgrounds

---

## Typography

### Font Families
- **Headlines**: Chillax Display (tight -0.03em tracking)
- **Body**: Satoshi Variable (400-700 weights)
- **Mono**: JetBrains Mono (metadata, tags)

### Hierarchy
| Element | Size (Desktop) | Size (Mobile) | Weight | Line Height |
|---------|---------------|---------------|--------|-------------|
| Hero Display | 96px (text-8xl) | 48px (text-5xl) | 700 | 1.05 |
| Section Title | 64px (text-6xl) | 36px (text-4xl) | 700 | 1.1 |
| Card Headline | 32px (text-3xl) | 24px (text-2xl) | 600 | 1.2 |
| Body Large | 20px (text-xl) | 18px (text-lg) | 400 | 1.6 |
| Body | 16px (text-base) | 16px | 400 | 1.6 |
| Caption | 14px (text-sm) | 14px | 500 | 1.4 |

---

## Layout System

### Spacing Primitives
Use Tailwind units: **2, 4, 8, 12, 16, 24, 32**
- Component gaps: 4, 8
- Card padding: 8, 12, 16
- Section spacing: 24, 32 (py-24, py-32)
- Major divisions: 32+ for desktop

### Container Strategy
- Max width: 1440px (max-w-7xl)
- Side padding: px-6 mobile, px-12 desktop
- Content max-width for text: max-w-3xl

---

## Hero Section: Split-Screen Immersive

**Layout**: Two-column split (40/60 on desktop, stacked on mobile)

**Left Column (Narrative)**:
- Background: Midnight indigo (#0B0A1F)
- Sticky positioning during scroll
- Typography-driven hierarchy:
  - Category label (HOTELS / ATTRACTIONS) - Amber, uppercase, letter-spacing wide
  - Display headline - Chillax Display, 96px desktop
  - Subtitle/description - Satoshi, 20px, white/80
- Primary CTA button with amber-to-magenta gradient, blurred background (backdrop-blur-md bg-white/10)
- Destination count badge with magenta glow

**Right Column (Visual Canvas)**:
- Full-bleed video or image carousel
- Layered depth: Background video + floating destination chips with glassmorphism
- Parallax scroll: Background moves slower (0.5x), chips move faster (1.2x)
- Gradient overlay: from-[#0B0A1F]/40 to transparent
- Floating chips: City names with thumbnail images, white/90 backdrop-blur, rounded-2xl, hover scale

**Height**: 100vh desktop, 80vh mobile

---

## Bento Grid Tapestry Section

**Apple-style asymmetric grid** with intentional hierarchy:

**Grid Structure** (desktop: grid-cols-12, gap-6):
1. **Spotlight Macro-Card** (col-span-7, row-span-2):
   - Large destination image (aspect-ratio 16/10)
   - Gradient overlay from bottom
   - Headline overlaid in white, 48px
   - Location badge, price indicator
   - Hover: Image scales 1.05, glow effect appears

2. **Medium Experiential Tiles** (2 cards, col-span-5):
   - Stacked vertically
   - Landscape images (4/3 ratio)
   - Category icon + title + short description
   - Glass card effect: bg-white/10, backdrop-blur-md

3. **Utility Micro-Cards** (3 cards, col-span-4 each):
   - Horizontal row below main grid
   - Icon + stat + label
   - Subtle borders, no background
   - Magenta accent on hover

**Mobile**: Stack all cards to single column, maintain visual hierarchy

---

## Editorial Magazine Flow

**Alternating Split Spreads**:
- Pattern: Image-left/Text-right, then Text-left/Image-right
- Each spread: grid-cols-2, gap-24, min-h-screen/2
- Images: Overflow rounded corners (rounded-3xl), shadow-2xl
- Text blocks: max-w-xl, Satoshi body with Chillax headlines
- Pull quotes in amber with magenta accent border-l-4

**Traveler Journey Timeline**:
- Vertical center line with amber/magenta gradient
- Milestone cards alternate sides
- Each card: Image thumbnail + headline + timestamp
- Connecting dots with glow effect
- Sticky section title at top

**"Local Lens" Scroll-Snapped Panels**:
- Container: overflow-x-auto, snap-x snap-mandatory
- Each panel: min-w-full, snap-center, h-[600px]
- Full-bleed photography with text overlay
- Frosted glass info card bottom-right
- Horizontal progress indicator (amber dots)

---

## Cinematic Scroll Effects

**Inertia Parallax**:
- Hero background: Transform Y by scrollYProgress * 100
- Floating elements: Move at varying speeds (0.3x to 1.5x)
- Text fade: Opacity decreases as hero exits viewport

**Magnetic Cursor** (desktop only):
- CTA buttons attract cursor within 120px radius
- Subtle transform toward cursor position
- Glow intensity increases on proximity

**Staggered Reveal Animations**:
- Bento grid cards: Fade up sequentially, 100ms stagger
- Timeline items: Slide in from alternating sides
- Initial state: opacity-0, translateY(40px)
- Trigger: `whileInView`, viewport once: true, 600ms duration

**Scroll Progress Indicators**:
- Thin amber line at page top, width driven by scroll
- Section anchors with magenta dots, filled on active

---

## Component Library

### Buttons
**Primary CTA**: Gradient bg (amber-to-magenta), rounded-xl, px-8 h-14, blurred background if on image (backdrop-blur-md bg-white/10), white text, shadow-lg

**Secondary**: Outline variant, border-white/20, text-white, rounded-full, hover border-amber

**Ghost**: Transparent, text-white/80, hover bg-white/10

### Cards
**Glass Card**: bg-white/10, backdrop-blur-lg, border border-white/20, rounded-2xl, shadow-xl

**Editorial Card**: bg-white, rounded-3xl, overflow-hidden, shadow-2xl, hover shadow-magenta/20

**Micro Stats Card**: border border-white/10, rounded-xl, p-6, hover border-amber

### Badges
**Category**: bg-amber/10, text-amber, rounded-full, px-4 py-1.5, uppercase, text-xs

**Location**: bg-white/90, backdrop-blur, rounded-lg, px-3 py-1, flex items-center gap-1

**Status**: bg-magenta/20, text-magenta, border border-magenta/40, rounded-full

### Navigation
**Fixed Header** (on scroll):
- bg-[#0B0A1F]/90, backdrop-blur-xl
- Logo white, nav links white/80 hover:white
- Search icon magenta
- Height: 72px, border-b border-white/10

**Category Tabs**: Horizontal scroll on mobile, flex gap-4, active tab with amber underline

---

## Images

### Hero Section
**Right Column**: Use high-quality video (MP4, looping, muted) OR image carousel with 3-5 destination images. Show vibrant cityscapes, architectural landmarks, cultural moments. Minimum 1920x1080, WebP format.

**Floating Chips**: 6-8 circular thumbnails (120x120px) of featured destinations, glassmorphic overlay.

### Bento Grid
**Spotlight Card**: Premium editorial photography, 1600x1000px, showcasing signature destination experience (e.g., rooftop pool, ancient temple, bustling market).

**Medium Tiles**: Lifestyle imagery, people experiencing destinations, 800x600px.

**Micro Cards**: Icon-based, no images required.

### Magazine Flow
**Split Spreads**: Alternating full-bleed images, 1200x900px, show local culture, hidden gems, authentic moments.

**Timeline Thumbnails**: 300x300px, key journey moments.

**Local Lens Panels**: Hero-quality images, 1920x1200px, immersive environmental shots.

### Quality Standards
- Professional travel photography, vibrant colors
- Show people, culture, authentic experiences
- Avoid touristy clichés, stock photo aesthetics
- Rich contrast, dynamic lighting

---

## Responsive Design

**Desktop (1024px+)**: Full split-screen hero, bento grid asymmetry, side-by-side spreads

**Tablet (768-1023px)**: Hero 50/50 split, bento grid simplifies to 2 columns, spreads maintain layout

**Mobile (<768px)**: Stack all layouts vertically, hero narrative on top, single-column bento, timeline vertical, snap panels remain horizontal

**Touch Targets**: Minimum 44x44px, increased spacing for mobile tap zones

---

## Accessibility

- WCAG AA contrast: White text on midnight indigo passes, amber/magenta used for accents only
- Focus rings: 2px amber outline on all interactive elements
- Reduced motion: Disable parallax/animations when `prefers-reduced-motion`
- Alt text: Descriptive for all images, include destination context
- Keyboard navigation: Fully accessible, skip links provided

---

## Performance

- Lazy load images below fold
- Video autoplay only above fold, pause on scroll exit
- Compress images to WebP, 85% quality
- Intersection Observer for scroll reveals
- Debounce parallax calculations to 16ms (60fps)