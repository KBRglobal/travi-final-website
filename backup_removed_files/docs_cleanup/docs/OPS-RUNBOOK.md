# TRAVI CMS - Operations Runbook

## Overview

This runbook provides step-by-step procedures for identifying and resolving common operational issues in the TRAVI CMS platform. It is designed for non-engineers to quickly diagnose which subsystem is failing.

**Last Updated:** 2024-12-31  
**Version:** 1.0.0

---

## Quick Reference

| Issue | First Check | Endpoint |
|-------|------------|----------|
| Jobs not processing | Job queue status | `GET /api/admin/jobs/recent` |
| Background worker down | Worker health | `GET /api/system/workers` |
| AI not responding | Provider credits | `GET /api/ai/metrics/providers` |
| System overload | System load | `GET /api/system/load` |

---

## 1. How to Debug Jobs

### Where to Find Job Status

**Endpoint:** `GET /api/admin/jobs/recent`

This endpoint returns the most recent jobs with their current status:

```json
{
  "jobs": [
    {
      "id": "job-123",
      "type": "content_generation",
      "status": "completed",
      "createdAt": "2024-12-31T10:00:00Z",
      "completedAt": "2024-12-31T10:02:30Z"
    },
    {
      "id": "job-456",
      "type": "translation",
      "status": "failed",
      "error": "Rate limit exceeded",
      "createdAt": "2024-12-31T10:05:00Z"
    }
  ]
}
```

### Job Status Values

| Status | Meaning |
|--------|---------|
| `pending` | Job is queued, waiting for worker |
| `in_progress` | Job is currently being processed |
| `completed` | Job finished successfully |
| `failed` | Job encountered an error |
| `stale` | Job exceeded timeout (auto-failed by watchdog) |

### How to Identify Stuck Jobs

A job is considered "stuck" if:

1. Status is `in_progress` for more than 5 minutes
2. Status is `pending` with no worker activity

**Check for stuck jobs:**

1. Go to `GET /api/admin/jobs/recent`
2. Look for jobs with status `in_progress`
3. Check the `createdAt` timestamp
4. If older than 5 minutes, the watchdog should have marked it `stale`

### What the Watchdog Does

The job watchdog runs every 60 seconds and:

1. **Scans** all jobs with status `in_progress`
2. **Checks** if any have been running longer than 5 minutes
3. **Auto-fails** jobs that exceed the timeout
4. **Logs** the event for monitoring

**Watchdog Invariant:** No job can hang forever - the watchdog enforces a 5-minute maximum execution time.

### How to Manually Retry a Failed Job

**Endpoint:** `POST /api/admin/jobs/:jobId/retry`

Steps:
1. Find the failed job ID from `/api/admin/jobs/recent`
2. Check the error message to understand why it failed
3. If the underlying issue is resolved, send a retry request:

```bash
curl -X POST /api/admin/jobs/job-456/retry \
  -H "Authorization: Bearer <token>"
```

**Before retrying:**
- Check if the error was transient (rate limit, timeout) or permanent (invalid data)
- Verify the underlying service is healthy (AI provider, database)
- Ensure you have adequate credits/quota

---

## 2. How to Debug Worker/Queue

### Check Worker Health

**Endpoint:** `GET /api/system/workers`

Response example:
```json
{
  "workers": {
    "octopus": {
      "status": "healthy",
      "mode": "queue",
      "activeJobs": 3,
      "lastHeartbeat": "2024-12-31T10:10:00Z"
    },
    "translation": {
      "status": "healthy",
      "mode": "inline",
      "activeJobs": 0
    }
  }
}
```

### Processing Modes Explained

| Mode | Meaning | When Used |
|------|---------|-----------|
| `queue` | Jobs processed by background worker | Production, high-volume |
| `inline` | Jobs processed synchronously | Development, low-latency needs |

**Queue Mode:**
- Jobs are added to a PostgreSQL-backed queue
- Background worker polls for pending jobs
- Better for long-running tasks (content generation, translation)
- Requires the worker process to be running

**Inline Mode:**
- Jobs are executed immediately in the request handler
- No background worker needed
- Used for quick operations or development
- May block the API response

### Verify Background Worker is Running

1. **Check worker status:**
   ```
   GET /api/system/workers
   ```

