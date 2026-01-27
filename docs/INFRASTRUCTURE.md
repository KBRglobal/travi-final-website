# 🏗️ TRAVI Infrastructure Guide

**Infrastructure architecture, configuration, and management**

---

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Components](#components)
- [Database](#database)
- [Caching](#caching)
- [Background Services](#background-services)
- [Monitoring](#monitoring)
- [Scaling](#scaling)
- [Disaster Recovery](#disaster-recovery)

---

## Architecture Overview

TRAVI uses a modern, cloud-native architecture optimized for the Replit platform.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Internet                                 │
│                            │                                     │
│                            ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    CDN (Cloudflare)                      │   │
│  │                  (SSL, DDoS Protection)                  │   │
│  └─────────────────────────┬───────────────────────────────┘   │
│                            │                                     │
│                            ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Replit Platform                       │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │              Express.js Server                   │    │   │
│  │  │  ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐   │    │   │
│  │  │  │ Auth  │  │  API  │  │  SSR  │  │Static │   │    │   │
│  │  │  └───────┘  └───────┘  └───────┘  └───────┘   │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  └─────────────────────────┬───────────────────────────────┘   │
│                            │                                     │
│            ┌───────────────┼───────────────┐                    │
│            ▼               ▼               ▼                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  PostgreSQL │  │   Upstash   │  │  AI Services│             │
│  │  (Railway)  │  │   (Redis)   │  │  (OpenAI,   │             │
│  │             │  │             │  │  Anthropic) │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Components

### Application Server

| Component   | Technology     | Purpose            |
| ----------- | -------------- | ------------------ |
| Runtime     | Node.js 20+    | JavaScript runtime |
| Framework   | Express.js     | HTTP server        |
| Build       | Vite + esbuild | Frontend bundling  |
| Type System | TypeScript     | Type safety        |

### Configuration

```typescript
// server/index.ts - Server Configuration
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

// Connection pool settings
const poolConfig = {
  max: 15, // Maximum connections
  min: 2, // Minimum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};
```

---

## Database

### PostgreSQL (Railway)

**Connection Configuration:**

```typescript
// server/db.ts
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 15,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  allowExitOnIdle: true,
  ssl: { rejectUnauthorized: false },
});
```

### Schema Management

Using Drizzle ORM:

```bash
# Push schema changes
npm run db:push

# Generate migrations (if configured)
npx drizzle-kit generate
```

### Backup & Recovery

```bash
# Create backup
npm run db:backup

# List backups
npm run db:backup:list

# Restore from backup
npm run db:restore --file <backup-file>

# Restore latest backup
npm run db:restore:latest
```

### Database Metrics

| Metric      | Target  | Alert   |
| ----------- | ------- | ------- |
| Connections | < 10    | > 12    |
| Latency     | < 100ms | > 500ms |
| Size        | < 5GB   | > 4GB   |

---

## Caching

### Redis (Upstash)

**Primary Cache Configuration:**

```typescript
// server/cache.ts
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
```

### In-Memory Fallback

When Redis is unavailable:

```typescript
const memoryCache = new Map<string, { value: unknown; expiresAt: number }>();

const TTL_OPTIONS = {
  short: 60, // 1 minute
  medium: 300, // 5 minutes
  long: 3600, // 1 hour
  day: 86400, // 24 hours
};
```

### Cache Strategy

| Data Type      | TTL      | Strategy      |
| -------------- | -------- | ------------- |
| API Responses  | 5 min    | Cache-first   |
| User Sessions  | 24 hours | Write-through |
| Search Results | 1 hour   | Lazy refresh  |
| Static Content | 24 hours | Immutable     |

---

## Background Services

### Service Configuration

```bash
# Feature Flags (Environment Variables)
ENABLE_SEO_AUTOPILOT=true
ENABLE_DATA_DECISIONS=true
ENABLE_CONTENT_HEALTH=true
ENABLE_TRANSLATION_QUEUE=true
ENABLE_TRANSLATION_WORKER=true
ENABLE_RSS_SCHEDULER=true
ENABLE_LOCALIZATION_GOVERNANCE=true
```

### Service Overview

| Service           | Purpose                  | Interval   |
| ----------------- | ------------------------ | ---------- |
| SEO Autopilot     | Automated SEO tasks      | 15 min     |
| Content Health    | Content quality checks   | Continuous |
| Translation Queue | Translation processing   | 5 sec poll |
| RSS Scheduler     | News aggregation         | 60 min     |
| Data Decisions    | Analytics-driven actions | Continuous |

### Job Queue

```typescript
// server/job-queue.ts
const jobQueue = {
  maxConcurrency: 3,
  pollInterval: 1000,
  retryAttempts: 3,
  retryDelay: 5000,
};
```

---

## Monitoring

### Health Endpoints

| Endpoint               | Check Type | Components             |
| ---------------------- | ---------- | ---------------------- |
| `/api/health`          | Full       | DB, Memory, Event Loop |
| `/api/health/live`     | Liveness   | Process running        |
| `/api/health/ready`    | Readiness  | All services ready     |
| `/api/health/detailed` | Detailed   | Full system status     |

### Structured Logging

Using Pino:

```typescript
// server/lib/logger.ts
const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  redact: ["password", "token", "authorization", "cookie", "apiKey"],
});
```

### Metrics Collection

| Metric          | Type      | Purpose              |
| --------------- | --------- | -------------------- |
| Request Latency | Histogram | Performance tracking |
| Error Rate      | Counter   | Reliability tracking |
| Memory Usage    | Gauge     | Resource monitoring  |
| DB Connections  | Gauge     | Pool health          |

### Alerting

Configured alerts in `server/alerts/`:

| Alert              | Condition  | Severity |
| ------------------ | ---------- | -------- |
| High Error Rate    | > 5%       | Critical |
| High Latency       | P95 > 2s   | High     |
| Low Memory         | > 90% used | High     |
| DB Connection Pool | > 80% used | Medium   |

---

## Scaling

### Current Limits

| Resource    | Limit       | Notes                 |
| ----------- | ----------- | --------------------- |
| Memory      | 512MB - 2GB | Replit plan dependent |
| CPU         | Shared      | Auto-scales           |
| Connections | 15          | DB pool max           |
| Requests    | 100/min/IP  | Rate limited          |

### Scaling Strategies

**Vertical Scaling (Replit):**

- Upgrade to higher Replit plan
- Increase memory allocation

**Horizontal Scaling (Future):**

- Multiple Replit instances behind load balancer
- Read replicas for database
- Redis cluster for caching

### Performance Optimization

```typescript
// Implemented optimizations:
- Connection pooling (DB)
- In-memory caching (fallback)
- Response compression (gzip)
- Static file caching (CDN)
- Lazy loading (frontend)
```

---

## Disaster Recovery

### Backup Strategy

| Data     | Frequency | Retention | Storage            |
| -------- | --------- | --------- | ------------------ |
| Database | Daily     | 30 days   | Replit Storage     |
| Config   | On change | Unlimited | Git                |
| Logs     | 90 days   | Rolling   | In-memory → Export |

### Recovery Procedures

**Database Recovery:**

```bash
# List available backups
npm run db:backup:list

# Restore from specific backup
npm run db:restore --file backup-2026-01-27.sql
```

**Application Recovery:**

```bash
# Redeploy from Git
git checkout <last-good-commit>
git push origin main --force
```

### Recovery Objectives

| Objective            | Target  | Current                 |
| -------------------- | ------- | ----------------------- |
| RTO (Recovery Time)  | 4 hours | ~30 minutes             |
| RPO (Recovery Point) | 1 hour  | 24 hours (daily backup) |

### Failover Checklist

1. [ ] Identify incident scope
2. [ ] Notify stakeholders
3. [ ] Initiate rollback/restore
4. [ ] Verify health checks
5. [ ] Monitor for 30 minutes
6. [ ] Document incident

---

## Security Infrastructure

### Network Security

- **SSL/TLS**: All traffic encrypted (TLS 1.3)
- **HSTS**: Strict transport security enabled
- **CSP**: Content security policy configured
- **CORS**: Restricted to known origins

### Application Security

- **Rate Limiting**: Per-IP and per-user limits
- **Input Validation**: Zod schemas for all inputs
- **Output Encoding**: XSS prevention
- **CSRF Protection**: Token-based protection

### Secrets Management

```bash
# Environment-based secrets
# Never commit to Git
DATABASE_URL=***
SESSION_SECRET=***
OPENAI_API_KEY=***
```

---

## Environment Parity

### Development vs Production

| Aspect   | Development  | Production       |
| -------- | ------------ | ---------------- |
| Logging  | Pretty print | JSON structured  |
| Caching  | In-memory    | Redis + fallback |
| Database | Local/Remote | Railway          |
| SSL      | Optional     | Required         |
| Debug    | Enabled      | Disabled         |

### Environment Variables

```bash
# Development (.env)
NODE_ENV=development
LOG_LEVEL=debug

# Production (.env)
NODE_ENV=production
LOG_LEVEL=info
```

---

## Future Improvements

### Planned

- [ ] Prometheus metrics endpoint
- [ ] Grafana dashboards
- [ ] Kubernetes manifests
- [ ] Terraform IaC
- [ ] Multi-region deployment
- [ ] Database read replicas

### Under Consideration

- Docker containerization
- Service mesh (Istio)
- Distributed tracing (Jaeger)
- APM integration (DataDog/New Relic)

---

<div align="center">

**[← Back to Deployment](DEPLOYMENT.md)** · **[Security →](SECURITY.md)** · **[API →](API.md)**

© 2024 TRAVI. All rights reserved.

</div>
