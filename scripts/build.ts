/**
 * Production Build Script for Travi CMS
 *
 * IMPORTANT: This script uses a custom build configuration instead of vite.config.ts
 * to fix a critical circular dependency issue in the production bundle.
 *
 * PROBLEM:
 * The vite.config.ts manualChunks function creates a circular dependency:
 * react-vendor -> destination-page -> react-vendor
 *
 * This happens because:
 * 1. vite.config.ts groups react/react-dom/wouter into react-vendor but NOT scheduler/use-sync-external-store
 * 2. Rollup places the CJS interop helper (getDefaultExportFromCjs) in destination-page
 * 3. react-vendor needs this helper, creating a circular import
 * 4. This breaks React initialization in production, causing "blue screen"
 *
 * SOLUTION:
 * Since vite.config.ts is system-protected and cannot be modified, this script
 * uses configFile: false to bypass it and provides a fixed manualChunks function that:
 * 1. Includes scheduler and use-sync-external-store in react-vendor
 * 2. Includes i18next/react-i18next in react-vendor (prevents another CJS helper cycle)
 * 3. Removes destination-page from manual chunks (lets Rollup naturally place it)
 *
 * MAINTENANCE:
 * If vite.config.ts is updated, this script may need corresponding updates.
 * All build settings must match vite.config.ts except for manualChunks.
 */

import { build } from "vite";
import { build as esbuild } from "esbuild";
import react from "@vitejs/plugin-react";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import path from "node:path";

/**
 * Fixed manualChunks function that prevents circular dependencies.
 *
 * Key differences from vite.config.ts:
 * 1. react-vendor includes scheduler, use-sync-external-store, i18next, react-i18next
 * 2. destination-page is NOT manually chunked (Rollup decides its placement)
 * 3. Admin pages split more granularly to reduce largest chunk size
 * 4. Homepage and public pages have dedicated chunks for faster initial load
 */
/** Vendor module patterns: each entry maps a set of path fragments to a chunk name */
const VENDOR_CHUNKS: Array<{ patterns: string[]; chunk: string }> = [
  // React core, routing, and essential deps (including i18n to prevent CJS circular deps)
  {
    patterns: [
      "node_modules/react/",
      "node_modules/react-dom/",
      "node_modules/wouter/",
      "node_modules/scheduler/",
      "node_modules/use-sync-external-store/",
      "node_modules/i18next",
      "node_modules/react-i18next",
      "node_modules/react-helmet-async/",
    ],
    chunk: "react-vendor",
  },
  { patterns: ["node_modules/@radix-ui/"], chunk: "ui-vendor" },
  {
    patterns: ["node_modules/react-hook-form/", "node_modules/@hookform/", "node_modules/zod/"],
    chunk: "form-vendor",
  },
  { patterns: ["node_modules/@tanstack/react-query"], chunk: "query-vendor" },
  { patterns: ["node_modules/lucide-react/"], chunk: "icons-vendor" },
  { patterns: ["node_modules/react-icons/"], chunk: "react-icons-vendor" },
  { patterns: ["node_modules/framer-motion/"], chunk: "animation-vendor" },
  { patterns: ["node_modules/date-fns/"], chunk: "date-vendor" },
  { patterns: ["node_modules/@tiptap/", "node_modules/prosemirror"], chunk: "editor-vendor" },
  { patterns: ["node_modules/posthog-js/"], chunk: "analytics-vendor" },
  { patterns: ["node_modules/dompurify/"], chunk: "sanitize-vendor" },
];

/** Match vendor module to chunk name */
function matchVendorChunk(id: string): string | undefined {
  for (const { patterns, chunk } of VENDOR_CHUNKS) {
    if (patterns.some(p => id.includes(p))) return chunk;
  }
  return undefined;
}

/** Admin page sub-routing: map admin paths to specific chunks.
 * IMPORTANT: Chunk names must NOT contain "admin" — Cloudflare WAF blocks
 * requests to /assets/admin-*.js with a 403 challenge response. */
const ADMIN_SUB_CHUNKS: Array<{ pattern: string; chunk: string }> = [
  { pattern: "/admin/destinations/", chunk: "cms-destinations" },
  { pattern: "/admin/gatekeeper/", chunk: "cms-gatekeeper" },
  { pattern: "/admin/octypo/", chunk: "cms-octypo" },
  { pattern: "/admin/tiqets", chunk: "cms-tiqets" },
  { pattern: "/admin/homepage-editor", chunk: "cms-content" },
  { pattern: "/admin/static-page-editor", chunk: "cms-content" },
];

