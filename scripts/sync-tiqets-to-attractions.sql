-- Sync tiqets_attractions -> contents + attractions
-- Step 1: Insert into contents (the parent CMS record)
-- Step 2: Insert into attractions (the type-specific extension)
-- Uses tiqets_attractions.id as the UUID for both contents.id and linking

BEGIN;

-- Step 1: Insert into contents table
-- Use tiqets_attractions.id as contents.id so we can link easily
INSERT INTO contents (id, type, status, title, slug, meta_title, meta_description, summary, hero_image, hero_image_alt, card_image, card_image_alt, seo_score, aeo_score, generated_by_ai, published_at, created_at, updated_at)
SELECT
  ta.id,
  'attraction'::content_type,
  'published'::content_status,
  ta.title,
  ta.slug,
  COALESCE(ta.meta_title, LEFT(ta.title, 60)),
  COALESCE(ta.meta_description, LEFT(ta.tiqets_summary, 160)),
  LEFT(COALESCE(ta.tiqets_summary, ta.description, ta.title), 300),
  -- Extract hero image from tiqets_images JSONB array
  CASE
    WHEN ta.tiqets_images IS NOT NULL AND jsonb_array_length(ta.tiqets_images) > 0
    THEN COALESCE(
      ta.tiqets_images->0->>'large',
      ta.tiqets_images->0->>'extra_large',
      ta.tiqets_images->0->>'medium',
      ta.tiqets_images->0->>'small'
    )
    ELSE NULL
  END,
  ta.title, -- hero_image_alt
  -- Card image (medium size preferred)
  CASE
    WHEN ta.tiqets_images IS NOT NULL AND jsonb_array_length(ta.tiqets_images) > 0
    THEN COALESCE(
      ta.tiqets_images->0->>'medium',
      ta.tiqets_images->0->>'large',
      ta.tiqets_images->0->>'small'
    )
    ELSE NULL
  END,
  ta.title, -- card_image_alt
  COALESCE(ta.seo_score, 0),
  COALESCE(ta.aeo_score, 0),
  true, -- generated_by_ai
  NOW(),
  COALESCE(ta.created_at, NOW()),
  NOW()
FROM tiqets_attractions ta
WHERE ta.id NOT IN (SELECT id FROM contents)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Insert into attractions table
-- Link to contents via content_id, and to destinations via destination_id
INSERT INTO attractions (id, content_id, destination_id, location, category, price_from, duration, highlights, faq, visitor_tips, created_at, updated_at)
SELECT
  gen_random_uuid()::varchar,
  ta.id, -- content_id links to contents.id
  d.id::varchar, -- destination_id from destinations table
  ta.city_name,
  COALESCE(ta.primary_category, 'Attraction'),
  ta.price_usd,
  ta.duration,
  COALESCE(ta.highlights, '[]'::jsonb),
  COALESCE(ta.faqs, '[]'::jsonb),
  CASE
    WHEN ta.ai_content IS NOT NULL AND ta.ai_content->'visitorTips' IS NOT NULL
    THEN ta.ai_content->'visitorTips'
    ELSE '[]'::jsonb
  END,
  COALESCE(ta.created_at, NOW()),
  NOW()
FROM tiqets_attractions ta
LEFT JOIN destinations d ON LOWER(d.name) = LOWER(ta.city_name)
WHERE ta.id NOT IN (SELECT content_id FROM attractions)
ON CONFLICT (id) DO NOTHING;

COMMIT;
