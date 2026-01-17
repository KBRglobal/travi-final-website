# 🚨 TRAVI CMS Incident Response Playbook
# מדריך תגובה לאירועים / Madrich Teguvah Le'Eruim

> Structured approach to handling incidents affecting TRAVI CMS

---

## 📋 Table of Contents | תוכן עניינים

1. [Severity Levels](#severity-levels)
2. [Escalation Procedures](#escalation-procedures)
3. [Common Incidents](#common-incidents)
4. [Post-Incident Review](#post-incident-review)

---

## 🎯 Severity Levels | רמות חומרה

### P1 - Critical | קריטי

**Definition**: Complete service outage or major security breach affecting all users.

| Criteria | Examples |
|----------|----------|
| Impact | All users affected, no workaround |
| Revenue | Direct revenue loss |
| Data | Data breach or data loss |
| SLA | Complete violation |

**Examples**:
- Website completely down
- Database unavailable
- Security breach / data leak
- Payment processing failure

**Response Time**: 15 minutes  
**Resolution Target**: 1 hour  
**Escalation**: Immediate

---

### P2 - High | גבוה

**Definition**: Major functionality impaired, affecting significant portion of users.

| Criteria | Examples |
|----------|----------|
| Impact | >30% users affected |
| Revenue | Indirect revenue impact |
| Data | No data loss, degraded access |
| SLA | Significant degradation |

**Examples**:
- AI content generation completely down
- Authentication system failing
- Major feature broken (e.g., all translations failing)
- Admin panel inaccessible

**Response Time**: 30 minutes  
**Resolution Target**: 4 hours  
**Escalation**: Within 1 hour if no progress

---

### P3 - Medium | בינוני

**Definition**: Partial functionality impaired, workaround available.

| Criteria | Examples |
|----------|----------|
| Impact | <30% users, workaround exists |
| Revenue | Minimal impact |
| Data | No data impact |
| SLA | Minor degradation |

**Examples**:
- One AI provider failing (fallback active)
- Slow response times (2-5 seconds)
- Image uploads intermittently failing
- Single translation language failing

**Response Time**: 2 hours  
**Resolution Target**: 24 hours  
**Escalation**: Next business day

---

### P4 - Low | נמוך

**Definition**: Minor issue with minimal impact, no immediate action required.

| Criteria | Examples |
|----------|----------|
| Impact | Cosmetic or <5% users |
| Revenue | No impact |
| Data | No impact |
| SLA | No violation |

**Examples**:
- UI glitch in specific browser
- Non-critical feature degraded
- Slow performance on non-essential endpoints
- Logging verbosity issues

**Response Time**: Next business day  
**Resolution Target**: 1 week  
**Escalation**: As needed

---

## 📞 Escalation Procedures | נהלי הסלמה

### Escalation Matrix

```
┌─────────────────────────────────────────────────────────────┐
│                    Escalation Flowchart                     │
└─────────────────────────────────────────────────────────────┘

     Incident Detected
            │
            ▼
    ┌───────────────┐
    │  Assess       │
    │  Severity     │
    └───────┬───────┘
            │
    ┌───────┴───────────────┬───────────────┬──────────────┐
    │                       │               │              │
    ▼                       ▼               ▼              ▼
┌───────┐              ┌───────┐       ┌───────┐      ┌───────┐
│  P1   │              │  P2   │       │  P3   │      │  P4   │
│       │              │       │       │       │      │       │
└───┬───┘              └───┬───┘       └───┬───┘      └───┬───┘
    │                      │               │              │
    ▼                      ▼               ▼              ▼
┌─────────────┐      ┌───────────┐   ┌─────────┐    ┌─────────┐
│ Immediate   │      │ 30-min    │   │ 2-hour  │    │ Backlog │
│ All-hands   │      │ Response  │   │ Response│    │ Ticket  │
│ Page Team   │      │ On-call   │   │ Primary │    │         │
└─────────────┘      └───────────┘   └─────────┘    └─────────┘
```

### Contact Order by Severity

#### P1 - Critical
1. **Immediately** (0-5 min): 
   - On-call Engineer (primary)
   - Engineering Lead
   - CTO (if unreachable)

2. **Within 15 min** (if unresolved):
   - All available engineers
   - Database Admin
   - Security Team (if security-related)

3. **Within 30 min** (if unresolved):
   - Executive team notification
   - External support (Replit, cloud providers)

#### P2 - High
1. **Within 30 min**:
   - On-call Engineer
   - Relevant domain expert

2. **Within 1 hour** (if no progress):
   - Engineering Lead
   - Additional team members

#### P3/P4 - Medium/Low
- Standard ticket workflow
- Assign to appropriate team member
- Follow sprint planning process

---

## 🔧 Common Incidents | אירועים נפוצים

### 1. Database Connection Failures | כשלי חיבור למסד נתונים

#### Symptoms | סימפטומים
- "Database connection failed" errors in logs
- 500 errors on all API endpoints
- Application startup failure
- Timeout errors on queries

#### Immediate Actions
```bash
# 1. Check database status
psql $DATABASE_URL -c "SELECT 1"

# 2. Check connection count
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity"

# 3. Check for blocked queries
psql $DATABASE_URL -c "
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC
LIMIT 5"
```

#### Resolution Steps

**If database unreachable**:
1. Check Replit status page
2. Verify DATABASE_URL is correct
3. Check network connectivity
4. Contact Replit support if persistent

**If connection pool exhausted**:
```bash
# Kill idle connections
psql $DATABASE_URL -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
AND query_start < NOW() - INTERVAL '5 minutes'
AND pid != pg_backend_pid()
"

# Restart application to reset pool
# Use Replit workflow restart
```

**If query blocking**:
```bash
# Identify blocking query
psql $DATABASE_URL -c "
SELECT blocked.pid AS blocked_pid,
       blocking.pid AS blocking_pid,
       blocked.query AS blocked_query,
       blocking.query AS blocking_query
FROM pg_stat_activity blocked
JOIN pg_stat_activity blocking ON blocking.pid = ANY(pg_blocking_pids(blocked.pid))
"

# Terminate blocking query (use carefully)
psql $DATABASE_URL -c "SELECT pg_terminate_backend(<blocking_pid>)"
```

#### Prevention
- Monitor connection pool usage
- Set query timeouts
- Use connection pooling (PgBouncer)
- Regular VACUUM ANALYZE

---

### 2. AI Provider Outages | כשלי ספקי AI

#### Symptoms | סימפטומים
- Content generation failures
- "AI provider unavailable" errors
- Slow content generation (waiting for timeouts)
- Empty or truncated AI responses

#### Immediate Actions
```bash
# 1. Check which provider is primary
grep "provider" /tmp/logs/*.log | tail -20

# 2. Test providers manually
# Anthropic
curl -X POST "$AI_INTEGRATIONS_ANTHROPIC_BASE_URL/messages" \
  -H "x-api-key: $AI_INTEGRATIONS_ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-sonnet-4-5","max_tokens":10,"messages":[{"role":"user","content":"test"}]}'

# 3. Check provider status pages
# - status.anthropic.com
# - status.openai.com
# - openrouter.ai/status
```

#### Resolution Steps

**If single provider down**:
1. System should auto-failover to next provider
2. Check logs for fallback attempts
3. If not failing over, restart application
4. Mark provider as failed manually if needed:
```typescript
// In admin console
markProviderFailed('anthropic', 'outage');
```

**If all providers down**:
1. Check API key validity for each provider
2. Check rate limits on all accounts
3. Enable any disabled backup providers
4. Queue content generation for retry
5. Notify users of delays

**If rate limited**:
```bash
# Check rate limit headers in logs
grep "rate-limit\|429" /tmp/logs/*.log

# Wait for reset or switch to backup provider
```

#### Prevention
- Maintain multiple provider API keys
- Monitor rate limit usage
- Implement request queuing
- Cache common AI responses

---

### 3. High Memory/CPU Usage | שימוש גבוה בזיכרון/מעבד

#### Symptoms | סימפטומים
- Slow response times across all endpoints
- Application crashes or restarts
- Out of memory (OOM) errors
- Replit resource warnings

#### Immediate Actions
```bash
# 1. Check current resource usage
# View Replit Resources panel

# 2. Check for runaway processes
ps aux | sort -rk 3 | head -5  # CPU
ps aux | sort -rk 4 | head -5  # Memory

# 3. Check Node.js memory
node -e "console.log(process.memoryUsage())"
```

#### Resolution Steps

**If memory leak suspected**:
1. Restart application (immediate relief)
2. Check recent code changes for:
   - Unbounded array growth
   - Event listener accumulation
   - Cache without eviction
3. Add memory logging:
```typescript
setInterval(() => {
  const mem = process.memoryUsage();
  console.log(`[Memory] Heap: ${Math.round(mem.heapUsed / 1024 / 1024)}MB`);
}, 60000);
```

**If CPU spike**:
1. Check for infinite loops in logs
2. Review recent deployments
3. Check AI generation queue depth
4. Throttle heavy operations:
```bash
# Pause RSS auto-processing temporarily
# Disable in admin panel or environment
```

**If image processing overload**:
1. Check upload queue size
2. Reduce concurrent processing
3. Increase image compression
4. Queue large batches for off-peak

#### Prevention
- Set resource alerts in monitoring
- Implement request throttling
- Use streaming for large responses
- Regular performance profiling

---

### 4. Authentication Issues | בעיות אימות

#### Symptoms | סימפטומים
- Users cannot log in
- "Session expired" errors immediately after login
- Admin panel inaccessible
- 401/403 errors on authenticated endpoints

#### Immediate Actions
```bash
# 1. Check session store
psql $DATABASE_URL -c "SELECT count(*) FROM session"

# 2. Check for expired sessions
psql $DATABASE_URL -c "
SELECT expire FROM session 
ORDER BY expire DESC LIMIT 5"

# 3. Verify session secret is set
echo $SESSION_SECRET | head -c 10
```

#### Resolution Steps

**If session store full/corrupted**:
```bash
# Clear expired sessions
psql $DATABASE_URL -c "DELETE FROM session WHERE expire < NOW()"

# If still failing, clear all sessions (forces re-login)
psql $DATABASE_URL -c "TRUNCATE session"

# Restart application
```

**If cookie issues**:
1. Check cookie domain settings
2. Verify HTTPS configuration
3. Check for cookie size limits
4. Clear browser cookies and retry

**If OAuth/Replit Auth failing**:
1. Check Replit Auth configuration
2. Verify callback URLs
3. Check OAuth credentials
4. Test with fresh browser session

**If password/2FA issues**:
1. Check 2FA secrets table
2. Verify time synchronization (TOTP)
3. Reset user 2FA if necessary:
```sql
UPDATE users SET two_factor_enabled = false WHERE id = <user_id>;
DELETE FROM two_factor_secrets WHERE user_id = <user_id>;
```

#### Prevention
- Regular session cleanup job
- Monitor session table size
- Implement session limits per user
- Regular OAuth credential rotation

---

### 5. RSS Feed Processing Failures | כשלי עיבוד RSS

#### Symptoms | סימפטומים
- New articles not appearing
- "RSS processing failed" in logs
- Stale content on auto-generated pages

#### Resolution Steps
```bash
# 1. Check RSS auto-process logs
grep "RSS" /tmp/logs/*.log | tail -50

# 2. Manually trigger RSS processing
curl -X POST https://travi.world/api/admin/rss/process \
  -H "Cookie: <admin_session>"

# 3. Check individual feed status
curl https://travi.world/api/admin/rss/feeds
```

---

### 6. Translation Service Failures | כשלי שירות תרגום

#### Symptoms | סימפטומים
- Translations not updating
- DeepL API errors in logs
- Missing translations for new content

#### Resolution Steps
```bash
# 1. Check DeepL API status
curl "https://api-free.deepl.com/v2/usage" \
  -H "Authorization: DeepL-Auth-Key $DEEPL_API_KEY"

# 2. Check translation queue
psql $DATABASE_URL -c "
SELECT status, count(*) 
FROM translation_batch_jobs 
GROUP BY status"

# 3. Retry failed translations
curl -X POST https://travi.world/api/admin/translations/retry-failed
```

---

## 📝 Post-Incident Review | סקירה לאחר אירוע

### Review Template | תבנית סקירה

```markdown
# Post-Incident Review: [Incident Title]
# סקירה לאחר אירוע

## Incident Summary | סיכום האירוע
- **Date/Time**: YYYY-MM-DD HH:MM - HH:MM
- **Severity**: P1/P2/P3/P4
- **Duration**: X hours Y minutes
- **Impact**: [Description of user/business impact]

## Timeline | ציר זמן
| Time | Event |
|------|-------|
| HH:MM | Incident detected |
| HH:MM | First response |
| HH:MM | Root cause identified |
| HH:MM | Fix deployed |
| HH:MM | Service restored |
| HH:MM | All-clear declared |

## Root Cause | סיבת השורש
[Detailed technical explanation of what caused the incident]

## Resolution | פתרון
[What was done to resolve the incident]

## Impact Analysis | ניתוח השפעה
- **Users Affected**: X
- **Revenue Impact**: $X / None
- **Data Impact**: None / [Description]
- **SLA Violation**: Yes/No

## What Went Well | מה עבד טוב
- [List of things that worked well in response]

## What Could Be Improved | מה ניתן לשפר
- [List of areas for improvement]

## Action Items | פריטי פעולה
| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| [Action 1] | @person | YYYY-MM-DD | Open |
| [Action 2] | @person | YYYY-MM-DD | Open |

## Lessons Learned | לקחים שנלמדו
1. [Key takeaway 1]
2. [Key takeaway 2]

## Follow-up Meeting | פגישת המשך
- **Scheduled**: YYYY-MM-DD HH:MM
- **Attendees**: [List]
```

### Review Process | תהליך הסקירה

1. **Immediately after incident**:
   - Document timeline while fresh
   - Collect relevant logs and metrics
   - Identify all parties involved

2. **Within 24 hours**:
   - Complete initial incident report
   - Share with immediate team

3. **Within 72 hours**:
   - Schedule post-incident review meeting
   - Invite all stakeholders
   - Prepare detailed analysis

4. **Review Meeting**:
   - Walk through timeline
   - Discuss root cause (blameless)
   - Identify action items
   - Assign owners and due dates

5. **Follow-up**:
   - Track action items to completion
   - Update runbooks if needed
   - Share learnings with broader team

---

## 📊 Incident Metrics | מדדי אירועים

### Key Metrics to Track

| Metric | Definition | Target |
|--------|------------|--------|
| MTTD | Mean Time to Detect | < 5 min |
| MTTA | Mean Time to Acknowledge | < 15 min (P1) |
| MTTR | Mean Time to Resolve | < 1 hour (P1) |
| Incident Rate | Incidents per week | < 2 (P1/P2) |

### Monthly Review Checklist

- [ ] Review all P1/P2 incidents
- [ ] Update playbooks with new patterns
- [ ] Check action item completion
- [ ] Review and update on-call rotation
- [ ] Validate monitoring coverage

---

*Last updated: December 2024*
