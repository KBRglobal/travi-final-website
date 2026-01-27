/**
 * TRAVI Content Generation - Processing Orchestrator
 *
 * Coordinates the full content generation pipeline:
 * 1. Discover locations (Wikipedia + OSM)
 * 2. Enrich with Google Places
 * 3. Generate AI content (rotating between models)
 * 4. Find images (Freepik)
 * 5. Validate and save to database
 */

import { db } from "../db";
import { sql } from "drizzle-orm";

import {
  discoverLocations,
  type DiscoveredLocation,
  type LocationCategory,
} from "./location-discovery";
import { enrichWithGooglePlaces, isGooglePlacesAvailable } from "./google-places-client";
import { searchLocationImages, isFreepikAvailable, type FreepikImage } from "./freepik-client";
import { callAI, getAIStatus, type AIModelKey } from "./ai-orchestrator";
import {
  validateFullLocation,
  validateNoPrices,
  validateAttribution,
  generateSlug,
  type DestinationSlug,
} from "./validation";
import {
  createJob,
  updateJobStatus,
  CheckpointTracker,
  resumeFromCheckpoint,
} from "./checkpoint-manager";
import { isProcessingPaused, getTodayUsageStats, getBudgetStatus } from "./budget-manager";
import { DESTINATION_METADATA, getDestinationBySlug } from "./destination-seeder";

// In-memory log buffer for real-time monitoring (ring buffer, max 100 entries)
const MAX_LOG_ENTRIES = 100;
const logBuffer: Array<{ timestamp: string; level: string; message: string }> = [];

function addLog(level: "info" | "warn" | "error", message: string) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOG_ENTRIES) {
    logBuffer.shift();
  }
}

export function getRecentLogs(limit: number = 20): typeof logBuffer {
  return logBuffer.slice(-limit);
}

export function clearLogs(): void {
  logBuffer.length = 0;
}

export interface ProcessingOptions {
  dryRun?: boolean; // Don't save to database
  skipGooglePlaces?: boolean; // Skip Google Places enrichment
  skipFreepik?: boolean; // Skip Freepik image search
  skipAI?: boolean; // Skip AI content generation
  batchSize?: number; // Locations per batch
  maxLocations?: number; // Max locations to process
}

export interface ProcessingProgress {
  jobId: string;
  destinationSlug: DestinationSlug;
  category: LocationCategory;
  status: "running" | "paused" | "completed" | "failed" | "budget_exceeded";
  totalDiscovered: number;
  processed: number;
  succeeded: number;
  failed: number;
  currentLocation?: string;
  estimatedCost: number;
  elapsedMs: number;
}

export interface ProcessedLocation {
  location: DiscoveredLocation;
  googlePlaces?: Awaited<ReturnType<typeof enrichWithGooglePlaces>>["enriched"];
  images?: FreepikImage[];
  aiContent?: {
    metaTitle: string;
    metaDescription: string;
    shortDescription: string;
    whyVisit: string;
    keyHighlights: string[];
    faq: Array<{ question: string; answer: string }>;
    modelUsed: string; // Full model ID for database enum
    cost: number;
  };
  validationResult: ReturnType<typeof validateFullLocation>;
  totalCost: number;
}

