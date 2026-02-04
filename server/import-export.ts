/**
 * Import/Export Service
 * Backup, restore, and migration utilities
 */

import { db } from "./db";
import {
  contents,
  translations,
  users,
  teams,
  teamMembers,
  mediaFiles,
  rssFeeds,
  affiliateLinks,
  tags,
  contentTags,
  siteSettings,
  contentClusters,
  clusterMembers,
  type Content,
  type Translation,
  type User,
  type Team,
  type TeamMember,
  type MediaFile,
  type RssFeed,
  type AffiliateLink,
  type Tag,
  type ContentTag,
  type SiteSetting,
  type ContentCluster,
  type ClusterMember,
} from "@shared/schema";
import { desc } from "drizzle-orm";
import { Readable } from "stream";

// Export format version for compatibility
const EXPORT_VERSION = "1.0.0";

export interface ExportOptions {
  includeContents?: boolean;
  includeTranslations?: boolean;
  includeUsers?: boolean;
  includeTeams?: boolean;
  includeMedia?: boolean;
  includeSettings?: boolean;
  includeTags?: boolean;
  includeClusters?: boolean;
  includeAffiliateLinks?: boolean;
  includeRssFeeds?: boolean;
  contentTypes?: string[];
  contentStatus?: string[];
  fromDate?: Date;
  toDate?: Date;
}

/** Sanitized user for export (excludes sensitive data) */
export interface ExportUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: User["role"];
  isActive: boolean;
  createdAt: Date | null;
}

export interface ExportData {
  version: string;
  exportedAt: string;
  options: ExportOptions;
  data: {
    contents?: Content[];
    translations?: Translation[];
    users?: ExportUser[];
    teams?: Team[];
    teamMembers?: TeamMember[];
    mediaFiles?: MediaFile[];
    settings?: SiteSetting[];
    tags?: Tag[];
    contentTags?: ContentTag[];
    clusters?: ContentCluster[];
    clusterMembers?: ClusterMember[];
    affiliateLinks?: AffiliateLink[];
    rssFeeds?: RssFeed[];
  };
  stats: {
    totalRecords: number;
    byType: Record<string, number>;
  };
}

export interface ImportOptions {
  overwriteExisting?: boolean;
  skipUsers?: boolean;
  skipSettings?: boolean;
  dryRun?: boolean;
}

export interface ImportResult {
  success: boolean;
  dryRun: boolean;
  imported: Record<string, number>;
  skipped: Record<string, number>;
  errors: Array<{ type: string; id?: string; error: string }>;
}

// ============================================================================
// EXPORT SERVICE
// ============================================================================

export const exportService = {
  async exportData(options: ExportOptions = {}): Promise<ExportData> {
    const {
      includeContents = true,
      includeTranslations = true,
      includeUsers = false,
      includeTeams = true,
      includeMedia = false,
      includeSettings = true,
      includeTags = true,
      includeClusters = true,
      includeAffiliateLinks = true,
      includeRssFeeds = true,
    } = options;

    const data: ExportData["data"] = {};
    const stats: Record<string, number> = {};

    // Export contents
    if (includeContents) {
      let contentQuery = db.select().from(contents).orderBy(desc(contents.createdAt));
      data.contents = await contentQuery;
      stats.contents = data.contents.length;
    }

    // Export translations
    if (includeTranslations) {
      data.translations = await db.select().from(translations);
      stats.translations = data.translations.length;
    }

    // Export users (excluding sensitive data)
    if (includeUsers) {
      const allUsers = await db.select().from(users);
      data.users = allUsers.map(u => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt,
        // Exclude: passwordHash, totpSecret, recoveryCodes
      }));
      stats.users = data.users.length;
    }

    // Export teams
    if (includeTeams) {
      data.teams = await db.select().from(teams);
      data.teamMembers = await db.select().from(teamMembers);
      stats.teams = data.teams.length;
      stats.teamMembers = data.teamMembers.length;
    }

    // Export media files (metadata only, not actual files)
    if (includeMedia) {
      data.mediaFiles = await db.select().from(mediaFiles);
      stats.mediaFiles = data.mediaFiles.length;
    }

    // Export settings
    if (includeSettings) {
      data.settings = await db.select().from(siteSettings);
      stats.settings = data.settings.length;
    }

    // Export tags
    if (includeTags) {
      data.tags = await db.select().from(tags);
      data.contentTags = await db.select().from(contentTags);
      stats.tags = data.tags.length;
      stats.contentTags = data.contentTags.length;
    }

    // Export clusters
    if (includeClusters) {
      data.clusters = await db.select().from(contentClusters);
      data.clusterMembers = await db.select().from(clusterMembers);
      stats.clusters = data.clusters.length;
      stats.clusterMembers = data.clusterMembers.length;
    }

    // Export affiliate links
    if (includeAffiliateLinks) {
      data.affiliateLinks = await db.select().from(affiliateLinks);
      stats.affiliateLinks = data.affiliateLinks.length;
    }

    // Export RSS feeds
    if (includeRssFeeds) {
      data.rssFeeds = await db.select().from(rssFeeds);
      stats.rssFeeds = data.rssFeeds.length;
    }

    const totalRecords = Object.values(stats).reduce((a, b) => a + b, 0);

    return {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      options,
      data,
      stats: {
        totalRecords,
        byType: stats,
      },
    };
  },

  async exportToJSON(options: ExportOptions = {}): Promise<string> {
    const data = await this.exportData(options);
    return JSON.stringify(data, null, 2);
  },

  createExportStream(data: ExportData): Readable {
    const jsonString = JSON.stringify(data, null, 2);
    return Readable.from([jsonString]);
  },
};

