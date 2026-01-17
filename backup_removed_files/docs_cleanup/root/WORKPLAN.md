# 📋 TRAVI - תכנית עבודה מלאה לתיקונים

**תאריך יצירה:** 2026-01-16
**משך כולל משוער:** 4-6 שבועות
**עדיפות:** קריטי לפני Launch

---

## 📊 סיכום מהיר

| שלב | משך | מטרה |
|-----|-----|------|
| שבוע 1 | 5 ימים | תשתית CI/CD + DB |
| שבוע 2 | 5 ימים | פיצול routes.ts |
| שבוע 3 | 5 ימים | Tests + Cleanup |
| שבוע 4 | 5 ימים | Security + Polish |
| שבוע 5-6 | 10 ימים | QA + Launch Prep |

---

# 🗓️ שבוע 1: תשתית CI/CD + Database

## יום 1: GitHub Actions - CI בסיסי

### משימה 1.1: יצירת .github/workflows/ci.yml
```yaml
# ליצור קובץ: .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test -- --coverage
      - uses: codecov/codecov-action@v3
```

### משימה 1.2: יצירת .github/dependabot.yml
```yaml
# ליצור קובץ: .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

### משימה 1.3: יצירת .github/CODEOWNERS
```
# ליצור קובץ: .github/CODEOWNERS
* @team-lead
/server/ @backend-team
/client/ @frontend-team
/shared/ @backend-team @frontend-team
```

**Checklist יום 1:**
- [ ] יצירת תיקיית .github/workflows
- [ ] יצירת ci.yml
- [ ] יצירת dependabot.yml
- [ ] יצירת CODEOWNERS
- [ ] בדיקה ש-CI רץ על PR

---

## יום 2: Security Scanning

### משימה 2.1: יצירת .github/workflows/security.yml
```yaml
name: Security

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'  # כל יום ראשון

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm audit --audit-level=high

  codeql:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v2
        with:
          languages: javascript, typescript
      - uses: github/codeql-action/analyze@v2
```

### משימה 2.2: הרצת npm audit וטיפול בבעיות
```bash
npm audit
npm audit fix
# לתעד vulnerabilities שלא ניתן לתקן
```

**Checklist יום 2:**
- [ ] יצירת security.yml
- [ ] הרצת npm audit
- [ ] תיקון high/critical vulnerabilities
- [ ] תיעוד vulnerabilities פתוחים

---

## יום 3: Database Indexes

### משימה 3.1: יצירת migration לindexes
```typescript
// ליצור: migrations/XXXX_add_indexes.sql

-- Contents table indexes
CREATE INDEX CONCURRENTLY idx_contents_destination_id ON contents(destination_id);
CREATE INDEX CONCURRENTLY idx_contents_content_type ON contents(content_type);
CREATE INDEX CONCURRENTLY idx_contents_status ON contents(status);
CREATE INDEX CONCURRENTLY idx_contents_created_at ON contents(created_at DESC);
CREATE INDEX CONCURRENTLY idx_contents_slug ON contents(slug);
CREATE INDEX CONCURRENTLY idx_contents_language ON contents(language);

-- Attractions table indexes
CREATE INDEX CONCURRENTLY idx_attractions_destination_id ON attractions(destination_id);
CREATE INDEX CONCURRENTLY idx_attractions_content_id ON attractions(content_id);

-- Hotels table indexes
CREATE INDEX CONCURRENTLY idx_hotels_destination_id ON hotels(destination_id);
CREATE INDEX CONCURRENTLY idx_hotels_content_id ON hotels(content_id);

-- Articles table indexes
CREATE INDEX CONCURRENTLY idx_articles_category ON articles(category);
CREATE INDEX CONCURRENTLY idx_articles_destination_id ON articles(destination_id);

-- Users table indexes
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_users_role ON users(role);

-- Audit logs indexes
CREATE INDEX CONCURRENTLY idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX CONCURRENTLY idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX CONCURRENTLY idx_audit_logs_action ON audit_logs(action);

-- Sessions indexes
CREATE INDEX CONCURRENTLY idx_sessions_user_id ON sessions(user_id);
CREATE INDEX CONCURRENTLY idx_sessions_expires_at ON sessions(expires_at);

