# TRAVI Design System

A warm, cinematic, editorial design system for TRAVI — the AI-powered travel platform.

---

## Color Palette

### Brand Colors

| Token                | HSL         | Hex       | Usage                                    |
| -------------------- | ----------- | --------- | ---------------------------------------- |
| `--travi-terracotta` | 15 72% 55%  | `#D4704A` | Primary CTA, booking buttons, links      |
| `--travi-amber`      | 36 90% 55%  | `#E8A020` | Highlights, badges, golden-hour accents  |
| `--travi-olive`      | 150 25% 40% | `#4D8066` | Secondary actions, nature/eco indicators |
| `--travi-teal`       | 185 55% 35% | `#28808C` | Informational, map elements, ocean cues  |
| `--travi-sand`       | 38 35% 85%  | `#DDD4C4` | Light backgrounds, subtle cards          |
| `--travi-cream`      | 40 40% 95%  | `#F7F3EC` | Page background, warm off-white          |

### Semantic Colors (Light Mode)

| Token           | HSL         | Role                         |
| --------------- | ----------- | ---------------------------- |
| `--background`  | 40 30% 98%  | Page background (warm)       |
| `--foreground`  | 25 20% 15%  | Primary text (warm charcoal) |
| `--primary`     | 15 72% 55%  | Main CTA (terracotta)        |
| `--secondary`   | 150 15% 93% | Secondary surfaces           |
| `--accent`      | 36 85% 95%  | Highlight surfaces (amber)   |
| `--muted`       | 35 12% 92%  | Disabled/muted surfaces      |
| `--destructive` | 0 72% 55%   | Error states                 |

### Semantic Colors (Dark Mode)

| Token           | HSL        | Role                        |
| --------------- | ---------- | --------------------------- |
| `--background`  | 25 25% 8%  | Page background (warm dark) |
| `--foreground`  | 35 15% 92% | Primary text (warm light)   |
| `--primary`     | 15 72% 58% | Main CTA (brighter terra.)  |
| `--secondary`   | 25 15% 18% | Secondary surfaces          |
| `--accent`      | 36 50% 18% | Highlight surfaces          |
| `--muted`       | 25 15% 15% | Disabled/muted surfaces     |
| `--destructive` | 0 72% 60%  | Error states                |

### Warm Neutrals

| Token                      | HSL        | Usage        |
| -------------------------- | ---------- | ------------ |
| `--travi-neutral-black`    | 25 20% 10% | Deepest dark |
| `--travi-neutral-gray-100` | 25 15% 15% | Very dark    |
| `--travi-neutral-gray-75`  | 25 10% 35% | Dark gray    |
| `--travi-neutral-gray-50`  | 30 8% 60%  | Medium gray  |
| `--travi-neutral-gray-25`  | 35 10% 82% | Light gray   |

---

## Typography

### Fonts

- **Headlines**: Chillax (variable weight, 100-900)
- **Body / UI**: Satoshi (400, 500, 700)

### Scale

| Token        | Size     | Line Height | Letter Spacing | Weight | Usage                    |
| ------------ | -------- | ----------- | -------------- | ------ | ------------------------ |
| `display-xl` | 4.5rem   | 1.1         | -0.02em        | 700    | Hero headlines           |
| `display`    | 3.5rem   | 1.15        | -0.02em        | 600    | Section headlines        |
| `headline`   | 2.25rem  | 1.2         | -0.01em        | 600    | Page titles              |
| `title`      | 1.5rem   | 1.3         | -0.01em        | 600    | Card titles, subtitles   |
| `body-lg`    | 1.125rem | 1.6         | normal         | 400    | Lead paragraphs          |
| `body`       | 1rem     | 1.6         | normal         | 400    | Default body text        |
| `caption`    | 0.875rem | 1.5         | normal         | 400    | Metadata, labels         |
| `overline`   | 0.75rem  | 1.4         | 0.05em         | 600    | Section labels, eyebrows |

### Responsive Scaling (below 768px)

| Token        | Desktop | Mobile  |
| ------------ | ------- | ------- |
| `display-xl` | 4.5rem  | 2.5rem  |
| `display`    | 3.5rem  | 2rem    |
| `headline`   | 2.25rem | 1.5rem  |
| `title`      | 1.5rem  | 1.25rem |

### Usage Rules

- Headlines always use `font-family: Chillax`
- Body text always uses `font-family: Satoshi`
- Never use Chillax below the `title` size
- Use `overline` with `text-transform: uppercase` for section labels

---

## Spacing System

Based on a **4px grid** for consistent vertical rhythm.

