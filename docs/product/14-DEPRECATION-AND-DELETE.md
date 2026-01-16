# Deprecation and Delete List

**סטטוס:** מחייב
**תאריך:** 2026-01-01
**גרסה:** 1.0

---

## 1. סיכום

| קטגוריה | כמות |
|---------|------|
| Routes למחיקה | 12 |
| Components למחיקה | 8 |
| API Endpoints למחיקה | 5 |
| DB Tables ל-Read-Only | 2 |
| Files למחיקה | 15+ |

---

## 2. Routes למחיקה

### 2.1 Duplicate Routes (מיידי)

| Route למחיקה | Route שנשאר | Action |
|--------------|-------------|--------|
| `/privacy-policy` | `/privacy` | 301 redirect → delete after 90 days |
| `/terms-conditions` | `/terms` | 301 redirect → delete after 90 days |
| `/cookies` | `/cookie-policy` | 301 redirect → delete after 90 days |

### 2.2 Merged Routes (Phase 1)

| Route למחיקה | מתמזג ל- | Action |
|--------------|----------|--------|
| `/admin/site-settings` | `/admin/system/settings` | 301 redirect → delete |
| `/admin/homepage-promotions` | `/admin/content/pages/homepage` | 301 redirect → delete |
| `/admin/districts/listings` | `/admin/content/districts` | 301 redirect → delete |
| `/admin/districts/management` | `/admin/content/districts` | 301 redirect → delete |
| `/admin/off-plan/listings` | `/admin/content/real-estate/off-plan` | 301 redirect → delete |
| `/admin/off-plan/management` | `/admin/content/real-estate` | 301 redirect → delete |
| `/admin/landing-pages/listings` | `/admin/content/pages/landing` | 301 redirect → delete |
| `/admin/landing-pages/management` | `/admin/content/pages/landing` | 301 redirect → delete |
| `/admin/scheduling` | `/admin/content/calendar` | 301 redirect → delete |

### 2.3 Internal-Only Routes (Hide from Nav)

| Route | סיבה | Action |
|-------|------|--------|
| `/admin/search-debug` | Dev tool | Remove from nav, keep accessible |
| `/admin/console` | Dev tool | Remove from nav, keep accessible |
| `/admin/entity-merge` | Internal tool | Remove from nav, keep accessible |
| `/admin/intelligence` | Ops tool | Remove from nav, keep accessible |

### 2.4 Obsolete Routes (Delete)

| Route | סיבה | תאריך מחיקה |
|-------|------|-------------|
| `/coming-soon` | לא רלוונטי | 2026-02-01 |

---

## 3. UI Components למחיקה

### 3.1 Unused Components

| Component | Location | סיבה |
|-----------|----------|------|
| `OldHomepageEditor` | `client/src/components/` | Replaced |
| `LegacyContentList` | `client/src/components/` | Replaced |
| `DeprecatedMediaPicker` | `client/src/components/` | Replaced |

**Action:** Run component usage analysis, delete unused.

### 3.2 Duplicate Components

| Component למחיקה | נשאר | Action |
|-----------------|------|--------|
| `ContentList` (old) | `ContentList` (new) | Migrate, delete old |
| `ImageUploader` (v1) | `ImageUploader` (v2) | Migrate, delete old |

---

## 4. API Endpoints למחיקה

### 4.1 Deprecated Endpoints

| Endpoint | סיבה | Replacement | תאריך מחיקה |
|----------|------|-------------|-------------|
| `POST /api/admin/content/quick-publish` | Security risk | Use workflow | 2026-02-15 |
| `GET /api/admin/settings/legacy` | Replaced | `/api/admin/settings` | 2026-02-15 |

### 4.2 Merged Endpoints

| Endpoint למחיקה | מתמזג ל- | Action |
|-----------------|----------|--------|
| `/api/admin/site-settings` | `/api/admin/settings` | Redirect → delete |

---

## 5. Database Tables

### 5.1 Tables ל-Read-Only

| Table | סיבה | Action |
|-------|------|--------|
| `old_content_versions` | Legacy data | Read-only, archive |
| `deprecated_analytics` | Replaced | Read-only, archive |

**Note:** לא מוחקים tables עם data. רק מעבירים ל-read-only.

### 5.2 Columns למחיקה

| Table | Column | סיבה | Action |
|-------|--------|------|--------|
| `contents` | `legacy_id` | Migration complete | Drop after verification |
| `users` | `old_password_hash` | Moved to OTP | Drop after verification |

---

## 6. Files למחיקה

### 6.1 Page Files

```
client/src/pages/
├── coming-soon.tsx                    # DELETE
├── admin/
│   ├── site-settings.tsx              # DELETE (merged)
│   ├── homepage-promotions.tsx        # DELETE (merged)
│   ├── districts-management.tsx       # DELETE (merged)
│   ├── off-plan-management.tsx        # DELETE (merged)
│   └── landing-pages-management.tsx   # DELETE (merged)
```

