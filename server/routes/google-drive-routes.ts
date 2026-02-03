/**
 * Google Drive Asset Sync Routes
 * Admin-only endpoints for syncing assets from Google Drive
 */

import type { Express, Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";
import { requirePermission } from "../security";
import { findFolderByName, listFilesInFolder, downloadFile } from "../google-drive";

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

          const cityName = destFolder.name!.toLowerCase().replace(/\s+/g, "-");
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

              if (!imageMimeTypes.includes(file.mimeType || "")) {
                report.skipped.push({
                  city: cityName,
                  file: file.name,
                  reason: `Unsupported mime type: ${file.mimeType}`,
                });
                continue;
              }

              const filePath = path.join(cityPath, file.name);

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
                  file: file.name,
                  path: `/images/destinations/${cityName}/${file.name}`,
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
