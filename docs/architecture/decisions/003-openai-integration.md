# ADR-003: Use OpenAI for AI Content Generation

## Status
**Accepted**

## Date
2024-01-01

---

## Context

The CMS requires AI-powered content generation for:

- Article writing
- SEO optimization
- Image generation
- Content enhancement
- Translation fallback

### Options Considered

1. **OpenAI** - GPT-4, DALL-E, market leader
2. **Anthropic Claude** - Strong reasoning, longer context
3. **Google PaLM/Gemini** - Google ecosystem
4. **Open source** - Llama, Mistral (self-hosted)

---

## Decision

We will use **OpenAI** as primary with **Anthropic Claude** as premium tier:

- **GPT-4o** - Standard content generation
- **GPT-4o-mini** - Quick tasks
- **Claude Sonnet 4** - Premium content
- **DALL-E 3** - Image generation

---

## Consequences

### Positive

- Best-in-class quality
- Reliable API
- Good documentation
- Fast response times
- DALL-E integration

### Negative

- Cost per API call
- Rate limits
- Vendor dependency
- Content moderation restrictions

### Mitigations

- Cache generated content
- Implement retry logic
- Add Claude as fallback
- Monitor usage/costs

---

## Implementation

```typescript
// Model selection
const model = tier === 'premium'
  ? 'claude-sonnet-4'
  : 'gpt-4o';

// Content rules enforced
const rules = {
  minWords: 1800,
  maxWords: 3500,
  minFaqs: 6
};
```

---

## References

- [OpenAI API](https://platform.openai.com/docs)
- [Anthropic API](https://docs.anthropic.com)
