/**
 * Object Storage Routes
 * Serves files from object storage with path security and content type handling
 */

import type { Express, Request, Response } from "express";
import { getStorageManager } from "../services/storage-adapter";

export function registerObjectStorageRoutes(app: Express): void {
  // Serve files from Object Storage - handles /object-storage/* requests
  app.get("/object-storage/*", async (req: Request, res: Response) => {
    const key = req.params[0];

    // Security: Prevent path traversal attacks
    if (!key || key.includes("..")) {
      res.status(400).send("Invalid path");
      return;
    }

    // Sanitize key
    const sanitizedKey = key
      .replace(/^\/+/, "")
      .replace(/[<>:"|?*]/g, "")
      .replace(/\\/g, "/");

    if (!sanitizedKey) {
      res.status(400).send("Invalid path");
      return;
    }

    try {
      const storageManager = getStorageManager();
      const buffer = await storageManager.download(sanitizedKey);

      if (!buffer) {
        res.status(404).send("File not found");
        return;
      }

      // Determine content type from extension
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
      res.set("Cache-Control", "public, max-age=31536000"); // Cache for 1 year
      res.send(buffer);
    } catch (error) {
      res.status(404).send("File not found");
    }
  });
}