// ============================================================================
// IMPORT SERVICE
// ============================================================================

export const importService = {
  async validateImportData(data: any): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!data.version) {
      errors.push("Missing export version");
    }

    if (!data.data) {
      errors.push("Missing data object");
    }

    if (data.version && data.version !== EXPORT_VERSION) {
      errors.push(`Version mismatch: expected ${EXPORT_VERSION}, got ${data.version}`);
    }

    return { valid: errors.length === 0, errors };
  },

  async importData(exportData: ExportData, options: ImportOptions = {}): Promise<ImportResult> {
    const {
      overwriteExisting = false,
      skipUsers = true,
      skipSettings = false,
      dryRun = false,
    } = options;

    const result: ImportResult = {
      success: true,
      dryRun,
      imported: {},
      skipped: {},
      errors: [],
    };

    const data = exportData.data;

    try {
      // Import tags first (they might be referenced by content)
      if (data.tags && data.tags.length > 0) {
        const [imported, skipped] = await this.importRecords(
          tags,
          data.tags,
          "id",
          overwriteExisting,
          dryRun
        );
        result.imported.tags = imported;
        result.skipped.tags = skipped;
      }

      // Import clusters
      if (data.clusters && data.clusters.length > 0) {
        const [imported, skipped] = await this.importRecords(
          contentClusters,
          data.clusters,
          "id",
          overwriteExisting,
          dryRun
        );
        result.imported.clusters = imported;
        result.skipped.clusters = skipped;
      }

      // Import teams
      if (data.teams && data.teams.length > 0) {
        const [imported, skipped] = await this.importRecords(
          teams,
          data.teams,
          "id",
          overwriteExisting,
          dryRun
        );
        result.imported.teams = imported;
        result.skipped.teams = skipped;
      }

      // Import users (if not skipped)
      if (!skipUsers && data.users && data.users.length > 0) {
        const [imported, skipped] = await this.importRecords(
          users,
          data.users,
          "id",
          overwriteExisting,
          dryRun
        );
        result.imported.users = imported;
        result.skipped.users = skipped;
      }

      // Import team members
      if (data.teamMembers && data.teamMembers.length > 0) {
        const [imported, skipped] = await this.importRecords(
          teamMembers,
          data.teamMembers,
          "id",
          overwriteExisting,
          dryRun
        );
        result.imported.teamMembers = imported;
        result.skipped.teamMembers = skipped;
      }

      // Import contents
      if (data.contents && data.contents.length > 0) {
        const [imported, skipped] = await this.importRecords(
          contents,
          data.contents,
          "id",
          overwriteExisting,
          dryRun
        );
        result.imported.contents = imported;
        result.skipped.contents = skipped;
      }

      // Import translations
      if (data.translations && data.translations.length > 0) {
        const [imported, skipped] = await this.importRecords(
          translations,
          data.translations,
          "id",
          overwriteExisting,
          dryRun
        );
        result.imported.translations = imported;
        result.skipped.translations = skipped;
      }

      // Import content-tag associations
      if (data.contentTags && data.contentTags.length > 0) {
        const [imported, skipped] = await this.importRecords(
          contentTags,
          data.contentTags,
          "id",
          overwriteExisting,
          dryRun
        );
        result.imported.contentTags = imported;
        result.skipped.contentTags = skipped;
      }

      // Import cluster members
      if (data.clusterMembers && data.clusterMembers.length > 0) {
        const [imported, skipped] = await this.importRecords(
          clusterMembers,
          data.clusterMembers,
          "id",
          overwriteExisting,
          dryRun
        );
        result.imported.clusterMembers = imported;
        result.skipped.clusterMembers = skipped;
      }

      // Import settings (if not skipped)
      if (!skipSettings && data.settings && data.settings.length > 0) {
        const [imported, skipped] = await this.importRecords(
          siteSettings,
          data.settings,
          "key",
          overwriteExisting,
          dryRun
        );
        result.imported.settings = imported;
        result.skipped.settings = skipped;
      }

      // Import affiliate links
      if (data.affiliateLinks && data.affiliateLinks.length > 0) {
        const [imported, skipped] = await this.importRecords(
          affiliateLinks,
          data.affiliateLinks,
          "id",
          overwriteExisting,
          dryRun
        );
        result.imported.affiliateLinks = imported;
        result.skipped.affiliateLinks = skipped;
      }

      // Import RSS feeds
      if (data.rssFeeds && data.rssFeeds.length > 0) {
        const [imported, skipped] = await this.importRecords(
          rssFeeds,
          data.rssFeeds,
          "id",
          overwriteExisting,
          dryRun
        );
        result.imported.rssFeeds = imported;
        result.skipped.rssFeeds = skipped;
      }

      // Import media file metadata
      if (data.mediaFiles && data.mediaFiles.length > 0) {
        const [imported, skipped] = await this.importRecords(
          mediaFiles,
          data.mediaFiles,
          "id",
          overwriteExisting,
          dryRun
        );
        result.imported.mediaFiles = imported;
        result.skipped.mediaFiles = skipped;
      }
    } catch (error) {
      result.success = false;
      result.errors.push({
        type: "general",
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return result;
  },

  async importRecords<T extends Record<string, unknown>>(
    table: any,
    records: T[],
    idField: string,
    overwrite: boolean,
    dryRun: boolean
  ): Promise<[number, number]> {
    if (dryRun) {
      return [records.length, 0];
    }

    let imported = 0;
    let skipped = 0;

    for (const record of records) {
      try {
        if (overwrite) {
          await db.insert(table).values(record).onConflictDoUpdate({
            target: table[idField],
            set: record,
          });
          imported++;
        } else {
          await db.insert(table).values(record).onConflictDoNothing();
          imported++;
        }
      } catch (error) {
        // Skip records that fail (likely due to foreign key constraints)
        skipped++;
      }
    }

    return [imported, skipped];
  },
};

// ============================================================================
// BACKUP SERVICE
// ============================================================================

export const backupService = {
  async createBackup(): Promise<ExportData> {
    // Full backup with all data
    return exportService.exportData({
      includeContents: true,
      includeTranslations: true,
      includeUsers: true,
      includeTeams: true,
      includeMedia: true,
      includeSettings: true,
      includeTags: true,
      includeClusters: true,
      includeAffiliateLinks: true,
      includeRssFeeds: true,
    });
  },

  async getBackupStats(): Promise<{
    contents: number;
    translations: number;
    users: number;
    teams: number;
    mediaFiles: number;
    settings: number;
    tags: number;
  }> {
    const [
      contentsCount,
      translationsCount,
      usersCount,
      teamsCount,
      mediaCount,
      settingsCount,
      tagsCount,
    ] = await Promise.all([
      db
        .select()
        .from(contents)
        .then(r => r.length),
      db
        .select()
        .from(translations)
        .then(r => r.length),
      db
        .select()
        .from(users)
        .then(r => r.length),
      db
        .select()
        .from(teams)
        .then(r => r.length),
      db
        .select()
        .from(mediaFiles)
        .then(r => r.length),
      db
        .select()
        .from(siteSettings)
        .then(r => r.length),
      db
        .select()
        .from(tags)
        .then(r => r.length),
    ]);

    return {
      contents: contentsCount,
      translations: translationsCount,
      users: usersCount,
      teams: teamsCount,
      mediaFiles: mediaCount,
      settings: settingsCount,
      tags: tagsCount,
    };
  },
};
