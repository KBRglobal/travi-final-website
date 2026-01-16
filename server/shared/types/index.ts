/**
 * Shared Types
 * Phase 1 Foundation: Common types used across domains
 */

import type { Request, Response, NextFunction } from 'express';

/**
 * Async route handler type
 */
export type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void | Response>;

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    correlationId?: string;
    timestamp: string;
  };
}

/**
 * Sort options
 */
export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Filter options (generic)
 */
export interface FilterOptions {
  [key: string]: unknown;
}

/**
 * Service result type (for operations that might fail)
 */
export type ServiceResult<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Create a success result
 */
export function success<T>(data: T): ServiceResult<T, never> {
  return { success: true, data };
}

/**
 * Create an error result
 */
export function failure<E>(error: E): ServiceResult<never, E> {
  return { success: false, error };
}