// Process a single destination and category
export async function processDestinationCategory(
  destinationSlug: DestinationSlug,
  category: LocationCategory,
  options: ProcessingOptions = {}
): Promise<ProcessingProgress> {
  const startTime = Date.now();
  const rawDestination = getDestinationBySlug(destinationSlug);

  if (!rawDestination) {
    throw new Error(`Unknown destination: ${destinationSlug}`);
  }

  // Map to expected format (WHITELISTED_DESTINATIONS uses 'city', not 'cityName')
  const destination = {
    slug: rawDestination.slug,
    cityName: rawDestination.city,
    country: rawDestination.country,
  };

  addLog("info", `Starting ${category} processing for ${destination.cityName}`);

  // Create job using valid enum value ('enrich_locations' for full processing)
  const jobId = await createJob("enrich_locations", destinationSlug, category);
  if (!jobId) {
    throw new Error("Failed to create processing job");
  }

  await updateJobStatus(jobId, "running");
  const tracker = new CheckpointTracker(jobId);

  let totalCost = 0;
  let status: ProcessingProgress["status"] = "running";
  let discoveryResult: Awaited<ReturnType<typeof discoverLocations>> | null = null;

  try {
    // Step 1: Discover locations
    addLog("info", `Discovering ${category}s...`);
    discoveryResult = await discoverLocations(destinationSlug, category, {
      limit: options.maxLocations || 100,
    });

    // Process ALL locations - don't filter out any!
    // Invalid locations will be saved with 'error' status
    const locations = discoveryResult.locations;
    const validCount = locations.filter(l => l.validationErrors.length === 0).length;
    const invalidCount = locations.length - validCount;
    addLog(
      "info",
      `Found ${locations.length} locations (${validCount} valid, ${invalidCount} with validation warnings)`
    );

    tracker.updateIndices(0, 0);

    // Step 2: Process each location
    const batchSize = options.batchSize || 10;

    for (let i = 0; i < locations.length; i += batchSize) {
      // Check for pause/stop conditions
      if (tracker.shouldStop()) {
        status = "paused";
        break;
      }

      if (isProcessingPaused()) {
        addLog("warn", "Processing paused due to budget");
        status = "budget_exceeded";
        await updateJobStatus(jobId, "budget_exceeded");
        break;
      }

      const batch = locations.slice(i, i + batchSize);
      addLog(
        "info",
        `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(locations.length / batchSize)}`
      );

      for (const location of batch) {
        try {
          const result = await processLocation(location, destination.cityName, category, options);
          totalCost += result.totalCost;

          // Save ALL locations regardless of validation status
          // Status will be 'ready' if complete, 'error' if something failed
          if (!options.dryRun) {
            await saveLocationToDatabase(result, destinationSlug);
          }

          await tracker.recordProcessed(location.externalId, result.validationResult.isValid);
        } catch (error) {
          addLog("error", `Error processing ${location.name}: ${String(error)}`);

          // Even if processing failed, try to save with error status
          if (!options.dryRun) {
            try {
              await saveErrorLocation(location, destinationSlug, String(error));
            } catch (saveError) {
              addLog(
                "error",
                `Failed to save error status for ${location.name}: ${String(saveError)}`
              );
            }
          }

          await tracker.recordProcessed(location.externalId, false, String(error));
        }
      }

      tracker.updateBatchIndex(i / batchSize);
    }

    if (status === "running") {
      status = "completed";
      await updateJobStatus(jobId, "completed");
    }
  } catch (error) {
    addLog("error", `Processing failed: ${String(error)}`);
    status = "failed";
    await updateJobStatus(jobId, "failed", String(error));
  }

  await tracker.save();
  const stats = tracker.getStats();

  return {
    jobId,
    destinationSlug,
    category,
    status,
    totalDiscovered: discoveryResult?.stats.mergedCount || 0,
    processed: stats.processed,
    succeeded: stats.success,
    failed: stats.failed,
    estimatedCost: totalCost,
    elapsedMs: Date.now() - startTime,
  };
}

