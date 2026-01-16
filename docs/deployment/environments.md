# 🌍 Environments

> Environment configuration guide

---

## 📋 Environment Types

| Environment | Purpose | URL |
|-------------|---------|-----|
| Development | Local dev | localhost:5000 |
| Staging | Testing | staging.app.com |
| Production | Live | app.com |

---

## 🔧 Development

### Setup

```bash
cp .env.example .env
# Edit .env with dev values
npm run dev
```

### Configuration

```bash
NODE_ENV=development
DATABASE_URL=postgresql://localhost/traviapp_dev
SESSION_SECRET=dev-secret-not-for-production
OPENAI_API_KEY=sk-...
```

### Features

- Hot reload
- Verbose logging
- Debug tools
- No caching

---

## 🧪 Staging

### Purpose

- Test before production
- QA verification
- Integration testing
- Performance testing

### Configuration

```bash
NODE_ENV=staging
DATABASE_URL=postgresql://staging-db/traviapp
SESSION_SECRET=<unique-staging-secret>
```

### Best Practices

- Mirror production config
- Use production-like data
- Test all integrations
- Monitor performance

---

## 🚀 Production

### Configuration

```bash
NODE_ENV=production
DATABASE_URL=postgresql://prod-db/traviapp

# Strong secrets
SESSION_SECRET=<cryptographically-secure-32+-chars>

# All API keys
OPENAI_API_KEY=sk-...
DEEPL_API_KEY=...
RESEND_API_KEY=re_...

# Cache
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

### Security

- HTTPS enforced
- Secure cookies
- Rate limiting active
- Audit logging enabled

---

## 🔐 Environment Variables

### By Environment

| Variable | Dev | Staging | Prod |
|----------|-----|---------|------|
| `NODE_ENV` | development | staging | production |
| `LOG_LEVEL` | debug | info | warn |
| `CACHE_ENABLED` | false | true | true |
| `RATE_LIMIT` | disabled | enabled | enabled |

### Secrets Management

```bash
# Never commit secrets
echo ".env" >> .gitignore

# Use environment-specific files
.env.development
.env.staging
.env.production  # Only on server
```

---

## 🔄 Environment Promotion

```
Development → Staging → Production

1. Test in Development
2. Deploy to Staging
3. QA verification
4. Deploy to Production
```

### Promotion Checklist

- [ ] All tests pass
- [ ] No console errors
- [ ] API endpoints verified
- [ ] Database migrations ready
- [ ] Environment variables set

---

## 📊 Environment Comparison

### Development
```
- Fast iteration
- Debug tools enabled
- No rate limits
- Local database
```

### Production
```
- Optimized builds
- Caching enabled
- Rate limits active
- Monitoring enabled
- Secure cookies
```

---

## ⚠️ Common Issues

### Wrong Environment

```bash
# Check current environment
echo $NODE_ENV

# Verify in app
GET /api/debug/env  # Dev only
```

### Missing Variables

```bash
# List required vars
grep -r "process.env" server/ | grep -oP "process\.env\.\K\w+"
```

### Database Mismatch

```bash
# Verify connection
psql $DATABASE_URL -c "SELECT current_database();"
```
