# 🤖 AI API

> AI content generation endpoints

---

## 📋 Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ai/generate-article` | Generate article |
| `POST` | `/api/ai/generate-hotel` | Generate hotel content |
| `POST` | `/api/ai/generate-attraction` | Generate attraction |
| `POST` | `/api/ai/generate-images` | Generate images |
| `POST` | `/api/ai/suggest-internal-links` | Get link suggestions |

---

## POST /api/ai/generate-article

Generate a complete article with AI.

### Request Body

```json
{
  "topic": "Dubai Marina Complete Guide",
  "personality": "professional",
  "tier": "standard",
  "keywords": ["Dubai Marina", "waterfront", "dining"],
  "targetLength": "long"
}
```

### Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `topic` | string | Yes | Article topic |
| `personality` | string | No | Writing style |
| `tier` | string | No | standard/premium |
| `keywords` | array | No | Target keywords |
| `targetLength` | string | No | short/medium/long |

### Personality Options

- `professional` - Formal, authoritative
- `friendly` - Conversational, approachable
- `enthusiastic` - Energetic, excited
- `informative` - Educational, detailed
- `luxury` - Sophisticated, upscale

### Response

```json
{
  "id": 1,
  "title": "Dubai Marina: The Complete Guide for 2024",
  "slug": "dubai-marina-complete-guide-2024",
  "body": "Full article content...",
  "bodyBlocks": [
    {
      "type": "heading",
      "content": "Introduction"
    },
    {
      "type": "paragraph",
      "content": "..."
    }
  ],
  "seoTitle": "Dubai Marina Guide | Attractions, Dining & More",
  "seoDescription": "Discover everything...",
  "faqs": [
    {
      "question": "What is Dubai Marina famous for?",
      "answer": "..."
    }
  ],
  "wordCount": 2500,
  "model": "gpt-4o"
}
```

---

## POST /api/ai/generate-hotel

Generate hotel listing content.

### Request Body

```json
{
  "hotelName": "Atlantis The Palm",
  "location": "Palm Jumeirah",
  "starRating": 5,
  "features": ["beach", "waterpark", "fine dining"]
}
```

### Response

```json
{
  "title": "Atlantis The Palm Dubai",
  "description": "...",
  "amenities": [...],
  "highlights": [...],
  "seoData": {...}
}
```

---

## POST /api/ai/generate-attraction

Generate attraction content.

### Request Body

```json
{
  "attractionName": "Burj Khalifa",
  "category": "landmark",
  "location": "Downtown Dubai"
}
```

---

## POST /api/ai/generate-images

Generate images using DALL-E 3.

### Request Body

```json
{
  "prompt": "Dubai Marina skyline at sunset, photorealistic",
  "count": 3,
  "size": "1024x1024",
  "style": "vivid"
}
```

### Parameters

| Param | Type | Default | Options |
|-------|------|---------|---------|
| `prompt` | string | - | Image description |
| `count` | number | 1 | 1-4 |
| `size` | string | 1024x1024 | 1024x1024, 1792x1024, 1024x1792 |
| `style` | string | vivid | vivid, natural |

### Response

```json
{
  "images": [
    {
      "url": "https://...",
      "revisedPrompt": "..."
    }
  ]
}
```

---

## POST /api/ai/generate-single-image

Generate single image.

### Request Body

```json
{
  "prompt": "Luxury hotel room with Dubai skyline view",
  "size": "1792x1024"
}
```

---

## POST /api/ai/suggest-internal-links

Get internal link suggestions for content.

### Request Body

```json
{
  "contentId": 1,
  "text": "Content to analyze..."
}
```

### Response

```json
{
  "suggestions": [
    {
      "anchor": "Dubai Marina",
      "targetId": 5,
      "targetTitle": "Dubai Marina Guide",
      "targetSlug": "dubai-marina-guide"
    }
  ]
}
```

---

## POST /api/ai/generate-seo-schema

Generate structured data (JSON-LD).

### Request Body

```json
{
  "contentId": 1,
  "type": "article"
}
```

### Response

```json
{
  "schema": {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "...",
    "author": {...},
    "datePublished": "..."
  }
}
```

---

## POST /api/ai/assistant

Chat with AI assistant.

### Request Body

```json
{
  "message": "How can I improve this article?",
  "context": {
    "contentId": 1
  }
}
```

### Response

```json
{
  "response": "Here are some suggestions...",
  "suggestions": [...]
}
```

---

## POST /api/ai/block-action

Edit specific content block.

### Request Body

```json
{
  "action": "expand",
  "block": {
    "type": "paragraph",
    "content": "Short text..."
  }
}
```

### Actions

- `expand` - Make longer
- `simplify` - Make simpler
- `rewrite` - Rewrite differently
- `summarize` - Create summary

---

## ⚙️ Content Rules

AI generation follows these rules:

| Rule | Value |
|------|-------|
| Min words | 1800 |
| Max words | 3500 |
| Min FAQs | 6 |
| Max FAQs | 10 |
| Min internal links | 5 |
| Keyword density | 1-3% |

---

## ⚠️ Rate Limits

| Tier | Limit |
|------|-------|
| Standard | 10/min |
| Premium | 20/min |

---

## 🔧 Error Handling

### AI Generation Failed

```json
{
  "error": {
    "code": "AI_GENERATION_FAILED",
    "message": "Failed to generate content",
    "details": "API rate limit exceeded"
  }
}
```

### Retry automatically on:
- Rate limit (429)
- Timeout
- Temporary failures

Max retries: 3
