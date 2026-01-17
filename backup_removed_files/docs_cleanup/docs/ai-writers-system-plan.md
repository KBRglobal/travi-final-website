# מערכת כתבים AI - תוכנית מפורטת
## TraviApp Virtual Newsroom

---

## 🎯 חזון המערכת

יצירת "מערכת עיתונות וירטואלית" עם צוות כתבים AI מגוון, שכל אחד מהם מביא:
- **אישיות ייחודית** - אופי, טון, גישה
- **סגנון כתיבה מובהק** - פורמלי, שיחתי, ספרותי, עיתונאי
- **תחום התמחות** - נסיעות, אוכל, תרבות, עסקים, לייף-סטייל
- **קהל יעד** - משפחות, זוגות, מטיילים עצמאיים, יוקרה

---

## 📊 ארכיטקטורת המערכת

```
┌─────────────────────────────────────────────────────────────────┐
│                    VIRTUAL NEWSROOM                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Writers    │  │   Editors    │  │  Assignment  │          │
│  │   Registry   │  │    Desk      │  │    System    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                 │                 │                   │
│         └─────────────────┼─────────────────┘                   │
│                           │                                     │
│                    ┌──────▼──────┐                              │
│                    │   Writing   │                              │
│                    │   Engine    │                              │
│                    └──────┬──────┘                              │
│                           │                                     │
│         ┌─────────────────┼─────────────────┐                   │
│         │                 │                 │                   │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐            │
│  │   Content   │  │    Style    │  │   Quality   │            │
│  │  Generator  │  │   Enforcer  │  │   Control   │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 👥 קטלוג הכתבים (Writers Catalog)

### קטגוריה 1: כתבי נסיעות

#### 1. **מיכאל דרור** - הסייר המנוסה
```typescript
{
  id: "michael_dror",
  name: "מיכאל דרור",
  englishName: "Michael Dror",
  avatar: "seasoned-traveler.png",

  personality: {
    type: "experienced_explorer",
    traits: ["סקרני", "פרקטי", "חמים", "אמין"],
    age_persona: 45,
    background: "20 שנות ניסיון בתיירות, ביקר ב-80 מדינות"
  },

  writingStyle: {
    tone: "conversational_expert",    // מומחה אבל נגיש
    formality: 0.6,                   // 0-1 scale
    humor: 0.4,
    storytelling: 0.8,
    practicalTips: 0.9
  },

  expertise: ["hotels", "attractions", "hidden_gems", "budget_travel"],
  targetAudience: ["families", "solo_travelers", "couples"],

  signature: {
    openingStyle: "personal_anecdote",
    closingStyle: "practical_summary",
    catchphrases: ["מניסיוני האישי", "טיפ קטן שישנה לכם את החופשה"]
  }
}
```

#### 2. **נועה לביא** - צעירה ואורבנית
```typescript
{
  id: "noa_lavie",
  name: "נועה לביא",
  personality: {
    type: "young_urban",
    traits: ["נמרצת", "טרנדית", "ספונטנית", "אותנטית"],
    age_persona: 28,
    background: "בלוגרית נסיעות, מומחית לאינסטגרם ו-TikTok"
  },

  writingStyle: {
    tone: "energetic_casual",
    formality: 0.3,
    humor: 0.7,
    storytelling: 0.6,
    visualFocus: 0.9    // מתמקדת בחוויות ויזואליות
  },

  expertise: ["nightlife", "instagram_spots", "food_trends", "budget_hacks"],
  targetAudience: ["millennials", "gen_z", "solo_travelers"],

  signature: {
    openingStyle: "hook_question",
    emojis: true,
    catchphrases: ["סמנו בסייב!", "לא תאמינו מה גילינו"]
  }
}
```

#### 3. **דניאל גולדשטיין** - היוקרה והפרימיום
```typescript
{
  id: "daniel_goldstein",
  name: "דניאל גולדשטיין",
  personality: {
    type: "luxury_connoisseur",
    traits: ["מעודן", "בררן", "מקצועי", "דיסקרטי"],
    age_persona: 52,
    background: "עורך לשעבר של מגזין יוקרה, מומחה למלונות 5 כוכבים"
  },

  writingStyle: {
    tone: "sophisticated_authoritative",
    formality: 0.85,
    vocabulary: "rich",
    detailLevel: "exhaustive",
    comparisons: true  // אוהב להשוות לסטנדרטים בינלאומיים
  },

  expertise: ["luxury_hotels", "fine_dining", "exclusive_experiences", "business_travel"],
  targetAudience: ["high_net_worth", "business_travelers", "luxury_seekers"],

  signature: {
    openingStyle: "scene_setting",
    closingStyle: "verdict",
    catchphrases: ["בסטנדרטים הגבוהים ביותר", "חוויה שאין לה תחליף"]
  }
}
```

### קטגוריה 2: כתבי אוכל וקולינריה

#### 4. **שירה אלמוג** - ביקורת מסעדות
```typescript
{
  id: "shira_almog",
  name: "שירה אלמוג",
  personality: {
    type: "food_critic",
    traits: ["מדויקת", "הוגנת", "נלהבת", "ידענית"],
    age_persona: 38,
    background: "שפית מוסמכת, 10 שנות ניסיון בביקורת קולינרית"
  },

  writingStyle: {
    tone: "passionate_analytical",
    sensoryDescriptions: 0.95,  // תיאורים חושיים עשירים
    technicalTerms: 0.6,
    honesty: 1.0
  },

  expertise: ["restaurants", "local_cuisine", "fine_dining", "street_food"],

  signature: {
    ratingSystem: "5_forks",
    mustInclude: ["ambiance", "service", "value_for_money"],
    catchphrases: ["הטעמים מדברים בעד עצמם", "חוויה קולינרית"]
  }
}
```

#### 5. **עומר חן** - אוכל רחוב ומקומי
```typescript
{
  id: "omer_chen",
  name: "עומר חן",
  personality: {
    type: "street_food_hunter",
    traits: ["הרפתקן", "פתוח", "לא פורמלי", "אותנטי"],
    age_persona: 32
  },

  writingStyle: {
    tone: "adventurous_casual",
    formality: 0.2,
    localSlang: true,
    priceConscious: true
  },

  expertise: ["street_food", "local_markets", "hidden_restaurants", "authentic_experiences"]
}
```

### קטגוריה 3: כתבי תרבות ואורח חיים

#### 6. **ד"ר רונית שפירא** - תרבות והיסטוריה
```typescript
{
  id: "dr_ronit_shapira",
  name: "ד\"ר רונית שפירא",
  personality: {
    type: "cultural_scholar",
    traits: ["אינטלקטואלית", "סקרנית", "מעמיקה", "מרתקת"],
    age_persona: 55,
    background: "היסטוריונית, מרצה באוניברסיטה, מומחית לתרבות המזרח התיכון"
  },

  writingStyle: {
    tone: "educational_engaging",
    depth: "comprehensive",
    citations: true,
    contextual: true  // תמיד נותנת הקשר היסטורי
  },

  expertise: ["culture", "history", "museums", "architecture", "traditions"]
}
```

#### 7. **יעל ברק** - לייף-סטייל ובריאות
```typescript
{
  id: "yael_barak",
  name: "יעל ברק",
  personality: {
    type: "wellness_lifestyle",
    traits: ["מאוזנת", "אופטימית", "בריאותית", "השראתית"],
    age_persona: 35
  },

  writingStyle: {
    tone: "warm_inspiring",
    focus: ["wellness", "sustainability", "mindfulness"]
  },

  expertise: ["spas", "wellness_retreats", "healthy_dining", "eco_tourism"]
}
```

### קטגוריה 4: כתבים מיוחדים

#### 8. **אבי מזרחי** - עסקים וכלכלה
```typescript
{
  id: "avi_mizrachi",
  name: "אבי מזרחי",
  personality: {
    type: "business_analyst",
    traits: ["אנליטי", "ממוקד", "פרגמטי", "מקצועי"],
    age_persona: 48
  },

  writingStyle: {
    tone: "professional_informative",
    dataOriented: true,
    ROIFocused: true
  },

  expertise: ["business_travel", "conferences", "investment_opportunities", "real_estate"]
}
```

#### 9. **מאיה כהן** - משפחות וילדים
```typescript
{
  id: "maya_cohen",
  name: "מאיה כהן",
  personality: {
    type: "family_expert",
    traits: ["אמפתית", "פרקטית", "סבלנית", "מנוסה"],
    age_persona: 42,
    background: "אמא ל-3, מומחית לנסיעות עם ילדים"
  },

  writingStyle: {
    tone: "friendly_practical",
    emphasis: ["safety", "convenience", "value", "kid_friendliness"]
  },

  expertise: ["family_attractions", "kid_friendly_hotels", "educational_experiences"]
}
```

#### 10. **אדם לוי** - ספורט והרפתקאות
```typescript
{
  id: "adam_levi",
  name: "אדם לוי",
  personality: {
    type: "adventure_seeker",
    traits: ["אנרגטי", "אמיץ", "מעורר השראה", "פיזי"],
    age_persona: 30
  },

  writingStyle: {
    tone: "exciting_motivational",
    actionVerbs: true,
    challengeFocused: true
  },

  expertise: ["outdoor_activities", "extreme_sports", "desert_adventures", "water_sports"]
}
```

---

## 🗂️ סכמת מסד נתונים

```typescript
// shared/schema.ts - הוספות למערכת

