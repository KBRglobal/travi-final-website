/**
 * 301 Redirects Middleware
 *
 * Handles permanent redirects for SEO purposes:
 * - Travel style short URLs
 * - Privacy policy redirect
 * - Search query parameter stripping
 * - www to non-www domain redirect
 * - Old attraction URL format to new SEO-friendly format
 */

import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { tiqetsAttractions } from "@shared/schema";
import { eq, ilike, and } from "drizzle-orm";

interface RedirectRule {
  from: string;
  to: string;
  exact?: boolean;
}

const STATIC_REDIRECTS: RedirectRule[] = [
  { from: "/adventure", to: "/travel-styles/adventure-outdoors-complete-guide", exact: true },
  { from: "/family", to: "/travel-styles/family-travel-complete-guide", exact: true },
  { from: "/romance", to: "/travel-styles/honeymoon-romance-complete-guide", exact: true },
  { from: "/privacy-policy", to: "/privacy", exact: true },
];

// Valid destination cities for attraction redirects
const VALID_DESTINATIONS = new Set([
  "abu-dhabi",
  "amsterdam",
  "bangkok",
  "barcelona",
  "dubai",
  "hong-kong",
  "istanbul",
  "las-vegas",
  "london",
  "los-angeles",
  "miami",
  "new-york",
  "paris",
  "ras-al-khaimah",
  "rome",
  "singapore",
  "tokyo",
]);

/**
 * Get the canonical protocol, respecting proxy headers
 */
function getProtocol(req: Request): string {
  const forwardedProto = req.get("x-forwarded-proto");
  if (forwardedProto) {
    return forwardedProto.split(",")[0].trim();
  }
  return req.protocol || "https";
}

/**
 * Get the canonical host without port (for production redirects)
 */
function getCanonicalHost(host: string): string {
  return host.replace(/^www\./, "").replace(/:\d+$/, "");
}

export function redirectMiddleware(req: Request, res: Response, next: NextFunction): void {
  const host = req.get("host") || "";
  const path = req.path;
  const fullUrl = req.originalUrl;

  if (host.startsWith("www.")) {
    const canonicalHost = getCanonicalHost(host);
    const protocol = getProtocol(req);
    const newUrl = `${protocol}://${canonicalHost}${fullUrl}`;

    res.redirect(301, newUrl);
    return;
  }

  // Server-side 301 redirect for bare "/" to "/en" (replaces slow client-side redirect)
  // Preserves query strings (e.g., ?ref=betalist) for tracking/attribution
  if (path === "/") {
    const queryIndex = fullUrl.indexOf("?");
    const query = queryIndex === -1 ? "" : fullUrl.substring(queryIndex);
    res.redirect(301, `/en${query}`);
    return;
  }

  const normalizedSearchPath = path.toLowerCase().replace(/\/+$/, "") || "/";
  if (normalizedSearchPath === "/search" && req.query.q) {
    res.redirect(301, "/search");
    return;
  }

  for (const rule of STATIC_REDIRECTS) {
    const normalizedPath = path.toLowerCase().replace(/\/+$/, "") || "/";
    const normalizedFrom = rule.from.toLowerCase().replace(/\/+$/, "") || "/";

    if (rule.exact && normalizedPath === normalizedFrom) {
      res.redirect(301, rule.to);
      return;
    }
  }

  // Handle old attraction URL format: /attractions/:city/:slug -> /:city/attractions/:slug
  const oldAttractionMatch = path.match(/^\/attractions\/([^/]+)\/([^/]+)$/i);
  if (oldAttractionMatch) {
    const [, city, slug] = oldAttractionMatch;
    const cityLower = city.toLowerCase();

    // Check if it's a valid destination
    if (VALID_DESTINATIONS.has(cityLower)) {
      const newUrl = `/${cityLower}/attractions/${slug}`;
      res.redirect(301, newUrl);
      return;
    }
  }

  next();
}

/**
 * Async middleware to handle old slug -> seoSlug redirects
 * Must be registered separately since it's async and requires DB lookup
 */
export async function attractionSlugRedirectMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const path = req.path;

  // Match /:city/attractions/:slug pattern
  const attractionMatch = path.match(/^\/([^/]+)\/attractions\/([^/]+)$/i);
  if (!attractionMatch) {
    return next();
  }

  const [, city, slug] = attractionMatch;
  const cityLower = city.toLowerCase();

  // Skip if not a valid destination
  if (!VALID_DESTINATIONS.has(cityLower)) {
    return next();
  }

  // Skip API requests
  if (path.startsWith("/api/")) {
    return next();
  }

  try {
    // Convert URL format (new-york) to DB format (New York) for city matching
    const cityForDb = cityLower.replaceAll("-", " ");

    // Check if slug is an old slug that has a seoSlug
    const attraction = await db
      .select({
        slug: tiqetsAttractions.slug,
        seoSlug: tiqetsAttractions.seoSlug,
      })
      .from(tiqetsAttractions)
      .where(and(ilike(tiqetsAttractions.cityName, cityForDb), eq(tiqetsAttractions.slug, slug)))
      .limit(1);

    // If found by old slug and has a different seoSlug, redirect
    if (attraction.length && attraction[0].seoSlug && attraction[0].seoSlug !== slug) {
      res.redirect(301, `/${cityLower}/attractions/${attraction[0].seoSlug}`);
      return;
    }
  } catch (error) {
    // If DB error, just continue without redirect
    console.error("[Redirect] Error checking slug:", error);
  }

  next();
}

export function getRedirectRules(): RedirectRule[] {
  return [...STATIC_REDIRECTS];
}
