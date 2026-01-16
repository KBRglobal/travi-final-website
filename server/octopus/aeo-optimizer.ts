/**
 * Octopus Engine - AEO Optimizer
 * Answer Engine Optimization for Featured Snippets, Quick Answers, and FAQ generation
 *
 * Based on TRAVI SEO/AEO best practices:
 * - Featured Snippets: Format varies by question type
 * - Quick Answer: 40-60 words max
 * - FAQ: 40% PAA + 30% document + 30% AI
 */

import { log } from '../lib/logger';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[AEO Optimizer] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) => log.error(`[AEO Optimizer] ${msg}`, undefined, data),
};

// ============================================================================
// Types
// ============================================================================

export interface QuickAnswer {
  question: string;
  answer: string;
  wordCount: number;
  format: SnippetFormat;
  targetSnippet: boolean;
}

export type SnippetFormat = 'paragraph' | 'numbered-list' | 'bullet-list' | 'table' | 'steps';

export interface FAQItem {
  question: string;
  answer: string;
  source: 'paa' | 'document' | 'ai';
  priority: number;
}

export interface FAQSection {
  items: FAQItem[];
  schemaMarkup: Record<string, unknown>;
}

export interface FeaturedSnippetContent {
  format: SnippetFormat;
  heading: string;
  content: string;
  htmlContent: string;
}

export type QuestionType =
  | 'what-is'      // "What is desert safari Dubai" → paragraph
  | 'best'         // "Best hotels in Dubai Marina" → numbered list
  | 'how-to'       // "How to get from Dubai Airport" → steps
  | 'how-much'     // "How much does X cost" → paragraph with number
  | 'comparison'   // "Dubai Marina vs Downtown" → table
  | 'is-it'        // "Is Capella Bangkok worth it" → Yes/No + explanation
  | 'where'        // "Where to eat in Bangkok" → list
  | 'when'         // "When to visit Bangkok" → paragraph
  | 'general';     // Default

// ============================================================================
// Question Type Detection
// ============================================================================

/**
 * Detect question type from a question string
 */
export function detectQuestionType(question: string): QuestionType {
  const q = question.toLowerCase();

  // Hebrew patterns
  if (/^מה זה|^מהו|^מהי|^what is|^what are/i.test(q)) return 'what-is';
  if (/^הכי טוב|^הטוב ביותר|^best|^top \d+/i.test(q)) return 'best';
  if (/^איך|^כיצד|^how to|^how do/i.test(q)) return 'how-to';
  if (/^כמה עולה|^מה המחיר|^how much|^what.*cost|^price/i.test(q)) return 'how-much';
  if (/מול|לעומת|או|vs\.?|versus|compared to/i.test(q)) return 'comparison';
  if (/^האם|^שווה|^is it|^is .* worth|^should/i.test(q)) return 'is-it';
  if (/^איפה|^היכן|^where/i.test(q)) return 'where';
  if (/^מתי|^when|^best time/i.test(q)) return 'when';

  return 'general';
}

/**
 * Get the optimal format for a question type
 */
export function getOptimalFormat(questionType: QuestionType): SnippetFormat {
  const formatMap: Record<QuestionType, SnippetFormat> = {
    'what-is': 'paragraph',
    'best': 'numbered-list',
    'how-to': 'steps',
    'how-much': 'paragraph',
    'comparison': 'table',
    'is-it': 'paragraph',
    'where': 'bullet-list',
    'when': 'paragraph',
    'general': 'paragraph',
  };

  return formatMap[questionType];
}

// ============================================================================
// Quick Answer Generator
// ============================================================================

/**
 * Generate a quick answer optimized for Featured Snippets
 * Target: 40-60 words maximum
 */
export function generateQuickAnswer(
  question: string,
  context: {
    entityName: string;
    entityType: 'hotel' | 'restaurant' | 'attraction' | 'neighborhood' | 'destination';
    keyFacts: string[];
    recommendation?: string;
    price?: string;
    rating?: number;
  }
): QuickAnswer {
  const questionType = detectQuestionType(question);
  const format = getOptimalFormat(questionType);

  let answer: string;

  switch (questionType) {
    case 'is-it':
      answer = generateIsItAnswer(context);
      break;
    case 'how-much':
      answer = generatePriceAnswer(context);
      break;
    case 'best':
      answer = generateBestAnswer(context);
      break;
    case 'when':
      answer = generateWhenAnswer(context);
      break;
    case 'where':
      answer = generateWhereAnswer(context);
      break;
    default:
      answer = generateDefaultAnswer(context);
  }

  // Ensure 40-60 word limit
  const words = answer.split(/\s+/);
  if (words.length > 60) {
    answer = words.slice(0, 58).join(' ') + '.';
  }

  return {
    question,
    answer,
    wordCount: answer.split(/\s+/).length,
    format,
    targetSnippet: true,
  };
}

