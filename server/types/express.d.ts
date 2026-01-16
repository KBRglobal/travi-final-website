/**
 * Extended Express Types for Authenticated Requests
 */

import { Request, Response, NextFunction } from "express";

/**
 * User claims from authentication
 */
export interface UserClaims {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
}

/**
 * Authenticated user attached to request
 */
export interface AuthUser {
  claims: UserClaims;
}

/**
 * Request with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  isAuthenticated(): boolean;
  login(user: unknown, callback: (err?: Error) => void): void;
  logout(callback: (err?: Error) => void): void;
  session: Request["session"] & {
    userId?: string;
    role?: string;
    save(callback?: (err?: Error) => void): void;
    destroy(callback?: (err?: Error) => void): void;
  };
  requestId?: string;
}

/**
 * Standard route handler types
 */
export type RouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void> | void;

export type AuthRouteHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => Promise<void> | void;

/**
 * Content block structure
 */
export interface ContentBlock {
  id: string;
  type: string;
  order: number;
  data?: {
    content?: string;
    text?: string;
    url?: string;
    alt?: string;
    level?: number;
    items?: string[];
    caption?: string;
    [key: string]: unknown;
  };
}

/**
 * API error response
 */
export interface ApiError {
  error: string;
  details?: unknown;
  statusCode?: number;
}

/**
 * Helper to get user ID from authenticated request
 */
export function getUserIdFromRequest(req: AuthenticatedRequest): string | undefined {
  return req.user?.claims?.sub;
}

/**
 * Type guard for checking if error has message
 */
export function isErrorWithMessage(error: unknown): error is { message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  );
}

/**
 * Safely get error message
 */
export function getErrorMessage(error: unknown): string {
  if (isErrorWithMessage(error)) {
    return error.message;
  }
  return String(error);
}