-- Internal links indexes
CREATE INDEX CONCURRENTLY idx_internal_links_source_id ON internal_links(source_content_id);
CREATE INDEX CONCURRENTLY idx_internal_links_target_id ON internal_links(target_content_id);

-- Tags indexes
CREATE INDEX CONCURRENTLY idx_content_tags_content_id ON content_tags(content_id);
CREATE INDEX CONCURRENTLY idx_content_tags_tag_id ON content_tags(tag_id);

-- Newsletter indexes
CREATE INDEX CONCURRENTLY idx_newsletter_subscribers_email ON newsletter_subscribers(email);
CREATE INDEX CONCURRENTLY idx_newsletter_subscribers_status ON newsletter_subscribers(status);
```

### משימה 3.2: עדכון schema.ts עם indexes
```typescript
// להוסיף ל-shared/schema.ts indexes definitions
// Drizzle ORM index syntax
```

**Checklist יום 3:**
- [ ] יצירת migration file
- [ ] בדיקה ב-staging
- [ ] הרצה ב-production
- [ ] אימות עם EXPLAIN ANALYZE

---

## יום 4: Branch Protection + PR Templates

### משימה 4.1: Branch Protection Rules (GitHub UI)
```
Settings > Branches > Add rule:
- Branch name pattern: main
- [x] Require pull request before merging
- [x] Require approvals: 1
- [x] Require status checks: ci, typecheck, lint
- [x] Require branches to be up to date
- [x] Do not allow bypassing the above settings
```

### משימה 4.2: יצירת PR Template
```markdown
<!-- ליצור: .github/pull_request_template.md -->

## Description
<!-- מה השינוי הזה עושה? -->

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing done

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] No TODO comments added

## Screenshots (if applicable)
```

### משימה 4.3: יצירת Issue Templates
```markdown
<!-- ליצור: .github/ISSUE_TEMPLATE/bug_report.md -->
---
name: Bug Report
about: Report a bug
labels: bug
---

## Description
## Steps to Reproduce
## Expected Behavior
## Actual Behavior
## Screenshots
## Environment
```

**Checklist יום 4:**
- [ ] הגדרת branch protection
- [ ] יצירת PR template
- [ ] יצירת issue templates
- [ ] בדיקה שהכל עובד

---

## יום 5: CD Pipeline + Environment Setup

### משימה 5.1: יצירת deploy workflow
```yaml
# ליצור: .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Staging
        run: |
          # Deploy commands here
          echo "Deploying to staging..."

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Production
        run: |
          # Deploy commands here
          echo "Deploying to production..."
```

### משימה 5.2: הגדרת Environments ב-GitHub
```
Settings > Environments:
1. staging
   - No protection rules

2. production
   - Required reviewers: 1
   - Wait timer: 5 minutes
```

**Checklist יום 5:**
- [ ] יצירת deploy.yml
- [ ] הגדרת staging environment
- [ ] הגדרת production environment
- [ ] בדיקת deploy flow

---

# 🗓️ שבוע 2: פיצול routes.ts

## יום 6-7: תכנון ומבנה

### משימה 6.1: מיפוי routes.ts
```
routes.ts (19,113 שורות) יפוצל ל:

server/routes/
├── index.ts              # Main router + middleware
├── auth.routes.ts        # Authentication (~500 lines)
├── users.routes.ts       # User management (~400 lines)
├── contents.routes.ts    # Content CRUD (~2,000 lines)
├── attractions.routes.ts # Attractions (~1,500 lines)
├── hotels.routes.ts      # Hotels (~1,200 lines)
├── articles.routes.ts    # Articles (~1,000 lines)
├── destinations.routes.ts# Destinations (~800 lines)
├── ai.routes.ts          # AI/Octopus (~2,500 lines)
├── seo.routes.ts         # SEO engine (~1,500 lines)
├── tiqets.routes.ts      # Tiqets integration (~800 lines)
├── media.routes.ts       # Media/uploads (~600 lines)
├── newsletter.routes.ts  # Newsletter (~400 lines)
├── analytics.routes.ts   # Analytics (~500 lines)
├── admin.routes.ts       # Admin panel (~2,000 lines)
├── public.routes.ts      # Public API (~1,500 lines)
├── webhooks.routes.ts    # Webhooks (~300 lines)
└── system.routes.ts      # Health/status (~200 lines)
```

### משימה 6.2: יצירת מבנה תיקיות
```bash
mkdir -p server/routes
touch server/routes/index.ts
touch server/routes/auth.routes.ts
touch server/routes/users.routes.ts
# ... etc
```

---

## יום 8-9: פיצול בפועל

### משימה 8.1: יצירת route base pattern
```typescript
// server/routes/base.ts
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { rateLimiter } from '../security/rate-limiter';