function generateIsItAnswer(context: {
  entityName: string;
  entityType: string;
  keyFacts: string[];
  recommendation?: string;
  rating?: number;
}): string {
  const { entityName, keyFacts, recommendation, rating } = context;

  const verdict = rating && rating >= 4.5 ? 'Yes' : rating && rating >= 4 ? 'Yes, generally' : 'It depends';
  const hebrewVerdict = rating && rating >= 4.5 ? 'כן' : rating && rating >= 4 ? 'כן, בהחלט' : 'תלוי בציפיות';

  const factsList = keyFacts.slice(0, 2).join('. ');

  return `${hebrewVerdict}. ${entityName} ${recommendation || factsList}. ${keyFacts[0] ? `היתרון העיקרי: ${keyFacts[0]}.` : ''}`;
}

function generatePriceAnswer(context: {
  entityName: string;
  price?: string;
  keyFacts: string[];
}): string {
  const { entityName, price, keyFacts } = context;

  if (price) {
    return `המחיר ב${entityName} מתחיל מ-${price}. ${keyFacts[0] || ''} מומלץ להזמין מראש לקבלת המחירים הטובים ביותר.`;
  }

  return `מחירים ב${entityName} משתנים לפי עונה ותפוסה. ${keyFacts[0] || ''} צרו קשר לקבלת הצעת מחיר עדכנית.`;
}

function generateBestAnswer(context: {
  entityName: string;
  entityType: string;
  keyFacts: string[];
}): string {
  const { entityName, entityType, keyFacts } = context;

  return `${entityName} נחשב לאחד ה${getEntityTypeHebrew(entityType)} המומלצים ביותר. ${keyFacts.slice(0, 2).join('. ')}.`;
}

function generateWhenAnswer(context: {
  entityName: string;
  keyFacts: string[];
}): string {
  const { entityName, keyFacts } = context;

  return `הזמן הטוב ביותר לבקר ב${entityName} הוא ${keyFacts[0] || 'בעונת היובש'}. ${keyFacts[1] || 'מזג האוויר נוח וההמונים קטנים יותר'}.`;
}

function generateWhereAnswer(context: {
  entityName: string;
  keyFacts: string[];
}): string {
  const { entityName, keyFacts } = context;

  return `${entityName} ממוקם ב${keyFacts[0] || 'מיקום מרכזי'}. ${keyFacts[1] || 'נגיש בתחבורה ציבורית'}.`;
}

function generateDefaultAnswer(context: {
  entityName: string;
  entityType: string;
  keyFacts: string[];
}): string {
  const { entityName, entityType, keyFacts } = context;

  return `${entityName} הוא ${getEntityTypeHebrew(entityType)} ${keyFacts[0] || 'מומלץ'}. ${keyFacts.slice(1, 3).join('. ')}.`;
}

function getEntityTypeHebrew(type: string): string {
  const map: Record<string, string> = {
    'hotel': 'מלון',
    'restaurant': 'מסעדה',
    'attraction': 'אטרקציה',
    'neighborhood': 'שכונה',
    'destination': 'יעד',
  };
  return map[type] || type;
}

// ============================================================================
// Featured Snippet Formatter
// ============================================================================

/**
 * Format content for Featured Snippet targeting
 */
