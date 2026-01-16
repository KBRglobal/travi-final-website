/**
 * Unified Autopilot Gate
 * Global autopilot control across all systems
 *
 * Default mode is OFF. No autonomous behavior runs without explicit enable.
 */

import type { AutopilotMode } from '../types';
import { autopilotController } from './autopilot';
import { autonomousLoop } from '../loop';
import { systemHealthMonitor } from '../health';

// =============================================================================
// TYPES
// =============================================================================

export interface DomainAutopilotState {
  domain: string;
  mode: AutopilotMode;
  enabled: boolean;
  circuitBreakerOpen: boolean;
  lastModeChange: Date;
  changedBy: string;
  reason?: string;
}

export interface GlobalAutopilotState {
  globalEnabled: boolean;
  globalMode: AutopilotMode;
  emergencyStop: boolean;
  lastStateChange: Date;
  domains: Record<string, DomainAutopilotState>;
  circuitBreakerOpen: boolean;
  safetyLocks: string[];
}

export interface AutopilotGateResult {
  allowed: boolean;
  effectiveMode: AutopilotMode;
  blockedBy?: string;
  reason?: string;
}

// =============================================================================
// DOMAINS
// =============================================================================

const CONTROLLED_DOMAINS = ['data', 'seo', 'content', 'growth', 'ops'] as const;
type ControlledDomain = (typeof CONTROLLED_DOMAINS)[number];

// =============================================================================
// UNIFIED AUTOPILOT GATE
// =============================================================================

export class UnifiedAutopilotGate {
  private globalState: GlobalAutopilotState;
  private stateChangeCallbacks: Array<(state: GlobalAutopilotState) => void> = [];

  constructor() {
    // DEFAULT: Everything is OFF
    this.globalState = this.createInitialState();
  }

  // =========================================================================
  // INITIALIZATION
  // =========================================================================

  private createInitialState(): GlobalAutopilotState {
    const domains: Record<string, DomainAutopilotState> = {};

    for (const domain of CONTROLLED_DOMAINS) {
      domains[domain] = {
        domain,
        mode: 'off',
        enabled: false,
        circuitBreakerOpen: false,
        lastModeChange: new Date(),
        changedBy: 'system',
        reason: 'Initial state - disabled by default',
      };
    }

    return {
      globalEnabled: false, // OFF by default
      globalMode: 'off',
      emergencyStop: false,
      lastStateChange: new Date(),
      domains,
      circuitBreakerOpen: false,
      safetyLocks: [],
    };
  }

  // =========================================================================
  // GLOBAL CONTROL
  // =========================================================================

  enableGlobal(mode: AutopilotMode, changedBy: string, reason: string): boolean {
    if (this.globalState.emergencyStop) {
      console.error('[Autopilot] Cannot enable - emergency stop is active');
      return false;
    }

    if (this.globalState.circuitBreakerOpen) {
      console.error('[Autopilot] Cannot enable - circuit breaker is open');
      return false;
    }

    this.globalState.globalEnabled = true;
    this.globalState.globalMode = mode;
    this.globalState.lastStateChange = new Date();

    // Sync with autopilot controller
    autopilotController.requestModeTransition({
      fromMode: autopilotController.getMode(),
      toMode: mode,
      requestedBy: changedBy,
      reason,
    });

    // Start loop if enabling
    if (mode !== 'off' && !autonomousLoop.isRunning()) {
      console.log('[Autopilot] Starting autonomous loop');
      autonomousLoop.start();
    }

    this.notifyStateChange();

    console.log(`[Autopilot] Global autopilot enabled: mode=${mode} by ${changedBy}`);
    return true;
  }

  disableGlobal(changedBy: string, reason: string): void {
    this.globalState.globalEnabled = false;
    this.globalState.globalMode = 'off';
    this.globalState.lastStateChange = new Date();

    // Disable all domains
    for (const domain of CONTROLLED_DOMAINS) {
      this.setDomainState(domain, 'off', false, changedBy, reason);
    }

    // Stop loop
    if (autonomousLoop.isRunning()) {
      console.log('[Autopilot] Stopping autonomous loop');
      autonomousLoop.stop();
    }

    // Sync with autopilot controller
    autopilotController.requestModeTransition({
      fromMode: autopilotController.getMode(),
      toMode: 'off',
      requestedBy: changedBy,
      reason,
    });

    this.notifyStateChange();

    console.log(`[Autopilot] Global autopilot disabled by ${changedBy}: ${reason}`);
  }

