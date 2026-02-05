import {
  eq,
  desc,
  sql,
  db,
  contents,
  contentViews,
  type ContentView,
  type InsertContentView,
} from "./base";

export class AnalyticsStorage {
  async getAnalyticsOverview(): Promise<{
    totalViews: number;
    viewsToday: number;
    viewsThisWeek: number;
    viewsThisMonth: number;
  }> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    const startOfMonth = new Date(startOfToday);
    startOfMonth.setDate(startOfMonth.getDate() - 30);

    const [totalResult] = await db
      .select({ count: sql<number>`COALESCE(SUM(${contents.viewCount}), 0)::int` })
      .from(contents);

    const [todayResult] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(contentViews)
      .where(sql`${contentViews.viewedAt} >= ${startOfToday}`);

    const [weekResult] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(contentViews)
      .where(sql`${contentViews.viewedAt} >= ${startOfWeek}`);

    const [monthResult] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(contentViews)
      .where(sql`${contentViews.viewedAt} >= ${startOfMonth}`);

    return {
      totalViews: totalResult?.count || 0,
      viewsToday: todayResult?.count || 0,
      viewsThisWeek: weekResult?.count || 0,
      viewsThisMonth: monthResult?.count || 0,
    };
  }

  async getViewsOverTime(days: number): Promise<{ date: string; views: number }[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const results = await db
      .select({
        date: sql<string>`DATE(${contentViews.viewedAt})::text`,
        views: sql<number>`COUNT(*)::int`,
      })
      .from(contentViews)
      .where(sql`${contentViews.viewedAt} >= ${startDate}`)
      .groupBy(sql`DATE(${contentViews.viewedAt})`)
      .orderBy(sql`DATE(${contentViews.viewedAt})`);

    // Fill in missing dates with 0 views
    const dateMap = new Map(results.map(r => [r.date, r.views]));
    const filledResults: { date: string; views: number }[] = [];

    for (let i = days; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      filledResults.push({
        date: dateStr,
        views: dateMap.get(dateStr) || 0,
      });
    }

    return filledResults;
  }

  async getTopContent(
    limit: number
  ): Promise<{ id: string; title: string; type: string; viewCount: number }[]> {
    const results = await db
      .select({
        id: contents.id,
        title: contents.title,
        type: contents.type,
        viewCount: contents.viewCount,
      })
      .from(contents)
      .orderBy(desc(contents.viewCount))
      .limit(limit);

    return results.map(r => ({
      id: r.id,
      title: r.title,
      type: r.type,
      viewCount: r.viewCount || 0,
    }));
  }

  async getViewsByContentType(): Promise<{ type: string; views: number }[]> {
    const results = await db
      .select({
        type: contents.type,
        views: sql<number>`COALESCE(SUM(${contents.viewCount}), 0)::int`,
      })
      .from(contents)
      .groupBy(contents.type);

    return results.map(r => ({
      type: r.type,
      views: r.views || 0,
    }));
  }

  async recordContentView(
    contentId: string,
    data?: { userAgent?: string; referrer?: string; sessionId?: string }
  ): Promise<void> {
    await db.transaction(async tx => {
      await tx.insert(contentViews).values({
        contentId,
        userAgent: data?.userAgent,
        referrer: data?.referrer,
        sessionId: data?.sessionId,
      } as any);

      await tx
        .update(contents)
        .set({ viewCount: sql`COALESCE(${contents.viewCount}, 0) + 1` } as any)
        .where(eq(contents.id, contentId));
    });
  }
}

export const analyticsStorage = new AnalyticsStorage();