// Process a single location
async function processLocation(
  location: DiscoveredLocation,
  cityName: string,
  category: LocationCategory,
  options: ProcessingOptions
): Promise<ProcessedLocation> {
  let totalCost = 0;
  let googlePlaces: ProcessedLocation["googlePlaces"];
  let images: ProcessedLocation["images"];
  let aiContent: ProcessedLocation["aiContent"];
  const errors: string[] = [];

  // Enrich with Google Places
  if (!options.skipGooglePlaces && isGooglePlacesAvailable()) {
    try {
      const enrichResult = await enrichWithGooglePlaces(location.name, cityName, {
        lat: location.latitude,
        lng: location.longitude,
      });
      googlePlaces = enrichResult.enriched;
      totalCost += enrichResult.totalCost;
    } catch (error) {
      errors.push(`Google Places: ${String(error)}`);
    }
  }

  // Generate AI content - MANDATORY!
  if (!options.skipAI) {
    try {
      const aiResult = await generateAIContent(location, cityName, category);
      if (aiResult) {
        aiContent = aiResult;
        totalCost += aiResult.cost;
      } else {
        errors.push("AI content generation failed: no model available or all attempts failed");
      }
    } catch (error) {
      errors.push(`AI content: ${String(error)}`);
    }
  }

  // Find images from Freepik
  if (!options.skipFreepik && isFreepikAvailable()) {
    try {
      images = await searchLocationImages(location.name, cityName, category, 3);
      if (images && images.length > 0) {
      } else {
        errors.push("No Freepik images found");
      }
    } catch (error) {
      errors.push(`Freepik: ${String(error)}`);
    }
  }

  // Validate everything
  const validationResult = validateFullLocation({
    location: {
      name: location.name,
      slug: location.slug,
      category,
      city: location.city,
      country: location.country,
    },
    details: {
      latitude: googlePlaces?.latitude || location.latitude,
      longitude: googlePlaces?.longitude || location.longitude,
    },
    content: aiContent
      ? {
          metaTitle: aiContent.metaTitle,
          metaDescription: aiContent.metaDescription,
          shortDescription: aiContent.shortDescription,
          whyVisit: aiContent.whyVisit,
          keyHighlights: aiContent.keyHighlights,
          faq: aiContent.faq,
        }
      : undefined,
    destinationSlug: location.destinationSlug,
  });

  // AI content is MANDATORY - if missing, mark as invalid
  if (!aiContent && !options.skipAI) {
    validationResult.isValid = false;
    (validationResult.errors as any).push("AI content is required but was not generated");
  }

  // Check FAQ count - must have at least 7
  if (aiContent && (!aiContent.faq || aiContent.faq.length < 7)) {
    validationResult.isValid = false;
    (validationResult.errors as any).push(
      `FAQ incomplete: ${aiContent.faq?.length || 0}/7 questions`
    );
  }

  // Additional validation: check for prices in AI content
  if (aiContent) {
    const priceCheck = validateNoPrices(
      [
        aiContent.metaDescription,
        aiContent.shortDescription,
        aiContent.whyVisit,
        ...aiContent.keyHighlights,
        ...aiContent.faq.map(f => f.answer),
      ].join(" ") as any,
      undefined as any
    );

    if (!priceCheck.isValid) {
      validationResult.isValid = false;
      (validationResult.errors as any).push(...priceCheck.errors);
    }
  }

  // Add processing errors to validation result
  (validationResult.errors as any).push(...errors);

  if (validationResult.errors.length > 0) {
  }

  return {
    location,
    googlePlaces,
    images,
    aiContent,
    validationResult,
    totalCost,
  };
}