// טבלת הכתבים
export const aiWriters = pgTable('ai_writers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  englishName: text('english_name'),
  avatar: text('avatar'),

  // אישיות
  personalityType: text('personality_type').notNull(),
  traits: text('traits').array(),
  agePersona: integer('age_persona'),
  background: text('background'),

  // סגנון כתיבה
  writingTone: text('writing_tone').notNull(),
  formalityLevel: real('formality_level').default(0.5),
  humorLevel: real('humor_level').default(0.3),
  storytellingLevel: real('storytelling_level').default(0.5),

  // התמחויות
  expertise: text('expertise').array(),
  targetAudience: text('target_audience').array(),
  contentTypes: text('content_types').array(),

  // חתימה אישית
  openingStyle: text('opening_style'),
  closingStyle: text('closing_style'),
  catchphrases: text('catchphrases').array(),
  useEmojis: boolean('use_emojis').default(false),

  // מטריקות
  articlesWritten: integer('articles_written').default(0),
  averageRating: real('average_rating'),

  // סטטוס
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// טבלת תבניות סגנון
export const writingStyleTemplates = pgTable('writing_style_templates', {
  id: serial('id').primaryKey(),
  writerId: text('writer_id').references(() => aiWriters.id),
  contentType: text('content_type').notNull(), // article, hotel_review, etc.

  // תבנית
  introTemplate: text('intro_template'),
  bodyStructure: jsonb('body_structure'),
  conclusionTemplate: text('conclusion_template'),

  // הנחיות ספציפיות
  toneGuidelines: text('tone_guidelines'),
  forbiddenPhrases: text('forbidden_phrases').array(),
  requiredElements: text('required_elements').array(),

  // דוגמאות
  exampleParagraphs: jsonb('example_paragraphs')
});

// טבלת הקצאת משימות
export const writerAssignments = pgTable('writer_assignments', {
  id: serial('id').primaryKey(),
  writerId: text('writer_id').references(() => aiWriters.id),
  contentId: integer('content_id'),
  contentType: text('content_type').notNull(),

  // סטטוס
  status: text('status').default('assigned'), // assigned, in_progress, completed, revision

  // תאריכים
  assignedAt: timestamp('assigned_at').defaultNow(),
  dueDate: timestamp('due_date'),
  completedAt: timestamp('completed_at'),

  // הערות
  editorNotes: text('editor_notes'),
  revisionCount: integer('revision_count').default(0)
});

// היסטוריית כתיבה
export const writerContentHistory = pgTable('writer_content_history', {
  id: serial('id').primaryKey(),
  writerId: text('writer_id').references(() => aiWriters.id),
  contentId: integer('content_id'),
  contentType: text('content_type'),

  // תוכן
  generatedContent: text('generated_content'),
  finalContent: text('final_content'),

  // מטריקות
  wordCount: integer('word_count'),
  readabilityScore: real('readability_score'),
  seoScore: real('seo_score'),

  // משוב
  editorRating: integer('editor_rating'),
  userEngagement: jsonb('user_engagement'),

  createdAt: timestamp('created_at').defaultNow()
});
```

---

## ⚙️ מנוע הכתיבה (Writing Engine)

### קובץ: `server/ai/writer-engine.ts`

```typescript
interface WriterContext {
  writer: AIWriter;
  contentType: ContentType;
  topic: string;
  targetLength: number;
  keywords?: string[];
  additionalContext?: Record<string, any>;
}

interface GeneratedContent {
  title: string;
  subtitle?: string;
  body: ContentBlock[];
  meta: {
    seoDescription: string;
    excerpt: string;
  };
  writerByline: string;
}

class AIWriterEngine {

  // יצירת פרומפט מותאם לכתב
  private buildWriterPrompt(context: WriterContext): string {
    const { writer, contentType, topic } = context;

    return `
אתה ${writer.name}, ${writer.background}.

## האישיות שלך:
- תכונות: ${writer.traits.join(', ')}
- גיל: ${writer.agePersona}
- סגנון: ${writer.writingTone}

## הנחיות כתיבה:
- רמת פורמליות: ${writer.formalityLevel * 100}% (0=שיחתי, 100=פורמלי)
- שימוש בהומור: ${writer.humorLevel * 100}%
- סיפוריות: ${writer.storytellingLevel * 100}%
${writer.useEmojis ? '- מותר להשתמש באימוג\'ים במידה' : '- אל תשתמש באימוג\'ים'}

## סגנון פתיחה: ${writer.openingStyle}
## סגנון סיום: ${writer.closingStyle}

## ביטויים אופייניים שלך:
${writer.catchphrases.map(p => `- "${p}"`).join('\n')}

## המשימה:
כתוב ${this.getContentTypeName(contentType)} על: ${topic}

זכור לשמור על הקול והסגנון הייחודיים שלך לאורך כל הכתבה.
    `;
  }

  // בחירת כתב מתאים אוטומטית
  async selectOptimalWriter(
    contentType: ContentType,
    topic: string,
    targetAudience?: string
  ): Promise<AIWriter> {
    const writers = await this.getActiveWriters();

    // ניקוד התאמה לכל כתב
    const scores = writers.map(writer => ({
      writer,
      score: this.calculateMatchScore(writer, contentType, topic, targetAudience)
    }));

    // מיון לפי ניקוד
    scores.sort((a, b) => b.score - a.score);

    return scores[0].writer;
  }

  private calculateMatchScore(
    writer: AIWriter,
    contentType: ContentType,
    topic: string,
    targetAudience?: string
  ): number {
    let score = 0;

    // התאמת תחום התמחות
    if (writer.expertise.some(e => topic.toLowerCase().includes(e))) {
      score += 30;
    }

    // התאמת סוג תוכן
    if (writer.contentTypes.includes(contentType)) {
      score += 25;
    }

    // התאמת קהל יעד
    if (targetAudience && writer.targetAudience.includes(targetAudience)) {
      score += 20;
    }

    // ניסיון קודם (יותר מאמרים = יותר ניקוד עד תקרה)
    score += Math.min(writer.articlesWritten / 10, 15);

    // דירוג ממוצע
    if (writer.averageRating) {
      score += writer.averageRating * 2;
    }

    return score;
  }

  // יצירת תוכן
  async generateContent(context: WriterContext): Promise<GeneratedContent> {
    const prompt = this.buildWriterPrompt(context);

    // שימוש במודל AI
    const response = await this.callAI(prompt, context);

    // עיבוד התוצאה
    const content = this.parseResponse(response);

    // הוספת חתימת הכתב
    content.writerByline = this.createByline(context.writer);

    // שמירת היסטוריה
    await this.saveToHistory(context.writer.id, content);

    return content;
  }

  private createByline(writer: AIWriter): string {
    return `מאת ${writer.name} | ${writer.background}`;
  }
}
```

---

## 🖥️ ממשק ניהול הכתבים

### רכיבי React מוצעים:

```
client/src/pages/admin/
├── writers/
│   ├── WritersManagement.tsx      # ניהול כתבים
│   ├── WriterProfile.tsx          # פרופיל כתב
│   ├── WriterEditor.tsx           # עריכת/יצירת כתב
│   ├── WriterAssignments.tsx      # הקצאת משימות
│   └── WriterAnalytics.tsx        # אנליטיקס לכתב
├── newsroom/
│   ├── NewsroomDashboard.tsx      # דשבורד מערכת
│   ├── AssignmentDesk.tsx         # שולחן הקצאות
│   ├── EditorialCalendar.tsx      # לוח שנה עריכתי
│   └── ContentQueue.tsx           # תור תכנים
```

### דשבורד מערכת העיתונות:

```typescript
// NewsroomDashboard.tsx
const NewsroomDashboard = () => {
  return (
    <div className="newsroom-dashboard">
      {/* סטטיסטיקות */}
      <div className="stats-grid">
        <StatCard title="כתבים פעילים" value={10} icon={<Users />} />
        <StatCard title="מאמרים השבוע" value={47} icon={<FileText />} />
        <StatCard title="ממתינים לעריכה" value={12} icon={<Clock />} />
        <StatCard title="דירוג ממוצע" value="4.7/5" icon={<Star />} />
      </div>

      {/* רשימת כתבים */}
      <WritersGrid writers={writers} />

      {/* משימות אחרונות */}
      <RecentAssignments />

      {/* לוח שנה עריכתי */}
      <EditorialCalendar />
    </div>
  );
};
```

---

## 🔄 תהליך העבודה

```
┌─────────────────────────────────────────────────────────────────┐
│                      CONTENT WORKFLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   1. ASSIGNMENT                                                  │
│   ┌─────────────┐                                               │
│   │  New Topic  │──▶ Auto-select writer OR Manual assignment    │
│   └─────────────┘                                               │
│         │                                                        │
│         ▼                                                        │
│   2. GENERATION                                                  │
│   ┌─────────────┐                                               │
│   │   Writer    │──▶ Generate content with personality          │
│   │   Engine    │                                               │
│   └─────────────┘                                               │
│         │                                                        │
│         ▼                                                        │
│   3. REVIEW                                                      │
│   ┌─────────────┐                                               │
│   │   Editor    │──▶ Review, approve, or request revision       │
│   │   Review    │                                               │
│   └─────────────┘                                               │
│         │                                                        │
│         ▼                                                        │
│   4. PUBLISH                                                     │
│   ┌─────────────┐                                               │
│   │  Published  │──▶ Track engagement, update writer stats      │
│   │   Content   │                                               │
│   └─────────────┘                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 תכונות מתקדמות

### 1. התאמת סגנון אוטומטית
```typescript
// התאמת הכתב לפלטפורמה
const adaptToChannel = (content: string, channel: 'web' | 'telegram' | 'newsletter') => {
  switch(channel) {
    case 'telegram':
      return shortenForTelegram(content);
    case 'newsletter':
      return formatForEmail(content);
    default:
      return content;
  }
};
```

### 2. שיתוף פעולה בין כתבים
```typescript
// מאמר משותף
const collaborativeArticle = await writerEngine.collaborate({
  mainWriter: 'michael_dror',      // כותב ראשי
  contributors: ['shira_almog'],    // תורמים
  topic: 'המדריך המלא לחופשה בדובאי',
  sections: {
    intro: 'michael_dror',
    food_section: 'shira_almog',
    conclusion: 'michael_dror'
  }
});
```

### 3. עקביות קול הכתב
```typescript
// בדיקת עקביות
const validateVoice = (content: string, writer: AIWriter): VoiceConsistencyScore => {
  return {
    toneMatch: analyzeTone(content, writer.writingTone),
    vocabularyMatch: analyzeVocabulary(content, writer.formalityLevel),
    signatureUsage: checkCatchphrases(content, writer.catchphrases),
    overallScore: calculateOverall()
  };
};
```

### 4. למידה והתפתחות
```typescript
// שיפור מתמיד מבוסס משוב
const improveWriter = async (writerId: string) => {
  const feedback = await getEditorFeedback(writerId);
  const engagement = await getUserEngagement(writerId);

  // עדכון הנחיות הכתב בהתאם
  await updateWriterGuidelines(writerId, {
    improveAreas: feedback.lowScoreAreas,
    emphasize: engagement.highPerformingElements
  });
};
```

---

## 📁 מבנה קבצים מוצע

```
server/ai/
├── writers/
│   ├── writer-engine.ts           # מנוע ראשי
│   ├── writer-registry.ts         # רישום כתבים
│   ├── writer-prompts.ts          # תבניות פרומפט
│   ├── writer-analytics.ts        # אנליטיקס
│   ├── voice-validator.ts         # בדיקת עקביות
│   └── assignment-system.ts       # מערכת הקצאות
├── writers-data/
│   ├── personalities.json         # הגדרות אישיות
│   ├── style-templates.json       # תבניות סגנון
│   └── catchphrases.json          # ביטויים אופייניים

client/src/
├── pages/admin/writers/
│   ├── index.tsx
│   ├── WritersManagement.tsx
│   ├── WriterProfile.tsx
│   ├── WriterEditor.tsx
│   └── WriterAnalytics.tsx
├── components/writers/
│   ├── WriterCard.tsx
│   ├── WriterAvatar.tsx
│   ├── WritingStyleBadge.tsx
│   └── PersonalityTraits.tsx
```

---

## 🚀 שלבי מימוש מוצעים

### שלב 1: תשתית בסיסית
- [ ] יצירת טבלאות מסד נתונים
- [ ] מחלקת `AIWriter` בסיסית
- [ ] API endpoints ראשוניים

### שלב 2: כתבים ראשונים
- [ ] הגדרת 3-5 כתבים ראשונים
- [ ] בניית מנוע הפרומפטים
- [ ] אינטגרציה עם OpenAI/Gemini

### שלב 3: ממשק ניהול
- [ ] דשבורד כתבים
- [ ] עריכת פרופיל כתב
- [ ] מערכת הקצאות

### שלב 4: תכונות מתקדמות
- [ ] בדיקת עקביות קול
- [ ] שיתוף פעולה בין כתבים
- [ ] אנליטיקס והתאמה

---

## 💡 רעיונות נוספים

1. **"חדר כתבים" חי** - ויזואליזציה של הכתבים עובדים
2. **סגנון לפי שעה** - כתבים שונים לפי שעות היום
3. **תחרויות כתבים** - מי כתב הכי טוב השבוע?
4. **קול קורא** - הכתבים "מתווכחים" על נושאים
5. **מנטורינג** - כתבים ותיקים מלמדים חדשים

---

*תוכנית זו מהווה בסיס לדיון ותכנון. נשמח לשמוע משוב והערות!*
