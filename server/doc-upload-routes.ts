/**
 * DOC/DOCX Upload API Routes
 *
 * Endpoints for uploading Word documents and importing content directly.
 */

import { Express, Request, Response } from "express";
import multer from "multer";
import { docUploadService } from "./doc-upload-service";
import { db } from "./db";
import { hotels, articles, attractions } from "@shared/schema";

// Security: Sanitize user input for logging to prevent log injection
function sanitizeForLog(input: string): string {
  if (!input) return "";
  // Remove newlines, carriage returns, and null bytes to prevent log injection
  return input.replace(/[\r\n\x00]/g, "").substring(0, 200);
}

// SECURITY: Define valid file types - MIME type MUST match expected extension
const FILE_TYPE_MAP: Record<string, string[]> = {
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/msword": [".doc"],
  "text/plain": [".txt"],
};

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // SECURITY FIX: Validate BOTH MIME type AND extension match
    // Previously used OR which allowed spoofed files
    const extension = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf("."));
    const validExtensions = FILE_TYPE_MAP[file.mimetype];

    // MIME type must be in our allowed list
    if (!validExtensions) {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
      return;
    }

    // Extension must match what's expected for this MIME type
    if (!validExtensions.includes(extension)) {
      cb(new Error(`File extension ${extension} does not match MIME type ${file.mimetype}`));
      return;
    }

    // Additional security: check file name doesn't contain path characters
    if (
      file.originalname.includes("..") ||
      file.originalname.includes("/") ||
      file.originalname.includes("\\")
    ) {
      cb(new Error("Invalid file name"));
      return;
    }

    cb(null, true);
  },
});

