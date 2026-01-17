# TRAVI News Portal V2 - Design Specification

## Overview
A fun, vibrant travel news portal with playful energy and TRAVI brand colors.

---

## Vibe & Feeling
- **Adventurous** - Makes you want to pack your bags
- **Playful** - Not serious news, fun travel content
- **Energetic** - Vibrant colors, bold typography
- **Inviting** - Warm and welcoming

---

## Color Palette

### Primary Colors (TRAVI Brand)
| Name | Hex | Usage |
|------|-----|-------|
| Midnight Indigo | #0B0A1F | Main background |
| TRAVI Purple | #6443F4 | Primary accent, CTAs |
| TRAVI Pink | #E84C9A | Secondary accent, highlights |
| Pure White | #FFFFFF | Text, cards |

### Extended Palette
| Name | Hex | Usage |
|------|-----|-------|
| Purple Light | #8B6AF6 | Category cards variant |
| Pink Light | #F472B6 | Category cards variant |
| Purple Glow | #6443F4/40 | Hover effects, glows |
| Warm Yellow | #F4C542 | Breaking news ticker |

### Gradients
```
Ticker: linear-gradient(90deg, #6443F4, #E84C9A)
Hero Overlay: linear-gradient(to-top, #0B0A1F/90, transparent)
Card Glow: radial-gradient(#6443F4/30, transparent)
```

---

## Typography

### Headlines (Chillax Display)
- **Hero Title**: 64-96px, Bold, tight tracking
- **Section Title**: 48px, Bold
- **Card Title**: 24-32px, Semibold

### Body (Satoshi)
- **Large**: 20px
- **Regular**: 16px
- **Small/Caption**: 14px

### Style Notes
- Headlines should feel magazine-bold but playful
- NOT newspaper serious - more travel magazine vibe
- Can use varying weights for emphasis

---

## Sections Layout

### 1. Breaking News Ticker
```
┌──────────────────────────────────────────────────────────────┐
│ ⚡ NEW: Hidden Beach in Bali • Dubai's Newest Rooftop Bar • │
└──────────────────────────────────────────────────────────────┘
```
- **Height**: 48px
- **Background**: Purple-Pink gradient
- **Text**: White, scrolling animation
- **Speed**: Smooth, not too fast

---

### 2. Hero Section (Bento Style)
```
┌─────────────────────────────────┬────────────────────┐
│                                 │                    │
│     MAIN FEATURED STORY         │   STORY 2          │
│     Big bold headline           │                    │
│     on stunning image           ├────────────────────┤
│                                 │                    │
│                                 │   STORY 3          │
│                                 │                    │
└─────────────────────────────────┴────────────────────┘
```
- **Main Card**: 60% width, full height
- **Side Cards**: 40% width, stacked
- **Images**: Full bleed with gradient overlay
- **Headlines**: Bold white text on image
- **Category Badge**: Purple/Pink pill

---

### 3. Top Stories (Colorful Cards)
```
┌────────────┬────────────┬────────────┬────────────┐
│            │            │            │            │
│  BEACHES   │  CULTURE   │  FOOD      │  ADVENTURE │
│            │            │            │            │
│  Purple    │  Pink      │  Purple    │  Pink      │
│  Card      │  Card      │  Light     │  Light     │
│            │            │            │            │
│  Bold      │  Bold      │  Bold      │  Bold      │
│  Headline  │  Headline  │  Headline  │  Headline  │
│            │            │            │            │
└────────────┴────────────┴────────────┴────────────┘
```
- **Grid**: 4 columns desktop, 2 mobile
- **Card Colors**: Rotating TRAVI palette
  - #6443F4 (Purple)
  - #E84C9A (Pink)
  - #8B6AF6 (Purple Light)
  - #F472B6 (Pink Light)
- **Typography**: HUGE bold headlines, condensed
- **Category**: Small label above headline
- **Description**: 2 lines max, white/80

---

### 4. Trending Section
```
Section Title: "TRENDING 🔥" (or travel icon)

┌────────────────┬────────────────┬────────────────┐
│    [IMAGE]     │    [IMAGE]     │    [IMAGE]     │
│                │                │                │
│  Destination   │  Destination   │  Destination   │
│  Title         │  Title         │  Title         │
│                │                │                │
│  👁 12.5K      │  👁 8.2K       │  👁 6.1K       │
│  Jan 5, 2026   │  Jan 4, 2026   │  Jan 3, 2026   │
└────────────────┴────────────────┴────────────────┘
```
- **Background**: Dark (#0B0A1F) with subtle purple gradient
- **Cards**: Image on top, info below
- **Hover**: Purple glow effect, slight scale
- **Icons**: Playful travel icons (camera, backpack, plane)
- **Stats**: Views count, date - simple, clean

---

### 5. Latest News Grid
```
┌──────────────────┬──────────────────┬──────────────────┐
│                  │                  │                  │
│   Article Card   │   Article Card   │   Article Card   │
│                  │                  │                  │
├──────────────────┼──────────────────┼──────────────────┤
│                  │                  │                  │
│   Article Card   │   Article Card   │   Article Card   │
│                  │                  │                  │
└──────────────────┴──────────────────┴──────────────────┘
```
- **Grid**: 3 columns desktop, 1 mobile
- **Cards**: Image + Title + Excerpt + Meta
- **Style**: Clean, white cards on dark background
- **Hover**: Lift effect with purple glow

---

## Interactive Elements

### Buttons
- **Primary**: Purple gradient, white text, rounded-xl
- **Secondary**: Outline, purple border, transparent bg
- **On hover**: Slight glow, scale 1.02

### Cards Hover
- Scale: 1.03
- Glow: Purple/Pink shadow
- Image: Zoom 1.05
- Transition: 300ms ease

### Animations
- **Ticker**: Continuous scroll
- **Cards**: Fade up on scroll (stagger 100ms)
- **Hero**: Parallax on scroll
- **All**: Respect prefers-reduced-motion

---

## Playful Elements

### Icons (Lucide React)
- 📍 MapPin - Destinations
- 🎒 Backpack - Adventures  
- 📷 Camera - Photo Stories
- ✈️ Plane - Travel News
- 🍜 Utensils - Food
- 🏖️ Umbrella - Beaches

### Section Titles with Icons
- "TRENDING 🔥"
- "TOP STORIES 🌍"
- "LATEST ✨"

### Fun Touches
- Colorful category cards
- Playful hover animations
- Travel-themed icons
- Warm, inviting imagery

---

## Mobile Responsive

### Breakpoints
- **Desktop**: 1024px+
- **Tablet**: 768-1023px
- **Mobile**: <768px

### Mobile Adjustments
- Hero: Stack vertically
- Top Stories: 2 columns, then 1
- Cards: Full width
- Typography: Scale down 20-30%
- Ticker: Slower scroll speed

---

## Example Content Tone

### Headlines (Fun, Not Serious)
✅ "Bali's Hidden Beaches You Need to See"
✅ "Tokyo's Best Street Food Spots"
✅ "Dubai Just Got Even More Amazing"

❌ "Travel Advisory Update for Region"
❌ "Tourism Statistics Q4 Report"

### Categories
- Beaches
- Adventures
- Culture
- Food & Drink
- City Guides
- Hidden Gems

---

## Summary

This News Portal V2 should feel like:
- A **travel magazine** you want to flip through
- An **adventure waiting to happen**
- **Fun and inspiring**, not dry news
- **Premium** but **approachable**
- **TRAVI branded** with purple/pink palette
