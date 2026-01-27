/**
 * Audit Data Normalizer
 * Feature flag: ENABLE_AUDIT_LOGS
 */

import { createHash } from "crypto";
import { AuditEvent, AuditSource, AuditAction } from "./types";

const MAX_SNAPSHOT_SIZE = 50000; // 50KB limit for snapshots
const SENSITIVE_FIELDS = ["password", "secret", "token", "apiKey", "passwordHash", "totpSecret"];

/**
 * Normalize and sanitize audit event data
 */
export function normalizeEvent(event: AuditEvent): AuditEvent {
  return {
    ...event,
    action: normalizeAction(event.action),
    resource: normalizeResource(event.resource),
    beforeSnapshot: event.beforeSnapshot ? normalizeSnapshot(event.beforeSnapshot) : undefined,
    afterSnapshot: event.afterSnapshot ? normalizeSnapshot(event.afterSnapshot) : undefined,
    source: normalizeSource(event.source),
    metadata: event.metadata ? sanitizeMetadata(event.metadata) : undefined,
  };
}

/**
 * Normalize action string
 */
export function normalizeAction(action: string): AuditAction {
  const normalized = action.toLowerCase().trim();
  const validActions: AuditAction[] = [
    "create",
    "update",
    "delete",
    "publish",
    "unpublish",
    "archive",
    "restore",
    "view",
    "export",
    "import",
    "login",
    "logout",
    "permission_change",
    "role_change",
    "config_change",
    "approval_request",
    "approval_decision",
    "ai_generation",
    "bulk_operation",
  ];

  if (validActions.includes(normalized as AuditAction)) {
    return normalized as AuditAction;
  }

  // Map common variations
  const actionMap: Record<string, AuditAction> = {
    created: "create",
    updated: "update",
    deleted: "delete",
    published: "publish",
    unpublished: "unpublish",
    archived: "archive",
    restored: "restore",
    viewed: "view",
    exported: "export",
    imported: "import",
  };

  return actionMap[normalized] || "update";
}

/**
 * Normalize resource string
 */
export function normalizeResource(resource: string): string {
  return resource
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]/g, "_");
}

/**
 * Normalize source string
 */
export function normalizeSource(source: string): AuditSource {
  const normalized = source.toLowerCase().trim();
  const validSources: AuditSource[] = ["ui", "api", "automation", "ai", "system", "webhook"];

  if (validSources.includes(normalized as AuditSource)) {
    return normalized as AuditSource;
  }

  // Map variations
  if (normalized.includes("user") || normalized.includes("browser")) return "ui";
  if (normalized.includes("auto") || normalized.includes("cron")) return "automation";
  if (
    normalized.includes("ai") ||
    normalized.includes("openai") ||
    normalized.includes("anthropic")
  )
    return "ai";

  return "api";
}

/**
 * Normalize and potentially truncate snapshot data
 */
export function normalizeSnapshot(data: string): string {
  // Remove sensitive fields
  let sanitized = sanitizeJson(data);

  // Truncate if too large
  if (sanitized.length > MAX_SNAPSHOT_SIZE) {
    sanitized = sanitized.substring(0, MAX_SNAPSHOT_SIZE) + "...[TRUNCATED]";
  }

  return sanitized;
}

/**
 * Sanitize JSON string by removing sensitive fields
 */
export function sanitizeJson(jsonStr: string): string {
  try {
    const obj = JSON.parse(jsonStr);
    const sanitized = sanitizeObject(obj);
    return JSON.stringify(sanitized);
  } catch {
    // Not valid JSON, return as-is
    return jsonStr;
  }
}

/**
 * Recursively sanitize object
 */
export function sanitizeObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_FIELDS.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
      result[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      result[key] = sanitizeObject(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Sanitize metadata object
 */
export function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  return sanitizeObject(metadata) as Record<string, unknown>;
}

/**
 * Generate hash for snapshot (for integrity verification)
 */
export function hashSnapshot(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Compute diff between two snapshots
 */
export function computeDiff(
  before: string | undefined,
  after: string | undefined
): { added: string[]; removed: string[]; changed: string[] } {
  const result = { added: [] as string[], removed: [] as string[], changed: [] as string[] };

  if (!before && !after) return result;
  if (!before) {
    result.added.push("(new record)");
    return result;
  }
  if (!after) {
    result.removed.push("(deleted record)");
    return result;
  }

  try {
    const beforeObj = JSON.parse(before);
    const afterObj = JSON.parse(after);

    const allKeys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);

    for (const key of allKeys) {
      if (!(key in beforeObj)) {
        result.added.push(key);
      } else if (!(key in afterObj)) {
        result.removed.push(key);
      } else if (JSON.stringify(beforeObj[key]) !== JSON.stringify(afterObj[key])) {
        result.changed.push(key);
      }
    }
  } catch {
    // Not valid JSON
    if (before !== after) {
      result.changed.push("(raw content)");
    }
  }

  return result;
}
