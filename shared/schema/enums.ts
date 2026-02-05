import { pgEnum } from "drizzle-orm/pg-core";

// ============================================================================
// CONTENT & ARTICLE ENUMS
// ============================================================================

export const contentTypeEnum = pgEnum("content_type", [
  "attraction",
  "hotel",
  "article",
  "dining",
  "restaurant",
  "district",
  "transport",
  "event",
  "itinerary",
  "landing_page",
  "case_study",
  "off_plan",
]);

export const contentStatusEnum = pgEnum("content_status", [
  "draft",
  "in_review",
  "reviewed",
  "approved",
  "scheduled",
  "published",
  "archived",
]);

export const articleCategoryEnum = pgEnum("article_category", [
  "attractions",
  "hotels",
  "food",
  "transport",
  "events",
  "tips",
  "news",
  "shopping",
]);

// ============================================================================
// USER & ROLE ENUMS
// ============================================================================

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "editor",
  "author",
  "contributor",
  "viewer",
]);

// ============================================================================
// TOPIC & CONTENT CLASSIFICATION ENUMS
// ============================================================================

export const viralPotentialEnum = pgEnum("viral_potential", ["1", "2", "3", "4", "5"]);

export const topicTypeEnum = pgEnum("topic_type", ["trending", "evergreen", "seasonal"]);

export const topicFormatEnum = pgEnum("topic_format", [
  "video_tour",
  "photo_gallery",
  "pov_video",
  "cost_breakdown",
  "lifestyle_vlog",
  "documentary",
  "explainer",
  "comparison",
  "walking_tour",
  "food_tour",
  "interview",
  "tutorial",
  "asmr",
  "drone_footage",
  "night_photography",
  "infographic",
  "reaction_video",
  "challenge",
  "list_video",
  "guide",
  "review",
]);

export const contentIntentEnum = pgEnum("content_intent", [
  "informational",
  "commercial",
  "transactional",
  "navigational",
]);

export const topicCategoryEnum = pgEnum("topic_category", [
  "luxury_lifestyle",
  "food_dining",
  "bizarre_unique",
  "experiences_activities",
  "money_cost",
  "expat_living",
  "dark_side",
  "myth_busting",
  "comparisons",
  "records_superlatives",
  "future_development",
  "seasonal_events",
  "practical_tips",
]);

// ============================================================================
// PAGE & LAYOUT ENUMS
// ============================================================================

export const pageLayoutStatusEnum = pgEnum("page_layout_status", ["draft", "published"]);

// ============================================================================
// IMAGE & MEDIA ENUMS
// ============================================================================

export const imageSourceEnum = pgEnum("image_source", [
  "gemini",
  "openai",
  "freepik",
  "stock",
  "upload",
]);

export const imageRatingEnum = pgEnum("image_rating", ["like", "dislike", "skip"]);

export const assetSourceEnum = pgEnum("asset_source", [
  "upload",
  "ai_generated",
  "attached",
  "external",
]);

// ============================================================================
// MEDIA INTELLIGENCE ENUMS
// ============================================================================

export const recommendationStatusEnum = pgEnum("recommendation_status", [
  "pending",
  "approved",
  "rejected",
  "applied",
  "failed",
]);

export const recommendationTypeEnum = pgEnum("recommendation_type", [
  "convert_format",
  "resize",
  "compress",
  "add_missing_image",
  "add_alt_text",
  "improve_alt_text",
  "remove_duplicate",
  "replace_stock",
  "add_gallery_images",
  "optimize_dimensions",
]);

// ============================================================================
// LOCALIZATION & TRANSLATION ENUMS
// ============================================================================

export const localeEnum = pgEnum("locale", [
  // Tier 1 - Core Markets
  "en",
  "ar",
  "hi",
  // Tier 2 - High ROI Markets
  "zh",
  "ru",
  "ur",
  "fr",
  // Tier 3 - Growing Markets
  "de",
  "fa",
  "bn",
  "fil",
  // Tier 4 - Niche Markets
  "es",
  "tr",
  "it",
  "ja",
  "ko",
  "he",
]);

export const translationStatusEnum = pgEnum("translation_status", [
  "pending",
  "in_progress",
  "completed",
  "needs_review",
]);

export const translationJobStatusEnum = pgEnum("translation_job_status", [
  "pending",
  "in_progress",
  "completed",
  "failed",
  "needs_review",
]);

