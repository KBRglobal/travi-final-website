/**
 * Destinations Pages Renderer
 */

import { generateMetaTags, getCanonicalUrl } from "../../meta-tags";
import { BASE_URL, SITE_NAME, DESTINATION_DATA } from "../constants";
import type { SSRRenderOptions, SSRRenderResult } from "../types";
import { escapeHtml, capitalizeFirst } from "../utils";
import { wrapInHtml, renderFooter } from "../html-builder";
import { render404 } from "./error-pages";

/**
 * Render destinations hub page
 */
export async function renderDestinationsHub(options: SSRRenderOptions): Promise<SSRRenderResult> {
  const { locale = "en" } = options;

  const destinations = Object.entries(DESTINATION_DATA).map(([slug, data]) => ({
    slug,
    ...data,
  }));

  const metaTags = generateMetaTags({
    title: "Travel Destinations - Explore World Cities | TRAVI",
    description:
      "Discover top travel destinations worldwide. From Singapore to Paris, Dubai to Tokyo - explore hotels, attractions, and travel guides for 16+ amazing cities.",
    url: getCanonicalUrl("/destinations", locale),
    type: "website",
    locale,
  });

  const structuredData = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Travel Destinations",
    description: "Explore travel destinations worldwide with TRAVI",
    url: `${BASE_URL}/destinations`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: destinations.map((dest, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "City",
          name: dest.name,
          url: `${BASE_URL}/destinations/${dest.slug}`,
        },
      })),
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
          <ul>
            <li><a href="${getCanonicalUrl("/destinations", locale)}">Destinations</a></li>
            <li><a href="${getCanonicalUrl("/attractions", locale)}">Attractions</a></li>
            <li><a href="${getCanonicalUrl("/hotels", locale)}">Hotels</a></li>
            <li><a href="${getCanonicalUrl("/guides", locale)}">Guides</a></li>
          </ul>
        </nav>
      </header>

      <main>
        <section aria-labelledby="destinations-heading">
          <h1 id="destinations-heading">Explore World Destinations</h1>
          <p>Discover comprehensive travel guides, hotels, attractions, and local tips for the world's most exciting cities.</p>

          <ul class="content-list">
            ${destinations
              .map(
                dest => `
              <li>
                <article>
                  <h2><a href="${getCanonicalUrl(`/destinations/${dest.slug}`, locale)}">${escapeHtml(dest.name)}, ${escapeHtml(dest.country)}</a></h2>
                  <p><strong>${escapeHtml(dest.tagline)}</strong></p>
                  <p>${escapeHtml(dest.description)}</p>
                  <p>
                    <a href="${getCanonicalUrl(`/destinations/${dest.slug}/hotels`, locale)}">Hotels in ${escapeHtml(dest.name)}</a> |
                    <a href="${getCanonicalUrl(`/destinations/${dest.slug}/attractions`, locale)}">Attractions in ${escapeHtml(dest.name)}</a>
                  </p>
                </article>
              </li>
            `
              )
              .join("")}
          </ul>
        </section>
      </main>

      ${renderFooter(locale)}
    `,
  });

  return { html, status: 200 };
}

/**
 * Render individual destination page
 */
export async function renderDestinationPage(
  slug: string,
  options: SSRRenderOptions
): Promise<SSRRenderResult> {
  const { locale = "en" } = options;

  const destination = DESTINATION_DATA[slug];
  if (!destination) {
    return render404(options);
  }

  const metaTags = generateMetaTags({
    title: `${destination.name} Travel Guide - Hotels, Attractions & Tips | TRAVI`,
    description: destination.description,
    url: getCanonicalUrl(`/destinations/${slug}`, locale),
    image: destination.heroImage,
    type: "place",
    locale,
  });

  const structuredData = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "TravelGuide",
    name: `${destination.name} Travel Guide`,
    description: destination.description,
    url: `${BASE_URL}/destinations/${slug}`,
    image: destination.heroImage,
    about: {
      "@type": "City",
      name: destination.name,
      containedInPlace: {
        "@type": "Country",
        name: destination.country,
      },
    },
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
      { "@type": "ListItem", position: 2, name: "Destinations", item: `${BASE_URL}/destinations` },
      {
        "@type": "ListItem",
        position: 3,
        name: destination.name,
        item: `${BASE_URL}/destinations/${slug}`,
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
            <li><a href="${getCanonicalUrl("/destinations", locale)}">Destinations</a></li>
            <li aria-current="page">${escapeHtml(destination.name)}</li>
          </ol>
        </nav>
      </header>

      <main>
        <article>
          <header>
            <figure>
              <img src="${escapeHtml(destination.heroImage)}" alt="${escapeHtml(destination.name)} skyline and landmarks" loading="lazy">
            </figure>
            <p><strong>Travel Guide</strong></p>
            <h1>${escapeHtml(destination.name)}</h1>
            <p class="tagline">${escapeHtml(destination.tagline)}</p>
            <p>${escapeHtml(destination.description)}</p>
          </header>

          <section aria-labelledby="quick-facts">
            <h2 id="quick-facts">Quick Facts</h2>
            <dl>
              <dt>Country</dt>
              <dd>${escapeHtml(destination.country)}</dd>
              <dt>Currency</dt>
              <dd>${escapeHtml(destination.currency)}</dd>
              <dt>Languages</dt>
              <dd>${escapeHtml(destination.language)}</dd>
              <dt>Timezone</dt>
              <dd>${escapeHtml(destination.timezone)}</dd>
            </dl>
          </section>

          <section aria-labelledby="explore-ctas">
            <h2 id="explore-ctas">Explore ${escapeHtml(destination.name)}</h2>
            <ul>
              <li>
                <a href="${getCanonicalUrl(`/destinations/${slug}/hotels`, locale)}">
                  <strong>Find Hotels in ${escapeHtml(destination.name)}</strong>
                  <p>Compare prices from 100+ booking sites and find the best deals.</p>
                </a>
              </li>
              <li>
                <a href="${getCanonicalUrl(`/destinations/${slug}/attractions`, locale)}">
                  <strong>Tours & Attractions</strong>
                  <p>Skip-the-line tickets and guided tours for top attractions.</p>
                </a>
              </li>
              <li>
                <a href="${getCanonicalUrl(`/guides/${slug}`, locale)}">
                  <strong>Travel Guides</strong>
                  <p>Expert tips and insider knowledge for your trip.</p>
                </a>
              </li>
            </ul>
          </section>
        </article>
      </main>

      ${renderFooter(locale)}
    `,
  });

  return { html, status: 200 };
}

