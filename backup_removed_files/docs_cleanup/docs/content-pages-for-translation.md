# רשימת עמודי תוכן לתרגום
## Content Pages for Translation (Excluding Attractions)

> **הערה:** רשימה זו לא כוללת עמודי אטרקציות בודדות - אלה יתורגמו בנפרד דרך מערכת יצירת התוכן

---

## 📊 סיכום

| קטגוריה | כמות עמודים | עדיפות |
|---------|-------------|--------|
| דף הבית | 1 | 🔴 קריטי |
| יעדים (Destinations) | 10 | 🔴 קריטי |
| קטגוריות גלובליות | 6 | 🟡 גבוה |
| מלונות | 4 | 🟡 גבוה |
| אוכל | 3 | 🟡 גבוה |
| שכונות | 3 | 🟢 בינוני |
| חדשות/מאמרים | 4 | 🟢 בינוני |
| עמודים סטטיים | 8 | 🟢 בינוני |
| כלים | 4 | 🔵 נמוך |
| **סה"כ** | **~43** | |

---

## 🔴 עדיפות קריטית

### 1. דף הבית
| קובץ | נתיב URL | הערות |
|------|----------|-------|
| `homepage-new.tsx` | `/` | עמוד ראשי - Hero, Categories, Newsletter |

### 2. עמודי יעדים (Destinations)
| קובץ | נתיב URL | הערות |
|------|----------|-------|
| `destinations.tsx` | `/destinations` | רשימת כל היעדים |
| `destination-page.tsx` | `/:destination` | תבנית יעד דינמית |
| `public-v2/city-page.tsx` | `/:city` | עמוד עיר V2 |
| `public-v2/country-page.tsx` | `/:country` | עמוד מדינה |
| `public-v2/global-landing.tsx` | `/explore` | דף נחיתה גלובלי |
| `destination-paris.tsx` | `/paris` | פריז (ספציפי) |
| `destination-london.tsx` | `/london` | לונדון (ספציפי) |
| `destination-nyc.tsx` | `/new-york` | ניו יורק (ספציפי) |
| `destination-singapore.tsx` | `/singapore` | סינגפור (ספציפי) |
| `destination-istanbul.tsx` | `/istanbul` | איסטנבול (ספציפי) |
| `destination-bangkok-new.tsx` | `/bangkok` | בנגקוק (ספציפי) |

---

## 🟡 עדיפות גבוהה

### 3. קטגוריות גלובליות
| קובץ | נתיב URL | הערות |
|------|----------|-------|
| `global-things-to-do.tsx` | `/things-to-do` | דברים לעשות |
| `global-hotels.tsx` | `/hotels` | מלונות גלובלי |
| `global-dining.tsx` | `/dining` | אוכל גלובלי |
| `global-guides.tsx` | `/guides` | מדריכים |
| `global-category-template.tsx` | `/:category` | תבנית קטגוריה |
| `public-v2/category-listing-page.tsx` | `/:city/:category` | רשימת קטגוריה |

### 4. מלונות
| קובץ | נתיב URL | הערות |
|------|----------|-------|
| `hotels.tsx` | `/hotels` | רשימת מלונות |
| `public-hotels.tsx` | `/:city/hotels` | מלונות לפי עיר |
| `public-v2/hotels.tsx` | `/:city/hotels` | מלונות V2 |
| `public-hotel-detail.tsx` | `/:city/hotels/:slug` | פרטי מלון |
| `public-v2/hotel-page.tsx` | `/:city/hotels/:slug` | עמוד מלון V2 |
| `hotel-detail.tsx` | `/hotels/:id` | פרטי מלון (ישן) |

### 5. אוכל ומסעדות
| קובץ | נתיב URL | הערות |
|------|----------|-------|
| `dining.tsx` | `/dining` | רשימת מסעדות |
| `public-dining.tsx` | `/:city/dining` | אוכל לפי עיר |
| `public-dining-detail.tsx` | `/:city/dining/:slug` | פרטי מסעדה |
| `public-v2/restaurant-page.tsx` | `/:city/restaurants/:slug` | עמוד מסעדה V2 |

---

## 🟢 עדיפות בינונית