### 6.2 Component Files

```
client/src/components/
├── legacy/                            # DELETE entire folder
│   ├── OldEditor.tsx
│   ├── OldList.tsx
│   └── OldForm.tsx
├── deprecated/                        # DELETE entire folder
│   └── ...
```

### 6.3 Server Files

```
server/
├── routes/
│   └── legacy-routes.ts               # DELETE if exists
├── services/
│   └── old-content-service.ts         # DELETE if unused
```

---

## 7. Feature Flags למחיקה

| Flag | מצב נוכחי | Action |
|------|-----------|--------|
| `ENABLE_OLD_EDITOR` | OFF | Remove flag, remove old code |
| `LEGACY_AUTH_ENABLED` | OFF | Remove flag, remove old code |
| `OLD_HOMEPAGE` | OFF | Remove flag, remove old code |

---

## 8. Environment Variables למחיקה

| Variable | סיבה | Action |
|----------|------|--------|
| `OLD_API_KEY` | Unused | Remove from .env.example |
| `LEGACY_DB_URL` | Migration complete | Remove |
| `DEPRECATED_SERVICE_URL` | Service shutdown | Remove |

---

## 9. NPM Dependencies למחיקה

| Package | סיבה | Size Saved |
|---------|------|------------|
| (Run `depcheck` to identify) | Unused | TBD |

**Action:** Run `npx depcheck` and remove unused dependencies.

---

## 10. Deprecation Timeline

### Phase 1: Immediate (Week 1)

| Task | Owner |
|------|-------|
| Add 301 redirects for duplicate routes | FRONTEND-AGENT |
| Hide internal routes from nav | FRONTEND-AGENT |
| Mark deprecated endpoints | BACKEND-AGENT |

### Phase 2: Short-term (Week 2-3)

| Task | Owner |
|------|-------|
| Migrate route structure | FRONTEND-AGENT |
| Update API consumers | BACKEND-AGENT |
| Update documentation | CONTENT-AGENT |

### Phase 3: Cleanup (Week 4)

| Task | Owner |
|------|-------|
| Delete deprecated files | SYSTEM-AGENT |
| Remove old components | FRONTEND-AGENT |
| Drop deprecated DB columns | BACKEND-AGENT |
| Remove unused dependencies | SYSTEM-AGENT |

### Phase 4: Verification (Week 5)

| Task | Owner |
|------|-------|
| Verify no broken references | QA-AGENT |
| Update tests | QA-AGENT |
| Final documentation update | CONTENT-AGENT |

---

## 11. Deprecation Process

### 11.1 Before Deprecation

```
1. Verify no active usage (logs, analytics)
2. Identify all consumers
3. Create redirect/migration plan
4. Document in this file
5. Set deprecation date
```

### 11.2 Deprecation Steps

```
1. Add deprecation warning (console, docs)
2. Add redirect if applicable
3. Update documentation
4. Notify affected users/systems
5. Wait deprecation period (30-90 days)
6. Delete
```

### 11.3 After Deletion

```
1. Remove from codebase
2. Update tests
3. Verify no 404s
4. Update this document
5. Archive in git history
```

---

## 12. Safety Checks

### 12.1 Before Deleting Route

- [ ] No internal links to route
- [ ] No external backlinks (check Search Console)
- [ ] Redirect in place
- [ ] Analytics shows < 10 visits/month
- [ ] No hardcoded references

### 12.2 Before Deleting Component

- [ ] Not imported anywhere
- [ ] No dynamic imports
- [ ] Not in Storybook
- [ ] Tests updated

### 12.3 Before Deleting API

- [ ] No frontend consumers
- [ ] No webhook consumers
- [ ] No external integrations
- [ ] Audit log reviewed

### 12.4 Before Deleting DB Column

- [ ] Not referenced in code
- [ ] Not in any queries
- [ ] Data backed up
- [ ] Rollback plan ready

---

## 13. Rollback Plan

If deletion causes issues:

### 13.1 Route Rollback

```bash
# Restore route in App.tsx
# Remove redirect
# Redeploy
```

### 13.2 Component Rollback

```bash
# Git restore component file
# Update imports
# Redeploy
```

### 13.3 API Rollback

```bash
# Git restore endpoint
# Redeploy
```

### 13.4 DB Rollback

```bash
# Restore from backup
# Or: Re-add column with migration
```

---

## 14. Tracking

| Item | Status | Deleted Date | Verified |
|------|--------|--------------|----------|
| `/privacy-policy` redirect | Pending | - | - |
| `/terms-conditions` redirect | Pending | - | - |
| `/cookies` redirect | Pending | - | - |
| `/admin/site-settings` merge | Pending | - | - |
| `/coming-soon` delete | Pending | - | - |

**Update this table as items are processed.**
