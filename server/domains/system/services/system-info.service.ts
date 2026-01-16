/**
 * System Info Service
 * Phase 1 Foundation: Version, uptime, and build information
 */

import { getVersionInfo } from '../../../middleware/api-versioning';
import type { VersionResponse, UptimeResponse, BuildInfoResponse } from '../dto';

// Track server start time
const SERVER_START_TIME = new Date();

/**
 * Format uptime in human-readable form
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(' ');
}

export class SystemInfoService {
  private static instance: SystemInfoService;

  private constructor() {}

  static getInstance(): SystemInfoService {
    if (!SystemInfoService.instance) {
      SystemInfoService.instance = new SystemInfoService();
    }
    return SystemInfoService.instance;
  }

  /**
   * Get API version information
   */
  getVersion(correlationId?: string): VersionResponse {
    const versionInfo = getVersionInfo();

    return {
      currentVersion: versionInfo.currentVersion,
      supportedVersions: versionInfo.supportedVersions,
      deprecatedEndpoints: versionInfo.deprecatedEndpoints.map((dep) => ({
        path: dep.path,
        info: {
          deprecatedAt: dep.info.deprecatedAt,
          sunsetAt: dep.info.sunsetAt,
          replacement: dep.info.replacement,
          reason: dep.info.reason,
        },
      })),
      timestamp: new Date().toISOString(),
      ...(correlationId && { correlationId }),
    };
  }

  /**
   * Get server uptime information
   */
  getUptime(correlationId?: string): UptimeResponse {
    const uptimeSeconds = process.uptime();

    return {
      uptimeSeconds,
      uptimeFormatted: formatUptime(uptimeSeconds),
      startedAt: SERVER_START_TIME.toISOString(),
      timestamp: new Date().toISOString(),
      ...(correlationId && { correlationId }),
    };
  }

  /**
   * Get build information
   */
  getBuildInfo(correlationId?: string): BuildInfoResponse {
    return {
      version: process.env.npm_package_version || '1.0.0',
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
      buildTime: process.env.BUILD_TIME,
      gitCommit: process.env.GIT_COMMIT || process.env.COMMIT_SHA,
      gitBranch: process.env.GIT_BRANCH || process.env.BRANCH,
      timestamp: new Date().toISOString(),
      ...(correlationId && { correlationId }),
    };
  }

  /**
   * Get server start time
   */
  getStartTime(): Date {
    return SERVER_START_TIME;
  }
}

export const systemInfoService = SystemInfoService.getInstance();
