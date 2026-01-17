# 📝 Content Management

> Complete guide to managing content

---

## 📋 Content Types

| Type | Description |
|------|-------------|
| `article` | Blog posts, guides |
| `attraction` | Tourist attractions |
| `hotel` | Hotel listings |
| `dining` | Restaurants, cafes |
| `district` | Area guides |
| `event` | Event listings |
| `itinerary` | Travel packages |
| `transport` | Transport guides |

---

## 🔄 Content Workflow

```
Draft → Review → Approved → Scheduled → Published
                                ↓
                            Archived
```

### Status Definitions

| Status | Description |
|--------|-------------|
| `draft` | Work in progress |
| `review` | Pending review |
| `approved` | Ready to publish |
| `scheduled` | Scheduled for future |
| `published` | Live on site |
| `archived` | Hidden from site |

---

## ✏️ Creating Content

### Manual Creation

1. Go to **Content → New**
2. Select content type
3. Fill in fields
4. Add media
5. Save as draft

### AI Generation

1. Go to **Content → New**
2. Click **Generate with AI**
3. Enter topic
4. Select personality
5. Generate and edit

---

## 🎨 Content Editor

### Block Types

| Block | Use |
|-------|-----|
| Paragraph | Body text |
| Heading | Section titles |
| Image | Photos |
| List | Bullet/numbered |
| Quote | Blockquotes |
| FAQ | Q&A sections |

### Formatting

- **Bold** - Important text
- *Italic* - Emphasis
- Links - Internal/external
- Code - Technical content

---

## 🖼️ Media Management

### Adding Images

1. Click **Add Image**
2. Upload or select from library
3. Add alt text
4. Position in content

### Image Guidelines

| Use | Size |
|-----|------|
| Featured | 1200x630px |
| In-content | 800x600px |
| Thumbnail | 400x300px |

---

## 🏷️ Tagging & Organization

### Tags

- Add relevant tags
- Use existing tags
- Create new as needed

### Clusters

- Group related content
- Featured collections
- Category organization

---

## 🔍 SEO Features

### SEO Fields

| Field | Purpose |
|-------|---------|
| SEO Title | Search result title |
| Meta Description | Search snippet |
| Keywords | Target keywords |
| Slug | URL path |

### Auto-Generated

- Schema markup (JSON-LD)
- Open Graph tags
- Twitter cards

---

## 📜 Version History

### Features

- Automatic versioning on save
- View all versions
- Compare changes
- Restore previous

### Access

1. Open content
2. Click **History**
3. Select version
4. Preview or restore

---

## 🔄 Bulk Operations

### Available Actions

| Action | Description |
|--------|-------------|
| Bulk Status | Change status of multiple |
| Bulk Delete | Delete multiple |
| Bulk Tag | Add tag to multiple |
| Bulk Export | Export to CSV |

### How to Use

1. Select multiple items
2. Choose action
3. Confirm

---

## 🔒 Content Locking

### Purpose

Prevents simultaneous editing conflicts.

### Behavior

- Content locked when editing
- Shows who is editing
- Auto-release after inactivity
- Force unlock available

---

## 📤 Export/Import

### Export

```bash
GET /api/contents/export?format=csv
GET /api/contents/export?format=json
```

### Import

- CSV import for bulk content
- JSON for full content with blocks

---

## 📚 Related

- [AI Generation](./ai-generation.md)
- [Translation](./translation.md)
- [Content API](../api/endpoints/contents.md)
