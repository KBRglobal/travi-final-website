/**
 * System State Snapshot & Forensics
 *
 * FEATURE 5: Be able to answer "what exactly was the system state at time X"
 *
 * Snapshot includes:
 * - Feature flags
 * - Job queue state
 * - AI provider states
 * - Active incidents
 * - Memory/CPU summary
 *
 * Triggered:
 * - Manually via API
 * - Automatically on critical incidents
 *
 * Feature flag: ENABLE_SYSTEM_SNAPSHOTS
 */

export * from './types';
export * from './snapshot-manager';

import { getSnapshotManager } from './snapshot-manager';
import type { SnapshotTrigger } from './types';

/**
 * Capture a system snapshot
 */
export async function captureSnapshot(
  trigger: SnapshotTrigger = 'manual',
  triggeredBy?: string,
  metadata?: Record<string, unknown>
) {
  return getSnapshotManager().captureSnapshot(trigger, triggeredBy, metadata);
}
