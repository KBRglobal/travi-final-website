# 🔄 TRAVI Rollback Guide

**Emergency rollback procedures and disaster recovery**

---

## 📋 Table of Contents

- [Overview](#overview)
- [Automatic Rollback](#automatic-rollback)
- [Manual Rollback](#manual-rollback)
- [Database Rollback](#database-rollback)
- [Rollback Verification](#rollback-verification)
- [Post-Rollback Actions](#post-rollback-actions)

---

## Overview

TRAVI includes a comprehensive rollback system to handle deployment failures and incidents. The system supports both automatic and manual rollback procedures.

### Rollback Architecture

```
┌───────────────────────────────────────────────────────────┐
│                  Rollback Manager                          │
├───────────────────────────────────────────────────────────┤
│                                                            │
│  Triggers                    Steps                         │
│  ┌────────────────┐         ┌────────────────────────┐   │
│  │ error_rate     │         │ 1. validate_target     │   │
│  │ latency        │────────▶│ 2. pause_traffic       │   │
│  │ health_check   │         │ 3. drain_connections   │   │
│  │ budget_exceeded│         │ 4. switch_version      │   │
│  │ timeout        │         │ 5. verify_health       │   │
│  └────────────────┘         │ 6. resume_traffic      │   │
│                              │ 7. cleanup             │   │
│                              │ 8. notify              │   │
│                              └────────────────────────┘   │
│                                                            │
└───────────────────────────────────────────────────────────┘
```

---

## Automatic Rollback

### Trigger Configuration

| Trigger           | Threshold  | Cooldown | Description                                      |
| ----------------- | ---------- | -------- | ------------------------------------------------ |
| `error_rate`      | 10% (0.1)  | 5 min    | Triggers when error rate exceeds threshold       |
| `latency`         | 5000ms     | 5 min    | Triggers when P95 latency exceeds threshold      |
| `health_check`    | 3 failures | 1 min    | Triggers after consecutive health check failures |
| `budget_exceeded` | 1          | 1 hour   | Triggers when AI budget is exceeded              |
| `timeout`         | 30000ms    | 5 min    | Triggers when requests timeout                   |

### How Automatic Rollback Works

1. **Detection**: Monitoring systems detect threshold breach
2. **Validation**: Cooldown period checked to prevent flapping
3. **Plan Creation**: Rollback plan created automatically
4. **Execution**: Steps executed sequentially
5. **Notification**: Stakeholders notified via logging

### Rollback Steps

| Step                | Description                         | Duration |
| ------------------- | ----------------------------------- | -------- |
| `validate_target`   | Verify target version exists        | ~100ms   |
| `pause_traffic`     | Stop new requests                   | ~100ms   |
| `drain_connections` | Wait for active requests            | ~1s      |
| `switch_version`    | Deploy previous version             | ~5s      |
| `verify_health`     | Check health of rolled back version | ~2s      |
| `resume_traffic`    | Restore traffic flow                | ~100ms   |
| `cleanup`           | Clean up failed deployment          | ~500ms   |
| `notify`            | Send notifications                  | ~200ms   |

---

## Manual Rollback

### Option 1: Git Revert (Preferred)

```bash
# Revert the last commit
git revert HEAD
git push origin main

# Revert specific commit
git revert <commit-hash>
git push origin main

# Revert multiple commits
git revert <older-commit>..<newer-commit>
git push origin main
```

### Option 2: Force Checkout Previous Version

```bash
# Find last known good commit
git log --oneline -10

# Checkout that version
git checkout <commit-hash>

# Force push (use with caution)
git push origin main --force
```

### Option 3: Replit Deployment Rollback

1. Open Replit Dashboard
2. Navigate to Deployments
3. Find previous successful deployment
4. Click "Redeploy"
5. Verify health checks

### Option 4: API-Based Rollback

```typescript
// Trigger manual rollback via API
import { createRollbackPlan, executeRollback } from "./deployment-safety/rollback-manager";

const plan = createRollbackPlan(
  "v1.2.0", // from version
  "v1.1.0", // to version
  "production", // environment
  "manual", // trigger type
  "admin@travi.com" // actor
);

await executeRollback(plan.id);
```

---

## Database Rollback

### Before Rollback

⚠️ **IMPORTANT**: Always backup before rollback!

```bash
# Create backup
npm run db:backup

# List available backups
npm run db:backup:list
```

### Restore from Backup

```bash
# Restore latest backup
npm run db:restore:latest

# Restore specific backup
npm run db:restore --file backup-2026-01-27.sql
```

### Migration Rollback

Currently, Drizzle ORM doesn't support automatic down migrations. For schema rollback:

1. **Identify the migration to revert**
2. **Create a compensating migration**
3. **Apply the new migration**

Example compensating migration:

```sql
-- migrations/rollback-add-column.sql
ALTER TABLE users DROP COLUMN IF EXISTS new_column;
```

### Data Recovery

For data-related issues:

```bash
# Export specific table data
pg_dump -t table_name $DATABASE_URL > table_backup.sql

# Restore specific table
psql $DATABASE_URL < table_backup.sql
```

---

## Rollback Verification

### Immediate Verification (< 1 minute)

```bash
# 1. Check health endpoint
curl https://your-domain.com/api/health

# 2. Check liveness
curl https://your-domain.com/api/health/live

# 3. Check readiness
curl https://your-domain.com/api/health/ready
```

### Expected Results

```json
{
  "status": "healthy",
  "checks": {
    "database": { "status": "healthy" },
    "memory": { "status": "healthy" }
  }
}
```

### Functional Verification (1-5 minutes)

1. **Homepage loads correctly**
2. **API endpoints respond**
3. **Database queries work**
4. **Authentication works**
5. **Background jobs processing**

### Extended Verification (5-15 minutes)

1. **Monitor error rates**
2. **Check all background services**
3. **Verify AI service connectivity**
4. **Test content generation**
5. **Check search functionality**

---

## Post-Rollback Actions

### Immediate Actions

1. **Notify Team**
   - Post in #incidents channel
   - Update status page
   - Inform on-call engineers

2. **Document Incident**
   - Time of incident
   - Trigger cause
   - Rollback duration
   - Affected users

3. **Monitor**
   - Watch error rates for 30 minutes
   - Monitor performance metrics
   - Check for any lingering issues

### Follow-Up Actions

1. **Root Cause Analysis**
   - Review deployment changes
   - Identify failing component
   - Document findings

2. **Fix Forward**
   - Create bug fix
   - Add tests
   - Plan new deployment

3. **Process Improvement**
   - Update deployment checklist
   - Add monitoring for issue
   - Review rollback triggers

### Incident Report Template

```markdown
## Incident Report

**Date:** YYYY-MM-DD
**Duration:** X minutes
**Severity:** Critical/High/Medium/Low

### Summary

Brief description of what happened.

### Timeline

- HH:MM - Issue detected
- HH:MM - Rollback initiated
- HH:MM - Rollback completed
- HH:MM - Service restored

### Root Cause

Technical explanation of the failure.

### Impact

- Users affected: N
- Features impacted: List

### Resolution

How the issue was resolved.

### Action Items

- [ ] Fix the bug
- [ ] Add tests
- [ ] Update monitoring
```

---

## Rollback Statistics

Access rollback statistics via API:

```bash
curl https://your-domain.com/api/admin/rollback/stats
```

Response:

```json
{
  "total": 5,
  "pending": 0,
  "inProgress": 0,
  "completed": 4,
  "failed": 1,
  "cancelled": 0,
  "automaticCount": 3,
  "manualCount": 2,
  "avgDurationMs": 8500,
  "successRate": 0.8,
  "triggerBreakdown": {
    "error_rate": 2,
    "latency": 1,
    "manual": 2
  }
}
```

---

## Best Practices

### Do

- ✅ Always backup before rollback
- ✅ Verify health checks after rollback
- ✅ Document all incidents
- ✅ Monitor for 30 minutes post-rollback
- ✅ Communicate with stakeholders

### Don't

- ❌ Skip verification steps
- ❌ Force push without team awareness
- ❌ Ignore post-rollback monitoring
- ❌ Deploy same code without fix
- ❌ Disable automatic rollback triggers

---

<div align="center">

**[← Back to Deployment](DEPLOYMENT.md)** · **[Security →](SECURITY.md)** · **[API →](API.md)**

© 2024 TRAVI. All rights reserved.

</div>
