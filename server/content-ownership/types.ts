/**
 * Content Ownership & Responsibility Types
 *
 * Tracks who owns content and who is responsible for updates.
 */

export type OwnershipRole = 'owner' | 'editor' | 'reviewer' | 'contributor';

export interface ContentOwnership {
  id: string;
  contentId: string;
  userId: string;
  role: OwnershipRole;
  assignedAt: Date;
  assignedBy: string;
  expiresAt?: Date;
  notes?: string;
}

export interface OwnershipTransfer {
  id: string;
  contentId: string;
  fromUserId: string;
  toUserId: string;
  role: OwnershipRole;
  transferredAt: Date;
  transferredBy: string;
  reason: string;
}

export interface ResponsibilityMatrix {
  contentId: string;
  owner?: ContentOwnership;
  editors: ContentOwnership[];
  reviewers: ContentOwnership[];
  contributors: ContentOwnership[];
  lastUpdatedAt: Date;
}

export interface OwnershipStats {
  totalAssignments: number;
  byRole: Record<OwnershipRole, number>;
  unassignedContent: number;
  expiringSoon: number;
}

export function isContentOwnershipEnabled(): boolean {
  return process.env.ENABLE_CONTENT_OWNERSHIP === 'true';
}
