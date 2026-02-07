import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import viteCompression from "vite-plugin-compression";

/** Vendor module patterns: each entry maps path fragments to a chunk name */
const VENDOR_CHUNKS: Array<{ patterns: string[]; chunk: string }> = [
  {
    patterns: [
      "node_modules/react/",
      "node_modules/react-dom/",
      "node_modules/wouter/",
      "node_modules/scheduler/",
      "node_modules/use-sync-external-store/",
      "node_modules/react-helmet-async/",
    ],
    chunk: "react-vendor",
  },
  { patterns: ["node_modules/i18next", "node_modules/react-i18next"], chunk: "i18n-vendor" },
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

/** Admin sub-paths to chunk mapping */
const ADMIN_SUB_CHUNKS: Array<{ pattern: string; chunk: string }> = [
  { pattern: "/admin/destinations/", chunk: "admin-destinations" },
  { pattern: "/admin/gatekeeper/", chunk: "admin-gatekeeper" },
  { pattern: "/admin/octypo/", chunk: "admin-octypo" },
  { pattern: "/admin/tiqets", chunk: "admin-tiqets" },
  { pattern: "/admin/homepage-editor", chunk: "admin-content" },
  { pattern: "/admin/static-page-editor", chunk: "admin-content" },
];

/** App page path patterns to chunk mapping */
const PAGE_CHUNKS: Array<{ patterns: string[]; chunk: string }> = [
  { patterns: ["/pages/homepage", "/components/homepage/"], chunk: "homepage" },
  { patterns: ["/pages/content-editor"], chunk: "content-editor" },
  { patterns: ["/pages/destination-page"], chunk: "destination-page" },
  { patterns: ["/components/destination/"], chunk: "destination-components" },
  { patterns: ["/pages/guide-detail", "/pages/attraction-detail"], chunk: "travel-details" },
  { patterns: ["/pages/attractions", "/pages/destination-attractions"], chunk: "attractions" },
  { patterns: ["/pages/travel-style-article"], chunk: "travel-articles" },
  { patterns: ["/pages/public-off-plan", "/pages/public-content-viewer"], chunk: "public-content" },
  { patterns: ["/pages/destinations"], chunk: "destinations-landing" },
  { patterns: ["/pages/travel-guides"], chunk: "travel-guides" },
];

function matchVendorChunk(id: string): string | undefined {
  for (const { patterns, chunk } of VENDOR_CHUNKS) {
    if (patterns.some(p => id.includes(p))) return chunk;
  }
  return undefined;
}

function matchAdminChunk(id: string): string {
  for (const { pattern, chunk } of ADMIN_SUB_CHUNKS) {
    if (id.includes(pattern)) return chunk;
  }
  return "admin-pages";
}

function matchPageChunk(id: string): string | undefined {
  for (const { patterns, chunk } of PAGE_CHUNKS) {
    if (patterns.some(p => id.includes(p))) return chunk;
  }
  return undefined;
}

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
          const vendor = matchVendorChunk(id);
          if (vendor) return vendor;

          if (id.includes("/pages/admin/")) return matchAdminChunk(id);

          return matchPageChunk(id);
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