export const topicClusterStatusEnum = pgEnum("topic_cluster_status", [
  "pending",
  "merged",
  "dismissed",
]);

// ============================================================================
// LOCALIZED ASSET ENUMS
// ============================================================================

export const localizedAssetEntityTypeEnum = pgEnum("localized_asset_entity_type", [
  "content",
  "destination",
  "attraction",
  "hotel",
  "article",
  "guide",
  "page",
]);

export const localizedAssetUsageEnum = pgEnum("localized_asset_usage", [
  "hero",
  "card",
  "gallery",
  "og",
  "thumbnail",
  "banner",
  "logo",
]);

export const pilotLocaleStatusEnum = pgEnum("pilot_locale_status", [
  "generating",
  "validating",
  "validated",
  "failed",
  "published",
]);

export const nativeEntityTypeEnum = pgEnum("native_entity_type", [
  "attraction",
  "guide",
  "destination",
  "district",
]);

// ============================================================================
// SEO ENUMS
// ============================================================================

export const seoKeywordTypeEnum = pgEnum("seo_keyword_type", [
  "primary",
  "secondary",
  "long_tail",
  "question",
  "local",
]);

export const homepageSectionEnum = pgEnum("homepage_section", [
  "featured",
  "attractions",
  "hotels",
  "articles",
  "trending",
  "dining",
  "events",
]);

// ============================================================================
// AUDIT & LOGGING ENUMS
// ============================================================================

export const auditActionTypeEnum = pgEnum("audit_action_type", [
  "create",
  "update",
  "delete",
  "publish",
  "unpublish",
  "submit_for_review",
  "approve",
  "reject",
  "login",
  "logout",
  "user_create",
  "user_update",
  "user_delete",
  "role_change",
  "settings_change",
  "media_upload",
  "media_delete",
  "restore",
]);

export const auditEntityTypeEnum = pgEnum("audit_entity_type", [
  "content",
  "user",
  "media",
  "settings",
  "rss_feed",
  "affiliate_link",
  "translation",
  "session",
  "tag",
  "cluster",
  "campaign",
  "newsletter_subscriber",
  "auth",
]);

export const analyticsEventTypeEnum = pgEnum("analytics_event_type", [
  "page_view",
  "click",
  "scroll",
  "form_start",
  "form_submit",
  "form_abandon",
  "cta_click",
  "outbound_link",
  "search",
  "filter",
  "share",
  "video_play",
  "video_complete",
  "download",
  "copy",
  "print",
  "add_to_favorites",
  "exit_intent",
  "conversion",
  "engagement",
]);

// ============================================================================
// A/B TESTING ENUMS
// ============================================================================

export const abTestStatusEnum = pgEnum("ab_test_status", ["running", "completed", "paused"]);

export const abTestTypeEnum = pgEnum("ab_test_type", ["title", "heroImage", "metaDescription"]);

// ============================================================================
// MONETIZATION ENUMS
// ============================================================================

export const premiumAccessTypeEnum = pgEnum("premium_access_type", ["one-time", "subscription"]);

export const purchaseStatusEnum = pgEnum("purchase_status", ["pending", "completed", "refunded"]);

export const businessTypeEnum = pgEnum("business_type", [
  "restaurant",
  "hotel",
  "tour",
  "shop",
  "service",
]);

export const businessTierEnum = pgEnum("business_tier", ["basic", "premium", "enterprise"]);

export const businessStatusEnum = pgEnum("business_status", [
  "active",
  "pending",
  "expired",
  "cancelled",
]);

// ============================================================================
// LEAD & SUBSCRIBER ENUMS
// ============================================================================

export const leadTypeEnum = pgEnum("lead_type", [
  "inquiry",
  "booking_request",
  "quote_request",
  "contact",
]);

export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "contacted",
  "qualified",
  "converted",
  "lost",
]);

export const subscriberStatusEnum = pgEnum("subscriber_status", [
  "pending_confirmation",
  "subscribed",
  "unsubscribed",
  "bounced",
  "complained",
]);

export const propertyLeadStatusEnum = pgEnum("property_lead_status", [
  "new",
  "contacted",
  "qualified",
  "negotiating",
  "won",
  "lost",
]);

// ============================================================================
// CAMPAIGN & EMAIL ENUMS
// ============================================================================

export const campaignStatusEnum = pgEnum("campaign_status", [
  "draft",
  "scheduled",
  "sending",
  "sent",
  "failed",
]);