export function formatForFeaturedSnippet(
  heading: string,
  content: string | string[] | Record<string, string>[],
  format: SnippetFormat
): FeaturedSnippetContent {
  let htmlContent: string;
  let textContent: string;

  switch (format) {
    case 'numbered-list':
      const numberedItems = Array.isArray(content) ? content : content.split('\n').filter(Boolean);
      htmlContent = `<h2>${heading}</h2>\n<ol>\n${numberedItems.map(item => `  <li>${item}</li>`).join('\n')}\n</ol>`;
      textContent = numberedItems.map((item, i) => `${i + 1}. ${item}`).join('\n');
      break;

    case 'bullet-list':
      const bulletItems = Array.isArray(content) ? content : content.split('\n').filter(Boolean);
      htmlContent = `<h2>${heading}</h2>\n<ul>\n${bulletItems.map(item => `  <li>${item}</li>`).join('\n')}\n</ul>`;
      textContent = bulletItems.map(item => `• ${item}`).join('\n');
      break;

    case 'steps':
      const steps = Array.isArray(content) ? content : content.split('\n').filter(Boolean);
      htmlContent = `<h2>${heading}</h2>\n<ol class="steps">\n${steps.map((step, i) => `  <li><strong>שלב ${i + 1}:</strong> ${step}</li>`).join('\n')}\n</ol>`;
      textContent = steps.map((step, i) => `שלב ${i + 1}: ${step}`).join('\n');
      break;

    case 'table':
      // For tables, content should be an array of objects
      if (Array.isArray(content) && content.length > 0 && typeof content[0] === 'object' && content[0] !== null) {
        const tableData = content as Record<string, string>[];
        const headers = Object.keys(tableData[0]);
        htmlContent = `<h2>${heading}</h2>\n<table>\n  <thead>\n    <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>\n  </thead>\n  <tbody>\n${tableData.map(row => `    <tr>${headers.map(h => `<td>${row[h]}</td>`).join('')}</tr>`).join('\n')}\n  </tbody>\n</table>`;
        textContent = `${headers.join(' | ')}\n${tableData.map(row => headers.map(h => row[h]).join(' | ')).join('\n')}`;
      } else if (Array.isArray(content)) {
        htmlContent = `<h2>${heading}</h2>\n<p>${(content as string[]).join(' ')}</p>`;
        textContent = (content as string[]).join(' ');
      } else {
        htmlContent = `<h2>${heading}</h2>\n<p>${content}</p>`;
        textContent = content as string;
      }
      break;

    case 'paragraph':
    default:
      if (Array.isArray(content)) {
        textContent = (content as string[]).join(' ');
      } else {
        textContent = content as string;
      }
      htmlContent = `<h2>${heading}</h2>\n<p>${textContent}</p>`;
      break;
  }

  return {
    format,
    heading,
    content: textContent,
    htmlContent,
  };
}

/**
 * Generate "Is X Worth It?" format (proven winner for Featured Snippets)
 */
export function generateWorthItSnippet(
  entityName: string,
  isWorth: boolean,
  shortAnswer: string,
  keyPoints: string[]
): FeaturedSnippetContent {
  const verdict = isWorth ? 'כן' : 'לא בהכרח';

  const htmlContent = `<h2>האם ${entityName} שווה את זה?</h2>
<p><strong>${verdict}</strong> - ${shortAnswer}</p>
<h3>נקודות עיקריות:</h3>
<ul>
${keyPoints.map(point => `  <li>${point}</li>`).join('\n')}
</ul>`;

  const textContent = `${verdict} - ${shortAnswer}\n\nנקודות עיקריות:\n${keyPoints.map(p => `• ${p}`).join('\n')}`;

  return {
    format: 'paragraph',
    heading: `האם ${entityName} שווה את זה?`,
    content: textContent,
    htmlContent,
  };
}

// ============================================================================
// FAQ Generator
// ============================================================================

/**
 * Generate FAQ section with proper distribution:
 * - 40% from PAA (provided)
 * - 30% from document content
 * - 30% AI-generated
 */
export function generateFAQSection(
  entityName: string,
  entityType: 'hotel' | 'restaurant' | 'attraction' | 'neighborhood',
  paaQuestions: string[],
  documentQuestions: { question: string; answer: string }[],
  context: Record<string, unknown>
): FAQSection {
  const items: FAQItem[] = [];

  // 1. Add PAA questions (40%)
  const paaLimit = Math.max(4, Math.ceil(paaQuestions.length * 0.4));
  for (const question of paaQuestions.slice(0, paaLimit)) {
    items.push({
      question,
      answer: generateAnswerForPAA(question, entityName, entityType, context),
      source: 'paa',
      priority: 1,
    });
  }

  // 2. Add document questions (30%)
  const docLimit = Math.max(3, Math.ceil(documentQuestions.length * 0.3));
  for (const { question, answer } of documentQuestions.slice(0, docLimit)) {
    items.push({
      question,
      answer,
      source: 'document',
      priority: 2,
    });
  }

  // 3. Generate AI questions if needed (30%)
  const targetTotal = 10;
  const aiNeeded = Math.max(0, targetTotal - items.length);

  if (aiNeeded > 0) {
    const aiQuestions = generateAIQuestions(entityName, entityType, context, aiNeeded);
    items.push(...aiQuestions);
  }

  // Sort by priority
  items.sort((a, b) => a.priority - b.priority);

  // Generate FAQPage schema
  const schemaMarkup = generateFAQSchema(items);

  return {
    items: items.slice(0, 10), // Max 10 FAQs
    schemaMarkup,
  };
}

