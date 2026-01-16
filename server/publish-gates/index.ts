/**
 * Publish Gates Module
 * Intelligence enforcement before content publishing
 *
 * Enable with: ENABLE_PUBLISH_GATES=true
 */

export * from './types';
export { rulesRegistry, getRulesForContent, isRuleEnabled } from './rules';
export { evaluatePublishGates, quickCheck } from './evaluator';
export { gateService } from './gate-service';
export { default as publishGatesRoutes } from './admin-routes';

import { gateService } from './gate-service';

/**
 * Initialize publish gates module
 */
export function initPublishGates(): void {
  const enabled = process.env.ENABLE_PUBLISH_GATES === 'true';
  console.log(`[PublishGates] Module initialized (enabled: ${enabled})`);

  if (enabled) {
    const stats = gateService.getStats();
    console.log(`[PublishGates] ${stats.enabledRules} rules active`);
  }
}

/**
 * Middleware to enforce publish gates
 */
export function enforcePublishGates() {
  return async (req: any, res: any, next: Function) => {
    if (!gateService.isEnabled()) {
      return next();
    }

    const contentId = req.params.contentId || req.body.contentId;
    if (!contentId) {
      return next();
    }

    const user = req.user;
    const result = await gateService.attemptPublish(
      contentId,
      user?.id || 'anonymous',
      user?.role || 'user'
    );

    if (!result.success) {
      return res.status(422).json({
        error: 'Publishing blocked by quality gates',
        details: {
          blockedBy: result.result.blockedBy,
          failedRules: result.result.failedRules,
          results: result.result.results.filter(r => !r.passed),
          canOverride: result.result.canOverride,
        },
      });
    }

    next();
  };
}
