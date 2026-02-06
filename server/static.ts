import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  const docsPath = path.resolve(process.cwd(), "docs");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  // Serve documentation files (markdown)
  if (fs.existsSync(docsPath)) {
    app.use(
      "/docs",
      express.static(docsPath, {
        maxAge: "1h",
        etag: true,
        lastModified: true,
        setHeaders: (res, filePath) => {
          res.setHeader("Vary", "Accept-Encoding");
          if (filePath.endsWith(".md")) {
            res.setHeader("Content-Type", "text/markdown; charset=utf-8");
            res.setHeader("Cache-Control", "public, max-age=3600");
          }
        },
      })
    );
  }

  // Vite-built assets with content hash in filename — immutable, cache 1 year
  app.use(
    "/assets",
    express.static(path.join(distPath, "assets"), {
      maxAge: "1y",
      immutable: true,
      etag: false, // Not needed for immutable hashed files
      lastModified: false,
      setHeaders: res => {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        res.setHeader("Vary", "Accept-Encoding");
      },
    })
  );

  // Remaining static assets (non-hashed: favicons, manifest, images in public/)
  app.use(
    express.static(distPath, {
      maxAge: "1d", // Default: 1 day for non-hashed assets
      etag: true,
      lastModified: true,
      setHeaders: (res, filePath) => {
        res.setHeader("Vary", "Accept-Encoding");

        // JS/CSS with content hash — immutable
        if (/\.[0-9a-f]{8,}\.(js|css)$/.test(filePath)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
        // Fonts — long cache, immutable (rarely change)
        else if (/\.(woff|woff2|ttf|eot)$/i.test(filePath)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
        // Images — 1 day cache
        else if (/\.(png|jpg|jpeg|gif|webp|avif|svg|ico)$/i.test(filePath)) {
          res.setHeader("Cache-Control", "public, max-age=86400");
        }
        // HTML — no cache, always revalidate
        else if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
        }
      },
    })
  );

  // SPA fallback — always revalidate index.html
  app.use("*", (_req, res) => {
    res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    res.setHeader("Vary", "Accept-Encoding");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
