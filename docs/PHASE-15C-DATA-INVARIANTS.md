# Phase 15C: Data Consistency & System Invariants

**Date:** 2026-01-01
**Author:** System Architect
**Purpose:** Define non-negotiable system invariants and consistency guarantees

---

## 1. Core System Invariants

These invariants MUST always hold. Violation indicates a bug requiring immediate fix.

### Invariant 1: Published Content Completeness

```
INVARIANT: Published content has all required fields populated
MUST BE TRUE: status = 'published' ⟹ (title ≠ NULL ∧ slug ≠ NULL ∧ blocks ≠ [])
```

**Enforcement:** Code (pre-publish validation)
**Location:** `server/content/content-lifecycle.ts:canPublish()`

---

### Invariant 2: Entity Link Validity

```
INVARIANT: All entity links in responses point to existing entities
MUST BE TRUE: ∀ link ∈ chat_response.links: resolveEntityLink(link) ≠ NULL
```

**Enforcement:** Code (entity-resolver validation)
**Location:** `server/navigation/entity-resolver.ts`

---

### Invariant 3: Content Type Consistency

```
INVARIANT: Content type matches associated type-specific record
MUST BE TRUE: content.type = 'hotel' ⟹ ∃ hotel WHERE hotel.contentId = content.id
```

**Enforcement:** Database (should be code)
**Gap:** Currently no validation that type-specific record exists

---

### Invariant 4: Slug Uniqueness

```
INVARIANT: Published content slugs are unique within type
MUST BE TRUE: ∀ c1, c2 ∈ published_content: c1.slug = c2.slug ∧ c1.type = c2.type ⟹ c1.id = c2.id
```

**Enforcement:** Database (unique constraint)
**Location:** `shared/schema.ts` - needs composite unique index

---

### Invariant 5: Event-Subscriber Consistency

```
INVARIANT: Content publish always triggers downstream updates
MUST BE TRUE: content.status → 'published' ⟹ (search_indexed ∧ aeo_generated)
```

**Enforcement:** Code (event subscribers)
**Gap:** Failures logged but not tracked; no retry mechanism

---

### Invariant 6: Cache-Database Consistency

```
INVARIANT: Cached data eventually matches database state
MUST BE TRUE: ∀ cache_entry: age(cache_entry) > TTL ⟹ cache_entry = database_value
```

**Enforcement:** Code (TTL expiry)
**Gap:** No active invalidation on all mutation paths

---

### Invariant 7: Audit Trail Completeness

```
INVARIANT: All state changes logged to audit table
MUST BE TRUE: ∀ content_mutation: ∃ audit_log WHERE audit_log.entityId = content.id
```

**Enforcement:** Code (audit logging)
**Location:** `server/content/content-lifecycle.ts`

---

### Invariant 8: Rate Limit Enforcement

```
INVARIANT: AI requests respect provider rate limits
MUST BE TRUE: requests_per_minute(provider) ≤ provider.limit
```

**Enforcement:** Code (token bucket)
**Location:** `server/ai/request-queue.ts`

---

### Invariant 9: Translation Source Consistency

```
INVARIANT: Translations always have valid source content
MUST BE TRUE: ∀ translation: ∃ content WHERE content.id = translation.contentId
```

**Enforcement:** Database (foreign key with CASCADE DELETE)

---

### Invariant 10: Search Index Freshness

```
INVARIANT: Search index reflects published state within N seconds
MUST BE TRUE: time(search_index_update) - time(publish) < 30s
```

**Enforcement:** Code (event subscriber)
**Gap:** No monitoring for update latency

---

### Invariant 11: Entity Extraction Persistence

```
INVARIANT: Octopus-extracted entities are persisted to database
MUST BE TRUE: octopus_extraction_complete ⟹ ∀ entity ∈ extraction: entity_persisted(entity)
```

**Enforcement:** Code (Phase 15C fix)
**Location:** `server/octopus/orchestrator.ts`