export const emailEventTypeEnum = pgEnum("email_event_type", [
  "sent",
  "delivered",
  "opened",
  "clicked",
  "bounced",
  "complained",
  "unsubscribed",
]);

export const sequenceTriggerEnum = pgEnum("sequence_trigger", [
  "signup",
  "tag_added",
  "inactivity",
  "custom",
]);

// ============================================================================
// JOB & WORKFLOW ENUMS
// ============================================================================

export const jobStatusEnum = pgEnum("job_status", ["pending", "processing", "completed", "failed"]);

export const jobTypeEnum = pgEnum("job_type", [
  "translate",
  "ai_generate",
  "email",
  "image_process",
  "cleanup",
]);

export const workflowStatusEnum = pgEnum("workflow_status", [
  "pending",
  "in_progress",
  "approved",
  "rejected",
  "cancelled",
]);

// ============================================================================
// ACTIVITY & NOTIFICATION ENUMS
// ============================================================================

export const activityTypeEnum = pgEnum("activity_type", [
  "content_created",
  "content_updated",
  "content_published",
  "content_deleted",
  "comment_added",
  "workflow_submitted",
  "workflow_approved",
  "workflow_rejected",
  "user_joined",
  "user_updated",
  "team_created",
  "translation_completed",
  "media_uploaded",
  "settings_changed",
  "login",
  "logout",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "info",
  "success",
  "warning",
  "error",
  "workflow_pending",
  "workflow_approved",
  "workflow_rejected",
  "comment_mention",
  "comment_reply",
  "content_assigned",
  "system",
]);

export const webhookEventEnum = pgEnum("webhook_event", [
  "content.created",
  "content.updated",
  "content.published",
  "content.deleted",
  "user.created",
  "user.updated",
  "translation.completed",
  "workflow.submitted",
  "workflow.approved",
  "workflow.rejected",
  "comment.created",
  "media.uploaded",
]);

// ============================================================================
// AI WRITERS ENUMS
// ============================================================================

export const writerAssignmentStatusEnum = pgEnum("writer_assignment_status", [
  "pending",
  "in_progress",
  "review",
  "completed",
  "published",
]);

export const writerAssignmentPriorityEnum = pgEnum("writer_assignment_priority", [
  "low",
  "normal",
  "high",
  "urgent",
]);

// ============================================================================
// AUTOMATION & WORKFLOW EXECUTION ENUMS
// ============================================================================

export const automationStatusEnum = pgEnum("automation_status", ["active", "inactive", "draft"]);

export const workflowExecutionStatusEnum = pgEnum("workflow_execution_status", [
  "pending",
  "running",
  "completed",
  "failed",
]);

// ============================================================================
// PARTNER & AFFILIATE ENUMS
// ============================================================================

export const partnerStatusEnum = pgEnum("partner_status", [
  "active",
  "pending",
  "suspended",
  "inactive",
]);

