# AI Writers API Reference

## Base Endpoint

All AI Writers endpoints are available at `/api/writers/` or through the main `/api/ai/generate` endpoint.

## Authentication

All endpoints require authentication. Include the session cookie or authorization header.

## Endpoints

### 1. Generate Content (Main Endpoint)

Primary content generation endpoint with AI Writers system.

**Endpoint:** `POST /api/ai/generate`

**Request Body:**
```json
{
  "type": "hotel|attraction|dining|article|district|transport|event|itinerary",
  "topic": "string (required)",
  "keywords": ["string"],
  "writerId": "string (optional - auto-assigns if not provided)",
  "locale": "string (default: en)",
  "length": "short|medium|long (default: medium)",
  "tone": "string (optional)",
  "targetAudience": ["string"],
  "useWriters": "boolean (default: true - set to false for legacy system)"
}
```

**Response (AI Writers):**
```json
{
  "title": "string",
  "body": "string",
  "intro": "string",
  "metaDescription": "string",
  "keywords": ["string"],
  "writerId": "string",
  "writerName": "string",
  "generatedByAI": true,
  "writerVoiceScore": 87,
  "confidence": 0.85,
  "_system": "ai-writers"
}
```

**Response (Legacy - Deprecated):**
```json
{
  "title": "string",
  "metaDescription": "string",
  "blocks": [
    {
      "type": "text",
      "data": { "heading": "string", "content": "string" }
    }
  ],
  "faq": [
    { "question": "string", "answer": "string" }
  ],
  "_system": "legacy",
  "_deprecated": true,
  "_message": "This endpoint uses the deprecated content generation system..."
}
```

### 2. List All Writers

Get all available AI writers.

**Endpoint:** `GET /api/writers`

**Query Parameters:**
- `contentType`: Filter by content type
- `expertise`: Filter by expertise keyword
- `active`: Filter by active status (default: true)

**Response:**
```json
{
  "writers": [
    {
      "id": "james-mitchell",
      "slug": "james-mitchell",
      "name": "James Mitchell",
      "expertise": "Luxury Hotels & Resorts",
      "personality": "British, sophisticated, detail-oriented...",
      "writingStyle": "Elegant, refined prose...",
      "voicePrompt": "Write as James Mitchell...",
      "contentTypes": ["hotel", "resort"],
      "languages": ["en", "ar"],
      "samplePhrases": ["..."],
      "isActive": true,
      "performanceScore": 95
    }
  ]
}
```

### 3. Get Writer Profile

Get detailed information about a specific writer.

**Endpoint:** `GET /api/writers/:id`

**Response:**
```json
{
  "writer": {
    "id": "james-mitchell",
    "name": "James Mitchell",
    "expertise": "Luxury Hotels & Resorts",
    "personality": "...",
    "writingStyle": "...",
    "voicePrompt": "...",
    "contentTypes": ["hotel", "resort"],
    "languages": ["en", "ar"],
    "samplePhrases": ["..."],
    "isActive": true,
    "performanceScore": 95
  },
  "stats": {
    "totalArticles": 150,
    "averageVoiceScore": 87,
    "averageQualityScore": 92,
    "completionRate": 98
  },
  "recentArticles": [
    {
      "id": "...",
      "title": "...",
      "type": "hotel",
      "voiceScore": 89,
      "createdAt": "2025-12-24T..."
    }
  ]
}
```

### 4. Generate with Specific Writer

Generate content using a specific writer's voice.

**Endpoint:** `POST /api/writers/:writerId/generate`

**Request Body:**
```json
{
  "contentType": "hotel|attraction|dining|...",
  "topic": "string (required)",
  "keywords": ["string"],
  "locale": "string (default: en)",
  "length": "short|medium|long",
  "tone": "string",
  "targetAudience": ["string"]
}
```

**Response:** Same as main generate endpoint

### 5. Get Writer Recommendations

Get recommended writers for a specific content type and topic.

**Endpoint:** `POST /api/writers/recommendations`

**Request Body:**
```json
{
  "contentType": "hotel|attraction|dining|...",
  "topic": "string",
  "keywords": ["string"]
}
```

**Response:**
```json
{
  "recommendations": [
    {
      "writer": {
        "id": "james-mitchell",
        "name": "James Mitchell",
        "expertise": "Luxury Hotels & Resorts"
      },
      "score": 95,
      "reason": "Perfect match for luxury hotel content with British sophistication",
      "confidence": 0.95
    },
    {
      "writer": {
        "id": "elena-costa",
        "name": "Elena Costa",
        "expertise": "Wellness & Spa"
      },
      "score": 78,
      "reason": "Good fit for spa and wellness amenities",
      "confidence": 0.85
    }
  ]
}
```

### 6. Generate Title Options

Generate multiple title variations with a specific writer.

**Endpoint:** `POST /api/writers/:writerId/titles`

**Request Body:**
```json
{
  "topic": "string (required)",
  "count": 5
}
```

