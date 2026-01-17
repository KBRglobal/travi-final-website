# 🚀 Runbook: Deploy Failure

> How to handle failed deployments

---

## 🚨 Symptoms

- Build failed
- Deploy failed
- Application not starting after deploy
- 502/503 errors after deploy

---

## 🔍 Diagnosis

### Step 1: Check Build Logs

```bash
# View build output
npm run build 2>&1

# Check for errors
npm run check
```

### Step 2: Check Deploy Logs

```bash
# Replit deployment logs
# View in Replit console
```

### Step 3: Check Application Logs

```bash
# Application startup errors
pm2 logs traviapp --lines 100
```

---

## 🛠️ Resolution

### If: Build Failed

1. Check TypeScript errors:
   ```bash
   npm run check
   ```

2. Fix errors and retry:
   ```bash
   npm run build
   ```

### If: Missing Dependencies

```bash
# Reinstall dependencies
rm -rf node_modules
npm install

# Rebuild
npm run build
```

### If: Environment Variables Missing

1. Check required variables:
   ```bash
   # List required
   grep -r "process.env" server/ | grep -oP "process\.env\.\K\w+"
   ```

2. Add missing variables to environment

### If: Database Migration Failed

1. Check migration:
   ```bash
   npm run db:push
   ```

2. If conflict, check schema

### If: Application Crashes on Start

1. Check error:
   ```bash
   node dist/index.cjs
   ```

2. Fix startup issue

---

## 🔙 Rollback

### Quick Rollback

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Redeploy
```

### Manual Rollback

```bash
# Checkout previous version
git checkout HEAD~1

# Build and deploy
npm run build
npm run start
```

---

## ✅ Verification

After fix:

1. Build succeeds:
   ```bash
   npm run build
   ```

2. Application starts:
   ```bash
   npm run start
   ```

3. Health check passes:
   ```bash
   curl https://app.com/api/health
   ```

4. Core functionality works

---

## 🔄 Prevention

- Run `npm run check` before commit
- Test build locally
- Use staging environment
- Automated tests in CI
- Canary deployments

---

## 📞 Escalation

If unresolved after 30 minutes:

1. Rollback to last working version
2. Contact: @team-lead
3. Document: Issue for post-mortem
