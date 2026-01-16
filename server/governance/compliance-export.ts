/**
 * GDPR Compliance Export System
 * Data export, deletion reports, and compliance documentation
 */

import { db } from "../db";
import {
  users,
  contents,
  auditLogs,
  governanceAuditLogs,
  userRoleAssignments,
  governanceRoles,
  contentViews,
  analyticsEvents,
} from "@shared/schema";
import { eq, and, or, gte, lte, desc } from "drizzle-orm";
import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";
import {
  ComplianceExportRequest,
  ComplianceExportType,
  GDPRDataPackage,
  UserProfileData,
  ActivityData,
  ContentOwnershipData,
  PermissionData,
  AuditLogEntry,
  DataRetentionInfo,
} from "./types";
import { logDataAccessEvent } from "./security-logger";

// ============================================================================
// EXPORT STORAGE
// ============================================================================

const EXPORT_DIR = process.env.COMPLIANCE_EXPORT_DIR || "/tmp/compliance-exports";
const EXPORT_EXPIRY_HOURS = 72; // Exports expire after 72 hours

// Ensure export directory exists
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

// ============================================================================
// COMPLIANCE EXPORT SERVICE
// ============================================================================

class ComplianceExportService {
  /**
   * Create a GDPR data export for a user
   */
  async createGDPRExport(params: {
    requesterId: string;
    targetUserId: string;
    includeAuditLogs?: boolean;
    includeAnalytics?: boolean;
    ipAddress?: string;
  }): Promise<ComplianceExportRequest> {
    const { requesterId, targetUserId, includeAuditLogs = true, includeAnalytics = false, ipAddress } = params;

    const exportId = `gdpr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    // Log the export request
    await logDataAccessEvent({
      eventType: "data_exported",
      userId: requesterId,
      resource: "users",
      resourceId: targetUserId,
      action: "export",
      details: `GDPR data export requested for user ${targetUserId}`,
      ipAddress,
      metadata: {
        exportType: "gdpr_data_export",
        includeAuditLogs,
        includeAnalytics,
      },
    });

    // Gather all user data
    const dataPackage = await this.gatherUserData(targetUserId, includeAuditLogs, includeAnalytics);

    // Write to file
    const fileName = `${exportId}.json`;
    const filePath = path.join(EXPORT_DIR, fileName);

    const exportData = {
      exportId,
      exportedAt: now.toISOString(),
      requestedBy: requesterId,
      targetUser: targetUserId,
      dataPackage,
      checksums: this.computeChecksums(dataPackage),
    };

    fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));
    const stats = fs.statSync(filePath);

    return {
      id: exportId,
      exportType: "gdpr_data_export",
      requesterId,
      targetUserId,
      includeAuditLogs,
      includeUserData: true,
      includeContentData: true,
      includeAnalytics,
      status: "completed",
      filePath,
      fileSize: stats.size,
      completedAt: now,
      expiresAt: new Date(now.getTime() + EXPORT_EXPIRY_HOURS * 60 * 60 * 1000),
      createdAt: now,
    };
  }

  /**
   * Create audit report
   */
  async createAuditReport(params: {
    requesterId: string;
    fromDate: Date;
    toDate: Date;
    targetUserId?: string;
    actions?: string[];
    resources?: string[];
    ipAddress?: string;
  }): Promise<ComplianceExportRequest> {
    const { requesterId, fromDate, toDate, targetUserId, actions, resources, ipAddress } = params;

    const exportId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    await logDataAccessEvent({
      eventType: "data_exported",
      userId: requesterId,
      resource: "audit",
      action: "export",
      details: `Audit report generated from ${fromDate.toISOString()} to ${toDate.toISOString()}`,
      ipAddress,
      metadata: {
        exportType: "audit_report",
        targetUserId,
        actions,
        resources,
      },
    });

    // Gather audit logs
    let query = db
      .select()
      .from(governanceAuditLogs)
      .where(
        and(
          gte(governanceAuditLogs.createdAt, fromDate),
          lte(governanceAuditLogs.createdAt, toDate)
        )
      )
      .orderBy(desc(governanceAuditLogs.createdAt));

    if (targetUserId) {
      query = query.where(eq(governanceAuditLogs.userId, targetUserId)) as typeof query;
    }

    const logs = await query.limit(10000);

    // Format report
    const report = {
      exportId,
      generatedAt: now.toISOString(),
      requestedBy: requesterId,
      period: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      },
      filters: {
        targetUserId,
        actions,
        resources,
      },
      summary: {
        totalEvents: logs.length,
        uniqueUsers: new Set(logs.map((l) => l.userId)).size,
        byAction: this.groupBy(logs, "action"),
        byResource: this.groupBy(logs, "resource"),
      },
      events: logs.map((log) => ({
        id: log.id,
        timestamp: log.createdAt,
        userId: log.userId,
        userRole: log.userRole,
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        source: log.source,
        ipAddress: log.ipAddress,
        metadata: log.metadata,
      })),
    };

    // Write to file
    const fileName = `${exportId}.json`;
    const filePath = path.join(EXPORT_DIR, fileName);
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
    const stats = fs.statSync(filePath);

    return {
      id: exportId,
      exportType: "audit_report",
      requesterId,
      targetUserId,
      dateFrom: fromDate,
      dateTo: toDate,
      includeAuditLogs: true,
      includeUserData: false,
      includeContentData: false,
      includeAnalytics: false,
      status: "completed",
      filePath,
      fileSize: stats.size,
      completedAt: now,
      expiresAt: new Date(now.getTime() + EXPORT_EXPIRY_HOURS * 60 * 60 * 1000),
      createdAt: now,
    };
  }

  /**
   * Create permissions report
   */
  async createPermissionsReport(params: {
    requesterId: string;
    ipAddress?: string;
  }): Promise<ComplianceExportRequest> {
    const { requesterId, ipAddress } = params;

    const exportId = `perms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    await logDataAccessEvent({
      eventType: "data_exported",
      userId: requesterId,
      resource: "roles",
      action: "export",
      details: "Permissions report generated",
      ipAddress,
    });

    // Get all users with roles
    const userRoles = await db
      .select({
        userId: userRoleAssignments.userId,
        userName: users.name,
        userEmail: users.email,
        roleName: governanceRoles.name,
        roleDisplayName: governanceRoles.displayName,
        scope: userRoleAssignments.scope,
        scopeValue: userRoleAssignments.scopeValue,
        grantedAt: userRoleAssignments.grantedAt,
        expiresAt: userRoleAssignments.expiresAt,
        isActive: userRoleAssignments.isActive,
      })
      .from(userRoleAssignments)
      .innerJoin(users, eq(users.id, userRoleAssignments.userId))
      .innerJoin(governanceRoles, eq(governanceRoles.id, userRoleAssignments.roleId))
      .orderBy(users.email);

    // Get all roles
    const allRoles = await db.select().from(governanceRoles);

    // Format report
    const report = {
      exportId,
      generatedAt: now.toISOString(),
      requestedBy: requesterId,
      summary: {
        totalUsers: new Set(userRoles.map((ur) => ur.userId)).size,
        totalRoles: allRoles.length,
        byRole: this.groupBy(userRoles, "roleName"),
      },
      roles: allRoles.map((role) => ({
        name: role.name,
        displayName: role.displayName,
        description: role.description,
        priority: role.priority,
        isSystem: role.isSystem,
        userCount: userRoles.filter((ur) => ur.roleName === role.name).length,
      })),
      assignments: userRoles.map((ur) => ({
        userId: ur.userId,
        userName: ur.userName,
        userEmail: ur.userEmail,
        role: ur.roleName,
        scope: ur.scope,
        scopeValue: ur.scopeValue,
        grantedAt: ur.grantedAt,
        expiresAt: ur.expiresAt,
        isActive: ur.isActive,
      })),
    };

    // Write to file
    const fileName = `${exportId}.json`;
    const filePath = path.join(EXPORT_DIR, fileName);
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
    const stats = fs.statSync(filePath);

    return {
      id: exportId,
      exportType: "permissions_report",
      requesterId,
      includeAuditLogs: false,
      includeUserData: true,
      includeContentData: false,
      includeAnalytics: false,
      status: "completed",
      filePath,
      fileSize: stats.size,
      completedAt: now,
      expiresAt: new Date(now.getTime() + EXPORT_EXPIRY_HOURS * 60 * 60 * 1000),
      createdAt: now,
    };
  }

