# TRAVI Localization Map
## מפת לוקליזציה - עמודים וחלקים

> **הערה:** מסמך זה ממפה את כל העמודים הציבוריים והחלקים שלהם לצורך תרגום ל-17 שפות.
> **לא כולל:** תוכן אטרקציות דינמי (יתורגם בנפרד)

---

## 🌐 שפות נתמכות (17)

| Tier | שפה | קוד | RTL | סטטוס |
|------|-----|-----|-----|-------|
| 1 | English | en | ❌ | ✅ מוכן |
| 1 | العربية | ar | ✅ | ✅ מוכן |
| 1 | हिन्दी | hi | ❌ | 🔄 בעבודה |
| 2 | 中文 | zh | ❌ | 🔄 בעבודה |
| 2 | Русский | ru | ❌ | 🔄 בעבודה |
| 2 | اردو | ur | ✅ | 🔄 בעבודה |
| 2 | Français | fr | ❌ | 🔄 בעבודה |
| 3 | Deutsch | de | ❌ | 🔄 בעבודה |
| 3 | فارسی | fa | ✅ | 🔄 בעבודה |
| 3 | বাংলা | bn | ❌ | 🔄 בעבודה |
| 3 | Filipino | fil | ❌ | 🔄 בעבודה |
| 4 | Español | es | ❌ | 🔄 בעבודה |
| 4 | Türkçe | tr | ❌ | 🔄 בעבודה |
| 4 | Italiano | it | ❌ | 🔄 בעבודה |
| 4 | 日本語 | ja | ❌ | 🔄 בעבודה |
| 4 | 한국어 | ko | ❌ | 🔄 בעבודה |
| 4 | עברית | he | ✅ | 🔄 בעבודה |

---

## 📄 עמודים ציבוריים

### 1. דף הבית (`/`)
**קובץ:** `client/src/pages/homepage-new.tsx`

| חלק | מפתח תרגום | תיאור |
|-----|------------|--------|
| Hero | `home.hero.title` | כותרת ראשית |
| Hero | `home.hero.subtitle` | תת-כותרת |
| Hero | `home.hero.searchPlaceholder` | טקסט חיפוש |
| Featured Section | `home.featured` | כותרת מומלצים |
| Trending | `home.trending` | טרנדים |
| Top Attractions | `home.topAttractions` | אטרקציות מובילות |
| Best Hotels | `home.bestHotels` | מלונות מומלצים |
| Latest News | `home.latestNews` | חדשות אחרונות |

---

### 2. עמוד אטרקציות - רשימה (`/attractions`)
**קובץ:** `client/src/pages/public-v2/attractions.tsx`

| חלק | מפתח תרגום | תיאור |
|-----|------------|--------|
| Title | `attractions.title` | כותרת עמוד |
| Subtitle | `attractions.subtitle` | תת-כותרת |
| Filter: All | `attractions.filters.all` | כל האטרקציות |
| Filter: Popular | `attractions.filters.popular` | פופולריות |
| Filter: Free | `attractions.filters.free` | חינם |
| Filter: Family | `attractions.filters.familyFriendly` | למשפחות |
| Filter: Outdoor | `attractions.filters.outdoor` | בחוץ |
| Filter: Indoor | `attractions.filters.indoor` | בפנים |

---

### 3. עמוד מלונות - רשימה (`/hotels`)
**קובץ:** `client/src/pages/public-v2/hotels.tsx`

| חלק | מפתח תרגום | תיאור |
|-----|------------|--------|
| Title | `hotels.title` | כותרת |
| Subtitle | `hotels.subtitle` | תת-כותרת |
| Filter: All | `hotels.filters.all` | הכל |
| Filter: Luxury | `hotels.filters.luxury` | יוקרה |
| Filter: Budget | `hotels.filters.budget` | תקציבי |
| Filter: Beach | `hotels.filters.beachfront` | חוף הים |
| Filter: City | `hotels.filters.cityCenter` | מרכז העיר |
| Book Now | `hotels.bookNow` | הזמן עכשיו |
| Price From | `hotels.details.priceFrom` | החל מ- |
| Per Night | `hotels.details.perNight` | ללילה |

---

### 4. עמוד אוכל - רשימה (`/dining`)
**קובץ:** `client/src/pages/public-dining.tsx`

