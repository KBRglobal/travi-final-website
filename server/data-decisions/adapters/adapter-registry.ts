/**
 * Adapter Registry
 * Central registry for all execution adapters
 */

import type { Decision, DecisionType } from "../types";
import type {
  ExecutionAdapter,
  ExecutionResult,
  ExecutionBlocked,
  RegisteredAdapter,
  SystemRegistration,
  AdapterHealth,
} from "./types";
import { seoAdapter } from "./seo-adapter";
import { contentAdapter } from "./content-adapter";
import { opsAdapter } from "./ops-adapter";
import { notificationAdapter } from "./notification-adapter";

// =============================================================================
// ADAPTER REGISTRY
// =============================================================================

export class AdapterRegistry {
  private adapters: Map<string, RegisteredAdapter> = new Map();
  private actionToAdapter: Map<DecisionType, string[]> = new Map();
  private systems: Map<string, SystemRegistration> = new Map();

  constructor() {
    // Register default adapters
    this.registerDefaultAdapters();
  }

  // =========================================================================
  // REGISTRATION
  // =========================================================================

  private registerDefaultAdapters(): void {
    this.register(seoAdapter);
    this.register(contentAdapter);
    this.register(opsAdapter);
    this.register(notificationAdapter);
  }

  register(adapter: ExecutionAdapter): void {
    const registered: RegisteredAdapter = {
      adapter,
      registeredAt: new Date(),
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
    };

    this.adapters.set(adapter.id, registered);

    // Map actions to adapter
    for (const action of adapter.supportedActions) {
      const existing = this.actionToAdapter.get(action) || [];
      existing.push(adapter.id);
      this.actionToAdapter.set(action, existing);
    }
  }

  unregister(adapterId: string): boolean {
    const registered = this.adapters.get(adapterId);
    if (!registered) return false;

    // Remove from action mapping
    for (const action of registered.adapter.supportedActions) {
      const existing = this.actionToAdapter.get(action) || [];
      this.actionToAdapter.set(
        action,
        existing.filter(id => id !== adapterId)
      );
    }

    this.adapters.delete(adapterId);
    return true;
  }

  registerSystem(system: Omit<SystemRegistration, "registeredAt">): void {
    this.systems.set(system.id, {
      ...system,
      registeredAt: new Date(),
    });
  }

  // =========================================================================
  // ADAPTER LOOKUP
  // =========================================================================

  get(adapterId: string): ExecutionAdapter | undefined {
    return this.adapters.get(adapterId)?.adapter;
  }

  getForAction(action: DecisionType): ExecutionAdapter[] {
    const adapterIds = this.actionToAdapter.get(action) || [];
    return adapterIds
      .map(id => this.adapters.get(id)?.adapter)
      .filter((a): a is ExecutionAdapter => a !== undefined);
  }

  getAll(): ExecutionAdapter[] {
    return Array.from(this.adapters.values()).map(r => r.adapter);
  }

  getRegisteredInfo(adapterId: string): RegisteredAdapter | undefined {
    return this.adapters.get(adapterId);
  }

  // =========================================================================
  // EXECUTION
  // =========================================================================

  async executeDecision(
    decision: Decision,
    dryRun?: boolean
  ): Promise<(ExecutionResult | ExecutionBlocked)[]> {
    const results: (ExecutionResult | ExecutionBlocked)[] = [];

    // Find adapters that can handle this decision
    const adapters = this.getForAction(decision.type);

    if (adapters.length === 0) {
      return [];
    }

    // Execute on all capable adapters
    for (const adapter of adapters) {
      if (adapter.canExecute(decision)) {
        const result = await adapter.execute(decision, dryRun);
        results.push(result);

        // Update statistics
        const registered = this.adapters.get(adapter.id);
        if (registered) {
          registered.lastUsed = new Date();
          registered.executionCount++;
          if ("blocked" in result) {
            // Blocked doesn't count as failure
          } else if (result.status === "success" || result.status === "dry_run") {
            registered.successCount++;
          } else if (result.status === "failed") {
            registered.failureCount++;
          }
        }
      }
    }

    return results;
  }

  // =========================================================================
  // HEALTH
  // =========================================================================

  async checkAllHealth(): Promise<Map<string, AdapterHealth>> {
    const results = new Map<string, AdapterHealth>();

    for (const [id, registered] of this.adapters) {
      const health = await registered.adapter.checkHealth();
      results.set(id, health);
    }

    return results;
  }

  getHealthSummary(): {
    total: number;
    healthy: number;
    degraded: number;
    critical: number;
    unknown: number;
  } {
    let healthy = 0;
    let degraded = 0;
    let critical = 0;
    let unknown = 0;

    for (const registered of this.adapters.values()) {
      const health = registered.adapter.getHealth();
      switch (health.status) {
        case "healthy":
          healthy++;
          break;
        case "degraded":
          degraded++;
          break;
        case "critical":
          critical++;
          break;
        default:
          unknown++;
      }
    }

    return {
      total: this.adapters.size,
      healthy,
      degraded,
      critical,
      unknown,
    };
  }

  // =========================================================================
  // LIFECYCLE
  // =========================================================================

  async initializeAll(): Promise<void> {
    const promises = Array.from(this.adapters.values()).map(r =>
      r.adapter.initialize().catch(err => {})
    );

    await Promise.all(promises);
  }

  async shutdownAll(): Promise<void> {
    const promises = Array.from(this.adapters.values()).map(r =>
      r.adapter.shutdown().catch(err => {})
    );

    await Promise.all(promises);
  }

  // =========================================================================
  // STATISTICS
  // =========================================================================

  getStatistics(): {
    adapters: number;
    systems: number;
    totalExecutions: number;
    successRate: number;
    byAdapter: Record<string, { executions: number; successes: number; failures: number }>;
  } {
    let totalExecutions = 0;
    let totalSuccesses = 0;
    const byAdapter: Record<string, { executions: number; successes: number; failures: number }> =
      {};

    for (const [id, registered] of this.adapters) {
      totalExecutions += registered.executionCount;
      totalSuccesses += registered.successCount;

      byAdapter[id] = {
        executions: registered.executionCount,
        successes: registered.successCount,
        failures: registered.failureCount,
      };
    }

    return {
      adapters: this.adapters.size,
      systems: this.systems.size,
      totalExecutions,
      successRate: totalExecutions > 0 ? (totalSuccesses / totalExecutions) * 100 : 0,
      byAdapter,
    };
  }

  // =========================================================================
  // SYSTEM INFO
  // =========================================================================

  getSystem(systemId: string): SystemRegistration | undefined {
    return this.systems.get(systemId);
  }

  getAllSystems(): SystemRegistration[] {
    return Array.from(this.systems.values());
  }

  getBindingSystems(): SystemRegistration[] {
    return this.getAllSystems().filter(s => s.category === "binding");
  }
}

// Singleton instance
export const adapterRegistry = new AdapterRegistry();
