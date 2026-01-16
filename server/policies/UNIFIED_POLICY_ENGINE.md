# Unified Policy Engine

**Date:** 2026-01-01
**Status:** Active
**Location:** `/server/policies/unified-policy-engine.ts`

## Executive Summary

This document describes the consolidation of three separate policy engines into a unified system that provides a single interface for all policy evaluations across the TravisEOAEO platform.

## Background

Prior to consolidation, the platform had **three separate policy engines**, each serving a distinct purpose:

### 1. Governance Policy Engine
- **Location:** `/server/policies/policy-engine.ts`
- **Feature Flag:** `ENABLE_POLICY_ENFORCEMENT`
- **Purpose:** Action/resource/role-based policies with flexible condition evaluation
- **Strengths:**
  - Flexible condition-based evaluation
  - Built-in policies support
  - Database-driven policy management
  - Three effects: `allow`, `warn`, `block`
  - Policy evaluation logging and analytics
- **Usage:** 1 file (governance routes)

### 2. Access Control Policy Engine (RBAC)
- **Location:** `/server/access-control/policy-engine.ts`
- **Feature Flag:** `ENABLE_RBAC`
- **Purpose:** Role-Based Access Control with permission scoping
- **Strengths:**
  - User context management with caching
  - Role hierarchy support
  - Scoped permissions (global, locale, contentId, entityId, teamId)
  - Simple `can(user, action, resource)` interface
- **Usage:** **20+ files** (most widely used)

### 3. Autonomy Policy Engine
- **Location:** `/server/autonomy/policy/policy-engine.ts`
- **Feature Flag:** `ENABLE_AUTONOMY_POLICY`
- **Purpose:** Autonomous action control with budget enforcement
- **Strengths:**
  - Budget tracking (tokens, AI spend, writes, mutations)
  - Time window restrictions
  - Approval workflow support
  - Fail-closed design with timeout protection
  - Action execution recording
- **Usage:** 7 files (autonomy features)

## The Problem

Having three separate policy engines created several issues:

1. **Fragmentation:** Different parts of the codebase used different policy systems
2. **Duplication:** Common concerns (caching, logging, feature flags) were reimplemented
3. **Complexity:** No single place to evaluate all applicable policies for an action
4. **Integration Gaps:** Hard to combine RBAC with budget limits or governance policies
5. **Cognitive Load:** Developers had to understand three different systems

## The Solution: Unified Policy Engine

The unified engine provides:

### 1. Single Interface
One function to evaluate any type of policy:
```typescript
const result = await evaluateUnifiedPolicy(request);
```

### 2. Intelligent Delegation
Routes requests to the appropriate specialized engine based on policy type:
- `type: 'governance'` → Governance engine
- `type: 'access'` → Access control engine
- `type: 'autonomy'` → Autonomy engine
- `type: 'combined'` → All applicable engines

### 3. Cross-Cutting Concerns
Centralized handling of:
- Caching (configurable TTL)
- Logging and metrics
- Feature flag management
- Performance monitoring
- Error handling

### 4. Backward Compatibility
- All three legacy engines remain functional
- Existing code continues to work
- Migration can happen progressively
- Clear deprecation notices guide new development

## Usage Examples

### Simple Access Check (RBAC)
```typescript
import { evaluateUnifiedPolicy } from './unified-policy-engine';

const result = await evaluateUnifiedPolicy({
  type: 'access',
  userId: 'user-123',
  action: 'edit',
  resource: 'content',
  resourceId: 'content-456'
});

if (!result.allowed) {
  throw new Error(result.reason);
}
```

### Governance Policy Check
```typescript
const result = await evaluateUnifiedPolicy({
  type: 'governance',
  userId: 'user-123',
  action: 'publish',
  resource: 'content',
  context: {
    contentStatus: 'draft',
    score: 85,
    locale: 'en-US'
  }
});

if (result.effect === 'block') {
  console.error('Blocked by:', result.blockedBy);
}

if (result.warnings.length > 0) {
  console.warn('Warnings:', result.warnings);
}
```

### Autonomy Budget Check
```typescript
const result = await evaluateUnifiedPolicy({
  type: 'autonomy',
  target: { type: 'feature', feature: 'aeo' },
  action: 'ai_generate',
  estimatedTokens: 1000,
  estimatedAiSpend: 50,
  requesterId: 'user-123'
});

if (result.effect === 'warn') {
  console.warn('Budget warning:', result.warnings);
}
```

