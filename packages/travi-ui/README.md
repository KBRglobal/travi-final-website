# @travi/ui

TRAVI Design System - A complete collection of React components, page templates, and design documentation.

## Structure

```
@travi/ui/
├── docs/                      # Design documentation
│   ├── design-system.md       # Full design system specs
│   └── design_guidelines.md   # UI/UX guidelines
├── src/
│   ├── components/
│   │   ├── ui/               # shadcn/ui primitives (60+ components)
│   │   ├── travi/            # TRAVI branded components
│   │   └── shared/           # Shared layout components
│   ├── hooks/                # React hooks
│   ├── lib/                  # Utilities
│   ├── pages/examples/       # Page templates
│   └── styles/               # Global CSS
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## Page Templates

| Page | File |
|------|------|
| Homepage | `pages/examples/homepage-new.tsx` |
| Destinations | `pages/examples/destinations.tsx` |
| Hotels | `pages/examples/global-hotels.tsx` |
| Attractions | `pages/examples/global-attractions.tsx` |
| Dining | `pages/examples/global-dining.tsx` |
| Things to Do | `pages/examples/global-things-to-do.tsx` |
| Guides | `pages/examples/global-guides.tsx` |
| News | `pages/examples/public-news.tsx` |
| About | `pages/examples/about.tsx`, `public-about.tsx` |
| Contact | `pages/examples/contact.tsx`, `public-contact.tsx` |
| Test | `pages/examples/test.tsx` |

## Design System

### Colors
- **Purple** (`#6443F4`) - Primary brand color for UI elements, animated gradients
- **Pink** (`#F24294`) - CTA buttons ONLY (solid, not gradient)
- **Slate** - Dark mode background colors

### Typography
- **Chillax** - Headlines/display text
  ```tsx
  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
  ```
- **Satoshi** - Body text/UI

### Key Patterns
- All non-button UI elements use purple via `animated-gradient-text` class
- CTA buttons use solid pink (`bg-[#F24294]`)
- Headlines CENTER or RIGHT aligned in heroes
- Tagline: "Your Trusted Travel Resource"

## Components

### UI Primitives (60+)
Accordion, Alert, AlertDialog, Avatar, Badge, Button, Calendar, Card, Carousel, Chart, Checkbox, Collapsible, Command, Dialog, Drawer, DropdownMenu, Form, HoverCard, Input, InputOTP, Label, LazyImage, Lightbox, Menubar, NavigationMenu, Pagination, Popover, Progress, RadioGroup, Resizable, SafeImage, ScrollArea, Select, Separator, ShareButtons, Sheet, Sidebar, Skeleton, SkipLink, Slider, SubtleSkyBackground, Switch, Table, Tabs, Textarea, Toast, Toaster, Toggle, ToggleGroup, Tooltip

### Shared Components
- PublicNav - Main navigation
- PublicFooter - Footer
- Logo - Brand logo component

### TRAVI Branded
- ThemeToggle - Dark/light mode toggle

### Hooks
- useToast - Toast notifications
- useIsMobile - Mobile viewport detection
- useDebounce - Input debouncing

## Installation

```bash
npm install @travi/ui
```

## Setup

```tsx
// Import styles
import "@travi/ui/styles";

// Extend Tailwind config
import traviConfig from "@travi/ui/tailwind.config";

export default {
  presets: [traviConfig],
  content: [
    "./src/**/*.{ts,tsx}",
    "./node_modules/@travi/ui/dist/**/*.{js,ts,jsx,tsx}",
  ],
};
```

## Usage

```tsx
import { Button, Card, Badge, ThemeToggle } from "@travi/ui";

function App() {
  return (
    <Card>
      <Button variant="default">Click me</Button>
      <Badge>New</Badge>
      <ThemeToggle />
    </Card>
  );
}
```

## License

MIT