| Token        | Value   | Pixels | Usage                      |
| ------------ | ------- | ------ | -------------------------- |
| `--space-1`  | 0.25rem | 4px    | Tight inline spacing       |
| `--space-2`  | 0.5rem  | 8px    | Icon gaps, tight padding   |
| `--space-3`  | 0.75rem | 12px   | Small padding, form gaps   |
| `--space-4`  | 1rem    | 16px   | Default padding            |
| `--space-6`  | 1.5rem  | 24px   | Card padding, section gaps |
| `--space-8`  | 2rem    | 32px   | Large card padding         |
| `--space-12` | 3rem    | 48px   | Section spacing            |
| `--space-16` | 4rem    | 64px   | Large section spacing      |
| `--space-24` | 6rem    | 96px   | Hero section padding       |
| `--space-32` | 8rem    | 128px  | Maximum vertical space     |

### Tailwind Custom Spacing

| Class  | Value  | Usage                  |
| ------ | ------ | ---------------------- |
| `p-18` | 4.5rem | Between standard 16/20 |
| `p-22` | 5.5rem | Between standard 20/24 |
| `p-30` | 7.5rem | Between standard 28/32 |
| `p-34` | 8.5rem | Between standard 32/36 |

---

## Border Radius

| Token  | Value   | Pixels | Usage                      |
| ------ | ------- | ------ | -------------------------- |
| `sm`   | 0.25rem | 4px    | Small inputs, chips        |
| `md`   | 0.5rem  | 8px    | Buttons, form elements     |
| `lg`   | 0.75rem | 12px   | Cards, panels              |
| `xl`   | 1rem    | 16px   | Large cards, modals        |
| `2xl`  | 1.5rem  | 24px   | Hero cards, feature panels |
| `full` | 999px   | pill   | Avatars, pills, tags       |

### Mixed Radius Pattern

Cards may combine sharp and rounded corners for editorial feel:

```css
border-radius: 0 1rem 1rem 0; /* sharp left, rounded right */
```

---

## Shadow System

### Light Mode (Warm Shadows)

All light-mode shadows use `rgba(60, 40, 20, ...)` for warmth.

| Token          | Value                               | Usage                |
| -------------- | ----------------------------------- | -------------------- |
| `--shadow-2xs` | 0px 2px 4px rgba(60, 40, 20, 0.04)  | Subtle hover states  |
| `--shadow-xs`  | 0px 2px 4px rgba(60, 40, 20, 0.06)  | Resting cards        |
| `--shadow-sm`  | 0px 2px 6px rgba(60, 40, 20, 0.08)  | Buttons, small cards |
| `--shadow`     | 0px 4px 12px rgba(60, 40, 20, 0.08) | Default elevation    |
| `--shadow-md`  | 0px 4px 12px rgba(60, 40, 20, 0.1)  | Hover cards          |
| `--shadow-lg`  | 0px 6px 20px rgba(60, 40, 20, 0.12) | Popups, dropdowns    |
| `--shadow-xl`  | 0px 8px 28px rgba(60, 40, 20, 0.15) | Modals               |
| `--shadow-2xl` | 0px 12px 40px rgba(60, 40, 20, 0.2) | Full-screen overlays |

### Dark Mode (Deep Shadows)

Dark mode shadows use `rgba(0, 0, 0, ...)` with increased opacity.

### Elevation Levels

| Level   | Shadow Token       | Usage                     |
| ------- | ------------------ | ------------------------- |
| Level 1 | `--shadow-level-1` | Cards at rest             |
| Level 2 | `--shadow-level-2` | Cards on hover, dropdowns |
| Level 3 | `--shadow-level-3` | Modals, floating elements |

---

## Animation Tokens

### Duration

| Token               | Value | Usage                       |
| ------------------- | ----- | --------------------------- |
| `--duration-fast`   | 150ms | Micro-interactions, toggles |
| `--duration-normal` | 300ms | Default transitions         |
| `--duration-slow`   | 500ms | Page-level animations       |
| `--duration-slower` | 800ms | Entrance animations         |

### Easing

| Token           | Value                             | Usage                        |
| --------------- | --------------------------------- | ---------------------------- |
| `--ease-out`    | cubic-bezier(0.16, 1, 0.3, 1)     | Elements entering the screen |
| `--ease-in-out` | cubic-bezier(0.65, 0, 0.35, 1)    | Modal open/close             |
| `--ease-spring` | cubic-bezier(0.34, 1.56, 0.64, 1) | Bouncy interactions          |

### Tailwind Animation Classes

| Class                    | Duration | Usage                         |
| ------------------------ | -------- | ----------------------------- |
| `animate-fade-in`        | 0.4s     | General reveal with subtle Y  |
| `animate-fade-in-up`     | 0.5s     | Section reveals, hero content |
| `animate-scale-in`       | 0.3s     | Modals, tooltips, popovers    |
| `animate-slide-in-right` | 0.4s     | Sidebar panels, side drawers  |

