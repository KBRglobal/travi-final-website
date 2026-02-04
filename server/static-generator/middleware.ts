/**
 * Static Files Middleware
 * Serves pre-rendered static HTML to bots with fallback to SSR
 */

import type { Request, Response, NextFunction } from "express";
import * as fs from "fs/promises";
import * as path from "path";
import { isApprovedBot } from "../security";
import { renderSSR } from "../lib/ssr-renderer";
import type { Locale } from "@shared/schema";
import { log } from "../lib/logger";

const STATIC_DIR = process.env.STATIC_DIR || "./dist/static";
const PRIORITY_LOCALES = ["en", "ar", "de", "zh"];

/**
 * Static file serving middleware for bots
 * Priority: Static file → SSR fallback
 */
export function staticBotMiddleware(req: Request, res: Response, next: NextFunction): void {
  const userAgent = req.headers["user-agent"] || "";

  // Only apply to approved bots
  if (!isApprovedBot(userAgent)) {
    return next();
  }

  // Skip API routes and static assets
  if (isApiRoute(req.path) || isStaticAsset(req.path)) {
    return next();
  }

  // Try to serve static file, fallback to SSR
  serveStaticOrSSR(req, res, next);
}

/**
 * Serve static file or fall back to SSR
 */
async function serveStaticOrSSR(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const locale = extractLocale(req.path);
    const pagePath = extractPagePath(req.path);
    const staticFilePath = getStaticFilePath(pagePath, locale);

    // Try to serve static file
    const staticFile = await tryReadStaticFile(staticFilePath);

    if (staticFile) {
      // Static file found - serve it
      setCacheHeaders(res, getContentType(pagePath));
      res.setHeader("X-Static-Cache", "HIT");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(staticFile);
      return;
    }

    // No static file - fall back to SSR
    log.debug(`[StaticMiddleware] Cache miss for ${staticFilePath}, using SSR`);

    const html = await renderSSR(pagePath, locale as Locale);

    if (html) {
      setCacheHeaders(res, getContentType(pagePath));
      res.setHeader("X-Static-Cache", "MISS");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(html);
    } else {
      // SSR failed - continue to next middleware
      next();
    }
  } catch (error) {
    log.error("[StaticMiddleware] Error:", error);
    next();
  }
}

/**
 * Try to read a static file
 */
async function tryReadStaticFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Get static file path
 */
function getStaticFilePath(pagePath: string, locale: string): string {
  let normalizedPath = pagePath === "/" ? "/index" : pagePath;

  // Add locale prefix for non-English
  const localePath = locale === "en" ? normalizedPath : `/${locale}${normalizedPath}`;

  return path.join(STATIC_DIR, `${localePath}.html`);
}

/**
 * Extract locale from path
 */
function extractLocale(urlPath: string): string {
  // Check for locale prefix: /ar/..., /de/..., etc.
  const match = urlPath.match(/^\/([a-z]{2})(\/|$)/);

  if (match && PRIORITY_LOCALES.includes(match[1])) {
    return match[1];
  }

  return "en";
}

/**
 * Extract page path without locale
 */
function extractPagePath(urlPath: string): string {
  // Remove locale prefix if present
  const match = urlPath.match(/^\/([a-z]{2})(\/.*|$)/);

  if (match && PRIORITY_LOCALES.includes(match[1])) {
    return match[2] || "/";
  }

  return urlPath;
}

/**
 * Check if path is an API route
 */
function isApiRoute(urlPath: string): boolean {
  return urlPath.startsWith("/api/") || urlPath.startsWith("/healthz");
}

/**
 * Check if path is a static asset
 */
function isStaticAsset(urlPath: string): boolean {
  const staticExtensions = [
    ".js",
    ".css",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".svg",
    ".ico",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
    ".map",
    ".json",
    ".xml",
    ".webp",
    ".avif",
    ".mp4",
    ".webm",
    ".pdf",
  ];

  return staticExtensions.some(ext => urlPath.toLowerCase().endsWith(ext));
}

/**
 * Get content type from path for caching
 */
function getContentType(urlPath: string): string {
  if (urlPath === "/") return "homepage";
  if (urlPath.match(/^\/attraction\//)) return "attraction";
  if (urlPath.match(/^\/attractions($|\/)/)) return "category";
  if (urlPath.match(/^\/hotel\//)) return "hotel";
  if (urlPath.match(/^\/hotels($|\/)/)) return "category";
  if (urlPath.match(/^\/article\//)) return "article";
  if (urlPath.match(/^\/dining\//)) return "dining";
  if (urlPath.match(/^\/(about|contact|privacy|terms)$/)) return "static";
  return "default";
}

/**
 * Set cache headers based on content type
 */
function setCacheHeaders(res: Response, contentType: string): void {
  const cacheStrategies: Record<string, { maxAge: number; sMaxAge: number }> = {
    homepage: { maxAge: 1800, sMaxAge: 3600 },
    attraction: { maxAge: 3600, sMaxAge: 86400 },
    hotel: { maxAge: 3600, sMaxAge: 14400 },
    article: { maxAge: 300, sMaxAge: 3600 },
    dining: { maxAge: 1800, sMaxAge: 14400 },
    static: { maxAge: 86400, sMaxAge: 604800 },
    category: { maxAge: 1800, sMaxAge: 7200 },
    default: { maxAge: 3600, sMaxAge: 86400 },
  };

  const strategy = cacheStrategies[contentType] || cacheStrategies.default;

  res.setHeader(
    "Cache-Control",
    `public, max-age=${strategy.maxAge}, s-maxage=${strategy.sMaxAge}, stale-while-revalidate=${strategy.sMaxAge * 2}`
  );
}

/**
 * Warm up static cache by pre-generating pages
 */
export async function warmupCache(paths: string[]): Promise<number> {
  let warmed = 0;

  for (const pagePath of paths) {
    for (const locale of PRIORITY_LOCALES) {
      try {
        const html = await renderSSR(pagePath, locale as Locale);

        if (html) {
          const filePath = getStaticFilePath(pagePath, locale);
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, html, "utf-8");
          warmed++;
        }
      } catch (error) {
        log.error(`[StaticMiddleware] Warmup failed for ${locale}${pagePath}:`, error);
      }
    }
  }

  log.info(`[StaticMiddleware] Warmed up ${warmed} static pages`);
  return warmed;
}

/**
 * Invalidate static cache for a path
 */
export async function invalidateCache(pagePath: string): Promise<void> {
  for (const locale of PRIORITY_LOCALES) {
    const filePath = getStaticFilePath(pagePath, locale);
    try {
      await fs.unlink(filePath);
      log.debug(`[StaticMiddleware] Invalidated cache: ${filePath}`);
    } catch {
      // File may not exist
    }
  }
}
