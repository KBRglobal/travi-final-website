/**
 * Export Center V2
 *
 * Governed data exports with approval workflows and audit trails.
 * Feature flag: ENABLE_EXPORT_CENTER_V2
 */

import { db } from "../db";
import { Request, Response, Router } from "express";
import { users, contents as content, governanceAuditLogs, approvalRequests } from "@shared/schema";
import { eq, and, inArray, sql, desc, count } from "drizzle-orm";

// =====================================================
// TYPES
// =====================================================

export type ExportFormat = "csv" | "json" | "xlsx" | "xml";
export type ExportStatus =
  | "pending"
  | "approved"
  | "processing"
  | "completed"
  | "failed"
  | "expired";

export interface ExportRequest {
  id: string;
  userId: string;
  resourceType: string;
  format: ExportFormat;
  filters?: Record<string, unknown>;
  fields?: string[];
  status: ExportStatus;
  recordCount?: number;
  fileSize?: number;
  filePath?: string;
  downloadUrl?: string;
  expiresAt?: Date;
  requiresApproval: boolean;
  approvalRequestId?: string;
  error?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  completedAt?: Date;
}

export interface ExportConfig {
  enabled: boolean;
  requireApprovalThreshold: number;
  maxRecordsPerExport: number;
  sensitiveResources: string[];
  allowedFormats: ExportFormat[];
  expirationHours: number;
  storagePath: string;
  rateLimitPerHour: number;
}

export interface ExportResult {
  success: boolean;
  exportId?: string;
  requiresApproval?: boolean;
  approvalRequestId?: string;
  downloadUrl?: string;
  recordCount?: number;
  error?: string;
}

// =====================================================
// CONFIGURATION
// =====================================================

function getExportConfig(): ExportConfig {
  return {
    enabled: process.env.ENABLE_EXPORT_CENTER_V2 === "true",
    requireApprovalThreshold: parseInt(process.env.EXPORT_APPROVAL_THRESHOLD || "1000"),
    maxRecordsPerExport: parseInt(process.env.EXPORT_MAX_RECORDS || "50000"),
    sensitiveResources: (
      process.env.EXPORT_SENSITIVE_RESOURCES || "users,audit_logs,payments"
    ).split(","),
    allowedFormats: (process.env.EXPORT_ALLOWED_FORMATS || "csv,json,xlsx").split(
      ","
    ) as ExportFormat[],
    expirationHours: parseInt(process.env.EXPORT_EXPIRATION_HOURS || "24"),
    storagePath: process.env.EXPORT_STORAGE_PATH || "/tmp/exports",
    rateLimitPerHour: parseInt(process.env.EXPORT_RATE_LIMIT_PER_HOUR || "10"),
  };
}

// =====================================================
// EXPORT STORAGE (In-Memory for Demo)
// =====================================================

const exportStore = new Map<string, ExportRequest>();