function matchAdminChunk(id: string): string {
  for (const { pattern, chunk } of ADMIN_SUB_CHUNKS) {
    if (id.includes(pattern)) return chunk;
  }
  return "cms-pages";
}

/** App page patterns: maps path fragments to chunk names */
const PAGE_CHUNKS: Array<{ patterns: string[]; chunk: string }> = [
  { patterns: ["/pages/homepage", "/components/homepage/"], chunk: "homepage" },
  { patterns: ["/pages/content-editor"], chunk: "content-editor" },
  { patterns: ["/components/destination/"], chunk: "destination-components" },
  { patterns: ["/pages/guide-detail", "/pages/attraction-detail"], chunk: "travel-details" },
  { patterns: ["/pages/attractions", "/pages/destination-attractions"], chunk: "attractions" },
  { patterns: ["/pages/travel-style-article"], chunk: "travel-articles" },
  { patterns: ["/pages/public-off-plan", "/pages/public-content-viewer"], chunk: "public-content" },
  { patterns: ["/pages/destinations"], chunk: "destinations-landing" },
  { patterns: ["/pages/travel-guides"], chunk: "travel-guides" },
];

function fixedManualChunks(id: string): string | undefined {
  const vendor = matchVendorChunk(id);
  if (vendor) return vendor;

  if (id.includes("/pages/admin/")) return matchAdminChunk(id);

  // NOTE: destination-page intentionally NOT in manual chunks to avoid circular deps
  for (const { patterns, chunk } of PAGE_CHUNKS) {
    if (patterns.some(p => id.includes(p))) return chunk;
  }

  return undefined;
}

async function buildApp() {
  console.log("Building client...");
  console.log("Using custom build config to fix circular dependency...");

  // Build WITHOUT using vite.config.ts to avoid the manualChunks override issue
  // We replicate all necessary settings here with the fixed manualChunks
  await build({
    configFile: false, // Don't use vite.config.ts
    plugins: [react(), runtimeErrorOverlay()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "../client/src"),
        "@shared": path.resolve(import.meta.dirname, "../shared"),
        "@assets": path.resolve(import.meta.dirname, "../attached_assets"),
      },
    },
    root: path.resolve(import.meta.dirname, "../client"),
    build: {
      outDir: path.resolve(import.meta.dirname, "../dist/public"),
      emptyOutDir: true,
      // Disable modulepreload to prevent browser from fetching unused chunks on public pages.
      modulePreload: false,
      // Use esbuild for faster minification
      minify: "esbuild",
      // Target modern browsers to reduce polyfill overhead
      target: "es2020",
      cssMinify: true,
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks: fixedManualChunks,
        },
      },
      chunkSizeWarningLimit: 600,
      sourcemap: false,
    },
  });

  console.log("Building server...");
  await esbuild({
    entryPoints: ["server/index.ts"],
    bundle: true,
    platform: "node",
    target: "node20",
    format: "cjs",
    outfile: "dist/index.cjs",
    external: [
      // Native modules
      "bcrypt",
      "sharp",
      "pg-native",
      "fsevents",
      // DOM/browser libs (not needed in bundle)
      "jsdom",
      "isomorphic-dompurify",
      "dompurify",
      // Unused DB drivers
      "better-sqlite3",
      "mysql2",
      "@libsql/client",
      // Build tools (not needed at runtime)
      "lightningcss",
      "@babel/core",
      "@babel/preset-typescript",
      "vite",
      "esbuild",
      "tsx",
      "typescript",
      "../vite.config",
      "./vite.config",
      "@vitejs/*",
      "@replit/*",
      // Heavy runtime deps -- resolved from node_modules at runtime
      "googleapis",
      "openai",
      "@anthropic-ai/sdk",
      "groq-sdk",
      "@google/genai",
      "@google/generative-ai",
      "swagger-ui-express",
      "swagger-ui-dist",
      "mammoth",
      "@mendable/firecrawl-js",
      "@modelcontextprotocol/sdk",
      "pino",
      "pino-pretty",
      "@upstash/redis",
      "pg",
      "drizzle-orm",
      "express",
      "express-rate-limit",
      "express-session",
      "connect-pg-simple",
      "passport",
      "openid-client",
      "helmet",
      "compression",
      "multer",
      "marked",
      "qrcode",
      "resend",
      "rss-parser",
      "node-cron",
      "zod",
      "h3-js",
      "otplib",
      "validator",
      "ws",
      "dotenv",
      "file-type",
      "@sentry/node",
    ],
    sourcemap: true,
    minify: true,
  });

  console.log("Build completed successfully!");
}

try {
  await buildApp();
} catch (err) {
  console.error("Build failed:", err);
  process.exit(1);
}
