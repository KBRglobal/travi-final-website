# Resilience Tests

This directory contains failure simulation tests that verify the TRAVI platform's resilience to various failure scenarios.

## Overview

These tests ensure that when external services fail or data is unavailable, the platform degrades gracefully without user-facing breakage.

## Test Files

### 1. `ai-provider-outage.test.ts`

**Purpose:** Simulates AI provider failures and verifies fallback behavior.

**Scenarios Tested:**
- Single provider failure with automatic failover to alternatives
- All providers unavailable (complete outage)
- Rate limiting and backpressure handling
- Credit exhaustion scenarios
- Provider status tracking and health monitoring
- Daily limit reset functionality

**Key Assertions:**
- ✅ Alternative providers are selected when primary fails
- ✅ Fallback responses include user-friendly messages
- ✅ Request IDs are generated for tracking
- ✅ Internal error details are NOT exposed to users
- ✅ Logging occurs for all fallback events
- ✅ Provider status is accurately tracked

### 2. `empty-cms.test.ts`

**Purpose:** Simulates empty database/CMS responses and verifies graceful degradation.

**Scenarios Tested:**
- Empty search results
- Missing content (404 scenarios)
- Zero destinations in database
- Zero articles/hotels/attractions
- Out-of-range pagination
- Session expiration

**Key Assertions:**
- ✅ User-friendly error messages (no technical jargon)
- ✅ Actionable suggestions provided
- ✅ Appropriate action URLs for recovery
- ✅ Consistent response structure
- ✅ No exceptions thrown for empty data
- ✅ Context preserved for debugging

### 3. `image-provider-failure.test.ts`

**Purpose:** Simulates image generation and retrieval failures.

**Scenarios Tested:**
- Image task routing invariant (must go through Image Engine)
- Freepik/OpenAI/Gemini provider outages
- Stock image service failures
- Image upload network errors
- Rate limiting on image APIs
- Credit exhaustion for image generation
- Image quality degradation
- Cache miss scenarios
- CDN fallback

**Key Assertions:**
- ✅ Direct image task routing is BLOCKED (invariant enforced)
- ✅ Error logging occurs for routing violations
- ✅ Placeholder images available as fallback
- ✅ Alt text remains accessible when images fail
- ✅ Credit tracking works correctly
- ✅ Daily credit reset restores availability

## Running Tests

```bash
# Run all resilience tests
npm test -- tests/resilience/

# Run specific test file
npm test -- tests/resilience/ai-provider-outage.test.ts
npm test -- tests/resilience/empty-cms.test.ts
npm test -- tests/resilience/image-provider-failure.test.ts

# Run with coverage
npm test -- tests/resilience/ --coverage

# Run in watch mode
npm test -- tests/resilience/ --watch
```

## Test Results Summary

| Test Suite | Scenarios | Focus Area |
|------------|-----------|------------|
| AI Provider Outage | 20+ | Provider failover, rate limits, credits |
| Empty CMS | 25+ | Database empty states, search fallbacks |
| Image Provider Failure | 25+ | Image generation, caching, CDN |

## Fallback Types Covered

All tests verify these standardized fallback types:

| Type | Scenario | User Message |
|------|----------|--------------|
| `SEARCH_NO_RESULTS` | No matches found | "No results found" |
| `CHAT_UNAVAILABLE` | AI chat service down | "Chat is temporarily unavailable" |
| `CONTENT_NOT_FOUND` | 404 errors | "Content not found" |
| `AI_OVERLOADED` | AI service overloaded | "Our AI is taking a breather" |
| `GENERIC_ERROR` | Unexpected errors | "Something went wrong" |
| `NETWORK_ERROR` | Connection issues | "Connection issue" |
| `RATE_LIMITED` | Too many requests | "Too many requests" |
| `SESSION_EXPIRED` | Auth timeout | "Session expired" |

## Design Principles Verified

1. **No User-Facing Breakage**
   - All failures result in graceful fallbacks
   - User always sees helpful messages, never stack traces

2. **Observability**
   - All fallback events are logged with request IDs
   - Timestamps included for debugging
   - Original errors captured but not exposed

3. **Actionable Recovery**
   - Every fallback includes a suggestion
   - Action buttons/links provided where appropriate
   - Users guided to alternative paths

4. **Invariant Enforcement**
   - Image tasks MUST route through Image Engine API
   - Direct routing attempts throw errors and are logged
   - Critical paths fail fast with clear messages

## Adding New Resilience Tests

When adding new failure scenarios:

1. Create test in appropriate file or new file
2. Use `getFallbackResponse()` for standardized responses
3. Mock the logger to verify logging occurs
4. Assert that:
   - `response.success === false`
   - `response.fallback === true`
   - Message contains no technical jargon
   - Suggestion is actionable
5. Update this README with new scenarios

## Related Files

- `server/fallbacks/fallback-handler.ts` - Fallback response generator
- `shared/fallback-messages.ts` - Standardized fallback messages
- `server/ai-orchestrator/provider-pool.ts` - AI provider management
- `server/ai-orchestrator/ai-orchestrator.ts` - Main AI orchestration

## Maintenance

These tests should be updated when:
- New external service integrations are added
- Fallback message content changes
- Provider pool configuration changes
- New failure modes are identified in production
