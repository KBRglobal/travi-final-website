# 🚀 TRAVI Deployment Guide

**Comprehensive deployment instructions for all environments**

---

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Deployment Methods](#deployment-methods)
- [Health Verification](#health-verification)
- [Rollback Procedures](#rollback-procedures)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Overview

TRAVI currently supports deployment to **Replit** as the primary platform. This guide covers the deployment process, health checks, and rollback procedures.

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Replit Platform                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │   Client    │    │   Server    │    │  PostgreSQL │ │
│  │   (Vite)    │───▶│  (Express)  │───▶│  (Railway)  │ │
│  └─────────────┘    └─────────────┘    └─────────────┘ │
│                            │                             │
│                            ▼                             │
│                    ┌─────────────┐                      │
│                    │   Upstash   │                      │
│                    │   (Redis)   │                      │
│                    └─────────────┘                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Required Accounts

- **Replit Account** with Pro/Teams plan
- **Railway Account** for PostgreSQL
- **Upstash Account** for Redis (optional)

### Required Environment Variables

```bash
# Core (Required)
DATABASE_URL=postgresql://...
SESSION_SECRET=your-secure-session-secret
NODE_ENV=production

# AI Services (Required for AI features)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Optional Services
REDIS_URL=redis://...
RESEND_API_KEY=re_...
POSTHOG_API_KEY=phk_...
```

### Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] AI API keys validated
- [ ] Session secret is secure (32+ characters)
- [ ] SSL certificates valid (if custom domain)

---

## Environment Setup

### Development Environment

```bash
# Clone repository
git clone https://github.com/KBRglobal/travi-final-website.git
cd travi-final-website

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your values
# Start development server
npm run dev
```

### Production Environment

```bash
# Use production environment template
cp .env.production.example .env

# Configure all required variables
# See .env.production.example for detailed guidance

# Build for production
npm run build

# Start production server
npm start
```

---

## Deployment Methods

### Method 1: Replit Auto-Deploy (Recommended)

1. **Connect GitHub Repository**
   - Go to Replit project settings
   - Connect to GitHub repository
   - Enable auto-deploy on push to `main` branch

2. **Configure Secrets**
   - Navigate to Secrets tab in Replit
   - Add all required environment variables
   - Secrets are encrypted and secure

3. **Deploy**
   - Push to `main` branch
   - Replit automatically builds and deploys
   - Monitor deployment in Replit console

### Method 2: Manual Deployment

1. **Build Application**

   ```bash
   npm run build
   ```

2. **Verify Build**

   ```bash
   ls -la dist/
   # Should contain index.cjs and client files
   ```

3. **Deploy to Replit**
   - Upload `dist/` folder
   - Ensure `.env` is configured
   - Run `npm start`

---

## Health Verification

### Health Check Endpoints

| Endpoint               | Purpose              | Expected Response            |
| ---------------------- | -------------------- | ---------------------------- |
| `/api/health`          | Full health check    | `{"status": "healthy", ...}` |
| `/api/health/live`     | Kubernetes liveness  | `{"status": "alive"}`        |
| `/api/health/ready`    | Kubernetes readiness | `{"status": "ready"}`        |
| `/api/health/detailed` | Detailed diagnostics | Full system status           |

### Post-Deployment Verification

```bash
# Check basic health
curl https://your-domain.com/api/health

# Check liveness
curl https://your-domain.com/api/health/live

# Check readiness
curl https://your-domain.com/api/health/ready

# Check detailed health
curl https://your-domain.com/api/health/detailed
```

### Expected Health Response

```json
{
  "status": "healthy",
  "timestamp": "2026-01-27T18:38:19.435Z",
  "uptime": 23.535739,
  "version": "1.0.0",
  "responseTime": 431,
  "checks": {
    "database": { "status": "healthy", "latency": 431 },
    "memory": { "status": "healthy", "usage": 79, "details": "250MB / 318MB" },
    "eventLoop": { "status": "healthy", "latency": 0 }
  }
}
```

---

## Rollback Procedures

### Automatic Rollback

TRAVI includes automatic rollback triggered by:

| Trigger               | Threshold     | Cooldown  |
| --------------------- | ------------- | --------- |
| Error Rate            | 10%           | 5 minutes |
| Latency (P95)         | 5 seconds     | 5 minutes |
| Health Check Failures | 3 consecutive | 1 minute  |
| Budget Exceeded       | 1 event       | 1 hour    |
| Timeout               | 30 seconds    | 5 minutes |

### Manual Rollback

**Option 1: Git Revert**

```bash
# Revert last commit
git revert HEAD
git push origin main

# Or checkout previous version
git checkout <previous-commit-hash>
git push origin main --force
```

**Option 2: Replit Console**

1. Open Replit console
2. Navigate to Deployments
3. Select previous deployment
4. Click "Redeploy"

### Rollback Verification

After rollback, verify:

1. **Health Check**

   ```bash
   curl https://your-domain.com/api/health
   ```

2. **Database Connection**
   - Check database connectivity
   - Verify data integrity

3. **Feature Functionality**
   - Test core features
   - Check AI services

---

## Monitoring

### Built-in Monitoring

- **Health Dashboard**: `/admin/system/health`
- **Job Queue Status**: `/api/admin/jobs/recent`
- **RSS Processing**: `/api/admin/rss/status`
- **Content Intelligence**: `/api/admin/content/intelligence-status`

### Log Access

Logs are available in:

- Replit Console (real-time)
- Structured JSON format (production)
- Pretty-printed format (development)

### Key Metrics to Monitor

| Metric           | Healthy Range | Alert Threshold |
| ---------------- | ------------- | --------------- |
| Memory Usage     | < 80%         | > 90%           |
| Response Time    | < 500ms       | > 2000ms        |
| Error Rate       | < 1%          | > 5%            |
| Database Latency | < 100ms       | > 500ms         |

---

## Troubleshooting

### Common Issues

#### 1. Server Won't Start

```bash
# Check for missing environment variables
node -e "require('./server/config/env-validator')"

# Check database connection
psql $DATABASE_URL -c "SELECT 1"
```

#### 2. 500 Errors

Check for:

- Missing `SESSION_SECRET`
- Invalid `DATABASE_URL`
- Expired AI API keys

#### 3. Database Connection Issues

```bash
# Test connection
psql $DATABASE_URL -c "SELECT NOW()"

# Check SSL mode
# Add ?sslmode=require if needed
```

#### 4. Memory Issues

- Increase memory allocation in Replit
- Check for memory leaks in background jobs
- Review image processing operations

### Support Contacts

- **Technical Issues**: Create issue on GitHub
- **Security Issues**: security@travi.com
- **Replit Platform**: Replit support

---

## Best Practices

### Pre-Deployment

1. Run full test suite: `npm run test:coverage`
2. Build and verify: `npm run build`
3. Check environment variables
4. Review recent changes

### During Deployment

1. Monitor deployment logs
2. Watch health check endpoints
3. Be ready to rollback

### Post-Deployment

1. Verify all health checks pass
2. Test critical user flows
3. Monitor error rates for 15 minutes
4. Check background job processing

---

<div align="center">

**[← Back to Documentation Hub](README.md)** · **[Security →](SECURITY.md)** · **[API →](API.md)**

© 2024 TRAVI. All rights reserved.

</div>
