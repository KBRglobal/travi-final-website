/**
 * Technical SEO Audit - Individual Checks
 */

// @ts-ignore - Module resolution handled at runtime
import { db } from '@db';
// @ts-ignore - Module resolution handled at runtime
import { content } from '@db/schema';
import { eq, sql } from 'drizzle-orm';
import { SeoIssue, CheckResult, SeoCheckType, SeoIssueSeverity } from './types';

/**
 * Base check interface.
 */
interface CheckContext {
  allContent: Array<typeof content.$inferSelect>;
}

/**
 * Run missing meta description check.
 */
export async function checkMissingMeta(ctx: CheckContext): Promise<CheckResult> {
  const start = Date.now();
  const issues: SeoIssue[] = [];
  const affected: string[] = [];

  for (const item of ctx.allContent) {
    const metaDescription = (item as { metaDescription?: string }).metaDescription;
    if (!metaDescription || metaDescription.trim().length === 0) {
      affected.push(item.id);
    }
  }

  if (affected.length > 0) {
    issues.push(createIssue(
      'missing_meta',
      'high',
      'Missing Meta Descriptions',
      `${affected.length} pages are missing meta descriptions`,
      affected,
      'Add descriptive meta descriptions to improve click-through rates'
    ));
  }

  return createResult('missing_meta', issues, ctx.allContent.length, affected.length, Date.now() - start);
}

/**
 * Run duplicate titles check.
 */
export async function checkDuplicateTitles(ctx: CheckContext): Promise<CheckResult> {
  const start = Date.now();
  const issues: SeoIssue[] = [];
  const titleMap = new Map<string, string[]>();

  for (const item of ctx.allContent) {
    const title = item.title?.toLowerCase().trim() || '';
    if (title) {
      const existing = titleMap.get(title) || [];
      existing.push(item.id);
      titleMap.set(title, existing);
    }
  }

  const duplicates = Array.from(titleMap.entries()).filter(([, ids]) => ids.length > 1);
  const affected = duplicates.flatMap(([, ids]) => ids);

  if (duplicates.length > 0) {
    issues.push(createIssue(
      'duplicate_titles',
      'high',
      'Duplicate Titles',
      `${duplicates.length} titles are duplicated across ${affected.length} pages`,
      affected,
      'Create unique titles for each page to improve SEO'
    ));
  }

  return createResult('duplicate_titles', issues, ctx.allContent.length, affected.length, Date.now() - start);
}

/**
 * Run thin content check.
 */
export async function checkThinContent(ctx: CheckContext): Promise<CheckResult> {
  const start = Date.now();
  const issues: SeoIssue[] = [];
  const affected: string[] = [];
  const MIN_WORDS = 300;

  for (const item of ctx.allContent) {
    const blocks = (item.blocks as Array<{ type: string; data?: { text?: string } }>) || [];
    let wordCount = 0;

    for (const block of blocks) {
      if (block.type === 'paragraph' || block.type === 'text') {
        const text = String(block.data?.text || '');
        wordCount += text.split(/\s+/).filter(w => w.length > 0).length;
      }
    }

    if (wordCount < MIN_WORDS) {
      affected.push(item.id);
    }
  }

  if (affected.length > 0) {
    issues.push(createIssue(
      'thin_content',
      'medium',
      'Thin Content',
      `${affected.length} pages have less than ${MIN_WORDS} words`,
      affected,
      'Expand content with valuable information to improve rankings'
    ));
  }

  return createResult('thin_content', issues, ctx.allContent.length, affected.length, Date.now() - start);
}

/**
 * Run broken internal links check.
 */
