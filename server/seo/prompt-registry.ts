/**
 * SEO/AEO Prompt Registry
 * 
 * PHASE 6.1: Central source for all SEO/AEO prompts
 * 
 * Features:
 * - Versioned templates
 * - No inline prompts allowed
 * - Type-safe prompt access
 * 
 * ACTIVATION: ENABLED
 */

import { log } from '../lib/logger';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[PromptRegistry] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[PromptRegistry] ${msg}`, data),
};

export type PromptType = 
  | 'meta_title'
  | 'meta_description'
  | 'faq_generation'
  | 'answer_capsule'
  | 'schema_generation'
  | 'alt_text';

export interface PromptTemplate {
  id: string;
  type: PromptType;
  version: string;
  template: string;
  maxOutputTokens: number;
  temperature: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromptContext {
  entityType: string;
  entityName: string;
  locale: string;
  destination?: string;
  category?: string;
  keywords?: string[];
  existingContent?: string;
}

/**
 * Versioned prompt templates
 * Changes increment version, allowing cache invalidation
 */
const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'meta_title_v1',
    type: 'meta_title',
    version: '1.0.0',
    template: `Generate an SEO-optimized meta title for a travel {{entityType}}.

Entity: {{entityName}}
{{#destination}}Destination: {{destination}}{{/destination}}
{{#category}}Category: {{category}}{{/category}}
Locale: {{locale}}

Requirements:
- Maximum 60 characters
- Include primary keyword naturally
- Brand name at end: "| TRAVI"
- Action-oriented when possible
- No special characters except | and -

Output only the title, nothing else.`,
    maxOutputTokens: 100,
    temperature: 0.3,
    createdAt: new Date('2024-12-31'),
    updatedAt: new Date('2024-12-31'),
  },
  {
    id: 'meta_description_v1',
    type: 'meta_description',
    version: '1.0.0',
    template: `Generate an SEO-optimized meta description for a travel {{entityType}}.

Entity: {{entityName}}
{{#destination}}Destination: {{destination}}{{/destination}}
{{#category}}Category: {{category}}{{/category}}
Locale: {{locale}}
{{#keywords}}Keywords to include: {{keywords}}{{/keywords}}

Requirements:
- 150-160 characters
- Include call-to-action
- Mention key benefit
- Natural keyword placement
- Compelling and click-worthy

Output only the description, nothing else.`,
    maxOutputTokens: 200,
    temperature: 0.3,
    createdAt: new Date('2024-12-31'),
    updatedAt: new Date('2024-12-31'),
  },
  {
    id: 'faq_generation_v1',
    type: 'faq_generation',
    version: '1.0.0',
    template: `Generate FAQ items for a travel {{entityType}} page.

Entity: {{entityName}}
{{#destination}}Destination: {{destination}}{{/destination}}
{{#category}}Category: {{category}}{{/category}}
Locale: {{locale}}

Requirements:
- Generate 5-8 FAQ items
- Questions should be natural user queries
- Answers should be 40-80 words each
- Include practical, actionable information
- Avoid generic questions
- Format as JSON array: [{"question": "...", "answer": "..."}]

Output only the JSON array, nothing else.`,
    maxOutputTokens: 1500,
    temperature: 0.4,
    createdAt: new Date('2024-12-31'),
    updatedAt: new Date('2024-12-31'),
  },
  {
    id: 'answer_capsule_v1',
    type: 'answer_capsule',
    version: '1.0.0',
    template: `Generate an AEO (Answer Engine Optimization) answer capsule.

Entity: {{entityName}}
Type: {{entityType}}
{{#destination}}Destination: {{destination}}{{/destination}}
{{#existingContent}}Context: {{existingContent}}{{/existingContent}}

Requirements:
- 40-60 words exactly
- Direct answer to "What is {{entityName}}?"
- Factual, no hallucination
- Include 1-2 key facts
- Written for featured snippets/AI answers

Output only the answer capsule, nothing else.`,
    maxOutputTokens: 150,
    temperature: 0.1,
    createdAt: new Date('2024-12-31'),
    updatedAt: new Date('2024-12-31'),
  },
  {
    id: 'alt_text_v1',
    type: 'alt_text',
    version: '1.0.0',
    template: `Generate SEO-optimized alt text for a travel image.

Entity: {{entityName}}
Type: {{entityType}}
{{#destination}}Destination: {{destination}}{{/destination}}
Image context: {{existingContent}}

Requirements:
- 80-125 characters
- Descriptive but concise
- Include location if relevant
- Natural keyword placement
- Accessibility-focused

Output only the alt text, nothing else.`,
    maxOutputTokens: 80,
    temperature: 0.2,
    createdAt: new Date('2024-12-31'),
    updatedAt: new Date('2024-12-31'),
  },
];

class PromptRegistry {
  private templates: Map<string, PromptTemplate> = new Map();
  private versionIndex: Map<PromptType, string> = new Map(); // type -> latest version

  constructor() {
    this.loadTemplates();
  }

  private loadTemplates(): void {
    for (const template of PROMPT_TEMPLATES) {
      this.templates.set(template.id, template);
      
      // Track latest version per type
      const currentLatest = this.versionIndex.get(template.type);
      if (!currentLatest || template.version > currentLatest) {
        this.versionIndex.set(template.type, template.id);
      }
    }
    
    logger.info('Prompt registry initialized', { 
      templateCount: this.templates.size,
      types: Array.from(this.versionIndex.keys()),
    });
  }

  /**
   * Get the latest prompt template for a type
   */
  getTemplate(type: PromptType): PromptTemplate | undefined {
    const latestId = this.versionIndex.get(type);
    if (!latestId) {
      logger.warn('No template found for type', { type });
      return undefined;
    }
    return this.templates.get(latestId);
  }

  /**
   * Get a specific version of a template
   */
  getTemplateById(id: string): PromptTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Render a prompt with context
   */
  render(type: PromptType, context: PromptContext): string | undefined {
    const template = this.getTemplate(type);
    if (!template) return undefined;

    let rendered = template.template;

    // Simple mustache-like templating
    rendered = rendered.replace(/\{\{entityType\}\}/g, context.entityType);
    rendered = rendered.replace(/\{\{entityName\}\}/g, context.entityName);
    rendered = rendered.replace(/\{\{locale\}\}/g, context.locale);

    // Optional fields with conditionals
    if (context.destination) {
      rendered = rendered.replace(/\{\{#destination\}\}(.*?)\{\{\/destination\}\}/gs, 
        `$1`.replace(/\{\{destination\}\}/g, context.destination));
    } else {
      rendered = rendered.replace(/\{\{#destination\}\}.*?\{\{\/destination\}\}/gs, '');
    }

    if (context.category) {
      rendered = rendered.replace(/\{\{#category\}\}(.*?)\{\{\/category\}\}/gs,
        `$1`.replace(/\{\{category\}\}/g, context.category));
    } else {
      rendered = rendered.replace(/\{\{#category\}\}.*?\{\{\/category\}\}/gs, '');
    }

    if (context.keywords?.length) {
      rendered = rendered.replace(/\{\{#keywords\}\}(.*?)\{\{\/keywords\}\}/gs,
        `$1`.replace(/\{\{keywords\}\}/g, context.keywords.join(', ')));
    } else {
      rendered = rendered.replace(/\{\{#keywords\}\}.*?\{\{\/keywords\}\}/gs, '');
    }

    if (context.existingContent) {
      rendered = rendered.replace(/\{\{#existingContent\}\}(.*?)\{\{\/existingContent\}\}/gs,
        `$1`.replace(/\{\{existingContent\}\}/g, context.existingContent));
    } else {
      rendered = rendered.replace(/\{\{#existingContent\}\}.*?\{\{\/existingContent\}\}/gs, '');
    }

    return rendered.trim();
  }

  /**
   * Get cache key for a prompt invocation
   */
  getCacheKey(type: PromptType, context: PromptContext): string {
    const template = this.getTemplate(type);
    const version = template?.version || 'unknown';
    
    return `${context.entityType}:${context.entityName}:${context.locale}:${type}:${version}`;
  }

  /**
   * Get all template versions
   */
  getAllVersions(): Record<PromptType, string> {
    const versions: Record<string, string> = {};
    for (const [type, id] of this.versionIndex.entries()) {
      const template = this.templates.get(id);
      if (template) {
        versions[type] = template.version;
      }
    }
    return versions as Record<PromptType, string>;
  }
}

// Singleton
let instance: PromptRegistry | null = null;

export function getPromptRegistry(): PromptRegistry {
  if (!instance) {
    instance = new PromptRegistry();
  }
  return instance;
}

export { PromptRegistry };
