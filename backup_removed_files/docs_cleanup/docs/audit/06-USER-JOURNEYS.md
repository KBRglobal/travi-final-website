# User Journeys - מסעות משתמש

**תאריך ביקורת:** 2026-01-01
**גרסה:** 1.0

---

## 1. אתר ציבורי - מסעות גולשים

### 1.1 מסע: גולש מחפש אטרקציות בדובאי

```
┌──────────────────────────────────────────────────────────────────────┐
│                    Journey: "מה לעשות בדובאי?"                         │
└──────────────────────────────────────────────────────────────────────┘

Entry Points:
├── Google Search → "/dubai" or "/attractions"
├── Direct → Homepage → "Explore Dubai"
└── Social → Specific attraction page

Flow:
1. Landing (Homepage or Dubai page)
   ├── Hero with search
   ├── Featured attractions
   └── CTA: "Explore All Attractions"

2. Discovery (/attractions)
   ├── Filter by category (Museums, Parks, etc.)
   ├── Filter by district
   ├── Map view toggle
   └── Grid of results

3. Detail (/attractions/:slug)
   ├── Hero image + title
   ├── Quick info (hours, price, duration)
   ├── Full description
   ├── Photos gallery
   ├── Tips & FAQs
   ├── Related attractions
   └── CTAs: Book, Save, Share

4. Conversion
   ├── External booking link
   ├── Newsletter signup
   └── Save for later (if registered)

Exit Points:
├── Booking completed (external)
├── Continue browsing (internal)
└── Return to search (internal)
```

**בעיות מזוהות:**
| בעיה | השפעה | פתרון |
|------|--------|-------|
| אין breadcrumbs | איבוד context | הוספת breadcrumbs |
| CTA לא ברור | פחות conversions | כפתורים בולטים |
| Related לא רלוונטי | Bounce rate | שיפור algorithm |

---

### 1.2 מסע: משקיע מחפש נדל"ן Off-Plan

```
┌──────────────────────────────────────────────────────────────────────┐
│                Journey: "השקעה ב-Off-Plan בדובאי"                      │
└──────────────────────────────────────────────────────────────────────┘

Entry Points:
├── Google Search → off-plan keywords
├── Real estate section on site
└── Comparison pages

Flow:
1. Education
   ├── /dubai-off-plan-investment-guide
   ├── /how-to-buy-dubai-off-plan
   └── Payment plans overview

2. Research
   ├── Browse by location
   │   ├── /dubai-off-plan-business-bay
   │   ├── /dubai-off-plan-marina
   │   └── etc.
   ├── Browse by developer
   │   ├── /off-plan-emaar
   │   └── etc.
   └── Comparisons
       ├── /compare-jvc-vs-dubai-south
       └── etc.

3. Tools
   ├── /tools-roi-calculator
   ├── /tools-payment-calculator
   └── /tools-affordability-calculator

4. Case Studies
   ├── /case-study-jvc-investor
   └── Real examples

5. Contact
   ├── Lead form
   └── WhatsApp CTA

Exit Points:
├── Lead submitted
├── Continue research
└── External developer site
```

**בעיות מזוהות:**
| בעיה | השפעה | פתרון |
|------|--------|-------|
| Tools לא מרוכזים | קשה למצוא | Tools hub page |
| Case studies מפוזרים | Low discovery | Case studies hub |
| אין funnel ברור | Low conversion | Guided journey |

---

### 1.3 מסע: תייר מתכנן טיול

```
┌──────────────────────────────────────────────────────────────────────┐
│                   Journey: "תכנון טיול לדובאי"                         │
└──────────────────────────────────────────────────────────────────────┘

Entry Points:
├── Google → "Dubai travel guide"
├── Homepage
└── District pages

Flow:
1. Overview
   ├── /dubai (city overview)
   ├── /districts (neighborhoods)
   └── General info

2. Where to stay
   ├── /hotels
   ├── Filter by district/price
   └── Hotel detail pages

3. What to do
   ├── /attractions
   ├── /events (if dates known)
   └── /articles (guides)

4. Where to eat
   ├── /dining
   └── Filter by cuisine/area

5. Getting around
   ├── /transport/:slug
   └── Metro/taxi guides

6. Planning
   ├── Create itinerary (if feature exists)
   └── Save favorites

Exit Points:
├── Book hotel (external)
├── Book flights (external)
└── Share itinerary
```

**בעיות מזוהות:**
| בעיה | השפעה | פתרון |
|------|--------|-------|
| אין itinerary builder | Low engagement | Add feature |
| Content לא מקושר | Poor flow | Internal linking |
| אין "save" | No return visits | Save functionality |

---

## 2. Admin Panel - מסעות משתמשי ניהול

### 2.1 מסע: Author יוצר כתבה חדשה