export async function checkBrokenInternalLinks(ctx: CheckContext): Promise<CheckResult> {
  const start = Date.now();
  const issues: SeoIssue[] = [];
  const affected: string[] = [];

  // Build set of valid slugs
  const validSlugs = new Set(ctx.allContent.map(c => c.slug));
  const validIds = new Set(ctx.allContent.map(c => c.id));

  for (const item of ctx.allContent) {
    const blocks = (item.blocks as Array<{ type: string; data?: { url?: string; href?: string } }>) || [];
    let hasBrokenLink = false;

    for (const block of blocks) {
      const url = block.data?.url || block.data?.href || '';
      if (url.startsWith('/')) {
        // Check if internal link exists
        const slug = url.replace(/^\//, '').split('/')[0];
        if (slug && !validSlugs.has(slug) && !validIds.has(slug)) {
          hasBrokenLink = true;
          break;
        }
      }
    }

    if (hasBrokenLink) {
      affected.push(item.id);
    }
  }

  if (affected.length > 0) {
    issues.push(createIssue(
      'broken_internal_links',
      'critical',
      'Broken Internal Links',
      `${affected.length} pages contain broken internal links`,
      affected,
      'Fix or remove broken links to improve user experience and crawlability'
    ));
  }

  return createResult('broken_internal_links', issues, ctx.allContent.length, affected.length, Date.now() - start);
}

/**
 * Run orphan pages check.
 */
export async function checkOrphanPages(ctx: CheckContext): Promise<CheckResult> {
  const start = Date.now();
  const issues: SeoIssue[] = [];

  // Build map of pages linked to
  const linkedPages = new Set<string>();

  for (const item of ctx.allContent) {
    const blocks = (item.blocks as Array<{ type: string; data?: { url?: string; href?: string } }>) || [];

    for (const block of blocks) {
      const url = block.data?.url || block.data?.href || '';
      if (url.startsWith('/')) {
        const slug = url.replace(/^\//, '').split('/')[0];
        if (slug) {
          linkedPages.add(slug);
        }
      }
    }
  }

  // Find pages not linked from anywhere
  const affected = ctx.allContent
    .filter(c => !linkedPages.has(c.slug))
    .map(c => c.id);

  if (affected.length > 0) {
    issues.push(createIssue(
      'orphan_pages',
      'medium',
      'Orphan Pages',
      `${affected.length} pages have no internal links pointing to them`,
      affected,
      'Add internal links to improve discoverability'
    ));
  }

  return createResult('orphan_pages', issues, ctx.allContent.length, affected.length, Date.now() - start);
}

/**
 * Run no schema check.
 */
export async function checkNoSchema(ctx: CheckContext): Promise<CheckResult> {
  const start = Date.now();
  const issues: SeoIssue[] = [];
  const affected: string[] = [];

  for (const item of ctx.allContent) {
    const hasSchema = (item as { schema?: unknown }).schema;
    if (!hasSchema) {
      affected.push(item.id);
    }
  }

  if (affected.length > 0) {
    issues.push(createIssue(
      'no_schema',
      'medium',
      'Missing Schema Markup',
      `${affected.length} pages lack structured data`,
      affected,
      'Add schema.org markup to improve rich snippets'
    ));
  }

  return createResult('no_schema', issues, ctx.allContent.length, affected.length, Date.now() - start);
}

/**
 * Run no AEO capsule check.
 */
export async function checkNoAeoCapsule(ctx: CheckContext): Promise<CheckResult> {
  const start = Date.now();
  const issues: SeoIssue[] = [];
  const affected: string[] = [];

  for (const item of ctx.allContent) {
    const blocks = (item.blocks as Array<{ type: string }>) || [];
    const hasAeoCapsule = blocks.some(
      b => b.type === 'aeo_capsule' || b.type === 'answer_capsule'
    );

    if (!hasAeoCapsule) {
      affected.push(item.id);
    }
  }

  if (affected.length > 0) {
    issues.push(createIssue(
      'no_aeo_capsule',
      'low',
      'Missing AEO Capsule',
      `${affected.length} pages lack answer engine optimization`,
      affected,
      'Add AEO capsules for better AI/voice search visibility'
    ));
  }

  return createResult('no_aeo_capsule', issues, ctx.allContent.length, affected.length, Date.now() - start);
}

/**
 * Run missing H1 check.
 */
export async function checkMissingH1(ctx: CheckContext): Promise<CheckResult> {
  const start = Date.now();
  const issues: SeoIssue[] = [];
  const affected: string[] = [];

  for (const item of ctx.allContent) {
    const blocks = (item.blocks as Array<{ type: string; data?: { level?: number } }>) || [];
    const hasH1 = blocks.some(
      b => (b.type === 'header' || b.type === 'heading') && b.data?.level === 1
    );

    if (!hasH1) {
      affected.push(item.id);
    }
  }

  if (affected.length > 0) {
    issues.push(createIssue(
      'missing_h1',
      'high',
      'Missing H1 Heading',
      `${affected.length} pages lack an H1 heading`,
      affected,
      'Add a single H1 heading that describes the page content'
    ));
  }

  return createResult('missing_h1', issues, ctx.allContent.length, affected.length, Date.now() - start);
}

/**
 * Run multiple H1 check.
 */
export async function checkMultipleH1(ctx: CheckContext): Promise<CheckResult> {
  const start = Date.now();
  const issues: SeoIssue[] = [];
  const affected: string[] = [];

  for (const item of ctx.allContent) {
    const blocks = (item.blocks as Array<{ type: string; data?: { level?: number } }>) || [];
    const h1Count = blocks.filter(
      b => (b.type === 'header' || b.type === 'heading') && b.data?.level === 1
    ).length;

    if (h1Count > 1) {
      affected.push(item.id);
    }
  }

  if (affected.length > 0) {
    issues.push(createIssue(
      'multiple_h1',
      'low',
      'Multiple H1 Tags',
      `${affected.length} pages have multiple H1 headings`,
      affected,
      'Use only one H1 per page for better SEO'
    ));
  }

  return createResult('multiple_h1', issues, ctx.allContent.length, affected.length, Date.now() - start);
}

/**
 * Run missing alt text check.
 */
export async function checkMissingAltText(ctx: CheckContext): Promise<CheckResult> {
  const start = Date.now();
  const issues: SeoIssue[] = [];
  const affected: string[] = [];

  for (const item of ctx.allContent) {
    const blocks = (item.blocks as Array<{ type: string; data?: { caption?: string; alt?: string } }>) || [];
    let hasMissingAlt = false;

    for (const block of blocks) {
      if (block.type === 'image') {
        const alt = block.data?.alt || block.data?.caption || '';
        if (!alt.trim()) {
          hasMissingAlt = true;
          break;
        }
      }
    }

    if (hasMissingAlt) {
      affected.push(item.id);
    }
  }

  if (affected.length > 0) {
    issues.push(createIssue(
      'missing_alt_text',
      'medium',
      'Missing Alt Text',
      `${affected.length} pages have images without alt text`,
      affected,
      'Add descriptive alt text to all images for accessibility and SEO'
    ));
  }

  return createResult('missing_alt_text', issues, ctx.allContent.length, affected.length, Date.now() - start);
}

/**
 * Run long title check.
 */
export async function checkLongTitle(ctx: CheckContext): Promise<CheckResult> {
  const start = Date.now();
  const issues: SeoIssue[] = [];
  const affected: string[] = [];
  const MAX_TITLE_LENGTH = 60;

  for (const item of ctx.allContent) {
    const title = item.title || '';
    if (title.length > MAX_TITLE_LENGTH) {
      affected.push(item.id);
    }
  }

  if (affected.length > 0) {
    issues.push(createIssue(
      'long_title',
      'low',
      'Long Titles',
      `${affected.length} pages have titles exceeding ${MAX_TITLE_LENGTH} characters`,
      affected,
      'Shorten titles to prevent truncation in search results'
    ));
  }

  return createResult('long_title', issues, ctx.allContent.length, affected.length, Date.now() - start);
}

/**
 * Run short meta description check.
 */
export async function checkShortMeta(ctx: CheckContext): Promise<CheckResult> {
  const start = Date.now();
  const issues: SeoIssue[] = [];
  const affected: string[] = [];
  const MIN_META_LENGTH = 120;

  for (const item of ctx.allContent) {
    const metaDescription = (item as { metaDescription?: string }).metaDescription || '';
    if (metaDescription.length > 0 && metaDescription.length < MIN_META_LENGTH) {
      affected.push(item.id);
    }
  }

  if (affected.length > 0) {
    issues.push(createIssue(
      'short_meta',
      'low',
      'Short Meta Descriptions',
      `${affected.length} pages have meta descriptions under ${MIN_META_LENGTH} characters`,
      affected,
      'Expand meta descriptions to utilize available space'
    ));
  }

  return createResult('short_meta', issues, ctx.allContent.length, affected.length, Date.now() - start);
}

/**
 * Helper: Create issue.
 */
function createIssue(
  type: SeoCheckType,
  severity: SeoIssueSeverity,
  title: string,
  description: string,
  affectedItems: string[],
  recommendation: string
): SeoIssue {
  return {
    id: `${type}-${Date.now()}`,
    type,
    severity,
    title,
    description,
    affectedItems,
    count: affectedItems.length,
    recommendation,
    detectedAt: new Date(),
  };
}

/**
 * Helper: Create result.
 */
function createResult(
  check: SeoCheckType,
  issues: SeoIssue[],
  itemsChecked: number,
  itemsFailed: number,
  executionTime: number
): CheckResult {
  return {
    check,
    passed: issues.length === 0,
    issues,
    itemsChecked,
    itemsFailed,
    executionTime,
  };
}
