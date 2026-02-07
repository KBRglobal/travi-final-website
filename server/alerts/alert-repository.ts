import { db } from "../db";
import { sql } from "drizzle-orm";

import type { Alert, AlertType, AlertSeverity, AlertStats } from "./types";

const ALERTS_TABLE = "system_alerts";

let tableExists = false;

async function ensureTable(): Promise<void> {
  if (tableExists) return;

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ${sql.identifier(ALERTS_TABLE)} (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(64) NOT NULL,
        severity VARCHAR(16) NOT NULL,
        message TEXT NOT NULL,
        detected_at TIMESTAMP NOT NULL DEFAULT NOW(),
        resolved_at TIMESTAMP,
        metadata JSONB DEFAULT '{}',
        is_active BOOLEAN NOT NULL DEFAULT true
      )
    `);
    tableExists = true;
  } catch (error) {
    /* ignored */
  }
}

export async function createAlert(
  type: AlertType,
  severity: AlertSeverity,
  message: string,
  metadata: Record<string, unknown> = {}
): Promise<Alert | null> {
  await ensureTable();

  try {
    const result = await db.execute(sql`
      INSERT INTO ${sql.identifier(ALERTS_TABLE)} (type, severity, message, metadata)
      VALUES (${type}, ${severity}, ${message}, ${JSON.stringify(metadata)}::jsonb)
      RETURNING id, type, severity, message, detected_at, resolved_at, metadata, is_active
    `);

    const row = result.rows[0] as any;
    if (!row) return null;

    return {
      id: row.id,
      type: row.type as AlertType,
      severity: row.severity as AlertSeverity,
      message: row.message,
      detectedAt: new Date(row.detected_at),
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : null,
      metadata: row.metadata || {},
      isActive: row.is_active,
    };
  } catch (error) {
    return null;
  }
}

export async function findActiveAlertByType(type: AlertType): Promise<Alert | null> {
  await ensureTable();

  try {
    const result = await db.execute(sql`
      SELECT id, type, severity, message, detected_at, resolved_at, metadata, is_active
      FROM ${sql.identifier(ALERTS_TABLE)}
      WHERE type = ${type} AND is_active = true
      ORDER BY detected_at DESC
      LIMIT 1
    `);

    const row = result.rows[0] as any;
    if (!row) return null;

    return {
      id: row.id,
      type: row.type as AlertType,
      severity: row.severity as AlertSeverity,
      message: row.message,
      detectedAt: new Date(row.detected_at),
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : null,
      metadata: row.metadata || {},
      isActive: row.is_active,
    };
  } catch (error) {
    return null;
  }
}

export async function resolveAlert(id: string): Promise<boolean> {
  await ensureTable();

  try {
    const result = await db.execute(sql`
      UPDATE ${sql.identifier(ALERTS_TABLE)}
      SET is_active = false, resolved_at = NOW()
      WHERE id = ${id}
      RETURNING id
    `);
    return result.rows.length > 0;
  } catch (error) {
    return false;
  }
}

export async function resolveAlertsByType(type: AlertType): Promise<number> {
  await ensureTable();

  try {
    const result = await db.execute(sql`
      UPDATE ${sql.identifier(ALERTS_TABLE)}
      SET is_active = false, resolved_at = NOW()
      WHERE type = ${type} AND is_active = true
      RETURNING id
    `);
    return result.rows.length;
  } catch (error) {
    return 0;
  }
}

export async function getActiveAlerts(): Promise<Alert[]> {
  await ensureTable();

  try {
    const result = await db.execute(sql`
      SELECT id, type, severity, message, detected_at, resolved_at, metadata, is_active
      FROM ${sql.identifier(ALERTS_TABLE)}
      WHERE is_active = true
      ORDER BY 
        CASE severity 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          ELSE 4 
        END,
        detected_at DESC
    `);

    return result.rows.map((row: any) => ({
      id: row.id,
      type: row.type as AlertType,
      severity: row.severity as AlertSeverity,
      message: row.message,
      detectedAt: new Date(row.detected_at),
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : null,
      metadata: row.metadata || {},
      isActive: row.is_active,
    }));
  } catch (error) {
    return [];
  }
}

export async function getAllAlerts(limit = 100): Promise<Alert[]> {
  await ensureTable();

  try {
    const result = await db.execute(sql`
      SELECT id, type, severity, message, detected_at, resolved_at, metadata, is_active
      FROM ${sql.identifier(ALERTS_TABLE)}
      ORDER BY detected_at DESC
      LIMIT ${limit}
    `);

    return result.rows.map((row: any) => ({
      id: row.id,
      type: row.type as AlertType,
      severity: row.severity as AlertSeverity,
      message: row.message,
      detectedAt: new Date(row.detected_at),
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : null,
      metadata: row.metadata || {},
      isActive: row.is_active,
    }));
  } catch (error) {
    return [];
  }
}

export async function getAlertById(id: string): Promise<Alert | null> {
  await ensureTable();

  try {
    const result = await db.execute(sql`
      SELECT id, type, severity, message, detected_at, resolved_at, metadata, is_active
      FROM ${sql.identifier(ALERTS_TABLE)}
      WHERE id = ${id}
    `);

    const row = result.rows[0] as any;
    if (!row) return null;

    return {
      id: row.id,
      type: row.type as AlertType,
      severity: row.severity as AlertSeverity,
      message: row.message,
      detectedAt: new Date(row.detected_at),
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : null,
      metadata: row.metadata || {},
      isActive: row.is_active,
    };
  } catch (error) {
    return null;
  }
}

export async function getAlertStats(): Promise<AlertStats> {
  await ensureTable();

  try {
    const [totalResult, activeResult, bySeverityResult, oldestResult] = await Promise.all([
      db.execute(sql`SELECT COUNT(*)::int as count FROM ${sql.identifier(ALERTS_TABLE)}`),
      db.execute(
        sql`SELECT COUNT(*)::int as count FROM ${sql.identifier(ALERTS_TABLE)} WHERE is_active = true`
      ),
      db.execute(sql`
        SELECT severity, COUNT(*)::int as count 
        FROM ${sql.identifier(ALERTS_TABLE)} 
        WHERE is_active = true 
        GROUP BY severity
      `),
      db.execute(sql`
        SELECT detected_at 
        FROM ${sql.identifier(ALERTS_TABLE)} 
        WHERE is_active = true 
        ORDER BY detected_at ASC 
        LIMIT 1
      `),
    ]);

    const bySeverity: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const row of bySeverityResult.rows as any[]) {
      bySeverity[row.severity] = row.count;
    }

    return {
      total: (totalResult.rows[0] as any)?.count || 0,
      active: (activeResult.rows[0] as any)?.count || 0,
      bySeverity: bySeverity as Record<any, number>,
      oldestUnresolved: oldestResult.rows[0]
        ? new Date((oldestResult.rows[0] as any).detected_at)
        : null,
      lastDetectionRun: null,
    };
  } catch (error) {
    return {
      total: 0,
      active: 0,
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      oldestUnresolved: null,
      lastDetectionRun: null,
    };
  }
}