### Combined Check (All Applicable Policies)
```typescript
const result = await evaluateUnifiedPolicy({
  type: 'combined',
  userId: 'user-123',
  action: 'ai_generate',
  resource: 'content',
  userRoles: ['editor'],
  target: { type: 'feature', feature: 'aeo' },
  estimatedTokens: 1000,
  estimatedAiSpend: 50,
  context: {
    contentStatus: 'draft',
    locale: 'en-US'
  }
});

// This checks:
// 1. RBAC permissions (can user edit content?)
// 2. Governance policies (is AI generation allowed for this content?)
// 3. Autonomy budgets (within token/spend limits?)

if (!result.allowed) {
  console.error('Request denied:', result.reason);
  console.error('Blocked by:', result.blockedBy);
  console.error('Warnings:', result.warnings);
}
```

### Convenience Functions
```typescript
// Quick boolean check
const allowed = await isAllowed({
  type: 'access',
  userId: 'user-123',
  action: 'edit',
  resource: 'content'
});

// Check with warnings
const { allowed, warnings } = await checkWithWarnings({
  type: 'governance',
  action: 'publish',
  resource: 'content',
  context: { score: 85 }
});

// Simple RBAC wrapper
const canEdit = await canUserAccess('user-123', 'edit', 'content');

// Autonomy limits check
const result = await checkAutonomyLimits(
  { type: 'feature', feature: 'aeo' },
  'ai_generate',
  { tokens: 1000, aiSpend: 50 }
);
```

## Configuration

### Feature Flags

```bash
# Enable unified engine (optional - can still use legacy engines)
ENABLE_UNIFIED_POLICY_ENGINE=true

# Enable individual engines (existing flags)
ENABLE_POLICY_ENFORCEMENT=true  # Governance policies
ENABLE_RBAC=true                # Access control
ENABLE_AUTONOMY_POLICY=true     # Autonomy budgets

# Unified engine options
UNIFIED_POLICY_CACHE=true           # Enable result caching
UNIFIED_POLICY_LOGGING=true         # Enable evaluation logging
```

### Cache Configuration

The unified engine caches policy evaluation results for performance:

- **TTL:** 30 seconds (configurable)
- **Max Size:** 500 entries
- **Eviction:** LRU (least recently used)
- **Bypass:** Autonomy policies are not cached (due to budget state)

Clear the cache:
```typescript
import { clearUnifiedPolicyCache } from './unified-policy-engine';

clearUnifiedPolicyCache();
```

## Migration Guide

### From Governance Engine
```typescript
// Old
import { evaluatePolicies } from './policy-engine';
const decision = await evaluatePolicies(context);

// New
import { evaluateUnifiedPolicy } from './unified-policy-engine';
const result = await evaluateUnifiedPolicy({
  type: 'governance',
  userId: context.userId,
  action: context.action,
  resource: context.resource,
  context: context.metadata
});
```

### From Access Control Engine
```typescript
// Old
import { can } from '../access-control/policy-engine';
const result = await can(userId, 'edit', 'content', context);

// New
import { canUserAccess } from '../policies/unified-policy-engine';
const allowed = await canUserAccess(userId, 'edit', 'content', context);
```

### From Autonomy Engine
```typescript
// Old
import { evaluatePolicy } from './policy-engine';
const result = await evaluatePolicy(target, action, context);

// New
import { checkAutonomyLimits } from '../../policies/unified-policy-engine';
const result = await checkAutonomyLimits(target, action, {
  tokens: context.estimatedTokens,
  aiSpend: context.estimatedAiSpend
});
```

## Response Format

All unified policy evaluations return a `UnifiedPolicyResult`:

```typescript
interface UnifiedPolicyResult {
  // Final decision
  effect: 'allow' | 'warn' | 'block';
  allowed: boolean;
  reason: string;

  // Detailed results from each engine
  details: {
    governance?: GovernancePolicyDecision;
    access?: PermissionCheckResult;
    autonomy?: PolicyEvaluationResult;
  };

  // Aggregated warnings and blocks
  warnings: string[];
  blockedBy: string[];

  // Metadata
  meta: {
    evaluatedAt: Date;
    enginesUsed: PolicyEngineType[];
    cacheable: boolean;
    executionTimeMs: number;
  };
}
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│         Unified Policy Engine Interface             │
│                                                      │
│  evaluateUnifiedPolicy(request)                     │
│  ├─ Cache lookup                                    │
│  ├─ Route to specialized engine(s)                  │
│  ├─ Aggregate results                               │
│  ├─ Cache result                                    │
│  └─ Log evaluation                                  │
└─────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Governance  │  │    Access    │  │   Autonomy   │
│    Engine    │  │   Control    │  │    Engine    │
│              │  │    Engine    │  │              │
│ - Conditions │  │ - RBAC       │  │ - Budgets    │
│ - Rules      │  │ - Roles      │  │ - Time       │
│ - Effects    │  │ - Scopes     │  │ - Approvals  │
└──────────────┘  └──────────────┘  └──────────────┘
```

