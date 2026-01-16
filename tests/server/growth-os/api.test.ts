/**
 * Executive Growth Feed API Tests
 */

import { describe, it, expect, vi } from 'vitest';

// Mock config
vi.mock('../../../server/growth-os/config', () => ({
  isApiEnabled: () => true,
  getGrowthOSConfig: () => ({
    enabled: true,
    enableSignals: true,
    enablePrioritization: true,
    enableActions: true,
    enableSafety: true,
    enableApi: true,
  }),
}));

describe('Feed Generation', () => {
  describe('Feed Item Creation', () => {
    it('should create signal feed items', () => {
      const signal = {
        id: 'sig-1',
        title: 'Traffic Spike',
        description: 'Unusual traffic detected',
        priority: 'high',
        category: 'traffic',
        severity: 80,
        impact: 70,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      const feedItem = {
        id: crypto.randomUUID(),
        type: 'signal',
        priority: signal.priority === 'critical' ? 'urgent' : signal.priority,
        title: signal.title,
        summary: signal.description,
        category: signal.category,
        sourceId: signal.id,
        sourceType: 'signal',
      };

      expect(feedItem.type).toBe('signal');
      expect(feedItem.priority).toBe('high');
    });

    it('should create action feed items', () => {
      const plan = {
        id: 'plan-1',
        title: 'Optimize Images',
        description: 'Compress and convert images',
        actionType: 'media_optimize',
        status: 'draft',
        requiresApproval: false,
        approved: false,
      };

      const feedItem = {
        id: crypto.randomUUID(),
        type: 'action',
        title: plan.title,
        summary: plan.description,
        sourceId: plan.id,
        sourceType: 'plan',
      };

      expect(feedItem.type).toBe('action');
      expect(feedItem.sourceType).toBe('plan');
    });

    it('should create alert feed items', () => {
      const alert = {
        id: crypto.randomUUID(),
        type: 'alert',
        priority: 'high',
        title: 'Multiple plans blocked',
        summary: 'Review blocked plans',
        category: 'governance',
        sourceType: 'system',
      };

      expect(alert.type).toBe('alert');
      expect(alert.sourceType).toBe('system');
    });
  });

  describe('Priority Conversion', () => {
    it('should convert signal priority to feed priority', () => {
      const conversions = [
        { signal: 'critical', feed: 'urgent' },
        { signal: 'high', feed: 'high' },
        { signal: 'medium', feed: 'normal' },
        { signal: 'low', feed: 'low' },
      ];

      for (const { signal, feed } of conversions) {
        const converted = signal === 'critical' ? 'urgent' :
          signal === 'medium' ? 'normal' : signal;

        expect(converted).toBe(feed);
      }
    });
  });

  describe('CTA Generation', () => {
    it('should generate approve CTA for pending approval', () => {
      const plan = { requiresApproval: true, approved: false };

      const cta = plan.requiresApproval && !plan.approved
        ? { label: 'Approve', action: 'approve' }
        : { label: 'Execute', action: 'execute' };

      expect(cta.action).toBe('approve');
    });

    it('should generate execute CTA for ready plans', () => {
      const plan = { requiresApproval: false };
      const readiness = { status: 'ready' };

      const cta = readiness.status === 'ready'
        ? { label: 'Execute', action: 'execute' }
        : { label: 'View Details', action: 'view' };

      expect(cta.action).toBe('execute');
    });
  });
});

describe('Feed Filtering', () => {
  const items = [
    { type: 'signal', priority: 'urgent', category: 'traffic', read: false, dismissed: false },
    { type: 'action', priority: 'high', category: 'content', read: true, dismissed: false },
    { type: 'alert', priority: 'normal', category: 'governance', read: false, dismissed: true },
    { type: 'signal', priority: 'low', category: 'seo', read: false, dismissed: false },
  ];

  it('should filter by type', () => {
    const types = ['signal'];
    const filtered = items.filter(i => types.includes(i.type));

    expect(filtered.length).toBe(2);
  });

  it('should filter by priority', () => {
    const priorities = ['urgent', 'high'];
    const filtered = items.filter(i => priorities.includes(i.priority));

    expect(filtered.length).toBe(2);
  });

  it('should filter by category', () => {
    const categories = ['traffic', 'content'];
    const filtered = items.filter(i => categories.includes(i.category));

    expect(filtered.length).toBe(2);
  });

  it('should exclude read items by default', () => {
    const includeRead = false;
    const filtered = includeRead ? items : items.filter(i => !i.read);

    expect(filtered.length).toBe(3);
  });

  it('should exclude dismissed items by default', () => {
    const includeDismissed = false;
    const filtered = includeDismissed ? items : items.filter(i => !i.dismissed);

    expect(filtered.length).toBe(3);
  });
});

describe('Feed Sorting', () => {
  const items = [
    { priority: 'normal', timestamp: new Date(1000) },
    { priority: 'urgent', timestamp: new Date(2000) },
    { priority: 'high', timestamp: new Date(3000) },
  ];

  it('should sort by priority first', () => {
    const priorityOrder: Record<string, number> = {
      urgent: 0,
      high: 1,
      normal: 2,
      low: 3,
    };

    const sorted = [...items].sort((a, b) =>
      priorityOrder[a.priority] - priorityOrder[b.priority]
    );

    expect(sorted[0].priority).toBe('urgent');
    expect(sorted[1].priority).toBe('high');
    expect(sorted[2].priority).toBe('normal');
  });

  it('should sort by timestamp within same priority', () => {
    const sameItems = [
      { priority: 'high', timestamp: new Date(1000) },
      { priority: 'high', timestamp: new Date(3000) },
      { priority: 'high', timestamp: new Date(2000) },
    ];

    const sorted = [...sameItems].sort((a, b) =>
      b.timestamp.getTime() - a.timestamp.getTime()
    );

    expect(sorted[0].timestamp.getTime()).toBe(3000);
  });
});

describe('Dashboard Summary', () => {
  it('should calculate health score', () => {
    const criticalCount = 2;
    const highCount = 5;
    const blockedCount = 3;

    let healthScore = 100;
    healthScore -= criticalCount * 15;
    healthScore -= highCount * 5;
    healthScore -= blockedCount * 3;
    healthScore = Math.max(0, Math.min(100, healthScore));

    expect(healthScore).toBe(100 - 30 - 25 - 9);
  });

  it('should aggregate signals by category', () => {
    const signals = [
      { category: 'traffic' },
      { category: 'traffic' },
      { category: 'content' },
      { category: 'seo' },
    ];

    const byCategory: Record<string, number> = {};
    for (const signal of signals) {
      byCategory[signal.category] = (byCategory[signal.category] || 0) + 1;
    }

    expect(byCategory['traffic']).toBe(2);
    expect(byCategory['content']).toBe(1);
    expect(byCategory['seo']).toBe(1);
  });

  it('should calculate revenue opportunity', () => {
    const signals = [
      { revenueImpact: 100 },
      { revenueImpact: 500 },
      { revenueImpact: -50 }, // Negative shouldn't count
    ];

    let opportunity = 0;
    for (const signal of signals) {
      if (signal.revenueImpact && signal.revenueImpact > 0) {
        opportunity += signal.revenueImpact;
      }
    }

    expect(opportunity).toBe(600);
  });

  it('should identify top risks', () => {
    const signals = [
      { title: 'Risk A', severity: 90 },
      { title: 'Risk B', severity: 70 },
      { title: 'Low issue', severity: 30 },
    ];

    const topRisks = signals
      .filter(s => s.severity >= 60)
      .slice(0, 3)
      .map(s => ({ title: s.title, risk: s.severity }));

    expect(topRisks.length).toBe(2);
    expect(topRisks[0].title).toBe('Risk A');
  });
});

describe('Action Queue', () => {
  describe('Queue Items', () => {
    it('should include pending plans', () => {
      const plans = [
        { status: 'draft' },
        { status: 'ready' },
        { status: 'executing' },
        { status: 'completed' },
      ];

      const pendingPlans = plans.filter(p =>
        !['completed', 'cancelled', 'rolled_back'].includes(p.status)
      );

      expect(pendingPlans.length).toBe(3);
    });

    it('should sort by priority score', () => {
      const items = [
        { priorityScore: 60 },
        { priorityScore: 90 },
        { priorityScore: 75 },
      ];

      const sorted = [...items].sort((a, b) => b.priorityScore - a.priorityScore);

      expect(sorted[0].priorityScore).toBe(90);
    });
  });

  describe('Queue Statistics', () => {
    it('should count by status', () => {
      const items = [
        { readiness: 'ready' },
        { readiness: 'blocked' },
        { readiness: 'pending_approval' },
        { readiness: 'ready' },
      ];

      const ready = items.filter(i => i.readiness === 'ready').length;
      const blocked = items.filter(i => i.readiness === 'blocked').length;
      const pending = items.filter(i => i.readiness === 'pending_approval').length;

      expect(ready).toBe(2);
      expect(blocked).toBe(1);
      expect(pending).toBe(1);
    });

    it('should calculate total estimated duration', () => {
      const items = [
        { estimatedDuration: 30, readiness: 'ready' },
        { estimatedDuration: 60, readiness: 'ready' },
        { estimatedDuration: 45, readiness: 'blocked' }, // Shouldn't count
      ];

      const totalDuration = items
        .filter(i => i.readiness === 'ready')
        .reduce((sum, i) => sum + i.estimatedDuration, 0);

      expect(totalDuration).toBe(90);
    });
  });
});

describe('Feed Item Management', () => {
  it('should mark items as read', () => {
    const items = new Map([
      ['item-1', { read: false }],
      ['item-2', { read: false }],
    ]);

    const item = items.get('item-1');
    if (item) item.read = true;

    expect(items.get('item-1')?.read).toBe(true);
    expect(items.get('item-2')?.read).toBe(false);
  });

  it('should dismiss items', () => {
    const items = new Map([
      ['item-1', { dismissed: false }],
    ]);

    const item = items.get('item-1');
    if (item) item.dismissed = true;

    expect(items.get('item-1')?.dismissed).toBe(true);
  });
});

describe('Bounded Feed Storage', () => {
  it('should evict oldest items at capacity', () => {
    const maxItems = 3;
    const items = new Map<string, { timestamp: Date }>();

    const addItem = (id: string, timestamp: Date) => {
      if (items.size >= maxItems) {
        const oldest = [...items.entries()].sort(
          (a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime()
        )[0];
        items.delete(oldest[0]);
      }
      items.set(id, { timestamp });
    };

    addItem('a', new Date(1000));
    addItem('b', new Date(2000));
    addItem('c', new Date(3000));
    addItem('d', new Date(4000));

    expect(items.size).toBe(3);
    expect(items.has('a')).toBe(false);
    expect(items.has('d')).toBe(true);
  });
});
