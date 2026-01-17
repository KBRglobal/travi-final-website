# 📄 Contents API

> Content management endpoints

---

## 📋 Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/contents` | List contents |
| `GET` | `/api/contents/:id` | Get content |
| `POST` | `/api/contents` | Create content |
| `PATCH` | `/api/contents/:id` | Update content |
| `DELETE` | `/api/contents/:id` | Delete content |

---

## GET /api/contents

List all content with filtering and pagination.

### Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page |
| `type` | string | - | Filter by type |
| `status` | string | - | Filter by status |
| `search` | string | - | Search title/content |
| `sortBy` | string | createdAt | Sort field |
| `sortOrder` | string | desc | asc or desc |

### Example Request

```bash
GET /api/contents?type=article&status=published&limit=10
```

### Example Response

```json
{
  "data": [
    {
      "id": 1,
      "title": "Dubai Marina Guide",
      "slug": "dubai-marina-guide",
      "type": "article",
      "status": "published",
      "authorId": 1,
      "createdAt": "2024-12-23T00:00:00Z",
      "updatedAt": "2024-12-23T00:00:00Z"
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

---

## GET /api/contents/:id

Get single content by ID.

### Example Request

```bash
GET /api/contents/1
```

### Example Response

```json
{
  "id": 1,
  "title": "Dubai Marina Guide",
  "slug": "dubai-marina-guide",
  "type": "article",
  "status": "published",
  "body": "Full content here...",
  "bodyBlocks": [...],
  "seoTitle": "Dubai Marina - Complete Guide 2024",
  "seoDescription": "...",
  "featuredImage": "https://...",
  "authorId": 1,
  "author": {
    "id": 1,
    "username": "admin"
  },
  "tags": [
    { "id": 1, "name": "Dubai" }
  ],
  "createdAt": "2024-12-23T00:00:00Z",
  "updatedAt": "2024-12-23T00:00:00Z"
}
```

---

## POST /api/contents

Create new content.

### Request Body

```json
{
  "title": "New Article",
  "type": "article",
  "status": "draft",
  "body": "Content here...",
  "bodyBlocks": [
    {
      "type": "paragraph",
      "content": "..."
    }
  ],
  "seoTitle": "SEO Title",
  "seoDescription": "SEO Description",
  "featuredImage": "https://..."
}
```

### Content Types

- `article`
- `attraction`
- `hotel`
- `dining`
- `district`
- `event`
- `itinerary`
- `transport`

### Status Values

- `draft`
- `review`
- `approved`
- `scheduled`
- `published`
- `archived`

### Example Response

```json
{
  "id": 2,
  "title": "New Article",
  "slug": "new-article",
  "type": "article",
  "status": "draft",
  "createdAt": "2024-12-23T00:00:00Z"
}
```

---

## PATCH /api/contents/:id

Update existing content.

### Request Body

Only include fields to update:

```json
{
  "title": "Updated Title",
  "status": "published"
}
```

### Example Response

```json
{
  "id": 1,
  "title": "Updated Title",
  "status": "published",
  "updatedAt": "2024-12-23T01:00:00Z"
}
```

---

## DELETE /api/contents/:id

Delete content.

### Example Request

```bash
DELETE /api/contents/1
```

### Example Response

```json
{
  "success": true,
  "message": "Content deleted"
}
```

---

## 🔄 Bulk Operations

### Bulk Status Update

```bash
POST /api/contents/bulk-status
{
  "ids": [1, 2, 3],
  "status": "published"
}
```

### Bulk Delete

```bash
POST /api/contents/bulk-delete
{
  "ids": [1, 2, 3]
}
```

### Bulk Add Tag

```bash
POST /api/contents/bulk-add-tag
{
  "ids": [1, 2, 3],
  "tagId": 5
}
```

---

## 📜 Version History

### Get Versions

```bash
GET /api/contents/:id/versions
```

### Response

```json
[
  {
    "id": 1,
    "versionNumber": 3,
    "createdAt": "2024-12-23T00:00:00Z",
    "createdBy": "admin"
  },
  {
    "id": 2,
    "versionNumber": 2,
    "createdAt": "2024-12-22T00:00:00Z"
  }
]
```

### Restore Version

```bash
POST /api/contents/:id/versions/:versionId/restore
```

---

## 🔍 Special Endpoints

### Get by Slug

```bash
GET /api/contents/slug/:slug
```

### Get Attention Items

```bash
GET /api/contents/attention
```

Returns content needing review or action.

### Export All

```bash
GET /api/contents/export
```

Returns CSV/JSON of all content.