// Generate AI content for a location
async function generateAIContent(
  location: DiscoveredLocation,
  cityName: string,
  category: LocationCategory
): Promise<ProcessedLocation["aiContent"] | null> {
  const categoryContext = {
    attraction: "tourist attraction, landmark, or point of interest",
    hotel: "hotel or accommodation",
    restaurant: "restaurant or dining establishment",
  };

  const prompt = `Generate travel content for "${location.name}" in ${cityName}.
This is a ${categoryContext[category]}.

Background information (from Wikipedia/OpenStreetMap):
${location.sources.wikipedia?.extract || "No description available."}

REQUIREMENTS:
1. Do NOT include any prices, costs, or monetary values
2. Do NOT mention admission fees, ticket prices, or room rates
3. Focus on the experience, atmosphere, and unique features
4. Use engaging, SEO-friendly language
5. Generate exactly 7 FAQ questions with concise answers

Respond in JSON format:
{
  "metaTitle": "Title under 60 characters",
  "metaDescription": "Description under 160 characters",
  "shortDescription": "2-3 sentence summary",
  "whyVisit": "Compelling paragraph about why to visit",
  "keyHighlights": ["highlight1", "highlight2", "highlight3", "highlight4", "highlight5"],
  "faq": [
    {"question": "Q1", "answer": "A1"},
    {"question": "Q2", "answer": "A2"},
    {"question": "Q3", "answer": "A3"},
    {"question": "Q4", "answer": "A4"},
    {"question": "Q5", "answer": "A5"},
    {"question": "Q6", "answer": "A6"},
    {"question": "Q7", "answer": "A7"}
  ]
}`;

  const result = await callAI(prompt, {
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!result) {
    return null;
  }

  try {
    // Extract JSON from response
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in AI response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Enforce length limits to prevent database errors
    const metaTitle = (parsed.metaTitle || "").slice(0, 60);
    const metaDescription = (parsed.metaDescription || "").slice(0, 160);

    return {
      metaTitle,
      metaDescription,
      shortDescription: parsed.shortDescription || "",
      whyVisit: parsed.whyVisit || "",
      keyHighlights: parsed.keyHighlights || [],
      faq: parsed.faq || [],
      modelUsed: result.modelUsed,
      cost: result.estimatedCost,
    };
  } catch (error) {
    return null;
  }
}

// Save error location to database
async function saveErrorLocation(
  location: DiscoveredLocation,
  destinationSlug: DestinationSlug,
  errorMessage: string
): Promise<void> {
  const sourceWikipediaId = location.sources.wikipedia?.url || null;
  const sourceOsmId =
    (location.sources.osm as any)?.nodeId?.toString() ||
    (location.sources.osm as any)?.id?.toString() ||
    null;
  const sourceTripAdvisorId =
    (location.sources.tripadvisor as any)?.id ||
    (location.sources.tripadvisor as any)?.locationId ||
    null;

  await db.execute(sql`
    INSERT INTO travi_locations (
      id, name, slug, category, destination_id,
      city, country, status, last_error, validation_errors,
      source_wikipedia, source_wikipedia_url,
      source_osm, source_osm_id,
      source_tripadvisor, source_tripadvisor_id
    ) VALUES (
      gen_random_uuid(),
      ${location.name},
      ${location.slug},
      ${location.category}::travi_location_category,
      ${destinationSlug},
      ${location.city},
      ${location.country},
      'error'::travi_location_status,
      ${errorMessage},
      ${JSON.stringify([errorMessage])}::jsonb,
      ${!!location.sources.wikipedia},
      ${sourceWikipediaId},
      ${!!location.sources.osm},
      ${sourceOsmId},
      ${!!location.sources.tripadvisor},
      ${sourceTripAdvisorId}
    )
    ON CONFLICT (slug) DO UPDATE SET
      status = 'error'::travi_location_status,
      last_error = ${errorMessage},
      validation_errors = ${JSON.stringify([errorMessage])}::jsonb,
      updated_at = now()
  `);
}

// Save processed location to database
async function saveLocationToDatabase(
  result: ProcessedLocation,
  destinationSlug: DestinationSlug
): Promise<void> {
  const { location, googlePlaces, images, aiContent, validationResult } = result;

  // Determine status: 'ready' only if everything is valid, otherwise 'error'
  const status = validationResult.isValid ? "ready" : "error";
  const lastError = validationResult.isValid ? null : validationResult.errors.join("; ");
  const validationErrorsJson = JSON.stringify(validationResult.errors);

  try {
    // Extract source IDs based on source type
    const sourceWikipediaId = location.sources.wikipedia?.url || null;
    const sourceOsmId =
      (location.sources.osm as any)?.nodeId?.toString() ||
      (location.sources.osm as any)?.id?.toString() ||
      null;
    const sourceTripAdvisorId =
      (location.sources.tripadvisor as any)?.id ||
      (location.sources.tripadvisor as any)?.locationId ||
      null;

    // Insert location - using existing schema columns
    // Status is 'ready' if complete, 'error' if something failed
    const locationResult = await db.execute(sql`
      INSERT INTO travi_locations (
        id, name, slug, category, destination_id,
        city, country, status, last_error, validation_errors,
        source_wikipedia, source_wikipedia_url,
        source_osm, source_osm_id,
        source_tripadvisor, source_tripadvisor_id
      ) VALUES (
        gen_random_uuid(),
        ${location.name},
        ${location.slug},
        ${location.category}::travi_location_category,
        ${destinationSlug},
        ${location.city},
        ${location.country},
        ${status}::travi_location_status,
        ${lastError},
        ${validationErrorsJson}::jsonb,
        ${!!location.sources.wikipedia},
        ${sourceWikipediaId},
        ${!!location.sources.osm},
        ${sourceOsmId},
        ${!!location.sources.tripadvisor},
        ${sourceTripAdvisorId}
      )
      ON CONFLICT (slug) DO UPDATE SET
        status = ${status}::travi_location_status,
        last_error = ${lastError},
        validation_errors = ${validationErrorsJson}::jsonb,
        updated_at = now()
      RETURNING id
    `);

    const locationId = locationResult.rows[0]?.id;
    if (!locationId) return;

    // Upsert details - check if exists first (no unique constraint on location_id)
    const lat = googlePlaces?.latitude || location.latitude;
    const lng = googlePlaces?.longitude || location.longitude;
    const existingDetails = await db.execute(sql`
      SELECT id FROM travi_location_details WHERE location_id = ${locationId}
    `);

    if (existingDetails.rows.length > 0) {
      await db.execute(sql`
        UPDATE travi_location_details SET
          latitude = ${lat?.toString() || null},
          longitude = ${lng?.toString() || null},
          full_address = ${googlePlaces?.formattedAddress || null},
          updated_at = now()
        WHERE location_id = ${locationId}
      `);
    } else {
      await db.execute(sql`
        INSERT INTO travi_location_details (
          id, location_id, latitude, longitude,
          full_address, phone, website, google_place_id,
          google_rating, google_review_count, price_level, business_status
        ) VALUES (
          gen_random_uuid(),
          ${locationId},
          ${lat?.toString() || null},
          ${lng?.toString() || null},
          ${googlePlaces?.formattedAddress || null},
          ${googlePlaces?.phoneNumber || null},
          ${googlePlaces?.website || null},
          ${googlePlaces?.placeId || null},
          ${googlePlaces?.rating?.toString() || null},
          ${googlePlaces?.userRatingsTotal || null},
          ${googlePlaces?.priceLevel || null},
          ${googlePlaces?.businessStatus || null}
        )
      `);
    }

    // Insert content if AI generated - using existing schema columns
    if (aiContent) {
      await db.execute(sql`
        INSERT INTO travi_location_content (
          id, location_id, language, meta_title, meta_description,
          short_description, why_visit, key_highlights, faq,
          ai_model, generated_at
        ) VALUES (
          gen_random_uuid(),
          ${locationId},
          'en',
          ${aiContent.metaTitle},
          ${aiContent.metaDescription},
          ${aiContent.shortDescription},
          ${aiContent.whyVisit},
          ${JSON.stringify(aiContent.keyHighlights)}::jsonb,
          ${JSON.stringify(aiContent.faq)}::jsonb,
          ${aiContent.modelUsed}::travi_ai_model,
          now()
        )
        ON CONFLICT (location_id, language) DO UPDATE SET
          meta_title = EXCLUDED.meta_title,
          meta_description = EXCLUDED.meta_description,
          short_description = EXCLUDED.short_description,
          why_visit = EXCLUDED.why_visit,
          key_highlights = EXCLUDED.key_highlights,
          faq = EXCLUDED.faq,
          ai_model = EXCLUDED.ai_model,
          updated_at = now()
      `);
    }

    // Insert images - delete existing and insert new (no unique constraint on location_id+freepik_id)
    if (images && images.length > 0) {
      // Delete existing images for this location
      await db.execute(sql`
        DELETE FROM travi_location_images WHERE location_id = ${locationId}
      `);

      // Insert new images
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        await db.execute(sql`
          INSERT INTO travi_location_images (
            id, location_id, image_url, thumbnail_url,
            freepik_id, photographer, attribution, sort_order, is_hero
          ) VALUES (
            gen_random_uuid(),
            ${locationId},
            ${img.url},
            ${img.thumbnailUrl},
            ${img.id},
            ${img.author.name},
            ${img.attribution.creditText},
            ${i},
            ${i === 0}
          )
        `);
      }
    }
  } catch (error) {
    throw error;
  }
}

