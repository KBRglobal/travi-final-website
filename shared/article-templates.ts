/**
 * SEO+AEO Article Templates for TRAVI CMS
 * 
 * These templates define the exact structure AI should follow when generating content.
 * Templates support variable substitution using {{variable}} syntax.
 */

export interface ArticleTemplateSection {
  heading: string;
  instructions: string;
  required: boolean;
  order: number;
}

export interface ArticleTemplate {
  id: string;
  name: string;
  nameHe: string;
  contentTypes: string[];
  metaTitleFormat: string;
  metaTitleMaxLength: number;
  metaDescriptionFormat: string;
  metaDescriptionMaxLength: number;
  openingParagraphInstructions: string;
  sections: ArticleTemplateSection[];
  faqInstructions: string;
  ctaFormat: string;
}

export const SEO_AEO_TOURISM_TEMPLATE: ArticleTemplate = {
  id: "seo-aeo-tourism",
  name: "SEO+AEO Tourism Article",
  nameHe: "מאמר תיירותי מותאם SEO+AEO",
  contentTypes: ["attraction", "hotel", "dining", "district", "article", "event"],
  metaTitleFormat: "[Primary Keyword] + [Benefit/Number] + [Year] | TRAVI",
  metaTitleMaxLength: 60,
  metaDescriptionFormat: "Direct answer + CTA + Primary keyword",
  metaDescriptionMaxLength: 155,
  openingParagraphInstructions: `Write exactly 4 sentences that answer: What is it + Where is it + Who is it for + How much does it cost.
The FIRST sentence must be a complete, standalone answer.
Example: "Burj Khalifa is the world's tallest building (828 meters) located in Downtown Dubai, with observation decks on floors 124-148 starting at 149 AED."`,
  sections: [
    {
      heading: "Overview",
      instructions: "What it is, why it matters, background context. Write 2 substantial paragraphs.",
      required: true,
      order: 1
    },
    {
      heading: "Practical Visit Information",
      instructions: `Include all of these with icons:
- Address: Exact location with landmark references
- Hours: Operating hours including holiday variations
- Prices: By category (adult/child/senior/group)
- Duration: Recommended visit length
- Getting There: Metro station, taxi tips, parking info`,
      required: true,
      order: 2
    },
    {
      heading: "Who Is It For?",
      instructions: `Create a table with audience suitability ratings:
| Audience | Rating | Notes |
|----------|--------|-------|
| Families with children | Rating 1-5 stars | Specific notes |
| Couples | Rating 1-5 stars | Specific notes |
| Solo travelers | Rating 1-5 stars | Specific notes |
| Business travelers | Rating 1-5 stars | Specific notes |
| Seniors | Rating 1-5 stars | Specific notes |`,
      required: true,
      order: 3
    },
    {
      heading: "Essential Tips You Need to Know",
      instructions: "Provide 7 numbered tips. Each tip should be maximum 2 sentences. Focus on insider knowledge, money-saving tips, best times to visit, and things to avoid.",
      required: true,
      order: 4
    },
    {
      heading: "What to Expect During Your Visit",
      instructions: "Describe the experience step-by-step from arrival to departure. Write 3-4 detailed paragraphs covering the journey through the attraction/venue.",
      required: true,
      order: 5
    },
    {
      heading: "Nearby Attractions",
      instructions: "List 3-5 nearby places with walking/driving distance. Include internal links to each. Format: Name (distance) - brief description.",
      required: true,
      order: 6
    }
  ],
  faqInstructions: `Generate 5-7 FAQs about {{topic}}. Include questions about:
- Entry price/cost
- Best time to visit
- How long to spend there
- What to wear/bring
- Accessibility
- Booking requirements
- Child-friendliness`,
  ctaFormat: `[Book tickets at the best price]({{booking_link}})`
};

export const LISTICLE_TEMPLATE: ArticleTemplate = {
  id: "listicle",
  name: "Top X Listicle Article",
  nameHe: "מאמר רשימה - X הכי טובים",
  contentTypes: ["article"],
  metaTitleFormat: "Top [Number] [Topic] in [Destination] [Year] | TRAVI",
  metaTitleMaxLength: 60,
  metaDescriptionFormat: "Discover the top [number] [topic]. Includes [key benefit]. Updated for [year].",
  metaDescriptionMaxLength: 155,
  openingParagraphInstructions: `Start with a direct statement: "The top [number] [topic] in [destination] include [top 3 items briefly]."
Follow with why this matters and what criteria was used for selection.`,
  sections: [
    {
      heading: "Quick Overview",
      instructions: "Brief summary table of all items with key info (name, location, price range, best for)",
      required: true,
      order: 1
    },
    {
      heading: "1. [First Item]",
      instructions: "Detailed coverage: what makes it special, practical info, tips, booking link if applicable",
      required: true,
      order: 2
    },
    {
      heading: "2. [Second Item]",
      instructions: "Detailed coverage with same structure as #1",
      required: true,
      order: 3
    },
    {
      heading: "How to Choose",
      instructions: "Guide readers on selecting based on budget, preferences, location",
      required: true,
      order: 4
    },
    {
      heading: "Insider Tips",
      instructions: "5-7 tips that apply across all items in the list",
      required: true,
      order: 5
    }
  ],
  faqInstructions: `Generate 5-7 FAQs about the topic. Include comparison questions and practical advice.`,
  ctaFormat: `[Book your experience]({{booking_link}})`
};

