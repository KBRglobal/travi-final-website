/**
 * SSR Renderer for Bots
 * Generates complete HTML pages for search engine and AI crawlers
 *
 * COMPREHENSIVE COVERAGE:
 * - Legacy routes: /, /articles, /attractions, /hotels, /dining, /about, /contact, /privacy
 * - Destination routes: /destinations, /destinations/:slug, /destinations/:slug/hotels|attractions
 * - Guide routes: /guides, /guides/:slug, /travel-guides
 * - City pages: /singapore, /dubai, /bangkok, etc.
 * - Tiqets attractions: /attractions/:slug (tiqets-based)
 *
 * This file re-exports all SSR functionality from the modular ssr/ directory.
 * For new development, import directly from ./ssr instead.
 */

// Re-export everything from the modular SSR module
export * from "./ssr";

// For backwards compatibility, also export renderSSR as default export
export { renderSSR } from "./ssr";