---

## Component Patterns

### Cards

- Use `rounded-lg` (12px) for standard cards
- Use `rounded-xl` (16px) for featured/hero cards
- Mix sharp + rounded corners for editorial asymmetry: `rounded-none rounded-r-xl`
- Default shadow: `--shadow-level-1` at rest, `--shadow-level-2` on hover
- Background: `hsl(var(--card))`
- Border: `1px solid hsl(var(--card-border))`

### Buttons

- **Primary**: `bg-primary text-primary-foreground` (terracotta)
- **Secondary**: `bg-secondary text-secondary-foreground` (olive tint)
- **Ghost**: `hover:bg-accent text-foreground`
- **Outline**: `border border-input hover:bg-accent`
- Border radius: `rounded-md` (8px) for standard, `rounded-full` for pills
- Focus ring: `ring-2 ring-ring` (terracotta)

### Badges

- **Default**: `bg-accent text-accent-foreground` (amber tint)
- **Success**: Use `badge-success` class (emerald)
- **Warning**: Use `badge-warning` class (amber)
- **Danger**: Use `badge-danger` class (red)
- Border radius: `rounded-full` for pill shape

### Navigation

- Active state uses `--primary` color with 10% opacity background
- Active icon color: `hsl(var(--travi-terracotta))`
- Hover: subtle warm elevation via `--elevate-1`

### Forms

- Input border: `hsl(var(--input))`
- Focus ring: `hsl(var(--ring))` (terracotta)
- Error state: `hsl(var(--destructive))`
- Border radius: `rounded-md` (8px)

---

## Dark Mode Guidelines

1. **Backgrounds are warm, not cold**: Use `25 25% 8%` (warm charcoal), never `0 0% 0%` (pure black)
2. **Elevated surfaces are warmer**: Cards use `25 20% 11%`, not just lighter black
3. **Primary gets slightly brighter**: Terracotta shifts from 55% to 58% lightness for readability
4. **Shadows use pure black**: In dark mode, warm-tinted shadows are invisible, so use `rgba(0,0,0,...)`
5. **Elevation uses white overlays**: `--elevate-1: rgba(255,255,255,0.05)` instead of warm tones
6. **Text is warm light**: `35 15% 92%` instead of pure white `0 0% 100%`
7. **Borders are subtle**: `25 15% 18%` -- barely visible warm lines
8. **Accent surfaces darken**: Amber accent becomes `36 50% 18%` in dark mode

---

## Z-Index Scale

| Token          | Value | Usage                    |
| -------------- | ----- | ------------------------ |
| `--z-base`     | 0     | Default document flow    |
| `--z-above`    | 10    | Sticky elements, cards   |
| `--z-dropdown` | 100   | Dropdown menus, popovers |
| `--z-sticky`   | 200   | Sticky headers, toolbars |
| `--z-modal`    | 300   | Modal dialogs            |
| `--z-toast`    | 400   | Toast notifications      |
| `--z-overlay`  | 500   | Full-screen overlays     |

---

## Do's and Don'ts

### Do

- Use `--travi-terracotta` as the primary action color (booking, CTA)
- Use `--travi-amber` sparingly for highlights and badges
- Use warm neutrals (`25-35` hue range) for all grays
- Mix sharp and rounded corners on feature cards for editorial style
- Use the warm shadow system (brown-tinted in light mode)
- Respect the 4px spacing grid
- Keep text contrast above WCAG AA (4.5:1 for body, 3:1 for large text)
- Use `font-heading` (Chillax) for all headings h1-h6
- Use `font-sans` (Satoshi) for body text, UI elements, navigation
- Apply `prefers-reduced-motion` checks for all animations

### Don't

- Use pure black (`#000000`) or pure white (`#FFFFFF`) as backgrounds
- Use cold blue/purple tints for neutrals (the old palette)
- Use gradients for buttons or cards (flat, editorial style)
- Mix more than 2 brand colors in a single component
- Use `--travi-teal` for CTA buttons (reserve for informational/map elements)
- Use shadows with `rgba(0,0,0,...)` in light mode (use warm `rgba(60,40,20,...)`)
- Use Chillax below the `title` size (1.5rem) -- it loses legibility
- Apply animation duration longer than 800ms (feels sluggish)
- Use more than 3 levels of elevation in a single view
- Forget to update both `:root` and `.dark` when adding new color tokens

---

## Layout Widths

| Token              | Value  | Usage                      |
| ------------------ | ------ | -------------------------- |
| `--content-narrow` | 768px  | Blog posts, long-form text |
| `--content-width`  | 1280px | Standard page content      |
| `--content-wide`   | 1440px | Full-width sections, grids |