function generateAnswerForPAA(
  question: string,
  entityName: string,
  entityType: string,
  context: Record<string, unknown>
): string {
  // Generate contextual answer based on question type
  const questionType = detectQuestionType(question);

  const quickAnswer = generateQuickAnswer(question, {
    entityName,
    entityType: entityType as 'hotel' | 'restaurant' | 'attraction' | 'neighborhood',
    keyFacts: context.keyFacts as string[] || [],
    recommendation: context.recommendation as string,
    price: context.price as string,
    rating: context.rating as number,
  });

  return quickAnswer.answer;
}

function generateAIQuestions(
  entityName: string,
  entityType: string,
  context: Record<string, unknown>,
  count: number
): FAQItem[] {
  // Common questions templates by entity type
  const questionTemplates: Record<string, string[]> = {
    hotel: [
      `מה שעות הצ'ק-אין והצ'ק-אאוט ב{name}?`,
      `האם יש חניה ב{name}?`,
      `האם {name} מתאים למשפחות עם ילדים?`,
      `מה המרחק מ{name} לאטרקציות המרכזיות?`,
      `האם יש בריכה ב{name}?`,
      `האם ארוחת בוקר כלולה ב{name}?`,
    ],
    restaurant: [
      `מה שעות הפתיחה של {name}?`,
      `האם צריך הזמנה מראש ב{name}?`,
      `האם יש אפשרויות צמחוניות ב{name}?`,
      `מה טווח המחירים ב{name}?`,
      `האם {name} מתאים לילדים?`,
    ],
    attraction: [
      `כמה זמן לוקח לבקר ב{name}?`,
      `מה מחיר הכניסה ל{name}?`,
      `מה השעות הכי טובות לבקר ב{name}?`,
      `האם {name} מתאים לילדים?`,
      `איך מגיעים ל{name}?`,
    ],
    neighborhood: [
      `האם {name} בטוח לתיירים?`,
      `מה הדרך הכי טובה להגיע ל{name}?`,
      `מה הדברים הכי טובים לעשות ב{name}?`,
      `האם כדאי לגור ב{name}?`,
    ],
  };

  const templates = questionTemplates[entityType] || questionTemplates.attraction;
  const questions: FAQItem[] = [];

  for (let i = 0; i < Math.min(count, templates.length); i++) {
    const question = templates[i].replace('{name}', entityName);
    questions.push({
      question,
      answer: generateGenericAnswer(question, entityName, entityType, context),
      source: 'ai',
      priority: 3,
    });
  }

  return questions;
}

function generateGenericAnswer(
  question: string,
  entityName: string,
  entityType: string,
  context: Record<string, unknown>
): string {
  // Generate a contextual answer
  const lowerQ = question.toLowerCase();

  if (lowerQ.includes('שעות') || lowerQ.includes('פתיחה')) {
    return `לקבלת שעות הפעילות העדכניות של ${entityName}, מומלץ לבדוק באתר הרשמי או ליצור קשר ישירות.`;
  }

  if (lowerQ.includes('מחיר') || lowerQ.includes('עולה')) {
    const price = context.price as string;
    return price
      ? `המחיר ב${entityName} מתחיל מ-${price}. מחירים עשויים להשתנות לפי עונה ותפוסה.`
      : `מחירים ב${entityName} משתנים. מומלץ לבדוק את האתר הרשמי למחירים עדכניים.`;
  }

  if (lowerQ.includes('מתאים') && (lowerQ.includes('ילדים') || lowerQ.includes('משפחות'))) {
    return `${entityName} מציע חוויה מתאימה למשפחות. מומלץ לבדוק את המתקנים והשירותים הספציפיים לפני הביקור.`;
  }

  if (lowerQ.includes('איך מגיעים') || lowerQ.includes('הגעה')) {
    return `ניתן להגיע ל${entityName} בתחבורה ציבורית או ברכב פרטי. מומלץ לבדוק את מפות גוגל לקבלת מסלול מדויק.`;
  }

  return `למידע נוסף על ${entityName}, מומלץ לקרוא את המדריך המלא שלנו או ליצור קשר ישירות.`;
}

// ============================================================================
// FAQ Schema Generator
// ============================================================================

/**
 * Generate FAQPage schema markup
 */
