# TRAVI Design System - Complete Specification

> **CANONICAL SOURCE**: All design tokens derived from `client/src/pages/homepage-new.tsx`
> **RULE**: Every page must look EXACTLY like homepage-new.tsx

---

## 1. BRAND COLORS

### Primary Purple (ONLY purple allowed)
```
Primary:       #6443F4
Hover:         #5539d4
Light (10%):   bg-[#6443F4]/10
```

### Neutral Colors (slate scale)
```
White:         #FFFFFF (bg-white)
Slate 50:      For subtle backgrounds
Slate 200:     For borders light mode
Slate 400:     For secondary text
Slate 500:     For body text
Slate 600:     For stronger body text
Slate 700:     For dark mode borders
Slate 900:     For dark mode cards (bg-slate-900/80)
Slate 950:     For dark mode page bg (bg-slate-950)
```

### CTA Button Colors (Pink for buttons ONLY)
```
Primary CTA:   #F24294 (pink)
Hover:         #D93A82
Stroke:        #24103E (dark purple, 2px)
```

### FORBIDDEN Colors
```
❌ NO Tailwind purple-* / violet-* / indigo-* / pink-*
❌ NO gradients (except SubtleSkyBackground)
❌ NO bg-gradient-to-r / bg-clip-text text-transparent
❌ Pink (#F24294) ONLY allowed for CTA buttons, nowhere else
```

---

## 2. TYPOGRAPHY

### Font Family
```tsx
// ONLY THIS FORMAT for Chillax:
style={{ fontFamily: "'Chillax', var(--font-sans)" }}

// ❌ WRONG formats:
// font-[Chillax,sans-serif]
// font-['Chillax']
// Chillax-Variable
```

### Heading Sizes (all with Chillax)

**H1 (Hero)**
```tsx
<span 
  className="text-5xl md:text-6xl lg:text-7xl font-semibold text-slate-900 dark:text-white"
  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
>
```

**H2 (Section titles)**
```tsx
<h2 
  className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4"
  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
>
```

**H3 (Card titles)**
```tsx
<h3 
  className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2"
  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
>
```

**Stats numbers**
```tsx
<dd 
  className="text-3xl md:text-4xl font-medium text-slate-900 dark:text-white"
  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
>
```

### Body Text
```
Large:    text-lg text-slate-500 dark:text-slate-400 font-light leading-relaxed
Default:  text-sm text-slate-500 dark:text-slate-400
Small:    text-xs text-slate-400 dark:text-slate-500
```

### Eyebrow / Badge Text
```tsx
<span className="text-[#6443F4] text-xs" aria-hidden="true">◆</span>
<span className="text-xs font-medium tracking-[3px] text-slate-400 dark:text-slate-500 uppercase">
  Reliable Travel Information
</span>
```

### Tagline (CANONICAL)
```
"Your Trusted Travel Resource"
```

---

## 3. BUTTONS

### Primary CTA (Pink)
```tsx
<Button 
  className="rounded-[16px] bg-[#F24294] hover:bg-[#D93A82] text-white px-8 py-4 text-base font-medium border-2 border-[#24103E]"
>
  Explore Destinations
  <ArrowRight className="ml-2 w-4 h-4" />
</Button>
```

### Secondary CTA (White with dark border)
```tsx
<Button 
  className="rounded-[16px] bg-white hover:bg-slate-50 text-[#24103E] px-8 py-4 text-base font-medium border-2 border-[#24103E]"
>
  Learn More
</Button>
```

### Ghost Button (on purple background)
```tsx
<Button 
  variant="ghost" 
  size="icon" 
  className="rounded-full text-white/70 hover:text-white hover:bg-white/10"
>
```

### Icon Button
```tsx
<Button size="icon" variant="ghost" className="rounded-full">
  <Menu className="w-5 h-5" />
</Button>
```

### BUTTON RULES
```
✅ rounded-full (always)
✅ border-0 on primary
✅ hover:bg-[#5539d4] for primary
✅ ArrowRight with ml-3 w-5 h-5

❌ NO gradient backgrounds
❌ NO custom hover:bg-* (use built-in)
❌ NO rounded-md on buttons
```

