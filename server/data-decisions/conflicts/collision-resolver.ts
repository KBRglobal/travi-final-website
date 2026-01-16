/**
 * Decision Collision Resolver
 * Handles conflicts between decisions targeting the same resource or conflicting actions
 */

import type { Decision, DecisionType, AuthorityLevel, MetricConflict } from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface DecisionCollision {
  id: string;
  type: CollisionType;
  decisions: Decision[];
  detectedAt: Date;
  resolution?: CollisionResolution;
  resolvedAt?: Date;
}

export type CollisionType =
  | 'same_resource' // Two decisions target same resource
  | 'opposite_actions' // Actions that conflict (e.g., publish vs block)
  | 'resource_constraint' // Resource can only handle one action
  | 'authority_conflict'; // Different authority levels conflict

export interface CollisionResolution {
  winner: Decision;
  losers: Decision[];
  reason: string;
  rule: string;
  autoResolved: boolean;
}

// =============================================================================
// CONFLICT PAIRS
// =============================================================================

type ActionPair = [DecisionType, DecisionType];

// Actions that directly conflict with each other
const CONFLICTING_PAIRS: ActionPair[] = [
  ['BLOCK_PUBLISH', 'TRIGGER_SEO_REWRITE'],
  ['FREEZE_AUTOMATION', 'AUTO_OPTIMIZE_CACHE'],
  ['FREEZE_AUTOMATION', 'AUTO_SCALE_WORKERS'],
  ['DISABLE_SYSTEM', 'AUTO_SCALE_WORKERS'],
  ['BLOCK_ALL_DEPLOYMENTS', 'ROLLBACK_CHANGES'],
  ['REDUCE_TRAFFIC', 'INCREASE_CRAWL_PRIORITY'],
];

// Authority priority order (highest to lowest)
const AUTHORITY_PRIORITY: AuthorityLevel[] = [
  'blocking',
  'escalating',
  'triggering',
  'advisory',
];

// Domain priority order for same-level conflicts
const DOMAIN_PRIORITY = ['ops', 'health', 'cost', 'revenue', 'seo', 'aeo', 'content', 'growth'];

// =============================================================================
// COLLISION RESOLVER
// =============================================================================

export class CollisionResolver {
  private activeDecisions: Map<string, Decision> = new Map(); // resourceKey -> decision
  private collisionHistory: DecisionCollision[] = [];

  // =========================================================================
  // COLLISION DETECTION
  // =========================================================================

  detectCollisions(newDecision: Decision, existingDecisions: Decision[]): DecisionCollision[] {
    const collisions: DecisionCollision[] = [];

    for (const existing of existingDecisions) {
      // Skip if same decision
      if (existing.id === newDecision.id) continue;

      // Check for same resource conflict
      const resourceCollision = this.checkResourceCollision(newDecision, existing);
      if (resourceCollision) {
        collisions.push(resourceCollision);
        continue;
      }

      // Check for opposite action conflict
      const actionCollision = this.checkActionCollision(newDecision, existing);
      if (actionCollision) {
        collisions.push(actionCollision);
      }
    }

    return collisions;
  }

