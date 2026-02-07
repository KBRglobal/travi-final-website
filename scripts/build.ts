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
function fixedManualChunks(id: string): string | undefined {
  // React core, routing, AND their essential dependencies
  // Including scheduler, use-sync-external-store, and i18n libraries
  // i18n is included here because react-i18next depends on React
  // and placing them together prevents CJS helper circular dependencies
  if (
    id.includes("node_modules/react/") ||
    id.includes("node_modules/react-dom/") ||
    id.includes("node_modules/wouter/") ||
    id.includes("node_modules/scheduler/") ||
    id.includes("node_modules/use-sync-external-store/") ||
    id.includes("node_modules/i18next") ||
    id.includes("node_modules/react-i18next") ||
    id.includes("node_modules/react-helmet-async/")
  ) {
    return "react-vendor";
  }
  // Radix UI components
  if (id.includes("node_modules/@radix-ui/")) {
    return "ui-vendor";
  }
  // Form libraries
  if (
    id.includes("node_modules/react-hook-form/") ||
    id.includes("node_modules/@hookform/") ||
    id.includes("node_modules/zod/")
  ) {
    return "form-vendor";
  }
  // Query and state management
  if (id.includes("node_modules/@tanstack/react-query")) {
    return "query-vendor";
  }
  // Icons - lucide
  if (id.includes("node_modules/lucide-react/")) {
    return "icons-vendor";
  }
  // react-icons (separate from lucide to avoid bloating main icon chunk)
  if (id.includes("node_modules/react-icons/")) {
    return "react-icons-vendor";
  }
  // Animation library
  if (id.includes("node_modules/framer-motion/")) {
    return "animation-vendor";
  }
  // Date utilities
  if (id.includes("node_modules/date-fns/")) {
    return "date-vendor";
  }
  // NOTE: i18n (i18next, react-i18next) is now in react-vendor to prevent circular dependencies
  // Editor libraries - heavy, admin only
  if (id.includes("node_modules/@tiptap/") || id.includes("node_modules/prosemirror")) {
    return "editor-vendor";
  }
  // Analytics
  if (id.includes("node_modules/posthog-js/")) {
    return "analytics-vendor";
  }
  // DOMPurify - used for sanitization
  if (id.includes("node_modules/dompurify/")) {
    return "sanitize-vendor";
  }
  // NOTE: react-helmet-async is in react-vendor to prevent circular dependencies
  // Homepage - separate chunk for fast initial load
  if (id.includes("/pages/homepage") || id.includes("/components/homepage/")) {
    return "homepage";
  }
  // Admin pages - split by feature for granular loading
  if (id.includes("/pages/admin/")) {
    // Destinations management
    if (id.includes("/admin/destinations/")) {
      return "admin-destinations";
    }
    // Gatekeeper / access control
    if (id.includes("/admin/gatekeeper/")) {
      return "admin-gatekeeper";
    }
    // Octypo content engine
    if (id.includes("/admin/octypo/")) {
      return "admin-octypo";
    }
    // Tiqets integration
    if (id.includes("/admin/tiqets")) {
      return "admin-tiqets";
    }
    // Content management pages
    if (id.includes("/admin/homepage-editor") || id.includes("/admin/static-page-editor")) {
      return "admin-content";
    }
    // Remaining admin pages (dashboard, rss-feeds, site-settings)
    return "admin-pages";
  }
  // Content editor - large page
  if (id.includes("/pages/content-editor")) {
    return "content-editor";
  }
  // NOTE: destination-page is intentionally NOT in manual chunks
  // Let Rollup naturally place it to avoid circular dependencies
  // The CJS helper will be placed in a shared chunk or react-vendor

  // Destination components (shared across destination pages)
  if (id.includes("/components/destination/")) {
    return "destination-components";
  }
  // Guide and attraction detail pages
  if (id.includes("/pages/guide-detail") || id.includes("/pages/attraction-detail")) {
    return "travel-details";
  }
  // Attractions listing page
  if (id.includes("/pages/attractions") || id.includes("/pages/destination-attractions")) {
    return "attractions";
  }
  // Travel style articles
  if (id.includes("/pages/travel-style-article")) {
    return "travel-articles";
  }
  // Public off-plan and content viewer
  if (id.includes("/pages/public-off-plan") || id.includes("/pages/public-content-viewer")) {
    return "public-content";
  }
  // Destinations landing page
  if (id.includes("/pages/destinations")) {
    return "destinations-landing";
  }
  // Travel guides listing page
  if (id.includes("/pages/travel-guides")) {
    return "travel-guides";
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
      // Disable modulepreload to prevent browser from fetching admin/unused chunks on public pages.
      // Without this, Vite injects <link rel="modulepreload"> for lazy chunks like admin-content,
      // admin-pages, analytics-vendor, travel-details, and form-vendor — causing 403 errors from
      // Cloudflare and ~167KB of wasted JS on the homepage.
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