  // =========================================================================
  // EMERGENCY STOP
  // =========================================================================

  emergencyStop(triggeredBy: string, reason: string): void {
    console.error(`[EMERGENCY] Autopilot emergency stop triggered by ${triggeredBy}: ${reason}`);

    this.globalState.emergencyStop = true;
    this.globalState.globalEnabled = false;
    this.globalState.globalMode = 'off';
    this.globalState.lastStateChange = new Date();
    this.globalState.safetyLocks.push(`emergency:${triggeredBy}:${Date.now()}`);

    // Stop all autonomous behavior immediately
    autonomousLoop.stop();

    // Open circuit breaker
    this.openCircuitBreaker(reason);

    // Disable all domains
    for (const domain of CONTROLLED_DOMAINS) {
      this.globalState.domains[domain] = {
        ...this.globalState.domains[domain],
        mode: 'off',
        enabled: false,
        circuitBreakerOpen: true,
        lastModeChange: new Date(),
        changedBy: 'emergency_stop',
        reason,
      };
    }

    // Sync with system health monitor
    systemHealthMonitor.openCircuitBreaker(reason);

    this.notifyStateChange();
  }

  clearEmergencyStop(clearedBy: string, reason: string): boolean {
    // Requires all safety locks to be cleared
    if (this.globalState.safetyLocks.length > 0) {
      console.warn(
        `[Autopilot] Cannot clear emergency stop - ${this.globalState.safetyLocks.length} safety locks active`
      );
      return false;
    }

    this.globalState.emergencyStop = false;
    this.globalState.lastStateChange = new Date();

    // Close circuit breaker
    this.closeCircuitBreaker();

    console.log(`[Autopilot] Emergency stop cleared by ${clearedBy}: ${reason}`);

    this.notifyStateChange();
    return true;
  }

  // =========================================================================
  // CIRCUIT BREAKER
  // =========================================================================

  openCircuitBreaker(reason: string): void {
    this.globalState.circuitBreakerOpen = true;
    this.globalState.lastStateChange = new Date();

    // Disable all domains
    for (const domain of Object.keys(this.globalState.domains)) {
      this.globalState.domains[domain].circuitBreakerOpen = true;
    }

    console.error(`[Autopilot] Circuit breaker opened: ${reason}`);
    this.notifyStateChange();
  }

  closeCircuitBreaker(): void {
    this.globalState.circuitBreakerOpen = false;
    this.globalState.lastStateChange = new Date();

    for (const domain of Object.keys(this.globalState.domains)) {
      this.globalState.domains[domain].circuitBreakerOpen = false;
    }

    console.log('[Autopilot] Circuit breaker closed');
    this.notifyStateChange();
  }

  // =========================================================================
  // DOMAIN CONTROL
  // =========================================================================

  setDomainState(
    domain: string,
    mode: AutopilotMode,
    enabled: boolean,
    changedBy: string,
    reason?: string
  ): boolean {
    if (!this.globalState.domains[domain]) {
      console.warn(`[Autopilot] Unknown domain: ${domain}`);
      return false;
    }

    // Cannot enable if global is disabled
    if (enabled && !this.globalState.globalEnabled) {
      console.warn('[Autopilot] Cannot enable domain - global autopilot is disabled');
      return false;
    }

    // Cannot exceed global mode
    if (this.modeLevel(mode) > this.modeLevel(this.globalState.globalMode)) {
      console.warn(
        `[Autopilot] Cannot set domain mode ${mode} - exceeds global mode ${this.globalState.globalMode}`
      );
      mode = this.globalState.globalMode;
    }

    this.globalState.domains[domain] = {
      ...this.globalState.domains[domain],
      mode,
      enabled,
      lastModeChange: new Date(),
      changedBy,
      reason,
    };

    this.notifyStateChange();
    return true;
  }

