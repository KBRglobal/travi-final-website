/**
 * Octopus v2 - Image Orchestrator
 * 
 * SINGLE MANDATORY IMAGE FLOW FOR OCTOPUS
 * 
 * NO IMAGE may appear on a page unless it has a corresponding image_usage record.
 * There is no bypass. There is no legacy shortcut. There is no direct attachment.
 * 
 * Flow:
 * 1. Call Image Engine (acquire image)
 * 2. Register usage in image_usage table
 * 3. Run deterministic placement engine
 * 4. Return final decision + asset
 */

import { log } from '../lib/logger';
import {
  createImageUsage,
  getImageUsageByAsset,
  getImageUsageByEntity,
  updateImageUsage,
  type ImageRole,
  type ImageUsageDecision,
} from './image-usage-persistence';
import {
  evaluatePlacementDecision,
  type ImageUsageDraft,
  type PlacementDecisionResult,
} from './image-placement-engine';
import {
  getEntityPreset,
  isRoleAllowed,
  getMaxImagesForRole,
  hasExceededReuseLimit,
  type EntityType,
} from './image-entity-presets';
import { fetchIntelligenceSnapshot } from './intelligence-client';

/**
 * CONCURRENCY LOCK - Ensures exactly one approval per entity+role
 * 
 * This is an in-memory lock that serializes requests for the same entity+role combo.
 * Under concurrency, only the first request creates a new usage; others reuse it.
 */
const entityRoleLocks = new Map<string, Promise<void>>();
const entityRoleLockResolvers = new Map<string, () => void>();

function getEntityRoleLockKey(entityId: string, role: string): string {
  return `${entityId}:${role}`;
}

async function acquireEntityRoleLock(entityId: string, role: string): Promise<() => void> {
  const key = getEntityRoleLockKey(entityId, role);
  
  // Wait for any existing lock to release
  while (entityRoleLocks.has(key)) {
    await entityRoleLocks.get(key);
  }
  
  // Create new lock
  let resolve: () => void = () => {};
  const promise = new Promise<void>(r => {
    resolve = r;
  });
  entityRoleLocks.set(key, promise);
  entityRoleLockResolvers.set(key, resolve);
  
  // Return release function
  return () => {
    entityRoleLocks.delete(key);
    entityRoleLockResolvers.delete(key);
    resolve();
  };
}

