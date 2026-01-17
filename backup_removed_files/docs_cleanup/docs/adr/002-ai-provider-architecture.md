# ADR-002: Multi-Provider AI Architecture with Failover

## Status

**Accepted**

## Date

2024-06-15

---

## Context

TRAVI CMS relies heavily on AI for content generation, SEO optimization, and automated writing. The system needs to:

- Generate high-quality travel content at scale
- Maintain high availability for AI features
- Manage costs across multiple AI providers
- Handle rate limits and API failures gracefully
- Support different models for different use cases

### Requirements

- High availability for AI-powered features
- Cost optimization across providers
- Automatic failover on errors or rate limits
- Support for multiple AI providers (OpenAI, Anthropic, DeepSeek, etc.)
- Unified interface for all AI operations
- Provider status tracking and health monitoring

---

## Alternatives Considered

### Option 1: Single Provider (OpenAI Only)

**Description**: Use OpenAI as the sole AI provider.

**Pros**:
- Simple implementation
- Consistent behavior
- Well-documented API

**Cons**:
- Single point of failure
- Rate limit issues during high usage
- No cost optimization options
- Vendor lock-in

### Option 2: Manual Provider Selection

**Description**: Allow users to choose which provider to use for each operation.

**Pros**:
- User control over provider choice
- Can optimize for specific use cases

**Cons**:
- Complex UX
- Requires users to understand provider differences
- No automatic failover

### Option 3: Unified Provider with Automatic Failover

**Description**: Create a unified interface that automatically tries multiple providers in priority order, with rate limit tracking and automatic failover.

**Pros**:
- Transparent to consuming code
- Automatic failover on failures
- Rate limit awareness
- Cost optimization by provider prioritization

**Cons**:
- More complex implementation
- Need to handle provider-specific differences
- Must maintain multiple provider integrations

---

## Decision

We implemented a **Unified AI Provider Architecture** with automatic failover:

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Request                                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              getAllUnifiedProviders()                        │
│   Returns available providers in priority order              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Provider Availability Check                     │
│   - Check rate limit status                                  │
│   - Check credit exhaustion status                           │
│   - Verify API key configuration                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Priority-Ordered Provider Chain                 │
│   1. Anthropic (Claude) - Primary                            │
│   2. OpenRouter         - Fallback                           │
│   3. DeepSeek           - Cost-effective fallback            │
│   4. OpenAI             - Legacy support                     │
│   5. Replit AI          - Free tier fallback                 │
└─────────────────────────────────────────────────────────────┘
```

### Provider Interface

```typescript
export interface UnifiedAIProvider {
  name: string;
  model: string;
  generateCompletion: (options: AICompletionOptions) => Promise<AICompletionResult>;
}

export interface AICompletionOptions {
  messages: AIMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: "json_object" } | { type: "text" };
}
```

### Rate Limit & Credit Tracking

```typescript
// Rate limits expire after 5 minutes
markProviderFailed(provider: string, reason: "rate_limited" | "no_credits");

// Credit exhaustion lasts 1 hour
hasNoCredits(provider: string): boolean;

// Check overall availability
isProviderAvailable(provider: string): boolean;
```

### Provider Priority

| Priority | Provider | Model | Use Case |
|----------|----------|-------|----------|
| 1 | Anthropic | claude-sonnet-4-5 | Primary, most reliable |
| 2 | OpenRouter | claude-3.5-sonnet | High availability fallback |
| 3 | DeepSeek | deepseek-chat | Cost-effective operations |
| 4 | OpenAI | gpt-4o-mini | Legacy compatibility |
| 5 | Replit AI | gpt-4o-mini | Free tier fallback |

### Content Tier System

```typescript
const premiumTypes = ['hotel', 'attraction', 'itinerary'];
const tier = premiumTypes.includes(contentType) ? 'premium' : 'standard';

// Premium: gpt-4o or claude-sonnet-4-5 with higher token limits
// Standard: gpt-4o-mini or deepseek-chat with standard limits
```

---

## Consequences

### Positive

- **High Availability**: System continues operating even when individual providers fail
- **Cost Optimization**: Prioritize cost-effective providers for standard operations
- **Automatic Recovery**: Rate-limited providers automatically return to rotation after cooldown
- **Transparency**: Provider status API exposes health information
- **Flexibility**: Easy to add new providers to the chain
- **Graceful Degradation**: Always has Replit AI as free fallback

### Negative

- **Implementation Complexity**: Must maintain integrations for each provider
- **Response Variability**: Different providers may produce slightly different outputs
- **Configuration Overhead**: Multiple API keys to manage
- **Testing Complexity**: Need to test failover scenarios

### Neutral

- Different providers have different token limits and pricing
- Some providers may not support all features (e.g., JSON mode)

---

## Mitigations

1. **Response Variability**: Use consistent system prompts and validation across providers
2. **Configuration**: Use environment variable fallbacks and clear documentation
3. **Testing**: Implement integration tests that mock provider failures
4. **Monitoring**: Provider status endpoint exposes current state

### Provider Status API

```typescript
GET /api/ai/providers

[
  {
    "name": "Anthropic (Claude)",
    "model": "claude-sonnet-4-5",
    "status": "available",
    "message": "Ready"
  },
  {
    "name": "OpenAI",
    "model": "gpt-4o-mini",
    "status": "rate_limited",
    "message": "Temporarily rate limited",
    "retryAfter": 180
  }
]
```

---

## References

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Anthropic Claude Documentation](https://docs.anthropic.com)
- [OpenRouter API](https://openrouter.ai/docs)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2024-06-15 | Initial multi-provider architecture | TRAVI Team |
| 2024-09-01 | Added Replit AI as fallback | TRAVI Team |
| 2024-12-01 | Added credit exhaustion tracking | TRAVI Team |
