/**
 * Homepage Renderer
 */

import { db } from "../../../db";
import { storage } from "../../../storage";
import { tiqetsAttractions } from "@shared/schema";
import type { Content, Locale } from "@shared/schema";
import { desc } from "drizzle-orm";
import { generateMetaTags, generateStructuredData, getCanonicalUrl } from "../../meta-tags";
import { SITE_NAME } from "../constants";
import type { SSRRenderOptions, SSRRenderResult, FeaturedAttraction } from "../types";
import { escapeHtml } from "../utils";
import { wrapInHtml, renderFooter } from "../html-builder";

/**
 * Render homepage with featured content
 */
export async function renderHomepage(options: SSRRenderOptions): Promise<SSRRenderResult> {
  const { locale = "en" } = options;

  let featuredAttractions: FeaturedAttraction[] = [];
  let hotels: Content[] = [];
  let articles: Content[] = [];

  // Fetch Tiqets attractions separately (this is where real data is)
  try {
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
      .limit(6);

    featuredAttractions = tiqetsResults.map(item => ({
      title: item.title || item.slug,
      slug: item.seoSlug || item.slug,
      description:
        item.description ||
        item.tiqetsSummary ||
        `Attraction in ${item.cityName || "various destinations"}`,
    }));
  } catch (error) {}

  // Fetch hotels and articles from contents table
  try {
    const results = await Promise.all([
      storage.getContents({ type: "hotel", status: "published" }),
      storage.getContents({ type: "article", status: "published" }),
    ]);
    hotels = results[0] || [];
    articles = results[1] || [];
  } catch (error) {}

  const featuredHotels = hotels.slice(0, 6);
  const featuredArticles = articles.slice(0, 6);

  const metaTags = generateMetaTags({
    title: "TRAVI - Expert Travel Guides & Reviews",
    description:
      "Discover the best hotels, attractions, restaurants, and local experiences worldwide. TRAVI provides expert travel guides with honest reviews and insider tips.",
    url: getCanonicalUrl("/", locale),
    type: "website",
    locale,
  });

  const structuredData = [
    generateStructuredData({ type: "WebSite", locale }),
    generateStructuredData({ type: "Organization", locale }),
    generateStructuredData({
      type: "BreadcrumbList",
      breadcrumbs: [{ name: "Home", url: getCanonicalUrl("/", locale) }],
    }),
  ].join("\n");

  const html = wrapInHtml({
    metaTags,
    structuredData,
    locale,
    content: `
      <header>
        <nav aria-label="Main navigation">
          <a href="${getCanonicalUrl("/", locale)}">${SITE_NAME}</a>
          <ul>
            <li><a href="${getCanonicalUrl("/attractions", locale)}">Attractions</a></li>
            <li><a href="${getCanonicalUrl("/hotels", locale)}">Hotels</a></li>
            <li><a href="${getCanonicalUrl("/articles", locale)}">Articles</a></li>
            <li><a href="${getCanonicalUrl("/dining", locale)}">Dining</a></li>
          </ul>
        </nav>
      </header>

      <main>
        <section aria-labelledby="hero-heading">
          <h1 id="hero-heading">Expert Travel Guides for World Destinations</h1>
          <p>Discover curated recommendations for hotels, attractions, restaurants, and authentic local experiences. Our expert team provides honest reviews and insider tips.</p>
        </section>

        ${
          featuredAttractions.length > 0
            ? `
        <section aria-labelledby="attractions-heading">
          <h2 id="attractions-heading">Popular Attractions</h2>
          <ul>
            ${featuredAttractions
              .map(
                item => `
              <li>
                <article>
                  <h3><a href="${getCanonicalUrl(`/attractions/${item.slug}`, locale)}">${escapeHtml(item.title)}</a></h3>
                  ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}
                </article>
              </li>
            `
              )
              .join("")}
          </ul>
          <a href="${getCanonicalUrl("/attractions", locale)}">View all attractions</a>
        </section>
        `
            : ""
        }

        ${
          featuredHotels.length > 0
            ? `
        <section aria-labelledby="hotels-heading">
          <h2 id="hotels-heading">Top Hotels</h2>
          <ul>
            ${featuredHotels
              .map(
                item => `
              <li>
                <article>
                  <h3><a href="${getCanonicalUrl(`/hotel/${item.slug}`, locale)}">${escapeHtml(item.title)}</a></h3>
                  ${item.metaDescription ? `<p>${escapeHtml(item.metaDescription)}</p>` : ""}
                </article>
              </li>
            `
              )
              .join("")}
          </ul>
          <a href="${getCanonicalUrl("/hotels", locale)}">View all hotels</a>
        </section>
        `
            : ""
        }

        ${
          featuredArticles.length > 0
            ? `
        <section aria-labelledby="articles-heading">
          <h2 id="articles-heading">Latest Articles</h2>
          <ul>
            ${featuredArticles
              .map(
                item => `
              <li>
                <article>
                  <h3><a href="${getCanonicalUrl(`/article/${item.slug}`, locale)}">${escapeHtml(item.title)}</a></h3>
                  ${item.metaDescription ? `<p>${escapeHtml(item.metaDescription)}</p>` : ""}
                </article>
              </li>
            `
              )
              .join("")}
          </ul>
          <a href="${getCanonicalUrl("/articles", locale)}">View all articles</a>
        </section>
        `
            : ""
        }
      </main>

      ${renderFooter(locale)}
    `,
  });

  return { html, status: 200 };
}
