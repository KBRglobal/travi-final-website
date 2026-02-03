/**
 * Media & Affiliate Links Routes
 * Media file CRUD operations and affiliate link management
 */

import type { Express, Request, Response } from "express";
import { z } from "zod";
import multer from "multer";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import {
  requireAuth,
  requirePermission,
  checkReadOnlyMode,
  validateMediaUpload,
} from "../security";
import { logAuditEvent } from "../utils/audit-logger";
import { logSecurityEventFromRequest, SecurityEventType } from "../security/audit-logger";
import { validateUploadedFile } from "../security/file-upload";
import { uploadImage } from "../services/image-service";
import { getStorageManager } from "../services/storage-adapter";
import { insertAffiliateLinkSchema } from "@shared/schema";

const upload = multer({ storage: multer.memoryStorage() });

// Authenticated request type
type AuthRequest = Request & {
  isAuthenticated(): boolean;
  user?: { claims?: { sub: string } };
};

export function registerMediaRoutes(app: Express): void {
  // ============================================================================
  // AFFILIATE LINKS
  // ============================================================================

  app.get("/api/affiliate-links", requireAuth, async (req, res) => {
    try {
      const { contentId } = req.query;
      const links = await storage.getAffiliateLinks(contentId as string | undefined);
      res.json(links);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch affiliate links" });
    }
  });

  app.get("/api/affiliate-links/:id", requireAuth, async (req, res) => {
    try {
      const link = await storage.getAffiliateLink(req.params.id);
      if (!link) {
        return res.status(404).json({ error: "Affiliate link not found" });
      }
      res.json(link);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch affiliate link" });
    }
  });

  app.post(
    "/api/affiliate-links",
    requirePermission("canAccessAffiliates"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const parsed = insertAffiliateLinkSchema.parse(req.body);
        const link = await storage.createAffiliateLink(parsed);
        await logAuditEvent(
          req,
          "create",
          "affiliate_link",
          link.id,
          `Created affiliate link: ${link.anchor}`,
          undefined,
          { anchor: link.anchor, url: link.url }
        );
        res.status(201).json(link);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: "Validation error", details: error.errors });
        }
        res.status(500).json({ error: "Failed to create affiliate link" });
      }
    }
  );

  app.patch(
    "/api/affiliate-links/:id",
    requirePermission("canAccessAffiliates"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const existingLink = await storage.getAffiliateLink(req.params.id);
        const link = await storage.updateAffiliateLink(req.params.id, req.body);
        if (!link) {
          return res.status(404).json({ error: "Affiliate link not found" });
        }
        await logAuditEvent(
          req,
          "update",
          "affiliate_link",
          link.id,
          `Updated affiliate link: ${link.anchor}`,
          existingLink ? { anchor: existingLink.anchor, url: existingLink.url } : undefined,
          { anchor: link.anchor, url: link.url }
        );
        res.json(link);
      } catch (error) {
        res.status(500).json({ error: "Failed to update affiliate link" });
      }
    }
  );

  app.delete(
    "/api/affiliate-links/:id",
    requirePermission("canAccessAffiliates"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const existingLink = await storage.getAffiliateLink(req.params.id);
        await storage.deleteAffiliateLink(req.params.id);
        if (existingLink) {
          await logAuditEvent(
            req,
            "delete",
            "affiliate_link",
            req.params.id,
            `Deleted affiliate link: ${existingLink.anchor}`,
            { anchor: existingLink.anchor, url: existingLink.url }
          );
        }
        res.status(204).send();
      } catch (error) {
        res.status(500).json({ error: "Failed to delete affiliate link" });
      }
    }
  );

  // ============================================================================
  // MEDIA FILES
  // ============================================================================

  app.get("/api/media", requirePermission("canAccessMediaLibrary"), async (req, res) => {
    try {
      const files = await storage.getMediaFiles();
      res.json(files);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch media files" });
    }
  });

  app.get("/api/media/:id", requirePermission("canAccessMediaLibrary"), async (req, res) => {
    try {
      const file = await storage.getMediaFile(req.params.id);
      if (!file) {
        return res.status(404).json({ error: "Media file not found" });
      }
      res.json(file);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch media file" });
    }
  });

  // Check if media is in use before delete
  app.get("/api/media/:id/usage", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const mediaFile = await storage.getMediaFile(id);

      if (!mediaFile) {
        return res.status(404).json({ error: "Media file not found" });
      }

      const usage = await storage.checkMediaUsage(mediaFile.url);
      res.json(usage);
    } catch (error) {
      res.status(500).json({ error: "Failed to check media usage" });
    }
  });

  // SECURITY: Admin media upload with file upload hardening
  app.post(
    "/api/media/upload",
    requirePermission("canAccessMediaLibrary"),
    checkReadOnlyMode,
    upload.single("file"),
    validateMediaUpload,
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        // SECURITY: Enhanced file upload validation with magic bytes
        const fileValidation = await validateUploadedFile(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype
        );

        if (!fileValidation.valid) {
          logSecurityEventFromRequest(req, SecurityEventType.UNAUTHORIZED_ACCESS, {
            success: false,
            resource: "media_upload",
            action: "file_upload_blocked",
            errorMessage: "File failed security validation",
            details: {
              originalFilename: req.file.originalname.substring(0, 20) + "...",
              declaredMimeType: req.file.mimetype,
              detectedType: fileValidation.detectedType?.mime,
              errors: fileValidation.errors.slice(0, 3),
            },
          });

          return res.status(400).json({
            error: "File failed security validation",
            code: "FILE_VALIDATION_FAILED",
            validationErrors: fileValidation.errors,
          });
        }

        // Use the unified ImageService for upload
        const result = await uploadImage(
          req.file.buffer,
          fileValidation.safeFilename || req.file.originalname,
          fileValidation.detectedType?.mime || req.file.mimetype,
          {
            source: "upload",
            altText: req.body.altText,
          }
        );

        if (!result.success) {
          return res.status(400).json({ error: (result as any).error });
        }

        const image = result.image;

        // Save to database for media library
        const mediaFile = await storage.createMediaFile({
          filename: image.filename,
          originalFilename: image.originalFilename,
          mimeType: image.mimeType,
          size: image.size,
          url: image.url,
          altText: req.body.altText || null,
          width: image.width || (req.body.width ? parseInt(req.body.width) : null),
          height: image.height || (req.body.height ? parseInt(req.body.height) : null),
        });

        await logAuditEvent(
          req,
          "media_upload",
          "media",
          mediaFile.id,
          `Uploaded media: ${mediaFile.originalFilename}`,
          undefined,
          {
            filename: mediaFile.originalFilename,
            mimeType: mediaFile.mimeType,
            size: mediaFile.size,
            originalSize: req.file.size,
          }
        );

        res.status(201).json(mediaFile);
      } catch (error) {
        res.status(500).json({ error: "Failed to upload media file" });
      }
    }
  );

  app.patch(
    "/api/media/:id",
    requirePermission("canAccessMediaLibrary"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const file = await storage.updateMediaFile(req.params.id, req.body);
        if (!file) {
          return res.status(404).json({ error: "Media file not found" });
        }
        res.json(file);
      } catch (error) {
        res.status(500).json({ error: "Failed to update media file" });
      }
    }
  );

  app.delete(
    "/api/media/:id",
    requirePermission("canAccessMediaLibrary"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const file = await storage.getMediaFile(req.params.id);
        const fileInfo = file
          ? { filename: file.originalFilename, mimeType: file.mimeType, size: file.size }
          : undefined;
        if (file) {
          // Use unified storage manager (handles both Object Storage and local)
          const storageManager = getStorageManager();
          await storageManager.delete(`public/${file.filename}`);
        }
        await storage.deleteMediaFile(req.params.id);
        if (fileInfo) {
          await logAuditEvent(
            req,
            "media_delete",
            "media",
            req.params.id,
            `Deleted media: ${fileInfo.filename}`,
            fileInfo
          );
        }
        res.status(204).send();
      } catch (error) {
        res.status(500).json({ error: "Failed to delete media file" });
      }
    }
  );
}