export const COMPARISON_TEMPLATE: ArticleTemplate = {
  id: "comparison",
  name: "Comparison Guide",
  nameHe: "מדריך השוואה",
  contentTypes: ["article"],
  metaTitleFormat: "[Option A] vs [Option B]: [Key Difference] [Year] | TRAVI",
  metaTitleMaxLength: 60,
  metaDescriptionFormat: "Compare [A] and [B]. Find out which is better for [use case]. Complete guide.",
  metaDescriptionMaxLength: 155,
  openingParagraphInstructions: `Start with the verdict: "[A] is better for [use case], while [B] is ideal for [other use case]."
Provide 3 key differences immediately.`,
  sections: [
    {
      heading: "Quick Comparison",
      instructions: "Side-by-side table comparing key features: price, location, experience type, duration, best for",
      required: true,
      order: 1
    },
    {
      heading: "[Option A]: Complete Guide",
      instructions: "Detailed coverage of first option with pros, cons, practical info",
      required: true,
      order: 2
    },
    {
      heading: "[Option B]: Complete Guide",
      instructions: "Detailed coverage of second option with same structure",
      required: true,
      order: 3
    },
    {
      heading: "Which Should You Choose?",
      instructions: "Decision guide based on traveler type, budget, preferences, time available",
      required: true,
      order: 4
    },
    {
      heading: "Can You Do Both?",
      instructions: "Logistics for combining both experiences if time permits",
      required: false,
      order: 5
    }
  ],
  faqInstructions: `Generate 5-7 FAQs comparing the two options. Include "which is better for X" questions.`,
  ctaFormat: `[Book [A]]({{booking_link_a}}) | [Book [B]]({{booking_link_b}})`
};

export const BUDGET_GUIDE_TEMPLATE: ArticleTemplate = {
  id: "budget-guide",
  name: "Budget Guide",
  nameHe: "מדריך לפי תקציב",
  contentTypes: ["article"],
  metaTitleFormat: "[Topic] on a Budget: [Number] Ways to Save [Year] | TRAVI",
  metaTitleMaxLength: 60,
  metaDescriptionFormat: "Experience [topic] without overspending. [Number] money-saving tips from locals.",
  metaDescriptionMaxLength: 155,
  openingParagraphInstructions: `Lead with savings potential: "You can experience [topic] for as little as [amount] AED with these insider tips."
Explain that this guide covers free and discounted options.`,
  sections: [
    {
      heading: "Budget Breakdown",
      instructions: "Table showing costs for budget/mid-range/luxury approaches",
      required: true,
      order: 1
    },
    {
      heading: "Free Experiences",
      instructions: "List all completely free options with details on each",
      required: true,
      order: 2
    },
    {
      heading: "Best Value Options",
      instructions: "Mid-range choices that offer best quality for price",
      required: true,
      order: 3
    },
    {
      heading: "Money-Saving Tips",
      instructions: "10 specific ways to save money: discount cards, timing, combo deals, etc.",
      required: true,
      order: 4
    },
    {
      heading: "When to Splurge",
      instructions: "Experiences worth paying full price for and why",
      required: false,
      order: 5
    }
  ],
  faqInstructions: `Generate 5-7 FAQs about costs, discounts, and budget-friendly options.`,
  ctaFormat: `[Find deals and discounts]({{booking_link}})`
};

export const ALL_TEMPLATES: ArticleTemplate[] = [
  SEO_AEO_TOURISM_TEMPLATE,
  LISTICLE_TEMPLATE,
  COMPARISON_TEMPLATE,
  BUDGET_GUIDE_TEMPLATE
];

export function getTemplateById(id: string): ArticleTemplate | undefined {
  return ALL_TEMPLATES.find(t => t.id === id);
}

export function getTemplatesForContentType(contentType: string): ArticleTemplate[] {
  return ALL_TEMPLATES.filter(t => t.contentTypes.includes(contentType));
}

/**
 * Substitute variables in template strings
 * Variables use {{variable_name}} syntax
 */
export function substituteVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
}

/**
 * Generate the complete prompt structure for AI based on template
 */
export function generateTemplatePrompt(
  template: ArticleTemplate,
  variables: Record<string, string>
): string {
  const topic = variables.topic || "[Topic]";
  const destination = variables.destination || "Dubai";
  const year = new Date().getFullYear();
  
  let prompt = `=== ARTICLE TEMPLATE: ${template.name} ===

TOPIC: ${topic}
DESTINATION: ${destination}
YEAR: ${year}

=== META REQUIREMENTS ===
**Meta Title Format:** ${template.metaTitleFormat}
**Maximum Length:** ${template.metaTitleMaxLength} characters
**Meta Description Format:** ${template.metaDescriptionFormat}
**Maximum Length:** ${template.metaDescriptionMaxLength} characters

=== H1 TITLE ===
[Primary Keyword] + [${year}] + [Clear Value Proposition]

=== OPENING PARAGRAPH (CRITICAL FOR AEO) ===
${template.openingParagraphInstructions}

=== ARTICLE STRUCTURE ===
`;

  for (const section of template.sections.sort((a, b) => a.order - b.order)) {
    const marker = section.required ? "(Required)" : "(Optional)";
    prompt += `
**[H2] ${substituteVariables(section.heading, { ...variables, year: String(year) })}** ${marker}
${substituteVariables(section.instructions, { ...variables, year: String(year) })}
`;
  }

  if (variables.booking_link) {
    prompt += `
=== CALL TO ACTION ===
${substituteVariables(template.ctaFormat, variables)}
`;
  }

  prompt += `
=== FAQ SECTION ===
**[H2] Frequently Asked Questions about ${topic}**
${substituteVariables(template.faqInstructions, { ...variables, year: String(year) })}
`;

  return prompt;
}
