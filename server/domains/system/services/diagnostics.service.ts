/**
 * Diagnostics Service
 * Phase 1 Foundation: Aggregated system diagnostics for Ops dashboards
 */

import { healthService } from './health.service';
import { systemInfoService } from './system-info.service';
import { configStatusService } from './config-status.service';
import { domains } from '../../index';
import type { DiagnosticsResponse } from '../dto';

export class DiagnosticsService {
  private static instance: DiagnosticsService;

  private constructor() {}

  static getInstance(): DiagnosticsService {
    if (!DiagnosticsService.instance) {
      DiagnosticsService.instance = new DiagnosticsService();
    }
    return DiagnosticsService.instance;
  }

  /**
   * Get aggregated system diagnostics
   * Combines health, system info, domains, and feature flags into single response
   */
  async getDiagnostics(correlationId?: string): Promise<DiagnosticsResponse> {
    // Get health status
    const { response: healthResponse } = await healthService.checkHealth({
      includeDatabase: true,
      includeMemory: true,
    });

    // Get system info
    const uptime = systemInfoService.getUptime();
    const buildInfo = systemInfoService.getBuildInfo();

    // Get feature flags
    const featureFlags = configStatusService.getFeatureFlags();
    const foundationFlags = configStatusService.getFoundationFlags();

    // Get config status
    const configStatus = configStatusService.getConfigStatus();

    // Get domains
    const domainList = Object.entries(domains).map(([name, info]) => ({
      name,
      enabled: info.enabled,
    }));

    // Get memory details
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

    return {
      timestamp: new Date().toISOString(),
      ...(correlationId && { correlationId }),

      health: {
        status: healthResponse.status,
        checks: {
          database: healthResponse.checks?.database
            ? {
                status: healthResponse.checks.database.status,
                latencyMs: healthResponse.checks.database.latency,
              }
            : undefined,
          memory: healthResponse.checks?.memory
            ? {
                status: healthResponse.checks.memory.status,
                usagePercent: healthResponse.checks.memory.usage,
                heapUsedMB,
                heapTotalMB,
              }
            : undefined,
        },
      },

      system: {
        version: buildInfo.version,
        nodeVersion: buildInfo.nodeVersion,
        environment: buildInfo.environment,
        uptimeSeconds: uptime.uptimeSeconds,
        uptimeFormatted: uptime.uptimeFormatted,
        startedAt: uptime.startedAt,
      },

      domains: domainList,

      featureFlags: {
        total: featureFlags.summary.total,
        enabled: featureFlags.summary.enabled,
        disabled: featureFlags.summary.disabled,
        foundation: foundationFlags,
      },

      services: {
        activeAIProvider: configStatus.activeAIProvider,
        configured: {
          ai: configStatus.features.aiContentGeneration,
          imageGeneration: configStatus.features.aiImageGeneration,
          translations: configStatus.features.translations,
          email: configStatus.features.emailCampaigns,
          cloudStorage: configStatus.features.cloudStorage,
        },
      },
    };
  }
}

export const diagnosticsService = DiagnosticsService.getInstance();
