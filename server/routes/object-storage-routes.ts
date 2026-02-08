/**
 * Object Storage Routes
 * Redirects legacy /object-storage/* URLs to CDN (cdn.travi.world)
 * Falls back to serving from storage manager if CDN is not configured
 */

import type { Express, Request, Response } from "express";
import { getStorageManager } from "../services/storage-adapter";

const CDN_BASE_URL = process.env.CDN_BASE_URL || process.env.R2_PUBLIC_URL || "";

export function registerObjectStorageRoutes(app: Express): void {
  app.get("/object-storage/*", async (req: Request, res: Response) => {
    const key = req.params[0];

    // Security: Prevent path traversal attacks
    if (!key || key.includes("..")) {
      res.status(400).send("Invalid path");
      return;
    }

    const sanitizedKey = key
      .replace(/^\/+/, "")
      .replaceAll(/[<>:"|?*]/g, "")
      .replaceAll("\\", "/");

    if (!sanitizedKey) {
      res.status(400).send("Invalid path");
      return;
    }

    // Redirect to CDN if configured
    if (CDN_BASE_URL) {
      res.redirect(301, `${CDN_BASE_URL}/${sanitizedKey}`);
      return;
    }

    // Fallback: serve from storage manager
    try {
      const storageManager = getStorageManager();
      const buffer = await storageManager.download(sanitizedKey);

      if (!buffer) {
        res.status(404).send("File not found");
        return;
      }

      const ext = sanitizedKey.split(".").pop()?.toLowerCase() || "";
      const contentTypes: Record<string, string> = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
        gif: "image/gif",
        svg: "image/svg+xml",
        ico: "image/x-icon",
        json: "application/json",
        pdf: "application/pdf",
        mp4: "video/mp4",
        webm: "video/webm",
      };

      res.set("Content-Type", contentTypes[ext] || "application/octet-stream");
      res.set("Cache-Control", "public, max-age=31536000");
      res.send(buffer);
    } catch {
      res.status(404).send("File not found");
    }
  });
}
