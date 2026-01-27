# Image Intelligence Service

Automatic image processing system with AI-powered analysis, multi-language alt text generation, and smart compression.

## Features

- **AI Image Analysis**: Uses OpenAI Vision API to analyze image content
- **Multi-Language Alt Text**: Generates alt text in all 30 supported languages
- **SEO-Friendly Filenames**: Auto-generates descriptive filenames
- **Smart Compression**: Target-based compression for different usage contexts
- **Format Optimization**: Automatic WebP/PNG selection based on image characteristics

## API Endpoints

### POST /api/media-intelligence/process

Process a single image with full AI pipeline.

**Request:**

```
Content-Type: multipart/form-data

image: [file]
usage: hero | thumbnail | gallery | inline | icon | og-image
contentType: destination | attraction | hotel | guide | article
destination: "Paris" (optional)
entityName: "Eiffel Tower" (optional)
locales: "en,ar,fr,zh" (comma-separated, optional)
generateThumbnail: "true" | "false"
generateOgImage: "true" | "false"
```

**Response:**

```json
{
  "success": true,
  "urls": {
    "main": "/uploads/images/destination/paris-eiffel-tower-hero-abc123.webp",
    "thumbnail": "/uploads/images/destination/thumbnails/thumb-paris-eiffel-tower-hero-abc123.webp"
  },
  "filename": "paris-eiffel-tower-hero-abc123.webp",
  "analysis": {
    "description": "Eiffel Tower at sunset with golden sky in Paris",
    "subjects": ["Eiffel Tower", "sunset", "cityscape"],
    "scene": "landmark",
    "mood": "romantic",
    "keywords": ["paris", "eiffel tower", "sunset", "france", "landmark"],
    "hasText": false,
    "dominantColors": ["#FFD700", "#1E90FF", "#2F4F4F"],
    "confidence": 0.92
  },
  "altTexts": [
    {
      "locale": "en",
      "altText": "Eiffel Tower landmark in Paris - romantic atmosphere",
      "title": "Eiffel Tower"
    },
    { "locale": "ar", "altText": "برج إيفل في باريس - أجواء رومانسية", "title": "برج إيفل" },
    {
      "locale": "fr",
      "altText": "Tour Eiffel à Paris - atmosphère romantique",
      "title": "Tour Eiffel"
    }
  ],
  "metadata": {
    "originalSize": 2500000,
    "processedSize": 285000,
    "compressionRatio": 89,
    "format": "webp",
    "width": 1920,
    "height": 1080
  }
}
```

### POST /api/media-intelligence/analyze

Analyze image without processing (returns analysis only).

### POST /api/media-intelligence/generate-alt

Generate alt text for existing image URL.

**Request:**

```json
{
  "imageUrl": "https://example.com/image.jpg",
  "context": {
    "usage": "hero",
    "contentType": "destination",
    "destination": "Paris"
  },
  "locales": ["en", "ar", "fr", "zh", "hi"]
}
```

### POST /api/media-intelligence/compress

Compress image to target size for specific usage.

### POST /api/media-intelligence/batch

Process multiple images in batch (max 10).

### GET /api/media-intelligence/supported-locales

Get list of supported locales for alt text generation.

### GET /api/media-intelligence/size-targets

Get size targets for different usage types.

## Size Targets

| Usage     | Max Width | Max Height | Max Size | Quality |
| --------- | --------- | ---------- | -------- | ------- |
| hero      | 1920px    | 1080px     | 300KB    | 85      |
| thumbnail | 400px     | 300px      | 50KB     | 80      |
| gallery   | 1200px    | 800px      | 200KB    | 85      |
| inline    | 800px     | 600px      | 150KB    | 80      |
| icon      | 128px     | 128px      | 20KB     | 75      |
| og-image  | 1200px    | 630px      | 200KB    | 90      |

## Usage in Code

```typescript
import { imageIntelligence } from "@/server/media-intelligence";

// Process single image
const result = await imageIntelligence.processImageIntelligent(
  imageBuffer,
  {
    usage: "hero",
    contentType: "destination",
    destination: "Paris",
    entityName: "Eiffel Tower",
  },
  {
    locales: ["en", "ar", "fr", "zh", "hi"],
    generateThumbnail: true,
    generateOgImage: true,
  }
);

console.log(result.altTexts); // Alt text in 5 languages
console.log(result.metadata.compressionRatio); // e.g., 89%
```

## Supported Languages (30)

**Tier 1 - Core:** English, Arabic, Hindi
**Tier 2 - High ROI:** Chinese, Russian, Urdu, French, Indonesian
**Tier 3 - Growing:** German, Persian, Bengali, Filipino, Thai, Vietnamese, Malay
**Tier 4 - Niche:** Spanish, Turkish, Italian, Japanese, Korean, Hebrew, Portuguese
**Tier 5 - European:** Dutch, Polish, Swedish, Greek, Czech, Romanian, Ukrainian, Hungarian
