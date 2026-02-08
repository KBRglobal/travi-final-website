/**
 * Content Pages Renderer (articles, hotels, attractions from CMS)
 */

import { db } from "../../../db";
import { storage } from "../../../storage";
import { tiqetsAttractions, contents } from "@shared/schema";
import type { ContentWithRelations, Locale } from "@shared/schema";
import { and, isNull, eq, desc, sql } from "drizzle-orm";
import { generateMetaTags, generateStructuredData, getCanonicalUrl } from "../../meta-tags";
import { SITE_NAME } from "../constants";
import type { SSRRenderOptions, SSRRenderResult, NormalizedItem } from "../types";
import { escapeHtml, formatDate, capitalizeFirst } from "../utils";
import { wrapInHtml, renderFooter, renderContentBlocks } from "../html-builder";
import { getContentImage } from "../content-helpers";
import { render404 } from "./error-pages";

/**
 * Render individual content page (article, attraction, hotel)
 */
export async function renderContentPage(
  slug: string,
  contentType: string,
  options: SSRRenderOptions
): Promise<SSRRenderResult> {
  const { locale = "en" } = options;

  // Fetch content with proper error handling
  let content: ContentWithRelations | undefined;
  try {
    content = await storage.getContentBySlug(slug);
  } catch (error) {
    return render404(options);
  }

  // Return 404 if content doesn't exist or isn't published
  if (content?.status !== "published") {
    return render404(options);
  }

  const urlPath = `/${contentType}/${slug}`;
  const image = getContentImage(content);

  const metaTags = generateMetaTags({
    title: content.metaTitle || content.title,
    description: content.metaDescription || "",
    url: getCanonicalUrl(urlPath, locale),
    image,
    type: contentType === "article" ? "article" : "place",
    locale,
    publishedTime: content.publishedAt?.toISOString(),
    modifiedTime: content.updatedAt?.toISOString(),
    section: contentType,
  });

  let schemaType: string;
  if (contentType === "hotel") {
    schemaType = "Hotel";
  } else if (contentType === "attraction") {
    schemaType = "TouristAttraction";
  } else {
    schemaType = "Article";
  }

  const structuredData = [
    generateStructuredData({ content, type: schemaType as any, locale }),
    generateStructuredData({ content, type: "FAQPage", locale }),
    generateStructuredData({
      type: "BreadcrumbList",
      breadcrumbs: [
        { name: "Home", url: getCanonicalUrl("/", locale) },
        {
          name: capitalizeFirst(contentType) + "s",
          url: getCanonicalUrl(`/${contentType}s`, locale),
        },
        { name: content.title, url: getCanonicalUrl(urlPath, locale) },
      ],
    }),
  ]
    .filter(Boolean)
    .join("\n");

  const bodyContent = renderContentBlocks(content.blocks || [], locale);

  const html = wrapInHtml({
    metaTags,
    structuredData,
    locale,
    content: `
      <header>
        <nav aria-label="Main navigation">
          <a href="${getCanonicalUrl("/", locale)}">${SITE_NAME}</a>
        </nav>
        <nav aria-label="Breadcrumb">
          <ol>
            <li><a href="${getCanonicalUrl("/", locale)}">Home</a></li>
            <li><a href="${getCanonicalUrl(`/${contentType}s`, locale)}">${capitalizeFirst(contentType)}s</a></li>
            <li aria-current="page">${escapeHtml(content.title)}</li>
          </ol>
        </nav>
      </header>

      <main>
        <article>
          <header>
            <h1>${escapeHtml(content.title)}</h1>
            ${content.metaDescription ? `<p class="lead">${escapeHtml(content.metaDescription)}</p>` : ""}
            ${content.publishedAt ? `<time datetime="${content.publishedAt.toISOString()}">${formatDate(content.publishedAt, locale)}</time>` : ""}
          </header>

          <div class="content">
            ${bodyContent}
          </div>
        </article>
      </main>

      ${renderFooter(locale)}
    `,
  });

  return { html, status: 200 };
}

