/**
 * Security Authority Module
 *
 * THE HIGHEST AUTHORITY IN THE PLATFORM
 * Above Data, SEO, Ops, and Autonomy systems.
 *
 * All critical actions must pass through SecurityGate.
 * If denied, execution MUST stop immediately.
 *
 * Feature flag: ENABLE_SECURITY_AUTHORITY
 */

// Core types
export * from "./types";

// Security Gate - Global enforcement hook
export { SecurityGate, SecurityGateError, requireSecurityGate } from "./security-gate";

// Security Modes - lockdown/enforce/monitor
export { SecurityModeManager, getAutonomyImpact } from "./security-modes";
export type { AutonomyImpact } from "./security-modes";

// Override Registry - Centralized override protocol
export { OverrideRegistry } from "./override-registry";

// Evidence Generator - Compliance bundles
export { EvidenceGenerator } from "./evidence-generator";

// ============================================================================
// INITIALIZATION
// ============================================================================

import { SecurityGate } from "./security-gate";
import { SecurityModeManager } from "./security-modes";
import { DEFAULT_SECURITY_AUTHORITY_CONFIG } from "./types";

export function initSecurityAuthority(): void {
  const enabled = DEFAULT_SECURITY_AUTHORITY_CONFIG.enabled;

  if (!enabled) {
    return;
  }
}

// ============================================================================
// EMERGENCY CONTROLS
// ============================================================================

/**
 * Emergency lockdown - activate immediately
 */
export async function emergencyLockdown(reason: string, activatedBy: string): Promise<void> {
  await SecurityModeManager.activateLockdown(reason, activatedBy, 60);
}

/**
 * Emergency stop - halt all systems
 */
export async function emergencyStop(reason: string, activatedBy: string): Promise<void> {
  // Set lockdown mode
  await SecurityModeManager.activateLockdown(`EMERGENCY STOP: ${reason}`, activatedBy, 120);

  // Escalate to critical threat
  await SecurityGate.escalateThreat(
    "critical",
    [
      {
        type: "emergency",
        identifier: "manual",
        description: reason,
        detectedAt: new Date(),
        severity: "critical" as any,
      },
    ],
    reason
  );
}
