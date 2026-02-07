/**
 * Hub Pages Renderer (news, events, shopping, districts)
 */

import { storage } from "../../../storage";
import type { Content, ContentWithRelations } from "@shared/schema";
import { generateMetaTags, generateStructuredData, getCanonicalUrl } from "../../meta-tags";
import { SITE_NAME } from "../constants";
import type { SSRRenderOptions, SSRRenderResult } from "../types";
import { escapeHtml, formatDate } from "../utils";
import { wrapInHtml, renderFooter, renderContentBlocks } from "../html-builder";
import { getContentImage } from "../content-helpers";
import { render404 } from "./error-pages";

/**
 * Render News hub page
 */
export async function renderNewsHub(options: SSRRenderOptions): Promise<SSRRenderResult> {
  const { locale = "en" } = options;

  let newsArticles: Content[] = [];
  try {
    const results = await storage.getContents({ type: "article", status: "published" });
    newsArticles = (results || [])
      .filter(
        a =>
          a.slug?.includes("news") ||
          a.title?.toLowerCase().includes("news") ||
          a.type === "article"
      )
      .slice(0, 20);
  } catch (error) {
    /* ignored */
  }

  const metaTags = generateMetaTags({
    title: "Travel News & Updates | TRAVI",
    description:
      "Stay updated with the latest travel news, destination updates, and industry insights. Get breaking news about airlines, hotels, and travel destinations worldwide.",
    url: getCanonicalUrl("/news", locale),
    type: "website",
    locale,
  });

  const structuredData = generateStructuredData({
    type: "BreadcrumbList",
    breadcrumbs: [
      { name: "Home", url: getCanonicalUrl("/", locale) },
      { name: "News", url: getCanonicalUrl("/news", locale) },
    ],
  });

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
            <li aria-current="page">News</li>
          </ol>
        </nav>
      </header>

      <main>
        <section aria-labelledby="page-heading">
          <h1 id="page-heading">Travel News & Updates</h1>
          <p>Stay informed with the latest travel news, destination updates, and industry insights from around the world.</p>

          ${
            newsArticles.length > 0
              ? `
          <ul class="content-list">
            ${newsArticles
              .map(
                item => `
              <li>
                <article>
                  <h2><a href="${getCanonicalUrl(`/article/${item.slug}`, locale)}">${escapeHtml(item.title)}</a></h2>
                  ${item.metaDescription ? `<p>${escapeHtml(item.metaDescription)}</p>` : ""}
                  ${item.publishedAt ? `<time datetime="${item.publishedAt.toISOString()}">${formatDate(item.publishedAt, locale)}</time>` : ""}
                </article>
              </li>
            `
              )
              .join("")}
          </ul>
          `
              : `<p>No news articles available at this time.</p>`
          }
        </section>
      </main>

      ${renderFooter(locale)}
    `,
  });

  return { html, status: 200 };
}

/**
 * Render Events hub page
 */
export async function renderEventsHub(options: SSRRenderOptions): Promise<SSRRenderResult> {
  const { locale = "en" } = options;

  let events: Content[] = [];
  try {
    const results = await storage.getContents({ type: "event", status: "published" });
    events = (results || []).slice(0, 20);
  } catch (error) {
    /* ignored */
  }

  const metaTags = generateMetaTags({
    title: "Events & Festivals | TRAVI",
    description:
      "Discover upcoming events, festivals, and celebrations around the world. Find cultural events, concerts, exhibitions, and local festivals to plan your travels.",
    url: getCanonicalUrl("/events", locale),
    type: "website",
    locale,
  });

  const structuredData = generateStructuredData({
    type: "BreadcrumbList",
    breadcrumbs: [
      { name: "Home", url: getCanonicalUrl("/", locale) },
      { name: "Events", url: getCanonicalUrl("/events", locale) },
    ],
  });

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
            <li aria-current="page">Events</li>
          </ol>
        </nav>
      </header>

      <main>
        <section aria-labelledby="page-heading">
          <h1 id="page-heading">Events & Festivals</h1>
          <p>Explore upcoming events, festivals, and cultural celebrations at destinations worldwide. Plan your trip around unforgettable experiences.</p>

          ${
            events.length > 0
              ? `
          <ul class="content-list">
            ${events
              .map(
                item => `
              <li>
                <article>
                  <h2><a href="${getCanonicalUrl(`/events/${item.slug}`, locale)}">${escapeHtml(item.title)}</a></h2>
                  ${item.metaDescription ? `<p>${escapeHtml(item.metaDescription)}</p>` : ""}
                </article>
              </li>
            `
              )
              .join("")}
          </ul>
          `
              : `<p>No upcoming events available at this time. Check back soon for new event listings.</p>`
          }
        </section>
      </main>

      ${renderFooter(locale)}
    `,
  });

  return { html, status: 200 };
}

