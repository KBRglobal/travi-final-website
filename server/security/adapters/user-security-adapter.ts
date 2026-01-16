/**
 * User Security Adapter
 *
 * Integrates Security with User Management:
 * - Locks high-risk users on threat escalation
 * - Blocks user registration in lockdown
 * - Enforces session controls
 */

import { SystemAdapter, AdapterStatus, SecurityModeConfig, ThreatState, ThreatSource } from '../authority/types';
import { SecuritySeverity, logSecurityEvent, SecurityEventType } from '../audit-logger';

// Track state
let registrationBlocked = false;
let newSessionsBlocked = false;
let lastHeartbeat = new Date();

// Locked users
const lockedUsers = new Map<string, { reason: string; lockedAt: Date; lockedBy: string }>();

// Suspicious users (flagged but not locked)
const suspiciousUsers = new Map<string, { reasons: string[]; flaggedAt: Date }>();

// Session restrictions
interface SessionRestrictions {
  maxConcurrentSessions: number;
  sessionTimeoutMinutes: number;
  requireReauth: boolean;
}

let sessionRestrictions: SessionRestrictions = {
  maxConcurrentSessions: 5,
  sessionTimeoutMinutes: 60,
  requireReauth: false,
};

export const UserSecurityAdapter: SystemAdapter = {
  name: 'user-security',
  enabled: true,

  async onThreatEscalation(threat: ThreatState): Promise<void> {
    console.log(`[UserSecurityAdapter] Threat escalation: ${threat.level}`);

    switch (threat.level) {
      case 'critical':
        // Block new registrations and sessions
        registrationBlocked = true;
        newSessionsBlocked = true;

        // Strict session limits
        sessionRestrictions = {
          maxConcurrentSessions: 1,
          sessionTimeoutMinutes: 15,
          requireReauth: true,
        };

        // Lock users associated with threat sources
        await lockThreatActors(threat.sources);

        console.log('[UserSecurityAdapter] CRITICAL: Registration blocked, sessions restricted');
        break;

      case 'high':
        // Block new registrations
        registrationBlocked = true;

        // Moderate session limits
        sessionRestrictions = {
          maxConcurrentSessions: 2,
          sessionTimeoutMinutes: 30,
          requireReauth: false,
        };

        // Lock users associated with threat sources
        await lockThreatActors(threat.sources);

        console.log('[UserSecurityAdapter] HIGH: Registration blocked, sessions limited');
        break;

      case 'elevated':
        // Flag suspicious users
        await flagSuspiciousActors(threat.sources);

        // Slight session restrictions
        sessionRestrictions = {
          maxConcurrentSessions: 3,
          sessionTimeoutMinutes: 45,
          requireReauth: false,
        };

        console.log('[UserSecurityAdapter] ELEVATED: Monitoring suspicious users');
        break;

      case 'normal':
        registrationBlocked = false;
        newSessionsBlocked = false;

        // Normal session limits
        sessionRestrictions = {
          maxConcurrentSessions: 5,
          sessionTimeoutMinutes: 60,
          requireReauth: false,
        };

        // Clear suspicious flags (but not locks)
        suspiciousUsers.clear();

        console.log('[UserSecurityAdapter] NORMAL: User operations resumed');
        break;
    }

    lastHeartbeat = new Date();
  },

  async onModeChange(config: SecurityModeConfig): Promise<void> {
    console.log(`[UserSecurityAdapter] Mode change: ${config.mode}`);

    const { restrictions } = config;

    if (!restrictions.userRegistrationAllowed) {
      registrationBlocked = true;
      console.log('[UserSecurityAdapter] Registration BLOCKED');
    } else {
      registrationBlocked = false;
    }

    // In lockdown, require reauth and block new sessions
    if (config.mode === 'lockdown') {
      newSessionsBlocked = true;
      sessionRestrictions.requireReauth = true;
      console.log('[UserSecurityAdapter] LOCKDOWN: New sessions blocked, reauth required');
    } else {
      newSessionsBlocked = false;
      sessionRestrictions.requireReauth = false;
    }

    lastHeartbeat = new Date();
  },

  async onEmergencyStop(): Promise<void> {
    console.log('[UserSecurityAdapter] EMERGENCY STOP');

    registrationBlocked = true;
    newSessionsBlocked = true;
    sessionRestrictions = {
      maxConcurrentSessions: 1,
      sessionTimeoutMinutes: 5,
      requireReauth: true,
    };

    // Would invalidate all sessions except admin sessions
    console.log('[UserSecurityAdapter] Emergency user restrictions ACTIVATED');

    lastHeartbeat = new Date();
  },

  async getStatus(): Promise<AdapterStatus> {
    return {
      name: 'user-security',
      connected: true,
      lastHeartbeat,
      pendingActions: lockedUsers.size + suspiciousUsers.size,
      blocked: registrationBlocked || newSessionsBlocked,
    };
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function lockThreatActors(sources: ThreatSource[]): Promise<void> {
  for (const source of sources) {
    if (source.type === 'user' && source.identifier) {
      await lockUser(source.identifier, `Threat actor: ${source.description}`, 'security-system');
    }
  }
}

async function flagSuspiciousActors(sources: ThreatSource[]): Promise<void> {
  for (const source of sources) {
    if (source.type === 'user' && source.identifier) {
      flagUser(source.identifier, `Suspicious activity: ${source.description}`);
    }
  }
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

export async function lockUser(userId: string, reason: string, lockedBy: string): Promise<void> {
  lockedUsers.set(userId, {
    reason,
    lockedAt: new Date(),
    lockedBy,
  });

  await logSecurityEvent({
    type: SecurityEventType.ACCOUNT_LOCKED,
    severity: SecuritySeverity.HIGH,
    userId,
    ipAddress: 'system',
    resource: 'user',
    action: 'lock_user',
    details: { reason, lockedBy },
    success: true,
  });

  console.log(`[UserSecurityAdapter] User locked: ${userId}`);
}

export async function unlockUser(userId: string, unlockedBy: string): Promise<boolean> {
  const wasLocked = lockedUsers.delete(userId);

  if (wasLocked) {
    await logSecurityEvent({
      type: SecurityEventType.ACCOUNT_UNLOCKED,
      severity: SecuritySeverity.MEDIUM,
      userId,
      ipAddress: 'system',
      resource: 'user',
      action: 'unlock_user',
      details: { unlockedBy },
      success: true,
    });

    console.log(`[UserSecurityAdapter] User unlocked: ${userId}`);
  }

  return wasLocked;
}

export function isUserLocked(userId: string): { locked: boolean; reason?: string } {
  const lock = lockedUsers.get(userId);
  if (lock) {
    return { locked: true, reason: lock.reason };
  }
  return { locked: false };
}

export function flagUser(userId: string, reason: string): void {
  const existing = suspiciousUsers.get(userId);
  if (existing) {
    existing.reasons.push(reason);
  } else {
    suspiciousUsers.set(userId, {
      reasons: [reason],
      flaggedAt: new Date(),
    });
  }
}

export function isUserSuspicious(userId: string): { suspicious: boolean; reasons?: string[] } {
  const flag = suspiciousUsers.get(userId);
  if (flag) {
    return { suspicious: true, reasons: flag.reasons };
  }
  return { suspicious: false };
}

export function isRegistrationAllowed(): boolean {
  return !registrationBlocked;
}

export function isNewSessionAllowed(): boolean {
  return !newSessionsBlocked;
}

export function getSessionRestrictions(): SessionRestrictions {
  return { ...sessionRestrictions };
}

export function getLockedUsers(): Array<{ userId: string; reason: string; lockedAt: Date }> {
  return Array.from(lockedUsers.entries()).map(([userId, data]) => ({
    userId,
    reason: data.reason,
    lockedAt: data.lockedAt,
  }));
}

export function getUserSecurityStatus(): {
  registrationBlocked: boolean;
  newSessionsBlocked: boolean;
  sessionRestrictions: SessionRestrictions;
  lockedUserCount: number;
  suspiciousUserCount: number;
} {
  return {
    registrationBlocked,
    newSessionsBlocked,
    sessionRestrictions: { ...sessionRestrictions },
    lockedUserCount: lockedUsers.size,
    suspiciousUserCount: suspiciousUsers.size,
  };
}

console.log('[UserSecurityAdapter] Loaded');
