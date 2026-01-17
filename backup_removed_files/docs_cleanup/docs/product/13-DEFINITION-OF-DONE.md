# Definition of Done (DoD)

**סטטוס:** מחייב
**תאריך:** 2026-01-01
**גרסה:** 1.0

---

## 1. מטרה

מסמך זה מגדיר מתי Feature/Task נחשב "מוכן".
אם לא עומד בכל הקריטריונים - לא מוכן.
אין יוצאים מהכלל.

---

## 2. DoD לפי סוג משימה

### 2.1 Bug Fix

| קריטריון | חובה | בדיקה |
|----------|------|-------|
| Bug מתוקן | ✅ | בדיקה ידנית |
| Test נוסף למניעת רגרסיה | ✅ | Test עובר |
| לא נוצרו bugs חדשים | ✅ | CI עובר |
| Audit log מתעד שינוי | ✅ | Log קיים |
| תיעוד בקוד אם רלוונטי | ⭕ | Code review |

---

### 2.2 Feature (Small - < 1 day)

| קריטריון | חובה | בדיקה |
|----------|------|-------|
| Functionality עובד | ✅ | בדיקה ידנית |
| UI responsive | ✅ | Mobile + Desktop |
| TypeScript clean | ✅ | No TS errors |
| ESLint clean | ✅ | No lint errors |
| Basic tests | ✅ | Test עובר |
| Permissions checked | ✅ | Role-based access |
| Audit logging | ✅ | אם CRUD |

---

### 2.3 Feature (Medium - 1-3 days)

כל מה שב-Small, ועוד:

| קריטריון | חובה | בדיקה |
|----------|------|-------|
| Unit tests (70%+) | ✅ | Coverage report |
| Integration test | ✅ | E2E scenario |
| Error handling | ✅ | Edge cases covered |
| Loading states | ✅ | Skeleton/spinner |
| Empty states | ✅ | No data UI |
| API documented | ✅ | In code/docs |
| Rollback plan | ✅ | Documented |

---

### 2.4 Feature (Large - > 3 days)

כל מה שב-Medium, ועוד:

| קריטריון | חובה | בדיקה |
|----------|------|-------|
| Unit tests (80%+) | ✅ | Coverage report |
| E2E tests | ✅ | Full flow |
| Performance tested | ✅ | < 2s load |
| Security review | ✅ | No vulnerabilities |
| Feature flag | ✅ | If needed |
| Migration tested | ✅ | If DB changes |
| Documentation | ✅ | Full docs |
| Training material | ⭕ | If user-facing |

---

### 2.5 API Endpoint

| קריטריון | חובה | בדיקה |
|----------|------|-------|
| Returns correct data | ✅ | Test |
| Returns correct status codes | ✅ | 200, 400, 401, 403, 404, 500 |
| Input validation | ✅ | Zod schema |
| Authentication | ✅ | If required |
| Authorization | ✅ | Permission check |
| Rate limiting | ✅ | If public |
| Audit logging | ✅ | If mutating |
| Error messages | ✅ | User-friendly |
| TypeScript types | ✅ | Request/Response typed |
| Documented | ✅ | OpenAPI or inline |

---

### 2.6 UI Component

| קריטריון | חובה | בדיקה |
|----------|------|-------|
| Renders correctly | ✅ | Visual check |
| Responsive | ✅ | Mobile, Tablet, Desktop |
| Accessible | ✅ | ARIA, keyboard nav |
| Loading state | ✅ | Skeleton/spinner |
| Error state | ✅ | Error message |
| Empty state | ✅ | No data message |
| Props typed | ✅ | TypeScript |
| Storybook story | ⭕ | If reusable |
| Unit test | ✅ | Render test |

---

### 2.7 Database Change

| קריטריון | חובה | בדיקה |
|----------|------|-------|
| Migration file created | ✅ | Drizzle migration |
| Migration tested locally | ✅ | Works on dev DB |
| Rollback tested | ✅ | Down migration |
| Schema.ts updated | ✅ | Types match |
| Indexes added | ✅ | If needed for queries |
| Data preserved | ✅ | No data loss |
| Backup taken | ✅ | Before production |
| Documented | ✅ | In migration file |

---

### 2.8 Content Type

| קריטריון | חובה | בדיקה |
|----------|------|-------|
| Schema defined | ✅ | In schema.ts |
| CRUD API | ✅ | All endpoints |
| Admin UI | ✅ | List + Editor |
| Public page | ✅ | If displayed |
| SEO fields | ✅ | Title, description |
| Translations support | ✅ | Multi-language |
| Audit logging | ✅ | All changes |
| Permissions | ✅ | Role-based |
| Search indexed | ✅ | Searchable |

---

## 3. Quality Gates

### 3.1 Code Quality Gate

```
MUST PASS BEFORE MERGE:

✅ TypeScript: 0 errors
✅ ESLint: 0 errors
✅ Tests: All passing
✅ Coverage: >= 70%
✅ Build: Successful
✅ Bundle size: No significant increase
```

### 3.2 Security Gate

```
MUST PASS BEFORE DEPLOY:

✅ No hardcoded secrets
✅ No exposed API keys
✅ Authentication on protected routes
✅ Authorization checked
✅ Input validated
✅ Output sanitized
✅ SQL injection prevented (ORM)
✅ XSS prevented
```

### 3.3 Performance Gate

```
MUST PASS:

✅ Page load: < 3s (3G)
✅ Time to Interactive: < 5s
✅ API response: < 500ms (p95)
✅ Bundle size: < 500KB initial
✅ Images: Optimized
✅ No memory leaks
```

