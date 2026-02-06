/**
 * RFC 7807 Problem Details Error Response
 *
 * Provides a standardized error response format following RFC 7807
 * (Problem Details for HTTP APIs). Includes backward-compatible `error`
 * field so existing clients continue to work during migration.
 *
 * @see https://tools.ietf.org/html/rfc7807
 */

import type { Response } from "express";

/**
 * RFC 7807 Problem Details structure
 */
export interface ProblemDetails {
  /** URI reference identifying the problem type */
  type: string;
  /** Short, human-readable summary of the problem */
  title: string;
  /** HTTP status code */
  status: number;
  /** Human-readable explanation specific to this occurrence */
  detail?: string;
  /** URI reference identifying the specific occurrence */
  instance?: string;
  /** Validation errors (extension member) */
  errors?: Array<{ field: string; message: string }>;
  /** Legacy field for backward compatibility */
  error?: string;
  /** API metadata (extension member) */
  _meta?: Record<string, unknown>;
}

/** Base URI for error type references */
const ERROR_TYPE_BASE = "https://travi.travel/errors";

/**
 * Well-known error types
 */
export const ErrorTypes = {
  VALIDATION: `${ERROR_TYPE_BASE}/validation`,
  NOT_FOUND: `${ERROR_TYPE_BASE}/not-found`,
  UNAUTHORIZED: `${ERROR_TYPE_BASE}/unauthorized`,
  FORBIDDEN: `${ERROR_TYPE_BASE}/forbidden`,
  CONFLICT: `${ERROR_TYPE_BASE}/conflict`,
  RATE_LIMITED: `${ERROR_TYPE_BASE}/rate-limited`,
  INTERNAL: `${ERROR_TYPE_BASE}/internal`,
} as const;

/**
 * Send an RFC 7807 Problem Details error response.
 *
 * Sets `Content-Type: application/problem+json` and includes both
 * the RFC 7807 fields and a legacy `error` field for backward
 * compatibility with existing clients.
 */
export function sendProblemResponse(
  res: Response,
  opts: {
    type?: string;
    title: string;
    status: number;
    detail?: string;
    instance?: string;
    errors?: Array<{ field: string; message: string }>;
    _meta?: Record<string, unknown>;
  }
): void {
  const body: ProblemDetails = {
    type: opts.type || ErrorTypes.INTERNAL,
    title: opts.title,
    status: opts.status,
    // Legacy field: existing clients may check `body.error`
    error: opts.title,
  };

  if (opts.detail !== undefined) {
    body.detail = opts.detail;
  }
  if (opts.instance !== undefined) {
    body.instance = opts.instance;
  }
  if (opts.errors !== undefined) {
    body.errors = opts.errors;
  }
  if (opts._meta !== undefined) {
    body._meta = opts._meta;
  }

  res.status(opts.status).set("Content-Type", "application/problem+json").json(body);
}

/**
 * Create a Problem Details object for a Zod validation error.
 */
export function zodToProblemDetails(
  err: { errors: Array<{ path?: (string | number)[]; message: string }> },
  instance?: string
): {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  errors: Array<{ field: string; message: string }>;
} {
  const errors = err.errors.map(e => ({
    field: e.path?.join(".") || "unknown",
    message: e.message,
  }));

  return {
    type: ErrorTypes.VALIDATION,
    title: "Validation Error",
    status: 400,
    detail: `${errors.length} validation error(s) in request`,
    ...(instance && { instance }),
    errors,
  };
}
