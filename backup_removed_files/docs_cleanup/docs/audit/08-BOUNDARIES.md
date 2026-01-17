# Boundaries - הגדרת גבולות

**תאריך ביקורת:** 2026-01-01
**גרסה:** 1.0

---

## 1. מה לא לגעת בו

### 1.1 קוד קריטי - ללא שינוי ללא אישור

| קובץ/תחום | סיבה | מי מאשר |
|-----------|------|---------|
| `/shared/schema.ts` | DB schema - שינוי שובר הכל | Tech Lead + DBA |
| `/server/auth.ts` | Authentication - אבטחה | Security + Tech Lead |
| `/server/security.ts` | Security middleware | Security |
| `/server/access-control/*` | Permissions | Security + Tech Lead |
| `/drizzle.config.ts` | DB connection | DevOps |
| `/migrations/*` | DB migrations | DBA |

### 1.2 הגדרות Production

| קובץ | סיבה | מי מאשר |
|------|------|---------|
| `.env.production` | Secrets | DevOps |
| `/server/index.ts` | Server bootstrap | Tech Lead |
| CI/CD workflows | Deployment | DevOps |

### 1.3 Third-party Integrations

| Integration | סיבה | מי מאשר |
|-------------|------|---------|
| OpenAI API calls | Cost + reliability | Tech Lead |
| Payment integrations | Financial | Finance + Security |
| Email service | Deliverability | Marketing + Tech |

---

## 2. אזורי סכנה

### 2.1 קוד עם Side Effects

```
⚠️ DANGER ZONES - Require extra care:

/server/routes.ts
├── 15,000+ lines
├── All API endpoints
└── Change can break anything

/shared/schema.ts
├── 6,700+ lines
├── All DB definitions
└── Migration required for changes

/server/storage.ts
├── File upload logic
├── Path manipulation
└── Security sensitive
```

### 2.2 פעולות בלתי הפיכות

| פעולה | מה עושה | הגנה נדרשת |
|-------|---------|-----------|
| `DROP TABLE` | מוחק טבלה | **אסור ב-production** |
| `DELETE FROM` without WHERE | מוחק הכל | **חסום ב-ORM** |
| `TRUNCATE` | מרוקן טבלה | **Admin + Backup first** |
| Force push to main | משכתב היסטוריה | **חסום ב-Git** |
| Purge user | מחיקה לצמיתות | **Dual approval** |

### 2.3 שינויים שדורשים Migration

| שינוי | דורש | תהליך |
|-------|------|-------|
| שדה חדש בschema | Migration | Generate + Review + Apply |
| שינוי סוג שדה | Migration + Data | Plan + Backup + Migrate |
| מחיקת שדה | Migration | Verify not used + Migrate |
| שינוי relation | Migration + Code | Plan carefully |

---

## 3. תחומי אחריות

### 3.1 מה AI יכול לעשות עצמאית

```
✅ SAFE FOR AI:

1. Code in feature branches
   ├── New components
   ├── Bug fixes
   ├── Refactoring
   └── Tests

2. Documentation
   ├── Comments
   ├── README updates
   ├── API docs
   └── Guides

3. Non-destructive operations
   ├── Read data
   ├── Generate content drafts
   ├── Run tests
   └── Lint/format
```

### 3.2 מה AI צריך אישור לעשות

```
⚠️ REQUIRES APPROVAL:

1. Schema changes
   └── Any change to schema.ts

2. Security changes
   ├── Auth logic
   ├── Permissions
   └── Middleware

3. Third-party integrations
   ├── API keys
   ├── External services
   └── Webhooks

4. Data operations
   ├── Migrations
   ├── Bulk updates
   └── Deletions
```

### 3.3 מה AI לא עושה בכלל

```
🚫 NEVER BY AI:

1. Production deployment
2. Security configurations
3. Financial operations
4. User data access (PII)
5. Credential management
6. Compliance decisions
```

---

## 4. Protected Routes

### 4.1 API Endpoints שלא לשנות

| Endpoint | סיבה | Owner |
|----------|------|-------|
| `/api/auth/*` | Security | Security team |
| `/api/admin/users/*` | User management | Security |
| `/api/totp/*` | 2FA | Security |
| `/api/webhooks/*` | External integrations | DevOps |
| `/api/export/*` | Data export | Compliance |

### 4.2 Frontend Routes שלא לשנות

| Route | סיבה | Owner |
|-------|------|-------|
| `/login` | Auth flow | Security |
| `/admin/security` | Security settings | Security |
| `/admin/governance/*` | Permissions | Security |

---

## 5. Database Rules

### 5.1 טבלאות Protected

| טבלה | פעולה מותרת | פעולה אסורה |
|------|------------|-------------|
| `users` | Read, Update specific fields | Delete, Bulk update |
| `sessions` | Read | Manual modification |
| `audit_logs` | Insert, Read | Update, Delete |
| `two_factor_secrets` | System only | Any direct access |

