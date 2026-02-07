import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import viteCompression from "vite-plugin-compression";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then(m => m.cartographer()),
          await import("@replit/vite-plugin-dev-banner").then(m => m.devBanner()),
        ]
      : []),
    viteCompression({ algorithm: "gzip" }),
    viteCompression({ algorithm: "brotliCompress" }),
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
    // Disable modulepreload to prevent browser from fetching admin/unused chunks on public pages.
    // Without this, Vite injects <link rel="modulepreload"> for lazy chunks like admin-content,
    // admin-pages, analytics-vendor, travel-details, and form-vendor — causing 403 errors from
    // Cloudflare and ~167KB of wasted JS on the homepage.
    modulePreload: false,
    // Use esbuild for faster minification (terser is slower with marginal gains)
    minify: "esbuild",
    // CSS optimization
    cssMinify: true,
    cssCodeSplit: true,
    // Target modern browsers to reduce polyfill overhead
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React core, routing, and essential React dependencies
          // Including scheduler and use-sync-external-store prevents circular deps
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/wouter/") ||
            id.includes("node_modules/scheduler/") ||
            id.includes("node_modules/use-sync-external-store/") ||
            id.includes("node_modules/react-helmet-async/")
          ) {
            return "react-vendor";
          }
          // i18n - internationalization (kept separate from react-vendor for caching)
          if (id.includes("node_modules/i18next") || id.includes("node_modules/react-i18next")) {
            return "i18n-vendor";
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
          // Destination page - complex public page
          if (id.includes("/pages/destination-page")) {
            return "destination-page";
          }
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
          if (
            id.includes("/pages/public-off-plan") ||
            id.includes("/pages/public-content-viewer")
          ) {
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