function generateExportId(): string {
  return `exp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function createExportRecord(data: Partial<ExportRequest>): Promise<ExportRequest> {
  const id = generateExportId();
  const record: ExportRequest = {
    id,
    userId: data.userId || "",
    resourceType: data.resourceType || "",
    format: data.format || "csv",
    filters: data.filters,
    fields: data.fields,
    status: data.status || "pending",
    requiresApproval: data.requiresApproval || false,
    createdAt: new Date(),
    metadata: data.metadata,
  };

  exportStore.set(id, record);
  return record;
}

async function getExportById(id: string): Promise<ExportRequest | null> {
  return exportStore.get(id) || null;
}

async function updateExport(
  id: string,
  updates: Partial<ExportRequest>
): Promise<ExportRequest | null> {
  const existing = exportStore.get(id);
  if (!existing) return null;

  const updated = { ...existing, ...updates };
  exportStore.set(id, updated);
  return updated;
}

async function getUserExports(userId: string): Promise<ExportRequest[]> {
  const exports: ExportRequest[] = [];
  exportStore.forEach(exp => {
    if (exp.userId === userId) {
      exports.push(exp);
    }
  });
  return exports.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// =====================================================
// RATE LIMITING
// =====================================================

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(
  userId: string,
  config: ExportConfig
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const hourMs = 60 * 60 * 1000;

  let entry = rateLimitStore.get(userId);
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + hourMs };
    rateLimitStore.set(userId, entry);
  }

  const remaining = config.rateLimitPerHour - entry.count;
  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
  };
}

function incrementRateLimit(userId: string): void {
  const entry = rateLimitStore.get(userId);
  if (entry) {
    entry.count++;
  }
}

// =====================================================
// APPROVAL INTEGRATION
// =====================================================

async function requiresApproval(
  resourceType: string,
  recordCount: number,
  config: ExportConfig
): Promise<boolean> {
  // Sensitive resources always require approval
  if (config.sensitiveResources.includes(resourceType)) {
    return true;
  }

  // Large exports require approval
  if (recordCount > config.requireApprovalThreshold) {
    return true;
  }

  return false;
}

async function createApprovalRequest(
  exportId: string,
  userId: string,
  resourceType: string,
  recordCount: number
): Promise<string> {
  const [result] = await db
    .insert(approvalRequests)
    .values({
      requestType: "export",
      resourceType: "export_request",
      resourceId: exportId,
      requesterId: userId,
      status: "pending",
      priority: recordCount > 10000 ? "high" : "normal",
      reason: `Export ${recordCount} ${resourceType} records`,
      metadata: {
        exportId,
        resourceType,
        recordCount,
      },
    } as any)
    .returning({ id: approvalRequests.id });

  return result.id;
}

// =====================================================
// DATA EXPORT LOGIC
// =====================================================

async function countRecords(
  resourceType: string,
  filters?: Record<string, unknown>
): Promise<number> {
  // Simplified count - in production, would use actual queries
  switch (resourceType) {
    case "content":
      const [contentCount] = await db.select({ count: count() }).from(content);
      return contentCount.count;
    case "users":
      const [userCount] = await db.select({ count: count() }).from(users);
      return userCount.count;
    default:
      return 0;
  }
}

async function fetchExportData(
  resourceType: string,
  filters?: Record<string, unknown>,
  fields?: string[],
  limit?: number
): Promise<Record<string, unknown>[]> {
  // Simplified data fetch - in production, would be more sophisticated
  switch (resourceType) {
    case "content":
      const contentData = await db
        .select()
        .from(content)
        .limit(limit || 1000);
      return contentData.map(row => {
        if (fields && fields.length > 0) {
          const filtered: Record<string, unknown> = {};
          fields.forEach(field => {
            if (field in row) {
              filtered[field] = (row as Record<string, unknown>)[field];
            }
          });
          return filtered;
        }
        return row as unknown as Record<string, unknown>;
      });

    case "users":
      const userData = await db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
        })
        .from(users)
        .limit(limit || 1000);
      return userData as unknown as Record<string, unknown>[];

    default:
      return [];
  }
}

function convertToFormat(data: Record<string, unknown>[], format: ExportFormat): string {
  switch (format) {
    case "json":
      return JSON.stringify(data, null, 2);

    case "csv":
      if (data.length === 0) return "";
      const headers = Object.keys(data[0]);
      const rows = data.map(row =>
        headers
          .map(h => {
            const value = row[h];
            if (value === null || value === undefined) return "";
            if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return String(value);
          })
          .join(",")
      );
      return [headers.join(","), ...rows].join("\n");

    case "xml":
      const xmlRows = data.map(row => {
        const fields = Object.entries(row)
          .map(([k, v]) => `    <${k}>${escapeXml(String(v ?? ""))}</${k}>`)
          .join("\n");
        return `  <record>\n${fields}\n  </record>`;
      });
      return `<?xml version="1.0" encoding="UTF-8"?>\n<export>\n${xmlRows.join("\n")}\n</export>`;

    default:
      return JSON.stringify(data);
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// =====================================================
// AUDIT LOGGING
// =====================================================

async function auditExport(
  userId: string,
  action: string,
  exportId: string,
  resourceType: string,
  recordCount?: number,
  ipAddress?: string
): Promise<void> {
  try {
    await db.insert(governanceAuditLogs).values({
      userId,
      action: `export.${action}`,
      resource: "export",
      resourceId: exportId,
      source: "export_center",
      ipAddress,
      metadata: {
        resourceType,
        recordCount,
      },
    } as any);
  } catch (error) {}
}

// =====================================================
// MAIN EXPORT FUNCTION
// =====================================================

export async function initiateExport(
  userId: string,
  resourceType: string,
  format: ExportFormat,
  options: {
    filters?: Record<string, unknown>;
    fields?: string[];
    ipAddress?: string;
  } = {}
): Promise<ExportResult> {
  const config = getExportConfig();

  // Check if export center is enabled
  if (!config.enabled) {
    return { success: false, error: "Export Center is disabled" };
  }

  // Validate format
  if (!config.allowedFormats.includes(format)) {
    return { success: false, error: `Format '${format}' is not allowed` };
  }

  // Check rate limit
  const rateLimit = checkRateLimit(userId, config);
  if (!rateLimit.allowed) {
    return { success: false, error: "Rate limit exceeded. Please try again later." };
  }

  // Count records
  const recordCount = await countRecords(resourceType, options.filters);

  // Check max records
  if (recordCount > config.maxRecordsPerExport) {
    return {
      success: false,
      error: `Export exceeds maximum of ${config.maxRecordsPerExport} records (requested: ${recordCount})`,
    };
  }

  // Check if approval is required
  const needsApproval = await requiresApproval(resourceType, recordCount, config);

  // Create export record
  const exportRecord = await createExportRecord({
    userId,
    resourceType,
    format,
    filters: options.filters,
    fields: options.fields,
    recordCount,
    status: needsApproval ? "pending" : "processing",
    requiresApproval: needsApproval,
    expiresAt: new Date(Date.now() + config.expirationHours * 60 * 60 * 1000),
    metadata: { ipAddress: options.ipAddress },
  });

  // Increment rate limit
  incrementRateLimit(userId);

  // Audit the request
  await auditExport(
    userId,
    "requested",
    exportRecord.id,
    resourceType,
    recordCount,
    options.ipAddress
  );

  if (needsApproval) {
    // Create approval request
    const approvalId = await createApprovalRequest(
      exportRecord.id,
      userId,
      resourceType,
      recordCount
    );

    await updateExport(exportRecord.id, { approvalRequestId: approvalId });

    return {
      success: true,
      exportId: exportRecord.id,
      requiresApproval: true,
      approvalRequestId: approvalId,
      recordCount,
    };
  }

  // Process export immediately
  try {
    const data = await fetchExportData(resourceType, options.filters, options.fields, recordCount);
    const output = convertToFormat(data, format);

    // In production, would save to file storage
    const fileSize = new Blob([output]).size;

    await updateExport(exportRecord.id, {
      status: "completed",
      fileSize,
      completedAt: new Date(),
      downloadUrl: `/api/exports/${exportRecord.id}/download`,
    });

    await auditExport(
      userId,
      "completed",
      exportRecord.id,
      resourceType,
      recordCount,
      options.ipAddress
    );

    return {
      success: true,
      exportId: exportRecord.id,
      downloadUrl: `/api/exports/${exportRecord.id}/download`,
      recordCount,
    };
  } catch (error) {
    await updateExport(exportRecord.id, {
      status: "failed",
      error: error instanceof Error ? error.message : "Export failed",
    });

    await auditExport(
      userId,
      "failed",
      exportRecord.id,
      resourceType,
      recordCount,
      options.ipAddress
    );

    return {
      success: false,
      exportId: exportRecord.id,
      error: error instanceof Error ? error.message : "Export failed",
    };
  }
}

// =====================================================
// APPROVAL HANDLER
// =====================================================

export async function onExportApproved(exportId: string): Promise<ExportResult> {
  const exportRecord = await getExportById(exportId);
  if (!exportRecord) {
    return { success: false, error: "Export not found" };
  }

  if (exportRecord.status !== "pending") {
    return { success: false, error: `Export is not pending (status: ${exportRecord.status})` };
  }

  await updateExport(exportId, { status: "processing" });

  try {
    const data = await fetchExportData(
      exportRecord.resourceType,
      exportRecord.filters,
      exportRecord.fields,
      exportRecord.recordCount
    );
    const output = convertToFormat(data, exportRecord.format);
    const fileSize = new Blob([output]).size;

    await updateExport(exportId, {
      status: "completed",
      fileSize,
      completedAt: new Date(),
      downloadUrl: `/api/exports/${exportId}/download`,
    });

    await auditExport(
      exportRecord.userId,
      "approved_and_completed",
      exportId,
      exportRecord.resourceType,
      exportRecord.recordCount
    );

    return {
      success: true,
      exportId,
      downloadUrl: `/api/exports/${exportId}/download`,
      recordCount: exportRecord.recordCount,
    };
  } catch (error) {
    await updateExport(exportId, {
      status: "failed",
      error: error instanceof Error ? error.message : "Export failed",
    });

    return {
      success: false,
      exportId,
      error: error instanceof Error ? error.message : "Export failed",
    };
  }
}

export async function onExportRejected(exportId: string, reason?: string): Promise<void> {
  await updateExport(exportId, {
    status: "failed",
    error: reason || "Export request rejected",
  });

  const exportRecord = await getExportById(exportId);
  if (exportRecord) {
    await auditExport(
      exportRecord.userId,
      "rejected",
      exportId,
      exportRecord.resourceType,
      exportRecord.recordCount
    );
  }
}

// =====================================================
// API ROUTES
// =====================================================

export const exportCenterRoutes = Router();

// List user's exports
exportCenterRoutes.get("/", async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const exports = await getUserExports(userId);
  res.json({ exports });
});

// Initiate export
exportCenterRoutes.post("/", async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { resourceType, format, filters, fields } = req.body;

  if (!resourceType) {
    return res.status(400).json({ error: "resourceType is required" });
  }

  const result = await initiateExport(userId, resourceType, format || "csv", {
    filters,
    fields,
    ipAddress: req.ip,
  });

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.status(result.requiresApproval ? 202 : 200).json(result);
});

// Get export status
exportCenterRoutes.get("/:id", async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const exportRecord = await getExportById(req.params.id);

  if (!exportRecord) {
    return res.status(404).json({ error: "Export not found" });
  }

  if (exportRecord.userId !== userId && (req as any).user?.role !== "admin") {
    return res.status(403).json({ error: "Access denied" });
  }

  res.json({ export: exportRecord });
});

// Download export
exportCenterRoutes.get("/:id/download", async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const exportRecord = await getExportById(req.params.id);

  if (!exportRecord) {
    return res.status(404).json({ error: "Export not found" });
  }

  if (exportRecord.userId !== userId && (req as any).user?.role !== "admin") {
    return res.status(403).json({ error: "Access denied" });
  }

  if (exportRecord.status !== "completed") {
    return res.status(400).json({ error: `Export is not ready (status: ${exportRecord.status})` });
  }

  // Check expiration
  if (exportRecord.expiresAt && new Date() > exportRecord.expiresAt) {
    await updateExport(req.params.id, { status: "expired" });
    return res.status(410).json({ error: "Export has expired" });
  }

  // Re-generate export data for download
  const data = await fetchExportData(
    exportRecord.resourceType,
    exportRecord.filters,
    exportRecord.fields,
    exportRecord.recordCount
  );
  const output = convertToFormat(data, exportRecord.format);

  const contentTypes: Record<ExportFormat, string> = {
    csv: "text/csv",
    json: "application/json",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    xml: "application/xml",
  };

  res.setHeader("Content-Type", contentTypes[exportRecord.format] || "application/octet-stream");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="export-${exportRecord.id}.${exportRecord.format}"`
  );
  res.send(output);

  // Audit download
  await auditExport(
    userId,
    "downloaded",
    exportRecord.id,
    exportRecord.resourceType,
    exportRecord.recordCount,
    req.ip
  );
});
