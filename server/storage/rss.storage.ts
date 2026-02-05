import {
  eq,
  desc,
  sql,
  db,
  rssFeeds,
  contentFingerprints,
  topicClusters,
  topicClusterItems,
  type RssFeed,
  type InsertRssFeed,
  type ContentFingerprint,
  type InsertContentFingerprint,
  type TopicCluster,
  type InsertTopicCluster,
  type TopicClusterItem,
  type InsertTopicClusterItem,
} from "./base";

export class RssStorage {
  // RSS Feeds
  async getRssFeeds(): Promise<RssFeed[]> {
    return await db.select().from(rssFeeds).orderBy(desc(rssFeeds.createdAt));
  }

  async getRssFeed(id: string): Promise<RssFeed | undefined> {
    const [feed] = await db.select().from(rssFeeds).where(eq(rssFeeds.id, id));
    return feed;
  }

  async createRssFeed(insertFeed: InsertRssFeed): Promise<RssFeed> {
    const [feed] = await db
      .insert(rssFeeds)
      .values(insertFeed as any)
      .returning();
    return feed;
  }

  async updateRssFeed(
    id: string,
    updateData: Partial<InsertRssFeed> & { lastFetchedAt?: Date }
  ): Promise<RssFeed | undefined> {
    const [feed] = await db
      .update(rssFeeds)
      .set(updateData as any)
      .where(eq(rssFeeds.id, id))
      .returning();
    return feed;
  }

  async deleteRssFeed(id: string): Promise<boolean> {
    await db.delete(rssFeeds).where(eq(rssFeeds.id, id));
    return true;
  }

  // Content Fingerprints
  async getContentFingerprintByHash(fingerprint: string): Promise<ContentFingerprint | undefined> {
    const [result] = await db
      .select()
      .from(contentFingerprints)
      .where(eq(contentFingerprints.fingerprint, fingerprint));
    return result;
  }

  async getContentFingerprintsByFeedId(rssFeedId: string): Promise<ContentFingerprint[]> {
    return await db
      .select()
      .from(contentFingerprints)
      .where(eq(contentFingerprints.rssFeedId, rssFeedId));
  }

  async createContentFingerprint(
    insertFingerprint: InsertContentFingerprint
  ): Promise<ContentFingerprint> {
    const [fingerprint] = await db
      .insert(contentFingerprints)
      .values(insertFingerprint as any)
      .returning();
    return fingerprint;
  }

  async checkDuplicateFingerprints(fingerprints: string[]): Promise<ContentFingerprint[]> {
    if (fingerprints.length === 0) return [];
    const results = await db
      .select()
      .from(contentFingerprints)
      .where(sql`${contentFingerprints.fingerprint} = ANY(${fingerprints})`);
    return results;
  }

  // Topic Clusters for RSS aggregation
  async getTopicClusters(filters?: { status?: string }): Promise<TopicCluster[]> {
    if (filters?.status) {
      return await db
        .select()
        .from(topicClusters)
        .where(eq(topicClusters.status, filters.status as any))
        .orderBy(desc(topicClusters.createdAt));
    }
    return await db.select().from(topicClusters).orderBy(desc(topicClusters.createdAt));
  }

  async getTopicCluster(id: string): Promise<TopicCluster | undefined> {
    const [cluster] = await db.select().from(topicClusters).where(eq(topicClusters.id, id));
    return cluster;
  }

  async createTopicCluster(cluster: InsertTopicCluster): Promise<TopicCluster> {
    const [created] = await db
      .insert(topicClusters)
      .values(cluster as any)
      .returning();
    return created;
  }

  async updateTopicCluster(
    id: string,
    data: Partial<InsertTopicCluster>
  ): Promise<TopicCluster | undefined> {
    const [updated] = await db
      .update(topicClusters)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(topicClusters.id, id))
      .returning();
    return updated;
  }

  async deleteTopicCluster(id: string): Promise<boolean> {
    await db.delete(topicClusters).where(eq(topicClusters.id, id));
    return true;
  }

  async getTopicClusterItems(clusterId: string): Promise<TopicClusterItem[]> {
    return await db
      .select()
      .from(topicClusterItems)
      .where(eq(topicClusterItems.clusterId, clusterId));
  }

  async createTopicClusterItem(item: InsertTopicClusterItem): Promise<TopicClusterItem> {
    const [created] = await db
      .insert(topicClusterItems)
      .values(item as any)
      .returning();
    return created;
  }

  async updateTopicClusterItem(
    id: string,
    data: Partial<InsertTopicClusterItem>
  ): Promise<TopicClusterItem | undefined> {
    const [updated] = await db
      .update(topicClusterItems)
      .set(data as any)
      .where(eq(topicClusterItems.id, id))
      .returning();
    return updated;
  }

  async findSimilarCluster(topic: string): Promise<TopicCluster | undefined> {
    // Basic text similarity search - find clusters with similar topics
    const topicLower = topic.toLowerCase().trim();
    const words = topicLower
      .split(/\s+/)
      .filter(w => w.length > 3)
      .slice(0, 5);
    if (words.length === 0) return undefined;

    const clusters = await db
      .select()
      .from(topicClusters)
      .where(eq(topicClusters.status, "pending"));

    // Find cluster with highest word overlap
    let bestMatch: TopicCluster | undefined;
    let bestScore = 0;

    for (const cluster of clusters) {
      const clusterWords = cluster.topic.toLowerCase().split(/\s+/);
      let matchCount = 0;
      for (const word of words) {
        if (clusterWords.some(cw => cw.includes(word) || word.includes(cw))) {
          matchCount++;
        }
      }
      const score = matchCount / Math.max(words.length, 1);
      if (score > 0.5 && score > bestScore) {
        bestScore = score;
        bestMatch = cluster;
      }
    }

    return bestMatch;
  }
}

export const rssStorage = new RssStorage();