export function createRouter() {
  return Router();
}

export { authMiddleware, rateLimiter };
```

### משימה 8.2: דוגמה - auth.routes.ts
```typescript
// server/routes/auth.routes.ts
import { createRouter, rateLimiter } from './base';
import { db } from '../db';
import { users, sessions } from '@shared/schema';

const router = createRouter();

// POST /api/auth/login
router.post('/login', rateLimiter('auth'), async (req, res) => {
  // ... login logic
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  // ... logout logic
});

// POST /api/auth/register
router.post('/register', rateLimiter('auth'), async (req, res) => {
  // ... register logic
});

// POST /api/auth/forgot-password
router.post('/forgot-password', rateLimiter('auth'), async (req, res) => {
  // ... forgot password logic
});

// POST /api/auth/reset-password
router.post('/reset-password', rateLimiter('auth'), async (req, res) => {
  // ... reset password logic
});

export default router;
```

### משימה 8.3: דוגמה - index.ts (main router)
```typescript
// server/routes/index.ts
import { Express } from 'express';
import authRoutes from './auth.routes';
import usersRoutes from './users.routes';
import contentsRoutes from './contents.routes';
import attractionsRoutes from './attractions.routes';
import hotelsRoutes from './hotels.routes';
import articlesRoutes from './articles.routes';
import destinationsRoutes from './destinations.routes';
import aiRoutes from './ai.routes';
import seoRoutes from './seo.routes';
import tiqetsRoutes from './tiqets.routes';
import mediaRoutes from './media.routes';
import newsletterRoutes from './newsletter.routes';
import analyticsRoutes from './analytics.routes';
import adminRoutes from './admin.routes';
import publicRoutes from './public.routes';
import webhooksRoutes from './webhooks.routes';
import systemRoutes from './system.routes';

export function registerRoutes(app: Express) {
  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/contents', contentsRoutes);
  app.use('/api/attractions', attractionsRoutes);
  app.use('/api/hotels', hotelsRoutes);
  app.use('/api/articles', articlesRoutes);
  app.use('/api/destinations', destinationsRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/seo', seoRoutes);
  app.use('/api/tiqets', tiqetsRoutes);
  app.use('/api/media', mediaRoutes);
  app.use('/api/newsletter', newsletterRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/webhooks', webhooksRoutes);
  app.use('/api/system', systemRoutes);
}
```

---

## יום 10: בדיקות ואינטגרציה

### משימה 10.1: עדכון server/index.ts
```typescript
// server/index.ts
import { registerRoutes } from './routes';

// ... existing setup

// Register all routes
registerRoutes(app);

// ... rest of server setup
```

### משימה 10.2: מחיקת routes.ts הישן
```bash
# לאחר שכל הroutes עובדים
git rm server/routes.ts
```

### משימה 10.3: בדיקות regression
```bash
npm run test
npm run typecheck
# Manual testing of all endpoints
```

**Checklist שבוע 2:**
- [ ] מיפוי כל הroutes
- [ ] יצירת מבנה תיקיות
- [ ] פיצול לקבצים נפרדים
- [ ] בדיקה שכל endpoint עובד
- [ ] מחיקת routes.ts הישן
- [ ] עדכון imports בכל הקוד

---

# 🗓️ שבוע 3: Tests + Cleanup

## יום 11-12: הוספת Tests

### משימה 11.1: Unit Tests לroutes החדשים
```typescript
// tests/routes/auth.routes.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../server';

describe('Auth Routes', () => {
  describe('POST /api/auth/login', () => {
    it('should return 400 for missing credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});
      expect(res.status).toBe(400);
    });

    it('should return 401 for invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'wrong' });
      expect(res.status).toBe(401);
    });

    it('should return 200 for valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@travi.com', password: 'correct' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
    });
  });
});
```

### משימה 11.2: Integration Tests
```typescript
// tests/integration/content-flow.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('Content Creation Flow', () => {
  let authToken: string;
  let contentId: number;

  beforeAll(async () => {
    // Login and get token
  });

  it('should create content', async () => {
    // Test content creation
  });

  it('should update content', async () => {
    // Test content update
  });

  it('should publish content', async () => {
    // Test publishing
  });

  afterAll(async () => {
    // Cleanup
  });
});
```

### משימה 11.3: עדכון coverage threshold
```json
// package.json
{
  "jest": {
    "coverageThreshold": {
      "global": {
        "branches": 30,
        "functions": 30,
        "lines": 30,
        "statements": 30
      }
    }
  }
}
```

---

## יום 13: ניקוי Console.logs

### משימה 13.1: מציאת כל console.log
```bash
# Script למציאת כל console.log
grep -rn "console.log" server/ --include="*.ts" > console-logs.txt
```

### משימה 13.2: החלפה ב-logger
```typescript
// לפני:
console.log('User logged in:', userId);

