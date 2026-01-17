/**
 * AI Writers API Routes
 * 
 * REST API endpoints for managing AI writers and content generation
 */

import type { Express, Request, Response } from "express";
import { z } from "zod";
import { db } from "../../db";
import { 
  aiWriters, 
  writerAssignments, 
  writerPerformance,
  contents,
  insertAiWriterSchema,
  insertWriterAssignmentSchema,
} from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  AI_WRITERS,
  getWriterById,
  getWriterBySlug,
  getWritersByContentType,
  getActiveWriters,
  writerEngine,
  assignmentSystem,
  type WriteContentRequest,
} from "./index";
import { requireAuth, requirePermission } from "../../security";

// Validation schemas
const generateContentSchema = z.object({
  writerId: z.string(),
  contentType: z.string(),
  topic: z.string(),
  keywords: z.array(z.string()),
  tone: z.string().optional(),
  length: z.enum(['short', 'medium', 'long']).optional(),
  locale: z.string().optional(),
  includeEmojis: z.boolean().optional(),
  targetAudience: z.string().optional(),
});

const assignWriterSchema = z.object({
  contentType: z.string(),
  topic: z.string(),
  keywords: z.array(z.string()),
  targetAudience: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
});

const rewriteSchema = z.object({
  content: z.string(),
});

const generateTitlesSchema = z.object({
  topic: z.string(),
});

/**
 * Register AI Writers routes
 */
