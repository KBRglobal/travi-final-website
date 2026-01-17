# Data Governance Rules

> **This document defines safety rules, approval requirements, and audit trails for data-driven decisions.**
> No autonomous system may violate these rules.

## Document Version
- Version: 1.0.0
- Last Updated: 2026-01-01
- Status: ACTIVE

---

## 1. Decision Categories

### Category A: AUTO-EXECUTE
These decisions execute automatically without human approval.

| Decision Type | Conditions | Rate Limit |
|---------------|------------|------------|
| `LOG_AND_MONITOR` | Any | Unlimited |
| `INCREASE_CRAWL_PRIORITY` | Non-critical content | 100/day |
| `AUTO_OPTIMIZE_CACHE` | System health normal | 10/hour |
| `AUTO_SCALE_WORKERS` | Within budget | 20/day |
| `TRIGGER_CONTENT_REVIEW` | Quality < threshold | 50/day |
| `TRIGGER_META_OPTIMIZATION` | CTR < threshold | 50/day |

### Category B: SUPERVISED
These decisions require human approval before execution.

| Decision Type | Approval Required | SLA |
|---------------|-------------------|-----|
| `TRIGGER_CONTENT_REFRESH` | Content Lead | 24h |
| `TRIGGER_SEO_REWRITE` | SEO Lead | 24h |
| `TRIGGER_AEO_AUDIT` | SEO Lead | 48h |
| `TRIGGER_CRO_ANALYSIS` | PM Lead | 24h |
| `TRIGGER_MONETIZATION_REVIEW` | PM Lead | 24h |
| `DISABLE_FEATURE` | Ops Lead | 1h |

### Category C: ESCALATION-ONLY
These decisions require explicit human command.

| Decision Type | Approval Required | SLA |
|---------------|-------------------|-----|
| `BLOCK_ALL_DEPLOYMENTS` | CTO | Immediate |
| `FREEZE_AUTOMATION` | CTO + Ops Lead | 1h |
| `ROLLBACK_CHANGES` | Engineering Lead | 2h |
| `DISABLE_SYSTEM` | CTO | Immediate |

### Category D: FORBIDDEN
These decisions are NEVER allowed automatically.

| Decision Type | Reason |
|---------------|--------|
| `DELETE_CONTENT` | Irreversible |
| `DELETE_USER_DATA` | Legal/compliance |
| `MODIFY_PAYMENT_CONFIG` | Financial risk |
| `CHANGE_AUTH_SETTINGS` | Security risk |
| `OVERRIDE_SAFETY_LIMITS` | System stability |
| `EXPOSE_PII` | Privacy violation |

---

## 2. Approval Workflows

### 2.1 Supervised Decision Workflow

```
1. Decision Engine generates decision
2. Decision queued in approval queue
3. Notification sent to approver
4. Approver reviews with context:
   - Triggering signal
   - Confidence score
   - Historical similar decisions
   - Potential impact
5. Approver action:
   a. APPROVE → Decision executes
   b. REJECT → Decision cancelled, reason logged
   c. MODIFY → Adjusted decision executes
   d. ESCALATE → Sent to higher authority
6. Outcome logged for learning
```

### 2.2 Escalation Workflow

```
1. Critical signal detected
2. Decision Engine creates escalation
3. Primary escalation target notified
4. If no response within SLA/2:
   - Secondary target notified
5. If no response within SLA:
   - Tertiary target (exec) notified
6. Decision MUST have human response
7. No automatic fallback for escalations
```

### 2.3 Emergency Override Workflow

```
1. Human initiates override
2. Override reason required (text)
3. Override scope defined:
   - Specific decision
   - Decision category
   - All decisions
4. Override duration set (max 24h)
5. Override logged with full context
6. Automatic expiry at duration end
7. Post-override review mandatory
```

---

## 3. Audit Trail Requirements

### 3.1 Mandatory Audit Fields

Every decision MUST log:

```typescript
interface DecisionAuditLog {
  // Identity
  decisionId: string;
  timestamp: Date;

  // Triggering
  triggerType: 'metric' | 'anomaly' | 'funnel' | 'manual';
  triggerId: string;
  triggerValue: number;
  threshold: number;

  // Confidence
  confidence: number;
  dataSufficiency: number;
  freshness: number;

  // Decision
  decisionType: string;
  category: 'auto' | 'supervised' | 'escalation';
  autopilotMode: 'off' | 'supervised' | 'full';

  // Execution
  executed: boolean;
  executedAt?: Date;
  executedBy: 'system' | string;  // userId if human

  // Approval (if supervised)
  approvalRequired: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  approvalNotes?: string;

  // Outcome
  outcome?: 'success' | 'failure' | 'partial';
  outcomeDetails?: Record<string, unknown>;

  // Impact
  impactedEntities: Array<{
    type: string;
    id: string;
  }>;
}
```

### 3.2 Audit Retention

