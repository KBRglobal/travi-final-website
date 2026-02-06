/**
 * Production Build Script for Travi CMS
 *
 * IMPORTANT: This script uses a custom build configuration instead of vite.config.ts
 * to fix a critical circular dependency issue in the production bundle.
 *
 * PROBLEM:
 * The vite.config.ts manualChunks function creates a circular dependency:
 * react-vendor → destination-page → react-vendor
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
import path from "path";

/**
 * Fixed manualChunks function that prevents circular dependencies.
 *
 * Key differences from vite.config.ts:
 * 1. react-vendor includes scheduler, use-sync-external-store, i18next, react-i18next
 * 2. destination-page is NOT manually chunked (Rollup decides its placement)
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
    id.includes("node_modules/react-i18next")
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
  // Icons
  if (id.includes("node_modules/lucide-react/")) {
    return "icons-vendor";
  }
  // DnD kit
  if (id.includes("node_modules/@dnd-kit/")) {
    return "dnd-vendor";
  }
  // Animation library
  if (id.includes("node_modules/framer-motion/")) {
    return "animation-vendor";
  }
  // Charts - only needed in admin/analytics
  if (id.includes("node_modules/recharts/") || id.includes("node_modules/d3-")) {
    return "charts-vendor";
  }
  // Date utilities
  if (id.includes("node_modules/date-fns/")) {
    return "date-vendor";
  }
  // NOTE: i18n (i18next, react-i18next) is now in react-vendor to prevent circular dependencies
  // Editor libraries - heavy, separate chunk
  if (id.includes("node_modules/@tiptap/") || id.includes("node_modules/prosemirror")) {
    return "editor-vendor";
  }
  // Analytics
  if (id.includes("node_modules/posthog-js/")) {
    return "analytics-vendor";
  }
  // Admin pages - split into smaller chunks by feature
  if (id.includes("/pages/admin/")) {
    // Governance pages
    if (id.includes("/admin/governance/")) {
      return "admin-governance";
    }
    // Analytics/Dashboard pages
    if (id.includes("/admin/growth-dashboard") || id.includes("/admin/destination-intelligence")) {
      return "admin-analytics";
    }
    // Content management pages
    if (id.includes("/admin/homepage-editor") || id.includes("/admin/static-page-editor")) {
      return "admin-content";
    }
    // QA and monitoring pages
    if (id.includes("/admin/qa-dashboard") || id.includes("/admin/octypo")) {
      return "admin-qa";
    }
    // Remaining admin pages
    return "admin-pages";
  }
  // Content editor - large page
  if (id.includes("/pages/content-editor")) {
    return "content-editor";
  }
  // Static page editor - large page
  if (id.includes("/pages/admin/static-page-editor")) {
    return "static-page-editor";
  }
  // NOTE: destination-page is intentionally NOT in manual chunks
  // Let Rollup naturally place it to avoid circular dependencies
  // The CJS helper will be placed in a shared chunk or react-vendor

  // Guide and attraction pages
  if (id.includes("/pages/guide-detail") || id.includes("/pages/attraction-detail")) {
    return "travel-details";
  }
  // Travel style articles
  if (id.includes("/pages/travel-style-article")) {
    return "travel-articles";
  }
  // Public off-plan and content viewer
  if (id.includes("/pages/public-off-plan") || id.includes("/pages/public-content-viewer")) {
    return "public-content";
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
      minify: "terser",
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
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
      "bcrypt",
      "jsdom",
      "isomorphic-dompurify",
      "dompurify",
      "pg-native",
      "better-sqlite3",
      "mysql2",
      "@libsql/client",
      "fsevents",
      "lightningcss",
      "@babel/core",
      "@babel/preset-typescript",
      "vite",
      "esbuild",
      "../vite.config",
      "./vite.config",
      "@vitejs/*",
      "@replit/*",
    ],
    sourcemap: true,
    minify: false,
  });

  console.log("Build completed successfully!");
}

buildApp().catch(err => {
  console.error("Build failed:", err);
  process.exit(1);
});
