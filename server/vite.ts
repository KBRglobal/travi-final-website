import { type Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "node:http";
import viteConfig from "../vite.config";
import fs from "node:fs";
import path from "node:path";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export async function setupVite(server: Server, app: Express) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server, path: "/vite-hmr" },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    // Sanitize URL before passing to Vite to prevent XSS via reflected input
    // Only use pathname + search, strip script tags, HTML entities, and dangerous characters
    const rawUrl = req.originalUrl;
    const sanitizedUrl = (() => {
      try {
        const parsed = new URL(rawUrl, `http://${req.headers.host || "localhost"}`);
        const clean = (parsed.pathname + parsed.search)
          .replace(/<[^>]*>/g, "")
          .replace(/[<>"'&]/g, "");
        return clean || "/";
      } catch {
        return "/";
      }
    })();

    try {
      const clientTemplate = path.resolve(import.meta.dirname, "..", "client", "index.html");

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(`src="/src/main.tsx"`, `src="/src/main.tsx?v=${nanoid()}"`);
      const page = await vite.transformIndexHtml(sanitizedUrl, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