/**
 * Render destination subpage (hotels/attractions/dining/guides)
 */
export async function renderDestinationSubpage(
  slug: string,
  subpage: "hotels" | "attractions" | "dining" | "guides",
  options: SSRRenderOptions
): Promise<SSRRenderResult> {
  const { locale = "en" } = options;

  const destination = DESTINATION_DATA[slug];
  if (!destination) {
    return render404(options);
  }

  const titles: Record<string, string> = {
    hotels: `Hotels in ${destination.name}`,
    attractions: `Attractions in ${destination.name}`,
    dining: `Restaurants in ${destination.name}`,
    guides: `Travel Guides for ${destination.name}`,
  };

  const descriptions: Record<string, string> = {
    hotels: `Find the best hotels in ${destination.name}. Compare prices, read reviews, and book accommodations for your trip.`,
    attractions: `Discover top attractions in ${destination.name}. Book tours, skip-the-line tickets, and experiences.`,
    dining: `Explore restaurants and dining options in ${destination.name}. From local favorites to fine dining.`,
    guides: `Expert travel guides for ${destination.name}. Tips, itineraries, and insider knowledge.`,
  };

  const metaTags = generateMetaTags({
    title: `${titles[subpage]} | TRAVI`,
    description: descriptions[subpage],
    url: getCanonicalUrl(`/destinations/${slug}/${subpage}`, locale),
    image: destination.heroImage,
    type: "website",
    locale,
  });

  const structuredData = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Destinations", item: `${BASE_URL}/destinations` },
      {
        "@type": "ListItem",
        position: 3,
        name: destination.name,
        item: `${BASE_URL}/destinations/${slug}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: capitalizeFirst(subpage),
        item: `${BASE_URL}/destinations/${slug}/${subpage}`,
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
            <li><a href="${getCanonicalUrl("/destinations", locale)}">Destinations</a></li>
            <li><a href="${getCanonicalUrl(`/destinations/${slug}`, locale)}">${escapeHtml(destination.name)}</a></li>
            <li aria-current="page">${capitalizeFirst(subpage)}</li>
          </ol>
        </nav>
      </header>

      <main>
        <section aria-labelledby="page-heading">
          <h1 id="page-heading">${escapeHtml(titles[subpage])}</h1>
          <p>${escapeHtml(descriptions[subpage])}</p>

          <p>Browse our curated selection of ${subpage} in ${escapeHtml(destination.name)}.
             We compare prices and reviews to help you find the perfect options for your trip.</p>

          <nav aria-label="Related sections">
            <h2>Explore More in ${escapeHtml(destination.name)}</h2>
            <ul>
              <li><a href="${getCanonicalUrl(`/destinations/${slug}`, locale)}">Overview</a></li>
              <li><a href="${getCanonicalUrl(`/destinations/${slug}/hotels`, locale)}">Hotels</a></li>
              <li><a href="${getCanonicalUrl(`/destinations/${slug}/attractions`, locale)}">Attractions</a></li>
              <li><a href="${getCanonicalUrl(`/destinations/${slug}/dining`, locale)}">Dining</a></li>
            </ul>
          </nav>
        </section>
      </main>

      ${renderFooter(locale)}
    `,
  });

  return { html, status: 200 };
}