### 6. שכונות (Districts)
| קובץ | נתיב URL | הערות |
|------|----------|-------|
| `districts.tsx` | `/districts` | רשימת שכונות |
| `public-districts.tsx` | `/:city/districts` | שכונות לפי עיר |
| `public-district.tsx` | `/:city/districts/:slug` | פרטי שכונה |
| `public-v2/area-page.tsx` | `/:city/areas/:slug` | עמוד אזור V2 |

### 7. חדשות ומאמרים
| קובץ | נתיב URL | הערות |
|------|----------|-------|
| `public-news.tsx` | `/news` | פיד חדשות |
| `public-v2/news-feed-page.tsx` | `/:city/news` | חדשות לפי עיר |
| `public-v2/news-article-page.tsx` | `/news/:slug` | עמוד מאמר |
| `public-articles.tsx` | `/articles` | רשימת מאמרים |
| `public-article.tsx` | `/articles/:slug` | פרטי מאמר |
| `articles.tsx` | `/articles` | מאמרים (ישן) |
| `article-page.tsx` | `/article/:id` | עמוד מאמר (ישן) |

### 8. עמודים סטטיים
| קובץ | נתיב URL | הערות |
|------|----------|-------|
| `public-about.tsx` | `/about` | אודות |
| `about.tsx` | `/about` | אודות (ישן) |
| `public-contact.tsx` | `/contact` | צור קשר |
| `privacy.tsx` | `/privacy` | פרטיות |
| `privacy-policy.tsx` | `/privacy-policy` | מדיניות פרטיות |
| `terms.tsx` | `/terms` | תנאי שימוש |
| `terms-conditions.tsx` | `/terms-conditions` | תנאים והגבלות |
| `cookies.tsx` | `/cookies` | מדיניות עוגיות |

---

## 🔵 עדיפות נמוכה

### 9. כלים ושירותים
| קובץ | נתיב URL | הערות |
|------|----------|-------|
| `public-currency.tsx` | `/currency` | המרת מטבע |
| `public-budget.tsx` | `/budget` | תכנון תקציב |
| `public-transport.tsx` | `/transport` | תחבורה |
| `transport.tsx` | `/transport` | תחבורה (ישן) |
| `public-shopping.tsx` | `/shopping` | קניות |
| `public-events.tsx` | `/events` | אירועים |

### 10. עמודים נוספים
| קובץ | נתיב URL | הערות |
|------|----------|-------|
| `public-search.tsx` | `/search` | חיפוש |
| `public-docs.tsx` | `/docs` | תיעוד |
| `public-integrations.tsx` | `/integrations` | אינטגרציות |
| `public-survey.tsx` | `/survey` | סקר |
| `public-off-plan.tsx` | `/off-plan` | נדל"ן |

---

## 📁 עמודים להתעלמות (לא לתרגם)

### עמודי אדמין
- כל הקבצים תחת `client/src/pages/admin/`

### עמודי אטרקציות (יתורגמו בנפרד)
- `public-attraction.tsx`
- `public-attractions.tsx`
- `public-v2/attraction-detail.tsx`
- `public-v2/attraction-page.tsx`
- `public-v2/attractions.tsx`
- `destination-attractions.tsx`
- `global-attractions.tsx`

### עמודים ישנים (v-old)
- כל הקבצים תחת `client/src/pages/v-old/` - להחליט אם למחוק או לשמור

---

## 🔄 תהליך תרגום מומלץ

### שלב 1: הכנת מפתחות i18n
1. עבור על כל עמוד ברשימה
2. זהה את כל הטקסטים הקבועים
3. הוסף מפתחות ל-`en/common.json`
4. החלף טקסט קבוע ב-`t('key')`

### שלב 2: הפעלת AI לתרגום
```
ספקים זמינים:
- Anthropic (6 מפתחות)
- OpenAI
- Gemini
- Mistral
- Helicone (6 מפתחות)

שפות יעד: 17
```

### שלב 3: בדיקת איכות
1. בדיקת RTL (עברית, ערבית, אורדו, פרסית)
2. בדיקת אורך טקסט
3. בדיקת הקשר

---

## 📈 מעקב התקדמות

| עמוד | EN | AR | HE | ZH | RU | FR | DE | ES |
|------|----|----|----|----|----|----|----|----|
| homepage-new | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| destinations | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| ... | | | | | | | | |

---

*עודכן: 2026-01-08*