export const payoutStatusEnum = pgEnum("payout_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

// ============================================================================
// REAL ESTATE ENUMS
// ============================================================================

export const realEstatePageCategoryEnum = pgEnum("real_estate_page_category", [
  "guide",
  "calculator",
  "comparison",
  "case_study",
  "location",
  "developer",
  "pillar",
]);

// ============================================================================
// CMS ENUMS
// ============================================================================

export const cmsEntityTypeEnum = pgEnum("cms_entity_type", [
  "homepage_section",
  "homepage_card",
  "experience_category",
  "region_link",
  "hero_slide",
  "homepage_cta",
  "homepage_seo_meta",
  "destination",
]);

export const sectionTypeEnum = pgEnum("section_type", [
  "hero",
  "intro_text",
  "highlight_grid",
  "filter_bar",
  "content_grid",
  "cta",
  "faq",
  "testimonial",
  "gallery",
  "stats",
  "features",
  "text_image",
  "video",
  "newsletter",
  "custom",
]);

// ============================================================================
// DESTINATION ENUMS
// ============================================================================

export const destinationStatusEnum = pgEnum("destination_status", ["complete", "partial", "empty"]);

export const destinationLevelEnum = pgEnum("destination_level", ["country", "city", "area"]);

// ============================================================================
// RESEARCH & SUGGESTION ENUMS
// ============================================================================

export const researchStatusEnum = pgEnum("research_status", [
  "pending",
  "analyzing",
  "analyzed",
  "generating",
  "completed",
  "failed",
]);

export const suggestionStatusEnum = pgEnum("suggestion_status", [
  "pending",
  "approved",
  "rejected",
  "generating",
  "generated",
  "published",
]);

// ============================================================================
// AEO (ANSWER ENGINE OPTIMIZATION) ENUMS
// ============================================================================

export const aeoPlatformEnum = pgEnum("aeo_platform", [
  "chatgpt",
  "perplexity",
  "google_aio",
  "claude",
  "bing_chat",
  "gemini",
]);

export const aeoCitationTypeEnum = pgEnum("aeo_citation_type", [
  "direct",
  "paraphrase",
  "reference",
  "recommendation",
]);

export const aeoContentFormatEnum = pgEnum("aeo_content_format", [
  "comparison",
  "best_time",
  "cost_guide",
  "faq_hub",
  "top_list",
  "how_to",
  "vs_guide",
  "complete_guide",
]);

// ============================================================================
// SOCIAL MEDIA ENUMS
// ============================================================================

export const socialPlatformEnum = pgEnum("social_platform", [
  "linkedin",
  "twitter",
  "facebook",
  "instagram",
]);

export const socialPostStatusEnum = pgEnum("social_post_status", [
  "draft",
  "scheduled",
  "published",
  "failed",
]);

// ============================================================================
// LIVE CHAT & SURVEY ENUMS
// ============================================================================

export const liveChatStatusEnum = pgEnum("live_chat_status", ["open", "closed", "archived"]);

export const surveyStatusEnum = pgEnum("survey_status", ["draft", "active", "closed", "archived"]);

export const questionTypeEnum = pgEnum("question_type", [
  "text",
  "textarea",
  "radio",
  "checkbox",
  "rating",
  "dropdown",
]);

// ============================================================================
// REFERRAL & COMMISSION ENUMS
// ============================================================================

export const referralStatusEnum = pgEnum("referral_status", ["pending", "converted", "expired"]);

export const commissionStatusEnum = pgEnum("commission_status", [
  "pending",
  "approved",
  "paid",
  "cancelled",
]);

// ============================================================================
// QA CHECKLIST ENUMS
// ============================================================================

export const qaCheckStatusEnum = pgEnum("qa_check_status", [
  "not_checked",
  "passed",
  "failed",
  "not_applicable",
  "needs_review",
]);

export const qaRunStatusEnum = pgEnum("qa_run_status", ["in_progress", "completed", "abandoned"]);

// ============================================================================
// OCTOPUS V2 ENUMS
// ============================================================================

export const octopusJobStatusEnum = pgEnum("octopus_job_status", [
  "pending",
  "parsing",
  "extracting",
  "enriching",
  "graph_resolution",
  "entity_upsert",
  "generating",
  "quality_check",
  "fact_check",
  "publish_queue",
  "completed",
  "failed",
  "paused",
]);

export const octopusArtifactActionEnum = pgEnum("octopus_artifact_action", [
  "created",
  "updated",
  "skipped",
  "deprecated",
]);

export const publishStatusEnum = pgEnum("publish_status", [
  "draft",
  "review",
  "approved",
  "published",
  "archived",
]);

// ============================================================================
// TAGGING & PLACEMENT ENUMS
// ============================================================================

export const tagCategoryEnum = pgEnum("tag_category", [
  "destination",
  "district",
  "hotel_type",
  "audience",
  "experience",
  "commercial",
]);

export const tagSourceEnum = pgEnum("tag_source", ["ai", "manual", "rule"]);

export const placementSurfaceEnum = pgEnum("placement_surface", [
  "destination_homepage",
  "district_page",
  "category_seo",
  "comparison",
  "featured",
  "newsletter",
  "social",
]);

// ============================================================================
// IMAGE USAGE ENUMS
// ============================================================================

export const imageUsageDecisionEnum = pgEnum("image_usage_decision", [
  "approved",
  "rejected",
  "pending",
  "reuse",
  "generate",
]);

export const imageRoleEnum = pgEnum("image_role", [
  "hero",
  "card",
  "thumbnail",
  "gallery",
  "background",
  "inline",
  "og_image",
  "logo",
]);

// ============================================================================
// HELP CENTER ENUMS
// ============================================================================

export const helpArticleStatusEnum = pgEnum("help_article_status", ["draft", "published"]);

// ============================================================================
// WEBHOOK OUTBOX ENUMS
// ============================================================================

export const webhookOutboxStatusEnum = pgEnum("webhook_outbox_status", [
  "pending",
  "sending",
  "succeeded",
  "failed",
]);

// ============================================================================
// CONTENT REPAIR ENUMS
// ============================================================================

export const contentRepairStatusEnum = pgEnum("content_repair_status", [
  "pending",
  "simulated",
  "running",
  "completed",
  "failed",
]);

// ============================================================================
// GOVERNANCE ENUMS
// ============================================================================

export const governanceRoleEnum = pgEnum("governance_role", [
  "super_admin",
  "admin",
  "editor",
  "analyst",
  "ops",
  "viewer",
]);

// ============================================================================
// CHANGE MANAGEMENT ENUMS
// ============================================================================

export const changePlanStatusEnum = pgEnum("change_plan_status", [
  "draft",
  "submitted",
  "approved",
  "applying",
  "completed",
  "failed",
  "rolled_back",
  "cancelled",
]);

export const changePlanScopeEnum = pgEnum("change_plan_scope", [
  "content",
  "entity",
  "seo",
  "aeo",
  "canonical",
  "links",
  "monetization",
  "global",
]);

export const changeItemTypeEnum = pgEnum("change_item_type", [
  "content_update",
  "content_publish",
  "content_unpublish",
  "entity_merge",
  "entity_update",
  "canonical_set",
  "canonical_remove",
  "link_add",
  "link_remove",
  "aeo_regenerate",
  "seo_update",
  "experiment_start",
  "experiment_stop",
  "monetization_update",
]);

export const changeExecutionKindEnum = pgEnum("change_execution_kind", [
  "dry_run",
  "apply",
  "rollback",
]);

export const changeExecutionStatusEnum = pgEnum("change_execution_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
]);

