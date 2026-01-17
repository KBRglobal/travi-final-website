# Product Source of Truth

**סטטוס:** מחייב
**תאריך:** 2026-01-01
**גרסה:** 1.0

---

## מטרת המסמך

מסמך זה הוא **האמת היחידה** לגבי סטטוס כל רכיב במערכת.
כל סוכן AI חייב להיצמד למסמך זה.
אין חריגות. אין "אולי". אין ויכוחים.

---

## 1. קטגוריות סטטוס

| סטטוס | הגדרה | מה מותר |
|-------|--------|---------|
| **OFFICIAL** | Feature רשמי בפרודקשן | שיפורים, bug fixes |
| **BETA** | בבדיקה, לא סופי | שינויים, ניסויים |
| **FROZEN** | קיים אבל לא לגעת | שום דבר |
| **DEPRECATED** | מיועד למחיקה | לא לפתח, להכין מחיקה |
| **DELETED** | נמחק | לא קיים |
| **FORBIDDEN** | אסור לגעת | אסור בכל מצב |

---

## 2. OFFICIAL Features (רשמיים)

### 2.1 Content Management

| Feature | Route | סטטוס | הערות |
|---------|-------|-------|-------|
| Articles CRUD | `/admin/articles/*` | OFFICIAL | Core feature |
| Attractions CRUD | `/admin/attractions/*` | OFFICIAL | Core feature |
| Hotels CRUD | `/admin/hotels/*` | OFFICIAL | Core feature |
| Dining CRUD | `/admin/dining/*` | OFFICIAL | Core feature |
| Events CRUD | `/admin/events/*` | OFFICIAL | Core feature |
| Districts CRUD | `/admin/districts/*` | OFFICIAL | Core feature |
| Transport CRUD | `/admin/transport/*` | OFFICIAL | Core feature |
| Destinations Hub | `/admin/destinations/*` | OFFICIAL | Core feature |
| Content Editor (Unified) | Component | OFFICIAL | Primary editor |

### 2.2 Media

| Feature | Route | סטטוס | הערות |
|---------|-------|-------|-------|
| Media Library | `/admin/media` | OFFICIAL | File management |
| Image Upload | API | OFFICIAL | Core |
| AI Image Generation | `/admin/image-engine` | OFFICIAL | Primary image source |

### 2.3 SEO

| Feature | Route | סטטוס | הערות |
|---------|-------|-------|-------|
| Keywords Management | `/admin/keywords` | OFFICIAL | SEO core |
| SEO Audit | `/admin/seo-audit` | OFFICIAL | Quality check |
| AEO Dashboard | `/admin/aeo` | OFFICIAL | Answer Engine |
| Translations | `/admin/translations` | OFFICIAL | Multi-language |

### 2.4 Analytics

| Feature | Route | סטטוס | הערות |
|---------|-------|-------|-------|
| Analytics Dashboard | `/admin/analytics` | OFFICIAL | Core reporting |
| Growth Dashboard | `/admin/growth-dashboard` | OFFICIAL | Growth tracking |
| Audit Logs | `/admin/audit-logs` | OFFICIAL | Compliance |

### 2.5 User Management

| Feature | Route | סטטוס | הערות |
|---------|-------|-------|-------|
| Users CRUD | `/admin/users` | OFFICIAL | Core |
| Role Management | Schema-level | OFFICIAL | 5 roles |
| OTP Authentication | `/api/auth/*` | OFFICIAL | Primary auth |
| 2FA (TOTP) | `/api/totp/*` | OFFICIAL | Security |

### 2.6 System

| Feature | Route | סטטוס | הערות |
|---------|-------|-------|-------|
| Settings | `/admin/settings` | OFFICIAL | Core config |
| System Health | `/admin/system-health` | OFFICIAL | Monitoring |

### 2.7 Public Website

| Feature | Route | סטטוס | הערות |
|---------|-------|-------|-------|
| Homepage | `/` | OFFICIAL | Main entry |
| Attractions Pages | `/attractions/*` | OFFICIAL | Core content |
| Hotels Pages | `/hotels/*` | OFFICIAL | Core content |
| Dining Pages | `/dining/*` | OFFICIAL | Core content |
| Districts Pages | `/districts/*` | OFFICIAL | Core content |
| Events Pages | `/events/*` | OFFICIAL | Core content |
| Articles Pages | `/articles/*` | OFFICIAL | Core content |
| Destinations | `/destinations/*` | OFFICIAL | Core content |
| Search | `/search` | OFFICIAL | Discovery |
| Help Center | `/help/*` | OFFICIAL | Support |

### 2.8 Real Estate (Off-Plan)

| Feature | Route | סטטוס | הערות |
|---------|-------|-------|-------|
| Off-Plan Portal | `/dubai-real-estate` | OFFICIAL | Revenue vertical |
| Investment Guide | `/dubai-off-plan-investment-guide` | OFFICIAL | Content |
| Location Pages | `/dubai-off-plan-*` | OFFICIAL | SEO pages |
| Developer Pages | `/off-plan-emaar`, etc. | OFFICIAL | SEO pages |
| Comparison Pages | `/compare-*` | OFFICIAL | SEO pages |
| Calculator Tools | `/tools-*` | OFFICIAL | User tools |
| Case Studies | `/case-study-*` | OFFICIAL | Content |

---

## 3. BETA Features (בבדיקה)

| Feature | Route | סטטוס | מה חסר |
|---------|-------|-------|--------|
| Visual Editor | `/admin/visual-editor/*` | BETA | Stability testing |
| Page Builder | `/admin/page-builder` | BETA | UX refinement |
| Social Dashboard | `/admin/social/*` | BETA | Integration testing |
| Octopus Engine | `/admin/octopus` | BETA | Quality tuning |
| Writers Newsroom | `/admin/writers/newsroom` | BETA | Workflow testing |
| Content Intelligence | `/admin/content-intelligence` | BETA | Accuracy validation |