---

## 4. ICONS

### Import Source
```tsx
import { MapPin, ArrowRight, Star, ... } from "lucide-react";
import { SiTiktok } from "react-icons/si"; // ONLY exception
```

### Icon Sizes
```
Small:   w-4 h-4  (inline, badges)
Medium:  w-5 h-5  (buttons, nav, social)
Large:   w-7 h-7  (inside icon boxes only)

❌ NO w-3 h-3
❌ NO w-6 h-6
```

### Icon Box (feature cards)
```tsx
<div className="w-14 h-14 rounded-2xl bg-[#6443F4] flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300">
  <IconComponent className="w-7 h-7 text-white" />
</div>
```

### Standalone Icons
```tsx
<MapPin className="w-4 h-4 text-[#6443F4]" />
// OR
<MapPin className="w-5 h-5 text-current" />
```

---

## 5. IMAGES

### Hero Images
```tsx
<img 
  src={dest.image} 
  alt={dest.alt}
  className="w-full h-full object-cover object-center"
/>
// Container: rounded-2xl overflow-hidden
```

### Card Images
```tsx
<img 
  src={image}
  alt={alt}
  className="object-cover rounded-md"
/>
// Aspect ratio: aspect-[4/3]
```

### Image Corners
```
Hero containers:  rounded-2xl
Card images:      rounded-md

❌ NO rounded-lg
❌ NO rounded-xl  
❌ NO rounded-3xl
```

### Overlays (location badge on hero)
```tsx
<div className="absolute bottom-4 left-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2">
  <MapPin className="w-4 h-4 text-[#6443F4]" />
  <span className="text-sm font-medium text-slate-900 dark:text-white">{location}</span>
</div>
```

---

## 6. NAVIGATION (HEADER)

### Header Container
```tsx
<header 
  className="fixed top-0 left-0 right-0 z-50"
  style={{ background: '#6443F4' }}
>
  <div className="max-w-7xl mx-auto px-6 lg:px-8">
    <div className="flex items-center justify-between h-20">
```

### Logo
```tsx
<img 
  src={traviLogo} 
  alt="TRAVI - Travel Guide" 
  className="h-8 md:h-10"
/>
```

### Nav Links
```tsx
<Link 
  href={item.href} 
  className="px-4 py-2 text-sm font-medium rounded-full transition-all text-white/70 hover:text-white hover:bg-white/10"
>
```

### Nav Items Order
```tsx
const NAV_ITEMS = [
  { label: "Destinations", href: "/destinations" },
  { label: "Hotels", href: "/hotels" },
  { label: "Attractions", href: "/attractions" },
  { label: "Dining", href: "/dining" },
  { label: "Things to Do", href: "/things-to-do" },
  { label: "Guides", href: "/guides" },
  { label: "News", href: "/news" },
];
```

### Social Icons (header)
```tsx
<a className="text-white/70 hover:text-[#E4405F] transition-colors">
  <Instagram className="w-5 h-5" />
</a>
<a className="text-white/70 hover:text-white transition-colors">
  <SiTiktok className="w-4 h-4" />
</a>
```

### Mobile Menu
```tsx
<SheetContent 
  side="right" 
  className="w-[300px] sm:w-[350px] border-0"
  style={{ background: '#6443F4' }}
>
```

---

## 7. CARDS

### Standard Card
```tsx
<Card className="border-0 shadow-md hover:shadow-xl transition-all duration-300 bg-white dark:bg-slate-900/80 backdrop-blur-sm">
  <CardContent className="p-6 sm:p-8">
```

### Card with Icon Box
```tsx
<Card className="relative overflow-visible border-0 shadow-md hover:shadow-xl transition-all duration-300 h-full bg-white dark:bg-slate-900/80 backdrop-blur-sm">
  <CardContent className="p-6 sm:p-8 text-center sm:text-left">
    <div className="w-14 h-14 rounded-2xl bg-[#6443F4] flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300 mx-auto sm:mx-0">
      <IconComponent className="w-7 h-7 text-white" />
    </div>
    <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
      {title}
    </h3>
    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
      {description}
    </p>
  </CardContent>
</Card>
```