---

### Invariant 12: Internal Links Database-Driven

```
INVARIANT: Internal linking uses database content as primary source
MUST BE TRUE: new_content_published ⟹ available_for_internal_linking(content)
```

**Enforcement:** Code (Phase 15C fix)
**Location:** `server/ai/internal-linking-engine.ts`

---

### Invariant 13: No Orphaned Type Records

```
INVARIANT: Type-specific records always have parent content
MUST BE TRUE: ∀ hotel: ∃ content WHERE content.id = hotel.contentId
```

**Enforcement:** Database (CASCADE DELETE)
**Validation:** Should add periodic integrity check

---

### Invariant 14: Job Idempotency

```
INVARIANT: Background jobs are idempotent and retriable
MUST BE TRUE: execute(job) = execute(job, job) (same outcome)
```

**Enforcement:** Code (job handlers)
**Gap:** Some jobs not designed for idempotency

---

### Invariant 15: Webhook Delivery Tracking

```
INVARIANT: Webhook delivery attempts are logged
MUST BE TRUE: ∀ webhook_trigger: ∃ log_entry
```

**Enforcement:** Code (should be implemented)
**Gap:** Currently fire-and-forget with console.error only

---

## 2. Consistency Gaps Analysis

### Gap 1: No Database Transactions

**Problem:** Multi-table updates lack transaction boundaries

```typescript
// Current: 9 separate commits
await storage.updateContent(id, data);        // Commit 1
await storage.updateAttraction(id, data);     // Commit 2
await storage.updateHotel(id, data);          // Commit 3
// ... etc
```

**Risk:** Partial update on failure
**Fix:**
```typescript
await db.transaction(async (tx) => {
  await tx.update(contents).set(data);
  await tx.update(attractions).set(data);
  // Atomic commit
});
```

---

### Gap 2: Event Emission After Commit

**Problem:** Events fire after database commits

```
Timeline:
T1: Database commit (irreversible)
T2: Event emitted
T3: Subscriber fails
Result: Database updated, but search/AEO not updated
```

**Risk:** Inconsistent derived data
**Options:**
1. Transactional outbox pattern
2. Compensating transactions
3. Retry with dead letter queue

---

### Gap 3: Cache Invalidation Race Conditions

**Problem:** Two-layer cache (Redis + Memory) invalidated separately

```
Thread A: Update database
Thread A: Invalidate Redis
Thread B: Read from Memory (stale!)
Thread A: Invalidate Memory
```

**Risk:** Brief inconsistency window
**Fix:** Atomic invalidation or read-through cache only

---

### Gap 4: No Compensation for Failed Automations

**Problem:** Post-publish automations are sequential without compensation

```typescript
// If step 3 fails, steps 1-2 are already done
await autoTranslator.triggerTranslation(contentId);  // Step 1
await autoAffiliate.placeLinks(contentId);           // Step 2
await autoTagger.tagContent(contentId);              // Step 3 FAILS
await autoCluster.addToCluster(contentId);           // Never runs
```

**Risk:** Incomplete post-publish state
**Fix:** Saga pattern with compensation

---

## 3. Enforcement Strategy

### Code-Enforced Invariants

| Invariant | Enforcement Point | Validation |
|-----------|-------------------|------------|
| #1 Published Completeness | canPublish() | Pre-publish check |
| #2 Entity Link Validity | resolveEntityLink() | Runtime validation |
| #5 Event-Subscriber | content-subscribers.ts | Event handlers |
| #8 Rate Limits | request-queue.ts | Token bucket |
| #11 Entity Persistence | orchestrator.ts | Post-extraction |

### Database-Enforced Invariants

| Invariant | Enforcement | Schema Location |
|-----------|-------------|-----------------|
| #4 Slug Uniqueness | UNIQUE constraint | Needs addition |
| #9 Translation Source | FK CASCADE | translations table |
| #13 No Orphans | FK CASCADE | type-specific tables |

