/**
 * Database Backup Script
 * Creates compressed PostgreSQL backups with rotation
 *
 * Usage:
 *   npx tsx server/scripts/backup-db.ts
 *   npx tsx server/scripts/backup-db.ts --output /custom/path
 */

import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import { createGzip } from "zlib";
import { pipeline } from "stream/promises";

const execAsync = promisify(exec);

// Configuration
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), "backups");
const MAX_BACKUPS = parseInt(process.env.MAX_BACKUPS || "7", 10);
const DATABASE_URL = process.env.DATABASE_URL;

interface BackupResult {
  success: boolean;
  filename?: string;
  path?: string;
  size?: number;
  duration?: number;
  error?: string;
}

/**
 * Parse PostgreSQL connection string
 */
function parseDbUrl(url: string): {
  host: string;
  port: string;
  database: string;
  user: string;
  password: string;
} {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parsed.port || "5432",
    database: parsed.pathname.slice(1),
    user: parsed.username,
    password: parsed.password,
  };
}

/**
 * Generate backup filename with timestamp
 */
function generateBackupFilename(): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `backup-${timestamp}.sql.gz`;
}

/**
 * Ensure backup directory exists
 */
async function ensureBackupDir(): Promise<void> {
  if (!fs.existsSync(BACKUP_DIR)) {
    await fs.promises.mkdir(BACKUP_DIR, { recursive: true });
  }
}

/**
 * Run pg_dump and compress output
 */
async function createBackup(): Promise<BackupResult> {
  const startTime = Date.now();

  if (!DATABASE_URL) {
    return { success: false, error: "DATABASE_URL not set" };
  }

  try {
    await ensureBackupDir();

    const dbConfig = parseDbUrl(DATABASE_URL);
    const filename = generateBackupFilename();
    const backupPath = path.join(BACKUP_DIR, filename);
    const tempPath = path.join(BACKUP_DIR, `temp-${Date.now()}.sql`);

    // Set PGPASSWORD environment variable for pg_dump
    const env = { ...process.env, PGPASSWORD: dbConfig.password };

    // Run pg_dump

    const pgDumpCmd = [
      "pg_dump",
      `-h ${dbConfig.host}`,
      `-p ${dbConfig.port}`,
      `-U ${dbConfig.user}`,
      `-d ${dbConfig.database}`,
      "--format=plain",
      "--no-owner",
      "--no-acl",
      `--file=${tempPath}`,
    ].join(" ");

    await execAsync(pgDumpCmd, { env });

    // Compress the backup

    const source = fs.createReadStream(tempPath);
    const destination = fs.createWriteStream(backupPath);
    const gzip = createGzip({ level: 9 });

    await pipeline(source, gzip, destination);

    // Remove temp file
    await fs.promises.unlink(tempPath);

    // Get file size
    const stats = await fs.promises.stat(backupPath);
    const duration = Date.now() - startTime;

    return {
      success: true,
      filename,
      path: backupPath,
      size: stats.size,
      duration,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return { success: false, error: errorMessage };
  }
}

/**
 * Remove old backups keeping only MAX_BACKUPS most recent
 */
async function rotateBackups(): Promise<number> {
  try {
    const files = await fs.promises.readdir(BACKUP_DIR);
    const backupFiles = files
      .filter(f => f.startsWith("backup-") && f.endsWith(".sql.gz"))
      .map(f => ({
        name: f,
        path: path.join(BACKUP_DIR, f),
        time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time);

    let deleted = 0;
    if (backupFiles.length > MAX_BACKUPS) {
      const toDelete = backupFiles.slice(MAX_BACKUPS);
      for (const file of toDelete) {
        await fs.promises.unlink(file.path);

        deleted++;
      }
    }

    return deleted;
  } catch (error) {
    return 0;
  }
}

/**
 * List all backups
 */
async function listBackups(): Promise<void> {
  try {
    await ensureBackupDir();
    const files = await fs.promises.readdir(BACKUP_DIR);
    const backupFiles = files
      .filter(f => f.startsWith("backup-") && f.endsWith(".sql.gz"))
      .map(f => {
        const stats = fs.statSync(path.join(BACKUP_DIR, f));
        return {
          name: f,
          size: (stats.size / 1024 / 1024).toFixed(2) + " MB",
          date: stats.mtime.toISOString(),
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    if (backupFiles.length === 0) {
    } else {
      backupFiles.forEach((f, i) => {});
    }
  } catch (error) {}
}

// Main execution
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--list")) {
    await listBackups();
    return;
  }

  const result = await createBackup();

  if (result.success) {
    const deleted = await rotateBackups();

    process.exit(0);
  } else {
    process.exit(1);
  }
}

main().catch(() => {});

export { createBackup, rotateBackups, listBackups, BackupResult };
