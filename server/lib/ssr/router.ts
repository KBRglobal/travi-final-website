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

// Route definitions: [pattern, handler]
type RouteHandler = (cleanPath: string, options: SSRRenderOptions) => Promise<SSRRenderResult>;

const EXACT_ROUTES: Record<string, RouteHandler> = {
  "/": (_, opts) => renderHomepage(opts),
  "/articles": (_, opts) => renderCategoryPage("article", opts),
  "/attractions": (_, opts) => renderCategoryPage("attraction", opts),
  "/hotels": (_, opts) => renderCategoryPage("hotel", opts),
  "/dining": (_, opts) => renderCategoryPage("dining", opts),
  "/about": (_, opts) => renderStaticPage("about", opts),
  "/contact": (_, opts) => renderStaticPage("contact", opts),
  "/privacy": (_, opts) => renderStaticPage("privacy", opts),
  "/destinations": (_, opts) => renderDestinationsHub(opts),
  "/guides": (_, opts) => renderGuidesHub(opts),
  "/travel-guides": (_, opts) => renderGuidesHub(opts),
  "/news": (_, opts) => renderNewsHub(opts),
  "/events": (_, opts) => renderEventsHub(opts),
  "/shopping": (_, opts) => renderShoppingHub(opts),
  "/districts": (_, opts) => renderDistrictsHub(opts),
};

const PREFIX_ROUTES: Array<[string, RouteHandler]> = [
  ["/article/", (p, opts) => renderContentPage(p.replace("/article/", ""), "article", opts)],
  ["/attraction/", (p, opts) => renderTiqetsAttractionPage(p.replace("/attraction/", ""), opts)],
  ["/hotel/", (p, opts) => renderContentPage(p.replace("/hotel/", ""), "hotel", opts)],
  ["/destinations/", (p, opts) => routeDestinationSubpage(p, opts)],
  ["/guides/", (p, opts) => renderGuidePage(p.replace("/guides/", ""), opts)],
  ["/districts/", (p, opts) => renderDistrictPage(p.replace("/districts/", ""), opts)],
  ["/dining/", (p, opts) => renderRestaurantPage(p.replace("/dining/", ""), opts)],
  ["/events/", (p, opts) => renderEventPage(p.replace("/events/", ""), opts)],
];

async function routeDestinationSubpage(
  cleanPath: string,
  options: SSRRenderOptions
): Promise<SSRRenderResult> {
  const parts = cleanPath.replace("/destinations/", "").split("/");
  const slug = parts[0];
  const subpage = parts[1];

  const validSubpages = ["hotels", "attractions", "dining", "guides"];
  if (subpage && validSubpages.includes(subpage)) {
    return renderDestinationSubpage(slug, subpage as any, options);
  }
  if (!subpage) {
    return renderDestinationPage(slug, options);
  }
  return render404(options);
}

function normalizePath(path: string): string {
  if (path === "") return "/";
  if (path.startsWith("/")) return path;
  return `/${path}`;
}

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
  const cleanPath = normalizePath(path);

  // Check exact routes
  const exactHandler = EXACT_ROUTES[cleanPath];
  if (exactHandler) return exactHandler(cleanPath, options);

  // Check prefix routes
  for (const [prefix, handler] of PREFIX_ROUTES) {
    if (cleanPath.startsWith(prefix)) return handler(cleanPath, options);
  }

  // Tiqets attraction detail: /attractions/:slug (different from /attraction/:slug)
  if (cleanPath.startsWith("/attractions/") && cleanPath !== "/attractions") {
    return renderTiqetsAttractionPage(cleanPath.replace("/attractions/", ""), options);
  }

  // City shortcut pages: /singapore, /dubai, /bangkok, etc.
  const citySlug = cleanPath.replace("/", "");
  if (DESTINATION_DATA[citySlug]) {
    return renderDestinationPage(citySlug, options);
  }

  return render404(options);
}
