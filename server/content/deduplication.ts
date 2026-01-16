import { db } from "../db";
import { contents, contentFingerprints } from "@shared/schema";
import { eq, or, ilike } from "drizzle-orm";
import crypto from "crypto";

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingId?: string;
  matchType?: "exact_url" | "title_hash" | "similar_title";
  confidence?: number;
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

function generateTitleHash(title: string): string {
  const normalized = normalizeTitle(title);
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("utm_source");
    parsed.searchParams.delete("utm_medium");
    parsed.searchParams.delete("utm_campaign");
    parsed.searchParams.delete("utm_term");
    parsed.searchParams.delete("utm_content");
    parsed.searchParams.delete("ref");
    parsed.searchParams.delete("fbclid");
    parsed.searchParams.delete("gclid");
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url.trim().replace(/\/$/, "");
  }
}

function generateUrlHash(url: string): string {
  const normalized = normalizeUrl(url);
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

function calculateTitleSimilarity(title1: string, title2: string): number {
  const norm1 = normalizeTitle(title1);
  const norm2 = normalizeTitle(title2);
  
  if (norm1 === norm2) return 1.0;
  
  const words1 = new Set(norm1.split(" ").filter(w => w.length > 2));
  const words2 = new Set(norm2.split(" ").filter(w => w.length > 2));
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

export async function checkDuplicate(
  title: string,
  sourceUrl?: string
): Promise<DuplicateCheckResult> {
  if (sourceUrl) {
    const urlHash = generateUrlHash(sourceUrl);
    const existingFingerprint = await db
      .select()
      .from(contentFingerprints)
      .where(eq(contentFingerprints.fingerprint, urlHash))
      .limit(1);

    if (existingFingerprint.length > 0 && existingFingerprint[0].contentId) {
      return {
        isDuplicate: true,
        existingId: existingFingerprint[0].contentId,
        matchType: "exact_url",
        confidence: 1.0,
      };
    }

    const normalizedSourceUrl = normalizeUrl(sourceUrl);
    const existingBySourceUrl = await db
      .select()
      .from(contentFingerprints)
      .where(eq(contentFingerprints.sourceUrl, normalizedSourceUrl))
      .limit(1);

    if (existingBySourceUrl.length > 0 && existingBySourceUrl[0].contentId) {
      return {
        isDuplicate: true,
        existingId: existingBySourceUrl[0].contentId,
        matchType: "exact_url",
        confidence: 1.0,
      };
    }
  }

  const titleHash = generateTitleHash(title);
  const existingByTitleHash = await db
    .select()
    .from(contentFingerprints)
    .where(eq(contentFingerprints.fingerprint, titleHash))
    .limit(1);

  if (existingByTitleHash.length > 0 && existingByTitleHash[0].contentId) {
    return {
      isDuplicate: true,
      existingId: existingByTitleHash[0].contentId,
      matchType: "title_hash",
      confidence: 1.0,
    };
  }

  const normalizedTitle = normalizeTitle(title);
  const potentialMatches = await db
    .select({ id: contents.id, title: contents.title })
    .from(contents)
    .where(ilike(contents.title, `%${normalizedTitle.split(" ")[0]}%`))
    .limit(50);

  for (const match of potentialMatches) {
    const similarity = calculateTitleSimilarity(title, match.title);
    if (similarity >= 0.85) {
      return {
        isDuplicate: true,
        existingId: match.id,
        matchType: "similar_title",
        confidence: similarity,
      };
    }
  }

  return { isDuplicate: false };
}

export async function createFingerprint(
  contentId: string,
  title: string,
  sourceUrl?: string,
  rssFeedId?: string
): Promise<void> {
  const titleHash = generateTitleHash(title);
  
  try {
    await db.insert(contentFingerprints).values({
      contentId,
      fingerprint: titleHash,
      sourceUrl: sourceUrl ? normalizeUrl(sourceUrl) : undefined,
      sourceTitle: title,
      rssFeedId,
    });
  } catch (error: any) {
    if (error?.code !== "23505") {
      throw error;
    }
  }

  if (sourceUrl) {
    const urlHash = generateUrlHash(sourceUrl);
    if (urlHash !== titleHash) {
      try {
        await db.insert(contentFingerprints).values({
          contentId,
          fingerprint: urlHash,
          sourceUrl: normalizeUrl(sourceUrl),
          sourceTitle: title,
          rssFeedId,
        });
      } catch (error: any) {
        if (error?.code !== "23505") {
          throw error;
        }
      }
    }
  }
}

export { generateTitleHash, generateUrlHash, normalizeTitle, normalizeUrl, calculateTitleSimilarity };
