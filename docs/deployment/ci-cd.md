# 🔄 CI/CD Pipeline

> Continuous Integration & Deployment

---

## 📋 Pipeline Overview

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│   Push   │───▶│   Test   │───▶│  Build   │───▶│  Deploy  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
```

---

## 🔧 GitHub Actions

### Basic Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run check

      - name: Build
        run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to Replit
        run: |
          # Replit auto-deploys on push
          echo "Deployed!"
```

---

## 🧪 Test Stage

### What Runs

```yaml
- name: Type check
  run: npm run check

- name: Unit tests
  run: npm test

- name: E2E tests
  run: npm run test:e2e
```

### Requirements

- All tests must pass
- No TypeScript errors
- Coverage thresholds met

---

## 🏗️ Build Stage

### What Runs

```yaml
- name: Build
  run: npm run build
  env:
    NODE_ENV: production
```

### Output

- Compiled TypeScript
- Bundled React app
- Optimized assets

---

## 🚀 Deploy Stage

### Replit Auto-Deploy

Replit automatically deploys on:
- Push to main branch
- Manual trigger

### Manual Deploy

```bash
# SSH to server
ssh user@server

# Pull latest
git pull origin main

# Install & build
npm ci
npm run build

# Restart
pm2 restart traviapp
```

---

## 🔐 Secrets Management

### GitHub Secrets

```yaml
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

### Required Secrets

| Secret | Description |
|--------|-------------|
| `DATABASE_URL` | Production DB |
| `SESSION_SECRET` | Session encryption |
| `OPENAI_API_KEY` | AI service |
| `DEEPL_API_KEY` | Translation |
| `RESEND_API_KEY` | Email service |

---

## 📊 Pipeline Status

### Status Badges

```markdown
![CI](https://github.com/KBRglobal/Traviapp/workflows/CI/badge.svg)
```

### Notifications

- Slack integration
- Email on failure
- GitHub status checks

---

## 🔄 Rollback

### Automatic Rollback

```yaml
- name: Health check
  run: |
    for i in {1..10}; do
      if curl -s https://app.com/api/health; then
        exit 0
      fi
      sleep 5
    done
    exit 1

- name: Rollback on failure
  if: failure()
  run: |
    git revert HEAD --no-edit
    git push origin main
```

### Manual Rollback

```bash
# Revert last commit
git revert HEAD
git push origin main
```

---

## 📈 Metrics

### Track

- Build time
- Deploy frequency
- Failure rate
- Recovery time

### Goals

| Metric | Target |
|--------|--------|
| Build time | < 5 min |
| Deploy frequency | Daily |
| Failure rate | < 5% |
| Recovery time | < 30 min |