// Get current processing status
export async function getProcessingStatus(): Promise<{
  aiStatus: ReturnType<typeof getAIStatus>;
  budgetStatus: ReturnType<typeof getBudgetStatus>;
  usageStats: Awaited<ReturnType<typeof getTodayUsageStats>>;
  isPaused: boolean;
  googlePlacesAvailable: boolean;
  freepikAvailable: boolean;
  destinationsCount: number;
}> {
  return {
    aiStatus: getAIStatus(),
    budgetStatus: getBudgetStatus(),
    usageStats: (await getTodayUsageStats()) as any,
    isPaused: isProcessingPaused(),
    googlePlacesAvailable: isGooglePlacesAvailable(),
    freepikAvailable: isFreepikAvailable(),
    destinationsCount: DESTINATION_METADATA.length,
  };
}

// Dry run for testing
export async function dryRunDiscovery(
  destinationSlug: DestinationSlug,
  category: LocationCategory,
  limit: number = 10
): Promise<{
  locations: DiscoveredLocation[];
  stats: {
    total: number;
    valid: number;
    withWikipedia: number;
    withOSM: number;
  };
}> {
  const result = await discoverLocations(destinationSlug, category, {
    limit,
    skipOSM: false,
    skipWikipedia: false,
  });

  return {
    locations: result.locations.slice(0, limit),
    stats: {
      total: result.locations.length,
      valid: result.locations.filter(l => l.validationErrors.length === 0).length,
      withWikipedia: result.locations.filter(l => l.sources.wikipedia).length,
      withOSM: result.locations.filter(l => l.sources.osm).length,
    },
  };
}
