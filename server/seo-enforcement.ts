/**
 * SEO Enforcement Module
 * Applies strict SEO fixes to AI-generated content BEFORE it's returned to the client.
 * This ensures all content meets SEO requirements regardless of which AI provider or endpoint is used.
 */

// SEO Requirements (must match client-side analyzer)
export const SEO_REQUIREMENTS = {
  titleMinLength: 50,
  titleMaxLength: 60,
  metaDescMinLength: 150,
  metaDescMaxLength: 160,
  minWordCount: 1800,
  maxWordCount: 3500,
  minH2Count: 4,
  maxH2Count: 6,
  minInternalLinks: 5,
  maxInternalLinks: 8,
  minExternalLinks: 2,
  maxExternalLinks: 3,
};

// 26 Banned clichés - any content with these phrases fails SEO
export const BANNED_CLICHES = [
  "must-visit",
  "must visit",
  "world-class",
  "world class",
  "hidden gem",
  "hidden gems",
  "breathtaking",
  "awe-inspiring",
  "jaw-dropping",
  "unforgettable",
  "once-in-a-lifetime",
  "once in a lifetime",
  "bucket list",
  "paradise on earth",
  "jewel in the crown",
  "like no other",
  "best kept secret",
  "best-kept secret",
  "off the beaten path",
  "sun-kissed",
  "picture-perfect",
  "secret tips revealed",
  "you won't believe",
  "mind-blowing",
  "epic adventure",
  "ultimate guide",
];

// Professional replacements for clichés
const CLICHE_REPLACEMENTS: Record<string, string> = {
  "must-visit": "popular",
  "must visit": "popular",
  "world-class": "internationally recognized",
  "world class": "internationally recognized",
  "hidden gem": "lesser-known spot",
  "hidden gems": "lesser-known spots",
  breathtaking: "impressive",
  "awe-inspiring": "remarkable",
  "jaw-dropping": "remarkable",
  unforgettable: "memorable",
  "once-in-a-lifetime": "rare",
  "once in a lifetime": "rare",
  "bucket list": "popular destination",
  "paradise on earth": "beautiful location",
  "jewel in the crown": "highlight",
  "like no other": "distinctive",
  "best kept secret": "lesser-known",
  "best-kept secret": "lesser-known",
  "off the beaten path": "less crowded",
  "sun-kissed": "sunny",
  "picture-perfect": "scenic",
  "secret tips revealed": "practical tips",
  "you won't believe": "notably",
  "mind-blowing": "impressive",
  "epic adventure": "adventure",
  "ultimate guide": "comprehensive guide",
};

// Title replacements for clichés (shorter alternatives)
const TITLE_CLICHE_REPLACEMENTS: Record<string, string> = {
  "secret tips revealed": "Practical Guide",
  "must-visit": "Top",
  "must visit": "Top",
  "hidden gem": "Local",
  "hidden gems": "Local",
  "ultimate guide": "Complete Guide",
  "everything you need to know": "Guide",
  "you won't believe": "",
  "best kept secret": "Local",
  "best-kept secret": "Local",
  "world-class": "Premier",
  breathtaking: "Stunning",
};

// Authoritative external links for Dubai content
export const AUTHORITATIVE_EXTERNAL_LINKS = [
  { anchor: "Visit Dubai Official", url: "https://www.visitdubai.com", rel: "noopener noreferrer" },
  { anchor: "Dubai Government Portal", url: "https://www.dubai.ae", rel: "noopener noreferrer" },
  { anchor: "Dubai Tourism", url: "https://www.dubaitourism.gov.ae", rel: "noopener noreferrer" },
];

// Internal links for Dubai content
export const FALLBACK_INTERNAL_LINKS = [
  { anchor: "Top Attractions in Dubai", url: "/attractions" },
  { anchor: "Best Hotels in Dubai", url: "/hotels" },
  { anchor: "Dubai Dining Guide", url: "/dining" },
  { anchor: "Dubai Districts", url: "/districts" },
  { anchor: "Dubai Events Calendar", url: "/events" },
  { anchor: "Getting Around Dubai", url: "/transport" },
];

/**
 * Fix title to meet SEO requirements (50-60 characters)
 */
