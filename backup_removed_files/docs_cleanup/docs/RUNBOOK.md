# 📖 TRAVI CMS Operations Runbook
# מדריך תפעול / Madrich Tif'ul

> Comprehensive operational guide for TRAVI CMS platform

---

## 📋 Table of Contents | תוכן עניינים

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Common Operational Tasks](#common-operational-tasks)
4. [Database Operations](#database-operations)
5. [Log Access](#log-access)
6. [Performance Troubleshooting](#performance-troubleshooting)

---

## 🏗️ System Overview | סקירת המערכת

### Platform Description

TRAVI is a content management system for Dubai Travel, featuring:
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express.js + Node.js
- **Database**: PostgreSQL (Neon-backed via Replit)
- **AI Integration**: Multi-provider (Anthropic, OpenRouter, DeepSeek, OpenAI)
- **Storage**: Replit Object Storage for media files
- **Hosting**: Replit with auto-scaling

### Key Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| Web Server | Express.js | API endpoints, SSR |
| Frontend | React + Vite | SPA with SSR for SEO |
| Database | PostgreSQL | Content, users, translations |
| ORM | Drizzle | Type-safe database queries |
| Cache | In-memory | Session storage, rate limiting |
| AI | Multi-provider | Content generation, SEO |
| Search | Hybrid | Semantic + keyword search |

### Environment Variables Required

```bash
# Database
DATABASE_URL=postgres://...

# AI Providers (priority order)
AI_INTEGRATIONS_ANTHROPIC_BASE_URL=...
AI_INTEGRATIONS_ANTHROPIC_API_KEY=...
AI_INTEGRATIONS_OPENAI_BASE_URL=...
AI_INTEGRATIONS_OPENAI_API_KEY=...
OPENROUTER_API_KEY=...
DEEPSEEK_API_KEY=...

# Object Storage
DEFAULT_OBJECT_STORAGE_BUCKET_ID=...

# Email
RESEND_API_KEY=...

# Translation
DEEPL_API_KEY=...

# Analytics
POSTHOG_API_KEY=...
```

---

## 🏛️ Architecture Diagram | תרשים ארכיטקטורה

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TRAVI CMS Architecture                         │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────┐
                              │   Browser    │
                              │   Clients    │
                              └──────┬───────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           Replit Platform (Port 5000)                        │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      Express.js Server (index.ts)                    │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │    │
│  │  │   Security   │  │ Compression  │  │    Rate Limiting         │   │    │
│  │  │   Headers    │  │   (gzip)     │  │    (express-rate-limit)  │   │    │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘   │    │
│  │                                                                       │    │
│  │  ┌────────────────────────────────────────────────────────────────┐  │    │
│  │  │                        API Routes (/api/*)                      │  │    │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │  │    │
│  │  │  │ Contents │  │  Users   │  │   AI     │  │ Translations │   │  │    │
│  │  │  │ CRUD     │  │  Auth    │  │ Generate │  │   DeepL      │   │  │    │
│  │  │  └──────────┘  └──────────┘  └──────────┘  └──────────────┘   │  │    │
│  │  └────────────────────────────────────────────────────────────────┘  │    │
│  │                                                                       │    │
│  │  ┌────────────────────────────────────────────────────────────────┐  │    │
│  │  │                     SSR Middleware (Bots)                       │  │    │
│  │  │  Serves pre-rendered HTML to search engines and AI crawlers    │  │    │
│  │  └────────────────────────────────────────────────────────────────┘  │    │
│  │                                                                       │    │
│  │  ┌────────────────────────────────────────────────────────────────┐  │    │
│  │  │                    Vite Dev / Static Serve                      │  │    │
│  │  │  React SPA with shadcn/ui, TanStack Query, Wouter routing      │  │    │
│  │  └────────────────────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└────────────────────────────────┬─────────────────────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────────────┐
│   PostgreSQL    │   │ Object Storage  │   │    AI Providers         │
│   (Neon DB)     │   │   (Replit)      │   │                         │
│                 │   │                 │   │  1. Anthropic Claude    │
│  - contents     │   │  - /public      │   │  2. OpenRouter          │
│  - users        │   │  - /.private    │   │  3. DeepSeek            │
│  - translations │   │  - /uploads     │   │  4. OpenAI              │
│  - sessions     │   │                 │   │                         │
└─────────────────┘   └─────────────────┘   └─────────────────────────┘

                     ┌─────────────────────────────────────┐
                     │        External Services            │
                     ├─────────────────────────────────────┤
                     │  - DeepL (Translation)              │
                     │  - Resend (Email)                   │
                     │  - PostHog (Analytics)              │
                     │  - RSS Feeds (Content Sources)      │
                     └─────────────────────────────────────┘
```

---

## ⚙️ Common Operational Tasks | משימות תפעול נפוצות

### Starting the Application | הפעלת האפליקציה

```bash
# Development mode (default workflow)
npm run dev

# Production build
npm run build
npm start
```

### Restarting the Application | הפעלה מחדש

In Replit:
1. Click the "Stop" button in the Workflows panel
2. Click "Run" to restart
3. Or use the workflow: `npm run dev`

Via CLI:
```bash
# Kill existing process and restart
pkill -f "node" && npm run dev
```

### Deployment | פריסה

TRAVI uses Replit Deployments:

1. **Prepare for deployment**:
   ```bash
   npm run build
   ```

2. **Deploy via Replit UI**:
   - Click "Deploy" button
   - Select "Production" environment
   - Confirm deployment

3. **Verify deployment**:
   ```bash
   curl -I https://travi.world/api/health
   ```

### Rollback | חזרה לגרסה קודמת

1. **Via Replit Deployments**:
   - Go to Deployments panel
   - Find previous deployment
   - Click "Rollback"

2. **Manual rollback**:
   ```bash
   # Restore previous database state if needed
   pg_restore -h $PGHOST -U $PGUSER -d $PGDATABASE backup_YYYYMMDD.dump
   ```

### Database Migrations | מיגרציות מסד נתונים

```bash
# Generate migration
npx drizzle-kit generate

# Push schema changes (development)
npx drizzle-kit push

# View current schema
npx drizzle-kit studio
```

---

## 🗄️ Database Operations | פעולות מסד נתונים

### Connection Check | בדיקת חיבור

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1 as connected"

# Check active connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity"
```

### Backup Procedures | נהלי גיבוי

#### Manual Backup
```bash
# Full backup (custom format - recommended)
pg_dump $DATABASE_URL -Fc > backup_$(date +%Y%m%d_%H%M%S).dump

# SQL format
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Specific tables only
pg_dump $DATABASE_URL -t contents -t translations > partial_backup.sql
```

#### Restore from Backup
```bash
# From custom format
pg_restore -d $DATABASE_URL backup.dump

# From SQL
psql $DATABASE_URL < backup.sql

# To new database
createdb travi_restored
pg_restore -d travi_restored backup.dump
```

### Database Maintenance | תחזוקת מסד נתונים

```bash
# Vacuum and analyze
psql $DATABASE_URL -c "VACUUM ANALYZE"

# Check table sizes
psql $DATABASE_URL -c "
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC
"

# Check index usage
psql $DATABASE_URL -c "
SELECT 
  indexrelname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC
"
```

---

## 📝 Log Access | גישה ללוגים

### Application Logs | לוגי אפליקציה

#### Via Admin Panel
- Navigate to: `/admin/logs`
- Filter by level: ERROR, WARN, INFO, DEBUG
- Search by keyword or timestamp

#### Via Console Logger
The application captures console output automatically:
```typescript
// In browser dev tools
// Navigate to Admin → Logs panel
```

#### Log Locations
| Log Type | Location | Access Method |
|----------|----------|---------------|
| Application | Console output | Admin panel `/admin/logs` |
| Express requests | stdout | Replit Logs tab |
| Database queries | Drizzle verbose | Set `DEBUG=drizzle:*` |
| AI Provider | stdout | Filter for `[AI]` tag |

### Log Format

```
HH:MM:SS AM/PM [source] message
```

Example:
```
10:30:45 AM [express] POST /api/contents 201 in 45ms
10:30:46 AM [AI] Generating content with provider: anthropic
10:30:52 AM [express] GET /api/health 200 in 2ms
```

### Debugging with Logs

```bash
# Filter API logs
grep "\[express\]" logs/app.log

# Filter error logs
grep -i "error\|fail" logs/app.log

# Filter by endpoint
grep "POST /api/contents" logs/app.log
```

---

## 🔧 Performance Troubleshooting | פתרון בעיות ביצועים

### High Response Times | זמני תגובה גבוהים

#### Diagnosis
```bash
# Check slow endpoints in logs
grep "in [0-9]\{4,\}ms" logs/app.log

# Monitor in real-time
watch -n 1 'curl -s -o /dev/null -w "%{time_total}" https://travi.world/api/health'
```

#### Common Causes & Fixes

| Symptom | Cause | Fix |
|---------|-------|-----|
| All endpoints slow | Database connection pool exhausted | Restart app, check for connection leaks |
| AI endpoints slow | Provider rate limited | Check AI provider status, use fallback |
| Image uploads slow | Large file processing | Check file size limits, resize before upload |
| Search slow | Missing indexes | Run `VACUUM ANALYZE`, add indexes |

### High Memory Usage | שימוש גבוה בזיכרון

#### Diagnosis
```bash
# Check Node.js memory
node --expose-gc -e "console.log(process.memoryUsage())"

# Monitor memory in Replit
# View the Resources panel in the workspace
```

#### Solutions
1. **Restart the application** - Clears accumulated memory
2. **Check for memory leaks**:
   - Large arrays not being garbage collected
   - Event listeners not removed
   - Caching without limits
3. **Optimize image processing**:
   - Use streaming for large files
   - Reduce image quality settings

### High CPU Usage | שימוש גבוה במעבד

#### Diagnosis
```bash
# Check for CPU-intensive operations
top -H -p $(pgrep -f "node")

# Profile Node.js
node --prof server/index.ts
```

#### Common Causes
- AI content generation (expected, temporary)
- Image processing (use Sharp correctly)
- Infinite loops in code
- Heavy database queries without pagination

### Database Performance | ביצועי מסד נתונים

#### Slow Query Analysis
```sql
-- Enable query logging (temporary)
SET log_min_duration_statement = '100ms';

-- Check slow queries
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

#### Index Optimization
```sql
-- Check missing indexes
SELECT schemaname, tablename, 
       seq_scan, seq_tup_read,
       idx_scan, idx_tup_fetch
FROM pg_stat_user_tables
WHERE seq_scan > idx_scan
  AND seq_scan > 100;

-- Create missing indexes
CREATE INDEX CONCURRENTLY idx_contents_status 
ON contents(status) WHERE status = 'published';
```

### AI Provider Issues | בעיות ספקי AI

#### Check Provider Status
```bash
# Test Anthropic
curl -X POST $AI_INTEGRATIONS_ANTHROPIC_BASE_URL/messages \
  -H "x-api-key: $AI_INTEGRATIONS_ANTHROPIC_API_KEY" \
  -d '{"model":"claude-sonnet-4-5","max_tokens":10,"messages":[{"role":"user","content":"hi"}]}'
```

#### Provider Fallback Chain
1. Anthropic Claude (primary)
2. OpenRouter
3. DeepSeek
4. OpenAI

If all providers fail, check:
- API keys are valid and not expired
- Rate limits haven't been exceeded
- Provider service status pages

---

## 📊 Health Monitoring | ניטור תקינות

### Health Check Endpoint

```bash
# Basic health check
curl https://travi.world/api/health

# Expected response
{
  "status": "ok",
  "timestamp": "2024-12-29T00:00:00Z",
  "version": "1.0.0"
}
```

### Key Metrics to Monitor

| Metric | Normal | Warning | Critical |
|--------|--------|---------|----------|
| Response Time | < 200ms | < 500ms | > 1s |
| Error Rate | < 1% | < 5% | > 5% |
| Memory Usage | < 70% | < 85% | > 85% |
| CPU Usage | < 70% | < 85% | > 85% |
| DB Connections | < 80% | < 90% | > 90% |

---

## 🔒 Security Checklist | רשימת אבטחה

### Regular Tasks

- [ ] Rotate API keys quarterly
- [ ] Review access logs weekly
- [ ] Update dependencies monthly
- [ ] Backup verification monthly
- [ ] Security audit quarterly

### Emergency Procedures

See [INCIDENT-PLAYBOOK.md](./INCIDENT-PLAYBOOK.md) for incident response procedures.

---

## 📞 Support Contacts | אנשי קשר לתמיכה

| Role | Contact | Availability |
|------|---------|--------------|
| On-call Engineer | @oncall | 24/7 |
| Database Admin | @dba | Business hours |
| Security Team | @security | 24/7 for P1 |
| Replit Support | support.replit.com | 24/7 |

---

*Last updated: December 2024*