export function registerWriterRoutes(app: Express) {
  // GET /api/writers - List all writers
  app.get("/api/writers", async (req: Request, res: Response) => {
    try {
      const activeOnly = req.query.active === 'true';
      const contentType = req.query.contentType as string;

      let writers = AI_WRITERS;

      if (activeOnly) {
        writers = getActiveWriters();
      }

      if (contentType) {
        writers = getWritersByContentType(contentType);
      }

      res.json({
        writers,
        total: writers.length,
      });
    } catch (error) {
      console.error("Error fetching writers:", error);
      res.status(500).json({ 
        error: "Failed to fetch writers",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // GET /api/writers/:id - Get writer profile
  app.get("/api/writers/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const writer = getWriterById(id) || getWriterBySlug(id);

      if (!writer) {
        return res.status(404).json({ error: "Writer not found" });
      }

      // Get writer's assignments
      const assignments = await db
        .select()
        .from(writerAssignments)
        .where(eq(writerAssignments.writerId, writer.id))
        .orderBy(desc(writerAssignments.createdAt))
        .limit(10);

      // Get writer's performance
      const performance = await db
        .select()
        .from(writerPerformance)
        .where(eq(writerPerformance.writerId, writer.id))
        .orderBy(desc(writerPerformance.period))
        .limit(12); // Last 12 periods

      res.json({
        writer,
        assignments,
        performance,
      });
    } catch (error) {
      console.error("Error fetching writer:", error);
      res.status(500).json({ 
        error: "Failed to fetch writer",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // POST /api/writers/:id/generate - Generate content with specific writer
  app.post(
    "/api/writers/:id/generate",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const validatedData = generateContentSchema.parse(req.body);

        // Ensure writer ID matches
        if (validatedData.writerId !== id) {
          return res.status(400).json({ 
            error: "Writer ID mismatch" 
          });
        }

        const writer = getWriterById(id);
        if (!writer) {
          return res.status(404).json({ error: "Writer not found" });
        }

        // Generate content
        const result = await writerEngine.generateContent(validatedData as any);

        res.json(result);
      } catch (error) {
        console.error("Error generating content:", error);
        res.status(500).json({ 
          error: "Failed to generate content",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // POST /api/writers/optimal - Get optimal writer without persisting assignment
  app.post(
    "/api/writers/optimal",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const schema = z.object({
          contentType: z.string(),
          topic: z.string(),
          keywords: z.array(z.string()).optional(),
        });
        const validatedData = schema.parse(req.body);

        const optimalWriter = await assignmentSystem.getOptimalWriter(
          validatedData.contentType,
          validatedData.topic
        );

        if (!optimalWriter) {
          return res.status(404).json({ 
            error: "No suitable writer found",
            message: "Could not find a writer matching the content type and topic",
          });
        }

        // Build explanation from writer's expertise
        const expertiseList = optimalWriter.expertise?.slice(0, 3).join(", ") || "travel content";
        
        res.json({
          writer: optimalWriter,
          reason: `${optimalWriter.name} specializes in ${expertiseList}`,
        });
      } catch (error) {
        console.error("Error finding optimal writer:", error);
        res.status(500).json({ 
          error: "Failed to find optimal writer",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // POST /api/writers/assign - Auto-assign best writer for topic (persists to DB)
  app.post(
    "/api/writers/assign",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const validatedData = assignWriterSchema.parse(req.body);

        const assignment = await assignmentSystem.assignWriter(validatedData as any);

        // Save assignment to database
        await db.insert(writerAssignments).values({
          id: assignment.id,
          writerId: assignment.writerId,
          contentType: assignment.contentType,
          topic: assignment.topic,
          status: assignment.status,
          matchScore: assignment.matchScore,
          priority: assignment.priority,
          dueDate: assignment.dueDate,
        });

        res.json(assignment);
      } catch (error) {
        console.error("Error assigning writer:", error);
        res.status(500).json({ 
          error: "Failed to assign writer",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // POST /api/writers/:id/rewrite - Rewrite content in writer's voice
  app.post(
    "/api/writers/:id/rewrite",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const { content } = rewriteSchema.parse(req.body);

        const writer = getWriterById(id);
        if (!writer) {
          return res.status(404).json({ error: "Writer not found" });
        }

        const rewritten = await writerEngine.rewriteInVoice(id, content);

        res.json({
          original: content,
          rewritten,
          writer: {
            id: writer.id,
            name: writer.name,
          },
        });
      } catch (error) {
        console.error("Error rewriting content:", error);
        res.status(500).json({ 
          error: "Failed to rewrite content",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // POST /api/writers/:id/titles - Generate title options
  app.post(
    "/api/writers/:id/titles",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const { topic } = generateTitlesSchema.parse(req.body);

        const writer = getWriterById(id);
        if (!writer) {
          return res.status(404).json({ error: "Writer not found" });
        }

        const titles = await writerEngine.generateTitles(id, topic);

        res.json({
          titles,
          writer: {
            id: writer.id,
            name: writer.name,
          },
        });
      } catch (error) {
        console.error("Error generating titles:", error);
        res.status(500).json({ 
          error: "Failed to generate titles",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // GET /api/writers/:id/articles - Get writer's articles
  app.get("/api/writers/:id/articles", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const writer = getWriterById(id);
      if (!writer) {
        return res.status(404).json({ error: "Writer not found" });
      }

      // Get assignments with their content
      const assignments = await db
        .select({
          assignment: writerAssignments,
          content: contents,
        })
        .from(writerAssignments)
        .leftJoin(contents, eq(writerAssignments.contentId, contents.id))
        .where(eq(writerAssignments.writerId, id))
        .orderBy(desc(writerAssignments.createdAt))
        .limit(limit)
        .offset(offset);

      const total = await db
        .select({ count: sql<number>`count(*)` })
        .from(writerAssignments)
        .where(eq(writerAssignments.writerId, id));

      res.json({
        articles: assignments,
        total: total[0]?.count || 0,
        writer: {
          id: writer.id,
          name: writer.name,
        },
      });
    } catch (error) {
      console.error("Error fetching articles:", error);
      res.status(500).json({ 
        error: "Failed to fetch articles",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // PUT /api/writers/:id - Update writer settings (admin only)
  app.put(
    "/api/writers/:id",
    requireAuth,
    requirePermission('canManageSettings'),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const updates = req.body;

        // Validate the writer exists
        const writer = getWriterById(id);
        if (!writer) {
          return res.status(404).json({ error: "Writer not found" });
        }

        // Update in database
        await db
          .update(aiWriters)
          .set({
            ...updates,
            updatedAt: new Date(),
          })
          .where(eq(aiWriters.id, id));

        res.json({ 
          message: "Writer updated successfully",
          writer: { ...writer, ...updates },
        });
      } catch (error) {
        console.error("Error updating writer:", error);
        res.status(500).json({ 
          error: "Failed to update writer",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // GET /api/writers/stats - Get all writers statistics
  app.get("/api/writers/stats", async (req: Request, res: Response) => {
    try {
      const stats = await Promise.all(
        AI_WRITERS.map(async (writer) => {
          const assignmentCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(writerAssignments)
            .where(eq(writerAssignments.writerId, writer.id));

          const completedCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(writerAssignments)
            .where(
              and(
                eq(writerAssignments.writerId, writer.id),
                eq(writerAssignments.status, 'completed')
              )
            );

          return {
            writerId: writer.id,
            name: writer.name,
            totalAssignments: assignmentCount[0]?.count || 0,
            completed: completedCount[0]?.count || 0,
            isActive: writer.isActive,
          };
        })
      );

      res.json({ stats });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ 
        error: "Failed to fetch statistics",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // POST /api/writers/collaborate - Create collaborative content
  app.post(
    "/api/writers/collaborate",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { writerIds, topic } = z.object({
          writerIds: z.array(z.string()).min(2).max(3),
          topic: z.string(),
        }).parse(req.body);

        const assignment = await assignmentSystem.createCollaboration(
          writerIds,
          topic
        );

        // Save assignment to database
        await db.insert(writerAssignments).values({
          id: assignment.id,
          writerId: assignment.writerId,
          contentType: assignment.contentType,
          topic: assignment.topic,
          status: assignment.status,
          matchScore: assignment.matchScore,
          priority: assignment.priority,
        });

        res.json(assignment);
      } catch (error) {
        console.error("Error creating collaboration:", error);
        res.status(500).json({ 
          error: "Failed to create collaboration",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // GET /api/writers/recommendations - Get writer recommendations for topic
  app.get(
    "/api/writers/recommendations",
    async (req: Request, res: Response) => {
      try {
        const { topic, contentType } = z.object({
          topic: z.string(),
          contentType: z.string().optional(),
        }).parse(req.query);

        const recommendations = await assignmentSystem.getWriterRecommendations(
          topic,
          contentType
        );

        res.json({ recommendations });
      } catch (error) {
        console.error("Error getting recommendations:", error);
        res.status(500).json({ 
          error: "Failed to get recommendations",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );
}
