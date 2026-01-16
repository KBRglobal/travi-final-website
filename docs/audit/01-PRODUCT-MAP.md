# Product Map - תמונת מצב מלאה (As-Is)

**תאריך ביקורת:** 2026-01-01
**גרסה:** 1.0
**מטרה:** מיפוי מלא של כל חלקי המערכת הקיימת

---

## 1. סקירה כללית

### 1.1 טכנולוגיות

| רכיב | טכנולוגיה |
|------|-----------|
| **Frontend** | React 18 + Vite + TypeScript |
| **Backend** | Express.js + Node.js |
| **Database** | PostgreSQL + Drizzle ORM |
| **Styling** | TailwindCSS + shadcn/ui |
| **Auth** | OTP Email + TOTP 2FA |
| **AI** | OpenAI GPT-4, Google Gemini, Claude |

### 1.2 מבנה פרויקט

```
/traviseoaeowebsite
├── /client          # React Frontend (Vite)
│   ├── /src
│   │   ├── /pages       # 150+ עמודים
│   │   ├── /components  # רכיבי UI
│   │   ├── /hooks       # Custom hooks
│   │   ├── /stores      # Zustand state
│   │   └── /locales     # 16 שפות
├── /server          # Express Backend
│   ├── /routes      # API routes
│   ├── /services    # Business logic
│   ├── /ai          # AI integrations
│   ├── /governance  # Governance system
│   └── /security    # Auth & security
├── /shared          # Shared code
│   └── schema.ts    # 6,700 שורות - DB schema
├── /docs            # Documentation
└── /migrations      # DB migrations
```

---

## 2. אתר ציבורי - מיפוי Routes

### 2.1 עמודי ליבה

| Route | עמוד | מטרה | סטטוס |
|-------|------|------|-------|
| `/` | Homepage | דף הבית הראשי | ✅ פעיל |
| `/search` | Search | חיפוש גלובלי | ✅ פעיל |
| `/login` | Login | התחברות | ✅ פעיל |
| `/coming-soon` | Coming Soon | עמוד "בקרוב" | ✅ פעיל |
| `/access-denied` | Access Denied | שגיאת הרשאות | ✅ פעיל |

### 2.2 אתרי תיירות (Attractions)

| Route | מטרה | סטטוס |
|-------|------|-------|
| `/attractions` | רשימת כל האטרקציות | ✅ פעיל |
| `/attractions/map` | מפת אטרקציות | ✅ פעיל |
| `/attractions/:slug` | פרטי אטרקציה | ✅ פעיל |

### 2.3 מלונות (Hotels)

| Route | מטרה | סטטוס |
|-------|------|-------|
| `/hotels` | רשימת מלונות | ✅ פעיל |
| `/hotels/:slug` | פרטי מלון | ✅ פעיל |

### 2.4 מסעדות (Dining)

| Route | מטרה | סטטוס |
|-------|------|-------|
| `/dining` | רשימת מסעדות | ✅ פעיל |
| `/dining/:slug` | פרטי מסעדה | ✅ פעיל |

### 2.5 שכונות (Districts)

| Route | מטרה | סטטוס |
|-------|------|-------|
| `/districts` | שער לכל השכונות | ✅ פעיל |
| `/districts/downtown-dubai` | Downtown Dubai | ✅ פעיל |
| `/districts/dubai-marina` | Dubai Marina | ✅ פעיל |
| `/districts/jbr-jumeirah-beach-residence` | JBR | ✅ פעיל |
| `/districts/palm-jumeirah` | Palm Jumeirah | ✅ פעיל |
| `/districts/jumeirah` | Jumeirah | ✅ פעיל |
| `/districts/business-bay` | Business Bay | ✅ פעיל |
| `/districts/old-dubai` | Old Dubai | ✅ פעיל |
| `/districts/dubai-creek-harbour` | Dubai Creek Harbour | ✅ פעיל |
| `/districts/dubai-south` | Dubai South | ✅ פעיל |
| `/districts/al-barsha` | Al Barsha | ✅ פעיל |
| `/districts/difc` | DIFC | ✅ פעיל |
| `/districts/dubai-hills-estate` | Dubai Hills | ✅ פעיל |
| `/districts/jvc` | JVC | ✅ פעיל |
| `/districts/bluewaters-island` | Bluewaters Island | ✅ פעיל |
| `/districts/international-city` | International City | ✅ פעיל |
| `/districts/al-karama` | Al Karama | ✅ פעיל |

### 2.6 כתבות ואירועים

| Route | מטרה | סטטוס |
|-------|------|-------|
| `/articles` | רשימת כתבות | ✅ פעיל |
| `/articles/:slug` | פרטי כתבה | ✅ פעיל |
| `/events` | רשימת אירועים | ✅ פעיל |
| `/events/:slug` | פרטי אירוע | ✅ פעיל |
| `/news` | חדשות | ✅ פעיל |