| חלק | מפתח תרגום | תיאור |
|-----|------------|--------|
| Title | `dining.title` | כותרת |
| Subtitle | `dining.subtitle` | תת-כותרת |
| Filter: Fine Dining | `dining.filters.fineDining` | אוכל יוקרתי |
| Filter: Casual | `dining.filters.casual` | קז'ואל |
| Filter: Cafes | `dining.filters.cafes` | בתי קפה |
| Filter: Street Food | `dining.filters.streetFood` | אוכל רחוב |
| Filter: Halal | `dining.filters.halal` | חלאל |
| Filter: Vegetarian | `dining.filters.vegetarian` | צמחוני |
| Cuisine | `dining.details.cuisine` | מטבח |
| Price Range | `dining.details.priceRange` | טווח מחירים |

---

### 5. עמוד שכונות (`/districts`)
**קובץ:** `client/src/pages/public-districts.tsx`

| חלק | מפתח תרגום | תיאור |
|-----|------------|--------|
| Title | `districts.title` | כותרת |
| Subtitle | `districts.subtitle` | תת-כותרת |
| Explore | `districts.explore` | לחקור |

---

### 6. עמוד נדל"ן (`/real-estate`)
**קובץ:** `client/src/pages/public-off-plan.tsx`

| חלק | מפתח תרגום | תיאור |
|-----|------------|--------|
| Title | `realEstate.title` | כותרת |
| Subtitle | `realEstate.subtitle` | תת-כותרת |
| Off-Plan Title | `realEstate.offPlan.title` | כותרת Off-Plan |
| Off-Plan Subtitle | `realEstate.offPlan.subtitle` | תת-כותרת |
| Find Property | `realEstate.offPlan.findProperty` | מצא נכס |
| From | `realEstate.offPlan.from` | החל מ- |
| Payment Plan | `realEstate.offPlan.paymentPlan` | תוכנית תשלום |
| Handover | `realEstate.offPlan.handover` | מסירה |
| Developer | `realEstate.offPlan.developer` | יזם |
| Filter: Apartments | `realEstate.filters.apartments` | דירות |
| Filter: Villas | `realEstate.filters.villas` | וילות |
| Crypto Accepted | `realEstate.features.cryptoAccepted` | מקבלים קריפטו |
| Golden Visa | `realEstate.features.goldenVisa` | ויזה זהב |

---

### 7. עמוד חדשות (`/news`)
**קובץ:** `client/src/pages/public-v2/news-feed-page.tsx`

| חלק | מפתח תרגום | תיאור |
|-----|------------|--------|
| Title | `home.latestNews` | חדשות אחרונות |
| Read More | `common.readMore` | קרא עוד |

---

### 8. עמודים סטטיים

#### About (`/about`)
**קובץ:** `client/src/pages/public-about.tsx`
- צריך namespace חדש: `about.*`

#### Privacy (`/privacy`)
**קובץ:** `client/src/pages/privacy.tsx`
- צריך namespace חדש: `legal.privacy.*`

#### Terms (`/terms`)
**קובץ:** `client/src/pages/terms.tsx`
- צריך namespace חדש: `legal.terms.*`

#### Cookies (`/cookies`)
**קובץ:** `client/src/pages/cookies.tsx`
- צריך namespace חדש: `legal.cookies.*`

---

## 🧩 קומפוננטות משותפות

### Navigation (Header)
**קובץ:** Multiple layout components

| חלק | מפתח תרגום | תיאור |
|-----|------------|--------|
| Home | `nav.home` | בית |
| Attractions | `nav.attractions` | אטרקציות |
| Hotels | `nav.hotels` | מלונות |
| Dining | `nav.dining` | אוכל |
| Districts | `nav.districts` | שכונות |
| Articles | `nav.articles` | מאמרים |
| Real Estate | `nav.realEstate` | נדל"ן |
| Events | `nav.events` | אירועים |
| Search | `nav.search` | חיפוש |
| Language | `nav.language` | שפה |

---

### Footer
**קובץ:** `client/src/components/footer-*.tsx`

| חלק | מפתח תרגום | תיאור |
|-----|------------|--------|
| About Travi | `footer.aboutTravi` | אודות |
| About Text | `footer.aboutText` | תיאור |
| Quick Links | `footer.quickLinks` | קישורים מהירים |
| Legal | `footer.legal` | משפטי |
| Privacy | `footer.privacy` | פרטיות |
| Terms | `footer.terms` | תנאים |
| Contact | `footer.contactUs` | צור קשר |
| Follow Us | `footer.followUs` | עקבו אחרינו |
| Newsletter | `footer.newsletter` | ניוזלטר |
| Newsletter Desc | `footer.newsletterDescription` | תיאור |
| Email Placeholder | `footer.emailPlaceholder` | הכנס אימייל |
| Copyright | `footer.copyright` | זכויות יוצרים |

