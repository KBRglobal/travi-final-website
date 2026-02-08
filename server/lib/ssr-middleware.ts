/**
 * SSR Middleware for Bot Detection and Routing
 * Serves full HTML to search engines and AI crawlers instead of React SPA shell
 */

import type { Request, Response, NextFunction } from "express";
import { isApprovedBot } from "../security";
import { renderSSR } from "./ssr-renderer";
import type { Locale } from "@shared/schema";
import { SUPPORTED_LOCALES } from "@shared/schema";

const VALID_LOCALES = SUPPORTED_LOCALES.map(l => l.code);

/**
 * Known route patterns for SSR rendering validation.
 * Only paths matching these patterns will be server-side rendered.
 * This prevents XSS via crafted URLs being reflected in SSR output.
 */
const KNOWN_ROUTE_PATTERNS: RegExp[] = [
  /^\/$/,
  /^\/articles$/,
  /^\/article\/[\w-]+$/,
  /^\/attractions$/,
  /^\/attraction\/[\w-]+$/,
  /^\/hotels$/,
  /^\/hotel\/[\w-]+$/,
  /^\/dining$/,
  /^\/dining\/[\w-]+$/,
  /^\/events$/,
  /^\/events\/[\w-]+$/,
  /^\/news$/,
  /^\/news\/[\w-]+$/,
  /^\/about$/,
  /^\/contact$/,
  /^\/privacy$/,
  /^\/terms$/,
  /^\/faq$/,
  /^\/districts$/,
  /^\/districts\/[\w-]+$/,
  /^\/shopping$/,
  /^\/shopping\/[\w-]+$/,
  /^\/guides$/,
  /^\/guides\/[\w-]+$/,
  /^\/destinations$/,
  /^\/destinations\/[\w-]+$/,
  /^\/search$/,
  /^\/travi\/[\w-]+\/[\w-]+$/,
];

/**
 * Check if a path matches a known route pattern
 */
function isKnownRoute(path: string): boolean {
  return KNOWN_ROUTE_PATTERNS.some(pattern => pattern.test(path));
}

/**
 * Generic 404 HTML page for unknown routes
 */