```
┌──────────────────────────────────────────────────────────────────────┐
│                   Journey: Author - Create Article                    │
└──────────────────────────────────────────────────────────────────────┘

Prerequisites:
├── Logged in
├── Role: Author
└── Has write permissions

Flow:
1. Entry
   ├── Dashboard
   └── Click "New Article" or navigate to /admin/articles/new

2. Create
   ├── Select template (if available)
   ├── Fill title
   ├── Write content
   ├── Add hero image
   └── Fill SEO fields

3. Media
   ├── Upload images
   ├── Add alt text
   └── Insert in content

4. Review
   ├── Preview
   ├── SEO score check
   └── Quality checklist

5. Submit
   ├── Save as draft
   └── Submit for review → Notification to Editor

6. Wait
   ├── Status: "In Review"
   ├── Receive feedback (if rejected)
   └── Make changes if needed

7. Published (by Editor)
   ├── Notification: "Your article was published"
   └── View live

Current Issues:
├── No clear workflow status
├── No feedback mechanism
└── No preview before submit
```

**שיפורים נדרשים:**
```
New Flow with Review Workflow:

┌─────────┐   ┌─────────┐   ┌──────────┐   ┌───────────┐   ┌───────────┐
│  Draft  │──►│ Submit  │──►│ In Review│──►│ Approved  │──►│ Published │
└─────────┘   └─────────┘   └──────────┘   └───────────┘   └───────────┘
                                 │
                                 ▼
                            ┌──────────┐
                            │ Rejected │
                            └────┬─────┘
                                 │
                                 ▼
                            ┌─────────┐
                            │  Draft  │ (with feedback)
                            └─────────┘
```

---

### 2.2 מסע: Editor מאשר תוכן

```
┌──────────────────────────────────────────────────────────────────────┐
│                   Journey: Editor - Review Content                    │
└──────────────────────────────────────────────────────────────────────┘

Prerequisites:
├── Logged in
├── Role: Editor
└── Has review permissions

Current Flow (As-Is):
1. Get notification (email?)
2. Navigate to content
3. Review content
4. Publish directly

Desired Flow (To-Be):
1. Dashboard
   ├── See "Items pending review" widget
   └── Count badge on navigation

2. Review Queue
   ├── /admin/content/review (NEW)
   ├── List of pending items
   ├── Sort by date/author/priority
   └── Quick preview

3. Review Detail
   ├── Full content preview
   ├── SEO checklist
   ├── Quality metrics
   └── Author info

4. Decision
   ├── Approve → Schedule/Publish
   ├── Reject → Add feedback → Back to author
   └── Request changes → Add comments

5. Post-decision
   ├── Notification to author
   ├── Audit log entry
   └── Stats update
```

---

### 2.3 מסע: Admin מנהל משתמשים

```
┌──────────────────────────────────────────────────────────────────────┐
│                    Journey: Admin - User Management                   │
└──────────────────────────────────────────────────────────────────────┘

Flow:
1. Navigate to Users
   └── /admin/governance/users

2. View Users
   ├── List with search/filter
   ├── Filter by role
   ├── See last activity
   └── See content count

3. Add User
   ├── Click "Invite User"
   ├── Enter email
   ├── Select role
   ├── Send invitation
   └── Track invitation status

4. Edit User
   ├── Click on user
   ├── Change role (if allowed)
   ├── Disable/Enable
   └── View activity history

5. Delete User (Protected)
   ├── Click delete
   ├── Confirmation: "Are you sure?"
   ├── 2FA verification
   ├── Reason required
   └── Dual approval (if enabled)

6. Audit
   ├── All actions logged
   └── Viewable in audit log
```

---

### 2.4 מסע: Analyst צופה בדוחות

```
┌──────────────────────────────────────────────────────────────────────┐
│                   Journey: Analyst - View Reports                     │
└──────────────────────────────────────────────────────────────────────┘

Prerequisites:
├── Logged in
├── Role: Analyst (or Viewer)
└── Analytics permissions

Flow:
1. Dashboard
   ├── Quick stats overview
   └── Key metrics widgets

2. Deep Dive
   ├── /admin/analytics/traffic
   ├── /admin/analytics/content
   ├── /admin/analytics/seo
   └── /admin/analytics/growth

3. SEO Audit
   ├── /admin/seo-audit
   ├── Site-wide issues
   ├── Per-page scores
   └── Recommendations

4. Export
   ├── Download CSV
   ├── Schedule reports
   └── Email to stakeholders

Limited Actions:
├── View only
├── Cannot edit content
├── Cannot change settings
└── Cannot access governance
```

---

## 3. מפת מסעות מאוחדת

### 3.1 Public Site Journey Map

