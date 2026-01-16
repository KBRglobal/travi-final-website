/**
 * Growth Command Center Routes
 *
 * Admin API endpoints for the Executive Growth Command Center.
 */

import { Router, Request, Response } from 'express';
import { getGrowthAggregator } from './aggregator';
import { getGrowthScorer } from './scorer';
import { getGrowthPrioritizer } from './prioritizer';
import type {
  GrowthQuery,
  PrioritizationCriteria,
  ScoringWeights,
  GrowthDashboard,
  GrowthRecommendation,
} from './types';

const ENABLE_GROWTH_COMMAND_CENTER = process.env.ENABLE_GROWTH_COMMAND_CENTER === 'true';

export function createGrowthCommandRouter(): Router {
  const router = Router();

  // Feature flag middleware
  router.use((req: Request, res: Response, next) => {
    if (!ENABLE_GROWTH_COMMAND_CENTER) {
      return res.status(404).json({ error: 'Growth Command Center is disabled' });
    }
    next();
  });

  // ==========================================================================
  // DASHBOARD
  // ==========================================================================

  /**
   * GET /dashboard - Get growth dashboard
   */
  router.get('/dashboard', (req: Request, res: Response) => {
    try {
      const aggregator = getGrowthAggregator();
      const prioritizer = getGrowthPrioritizer();

      // Aggregate latest opportunities
      const aggregation = aggregator.aggregate();
      const opportunities = aggregator.getAllOpportunities();

      // Get next action
      const nextAction = prioritizer.getNextAction();

      // Build dashboard
      const dashboard: GrowthDashboard = {
        summary: {
          totalOpportunities: opportunities.length,
          readyToExecute: opportunities.filter((o) => o.executionReadiness.isReady).length,
          pendingApproval: opportunities.filter((o) =>
            o.requiredApprovals.some((a) => a.status === 'pending')
          ).length,
          inProgress: opportunities.filter((o) => o.status === 'executing').length,
          completedThisMonth: opportunities.filter((o) =>
            o.status === 'completed' &&
            o.updatedAt.getMonth() === new Date().getMonth()
          ).length,
        },
        topOpportunities: opportunities
          .sort((a, b) => b.impactScore - a.impactScore)
          .slice(0, 5),
        recentActivity: [],
        metrics: {
          pipelineValue: opportunities.reduce(
            (sum, o) => sum + o.revenueImpact.midEstimate,
            0
          ),
          averageROI: opportunities.length > 0
            ? opportunities.reduce((sum, o) => sum + o.expectedROI, 0) / opportunities.length
            : 0,
          successRate: 0,
          avgTimeToExecute: 0,
          riskDistribution: {
            minimal: opportunities.filter((o) => o.riskLevel === 'minimal').length,
            low: opportunities.filter((o) => o.riskLevel === 'low').length,
            medium: opportunities.filter((o) => o.riskLevel === 'medium').length,
            high: opportunities.filter((o) => o.riskLevel === 'high').length,
            critical: opportunities.filter((o) => o.riskLevel === 'critical').length,
          },
          categoryBreakdown: opportunities.reduce((acc, o) => {
            acc[o.category] = (acc[o.category] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
        },
        recommendations: generateRecommendations(opportunities, nextAction),
      };

      res.json(dashboard);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get dashboard' });
    }
  });

  /**
   * GET /next-action - Get what to do next
   */
  router.get('/next-action', (req: Request, res: Response) => {
    try {
      const prioritizer = getGrowthPrioritizer();
      const nextAction = prioritizer.getNextAction();

      res.json(nextAction);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get next action' });
    }
  });

  // ==========================================================================
  // OPPORTUNITIES
  // ==========================================================================

  /**
   * GET /opportunities - Get all opportunities
   */
  router.get('/opportunities', (req: Request, res: Response) => {
    try {
      const aggregator = getGrowthAggregator();
      aggregator.aggregate();

      const opportunities = aggregator.getAllOpportunities();
      const source = req.query.source as string | undefined;
      const category = req.query.category as string | undefined;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      let filtered = opportunities;

      if (source) {
        filtered = filtered.filter((o) => o.source === source);
      }

      if (category) {
        filtered = filtered.filter((o) => o.category === category);
      }

      res.json({
        total: filtered.length,
        opportunities: filtered.slice(0, limit),
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get opportunities' });
    }
  });

  /**
   * GET /opportunities/:id - Get opportunity by ID
   */
  router.get('/opportunities/:id', (req: Request, res: Response) => {
    try {
      const aggregator = getGrowthAggregator();
      const scorer = getGrowthScorer();

      const opportunity = aggregator.getOpportunity(req.params.id);

      if (!opportunity) {
        return res.status(404).json({ error: 'Opportunity not found' });
      }

      const score = scorer.scoreOpportunity(opportunity);

      res.json({
        opportunity,
        score,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get opportunity' });
    }
  });

  /**
   * POST /opportunities/:id/approve - Approve an opportunity
   */
  router.post('/opportunities/:id/approve', (req: Request, res: Response) => {
    try {
      const aggregator = getGrowthAggregator();
      const { role, approver } = req.body;

      const opportunity = aggregator.getOpportunity(req.params.id);

      if (!opportunity) {
        return res.status(404).json({ error: 'Opportunity not found' });
      }

      // Find and update approval
      const approval = opportunity.requiredApprovals.find(
        (a) => a.role === role && a.status === 'pending'
      );

      if (!approval) {
        return res.status(400).json({ error: 'No pending approval for this role' });
      }

      approval.status = 'approved';
      approval.approvedBy = approver;
      approval.approvedAt = new Date();
      opportunity.updatedAt = new Date();

      // Check if all approvals are complete
      const allApproved = opportunity.requiredApprovals.every(
        (a) => a.status === 'approved'
      );

      if (allApproved) {
        opportunity.status = 'approved';
        opportunity.executionReadiness.isReady = true;
      }

      res.json(opportunity);
    } catch (error) {
      res.status(500).json({ error: 'Failed to approve opportunity' });
    }
  });

  /**
   * POST /opportunities/manual - Add manual opportunity
   */
  router.post('/opportunities/manual', (req: Request, res: Response) => {
    try {
      const aggregator = getGrowthAggregator();

      const opportunity = aggregator.addManualOpportunity({
        sourceId: `manual-${Date.now()}`,
        status: 'identified',
        title: req.body.title,
        description: req.body.description,
        category: req.body.category || 'manual',
        impactScore: req.body.impactScore || 50,
        impactLevel: req.body.impactLevel || 'medium',
        expectedROI: req.body.expectedROI || 50,
        confidenceLevel: req.body.confidenceLevel || 0.5,
        revenueImpact: req.body.revenueImpact || {
          lowEstimate: 0,
          midEstimate: 0,
          highEstimate: 0,
          timeframeDays: 30,
        },
        riskScore: req.body.riskScore || 0.3,
        riskLevel: req.body.riskLevel || 'low',
        risks: req.body.risks || [],
        effortScore: req.body.effortScore || 50,
        effortLevel: req.body.effortLevel || 'medium',
        dependencies: req.body.dependencies || [],
        requiredApprovals: req.body.requiredApprovals || [],
        blockers: req.body.blockers || [],
        executionReadiness: req.body.executionReadiness || {
          isReady: true,
          score: 80,
          blockers: [],
          warnings: [],
        },
        tags: req.body.tags || ['manual'],
      });

      res.status(201).json(opportunity);
    } catch (error) {
      res.status(500).json({ error: 'Failed to add opportunity' });
    }
  });

  // ==========================================================================
  // QUERIES
  // ==========================================================================

  /**
   * POST /query - Execute a growth query
   */
  router.post('/query', (req: Request, res: Response) => {
    try {
      const prioritizer = getGrowthPrioritizer();
      const query: GrowthQuery = req.body;

      if (!query.type) {
        return res.status(400).json({ error: 'Query type is required' });
      }

      const result = prioritizer.executeQuery(query);

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Query execution failed' });
    }
  });

  /**
   * GET /query/top - Quick access to top opportunities
   */
  router.get('/query/top', (req: Request, res: Response) => {
    try {
      const prioritizer = getGrowthPrioritizer();
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

      const result = prioritizer.executeQuery({
        type: 'top_opportunities',
        limit,
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Query failed' });
    }
  });

  /**
   * GET /query/quick-wins - Get quick wins
   */
  router.get('/query/quick-wins', (req: Request, res: Response) => {
    try {
      const prioritizer = getGrowthPrioritizer();
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

      const result = prioritizer.executeQuery({
        type: 'quick_wins',
        limit,
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Query failed' });
    }
  });

  /**
   * GET /query/ready - Get ready-to-execute
   */
  router.get('/query/ready', (req: Request, res: Response) => {
    try {
      const prioritizer = getGrowthPrioritizer();
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

      const result = prioritizer.executeQuery({
        type: 'ready_to_execute',
        limit,
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Query failed' });
    }
  });

  // ==========================================================================
  // PRIORITIZATION
  // ==========================================================================

  /**
   * POST /prioritize - Create prioritized list
   */
  router.post('/prioritize', (req: Request, res: Response) => {
    try {
      const prioritizer = getGrowthPrioritizer();

      const { name, criteria, weights } = req.body;

      const list = prioritizer.createPrioritizedList(
        name || 'Default List',
        criteria as PrioritizationCriteria,
        weights as Partial<ScoringWeights>
      );

      res.json(list);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create prioritized list' });
    }
  });

  /**
   * GET /lists - Get all prioritized lists
   */
  router.get('/lists', (req: Request, res: Response) => {
    try {
      const prioritizer = getGrowthPrioritizer();
      const lists = prioritizer.getAllLists();

      res.json({
        total: lists.length,
        lists: lists.map((l) => ({
          id: l.id,
          name: l.name,
          opportunityCount: l.opportunities.length,
          generatedAt: l.generatedAt,
          validUntil: l.validUntil,
          isValid: prioritizer.isListValid(l.id),
        })),
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get lists' });
    }
  });

  /**
   * GET /lists/:id - Get prioritized list by ID
   */
  router.get('/lists/:id', (req: Request, res: Response) => {
    try {
      const prioritizer = getGrowthPrioritizer();
      const list = prioritizer.getList(req.params.id);

      if (!list) {
        return res.status(404).json({ error: 'List not found' });
      }

      res.json({
        ...list,
        isValid: prioritizer.isListValid(list.id),
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get list' });
    }
  });

  /**
   * POST /lists/:id/refresh - Refresh a list
   */
  router.post('/lists/:id/refresh', (req: Request, res: Response) => {
    try {
      const prioritizer = getGrowthPrioritizer();
      const list = prioritizer.refreshList(req.params.id);

      if (!list) {
        return res.status(404).json({ error: 'List not found' });
      }

      res.json(list);
    } catch (error) {
      res.status(500).json({ error: 'Failed to refresh list' });
    }
  });

  // ==========================================================================
  // SCORING
  // ==========================================================================

  /**
   * GET /scoring/weights - Get current scoring weights
   */
  router.get('/scoring/weights', (req: Request, res: Response) => {
    try {
      const scorer = getGrowthScorer();
      const weights = scorer.getWeights();

      res.json(weights);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get weights' });
    }
  });

  /**
   * PUT /scoring/weights - Update scoring weights
   */
  router.put('/scoring/weights', (req: Request, res: Response) => {
    try {
      const scorer = getGrowthScorer();
      const weights = req.body as Partial<ScoringWeights>;

      scorer.updateWeights(weights);

      res.json(scorer.getWeights());
    } catch (error) {
      res.status(500).json({ error: 'Failed to update weights' });
    }
  });

  /**
   * POST /scoring/score - Score a specific opportunity
   */
  router.post('/scoring/score', (req: Request, res: Response) => {
    try {
      const aggregator = getGrowthAggregator();
      const scorer = getGrowthScorer();

      const { opportunityId } = req.body;
      const opportunity = aggregator.getOpportunity(opportunityId);

      if (!opportunity) {
        return res.status(404).json({ error: 'Opportunity not found' });
      }

      const score = scorer.scoreOpportunity(opportunity);

      res.json(score);
    } catch (error) {
      res.status(500).json({ error: 'Failed to score opportunity' });
    }
  });

  // ==========================================================================
  // AGGREGATION
  // ==========================================================================

  /**
   * POST /aggregate - Trigger aggregation
   */
  router.post('/aggregate', (req: Request, res: Response) => {
    try {
      const aggregator = getGrowthAggregator();
      const result = aggregator.aggregate();

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Aggregation failed' });
    }
  });

  /**
   * GET /signals - Get recent signals
   */
  router.get('/signals', (req: Request, res: Response) => {
    try {
      const aggregator = getGrowthAggregator();
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      const signals = aggregator.getRecentSignals(limit);

      res.json({
        total: signals.length,
        signals,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get signals' });
    }
  });

  return router;
}

/**
 * Generate recommendations based on current state
 */
function generateRecommendations(
  opportunities: any[],
  nextAction: any
): GrowthRecommendation[] {
  const recommendations: GrowthRecommendation[] = [];

  // Add next action recommendation
  if (nextAction.opportunity) {
    recommendations.push({
      id: 'rec-next-action',
      type: 'action',
      priority: 'high',
      title: 'Recommended Next Action',
      description: nextAction.opportunity.title,
      actionItems: nextAction.reasoning,
      relatedOpportunities: [nextAction.opportunity.id],
    });
  }

  // Check for high-value opportunities waiting
  const highValue = opportunities.filter(
    (o) => o.impactScore >= 70 && o.executionReadiness.isReady
  );
  if (highValue.length > 3) {
    recommendations.push({
      id: 'rec-high-value',
      type: 'insight',
      priority: 'medium',
      title: `${highValue.length} High-Value Opportunities Ready`,
      description: 'Multiple high-impact opportunities are ready for execution.',
      relatedOpportunities: highValue.slice(0, 5).map((o) => o.id),
    });
  }

  // Check for stale opportunities
  const stale = opportunities.filter((o) => {
    const daysSinceUpdate = (Date.now() - o.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate > 7 && o.status === 'identified';
  });
  if (stale.length > 0) {
    recommendations.push({
      id: 'rec-stale',
      type: 'warning',
      priority: 'low',
      title: `${stale.length} Opportunities Need Review`,
      description: 'Some opportunities have been pending for over a week.',
      actionItems: ['Review and prioritize stale opportunities'],
      relatedOpportunities: stale.slice(0, 5).map((o) => o.id),
    });
  }

  return recommendations;
}