2. **Look for:**
   - `status: "healthy"` - Worker is running and responding
   - `status: "degraded"` - Worker is slow or overloaded
   - `status: "offline"` - Worker is not responding

3. **Check lastHeartbeat:**
   - Should be within the last 60 seconds
   - If stale, the worker process may have crashed

4. **Check workflow logs:**
   - Open the Replit Workflows panel
   - Look for the "Start application" workflow
   - Check for any error messages

### Troubleshooting Worker Issues

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| `status: offline` | Worker crashed | Restart the workflow |
| Jobs stuck in `pending` | Worker not polling | Check worker heartbeat |
| Very slow processing | Too many concurrent jobs | Reduce concurrency limit |

---

## 3. How to Debug AI Credits

### Check AI Provider Status

**Endpoint:** `GET /api/ai/metrics/providers`

Response example:
```json
{
  "providers": {
    "openai": {
      "status": "healthy",
      "creditsUsed": 45.2,
      "creditsLimit": 100,
      "usagePercent": 45.2,
      "warning": null
    },
    "anthropic": {
      "status": "warning",
      "creditsUsed": 82.5,
      "creditsLimit": 100,
      "usagePercent": 82.5,
      "warning": "Approaching limit (80%)"
    },
    "deepseek": {
      "status": "blocked",
      "creditsUsed": 95.0,
      "creditsLimit": 100,
      "usagePercent": 95.0,
      "warning": "Provider soft-disabled (90%+ usage)"
    }
  }
}
```

### Credit Guard Warning Levels

| Level | Threshold | Behavior |
|-------|-----------|----------|
| Normal | 0-79% | Full operation |
| Warning | 80-89% | Logged warning, continues working |
| Soft-Disable | 90%+ | Provider blocked for new tasks |

### Understanding Credit Guard Warnings

**"Approaching limit (80%)":**
- Provider is still functional
- AI orchestrator may prefer other providers
- Monitor closely; may hit 90% soon

**"Provider soft-disabled (90%+ usage)":**
- Provider is blocked for new AI tasks
- Existing in-flight requests will complete
- Other providers will be used if available

### How to Identify Which Provider is Blocked

1. Go to `GET /api/ai/metrics/providers`
2. Look for providers with `status: "blocked"`
3. Check `usagePercent` - anything at 90%+ is soft-disabled

### What To Do When a Provider is Blocked

1. **Wait for credit reset** - Credits usually reset monthly
2. **Use alternative providers** - System will auto-route to healthy providers
3. **Contact provider** - Request credit increase if urgent
4. **Adjust category limits** - Reduce heavy usage categories

### AI Task Categories

Each AI task requires an explicit category. Tasks without a category are REJECTED.

| Category | Typical Use |
|----------|-------------|
| `news` | News article generation |
| `evergreen` | Long-form content |
| `enrichment` | Content enhancement |
| `image` | Image-related AI (via Image Engine) |
| `research` | Research and analysis |
| `localization` | Multi-language content |
| `content` | General content tasks |
| `seo` | SEO optimization |
| `translation` | Direct translation |
| `internal` | System operations |

---

## 4. Kill-Switches

Kill-switches allow you to quickly disable features in an emergency without code changes.

### Available Kill-Switches

| Environment Variable | Feature | Default |
|---------------------|---------|---------|
| `ENABLE_WEEKLY_DIGEST` | Weekly email newsletter digest | `false` |
| `ENABLE_MONETIZATION` | Monetization features | `false` |
| `ENABLE_AFFILIATE_HOOKS` | Affiliate link injection | `false` |

### How to Disable Features in Emergency

**Option 1: Via Replit Secrets**

1. Go to Replit Secrets panel
2. Set the environment variable to `false`
3. Restart the workflow

**Option 2: Via Code (temporary)**

Features check environment variables at runtime:
```typescript
if (process.env.ENABLE_WEEKLY_DIGEST === 'true') {
  // Feature is enabled
}
```

Setting the env var to `false` or removing it disables the feature.

### ENABLE_WEEKLY_DIGEST

**What it controls:**
- Weekly email digest scheduled job
- Newsletter content aggregation
- Email sending via Resend

**When to disable:**
- Email provider issues
- Spam complaints
- Content quality concerns

### ENABLE_MONETIZATION + ENABLE_AFFILIATE_HOOKS

