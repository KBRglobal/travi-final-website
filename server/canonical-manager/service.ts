/**
 * Canonical & Duplicate Content Manager Service
 */

import { db } from "../db";
import { contents } from "@shared/schema";
import { eq, ne, and, sql } from "drizzle-orm";
import {
  type CanonicalGroup,
  type DuplicateEntry,
  type DuplicateDetectionResult,
  type CanonicalStats,
} from "./types";

const canonicalGroups: Map<string, CanonicalGroup> = new Map();
const contentToGroup: Map<string, string> = new Map();

function generateId(): string {
  return `cg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function calculateTitleSimilarity(a: string, b: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1.0;

  const wordsA = new Set(na.split(/\s+/));
  const wordsB = new Set(nb.split(/\s+/));
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 ? intersection / union : 0;
}

export async function detectDuplicates(contentId: string): Promise<DuplicateDetectionResult> {
  const [content] = await db
    .select({ id: contents.id, title: contents.title, slug: contents.slug })
    .from(contents)
    .where(eq(contents.id, contentId));

  if (!content) {
    return { contentId, title: 'Unknown', potentialDuplicates: [], analyzedAt: new Date() };
  }

  const others = await db
    .select({ id: contents.id, title: contents.title, slug: contents.slug })
    .from(contents)
    .where(and(ne(contents.id, contentId), eq(contents.status, 'published')))
    .limit(500);

  const potentialDuplicates: DuplicateDetectionResult['potentialDuplicates'] = [];

  for (const other of others) {
    const similarity = calculateTitleSimilarity(content.title, other.title);
    if (similarity >= 0.7) {
      potentialDuplicates.push({
        contentId: other.id,
        title: other.title,
        similarity,
        matchType: similarity >= 0.95 ? 'title' : 'mixed',
      });
    }
  }

  potentialDuplicates.sort((a, b) => b.similarity - a.similarity);

  return {
    contentId,
    title: content.title,
    potentialDuplicates: potentialDuplicates.slice(0, 10),
    analyzedAt: new Date(),
  };
}

export function createCanonicalGroup(canonicalContentId: string, canonicalUrl: string): CanonicalGroup {
  const group: CanonicalGroup = {
    id: generateId(),
    canonicalContentId,
    canonicalUrl,
    duplicates: [],
    variants: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  canonicalGroups.set(group.id, group);
  contentToGroup.set(canonicalContentId, group.id);
  return group;
}

export function addDuplicate(
  groupId: string,
  contentId: string,
  url: string,
  similarity: number,
  action: DuplicateEntry['action'] = 'redirect'
): boolean {
  const group = canonicalGroups.get(groupId);
  if (!group) return false;

  group.duplicates.push({
    contentId,
    url,
    similarity,
    detectedAt: new Date(),
    action,
  });
  group.updatedAt = new Date();
  contentToGroup.set(contentId, groupId);
  return true;
}

export function removeDuplicate(groupId: string, contentId: string): boolean {
  const group = canonicalGroups.get(groupId);
  if (!group) return false;

  group.duplicates = group.duplicates.filter(d => d.contentId !== contentId);
  group.updatedAt = new Date();
  contentToGroup.delete(contentId);
  return true;
}

export function getCanonicalGroup(groupId: string): CanonicalGroup | undefined {
  return canonicalGroups.get(groupId);
}

export function getGroupForContent(contentId: string): CanonicalGroup | undefined {
  const groupId = contentToGroup.get(contentId);
  return groupId ? canonicalGroups.get(groupId) : undefined;
}

export function getAllGroups(): CanonicalGroup[] {
  return Array.from(canonicalGroups.values());
}

export function getCanonicalStats(): CanonicalStats {
  let totalDuplicates = 0;
  let redirectsActive = 0;

  for (const group of canonicalGroups.values()) {
    totalDuplicates += group.duplicates.length;
    redirectsActive += group.duplicates.filter(d => d.action === 'redirect' && d.actionTakenAt).length;
  }

  return {
    totalGroups: canonicalGroups.size,
    totalDuplicates,
    pendingReview: totalDuplicates - redirectsActive,
    redirectsActive,
  };
}

export function setDuplicateAction(groupId: string, contentId: string, action: DuplicateEntry['action']): boolean {
  const group = canonicalGroups.get(groupId);
  if (!group) return false;

  const duplicate = group.duplicates.find(d => d.contentId === contentId);
  if (!duplicate) return false;

  duplicate.action = action;
  duplicate.actionTakenAt = new Date();
  group.updatedAt = new Date();
  return true;
}