// ============================================================================
// BUDGET & POLICY ENUMS
// ============================================================================

export const budgetPeriodEnum = pgEnum("budget_period", ["hourly", "daily", "weekly", "monthly"]);

export const policyDecisionEnum = pgEnum("policy_decision", ["ALLOW", "WARN", "BLOCK"]);

// ============================================================================
// METRICS & ANALYTICS ENUMS
// ============================================================================

export const metricSnapshotsStatusEnum = pgEnum("metric_snapshot_status", [
  "pending",
  "completed",
  "failed",
]);

export const opportunityCategoryEnum = pgEnum("opportunity_category", [
  "quick_win",
  "strategic",
  "technical",
  "content",
  "seo",
  "aeo",
  "revenue",
]);

export const opportunityStatusEnum = pgEnum("opportunity_status", [
  "new",
  "acknowledged",
  "in_progress",
  "completed",
  "dismissed",
]);

export const anomalySeverityEnum = pgEnum("anomaly_severity", ["info", "warning", "critical"]);

export const anomalyTypeEnum = pgEnum("anomaly_type", [
  "spike",
  "drop",
  "trend_break",
  "outlier",
  "threshold",
  "missing",
  "pattern_break",
]);

// ============================================================================
// TRAVI CONTENT GENERATION ENUMS
// ============================================================================

export const traviLocationCategoryEnum = pgEnum("travi_location_category", [
  "attraction",
  "restaurant",
  "hotel",
]);

export const traviLocationStatusEnum = pgEnum("travi_location_status", [
  "discovered",
  "enriching",
  "generating",
  "ready",
  "error",
  "exported",
]);

export const traviAiModelEnum = pgEnum("travi_ai_model", [
  "gemini-2.0-flash-exp",
  "gpt-4o-mini",
  "claude-haiku-4-5-20251001",
]);

// ============================================================================
// TIQETS INTEGRATION ENUMS
// ============================================================================

export const tiqetsAttractionStatusEnum = pgEnum("tiqets_attraction_status", [
  "imported",
  "processing",
  "ready",
  "published",
  "archived",
]);

// ============================================================================
// TRAVI JOB ENUMS
// ============================================================================

export const traviJobStatusEnum = pgEnum("travi_job_status", [
  "pending",
  "running",
  "paused",
  "completed",
  "failed",
  "budget_exceeded",
]);

export const traviJobTypeEnum = pgEnum("travi_job_type", [
  "discover_locations",
  "enrich_locations",
  "generate_content",
  "collect_images",
  "export_data",
]);

export const traviApiServiceEnum = pgEnum("travi_api_service", [
  "gemini",
  "gpt",
  "claude",
  "google_places",
  "freepik",
  "tripadvisor",
  "wikipedia",
  "osm",
]);

export const traviAlertSeverityEnum = pgEnum("travi_alert_severity", [
  "info",
  "warning",
  "critical",
  "budget_stop",
]);

