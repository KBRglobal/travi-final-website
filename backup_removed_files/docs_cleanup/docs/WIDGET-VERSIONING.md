# TRAVI CMS - Widget Versioning

## Overview

The Page Builder uses semantic versioning for widgets to ensure backward compatibility and support safe migrations when widget structures change.

## Version Format

Widgets use semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes (restructured data, removed fields)
- **MINOR**: New features (new optional fields, new capabilities)
- **PATCH**: Bug fixes (no data structure changes)

## Current Widget Versions

| Widget Type | Version | Description |
|-------------|---------|-------------|
| hero | 1.0.0 | Hero section with image and CTA |
| text | 1.0.0 | Rich text content block |
| image | 1.0.0 | Single image with caption |
| gallery | 1.0.0 | Image gallery/carousel |
| faq | 1.0.0 | FAQ accordion |
| cta | 1.0.0 | Call-to-action button |
| info_grid | 1.0.0 | Grid of information cards |
| highlights | 1.0.0 | Feature highlights list |
| tips | 1.0.0 | Tips and advice section |
| video | 1.0.0 | Video embed |
| quote | 1.0.0 | Blockquote/testimonial |
| divider | 1.0.0 | Visual separator |
| heading | 1.0.0 | Section heading |

## Versioning Policy

### When to Bump Major (1.x.x → 2.0.0)

- Removing required fields
- Changing field types
- Restructuring nested data
- Renaming essential properties

### When to Bump Minor (1.0.x → 1.1.0)

- Adding new optional fields
- Adding new features/capabilities
- Deprecating fields (but keeping them)

### When to Bump Patch (1.0.0 → 1.0.1)

- Bug fixes in widget renderer
- Documentation updates
- Performance improvements

## Widget Metadata Structure

```typescript
interface BlockWithVersion {
  id: string;
  type: string;
  content: Record<string, unknown>;
  widgetVersion?: string; // e.g., "1.0.0"
}
```

## Migration System

### Registering Migrations

```typescript
import { registerMigration } from '@shared/widget-versioning';

// Migrate text widget from 1.0.0 to 1.1.0
registerMigration('text', '1.0.0', '1.1.0', (data) => ({
  ...data,
  alignment: data.alignment || 'left', // Add new optional field
}));

// Migrate hero widget from 1.0.0 to 2.0.0
registerMigration('hero', '1.0.0', '2.0.0', (data) => ({
  title: data.heading, // Renamed field
  subtitle: data.subheading,
  image: data.backgroundImage,
  cta: {
    text: data.buttonText,
    url: data.buttonUrl,
  },
}));
```

### Running Migrations

```typescript
import { migrateWidget, parseVersion } from '@shared/widget-versioning';

const oldBlock = {
  type: 'hero',
  widgetVersion: '1.0.0',
  content: { heading: 'Welcome', buttonText: 'Learn More' }
};

const newContent = migrateWidget(
  'hero',
  parseVersion('1.0.0'),
  parseVersion('2.0.0'),
  oldBlock.content
);
```

## Compatibility Checking

```typescript
import { isCompatible, parseVersion } from '@shared/widget-versioning';

const editorVersion = parseVersion('1.2.0');
const widgetVersion = parseVersion('1.1.0');

if (isCompatible(editorVersion, widgetVersion)) {
  // Editor can render this widget
  renderWidget(block);
} else {
  // Widget needs migration or is incompatible
  showUpgradePrompt();
}
```

## Backward Compatibility Rules

1. **Always migrate forward**: Never downgrade widget versions
2. **Preserve data**: Migrations should never lose user content
3. **Default values**: New optional fields must have sensible defaults
4. **Graceful degradation**: Unknown fields should be ignored, not error

## Storage Format

Blocks in the database include version metadata:

```json
{
  "blocks": [
    {
      "id": "block-abc123",
      "type": "hero",
      "widgetVersion": "1.0.0",
      "content": {
        "title": "Welcome to Dubai",
        "image": "/uploads/hero.jpg"
      }
    }
  ]
}
```

## Best Practices

1. **Check version on load**: Migrate blocks when loading content
2. **Save current version**: Always save with the latest widget version
3. **Test migrations**: Unit test all migration functions
4. **Document changes**: Update this file when bumping versions
5. **Deprecation warnings**: Log warnings for deprecated fields
