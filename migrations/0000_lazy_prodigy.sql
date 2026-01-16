CREATE TYPE "public"."ab_test_status" AS ENUM('running', 'completed', 'paused');--> statement-breakpoint
CREATE TYPE "public"."ab_test_type" AS ENUM('title', 'heroImage', 'metaDescription');--> statement-breakpoint
CREATE TYPE "public"."activity_type" AS ENUM('content_created', 'content_updated', 'content_published', 'content_deleted', 'comment_added', 'workflow_submitted', 'workflow_approved', 'workflow_rejected', 'user_joined', 'user_updated', 'team_created', 'translation_completed', 'media_uploaded', 'settings_changed', 'login', 'logout');--> statement-breakpoint
CREATE TYPE "public"."analytics_event_type" AS ENUM('page_view', 'click', 'scroll', 'form_start', 'form_submit', 'form_abandon', 'cta_click', 'outbound_link', 'search', 'filter', 'share', 'video_play', 'video_complete', 'download', 'copy', 'print', 'add_to_favorites', 'exit_intent', 'conversion', 'engagement');--> statement-breakpoint
CREATE TYPE "public"."article_category" AS ENUM('attractions', 'hotels', 'food', 'transport', 'events', 'tips', 'news', 'shopping');--> statement-breakpoint
CREATE TYPE "public"."audit_action_type" AS ENUM('create', 'update', 'delete', 'publish', 'unpublish', 'submit_for_review', 'approve', 'reject', 'login', 'logout', 'user_create', 'user_update', 'user_delete', 'role_change', 'settings_change', 'media_upload', 'media_delete', 'restore');--> statement-breakpoint
CREATE TYPE "public"."audit_entity_type" AS ENUM('content', 'user', 'media', 'settings', 'rss_feed', 'affiliate_link', 'translation', 'session', 'tag', 'cluster', 'campaign', 'newsletter_subscriber');--> statement-breakpoint
CREATE TYPE "public"."automation_status" AS ENUM('active', 'inactive', 'draft');--> statement-breakpoint
CREATE TYPE "public"."business_status" AS ENUM('active', 'pending', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."business_tier" AS ENUM('basic', 'premium', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."business_type" AS ENUM('restaurant', 'hotel', 'tour', 'shop', 'service');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'scheduled', 'sending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."content_intent" AS ENUM('informational', 'commercial', 'transactional', 'navigational');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('draft', 'in_review', 'approved', 'scheduled', 'published');--> statement-breakpoint
CREATE TYPE "public"."content_type" AS ENUM('attraction', 'hotel', 'article', 'dining', 'district', 'transport', 'event', 'itinerary', 'landing_page', 'case_study', 'off_plan');--> statement-breakpoint
CREATE TYPE "public"."destination_status" AS ENUM('complete', 'partial', 'empty');--> statement-breakpoint
CREATE TYPE "public"."email_event_type" AS ENUM('sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed');--> statement-breakpoint
CREATE TYPE "public"."homepage_section" AS ENUM('featured', 'attractions', 'hotels', 'articles', 'trending', 'dining', 'events');--> statement-breakpoint
CREATE TYPE "public"."image_rating" AS ENUM('like', 'dislike', 'skip');--> statement-breakpoint
CREATE TYPE "public"."image_source" AS ENUM('gemini', 'openai', 'freepik', 'stock', 'upload');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."job_type" AS ENUM('translate', 'ai_generate', 'email', 'image_process', 'cleanup');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'qualified', 'converted', 'lost');--> statement-breakpoint
CREATE TYPE "public"."lead_type" AS ENUM('inquiry', 'booking_request', 'quote_request', 'contact');--> statement-breakpoint
CREATE TYPE "public"."locale" AS ENUM('en', 'ar', 'hi', 'zh', 'ru', 'ur', 'fr', 'de', 'fa', 'bn', 'fil', 'es', 'tr', 'it', 'ja', 'ko', 'he');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('info', 'success', 'warning', 'error', 'workflow_pending', 'workflow_approved', 'workflow_rejected', 'comment_mention', 'comment_reply', 'content_assigned', 'system');--> statement-breakpoint
CREATE TYPE "public"."page_layout_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."partner_status" AS ENUM('active', 'pending', 'suspended', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."premium_access_type" AS ENUM('one-time', 'subscription');--> statement-breakpoint
CREATE TYPE "public"."property_lead_status" AS ENUM('new', 'contacted', 'qualified', 'negotiating', 'won', 'lost');--> statement-breakpoint
CREATE TYPE "public"."purchase_status" AS ENUM('pending', 'completed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."real_estate_page_category" AS ENUM('guide', 'calculator', 'comparison', 'case_study', 'location', 'developer', 'pillar');--> statement-breakpoint
CREATE TYPE "public"."research_status" AS ENUM('pending', 'analyzing', 'analyzed', 'generating', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."section_type" AS ENUM('hero', 'intro_text', 'highlight_grid', 'filter_bar', 'content_grid', 'cta', 'faq', 'testimonial', 'gallery', 'stats', 'features', 'text_image', 'video', 'newsletter', 'custom');--> statement-breakpoint
CREATE TYPE "public"."sequence_trigger" AS ENUM('signup', 'tag_added', 'inactivity', 'custom');--> statement-breakpoint
CREATE TYPE "public"."social_platform" AS ENUM('linkedin', 'twitter', 'facebook', 'instagram');--> statement-breakpoint
CREATE TYPE "public"."social_post_status" AS ENUM('draft', 'scheduled', 'published', 'failed');--> statement-breakpoint
CREATE TYPE "public"."subscriber_status" AS ENUM('pending_confirmation', 'subscribed', 'unsubscribed', 'bounced', 'complained');--> statement-breakpoint
CREATE TYPE "public"."suggestion_status" AS ENUM('pending', 'approved', 'rejected', 'generating', 'generated', 'published');--> statement-breakpoint
CREATE TYPE "public"."topic_category" AS ENUM('luxury_lifestyle', 'food_dining', 'bizarre_unique', 'experiences_activities', 'money_cost', 'expat_living', 'dark_side', 'myth_busting', 'comparisons', 'records_superlatives', 'future_development', 'seasonal_events', 'practical_tips');--> statement-breakpoint
CREATE TYPE "public"."topic_cluster_status" AS ENUM('pending', 'merged', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."topic_format" AS ENUM('video_tour', 'photo_gallery', 'pov_video', 'cost_breakdown', 'lifestyle_vlog', 'documentary', 'explainer', 'comparison', 'walking_tour', 'food_tour', 'interview', 'tutorial', 'asmr', 'drone_footage', 'night_photography', 'infographic', 'reaction_video', 'challenge', 'list_video', 'guide', 'review');--> statement-breakpoint
CREATE TYPE "public"."topic_type" AS ENUM('trending', 'evergreen', 'seasonal');--> statement-breakpoint
CREATE TYPE "public"."translation_status" AS ENUM('pending', 'in_progress', 'completed', 'needs_review');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'editor', 'author', 'contributor', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."viral_potential" AS ENUM('1', '2', '3', '4', '5');--> statement-breakpoint
CREATE TYPE "public"."webhook_event" AS ENUM('content.created', 'content.updated', 'content.published', 'content.deleted', 'user.created', 'user.updated', 'translation.completed', 'workflow.submitted', 'workflow.approved', 'workflow.rejected', 'comment.created', 'media.uploaded');--> statement-breakpoint
CREATE TYPE "public"."workflow_execution_status" AS ENUM('pending', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."workflow_status" AS ENUM('pending', 'in_progress', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."writer_assignment_priority" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."writer_assignment_status" AS ENUM('pending', 'in_progress', 'review', 'completed', 'published');--> statement-breakpoint
CREATE TABLE "ab_test_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_id" varchar,
	"variant_id" varchar,
	"event_type" text NOT NULL,
	"user_id" varchar,
	"session_id" varchar,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ab_test_variants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_id" varchar,
	"name" text NOT NULL,
	"description" text,
	"config" jsonb NOT NULL,
	"is_control" boolean DEFAULT false NOT NULL,
	"weight" integer DEFAULT 50 NOT NULL,
	"impressions" integer DEFAULT 0,
	"clicks" integer DEFAULT 0,
	"conversions" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ab_tests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" varchar NOT NULL,
	"test_type" "ab_test_type" NOT NULL,
	"variants" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "ab_test_status" DEFAULT 'running' NOT NULL,
	"winner" varchar,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ends_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "activity_type" NOT NULL,
	"actor_id" varchar,
	"target_type" varchar(50),
	"target_id" varchar,
	"target_title" text,
	"metadata" jsonb,
	"team_id" varchar,
	"is_public" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "affiliate_links" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" varchar,
	"provider" text NOT NULL,
	"product_id" text,
	"anchor" text NOT NULL,
	"url" text NOT NULL,
	"placement" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_generated_images" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text NOT NULL,
	"url" text NOT NULL,
	"topic" text NOT NULL,
	"category" text,
	"image_type" text,
	"source" "image_source" DEFAULT 'openai',
	"prompt" text,
	"keywords" jsonb DEFAULT '[]'::jsonb,
	"alt_text" text,
	"alt_text_he" text,
	"caption" text,
	"caption_he" text,
	"ai_quality_score" integer,
	"user_rating" "image_rating",
	"width" integer,
	"height" integer,
	"size" integer,
	"is_approved" boolean DEFAULT false,
	"usage_count" integer DEFAULT 0,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_generation_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_type" varchar NOT NULL,
	"target_id" varchar NOT NULL,
	"provider" varchar NOT NULL,
	"model" varchar NOT NULL,
	"prompt" text,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"success" boolean NOT NULL,
	"error" text,
	"seo_score" integer,
	"quality_tier" varchar,
	"duration" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_writers" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" varchar NOT NULL,
	"avatar" text,
	"nationality" text,
	"age" integer,
	"expertise" text[],
	"personality" text,
	"writing_style" text,
	"voice_characteristics" jsonb DEFAULT '[]'::jsonb,
	"sample_phrases" text[],
	"bio" text,
	"short_bio" text,
	"social_media" jsonb,
	"content_types" text[],
	"languages" text[],
	"is_active" boolean DEFAULT true,
	"article_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "ai_writers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"visitor_id" varchar NOT NULL,
	"event_type" "analytics_event_type" NOT NULL,
	"event_name" varchar,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"page_url" text,
	"page_path" varchar,
	"page_title" varchar,
	"referrer" text,
	"element_id" varchar,
	"element_class" varchar,
	"element_text" text,
	"element_href" text,
	"scroll_depth" integer,
	"viewport_width" integer,
	"viewport_height" integer,
	"click_x" integer,
	"click_y" integer,
	"time_on_page" integer,
	"page_load_time" integer,
	"is_new_session" boolean,
	"is_new_visitor" boolean,
	"user_agent" text,
	"device_type" varchar,
	"browser" varchar,
	"os" varchar,
	"language" varchar,
	"country" varchar,
	"city" varchar,
	"content_id" varchar,
	"content_type" varchar,
	"content_title" varchar,
	"utm_source" varchar,
	"utm_medium" varchar,
	"utm_campaign" varchar,
	"utm_term" varchar,
	"utm_content" varchar,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" varchar NOT NULL,
	"category" "article_category",
	"urgency_level" text,
	"target_audience" jsonb DEFAULT '[]'::jsonb,
	"personality" text,
	"tone" text,
	"source_rss_feed_id" varchar,
	"source_url" text,
	"quick_facts" jsonb DEFAULT '[]'::jsonb,
	"pro_tips" jsonb DEFAULT '[]'::jsonb,
	"warnings" jsonb DEFAULT '[]'::jsonb,
	"faq" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "attractions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" varchar NOT NULL,
	"location" text,
	"category" text,
	"price_from" text,
	"duration" text,
	"target_audience" jsonb DEFAULT '[]'::jsonb,
	"primary_cta" text,
	"intro_text" text,
	"expanded_intro_text" text,
	"quick_info_bar" jsonb DEFAULT '[]'::jsonb,
	"highlights" jsonb DEFAULT '[]'::jsonb,
	"ticket_info" jsonb DEFAULT '[]'::jsonb,
	"essential_info" jsonb DEFAULT '[]'::jsonb,
	"visitor_tips" jsonb DEFAULT '[]'::jsonb,
	"gallery" jsonb DEFAULT '[]'::jsonb,
	"experience_steps" jsonb DEFAULT '[]'::jsonb,
	"insider_tips" jsonb DEFAULT '[]'::jsonb,
	"faq" jsonb DEFAULT '[]'::jsonb,
	"related_attractions" jsonb DEFAULT '[]'::jsonb,
	"trust_signals" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"user_id" varchar,
	"user_name" text,
	"user_role" text,
	"action_type" "audit_action_type" NOT NULL,
	"entity_type" "audit_entity_type" NOT NULL,
	"entity_id" varchar,
	"description" text NOT NULL,
	"before_state" jsonb,
	"after_state" jsonb,
	"ip_address" varchar,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "automated_sequences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"trigger" "sequence_trigger" NOT NULL,
	"trigger_value" varchar,
	"emails" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "background_jobs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "job_type" NOT NULL,
	"status" "job_status" DEFAULT 'pending' NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result" jsonb,
	"error" text,
	"retries" integer DEFAULT 0 NOT NULL,
	"max_retries" integer DEFAULT 3 NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "behavioral_triggers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"event_type" varchar NOT NULL,
	"event_conditions" jsonb DEFAULT '{}'::jsonb,
	"email_template_id" varchar,
	"email_subject" varchar NOT NULL,
	"email_content" text NOT NULL,
	"cooldown_hours" integer DEFAULT 24,
	"is_active" boolean DEFAULT true,
	"trigger_count" integer DEFAULT 0,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "business_listings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_name" varchar NOT NULL,
	"business_type" "business_type" NOT NULL,
	"contact_email" varchar NOT NULL,
	"contact_phone" varchar,
	"website" varchar,
	"content_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tier" "business_tier" DEFAULT 'basic' NOT NULL,
	"status" "business_status" DEFAULT 'pending' NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"monthly_price" integer DEFAULT 0 NOT NULL,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"end_date" timestamp,
	"impressions" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"leads" integer DEFAULT 0 NOT NULL,
	"conversions" integer DEFAULT 0 NOT NULL,
	"settings" jsonb DEFAULT '{"showPhone":true,"showEmail":true,"enableLeadForm":true,"enableBookingWidget":false,"featuredPlacement":false}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "campaign_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" varchar NOT NULL,
	"subscriber_id" varchar,
	"event_type" "email_event_type" NOT NULL,
	"metadata" jsonb,
	"ip_address" varchar,
	"user_agent" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cluster_members" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cluster_id" varchar NOT NULL,
	"content_id" varchar NOT NULL,
	"position" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cohorts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"cohort_type" varchar NOT NULL,
	"date_range" jsonb NOT NULL,
	"criteria" jsonb DEFAULT '{}'::jsonb,
	"user_count" integer DEFAULT 0,
	"retention_data" jsonb DEFAULT '{}'::jsonb,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" varchar NOT NULL,
	"parent_id" varchar,
	"author_id" varchar NOT NULL,
	"body" text NOT NULL,
	"mentions" jsonb DEFAULT '[]'::jsonb,
	"is_resolved" boolean DEFAULT false,
	"resolved_by" varchar,
	"resolved_at" timestamp,
	"edited_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "content_calendar_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" varchar,
	"title" varchar NOT NULL,
	"content_type" varchar NOT NULL,
	"scheduled_date" timestamp NOT NULL,
	"status" varchar DEFAULT 'scheduled',
	"ai_suggestion" boolean DEFAULT false,
	"ai_reason" text,
	"priority" integer DEFAULT 5,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "content_clusters" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"pillar_content_id" varchar,
	"primary_keyword" text,
	"color" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "content_clusters_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "content_fingerprints" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" varchar,
	"fingerprint" text NOT NULL,
	"source_url" text,
	"source_title" text,
	"rss_feed_id" varchar,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "content_fingerprints_fingerprint_unique" UNIQUE("fingerprint")
);
--> statement-breakpoint
CREATE TABLE "content_locks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"locked_at" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "content_purchases" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"content_id" varchar NOT NULL,
	"amount" integer NOT NULL,
	"currency" varchar DEFAULT 'USD' NOT NULL,
	"payment_method" varchar NOT NULL,
	"payment_id" varchar,
	"status" "purchase_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "content_rules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"min_words" integer DEFAULT 1800 NOT NULL,
	"max_words" integer DEFAULT 3500 NOT NULL,
	"optimal_min_words" integer DEFAULT 2000 NOT NULL,
	"optimal_max_words" integer DEFAULT 2500 NOT NULL,
	"intro_min_words" integer DEFAULT 150 NOT NULL,
	"intro_max_words" integer DEFAULT 200 NOT NULL,
	"quick_facts_min" integer DEFAULT 5 NOT NULL,
	"quick_facts_max" integer DEFAULT 8 NOT NULL,
	"quick_facts_words_min" integer DEFAULT 80 NOT NULL,
	"quick_facts_words_max" integer DEFAULT 120 NOT NULL,
	"main_sections_min" integer DEFAULT 4 NOT NULL,
	"main_sections_max" integer DEFAULT 6 NOT NULL,
	"main_section_words_min" integer DEFAULT 200 NOT NULL,
	"main_section_words_max" integer DEFAULT 300 NOT NULL,
	"faqs_min" integer DEFAULT 6 NOT NULL,
	"faqs_max" integer DEFAULT 10 NOT NULL,
	"faq_answer_words_min" integer DEFAULT 50 NOT NULL,
	"faq_answer_words_max" integer DEFAULT 100 NOT NULL,
	"pro_tips_min" integer DEFAULT 5 NOT NULL,
	"pro_tips_max" integer DEFAULT 8 NOT NULL,
	"pro_tip_words_min" integer DEFAULT 20 NOT NULL,
	"pro_tip_words_max" integer DEFAULT 35 NOT NULL,
	"conclusion_min_words" integer DEFAULT 100 NOT NULL,
	"conclusion_max_words" integer DEFAULT 150 NOT NULL,
	"internal_links_min" integer DEFAULT 5 NOT NULL,
	"internal_links_max" integer DEFAULT 10 NOT NULL,
	"keyword_density_min" integer DEFAULT 1 NOT NULL,
	"keyword_density_max" integer DEFAULT 3 NOT NULL,
	"dubai_mentions_min" integer DEFAULT 5 NOT NULL,
	"max_retries" integer DEFAULT 3 NOT NULL,
	"content_type" "content_type",
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "content_rules_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "content_scores" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" varchar,
	"overall_score" integer,
	"readability_score" integer,
	"seo_score" integer,
	"engagement_score" integer,
	"originality_score" integer,
	"structure_score" integer,
	"feedback" jsonb DEFAULT '[]'::jsonb,
	"suggestions" jsonb DEFAULT '[]'::jsonb,
	"analysis" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "content_suggestions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"research_id" varchar NOT NULL,
	"suggested_title" varchar NOT NULL,
	"suggested_slug" varchar,
	"content_type" "content_type" NOT NULL,
	"category" varchar,
	"destination_city" varchar,
	"destination_id" varchar,
	"summary" text,
	"key_points" jsonb,
	"keywords" jsonb,
	"source_excerpt" text,
	"priority" integer DEFAULT 50,
	"confidence" integer DEFAULT 80,
	"is_duplicate" boolean DEFAULT false,
	"duplicate_of_id" varchar,
	"status" "suggestion_status" DEFAULT 'pending' NOT NULL,
	"generated_content_id" varchar,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "content_tags" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" varchar NOT NULL,
	"tag_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "content_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"content_type" "content_type" NOT NULL,
	"blocks" jsonb DEFAULT '[]'::jsonb,
	"extension_defaults" jsonb,
	"seo_defaults" jsonb,
	"is_public" boolean DEFAULT false,
	"usage_count" integer DEFAULT 0,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "content_versions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" varchar NOT NULL,
	"version_number" integer NOT NULL,
	"title" text NOT NULL,
	"slug" text,
	"meta_title" text,
	"meta_description" text,
	"primary_keyword" text,
	"hero_image" text,
	"hero_image_alt" text,
	"blocks" jsonb DEFAULT '[]'::jsonb,
	"changed_by" varchar,
	"change_note" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "content_views" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" varchar NOT NULL,
	"viewed_at" timestamp DEFAULT now(),
	"user_agent" text,
	"referrer" text,
	"session_id" varchar,
	"country" varchar,
	"city" varchar
);
--> statement-breakpoint
CREATE TABLE "contents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "content_type" NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"meta_title" text,
	"meta_description" text,
	"primary_keyword" text,
	"secondary_keywords" jsonb DEFAULT '[]'::jsonb,
	"lsi_keywords" jsonb DEFAULT '[]'::jsonb,
	"hero_image" text,
	"hero_image_alt" text,
	"blocks" jsonb DEFAULT '[]'::jsonb,
	"seo_schema" jsonb,
	"seo_score" integer,
	"word_count" integer DEFAULT 0,
	"view_count" integer DEFAULT 0,
	"author_id" varchar,
	"writer_id" varchar,
	"generated_by_ai" boolean DEFAULT false,
	"writer_voice_score" integer,
	"intent" "content_intent",
	"parent_id" varchar,
	"canonical_content_id" varchar,
	"scheduled_at" timestamp,
	"published_at" timestamp,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "contents_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "conversion_funnels" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"total_entries" integer DEFAULT 0,
	"total_conversions" integer DEFAULT 0,
	"conversion_rate" integer DEFAULT 0,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "custom_reports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"report_type" varchar NOT NULL,
	"metrics" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"dimensions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"filters" jsonb DEFAULT '{}'::jsonb,
	"date_range" jsonb NOT NULL,
	"visualization" jsonb NOT NULL,
	"is_public" boolean DEFAULT false,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "data_exports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"destination" varchar NOT NULL,
	"connection_id" varchar,
	"data_source" varchar NOT NULL,
	"schedule" varchar NOT NULL,
	"schedule_config" jsonb DEFAULT '{}'::jsonb,
	"schema_mapping" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_incremental" boolean DEFAULT true,
	"last_export_at" timestamp,
	"next_export_at" timestamp NOT NULL,
	"last_export_status" varchar,
	"last_export_error" text,
	"export_count" integer DEFAULT 0,
	"records_exported" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "destination_content" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"destination_id" varchar NOT NULL,
	"content_type" varchar NOT NULL,
	"content" jsonb NOT NULL,
	"seo_validation" jsonb,
	"quality_score" integer DEFAULT 0,
	"quality_tier" varchar,
	"generated_by" varchar,
	"generated_model" varchar,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "destinations" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"country" varchar NOT NULL,
	"slug" varchar NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"status" "destination_status" DEFAULT 'empty' NOT NULL,
	"has_page" boolean DEFAULT false NOT NULL,
	"seo_score" integer DEFAULT 0 NOT NULL,
	"word_count" integer DEFAULT 0 NOT NULL,
	"internal_links" integer DEFAULT 0 NOT NULL,
	"external_links" integer DEFAULT 0 NOT NULL,
	"h2_count" integer DEFAULT 0 NOT NULL,
	"meta_title" varchar,
	"meta_description" text,
	"primary_keyword" varchar,
	"secondary_keywords" text[],
	"hero_image" text,
	"hero_image_alt" text,
	"images" jsonb DEFAULT '[]'::jsonb,
	"translations" jsonb DEFAULT '{}'::jsonb,
	"last_generated" timestamp,
	"last_published" timestamp,
	"last_image_generated" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dining" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" varchar NOT NULL,
	"location" text,
	"cuisine_type" text,
	"price_range" text,
	"target_audience" jsonb DEFAULT '[]'::jsonb,
	"primary_cta" text,
	"quick_info_bar" jsonb DEFAULT '[]'::jsonb,
	"highlights" jsonb DEFAULT '[]'::jsonb,
	"menu_highlights" jsonb DEFAULT '[]'::jsonb,
	"essential_info" jsonb DEFAULT '[]'::jsonb,
	"dining_tips" jsonb DEFAULT '[]'::jsonb,
	"faq" jsonb DEFAULT '[]'::jsonb,
	"related_dining" jsonb DEFAULT '[]'::jsonb,
	"photo_gallery" jsonb DEFAULT '[]'::jsonb,
	"trust_signals" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "districts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" varchar NOT NULL,
	"location" text,
	"neighborhood" text,
	"subcategory" text,
	"target_audience" jsonb DEFAULT '[]'::jsonb,
	"primary_cta" text,
	"intro_text" text,
	"expanded_intro_text" text,
	"quick_info_bar" jsonb DEFAULT '[]'::jsonb,
	"highlights" jsonb DEFAULT '[]'::jsonb,
	"things_to_do" jsonb DEFAULT '[]'::jsonb,
	"attractions_grid" jsonb DEFAULT '[]'::jsonb,
	"dining_highlights" jsonb DEFAULT '[]'::jsonb,
	"real_estate_info" jsonb,
	"essential_info" jsonb DEFAULT '[]'::jsonb,
	"local_tips" jsonb DEFAULT '[]'::jsonb,
	"faq" jsonb DEFAULT '[]'::jsonb,
	"related_districts" jsonb DEFAULT '[]'::jsonb,
	"photo_gallery" jsonb DEFAULT '[]'::jsonb,
	"trust_signals" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "drip_campaign_enrollments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" varchar NOT NULL,
	"subscriber_id" varchar NOT NULL,
	"current_step" integer DEFAULT 0,
	"status" varchar DEFAULT 'active',
	"enrolled_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"next_email_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "drip_campaign_steps" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" varchar NOT NULL,
	"step_number" integer NOT NULL,
	"delay_amount" integer NOT NULL,
	"delay_unit" varchar DEFAULT 'days' NOT NULL,
	"subject" varchar NOT NULL,
	"html_content" text NOT NULL,
	"plain_text_content" text,
	"skip_conditions" jsonb DEFAULT '[]'::jsonb,
	"exit_conditions" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "drip_campaigns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"trigger_type" varchar NOT NULL,
	"trigger_value" varchar,
	"is_active" boolean DEFAULT true,
	"enrollment_count" integer DEFAULT 0,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "editable_pages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(255) NOT NULL,
	"page_type" varchar(50) NOT NULL,
	"title" text NOT NULL,
	"title_he" text,
	"meta_title" text,
	"meta_title_he" text,
	"meta_description" text,
	"meta_description_he" text,
	"is_published" boolean DEFAULT false,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"last_edited_by" varchar,
	CONSTRAINT "editable_pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "email_template_blocks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" varchar NOT NULL,
	"type" varchar NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"content" jsonb DEFAULT '{}'::jsonb,
	"styles" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"subject" varchar,
	"html_content" text,
	"plain_text_content" text,
	"category" varchar DEFAULT 'general',
	"thumbnail_url" text,
	"variables" jsonb DEFAULT '[]'::jsonb,
	"is_prebuilt" boolean DEFAULT false,
	"usage_count" integer DEFAULT 0,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" varchar NOT NULL,
	"event_date" timestamp,
	"end_date" timestamp,
	"venue" text,
	"venue_address" text,
	"ticket_url" text,
	"ticket_price" text,
	"is_featured" boolean DEFAULT false,
	"is_recurring" boolean DEFAULT false,
	"recurrence_pattern" text,
	"target_audience" jsonb DEFAULT '[]'::jsonb,
	"organizer" text,
	"contact_email" text,
	"faq" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "footer_links" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" varchar NOT NULL,
	"label" text NOT NULL,
	"label_he" text,
	"href" text NOT NULL,
	"icon" text,
	"open_in_new_tab" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "footer_sections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"title_he" text,
	"slug" varchar NOT NULL,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "footer_sections_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "funnel_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"funnel_id" varchar NOT NULL,
	"session_id" varchar NOT NULL,
	"visitor_id" varchar NOT NULL,
	"current_step" integer NOT NULL,
	"completed" boolean DEFAULT false,
	"dropped_at_step" integer,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "funnel_steps" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"funnel_id" varchar NOT NULL,
	"step_number" integer NOT NULL,
	"name" varchar NOT NULL,
	"match_type" varchar DEFAULT 'url',
	"match_value" varchar NOT NULL,
	"entry_count" integer DEFAULT 0,
	"exit_count" integer DEFAULT 0,
	"conversion_count" integer DEFAULT 0,
	"dropoff_rate" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "homepage_promotions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section" "homepage_section" NOT NULL,
	"content_id" varchar,
	"position" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"custom_title" text,
	"custom_image" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "homepage_sections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_type" text NOT NULL,
	"title" text,
	"title_he" text,
	"subtitle" text,
	"subtitle_he" text,
	"content" jsonb DEFAULT '{}'::jsonb,
	"background_image" text,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hotels" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" varchar NOT NULL,
	"location" text,
	"star_rating" integer,
	"number_of_rooms" integer,
	"amenities" jsonb DEFAULT '[]'::jsonb,
	"target_audience" jsonb DEFAULT '[]'::jsonb,
	"primary_cta" text,
	"quick_info_bar" jsonb DEFAULT '[]'::jsonb,
	"highlights" jsonb DEFAULT '[]'::jsonb,
	"room_types" jsonb DEFAULT '[]'::jsonb,
	"essential_info" jsonb DEFAULT '[]'::jsonb,
	"dining_preview" jsonb DEFAULT '[]'::jsonb,
	"activities" jsonb DEFAULT '[]'::jsonb,
	"traveler_tips" jsonb DEFAULT '[]'::jsonb,
	"faq" jsonb DEFAULT '[]'::jsonb,
	"location_nearby" jsonb DEFAULT '[]'::jsonb,
	"related_hotels" jsonb DEFAULT '[]'::jsonb,
	"photo_gallery" jsonb DEFAULT '[]'::jsonb,
	"trust_signals" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "image_collections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"cover_image_id" varchar,
	"image_ids" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "integration_connections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar NOT NULL,
	"name" varchar NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar DEFAULT 'active',
	"last_sync_at" timestamp,
	"sync_frequency" varchar DEFAULT 'manual',
	"error_message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "internal_links" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_content_id" varchar,
	"target_content_id" varchar,
	"anchor_text" text,
	"is_auto_suggested" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "itineraries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" varchar NOT NULL,
	"duration" text,
	"total_price" text,
	"difficulty_level" text,
	"target_audience" jsonb DEFAULT '[]'::jsonb,
	"highlights" jsonb DEFAULT '[]'::jsonb,
	"included_items" jsonb DEFAULT '[]'::jsonb,
	"excluded_items" jsonb DEFAULT '[]'::jsonb,
	"day_plan" jsonb DEFAULT '[]'::jsonb,
	"primary_cta" text,
	"faq" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "journey_touchpoints" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journey_id" varchar NOT NULL,
	"step_number" integer NOT NULL,
	"page_url" varchar NOT NULL,
	"page_title" varchar,
	"event_type" varchar,
	"time_on_page" integer,
	"scroll_depth" integer,
	"interaction_data" jsonb DEFAULT '{}'::jsonb,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "keyword_repository" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"keyword" text NOT NULL,
	"type" text NOT NULL,
	"category" text,
	"search_volume" text,
	"competition" text,
	"related_keywords" jsonb DEFAULT '[]'::jsonb,
	"usage_count" integer DEFAULT 0,
	"priority" integer DEFAULT 0,
	"notes" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "keyword_repository_keyword_unique" UNIQUE("keyword")
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" varchar NOT NULL,
	"content_id" varchar NOT NULL,
	"type" "lead_type" NOT NULL,
	"name" varchar NOT NULL,
	"email" varchar NOT NULL,
	"phone" varchar,
	"message" text,
	"check_in" timestamp,
	"check_out" timestamp,
	"guests" integer,
	"budget" varchar,
	"source" varchar NOT NULL,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "magic_link_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"token" varchar NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "magic_link_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "media_files" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"url" text NOT NULL,
	"alt_text" text,
	"width" integer,
	"height" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "navigation_menu_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"menu_id" varchar NOT NULL,
	"parent_id" varchar,
	"label" text NOT NULL,
	"label_he" text,
	"href" text NOT NULL,
	"icon" text,
	"open_in_new_tab" boolean DEFAULT false,
	"is_highlighted" boolean DEFAULT false,
	"highlight_style" text,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "navigation_menus" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" varchar NOT NULL,
	"location" text DEFAULT 'header' NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "navigation_menus_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "newsletter_ab_tests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"campaign_id" varchar,
	"test_type" varchar NOT NULL,
	"variant_a" jsonb NOT NULL,
	"variant_b" jsonb NOT NULL,
	"split_percentage" integer DEFAULT 50,
	"test_duration_hours" integer DEFAULT 24,
	"auto_select_winner" boolean DEFAULT true,
	"winner_metric" varchar DEFAULT 'open_rate',
	"status" varchar DEFAULT 'running',
	"winner_id" varchar,
	"stats_a" jsonb DEFAULT '{"sent":0,"opened":0,"clicked":0,"bounced":0}'::jsonb,
	"stats_b" jsonb DEFAULT '{"sent":0,"opened":0,"clicked":0,"bounced":0}'::jsonb,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "newsletter_campaigns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"subject" varchar NOT NULL,
	"subject_he" varchar,
	"preview_text" varchar,
	"preview_text_he" varchar,
	"html_content" text NOT NULL,
	"html_content_he" text,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"target_tags" jsonb,
	"target_locales" jsonb,
	"scheduled_at" timestamp,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" varchar,
	"total_recipients" integer DEFAULT 0,
	"total_sent" integer DEFAULT 0,
	"total_opened" integer DEFAULT 0,
	"total_clicked" integer DEFAULT 0,
	"total_bounced" integer DEFAULT 0,
	"total_unsubscribed" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"first_name" varchar,
	"last_name" varchar,
	"locale" varchar DEFAULT 'en',
	"language_preference" varchar DEFAULT 'en',
	"source" varchar DEFAULT 'coming_soon',
	"status" "subscriber_status" DEFAULT 'pending_confirmation' NOT NULL,
	"ip_address" varchar,
	"confirm_token" varchar,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"interest_tags" jsonb DEFAULT '[]'::jsonb,
	"preferences" jsonb DEFAULT '{"frequency":"weekly","categories":[]}'::jsonb,
	"subscribed_at" timestamp DEFAULT now(),
	"confirmed_at" timestamp,
	"unsubscribed_at" timestamp,
	"last_email_at" timestamp,
	"emails_received" integer DEFAULT 0,
	"emails_opened" integer DEFAULT 0,
	"emails_clicked" integer DEFAULT 0,
	"emails_bounced" integer DEFAULT 0,
	"bounce_reason" text,
	"last_bounce_at" timestamp,
	"consent_log" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "newsletter_subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"type" "notification_type" DEFAULT 'info',
	"title" text NOT NULL,
	"message" text,
	"link" text,
	"metadata" jsonb,
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "otp_codes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"code" varchar(6) NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "page_layouts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar NOT NULL,
	"title" text,
	"components" jsonb DEFAULT '[]'::jsonb,
	"draft_components" jsonb,
	"status" "page_layout_status" DEFAULT 'draft',
	"published_at" timestamp,
	"draft_updated_at" timestamp,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "page_layouts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "page_sections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" varchar NOT NULL,
	"section_type" text NOT NULL,
	"section_key" varchar(100),
	"title" text,
	"subtitle" text,
	"description" text,
	"button_text" text,
	"button_link" text,
	"title_he" text,
	"subtitle_he" text,
	"description_he" text,
	"button_text_he" text,
	"background_image" text,
	"background_video" text,
	"images" jsonb DEFAULT '[]'::jsonb,
	"data" jsonb DEFAULT '{}'::jsonb,
	"data_he" jsonb DEFAULT '{}'::jsonb,
	"background_color" varchar(50),
	"text_color" varchar(50),
	"custom_css" text,
	"animation" varchar(50),
	"sort_order" integer DEFAULT 0,
	"is_visible" boolean DEFAULT true,
	"show_on_mobile" boolean DEFAULT true,
	"show_on_desktop" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"last_edited_by" varchar
);
--> statement-breakpoint
CREATE TABLE "partners" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" varchar NOT NULL,
	"company_name" text,
	"website" text,
	"commission_rate" integer NOT NULL,
	"status" "partner_status" DEFAULT 'pending' NOT NULL,
	"tracking_code" varchar NOT NULL,
	"payment_details" jsonb,
	"total_earnings" integer DEFAULT 0,
	"total_clicks" integer DEFAULT 0,
	"total_conversions" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "partners_email_unique" UNIQUE("email"),
	CONSTRAINT "partners_tracking_code_unique" UNIQUE("tracking_code")
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" varchar,
	"amount" integer NOT NULL,
	"currency" varchar DEFAULT 'USD' NOT NULL,
	"status" "payout_status" DEFAULT 'pending' NOT NULL,
	"method" text,
	"reference_id" text,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "premium_content" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" varchar NOT NULL,
	"is_premium" boolean DEFAULT true NOT NULL,
	"preview_percentage" integer DEFAULT 20 NOT NULL,
	"price" integer NOT NULL,
	"currency" varchar DEFAULT 'USD' NOT NULL,
	"access_type" "premium_access_type" DEFAULT 'one-time' NOT NULL,
	"subscription_tier" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "premium_content_content_id_unique" UNIQUE("content_id")
);
--> statement-breakpoint
CREATE TABLE "property_leads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"name" varchar NOT NULL,
	"phone" varchar,
	"property_type" varchar,
	"budget" varchar,
	"payment_method" varchar,
	"preferred_areas" text[],
	"timeline" varchar,
	"message" text,
	"source" varchar DEFAULT 'off-plan-form',
	"status" "property_lead_status" DEFAULT 'new' NOT NULL,
	"ip_address" varchar,
	"user_agent" text,
	"consent_given" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh_key" text NOT NULL,
	"auth_key" text NOT NULL,
	"user_id" varchar,
	"locale" varchar DEFAULT 'en' NOT NULL,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"reset_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "rate_limits_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "real_estate_pages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_key" varchar NOT NULL,
	"category" real_estate_page_category NOT NULL,
	"title" text NOT NULL,
	"meta_title" text,
	"meta_description" text,
	"hero_title" text,
	"hero_subtitle" text,
	"intro_text" text,
	"sections" jsonb DEFAULT '[]'::jsonb,
	"faqs" jsonb DEFAULT '[]'::jsonb,
	"related_links" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_edited_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "real_estate_pages_page_key_unique" UNIQUE("page_key")
);
--> statement-breakpoint
CREATE TABLE "realtime_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"visitor_id" varchar NOT NULL,
	"current_page" varchar,
	"current_page_title" varchar,
	"referrer" text,
	"device_type" varchar,
	"browser" varchar,
	"os" varchar,
	"country" varchar,
	"city" varchar,
	"is_active" boolean DEFAULT true,
	"last_activity_at" timestamp DEFAULT now(),
	"started_at" timestamp DEFAULT now(),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	CONSTRAINT "realtime_sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "research_uploads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar NOT NULL,
	"source_type" varchar DEFAULT 'paste' NOT NULL,
	"content" text NOT NULL,
	"status" "research_status" DEFAULT 'pending' NOT NULL,
	"metadata" jsonb,
	"analyzed_at" timestamp,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rss_feeds" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"category" "article_category",
	"is_active" boolean DEFAULT true,
	"last_fetched_at" timestamp,
	"fetch_interval_minutes" integer DEFAULT 60,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scheduled_reports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"report_type" varchar NOT NULL,
	"schedule" varchar NOT NULL,
	"schedule_config" jsonb NOT NULL,
	"recipients" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"format" varchar DEFAULT 'pdf',
	"filters" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true,
	"last_run_at" timestamp,
	"next_run_at" timestamp NOT NULL,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scheduled_tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(50) NOT NULL,
	"target_type" varchar(50) NOT NULL,
	"target_id" varchar NOT NULL,
	"scheduled_for" timestamp NOT NULL,
	"payload" jsonb,
	"status" varchar(20) DEFAULT 'pending',
	"error" text,
	"created_by" varchar,
	"executed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "search_index" (
	"content_id" varchar PRIMARY KEY NOT NULL,
	"title" varchar NOT NULL,
	"content_type" varchar NOT NULL,
	"meta_description" text,
	"searchable_text" text,
	"url" varchar NOT NULL,
	"image" varchar,
	"locale" varchar DEFAULT 'en' NOT NULL,
	"tags" text,
	"embedding" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_queries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"query" varchar NOT NULL,
	"results_count" integer DEFAULT 0 NOT NULL,
	"clicked_result_id" varchar,
	"locale" varchar DEFAULT 'en' NOT NULL,
	"session_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "section_versions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" varchar NOT NULL,
	"version_number" integer NOT NULL,
	"data" jsonb NOT NULL,
	"changed_by" varchar,
	"change_description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "segment_conditions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"segment_id" varchar NOT NULL,
	"field" varchar NOT NULL,
	"operator" varchar NOT NULL,
	"value" jsonb NOT NULL,
	"logic_operator" varchar DEFAULT 'AND',
	"order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "seo_analysis_results" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" varchar NOT NULL,
	"overall_score" integer NOT NULL,
	"title_score" integer,
	"meta_description_score" integer,
	"keyword_score" integer,
	"content_score" integer,
	"readability_score" integer,
	"technical_score" integer,
	"issues" jsonb DEFAULT '[]'::jsonb,
	"suggestions" jsonb DEFAULT '[]'::jsonb,
	"analyzed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar NOT NULL,
	"value" jsonb,
	"category" varchar NOT NULL,
	"description" text,
	"updated_by" varchar,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "site_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "social_analytics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" varchar,
	"campaign_id" varchar,
	"platform" "social_platform" NOT NULL,
	"impressions" integer DEFAULT 0,
	"reach" integer DEFAULT 0,
	"clicks" integer DEFAULT 0,
	"likes" integer DEFAULT 0,
	"comments" integer DEFAULT 0,
	"shares" integer DEFAULT 0,
	"saves" integer DEFAULT 0,
	"engagement_rate" varchar,
	"linkedin_reactions" jsonb,
	"fetched_at" timestamp DEFAULT now(),
	"period_start" timestamp,
	"period_end" timestamp
);
--> statement-breakpoint
CREATE TABLE "social_campaigns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"start_date" timestamp,
	"end_date" timestamp,
	"status" varchar DEFAULT 'active' NOT NULL,
	"target_platforms" jsonb DEFAULT '[]'::jsonb,
	"goals" jsonb,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "social_credentials" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"platform" "social_platform" NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"token_expires_at" timestamp,
	"platform_user_id" varchar,
	"platform_username" varchar,
	"profile_url" varchar,
	"is_active" boolean DEFAULT true,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "social_posts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" varchar,
	"content_id" varchar,
	"platform" "social_platform" NOT NULL,
	"status" "social_post_status" DEFAULT 'draft' NOT NULL,
	"text" text NOT NULL,
	"text_he" text,
	"media_urls" jsonb DEFAULT '[]'::jsonb,
	"link_url" varchar,
	"hashtags" jsonb DEFAULT '[]'::jsonb,
	"scheduled_at" timestamp,
	"published_at" timestamp,
	"platform_post_id" varchar,
	"platform_data" jsonb,
	"generated_by_ai" boolean DEFAULT false,
	"source_prompt" text,
	"error_message" text,
	"retry_count" integer DEFAULT 0,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "static_pages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar NOT NULL,
	"title" text NOT NULL,
	"title_he" text,
	"meta_title" text,
	"meta_description" text,
	"content" text,
	"content_he" text,
	"blocks" jsonb DEFAULT '[]'::jsonb,
	"translations" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true,
	"show_in_footer" boolean DEFAULT false,
	"last_edited_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "static_pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "subscriber_segments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"is_dynamic" boolean DEFAULT true,
	"subscriber_count" integer DEFAULT 0,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"color" varchar,
	"usage_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "tags_name_unique" UNIQUE("name"),
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"role" varchar(50) DEFAULT 'member',
	"joined_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"parent_id" varchar,
	"color" varchar(7),
	"icon" varchar(50),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "teams_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "topic_bank" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"headline_angle" text,
	"category" "article_category",
	"main_category" "topic_category",
	"viral_potential" "viral_potential" DEFAULT '3',
	"format" "topic_format",
	"topic_type" "topic_type" DEFAULT 'evergreen',
	"keywords" jsonb DEFAULT '[]'::jsonb,
	"outline" text,
	"priority" integer DEFAULT 0,
	"last_used" timestamp,
	"times_used" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "topic_cluster_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cluster_id" varchar NOT NULL,
	"content_id" varchar,
	"rss_feed_id" varchar,
	"source_url" text,
	"source_title" text NOT NULL,
	"source_description" text,
	"pub_date" timestamp,
	"is_used_in_merge" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "topic_clusters" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic" text NOT NULL,
	"status" "topic_cluster_status" DEFAULT 'pending' NOT NULL,
	"merged_content_id" varchar,
	"similarity_score" integer,
	"article_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "translation_batch_jobs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"batch_id" varchar,
	"requests" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"results" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "translations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" varchar NOT NULL,
	"locale" "locale" NOT NULL,
	"status" "translation_status" DEFAULT 'pending' NOT NULL,
	"title" text,
	"meta_title" text,
	"meta_description" text,
	"blocks" jsonb DEFAULT '[]'::jsonb,
	"translated_by" varchar,
	"reviewed_by" varchar,
	"source_hash" varchar,
	"is_manual_override" boolean DEFAULT false,
	"translation_provider" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" varchar NOT NULL,
	"transit_mode" text,
	"route_info" text,
	"target_audience" jsonb DEFAULT '[]'::jsonb,
	"primary_cta" text,
	"quick_info_bar" jsonb DEFAULT '[]'::jsonb,
	"highlights" jsonb DEFAULT '[]'::jsonb,
	"fare_info" jsonb DEFAULT '[]'::jsonb,
	"essential_info" jsonb DEFAULT '[]'::jsonb,
	"travel_tips" jsonb DEFAULT '[]'::jsonb,
	"faq" jsonb DEFAULT '[]'::jsonb,
	"related_transport" jsonb DEFAULT '[]'::jsonb,
	"trust_signals" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "two_factor_secrets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"secret" varchar NOT NULL,
	"backup_codes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "two_factor_secrets_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "ui_translations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"locale" "locale" NOT NULL,
	"value" text NOT NULL,
	"namespace" varchar DEFAULT 'common',
	"is_manual_override" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_journeys" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"visitor_id" varchar NOT NULL,
	"start_page" varchar NOT NULL,
	"end_page" varchar,
	"touchpoint_count" integer DEFAULT 0,
	"duration_seconds" integer DEFAULT 0,
	"converted" boolean DEFAULT false,
	"conversion_type" varchar,
	"conversion_value" integer,
	"utm_source" varchar,
	"utm_medium" varchar,
	"utm_campaign" varchar,
	"device_type" varchar,
	"started_at" timestamp DEFAULT now(),
	"ended_at" timestamp,
	CONSTRAINT "user_journeys_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar,
	"password_hash" varchar,
	"email" varchar,
	"name" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"role" "user_role" DEFAULT 'editor' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"totp_secret" varchar,
	"totp_enabled" boolean DEFAULT false NOT NULL,
	"totp_recovery_codes" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "webhook_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webhook_id" varchar NOT NULL,
	"event" text NOT NULL,
	"payload" jsonb,
	"response_status" integer,
	"response_body" text,
	"error" text,
	"duration" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"secret" text,
	"events" jsonb DEFAULT '[]'::jsonb,
	"headers" jsonb,
	"is_active" boolean DEFAULT true,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workflow_approvals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instance_id" varchar NOT NULL,
	"step_number" integer NOT NULL,
	"approver_id" varchar,
	"status" "workflow_status" DEFAULT 'pending',
	"comment" text,
	"decided_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workflow_executions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" varchar,
	"status" "workflow_execution_status" DEFAULT 'pending' NOT NULL,
	"trigger_data" jsonb,
	"result" jsonb,
	"error" text,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "workflow_instances" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" varchar,
	"content_id" varchar NOT NULL,
	"status" "workflow_status" DEFAULT 'pending',
	"current_step" integer DEFAULT 0,
	"submitted_by" varchar,
	"submitted_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "workflow_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"content_types" jsonb DEFAULT '[]'::jsonb,
	"steps" jsonb DEFAULT '[]'::jsonb,
	"is_default" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"trigger" jsonb NOT NULL,
	"actions" jsonb NOT NULL,
	"status" "automation_status" DEFAULT 'draft' NOT NULL,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "writer_assignments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"writer_id" varchar,
	"content_id" varchar,
	"content_type" text,
	"topic" text,
	"status" "writer_assignment_status" DEFAULT 'pending',
	"match_score" integer,
	"priority" "writer_assignment_priority" DEFAULT 'normal',
	"due_date" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "writer_performance" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"writer_id" varchar,
	"period" varchar,
	"articles_written" integer DEFAULT 0,
	"total_views" integer DEFAULT 0,
	"avg_engagement" integer,
	"avg_seo_score" integer,
	"avg_voice_score" integer,
	"top_performing_article" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "ab_test_events" ADD CONSTRAINT "ab_test_events_test_id_ab_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."ab_tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ab_test_events" ADD CONSTRAINT "ab_test_events_variant_id_ab_test_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."ab_test_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ab_test_variants" ADD CONSTRAINT "ab_test_variants_test_id_ab_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."ab_tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attractions" ADD CONSTRAINT "attractions_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "behavioral_triggers" ADD CONSTRAINT "behavioral_triggers_email_template_id_email_templates_id_fk" FOREIGN KEY ("email_template_id") REFERENCES "public"."email_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "behavioral_triggers" ADD CONSTRAINT "behavioral_triggers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_events" ADD CONSTRAINT "campaign_events_campaign_id_newsletter_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."newsletter_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_events" ADD CONSTRAINT "campaign_events_subscriber_id_newsletter_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."newsletter_subscribers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cluster_members" ADD CONSTRAINT "cluster_members_cluster_id_content_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."content_clusters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cluster_members" ADD CONSTRAINT "cluster_members_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cohorts" ADD CONSTRAINT "cohorts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_calendar_items" ADD CONSTRAINT "content_calendar_items_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_calendar_items" ADD CONSTRAINT "content_calendar_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_clusters" ADD CONSTRAINT "content_clusters_pillar_content_id_contents_id_fk" FOREIGN KEY ("pillar_content_id") REFERENCES "public"."contents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_fingerprints" ADD CONSTRAINT "content_fingerprints_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_fingerprints" ADD CONSTRAINT "content_fingerprints_rss_feed_id_rss_feeds_id_fk" FOREIGN KEY ("rss_feed_id") REFERENCES "public"."rss_feeds"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_locks" ADD CONSTRAINT "content_locks_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_locks" ADD CONSTRAINT "content_locks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_rules" ADD CONSTRAINT "content_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_scores" ADD CONSTRAINT "content_scores_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_suggestions" ADD CONSTRAINT "content_suggestions_research_id_research_uploads_id_fk" FOREIGN KEY ("research_id") REFERENCES "public"."research_uploads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_tags" ADD CONSTRAINT "content_tags_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_tags" ADD CONSTRAINT "content_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_templates" ADD CONSTRAINT "content_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_views" ADD CONSTRAINT "content_views_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contents" ADD CONSTRAINT "contents_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contents" ADD CONSTRAINT "contents_writer_id_ai_writers_id_fk" FOREIGN KEY ("writer_id") REFERENCES "public"."ai_writers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversion_funnels" ADD CONSTRAINT "conversion_funnels_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_reports" ADD CONSTRAINT "custom_reports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_exports" ADD CONSTRAINT "data_exports_connection_id_integration_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."integration_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_exports" ADD CONSTRAINT "data_exports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "destination_content" ADD CONSTRAINT "destination_content_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dining" ADD CONSTRAINT "dining_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "districts" ADD CONSTRAINT "districts_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drip_campaign_enrollments" ADD CONSTRAINT "drip_campaign_enrollments_campaign_id_drip_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."drip_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drip_campaign_enrollments" ADD CONSTRAINT "drip_campaign_enrollments_subscriber_id_newsletter_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."newsletter_subscribers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drip_campaign_steps" ADD CONSTRAINT "drip_campaign_steps_campaign_id_drip_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."drip_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drip_campaigns" ADD CONSTRAINT "drip_campaigns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editable_pages" ADD CONSTRAINT "editable_pages_last_edited_by_users_id_fk" FOREIGN KEY ("last_edited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_template_blocks" ADD CONSTRAINT "email_template_blocks_template_id_email_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."email_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "footer_links" ADD CONSTRAINT "footer_links_section_id_footer_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."footer_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funnel_events" ADD CONSTRAINT "funnel_events_funnel_id_conversion_funnels_id_fk" FOREIGN KEY ("funnel_id") REFERENCES "public"."conversion_funnels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funnel_steps" ADD CONSTRAINT "funnel_steps_funnel_id_conversion_funnels_id_fk" FOREIGN KEY ("funnel_id") REFERENCES "public"."conversion_funnels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homepage_promotions" ADD CONSTRAINT "homepage_promotions_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_links" ADD CONSTRAINT "internal_links_source_content_id_contents_id_fk" FOREIGN KEY ("source_content_id") REFERENCES "public"."contents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_links" ADD CONSTRAINT "internal_links_target_content_id_contents_id_fk" FOREIGN KEY ("target_content_id") REFERENCES "public"."contents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itineraries" ADD CONSTRAINT "itineraries_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journey_touchpoints" ADD CONSTRAINT "journey_touchpoints_journey_id_user_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."user_journeys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_business_id_business_listings_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business_listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "navigation_menu_items" ADD CONSTRAINT "navigation_menu_items_menu_id_navigation_menus_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."navigation_menus"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_ab_tests" ADD CONSTRAINT "newsletter_ab_tests_campaign_id_newsletter_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."newsletter_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_ab_tests" ADD CONSTRAINT "newsletter_ab_tests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_campaigns" ADD CONSTRAINT "newsletter_campaigns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_layouts" ADD CONSTRAINT "page_layouts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_layouts" ADD CONSTRAINT "page_layouts_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_sections" ADD CONSTRAINT "page_sections_page_id_editable_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."editable_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_sections" ADD CONSTRAINT "page_sections_last_edited_by_users_id_fk" FOREIGN KEY ("last_edited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "real_estate_pages" ADD CONSTRAINT "real_estate_pages_last_edited_by_users_id_fk" FOREIGN KEY ("last_edited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_uploads" ADD CONSTRAINT "research_uploads_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_reports" ADD CONSTRAINT "scheduled_reports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_tasks" ADD CONSTRAINT "scheduled_tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_versions" ADD CONSTRAINT "section_versions_section_id_page_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."page_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_versions" ADD CONSTRAINT "section_versions_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "segment_conditions" ADD CONSTRAINT "segment_conditions_segment_id_subscriber_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."subscriber_segments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_analysis_results" ADD CONSTRAINT "seo_analysis_results_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_analytics" ADD CONSTRAINT "social_analytics_post_id_social_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."social_posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_analytics" ADD CONSTRAINT "social_analytics_campaign_id_social_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."social_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_campaign_id_social_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."social_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "static_pages" ADD CONSTRAINT "static_pages_last_edited_by_users_id_fk" FOREIGN KEY ("last_edited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriber_segments" ADD CONSTRAINT "subscriber_segments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_parent_id_teams_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_cluster_items" ADD CONSTRAINT "topic_cluster_items_cluster_id_topic_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."topic_clusters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_cluster_items" ADD CONSTRAINT "topic_cluster_items_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_cluster_items" ADD CONSTRAINT "topic_cluster_items_rss_feed_id_rss_feeds_id_fk" FOREIGN KEY ("rss_feed_id") REFERENCES "public"."rss_feeds"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_clusters" ADD CONSTRAINT "topic_clusters_merged_content_id_contents_id_fk" FOREIGN KEY ("merged_content_id") REFERENCES "public"."contents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translations" ADD CONSTRAINT "translations_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transports" ADD CONSTRAINT "transports_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factor_secrets" ADD CONSTRAINT "two_factor_secrets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_webhook_id_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_approvals" ADD CONSTRAINT "workflow_approvals_instance_id_workflow_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."workflow_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_approvals" ADD CONSTRAINT "workflow_approvals_approver_id_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_template_id_workflow_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."workflow_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_templates" ADD CONSTRAINT "workflow_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "writer_assignments" ADD CONSTRAINT "writer_assignments_writer_id_ai_writers_id_fk" FOREIGN KEY ("writer_id") REFERENCES "public"."ai_writers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "writer_assignments" ADD CONSTRAINT "writer_assignments_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "writer_performance" ADD CONSTRAINT "writer_performance_writer_id_ai_writers_id_fk" FOREIGN KEY ("writer_id") REFERENCES "public"."ai_writers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_ab_test_events_test" ON "ab_test_events" USING btree ("test_id");--> statement-breakpoint
CREATE INDEX "IDX_ab_test_events_variant" ON "ab_test_events" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "IDX_ab_test_events_created" ON "ab_test_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "IDX_ab_test_variants_test" ON "ab_test_variants" USING btree ("test_id");--> statement-breakpoint
CREATE INDEX "IDX_ab_tests_content" ON "ab_tests" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "IDX_ab_tests_status" ON "ab_tests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_activities_actor" ON "activities" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "IDX_activities_target" ON "activities" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "IDX_activities_team" ON "activities" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "IDX_activities_created" ON "activities" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "IDX_ai_writers_slug" ON "ai_writers" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "IDX_ai_writers_active" ON "ai_writers" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "IDX_analytics_session" ON "analytics_events" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "IDX_analytics_visitor" ON "analytics_events" USING btree ("visitor_id");--> statement-breakpoint
CREATE INDEX "IDX_analytics_timestamp" ON "analytics_events" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "IDX_analytics_event_type" ON "analytics_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "IDX_analytics_page_path" ON "analytics_events" USING btree ("page_path");--> statement-breakpoint
CREATE INDEX "IDX_audit_logs_timestamp" ON "audit_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "IDX_audit_logs_user_id" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_audit_logs_entity" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "IDX_jobs_status" ON "background_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_jobs_type" ON "background_jobs" USING btree ("type");--> statement-breakpoint
CREATE INDEX "IDX_jobs_priority" ON "background_jobs" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "IDX_behavioral_triggers_event_type" ON "behavioral_triggers" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "IDX_behavioral_triggers_active" ON "behavioral_triggers" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "IDX_business_status" ON "business_listings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_business_type" ON "business_listings" USING btree ("business_type");--> statement-breakpoint
CREATE INDEX "IDX_cluster_members_cluster" ON "cluster_members" USING btree ("cluster_id");--> statement-breakpoint
CREATE INDEX "IDX_cluster_members_content" ON "cluster_members" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "IDX_comments_content" ON "comments" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "IDX_comments_parent" ON "comments" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "IDX_comments_author" ON "comments" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "IDX_content_calendar_date" ON "content_calendar_items" USING btree ("scheduled_date");--> statement-breakpoint
CREATE INDEX "IDX_content_calendar_status" ON "content_calendar_items" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "IDX_content_locks_active" ON "content_locks" USING btree ("content_id") WHERE is_active = true;--> statement-breakpoint
CREATE INDEX "IDX_content_locks_user" ON "content_locks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_content_locks_expires" ON "content_locks" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "IDX_purchases_user" ON "content_purchases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_purchases_content" ON "content_purchases" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "IDX_content_scores_content" ON "content_scores" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "IDX_content_tags_content" ON "content_tags" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "IDX_content_tags_tag" ON "content_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "IDX_contents_status" ON "contents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_contents_type" ON "contents" USING btree ("type");--> statement-breakpoint
CREATE INDEX "IDX_contents_type_status" ON "contents" USING btree ("type","status");--> statement-breakpoint
CREATE INDEX "IDX_contents_author" ON "contents" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "IDX_contents_published_at" ON "contents" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "IDX_contents_writer" ON "contents" USING btree ("writer_id");--> statement-breakpoint
CREATE INDEX "IDX_contents_parent" ON "contents" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "IDX_data_exports_next_export" ON "data_exports" USING btree ("next_export_at");--> statement-breakpoint
CREATE INDEX "IDX_data_exports_active" ON "data_exports" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "IDX_drip_enrollments_campaign" ON "drip_campaign_enrollments" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "IDX_drip_enrollments_subscriber" ON "drip_campaign_enrollments" USING btree ("subscriber_id");--> statement-breakpoint
CREATE INDEX "IDX_drip_enrollments_next_email" ON "drip_campaign_enrollments" USING btree ("next_email_at");--> statement-breakpoint
CREATE UNIQUE INDEX "IDX_drip_enrollments_unique" ON "drip_campaign_enrollments" USING btree ("campaign_id","subscriber_id");--> statement-breakpoint
CREATE INDEX "IDX_drip_campaign_steps_campaign" ON "drip_campaign_steps" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "IDX_drip_campaign_steps_order" ON "drip_campaign_steps" USING btree ("campaign_id","step_number");--> statement-breakpoint
CREATE UNIQUE INDEX "IDX_editable_pages_slug" ON "editable_pages" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "IDX_editable_pages_type" ON "editable_pages" USING btree ("page_type");--> statement-breakpoint
CREATE INDEX "IDX_email_template_blocks_template" ON "email_template_blocks" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "IDX_email_template_blocks_order" ON "email_template_blocks" USING btree ("template_id","order");--> statement-breakpoint
CREATE INDEX "IDX_email_templates_category" ON "email_templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "IDX_footer_links_section" ON "footer_links" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "IDX_footer_links_order" ON "footer_links" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "IDX_footer_sections_order" ON "footer_sections" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "IDX_funnel_events_funnel" ON "funnel_events" USING btree ("funnel_id");--> statement-breakpoint
CREATE INDEX "IDX_funnel_events_session" ON "funnel_events" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "IDX_funnel_events_visitor" ON "funnel_events" USING btree ("visitor_id");--> statement-breakpoint
CREATE INDEX "IDX_funnel_steps_funnel" ON "funnel_steps" USING btree ("funnel_id");--> statement-breakpoint
CREATE INDEX "IDX_funnel_steps_order" ON "funnel_steps" USING btree ("funnel_id","step_number");--> statement-breakpoint
CREATE INDEX "IDX_homepage_sections_type" ON "homepage_sections" USING btree ("section_type");--> statement-breakpoint
CREATE INDEX "IDX_homepage_sections_order" ON "homepage_sections" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "IDX_integration_connections_provider" ON "integration_connections" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "IDX_integration_connections_status" ON "integration_connections" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_journey_touchpoints_journey" ON "journey_touchpoints" USING btree ("journey_id");--> statement-breakpoint
CREATE INDEX "IDX_journey_touchpoints_step" ON "journey_touchpoints" USING btree ("journey_id","step_number");--> statement-breakpoint
CREATE INDEX "IDX_leads_business" ON "leads" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "IDX_leads_status" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_magic_link_tokens_email" ON "magic_link_tokens" USING btree ("email");--> statement-breakpoint
CREATE INDEX "IDX_magic_link_tokens_token" ON "magic_link_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "IDX_nav_menu_items_menu" ON "navigation_menu_items" USING btree ("menu_id");--> statement-breakpoint
CREATE INDEX "IDX_nav_menu_items_parent" ON "navigation_menu_items" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "IDX_nav_menu_items_order" ON "navigation_menu_items" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "IDX_newsletter_ab_tests_status" ON "newsletter_ab_tests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_newsletter_ab_tests_campaign" ON "newsletter_ab_tests" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "IDX_notifications_user" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_notifications_unread" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "IDX_notifications_created" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "IDX_page_sections_page" ON "page_sections" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "IDX_page_sections_order" ON "page_sections" USING btree ("page_id","sort_order");--> statement-breakpoint
CREATE INDEX "IDX_page_sections_key" ON "page_sections" USING btree ("page_id","section_key");--> statement-breakpoint
CREATE INDEX "IDX_partners_status" ON "partners" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_partners_tracking" ON "partners" USING btree ("tracking_code");--> statement-breakpoint
CREATE INDEX "IDX_payouts_partner" ON "payouts" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "IDX_payouts_status" ON "payouts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_premium_content_id" ON "premium_content" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "IDX_push_user" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_push_locale" ON "push_subscriptions" USING btree ("locale");--> statement-breakpoint
CREATE INDEX "IDX_rate_limits_key" ON "rate_limits" USING btree ("key");--> statement-breakpoint
CREATE INDEX "IDX_rate_limits_reset" ON "rate_limits" USING btree ("reset_at");--> statement-breakpoint
CREATE INDEX "IDX_real_estate_pages_category" ON "real_estate_pages" USING btree ("category");--> statement-breakpoint
CREATE INDEX "IDX_real_estate_pages_active" ON "real_estate_pages" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "IDX_realtime_sessions_active" ON "realtime_sessions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "IDX_realtime_sessions_visitor" ON "realtime_sessions" USING btree ("visitor_id");--> statement-breakpoint
CREATE INDEX "IDX_realtime_sessions_last_activity" ON "realtime_sessions" USING btree ("last_activity_at");--> statement-breakpoint
CREATE INDEX "IDX_scheduled_reports_next_run" ON "scheduled_reports" USING btree ("next_run_at");--> statement-breakpoint
CREATE INDEX "IDX_scheduled_reports_active" ON "scheduled_reports" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "IDX_scheduled_tasks_pending" ON "scheduled_tasks" USING btree ("scheduled_for") WHERE status = 'pending';--> statement-breakpoint
CREATE INDEX "IDX_scheduled_tasks_target" ON "scheduled_tasks" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "IDX_search_content_type" ON "search_index" USING btree ("content_type");--> statement-breakpoint
CREATE INDEX "IDX_search_locale" ON "search_index" USING btree ("locale");--> statement-breakpoint
CREATE INDEX "IDX_search_updated" ON "search_index" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "IDX_search_query" ON "search_queries" USING btree ("query");--> statement-breakpoint
CREATE INDEX "IDX_search_created" ON "search_queries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "IDX_search_results" ON "search_queries" USING btree ("results_count");--> statement-breakpoint
CREATE INDEX "IDX_section_versions_section" ON "section_versions" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "IDX_section_versions_number" ON "section_versions" USING btree ("section_id","version_number");--> statement-breakpoint
CREATE INDEX "IDX_segment_conditions_segment" ON "segment_conditions" USING btree ("segment_id");--> statement-breakpoint
CREATE INDEX "IDX_seo_analysis_content" ON "seo_analysis_results" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_social_credentials_user_platform" ON "social_credentials" USING btree ("user_id","platform");--> statement-breakpoint
CREATE INDEX "idx_social_posts_status" ON "social_posts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_social_posts_scheduled" ON "social_posts" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "idx_social_posts_platform" ON "social_posts" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "IDX_static_pages_slug" ON "static_pages" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "IDX_static_pages_active" ON "static_pages" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "IDX_team_members_unique" ON "team_members" USING btree ("team_id","user_id");--> statement-breakpoint
CREATE INDEX "IDX_team_members_user" ON "team_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_teams_parent" ON "teams" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "IDX_teams_slug" ON "teams" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "IDX_batch_status" ON "translation_batch_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_batch_created" ON "translation_batch_jobs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "IDX_translations_content_locale" ON "translations" USING btree ("content_id","locale");--> statement-breakpoint
CREATE INDEX "IDX_translations_locale" ON "translations" USING btree ("locale");--> statement-breakpoint
CREATE INDEX "IDX_translations_status" ON "translations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_2fa_user" ON "two_factor_secrets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_user_journeys_visitor" ON "user_journeys" USING btree ("visitor_id");--> statement-breakpoint
CREATE INDEX "IDX_user_journeys_started_at" ON "user_journeys" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "IDX_user_journeys_converted" ON "user_journeys" USING btree ("converted");--> statement-breakpoint
CREATE INDEX "IDX_webhook_logs_webhook" ON "webhook_logs" USING btree ("webhook_id");--> statement-breakpoint
CREATE INDEX "IDX_webhook_logs_created" ON "webhook_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "IDX_webhooks_active" ON "webhooks" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "IDX_workflow_approvals_instance" ON "workflow_approvals" USING btree ("instance_id");--> statement-breakpoint
CREATE INDEX "IDX_workflow_approvals_approver" ON "workflow_approvals" USING btree ("approver_id");--> statement-breakpoint
CREATE INDEX "IDX_workflow_executions_workflow" ON "workflow_executions" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "IDX_workflow_executions_status" ON "workflow_executions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_workflow_instances_content" ON "workflow_instances" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "IDX_workflow_instances_status" ON "workflow_instances" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_workflows_status" ON "workflows" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_writer_assignments_writer" ON "writer_assignments" USING btree ("writer_id");--> statement-breakpoint
CREATE INDEX "IDX_writer_assignments_content" ON "writer_assignments" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "IDX_writer_assignments_status" ON "writer_assignments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_writer_performance_writer" ON "writer_performance" USING btree ("writer_id");--> statement-breakpoint
CREATE INDEX "IDX_writer_performance_period" ON "writer_performance" USING btree ("period");