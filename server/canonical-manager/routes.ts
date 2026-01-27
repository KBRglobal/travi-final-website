/**
 * Canonical Manager Admin Routes
 */

import type { Express, Request, Response } from "express";
import { requireAuth } from "../security";
import {
  detectDuplicates,
  createCanonicalGroup,
  addDuplicate,
  removeDuplicate,
  getCanonicalGroup,
  getGroupForContent,
  getAllGroups,
  getCanonicalStats,
  setDuplicateAction,
} from "./service";
import { isCanonicalManagerEnabled } from "./types";

export function registerCanonicalManagerRoutes(app: Express): void {
  app.get(
    "/api/admin/canonical/detect/:contentId",
    requireAuth,
    async (req: Request, res: Response) => {
      if (!isCanonicalManagerEnabled()) {
        return res.json({ enabled: false, message: "Canonical manager disabled" });
      }
      const result = await detectDuplicates(req.params.contentId);
      res.json({ enabled: true, ...result });
    }
  );

  app.post("/api/admin/canonical/group", requireAuth, async (req: Request, res: Response) => {
    if (!isCanonicalManagerEnabled()) {
      return res.status(403).json({ error: "Feature disabled" });
    }
    const { canonicalContentId, canonicalUrl } = req.body;
    if (!canonicalContentId || !canonicalUrl) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const group = createCanonicalGroup(canonicalContentId, canonicalUrl);
    res.json({ success: true, group });
  });

  app.post(
    "/api/admin/canonical/group/:groupId/duplicate",
    requireAuth,
    async (req: Request, res: Response) => {
      if (!isCanonicalManagerEnabled()) {
        return res.status(403).json({ error: "Feature disabled" });
      }
      const { contentId, url, similarity, action } = req.body;
      const success = addDuplicate(req.params.groupId, contentId, url, similarity, action);
      res.json({ success });
    }
  );

  app.delete(
    "/api/admin/canonical/group/:groupId/duplicate/:contentId",
    requireAuth,
    async (req: Request, res: Response) => {
      const success = removeDuplicate(req.params.groupId, req.params.contentId);
      res.json({ success });
    }
  );

  app.put(
    "/api/admin/canonical/group/:groupId/duplicate/:contentId/action",
    requireAuth,
    async (req: Request, res: Response) => {
      const { action } = req.body;
      const success = setDuplicateAction(req.params.groupId, req.params.contentId, action);
      res.json({ success });
    }
  );

  app.get(
    "/api/admin/canonical/group/:groupId",
    requireAuth,
    async (req: Request, res: Response) => {
      const group = getCanonicalGroup(req.params.groupId);
      res.json(group || { error: "Group not found" });
    }
  );

  app.get(
    "/api/admin/canonical/content/:contentId",
    requireAuth,
    async (req: Request, res: Response) => {
      const group = getGroupForContent(req.params.contentId);
      res.json(group || { notInGroup: true });
    }
  );

  app.get("/api/admin/canonical/groups", requireAuth, async (req: Request, res: Response) => {
    const groups = getAllGroups();
    res.json({ groups, count: groups.length });
  });

  app.get("/api/admin/canonical/stats", requireAuth, async (req: Request, res: Response) => {
    const stats = getCanonicalStats();
    res.json({ enabled: isCanonicalManagerEnabled(), ...stats });
  });
}
