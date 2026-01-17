# TRAVI CMS - CI/CD Pipeline Documentation

## Overview

This document describes the Continuous Integration and Continuous Deployment pipeline for TRAVI CMS.

## Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

**Trigger**: Push to `main` branch or Pull Request

**Jobs**:

#### Build Job
- **Checkout**: Clone repository
- **Setup Node.js 20**: With npm caching
- **Install Dependencies**: `npm ci` for reproducible builds
- **Type Check**: `npx tsc --noEmit` for TypeScript validation
- **Lint**: ESLint with TypeScript rules
- **Build**: Production build verification

#### Test Job
- **Requires**: Build job completion
- **Services**: PostgreSQL 15 for database tests
- **Steps**: Install, run unit tests with database connection

### 2. E2E Workflow (`.github/workflows/e2e.yml`)

**Trigger**: Push to `main` branch or Pull Request

**Jobs**:

#### E2E Job
- **Timeout**: 30 minutes maximum
- **Services**: PostgreSQL 15
- **Playwright**: Chromium browser tests
- **Artifacts**: Test report uploaded on failure

## Environment Variables

### Required Secrets
```
DATABASE_URL     - PostgreSQL connection string
ANTHROPIC_API_KEY - AI provider key (optional for tests)
OPENAI_API_KEY   - AI provider key (optional for tests)
```

### Test Environment
```
NODE_ENV=test
BASE_URL=http://localhost:5000
```

## Local Development

### Run Tests Locally
```bash
# Unit tests
npm test

# E2E tests (requires Playwright)
npx playwright test

# Type check
npx tsc --noEmit

# Lint
npx eslint . --ext .ts,.tsx
```

## Pipeline Status

| Stage | Description | Duration |
|-------|-------------|----------|
| Build | Type check + Lint + Build | ~2 min |
| Test | Unit tests with DB | ~3 min |
| E2E | Playwright browser tests | ~10 min |

## Deployment

Deployment is handled separately via Replit's deployment system:
1. Push to main triggers CI/CD
2. After tests pass, deploy via Replit dashboard
3. Production uses separate database and secrets

## Troubleshooting

### Common Issues

**Type errors**: Run `npx tsc --noEmit` locally to see full output

**Lint failures**: Run `npx eslint . --fix` to auto-fix issues

**E2E flaky tests**: Check `playwright-report` artifact for screenshots

**Database connection**: Ensure PostgreSQL service is healthy before tests start
