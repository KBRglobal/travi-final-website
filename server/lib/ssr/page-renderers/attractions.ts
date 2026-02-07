/**
 * Tiqets Attractions Pages Renderer
 */

import { db } from "../../../db";
import { tiqetsAttractions } from "@shared/schema";
import { eq } from "drizzle-orm";
import { generateMetaTags, getCanonicalUrl } from "../../meta-tags";
import { BASE_URL, SITE_NAME } from "../constants";
import type { SSRRenderOptions, SSRRenderResult } from "../types";
import { escapeHtml } from "../utils";
import { wrapInHtml, renderFooter } from "../html-builder";
import { render404 } from "./error-pages";

/**
 * Render Tiqets attraction detail page
 */
export async function renderTiqetsAttractionPage(
  slug: string,
  options: SSRRenderOptions
): Promise<SSRRenderResult> {
  const { locale = "en" } = options;

  // Try to fetch from tiqets_attractions table - prefer seo_slug (clean URL) then fall back to legacy slug
  let attraction: any = null;
  try {
    // First try seo_slug (clean, user-friendly URLs)
    let results = await db
      .select()
      .from(tiqetsAttractions)
      .where(eq(tiqetsAttractions.seoSlug, slug))
      .limit(1);

    if (!results[0]) {
      // Fall back to legacy slug for backwards compatibility
      results = await db
        .select()
        .from(tiqetsAttractions)
        .where(eq(tiqetsAttractions.slug, slug))
        .limit(1);

      // If found via legacy slug, redirect to seo_slug for SEO
      if (results[0] && results[0].seoSlug) {
        const redirectUrl = `/attractions/${results[0].seoSlug}`;
        return {
          html: `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${redirectUrl}"><link rel="canonical" href="${BASE_URL}${redirectUrl}"></head><body>Redirecting...</body></html>`,
          status: 301,
          redirect: redirectUrl,
        };
      }
    }
    attraction = results[0];
  } catch (error) {
    /* ignored */
  }

  if (!attraction) {
    return render404(options);
  }

  // Use seo_slug for canonical URL if available
  const canonicalSlug = attraction.seoSlug || slug;

  const title = attraction.title || slug;
  // Use correct field names from schema: metaDescription (100% coverage), description, tiqetsSummary, tiqetsDescription
  const description =
    attraction.metaDescription ||
    attraction.description ||
    attraction.tiqetsSummary ||
    attraction.tiqetsDescription ||
    "";
  // Schema uses cityName, not city
  const city = attraction.cityName || "";
  // Get image from tiqetsImages array or images array
  let imageUrl = `${BASE_URL}/ogImage.jpg`;
  if (attraction.images && Array.isArray(attraction.images) && attraction.images.length > 0) {
    imageUrl = attraction.images[0]?.url || imageUrl;
  } else if (
    attraction.tiqetsImages &&
    Array.isArray(attraction.tiqetsImages) &&
    attraction.tiqetsImages.length > 0
  ) {
    const firstImg = attraction.tiqetsImages[0];
    imageUrl = firstImg?.large || firstImg?.medium || firstImg?.small || imageUrl;
  }

  const metaTags = generateMetaTags({
    title: `${title} - Tickets & Tours | TRAVI`,
    description: description.slice(0, 160),
    url: getCanonicalUrl(`/attractions/${canonicalSlug}`, locale),
    image: imageUrl,
    type: "place",
    locale,
  });

  const structuredData = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: title,
    description: description,
    url: `${BASE_URL}/attractions/${canonicalSlug}`,
    image: imageUrl,
    ...(city && {
      address: {
        "@type": "PostalAddress",
        addressLocality: city,
      },
    }),
  })}</script>
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Attractions", item: `${BASE_URL}/attractions` },
      {
        "@type": "ListItem",
        position: 3,
        name: title,
        item: `${BASE_URL}/attractions/${canonicalSlug}`,
      },
    ],
  })}</script>`;

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
            <li><a href="${getCanonicalUrl("/attractions", locale)}">Attractions</a></li>
            <li aria-current="page">${escapeHtml(title)}</li>
          </ol>
        </nav>
      </header>

      <main>
        <article>
          <header>
            <figure>
              <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" loading="lazy">
            </figure>
            <h1>${escapeHtml(title)}</h1>
            ${city ? `<p><strong>Location:</strong> ${escapeHtml(city)}</p>` : ""}
          </header>

          <div class="content">
            <p>${escapeHtml(description)}</p>
          </div>

          <section>
            <h2>Book Tickets</h2>
            <p>Skip-the-line tickets and guided tours available. Compare prices and book your experience.</p>
          </section>
        </article>
      </main>

      ${renderFooter(locale)}
    `,
  });

  return { html, status: 200 };
}