## Decision Making: Combined Evaluations

When using `type: 'combined'`, policies are evaluated in order:

1. **Access Control (RBAC)** - Most fundamental check
   - If denied → Block immediately
   - Super admin → Allow and skip other checks

2. **Governance Policies** - Business rules
   - If any policy blocks → Final result is block
   - If any policy warns → Final result is at least warn

3. **Autonomy Policies** - Budget/resource limits
   - If budget exhausted → Block
   - If approaching limit → Warn

**Final Effect:**
- If ANY engine blocks → `block`
- If ANY engine warns (and none block) → `warn`
- If ALL engines allow → `allow`

## Performance Considerations

### Caching
- Results cached for 30 seconds
- Cache hit significantly improves performance
- Autonomy evaluations not cached (budget state changes)

### Execution Time
- Access control: ~10-50ms (includes user context lookup)
- Governance: ~20-100ms (includes DB query for policies)
- Autonomy: ~30-150ms (includes budget counter queries)
- Combined: ~50-300ms (runs multiple engines)

### Optimization Tips
1. Use specific policy types when possible (not always `combined`)
2. Enable caching in production
3. Monitor `executionTimeMs` in results
4. Consider pre-warming cache for common checks

## Monitoring & Metrics

### Get Statistics
```typescript
import { getUnifiedPolicyStats } from './unified-policy-engine';

const stats = await getUnifiedPolicyStats();
console.log('Cache size:', stats.cacheSize);
console.log('Active policies:', stats.governance.activePolicies);
```

### Logging
Enable detailed logging:
```bash
UNIFIED_POLICY_LOGGING=true
NODE_ENV=development
```

Logs include:
- Policy type evaluated
- Final effect and allowed status
- Engines used
- Execution time

## Testing

### Unit Tests
```typescript
import { evaluateUnifiedPolicy } from './unified-policy-engine';

describe('UnifiedPolicyEngine', () => {
  it('should allow access for permitted users', async () => {
    const result = await evaluateUnifiedPolicy({
      type: 'access',
      userId: 'user-123',
      action: 'view',
      resource: 'content'
    });

    expect(result.allowed).toBe(true);
  });

  it('should block when budget exhausted', async () => {
    const result = await evaluateUnifiedPolicy({
      type: 'autonomy',
      target: { type: 'feature', feature: 'aeo' },
      action: 'ai_generate',
      estimatedTokens: 1000000 // Way over limit
    });

    expect(result.allowed).toBe(false);
    expect(result.blockedBy).toContain('BUDGET_EXHAUSTED');
  });
});
```

## Future Enhancements

1. **Policy Composition:** Define policies that combine multiple engines declaratively
2. **Policy as Code:** GitOps-style policy management
3. **Real-time Policy Updates:** WebSocket updates when policies change
4. **Policy Simulation:** Test mode to see what would happen without enforcing
5. **Advanced Analytics:** Policy effectiveness metrics, false positive rates
6. **GraphQL Integration:** Policy checks in GraphQL resolvers
7. **Rate Limiting:** Built-in rate limiting based on policies

## FAQ

### Q: Do I need to migrate existing code immediately?
**A:** No. All three legacy engines continue to work. Migrate progressively.

### Q: Which policy type should I use?
**A:**
- `access` - For basic permission checks (who can do what)
- `governance` - For business rules (content quality, workflow gates)
- `autonomy` - For resource limits (AI budget, API quotas)
- `combined` - When you need comprehensive checks

### Q: What happens if a policy engine is disabled?
**A:** The unified engine checks feature flags and skips disabled engines. Only enabled engines are evaluated.

### Q: How do I debug policy denials?
**A:** Check the `result.details` object for engine-specific information. Enable logging to see evaluation details.

### Q: Can I add custom policy engines?
**A:** Currently no, but this is planned for future versions. The architecture supports it.

## Support

For questions or issues:
- Check the deprecation notices in legacy engine files
- Review the examples in this document
- Examine the unified engine source code (well-documented)
- Search for usage examples in the codebase

## Related Files

- `/server/policies/unified-policy-engine.ts` - Main implementation
- `/server/policies/policy-engine.ts` - Legacy governance engine
- `/server/access-control/policy-engine.ts` - Legacy RBAC engine
- `/server/autonomy/policy/policy-engine.ts` - Legacy autonomy engine
- `/server/policies/types.ts` - Governance policy types
- `/server/access-control/types.ts` - Access control types
- `/server/autonomy/policy/types.ts` - Autonomy policy types

---

**Last Updated:** 2026-01-01
**Author:** System Consolidation Initiative
**Version:** 1.0.0
