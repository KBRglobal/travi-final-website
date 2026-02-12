import express, { type Express } from "express";
import fs from "node:fs";
import path from "node:path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  const docsPath = path.resolve(process.cwd(), "docs");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  // Add Link preload headers for critical resources on HTML responses
  app.use((req, res, next) => {
    const originalSendFile = res.sendFile.bind(res);
    res.sendFile = function (filePath: string, ...args: any[]) {
      if (typeof filePath === "string" && filePath.endsWith("index.html")) {
        res.setHeader(
          "Link",
          [
            '</fonts/Satoshi-Bold_1767041885349.woff2>; rel=preload; as=font; type="font/woff2"; crossorigin',
            '</fonts/Satoshi-Regular_1767041885349.woff2>; rel=preload; as=font; type="font/woff2"; crossorigin',
          ].join(", ")
        );
      }
      return originalSendFile(filePath, ...args);
    } as any;
    next();
  });

  // Serve pre-compressed Brotli/Gzip files for static assets
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();

    const acceptEncoding = req.headers["accept-encoding"] || "";
    const urlPath = req.path;

    // Only try for JS/CSS files
    if (!/\.(js|css)$/.test(urlPath)) return next();

    const filePath = path.join(distPath, urlPath);

    if (typeof acceptEncoding === "string" && acceptEncoding.includes("br")) {
      const brPath = filePath + ".br";
      if (fs.existsSync(brPath)) {
        res.setHeader("Content-Encoding", "br");
        res.setHeader(
          "Content-Type",
          urlPath.endsWith(".js") ? "application/javascript" : "text/css"
        );
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        res.setHeader("Vary", "Accept-Encoding");
        return res.sendFile(brPath);
      }
    }

    if (typeof acceptEncoding === "string" && acceptEncoding.includes("gzip")) {
      const gzPath = filePath + ".gz";
      if (fs.existsSync(gzPath)) {
        res.setHeader("Content-Encoding", "gzip");
        res.setHeader(
          "Content-Type",
          urlPath.endsWith(".js") ? "application/javascript" : "text/css"
        );
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        res.setHeader("Vary", "Accept-Encoding");
        return res.sendFile(gzPath);
      }
    }

    next();
  });

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
        // Images — 30 day cache with stale-while-revalidate
        else if (/\.(png|jpg|jpeg|gif|webp|avif|svg|ico)$/i.test(filePath)) {
          res.setHeader("Cache-Control", "public, max-age=2592000, stale-while-revalidate=604800");
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
