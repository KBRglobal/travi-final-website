/**
 * SSR Module Index
 *
 * This module exports all SSR-related functionality for server-side rendering
 * of pages for search engine and AI crawlers.
 *
 * COMPREHENSIVE COVERAGE:
 * - Legacy routes: /, /articles, /attractions, /hotels, /dining, /about, /contact, /privacy
 * - Destination routes: /destinations, /destinations/:slug, /destinations/:slug/hotels|attractions
 * - Guide routes: /guides, /guides/:slug, /travel-guides
 * - City pages: /singapore, /dubai, /bangkok, etc.
 * - Tiqets attractions: /attractions/:slug (tiqets-based)
 */

// Constants
export { BASE_URL, SITE_NAME, DESTINATION_DATA } from "./constants";

// Types
export type {
  SSRRenderOptions,
  SSRRenderResult,
  NormalizedItem,
  FeaturedAttraction,
} from "./types";

// Utilities
export { escapeHtml, formatDate, capitalizeFirst } from "./utils";

// HTML Building
export { wrapInHtml, renderFooter, renderContentBlocks } from "./html-builder";

// Content Helpers
export { getContentImage } from "./content-helpers";

// Page Renderers
export {
  renderHomepage,
  renderStaticPage,
  render404,
  renderContentPage,
  renderCategoryPage,
  renderDestinationsHub,
  renderDestinationPage,
  renderDestinationSubpage,
  renderGuidesHub,
  renderGuidePage,
  renderDestinationGuideFallback,
  renderTiqetsAttractionPage,
  renderNewsHub,
  renderEventsHub,
  renderShoppingHub,
  renderDistrictsHub,
  renderDistrictPage,
  renderRestaurantPage,
  renderEventPage,
} from "./page-renderers";

// Main Router
export { renderSSR } from "./router";
