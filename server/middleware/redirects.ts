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

// Allowed hosts for redirect destinations (prevents open-redirect attacks)
const ALLOWED_REDIRECT_HOSTS = new Set(["travi.world", "localhost"]);

/** Try to redirect www. hosts to canonical host */
function tryWwwRedirect(req: Request, res: Response, host: string, fullUrl: string): boolean {
  if (!host.startsWith("www.")) return false;
  const canonicalHost = getCanonicalHost(host);
  const baseHost = canonicalHost.split(":")[0];
  if (!ALLOWED_REDIRECT_HOSTS.has(baseHost)) return false;
  const protocol = getProtocol(req);
  const safePath = fullUrl.startsWith("/") ? fullUrl : "/";
  res.redirect(301, `${protocol}://${canonicalHost}${safePath}`);
  return true;
}

/** Try to redirect bare "/" to "/en" */
function tryRootRedirect(res: Response, path: string, fullUrl: string): boolean {
  if (path !== "/") return false;
  const queryIndex = fullUrl.indexOf("?");
  const query = queryIndex === -1 ? "" : fullUrl.substring(queryIndex);
  res.redirect(301, `/en${query}`);
  return true;
}

/** Try static redirect rules */
function tryStaticRedirect(res: Response, path: string): boolean {
  const normalizedPath = path.toLowerCase().replace(/\/+$/, "") || "/";
  for (const rule of STATIC_REDIRECTS) {
    const normalizedFrom = rule.from.toLowerCase().replace(/\/+$/, "") || "/";
    if (rule.exact && normalizedPath === normalizedFrom) {
      res.redirect(301, rule.to);
      return true;
    }
  }
  return false;
}

/** Try to redirect old attraction URL format: /attractions/:city/:slug -> /:city/attractions/:slug */
function tryOldAttractionRedirect(res: Response, path: string): boolean {
  const match = /^\/attractions\/([^/]+)\/([^/]+)$/i.exec(path);
  if (!match) return false;
  const cityLower = match[1].toLowerCase();
  if (!VALID_DESTINATIONS.has(cityLower)) return false;
  res.redirect(301, `/${cityLower}/attractions/${match[2]}`);
  return true;
}

export function redirectMiddleware(req: Request, res: Response, next: NextFunction): void {
  const host = req.get("host") || "";
  const path = req.path;
  const fullUrl = req.originalUrl;

  if (tryWwwRedirect(req, res, host, fullUrl)) return;
  if (tryRootRedirect(res, path, fullUrl)) return;

  const normalizedSearchPath = path.toLowerCase().replace(/\/+$/, "") || "/";
  if (normalizedSearchPath === "/search" && req.query.q) {
    res.redirect(301, "/search");
    return;
  }

  if (tryStaticRedirect(res, path)) return;
  if (tryOldAttractionRedirect(res, path)) return;

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