### 2.7 נדל"ן Off-Plan

#### מדריכים כלליים
| Route | מטרה | סטטוס |
|-------|------|-------|
| `/dubai-real-estate` | פורטל נדל"ן ראשי | ✅ פעיל |
| `/dubai-off-plan-properties` | רשימת פרויקטים | ✅ פעיל |
| `/dubai-off-plan-investment-guide` | מדריך השקעות | ✅ פעיל |
| `/how-to-buy-dubai-off-plan` | מדריך קנייה | ✅ פעיל |
| `/dubai-off-plan-payment-plans` | תכניות תשלום | ✅ פעיל |
| `/best-off-plan-projects-dubai-2026` | פרויקטים מובילים 2026 | ✅ פעיל |

#### לפי מיקום
| Route | מטרה |
|-------|------|
| `/dubai-off-plan-business-bay` | Business Bay |
| `/dubai-off-plan-marina` | Dubai Marina |
| `/dubai-off-plan-jvc` | JVC |
| `/dubai-off-plan-palm-jumeirah` | Palm Jumeirah |
| `/dubai-off-plan-creek-harbour` | Creek Harbour |
| `/dubai-off-plan-al-furjan` | Al Furjan |
| `/dubai-off-plan-villas` | וילות |

#### לפי יזם
| Route | יזם |
|-------|-----|
| `/off-plan-emaar` | Emaar |
| `/off-plan-damac` | DAMAC |
| `/off-plan-nakheel` | Nakheel |
| `/off-plan-meraas` | Meraas |
| `/off-plan-sobha` | Sobha |

#### נושאים מיוחדים
| Route | נושא |
|-------|------|
| `/off-plan-crypto-payments` | תשלום בקריפטו |
| `/off-plan-usdt` | USDT |
| `/off-plan-golden-visa` | ויזה זהובה |
| `/off-plan-post-handover` | אסטרטגיות אחרי מסירה |
| `/off-plan-escrow` | אסקרו והגנות |
| `/off-plan-vs-ready` | השוואה מוכן vs Off-Plan |

### 2.8 כלי חישוב

| Route | כלי | מטרה |
|-------|-----|------|
| `/tools-roi-calculator` | ROI Calculator | חישוב תשואה |
| `/tools-payment-calculator` | Payment Calculator | חישוב תשלומים |
| `/tools-affordability-calculator` | Affordability | יכולת כלכלית |
| `/tools-currency-converter` | Currency Converter | המרת מטבעות |
| `/tools-fees-calculator` | Fees Calculator | מיסים ועמלות |
| `/tools-rental-yield-calculator` | Rental Yield | תשואת שכירות |
| `/tools-mortgage-calculator` | Mortgage | משכנתא |

### 2.9 השוואות

| Route | השוואה |
|-------|--------|
| `/compare-jvc-vs-dubai-south` | JVC vs Dubai South |
| `/compare-emaar-vs-damac` | Emaar vs DAMAC |
| `/compare-downtown-vs-marina` | Downtown vs Marina |
| `/compare-sobha-vs-meraas` | Sobha vs Meraas |
| `/compare-crypto-vs-bank-transfer` | קריפטו vs בנק |
| `/compare-business-bay-vs-jlt` | Business Bay vs JLT |
| `/compare-new-vs-resale` | חדש vs יד שנייה |
| `/compare-villa-vs-apartment` | וילה vs דירה |
| `/compare-studio-vs-1bed` | סטודיו vs חדר |
| `/compare-60-40-vs-80-20` | תכניות תשלום |

### 2.10 Case Studies

| Route | נושא |
|-------|------|
| `/case-study-jvc-investor` | משקיע JVC |
| `/case-study-crypto-buyer` | קניית קריפטו |
| `/case-study-golden-visa` | ויזה זהובה |
| `/case-study-expat-family` | משפחת אקספט |
| `/case-study-investor-flip` | Flip השקעתי |
| `/case-study-portfolio-diversification` | פיזור תיק |
| `/case-study-off-plan-launch` | השקת פרויקט |
| `/case-study-retirement-planning` | תכנון פרישה |

### 2.11 יעדים (Destinations)

| Route | יעד |
|-------|-----|
| `/destinations` | כל היעדים |
| `/destinations/:slug` | יעד ספציפי |
| `/dubai` | דובאי |
| `/bangkok` | בנגקוק |
| `/paris` | פריז |
| `/istanbul` | איסטנבול |
| `/london` | לונדון |
| `/new-york` | ניו יורק |
| `/singapore` | סינגפור |

### 2.12 Landing Pages מיוחדים

