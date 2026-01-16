# Deployment Runbook

**Last Updated:** 2026-01-01
**Owner:** Platform Team
**Security Classification:** Internal

---

## Table of Contents

1. [Overview](#overview)
2. [Normal Deploy Flow](#normal-deploy-flow)
3. [Canary Deployment Flow](#canary-deployment-flow)
4. [Emergency Rollback](#emergency-rollback)
5. [Security Modes & Lockdown](#security-modes--lockdown)
6. [Override System](#override-system)
7. [Troubleshooting](#troubleshooting)

---

## Overview

This runbook covers all deployment operations for the TravisEOAEO platform. All deployment actions are gated by the **Security Gate** system, which enforces safety policies based on:

- **Security Mode**: `monitor`, `enforce`, or `lockdown`
- **Threat Level**: `none`, `low`, `medium`, `high`, `critical`
- **Environment**: `staging` or `production`
- **Override Status**: Time-limited approvals for exceptional operations

### Key Principles

1. **Staging First**: All changes must be validated in staging before production
2. **No Silent Failures**: Blocked actions return explicit reasons
3. **Audit Everything**: All security decisions are logged
4. **Explicit Approvals**: Production operations require documented overrides

---

## Normal Deploy Flow

### Prerequisites

- [ ] All release gates passed
- [ ] Health probes healthy
- [ ] No active critical incidents
- [ ] Environment parity check passed
- [ ] Security mode is `enforce` or `monitor`

### Steps

1. **Start Release Validation**
   ```bash
   POST /api/deploy-safety/validations/start
   {
     "releaseId": "v1.2.3",
     "environment": "staging"
   }
   ```

2. **Run Release Gates**
   ```bash
   POST /api/deploy-safety/validations/{id}/run
   ```

3. **Check Gate Status**
   ```bash
   GET /api/deploy-safety/validations/{id}
   ```
   Ensure all gates show `passed` status.

4. **Verify Health**
   ```bash
   GET /api/deploy-safety/health
   ```
   Confirm `overallHealth` is `healthy`.

5. **Deploy to Staging**
   Standard deployment pipeline (CI/CD).

6. **Monitor Metrics**
   Wait 15 minutes. Check:
   - Error rate < 0.1%
   - Latency p99 < baseline + 10%
   - No new incidents created

7. **Promote to Production**
   Requires canary deployment (see next section).

---

## Canary Deployment Flow

### Overview

Canary deployments route a percentage of traffic to the new version while monitoring for regressions.

### Staging Canary (No Override Required)

```bash
POST /api/deploy-safety/canary/start
{
  "releaseId": "v1.2.3",
  "environment": "staging",
  "deploymentId": "deploy-001",
  "config": {
    "initialPercentage": 10,
    "incrementPercentage": 10,
    "incrementInterval": 300000,
    "maxPercentage": 100
  }
}
```

### Production Canary (Override Required)

Production canary deployments require an **explicit override**:

1. **Create Override**
   ```bash
   POST /api/deploy-safety/security-gate/override
   {
     "action": "deploy.canary.start",
     "environment": "production",
     "reason": "Approved by CTO for release v1.2.3",
     "approver": "eng-lead",
     "ttlMinutes": 60
   }
   ```

2. **Start Canary (within TTL window)**
   ```bash
   POST /api/deploy-safety/canary/start
   {
     "releaseId": "v1.2.3",
     "environment": "production",
     "deploymentId": "prod-deploy-001"
   }
   ```

3. **Monitor Canary Health**
   ```bash
   GET /api/deploy-safety/canary/{environment}
   ```
   - `status: healthy` - Continue
   - `status: unhealthy` - Automatic rollback triggered
   - `status: degraded` - Manual review required

4. **Manual Promotion (optional)**
   ```bash
   POST /api/deploy-safety/canary/promote
   {
     "environment": "production"
   }
   ```

### Canary Evaluation Criteria

| Metric | Healthy | Degraded | Unhealthy |
|--------|---------|----------|-----------|
| Error Rate | < 0.5% | 0.5-2% | > 2% |
| Latency p99 | < baseline+20% | 20-50% | > 50% |
| CPU Usage | < 70% | 70-85% | > 85% |
| Memory Usage | < 80% | 80-90% | > 90% |

---

## Emergency Rollback

### When to Rollback

- Error rate spikes above threshold
- Critical incident opened
- Data corruption detected
- Security vulnerability discovered

### Staging Rollback (No Override Required)

```bash
POST /api/deploy-safety/rollback/create
{
  "environment": "staging",
  "fromVersion": "v1.2.3",
  "toVersion": "v1.2.2",
  "reason": "High error rate after deployment"
}
```

Then execute:
```bash
POST /api/deploy-safety/rollback/{id}/execute
```

### Production Rollback (Override Required)

1. **Create Rollback Override**
   ```bash
   POST /api/deploy-safety/security-gate/override
   {
     "action": "deploy.rollback",
     "environment": "production",
     "reason": "Emergency: P1 incident INC-123",
     "approver": "oncall-lead",
     "ttlMinutes": 30
   }
   ```

2. **Create and Execute Rollback**
   ```bash
   POST /api/deploy-safety/rollback/create
   {
     "environment": "production",
     "fromVersion": "v1.2.3",
     "toVersion": "v1.2.2",
     "reason": "Rollback for INC-123"
   }

   POST /api/deploy-safety/rollback/{id}/execute
   ```

### Rollback During Lockdown

**Rollbacks are BLOCKED during lockdown mode.**

If rollback is critical during lockdown:
1. Contact Security Team to temporarily lift lockdown
2. Or, switch to `enforce` mode with documented justification
3. Create override, execute rollback, restore lockdown

---

## Security Modes & Lockdown

### Security Modes

| Mode | Behavior | Use Case |
|------|----------|----------|
| `monitor` | All actions allowed, decisions logged | Development, testing |
| `enforce` | Policies enforced, overrides honored | Normal operations |
| `lockdown` | All deployments blocked | Security incidents, maintenance |

### Checking Current Mode

```bash
GET /api/deploy-safety/security-gate/status
```

Response:
```json
{
  "mode": "enforce",
  "threatLevel": "none",
  "lockdownReason": null,
  "activeOverrides": 2
}
```

### Entering Lockdown

Lockdown is triggered automatically when:
- Critical security incident is opened
- Threat level escalates to `critical`
- Manual activation by Security Team

To manually enter lockdown:
```bash
POST /api/deploy-safety/security-gate/mode
{
  "mode": "lockdown",
  "reason": "Security incident investigation"
}
```

### Exiting Lockdown

```bash
POST /api/deploy-safety/security-gate/mode
{
  "mode": "enforce"
}
```

**Only Security Team can exit lockdown.**

### What Works During Lockdown

| Action | Allowed | Notes |
|--------|---------|-------|
| Health probes | Yes | Monitoring continues |
| Incident escalation | Yes | Critical ops allowed |
| Canary start | No | Blocked |
| Rollback | No | Blocked |
| Load shedding | No | Blocked |

---

## Override System

### Who Can Create Overrides

| Role | Can Override | Scope |
|------|--------------|-------|
| Security Team | All actions | Production + Staging |
| Engineering Lead | Deploy actions | Production + Staging |
| On-Call Lead | Rollback only | Production (emergency) |
| Developer | None | Staging only (no override needed) |

### Creating an Override

```bash
POST /api/deploy-safety/security-gate/override
{
  "action": "deploy.canary.start",
  "environment": "production",
  "reason": "Business justification with ticket reference",
  "approver": "your-username",
  "ttlMinutes": 60
}
```

### Override TTL Guidelines

| Scenario | Recommended TTL |
|----------|-----------------|
| Planned deployment | 60 minutes |
| Emergency rollback | 30 minutes |
| Critical hotfix | 15 minutes |
| Maintenance window | 120 minutes |

### Viewing Active Overrides

```bash
GET /api/deploy-safety/security-gate/overrides
```

### Revoking an Override

```bash
DELETE /api/deploy-safety/security-gate/override/{id}
```

---

## Troubleshooting

### "Action blocked by security gate"

1. Check current security mode:
   ```bash
   GET /api/deploy-safety/security-gate/status
   ```

2. If `lockdown`: Contact Security Team
3. If `enforce`: Create an override (if authorized)
4. If threat level `high`/`critical`: Wait for threat to clear

### "Production actions require explicit override"

Create an override with proper justification:
```bash
POST /api/deploy-safety/security-gate/override
```

### Canary Stuck in Degraded State

1. Check canary metrics:
   ```bash
   GET /api/deploy-safety/canary/{environment}
   ```

2. Review recent errors in monitoring
3. Options:
   - Wait for metrics to stabilize
   - Manual promotion if false positive
   - Rollback if genuine regression

### Override Expired Mid-Operation

1. Create a new override
2. Re-attempt the operation
3. Ensure TTL is sufficient for complete operation

### Health Probes Failing

1. Check probe details:
   ```bash
   GET /api/deploy-safety/probes/{id}
   ```

2. Review probe history for patterns
3. Common issues:
   - Database connection timeout
   - Memory pressure
   - External service dependency down

---

## Quick Reference

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/deploy-safety/health` | GET | System health |
| `/api/deploy-safety/canary/start` | POST | Start canary |
| `/api/deploy-safety/canary/{env}` | GET | Canary status |
| `/api/deploy-safety/rollback/create` | POST | Create rollback |
| `/api/deploy-safety/rollback/{id}/execute` | POST | Execute rollback |
| `/api/deploy-safety/security-gate/status` | GET | Security status |
| `/api/deploy-safety/security-gate/override` | POST | Create override |

### Emergency Contacts

| Team | Slack | PagerDuty |
|------|-------|-----------|
| Platform | #platform-oncall | platform-critical |
| Security | #security-team | security-p1 |
| SRE | #sre-oncall | sre-escalation |

---

**Remember: When in doubt, DON'T deploy. Escalate to the on-call lead.**
