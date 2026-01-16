# User Roles & Permissions - הגדרת משתמשים ותפקידים

**תאריך ביקורת:** 2026-01-01
**גרסה:** 1.0

---

## 1. Personas - טיפוסי משתמשים

### 1.1 גולש (Anonymous Visitor)

**תיאור:** משתמש שמגיע לאתר ללא התחברות

| היבט | הגדרה |
|------|--------|
| **מה רואה באתר** | כל התוכן הציבורי שפורסם |
| **מה רואה בפאנל** | לא רואה את הפאנל כלל |
| **מה אסור לו** | עריכה, יצירה, הגדרות, admin |
| **מה מותר לו** | צפייה, חיפוש, שימוש בכלים |
| **אישורים נדרשים** | אין |

---

### 1.2 משתמש רשום (Registered User)

**תיאור:** משתמש שנרשם לאתר אבל אין לו הרשאות ניהול

| היבט | הגדרה |
|------|--------|
| **מה רואה באתר** | כל התוכן הציבורי + פרופיל אישי |
| **מה רואה בפאנל** | Dashboard בסיסי (אם מופעל) |
| **מה אסור לו** | יצירת תוכן, עריכה, הגדרות |
| **מה מותר לו** | שמירת מועדפים, הרשמה לניוזלטר |
| **אישורים נדרשים** | אין |

---

### 1.3 שותף / Affiliate

**תיאור:** שותף עסקי שמקבל עמלות על הפניות

| היבט | הגדרה |
|------|--------|
| **מה רואה באתר** | תוכן ציבורי + דשבורד שותפים |
| **מה רואה בפאנל** | `/partners/dashboard` בלבד |
| **מה אסור לו** | עריכת תוכן, הגדרות מערכת |
| **מה מותר לו** | צפייה בסטטיסטיקות, קישורי שותפים |
| **אישורים נדרשים** | אישור הצטרפות לתכנית |

---

### 1.4 כותב / Contributor

**תיאור:** כותב תוכן שיכול ליצור drafts בלבד

| היבט | הגדרה |
|------|--------|
| **מה רואה באתר** | תוכן ציבורי + תוכן שלו |
| **מה רואה בפאנל** | Content editors, Topic bank, Templates |
| **מה אסור לו** | פרסום, מחיקה, הגדרות, משתמשים |
| **מה מותר לו** | יצירת drafts, עריכת תוכן שלו בלבד |
| **אישורים נדרשים** | כל תוכן עובר review לפני פרסום |

**הרשאות ספציפיות:**
```
canCreate: true
canEditOwn: true
canEdit: false
canDelete: false
canPublish: false
canSubmitForReview: true
```

---

### 1.5 עורך תוכן / Author

**תיאור:** יכול ליצור ולערוך תוכן משלו

| היבט | הגדרה |
|------|--------|
| **מה רואה באתר** | תוכן ציבורי + כל התוכן שלו |
| **מה רואה בפאנל** | Content editors, Media, Topic bank |
| **מה אסור לו** | עריכת תוכן של אחרים, פרסום ישיר, הגדרות |
| **מה מותר לו** | יצירה, עריכת עצמי, העלאת מדיה |
| **אישורים נדרשים** | פרסום דורש אישור editor |

**הרשאות ספציפיות:**
```
canCreate: true
canEditOwn: true
canEdit: false
canDelete: false
canPublish: false
canSubmitForReview: true
canAccessMediaLibrary: true
```

---

### 1.6 מנהל תוכן / Editor

**תיאור:** מנהל תוכן שיכול לערוך ולפרסם

| היבט | הגדרה |
|------|--------|
| **מה רואה באתר** | כל התוכן כולל drafts |
| **מה רואה בפאנל** | Content, Media, Analytics, SEO |
| **מה אסור לו** | ניהול משתמשים, הגדרות מערכת, security |
| **מה מותר לו** | יצירה, עריכה, פרסום, מחיקה |
| **אישורים נדרשים** | אין - יכול לפרסם באופן עצמאי |

**הרשאות ספציפיות:**
```
canCreate: true
canEdit: true
canDelete: false
canPublish: true
canViewAnalytics: true
canAccessMediaLibrary: true
canAccessAffiliates: true
canViewAll: true
```

---

### 1.7 מנהל מערכת / Admin

