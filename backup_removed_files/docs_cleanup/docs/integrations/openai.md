# 🤖 OpenAI Integration

> AI content generation with OpenAI

---

## 📋 Overview

| Feature | Model |
|---------|-------|
| Content Generation | GPT-4o |
| Quick Tasks | GPT-4o-mini |
| Image Generation | DALL-E 3 |

---

## ⚙️ Configuration

### Environment Variables

```bash
OPENAI_API_KEY=sk-your-api-key
AI_INTEGRATIONS_OPENAI_API_KEY=sk-your-api-key  # Optional override
AI_INTEGRATIONS_OPENAI_BASE_URL=  # Optional custom endpoint
```

### Get API Key

1. Go to [platform.openai.com](https://platform.openai.com)
2. Create account / Sign in
3. Go to API Keys
4. Create new key
5. Copy and add to `.env`

---

## 🔌 Usage

### Content Generation

```typescript
// server/ai-generator.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Write about ${topic}` },
  ],
  temperature: 0.7,
});
```

### Image Generation

```typescript
const response = await openai.images.generate({
  model: 'dall-e-3',
  prompt: 'Dubai Marina skyline at sunset',
  size: '1024x1024',
  quality: 'standard',
  n: 1,
});
```

---

## 📝 Content Rules

AI follows these rules:

| Rule | Value |
|------|-------|
| Min words | 1800 |
| Max words | 3500 |
| Min FAQs | 6 |
| Max FAQs | 10 |
| Internal links | 5-10 |
| Keyword density | 1-3% |

---

## 💰 Pricing

### GPT-4o

| Usage | Price |
|-------|-------|
| Input | $2.50 / 1M tokens |
| Output | $10.00 / 1M tokens |

### DALL-E 3

| Size | Quality | Price |
|------|---------|-------|
| 1024x1024 | Standard | $0.040 |
| 1024x1024 | HD | $0.080 |
| 1792x1024 | Standard | $0.080 |

---

## ⚠️ Rate Limits

| Tier | RPM | TPM |
|------|-----|-----|
| Tier 1 | 500 | 30,000 |
| Tier 2 | 5,000 | 450,000 |
| Tier 3 | 5,000 | 800,000 |

### Handling Limits

```typescript
// Retry with exponential backoff
async function generateWithRetry(prompt, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await openai.chat.completions.create({...});
    } catch (error) {
      if (error.status === 429) {
        await sleep(Math.pow(2, i) * 1000);
        continue;
      }
      throw error;
    }
  }
}
```

---

## 🔧 Troubleshooting

### API Key Invalid

```
Error: Invalid API key
```

Solution: Check API key is correct and has credits

### Rate Limited

```
Error: Rate limit exceeded
```

Solution: Wait and retry, or upgrade tier

### Content Filtered

```
Error: Content filtered
```

Solution: Modify prompt to be less sensitive

---

## 📚 Related

- [AI API Endpoints](../api/endpoints/ai.md)
- [Premium Content](./anthropic.md)