### Monitoring-Enforced Invariants

| Invariant | Detection Method | Alert Condition |
|-----------|------------------|-----------------|
| #6 Cache Consistency | Compare queries | cache ≠ db for >1min |
| #10 Search Freshness | Latency tracking | update_lag > 30s |
| #15 Webhook Delivery | Delivery logs | failure_rate > 5% |

---

## 4. Invariant Violation Detection

### Proposed Integrity Checker

```typescript
// Run periodically (e.g., every hour)
async function checkSystemInvariants(): Promise<InvariantReport> {
  const violations: Violation[] = [];

  // Invariant #3: Content type matches associated record
  const orphanedContent = await db.execute(sql`
    SELECT c.id, c.type
    FROM contents c
    LEFT JOIN hotels h ON h.contentId = c.id AND c.type = 'hotel'
    LEFT JOIN attractions a ON a.contentId = c.id AND c.type = 'attraction'
    WHERE c.type IN ('hotel', 'attraction')
      AND h.id IS NULL AND a.id IS NULL
  `);

  if (orphanedContent.length > 0) {
    violations.push({
      invariant: 'CONTENT_TYPE_CONSISTENCY',
      severity: 'HIGH',
      affected: orphanedContent.map(c => c.id),
    });
  }

  // Invariant #10: Search freshness
  const staleContent = await db.execute(sql`
    SELECT c.id, c.publishedAt, si.lastIndexed
    FROM contents c
    LEFT JOIN search_index si ON si.contentId = c.id
    WHERE c.status = 'published'
      AND (si.lastIndexed IS NULL
           OR si.lastIndexed < c.publishedAt - INTERVAL '30 seconds')
  `);

  // ... more checks ...

  return { violations, checkedAt: new Date() };
}
```

---

## 5. Transaction Boundaries (Recommended)

### Content Publish Transaction

```typescript
async function publishContent(contentId: string): Promise<void> {
  await db.transaction(async (tx) => {
    // 1. Update content status
    await tx.update(contents)
      .set({ status: 'published', publishedAt: new Date() })
      .where(eq(contents.id, contentId));

    // 2. Update type-specific record
    const content = await tx.query.contents.findFirst({
      where: eq(contents.id, contentId)
    });

    if (content?.type === 'hotel') {
      await tx.update(hotels)
        .set({ isPublished: true })
        .where(eq(hotels.contentId, contentId));
    }

    // 3. Insert audit log
    await tx.insert(auditLogs).values({
      entityId: contentId,
      action: 'publish',
      timestamp: new Date(),
    });

    // Transaction commits here - all or nothing
  });

  // 4. Events emitted AFTER successful commit
  emitContentPublished(contentId, ...);
}
```

---

## 6. Summary

### Invariants by Enforcement Type

```
CODE ENFORCED (7):
├── #1 Published Completeness
├── #2 Entity Link Validity
├── #5 Event-Subscriber Consistency
├── #8 Rate Limit Enforcement
├── #11 Entity Extraction Persistence
├── #12 Internal Links Database-Driven
└── #14 Job Idempotency

DATABASE ENFORCED (3):
├── #4 Slug Uniqueness (needs index)
├── #9 Translation Source Consistency
└── #13 No Orphaned Type Records

MONITORING REQUIRED (3):
├── #6 Cache-Database Consistency
├── #10 Search Index Freshness
└── #15 Webhook Delivery Tracking

GAPS (2):
├── #3 Content Type Consistency (needs validation)
└── #7 Audit Trail Completeness (partially implemented)
```

### Priority Actions

1. **Add database transactions** for multi-table operations
2. **Implement integrity checker** for invariant #3, #10
3. **Add composite unique index** for invariant #4
4. **Implement dead letter queue** for webhook failures
5. **Add saga pattern** for post-publish automations
