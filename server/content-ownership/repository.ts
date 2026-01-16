/**
 * Content Ownership Repository
 *
 * In-memory storage for ownership assignments.
 */

import {
  type ContentOwnership,
  type OwnershipTransfer,
  type OwnershipRole,
  type ResponsibilityMatrix,
  type OwnershipStats,
} from "./types";

const ownerships: Map<string, ContentOwnership> = new Map();
const transfers: OwnershipTransfer[] = [];

function generateId(): string {
  return `own-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function assignOwnership(
  contentId: string,
  userId: string,
  role: OwnershipRole,
  assignedBy: string,
  options: { expiresAt?: Date; notes?: string } = {}
): ContentOwnership {
  const key = `${contentId}:${userId}:${role}`;

  const ownership: ContentOwnership = {
    id: generateId(),
    contentId,
    userId,
    role,
    assignedAt: new Date(),
    assignedBy,
    expiresAt: options.expiresAt,
    notes: options.notes,
  };

  ownerships.set(key, ownership);
  return ownership;
}

export function removeOwnership(contentId: string, userId: string, role: OwnershipRole): boolean {
  const key = `${contentId}:${userId}:${role}`;
  return ownerships.delete(key);
}

export function transferOwnership(
  contentId: string,
  fromUserId: string,
  toUserId: string,
  role: OwnershipRole,
  transferredBy: string,
  reason: string
): OwnershipTransfer {
  // Remove old ownership
  removeOwnership(contentId, fromUserId, role);

  // Create new ownership
  assignOwnership(contentId, toUserId, role, transferredBy);

  const transfer: OwnershipTransfer = {
    id: generateId(),
    contentId,
    fromUserId,
    toUserId,
    role,
    transferredAt: new Date(),
    transferredBy,
    reason,
  };

  transfers.push(transfer);
  return transfer;
}

export function getContentOwnership(contentId: string): ResponsibilityMatrix {
  const contentOwnerships = Array.from(ownerships.values())
    .filter(o => o.contentId === contentId);

  return {
    contentId,
    owner: contentOwnerships.find(o => o.role === 'owner'),
    editors: contentOwnerships.filter(o => o.role === 'editor'),
    reviewers: contentOwnerships.filter(o => o.role === 'reviewer'),
    contributors: contentOwnerships.filter(o => o.role === 'contributor'),
    lastUpdatedAt: new Date(),
  };
}

export function getUserOwnerships(userId: string): ContentOwnership[] {
  return Array.from(ownerships.values())
    .filter(o => o.userId === userId);
}

export function getOwnershipByRole(role: OwnershipRole): ContentOwnership[] {
  return Array.from(ownerships.values())
    .filter(o => o.role === role);
}

export function getExpiringOwnerships(withinDays: number = 7): ContentOwnership[] {
  const now = new Date();
  const threshold = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);

  return Array.from(ownerships.values())
    .filter(o => o.expiresAt && o.expiresAt <= threshold && o.expiresAt > now);
}

export function getTransferHistory(contentId: string): OwnershipTransfer[] {
  return transfers
    .filter(t => t.contentId === contentId)
    .sort((a, b) => b.transferredAt.getTime() - a.transferredAt.getTime());
}

export function getOwnershipStats(): OwnershipStats {
  const all = Array.from(ownerships.values());
  const byRole: Record<OwnershipRole, number> = {
    owner: 0,
    editor: 0,
    reviewer: 0,
    contributor: 0,
  };

  for (const o of all) {
    byRole[o.role]++;
  }

  return {
    totalAssignments: all.length,
    byRole,
    unassignedContent: 0, // Would need to query content table
    expiringSoon: getExpiringOwnerships(7).length,
  };
}

export function clearExpiredOwnerships(): number {
  const now = new Date();
  let cleared = 0;

  for (const [key, ownership] of ownerships.entries()) {
    if (ownership.expiresAt && ownership.expiresAt < now) {
      ownerships.delete(key);
      cleared++;
    }
  }

  return cleared;
}