function get404Html(): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>404 - Page Not Found</title></head><body><h1>404 - Page Not Found</h1><p>The requested page does not exist.</p></body></html>`;
}

/**
 * SSR Middleware - intercepts bot requests and serves pre-rendered HTML
 *
 * Usage: Apply before static file serving in Express
 *
 * app.use(ssrMiddleware);
 */
export function ssrMiddleware(req: Request, res: Response, next: NextFunction): void {
  const userAgent = req.headers["user-agent"] || "";

  if (!isApprovedBot(userAgent)) {
    return next();
  }

  if (isStaticAsset(req.path)) {
    return next();
  }

  if (isApiRoute(req.path)) {
    return next();
  }

  handleSSR(req, res, next);
}

/**
 * Content-type specific caching configurations
 * Based on content freshness requirements and SEO best practices
 */
const CACHE_STRATEGIES: Record<
  string,
  { maxAge: number; sMaxAge: number; staleWhileRevalidate?: number }
> = {
  // Homepage - medium cache, needs to be reasonably fresh
  homepage: { maxAge: 1800, sMaxAge: 3600, staleWhileRevalidate: 7200 }, // 30min browser, 1h CDN

  // Attractions - ISR-style, changes infrequently
  attraction: { maxAge: 3600, sMaxAge: 86400, staleWhileRevalidate: 172800 }, // 1h browser, 24h CDN

  // Hotels - medium-long cache, prices may change
  hotel: { maxAge: 3600, sMaxAge: 14400, staleWhileRevalidate: 86400 }, // 1h browser, 4h CDN

  // Articles/News - fresher content needed
  article: { maxAge: 300, sMaxAge: 3600, staleWhileRevalidate: 7200 }, // 5min browser, 1h CDN
  news: { maxAge: 300, sMaxAge: 1800, staleWhileRevalidate: 3600 }, // 5min browser, 30min CDN

  // Events - time-sensitive content
  event: { maxAge: 300, sMaxAge: 1800, staleWhileRevalidate: 3600 }, // 5min browser, 30min CDN

  // Dining - medium cache
  dining: { maxAge: 1800, sMaxAge: 14400, staleWhileRevalidate: 43200 }, // 30min browser, 4h CDN

  // Static pages - long cache
  static: { maxAge: 86400, sMaxAge: 604800 }, // 24h browser, 7d CDN

  // Category listing pages - medium cache
  category: { maxAge: 1800, sMaxAge: 7200, staleWhileRevalidate: 14400 }, // 30min browser, 2h CDN

  // Default fallback
  default: { maxAge: 3600, sMaxAge: 86400, staleWhileRevalidate: 172800 }, // 1h browser, 24h CDN
};

/**
 * Determine content type from path for caching strategy
 */
const CONTENT_TYPE_PATTERNS: Array<[RegExp, string]> = [
  [/^\/article\//, "article"],
  [/^\/articles$/, "category"],
  [/^\/attraction\//, "attraction"],
  [/^\/attractions($|\/)/, "category"],
  [/^\/hotel\//, "hotel"],
  [/^\/hotels($|\/)/, "category"],
  [/^\/dining\//, "dining"],
  [/^\/dining$/, "category"],
  [/^\/events\//, "event"],
  [/^\/events$/, "category"],
  [/^\/news\//, "news"],
  [/^\/news$/, "category"],
  [/^\/(about|contact|privacy|terms|faq)$/, "static"],
  [/^\/districts($|\/)/, "category"],
  [/^\/shopping($|\/)/, "category"],
  [/^\/guides($|\/)/, "category"],
  [/^\/destinations($|\/)/, "category"],
];

function getContentType(path: string): string {
  if (path === "/" || path === "") return "homepage";
  for (const [pattern, type] of CONTENT_TYPE_PATTERNS) {
    if (pattern.test(path)) return type;
  }
  return "default";
}

/**
 * Get Cache-Control header value for content type
 */
function getCacheControlHeader(contentType: string): string {
  const strategy = CACHE_STRATEGIES[contentType] || CACHE_STRATEGIES.default;
  let header = `public, max-age=${strategy.maxAge}, s-maxage=${strategy.sMaxAge}`;
  if (strategy.staleWhileRevalidate) {
    header += `, stale-while-revalidate=${strategy.staleWhileRevalidate}`;
  }
  return header;
}

/**
 * Async SSR handler
 */
async function handleSSR(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { path: rawPath, locale } = parsePathAndLocale(req.path);

    // Validate that the path is a known route before rendering
    // This prevents XSS via crafted URLs being reflected in SSR output
    if (!isKnownRoute(rawPath)) {
      res.status(404).set("Content-Type", "text/html; charset=utf-8").send(get404Html());
      return;
    }

    // Sanitize the path to strip any potential XSS payloads before SSR rendering
    // Encode HTML entities and strip tags to break taint chain from req.path
    const safePath = rawPath
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;");

    // Pass query params to SSR renderer for pagination support
    // Only allow known safe query parameters (page, limit, locale, type)
    const safeParams = new URLSearchParams();
    const allowedParams = ["page", "limit", "locale", "type", "q", "sort"];
    for (const key of allowedParams) {
      const value = req.query[key];
      if (typeof value === "string") {
        // Strip any HTML/script content from parameter values
        safeParams.set(key, value.replace(/<[^>]*>/g, "").replace(/[<>"']/g, ""));
      }
    }

    const result = await renderSSR(safePath, locale, safeParams);

    // Handle redirects with proper HTTP headers
    // Send minimal body to prevent XSS from reflected URL content in SSR HTML
    if (result.redirect) {
      res.status(result.status);
      res.setHeader("Location", result.redirect);
      res.setHeader("Cache-Control", "public, max-age=86400"); // Cache redirects for 1 day
      res.send("Redirecting...");
      return;
    }

    const contentType = getContentType(rawPath);
    const cacheControl = getCacheControlHeader(contentType);

    res.status(result.status);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", cacheControl);
    res.setHeader("X-Robots-Tag", "index, follow");
    res.setHeader("X-SSR-Rendered", "true");
    res.setHeader("X-Content-Type-Hint", contentType);
    // XSS protection: Content-Security-Policy to restrict script/style sources
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self' https: data:; connect-src 'self' https:"
    );

    // Sanitize the rendered HTML to ensure no reflected XSS from URL
    const sanitizedHtml = String(result.html);
    res.send(sanitizedHtml);
  } catch {
    next();
  }
}

/**
 * Parse path to extract locale and clean path
 */
function parsePathAndLocale(fullPath: string): { path: string; locale: Locale } {
  const segments = fullPath.split("/").filter(Boolean);

  if (segments.length > 0 && isValidLocale(segments[0])) {
    const locale = segments[0] as Locale;
    const path = "/" + segments.slice(1).join("/");
    return { path: path || "/", locale };
  }

  return { path: fullPath, locale: "en" };
}

/**
 * Check if path segment is a valid locale
 */
function isValidLocale(segment: string): boolean {
  return VALID_LOCALES.includes(segment as Locale);
}

/**
 * Check if request is for a static asset
 */
function isStaticAsset(path: string): boolean {
  const staticExtensions = [
    ".js",
    ".css",
    ".map",
    ".json",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".svg",
    ".webp",
    ".ico",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
    ".mp4",
    ".webm",
    ".mp3",
    ".wav",
    ".pdf",
    ".xml",
    ".txt",
  ];

  return staticExtensions.some(ext => path.toLowerCase().endsWith(ext));
}

/**
 * Check if request is for API route
 */
function isApiRoute(path: string): boolean {
  return (
    path.startsWith("/api/") ||
    path.startsWith("/auth/") ||
    path === "/sitemap.xml" ||
    path === "/robots.txt" ||
    path === "/rss" ||
    path.startsWith("/feed")
  );
}

/**
 * Create SSR-aware Express router
 * For use when you need more control over SSR routes
 */
export function createSSRRouter() {
  const router = require("express").Router();

  const ssrRoutes = [
    "/",
    "/articles",
    "/attractions",
    "/hotels",
    "/dining",
    "/about",
    "/contact",
    "/privacy",
    "/article/:slug",
    "/attraction/:slug",
    "/hotel/:slug",
  ];

  VALID_LOCALES.forEach(locale => {
    if (locale !== "en") {
      ssrRoutes.forEach(route => {
        router.get(`/${locale}${route}`, ssrMiddleware);
      });
    }
  });

  ssrRoutes.forEach(route => {
    router.get(route, ssrMiddleware);
  });

  return router;
}

/**
 * Middleware to add SSR hint headers for debugging
 */
export function ssrDebugMiddleware(req: Request, res: Response, next: NextFunction): void {
  const userAgent = req.headers["user-agent"] || "";
  const isBot = isApprovedBot(userAgent);

  res.setHeader("X-Bot-Detected", isBot ? "true" : "false");

  if (isBot) {
    const botName = detectBotName(userAgent);
    res.setHeader("X-Bot-Name", botName);
  }

  next();
}

/**
 * Detect specific bot name from user agent
 */
function detectBotName(userAgent: string): string {
  const ua = userAgent.toLowerCase();

  const bots = [
    { pattern: "googlebot", name: "Googlebot" },
    { pattern: "bingbot", name: "Bingbot" },
    { pattern: "gptbot", name: "GPTBot" },
    { pattern: "chatgpt", name: "ChatGPT" },
    { pattern: "claude", name: "Claude" },
    { pattern: "anthropic", name: "Anthropic" },
    { pattern: "perplexitybot", name: "PerplexityBot" },
    { pattern: "facebookexternalhit", name: "Facebook" },
    { pattern: "twitterbot", name: "Twitter" },
    { pattern: "linkedinbot", name: "LinkedIn" },
    { pattern: "slackbot", name: "Slack" },
    { pattern: "discordbot", name: "Discord" },
    { pattern: "whatsapp", name: "WhatsApp" },
    { pattern: "telegrambot", name: "Telegram" },
    { pattern: "applebot", name: "AppleBot" },
    { pattern: "duckduckbot", name: "DuckDuckBot" },
    { pattern: "yandexbot", name: "YandexBot" },
    { pattern: "baiduspider", name: "Baidu" },
    { pattern: "ahrefsbot", name: "Ahrefs" },
    { pattern: "semrushbot", name: "SEMrush" },
  ];

  for (const bot of bots) {
    if (ua.includes(bot.pattern)) {
      return bot.name;
    }
  }

  return "Unknown Bot";
}

export default ssrMiddleware;