// אחרי:
import { logger } from './lib/logger';
logger.info('User logged in', { userId });
```

### משימה 13.3: יצירת ESLint rule
```javascript
// .eslintrc.cjs
module.exports = {
  rules: {
    'no-console': ['error', { allow: ['warn', 'error'] }]
  }
};
```

---

## יום 14: ניקוי TODO/FIXME

### משימה 14.1: מציאת כל TODO/FIXME
```bash
grep -rn "TODO\|FIXME" server/ client/ --include="*.ts" --include="*.tsx" > todos.txt
```

### משימה 14.2: קטגוריזציה
```
TODO Categories:
1. Critical (must fix) - 15
2. Important (should fix) - 20
3. Nice to have - 10
4. Remove (not relevant) - 6
```

### משימה 14.3: טיפול או הסרה
```typescript
// לפני:
// TODO: add validation
function processData(data) { ... }

// אחרי:
function processData(data) {
  if (!data) throw new Error('Data is required');
  // ... rest of logic
}
```

---

## יום 15: ניקוי Placeholder Code

### משימה 15.1: מציאת placeholders
```bash
grep -rn "Promise.resolve()" server/ --include="*.ts" > placeholders.txt
grep -rn "// placeholder" server/ --include="*.ts" >> placeholders.txt
grep -rn "throw new Error('Not implemented')" server/ --include="*.ts" >> placeholders.txt
```

### משימה 15.2: קטגוריזציה
```
Placeholder Categories:
1. Implement - 80 files
2. Remove (not needed) - 50 files
3. Mark as TODO for later - 26 files
```

### משימה 15.3: טיפול
```typescript
// Option 1: Implement
async function getAnalytics() {
  // Was: return Promise.resolve([]);
  const data = await db.select().from(analytics);
  return data;
}

// Option 2: Remove if not used
// Delete entire file/function