/**
 * Render Shopping hub page
 */
export async function renderShoppingHub(options: SSRRenderOptions): Promise<SSRRenderResult> {
  const { locale = "en" } = options;

  const metaTags = generateMetaTags({
    title: "Shopping Guides & Destinations | TRAVI",
    description:
      "Discover the best shopping destinations, markets, malls, and boutiques around the world. Find shopping guides with tips on local products, duty-free, and souvenirs.",
    url: getCanonicalUrl("/shopping", locale),
    type: "website",
    locale,
  });

  const structuredData = generateStructuredData({
    type: "BreadcrumbList",
    breadcrumbs: [
      { name: "Home", url: getCanonicalUrl("/", locale) },
      { name: "Shopping", url: getCanonicalUrl("/shopping", locale) },
    ],
  });

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
            <li aria-current="page">Shopping</li>
          </ol>
        </nav>
      </header>

      <main>
        <section aria-labelledby="page-heading">
          <h1 id="page-heading">Shopping Guides & Destinations</h1>
          <p>Explore the world's best shopping experiences, from luxury malls to traditional markets. Find unique souvenirs, local crafts, and duty-free bargains.</p>

          <section aria-labelledby="dubai-shopping">
            <h2 id="dubai-shopping">Dubai Shopping</h2>
            <p>Dubai is a shopper's paradise with world-class malls, traditional souks, and tax-free shopping. Explore everything from gold and spices to high-end fashion.</p>
            <ul>
              <li><strong>Dubai Mall</strong> - The world's largest shopping destination</li>
              <li><strong>Mall of the Emirates</strong> - Luxury brands and Ski Dubai</li>
              <li><strong>Gold Souk</strong> - Traditional gold marketplace in Deira</li>
              <li><strong>Spice Souk</strong> - Aromatic spices and traditional goods</li>
            </ul>
          </section>
        </section>
      </main>

      ${renderFooter(locale)}
    `,
  });

  return { html, status: 200 };
}

/**
 * Render Districts hub page
 */
export async function renderDistrictsHub(options: SSRRenderOptions): Promise<SSRRenderResult> {
  const { locale = "en" } = options;

  let districts: Content[] = [];
  try {
    const results = await storage.getContents({ type: "district", status: "published" });
    districts = results || [];
  } catch (error) {
    /* ignored */
  }

  // Fallback districts data
  const dubaiDistricts = [
    {
      slug: "downtown-dubai",
      name: "Downtown Dubai",
      description: "Home to Burj Khalifa and Dubai Mall",
    },
    { slug: "dubai-marina", name: "Dubai Marina", description: "Waterfront living and dining" },
    { slug: "palm-jumeirah", name: "Palm Jumeirah", description: "Iconic palm-shaped island" },
    {
      slug: "jbr-jumeirah-beach-residence",
      name: "JBR",
      description: "Beach lifestyle and dining",
    },
    {
      slug: "business-bay",
      name: "Business Bay",
      description: "Modern business and residential hub",
    },
    { slug: "old-dubai", name: "Old Dubai", description: "Historic heart with souks and Creek" },
    { slug: "difc", name: "DIFC", description: "Financial center with art galleries" },
    {
      slug: "dubai-hills-estate",
      name: "Dubai Hills Estate",
      description: "Premium residential community",
    },
  ];

  const metaTags = generateMetaTags({
    title: "Dubai Districts & Neighborhoods | TRAVI",
    description:
      "Explore Dubai's diverse districts and neighborhoods. From Downtown's skyline to Marina's waterfront, discover the best areas to stay, dine, and experience.",
    url: getCanonicalUrl("/districts", locale),
    type: "website",
    locale,
  });

  const structuredData = generateStructuredData({
    type: "BreadcrumbList",
    breadcrumbs: [
      { name: "Home", url: getCanonicalUrl("/", locale) },
      { name: "Districts", url: getCanonicalUrl("/districts", locale) },
    ],
  });

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
            <li aria-current="page">Districts</li>
          </ol>
        </nav>
      </header>

      <main>
        <section aria-labelledby="page-heading">
          <h1 id="page-heading">Dubai Districts & Neighborhoods</h1>
          <p>Discover Dubai's unique districts, each offering its own character, attractions, and experiences. Find the perfect neighborhood for your stay.</p>

          <ul class="content-list">
            ${
              districts.length > 0
                ? districts
                    .map(
                      item => `
                <li>
                  <article>
                    <h2><a href="${getCanonicalUrl(`/districts/${item.slug}`, locale)}">${escapeHtml(item.title)}</a></h2>
                    ${item.metaDescription ? `<p>${escapeHtml(item.metaDescription)}</p>` : ""}
                  </article>
                </li>
              `
                    )
                    .join("")
                : dubaiDistricts
                    .map(
                      d => `
                <li>
                  <article>
                    <h2><a href="${getCanonicalUrl(`/districts/${d.slug}`, locale)}">${escapeHtml(d.name)}</a></h2>
                    <p>${escapeHtml(d.description)}</p>
                  </article>
                </li>
              `
                    )
                    .join("")
            }
          </ul>
        </section>
      </main>

      ${renderFooter(locale)}
    `,
  });

  return { html, status: 200 };
}

