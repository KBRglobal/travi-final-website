/**
 * Unit Tests - Activity Feed
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../../server/lib/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('Activity Feed Service', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ENABLE_ACTIVITY_FEED = 'true';
  });

  afterEach(() => {
    delete process.env.ENABLE_ACTIVITY_FEED;
  });

  it('should initialize when enabled', async () => {
    const { getActivityFeedService, resetActivityFeedService } = await import(
      '../../../server/activity-feed/service'
    );

    resetActivityFeedService();
    const service = getActivityFeedService();
    expect(service.isEnabled()).toBe(true);
  });

  it('should record activity', async () => {
    const { getActivityFeedService, resetActivityFeedService } = await import(
      '../../../server/activity-feed/service'
    );

    resetActivityFeedService();
    const service = getActivityFeedService();

    const activity = service.record({
      type: 'content_published',
      result: 'success',
      actorId: 'user-1',
      actorName: 'John Doe',
      action: 'John Doe published "Test Article"',
      entityId: 'content-1',
      entityType: 'content',
    });

    expect(activity.id).toBeDefined();
    expect(activity.type).toBe('content_published');
    expect(activity.actorId).toBe('user-1');
  });

  it('should query by actor', async () => {
    const { getActivityFeedService, resetActivityFeedService } = await import(
      '../../../server/activity-feed/service'
    );

    resetActivityFeedService();
    const service = getActivityFeedService();

    service.record({ type: 'content_created', result: 'success', actorId: 'user-1', action: 'Created' });
    service.record({ type: 'content_updated', result: 'success', actorId: 'user-1', action: 'Updated' });
    service.record({ type: 'content_deleted', result: 'success', actorId: 'user-2', action: 'Deleted' });

    const user1Activities = service.query({ actorId: 'user-1' });
    expect(user1Activities.length).toBe(2);
  });

  it('should query by entity', async () => {
    const { getActivityFeedService, resetActivityFeedService } = await import(
      '../../../server/activity-feed/service'
    );

    resetActivityFeedService();
    const service = getActivityFeedService();

    service.record({ type: 'content_created', result: 'success', actorId: 'user-1', action: 'Created', entityId: 'content-1' });
    service.record({ type: 'content_updated', result: 'success', actorId: 'user-2', action: 'Updated', entityId: 'content-1' });
    service.record({ type: 'content_published', result: 'success', actorId: 'user-1', action: 'Published', entityId: 'content-2' });

    const content1Activities = service.query({ entityId: 'content-1' });
    expect(content1Activities.length).toBe(2);
  });

  it('should get entity history', async () => {
    const { getActivityFeedService, resetActivityFeedService } = await import(
      '../../../server/activity-feed/service'
    );

    resetActivityFeedService();
    const service = getActivityFeedService();

    service.record({ type: 'content_created', result: 'success', actorId: 'user-1', action: 'Created', entityId: 'content-1', entityType: 'content' });
    service.record({ type: 'content_updated', result: 'success', actorId: 'user-2', action: 'Updated', entityId: 'content-1', entityType: 'content' });

    const history = service.getEntityHistory('content-1');
    expect(history.entityId).toBe('content-1');
    expect(history.activities.length).toBe(2);
    expect(history.totalCount).toBe(2);
  });

  it('should filter by type', async () => {
    const { getActivityFeedService, resetActivityFeedService } = await import(
      '../../../server/activity-feed/service'
    );

    resetActivityFeedService();
    const service = getActivityFeedService();

    service.record({ type: 'content_created', result: 'success', actorId: 'user-1', action: 'Created' });
    service.record({ type: 'content_published', result: 'success', actorId: 'user-1', action: 'Published' });
    service.record({ type: 'approval_granted', result: 'success', actorId: 'user-2', action: 'Approved' });

    const publishActivities = service.query({ types: ['content_published'] });
    expect(publishActivities.length).toBe(1);
    expect(publishActivities[0].type).toBe('content_published');
  });

  it('should get summary', async () => {
    const { getActivityFeedService, resetActivityFeedService } = await import(
      '../../../server/activity-feed/service'
    );

    resetActivityFeedService();
    const service = getActivityFeedService();

    service.record({ type: 'content_created', result: 'success', actorId: 'user-1', actorName: 'John', action: 'Created' });
    service.record({ type: 'content_published', result: 'success', actorId: 'user-1', actorName: 'John', action: 'Published' });
    service.record({ type: 'content_updated', result: 'failure', actorId: 'user-2', actorName: 'Jane', action: 'Failed update' });

    const summary = service.getSummary();
    expect(summary.totalActivities).toBe(3);
    expect(summary.byType['content_created']).toBe(1);
    expect(summary.byResult['success']).toBe(2);
    expect(summary.byResult['failure']).toBe(1);
  });

  it('should sort by timestamp descending', async () => {
    const { getActivityFeedService, resetActivityFeedService } = await import(
      '../../../server/activity-feed/service'
    );

    resetActivityFeedService();
    const service = getActivityFeedService();

    service.record({ type: 'content_created', result: 'success', actorId: 'user-1', action: 'First' });
    await new Promise(r => setTimeout(r, 10));
    service.record({ type: 'content_updated', result: 'success', actorId: 'user-1', action: 'Second' });

    const activities = service.query({});
    expect(activities[0].action).toBe('Second');
    expect(activities[1].action).toBe('First');
  });
});

describe('Activity Recording Helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ENABLE_ACTIVITY_FEED = 'true';
  });

  afterEach(() => {
    delete process.env.ENABLE_ACTIVITY_FEED;
  });

  it('should record content activity', async () => {
    const { recordContentActivity, resetActivityFeedService } = await import(
      '../../../server/activity-feed/service'
    );

    resetActivityFeedService();
    const activity = recordContentActivity(
      'content_published',
      'user-1',
      'John Doe',
      'content-1',
      'My Article'
    );

    expect(activity).not.toBeNull();
    expect(activity?.type).toBe('content_published');
    expect(activity?.entityId).toBe('content-1');
  });

  it('should record approval activity', async () => {
    const { recordApprovalActivity, resetActivityFeedService } = await import(
      '../../../server/activity-feed/service'
    );

    resetActivityFeedService();
    const activity = recordApprovalActivity(
      'approval_granted',
      'user-1',
      'John Doe',
      'content-1',
      'My Article'
    );

    expect(activity).not.toBeNull();
    expect(activity?.type).toBe('approval_granted');
  });

  it('should record policy block', async () => {
    const { recordPolicyBlock, resetActivityFeedService } = await import(
      '../../../server/activity-feed/service'
    );

    resetActivityFeedService();
    const activity = recordPolicyBlock(
      'user-1',
      'John Doe',
      'content-1',
      'My Article',
      'Quality Policy',
      'Score too low'
    );

    expect(activity).not.toBeNull();
    expect(activity?.type).toBe('policy_block');
    expect(activity?.result).toBe('blocked');
  });
});