| Log Type | Retention Period |
|----------|------------------|
| Decision logs | 2 years |
| Override logs | 5 years |
| Safety-related | 7 years |
| Escalation logs | 3 years |

### 3.3 Audit Access

| Role | Access Level |
|------|--------------|
| System | Write only |
| Engineers | Read last 30 days |
| Leads | Read last 90 days |
| Execs | Read all |
| Auditors | Read all + exports |

---

## 4. Rate Limits & Circuit Breakers

### 4.1 Decision Rate Limits

| Scope | Limit | Window |
|-------|-------|--------|
| Per binding | Defined per binding | Daily |
| Per category | 100 decisions | Hourly |
| Per entity | 10 decisions | Daily |
| Total system | 1000 decisions | Hourly |

### 4.2 Circuit Breaker Triggers

System enters "circuit breaker" mode if:

| Condition | Action |
|-----------|--------|
| >50% decisions failing | Pause all auto-execute |
| >10 escalations in 1h | Alert exec, reduce sensitivity |
| >3 safety decisions in 1h | Full system audit |
| Decision latency >10s | Queue decisions, alert ops |

### 4.3 Circuit Breaker Recovery

```
1. All auto-execute paused
2. Supervised decisions continue
3. Ops notified immediately
4. Root cause analysis required
5. Manual reset after resolution
6. 24h monitoring period
7. Gradual return to normal
```

---

## 5. Autopilot Mode Rules

### 5.1 Mode Definitions

**OFF Mode:**
- Metrics collected
- Decisions generated but NOT executed
- All decisions visible in queue
- Manual execution only

**SUPERVISED Mode:**
- Auto-execute for Category A decisions
- Approval required for Category B
- Escalation for Category C
- Forbidden remains forbidden

**FULL Mode:**
- Auto-execute for Category A and B
- Fast-track approval for Category C
- More aggressive thresholds
- Higher risk tolerance

### 5.2 Mode Transition Rules

| From | To | Requires |
|------|----|----------|
| OFF | SUPERVISED | Ops Lead approval |
| SUPERVISED | FULL | CTO approval + 7d stability |
| FULL | SUPERVISED | Automatic on any safety trigger |
| SUPERVISED | OFF | Any human can trigger |
| FULL | OFF | Automatic on circuit breaker |

### 5.3 Mode-Specific Limits

| Setting | OFF | SUPERVISED | FULL |
|---------|-----|------------|------|
| Auto-decisions/hour | 0 | 50 | 200 |
| Approval SLA | N/A | 24h | 4h |
| Confidence minimum | N/A | 70% | 60% |
| Data freshness max | N/A | 24h | 48h |

---

## 6. Compliance Requirements

### 6.1 Data Protection

- No PII in decision logs
- Anonymize user IDs in audit trails
- Encrypted storage for all logs
- Access logs for audit access

### 6.2 Financial Decisions

- All cost decisions require approval
- Revenue impact >10% requires exec approval
- Budget overrides logged separately
- Monthly financial audit required

### 6.3 Content Decisions

- Content deletion never automatic
- Publication decisions auditable
- Editorial overrides allowed but logged
- Quality thresholds documented

---

## 7. Incident Response

### 7.1 Data Decision Incident Levels

| Level | Definition | Response |
|-------|------------|----------|
| P1 | Decision caused data loss or breach | Immediate escalation, all hands |
| P2 | Decision caused revenue impact >$10k | 1h response, exec notification |
| P3 | Decision caused user-facing issue | 4h response, lead notification |
| P4 | Decision suboptimal but no damage | Next business day review |

### 7.2 Post-Incident Requirements

```
1. Incident documented within 24h
2. Root cause identified within 72h
3. Binding/rule update if needed
4. Communication to stakeholders
5. Lessons learned documented
6. Automation adjusted
7. 30-day monitoring period
```

---

## 8. Governance Review Cadence

| Review Type | Frequency | Participants |
|-------------|-----------|--------------|
| Decision effectiveness | Weekly | Ops + Engineering |
| Threshold accuracy | Monthly | Data + Domain leads |
| Safety rule audit | Quarterly | CTO + Legal |
| Full governance review | Annually | Exec team |

---

## 9. Exception Process

### 9.1 Requesting Exceptions

```
1. Submit exception request with:
   - Rule to be excepted
   - Duration requested
   - Business justification
   - Risk mitigation plan

2. Review by:
   - Rule owner
   - Risk owner
   - Legal (if applicable)

3. Decision within 48h

4. If approved:
   - Exception logged
   - Monitoring increased
   - Automatic expiry set
   - Post-exception review scheduled
```

### 9.2 Standing Exceptions

Pre-approved exceptions that don't require individual approval:

| Exception | Scope | Condition |
|-----------|-------|-----------|
| Holiday traffic spike | Traffic thresholds | Dec 15 - Jan 5 |
| Major release | Error rate thresholds | 4h post-deploy |
| Known crawler spike | Bot detection | After crawl announcement |

---

**Document Status: ACTIVE AND BINDING**
