/**
 * Security Adapters - Cross-System Integration
 *
 * When Security Intelligence raises threat level:
 * - Notify Data Decisions
 * - Pause SEO publishing
 * - Freeze Bulk Ops
 * - Lock high-risk users
 *
 * Provides adapter layer for coordinated system response.
 *
 * Feature flag: ENABLE_SECURITY_AUTHORITY
 */

export { AdapterManager, registerAdapter, unregisterAdapter } from './adapter-manager';
export { DataDecisionsAdapter } from './data-decisions-adapter';
export { SEOAdapter } from './seo-adapter';
export { OpsAdapter } from './ops-adapter';
export { AutonomyAdapter } from './autonomy-adapter';
export { UserSecurityAdapter } from './user-security-adapter';

// Auto-register all adapters on import
import { AdapterManager } from './adapter-manager';
import { DataDecisionsAdapter } from './data-decisions-adapter';
import { SEOAdapter } from './seo-adapter';
import { OpsAdapter } from './ops-adapter';
import { AutonomyAdapter } from './autonomy-adapter';
import { UserSecurityAdapter } from './user-security-adapter';

export function initializeAdapters(): void {
  const enabled = process.env.ENABLE_SECURITY_AUTHORITY === 'true';

  if (!enabled) {
    console.log('[SecurityAdapters] Disabled - ENABLE_SECURITY_AUTHORITY is not true');
    return;
  }

  AdapterManager.register(DataDecisionsAdapter);
  AdapterManager.register(SEOAdapter);
  AdapterManager.register(OpsAdapter);
  AdapterManager.register(AutonomyAdapter);
  AdapterManager.register(UserSecurityAdapter);

  console.log('[SecurityAdapters] All adapters registered');
}

console.log('[SecurityAdapters] Module loaded');