  getDomainState(domain: string): DomainAutopilotState | undefined {
    return this.globalState.domains[domain];
  }

  // =========================================================================
  // GATE CHECK
  // =========================================================================

  checkGate(domain: string): AutopilotGateResult {
    // Check emergency stop
    if (this.globalState.emergencyStop) {
      return {
        allowed: false,
        effectiveMode: 'off',
        blockedBy: 'emergency_stop',
        reason: 'Emergency stop is active',
      };
    }

    // Check circuit breaker
    if (this.globalState.circuitBreakerOpen) {
      return {
        allowed: false,
        effectiveMode: 'off',
        blockedBy: 'circuit_breaker',
        reason: 'Circuit breaker is open',
      };
    }

    // Check global enabled
    if (!this.globalState.globalEnabled) {
      return {
        allowed: false,
        effectiveMode: 'off',
        blockedBy: 'global_disabled',
        reason: 'Global autopilot is disabled',
      };
    }

    // Check domain state
    const domainState = this.globalState.domains[domain];
    if (!domainState) {
      return {
        allowed: false,
        effectiveMode: 'off',
        blockedBy: 'unknown_domain',
        reason: `Unknown domain: ${domain}`,
      };
    }

    if (!domainState.enabled) {
      return {
        allowed: false,
        effectiveMode: 'off',
        blockedBy: 'domain_disabled',
        reason: `${domain} autopilot is disabled`,
      };
    }

    if (domainState.circuitBreakerOpen) {
      return {
        allowed: false,
        effectiveMode: 'off',
        blockedBy: 'domain_circuit_breaker',
        reason: `${domain} circuit breaker is open`,
      };
    }

    // Determine effective mode (minimum of global and domain)
    const effectiveMode = this.minMode(
      this.globalState.globalMode,
      domainState.mode
    );

    return {
      allowed: effectiveMode !== 'off',
      effectiveMode,
    };
  }

  // =========================================================================
  // SAFETY LOCKS
  // =========================================================================

  addSafetyLock(lockId: string, reason: string): void {
    this.globalState.safetyLocks.push(lockId);
    console.log(`[Autopilot] Safety lock added: ${lockId} - ${reason}`);
    this.notifyStateChange();
  }

  removeSafetyLock(lockId: string): boolean {
    const index = this.globalState.safetyLocks.indexOf(lockId);
    if (index >= 0) {
      this.globalState.safetyLocks.splice(index, 1);
      console.log(`[Autopilot] Safety lock removed: ${lockId}`);
      this.notifyStateChange();
      return true;
    }
    return false;
  }

  getSafetyLocks(): string[] {
    return [...this.globalState.safetyLocks];
  }

  // =========================================================================
  // STATE
  // =========================================================================

  getGlobalState(): GlobalAutopilotState {
    return { ...this.globalState };
  }

  isGlobalEnabled(): boolean {
    return this.globalState.globalEnabled;
  }

  isEmergencyStopped(): boolean {
    return this.globalState.emergencyStop;
  }

  isCircuitBreakerOpen(): boolean {
    return this.globalState.circuitBreakerOpen;
  }

  // =========================================================================
  // CALLBACKS
  // =========================================================================

  onStateChange(callback: (state: GlobalAutopilotState) => void): void {
    this.stateChangeCallbacks.push(callback);
  }

  private notifyStateChange(): void {
    for (const callback of this.stateChangeCallbacks) {
      try {
        callback(this.getGlobalState());
      } catch (error) {
        console.error('[Autopilot] State change callback error:', error);
      }
    }
  }

  // =========================================================================
  // HELPERS
  // =========================================================================

  private modeLevel(mode: AutopilotMode): number {
    const levels: Record<AutopilotMode, number> = {
      off: 0,
      supervised: 1,
      full: 2,
    };
    return levels[mode];
  }

  private minMode(mode1: AutopilotMode, mode2: AutopilotMode): AutopilotMode {
    return this.modeLevel(mode1) <= this.modeLevel(mode2) ? mode1 : mode2;
  }
}

// Singleton instance
export const unifiedAutopilotGate = new UnifiedAutopilotGate();
