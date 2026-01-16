/**
 * Media Intelligence v2 - Remediation Workflows
 *
 * Safe, non-destructive remediation with dry-run support
 */

import {
  isDestructiveOpsEnabled,
  RemediationActionRequest,
  RemediationActionResult,
  RemediationRecommendation,
} from './types-v2';
import {
  getAsset,
  applyAltSuggestion,
  getAltSuggestion,
  scoreAsset,
} from './asset-manager';
import { generateAltText } from './alt-generator';

// Confirm tokens for destructive operations (short-lived)
const confirmTokens = new Map<string, { assetId: string; action: string; expiresAt: number }>();

/**
 * Generate a confirm token for destructive operations
 */
export function generateConfirmToken(assetId: string, action: string): string {
  const token = `confirm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  confirmTokens.set(token, {
    assetId,
    action,
    expiresAt: Date.now() + 300000, // 5 minute expiry
  });

  // Cleanup old tokens
  for (const [key, value] of confirmTokens.entries()) {
    if (value.expiresAt < Date.now()) {
      confirmTokens.delete(key);
    }
  }

  return token;
}

/**
 * Validate confirm token
 */
function validateConfirmToken(token: string, assetId: string, action: string): boolean {
  const data = confirmTokens.get(token);
  if (!data) return false;
  if (data.expiresAt < Date.now()) {
    confirmTokens.delete(token);
    return false;
  }
  if (data.assetId !== assetId || data.action !== action) return false;

  // Consume token
  confirmTokens.delete(token);
  return true;
}

/**
 * Execute a remediation action
 */
export async function executeRemediation(
  request: RemediationActionRequest
): Promise<RemediationActionResult> {
  const asset = getAsset(request.assetId);
  if (!asset) {
    return {
      assetId: request.assetId,
      action: request.action,
      success: false,
      dryRun: request.dryRun,
      message: 'Asset not found',
    };
  }

  // Destructive operations check
  const destructiveActions = ['delete_orphan'];
  if (destructiveActions.includes(request.action)) {
    if (!isDestructiveOpsEnabled()) {
      return {
        assetId: request.assetId,
        action: request.action,
        success: false,
        dryRun: request.dryRun,
        message: 'Destructive operations are disabled. Set ENABLE_MEDIA_DESTRUCTIVE_OPS=true to enable.',
      };
    }

    if (!request.dryRun && !request.confirmToken) {
      const token = generateConfirmToken(request.assetId, request.action);
      return {
        assetId: request.assetId,
        action: request.action,
        success: false,
        dryRun: false,
        message: `Destructive action requires confirmation. Use token: ${token}`,
        changes: { confirmToken: token },
      };
    }

    if (!request.dryRun && request.confirmToken) {
      if (!validateConfirmToken(request.confirmToken, request.assetId, request.action)) {
        return {
          assetId: request.assetId,
          action: request.action,
          success: false,
          dryRun: false,
          message: 'Invalid or expired confirm token',
        };
      }
    }
  }

  // Execute action based on type
  switch (request.action) {
    case 'generate_alt':
      return executeGenerateAlt(request);

    case 'compress':
      return executeCompress(request);

    case 'convert_format':
      return executeConvertFormat(request);

    case 'resize':
      return executeResize(request);

    case 'add_dimensions':
      return executeAddDimensions(request);

    case 'replace_hero':
      return executeReplaceHero(request);

    case 'delete_orphan':
      return executeDeleteOrphan(request);

    default:
      return {
        assetId: request.assetId,
        action: request.action,
        success: false,
        dryRun: request.dryRun,
        message: `Unknown action: ${request.action}`,
      };
  }
}

/**
 * Generate alt text action
 */
async function executeGenerateAlt(
  request: RemediationActionRequest
): Promise<RemediationActionResult> {
  const asset = getAsset(request.assetId);
  if (!asset) {
    return {
      assetId: request.assetId,
      action: request.action,
      success: false,
      dryRun: request.dryRun,
      message: 'Asset not found',
    };
  }

  // Check for existing suggestion
  let suggestion = getAltSuggestion(request.assetId);

  if (!suggestion || suggestion.suggestions.length === 0) {
    // Generate new suggestions
    const result = await generateAltText(request.assetId, { useAI: true });
    if (result.suggestions.length === 0) {
      return {
        assetId: request.assetId,
        action: request.action,
        success: false,
        dryRun: request.dryRun,
        message: 'Could not generate alt text suggestions',
      };
    }
    suggestion = getAltSuggestion(request.assetId);
  }

  if (!suggestion || suggestion.suggestions.length === 0) {
    return {
      assetId: request.assetId,
      action: request.action,
      success: false,
      dryRun: request.dryRun,
      message: 'No alt text suggestions available',
    };
  }

  const bestSuggestion = suggestion.suggestions[0];

  if (request.dryRun) {
    return {
      assetId: request.assetId,
      action: request.action,
      success: true,
      dryRun: true,
      message: `Would apply alt text: "${bestSuggestion.text}" (confidence: ${bestSuggestion.confidence})`,
      changes: {
        newAltText: bestSuggestion.text,
        confidence: bestSuggestion.confidence,
        source: bestSuggestion.source,
      },
    };
  }

  // Apply the suggestion
  const applied = applyAltSuggestion(request.assetId, bestSuggestion.text);

  return {
    assetId: request.assetId,
    action: request.action,
    success: applied,
    dryRun: false,
    message: applied
      ? `Applied alt text: "${bestSuggestion.text}"`
      : 'Failed to apply alt text',
    changes: applied ? { newAltText: bestSuggestion.text } : undefined,
  };
}

/**
 * Compress action (placeholder - would call image processing service)
 */
async function executeCompress(
  request: RemediationActionRequest
): Promise<RemediationActionResult> {
  const asset = getAsset(request.assetId);
  if (!asset) {
    return {
      assetId: request.assetId,
      action: request.action,
      success: false,
      dryRun: request.dryRun,
      message: 'Asset not found',
    };
  }

  const estimatedNewSize = Math.round(asset.classifier.fileSize * 0.6);
  const savings = asset.classifier.fileSize - estimatedNewSize;

  if (request.dryRun) {
    return {
      assetId: request.assetId,
      action: request.action,
      success: true,
      dryRun: true,
      message: `Would compress from ${Math.round(asset.classifier.fileSize / 1024)}KB to ~${Math.round(estimatedNewSize / 1024)}KB (save ${Math.round(savings / 1024)}KB)`,
      changes: {
        currentSize: asset.classifier.fileSize,
        estimatedNewSize,
        estimatedSavings: savings,
      },
    };
  }

  // In production, this would call an image processing service
  return {
    assetId: request.assetId,
    action: request.action,
    success: false,
    dryRun: false,
    message: 'Compression requires image processing service integration (not implemented)',
  };
}

/**
 * Convert format action (placeholder)
 */
async function executeConvertFormat(
  request: RemediationActionRequest
): Promise<RemediationActionResult> {
  const asset = getAsset(request.assetId);
  if (!asset) {
    return {
      assetId: request.assetId,
      action: request.action,
      success: false,
      dryRun: request.dryRun,
      message: 'Asset not found',
    };
  }

  if (request.dryRun) {
    return {
      assetId: request.assetId,
      action: request.action,
      success: true,
      dryRun: true,
      message: `Would convert from ${asset.classifier.format} to WebP`,
      changes: {
        currentFormat: asset.classifier.format,
        targetFormat: 'webp',
      },
    };
  }

  return {
    assetId: request.assetId,
    action: request.action,
    success: false,
    dryRun: false,
    message: 'Format conversion requires image processing service integration (not implemented)',
  };
}

/**
 * Resize action (placeholder)
 */
async function executeResize(
  request: RemediationActionRequest
): Promise<RemediationActionResult> {
  const asset = getAsset(request.assetId);
  if (!asset) {
    return {
      assetId: request.assetId,
      action: request.action,
      success: false,
      dryRun: request.dryRun,
      message: 'Asset not found',
    };
  }

  const targetWidth = Math.min(asset.classifier.width, 1920);
  const targetHeight = Math.round((targetWidth / asset.classifier.width) * asset.classifier.height);

  if (request.dryRun) {
    return {
      assetId: request.assetId,
      action: request.action,
      success: true,
      dryRun: true,
      message: `Would resize from ${asset.classifier.width}x${asset.classifier.height} to ${targetWidth}x${targetHeight}`,
      changes: {
        currentDimensions: { width: asset.classifier.width, height: asset.classifier.height },
        targetDimensions: { width: targetWidth, height: targetHeight },
      },
    };
  }

  return {
    assetId: request.assetId,
    action: request.action,
    success: false,
    dryRun: false,
    message: 'Resize requires image processing service integration (not implemented)',
  };
}

/**
 * Add dimensions action
 */
async function executeAddDimensions(
  request: RemediationActionRequest
): Promise<RemediationActionResult> {
  const asset = getAsset(request.assetId);
  if (!asset) {
    return {
      assetId: request.assetId,
      action: request.action,
      success: false,
      dryRun: request.dryRun,
      message: 'Asset not found',
    };
  }

  if (asset.classifier.width > 0 && asset.classifier.height > 0) {
    return {
      assetId: request.assetId,
      action: request.action,
      success: true,
      dryRun: request.dryRun,
      message: 'Dimensions already present',
      changes: {
        width: asset.classifier.width,
        height: asset.classifier.height,
      },
    };
  }

  if (request.dryRun) {
    return {
      assetId: request.assetId,
      action: request.action,
      success: true,
      dryRun: true,
      message: 'Would analyze image to extract dimensions',
    };
  }

  // In production, this would fetch and analyze the image
  return {
    assetId: request.assetId,
    action: request.action,
    success: false,
    dryRun: false,
    message: 'Dimension extraction requires image analysis service (not implemented)',
  };
}

/**
 * Replace hero action (placeholder - requires user intervention)
 */
async function executeReplaceHero(
  request: RemediationActionRequest
): Promise<RemediationActionResult> {
  const score = scoreAsset(request.assetId);

  if (request.dryRun) {
    return {
      assetId: request.assetId,
      action: request.action,
      success: true,
      dryRun: true,
      message: 'Hero replacement requires manual selection of replacement image',
      changes: {
        currentScore: score?.score,
        issueCount: score?.issues.length,
      },
    };
  }

  return {
    assetId: request.assetId,
    action: request.action,
    success: false,
    dryRun: false,
    message: 'Hero replacement requires manual intervention - cannot be automated',
  };
}

/**
 * Delete orphan action (destructive)
 */
async function executeDeleteOrphan(
  request: RemediationActionRequest
): Promise<RemediationActionResult> {
  const asset = getAsset(request.assetId);
  if (!asset) {
    return {
      assetId: request.assetId,
      action: request.action,
      success: false,
      dryRun: request.dryRun,
      message: 'Asset not found',
    };
  }

  if (!asset.classifier.isOrphan) {
    return {
      assetId: request.assetId,
      action: request.action,
      success: false,
      dryRun: request.dryRun,
      message: 'Asset is not orphaned - it has content references',
    };
  }

  if (request.dryRun) {
    return {
      assetId: request.assetId,
      action: request.action,
      success: true,
      dryRun: true,
      message: `Would delete orphaned asset "${asset.filename}" (${Math.round(asset.classifier.fileSize / 1024)}KB)`,
      changes: {
        filename: asset.filename,
        fileSize: asset.classifier.fileSize,
        createdAt: asset.createdAt,
      },
    };
  }

  // In production, this would delete from storage
  return {
    assetId: request.assetId,
    action: request.action,
    success: false,
    dryRun: false,
    message: 'Orphan deletion requires storage service integration (not implemented)',
  };
}

/**
 * Get pending remediation recommendations for an asset
 */
export function getRemediationPlan(
  assetId: string
): { recommendations: RemediationRecommendation[]; totalImpact: number } {
  const score = scoreAsset(assetId);
  if (!score) {
    return { recommendations: [], totalImpact: 0 };
  }

  const totalImpact = score.recommendations.reduce((sum, r) => sum + r.impactScore, 0);

  return {
    recommendations: score.recommendations,
    totalImpact,
  };
}

/**
 * Execute batch remediation (dry-run only for safety)
 */
export async function batchRemediate(
  assetIds: string[],
  action: RemediationActionRequest['action']
): Promise<{
  processed: number;
  successful: number;
  failed: number;
  results: RemediationActionResult[];
}> {
  const results: RemediationActionResult[] = [];
  let successful = 0;
  let failed = 0;

  for (const assetId of assetIds) {
    const result = await executeRemediation({
      assetId,
      action,
      dryRun: true, // Always dry-run in batch mode for safety
    });

    results.push(result);
    if (result.success) {
      successful++;
    } else {
      failed++;
    }
  }

  return {
    processed: assetIds.length,
    successful,
    failed,
    results,
  };
}