**Response:**
```json
{
  "titles": [
    "Burj Al Arab: Dubai's Iconic 7-Star Luxury Hotel",
    "Experience Unparalleled Luxury at Burj Al Arab Dubai",
    "Burj Al Arab - The World's Most Luxurious Hotel Experience",
    "Dubai's Burj Al Arab: Where Luxury Knows No Bounds",
    "Inside Burj Al Arab: Exploring Dubai's Ultimate Luxury Icon"
  ],
  "writerId": "james-mitchell",
  "writerName": "James Mitchell"
}
```

### 7. Rewrite Content in Writer's Voice

Rewrite existing content using a specific writer's voice.

**Endpoint:** `POST /api/writers/:writerId/rewrite`

**Request Body:**
```json
{
  "content": "string (required - content to rewrite)",
  "context": "string (optional - additional context)"
}
```

**Response:**
```json
{
  "rewritten": "string - rewritten content",
  "writerId": "james-mitchell",
  "writerName": "James Mitchell",
  "voiceScore": 91,
  "originalLength": 500,
  "rewrittenLength": 520
}
```

### 8. Get Writer Statistics

Get performance statistics for all writers or a specific writer.

**Endpoint:** `GET /api/writers/stats`

**Query Parameters:**
- `writerId`: Filter by specific writer

**Response:**
```json
{
  "stats": [
    {
      "writerId": "james-mitchell",
      "writerName": "James Mitchell",
      "totalArticles": 150,
      "averageVoiceScore": 87,
      "averageQualityScore": 92,
      "completionRate": 98,
      "lastUsed": "2025-12-24T...",
      "topContentTypes": ["hotel", "resort"]
    }
  ]
}
```

### 9. Get Writer's Articles

Get articles written by a specific writer.

**Endpoint:** `GET /api/writers/:writerId/articles`

**Query Parameters:**
- `limit`: Number of articles (default: 20)
- `offset`: Pagination offset
- `contentType`: Filter by content type
- `minVoiceScore`: Minimum voice score

**Response:**
```json
{
  "articles": [
    {
      "id": "...",
      "title": "...",
      "type": "hotel",
      "slug": "...",
      "voiceScore": 89,
      "status": "published",
      "createdAt": "2025-12-24T...",
      "publishedAt": "2025-12-24T..."
    }
  ],
  "total": 150,
  "writer": {
    "id": "james-mitchell",
    "name": "James Mitchell"
  }
}
```

### 10. Update Writer Settings (Admin Only)

Update writer configuration (requires admin permissions).

**Endpoint:** `PUT /api/writers/:id`

**Request Body:**
```json
{
  "isActive": true,
  "voicePrompt": "string (optional)",
  "performanceScore": 95
}
```

**Response:**
```json
{
  "success": true,
  "writer": {
    "id": "james-mitchell",
    "name": "James Mitchell",
    "isActive": true,
    "performanceScore": 95
  }
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "Type and topic are required"
}
```

### 404 Not Found
```json
{
  "error": "Writer not found: invalid-writer-id"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to generate content"
}
```

### 503 Service Unavailable
```json
{
  "error": "AI service not configured. Please add OPENAI_API_KEY"
}
```

## Rate Limiting

AI generation endpoints are rate-limited:
- **Standard Users**: 10 requests per minute
- **Premium Users**: 30 requests per minute
- **Admin Users**: No limit

## Response Headers

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## Webhooks

Webhook events are triggered for:
- `content.generated`: When content is successfully generated
- `writer.assigned`: When a writer is auto-assigned
- `voice.validated`: When voice consistency is scored

## SDKs and Libraries

### TypeScript/JavaScript

```typescript
import { aiWritersContentGenerator } from './server/ai/writers/content-generator';

// Generate content
const content = await aiWritersContentGenerator.generate({
  contentType: 'hotel',
  topic: 'Burj Al Arab Dubai',
  keywords: ['luxury', '7-star']
});

// Get recommendations
const recommendations = await aiWritersContentGenerator.recommendWriter(
  'hotel',
  'Burj Al Arab Dubai'
);
```

## Migration from Legacy API

If you're currently using the legacy content generation:

**Old:**
```typescript
POST /api/ai/generate
{
  "type": "hotel",
  "topic": "Burj Al Arab",
  // Uses DEFAULT_CONTENT_RULES
}
```

**New:**
```typescript
POST /api/ai/generate
{
  "type": "hotel",
  "topic": "Burj Al Arab",
  // Automatically uses AI Writers system
  // Optionally specify: "writerId": "james-mitchell"
}
```

To explicitly use legacy (not recommended):
```typescript
POST /api/ai/generate
{
  "type": "hotel",
  "topic": "Burj Al Arab",
  "useWriters": false  // Opt-out
}
```

## Best Practices

1. **Auto-Assignment**: Let the system choose the writer for best results
2. **Voice Scores**: Monitor `writerVoiceScore` - scores below 70 may need regeneration
3. **Error Handling**: Always handle both success and error responses
4. **Caching**: Cache writer profiles to reduce API calls
5. **Rate Limits**: Implement exponential backoff for rate limit errors

## Support

For API issues or questions:
- Check the migration guide: `docs/ai-writers-migration-guide.md`
- Review implementation: `server/ai/writers/`
- Test endpoints with Postman/curl
- Monitor voice consistency scores

---

**Version**: 1.0.0  
**Last Updated**: 2025-12-24  
**Stability**: Production Ready