**תיאור:** גישה מלאה למערכת

| היבט | הגדרה |
|------|--------|
| **מה רואה באתר** | הכל |
| **מה רואה בפאנל** | הכל |
| **מה אסור לו** | אין הגבלות |
| **מה מותר לו** | הכל |
| **אישורים נדרשים** | אין |

**הרשאות ספציפיות:**
```
canCreate: true
canEdit: true
canDelete: true
canPublish: true
canManageUsers: true
canManageSettings: true
canViewAnalytics: true
canViewAuditLogs: true
canAccessMediaLibrary: true
canAccessAffiliates: true
canViewAll: true
```

---

### 1.8 אנליסט / SEO / Ops

**תיאור:** גישה לקריאה לצורך ניתוח

| היבט | הגדרה |
|------|--------|
| **מה רואה באתר** | תוכן ציבורי |
| **מה רואה בפאנל** | Analytics, SEO Audit, Intelligence |
| **מה אסור לו** | יצירה, עריכה, פרסום, הגדרות |
| **מה מותר לו** | צפייה בדוחות, אנליטיקס, SEO |
| **אישורים נדרשים** | אין |

**הרשאות ספציפיות:**
```
canCreate: false
canEdit: false
canDelete: false
canPublish: false
canViewAnalytics: true
canViewAll: true
canViewAuditLogs: true (לפי הצורך)
```

---

## 2. מטריצת הרשאות מלאה

### 2.1 הרשאות לפי תפקיד

| הרשאה | Viewer | Contributor | Author | Editor | Admin |
|-------|--------|-------------|--------|--------|-------|
| **צפייה בתוכן ציבורי** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **צפייה בכל התוכן** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **יצירת תוכן** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **עריכת תוכן שלי** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **עריכת כל תוכן** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **מחיקת תוכן** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **פרסום תוכן** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **שליחה לreview** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **צפייה באנליטיקס** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **גישה למדיה** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **גישה לשותפים** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **ניהול משתמשים** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **הגדרות מערכת** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **צפייה ב-Audit Logs** | ❌ | ❌ | ❌ | ❌ | ✅ |

### 2.2 הרשאות לפי פעולה

| פעולה | תפקידים מורשים | דורש אישור? |
|-------|----------------|-------------|
| **יצירת Draft** | Contributor, Author, Editor, Admin | לא |
| **עריכת Draft שלי** | Contributor, Author, Editor, Admin | לא |
| **עריכת Draft של אחר** | Editor, Admin | לא |
| **שליחה ל-Review** | Contributor, Author | לא |
| **אישור Review** | Editor, Admin | לא |
| **פרסום ישיר** | Editor, Admin | לא |
| **ביטול פרסום** | Editor, Admin | לא |
| **ארכוב תוכן** | Editor, Admin | לא |
| **מחיקת תוכן** | Admin | **כן - Audit Log** |
| **העלאת מדיה** | Author, Editor, Admin | לא |
| **מחיקת מדיה** | Admin | **כן - Audit Log** |
| **שינוי הגדרות** | Admin | **כן - Audit Log** |
| **הוספת משתמש** | Admin | **כן - Audit Log** |
| **שינוי תפקיד** | Admin | **כן - Audit Log** |
| **מחיקת משתמש** | Admin | **כן - אישור נוסף** |

---

## 3. פעולות מסוכנות

### 3.1 פעולות הדורשות אישור נוסף

| פעולה | סיכון | הגנה נדרשת |
|-------|-------|-----------|
| **מחיקת תוכן לצמיתות** | אובדן נתונים | Soft delete + Admin only |
| **מחיקת משתמש** | אובדן גישה | אישור כפול |
| **שינוי הגדרות אבטחה** | פגיעות | 2FA נדרש |
| **גישה ל-Audit Logs** | חשיפת מידע רגיש | Admin only |
| **Export נתונים** | דליפת מידע | Admin only + Audit |
| **Bulk operations** | נזק המוני | Dry-run + אישור |

### 3.2 פעולות שאסור לבצע

| פעולה | סיבה |
|-------|------|
| מחיקת Admin אחרון | מניעת נעילה |
| שינוי role לעצמך | מניעת הסלמה |
| ביטול 2FA ללא קוד | אבטחה |
| גישה ישירה ל-DB | Production safety |

---