```
                              ┌──────────────┐
                              │   Homepage   │
                              └──────┬───────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         ▼                           ▼                           ▼
   ┌───────────┐             ┌───────────────┐           ┌─────────────┐
   │Attractions│             │   Districts   │           │ Real Estate │
   └─────┬─────┘             └───────┬───────┘           └──────┬──────┘
         │                           │                          │
         ▼                           ▼                          ▼
   ┌───────────┐             ┌───────────────┐           ┌─────────────┐
   │ Detail    │             │District Detail│           │ Investment  │
   │ Page      │◄───────────►│    Page       │◄─────────►│   Guide     │
   └─────┬─────┘             └───────────────┘           └──────┬──────┘
         │                                                      │
         │                                                      ▼
         │                                               ┌─────────────┐
         │                                               │   Tools &   │
         │                                               │ Calculators │
         │                                               └──────┬──────┘
         │                                                      │
         └──────────────────────────┬───────────────────────────┘
                                    │
                                    ▼
                             ┌─────────────┐
                             │ Conversion  │
                             │ (Lead/Book) │
                             └─────────────┘
```

### 3.2 Admin Panel Journey Map

```
                              ┌──────────────┐
                              │  Dashboard   │
                              └──────┬───────┘
                                     │
    ┌────────────┬───────────┬───────┴───────┬───────────┬────────────┐
    │            │           │               │           │            │
    ▼            ▼           ▼               ▼           ▼            ▼
┌───────┐  ┌─────────┐  ┌────────┐    ┌───────────┐ ┌─────────┐ ┌────────┐
│Content│  │   SEO   │  │ Media  │    │Governance │ │Analytics│ │ System │
└───┬───┘  └────┬────┘  └────┬───┘    └─────┬─────┘ └────┬────┘ └────┬───┘
    │           │            │              │            │           │
    ▼           ▼            ▼              ▼            ▼           ▼
┌───────┐  ┌─────────┐  ┌────────┐    ┌───────────┐ ┌─────────┐ ┌────────┐
│Create │  │Keywords │  │Library │    │   Users   │ │ Reports │ │Settings│
│Edit   │  │Audit    │  │Upload  │    │   Roles   │ │ SEO     │ │ Logs   │
│Review │  │AEO      │  │AI Gen  │    │ Approvals │ │ Growth  │ │ Backup │
└───────┘  └─────────┘  └────────┘    └───────────┘ └─────────┘ └────────┘
```

---

## 4. נקודות כאב (Pain Points)

### 4.1 Public Site

| נקודת כאב | סיבה | פתרון |
|-----------|------|-------|
| **Lost in navigation** | אין breadcrumbs | הוספת breadcrumbs |
| **Can't find tools** | מפוזרים | Tools hub |
| **No save for later** | לא implemented | Add wishlist |
| **Unclear CTAs** | עיצוב לא בולט | שיפור UI |
| **No comparison** | לא קיים | Add compare feature |

### 4.2 Admin Panel

| נקודת כאב | סיבה | פתרון |
|-----------|------|-------|
| **Too many menus** | 80+ routes | Consolidate to 6 |
| **No review workflow** | לא מומש | Add workflow |
| **Can't find content** | חיפוש חלש | Improve search |
| **No notifications** | חסר | Add notification system |
| **Unclear permissions** | לא מתועד | Role-based UI |

---

## 5. מטריקות מסע

### 5.1 Public Site KPIs

| מטריקה | מה מודדים | יעד |
|--------|-----------|-----|
| **Pages per session** | Engagement | > 3 |
| **Time on site** | Interest | > 3 min |
| **Bounce rate** | Relevance | < 50% |
| **Conversion rate** | Success | > 2% |
| **Return visitors** | Loyalty | > 30% |

### 5.2 Admin Panel KPIs

| מטריקה | מה מודדים | יעד |
|--------|-----------|-----|
| **Time to publish** | Efficiency | < 10 min |
| **Review turnaround** | Workflow | < 24h |
| **Error rate** | Quality | < 1% |
| **Tasks completed** | Productivity | Track |
| **Search success** | Usability | > 90% |

---

## 6. המלצות לשיפור מסעות

### 6.1 Short-term (1-2 weeks)

| המלצה | Impact | Effort |
|-------|--------|--------|
| Add breadcrumbs | High | Low |
| Create review queue | High | Medium |
| Improve CTAs | Medium | Low |
| Add keyboard shortcuts | Medium | Low |

### 6.2 Medium-term (1 month)

| המלצה | Impact | Effort |
|-------|--------|--------|
| Tools hub page | Medium | Medium |
| Notification system | High | Medium |
| Improved search | High | Medium |
| Role-based navigation | High | Medium |

### 6.3 Long-term (3+ months)

| המלצה | Impact | Effort |
|-------|--------|--------|
| Wishlist/save feature | Medium | Medium |
| Itinerary builder | High | High |
| Advanced analytics | Medium | High |
| Personalization | High | High |
