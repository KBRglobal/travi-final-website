# ✅ Deployment Checklist

> Pre-deployment verification checklist

---

## 🔍 Pre-Deployment

### Code Quality

- [ ] All tests pass
- [ ] No TypeScript errors (`npm run check`)
- [ ] No ESLint warnings
- [ ] Code reviewed and approved
- [ ] No debug code / console.logs

### Database

- [ ] Migrations prepared
- [ ] Backup created
- [ ] Schema changes tested
- [ ] Rollback plan ready

### Configuration

- [ ] Environment variables set
- [ ] Secrets rotated if needed
- [ ] API keys valid
- [ ] Feature flags configured

### Dependencies

- [ ] No security vulnerabilities (`npm audit`)
- [ ] Dependencies up to date
- [ ] Lock file committed

---

## 🚀 Deployment

### Build

- [ ] Build completes successfully
- [ ] Bundle size acceptable
- [ ] Assets generated correctly

### Deploy

- [ ] Deploy to staging first
- [ ] Verify staging works
- [ ] Deploy to production
- [ ] Deployment logs clean

---

## ✅ Post-Deployment

### Verification

- [ ] Health check passes
- [ ] Homepage loads
- [ ] Login works
- [ ] Core features functional
- [ ] API endpoints responding

### Monitoring

- [ ] Error tracking active
- [ ] Performance metrics normal
- [ ] No unusual traffic patterns
- [ ] Alerts configured

### Documentation

- [ ] CHANGELOG updated
- [ ] Release notes published
- [ ] Team notified

---

## 🧪 Smoke Tests

### Critical Paths

```bash
# Health check
curl https://app.com/api/health

# Login
curl -X POST https://app.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'

# List content
curl https://app.com/api/public/contents

# Create content (authenticated)
curl -X POST https://app.com/api/contents \
  -H "Cookie: connect.sid=..." \
  -d '{"title":"Test","type":"article"}'
```

---

## 🚨 Rollback Triggers

Rollback immediately if:

- [ ] Error rate > 5%
- [ ] Response time > 2s
- [ ] Critical feature broken
- [ ] Security vulnerability
- [ ] Data corruption

### Rollback Steps

1. Revert deployment
2. Verify rollback
3. Investigate issue
4. Fix and redeploy

---

## 📞 Emergency Contacts

| Role | Contact |
|------|---------|
| On-call | @oncall |
| Team Lead | @lead |
| DBA | @dba |

---

## 📝 Deployment Log

```
Date: YYYY-MM-DD
Version: X.X.X
Deployer: @username
Changes:
- Feature 1
- Fix 2
Status: ✅ Success / ❌ Rolled back
Notes:
```
