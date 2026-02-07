/**
 * Google Drive Asset Sync Routes
 * Admin-only endpoints for syncing assets from Google Drive
 */

import type { Express, Request, Response } from "express";
import * as fs from "node:fs";
import * as path from "node:path";
import { requirePermission } from "../security";
import { findFolderByName, listFilesInFolder, downloadFile } from "../google-drive";

/**
 * SECURITY: Validate folder/file name to prevent path traversal attacks
 * Only allows alphanumeric characters, hyphens, underscores, and dots
 */
function isValidPathSegment(name: string): boolean {
  // Reject path traversal attempts
  if (name.includes("..") || name.includes("/") || name.includes("\\")) {
    return false;
  }
  // Only allow safe characters: alphanumeric, hyphen, underscore, dot, space
  // Spaces will be converted to hyphens later
  return /^[a-zA-Z0-9\-_. ]+$/.test(name);
}

/**
 * SECURITY: Sanitize path segment - remove dangerous characters
 */
function sanitizePathSegment(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-") // Convert spaces to hyphens
    .replace(/[^a-z0-9\-_.]/g, "") // Remove any non-safe characters
    .replace(/\.{2,}/g, ".") // Prevent multiple dots
    .replace(/^\.+|\.+$/g, ""); // Remove leading/trailing dots
}

export function registerGoogleDriveRoutes(app: Express): void {
  // Google Drive Asset Sync (Admin-only)
  app.post(
    "/api/admin/assets/sync-google-drive",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
      const report: {
        success: boolean;
        downloaded: { city: string; file: string; path: string }[];
        skipped: { city: string; file: string; reason: string }[];
        errors: { city: string; file?: string; error: string }[];
        summary: { totalDownloaded: number; totalSkipped: number; totalErrors: number };
      } = {
        success: false,
        downloaded: [],
        skipped: [],
        errors: [],
        summary: { totalDownloaded: 0, totalSkipped: 0, totalErrors: 0 },
      };

      try {
        const websiteFolders = await findFolderByName("Website");
        if (!websiteFolders || websiteFolders.length === 0) {
          report.errors.push({ city: "", error: "Website folder not found in Google Drive" });
          report.summary.totalErrors = 1;
          return res.status(404).json(report);
        }

        const websiteFolderId = websiteFolders[0].id!;

        const websiteContents = await listFilesInFolder(websiteFolderId);
        const categoriesFolder = websiteContents.find(f => f.name?.toLowerCase() === "categories");
        if (!categoriesFolder || !categoriesFolder.id) {
          report.errors.push({
            city: "",
            error: "Categories subfolder not found in Website folder",
          });
          report.summary.totalErrors = 1;
          return res.status(404).json(report);
        }

        const destinationFolders = await listFilesInFolder(categoriesFolder.id);
        const imageMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        const baseDestPath = path.join(process.cwd(), "client", "public", "images", "destinations");

        if (!fs.existsSync(baseDestPath)) {
          fs.mkdirSync(baseDestPath, { recursive: true });
        }

        for (const destFolder of destinationFolders) {
          if (destFolder.mimeType !== "application/vnd.google-apps.folder" || !destFolder.id) {
            continue;
          }

          // SECURITY: Validate folder name to prevent path traversal
          if (!destFolder.name || !isValidPathSegment(destFolder.name)) {
            report.errors.push({
              city: destFolder.name || "unknown",
              error: `Invalid folder name (potential security issue): ${destFolder.name}`,
            });
            continue;
          }

          const cityName = sanitizePathSegment(destFolder.name);

          // Extra validation: ensure sanitized name is not empty
          if (!cityName || cityName.length === 0) {
            report.errors.push({
              city: destFolder.name,
              error: "Folder name sanitized to empty string",
            });
            continue;
          }

          const cityPath = path.join(baseDestPath, cityName);

          try {
            await fs.promises.access(cityPath);
          } catch {
            await fs.promises.mkdir(cityPath, { recursive: true });
          }

          try {
            const cityFiles = await listFilesInFolder(destFolder.id);

            for (const file of cityFiles) {
              if (!file.id || !file.name) continue;

              // SECURITY: Validate file name to prevent path traversal
              if (!isValidPathSegment(file.name)) {
                report.skipped.push({
                  city: cityName,
                  file: file.name,
                  reason: "Invalid file name (security validation failed)",
                });
                continue;
              }

              if (!imageMimeTypes.includes(file.mimeType || "")) {
                report.skipped.push({
                  city: cityName,
                  file: file.name,
                  reason: `Unsupported mime type: ${file.mimeType}`,
                });
                continue;
              }

              // SECURITY: Sanitize file name before using in path
              const safeFileName =
                sanitizePathSegment(file.name.replace(/\.[^.]+$/, "")) +
                file.name.substring(file.name.lastIndexOf("."));

              const filePath = path.join(cityPath, safeFileName);

              try {
                await fs.promises.access(filePath);
                report.skipped.push({
                  city: cityName,
                  file: file.name,
                  reason: "File already exists",
                });
                continue;
              } catch {
                // File doesn't exist, proceed with download
              }

              try {
                const buffer = await downloadFile(file.id);
                await fs.promises.writeFile(filePath, buffer);
                report.downloaded.push({
                  city: cityName,
                  file: safeFileName,
                  path: `/images/destinations/${cityName}/${safeFileName}`,
                });
              } catch (downloadErr: any) {
                report.errors.push({
                  city: cityName,
                  file: file.name,
                  error: downloadErr.message || "Download failed",
                });
              }
            }
          } catch (cityErr: any) {
            report.errors.push({
              city: cityName,
              error: cityErr.message || "Failed to list city folder contents",
            });
          }
        }

        report.success = report.errors.length === 0;
        report.summary.totalDownloaded = report.downloaded.length;
        report.summary.totalSkipped = report.skipped.length;
        report.summary.totalErrors = report.errors.length;

        res.json(report);
      } catch (err: any) {
        report.errors.push({ city: "", error: err.message || "Sync failed" });
        report.summary.totalErrors = report.errors.length;
        res.status(500).json(report);
      }
    }
  );
}
