/**
 * Magic Routes - AI-powered field generation API endpoints
 *
 * Provides endpoints for:
 * - POST /api/octypo/magic/field - Generate single field
 * - POST /api/octypo/magic/all - Generate all fields for content type
 * - POST /api/octypo/magic/batch - Generate multiple specific fields
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { log } from "../lib/logger";
import {
  generateField,
  generateAllFields,
  generateBatchFields,
  getFieldDefinitions,
  getSupportedContentTypes,
  type ContentType,
  type GenerationMode,
} from "../services/magic-engine";
import { requireAuth, requirePermission } from "../security";

const router = Router();

// ============================================================================
// Request Validation Schemas
// ============================================================================

const fieldContextSchema = z.object({
  contentType: z.string().min(1),
  entityName: z.string().optional(),
  parentDestination: z.string().optional(),
  existingFields: z.record(z.any()).default({}),
  locale: z.string().optional(),
});

const generateFieldSchema = z.object({
  fieldType: z.string().min(1),
  context: fieldContextSchema,
});

const generateAllSchema = z.object({
  contentType: z.enum(["destination", "hotel", "attraction", "restaurant", "article"]),
  input: z.string().min(1),
  mode: z.enum(["quick", "full", "premium"]),
  excludeFields: z.array(z.string()).optional(),
});

const generateBatchSchema = z.object({
  contentType: z.string().min(1),
  entityName: z.string().min(1),
  fields: z.array(z.string()).min(1),
});

// ============================================================================
// Middleware for logging requests
// ============================================================================

function logMagicRequest(endpoint: string) {
  return (req: Request, _res: Response, next: () => void) => {
    const userId = (req as any).user?.claims?.sub || "unknown";
    log.info(`[Magic] ${endpoint} request`, {
      endpoint,
      userId,
      body: JSON.stringify(req.body).substring(0, 500),
    });
    next();
  };
}

// ============================================================================
// POST /api/octypo/magic/field - Generate single field
// ============================================================================

router.post(
  "/field",
  requireAuth,
  requirePermission("canEdit"),
  logMagicRequest("/magic/field"),
  async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
      // Validate request body
      const validationResult = generateFieldSchema.safeParse(req.body);
      if (!validationResult.success) {
        log.warn("[Magic] Invalid field generation request", {
          errors: validationResult.error.errors,
        });
        return res.status(400).json({
          success: false,
          error: "Invalid request body",
          details: validationResult.error.errors.map(e => ({
            path: e.path.join("."),
            message: e.message,
          })),
        });
      }

      const { fieldType, context } = validationResult.data;

      // Validate content type has the requested field
      const fieldDefs = getFieldDefinitions(context.contentType as ContentType);
      if (!fieldDefs) {
        return res.status(400).json({
          success: false,
          error: `Unsupported content type: ${context.contentType}`,
          supportedTypes: getSupportedContentTypes(),
        });
      }

      if (!fieldDefs[fieldType]) {
        return res.status(400).json({
          success: false,
          error: `Unknown field type: ${fieldType} for content type: ${context.contentType}`,
          availableFields: Object.keys(fieldDefs),
        });
      }

      // Generate the field
      const result = await generateField({
        fieldType,
        context: {
          contentType: context.contentType,
          entityName: context.entityName,
          parentDestination: context.parentDestination,
          existingFields: context.existingFields || {},
          locale: context.locale,
        },
      });

      if (!result.success) {
        log.error("[Magic] Field generation failed", { error: result.error });
        return res.status(500).json({
          success: false,
          error: result.error || "Field generation failed",
          value: null,
          confidence: 0,
          tokensUsed: result.tokensUsed,
          processingTimeMs: result.processingTimeMs,
        });
      }

      log.info("[Magic] Field generation successful", {
        fieldType,
        contentType: context.contentType,
        confidence: result.confidence,
        processingTimeMs: result.processingTimeMs,
      });

      return res.json({
        success: true,
        value: result.value,
        confidence: result.confidence,
        alternatives: result.alternatives,
        tokensUsed: result.tokensUsed,
        processingTimeMs: result.processingTimeMs,
      });
    } catch (error) {
      log.error("[Magic] Unexpected error in field generation", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
        value: null,
        confidence: 0,
        tokensUsed: 0,
        processingTimeMs: Date.now() - startTime,
      });
    }
  }
);

// ============================================================================
// POST /api/octypo/magic/all - Generate all fields for content type
// ============================================================================

router.post(
  "/all",
  requireAuth,
  requirePermission("canEdit"),
  logMagicRequest("/magic/all"),
  async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
      // Validate request body
      const validationResult = generateAllSchema.safeParse(req.body);
      if (!validationResult.success) {
        log.warn("[Magic] Invalid all fields generation request", {
          errors: validationResult.error.errors,
        });
        return res.status(400).json({
          success: false,
          error: "Invalid request body",
          details: validationResult.error.errors.map(e => ({
            path: e.path.join("."),
            message: e.message,
          })),
        });
      }

      const { contentType, input, mode, excludeFields } = validationResult.data;

      // Validate content type
      const fieldDefs = getFieldDefinitions(contentType);
      if (!fieldDefs) {
        return res.status(400).json({
          success: false,
          error: `Unsupported content type: ${contentType}`,
          supportedTypes: getSupportedContentTypes(),
        });
      }

      // Generate all fields
      const result = await generateAllFields({
        contentType: contentType as ContentType,
        input,
        mode: mode as GenerationMode,
        excludeFields,
      });

      if (!result.success) {
        log.error("[Magic] All fields generation failed", { error: result.error });
        return res.status(500).json({
          success: false,
          error: result.error || "Content generation failed",
          fields: {},
          metadata: result.metadata,
        });
      }

      log.info("[Magic] All fields generation successful", {
        contentType,
        input,
        mode,
        fieldsGenerated: Object.keys(result.fields).length,
        confidence: result.metadata.confidence,
        processingTimeMs: result.metadata.processingTimeMs,
      });

      return res.json({
        success: true,
        fields: result.fields,
        metadata: {
          sources: result.metadata.sources,
          confidence: result.metadata.confidence,
          tokensUsed: result.metadata.tokensUsed,
          processingTimeMs: result.metadata.processingTimeMs,
        },
      });
    } catch (error) {
      log.error("[Magic] Unexpected error in all fields generation", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
        fields: {},
        metadata: {
          sources: [],
          confidence: 0,
          tokensUsed: 0,
          processingTimeMs: Date.now() - startTime,
        },
      });
    }
  }
);

// ============================================================================
// POST /api/octypo/magic/batch - Generate multiple specific fields
// ============================================================================

router.post(
  "/batch",
  requireAuth,
  requirePermission("canEdit"),
  logMagicRequest("/magic/batch"),
  async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
      // Validate request body
      const validationResult = generateBatchSchema.safeParse(req.body);
      if (!validationResult.success) {
        log.warn("[Magic] Invalid batch generation request", {
          errors: validationResult.error.errors,
        });
        return res.status(400).json({
          success: false,
          error: "Invalid request body",
          details: validationResult.error.errors.map(e => ({
            path: e.path.join("."),
            message: e.message,
          })),
        });
      }

      const { contentType, entityName, fields } = validationResult.data;

      // Validate content type
      const fieldDefs = getFieldDefinitions(contentType as ContentType);
      if (!fieldDefs) {
        return res.status(400).json({
          success: false,
          error: `Unsupported content type: ${contentType}`,
          supportedTypes: getSupportedContentTypes(),
        });
      }

      // Validate requested fields exist
      const invalidFields = fields.filter(f => !fieldDefs[f]);
      if (invalidFields.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Unknown fields for content type ${contentType}`,
          invalidFields,
          availableFields: Object.keys(fieldDefs),
        });
      }

      // Generate batch fields
      const result = await generateBatchFields({ contentType, entityName, fields });

      if (!result.success) {
        log.error("[Magic] Batch generation failed", { error: result.error });
        return res.status(500).json({
          success: false,
          error: result.error || "Batch generation failed",
          fields: {},
        });
      }

      log.info("[Magic] Batch generation successful", {
        contentType,
        entityName,
        fieldsRequested: fields.length,
        fieldsGenerated: Object.keys(result.fields).length,
        processingTimeMs: Date.now() - startTime,
      });

      return res.json({
        success: true,
        fields: result.fields,
      });
    } catch (error) {
      log.error("[Magic] Unexpected error in batch generation", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
        fields: {},
      });
    }
  }
);

// ============================================================================
// GET /api/octypo/magic/schema - Get field definitions (helper endpoint)
// ============================================================================

router.get(
  "/schema/:contentType",
  requireAuth,
  requirePermission("canEdit"),
  async (req: Request, res: Response) => {
    const { contentType } = req.params;

    const fieldDefs = getFieldDefinitions(contentType as ContentType);
    if (!fieldDefs) {
      return res.status(404).json({
        success: false,
        error: `Unknown content type: ${contentType}`,
        supportedTypes: getSupportedContentTypes(),
      });
    }

    return res.json({
      success: true,
      contentType,
      fields: Object.entries(fieldDefs).map(([name, def]) => ({
        name,
        description: def.prompt,
        type: def.type,
      })),
    });
  }
);

// ============================================================================
// GET /api/octypo/magic/content-types - List supported content types
// ============================================================================

router.get(
  "/content-types",
  requireAuth,
  requirePermission("canEdit"),
  async (_req: Request, res: Response) => {
    const contentTypes = getSupportedContentTypes();

    return res.json({
      success: true,
      contentTypes: contentTypes.map(type => ({
        type,
        fieldCount: Object.keys(getFieldDefinitions(type) || {}).length,
      })),
    });
  }
);

export default router;

/**
 * Register magic routes with the Express app
 * This function should be called from server/routes.ts
 */
export function registerMagicRoutes(app: import("express").Express): void {
  // Routes are mounted under /api/octypo/magic
  // The router already includes requireAuth and requirePermission middleware on each route
  app.use("/api/octypo/magic", router);

  log.info("[Magic] Routes registered at /api/octypo/magic");
}