---

### Common Buttons/Actions
**מפתחות קיימים ב-`common.*`**

| פעולה | מפתח | טקסט EN |
|-------|------|---------|
| Read More | `common.readMore` | Read More |
| View All | `common.viewAll` | View All |
| Learn More | `common.learnMore` | Learn More |
| Book Now | `common.bookNow` | Book Now |
| Contact Us | `common.contactUs` | Contact Us |
| Subscribe | `common.subscribe` | Subscribe |
| Submit | `common.submit` | Submit |
| Cancel | `common.cancel` | Cancel |
| Save | `common.save` | Save |
| Edit | `common.edit` | Edit |
| Delete | `common.delete` | Delete |
| Loading | `common.loading` | Loading... |
| Error | `common.error` | Something went wrong |
| No Results | `common.noResults` | No results found |
| Back | `common.back` | Back |
| Next | `common.next` | Next |
| Previous | `common.previous` | Previous |
| Close | `common.close` | Close |
| Share | `common.share` | Share |
| Copy Link | `common.copyLink` | Copy Link |
| Copied | `common.copied` | Copied! |

---

### Error Pages
**מפתחות ב-`errors.*`**

| עמוד | מפתחות |
|------|--------|
| 404 | `errors.404.title`, `.message`, `.button` |
| 500 | `errors.500.title`, `.message`, `.button` |
| Network | `errors.network.title`, `.message`, `.button` |

---

### SEO Meta Tags
**מפתחות ב-`meta.*`**

| עמוד | מפתחות |
|------|--------|
| Home | `meta.home.title`, `.description` |
| Attractions | `meta.attractions.title`, `.description` |
| Hotels | `meta.hotels.title`, `.description` |
| Dining | `meta.dining.title`, `.description` |

---

## 📋 סיכום - מה חסר

### Namespaces חסרים להוספה:

1. **`about.*`** - עמוד אודות
2. **`legal.privacy.*`** - מדיניות פרטיות
3. **`legal.terms.*`** - תנאי שימוש  
4. **`legal.cookies.*`** - מדיניות עוגיות
5. **`events.*`** - עמוד אירועים
6. **`destinations.*`** - עמודי יעדים (פריז, לונדון, וכו')
7. **`transport.*`** - תחבורה
8. **`tools.*`** - מחשבונים וכלים
9. **`newsletter.*`** - טפסי ניוזלטר מורחבים

### סה"כ מפתחות קיימים: ~150
### מפתחות חסרים להערכה: ~80

---

## 🔄 תהליך עבודה מומלץ

1. **שלב 1:** השלמת `en/common.json` עם כל המפתחות החסרים
2. **שלב 2:** תרגום ל-Arabic (ar) - Tier 1
3. **שלב 3:** תרגום ל-Hindi (hi) - Tier 1  
4. **שלב 4:** תרגום Tier 2 במקביל (zh, ru, ur, fr)
5. **שלב 5:** תרגום Tier 3-4 לפי עדיפות

---

## 🗂️ מבנה קבצים

```
client/src/locales/
├── en/
│   └── common.json       ✅ קיים (214 שורות)
├── ar/
│   └── common.json       ✅ קיים
├── he/
│   └── common.json       ✅ קיים
├── hi/
│   └── common.json       ✅ קיים
├── zh/
│   └── common.json       ✅ קיים
├── ru/
│   └── common.json       ✅ קיים
├── de/
│   └── common.json       ✅ קיים
├── fr/
│   └── common.json       ✅ קיים
├── es/
│   └── common.json       ✅ קיים
├── pt/
│   └── common.json       ✅ קיים
├── bn/
│   └── common.json       ✅ קיים
├── ja/
│   └── common.json       ✅ קיים
├── ko/
│   └── common.json       ✅ קיים
├── fil/
│   └── common.json       ✅ קיים
├── ur/
│   └── common.json       ✅ קיים
├── fa/
│   └── common.json       ✅ קיים
├── it/
│   └── common.json       ✅ קיים
└── tr/
    └── common.json       ✅ קיים (18 שפות)
```

---

*עודכן לאחרונה: 2026-01-08*
