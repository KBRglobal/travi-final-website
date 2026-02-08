/**
 * Live Chat Support Routes
 * Public and admin endpoints for live chat functionality
 */

import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { type AuthRequest } from "../security";

// Helper to get user ID from auth request
function getUserId(req: AuthRequest): string | undefined {
  return (req as any).user?.claims?.sub || (req as any).user?.id;
}

export function registerLiveChatRoutes(app: Express): void {
  // ============================================================================
  // LIVE CHAT SUPPORT ROUTES
  // ============================================================================

  // Public: Get or create conversation for visitor
  app.post("/api/live-chat/conversations", async (req: Request, res: Response) => {
    try {
      const { visitorId, visitorName, visitorEmail } = req.body;

      if (!visitorId) {
        return res.status(400).json({ error: "Visitor ID is required" });
      }

      // Check for existing open conversation
      let conversation = await storage.getLiveChatConversationByVisitor(visitorId);

      if (!conversation) {
        // Create new conversation
        conversation = await storage.createLiveChatConversation({
          visitorId,
          visitorName: visitorName || null,
          visitorEmail: visitorEmail || null,
          status: "open",
        });
      }

      res.json(conversation);
    } catch {
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  // Public: Get messages for a conversation (polling)
  app.get("/api/live-chat/conversations/:id/messages", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const since = req.query.since ? new Date(req.query.since as string) : undefined;

      const messages = await storage.getLiveChatMessages(id, since);
      res.json(messages);
    } catch {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Public: Send message as visitor
  app.post("/api/live-chat/conversations/:id/messages", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { content, senderType = "visitor" } = req.body;

      if (!content) {
        return res.status(400).json({ error: "Message content is required" });
      }

      const message = await storage.createLiveChatMessage({
        conversationId: id,
        senderType,
        content,
        isRead: false,
      });

      res.json(message);
    } catch {
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Admin: Get all conversations
  app.get("/api/admin/live-chat/conversations", isAuthenticated, (async (
    req: AuthRequest,
    res: Response
  ) => {
    try {
      const status = req.query.status as string | undefined;
      const conversations = await storage.getLiveChatConversations(status);
      res.json(conversations);
    } catch {
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  }) as any);

  // Admin: Get single conversation with all messages
  app.get("/api/admin/live-chat/conversations/:id", isAuthenticated, (async (
    req: AuthRequest,
    res: Response
  ) => {
    try {
      const { id } = req.params;
      const conversation = await storage.getLiveChatConversation(id);

      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      res.json(conversation);
    } catch {
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  }) as any);

  // Admin: Send message as admin
  app.post("/api/admin/live-chat/conversations/:id/messages", isAuthenticated, (async (
    req: AuthRequest,
    res: Response
  ) => {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const userId = getUserId(req);

      if (!content) {
        return res.status(400).json({ error: "Message content is required" });
      }

      const message = await storage.createLiveChatMessage({
        conversationId: id,
        senderType: "admin",
        senderId: userId,
        content,
        isRead: false,
      });

      res.json(message);
    } catch {
      res.status(500).json({ error: "Failed to send message" });
    }
  }) as any);

  // Admin: Update conversation status
  app.patch("/api/admin/live-chat/conversations/:id", isAuthenticated, (async (
    req: AuthRequest,
    res: Response
  ) => {
    try {
      const { id } = req.params;
      const { status, assignedToId } = req.body;

      const conversation = await storage.updateLiveChatConversation(id, {
        status,
        assignedToId,
      });

      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      res.json(conversation);
    } catch {
      res.status(500).json({ error: "Failed to update conversation" });
    }
  }) as any);

  // Admin: Mark messages as read
  app.post("/api/admin/live-chat/conversations/:id/read", isAuthenticated, (async (
    req: AuthRequest,
    res: Response
  ) => {
    try {
      const { id } = req.params;
      await storage.markMessagesAsRead(id, "admin");
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed to mark messages as read" });
    }
  }) as any);
}