// Option 3: Mark clearly
async function futureFeature() {
  throw new Error('Feature not yet implemented - planned for v2');
}
```

**Checklist שבוע 3:**
- [ ] הוספת tests לroutes חדשים
- [ ] העלאת coverage ל-30%+
- [ ] הסרת console.logs
- [ ] טיפול ב-TODO/FIXME
- [ ] ניקוי placeholder code

---

# 🗓️ שבוע 4: Security + Polish

## יום 16-17: Security Hardening

### משימה 16.1: בדיקת OWASP Top 10
```
Checklist:
- [ ] A01 Broken Access Control - RBAC check
- [ ] A02 Cryptographic Failures - encryption check
- [ ] A03 Injection - input validation
- [ ] A04 Insecure Design - architecture review
- [ ] A05 Security Misconfiguration - headers check
- [ ] A06 Vulnerable Components - npm audit
- [ ] A07 Auth Failures - session management
- [ ] A08 Software Integrity - CI/CD security
- [ ] A09 Logging Failures - audit logs
- [ ] A10 SSRF - external requests
```

### משימה 16.2: הוספת Security Headers
```typescript
// server/middleware/security-headers.ts
import helmet from 'helmet';

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
});
```

### משימה 16.3: Rate Limiting Review
```typescript
// בדיקה שכל endpoint רגיש מוגן
const sensitiveEndpoints = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/ai/*',
  '/api/admin/*',
];
```

---

## יום 18: Feature Flags Cleanup

### משימה 18.1: מיפוי כל הflags
```bash
grep -rn "ENABLE_\|feature.*flag\|isEnabled" server/ client/ --include="*.ts" --include="*.tsx" > flags.txt
```

### משימה 18.2: קטגוריזציה
```
Flag Categories:
1. Keep (production ready) - 100
2. Enable by default - 200
3. Remove (obsolete) - 150
4. Review needed - 53
```

### משימה 18.3: יצירת Feature Flag Registry
```typescript
// server/config/feature-flags.ts
export const featureFlags = {
  // Core features - always on
  ENABLE_AUTH: true,
  ENABLE_CONTENT_MANAGEMENT: true,

  // AI features - on by default
  ENABLE_AI_GENERATION: true,
  ENABLE_AI_TRANSLATION: true,

  // Beta features - off by default
  ENABLE_LIVE_EDITING: false,
  ENABLE_ADVANCED_ANALYTICS: false,

  // Deprecated - to remove
  // ENABLE_OLD_EDITOR: false, // REMOVED
};
```

---

## יום 19: Documentation Cleanup

### משימה 19.1: מחיקת MD files מיותרים
```bash
# Run deletion script
rm -rf docs/audit/
rm -rf docs/product/
rm -rf docs/data/
rm -rf docs/adr/
rm -rf docs/architecture/decisions/
rm -f docs/PHASE*.md
rm -f docs/UI_*.md
rm -f docs/ai-*.md
rm -f AI_WRITERS_IMPLEMENTATION.md
rm -f IMPLEMENTATION_*.md
rm -f POLICY_ENGINE_CONSOLIDATION.md
rm -f component-*.md
rm -f design-system.md
rm -f design_guidelines.md
rm -f homepage-visual-composition.md
rm -f visual-foundations.md
rm -f replit.md
```

### משימה 19.2: איחוד docs לקבצים בודדים
```bash
# Structure after cleanup:
docs/
├── README.md           # Overview
├── SETUP.md           # Getting started (merged)
├── ARCHITECTURE.md    # System design (merged)
├── API.md             # API reference
├── DEPLOYMENT.md      # Deploy guide (merged)
├── SECURITY.md        # Security guidelines
├── CONTRIBUTING.md    # Contribution guide
├── CHANGELOG.md       # Version history
└── INTEGRATIONS.md    # Third-party (merged)
```

---

## יום 20: Performance Review

### משימה 20.1: Bundle Analysis
```bash
npm run build -- --analyze
# Review bundle size
# Target: < 500KB initial
```

### משימה 20.2: Lighthouse Audit
```
Run Lighthouse on:
- [ ] Homepage
- [ ] Destination page
- [ ] Attraction detail
- [ ] Admin dashboard

Targets:
- Performance: > 80
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 90
```

### משימה 20.3: Database Query Optimization
```sql
-- Run EXPLAIN ANALYZE on slow queries
-- Identify missing indexes
-- Optimize N+1 queries
```

**Checklist שבוע 4:**
- [ ] Security audit complete
- [ ] Rate limiting verified
- [ ] Feature flags cleaned
- [ ] Documentation organized
- [ ] Performance optimized

---

# 🗓️ שבוע 5-6: QA + Launch Prep

## יום 21-23: QA Testing

### משימה 21.1: Regression Testing
```
Test all critical flows:
- [ ] User registration
- [ ] User login/logout
- [ ] Content creation
- [ ] Content publishing
- [ ] AI generation
- [ ] Translation
- [ ] Media upload
- [ ] Newsletter signup
- [ ] Search functionality
- [ ] Admin operations
```

### משימה 21.2: Cross-browser Testing
```
Browsers:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Chrome
- [ ] Mobile Safari
```

### משימה 21.3: Accessibility Testing
```
Tools:
- axe DevTools
- WAVE
- Screen reader testing
- Keyboard-only navigation
```

---

## יום 24-25: Staging Environment

### משימה 24.1: Setup Staging
```
Staging Environment:
- URL: staging.travi.com
- Database: Separate staging DB
- Redis: Separate staging instance
- S3: Separate staging bucket
```

### משימה 24.2: Data Seeding
```typescript
// scripts/seed-staging.ts
async function seedStaging() {
  // Create test users
  // Create sample destinations
  // Create sample content
  // Create test data
}
```

---

## יום 26-27: Monitoring Setup

### משימה 26.1: Error Tracking
```typescript
// Setup Sentry or similar
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

### משימה 26.2: Uptime Monitoring
```
Setup monitoring for:
- [ ] Homepage availability
- [ ] API health endpoint
- [ ] Database connectivity
- [ ] Redis connectivity
```

### משימה 26.3: Alerting
```
Alert channels:
- [ ] Slack notifications
- [ ] Email alerts
- [ ] PagerDuty (optional)
```

---

## יום 28-30: Launch Checklist

### משימה 28.1: Final Checklist
```
Pre-Launch Checklist:

Infrastructure:
- [ ] CI/CD working
- [ ] Staging tested
- [ ] Production environment ready
- [ ] DNS configured
- [ ] SSL certificate valid
- [ ] CDN configured

Code Quality:
- [ ] routes.ts split complete
- [ ] Test coverage > 30%
- [ ] No console.logs
- [ ] No TODO/FIXME
- [ ] No placeholder code

Security:
- [ ] npm audit clean
- [ ] Security headers set
- [ ] Rate limiting active
- [ ] Auth tested
- [ ] CORS configured

Performance:
- [ ] Lighthouse > 80
- [ ] Bundle < 500KB
- [ ] DB indexes added
- [ ] Caching working

Documentation:
- [ ] README updated
- [ ] API docs complete
- [ ] Runbook ready
```

### משימה 28.2: Rollback Plan
```
Rollback Procedure:
1. Identify issue
2. Notify team
3. git revert <commit>
4. Deploy previous version
5. Verify rollback
6. Post-mortem
```

### משימה 28.3: Go-Live Plan
```
Launch Day:
- 09:00 - Final staging check
- 10:00 - Deploy to production
- 10:15 - Smoke tests
- 10:30 - Monitor metrics
- 11:00 - Announce launch
- All day - Monitor and respond
```

---

# 📊 סיכום תכנית העבודה

## Timeline

```
Week 1: CI/CD + Database
├── Day 1: CI workflow
├── Day 2: Security scanning
├── Day 3: DB indexes
├── Day 4: Branch protection
└── Day 5: CD pipeline

Week 2: Split routes.ts
├── Day 6-7: Planning
├── Day 8-9: Implementation
└── Day 10: Testing

Week 3: Tests + Cleanup
├── Day 11-12: Add tests
├── Day 13: Remove console.logs
├── Day 14: Fix TODOs
└── Day 15: Clean placeholders

Week 4: Security + Polish
├── Day 16-17: Security
├── Day 18: Feature flags
├── Day 19: Documentation
└── Day 20: Performance

Week 5-6: QA + Launch
├── Day 21-23: QA testing
├── Day 24-25: Staging
├── Day 26-27: Monitoring
└── Day 28-30: Launch prep
```

## Resources Needed

| Resource | Amount | Purpose |
|----------|--------|---------|
| Backend Developer | 1 | routes.ts split, tests |
| DevOps | 1 | CI/CD, monitoring |
| QA | 1 | Testing, validation |
| Frontend Developer | 0.5 | Client fixes |

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| routes.ts split breaks APIs | Comprehensive testing |
| CI/CD setup issues | Start simple, iterate |
| Performance regression | Lighthouse monitoring |
| Security vulnerabilities | Regular scanning |

---

**נוצר ע"י:** QA Audit System
**תאריך:** 2026-01-16
**גרסה:** 1.0
