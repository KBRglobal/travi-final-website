# ADR-003: JSONB Content Blocks Design

## Status

**Accepted**

## Date

2024-01-15

---

## Context

TRAVI CMS needs to support flexible, rich content layouts for travel articles, destination guides, and hotel descriptions. Traditional CMS approaches with fixed fields don't accommodate the variety of content types and layouts needed. The system requires:

- Flexible content structures that editors can customize
- Support for various content types (text, images, FAQs, CTAs, maps, etc.)
- Easy reordering of content sections
- Efficient storage and retrieval
- Type safety in application code

### Requirements

- Support 15+ different block types
- Drag-and-drop reordering capability
- Version history for content blocks
- Translation support for localized content
- Type-safe access in TypeScript
- Efficient database queries

---

## Alternatives Considered

### Option 1: Normalized Tables per Block Type

**Description**: Create separate database tables for each block type (text_blocks, image_blocks, faq_blocks, etc.) with foreign keys to content.

**Pros**:
- Strict schema enforcement
- Easier to query individual block types
- Database-level validation

**Cons**:
- Complex joins to reconstruct content
- Schema changes require migrations
- Adding new block types is expensive
- Performance overhead for many block types

### Option 2: Markdown with Frontmatter

**Description**: Store content as Markdown with YAML frontmatter for metadata.

**Pros**:
- Human-readable format
- Easy to edit in external tools
- Git-friendly diffs

**Cons**:
- Limited structured data support
- Difficult to implement rich blocks (maps, interactive elements)
- No drag-and-drop reordering
- Parsing overhead

### Option 3: JSONB Column with Block Array

**Description**: Store content blocks as a JSONB array in PostgreSQL, with TypeScript interfaces for type safety.

**Pros**:
- Flexible schema, easy to add block types
- Native PostgreSQL indexing and querying
- Efficient storage and retrieval
- Full TypeScript type safety via interfaces

**Cons**:
- No database-level schema validation
- Must handle migrations in application code
- Complex queries for specific block content

---

## Decision

We chose **JSONB content blocks** stored as an array in the `blocks` column:

### Schema Definition

```typescript
// shared/schema.ts
export const contents = pgTable("contents", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  // ... other fields
  blocks: jsonb("blocks").$type<ContentBlock[]>().default([]),
});

export interface ContentBlock {
  id?: string;
  type: string;
  data: Record<string, unknown>;
  order?: number;
}
```

### Supported Block Types

| Type | Description | Data Structure |
|------|-------------|----------------|
| `hero` | Hero section with image | `{ title, subtitle, image, overlay }` |
| `text` | Rich text content | `{ content, format }` |
| `heading` | Section heading | `{ level, text }` |
| `image` | Image with caption | `{ url, alt, caption }` |
| `gallery` | Image gallery | `{ images: [{ url, alt }] }` |
| `faq` | FAQ accordion | `{ items: [{ question, answer }] }` |
| `cta` | Call to action | `{ text, url, style }` |
| `map` | Location map | `{ lat, lng, zoom, markers }` |
| `video` | Embedded video | `{ url, provider, title }` |
| `quote` | Blockquote | `{ text, author, source }` |
| `divider` | Visual separator | `{ style }` |
| `table` | Data table | `{ headers, rows }` |
| `list` | Ordered/unordered list | `{ items, ordered }` |
| `embed` | External embed | `{ url, type }` |
| `card_grid` | Content cards | `{ cards: [{ title, image, link }] }` |

### Implementation Example

```typescript
// Creating content with blocks
const content = await storage.createContent({
  title: "Dubai Travel Guide",
  type: "article",
  blocks: [
    {
      id: "block-1",
      type: "hero",
      data: {
        title: "Discover Dubai",
        image: "/images/dubai-hero.jpg",
        overlay: true
      },
      order: 0
    },
    {
      id: "block-2",
      type: "text",
      data: {
        content: "<p>Welcome to Dubai...</p>"
      },
      order: 1
    },
    {
      id: "block-3",
      type: "faq",
      data: {
        items: [
          { question: "Best time to visit?", answer: "October to April" },
          { question: "Do I need a visa?", answer: "Depends on nationality" }
        ]
      },
      order: 2
    }
  ]
});
```

### Frontend Rendering

```tsx
// ContentBlocksRenderer component
function ContentBlocksRenderer({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="content-blocks">
      {blocks.sort((a, b) => (a.order || 0) - (b.order || 0)).map((block) => {
        switch (block.type) {
          case 'hero':
            return <HeroBlock key={block.id} data={block.data} />;
          case 'text':
            return <TextBlock key={block.id} data={block.data} />;
          case 'faq':
            return <FaqBlock key={block.id} data={block.data} />;
          // ... other block types
          default:
            return null;
        }
      })}
    </div>
  );
}
```

### Block Editor with Drag-and-Drop

The admin interface uses `@dnd-kit/sortable` for drag-and-drop reordering:

```tsx
<DndContext onDragEnd={handleDragEnd}>
  <SortableContext items={blocks.map(b => b.id)}>
    {blocks.map((block) => (
      <SortableBlock key={block.id} block={block} />
    ))}
  </SortableContext>
</DndContext>
```

---

## Consequences

### Positive

- **Flexibility**: New block types can be added without database migrations
- **Performance**: Single query retrieves all content with blocks
- **Type Safety**: TypeScript interfaces ensure correct data access
- **Rich Editing**: Drag-and-drop reordering is straightforward
- **Translation Ready**: Blocks structure is preserved across translations
- **Version History**: JSONB diff can show exactly what changed

### Negative

- **No DB Validation**: Invalid block structures are caught at application level
- **Query Complexity**: Filtering by block content requires JSONB operators
- **Migration Challenges**: Block schema changes need application-level handling
- **Index Limitations**: Cannot efficiently index all block data properties

### Neutral

- Block data structure is opaque to the database
- Changes to block types require frontend and backend updates
- Large block arrays may increase row size

---

## Mitigations

1. **Validation**: Zod schemas validate block structure on create/update
2. **Query Helpers**: Utility functions wrap JSONB query operators
3. **Migration Scripts**: Database scripts handle block schema updates when needed
4. **Indexing**: Use GIN indexes on commonly queried JSONB paths

```sql
-- Example: Index for finding content with specific block types
CREATE INDEX idx_content_blocks_type ON contents 
USING GIN ((blocks));
```

---

## References

- [PostgreSQL JSONB Documentation](https://www.postgresql.org/docs/current/datatype-json.html)
- [Drizzle ORM JSONB](https://orm.drizzle.team/docs/column-types/pg#jsonb)
- [@dnd-kit Documentation](https://docs.dndkit.com/)

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2024-01-15 | Initial block system design | TRAVI Team |
| 2024-03-01 | Added 5 new block types | TRAVI Team |
| 2024-08-01 | Implemented drag-and-drop | TRAVI Team |
