import { db } from "../server/db";
import { sql } from "drizzle-orm";
import { qaCategories } from "../shared/schema";
import { seedQaChecklist } from "../server/data/qa-checklist-seed";

async function setupQaTables() {
  console.log("🚀 Setting up QA Checklist System...\n");

  try {
    // Step 1: Create tables if they don't exist
    console.log("📦 Creating QA tables...");

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS qa_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        name_he VARCHAR(255),
        description TEXT,
        description_he TEXT,
        icon VARCHAR(50),
        color VARCHAR(50),
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS qa_checklist_items (
        id SERIAL PRIMARY KEY,
        category_id INTEGER REFERENCES qa_categories(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        title_he VARCHAR(500),
        description TEXT,
        description_he TEXT,
        severity VARCHAR(20) DEFAULT 'medium',
        is_automated BOOLEAN DEFAULT false,
        automation_script TEXT,
        documentation_url TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS qa_runs (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(20) DEFAULT 'in_progress',
        started_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        started_by INTEGER,
        total_items INTEGER DEFAULT 0,
        passed_items INTEGER DEFAULT 0,
        failed_items INTEGER DEFAULT 0,
        skipped_items INTEGER DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS qa_check_results (
        id SERIAL PRIMARY KEY,
        run_id INTEGER REFERENCES qa_runs(id) ON DELETE CASCADE,
        item_id INTEGER REFERENCES qa_checklist_items(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending',
        notes TEXT,
        evidence_url TEXT,
        checked_by INTEGER,
        checked_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS qa_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        item_ids JSONB DEFAULT '[]',
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS qa_issues (
        id SERIAL PRIMARY KEY,
        run_id INTEGER REFERENCES qa_runs(id) ON DELETE CASCADE,
        item_id INTEGER REFERENCES qa_checklist_items(id),
        title VARCHAR(500) NOT NULL,
        description TEXT,
        severity VARCHAR(20) DEFAULT 'medium',
        status VARCHAR(20) DEFAULT 'open',
        assigned_to INTEGER,
        resolved_at TIMESTAMP,
        resolution_notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log("✅ Tables created!\n");

    // Step 2: Check if data already exists
    const existingCategories = await db.select().from(qaCategories);

    if (existingCategories.length > 0) {
      console.log(`ℹ️  Found ${existingCategories.length} existing categories.`);
      console.log("   Skipping seed to avoid duplicates.\n");
      console.log("✨ QA System is ready! Go to /admin/qa to use it.\n");
      return;
    }

    // Step 3: Seed the data using the existing function
    console.log("🌱 Seeding QA checklist data...\n");
    await seedQaChecklist();

    console.log("\n✨ QA System is ready! Go to /admin/qa to use it.\n");

  } catch (error) {
    console.error("❌ Error setting up QA tables:", error);
    process.exit(1);
  }
}

setupQaTables().then(() => {
  process.exit(0);
});
