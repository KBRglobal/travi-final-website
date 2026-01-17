# 🔌 API Overview

> RESTful API documentation for Traviapp

---

## 📊 API Statistics

| Metric | Value |
|--------|-------|
| Total Endpoints | 187 |
| Authentication | Session-based |
| Format | JSON |
| Base URL | `/api` |

---

## 🔐 Authentication

All API requests (except public endpoints) require authentication.

### Session Authentication

```bash
# Login
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "your-password"
}

# Response sets session cookie
Set-Cookie: connect.sid=...
```

### Using Session

```bash
# Include cookie in requests
GET /api/contents
Cookie: connect.sid=...
```

See [Authentication](./authentication.md) for details.

---

## 📁 API Categories

### Content Management
| Endpoint | Description |
|----------|-------------|
| `GET /api/contents` | List all content |
| `POST /api/contents` | Create content |
| `PATCH /api/contents/:id` | Update content |
| `DELETE /api/contents/:id` | Delete content |

### AI Generation
| Endpoint | Description |
|----------|-------------|
| `POST /api/ai/generate-article` | Generate article |
| `POST /api/ai/generate-images` | Generate images |
| `POST /api/ai/suggest-internal-links` | Get link suggestions |

### Translation
| Endpoint | Description |
|----------|-------------|
| `GET /api/translations/:contentId` | Get translations |
| `POST /api/translations/:contentId/translate` | Translate content |

### Newsletter
| Endpoint | Description |
|----------|-------------|
| `POST /api/newsletter/subscribe` | Subscribe email |
| `POST /api/campaigns/:id/send` | Send campaign |

See [Endpoints](./endpoints/) for full documentation.

---

## 📦 Request Format

### Headers

```
Content-Type: application/json
Cookie: connect.sid=...
```

### Body (POST/PATCH)

```json
{
  "title": "Content Title",
  "type": "article",
  "status": "draft"
}
```

---

## 📤 Response Format

### Success Response

```json
{
  "id": 1,
  "title": "Content Title",
  "type": "article",
  "status": "draft",
  "createdAt": "2024-12-23T00:00:00Z"
}
```

### List Response

```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

### Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      {
        "field": "title",
        "message": "Required"
      }
    ]
  }
}
```

---

## 🚨 Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request |
| `401` | Unauthorized |
| `403` | Forbidden |
| `404` | Not Found |
| `429` | Too Many Requests |
| `500` | Server Error |

---

## ⚡ Rate Limiting

| Endpoint Type | Limit |
|---------------|-------|
| Authentication | 5/min |
| API | 100/min |
| Newsletter | 2/min |
| AI Generation | 10/min |

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1703318400
```

---

## 🌐 Public Endpoints

No authentication required:

```
GET /api/public/contents
GET /api/public/content/:slug/:locale
GET /sitemap.xml
GET /robots.txt
```

---

## 📚 Quick Examples

### List Content

```bash
curl -X GET http://localhost:5000/api/contents \
  -H "Cookie: connect.sid=..."
```

### Create Content

```bash
curl -X POST http://localhost:5000/api/contents \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=..." \
  -d '{
    "title": "My Article",
    "type": "article",
    "status": "draft"
  }'
```

### Generate with AI

```bash
curl -X POST http://localhost:5000/api/ai/generate-article \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=..." \
  -d '{
    "topic": "Dubai Marina Guide",
    "personality": "professional"
  }'
```

---

## 🔗 Related Documentation

- [Authentication](./authentication.md)
- [Endpoints](./endpoints/)
- [Errors](./errors.md)