export function generateFAQSchema(items: FAQItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

// ============================================================================
// Comparison Table Generator
// ============================================================================

export interface ComparisonRow {
  feature: string;
  values: string[];
}

export interface ComparisonTable {
  title: string;
  entities: string[];
  rows: ComparisonRow[];
  htmlContent: string;
  schemaMarkup: Record<string, unknown>;
}

/**
 * Generate a comparison table for Featured Snippets
 */
export function generateComparisonTable(
  title: string,
  entities: { name: string; data: Record<string, string | number> }[]
): ComparisonTable {
  const entityNames = entities.map(e => e.name);

  // Get all unique features
  const allFeatures = new Set<string>();
  entities.forEach(e => Object.keys(e.data).forEach(k => allFeatures.add(k)));

  const rows: ComparisonRow[] = Array.from(allFeatures).map(feature => ({
    feature,
    values: entities.map(e => String(e.data[feature] || '-')),
  }));

  // Generate HTML table
  const htmlContent = `<h2>${title}</h2>
<table>
  <thead>
    <tr>
      <th></th>
      ${entityNames.map(name => `<th>${name}</th>`).join('\n      ')}
    </tr>
  </thead>
  <tbody>
${rows.map(row => `    <tr>
      <td><strong>${row.feature}</strong></td>
      ${row.values.map(v => `<td>${v}</td>`).join('\n      ')}
    </tr>`).join('\n')}
  </tbody>
</table>`;

  // Generate schema
  const schemaMarkup = {
    '@context': 'https://schema.org',
    '@type': 'Table',
    about: title,
  };

  return {
    title,
    entities: entityNames,
    rows,
    htmlContent,
    schemaMarkup,
  };
}

// ============================================================================
// AEO Content Optimizer
// ============================================================================

export interface AEOOptimizedContent {
  quickAnswer: QuickAnswer;
  featuredSnippet: FeaturedSnippetContent;
  faqSection: FAQSection;
  comparisonTable?: ComparisonTable;
  speakableContent: string;
}

/**
 * Generate fully AEO-optimized content for an entity
 */
export function optimizeForAEO(
  entityName: string,
  entityType: 'hotel' | 'restaurant' | 'attraction' | 'neighborhood',
  content: {
    mainQuestion: string;
    keyFacts: string[];
    recommendation?: string;
    price?: string;
    rating?: number;
    paaQuestions?: string[];
    documentQuestions?: { question: string; answer: string }[];
    comparisonEntities?: { name: string; data: Record<string, string | number> }[];
  }
): AEOOptimizedContent {
  // 1. Generate Quick Answer
  const quickAnswer = generateQuickAnswer(content.mainQuestion, {
    entityName,
    entityType,
    keyFacts: content.keyFacts,
    recommendation: content.recommendation,
    price: content.price,
    rating: content.rating,
  });

  // 2. Generate Featured Snippet
  const isWorthQuestion = /worth|שווה/i.test(content.mainQuestion);
  const featuredSnippet = isWorthQuestion
    ? generateWorthItSnippet(
        entityName,
        (content.rating || 0) >= 4,
        content.recommendation || content.keyFacts[0] || '',
        content.keyFacts.slice(0, 3)
      )
    : formatForFeaturedSnippet(
        content.mainQuestion,
        quickAnswer.answer,
        quickAnswer.format
      );

  // 3. Generate FAQ Section
  const faqSection = generateFAQSection(
    entityName,
    entityType,
    content.paaQuestions || [],
    content.documentQuestions || [],
    {
      keyFacts: content.keyFacts,
      price: content.price,
      rating: content.rating,
      recommendation: content.recommendation,
    }
  );

  // 4. Generate Comparison Table if entities provided
  let comparisonTable: ComparisonTable | undefined;
  if (content.comparisonEntities && content.comparisonEntities.length >= 2) {
    comparisonTable = generateComparisonTable(
      `השוואה: ${content.comparisonEntities.map(e => e.name).join(' מול ')}`,
      content.comparisonEntities
    );
  }

  // 5. Generate speakable content (for voice search)
  const speakableContent = `${entityName}. ${quickAnswer.answer}`;

  return {
    quickAnswer,
    featuredSnippet,
    faqSection,
    comparisonTable,
    speakableContent,
  };
}

// ============================================================================
// Export utilities
// ============================================================================

export function getAEOStats(content: AEOOptimizedContent): {
  quickAnswerWords: number;
  faqCount: number;
  hasComparison: boolean;
  targetFormats: string[];
} {
  return {
    quickAnswerWords: content.quickAnswer.wordCount,
    faqCount: content.faqSection.items.length,
    hasComparison: !!content.comparisonTable,
    targetFormats: [
      content.quickAnswer.format,
      content.featuredSnippet.format,
    ],
  };
}
