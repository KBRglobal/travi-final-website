import { db } from "../server/db";
import { sql } from "drizzle-orm";

// Whitelist of allowed table names for schema checks
const ALLOWED_TABLES = [
  'ai_generated_images',
  'topic_clusters',
  'topic_cluster_items',
  'users',
  'contents',
  'media',
  'tags',
  'translations',
  'rss_feeds',
  'topic_bank',
  'settings',
  'homepage_promotions',
  'newsletter_subscribers',
  'audit_logs',
  'rate_limits',
  'two_factor_secrets',
  'search_queries',
  'translation_batch_jobs'
] as const;

type AllowedTable = typeof ALLOWED_TABLES[number];

function isAllowedTable(table: string): table is AllowedTable {
  return ALLOWED_TABLES.includes(table as AllowedTable);
}

async function checkSchema() {
  const tables = [
    'ai_generated_images',
    'topic_clusters',
    'topic_cluster_items'
    // Telegram tables archived - see ARCHIVED_CODE_v1.0.md
  ];

  for (const table of tables) {
    console.log(`\n=== ${table} ===`);

    // Validate table name against whitelist to prevent SQL injection
    if (!isAllowedTable(table)) {
      console.log(`Error: '${table}' is not in the allowed tables whitelist`);
      continue;
    }

    try {
      // Use parameterized query - table name validated against whitelist
      const result = await db.execute(sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = ${table}
        ORDER BY ordinal_position
      `);
      console.log(JSON.stringify(result.rows, null, 2));
    } catch (e: any) {
      console.log(`Table doesn't exist or error: ${e.message}`);
    }
  }
  process.exit(0);
}

checkSchema();
