/**
 * HTML Building Functions
 */

import type { Locale, ContentBlock } from "@shared/schema";
import { RTL_LOCALES } from "@shared/schema";
import { getCanonicalUrl } from "../meta-tags";
import { SITE_NAME } from "./constants";
import { escapeHtml } from "./utils";

/**
 * Wrap content in full HTML document
 */
export function wrapInHtml(params: {
  metaTags: string;
  structuredData: string;
  locale: Locale;
  content: string;
}): string {
  const { metaTags, structuredData, locale, content } = params;
  const dir = RTL_LOCALES.includes(locale) ? "rtl" : "ltr";
  const lang = locale;

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
    ${metaTags}
    ${structuredData}
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 1200px; margin: 0 auto; padding: 20px; }
      header, footer { padding: 20px 0; }
      nav ul { list-style: none; padding: 0; display: flex; gap: 20px; flex-wrap: wrap; }
      main { padding: 20px 0; }
      article { max-width: 800px; }
      figure { margin: 20px 0; }
      img { max-width: 100%; height: auto; }
      dl { margin: 20px 0; }
      dt { font-weight: bold; margin-top: 15px; }
      dd { margin-left: 20px; }
      .content-list { list-style: none; padding: 0; }
      .content-list li { margin: 20px 0; padding: 20px; border: 1px solid #eee; border-radius: 8px; }
      .content-list h2 { margin-top: 0; }
      [dir="rtl"] dd { margin-right: 20px; margin-left: 0; }
    </style>
</head>
<body>
    ${content}
</body>
</html>`;
}

/**
 * Render footer
 */
export function renderFooter(locale: Locale): string {
  return `
    <footer>
      <nav aria-label="Footer navigation">
        <ul>
          <li><a href="${getCanonicalUrl("/about", locale)}">About</a></li>
          <li><a href="${getCanonicalUrl("/contact", locale)}">Contact</a></li>
          <li><a href="${getCanonicalUrl("/privacy", locale)}">Privacy Policy</a></li>
        </ul>
      </nav>
      <p>&copy; ${new Date().getFullYear()} ${SITE_NAME}. All rights reserved.</p>
    </footer>
  `;
}

/**
 * Render content blocks to semantic HTML
 */
function renderCaptionHtml(data: any): string {
  return data.caption ? `<figcaption>${escapeHtml(String(data.caption))}</figcaption>` : "";
}

function renderBlock(block: ContentBlock): string {
  const data = block.data || {};

  switch (block.type) {
    case "hero": {
      const heroImg = data.imageUrl
        ? `<img src="${escapeHtml(String(data.imageUrl))}" alt="${escapeHtml(String(data.title || data.alt || ""))}" loading="lazy">`
        : "";
      return `<figure>${heroImg}${renderCaptionHtml(data)}</figure>`;
    }

    case "heading": {
      const level = Math.min(Math.max(Number(data.level) || 2, 1), 6);
      return `<h${level}>${escapeHtml(String(data.text || ""))}</h${level}>`;
    }

    case "text":
    case "paragraph":
      return `<p>${escapeHtml(String(data.text || data.content || ""))}</p>`;

    case "image":
      return `<figure><img src="${escapeHtml(String(data.src || data.url || ""))}" alt="${escapeHtml(String(data.alt || ""))}" loading="lazy">${renderCaptionHtml(data)}</figure>`;

    case "gallery":
      return renderGalleryBlock(data);

    case "FAQ":
    case "faq":
      return renderFAQBlock(data);

    case "list":
      return renderListBlock(data);

    case "quote":
    case "blockquote": {
      const citeHtml = data.author ? `<cite>${escapeHtml(String(data.author))}</cite>` : "";
      return `<blockquote><p>${escapeHtml(String(data.text || data.quote || ""))}</p>${citeHtml}</blockquote>`;
    }

    case "divider":
      return `<hr>`;

    default:
      return data.text || data.content
        ? `<p>${escapeHtml(String(data.text || data.content || ""))}</p>`
        : "";
  }
}

function renderGalleryBlock(data: any): string {
  const images = Array.isArray(data.images) ? data.images : [];
  if (images.length === 0) return "";
  const imageElements = images
    .map(
      (img: any) =>
        `<img src="${escapeHtml(String(img.src || img.url || ""))}" alt="${escapeHtml(String(img.alt || ""))}" loading="lazy">`
    )
    .join("");
  return `<figure>${imageElements}${renderCaptionHtml(data)}</figure>`;
}

function renderFAQBlock(data: any): string {
  let items: any[] = [];
  if (Array.isArray(data.items)) {
    items = data.items;
  } else if (Array.isArray(data.faqs)) {
    items = data.faqs;
  }
  if (items.length === 0) return "";
  const faqEntries = items
    .map(
      (item: any) =>
        `<dt>${escapeHtml(String(item.question || ""))}</dt><dd>${escapeHtml(String(item.answer || ""))}</dd>`
    )
    .join("");
  return `<section aria-labelledby="faq-heading"><h2 id="faq-heading">Frequently Asked Questions</h2><dl>${faqEntries}</dl></section>`;
}

function renderListBlock(data: any): string {
  const listItems = Array.isArray(data.items) ? data.items : [];
  const tag = data.ordered === true ? "ol" : "ul";
  const listElements = listItems
    .map((item: any) => `<li>${escapeHtml(String(item.text || item || ""))}</li>`)
    .join("");
  return `<${tag}>${listElements}</${tag}>`;
}

export function renderContentBlocks(blocks: ContentBlock[], locale: Locale): string {
  if (!blocks || !Array.isArray(blocks)) return "";

  const sortedBlocks = [...blocks].sort((a, b) => (a.order || 0) - (b.order || 0));

  return sortedBlocks
    .map(block => renderBlock(block))
    .filter(Boolean)
    .join("\n");
}