| Route | נושא |
|-------|------|
| `/dubai/free-things-to-do` | פעילויות חינם |
| `/dubai/laws-for-tourists` | חוקים לתיירים |
| `/dubai/sheikh-mohammed-bin-rashid` | שייח מוחמד |
| `/dubai/24-hours-open` | פתוח 24/7 |

### 2.13 עזרה ומדיניות

| Route | מטרה |
|-------|------|
| `/help` | מרכז עזרה |
| `/help/:slug` | קטגוריית עזרה |
| `/help/:categorySlug/:articleSlug` | מאמר עזרה |
| `/privacy` / `/privacy-policy` | מדיניות פרטיות |
| `/terms` / `/terms-conditions` | תנאי שימוש |
| `/cookie-policy` / `/cookies` | מדיניות עוגיות |
| `/security` | מדיניות אבטחה |
| `/affiliate-disclosure` | גילוי שותפים |
| `/about` | אודות |
| `/contact` | צור קשר |

### 2.14 שותפים

| Route | מטרה |
|-------|------|
| `/partners/join` | הצטרפות לשותפים |
| `/partners/dashboard` | דשבורד שותפים |

### 2.15 V2 Routes (ארכיטקטורה חדשה)

| Route | מטרה |
|-------|------|
| `/v2` | Landing גלובלי V2 |
| `/v2/news` | חדשות V2 |
| `/v2/news/:slug` | מאמר חדשות V2 |
| `/v2/explore/:category` | חקירת קטגוריה |
| `/v2/country/:country` | עמוד מדינה |
| `/v2/country/:country/city/:city` | עמוד עיר |
| `/v2/country/:country/city/:city/item/:item` | פריט ספציפי |
| `/v2/country/:country/city/:city/area/:area` | אזור |

---

## 3. תמיכה רב-שפתית

### 3.1 שפות נתמכות (16)

| קוד | שפה |
|-----|-----|
| `en` | English (ברירת מחדל) |
| `ar` | Arabic (ערבית) |
| `hi` | Hindi |
| `zh` | Chinese |
| `ru` | Russian |
| `ur` | Urdu |
| `fr` | French |
| `de` | German |
| `fa` | Farsi/Persian |
| `bn` | Bengali |
| `fil` | Filipino |
| `es` | Spanish |
| `tr` | Turkish |
| `it` | Italian |
| `ja` | Japanese |
| `ko` | Korean |
| `he` | Hebrew |

### 3.2 מבנה URL

כל ה-routes הציבוריים (חוץ מ-`/admin`) זמינים עם prefix של שפה:
- `/attractions` → `/ar/attractions`, `/he/attractions`, `/zh/attractions`...

---

## 4. פאנל ניהול (Admin Panel)

### 4.1 מבנה כללי

הפאנל מחולק ל-7 סקציות ראשיות:

```
Admin Panel
├── 1. Content Management (ניהול תוכן)
├── 2. Content Creation & AI (יצירת תוכן + AI)
├── 3. Automation & Scheduling (אוטומציה)
├── 4. Distribution & Marketing (הפצה)
├── 5. Monetization (מונטיזציה)
├── 6. Analytics & Insights (אנליטיקס)
└── 7. System & Governance (מערכת וממשל)
```

### 4.2 Content Management

| Route | פונקציונליות |
|-------|-------------|
| `/admin/destinations` | ניהול יעדים - הכל ב-tabs |
| `/admin/attractions` | ניהול אטרקציות |
| `/admin/hotels` | ניהול מלונות |
| `/admin/dining` | ניהול מסעדות |
| `/admin/districts` | ניהול שכונות |
| `/admin/articles` | ניהול כתבות |
| `/admin/events` | ניהול אירועים |
| `/admin/transport` | ניהול תחבורה |
| `/admin/landing-pages` | דפי נחיתה |
| `/admin/case-studies` | Case Studies |
| `/admin/off-plan` | נדל"ן Off-Plan |
| `/admin/real-estate` | עורך נדל"ן |
| `/admin/static-pages` | עמודים סטטיים |
| `/admin/homepage` | עריכת דף הבית |
| `/admin/surveys` | סקרים |

### 4.3 Content Creation & AI Tools

| Route | פונקציונליות |
|-------|-------------|
| `/admin/octopus` | מנוע יצירת תוכן אוטומטי |
| `/admin/ai-generator` | מחולל תוכן AI |
| `/admin/templates` | תבניות תוכן |
| `/admin/writers` | ניהול כותבי AI |
| `/admin/writers/newsroom` | חדר חדשות AI |
| `/admin/content-intelligence` | אנליזת איכות תוכן |
| `/admin/topic-bank` | בנק נושאים |
| `/admin/image-engine` | מנוע יצירת תמונות |
| `/admin/page-builder` | בונה עמודים ויזואלי |
| `/admin/visual-editor` | עורך ויזואלי |