/**
 * Render individual district page
 */
export async function renderDistrictPage(
  slug: string,
  options: SSRRenderOptions
): Promise<SSRRenderResult> {
  const { locale = "en" } = options;

  let content: ContentWithRelations | undefined;
  try {
    content = await storage.getContentBySlug(slug);
  } catch (error) {
    /* ignored */
  }

  // Generate district name from slug if no content found
  const districtName =
    content?.title ||
    slug
      .split("-")
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  const description =
    content?.metaDescription ||
    `Explore ${districtName} - one of Dubai's premier districts. Discover attractions, hotels, restaurants, and experiences in this vibrant neighborhood.`;

  const metaTags = generateMetaTags({
    title: `${districtName} - Dubai District Guide | TRAVI`,
    description,
    url: getCanonicalUrl(`/districts/${slug}`, locale),
    type: "place",
    locale,
  });

  const structuredData = [
    generateStructuredData({
      type: "BreadcrumbList",
      breadcrumbs: [
        { name: "Home", url: getCanonicalUrl("/", locale) },
        { name: "Districts", url: getCanonicalUrl("/districts", locale) },
        { name: districtName, url: getCanonicalUrl(`/districts/${slug}`, locale) },
      ],
    }),
  ].join("\n");

  const bodyContent = content?.blocks
    ? renderContentBlocks(content.blocks, locale)
    : `
    <p>${escapeHtml(description)}</p>
    <section>
      <h2>About ${escapeHtml(districtName)}</h2>
      <p>This district offers a unique blend of attractions, dining, and accommodation options for visitors and residents alike.</p>
    </section>
  `;

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
            <li><a href="${getCanonicalUrl("/districts", locale)}">Districts</a></li>
            <li aria-current="page">${escapeHtml(districtName)}</li>
          </ol>
        </nav>
      </header>

      <main>
        <article>
          <h1>${escapeHtml(districtName)}</h1>
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

/**
 * Render individual restaurant/dining page
 */
export async function renderRestaurantPage(
  slug: string,
  options: SSRRenderOptions
): Promise<SSRRenderResult> {
  const { locale = "en" } = options;

  let content: ContentWithRelations | undefined;
  try {
    content = await storage.getContentBySlug(slug);
  } catch (error) {
    return render404(options);
  }

  if (content?.status !== "published") {
    return render404(options);
  }

  const image = getContentImage(content);

  const metaTags = generateMetaTags({
    title: content.metaTitle || content.title,
    description: content.metaDescription || "",
    url: getCanonicalUrl(`/dining/${slug}`, locale),
    image,
    type: "place",
    locale,
  });

  // Generate Restaurant schema (new addition for SEO)
  const restaurantLocation = content.dining?.location;
  const restaurantSchema = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: content.title,
    description: content.metaDescription || "",
    image: image,
    url: getCanonicalUrl(`/dining/${slug}`, locale),
    ...(restaurantLocation && {
      address: {
        "@type": "PostalAddress",
        addressLocality: restaurantLocation,
      },
    }),
    servesCuisine: content.dining?.cuisineType || "International",
  };

  const structuredData = [
    `<script type="application/ld+json">${JSON.stringify(restaurantSchema, null, 2)}</script>`,
    generateStructuredData({
      type: "BreadcrumbList",
      breadcrumbs: [
        { name: "Home", url: getCanonicalUrl("/", locale) },
        { name: "Dining", url: getCanonicalUrl("/dining", locale) },
        { name: content.title, url: getCanonicalUrl(`/dining/${slug}`, locale) },
      ],
    }),
  ].join("\n");

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
            <li><a href="${getCanonicalUrl("/dining", locale)}">Dining</a></li>
            <li aria-current="page">${escapeHtml(content.title)}</li>
          </ol>
        </nav>
      </header>

      <main>
        <article>
          <header>
            <h1>${escapeHtml(content.title)}</h1>
            ${content.metaDescription ? `<p class="lead">${escapeHtml(content.metaDescription)}</p>` : ""}
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

/**
 * Render individual event page
 */
export async function renderEventPage(
  slug: string,
  options: SSRRenderOptions
): Promise<SSRRenderResult> {
  const { locale = "en" } = options;

  let content: ContentWithRelations | undefined;
  try {
    content = await storage.getContentBySlug(slug);
  } catch (error) {
    return render404(options);
  }

  if (content?.status !== "published") {
    return render404(options);
  }

  const image = getContentImage(content);

  const metaTags = generateMetaTags({
    title: content.metaTitle || content.title,
    description: content.metaDescription || "",
    url: getCanonicalUrl(`/events/${slug}`, locale),
    image,
    type: "website",
    locale,
  });

  // Generate Event schema (new addition for SEO)
  const eventSchema = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: content.title,
    description: content.metaDescription || "",
    image: image,
    url: getCanonicalUrl(`/events/${slug}`, locale),
    location: {
      "@type": "Place",
      // FAIL-FAST: Do not use implicit Dubai fallback - use provided venue or event title
      name: (content.event as any)?.venueName || content.event?.venue || content.title,
      ...((content.event as any)?.location && {
        address: {
          "@type": "PostalAddress",
          addressLocality: (content.event as any)?.location,
        },
      }),
    },
    startDate:
      (content.event as any)?.startDate?.toISOString() ||
      content.event?.eventDate?.toISOString() ||
      content.publishedAt?.toISOString(),
    endDate: content.event?.endDate?.toISOString(),
    organizer: {
      "@type": "Organization",
      name: SITE_NAME,
      url: "https://travi.world",
    },
  };

  const structuredData = [
    `<script type="application/ld+json">${JSON.stringify(eventSchema, null, 2)}</script>`,
    generateStructuredData({
      type: "BreadcrumbList",
      breadcrumbs: [
        { name: "Home", url: getCanonicalUrl("/", locale) },
        { name: "Events", url: getCanonicalUrl("/events", locale) },
        { name: content.title, url: getCanonicalUrl(`/events/${slug}`, locale) },
      ],
    }),
  ].join("\n");

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
            <li><a href="${getCanonicalUrl("/events", locale)}">Events</a></li>
            <li aria-current="page">${escapeHtml(content.title)}</li>
          </ol>
        </nav>
      </header>

      <main>
        <article>
          <header>
            <h1>${escapeHtml(content.title)}</h1>
            ${content.metaDescription ? `<p class="lead">${escapeHtml(content.metaDescription)}</p>` : ""}
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
