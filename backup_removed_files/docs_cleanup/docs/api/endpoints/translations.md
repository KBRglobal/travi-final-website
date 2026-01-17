# 🌐 Translations API

> Multi-language translation endpoints

---

## 📋 Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/locales` | List languages |
| `GET` | `/api/translations/:contentId` | Get translations |
| `POST` | `/api/translations/:contentId/translate` | Translate content |
| `POST` | `/api/contents/:id/translate-all` | Translate to all |

---

## 🌍 Supported Languages

| Code | Language | Service |
|------|----------|---------|
| `en` | English | Base |
| `ar` | Arabic | DeepL |
| `zh` | Chinese | DeepL |
| `ru` | Russian | DeepL |
| `fr` | French | DeepL |
| `de` | German | DeepL |
| `es` | Spanish | DeepL |
| `tr` | Turkish | DeepL |
| `it` | Italian | DeepL |
| `ja` | Japanese | DeepL |
| `ko` | Korean | DeepL |
| `hi` | Hindi | Claude |
| `ur` | Urdu | Claude |
| `bn` | Bengali | Claude |
| `fa` | Persian | Claude |
| `fil` | Filipino | Claude |
| `he` | Hebrew | Claude |

---

## GET /api/locales

Get list of supported locales.

### Response

```json
[
  { "code": "en", "name": "English", "native": "English" },
  { "code": "ar", "name": "Arabic", "native": "العربية" },
  { "code": "he", "name": "Hebrew", "native": "עברית" }
]
```

---

## GET /api/translations/:contentId

Get all translations for content.

### Response

```json
[
  {
    "id": 1,
    "contentId": 5,
    "locale": "ar",
    "title": "دليل دبي مارينا",
    "body": "...",
    "seoTitle": "...",
    "seoDescription": "...",
    "translatedAt": "2024-12-23T00:00:00Z"
  },
  {
    "id": 2,
    "contentId": 5,
    "locale": "he",
    "title": "מדריך דובאי מרינה",
    "body": "..."
  }
]
```

---

## GET /api/translations/:contentId/:locale

Get specific translation.

### Example

```bash
GET /api/translations/5/ar
```

### Response

```json
{
  "id": 1,
  "contentId": 5,
  "locale": "ar",
  "title": "دليل دبي مارينا",
  "body": "المحتوى المترجم...",
  "isManuallyEdited": false,
  "translatedAt": "2024-12-23T00:00:00Z"
}
```

---

## POST /api/translations/:contentId/translate

Translate content to specific language.

### Request Body

```json
{
  "locale": "ar"
}
```

### Response

```json
{
  "id": 1,
  "contentId": 5,
  "locale": "ar",
  "title": "دليل دبي مارينا",
  "body": "...",
  "service": "deepl",
  "translatedAt": "2024-12-23T00:00:00Z"
}
```

---

## POST /api/translations/:contentId/translate-all

Translate to all supported languages.

### Response

```json
{
  "success": true,
  "translations": [
    { "locale": "ar", "status": "completed" },
    { "locale": "he", "status": "completed" },
    { "locale": "zh", "status": "completed" }
  ],
  "failed": []
}
```

---

## PUT /api/translations/:contentId/:locale

Update/override translation manually.

### Request Body

```json
{
  "title": "Updated translated title",
  "body": "Updated translated body"
}
```

### Response

```json
{
  "id": 1,
  "isManuallyEdited": true,
  "updatedAt": "2024-12-23T01:00:00Z"
}
```

---

## DELETE /api/translations/:id

Delete specific translation.

### Response

```json
{
  "success": true
}
```

---

## GET /api/translations/coverage

Get translation coverage statistics.

### Response

```json
{
  "total": 100,
  "byLocale": {
    "ar": { "translated": 85, "percentage": 85 },
    "he": { "translated": 70, "percentage": 70 },
    "zh": { "translated": 60, "percentage": 60 }
  }
}
```

---

## GET /api/translations/stats

Detailed translation statistics.

### Response

```json
{
  "totalContents": 100,
  "translationsByLocale": {...},
  "recentTranslations": [...],
  "pendingTranslations": [...]
}
```

---

## GET /api/translations/usage

API usage statistics.

### Response

```json
{
  "deepl": {
    "charactersUsed": 500000,
    "limit": 1000000,
    "percentage": 50
  },
  "claude": {
    "tokensUsed": 10000
  }
}
```

---

## POST /api/contents/:id/cancel-translation

Cancel ongoing translation.

### Response

```json
{
  "success": true,
  "message": "Translation cancelled"
}
```

---

## GET /api/contents/:id/translation-status

Check translation job status.

### Response

```json
{
  "status": "in_progress",
  "completed": ["ar", "he"],
  "pending": ["zh", "ru"],
  "failed": []
}
```

---

## ⚠️ Error Handling

### Unsupported Language

```json
{
  "error": {
    "code": "UNSUPPORTED_LOCALE",
    "message": "Language 'xyz' is not supported"
  }
}
```

### Translation Failed

```json
{
  "error": {
    "code": "TRANSLATION_FAILED",
    "message": "Translation service error",
    "details": "DeepL API quota exceeded"
  }
}
```

---

## 💡 Best Practices

1. Translate to high-priority languages first
2. Review AI translations before publishing
3. Use manual override for critical content
4. Monitor API usage/quotas
5. Batch translations during off-peak hours
