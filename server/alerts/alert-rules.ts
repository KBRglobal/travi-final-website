import type { AlertRule } from "./types";

const THRESHOLDS = {
  JOB_STALL_SECONDS: 30,
  EVENT_BUS_INACTIVE_SECONDS: 300,
  SEARCH_INDEX_STALE_MINUTES: 30,
  COVERAGE_DROP_THRESHOLD: 0.5,
  AI_FAILURE_COUNT: 3,
};

export const alertRules: AlertRule[] = [
  {
    type: "JOB_STALLED",
    severity: "high",
    detect: async () => {
      try {
        const { getQueueHealth } = await import("../job-queue");
        const health = getQueueHealth();

        if (!health.isRunning) {
          return {
            triggered: true,
            message: "Job queue worker is not running",
            metadata: { isRunning: health.isRunning },
          };
        }

        if (health.lastTickAt) {
          const lastTick = new Date(health.lastTickAt);
          const ageSeconds = (Date.now() - lastTick.getTime()) / 1000;
          if (ageSeconds > THRESHOLDS.JOB_STALL_SECONDS) {
            return {
              triggered: true,
              message: `Job queue stalled - last tick was ${Math.round(ageSeconds)}s ago`,
              metadata: { lastTickAt: health.lastTickAt, ageSeconds },
            };
          }
        }

        return { triggered: false, message: "" };
      } catch (error) {
        return { triggered: false, message: "" };
      }
    },
  },
  {
    type: "EVENT_BUS_INACTIVE",
    severity: "high",
    detect: async () => {
      try {
        const { getSubscriberStatus, contentEvents } = await import("../events");
        const status = getSubscriberStatus();

        if (!status?.initialized) {
          return {
            triggered: true,
            message: "Event bus not initialized",
            metadata: { initialized: false },
          };
        }

        const stats = contentEvents.getStats();
        const lastPublished = stats?.events?.["content.published"]?.lastEmitted;
        const lastUpdated = stats?.events?.["content.updated"]?.lastEmitted;

        const lastActivity = lastPublished || lastUpdated;
        if (lastActivity) {
          const lastActivityDate = new Date(lastActivity);
          const ageSeconds = (Date.now() - lastActivityDate.getTime()) / 1000;
          if (ageSeconds > THRESHOLDS.EVENT_BUS_INACTIVE_SECONDS) {
            return {
              triggered: true,
              message: `No content events for ${Math.round(ageSeconds / 60)} minutes`,
              metadata: { lastActivity, ageSeconds },
            };
          }
        }

        return { triggered: false, message: "" };
      } catch (error) {
        return { triggered: false, message: "" };
      }
    },
  },
  {
    type: "RSS_PIPELINE_FAILED",
    severity: "medium",
    detect: async () => {
      try {
        const { getRssProcessingStats } = await import("../routes/admin/observability-routes");
        const stats = getRssProcessingStats();

        if (stats.lastError) {
          return {
            triggered: true,
            message: `RSS pipeline error: ${stats.lastError}`,
            metadata: { lastError: stats.lastError, lastRunTime: stats.lastRunTime },
          };
        }

        return { triggered: false, message: "" };
      } catch (error) {
        return { triggered: false, message: "" };
      }
    },
  },
  {
    type: "SEARCH_INDEX_STALE",
    severity: "medium",
    detect: async () => {
      try {
        const { db } = await import("../db");
        const { sql } = await import("drizzle-orm");

        const staleMinutes = THRESHOLDS.SEARCH_INDEX_STALE_MINUTES;
        const result = await db.execute(sql`
          SELECT c.id, c.title, c.published_at
          FROM contents c
          LEFT JOIN search_index si ON c.id = si.content_id
          WHERE c.status = 'published'
            AND c.published_at < NOW() - make_interval(mins => ${staleMinutes})
            AND si.content_id IS NULL
          LIMIT 5
        `);

        if (result.rows.length > 0) {
          return {
            triggered: true,
            message: `${result.rows.length} published content(s) not indexed after ${THRESHOLDS.SEARCH_INDEX_STALE_MINUTES} minutes`,
            metadata: { 
              count: result.rows.length,
              contentIds: result.rows.map((r: any) => r.id),
            },
          };
        }

        return { triggered: false, message: "" };
      } catch (error) {
        return { triggered: false, message: "" };
      }
    },
  },
  {
    type: "INTELLIGENCE_COVERAGE_DROP",
    severity: "medium",
    detect: async () => {
      try {
        const { db } = await import("../db");
        const { sql } = await import("drizzle-orm");

        const result = await db.execute(sql`
          SELECT 
            COUNT(*) FILTER (WHERE seo_score IS NOT NULL)::float / NULLIF(COUNT(*), 0) as coverage
          FROM contents
          WHERE status = 'published'
        `);

        const coverage = (result.rows[0] as any)?.coverage || 0;
        if (coverage < THRESHOLDS.COVERAGE_DROP_THRESHOLD) {
          return {
            triggered: true,
            message: `Intelligence coverage dropped to ${Math.round(coverage * 100)}%`,
            metadata: { coverage, threshold: THRESHOLDS.COVERAGE_DROP_THRESHOLD },
          };
        }

        return { triggered: false, message: "" };
      } catch (error) {
        return { triggered: false, message: "" };
      }
    },
  },
  {
    type: "AI_PROVIDER_FAILURE",
    severity: "high",
    detect: async () => {
      try {
        const { db } = await import("../db");
        const { sql } = await import("drizzle-orm");

        const result = await db.execute(sql`
          SELECT provider, COUNT(*) as failure_count
          FROM ai_generation_logs
          WHERE status = 'error'
            AND created_at > NOW() - INTERVAL '1 hour'
          GROUP BY provider
          HAVING COUNT(*) >= ${THRESHOLDS.AI_FAILURE_COUNT}
        `);

        if (result.rows.length > 0) {
          const providers = result.rows.map((r: any) => `${r.provider}(${r.failure_count})`);
          return {
            triggered: true,
            message: `AI provider failures in last hour: ${providers.join(", ")}`,
            metadata: { 
              providers: result.rows.map((r: any) => ({
                provider: r.provider,
                failureCount: r.failure_count,
              })),
            },
          };
        }

        return { triggered: false, message: "" };
      } catch (error) {
        return { triggered: false, message: "" };
      }
    },
  },
];
