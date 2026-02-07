/**
 * RSS Feed Parser Service
 * Parses RSS feeds with SSRF protection and content sanitization
 */

import { validateUrlForSSRF } from "../security";
import { sanitizeHtml as sanitizeHtmlContent } from "../security/validators";

export interface RssFeedItem {
  title: string;
  link: string;
  description: string;
  pubDate?: string;
}

/**
 * Parse an RSS feed URL and return the items
 * Includes SSRF protection and XSS sanitization
 */
export async function parseRssFeed(url: string): Promise<RssFeedItem[]> {
  // SSRF Protection: Validate URL before fetching
  const ssrfCheck = validateUrlForSSRF(url);
  if (!ssrfCheck.valid) {
    throw new Error(`Invalid RSS feed URL: ${ssrfCheck.error}`);
  }

  const response = await fetch(ssrfCheck.sanitizedUrl!);
  const text = await response.text();

  const items: RssFeedItem[] = [];
  const itemMatches = text.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || [];

  for (const itemXml of itemMatches) {
    const titleMatch = itemXml.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const linkMatch = itemXml.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
    const descMatch = itemXml.match(
      /<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i
    );
    const dateMatch = itemXml.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);

    if (titleMatch && linkMatch) {
      // Sanitize all content from RSS to prevent XSS attacks
      const rawTitle = titleMatch[1].trim().replace(/<!\[CDATA\[|\]\]>/g, "");
      const rawLink = linkMatch[1].trim().replace(/<!\[CDATA\[|\]\]>/g, "");
      const rawDescription = descMatch ? descMatch[1].trim().replace(/<!\[CDATA\[|\]\]>/g, "") : "";

      items.push({
        title: sanitizeHtmlContent(rawTitle),
        link: rawLink, // URLs are validated separately
        description: sanitizeHtmlContent(rawDescription).substring(0, 500),
        pubDate: dateMatch ? dateMatch[1].trim() : undefined,
      });
    }
  }

  return items;
}
