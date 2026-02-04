/**
 * Prompt Generator Module Prompts
 *
 * Role: Create precise writing instructions optimized for AEO and SEO
 * Ensures content is structured for AI citation and multilingual translation
 */

export const PROMPT_GENERATOR_PROMPTS = {
  /**
   * System prompt for generating writer instructions
   */
  SYSTEM: `You are an expert prompt engineer specializing in travel content creation.
Your task is to generate precise writing instructions that will produce content optimized for:

1. **Answer Engine Optimization (AEO)**: Content that AI assistants will cite
2. **Search Engine Optimization (SEO)**: Content that ranks in Google and AI Overviews
3. **Multilingual Scalability**: Content that translates well to 30+ languages
4. **E-E-A-T Compliance**: Content that demonstrates expertise and trustworthiness

## Core Requirements for Every Prompt:

### AEO Structure (Mandatory)
- Direct answer in first 2-4 sentences after each H2/H3
- FAQ section with 5-7 common questions
- Clear, unambiguous facts that can be extracted
- Schema-ready content (FAQ, HowTo, Event, Place)

### SEO Structure (Mandatory)
- Primary keyword in title, H1, first paragraph
- Secondary keywords naturally distributed
- Meta description optimized for CTR
- Internal linking opportunities identified

### Translation-Ready Structure (Mandatory)
- Simple semantic structure (Subject-Verb-Object)
- Avoid idioms and culturally-specific references
- Use internationally understood terminology
- Keep sentences under 25 words average

### Tone & Voice Guidelines
- Match the assigned writer persona
- Maintain consistent perspective (first-person experience vs. third-person analysis)
- Balance authority with accessibility
- Include sensory details where appropriate

Generate the complete writer prompt in JSON format.`,

  /**
   * User prompt template for generating writer instructions
   */
  USER_TEMPLATE: `Generate a comprehensive writing prompt for the following assignment:

**Story Details:**
- Title: {title}
- Summary: {summary}
- Source: {sourceName}
- Category: {category}
- Tier: {tier} (S1=breaking/exclusive, S2=high-value, S3=general)

**Assigned Writer:**
- ID: {writerId}
- Name: {writerName}
- Specialization: {writerSpecialization}
- Tone: {writerTone}

**Evaluation Scores:**
- SEO: {seoScore}/100 (Keywords: {keywords})
- AEO: {aeoScore}/100 (Schema potential: {schemaPotential})
- Virality: {viralityScore}/100 (Triggers: {emotionalTriggers})

**Target Output:**
- Word count: {wordCount}
- Target audience: {targetAudience}
- Content type: {contentType}

Generate the writer prompt:

{
  "writerPrompt": {
    "role": "<writer persona description>",
    "context": "<background information and why this story matters>",
    "objective": "<clear goal for the article>",
    "structure": {
      "headline": "<guidance for headline creation>",
      "hook": "<first paragraph requirements - direct answer>",
      "sections": [
        {
          "heading": "<H2 topic>",
          "requirements": "<what to cover>",
          "aeoNote": "<how to make this section extractable>"
        }
      ],
      "faq": {
        "required": true,
        "minQuestions": 5,
        "guidance": "<types of questions to answer>"
      },
      "conclusion": "<call-to-action and wrap-up guidance>"
    },
    "seoRequirements": {
      "primaryKeyword": "<main keyword>",
      "secondaryKeywords": ["<keyword2>", "<keyword3>"],
      "metaDescription": "<template or guidance>",
      "internalLinks": ["<suggested link topics>"]
    },
    "aeoRequirements": {
      "directAnswerFormat": "<how to structure for AI extraction>",
      "schemaType": "<recommended schema markup>",
      "factChecklist": ["<fact 1 to include>", "<fact 2 to include>"]
    },
    "toneGuidance": {
      "voice": "<first-person/third-person>",
      "style": "<analytical/narrative/practical>",
      "emotionalTone": "<excitement/urgency/reassurance>",
      "expertise": "<how to demonstrate E-E-A-T>"
    },
    "translationNotes": {
      "avoidIdioms": true,
      "simpleSentences": true,
      "culturalNeutrality": "<specific guidance>"
    },
    "qualityChecklist": [
      "Direct answer within first 100 words",
      "FAQ section with 5+ questions",
      "All facts are verifiable",
      "No AI-detectable patterns",
      "Sensory details included",
      "Clear value proposition"
    ]
  }
}`,

  /**
   * Hebrew version
   */
  SYSTEM_HE: `צור הנחיית כתיבה (Writer Prompt) עבור הכתב שנבחר. ההנחיה חייבת לכלול:

## מבנה AEO קשיח
הנחה את הכתב לספק תשובה ישירה בת 2-4 משפטים מיד לאחר כותרות המשנה.
כל סעיף חייב להתחיל בעובדה ברורה שמנוע AI יכול לצטט.

## אופטימיזציית מנועי מענה
דרוש שימוש במבנה של שאלות ותשובות (FAQ) כדי להגדיל סיכוי לציטוט ב-AI.
כלול לפחות 5 שאלות נפוצות עם תשובות תמציתיות.

## נימה (Tone)
התאמה לפרסונה הנבחרת:
- נימה אנליטית ומבוססת נתונים עבור הכתב התעופתי
- נימה חווייתית ותיאורית עבור כתב היעדים
- נימה מעשית וממוקדת עבור כתב הטכנולוגיה

## דרישת רב-לשוניות
הנחיה לשמור על מבנה סמנטי פשוט שיאפשר תרגום איכותי ל-30 שפות ללא אובדן משמעות:
- משפטים קצרים (עד 25 מילים)
- הימנעות מביטויים אידיומטיים
- שימוש במונחים בינלאומיים`,

  /**
   * Tier-specific prompt modifiers
   */
  TIER_MODIFIERS: {
    S1: {
      depth: 'comprehensive',
      wordCount: '1500-2500',
      requiresGraphics: true,
      requiresExpertQuotes: true,
      reviewLevel: 'senior_editor',
      urgency: 'immediate',
      additionalRequirements: [
        'Include timeline of events',
        'Add impact analysis section',
        'Provide actionable advice for travelers',
        'Include official source citations',
      ],
    },
    S2: {
      depth: 'detailed',
      wordCount: '800-1200',
      requiresGraphics: false,
      requiresExpertQuotes: false,
      reviewLevel: 'editor',
      urgency: 'same_day',
      additionalRequirements: [
        'Focus on practical information',
        'Include booking/planning tips',
        'Add comparison with alternatives',
      ],
    },
    S3: {
      depth: 'standard',
      wordCount: '500-800',
      requiresGraphics: false,
      requiresExpertQuotes: false,
      reviewLevel: 'auto_review',
      urgency: 'queued',
      additionalRequirements: [
        'Keep it concise and factual',
        'Focus on single main point',
        'Quick read format',
      ],
    },
  },
};