const ITEMS_PER_PAGE = 50;

function parsePageNumber(contentType: string, searchParams?: URLSearchParams): number {
  if (contentType !== "attraction" || !searchParams) return 1;
  const pageParam = searchParams.get("page");
  if (!pageParam) return 1;
  const parsed = Number.parseInt(pageParam, 10);
  return !Number.isNaN(parsed) && parsed >= 1 ? parsed : 1;
}

async function fetchAttractionItems(
  currentPage: number
): Promise<{ items: NormalizedItem[]; totalPages: number; finalPage: number }> {
  try {
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tiqetsAttractions);

    const totalCount = countResult[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
    const finalPage = currentPage > totalPages && totalPages > 0 ? totalPages : currentPage;
    const offset = (finalPage - 1) * ITEMS_PER_PAGE;

    const tiqetsResults = await db
      .select({
        slug: tiqetsAttractions.slug,
        seoSlug: tiqetsAttractions.seoSlug,
        title: tiqetsAttractions.title,
        description: tiqetsAttractions.description,
        tiqetsSummary: tiqetsAttractions.tiqetsSummary,
        cityName: tiqetsAttractions.cityName,
      })
      .from(tiqetsAttractions)
      .orderBy(desc(tiqetsAttractions.updatedAt))
      .limit(ITEMS_PER_PAGE)
      .offset(offset);

    const items = tiqetsResults.map(item => ({
      title: item.title || item.slug,
      slug: item.seoSlug || item.slug,
      description:
        item.description ||
        item.tiqetsSummary ||
        `Attraction in ${item.cityName || "various destinations"}`,
    }));

    return { items, totalPages, finalPage };
  } catch {
    return { items: [], totalPages: 1, finalPage: currentPage };
  }
}

async function fetchContentItems(contentType: string): Promise<NormalizedItem[]> {
  try {
    const contentResults = await db
      .select({
        slug: contents.slug,
        title: contents.title,
        metaDescription: contents.metaDescription,
      })
      .from(contents)
      .where(
        and(
          eq(contents.type, contentType as any),
          eq(contents.status, "published"),
          isNull(contents.deletedAt)
        )
      )
      .orderBy(desc(contents.createdAt))
      .limit(50);

    return contentResults.map(item => ({
      title: item.title,
      slug: item.slug,
      description: item.metaDescription || undefined,
    }));
  } catch {
    return [];
  }
}

/** Build pagination HTML for category pages */
function buildPaginationHtml(
  contentType: string,
  baseUrlPath: string,
  currentPage: number,
  totalPages: number,
  locale: Locale
): string {
  if (contentType !== "attraction" || totalPages <= 1) return "";

  const prevPagePath = baseUrlPath + (currentPage === 2 ? "" : "?page=" + (currentPage - 1));
  const prevPageUrl = getCanonicalUrl(prevPagePath, locale);
  const nextPagePath = baseUrlPath + "?page=" + (currentPage + 1);
  const nextPageUrl = getCanonicalUrl(nextPagePath, locale);

  const prevLink =
    currentPage > 1 ? `<a href="${prevPageUrl}" rel="prev">Previous</a>` : `<span>Previous</span>`;
  const nextLink =
    currentPage < totalPages ? `<a href="${nextPageUrl}" rel="next">Next</a>` : `<span>Next</span>`;

  return `<nav aria-label="Pagination">${prevLink}<span>Page ${currentPage} of ${totalPages}</span>${nextLink}</nav>`;
}

/**
 * Render category listing page with pagination support for attractions
 */
