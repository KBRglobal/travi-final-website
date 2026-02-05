/**
 * Guides Pages Renderer
 */

import { db } from "../../../db";
import { update9987Guides } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { generateMetaTags, getCanonicalUrl } from "../../meta-tags";
import { BASE_URL, SITE_NAME, DESTINATION_DATA } from "../constants";
import type { SSRRenderOptions, SSRRenderResult } from "../types";
import { escapeHtml } from "../utils";
import { wrapInHtml, renderFooter } from "../html-builder";
import { render404 } from "./error-pages";

/**
 * Render guides hub page
 */
export async function renderGuidesHub(options: SSRRenderOptions): Promise<SSRRenderResult> {
  const { locale = "en" } = options;

  // Fetch guides from database
  let guides: any[] = [];
  try {
    guides = await db
      .select()
      .from(update9987Guides)
      .where(eq(update9987Guides.status, "published"))
      .orderBy(desc(update9987Guides.publishedAt))
      .limit(50);
  } catch (error) {}

  const metaTags = generateMetaTags({
    title: "Travel Guides - Expert Tips & Destination Guides | TRAVI",
    description:
      "Comprehensive travel guides with expert tips, itineraries, and insider knowledge. Explore destinations worldwide with TRAVI's curated travel content.",
    url: getCanonicalUrl("/guides", locale),
    type: "website",
    locale,
  });

  // Only include ItemList in structured data if there are guides
  const collectionPageData: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Travel Guides",
    description: "Expert travel guides for destinations worldwide",
    url: `${BASE_URL}/guides`,
  };

  // Only add ItemList if we have guides to display
  if (guides.length > 0) {
    collectionPageData.mainEntity = {
      "@type": "ItemList",
      itemListElement: guides.slice(0, 20).map((guide, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "TravelGuide",
          name: guide.title,
          url: `${BASE_URL}/guides/${guide.slug}`,
        },
      })),
    };
  }

  const structuredData = `<script type="application/ld+json">${JSON.stringify(collectionPageData)}</script>`;

  const html = wrapInHtml({
    metaTags,
    structuredData,
    locale,
    content: `
      <header>
        <nav aria-label="Main navigation">
          <a href="${getCanonicalUrl("/", locale)}">${SITE_NAME}</a>
          <ul>
            <li><a href="${getCanonicalUrl("/destinations", locale)}">Destinations</a></li>
            <li><a href="${getCanonicalUrl("/attractions", locale)}">Attractions</a></li>
            <li><a href="${getCanonicalUrl("/hotels", locale)}">Hotels</a></li>
            <li><a href="${getCanonicalUrl("/guides", locale)}">Guides</a></li>
          </ul>
        </nav>
        <nav aria-label="Breadcrumb">
          <ol>
            <li><a href="${getCanonicalUrl("/", locale)}">Home</a></li>
            <li aria-current="page">Travel Guides</li>
          </ol>
        </nav>
      </header>

      <main>
        <section aria-labelledby="guides-heading">
          <h1 id="guides-heading">Travel Guides</h1>
          <p>Expert travel guides with insider tips, detailed itineraries, and practical information for destinations worldwide.</p>

          ${
            guides.length > 0
              ? `
          <ul class="content-list">
            ${guides
              .map(
                guide => `
              <li>
                <article>
                  <h2><a href="${getCanonicalUrl(`/guides/${guide.slug}`, locale)}">${escapeHtml(guide.title || guide.slug)}</a></h2>
                  ${guide.metaDescription ? `<p>${escapeHtml(guide.metaDescription)}</p>` : ""}
                </article>
              </li>
            `
              )
              .join("")}
          </ul>
          `
              : `
          <p>Travel guides are being prepared. Check back soon for comprehensive destination guides.</p>
          `
          }
        </section>
      </main>

      ${renderFooter(locale)}
    `,
  });

  return { html, status: 200 };
}

/**
 * Render individual guide page
 */