## 4. גישה לפאנל Admin לפי תפקיד

### 4.1 מה רואה כל תפקיד

#### Viewer (Analyst/SEO)
```
📊 Analytics
├── /admin/analytics
├── /admin/seo-audit
├── /admin/analytics/journey
├── /admin/analytics/search
├── /admin/growth-dashboard
└── /admin/intelligence
```

#### Contributor
```
📝 Content (Limited)
├── /admin/articles/new
├── /admin/attractions/new
├── /admin/hotels/new
├── /admin/topic-bank (read)
└── /admin/templates (read)
```

#### Author
```
📝 Content
├── כל מה ש-Contributor +
├── /admin/media
├── /admin/image-engine
└── גישה לתוכן שלו בלבד
```

#### Editor
```
📝 Content (Full)
├── /admin/destinations
├── /admin/attractions
├── /admin/hotels
├── /admin/dining
├── /admin/districts
├── /admin/articles
├── /admin/events
├── /admin/landing-pages
├── /admin/case-studies
├── /admin/off-plan

📤 Distribution
├── /admin/translations
├── /admin/aeo
├── /admin/social

📊 Analytics
├── /admin/analytics
├── /admin/seo-audit
├── /admin/growth-dashboard

🖼️ Media
├── /admin/media
└── /admin/image-engine
```

#### Admin
```
🔐 הכל
├── כל מה ש-Editor +
├── /admin/users
├── /admin/settings
├── /admin/security
├── /admin/governance
├── /admin/audit-logs
├── /admin/logs
├── /admin/enterprise/*
├── /admin/console
└── /admin/qa
```

---

## 5. תהליכי אישור (Workflows)

### 5.1 Workflow פרסום תוכן

```
┌─────────────┐
│ Contributor │
│   יוצר      │
└──────┬──────┘
       │ Draft
       ▼
┌─────────────┐
│  In Review  │
│  (pending)  │
└──────┬──────┘
       │
       ▼
┌─────────────┐    ┌─────────────┐
│   Editor    │───▶│  Approved   │
│   מאשר      │    │             │
└──────┬──────┘    └──────┬──────┘
       │ rejected         │
       ▼                  ▼
┌─────────────┐    ┌─────────────┐
│  Back to    │    │  Published  │
│   Draft     │    │             │
└─────────────┘    └─────────────┘
```

### 5.2 Workflow מחיקת תוכן

```
┌─────────────┐
│   Request   │
│   Delete    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Check:     │
│ Admin role? │
└──────┬──────┘
       │ Yes
       ▼
┌─────────────┐
│ Soft Delete │
│ (Archived)  │
└──────┬──────┘
       │ After 30 days
       ▼
┌─────────────┐
│   Purge     │
│ (Optional)  │
└─────────────┘
```

---

## 6. אימות והרשאה

### 6.1 שיטות אימות

| שיטה | תיאור | מתי |
|------|--------|-----|
| **OTP Email** | קוד חד-פעמי למייל | Login ראשוני |
| **TOTP 2FA** | אפליקציית אימות | Admin actions |
| **Session** | Cookie מוצפן | כל בקשה |

### 6.2 הגנות

| הגנה | תיאור |
|------|--------|
| **Rate Limiting** | 5 ניסיונות login/דקה |
| **IP Blocking** | 10 כשלונות = חסימה זמנית |
| **Session Timeout** | 24 שעות |
| **CSRF Protection** | Token בכל form |
| **Audit Logging** | כל פעולה מתועדת |

---

## 7. המלצות לשיפור

### 7.1 הרשאות חסרות

| המלצה | סיבה |
|-------|------|
| **Role: Moderator** | אישור comments בלבד |
| **Role: Translator** | תרגום בלבד |
| **Role: SEO Manager** | SEO fields בלבד |

### 7.2 הגנות חסרות

| המלצה | סיבה |
|-------|------|
| **IP Allowlist לAdmin** | הגבלת גישה |
| **Session per device** | מניעת שיתוף |
| **Approval for bulk ops** | מניעת נזק |

### 7.3 תהליכים חסרים

| המלצה | סיבה |
|-------|------|
| **4-eyes principle** | אישור כפול לפעולות מסוכנות |
| **Change request** | תיעוד לפני שינויים |
| **Rollback policy** | יכולת שחזור |