// ============================================================================
// TRAVEL INTELLIGENCE ENUMS
// ============================================================================

export const advisoryTypeEnum = pgEnum("advisory_type", [
  "visa",
  "passport",
  "vaccination",
  "transit",
  "entry_requirements",
]);

export const advisoryStatusEnum = pgEnum("advisory_status", ["active", "expired", "pending"]);

export const advisorySeverityEnum = pgEnum("advisory_severity", ["info", "warning", "critical"]);

export const healthAlertTypeEnum = pgEnum("health_alert_type", [
  "disease_outbreak",
  "vaccination_required",
  "travel_restriction",
  "general_health",
]);

export const healthAlertStatusEnum = pgEnum("health_alert_status", [
  "active",
  "resolved",
  "monitoring",
]);

export const healthAlertSeverityEnum = pgEnum("health_alert_severity", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const destinationEventTypeEnum = pgEnum("destination_event_type", [
  "festival",
  "sports",
  "conference",
  "concert",
  "exhibition",
  "cultural",
  "holiday",
]);

export const destinationEventStatusEnum = pgEnum("destination_event_status", [
  "upcoming",
  "ongoing",
  "completed",
  "cancelled",
]);

// ============================================================================
// CONTENT EXPLODER ENUMS
// ============================================================================

export const entityTypeEnum = pgEnum("entity_type", [
  "hotel",
  "restaurant",
  "attraction",
  "district",
  "landmark",
  "beach",
  "museum",
  "park",
  "mall",
  "market",
  "cafe",
  "bar",
  "club",
  "spa",
  "activity",
]);

export const explodedArticleTypeEnum = pgEnum("exploded_article_type", [
  "guide",
  "best-of",
  "comparison",
  "seasonal",
  "budget",
  "luxury",
  "family",
  "romantic",
  "first-time",
  "insider",
  "nearby",
  "history",
  "food-scene",
  "nightlife",
  "day-trip",
]);

export const explosionJobStatusEnum = pgEnum("explosion_job_status", [
  "pending",
  "extracting",
  "ideating",
  "generating",
  "completed",
  "failed",
  "cancelled",
]);

// ============================================================================
// AUTOPILOT ENUMS
// ============================================================================

export const autopilotModeEnum = pgEnum("autopilot_mode", [
  "off",
  "monitor",
  "semi_auto",
  "full_auto",
]);

export const autopilotTaskTypeEnum = pgEnum("autopilot_task_type", [
  "content_generation",
  "quality_improvement",
  "freshness_update",
  "internal_linking",
  "image_optimization",
  "entity_extraction",
  "content_explosion",
]);

export const autopilotTaskStatusEnum = pgEnum("autopilot_task_status", [
  "pending",
  "awaiting_approval",
  "approved",
  "executing",
  "completed",
  "failed",
  "rejected",
  "cancelled",
]);

// ============================================================================
// EDITORIAL PLACEMENTS ENUMS
// ============================================================================

export const editorialZoneEnum = pgEnum("editorial_zone", [
  "homepage_hero",
  "homepage_featured",
  "homepage_secondary",
  "homepage_sidebar",
  "destination_hero",
  "destination_featured",
  "destination_news",
  "category_hero",
  "category_featured",
  "breaking_news",
  "trending",
  "editor_picks",
]);

export const placementPriorityEnum = pgEnum("placement_priority", [
  "breaking",
  "headline",
  "featured",
  "standard",
  "filler",
]);

export const placementStatusEnum = pgEnum("placement_status", [
  "scheduled",
  "active",
  "rotated_out",
  "expired",
  "manual_removed",
]);

export const placementSourceEnum = pgEnum("placement_source", [
  "ai_agent",
  "manual",
  "rule_based",
  "rss_auto",
]);

// ============================================================================
// VAMS (VISUAL ASSET MANAGEMENT) ENUMS
// ============================================================================

export const vamsProviderEnum = pgEnum("vams_provider", [
  "unsplash",
  "pexels",
  "pixabay",
  "dalle",
  "flux",
  "upload",
  "url",
]);

export const vamsAssetStatusEnum = pgEnum("vams_asset_status", [
  "pending",
  "processing",
  "ready",
  "failed",
  "archived",
]);

export const vamsVariantTypeEnum = pgEnum("vams_variant_type", [
  "hero",
  "card",
  "og",
  "thumbnail",
  "gallery",
  "mobile",
]);
