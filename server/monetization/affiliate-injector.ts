/**
 * Affiliate Link Injector
 *
 * Automatically injects affiliate links into content
 * - Pattern matching for brands/products
 * - Tracking code injection
 * - Link replacement
 * - Analytics tracking
 */

import { db } from "../db";
import { partners, contents } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface AffiliateLinkConfig {
  partnerId: string;
  trackingCode: string;
  baseUrl: string;
  patterns: string[]; // Keywords to match
}

export interface InjectionResult {
  originalText: string;
  modifiedText: string;
  linksInjected: number;
  matches: Array<{
    pattern: string;
    partnerId: string;
    url: string;
  }>;
}

// Common affiliate patterns for Dubai tourism
const AFFILIATE_PATTERNS: Record<string, { baseUrl: string; keywords: string[] }> = {
  booking: {
    baseUrl: "https://www.booking.com",
    keywords: ["hotel", "resort", "accommodation", "stay", "room", "suite"],
  },
  getyourguide: {
    baseUrl: "https://www.getyourguide.com",
    keywords: ["tour", "ticket", "attraction", "activity", "experience", "desert safari"],
  },
  viator: {
    baseUrl: "https://www.viator.com",
    keywords: ["excursion", "guided tour", "day trip", "sightseeing"],
  },
  amazon: {
    baseUrl: "https://www.amazon.com",
    keywords: ["book", "guide", "travel guide", "product"],
  },
};

export const affiliateInjector = {
  /**
   * Inject affiliate links into content
   */
  async injectAffiliateLinks(contentId: string, dryRun: boolean = false): Promise<InjectionResult> {
    try {
      // Fetch content
      const contentData = await db
        .select()
        .from(contents)
        .where(eq(contents.id, contentId))
        .limit(1);

      if (contentData.length === 0) {
        throw new Error("Content not found");
      }

      const content = contentData[0];

      // Get active partners
      const activePartners = await db.select().from(partners).where(eq(partners.status, "active"));

      // Build text from content blocks
      let originalText = content.title + "\n\n";
      if (content.blocks && Array.isArray(content.blocks)) {
        for (const block of content.blocks as Array<{
          type: string;
          content?: string;
          text?: string;
        }>) {
          if (block.type === "paragraph" || block.type === "text") {
            originalText += (block.content || block.text || "") + "\n";
          }
        }
      }

      let modifiedText = originalText;
      const matches: InjectionResult["matches"] = [];

      // Helper function to escape regex special characters
      const escapeRegex = (str: string): string => {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      };

      // Process each partner
      for (const partner of activePartners) {
        // Find matching patterns
        const partnerConfig = AFFILIATE_PATTERNS[partner.trackingCode.split("-")[0]];
        if (!partnerConfig) continue;

        for (const keyword of partnerConfig.keywords) {
          // Escape special characters in keyword
          const escapedKeyword = escapeRegex(keyword);
          const regex = new RegExp(`\\b${escapedKeyword}\\b`, "gi");
          const match = modifiedText.match(regex);

          if (match) {
            // Build affiliate URL
            const affiliateUrl = `${partnerConfig.baseUrl}?aid=${partner.trackingCode}`;

            // Replace first occurrence with link
            const linkText = `[${match[0]}](${affiliateUrl})`;
            modifiedText = modifiedText.replace(regex, linkText);

            matches.push({
              pattern: keyword,
              partnerId: partner.id,
              url: affiliateUrl,
            });

            // Update partner stats
            if (!dryRun) {
              await db
                .update(partners)
                .set({
                  totalClicks: (partner.totalClicks || 0) + 1,
                } as any)
                .where(eq(partners.id, partner.id));
            }

            // Only inject once per keyword to avoid over-optimization
            break;
          }
        }
      }

      // Update content if not dry run
      if (!dryRun && matches.length > 0) {
        // Update content blocks with modified text
        // This is simplified - in production would need to parse and rebuild blocks properly
        await db
          .update(contents)
          .set({
            updatedAt: new Date(),
          } as any)
          .where(eq(contents.id, contentId));
      }

      return {
        originalText,
        modifiedText,
        linksInjected: matches.length,
        matches,
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Extract existing affiliate links from content
   */
  extractAffiliateLinks(text: string): Array<{ url: string; trackingCode: string }> {
    const links: Array<{ url: string; trackingCode: string }> = [];
    const urlRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;

    while ((match = urlRegex.exec(text)) !== null) {
      const url = match[2];

      // Extract tracking code from URL
      const aidMatch = url.match(/[?&]aid=([^&]+)/);
      if (aidMatch) {
        links.push({
          url,
          trackingCode: aidMatch[1],
        });
      }
    }

    return links;
  },

  /**
   * Validate affiliate link
   */
  validateAffiliateLink(url: string): boolean {
    try {
      const urlObj = new URL(url);

      // Check if URL contains tracking parameter
      return (
        urlObj.searchParams.has("aid") ||
        urlObj.searchParams.has("ref") ||
        urlObj.searchParams.has("affiliate_id")
      );
    } catch {
      return false;
    }
  },

  /**
   * Track affiliate click
   */
  async trackClick(trackingCode: string): Promise<void> {
    try {
      const partner = await db
        .select()
        .from(partners)
        .where(eq(partners.trackingCode, trackingCode))
        .limit(1);

      if (partner.length > 0) {
        await db
          .update(partners)
          .set({
            totalClicks: (partner[0].totalClicks || 0) + 1,
          } as any)
          .where(eq(partners.id, partner[0].id));
      }
    } catch (error) {}
  },

  /**
   * Track affiliate conversion
   */
  async trackConversion(trackingCode: string, amount: number): Promise<void> {
    try {
      const partner = await db
        .select()
        .from(partners)
        .where(eq(partners.trackingCode, trackingCode))
        .limit(1);

      if (partner.length > 0) {
        const commission = Math.floor((amount * partner[0].commissionRate) / 10000); // Convert basis points

        await db
          .update(partners)
          .set({
            totalConversions: (partner[0].totalConversions || 0) + 1,
            totalEarnings: (partner[0].totalEarnings || 0) + commission,
          } as any)
          .where(eq(partners.id, partner[0].id));
      }
    } catch (error) {}
  },
};
