# Architecture Decision Records (ADRs)

## What are ADRs?

Architecture Decision Records (ADRs) are documents that capture important architectural decisions made during the development of TRAVI CMS. Each ADR describes:

- The **context** and problem that led to the decision
- The **decision** that was made and its rationale
- The **consequences** of that decision (both positive and negative)
- **Alternatives** that were considered

## Why Use ADRs?

- **Documentation**: Preserve the reasoning behind key technical choices
- **Onboarding**: Help new team members understand why things are built the way they are
- **Historical Record**: Track the evolution of the system architecture
- **Consistency**: Ensure decisions are made thoughtfully and documented properly

## How to Use ADRs

### Reading ADRs

Browse the ADRs below to understand the key architectural decisions in TRAVI CMS. Each ADR is numbered sequentially and covers a specific topic.

### Creating New ADRs

1. Copy `template.md` to a new file: `docs/adr/XXX-title.md`
2. Use the next available number (e.g., 007, 008)
3. Fill in all sections thoroughly
4. Set status to "Proposed" for team review
5. After team approval, change status to "Accepted"

### ADR Statuses

| Status | Description |
|--------|-------------|
| **Proposed** | Decision is under discussion, not yet finalized |
| **Accepted** | Decision has been approved and is in effect |
| **Deprecated** | Decision was valid but has been replaced |
| **Superseded** | Decision was replaced by a newer ADR |

## Template

See [template.md](./template.md) for the standard ADR format.

---

## ADR Index

| Number | Title | Status | Date |
|--------|-------|--------|------|
| [ADR-001](./001-monorepo-structure.md) | Monorepo Structure | Accepted | 2024-01-01 |
| [ADR-002](./002-ai-provider-architecture.md) | Multi-Provider AI Architecture | Accepted | 2024-06-15 |
| [ADR-003](./003-content-block-system.md) | JSONB Content Blocks Design | Accepted | 2024-01-15 |
| [ADR-004](./004-api-versioning-strategy.md) | API Versioning Strategy | Accepted | 2024-09-01 |
| [ADR-005](./005-idor-protection-middleware.md) | IDOR Protection Middleware | Accepted | 2024-10-01 |
| [ADR-006](./006-optimistic-locking.md) | Optimistic Locking with ETags | Accepted | 2024-11-01 |

---

## Related Documentation

- [System Architecture Overview](../architecture/overview.md)
- [API Documentation](../api/overview.md)
- [Security Controls](../SECURITY-CONTROLS.md)
- [Conflict Resolution](../CONFLICT-RESOLUTION.md)
