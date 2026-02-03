/**
 * Content Organization Routes
 * Content clusters, tags, bulk operations, export, and templates
 */

import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { requireAuth, requirePermission, checkReadOnlyMode, rateLimiters } from "../security";
import { logAuditEvent } from "../utils/audit-logger";

export function registerContentOrganizationRoutes(app: Express): void {
  // ============================================================================
  // CONTENT CLUSTERS ROUTES
  // ============================================================================

  app.get("/api/clusters", requireAuth, async (req, res) => {
    try {
      const clusters = await storage.getContentClusters();
      // Enrich clusters with members and pillar content
      const enrichedClusters = await Promise.all(
        clusters.map(async cluster => {
          const members = await storage.getClusterMembers(cluster.id);
          let pillarContent = null;
          if (cluster.pillarContentId) {
            pillarContent = await storage.getContent(cluster.pillarContentId);
          }
          return { ...cluster, members, pillarContent };
        })
      );
      res.json(enrichedClusters);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch clusters" });
    }
  });

  app.get("/api/clusters/:id", requireAuth, async (req, res) => {
    try {
      const cluster = await storage.getContentCluster(req.params.id);
      if (!cluster) {
        return res.status(404).json({ error: "Cluster not found" });
      }
      const members = await storage.getClusterMembers(cluster.id);
      res.json({ ...cluster, members });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cluster" });
    }
  });

  app.post("/api/clusters", requirePermission("canCreate"), checkReadOnlyMode, async (req, res) => {
    try {
      const { name, slug, description, pillarContentId, primaryKeyword, color } = req.body;
      if (!name || !slug) {
        return res.status(400).json({ error: "Name and slug are required" });
      }
      const existing = await storage.getContentClusterBySlug(slug);
      if (existing) {
        return res.status(400).json({ error: "Cluster with this slug already exists" });
      }
      const cluster = await storage.createContentCluster({
        name,
        slug,
        description,
        pillarContentId,
        primaryKeyword,
        color,
      });
      await logAuditEvent(
        req,
        "create",
        "cluster",
        cluster.id,
        `Created cluster: ${cluster.name}`,
        undefined,
        { name: cluster.name, slug: cluster.slug }
      );
      res.status(201).json(cluster);
    } catch (error) {
      res.status(500).json({ error: "Failed to create cluster" });
    }
  });

  app.patch(
    "/api/clusters/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const existingCluster = await storage.getContentCluster(req.params.id);
        const { name, slug, description, pillarContentId, primaryKeyword, color } = req.body;
        const cluster = await storage.updateContentCluster(req.params.id, {
          name,
          slug,
          description,
          pillarContentId,
          primaryKeyword,
          color,
        });
        if (!cluster) {
          return res.status(404).json({ error: "Cluster not found" });
        }
        await logAuditEvent(
          req,
          "update",
          "cluster",
          cluster.id,
          `Updated cluster: ${cluster.name}`,
          {
            name: existingCluster?.name,
            slug: existingCluster?.slug,
          },
          { name: cluster.name, slug: cluster.slug }
        );
        res.json(cluster);
      } catch (error) {
        res.status(500).json({ error: "Failed to update cluster" });
      }
    }
  );

  app.delete(
    "/api/clusters/:id",
    requirePermission("canDelete"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const existingCluster = await storage.getContentCluster(req.params.id);
        if (!existingCluster) {
          return res.status(404).json({ error: "Cluster not found" });
        }
        await storage.deleteContentCluster(req.params.id);
        await logAuditEvent(
          req,
          "delete",
          "cluster",
          req.params.id,
          `Deleted cluster: ${existingCluster.name}`
        );
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete cluster" });
      }
    }
  );

  // Add content to cluster
  app.post(
    "/api/clusters/:id/members",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { contentId, role } = req.body;
        if (!contentId) {
          return res.status(400).json({ error: "Content ID is required" });
        }
        const member = await storage.addClusterMember({
          clusterId: req.params.id,
          contentId,
          role: role || "supporting",
        });
        res.status(201).json(member);
      } catch (error) {
        res.status(500).json({ error: "Failed to add cluster member" });
      }
    }
  );

  // Remove content from cluster
  app.delete(
    "/api/clusters/:id/members/:contentId",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        await storage.removeClusterMember(req.params.id, req.params.contentId);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to remove cluster member" });
      }
    }
  );

  // Update member role
  app.patch(
    "/api/clusters/:id/members/:contentId",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { role } = req.body;
        const member = await storage.updateClusterMember(req.params.id, req.params.contentId, {
          role,
        });
        res.json(member);
      } catch (error) {
        res.status(500).json({ error: "Failed to update cluster member" });
      }
    }
  );

  // ============================================================================
  // CONTENT TAGS ROUTES
  // ============================================================================

  app.get("/api/content/:contentId/tags", requireAuth, async (req, res) => {
    try {
      const contentTagsList = await storage.getContentTags(req.params.contentId);
      res.json(contentTagsList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch content tags" });
    }
  });

  app.post(
    "/api/content/:contentId/tags",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { tagId } = req.body;
        if (!tagId) {
          return res.status(400).json({ error: "Tag ID is required" });
        }
        const contentTag = await storage.addContentTag({
          contentId: req.params.contentId,
          tagId,
        });
        res.status(201).json(contentTag);
      } catch (error) {
        res.status(500).json({ error: "Failed to add content tag" });
      }
    }
  );

  app.delete(
    "/api/content/:contentId/tags/:tagId",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        await storage.removeContentTag(req.params.contentId, req.params.tagId);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to remove content tag" });
      }
    }
  );

  // ============================================================================
  // BULK OPERATIONS ROUTES
  // ============================================================================

  app.post("/api/contents/bulk-status", requirePermission("canEdit"), async (req, res) => {
    try {
      const { ids, status } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "ids array is required" });
      }
      if (!status) {
        return res.status(400).json({ error: "status is required" });
      }
      const count = await storage.bulkUpdateContentStatus(ids, status);
      res.json({ success: true, count });
    } catch (error) {
      res.status(500).json({ error: "Failed to bulk update status" });
    }
  });

  app.post("/api/contents/bulk-delete", requirePermission("canDelete"), async (req, res) => {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "ids array is required" });
      }
      const count = await storage.bulkDeleteContents(ids);

      res.json({ success: true, count });
    } catch (error) {
      res.status(500).json({ error: "Failed to bulk delete" });
    }
  });

  app.post("/api/contents/bulk-add-tag", requirePermission("canEdit"), async (req, res) => {
    try {
      const { ids, tagId } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "ids array is required" });
      }
      if (!tagId) {
        return res.status(400).json({ error: "tagId is required" });
      }
      const count = await storage.bulkAddTagToContents(ids, tagId);
      res.json({ success: true, count });
    } catch (error) {
      res.status(500).json({ error: "Failed to bulk add tag" });
    }
  });

  app.post("/api/contents/bulk-remove-tag", requirePermission("canEdit"), async (req, res) => {
    try {
      const { ids, tagId } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "ids array is required" });
      }
      if (!tagId) {
        return res.status(400).json({ error: "tagId is required" });
      }
      const count = await storage.bulkRemoveTagFromContents(ids, tagId);
      res.json({ success: true, count });
    } catch (error) {
      res.status(500).json({ error: "Failed to bulk remove tag" });
    }
  });

  // ============================================================================
  // CONTENT EXPORT ROUTES
  // ============================================================================

  app.get("/api/contents/export", requireAuth, async (req, res) => {
    try {
      const { ids, format = "json" } = req.query;
      let contents;
      if (ids && typeof ids === "string") {
        const idArray = ids.split(",");
        const allContents = await storage.getContentsWithRelations();
        contents = allContents.filter(c => idArray.includes(c.id));
      } else {
        contents = await storage.getContentsWithRelations();
      }

      if (format === "csv") {
        const headers = [
          "id",
          "title",
          "slug",
          "type",
          "status",
          "wordCount",
          "createdAt",
          "updatedAt",
        ];
        const csvRows = [headers.join(",")];
        for (const c of contents) {
          csvRows.push(
            [
              c.id,
              `"${(c.title || "").replace(/"/g, '""')}"`,
              c.slug,
              c.type,
              c.status,
              c.wordCount || 0,
              c.createdAt ? new Date(c.createdAt).toISOString() : "",
              c.updatedAt ? new Date(c.updatedAt).toISOString() : "",
            ].join(",")
          );
        }
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=contents-export.csv");
        return res.send(csvRows.join("\n"));
      }

      res.json(contents);
    } catch (error) {
      res.status(500).json({ error: "Failed to export contents" });
    }
  });

  // ============================================================================
  // CONTENT TEMPLATES ROUTES
  // ============================================================================

  app.get("/api/content-templates", requireAuth, async (req, res) => {
    try {
      const templates = await storage.getContentTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  app.get("/api/content-templates/:id", requireAuth, async (req, res) => {
    try {
      const template = await storage.getContentTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch template" });
    }
  });

  app.post("/api/content-templates", requirePermission("canCreate"), async (req, res) => {
    try {
      const { name, description, type, blocks, seoDefaults } = req.body;
      if (!name || !type) {
        return res.status(400).json({ error: "Name and type are required" });
      }
      const template = await storage.createContentTemplate({
        name,
        description,
        contentType: type,
        blocks: blocks || [],
        seoDefaults: seoDefaults || {},
      });
      res.status(201).json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to create template" });
    }
  });

  app.patch("/api/content-templates/:id", requirePermission("canEdit"), async (req, res) => {
    try {
      const { name, description, type, blocks, seoDefaults } = req.body;
      const template = await storage.updateContentTemplate(req.params.id, {
        name,
        description,
        contentType: type,
        blocks,
        seoDefaults,
      });
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to update template" });
    }
  });

  app.delete("/api/content-templates/:id", requirePermission("canDelete"), async (req, res) => {
    try {
      await storage.deleteContentTemplate(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  app.post(
    "/api/content-templates/:id/apply",
    requirePermission("canCreate"),
    checkReadOnlyMode,
    rateLimiters.contentWrite,
    async (req, res) => {
      try {
        const template = await storage.getContentTemplate(req.params.id);
        if (!template) {
          return res.status(404).json({ error: "Template not found" });
        }
        const { title, slug } = req.body;
        if (!title || !slug) {
          return res.status(400).json({ error: "Title and slug are required" });
        }
        const content = await storage.createContent({
          title,
          slug,
          type: template.contentType as any,
          status: "draft",
          blocks: template.blocks as any[],
          metaTitle: (template.seoDefaults as any)?.metaTitle || title,
          metaDescription: (template.seoDefaults as any)?.metaDescription || "",
        });
        await storage.incrementTemplateUsage(req.params.id);
        res.status(201).json(content);
      } catch (error) {
        res.status(500).json({ error: "Failed to apply template" });
      }
    }
  );
}
