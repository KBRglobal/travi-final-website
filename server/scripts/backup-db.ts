import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { safeLogValue } from "../lib/safe-error";

export interface BackupResult {
  success: boolean;
  filename?: string;
  error?: string;
}

const BACKUPS_DIR = path.resolve(process.cwd(), "backups");
const MAX_BACKUPS = Number.parseInt(process.env.BACKUP_MAX_COUNT || "7", 10);

function ensureBackupsDir(): void {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
}

/**
 * Validate and return the DATABASE_URL.
 * Strict validation prevents command injection when passed to pg_dump.
 */
function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // Validate it looks like a proper PostgreSQL connection URL
  // Only allow characters valid in PostgreSQL connection URIs
  const pgUrlPattern = /^postgres(ql)?:\/\/[^\s'"\\;|&$`!]+$/;
  if (!pgUrlPattern.test(url)) {
    throw new Error(
      "DATABASE_URL contains invalid characters or format. " +
        "Expected a valid PostgreSQL connection string."
    );
  }

  // Reject URLs containing shell metacharacters that could enable injection
  const dangerousChars = /[;|&$`!\\(){}[\]<>]/;
  if (dangerousChars.test(url)) {
    throw new Error("DATABASE_URL contains potentially unsafe shell characters");
  }

  return url;
}

export async function createBackup(name?: string): Promise<BackupResult> {
  try {
    ensureBackupsDir();

    // Security (CWE-23): Sanitize the optional name to prevent path traversal.
    // Only allow alphanumeric, hyphens, and underscores.
    if (name && !/^[\w-]+$/.test(name)) {
      return { success: false, error: "Backup name contains invalid characters" };
    }

    const timestamp = new Date()
      .toISOString()
      .replaceAll(/[:.]/g, "-")
      .replace("T", "T")
      .slice(0, 19);
    const filename = name ? `backup-${name}-${timestamp}.sql.gz` : `backup-${timestamp}.sql.gz`;
    const filepath = path.join(BACKUPS_DIR, filename);

    // Security (CWE-23): Verify resolved path is within the backup directory
    const resolvedPath = path.resolve(filepath);
    const resolvedBackupDir = path.resolve(BACKUPS_DIR);
    if (
      !resolvedPath.startsWith(resolvedBackupDir + path.sep) &&
      resolvedPath !== resolvedBackupDir
    ) {
      return { success: false, error: "Backup path escapes the backup directory" };
    }

    const databaseUrl = getDatabaseUrl();

    // Use pg_dump with --file to avoid shell pipe, then gzip separately.
    // This avoids passing the database URL through shell interpolation.
    const dumpPath = filepath.replace(/\.gz$/, "");

    execFileSync("pg_dump", [databaseUrl, "--no-owner", "--no-acl", "--file", dumpPath], {
      timeout: 300000, // 5 minute timeout
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });

    execFileSync("gzip", [dumpPath], {
      timeout: 60000,
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Verify the file was created and is not empty
    const stats = fs.statSync(filepath);
    if (stats.size === 0) {
      fs.unlinkSync(filepath);
      return {
        success: false,
        error: "Backup file is empty — pg_dump may have failed silently",
      };
    }

    console.log(
      `[Backup] Created: ${safeLogValue(filename)} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`
    );

    return { success: true, filename };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Backup] Failed: ${safeLogValue(message)}`);
    return { success: false, error: message };
  }
}

export async function rotateBackups(): Promise<BackupResult> {
  try {
    ensureBackupsDir();

    const files = fs
      .readdirSync(BACKUPS_DIR)
      .filter(f => f.startsWith("backup-") && f.endsWith(".sql.gz"))
      .map(f => ({
        name: f,
        path: path.join(BACKUPS_DIR, f),
        mtime: fs.statSync(path.join(BACKUPS_DIR, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime); // newest first

    if (files.length <= MAX_BACKUPS) {
      return { success: true };
    }

    const toDelete = files.slice(MAX_BACKUPS);
    for (const file of toDelete) {
      fs.unlinkSync(file.path);
      console.log(`[Backup] Rotated out: ${safeLogValue(file.name)}`);
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Backup] Rotation failed: ${safeLogValue(message)}`);
    return { success: false, error: message };
  }
}

export async function runBackup(): Promise<BackupResult> {
  const result = await createBackup();
  if (result.success) {
    await rotateBackups();
  }
  return result;
}
