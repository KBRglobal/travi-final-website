-- Migration: Add Editorial Placements System
-- Purpose: Content placement like a real news editor - headlines, featured, rotation

-- Create enums for editorial placements
DO $$ BEGIN
    CREATE TYPE "editorial_zone" AS ENUM (
        'homepage_hero',
        'homepage_featured',
        'homepage_secondary',
        'homepage_sidebar',
        'destination_hero',
        'destination_featured',
        'destination_news',
        'category_hero',
        'category_featured',
        'breaking_news',
        'trending',
        'editor_picks'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "placement_priority" AS ENUM (
        'breaking',
        'headline',
        'featured',
        'standard',
        'filler'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "placement_status" AS ENUM (
        'scheduled',
        'active',
        'rotated_out',
        'expired',
        'manual_removed'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "placement_source" AS ENUM (
        'ai_agent',
        'manual',
        'rule_based',
        'rss_auto'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Editorial Placements Table
CREATE TABLE IF NOT EXISTS "editorial_placements" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "content_id" varchar NOT NULL,
    "zone" "editorial_zone" NOT NULL,
    "destination_id" varchar,
    "category_slug" varchar,
    "priority" "placement_priority" DEFAULT 'standard',
    "position" integer DEFAULT 1,
    "status" "placement_status" DEFAULT 'scheduled',
    "source" "placement_source" DEFAULT 'ai_agent',
    "created_by" varchar,
    "custom_headline" text,
    "custom_headline_he" text,
    "custom_image" text,
    "custom_excerpt" text,
    "custom_excerpt_he" text,
    "is_breaking" boolean DEFAULT false,
    "is_featured" boolean DEFAULT false,
    "is_pinned" boolean DEFAULT false,
    "starts_at" timestamp DEFAULT now(),
    "expires_at" timestamp,
    "rotated_out_at" timestamp,
    "rotated_out_reason" text,
    "impressions" integer DEFAULT 0,
    "clicks" integer DEFAULT 0,
    "ai_decision_data" jsonb,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);

-- Rotation History Table
CREATE TABLE IF NOT EXISTS "editorial_rotation_history" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "placement_id" varchar NOT NULL,
    "content_id_removed" varchar,
    "content_id_added" varchar,
    "zone" "editorial_zone" NOT NULL,
    "rotation_reason" text,
    "triggered_by" varchar,
    "metrics_snapshot" jsonb,
    "created_at" timestamp DEFAULT now()
);

-- Zone Configuration Table
CREATE TABLE IF NOT EXISTS "editorial_zone_config" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "zone" "editorial_zone" NOT NULL UNIQUE,
    "display_name" text NOT NULL,
    "display_name_he" text,
    "description" text,
    "max_items" integer DEFAULT 5,
    "min_items" integer DEFAULT 1,
    "auto_rotate" boolean DEFAULT true,
    "rotation_interval_minutes" integer DEFAULT 240,
    "max_age_hours" integer DEFAULT 48,
    "allowed_content_types" jsonb DEFAULT '["article"]',
    "allowed_categories" jsonb,
    "freshness_weight" integer DEFAULT 30,
    "relevance_weight" integer DEFAULT 30,
    "performance_weight" integer DEFAULT 20,
    "quality_weight" integer DEFAULT 20,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);

-- Schedule Table
CREATE TABLE IF NOT EXISTS "editorial_schedule" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "content_id" varchar NOT NULL,
    "zone" "editorial_zone" NOT NULL,
    "destination_id" varchar,
    "scheduled_at" timestamp NOT NULL,
    "duration_minutes" integer DEFAULT 240,
    "priority" "placement_priority" DEFAULT 'featured',
    "custom_headline" text,
    "custom_image" text,
    "is_executed" boolean DEFAULT false,
    "executed_at" timestamp,
    "placement_id" varchar,
    "scheduled_by" varchar,
    "notes" text,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);

-- Indexes for editorial_placements
CREATE INDEX IF NOT EXISTS "IDX_editorial_placements_zone" ON "editorial_placements" ("zone");
CREATE INDEX IF NOT EXISTS "IDX_editorial_placements_content" ON "editorial_placements" ("content_id");
CREATE INDEX IF NOT EXISTS "IDX_editorial_placements_destination" ON "editorial_placements" ("destination_id");
CREATE INDEX IF NOT EXISTS "IDX_editorial_placements_status" ON "editorial_placements" ("status");
CREATE INDEX IF NOT EXISTS "IDX_editorial_placements_priority" ON "editorial_placements" ("priority");
CREATE INDEX IF NOT EXISTS "IDX_editorial_placements_starts" ON "editorial_placements" ("starts_at");
CREATE INDEX IF NOT EXISTS "IDX_editorial_placements_expires" ON "editorial_placements" ("expires_at");
CREATE UNIQUE INDEX IF NOT EXISTS "IDX_editorial_placements_unique_active" ON "editorial_placements" ("content_id", "zone", "destination_id");

-- Indexes for rotation history
CREATE INDEX IF NOT EXISTS "IDX_editorial_rotation_placement" ON "editorial_rotation_history" ("placement_id");
CREATE INDEX IF NOT EXISTS "IDX_editorial_rotation_zone" ON "editorial_rotation_history" ("zone");
CREATE INDEX IF NOT EXISTS "IDX_editorial_rotation_created" ON "editorial_rotation_history" ("created_at");

-- Index for zone config
CREATE INDEX IF NOT EXISTS "IDX_editorial_zone_config_active" ON "editorial_zone_config" ("is_active");

-- Indexes for schedule
CREATE INDEX IF NOT EXISTS "IDX_editorial_schedule_scheduled" ON "editorial_schedule" ("scheduled_at");
CREATE INDEX IF NOT EXISTS "IDX_editorial_schedule_executed" ON "editorial_schedule" ("is_executed");
CREATE INDEX IF NOT EXISTS "IDX_editorial_schedule_zone" ON "editorial_schedule" ("zone");

-- Insert default zone configurations
INSERT INTO "editorial_zone_config" ("zone", "display_name", "display_name_he", "max_items", "rotation_interval_minutes", "allowed_content_types") VALUES
    ('homepage_hero', 'Homepage Hero', 'גיבור עמוד הבית', 1, 480, '["article", "attraction", "event"]'),
    ('homepage_featured', 'Homepage Featured', 'מומלצים בעמוד הבית', 4, 240, '["article", "attraction", "hotel"]'),
    ('homepage_secondary', 'Homepage Secondary', 'משניים בעמוד הבית', 6, 120, '["article"]'),
    ('breaking_news', 'Breaking News', 'חדשות דחופות', 3, 60, '["article"]'),
    ('trending', 'Trending', 'פופולרי עכשיו', 5, 180, '["article", "attraction"]'),
    ('editor_picks', 'Editor Picks', 'בחירת העורך', 4, 1440, '["article", "attraction", "hotel"]'),
    ('destination_hero', 'Destination Hero', 'גיבור יעד', 1, 480, '["article", "attraction"]'),
    ('destination_featured', 'Destination Featured', 'מומלצים ביעד', 4, 240, '["article", "attraction", "hotel"]'),
    ('destination_news', 'Destination News', 'חדשות יעד', 5, 120, '["article"]')
ON CONFLICT ("zone") DO NOTHING;