---

## 4. FROZEN Features (לא לגעת)

| Feature | Route | סיבה | Owner |
|---------|-------|------|-------|
| Governance UI | `/admin/governance/*` | Requires enterprise flag | Security Lead |
| Enterprise Teams | `/admin/enterprise/teams` | Not active | Product Lead |
| Enterprise Workflows | `/admin/enterprise/workflows` | Not active | Product Lead |
| Enterprise Webhooks | `/admin/enterprise/webhooks` | Not active | DevOps Lead |
| Custom Reports | Schema exists | Not implemented | Analytics Lead |
| A/B Testing | Schema exists | Not implemented | Growth Lead |

**אזהרה:** FROZEN features נשארים בקוד אבל אין לפתח אותם, לתקן אותם, או להוסיף להם תכונות.

---

## 5. DEPRECATED Features (למחיקה)

| Feature | Route/File | סיבה | תאריך יעד למחיקה |
|---------|------------|------|------------------|
| Coming Soon Page | `/coming-soon` | לא רלוונטי | 2026-02-01 |
| Duplicate Privacy Route | `/privacy-policy` | כפילות | 2026-02-01 |
| Duplicate Terms Route | `/terms-conditions` | כפילות | 2026-02-01 |
| Duplicate Cookies Route | `/cookies` | כפילות | 2026-02-01 |
| Homepage Promotions | `/admin/homepage-promotions` | מתמזג ל-Homepage Editor | 2026-02-15 |
| Search Debug | `/admin/search-debug` | עובר ל-System/Operations | 2026-02-15 |
| Entity Merge UI | `/admin/entity-merge` | Internal tool only | 2026-02-15 |
| Console | `/admin/console` | Dev only | 2026-02-15 |
| Site Settings (separate) | `/admin/site-settings` | מתמזג ל-Settings | 2026-02-15 |

---

## 6. DELETED (כבר נמחק)

| Feature | Route | תאריך מחיקה | סיבה |
|---------|-------|-------------|------|
| - | - | - | טרם נמחקו פיצ'רים |

---

## 7. FORBIDDEN (אסור לגעת)

### 7.1 קבצים אסורים לשינוי ללא אישור

| קובץ | סיבה | מי מאשר |
|------|------|---------|
| `/shared/schema.ts` | DB Schema | Tech Lead + DBA |
| `/server/auth.ts` | Authentication | Security Lead |
| `/server/security.ts` | Security middleware | Security Lead |
| `/server/access-control/*` | Permissions | Security Lead |
| `/drizzle.config.ts` | DB config | DevOps Lead |
| `/migrations/*` | DB migrations | DBA |
| `/server/index.ts` | Server bootstrap | Tech Lead |

### 7.2 פעולות אסורות

| פעולה | סיבה |
|-------|------|
| Force push to main | History destruction |
| Direct DB queries in production | Data integrity |
| Disable 2FA globally | Security |
| Delete audit logs | Compliance |
| Change auth flow | Security critical |

### 7.3 APIs אסורים לשינוי

| API | סיבה |
|-----|------|
| `/api/auth/*` | Security critical |
| `/api/totp/*` | Security critical |
| `/api/admin/access-control/*` | Permissions |

---

## 8. החלטות מוצר סופיות

### 8.1 ארכיטקטורה

| נושא | החלטה | לא נשנה |
|------|--------|---------|
| Frontend Framework | React + Vite | ✓ |
| Backend Framework | Express.js | ✓ |
| Database | PostgreSQL + Drizzle | ✓ |
| Auth Method | OTP + TOTP | ✓ |
| Styling | TailwindCSS + shadcn | ✓ |
| State Management | Zustand | ✓ |

### 8.2 User Roles

| Role | Hierarchy | לא נשנה |
|------|-----------|---------|
| admin | 100 | ✓ |
| editor | 80 | ✓ |
| author | 60 | ✓ |
| contributor | 40 | ✓ |
| viewer | 20 | ✓ |

### 8.3 Content Types

| Type | Schema Table | לא נשנה |
|------|-------------|---------|
| article | articles | ✓ |
| attraction | attractions | ✓ |
| hotel | hotels | ✓ |
| dining | dining | ✓ |
| district | districts | ✓ |
| event | events | ✓ |
| transport | transports | ✓ |
| landing_page | contents | ✓ |
| case_study | contents | ✓ |
| off_plan | contents | ✓ |
| itinerary | itineraries | ✓ |

---

## 9. כללי שימוש

### 9.1 לפני כל פיתוח

```
1. בדוק את הסטטוס של ה-Feature במסמך הזה
2. אם FROZEN או FORBIDDEN → עצור
3. אם DEPRECATED → אל תפתח, רק הכן מחיקה
4. אם BETA → עדכן את ה-Owner לפני שינויים
5. אם OFFICIAL → פתח לפי ה-DoD
```

### 9.2 עדכון מסמך זה

| מי יכול לעדכן | תנאי |
|---------------|------|
| Product Lead | כל שינוי סטטוס |
| Tech Lead | FORBIDDEN items |
| Security Lead | FORBIDDEN security items |

### 9.3 קונפליקטים

אם יש סתירה בין מסמך זה למסמך אחר:
**מסמך זה מנצח.**

---

## 10. Version History

| גרסה | תאריך | שינוי |
|------|-------|-------|
| 1.0 | 2026-01-01 | Initial release |
