import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  const docsPath = path.resolve(process.cwd(), "docs");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve documentation files (markdown)
  if (fs.existsSync(docsPath)) {
    app.use("/docs", express.static(docsPath, {
      maxAge: '1h', // Cache docs for 1 hour
      etag: true,
      lastModified: true,
      setHeaders: (res, filePath) => {
        // Markdown files - moderate caching
        if (filePath.endsWith('.md')) {
          res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
          res.setHeader('Cache-Control', 'public, max-age=3600');
        }
      }
    }));
  }

  // Static assets with aggressive caching (1 year for hashed files)
  app.use(express.static(distPath, {
    maxAge: '1y', // Cache hashed assets for 1 year
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      // Immutable for hashed files (JS, CSS with hash in filename)
      if (/\.[0-9a-f]{8,}\.(js|css)$/.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
      // Images and fonts - long cache
      else if (/\.(png|jpg|jpeg|gif|webp|avif|svg|ico|woff|woff2|ttf|eot)$/i.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
      // HTML - short cache with revalidation
      else if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      }
    }
  }));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    // No cache for HTML SPA fallback
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
