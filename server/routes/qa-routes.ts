import type { Express, Request, Response } from "express";
import { db } from "../db";
import { eq, desc, sql, and, inArray } from "drizzle-orm";
import {
  qaCategories,
  qaChecklistItems,
  qaRuns,
  qaCheckResults,
  qaTemplates,
  qaIssues,
  users,
} from "@shared/schema";
import { requireAuth, requirePermission } from "../security";
import { z } from "zod";
import { QaRunner } from "../services/qa-runner";

type AuthRequest = Request & {
  user?: { claims?: { sub: string; email?: string; name?: string } };
};

export function registerQaRoutes(app: Express) {
  // ============================================================================
  // CATEGORIES
  // ============================================================================

  // Get all categories with items
  app.get("/api/qa/categories", requireAuth, async (req: Request, res: Response) => {
    try {
      const categories = await db.query.qaCategories.findMany({
        where: eq(qaCategories.isActive, true),
        orderBy: [qaCategories.sortOrder],
        with: {
          items: {
            where: eq(qaChecklistItems.isActive, true),
            orderBy: [qaChecklistItems.sortOrder],
          },
        },
      });
      res.json(categories);
    } catch (error) {
      console.error("Error fetching QA categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // Create category
  app.post("/api/qa/categories", requireAuth, requirePermission("canManageSettings"), async (req: Request, res: Response) => {
    try {
      const [category] = await db.insert(qaCategories).values(req.body).returning();
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  // Update category
  app.patch("/api/qa/categories/:id", requireAuth, requirePermission("canManageSettings"), async (req: Request, res: Response) => {
    try {
      const [category] = await db
        .update(qaCategories)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(qaCategories.id, req.params.id))
        .returning();
      res.json(category);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ error: "Failed to update category" });
    }
  });

  // ============================================================================
  // CHECKLIST ITEMS
  // ============================================================================

  // Get items by category
  app.get("/api/qa/items", requireAuth, async (req: Request, res: Response) => {
    try {
      const { categoryId } = req.query;
      const whereClause = categoryId
        ? and(eq(qaChecklistItems.isActive, true), eq(qaChecklistItems.categoryId, categoryId as string))
        : eq(qaChecklistItems.isActive, true);

      const items = await db.query.qaChecklistItems.findMany({
        where: whereClause,
        orderBy: [qaChecklistItems.sortOrder],
        with: {
          category: true,
        },
      });
      res.json(items);
    } catch (error) {
      console.error("Error fetching QA items:", error);
      res.status(500).json({ error: "Failed to fetch items" });
    }
  });

  // Create item
  app.post("/api/qa/items", requireAuth, requirePermission("canManageSettings"), async (req: Request, res: Response) => {
    try {
      const [item] = await db.insert(qaChecklistItems).values(req.body).returning();
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating item:", error);
      res.status(500).json({ error: "Failed to create item" });
    }
  });

  // Update item
  app.patch("/api/qa/items/:id", requireAuth, requirePermission("canManageSettings"), async (req: Request, res: Response) => {
    try {
      const [item] = await db
        .update(qaChecklistItems)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(qaChecklistItems.id, req.params.id))
        .returning();
      res.json(item);
    } catch (error) {
      console.error("Error updating item:", error);
      res.status(500).json({ error: "Failed to update item" });
    }
  });

  // ============================================================================
  // QA RUNS
  // ============================================================================

  // Get all runs
  app.get("/api/qa/runs", requireAuth, async (req: Request, res: Response) => {
    try {
      const runs = await db.query.qaRuns.findMany({
        orderBy: [desc(qaRuns.startedAt)],
        with: {
          user: {
            columns: { id: true, name: true, username: true },
          },
        },
        limit: 50,
      });
      res.json(runs);
    } catch (error) {
      console.error("Error fetching QA runs:", error);
      res.status(500).json({ error: "Failed to fetch runs" });
    }
  });

  // Get single run with results
  app.get("/api/qa/runs/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const run = await db.query.qaRuns.findFirst({
        where: eq(qaRuns.id, req.params.id),
        with: {
          user: {
            columns: { id: true, name: true, username: true },
          },
          results: {
            with: {
              item: {
                with: {
                  category: true,
                },
              },
              checker: {
                columns: { id: true, name: true, username: true },
              },
            },
          },
          issues: true,
        },
      });

      if (!run) {
        return res.status(404).json({ error: "Run not found" });
      }

      res.json(run);
    } catch (error) {
      console.error("Error fetching QA run:", error);
      res.status(500).json({ error: "Failed to fetch run" });
    }
  });

  // Start new QA run
  app.post("/api/qa/runs", requireAuth, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { name, description, environment, version, branch, templateId, categoryIds } = req.body;

      // Get items to include based on template or categories
      let itemIds: string[] = [];

      if (templateId) {
        const template = await db.query.qaTemplates.findFirst({
          where: eq(qaTemplates.id, templateId),
        });
        if (template?.itemIds?.length) {
          itemIds = template.itemIds;
        } else if (template?.categoryIds?.length) {
          const items = await db.query.qaChecklistItems.findMany({
            where: and(
              eq(qaChecklistItems.isActive, true),
              inArray(qaChecklistItems.categoryId, template.categoryIds)
            ),
          });
          itemIds = items.map(i => i.id);
        }
      } else if (categoryIds?.length) {
        const items = await db.query.qaChecklistItems.findMany({
          where: and(
            eq(qaChecklistItems.isActive, true),
            inArray(qaChecklistItems.categoryId, categoryIds)
          ),
        });
        itemIds = items.map(i => i.id);
      } else {
        // Get all active items
        const items = await db.query.qaChecklistItems.findMany({
          where: eq(qaChecklistItems.isActive, true),
        });
        itemIds = items.map(i => i.id);
      }

      // Create the run
      const [run] = await db.insert(qaRuns).values({
        name: name || `QA Run - ${new Date().toLocaleDateString()}`,
        description,
        environment: environment || "development",
        version,
        branch,
        userId,
        totalItems: itemIds.length,
      } as any).returning();

      // Create check results for each item
      if (itemIds.length > 0) {
        await db.insert(qaCheckResults).values(
          itemIds.map(itemId => ({
            runId: run.id,
            itemId,
            status: "not_checked" as const,
          }))
        );
      }

      // Trigger automated checks in the background
      QaRunner.run(run.id).catch(err => {
        console.error(`Background QA runner failed for run ${run.id}:`, err);
      });

      res.status(201).json(run);
    } catch (error) {
      console.error("Error creating QA run:", error);
      res.status(500).json({ error: "Failed to create run" });
    }
  });

  // Update run
  app.patch("/api/qa/runs/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const [run] = await db
        .update(qaRuns)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(qaRuns.id, req.params.id))
        .returning();
      res.json(run);
    } catch (error) {
      console.error("Error updating run:", error);
      res.status(500).json({ error: "Failed to update run" });
    }
  });

  // Complete run
  app.post("/api/qa/runs/:id/complete", requireAuth, async (req: Request, res: Response) => {
    try {
      // Calculate stats
      const results = await db.query.qaCheckResults.findMany({
        where: eq(qaCheckResults.runId, req.params.id),
      });

      const passed = results.filter(r => r.status === "passed").length;
      const failed = results.filter(r => r.status === "failed").length;
      const skipped = results.filter(r => r.status === "not_applicable").length;
      const total = results.length;
      const score = total > 0 ? Math.round((passed / (total - skipped)) * 100) : 0;

      const [run] = await db
        .update(qaRuns)
        .set({
          status: "completed",
          completedAt: new Date(),
          passedItems: passed,
          failedItems: failed,
          skippedItems: skipped,
          score: isNaN(score) ? 0 : score,
          updatedAt: new Date(),
        } as any)
        .where(eq(qaRuns.id, req.params.id))
        .returning();

      res.json(run);
    } catch (error) {
      console.error("Error completing run:", error);
      res.status(500).json({ error: "Failed to complete run" });
    }
  });

  // ============================================================================
  // CHECK RESULTS
  // ============================================================================

  // Update check result
  app.patch("/api/qa/results/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.claims?.sub;

      const [result] = await db
        .update(qaCheckResults)
        .set({
          ...req.body,
          checkedBy: userId,
          checkedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(qaCheckResults.id, req.params.id))
        .returning();

      // Update run stats
      const runResults = await db.query.qaCheckResults.findMany({
        where: eq(qaCheckResults.runId, result.runId),
      });

      const passed = runResults.filter(r => r.status === "passed").length;
      const failed = runResults.filter(r => r.status === "failed").length;
      const skipped = runResults.filter(r => r.status === "not_applicable").length;

      await db
        .update(qaRuns)
        .set({
          passedItems: passed,
          failedItems: failed,
          skippedItems: skipped,
          updatedAt: new Date(),
        } as any)
        .where(eq(qaRuns.id, result.runId));

      res.json(result);
    } catch (error) {
      console.error("Error updating result:", error);
      res.status(500).json({ error: "Failed to update result" });
    }
  });

  // Bulk update results
  app.post("/api/qa/results/bulk", requireAuth, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.claims?.sub;
      const { updates } = req.body; // Array of { id, status, notes }

      for (const update of updates) {
        await db
          .update(qaCheckResults)
          .set({
            status: update.status,
            notes: update.notes,
            checkedBy: userId,
            checkedAt: new Date(),
            updatedAt: new Date(),
          } as any)
          .where(eq(qaCheckResults.id, update.id));
      }

      res.json({ success: true, updated: updates.length });
    } catch (error) {
      console.error("Error bulk updating results:", error);
      res.status(500).json({ error: "Failed to update results" });
    }
  });

  // ============================================================================
  // ISSUES
  // ============================================================================

  // Get issues for a run
  app.get("/api/qa/runs/:runId/issues", requireAuth, async (req: Request, res: Response) => {
    try {
      const issues = await db.query.qaIssues.findMany({
        where: eq(qaIssues.runId, req.params.runId),
        orderBy: [desc(qaIssues.createdAt)],
        with: {
          assignee: {
            columns: { id: true, name: true, username: true },
          },
          creator: {
            columns: { id: true, name: true, username: true },
          },
        },
      });
      res.json(issues);
    } catch (error) {
      console.error("Error fetching issues:", error);
      res.status(500).json({ error: "Failed to fetch issues" });
    }
  });

  // Create issue
  app.post("/api/qa/issues", requireAuth, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const [issue] = await db.insert(qaIssues).values({
        ...req.body,
        createdBy: userId,
      }).returning();

      res.status(201).json(issue);
    } catch (error) {
      console.error("Error creating issue:", error);
      res.status(500).json({ error: "Failed to create issue" });
    }
  });

  // Update issue
  app.patch("/api/qa/issues/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.claims?.sub;

      const updateData: Record<string, unknown> = {
        ...req.body,
        updatedAt: new Date(),
      };

      // If resolving, set resolver and resolved time
      if (req.body.status === "resolved") {
        updateData.resolvedBy = userId;
        updateData.resolvedAt = new Date();
      }

      const [issue] = await db
        .update(qaIssues)
        .set(updateData)
        .where(eq(qaIssues.id, req.params.id))
        .returning();

      res.json(issue);
    } catch (error) {
      console.error("Error updating issue:", error);
      res.status(500).json({ error: "Failed to update issue" });
    }
  });

  // ============================================================================
  // TEMPLATES
  // ============================================================================

  // Get all templates
  app.get("/api/qa/templates", requireAuth, async (req: Request, res: Response) => {
    try {
      const templates = await db.query.qaTemplates.findMany({
        orderBy: [desc(qaTemplates.isDefault), qaTemplates.name],
      });
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  // Create template
  app.post("/api/qa/templates", requireAuth, requirePermission("canManageSettings"), async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.claims?.sub;

      const [template] = await db.insert(qaTemplates).values({
        ...req.body,
        createdBy: userId,
      }).returning();

      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating template:", error);
      res.status(500).json({ error: "Failed to create template" });
    }
  });

  // ============================================================================
  // SEED DATA
  // ============================================================================

  // Seed initial QA checklist data
  app.post("/api/qa/seed", requireAuth, requirePermission("canManageSettings"), async (req: Request, res: Response) => {
    try {
      // Check if already seeded
      const existingCategories = await db.query.qaCategories.findMany();
      if (existingCategories.length > 0) {
        return res.status(400).json({ error: "QA data already seeded" });
      }

      // Import and run seed
      const { seedQaChecklist } = await import("../data/qa-checklist-seed");
      await seedQaChecklist();

      res.json({ success: true, message: "QA checklist data seeded successfully" });
    } catch (error) {
      console.error("Error seeding QA data:", error);
      res.status(500).json({ error: "Failed to seed QA data" });
    }
  });

  // ============================================================================
  // AUTOMATED CHECKS (QUICK RUN)
  // ============================================================================

  // Run automated checks without creating a full QA run
  // This is for the dashboard display of quick health checks
  app.post("/api/qa/run-automated", requireAuth, async (req: Request, res: Response) => {
    try {
      console.log("[QA Routes] Running automated health checks...");
      
      const results = await QaRunner.runQuickChecks();
      
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        results,
        summary: {
          total: results.length,
          passed: results.filter(r => r.passed).length,
          failed: results.filter(r => !r.passed).length,
        }
      });
    } catch (error) {
      console.error("Error running automated checks:", error);
      res.status(500).json({ error: "Failed to run automated checks" });
    }
  });

  // Get last automated check results (cached/stored)
  app.get("/api/qa/automated-status", requireAuth, async (req: Request, res: Response) => {
    try {
      // Get most recent completed run
      const lastRun = await db.query.qaRuns.findFirst({
        where: eq(qaRuns.status, "completed"),
        orderBy: [desc(qaRuns.completedAt)],
        with: {
          results: {
            with: {
              item: {
                with: {
                  category: true,
                }
              }
            }
          }
        }
      });

      if (!lastRun) {
        return res.json({
          hasData: false,
          message: "No completed QA runs found. Run a QA check first.",
        });
      }

      // Group results by category
      const byCategory: Record<string, { passed: number; failed: number; total: number }> = {};
      
      for (const result of lastRun.results || []) {
        const catKey = result.item?.category?.key || "unknown";
        if (!byCategory[catKey]) {
          byCategory[catKey] = { passed: 0, failed: 0, total: 0 };
        }
        byCategory[catKey].total++;
        if (result.status === "passed") byCategory[catKey].passed++;
        if (result.status === "failed") byCategory[catKey].failed++;
      }

      res.json({
        hasData: true,
        lastRunId: lastRun.id,
        lastRunAt: lastRun.completedAt,
        score: lastRun.score,
        passed: lastRun.passedItems,
        failed: lastRun.failedItems,
        total: lastRun.totalItems,
        byCategory,
      });
    } catch (error) {
      console.error("Error fetching automated status:", error);
      res.status(500).json({ error: "Failed to fetch automated status" });
    }
  });

  // ============================================================================
  // STATS & REPORTS
  // ============================================================================

  // Get QA overview stats
  app.get("/api/qa/stats", requireAuth, async (req: Request, res: Response) => {
    try {
      const [totalRuns] = await db
        .select({ count: sql<number>`count(*)` })
        .from(qaRuns);

      const [completedRuns] = await db
        .select({ count: sql<number>`count(*)` })
        .from(qaRuns)
        .where(eq(qaRuns.status, "completed"));

      const [openIssues] = await db
        .select({ count: sql<number>`count(*)` })
        .from(qaIssues)
        .where(eq(qaIssues.status, "open"));

      const recentRuns = await db.query.qaRuns.findMany({
        where: eq(qaRuns.status, "completed"),
        orderBy: [desc(qaRuns.completedAt)],
        limit: 10,
      });

      const avgScore = recentRuns.length > 0
        ? Math.round(recentRuns.reduce((sum, r) => sum + (r.score || 0), 0) / recentRuns.length)
        : 0;

      res.json({
        totalRuns: Number(totalRuns.count),
        completedRuns: Number(completedRuns.count),
        openIssues: Number(openIssues.count),
        averageScore: avgScore,
        recentRuns,
      });
    } catch (error) {
      console.error("Error fetching QA stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });
}