const logger = {
  info: (msg: string, data?: Record<string, unknown>) => 
    log.info(`[ImageOrchestrator] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) => 
    log.error(`[ImageOrchestrator] ${msg}`, undefined, data),
  audit: (msg: string, data?: Record<string, unknown>) => 
    log.info(`[ImageOrchestrator][AUDIT] ${msg}`, data),
};

/**
 * Image request from Octopus
 */
export interface OctopusImageRequest {
  entityType: EntityType;
  entityId: string;
  entityName: string;
  destination?: string;
  imageRole: ImageRole;
  placementContext: string;
  sourcePreference?: 'generate' | 'stock' | 'user_upload' | 'any';
}

/**
 * Image Engine response (simulated - Image Engine is separate service)
 */
export interface ImageEngineAsset {
  assetId: string;
  url: string;
  width: number;
  height: number;
  format: string;
  source: 'generated' | 'stock' | 'user_upload';
  metadata?: Record<string, unknown>;
}

/**
 * Final result from orchestration
 */
export interface OctopusImageResult {
  success: boolean;
  asset?: ImageEngineAsset;
  usageId: string;
  decision: ImageUsageDecision;
  decisionReason: string;
  ruleId?: string;
  isReuse: boolean;
  auditLog: AuditLogEntry;
}

/**
 * Audit log entry for every image operation
 */
export interface AuditLogEntry {
  timestamp: string;
  assetId: string;
  entityId: string;
  entityType: string;
  role: string;
  action: 'acquire' | 'reuse' | 'reject' | 'pending';
  decision: ImageUsageDecision;
  reason: string;
  ruleId?: string;
}

/**
 * Global guard for image usage enforcement
 */
export class ImageUsageGuard {
  private static instance: ImageUsageGuard;
  private enabled = true;

  static getInstance(): ImageUsageGuard {
    if (!ImageUsageGuard.instance) {
      ImageUsageGuard.instance = new ImageUsageGuard();
    }
    return ImageUsageGuard.instance;
  }

  /**
   * Enforce that an image has a valid usage record before rendering
   */
  async enforceUsage(assetId: string, context: string): Promise<void> {
    if (!this.enabled) return;

    const usages = await getImageUsageByAsset(assetId);
    if (!usages || usages.length === 0) {
      const error = `[SEO PROTECTION] Image ${assetId} has no usage record - cannot render. Context: ${context}`;
      logger.error(error, { assetId, context });
      throw new ImageUsageViolationError(error);
    }

    const approvedUsage = usages.find(u => u.decision === 'approved' || u.decision === 'reuse');
    if (!approvedUsage) {
      const error = `[SEO PROTECTION] Image ${assetId} has no approved usage - cannot render. Context: ${context}`;
      logger.error(error, { assetId, context, usages: usages.length });
      throw new ImageUsageViolationError(error);
    }
  }

  /**
   * Disable guard (for testing only)
   */
  disable(): void {
    this.enabled = false;
    logger.info('ImageUsageGuard disabled (testing mode)');
  }

  /**
   * Enable guard
   */
  enable(): void {
    this.enabled = true;
    logger.info('ImageUsageGuard enabled');
  }
}

/**
 * Error thrown when image usage is violated
 */
export class ImageUsageViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageUsageViolationError';
  }
}

/**
 * MAIN ORCHESTRATOR FUNCTION
 * 
 * This is the ONLY valid pipeline for Octopus image operations.
 * 
 * Steps:
 * 1. Validate request against entity presets
 * 2. Call Image Engine (or find reusable asset)
 * 3. Register usage in image_usage table
 * 4. Run placement engine
 * 5. Return final decision + asset
 * 
 * @param request - Image request from Octopus
 * @param imageEngineCallback - Callback to fetch image from Image Engine
 */
export async function octopusAcquireImageAndPlace(
  request: OctopusImageRequest,
  imageEngineCallback?: () => Promise<ImageEngineAsset | null>
): Promise<OctopusImageResult> {
  const startTime = Date.now();
  
  logger.info('Starting image acquisition', {
    entityType: request.entityType,
    entityId: request.entityId,
    role: request.imageRole,
  });

  // STEP 1: Validate against entity presets
  const preset = getEntityPreset(request.entityType);
  if (!preset) {
    logger.error('Unknown entity type', { entityType: request.entityType });
  }

  if (!isRoleAllowed(request.entityType, request.imageRole)) {
    const auditLog = createAuditLog({
      assetId: 'N/A',
      entityId: request.entityId,
      entityType: request.entityType,
      role: request.imageRole,
      action: 'reject',
      decision: 'rejected',
      reason: `Role ${request.imageRole} not allowed for ${request.entityType}`,
    });
    
    logger.audit('Role not allowed for entity type', auditLog as unknown as Record<string, unknown>);
    
    return {
      success: false,
      usageId: '',
      decision: 'rejected',
      decisionReason: `Role ${request.imageRole} not allowed for ${request.entityType}`,
      isReuse: false,
      auditLog,
    };
  }

  // CONCURRENCY LOCK: Acquire lock for this entity+role combination
  // This ensures exactly one new usage is created under concurrent requests
  const releaseLock = await acquireEntityRoleLock(request.entityId, request.imageRole);
  
  try {
    // STEP 2: Check for existing usages for this entity+role (AFTER acquiring lock)
    const entityUsages = await getImageUsageByEntity(request.entityType, request.entityId);
    const reusableUsage = entityUsages?.find(
      u => (u.decision === 'approved' || u.decision === 'reuse') && u.requestedRole === request.imageRole
    );

    let asset: ImageEngineAsset | null = null;
    let isReuse = false;

    if (reusableUsage && !hasExceededReuseLimit(request.entityType, entityUsages.length)) {
      // Reuse existing asset - mark isReuse=true
      isReuse = true;
      asset = {
        assetId: reusableUsage.assetId,
        url: '',
        width: 0,
        height: 0,
        format: '',
        source: 'stock',
      };
      logger.info('Reusing existing asset', { assetId: asset.assetId, usageId: reusableUsage.id });
      
      // Return immediately with reuse result - no new usage created
      const auditLog = createAuditLog({
        assetId: asset.assetId,
        entityId: request.entityId,
        entityType: request.entityType,
        role: request.imageRole,
        action: 'reuse',
        decision: 'reuse',
        reason: `Reusing existing approved usage: ${reusableUsage.id}`,
      });
      
      logger.audit('Reusing existing usage', auditLog as unknown as Record<string, unknown>);
      
      return {
        success: true,
        asset,
        usageId: reusableUsage.id,
        decision: 'reuse',
        decisionReason: `Reusing existing approved usage: ${reusableUsage.id}`,
        isReuse: true,
        auditLog,
      };
    } else if (imageEngineCallback) {
      // Call Image Engine for new asset
      try {
        asset = await imageEngineCallback();
      } catch (err) {
        logger.error('Image Engine call failed', { error: String(err) });
      }
    }

    if (!asset) {
      const auditLog = createAuditLog({
        assetId: 'N/A',
        entityId: request.entityId,
        entityType: request.entityType,
        role: request.imageRole,
        action: 'reject',
        decision: 'rejected',
        reason: 'No asset available from Image Engine',
      });
      
      logger.audit('No asset available', auditLog as unknown as Record<string, unknown>);
      
      return {
        success: false,
        usageId: '',
        decision: 'rejected',
        decisionReason: 'No asset available from Image Engine',
        isReuse: false,
        auditLog,
      };
    }

    // STEP 3: Register usage (MANDATORY) - Only happens for NEW usages
    const usage = await createImageUsage({
      assetId: asset.assetId,
      entityId: request.entityId,
      entityType: request.entityType,
      requestedRole: request.imageRole as ImageRole,
      decision: 'pending',
      decisionReason: 'Awaiting placement decision',
    });

    logger.info('Usage registered', { 
      usageId: usage.id, 
      assetId: asset.assetId,
      isReuse,
    });

    // STEP 4: Run placement engine (MANDATORY)
    const draft: ImageUsageDraft = {
      assetId: asset.assetId,
      entityId: request.entityId,
      entityType: request.entityType,
      requestedRole: request.imageRole,
      existingUsages: entityUsages?.length || 0,
    };

    // Optionally fetch intelligence for hero images
    let intelligenceSnapshot = null;
    if (request.imageRole === 'hero' && preset?.requireIntelligenceForHero) {
      try {
        intelligenceSnapshot = await fetchIntelligenceSnapshot(
          asset.assetId,
          request.entityId,
          request.entityType,
          request.imageRole,
          request.placementContext,
          request.entityName
        );
      } catch (err) {
        logger.info('Intelligence fetch failed, proceeding without', { error: String(err) });
      }
    }

    const placementResult = evaluatePlacementDecision(draft, intelligenceSnapshot);

    // FIRST USAGE OVERRIDE: If this is the first usage for this entity+role
    // and placement returns 'reuse', override to 'approved'
    // This ensures exactly ONE 'approved' decision before any reuses
    let finalDecision = placementResult.decision as ImageUsageDecision;
    let finalReason = placementResult.decisionReason;
    
    if ((entityUsages?.length || 0) === 0 && placementResult.decision === 'reuse') {
      finalDecision = 'approved';
      finalReason = 'First usage for entity+role - approved for placement';
      logger.info('Overriding reuse to approved for first usage', {
        entityId: request.entityId,
        role: request.imageRole,
      });
    }

    // STEP 5: Update usage with placement decision
    await updateImageUsage(usage.id, {
      decision: finalDecision,
      decisionReason: finalReason,
      decisionRuleId: placementResult.decisionRuleId,
      finalRole: placementResult.finalRole as ImageRole,
      intelligenceSnapshot: intelligenceSnapshot || undefined,
      reusedFromId: isReuse ? reusableUsage?.id : undefined,
    });

    // Create audit log
    const action = isReuse ? 'reuse' : (finalDecision === 'approved' ? 'acquire' : finalDecision as 'reject' | 'pending');
    const auditLog = createAuditLog({
      assetId: asset.assetId,
      entityId: request.entityId,
      entityType: request.entityType,
      role: request.imageRole,
      action,
      decision: finalDecision,
      reason: finalReason,
      ruleId: placementResult.decisionRuleId,
    });

    logger.audit('Image operation complete', {
      ...auditLog,
      duration: Date.now() - startTime,
    });

    return {
      success: finalDecision === 'approved' || finalDecision === 'reuse',
      asset: finalDecision === 'approved' || finalDecision === 'reuse' ? asset : undefined,
      usageId: usage.id,
      decision: finalDecision,
      decisionReason: finalReason,
      ruleId: placementResult.decisionRuleId,
      isReuse,
      auditLog,
    };
  } finally {
    // Always release the lock
    releaseLock();
  }
}

/**
 * Batch acquire multiple images
 */
export async function octopusBatchAcquireImages(
  requests: OctopusImageRequest[],
  imageEngineCallback?: (req: OctopusImageRequest) => Promise<ImageEngineAsset | null>
): Promise<OctopusImageResult[]> {
  const results: OctopusImageResult[] = [];
  
  for (const request of requests) {
    const result = await octopusAcquireImageAndPlace(
      request,
      imageEngineCallback ? () => imageEngineCallback(request) : undefined
    );
    results.push(result);
  }
  
  return results;
}

/**
 * Check if an image can be rendered (has approved usage)
 */
export async function canRenderImage(assetId: string): Promise<boolean> {
  const usages = await getImageUsageByAsset(assetId);
  if (!usages || usages.length === 0) return false;
  return usages.some(u => u.decision === 'approved' || u.decision === 'reuse');
}

/**
 * Get rendering decision for an image
 */
export async function getImageRenderingDecision(assetId: string): Promise<{
  canRender: boolean;
  decision: ImageUsageDecision | null;
  reason: string;
}> {
  const usages = await getImageUsageByAsset(assetId);
  
  if (!usages || usages.length === 0) {
    return {
      canRender: false,
      decision: null,
      reason: 'No usage record exists for this image',
    };
  }

  const approved = usages.find(u => u.decision === 'approved' || u.decision === 'reuse');
  if (approved) {
    return {
      canRender: true,
      decision: approved.decision as ImageUsageDecision,
      reason: approved.decisionReason || 'Approved for rendering',
    };
  }

  const pending = usages.find(u => u.decision === 'pending');
  if (pending) {
    return {
      canRender: false,
      decision: 'pending',
      reason: 'Image is pending placement decision',
    };
  }

  return {
    canRender: false,
    decision: 'rejected',
    reason: 'Image was rejected for placement',
  };
}

/**
 * Create audit log entry
 */
function createAuditLog(params: Omit<AuditLogEntry, 'timestamp'>): AuditLogEntry {
  return {
    timestamp: new Date().toISOString(),
    ...params,
  };
}

/**
 * Get the singleton guard instance
 */
export const imageUsageGuard = ImageUsageGuard.getInstance();
