/**
 * Script to create VAMS tables directly
 */
import { pool } from "../server/db";

async function createVamsTables() {
  try {
    console.log("Creating VAMS enums...");

    // Create enums
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE vams_provider AS ENUM ('unsplash', 'pexels', 'pixabay', 'dalle', 'flux', 'upload', 'url');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE vams_asset_status AS ENUM ('pending', 'processing', 'ready', 'failed', 'archived');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE vams_variant_type AS ENUM ('hero', 'card', 'og', 'thumbnail', 'gallery', 'mobile');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    console.log("Creating vams_assets table...");

    // Create vams_assets table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vams_assets (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        provider vams_provider NOT NULL,
        provider_id VARCHAR(255),
        status vams_asset_status NOT NULL DEFAULT 'pending',
        original_url TEXT,
        stored_url TEXT,
        thumbnail_url TEXT,
        filename VARCHAR(255),
        mime_type VARCHAR(100),
        width INTEGER,
        height INTEGER,
        file_size INTEGER,
        title TEXT,
        description TEXT,
        alt_text TEXT,
        alt_text_locales JSONB DEFAULT '{}',
        photographer VARCHAR(255),
        photographer_url TEXT,
        license VARCHAR(100),
        license_url TEXT,
        tags JSONB DEFAULT '[]',
        categories JSONB DEFAULT '[]',
        colors JSONB DEFAULT '[]',
        ai_labels JSONB DEFAULT '[]',
        search_vector TEXT,
        ai_prompt TEXT,
        ai_model VARCHAR(100),
        ai_seed VARCHAR(100),
        format VARCHAR(20),
        metadata JSONB DEFAULT '{}',
        usage_count INTEGER DEFAULT 0,
        last_used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log("Creating vams_asset_variants table...");

    // Create vams_asset_variants table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vams_asset_variants (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        asset_id VARCHAR NOT NULL REFERENCES vams_assets(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        url TEXT NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        file_size INTEGER,
        format VARCHAR(20),
        quality INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log("Creating vams_content_assets table...");

    // Create vams_content_assets table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vams_content_assets (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        content_id VARCHAR NOT NULL,
        asset_id VARCHAR NOT NULL REFERENCES vams_assets(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        position INTEGER DEFAULT 0,
        caption TEXT,
        alt_text_override TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log("Creating vams_search_cache table...");

    // Create vams_search_cache table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vams_search_cache (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        provider vams_provider NOT NULL,
        query TEXT NOT NULL,
        query_hash VARCHAR(64) NOT NULL,
        results JSONB NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        hit_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log("Creating indexes...");

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_vams_assets_provider ON vams_assets(provider);
      CREATE INDEX IF NOT EXISTS idx_vams_assets_status ON vams_assets(status);
      CREATE INDEX IF NOT EXISTS idx_vams_variants_asset ON vams_asset_variants(asset_id);
      CREATE INDEX IF NOT EXISTS idx_vams_content_assets_content ON vams_content_assets(content_id);
      CREATE INDEX IF NOT EXISTS idx_vams_search_cache_hash ON vams_search_cache(query_hash);
    `);

    console.log("✅ VAMS tables created successfully!");
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    await pool.end();
    process.exit(1);
  }
}

createVamsTables();