export function fixTitle(title: string): string {
  if (!title) return title;

  let fixed = title;

  // Replace clichés with professional alternatives
  for (const [cliche, replacement] of Object.entries(TITLE_CLICHE_REPLACEMENTS)) {
    const regex = new RegExp(cliche, "gi");
    if (regex.test(fixed)) {
      fixed = fixed.replace(regex, replacement).replace(/\s+/g, " ").trim();
    }
  }

  // Clean up leftover punctuation artifacts
  fixed = fixed
    .replace(/:\s*$/g, "")
    .replace(/\|\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // If title is too long, truncate intelligently
  if (fixed.length > SEO_REQUIREMENTS.titleMaxLength) {
    const separators = [" | ", " - ", ": "];
    for (const sep of separators) {
      if (fixed.includes(sep)) {
        const firstPart = fixed.split(sep)[0].trim();
        if (
          firstPart.length >= SEO_REQUIREMENTS.titleMinLength &&
          firstPart.length <= SEO_REQUIREMENTS.titleMaxLength
        ) {
          fixed = firstPart;
          break;
        }
      }
    }

    // Still too long? Smart truncate at word boundary
    if (fixed.length > SEO_REQUIREMENTS.titleMaxLength) {
      const maxCut = SEO_REQUIREMENTS.titleMaxLength - 3;
      let cutPoint = maxCut;
      while (cutPoint > SEO_REQUIREMENTS.titleMinLength && fixed[cutPoint] !== " ") {
        cutPoint--;
      }
      if (cutPoint >= SEO_REQUIREMENTS.titleMinLength) {
        fixed = fixed.substring(0, cutPoint).trim();
      } else {
        fixed = fixed.substring(0, maxCut).trim();
      }
    }
  }

  // If title became too short, use original with smart truncation
  if (
    fixed.length < SEO_REQUIREMENTS.titleMinLength &&
    title.length > SEO_REQUIREMENTS.titleMaxLength
  ) {
    const maxCut = SEO_REQUIREMENTS.titleMaxLength;
    let cutPoint = maxCut;
    while (cutPoint > 45 && title[cutPoint] !== " ") {
      cutPoint--;
    }
    fixed = title.substring(0, cutPoint).trim();
  }

  return fixed;
}

/**
 * Fix meta description to meet SEO requirements (150-160 characters)
 */
export function fixMetaDescription(metaDesc: string, fallbackText?: string): string {
  if (!metaDesc) metaDesc = fallbackText || "";

  // Remove clichés first
  for (const [cliche, replacement] of Object.entries(CLICHE_REPLACEMENTS)) {
    const regex = new RegExp(cliche, "gi");
    metaDesc = metaDesc.replace(regex, replacement);
  }

  // Clean up
  metaDesc = metaDesc.replace(/\s+/g, " ").trim();

  // If too short, pad with fallback text
  if (metaDesc.length < SEO_REQUIREMENTS.metaDescMinLength && fallbackText) {
    const cleanFallback = fallbackText
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const neededChars = SEO_REQUIREMENTS.metaDescMinLength - metaDesc.length - 2;
    if (neededChars > 0 && cleanFallback.length > 0) {
      const padding = cleanFallback.substring(0, neededChars);
      metaDesc = metaDesc + " " + padding;
    }
  }

  // If too long, truncate at word/sentence boundary
  if (metaDesc.length > SEO_REQUIREMENTS.metaDescMaxLength) {
    let cutPoint = SEO_REQUIREMENTS.metaDescMaxLength;

    // Try to cut at a sentence boundary
    const periodIndex = metaDesc.lastIndexOf(".", SEO_REQUIREMENTS.metaDescMaxLength - 5);
    if (periodIndex > SEO_REQUIREMENTS.metaDescMinLength) {
      cutPoint = periodIndex + 1;
    } else {
      // Cut at word boundary
      while (cutPoint > SEO_REQUIREMENTS.metaDescMinLength && metaDesc[cutPoint] !== " ") {
        cutPoint--;
      }
    }

    metaDesc = metaDesc.substring(0, cutPoint).trim();
  }

  return metaDesc;
}

/**
 * Remove clichés from content body - ONLY from prose text, NOT from URLs/attributes
 * This function preserves HTML structure and only modifies visible text content
 */
export function removeClichesFromText(text: string): string {
  if (!text) return text;

  // If it looks like a URL, don't modify it
  if (text.startsWith("http://") || text.startsWith("https://") || text.startsWith("/")) {
    return text;
  }

  // For HTML content, only replace in text nodes (outside of < > tags and attributes)
  if (text.includes("<")) {
    return removeClichesFromHtml(text);
  }

  // For plain text, apply replacements directly
  for (const [cliche, replacement] of Object.entries(CLICHE_REPLACEMENTS)) {
    const regex = new RegExp(`\\b${escapeRegex(cliche)}\\b`, "gi");
    text = text.replace(regex, replacement);
  }

  return text;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Remove clichés from HTML while preserving tags and attributes
 */
function removeClichesFromHtml(html: string): string {
  // Split HTML into text and tag segments
  const segments: string[] = [];
  let currentIndex = 0;

  // Match all HTML tags (including attributes) and href/src values
  const tagRegex = /<[^>]+>|href=["'][^"']*["']|src=["'][^"']*["']/gi;
  let match;

  while ((match = tagRegex.exec(html)) !== null) {
    // Add text before this tag (prose that we CAN modify)
    if (match.index > currentIndex) {
      const textBefore = html.substring(currentIndex, match.index);
      segments.push(replaceClichesInProse(textBefore));
    }
    // Add the tag itself (which we should NOT modify)
    segments.push(match[0]);
    currentIndex = match.index + match[0].length;
  }

  // Add any remaining text after the last tag
  if (currentIndex < html.length) {
    segments.push(replaceClichesInProse(html.substring(currentIndex)));
  }

  return segments.join("");
}

/**
 * Replace clichés in plain prose text only
 */
function replaceClichesInProse(text: string): string {
  for (const [cliche, replacement] of Object.entries(CLICHE_REPLACEMENTS)) {
    const regex = new RegExp(`\\b${escapeRegex(cliche)}\\b`, "gi");
    text = text.replace(regex, replacement);
  }
  return text;
}

/**
 * Count internal links in HTML content
 */
function countInternalLinks(html: string): number {
  const internalLinkRegex = /<a[^>]+href=["'](\/[^"']*|(?!https?:\/\/)[^"']*)["'][^>]*>/gi;
  const matches = html.match(internalLinkRegex) || [];
  return matches.length;
}

/**
 * Count external links in HTML content
 */
function countExternalLinks(html: string): number {
  const externalLinkRegex = /<a[^>]+href=["']https?:\/\/[^"']+["'][^>]*>/gi;
  const matches = html.match(externalLinkRegex) || [];
  return matches.length;
}

/**
 * Inject internal links into content if missing
 */
export function injectInternalLinks(
  html: string,
  minLinks: number = SEO_REQUIREMENTS.minInternalLinks
): string {
  if (!html) return html;

  const currentCount = countInternalLinks(html);
  if (currentCount >= minLinks) {
    return html;
  }

  const linksNeeded = minLinks - currentCount;
  const linksToAdd = FALLBACK_INTERNAL_LINKS.slice(0, linksNeeded);

  // Find paragraphs to inject links into
  const paragraphs = html.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
  let modified = html;

  for (let i = 0; i < Math.min(linksToAdd.length, paragraphs.length); i++) {
    const link = linksToAdd[i];
    const para = paragraphs[i];

    // Only inject if paragraph doesn't already have this link
    if (!para.includes(link.url)) {
      const linkHtml = `<a href="${link.url}">${link.anchor}</a>`;

      // Insert before closing </p>
      const newPara = para.replace(/<\/p>/i, ` For more information, see our ${linkHtml}.</p>`);
      modified = modified.replace(para, newPara);
    }
  }

  return modified;
}

/**
 * Inject external links into content if missing
 */
export function injectExternalLinks(
  html: string,
  minLinks: number = SEO_REQUIREMENTS.minExternalLinks
): string {
  if (!html) return html;

  const currentCount = countExternalLinks(html);
  if (currentCount >= minLinks) {
    return html;
  }

  const linksNeeded = minLinks - currentCount;
  const linksToAdd = AUTHORITATIVE_EXTERNAL_LINKS.slice(0, linksNeeded);

  // Find paragraphs to inject links into
  const paragraphs = html.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
  let modified = html;

  for (let i = 0; i < Math.min(linksToAdd.length, paragraphs.length); i++) {
    const link = linksToAdd[i];
    const para = paragraphs[paragraphs.length - 1 - i]; // Start from end

    if (!para.includes(link.url)) {
      const linkHtml = `<a href="${link.url}" target="_blank" rel="${link.rel}">${link.anchor}</a>`;

      const newPara = para.replace(/<\/p>/i, ` Learn more at ${linkHtml}.</p>`);
      modified = modified.replace(para, newPara);
    }
  }

  return modified;
}

/**
 * Apply all SEO enforcement to article-style AI response
 * This is the main function to call for the generate-article endpoint
 * Works on a deep clone to avoid mutating the original
 */
export function enforceArticleSEO(article: any): any {
  if (!article) return article;

  // Deep clone to avoid mutating original
  const result = JSON.parse(JSON.stringify(article));

  // Fix meta title
  if (result.meta?.title) {
    result.meta.title = fixTitle(result.meta.title);
  }

  // Fix meta description
  if (result.meta?.description) {
    result.meta.description = fixMetaDescription(result.meta.description, result.article?.intro);
  }

  // Fix H1 headline
  if (result.article?.h1) {
    result.article.h1 = removeClichesFromText(result.article.h1);
  }

  // Fix intro
  if (result.article?.intro) {
    result.article.intro = removeClichesFromText(result.article.intro);
  }

  // Fix sections (clichés only - links handled separately)
  if (result.article?.sections && Array.isArray(result.article.sections)) {
    for (const section of result.article.sections) {
      if (section.heading) {
        section.heading = removeClichesFromText(section.heading);
      }
      if (section.body) {
        section.body = removeClichesFromText(section.body);
      }
    }
  }

  // Fix closing
  if (result.article?.closing) {
    result.article.closing = removeClichesFromText(result.article.closing);
  }

  // Fix pro tips
  if (result.article?.proTips && Array.isArray(result.article.proTips)) {
    result.article.proTips = result.article.proTips.map((tip: string) =>
      removeClichesFromText(tip)
    );
  }

  // Fix FAQs
  if (result.article?.faq && Array.isArray(result.article.faq)) {
    for (const faq of result.article.faq) {
      if (faq.q) faq.q = removeClichesFromText(faq.q);
      if (faq.a) faq.a = removeClichesFromText(faq.a);
    }
  }

  // === SINGLE-PASS LINK INJECTION ===
  // Count existing links across entire article, then inject if needed
  const allContent = collectArticleContent(result);
  const existingInternal = countInternalLinks(allContent);
  const existingExternal = countExternalLinks(allContent);

  // Inject internal links if below minimum (once, into early sections)
  if (
    existingInternal < SEO_REQUIREMENTS.minInternalLinks &&
    result.article?.sections?.length > 0
  ) {
    const deficit = SEO_REQUIREMENTS.minInternalLinks - existingInternal;
    injectLinksIntoSections(result.article.sections, FALLBACK_INTERNAL_LINKS, deficit, "internal");
  } else {
    // empty
  }

  // Inject external links if below minimum (once, into closing or last section)
  if (existingExternal < SEO_REQUIREMENTS.minExternalLinks) {
    const deficit = SEO_REQUIREMENTS.minExternalLinks - existingExternal;
    if (result.article?.closing) {
      result.article.closing = injectExternalLinksOnce(result.article.closing, deficit);
    } else if (result.article?.sections?.length > 0) {
      const lastSection = result.article.sections[result.article.sections.length - 1];
      if (lastSection.body) {
        lastSection.body = injectExternalLinksOnce(lastSection.body, deficit);
      }
    }
  } else {
    // empty
  }

  // Ensure secondary keywords exist
  if (!result.analysis?.secondaryKeywords || result.analysis.secondaryKeywords.length === 0) {
    const primaryKeyword = result.analysis?.primaryKeyword || result.meta?.keywords?.[0];
    // FAIL-FAST: Do not use implicit Dubai fallback for keywords
    if (!primaryKeyword) {
    } else {
      result.analysis = result.analysis || {};
      result.analysis.secondaryKeywords = [
        `${primaryKeyword} guide`,
        `${primaryKeyword} tips`,
        `best ${primaryKeyword}`,
      ];
    }
  }

  // Ensure alt texts exist
  if (!result.article?.altTexts || result.article.altTexts.length === 0) {
    const topic = result.meta?.title || result.article?.h1;
    // FAIL-FAST: Do not use implicit Dubai fallback for alt texts
    if (!topic) {
    } else {
      result.article = result.article || {};
      result.article.altTexts = [
        `${topic} exterior view`,
        `Interior view of ${topic} with visitors`,
        `${topic} atmosphere`,
      ];
    }
  }

  return result;
}

/**
 * Collect all text content from article for link counting
 */
function collectArticleContent(article: any): string {
  let content = "";
  if (article.article?.intro) content += article.article.intro + " ";
  if (article.article?.sections) {
    for (const section of article.article.sections) {
      if (section.body) content += section.body + " ";
    }
  }
  if (article.article?.closing) content += article.article.closing;
  return content;
}

/**
 * Inject links into sections (spread across first N sections)
 */
function injectLinksIntoSections(
  sections: any[],
  links: any[],
  count: number,
  type: "internal" | "external"
): void {
  const linksToAdd = links.slice(0, count);

  for (let i = 0; i < linksToAdd.length && i < sections.length; i++) {
    const section = sections[i];
    if (!section.body) continue;

    // Only inject into paragraph content
    const paragraphs = section.body.match(/<p[^>]*>[\s\S]*?<\/p>/gi);
    if (!paragraphs || paragraphs.length === 0) continue;

    const link = linksToAdd[i];
    const linkHtml =
      type === "internal"
        ? `<a href="${link.url}">${link.anchor}</a>`
        : `<a href="${link.url}" target="_blank" rel="${link.rel}">${link.anchor}</a>`;

    // Insert before the last </p> of the first paragraph
    const firstPara = paragraphs[0];
    const phrase = type === "internal" ? "For more information, see our" : "Learn more at";
    const newPara = firstPara.replace(/<\/p>/i, ` ${phrase} ${linkHtml}.</p>`);
    section.body = section.body.replace(firstPara, newPara);
  }
}

/**
 * Inject external links into a single content block
 */
function injectExternalLinksOnce(html: string, count: number): string {
  const linksToAdd = AUTHORITATIVE_EXTERNAL_LINKS.slice(0, count);

  // Find paragraphs to inject into
  const paragraphs = html.match(/<p[^>]*>[\s\S]*?<\/p>/gi);
  if (!paragraphs || paragraphs.length === 0) return html;

  let modified = html;
  for (let i = 0; i < linksToAdd.length; i++) {
    const link = linksToAdd[i];
    const paraIndex = Math.min(i, paragraphs.length - 1);
    const para = paragraphs[paraIndex];

    if (!modified.includes(link.url)) {
      const linkHtml = `<a href="${link.url}" target="_blank" rel="${link.rel}">${link.anchor}</a>`;
      const newPara = para.replace(/<\/p>/i, ` Learn more at ${linkHtml}.</p>`);
      modified = modified.replace(para, newPara);
    }
  }

  return modified;
}

/**
 * Apply SEO enforcement to writer-engine style content
 * Works with aiWritersContentGenerator output format
 */
export function enforceWriterEngineSEO(result: any): any {
  if (!result) return result;

  // Deep clone to avoid mutating original
  const enforced = JSON.parse(JSON.stringify(result));

  // Fix title (if present)
  if (enforced.title) {
    enforced.title = fixTitle(enforced.title);
  }

  // Fix metaDescription (if present)
  if (enforced.metaDescription !== undefined) {
    enforced.metaDescription = fixMetaDescription(
      enforced.metaDescription || "",
      enforced.intro || ""
    );
  }

  // Remove clichés from intro
  if (enforced.intro) {
    enforced.intro = removeClichesFromText(enforced.intro);
  }

  // Remove clichés and inject links into body
  if (enforced.body) {
    let body = removeClichesFromText(enforced.body);

    // Count existing links
    const existingInternal = countInternalLinks(body);
    const existingExternal = countExternalLinks(body);

    // Inject internal links if needed
    if (existingInternal < SEO_REQUIREMENTS.minInternalLinks) {
      const deficit = SEO_REQUIREMENTS.minInternalLinks - existingInternal;
      body = injectInternalLinksToBody(body, deficit);
    }

    // Inject external links if needed
    if (existingExternal < SEO_REQUIREMENTS.minExternalLinks) {
      const deficit = SEO_REQUIREMENTS.minExternalLinks - existingExternal;
      body = injectExternalLinksToBody(body, deficit);
    }

    enforced.body = body;
  }

  // Fix content.metaDescription if it exists (from writerEngine format)
  if (enforced.content?.metaDescription !== undefined) {
    enforced.content.metaDescription = fixMetaDescription(
      enforced.content.metaDescription || "",
      enforced.content.intro || ""
    );
  }

  // Fix content.title if it exists
  if (enforced.content?.title) {
    enforced.content.title = fixTitle(enforced.content.title);
  }

  // Remove clichés from content.intro
  if (enforced.content?.intro) {
    enforced.content.intro = removeClichesFromText(enforced.content.intro);
  }

  // Process content.body
  if (enforced.content?.body) {
    let body = removeClichesFromText(enforced.content.body);

    const existingInternal = countInternalLinks(body);
    const existingExternal = countExternalLinks(body);

    if (existingInternal < SEO_REQUIREMENTS.minInternalLinks) {
      const deficit = SEO_REQUIREMENTS.minInternalLinks - existingInternal;
      body = injectInternalLinksToBody(body, deficit);
    }

    if (existingExternal < SEO_REQUIREMENTS.minExternalLinks) {
      const deficit = SEO_REQUIREMENTS.minExternalLinks - existingExternal;
      body = injectExternalLinksToBody(body, deficit);
    }

    enforced.content.body = body;
  }

  // Process content.conclusion
  if (enforced.content?.conclusion) {
    enforced.content.conclusion = removeClichesFromText(enforced.content.conclusion);
  }

  return enforced;
}

/**
 * Inject internal links into body content (single pass)
 */
function injectInternalLinksToBody(body: string, count: number): string {
  const paragraphs = body.match(/<p[^>]*>[\s\S]*?<\/p>/gi);
  if (!paragraphs || paragraphs.length === 0) return body;

  const linksToAdd = FALLBACK_INTERNAL_LINKS.slice(0, count);
  let modified = body;

  for (let i = 0; i < linksToAdd.length && i < paragraphs.length; i++) {
    const link = linksToAdd[i];
    const para = paragraphs[i];

    if (!modified.includes(link.url)) {
      const linkHtml = `<a href="${link.url}">${link.anchor}</a>`;
      const newPara = para.replace(/<\/p>/i, ` For more information, see our ${linkHtml}.</p>`);
      modified = modified.replace(para, newPara);
    }
  }

  return modified;
}

/**
 * Inject external links into body content (single pass)
 */
function injectExternalLinksToBody(body: string, count: number): string {
  const paragraphs = body.match(/<p[^>]*>[\s\S]*?<\/p>/gi);
  if (!paragraphs || paragraphs.length === 0) return body;

  const linksToAdd = AUTHORITATIVE_EXTERNAL_LINKS.slice(0, count);
  let modified = body;

  // Find paragraphs in the second half of content for external links
  const startIdx = Math.floor(paragraphs.length / 2);

  for (let i = 0; i < linksToAdd.length; i++) {
    const link = linksToAdd[i];
    const paraIdx = Math.min(startIdx + i, paragraphs.length - 1);
    const para = paragraphs[paraIdx];

    if (!modified.includes(link.url)) {
      const linkHtml = `<a href="${link.url}" target="_blank" rel="${link.rel}">${link.anchor}</a>`;
      const newPara = para.replace(/<\/p>/i, ` Learn more at ${linkHtml}.</p>`);
      modified = modified.replace(para, newPara);
    }
  }

  return modified;
}