export async function renderCategoryPage(
  contentType: string,
  options: SSRRenderOptions
): Promise<SSRRenderResult> {
  const { locale = "en", searchParams } = options;

  let currentPage = parsePageNumber(contentType, searchParams);
  let totalPages = 1;
  let normalizedItems: NormalizedItem[];

  if (contentType === "attraction") {
    const result = await fetchAttractionItems(currentPage);
    normalizedItems = result.items;
    totalPages = result.totalPages;
    currentPage = result.finalPage;
  } else {
    normalizedItems = await fetchContentItems(contentType);
  }

  const isPaginated = contentType === "attraction";
  const baseUrlPath = `/${contentType}s`;
  // For attractions with pagination, include page in canonical URL (except page 1)
  const urlPath =
    isPaginated && currentPage > 1 ? `${baseUrlPath}?page=${currentPage}` : baseUrlPath;

  const titles: Record<string, string> = {
    article: "Travel Articles & Guides",
    attraction: "Tourist Attractions",
    hotel: "Hotels & Accommodations",
    dining: "Restaurants & Dining",
  };

  const descriptions: Record<string, string> = {
    article:
      "Browse our collection of expert travel guides, tips, and articles covering destinations worldwide.",
    attraction:
      "Discover top tourist attractions, landmarks, and must-see places with reviews and visitor information.",
    hotel:
      "Find the best hotels and accommodations with honest reviews, photos, and booking information.",
    dining:
      "Explore restaurants, cafes, and dining experiences with menus, reviews, and recommendations.",
  };

  const title = titles[contentType] || `${capitalizeFirst(contentType)}s`;
  const baseDescription = descriptions[contentType] || `Browse all ${contentType}s on TRAVI.`;
  const showPagination = isPaginated && currentPage > 1;
  const description = showPagination
    ? `${baseDescription} Page ${currentPage} of ${totalPages}.`
    : baseDescription;
  const pageTitle = showPagination
    ? `${title} - Page ${currentPage} | ${SITE_NAME}`
    : `${title} | ${SITE_NAME}`;

  const metaTags = generateMetaTags({
    title: pageTitle,
    description,
    url: getCanonicalUrl(urlPath, locale),
    type: "website",
    locale,
  });

  // Build list items for ItemList structured data (use /attractions/ path for attractions)
  const itemUrlPrefix = isPaginated ? "/attractions" : `/${contentType}`;
  const listItems = normalizedItems.slice(0, 20).map(item => ({
    name: item.title,
    url: getCanonicalUrl(`${itemUrlPrefix}/${item.slug}`, locale),
    description: item.description || undefined,
  }));

  const structuredData = [
    generateStructuredData({
      type: "BreadcrumbList",
      breadcrumbs: [
        { name: "Home", url: getCanonicalUrl("/", locale) },
        { name: title, url: getCanonicalUrl(baseUrlPath, locale) },
      ],
    }),
    listItems.length > 0
      ? generateStructuredData({
          type: "ItemList",
          listItems,
          locale,
        })
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  // Generate pagination HTML for attractions
  const paginationHtml = buildPaginationHtml(
    contentType,
    baseUrlPath,
    currentPage,
    totalPages,
    locale
  );

  const html = wrapInHtml({
    metaTags,
    structuredData,
    locale,
    content: `
      <header>
        <nav aria-label="Main navigation">
          <a href="${getCanonicalUrl("/", locale)}">${SITE_NAME}</a>
        </nav>
        <nav aria-label="Breadcrumb">
          <ol>
            <li><a href="${getCanonicalUrl("/", locale)}">Home</a></li>
            <li aria-current="page">${title}</li>
          </ol>
        </nav>
      </header>

      <main>
        <section aria-labelledby="page-heading">
          <h1 id="page-heading">${title}${contentType === "attraction" && currentPage > 1 ? ` - Page ${currentPage}` : ""}</h1>
          <p>${baseDescription}</p>

          ${
            normalizedItems.length > 0
              ? `
          <ul class="content-list">
            ${normalizedItems
              .map(
                item => `
              <li>
                <article>
                  <h2><a href="${getCanonicalUrl(`${itemUrlPrefix}/${item.slug}`, locale)}">${escapeHtml(item.title)}</a></h2>
                  ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}
                </article>
              </li>
            `
              )
              .join("")}
          </ul>
          ${paginationHtml}
          `
              : `<p>No ${contentType}s found.</p>`
          }
        </section>
      </main>

      ${renderFooter(locale)}
    `,
  });

  return { html, status: 200 };
}