export async function renderGuidePage(
  slug: string,
  options: SSRRenderOptions
): Promise<SSRRenderResult> {
  const { locale = "en" } = options;

  // Fetch guide from database
  let guide: any = null;
  try {
    const results = await db
      .select()
      .from(update9987Guides)
      .where(eq(update9987Guides.slug, slug))
      .limit(1);
    guide = results[0];
  } catch (error) {}

  if (!guide) {
    // Try to find a destination match for the guide
    const destination = DESTINATION_DATA[slug];
    if (destination) {
      // Return a destination-based guide page
      return renderDestinationGuideFallback(slug, destination, options);
    }
    return render404(options);
  }

  // Extract guide content - use rewritten_content if available, fall back to sections
  const title = guide.title || slug;
  const summary = guide.metaDescription || "";
  const rewrittenContent = guide.rewrittenContent as string | null;
  const originalContent = guide.originalContent as string | null;
  const faqs = guide.faqs as Array<{ question: string; answer: string }> | null;

  // For backwards compatibility, also check sections
  const sections = guide.sections as any;
  const translation = sections?.translations?.[locale] || sections?.translations?.en || {};
  const sectionContent = translation.sections || [];

  const metaTags = generateMetaTags({
    title: `${title} - Travel Guide | TRAVI`,
    description:
      summary ||
      `Comprehensive travel guide for ${title}. Expert tips, insider knowledge, and practical information.`,
    url: getCanonicalUrl(`/guides/${slug}`, locale),
    type: "article",
    locale,
  });

  // Build FAQ schema if FAQs exist
  const faqSchema =
    faqs && faqs.length > 0
      ? `
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(faq => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  })}</script>`
      : "";

  const structuredData = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "TravelGuide",
    name: title,
    description: summary,
    url: `${BASE_URL}/guides/${slug}`,
    inLanguage: locale,
    datePublished: guide.publishedAt?.toISOString(),
    publisher: {
      "@type": "Organization",
      name: "TRAVI",
      url: BASE_URL,
    },
  })}</script>
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Travel Guides", item: `${BASE_URL}/guides` },
      { "@type": "ListItem", position: 3, name: title, item: `${BASE_URL}/guides/${slug}` },
    ],
  })}</script>${faqSchema}`;

  // Render sections content - prioritize rewritten_content over sections
  let mainContentHtml = "";

  if (rewrittenContent) {
    // Use the AI-rewritten HTML content directly (sanitize for safety)
    mainContentHtml = rewrittenContent;
  } else if (originalContent) {
    // Fall back to original content
    mainContentHtml = originalContent;
  } else if (Array.isArray(sectionContent) && sectionContent.length > 0) {
    // Fall back to structured sections
    mainContentHtml = sectionContent
      .map(
        (section: any) => `
      <section>
        <h${Math.min(section.level || 2, 6)}>${escapeHtml(section.heading || "")}</h${Math.min(section.level || 2, 6)}>
        <p>${escapeHtml(section.content || "")}</p>
      </section>
    `
      )
      .join("");
  }

  // Render FAQs if available
  let faqsHtml = "";
  if (faqs && Array.isArray(faqs) && faqs.length > 0) {
    faqsHtml = `
      <section class="faqs">
        <h2>Frequently Asked Questions</h2>
        <dl>
          ${faqs
            .map(
              faq => `
            <div class="faq-item">
              <dt>${escapeHtml(faq.question)}</dt>
              <dd>${escapeHtml(faq.answer)}</dd>
            </div>
          `
            )
            .join("")}
        </dl>
      </section>
    `;
  }

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
            <li><a href="${getCanonicalUrl("/guides", locale)}">Travel Guides</a></li>
            <li aria-current="page">${escapeHtml(title)}</li>
          </ol>
        </nav>
      </header>

      <main>
        <article>
          <header>
            <h1>${escapeHtml(title)}</h1>
            ${summary ? `<p class="lead">${escapeHtml(summary)}</p>` : ""}
          </header>

          <div class="content">
            ${mainContentHtml || `<p>Everything you need to know about visiting ${escapeHtml(title)}.</p>`}
          </div>

          ${faqsHtml}
        </article>
      </main>

      ${renderFooter(locale)}
    `,
  });

  return { html, status: 200 };
}

/**
 * Fallback guide page when no DB entry exists but destination is valid
 */
export async function renderDestinationGuideFallback(
  slug: string,
  destination: (typeof DESTINATION_DATA)[string],
  options: SSRRenderOptions
): Promise<SSRRenderResult> {
  const { locale = "en" } = options;

  const metaTags = generateMetaTags({
    title: `${destination.name} Travel Guide | TRAVI`,
    description: destination.description,
    url: getCanonicalUrl(`/guides/${slug}`, locale),
    image: destination.heroImage,
    type: "article",
    locale,
  });

  const structuredData = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "TravelGuide",
    name: `${destination.name} Travel Guide`,
    description: destination.description,
    url: `${BASE_URL}/guides/${slug}`,
    about: {
      "@type": "City",
      name: destination.name,
    },
    publisher: {
      "@type": "Organization",
      name: "TRAVI",
      url: BASE_URL,
    },
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
            <li><a href="${getCanonicalUrl("/guides", locale)}">Travel Guides</a></li>
            <li aria-current="page">${escapeHtml(destination.name)}</li>
          </ol>
        </nav>
      </header>

      <main>
        <article>
          <header>
            <figure>
              <img src="${escapeHtml(destination.heroImage)}" alt="${escapeHtml(destination.name)}" loading="lazy">
            </figure>
            <h1>${escapeHtml(destination.name)} Travel Guide</h1>
            <p class="lead">${escapeHtml(destination.description)}</p>
          </header>

          <section>
            <h2>Plan Your Trip to ${escapeHtml(destination.name)}</h2>
            <p>${escapeHtml(destination.tagline)}</p>

            <h3>Essential Information</h3>
            <dl>
              <dt>Country</dt>
              <dd>${escapeHtml(destination.country)}</dd>
              <dt>Currency</dt>
              <dd>${escapeHtml(destination.currency)}</dd>
              <dt>Languages</dt>
              <dd>${escapeHtml(destination.language)}</dd>
              <dt>Time Zone</dt>
              <dd>${escapeHtml(destination.timezone)}</dd>
            </dl>
          </section>

          <section>
            <h2>Explore More</h2>
            <ul>
              <li><a href="${getCanonicalUrl(`/destinations/${slug}`, locale)}">Destination Overview</a></li>
              <li><a href="${getCanonicalUrl(`/destinations/${slug}/hotels`, locale)}">Hotels in ${escapeHtml(destination.name)}</a></li>
              <li><a href="${getCanonicalUrl(`/destinations/${slug}/attractions`, locale)}">Top Attractions</a></li>
            </ul>
          </section>
        </article>
      </main>

      ${renderFooter(locale)}
    `,
  });

  return { html, status: 200 };
}