### 5.2 כללי Data

```
1. NEVER delete user data without:
   ├── User request (GDPR)
   ├── Legal requirement
   └── Explicit approval

2. ALWAYS soft delete:
   ├── Set deletedAt
   ├── Keep for 30 days
   └── Then purge (with approval)

3. NEVER expose:
   ├── Passwords (hashed anyway)
   ├── API keys
   ├── Personal data in logs
   └── Session tokens
```

---

## 6. Git Rules

### 6.1 Branch Protection

| Branch | Rules |
|--------|-------|
| `main` | Protected, require PR, require review, no force push |
| `staging` | Protected, require PR |
| `feature/*` | Open for development |
| `hotfix/*` | Require senior review |

### 6.2 Commit Rules

```
✅ DO:
├── Small, focused commits
├── Descriptive messages
├── Reference issues/tickets
└── Sign commits (if required)

❌ DON'T:
├── Commit secrets
├── Commit node_modules
├── Commit .env files
├── Force push to shared branches
└── Merge without review
```

---

## 7. Testing Rules

### 7.1 מה חייב Test

| תחום | Coverage נדרש |
|------|--------------|
| Auth functions | 100% |
| Permission checks | 100% |
| Data validation | 100% |
| API endpoints | 80% |
| UI components | 60% |

### 7.2 מה לא לשנות ב-Tests

```
⚠️ Test infrastructure:
├── /tests/setup.ts
├── Test utilities
├── Mocking infrastructure
└── CI test configuration
```

---

## 8. Performance Boundaries

### 8.1 Limits

| Resource | Limit | Action if exceeded |
|----------|-------|-------------------|
| API response time | 2s | Alert + optimize |
| Page load time | 3s | Investigate |
| DB query time | 500ms | Review query |
| Memory per request | 256MB | Optimize |
| File upload | 10MB | Reject |

### 8.2 Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Login | 5 | 1 min |
| API general | 100 | 1 min |
| AI generation | 10 | 1 min |
| Bulk operations | 1 | 1 min |

---

## 9. Compliance Boundaries

### 9.1 GDPR

| Requirement | Implementation |
|-------------|---------------|
| Data access request | User can export |
| Data deletion request | 30 day process |
| Consent | Explicit opt-in |
| Data portability | JSON export |

### 9.2 Security

| Requirement | Implementation |
|-------------|---------------|
| Encryption at rest | DB encrypted |
| Encryption in transit | HTTPS only |
| Access logging | Audit trail |
| Password policy | OTP only (no passwords) |

---

## 10. Communication Boundaries

### 10.1 מה לא לשתף

```
🚫 NEVER SHARE:

1. Credentials
   ├── API keys
   ├── Database passwords
   └── Service tokens

2. User data
   ├── Email addresses
   ├── Personal info
   └── Usage patterns

3. Internal
   ├── Security vulnerabilities (until fixed)
   ├── Unreleased features
   └── Business metrics
```

### 10.2 איפה לא לכתוב קוד/secrets

```
🚫 NEVER PUT SECRETS IN:

├── Git commits
├── Public chat
├── Comments in code
├── Log messages
├── Error messages to users
└── Client-side code
```

---

## 11. סיכום גבולות

### 11.1 Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────┐
│                       BOUNDARIES QUICK REFERENCE                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  🔴 NEVER TOUCH:                                                    │
│  ├── Production secrets                                             │
│  ├── Auth/security code (without approval)                         │
│  ├── Database schema (without migration plan)                       │
│  └── Main branch (without PR)                                       │
│                                                                     │
│  🟡 APPROVAL REQUIRED:                                              │
│  ├── Schema changes                                                 │
│  ├── Third-party integrations                                       │
│  ├── Bulk operations                                                │
│  └── User data access                                               │
│                                                                     │
│  🟢 SAFE TO MODIFY:                                                 │
│  ├── Feature branches                                               │
│  ├── Documentation                                                  │
│  ├── Tests (additions)                                              │
│  └── Non-critical components                                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 11.2 When in Doubt

```
1. Ask before acting
2. Review the boundaries document
3. Check with the code owner
4. Document your reasoning
5. Get approval in writing
```

---

## 12. עדכון גבולות

### 12.1 תהליך שינוי

```
1. Propose change (RFC/Issue)
2. Review by affected parties
3. Approval by Tech Lead + Security
4. Update this document
5. Communicate to team
```

### 12.2 מי מאשר שינוי גבולות

| סוג גבול | מאשר |
|----------|------|
| Security | Security Lead + CTO |
| Technical | Tech Lead |
| Process | PM + Tech Lead |
| Compliance | Legal + Security |