**What they control:**
- `ENABLE_MONETIZATION`: Master switch for all monetization
- `ENABLE_AFFILIATE_HOOKS`: Affiliate link injection specifically

**When to disable:**
- Affiliate partner issues
- Compliance concerns
- Revenue disputes

**Affiliate Invariant:** Affiliate links cannot appear in forbidden zones (legal pages, error pages, user-generated content).

---

## 5. Activation Steps

### How to Safely Enable Weekly Digest

**Pre-flight Checklist:**

1. **Verify email service:**
   ```
   GET /api/system/health
   ```
   Confirm Resend is connected and healthy.

2. **Check subscriber list:**
   - Ensure subscribers have opted in
   - Verify email list is not empty

3. **Test with internal list first:**
   - Set up a test subscriber group
   - Send a test digest
   - Verify content and formatting

4. **Enable the feature:**
   - Set `ENABLE_WEEKLY_DIGEST=true` in Secrets
   - Restart the workflow

5. **Monitor first send:**
   - Check email delivery logs
   - Watch for bounce rates
   - Verify no spam reports

### How to Safely Enable Affiliates

**Pre-flight Checklist:**

1. **Validate affiliate configuration:**
   - Confirm affiliate partner credentials
   - Test tracking links manually
   - Verify commission structure

2. **Check forbidden zones:**
   Affiliate links must NOT appear in:
   - `/privacy-policy`
   - `/terms`
   - `/cookie-policy`
   - Error pages (404, 500)
   - User-generated content

3. **Test on staging:**
   - Enable on development first
   - Verify links render correctly
   - Check tracking pixels fire

4. **Enable in production:**
   - Set `ENABLE_MONETIZATION=true`
   - Set `ENABLE_AFFILIATE_HOOKS=true`
   - Restart the workflow

5. **Monitor performance:**
   - Check affiliate dashboard for clicks
   - Verify no links in forbidden zones
   - Watch for user complaints

---

## 6. Quick Diagnostic Flowchart

```
Issue Reported
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Check System Health                                  │
│ GET /api/system/load                                         │
│                                                              │
│ If CPU > 80% or Memory > 90%:                               │
│   → System is overloaded, may need scaling                  │
└─────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Check Workers                                        │
│ GET /api/system/workers                                      │
│                                                              │
│ If any worker is "offline":                                 │
│   → Restart the workflow                                    │
└─────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Check Jobs                                           │
│ GET /api/admin/jobs/recent                                   │
│                                                              │
│ If many jobs "failed" or "stale":                           │
│   → Check error messages                                    │
│   → May be AI provider issue                                │
└─────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 4: Check AI Credits                                     │
│ GET /api/ai/metrics/providers                                │
│                                                              │
│ If any provider is "blocked" (90%+):                        │
│   → Wait for credit reset                                   │
│   → Or switch to alternative provider                       │
└─────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 5: Check Logs                                           │
│ Use the Replit Workflows panel                               │
│                                                              │
│ Look for:                                                    │
│   → Error messages                                          │
│   → Stack traces                                            │
│   → Rate limit warnings                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Common Error Messages

| Error Message | Likely Cause | Solution |
|--------------|--------------|----------|
| "Job watchdog: marked stale" | Job exceeded 5-min timeout | Check if task is too complex; may need optimization |
| "Credit guard: soft-disabled" | AI provider at 90%+ usage | Wait for reset or use alternate provider |
| "Category required" | AI task missing category | Developer error - needs fix in code |
| "Rate limit exceeded" | Too many requests | Wait and retry; consider reducing frequency |
| "Worker heartbeat stale" | Background worker crashed | Restart the workflow |

---

## 8. Escalation Path

1. **Level 1 (Ops):** Follow this runbook, restart services if needed
2. **Level 2 (Dev):** Check code-level issues, review logs in detail
3. **Level 3 (Architecture):** System-wide issues, may need design changes

---

## Related Documentation

- [SYSTEM-ARCHITECTURE.md](./SYSTEM-ARCHITECTURE.md) - System design and invariants
- [INCIDENT-PLAYBOOK.md](./INCIDENT-PLAYBOOK.md) - Incident response procedures
- [SLA-DEFINITIONS.md](./SLA-DEFINITIONS.md) - Service level agreements
