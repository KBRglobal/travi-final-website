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
function getContentType(path: string): string {
  if (path === "/" || path === "") return "homepage";
  if (/^\/article\//.exec(path)) return "article";
  if (/^\/articles$/.exec(path)) return "category";
  if (/^\/attraction\//.exec(path)) return "attraction";
  if (/^\/attractions($|\/)/.exec(path)) return "category";
  if (/^\/hotel\//.exec(path)) return "hotel";
  if (/^\/hotels($|\/)/.exec(path)) return "category";
  if (/^\/dining\//.exec(path)) return "dining";
  if (/^\/dining$/.exec(path)) return "category";
  if (/^\/events\//.exec(path)) return "event";
  if (/^\/events$/.exec(path)) return "category";
  if (/^\/news\//.exec(path)) return "news";
  if (/^\/news$/.exec(path)) return "category";
  if (/^\/(about|contact|privacy|terms|faq)$/.exec(path)) return "static";
  if (/^\/districts($|\/)/.exec(path)) return "category";
  if (/^\/shopping($|\/)/.exec(path)) return "category";
  if (/^\/guides($|\/)/.exec(path)) return "category";
  if (/^\/destinations($|\/)/.exec(path)) return "category";
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
    const { path, locale } = parsePathAndLocale(req.path);

    // Pass query params to SSR renderer for pagination support
    const searchParams = new URLSearchParams(req.query as Record<string, string>);

    const result = await renderSSR(path, locale, searchParams);

    // Handle redirects with proper HTTP headers
    if (result.redirect) {
      res.status(result.status);
      res.setHeader("Location", result.redirect);
      res.setHeader("Cache-Control", "public, max-age=86400"); // Cache redirects for 1 day
      res.send(result.html);
      return;
    }

    const contentType = getContentType(path);
    const cacheControl = getCacheControlHeader(contentType);

    res.status(result.status);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", cacheControl);
    res.setHeader("X-Robots-Tag", "index, follow");
    res.setHeader("X-SSR-Rendered", "true");
    res.setHeader("X-Content-Type-Hint", contentType);

    res.send(result.html);
  } catch (error) {
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
