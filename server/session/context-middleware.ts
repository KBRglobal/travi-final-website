/**
 * Context Middleware
 * Express middleware to attach user context to request
 */

import type { Request, Response, NextFunction } from "express";
import { getSessionContext, updateSessionContext, type UserContext } from "./user-context";

declare global {
  namespace Express {
    interface Locals {
      userContext: UserContext;
      sessionId: string;
    }
  }
}

export function contextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  let sessionId: string | undefined;

  if (req.session && typeof (req.session as any).id === "string") {
    sessionId = (req.session as any).id;
  } else if (req.sessionID) {
    sessionId = req.sessionID;
  }

  if (!sessionId) {
    sessionId = `anon-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  const context = getSessionContext(sessionId);

  res.locals.sessionId = sessionId;
  res.locals.userContext = context;

  const path = req.path;
  if (path && !path.startsWith("/api/") && !path.startsWith("/_")) {
    updateSessionContext(sessionId, {
      visitedPages: [path],
    });
  }

  next();
}

export function trackSearch(sessionId: string, query: string): void {
  if (query && query.trim()) {
    updateSessionContext(sessionId, {
      lastSearches: [query.trim()],
    });
  }
}

export function trackChat(sessionId: string, message: string): void {
  if (message && message.trim()) {
    const truncated = message.trim().substring(0, 200);
    updateSessionContext(sessionId, {
      lastChats: [truncated],
    });
  }
}

export function trackPageVisit(sessionId: string, page: string): void {
  if (page && page.trim()) {
    updateSessionContext(sessionId, {
      visitedPages: [page.trim()],
    });
  }
}
