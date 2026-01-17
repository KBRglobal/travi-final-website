# 🚀 Deployment Overview

> Deployment guide for Traviapp

---

## 📋 Deployment Options

| Platform | Complexity | Best For |
|----------|------------|----------|
| Replit | Low | Development, small scale |
| Vercel + PlanetScale | Medium | Production |
| AWS/GCP | High | Enterprise scale |
| Docker | Medium | Self-hosted |

---

## 🔧 Replit Deployment

### Current Setup

Traviapp runs natively on Replit with:

- Node.js 20 runtime
- PostgreSQL 16 database
- Automatic SSL
- Autoscale deployment

### Deploy Steps

1. **Push to Repository**
   ```bash
   git push origin main
   ```

2. **Replit Auto-deploys**
   - Detects changes
   - Runs build
   - Restarts server

3. **Verify**
   - Check deployment logs
   - Test application

---

## 🏗️ Build Process

### Build Command

```bash
npm run build
```

### What Happens

1. **TypeScript Compilation**
   - Server code compiled
   - Type checking

2. **Vite Build**
   - React bundled
   - Assets optimized
   - Output to `dist/public`

3. **Server Bundle**
   - Express bundled
   - Output to `dist/index.cjs`

### Output Structure

```
dist/
├── index.cjs       # Server bundle
└── public/         # Frontend assets
    ├── index.html
    ├── assets/
    │   ├── index-[hash].js
    │   └── index-[hash].css
    └── ...
```

---

## ⚙️ Environment Configuration

### Production Variables

```bash
# Required
NODE_ENV=production
DATABASE_URL=postgresql://...
SESSION_SECRET=<strong-secret>
OPENAI_API_KEY=sk-...

# Recommended
DEEPL_API_KEY=...
RESEND_API_KEY=re_...
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

### Security Checklist

- [ ] Strong SESSION_SECRET (32+ chars)
- [ ] Unique database password
- [ ] API keys not exposed
- [ ] HTTPS enabled

---

## 📊 Monitoring

### Health Check

```bash
curl https://your-app.com/api/health
```

### Key Metrics

| Metric | Normal Range |
|--------|--------------|
| Response time | < 200ms |
| Error rate | < 1% |
| CPU usage | < 80% |
| Memory | < 80% |

---

## 🔄 Deployment Workflow

```
┌─────────────┐
│  Developer  │
└──────┬──────┘
       │ git push
       ▼
┌─────────────┐
│   GitHub    │
└──────┬──────┘
       │ webhook
       ▼
┌─────────────┐
│   Replit    │
│   Build     │
└──────┬──────┘
       │ deploy
       ▼
┌─────────────┐
│ Production  │
└─────────────┘
```

---

## 🚨 Rollback

### Quick Rollback

```bash
# Revert to previous commit
git revert HEAD
git push origin main
```

### Database Rollback

See [Backup & Restore](../database/backup-restore.md)

---

## 📚 Related Docs

- [Environments](./environments.md)
- [CI/CD](./ci-cd.md)
- [Checklist](./checklist.md)
