import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    ...(process.env.NODE_ENV !== "production" ? [runtimeErrorOverlay()] : []),
    ...(process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then(m => m.cartographer()),
          await import("@replit/vite-plugin-dev-banner").then(m => m.devBanner()),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // Enable minification for better performance
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
      },
    },
    // CSS optimization
    cssMinify: true,
    cssCodeSplit: true,
    rollupOptions: {
      onwarn(warning, defaultHandler) {
        // Suppress circular chunk warnings caused by shared transitive deps (React, UI vendor, schema)
        if (warning.code === "CIRCULAR_DEPENDENCY" || warning.message?.includes("Circular chunk")) {
          return;
        }
        defaultHandler(warning);
      },
      output: {
        manualChunks(id) {
          // React core
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) {
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
          // State management
          if (id.includes("node_modules/zustand/")) {
            return "state-vendor";
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
          // i18n - internationalization
          if (id.includes("node_modules/i18next") || id.includes("node_modules/react-i18next")) {
            return "i18n-vendor";
          }
          // Locale translation JSON files — split by tier
          if (id.includes("/locales/")) {
            // Tier 1 — Core (en, ar, hi)
            if (
              id.includes("/locales/en/") ||
              id.includes("/locales/ar/") ||
              id.includes("/locales/hi/")
            ) {
              return "i18n-locales-core";
            }
            // Tier 2 — High ROI (zh, ru, ur, fr, id)
            if (
              id.includes("/locales/zh/") ||
              id.includes("/locales/ru/") ||
              id.includes("/locales/ur/") ||
              id.includes("/locales/fr/") ||
              id.includes("/locales/id/")
            ) {
              return "i18n-locales-t2";
            }
            // Tier 3 — Growing (de, fa, bn, fil, th, vi, ms)
            if (
              id.includes("/locales/de/") ||
              id.includes("/locales/fa/") ||
              id.includes("/locales/bn/") ||
              id.includes("/locales/fil/") ||
              id.includes("/locales/th/") ||
              id.includes("/locales/vi/") ||
              id.includes("/locales/ms/")
            ) {
              return "i18n-locales-t3";
            }
            // Remaining tiers (es, tr, it, ja, ko, he, pt, nl, pl, sv, el, cs, ro, uk, hu)
            return "i18n-locales-t4";
          }
          // i18n config — separate from vendor
          if (id.includes("/lib/i18n/")) {
            return "i18n-config";
          }
          // Editor libraries - heavy, separate chunk
          if (id.includes("node_modules/@tiptap/") || id.includes("node_modules/prosemirror")) {
            return "editor-vendor";
          }
          // Analytics
          if (id.includes("node_modules/posthog-js/")) {
            return "analytics-vendor";
          }
          // Shared admin layout/sidebar components — own chunk to prevent cross-references
          if (id.includes("/components/admin/")) {
            return "admin-shared";
          }
          // Admin pages - split into smaller chunks by feature
          if (id.includes("/pages/admin/")) {
            // Governance pages
            if (id.includes("/admin/governance/")) {
              return "admin-governance";
            }
            // Analytics/Dashboard pages
            if (
              id.includes("/admin/growth-dashboard") ||
              id.includes("/admin/destination-intelligence")
            ) {
              return "admin-analytics";
            }
            // Homepage editor — separate heavy chunk
            if (id.includes("/admin/homepage-editor")) {
              return "admin-homepage-editor";
            }
            // Static page editor — imports mammoth, separate chunk
            if (id.includes("/admin/static-page-editor")) {
              return "admin-static-editor";
            }
            // SEO pages
            if (
              id.includes("/admin/seo-hub") ||
              id.includes("/admin/seo-engine") ||
              id.includes("/admin/page-seo-editor")
            ) {
              return "admin-seo";
            }
            // Octypo suite (autopilot, writers room, AI agents, workflows)
            if (id.includes("/admin/octypo") || id.includes("/admin/writers")) {
              return "admin-octypo";
            }
            // QA and monitoring pages
            if (id.includes("/admin/qa-dashboard")) {
              return "admin-qa";
            }
            // Travi location management pages
            if (id.includes("/admin/travi/")) {
              return "admin-travi";
            }
            // Destination management pages
            if (id.includes("/admin/destinations/")) {
              return "admin-destinations-mgmt";
            }
            // Tiqets integration pages
            if (id.includes("/admin/tiqets/") || id.includes("/admin/tiqets-")) {
              return "admin-tiqets";
            }
            // Visual editor pages
            if (id.includes("/admin/visual-editor/")) {
              return "admin-visual-editor";
            }
            // Remaining admin pages (fallback)
            return "admin-pages";
          }
          // Content editor - large page
          if (id.includes("/pages/content-editor")) {
            return "content-editor";
          }
          // Shared schema — large file used across many chunks
          if (id.includes("/shared/schema")) {
            return "shared-schema";
          }
          // Destination data — large static dataset, own chunk
          if (id.includes("/data/destinations")) {
            return "destination-data";
          }
          // Destination page - split into core and sections
          if (id.includes("/pages/destination-page")) {
            return "destination-page";
          }
          // Destination components - separate chunks for lazy loading
          if (id.includes("/components/destination/")) {
            // Hero pulls framer-motion heavily — separate chunk
            if (id.includes("DestinationHero")) {
              return "destination-hero";
            }
            // Nav, safety banner, and template — above-fold, stay with page
            if (
              id.includes("DestinationNav") ||
              id.includes("safety-banner") ||
              id.includes("DestinationPageTemplate")
            ) {
              return "destination-page";
            }
            // Below-fold sections load separately
            return "destination-sections";
          }
          // Category bento grid - used in destination page
          if (id.includes("/components/category-bento-grid")) {
            return "destination-sections";
          }
          // Guide and attraction pages
          if (id.includes("/pages/guide-detail") || id.includes("/pages/attraction-detail")) {
            return "travel-details";
          }
          // Travel style articles
          if (id.includes("/pages/travel-style-article")) {
            return "travel-articles";
          }
          // Public off-plan and content viewer
          if (
            id.includes("/pages/public-off-plan") ||
            id.includes("/pages/public-content-viewer")
          ) {
            return "public-content";
          }
        },
      },
    },
    // Increase chunk size warning limit since we're splitting
    chunkSizeWarningLimit: 600,
    // Enable source maps for debugging in production (optional)
    sourcemap: false,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
