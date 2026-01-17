# TRAVI Home Page Design Baseline Document
## Single Source of Truth for All Design Decisions

---

## 1. Layout Principles

### Grid & Container
- **Max Width**: 1440px (`max-w-7xl`)
- **Side Padding**: `px-4 sm:px-6 lg:px-8` (responsive)
- **Section Spacing**: `py-12 sm:py-16 md:py-20` to `py-16 md:py-24`
- **Card Grid**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6`

### Section Structure
Each section follows this pattern:
1. Title + Subtitle header (centered or left-aligned)
2. Grid of content cards
3. Optional "View All" CTA link

---

## 2. Color Palette (Official)

### Primary Brand Colors
| Token | HSL Value | Hex | Usage |
|-------|-----------|-----|-------|
| `--travi-purple` | 251 89% 61% | #6443F4 | Primary CTAs, links, active states |
| `--travi-yellow` | 44 88% 61% | #F4C542 | Warm accents (deprecated pink) |

### Neutral Colors
| Token | Purpose |
|-------|---------|
| `--foreground` | Primary text (dark slate) |
| `--muted-foreground` | Secondary text |
| `--card` | Card backgrounds (white) |
| `--background` | Page background |

### Gradient Usage (Home Page)
```css
/* Animated headline gradient */
linear-gradient(135deg, #6443F4, #8B5CF6, #A78BFA, #F24294, #8B5CF6, #6443F4)

/* Section background gradients */
from-slate-50 to-white dark:from-slate-900 dark:to-slate-950
from-purple-50 to-pink-50 dark:from-slate-900 dark:to-slate-950

/* Decorative blobs */
from-purple-300/20 via-pink-200/10 to-transparent
from-blue-200/30 via-purple-100/20 to-transparent
```

### DEPRECATED Colors (Do Not Use)
- ❌ `#E84C9A` (TRAVI Pink) - Replaced by purple tones
- ❌ `#0B0A1F` (Midnight Indigo) - Use slate-900/950 instead
- ❌ Amber/Orange CTAs - Use TRAVI Purple

---

## 3. Typography

### Font Families
- **Headlines**: `'Chillax', var(--font-sans)` - All H1-H6 elements
- **Body**: `'Satoshi'` - Paragraphs, labels, UI text
- **Mono**: `JetBrains Mono` - Code, metadata

### Headline Hierarchy (Home Page Canonical)
| Element | Mobile | Desktop | Weight | Style |
|---------|--------|---------|--------|-------|
| Hero H1 | text-4xl sm:text-5xl | text-6xl lg:text-7xl | font-semibold | Chillax |
| Section H2 | text-2xl sm:text-3xl | md:text-4xl lg:text-5xl | font-bold | Chillax |
| Card H3 | text-base sm:text-lg | text-lg sm:text-xl | font-bold | Chillax |

### Body Text
| Type | Size | Color |
|------|------|-------|
| Hero subtitle | text-base sm:text-lg | text-slate-500 dark:text-slate-400 |
| Section subtitle | text-base sm:text-lg | text-slate-600 dark:text-slate-400 |
| Card description | text-sm | text-slate-500 |

---

## 4. Image Style

### Hero Images
- **Source**: AI-generated TRAVI mascot character illustrations
- **Alt Text Pattern**: "TRAVI travel mascot character [action] in [location]"
- **Format**: WebP, 1920x1080 minimum
- **Style**: Colorful, playful, consistent brand character

### Card Images
- **Aspect Ratio**: ~4:3 for destination cards (h-48 sm:h-56)
- **Hover Effect**: `scale-110` with 700ms transition
- **Overlay**: Gradient `from-black/50 via-transparent to-transparent` on hover
- **Loading**: `lazy`, `decoding="async"`

### Fallback
- Icon placeholder when image missing: `<MapPinned className="w-12 h-12 text-slate-300" />`

---

## 5. Component Patterns

### Buttons (CTAs)

#### Primary CTA
```jsx
<Button className="rounded-full bg-[#6443F4] hover:bg-[#5539d4] text-white gap-2">
  View All <ArrowRight className="w-4 h-4" />
</Button>
```

#### Link CTA (inline)
```jsx
<Link className="inline-flex items-center gap-2 text-[#6443F4] font-semibold hover:gap-3 transition-all">
  View All <ArrowRight className="w-4 h-4" />
</Link>
```

### Cards

#### Destination Card
```jsx
<Card className="group overflow-hidden border-0 shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white dark:bg-slate-900 h-full">
  <div className="relative h-48 sm:h-56 overflow-hidden bg-slate-100">
    <img className="transition-transform duration-700 group-hover:scale-110" />
    {/* Hover overlay with gradient */}
  </div>
  <CardContent className="p-4 sm:p-5">
    <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg mb-1">{name}</h3>
    <p className="text-sm text-slate-500">{subtitle}</p>
  </CardContent>
</Card>
```

### Badges
```jsx
<motion.div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-full border border-purple-100/50">
  <Star className="w-4 h-4 text-[#6443F4]" />
  <span className="text-xs font-semibold tracking-wide text-[#6443F4] uppercase">
    {label}
  </span>
</motion.div>
```

---

## 6. Animation Patterns

### Section Reveal
```jsx
<motion.section
  initial={{ opacity: 0, y: 60 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
>
```

### Card Stagger
```jsx
<motion.article
  initial={{ opacity: 0, y: 30 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.5, delay: index * 0.05 }}
>
```

### Decorative Blobs
- Float animation: `scale: [1, 1.1, 1], opacity: [0.3, 0.4, 0.3]`
- Duration: 8-10s, infinite, easeInOut
- Pointer-events: none
- blur-3xl

---

## 7. Mood & Tone

### Visual Mood
- **Friendly & Approachable**: Mascot illustrations, playful animations
- **Clean & Modern**: White cards, minimal shadows, generous spacing
- **Professional**: Consistent typography, structured grids
- **Trustworthy**: Stats badges, "Trusted by X travelers" messaging

### Tone of Voice
- Headlines: Short, action-oriented ("Your Trusted Travel Resource")
- Subtitles: Informative, specific numbers ("16 destinations", "3,000+ attractions")
- CTAs: Simple verbs ("Explore", "View All", "Discover")
- No marketing fluff or excessive adjectives

---

## 8. Navigation

### Desktop Header
```jsx
<header className="fixed top-0 left-0 right-0 z-50 bg-[#6443F4] transition-all duration-300">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <nav className="flex items-center gap-6">
      {/* Links: text-white/70 hover:text-white */}
    </nav>
  </div>
</header>
```

### Mobile Menu
- Sheet component, slides from right
- Background: `bg-[#6443F4]`
- Links: `text-white/70 hover:text-white hover:bg-white/10`

---

## 9. Icon Usage

### Approved Icon Library
- **Primary**: Lucide React only
- **Company Logos**: react-icons/si (e.g., SiTiktok)

### Icon Sizing
- Inline with text: `w-4 h-4`
- Card icons: `w-5 h-5`
- Hero stats: `w-3 h-3` to `w-4 h-4`
- Placeholder icons: `w-12 h-12`

---

## 10. Dark Mode

### Surface Colors
- Card: `bg-white dark:bg-slate-900`
- Section background: `bg-slate-50 dark:bg-slate-900`
- Page background: `from-slate-50 to-white dark:from-slate-900 dark:to-slate-950`

### Text Colors
- Primary: `text-slate-900 dark:text-white`
- Secondary: `text-slate-600 dark:text-slate-400`
- Muted: `text-slate-500`

---

## 11. Accessibility Standards

- Skip link present
- aria-labels on interactive elements
- aria-hidden on decorative icons
- data-testid on key interactive elements
- Semantic HTML (main, section, article, nav)

---

## Violations to Look For

When auditing pages against this baseline, flag:

1. **Color Violations**
   - Use of deprecated TRAVI Pink (#E84C9A)
   - Use of Midnight Indigo (#0B0A1F) for backgrounds
   - Amber/orange CTAs instead of TRAVI Purple
   - Non-brand gradients

2. **Typography Violations**
   - Non-Chillax headlines
   - Incorrect font sizes
   - Wrong font weights

3. **Component Violations**
   - Non-standard card patterns
   - Different button styles
   - Inconsistent badge designs

4. **Layout Violations**
   - Different grid structures
   - Inconsistent spacing
   - Non-responsive designs

5. **Image Style Violations**
   - Stock photography vs mascot illustrations
   - Missing hover effects
   - Wrong aspect ratios

6. **Animation Violations**
   - Different animation curves
   - Missing viewport triggers
   - Jarring transitions

---

*Document Version: 1.0*
*Created: 2026-01-14*
*Based on: homepage-new.tsx, design_guidelines.md, index.css*