### 3.4 Accessibility Gate

```
MUST PASS:

✅ Keyboard navigable
✅ Screen reader compatible
✅ Color contrast: 4.5:1
✅ Focus indicators
✅ Alt text on images
✅ Form labels
```

---

## 4. Feature Flag Requirements

### 4.1 When Required

| Scenario | Feature Flag Required? |
|----------|----------------------|
| New UI component | ❌ No |
| Bug fix | ❌ No |
| New admin feature | ⭕ Optional |
| New public feature | ✅ Yes |
| Breaking change | ✅ Yes |
| Large refactor | ✅ Yes |
| Risky change | ✅ Yes |

### 4.2 Feature Flag DoD

| קריטריון | חובה |
|----------|------|
| Flag defined in config | ✅ |
| Default: OFF | ✅ |
| Graceful degradation | ✅ |
| Admin toggle exists | ✅ |
| Removal planned | ✅ |

---

## 5. Rollback Plan Requirements

### 5.1 When Required

| Change Type | Rollback Plan Required? |
|-------------|------------------------|
| Bug fix | ❌ No |
| Small feature | ❌ No |
| Medium feature | ✅ Yes |
| Large feature | ✅ Yes |
| Database change | ✅ Yes |
| API breaking change | ✅ Yes |

### 5.2 Rollback Plan DoD

| קריטריון | חובה |
|----------|------|
| Steps documented | ✅ |
| Tested in staging | ✅ |
| Time estimate | ✅ |
| Data recovery plan | ✅ |
| Responsible person | ✅ |

---

## 6. Audit Requirements

### 6.1 When Audit Logging Required

| Action | Audit Log Required? |
|--------|-------------------|
| Create content | ✅ Yes |
| Update content | ✅ Yes |
| Delete content | ✅ Yes |
| Status change | ✅ Yes |
| User action | ✅ Yes |
| Setting change | ✅ Yes |
| Login/logout | ✅ Yes |
| View content | ❌ No |
| API read | ❌ No |

### 6.2 Audit Log DoD

| קריטריון | חובה |
|----------|------|
| User ID captured | ✅ |
| Action type | ✅ |
| Resource ID | ✅ |
| Timestamp | ✅ |
| Old value (if update) | ✅ |
| New value (if update) | ✅ |
| IP address | ✅ |

---

## 7. Documentation Requirements

### 7.1 When Required

| Change | Documentation Required? |
|--------|------------------------|
| New API endpoint | ✅ Yes |
| API change | ✅ Yes |
| New feature | ✅ Yes |
| New component | ⭕ If reusable |
| Bug fix | ❌ No |
| Refactor | ⭕ If significant |

### 7.2 Documentation DoD

| Type | Where | What |
|------|-------|------|
| API | Inline comments | Request/Response |
| Feature | docs/features/ | User guide |
| Component | Storybook | Props, examples |
| Architecture | docs/adr/ | Decision record |

---

## 8. Testing Requirements

### 8.1 Test Coverage by Type

| Code Type | Minimum Coverage |
|-----------|-----------------|
| API routes | 80% |
| Services | 70% |
| Utilities | 90% |
| Components | 60% |
| Hooks | 70% |

### 8.2 Test Types Required

| Feature Size | Unit | Integration | E2E |
|--------------|------|-------------|-----|
| Small | ✅ | ❌ | ❌ |
| Medium | ✅ | ✅ | ❌ |
| Large | ✅ | ✅ | ✅ |

---

## 9. Review Requirements

### 9.1 Who Reviews

| Change Type | Reviewer |
|-------------|----------|
| Bug fix | Any developer |
| Small feature | Any developer |
| Medium feature | Senior developer |
| Large feature | Tech Lead |
| Security-related | Security Lead |
| Database change | DBA/Tech Lead |

### 9.2 Review Checklist

```
□ Code is readable
□ No obvious bugs
□ Tests exist and pass
□ No security issues
□ Performance acceptable
□ Documentation updated
□ DoD criteria met
```

---

## 10. Release Checklist

Before any release:

```
PRE-RELEASE:
□ All DoD criteria met
□ Tests passing
□ Code reviewed
□ Staging tested
□ Feature flags configured
□ Rollback plan ready
□ Monitoring alerts set

POST-RELEASE:
□ Smoke test passed
□ No error spikes
□ Performance stable
□ User feedback monitored
```

---

## 11. Exceptions

### 11.1 Hotfix Exception

For critical production issues:

| Normally Required | Hotfix Allowed |
|-------------------|----------------|
| Full tests | Minimum tests |
| Documentation | Post-fix docs |
| Code review | Post-fix review |
| Staging test | Direct to prod |

**Condition:** Must be reverted/properly fixed within 24 hours.

### 11.2 Exception Process

1. Document why exception needed
2. Get Tech Lead approval
3. Create follow-up ticket
4. Close gap within 24 hours

---

## 12. Enforcement

### 12.1 CI/CD Gates

```yaml
# Automated checks
- TypeScript compilation
- ESLint
- Test suite
- Coverage threshold
- Build success
- Bundle size check
```

### 12.2 PR Template

```markdown
## DoD Checklist

- [ ] Functionality works
- [ ] Tests added/updated
- [ ] TypeScript clean
- [ ] ESLint clean
- [ ] Responsive
- [ ] Permissions checked
- [ ] Audit logging (if CRUD)
- [ ] Documentation updated (if needed)
```

### 12.3 Merge Blocking

PRs cannot be merged if:
- CI fails
- No approvals
- DoD checklist incomplete
