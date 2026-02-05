/**
 * SSR Router - Main routing logic for SSR rendering
 */

import type { Locale } from "@shared/schema";
import { DESTINATION_DATA } from "./constants";
import type { SSRRenderOptions, SSRRenderResult } from "./types";
import {
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
  renderTiqetsAttractionPage,
  renderNewsHub,
  renderEventsHub,
  renderShoppingHub,
  renderDistrictsHub,
  renderDistrictPage,
  renderRestaurantPage,
  renderEventPage,
} from "./page-renderers";

/**
 * Main SSR render function - routes to appropriate renderer
 * Note: The path should already be normalized (locale stripped) by ssr-middleware
 */
export async function renderSSR(
  path: string,
  locale: Locale = "en",
  searchParams?: URLSearchParams
): Promise<SSRRenderResult> {
  const options: SSRRenderOptions = { locale, path, searchParams };

  // Normalize path - ensure it starts with / and handle empty paths
  // Do NOT strip locale here - middleware already handles that
  const cleanPath = path === "" ? "/" : path.startsWith("/") ? path : `/${path}`;

  if (cleanPath === "/" || cleanPath === "") {
    return renderHomepage(options);
  }

  if (cleanPath.startsWith("/article/")) {
    const slug = cleanPath.replace("/article/", "");
    return renderContentPage(slug, "article", options);
  }

  if (cleanPath.startsWith("/attraction/")) {
    const slug = cleanPath.replace("/attraction/", "");
    // Redirect singular /attraction/ to plural /attractions/ for Tiqets data
    return renderTiqetsAttractionPage(slug, options);
  }

  if (cleanPath.startsWith("/hotel/")) {
    const slug = cleanPath.replace("/hotel/", "");
    return renderContentPage(slug, "hotel", options);
  }

  if (cleanPath === "/articles") {
    return renderCategoryPage("article", options);
  }

  if (cleanPath === "/attractions") {
    return renderCategoryPage("attraction", options);
  }

  if (cleanPath === "/hotels") {
    return renderCategoryPage("hotel", options);
  }

  if (cleanPath === "/dining") {
    return renderCategoryPage("dining", options);
  }

  if (cleanPath === "/about") {
    return renderStaticPage("about", options);
  }

  if (cleanPath === "/contact") {
    return renderStaticPage("contact", options);
  }

  if (cleanPath === "/privacy") {
    return renderStaticPage("privacy", options);
  }

  // ====== NEW SSR ROUTES ======

  // Destinations hub page
  if (cleanPath === "/destinations") {
    return renderDestinationsHub(options);
  }

  // Destination detail pages: /destinations/:slug
  if (cleanPath.startsWith("/destinations/")) {
    const parts = cleanPath.replace("/destinations/", "").split("/");
    const slug = parts[0];
    const subpage = parts[1]; // hotels, attractions, dining, etc.

    if (subpage === "hotels") {
      return renderDestinationSubpage(slug, "hotels", options);
    }
    if (subpage === "attractions") {
      return renderDestinationSubpage(slug, "attractions", options);
    }
    if (subpage === "dining") {
      return renderDestinationSubpage(slug, "dining", options);
    }
    if (subpage === "guides") {
      return renderDestinationSubpage(slug, "guides", options);
    }
    if (!subpage) {
      return renderDestinationPage(slug, options);
    }
  }

  // Travel guides hub
  if (cleanPath === "/guides" || cleanPath === "/travel-guides") {
    return renderGuidesHub(options);
  }

  // Guide detail: /guides/:slug
  if (cleanPath.startsWith("/guides/")) {
    const slug = cleanPath.replace("/guides/", "");
    return renderGuidePage(slug, options);
  }

  // City shortcut pages: /singapore, /dubai, /bangkok, etc.
  const citySlug = cleanPath.replace("/", "");
  if (DESTINATION_DATA[citySlug]) {
    return renderDestinationPage(citySlug, options);
  }

  // Tiqets attraction detail: /attractions/:slug (different from /attraction/:slug)
  if (cleanPath.startsWith("/attractions/") && cleanPath !== "/attractions") {
    const slug = cleanPath.replace("/attractions/", "");
    return renderTiqetsAttractionPage(slug, options);
  }

  // ====== ADDITIONAL SSR ROUTES (Phase 2) ======

  // News hub page
  if (cleanPath === "/news") {
    return renderNewsHub(options);
  }

  // Events hub page
  if (cleanPath === "/events") {
    return renderEventsHub(options);
  }

  // Shopping hub page
  if (cleanPath === "/shopping") {
    return renderShoppingHub(options);
  }

  // Districts hub page
  if (cleanPath === "/districts") {
    return renderDistrictsHub(options);
  }

  // District detail pages: /districts/:slug
  if (cleanPath.startsWith("/districts/")) {
    const slug = cleanPath.replace("/districts/", "");
    return renderDistrictPage(slug, options);
  }

  // Dining/Restaurant detail pages: /dining/:slug
  if (cleanPath.startsWith("/dining/")) {
    const slug = cleanPath.replace("/dining/", "");
    return renderRestaurantPage(slug, options);
  }

  // Event detail pages: /events/:slug (if individual event pages exist)
  if (cleanPath.startsWith("/events/")) {
    const slug = cleanPath.replace("/events/", "");
    return renderEventPage(slug, options);
  }

  return render404(options);
}