  /**
   * Create GDPR deletion report
   */
  async createDeletionReport(params: {
    requesterId: string;
    targetUserId: string;
    deletionDate: Date;
    deletedData: string[];
    ipAddress?: string;
  }): Promise<ComplianceExportRequest> {
    const { requesterId, targetUserId, deletionDate, deletedData, ipAddress } = params;

    const exportId = `deletion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    // Get user info before deletion (if still exists)
    const [user] = await db.select().from(users).where(eq(users.id, targetUserId));

    await logDataAccessEvent({
      eventType: "data_deleted",
      userId: requesterId,
      resource: "users",
      resourceId: targetUserId,
      action: "delete",
      details: `GDPR deletion completed for user ${targetUserId}`,
      ipAddress,
      metadata: {
        deletedData,
      },
    });

    const report = {
      exportId,
      generatedAt: now.toISOString(),
      requestedBy: requesterId,
      deletionDetails: {
        targetUserId,
        targetUserEmail: user?.email || "[deleted]",
        deletionDate: deletionDate.toISOString(),
        requestedAt: now.toISOString(),
        deletedCategories: deletedData,
      },
      dataCategories: {
        profile: {
          deleted: deletedData.includes("profile"),
          fields: ["name", "email", "profileImage"],
        },
        content: {
          deleted: deletedData.includes("content"),
          action: "anonymized", // Usually we anonymize rather than delete
        },
        auditLogs: {
          deleted: false,
          reason: "Retained for legal compliance (minimum retention period)",
          anonymized: true,
        },
        analytics: {
          deleted: deletedData.includes("analytics"),
        },
        sessions: {
          deleted: deletedData.includes("sessions"),
        },
      },
      retention: {
        legalBasis: "GDPR Article 17 - Right to Erasure",
        retainedForLegalReasons: ["audit_logs"],
        retentionPeriod: "7 years for financial records, 1 year for security logs",
      },
      verification: {
        checksum: this.computeHash(JSON.stringify({ targetUserId, deletedData, deletionDate })),
        verifiedAt: now.toISOString(),
        verifiedBy: requesterId,
      },
    };

    // Write to file
    const fileName = `${exportId}.json`;
    const filePath = path.join(EXPORT_DIR, fileName);
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
    const stats = fs.statSync(filePath);

    return {
      id: exportId,
      exportType: "gdpr_deletion_report",
      requesterId,
      targetUserId,
      includeAuditLogs: false,
      includeUserData: false,
      includeContentData: false,
      includeAnalytics: false,
      status: "completed",
      filePath,
      fileSize: stats.size,
      completedAt: now,
      expiresAt: new Date(now.getTime() + EXPORT_EXPIRY_HOURS * 60 * 60 * 1000),
      createdAt: now,
    };
  }

  /**
   * Get export file
   */
  getExportFile(exportId: string): { filePath: string; exists: boolean } {
    const filePath = path.join(EXPORT_DIR, `${exportId}.json`);
    return {
      filePath,
      exists: fs.existsSync(filePath),
    };
  }

  /**
   * Clean up expired exports
   */
  cleanupExpiredExports(): number {
    const now = Date.now();
    const expiryMs = EXPORT_EXPIRY_HOURS * 60 * 60 * 1000;
    let cleaned = 0;

    const files = fs.readdirSync(EXPORT_DIR);
    for (const file of files) {
      const filePath = path.join(EXPORT_DIR, file);
      const stats = fs.statSync(filePath);

      if (now - stats.mtimeMs > expiryMs) {
        fs.unlinkSync(filePath);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Gather all user data for GDPR export
   */
  private async gatherUserData(
    userId: string,
    includeAuditLogs: boolean,
    includeAnalytics: boolean
  ): Promise<GDPRDataPackage> {
    // Get user profile
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const profile: UserProfileData = {
      id: user.id,
      email: user.email || "",
      username: user.username || undefined,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      createdAt: user.createdAt!,
      isActive: user.isActive,
    };

    // Get content ownership
    const ownedContent = await db
      .select({
        id: contents.id,
        title: contents.title,
        type: contents.type,
        status: contents.status,
        createdAt: contents.createdAt,
        updatedAt: contents.updatedAt,
      })
      .from(contents)
      .where(eq(contents.authorId, userId));

    const contentOwnership: ContentOwnershipData[] = ownedContent.map((c) => ({
      contentId: c.id,
      title: c.title,
      type: c.type,
      status: c.status,
      createdAt: c.createdAt!,
      updatedAt: c.updatedAt!,
    }));

    // Get role assignments
    const roleAssignments = await db
      .select({
        roleName: governanceRoles.name,
        scope: userRoleAssignments.scope,
        grantedAt: userRoleAssignments.grantedAt,
        grantedBy: userRoleAssignments.grantedBy,
      })
      .from(userRoleAssignments)
      .innerJoin(governanceRoles, eq(governanceRoles.id, userRoleAssignments.roleId))
      .where(eq(userRoleAssignments.userId, userId));

    const permissions: PermissionData[] = roleAssignments.map((ra) => ({
      role: ra.roleName,
      scope: ra.scope,
      grantedAt: ra.grantedAt!,
      grantedBy: ra.grantedBy || undefined,
    }));

    // Get audit logs if requested
    let auditLogEntries: AuditLogEntry[] = [];
    if (includeAuditLogs) {
      const logs = await db
        .select()
        .from(governanceAuditLogs)
        .where(eq(governanceAuditLogs.userId, userId))
        .orderBy(desc(governanceAuditLogs.createdAt))
        .limit(1000);

      auditLogEntries = logs.map((log) => ({
        timestamp: log.createdAt,
        action: log.action,
        resource: log.resource,
        details: `${log.action} on ${log.resource}${log.resourceId ? ` (${log.resourceId})` : ""}`,
      }));
    }

    // Get activity data
    const activity: ActivityData[] = [];

    // Data retention info
    const dataRetention: DataRetentionInfo = {
      retentionPolicy: "Standard GDPR retention policy",
      dataCategories: [
        "profile",
        "content_ownership",
        "permissions",
        "audit_logs",
        "analytics",
      ],
    };

    return {
      exportId: "",
      exportedAt: new Date(),
      userId: user.id,
      userEmail: user.email || "",
      sections: {
        profile,
        activity,
        content: contentOwnership,
        permissions,
        auditLogs: auditLogEntries,
        dataRetention,
      },
    };
  }

  /**
   * Compute checksums for data integrity
   */
  private computeChecksums(data: GDPRDataPackage): Record<string, string> {
    return {
      profile: this.computeHash(JSON.stringify(data.sections.profile)),
      content: this.computeHash(JSON.stringify(data.sections.content)),
      permissions: this.computeHash(JSON.stringify(data.sections.permissions)),
      auditLogs: this.computeHash(JSON.stringify(data.sections.auditLogs)),
      overall: this.computeHash(JSON.stringify(data)),
    };
  }

  /**
   * Compute SHA-256 hash
   */
  private computeHash(data: string): string {
    return createHash("sha256").update(data).digest("hex");
  }

  /**
   * Group items by field
   */
  private groupBy(items: any[], field: string): Record<string, number> {
    return items.reduce((acc, item) => {
      const key = item[field] || "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}

// Singleton instance
export const complianceExportService = new ComplianceExportService();

console.log("[Governance] Compliance Export Service loaded");
