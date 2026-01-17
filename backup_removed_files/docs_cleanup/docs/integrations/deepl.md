# 🌐 DeepL Integration

> Translation service integration

---

## 📋 Overview

DeepL provides high-quality translations for 11 languages, with Claude Haiku fallback for 6 additional languages.

---

## ⚙️ Configuration

### Environment Variables

```bash
DEEPL_API_KEY=your-deepl-api-key
```

### Get API Key

1. Go to [deepl.com/pro](https://www.deepl.com/pro)
2. Create account
3. Subscribe to API plan
4. Get API key

---

## 🌍 Supported Languages

### DeepL Languages

| Code | Language |
|------|----------|
| `ar` | Arabic |
| `zh` | Chinese |
| `ru` | Russian |
| `fr` | French |
| `de` | German |
| `es` | Spanish |
| `tr` | Turkish |
| `it` | Italian |
| `ja` | Japanese |
| `ko` | Korean |
| `en` | English |

### Claude Fallback

| Code | Language |
|------|----------|
| `hi` | Hindi |
| `ur` | Urdu |
| `bn` | Bengali |
| `fa` | Persian |
| `fil` | Filipino |
| `he` | Hebrew |

---

## 🔌 Usage

### Translate Content

```typescript
// server/services/deepl-service.ts
import * as deepl from 'deepl-node';

const translator = new deepl.Translator(process.env.DEEPL_API_KEY);

const result = await translator.translateText(
  text,
  null,  // Detect source language
  targetLang
);
```

### API Endpoint

```bash
POST /api/translations/:contentId/translate
{
  "locale": "ar"
}
```

---

## 💰 Pricing

### DeepL API

| Plan | Characters/Month | Price |
|------|------------------|-------|
| Free | 500,000 | $0 |
| Pro | Unlimited | $25/month + usage |

### Usage Pricing (Pro)

| Volume | Price |
|--------|-------|
| First 5M | $20/1M chars |
| After 5M | $10/1M chars |

---

## 📊 Usage Tracking

### Check Usage

```bash
GET /api/translations/usage
```

### Response

```json
{
  "deepl": {
    "charactersUsed": 500000,
    "limit": 1000000,
    "percentage": 50
  }
}
```

---

## ⚠️ Rate Limits

| Limit | Value |
|-------|-------|
| Requests/second | 5 |
| Characters/request | 128,000 |

---

## 🔧 Fallback Logic

```typescript
async function translate(text, targetLang) {
  // Check if DeepL supports language
  if (DEEPL_LANGUAGES.includes(targetLang)) {
    return await deeplTranslate(text, targetLang);
  }

  // Fallback to Claude Haiku
  return await claudeTranslate(text, targetLang);
}
```

---

## 🔧 Troubleshooting

### Quota Exceeded

```
Error: Quota exceeded
```

Solution: Upgrade plan or wait for reset

### Language Not Supported

```
Error: Target language not supported
```

Solution: Uses Claude fallback automatically

---

## 📚 Related

- [Translation API](../api/endpoints/translations.md)
- [Multi-language Feature](../features/translation.md)