### CARD RULES
```
✅ border-0
✅ shadow-md (default)
✅ hover:shadow-xl
✅ transition-all duration-300
✅ bg-white dark:bg-slate-900/80
✅ backdrop-blur-sm

❌ NO shadow-lg / shadow-xl / shadow-2xl as default
❌ NO border visible
❌ NO bg-card (use explicit colors)
```

---

## 8. LAYOUT & SPACING

### Page Background
```tsx
<SubtleSkyBackground />
<div className="min-h-screen relative">
```

### Section Padding
```tsx
className="py-16 md:py-24"
```

### Container
```tsx
className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
```

### Section Header
```tsx
<div className="text-center mb-12">
  <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
    {title}
  </h2>
  <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
    {subtitle}
  </p>
</div>
```

### Grid
```tsx
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6"
```

---

## 9. INTERACTIONS & ANIMATIONS

### Transitions
```
Standard:   transition-all duration-300
Transform:  transition-transform duration-300
Colors:     transition-colors
```

### Hover States
```tsx
// Cards
hover:shadow-xl

// Icon boxes
group-hover:scale-110

// Buttons (built-in, don't override)
```

### Framer Motion (sections)
```tsx
initial={{ opacity: 0, y: 60 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.8, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
```

### Carousel Dots
```tsx
className={cn(
  "h-2.5 rounded-full border-none cursor-pointer transition-all duration-300",
  isActive 
    ? "w-8 bg-[#6443F4]" 
    : "w-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600"
)}
```

---

## 10. BADGES & TAGS

### Category Badge
```tsx
<Badge className="rounded-full bg-[#6443F4]/10 text-[#6443F4] text-xs">
  {category}
</Badge>
```

### Eyebrow Badge
```tsx
<div className="flex items-center gap-3 mb-6">
  <span className="text-[#6443F4] text-xs">◆</span>
  <span className="text-xs font-medium tracking-[3px] text-slate-400 dark:text-slate-500 uppercase">
    {label}
  </span>
</div>
```

---

## 11. SKELETON LOADING

```tsx
function SectionSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("py-16 md:py-24", className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Skeleton className="h-10 w-64 mx-auto mb-4" />
          <Skeleton className="h-6 w-96 mx-auto" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## 12. DARK MODE

### Page Background
```
Light: bg-white (with SubtleSkyBackground)
Dark:  bg-slate-950
```

### Cards
```
Light: bg-white
Dark:  bg-slate-900/80 backdrop-blur-sm
```

### Text
```
Headings Light: text-slate-900
Headings Dark:  text-white

Body Light:     text-slate-500 / text-slate-600
Body Dark:      text-slate-400

Secondary Light: text-slate-400
Secondary Dark:  text-slate-500
```

### Borders
```
Light: border-slate-200
Dark:  border-slate-700 / border-white/10
```

---

## 13. REQUIRED COMPONENTS

Every public page MUST include:

```tsx
import { PublicFooter } from "@/components/public-footer";
import SubtleSkyBackground from "@/components/ui/subtle-sky-background";

// In render:
<SubtleSkyBackground />
<div className="min-h-screen relative">
  {/* Header - use PublicNav OR inline header matching homepage */}
  {/* Content */}
  <PublicFooter />
</div>
```

---

## 14. CHECKLIST FOR EVERY PAGE

- [ ] SubtleSkyBackground present
- [ ] Header bg is solid #6443F4
- [ ] Header height is h-20
- [ ] Logo is h-8 md:h-10
- [ ] Nav links use correct styling
- [ ] All headings use Chillax with fontFamily inline style
- [ ] All colors use #6443F4 (no Tailwind purple/violet)
- [ ] No gradient text anywhere
- [ ] Buttons are rounded-full
- [ ] Cards use border-0 shadow-md
- [ ] Icons from lucide-react only
- [ ] Icon sizes are w-4/w-5/w-7 only
- [ ] Section padding is py-16 md:py-24
- [ ] Dark mode uses slate-* colors
- [ ] PublicFooter present