### 4.4 Automation & Scheduling

| Route | פונקציונליות |
|-------|-------------|
| `/admin/auto-pilot` | אוטומציה של יצירת תוכן |
| `/admin/rss-feeds` | ניהול RSS |
| `/admin/calendar` | לוח תוכן |
| `/admin/content-rules` | חוקי תוכן |
| `/admin/enterprise/workflows` | Workflow Builder |

### 4.5 Distribution & Marketing

| Route | פונקציונליות |
|-------|-------------|
| `/admin/translations` | ניהול תרגומים |
| `/admin/aeo` | Answer Engine Optimization |
| `/admin/newsletter` | ניהול ניוזלטר |
| `/admin/campaigns` | קמפיינים |
| `/admin/social` | רשתות חברתיות |
| `/admin/navigation` | ניהול ניווט |
| `/admin/footer` | ניהול Footer |
| `/admin/chat` | תיבת צ'אט |

### 4.6 Monetization

| Route | פונקציונליות |
|-------|-------------|
| `/admin/affiliate-links` | קישורי שותפים |
| `/admin/monetization/affiliates` | דשבורד שותפים |
| `/admin/monetization/premium` | תוכן פרימיום |
| `/admin/monetization/listings` | רישומי עסקים |
| `/admin/monetization/leads` | ניהול לידים |
| `/admin/referrals` | הפניות |

### 4.7 Analytics & Insights

| Route | פונקציונליות |
|-------|-------------|
| `/admin/analytics` | אנליטיקס כללי |
| `/admin/seo-audit` | ביקורת SEO |
| `/admin/analytics/journey` | מסע לקוח |
| `/admin/analytics/search` | אנליטיקס חיפוש |
| `/admin/analytics/plagiarism` | בדיקת פלגיאט |
| `/admin/growth-dashboard` | דשבורד צמיחה |
| `/admin/intelligence` | Intelligence Dashboard |
| `/admin/search-debug` | דיבוג חיפוש |

### 4.8 System & Governance

| Route | פונקציונליות |
|-------|-------------|
| `/admin/settings` | הגדרות |
| `/admin/site-settings` | הגדרות אתר |
| `/admin/security` | אבטחה (2FA) |
| `/admin/users` | ניהול משתמשים |
| `/admin/media` | ספריית מדיה |
| `/admin/logs` | לוגים |
| `/admin/audit-logs` | Audit Trail |
| `/admin/governance` | Governance Dashboard |
| `/admin/governance/roles` | ניהול תפקידים |
| `/admin/governance/users` | הקצאת תפקידים |
| `/admin/governance/policies` | מדיניות |
| `/admin/governance/approvals` | אישורים |
| `/admin/enterprise/teams` | צוותים |
| `/admin/enterprise/webhooks` | Webhooks |
| `/admin/console` | Console |
| `/admin/qa` | QA Dashboard |
| `/admin/changes` | Change Management |
| `/admin/entity-merge` | מיזוג ישויות |

---

## 5. סיכום סטטיסטי

| מטריקה | כמות |
|--------|------|
| **Routes ציבוריים** | ~150+ |
| **Routes Admin** | ~80+ |
| **Routes V2** | ~9 |
| **שפות** | 16 |
| **סוגי תוכן** | 11 |
| **טבלאות DB** | 150+ |
| **קבצי קוד** | 600+ |
| **שורות Schema** | 6,700 |

---

## 6. בעיות מזוהות (As-Is)

### 6.1 כפילויות Routes

| Routes | בעיה |
|--------|------|
| `/privacy` + `/privacy-policy` | אותו תוכן, URLs שונים |
| `/terms` + `/terms-conditions` | אותו תוכן, URLs שונים |
| `/cookie-policy` + `/cookies` | אותו תוכן, URLs שונים |
| `/dubai-real-estate` + `/dubai-off-plan-properties` | חפיפה בתוכן |

### 6.2 עמודים ללא קישור ברור

- עמודי V2 לא מקושרים מה-Homepage
- חלק מעמודי Case Studies לא מופיעים בניווט
- כלי חישוב לא מרוכזים בעמוד אחד

### 6.3 חוסר עקביות בניווט

- חלק מעמודי Districts דורשים slugs ארוכים (`jbr-jumeirah-beach-residence`)
- אין דף מאחד לכל הכלים (Tools Hub)
- אין דף מאחד לכל ההשוואות (Comparisons Hub)

### 6.4 Admin Panel

- יותר מדי מסכים - 80+ routes
- חלק מהפונקציות מפוזרות בין מסכים שונים
- Governance features דורשים feature flag