  private checkResourceCollision(
    decision1: Decision,
    decision2: Decision
  ): DecisionCollision | null {
    // Check if they target the same resource
    for (const entity1 of decision1.impactedEntities) {
      for (const entity2 of decision2.impactedEntities) {
        if (entity1.type === entity2.type && entity1.id === entity2.id) {
          return {
            id: `col-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            type: 'same_resource',
            decisions: [decision1, decision2],
            detectedAt: new Date(),
          };
        }
      }
    }

    return null;
  }

  private checkActionCollision(
    decision1: Decision,
    decision2: Decision
  ): DecisionCollision | null {
    // Check if actions are conflicting
    for (const [action1, action2] of CONFLICTING_PAIRS) {
      if (
        (decision1.type === action1 && decision2.type === action2) ||
        (decision1.type === action2 && decision2.type === action1)
      ) {
        return {
          id: `col-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          type: 'opposite_actions',
          decisions: [decision1, decision2],
          detectedAt: new Date(),
        };
      }
    }

    return null;
  }

  // =========================================================================
  // COLLISION RESOLUTION
  // =========================================================================

  resolveCollision(collision: DecisionCollision): CollisionResolution {
    const [decision1, decision2] = collision.decisions;

    let resolution: CollisionResolution;

    switch (collision.type) {
      case 'same_resource':
        resolution = this.resolveByPriority(decision1, decision2, 'same_resource');
        break;

      case 'opposite_actions':
        resolution = this.resolveOppositeActions(decision1, decision2);
        break;

      case 'resource_constraint':
        resolution = this.resolveByTimestamp(decision1, decision2);
        break;

      case 'authority_conflict':
        resolution = this.resolveByAuthority(decision1, decision2);
        break;

      default:
        resolution = this.resolveByPriority(decision1, decision2, 'default');
    }

    collision.resolution = resolution;
    collision.resolvedAt = new Date();

    this.collisionHistory.push(collision);

    return resolution;
  }

  private resolveByPriority(
    decision1: Decision,
    decision2: Decision,
    context: string
  ): CollisionResolution {
    // 1. Check authority level
    const auth1Priority = AUTHORITY_PRIORITY.indexOf(decision1.authority);
    const auth2Priority = AUTHORITY_PRIORITY.indexOf(decision2.authority);

    if (auth1Priority < auth2Priority) {
      return {
        winner: decision1,
        losers: [decision2],
        reason: `${decision1.authority} authority takes precedence over ${decision2.authority}`,
        rule: 'AUTHORITY_HIERARCHY',
        autoResolved: true,
      };
    }

    if (auth2Priority < auth1Priority) {
      return {
        winner: decision2,
        losers: [decision1],
        reason: `${decision2.authority} authority takes precedence over ${decision1.authority}`,
        rule: 'AUTHORITY_HIERARCHY',
        autoResolved: true,
      };
    }

    // 2. Same authority - check confidence
    if (Math.abs(decision1.confidence - decision2.confidence) > 5) {
      const winner = decision1.confidence > decision2.confidence ? decision1 : decision2;
      const loser = winner === decision1 ? decision2 : decision1;

      return {
        winner,
        losers: [loser],
        reason: `Higher confidence (${winner.confidence}% vs ${loser.confidence}%)`,
        rule: 'CONFIDENCE_WINS',
        autoResolved: true,
      };
    }

    // 3. Same confidence - check domain priority
    const domain1 = decision1.signal.metricId.split('.')[0];
    const domain2 = decision2.signal.metricId.split('.')[0];

    const domainPriority1 = DOMAIN_PRIORITY.indexOf(domain1);
    const domainPriority2 = DOMAIN_PRIORITY.indexOf(domain2);

    if (domainPriority1 !== domainPriority2 && domainPriority1 >= 0 && domainPriority2 >= 0) {
      const winner = domainPriority1 < domainPriority2 ? decision1 : decision2;
      const loser = winner === decision1 ? decision2 : decision1;

      return {
        winner,
        losers: [loser],
        reason: `${domain1 === winner.signal.metricId.split('.')[0] ? domain1 : domain2} domain has priority`,
        rule: 'DOMAIN_PRIORITY',
        autoResolved: true,
      };
    }

    // 4. Fallback - older decision wins
    return this.resolveByTimestamp(decision1, decision2);
  }

  private resolveOppositeActions(
    decision1: Decision,
    decision2: Decision
  ): CollisionResolution {
    // For opposite actions, blocking action always wins
    const blockingActions: DecisionType[] = [
      'BLOCK_PUBLISH',
      'BLOCK_ALL_DEPLOYMENTS',
      'FREEZE_AUTOMATION',
      'DISABLE_SYSTEM',
      'DISABLE_FEATURE',
    ];

    const isBlocking1 = blockingActions.includes(decision1.type);
    const isBlocking2 = blockingActions.includes(decision2.type);

    if (isBlocking1 && !isBlocking2) {
      return {
        winner: decision1,
        losers: [decision2],
        reason: `Blocking action (${decision1.type}) takes precedence`,
        rule: 'BLOCKING_WINS',
        autoResolved: true,
      };
    }

    if (isBlocking2 && !isBlocking1) {
      return {
        winner: decision2,
        losers: [decision1],
        reason: `Blocking action (${decision2.type}) takes precedence`,
        rule: 'BLOCKING_WINS',
        autoResolved: true,
      };
    }

    // Both are blocking or both are non-blocking - use priority
    return this.resolveByPriority(decision1, decision2, 'opposite_actions');
  }

  private resolveByAuthority(
    decision1: Decision,
    decision2: Decision
  ): CollisionResolution {
    const auth1Priority = AUTHORITY_PRIORITY.indexOf(decision1.authority);
    const auth2Priority = AUTHORITY_PRIORITY.indexOf(decision2.authority);

    const winner = auth1Priority <= auth2Priority ? decision1 : decision2;
    const loser = winner === decision1 ? decision2 : decision1;

    return {
      winner,
      losers: [loser],
      reason: `${winner.authority} authority has priority`,
      rule: 'AUTHORITY_HIERARCHY',
      autoResolved: true,
    };
  }

  private resolveByTimestamp(
    decision1: Decision,
    decision2: Decision
  ): CollisionResolution {
    const winner = decision1.createdAt < decision2.createdAt ? decision1 : decision2;
    const loser = winner === decision1 ? decision2 : decision1;

    return {
      winner,
      losers: [loser],
      reason: 'Earlier decision has priority',
      rule: 'FIRST_WINS',
      autoResolved: true,
    };
  }

  // =========================================================================
  // BATCH RESOLUTION
  // =========================================================================

  resolveAll(decisions: Decision[]): {
    executable: Decision[];
    deferred: Decision[];
    collisions: DecisionCollision[];
  } {
    const executable: Decision[] = [];
    const deferred: Decision[] = [];
    const collisions: DecisionCollision[] = [];

    // Sort by authority then confidence
    const sorted = [...decisions].sort((a, b) => {
      const authDiff =
        AUTHORITY_PRIORITY.indexOf(a.authority) -
        AUTHORITY_PRIORITY.indexOf(b.authority);
      if (authDiff !== 0) return authDiff;
      return b.confidence - a.confidence;
    });

    for (const decision of sorted) {
      // Check for collisions with already approved decisions
      const detected = this.detectCollisions(decision, executable);

      if (detected.length === 0) {
        executable.push(decision);
      } else {
        // Try to resolve
        for (const collision of detected) {
          const resolution = this.resolveCollision(collision);
          collisions.push(collision);

          if (resolution.winner.id === decision.id) {
            // New decision wins - remove loser from executable
            for (const loser of resolution.losers) {
              const index = executable.findIndex(d => d.id === loser.id);
              if (index >= 0) {
                deferred.push(executable[index]);
                executable.splice(index, 1);
              }
            }
            executable.push(decision);
          } else {
            // Existing decision wins - defer new one
            deferred.push(decision);
          }
        }
      }
    }

    return { executable, deferred, collisions };
  }

  // =========================================================================
  // QUERIES
  // =========================================================================

  getCollisionHistory(limit = 50): DecisionCollision[] {
    return this.collisionHistory.slice(-limit);
  }

  getActiveConflicts(): DecisionCollision[] {
    return this.collisionHistory.filter(c => !c.resolution);
  }

  clearHistory(): void {
    this.collisionHistory = [];
  }

  // =========================================================================
  // VALIDATION
  // =========================================================================

  canExecute(decision: Decision, activeDecisions: Decision[]): {
    canExecute: boolean;
    blockedBy?: Decision;
    reason?: string;
  } {
    const collisions = this.detectCollisions(decision, activeDecisions);

    if (collisions.length === 0) {
      return { canExecute: true };
    }

    // Check if this decision would win all collisions
    for (const collision of collisions) {
      const resolution = this.resolveCollision(collision);

      if (resolution.winner.id !== decision.id) {
        return {
          canExecute: false,
          blockedBy: resolution.winner,
          reason: resolution.reason,
        };
      }
    }

    return { canExecute: true };
  }

  // =========================================================================
  // CONFLICT ANALYSIS
  // =========================================================================

  analyzeConflictPatterns(): {
    totalCollisions: number;
    byType: Record<CollisionType, number>;
    byRule: Record<string, number>;
    autoResolvedRate: number;
  } {
    const byType: Record<CollisionType, number> = {
      same_resource: 0,
      opposite_actions: 0,
      resource_constraint: 0,
      authority_conflict: 0,
    };

    const byRule: Record<string, number> = {};
    let autoResolved = 0;

    for (const collision of this.collisionHistory) {
      byType[collision.type]++;

      if (collision.resolution) {
        byRule[collision.resolution.rule] = (byRule[collision.resolution.rule] || 0) + 1;

        if (collision.resolution.autoResolved) {
          autoResolved++;
        }
      }
    }

    return {
      totalCollisions: this.collisionHistory.length,
      byType,
      byRule,
      autoResolvedRate:
        this.collisionHistory.length > 0
          ? (autoResolved / this.collisionHistory.length) * 100
          : 0,
    };
  }
}

// Singleton instance
export const collisionResolver = new CollisionResolver();