export function registerDocUploadRoutes(app: Express) {
  // -------------------------------------------------------------------------
  // POST /api/doc-upload/parse
  // Parse a DOCX file and return structured content (preview before import)
  // -------------------------------------------------------------------------
  app.post("/api/doc-upload/parse", upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const contentType = (req.body.contentType || "article") as
        | "hotel"
        | "article"
        | "attraction"
        | "dining"
        | "district";

      const result = await docUploadService.processDocUpload(req.file.buffer, contentType, {
        overrideTitle: req.body.title,
        category: req.body.category,
        locale: req.body.locale || "en",
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({
        success: true,
        preview: result.content,
        warnings: result.warnings,
        message: "Document parsed successfully. Review and confirm to import.",
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to parse document",
      });
    }
  });

  // -------------------------------------------------------------------------
  // POST /api/doc-upload/import
  // Import a DOCX file directly to the database
  // -------------------------------------------------------------------------
  app.post("/api/doc-upload/import", upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const contentType = (req.body.contentType || "article") as
        | "hotel"
        | "article"
        | "attraction"
        | "dining"
        | "district";
      const locale = req.body.locale || "en";
      const category = req.body.category;

      const result = await docUploadService.processDocUpload(req.file.buffer, contentType, {
        overrideTitle: req.body.title,
        category,
        locale,
      });

      if (!result.success || !result.content) {
        return res.status(400).json({ error: result.error || "Failed to process document" });
      }

      // Import to database based on content type
      let insertedId: number = 0;

      if (contentType === "hotel") {
        const [hotelResult] = await db
          .insert(hotels)
          .values({
            title: result.content.title,
            slug: result.content.slug,
            locale,
            status: result.content.status,
            metaTitle: result.content.metaTitle,
            metaDescription: result.content.metaDescription,
            summary: result.content.summary,
            content: result.content.content,
            quickInfo: result.content.quickFacts,
            proTips: result.content.proTips,
            faqs: result.content.faqs,
            starRating: 5, // Default, can be edited
            priceRange: "$$$$", // Default, can be edited
            location: "", // To be specified by editor
          } as any)
          .returning({ id: hotels.id });
        insertedId = Number(hotelResult.id);
      } else if (
        contentType === "article" ||
        contentType === "dining" ||
        contentType === "district"
      ) {
        const [articleResult] = await db
          .insert(articles)
          .values({
            title: result.content.title,
            slug: result.content.slug,
            locale,
            status: result.content.status,
            metaTitle: result.content.metaTitle,
            metaDescription: result.content.metaDescription,
            summary: result.content.summary,
            content: result.content.content,
            category:
              category ||
              (contentType === "dining"
                ? "Dining"
                : contentType === "district"
                  ? "Districts"
                  : "General"),
            quickFacts: result.content.quickFacts,
            proTips: result.content.proTips,
            faqs: result.content.faqs,
          } as any)
          .returning({ id: articles.id });
        insertedId = Number(articleResult.id);
      } else if (contentType === "attraction") {
        const [attractionResult] = await db
          .insert(attractions)
          .values({
            title: result.content.title,
            slug: result.content.slug,
            locale,
            status: result.content.status,
            metaTitle: result.content.metaTitle,
            metaDescription: result.content.metaDescription,
            summary: result.content.summary,
            content: result.content.content,
            category: category || "Landmarks",
            location: "", // To be specified by editor
            quickFacts: result.content.quickFacts,
            proTips: result.content.proTips,
            faqs: result.content.faqs,
          } as any)
          .returning({ id: attractions.id });
        insertedId = Number(attractionResult.id);
      }

      res.json({
        success: true,
        id: insertedId,
        contentType,
        title: result.content.title,
        slug: result.content.slug,
        wordCount: result.content.content.wordCount,
        warnings: result.warnings,
        message: `Successfully imported as ${contentType}`,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to import document",
      });
    }
  });

  // -------------------------------------------------------------------------
  // POST /api/doc-upload/batch
  // Import multiple DOCX files at once
  // -------------------------------------------------------------------------
  app.post(
    "/api/doc-upload/batch",
    upload.array("files", 50), // Max 50 files
    async (req: Request, res: Response) => {
      try {
        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
          return res.status(400).json({ error: "No files uploaded" });
        }

        const contentType = (req.body.contentType || "hotel") as
          | "hotel"
          | "article"
          | "attraction"
          | "dining"
          | "district";
        const locale = req.body.locale || "en";

        const results = await docUploadService.processBatchDocUpload(
          files.map(f => ({ buffer: f.buffer, filename: f.originalname })),
          contentType
        );

        // Import successful results to database
        const imported: Array<{ filename: string; id: number; title: string }> = [];
        const failed: Array<{ filename: string; error: string }> = [];

        for (const result of results) {
          if (result.success && result.content) {
            try {
              let insertedId: number = 0;

              if (contentType === "hotel") {
                const [hotelResult] = await db
                  .insert(hotels)
                  .values({
                    title: result.content.title,
                    slug: result.content.slug,
                    locale,
                    status: "draft",
                    metaTitle: result.content.metaTitle,
                    metaDescription: result.content.metaDescription,
                    summary: result.content.summary,
                    content: result.content.content,
                    starRating: 5,
                    priceRange: "$$$$",
                    location: "",
                  } as any)
                  .returning({ id: hotels.id });
                insertedId = Number(hotelResult.id);
              } else if (
                contentType === "article" ||
                contentType === "dining" ||
                contentType === "district"
              ) {
                const [articleResult] = await db
                  .insert(articles)
                  .values({
                    title: result.content.title,
                    slug: result.content.slug,
                    locale,
                    status: "draft",
                    metaTitle: result.content.metaTitle,
                    metaDescription: result.content.metaDescription,
                    summary: result.content.summary,
                    content: result.content.content,
                    category:
                      contentType === "dining"
                        ? "Dining"
                        : contentType === "district"
                          ? "Districts"
                          : "General",
                  } as any)
                  .returning({ id: articles.id });
                insertedId = Number(articleResult.id);
              } else if (contentType === "attraction") {
                const [attractionResult] = await db
                  .insert(attractions)
                  .values({
                    title: result.content.title,
                    slug: result.content.slug,
                    locale,
                    status: "draft",
                    metaTitle: result.content.metaTitle,
                    metaDescription: result.content.metaDescription,
                    summary: result.content.summary,
                    content: result.content.content,
                    category: "Landmarks",
                    location: "",
                  } as any)
                  .returning({ id: attractions.id });
                insertedId = Number(attractionResult.id);
              }

              imported.push({
                filename: result.filename,
                id: insertedId,
                title: result.content.title,
              });
            } catch (dbError) {
              failed.push({
                filename: result.filename,
                error: dbError instanceof Error ? dbError.message : "Database error",
              });
            }
          } else {
            failed.push({
              filename: result.filename,
              error: result.error || "Processing failed",
            });
          }
        }

        res.json({
          success: true,
          total: files.length,
          imported: imported.length,
          failed: failed.length,
          results: {
            imported,
            failed,
          },
          message: `Imported ${imported.length} of ${files.length} files`,
        });
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : "Failed to process batch",
        });
      }
    }
  );
}

export default registerDocUploadRoutes;
