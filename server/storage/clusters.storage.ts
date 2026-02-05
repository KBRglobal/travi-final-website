import {
  eq,
  desc,
  db,
  inArray,
  contentClusters,
  clusterMembers,
  contents,
  type ContentCluster,
  type InsertContentCluster,
  type ClusterMember,
  type InsertClusterMember,
  type Content,
} from "./base";

export class ClustersStorage {
  // Content Clusters
  async getContentClusters(): Promise<ContentCluster[]> {
    return await db.select().from(contentClusters).orderBy(desc(contentClusters.createdAt));
  }

  async getContentCluster(id: string): Promise<ContentCluster | undefined> {
    const [cluster] = await db.select().from(contentClusters).where(eq(contentClusters.id, id));
    return cluster;
  }

  async getContentClusterBySlug(slug: string): Promise<ContentCluster | undefined> {
    const [cluster] = await db.select().from(contentClusters).where(eq(contentClusters.slug, slug));
    return cluster;
  }

  async createContentCluster(cluster: InsertContentCluster): Promise<ContentCluster> {
    const [newCluster] = await db
      .insert(contentClusters)
      .values(cluster as any)
      .returning();
    return newCluster;
  }

  async updateContentCluster(
    id: string,
    data: Partial<InsertContentCluster>
  ): Promise<ContentCluster | undefined> {
    const [cluster] = await db
      .update(contentClusters)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(contentClusters.id, id))
      .returning();
    return cluster;
  }

  async deleteContentCluster(id: string): Promise<boolean> {
    await db.delete(contentClusters).where(eq(contentClusters.id, id));
    return true;
  }

  // Cluster Members - Fixed N+1 with batch query
  async getClusterMembers(clusterId: string): Promise<(ClusterMember & { content?: Content })[]> {
    const members = await db
      .select()
      .from(clusterMembers)
      .where(eq(clusterMembers.clusterId, clusterId))
      .orderBy(clusterMembers.position);

    if (members.length === 0) return [];

    // Batch fetch all contents at once
    const contentIds = [...new Set(members.map(m => m.contentId))];
    const allContents = await db.select().from(contents).where(inArray(contents.id, contentIds));
    const contentMap = new Map(allContents.map(c => [c.id, c]));

    return members.map(member => ({ ...member, content: contentMap.get(member.contentId) }));
  }

  async addClusterMember(member: InsertClusterMember): Promise<ClusterMember> {
    const [newMember] = await db
      .insert(clusterMembers)
      .values(member as any)
      .returning();
    return newMember;
  }

  async removeClusterMember(id: string): Promise<boolean> {
    await db.delete(clusterMembers).where(eq(clusterMembers.id, id));
    return true;
  }

  async updateClusterMemberPosition(
    id: string,
    position: number
  ): Promise<ClusterMember | undefined> {
    const [member] = await db
      .update(clusterMembers)
      .set({ position } as any)
      .where(eq(clusterMembers.id, id))
      .returning();
    return member;
  }

  async getContentClusterMembership(
    contentId: string
  ): Promise<(ClusterMember & { cluster?: ContentCluster })[]> {
    const members = await db
      .select()
      .from(clusterMembers)
      .where(eq(clusterMembers.contentId, contentId));

    const result: (ClusterMember & { cluster?: ContentCluster })[] = [];
    for (const member of members) {
      const [cluster] = await db
        .select()
        .from(contentClusters)
        .where(eq(contentClusters.id, member.clusterId));
      result.push({ ...member, cluster });
    }
    return result;
  }
}

export const clustersStorage = new ClustersStorage();
