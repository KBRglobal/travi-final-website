import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
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
      output: {
        manualChunks(id) {
          // React core and routing
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/wouter/")
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
          // i18n - internationalization
          if (id.includes("node_modules/i18next") || id.includes("node_modules/react-i18next")) {
            return "i18n-vendor";
          }
          // Editor libraries - heavy, separate chunk
          if (id.includes("node_modules/@tiptap/") || id.includes("node_modules/prosemirror")) {
            return "editor-vendor";
          }
          // Analytics: PostHog lazy-loaded via dynamic import in main.tsx
          // No manual chunk needed - Vite handles async chunking automatically
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
          // Destination page - complex public page
          if (id.includes("/pages/destination-page")) {
            return "destination-page";
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
