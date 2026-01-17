/**
 * Auto Image Generator Module
 * Autonomous AI image generation for destination pages
 * 
 * Integrates with the auto-pilot system to generate:
 * - Hero images for destination pages
 * - Section images (attractions, hotels, restaurants, etc.)
 * 
 * Cost tracking:
 * - Flux 1.1 Pro: ~$0.03/image
 * - DALL-E 3: ~$0.08/image
 */

import { db } from "../db";
import { destinations, aiGenerationLogs, type Destination, type DestinationImage } from "@shared/schema";
import { eq, and, or, isNull, sql, asc, desc, lt } from "drizzle-orm";
import { generateImage, generateImagePrompt } from "./image-generation";
import { ObjectStorageAdapter } from "../services/storage-adapter";
import { createLogger } from "../lib/logger";
import { generateSlug } from "./utils";

const logger = createLogger("auto-image-generator");

// Image generation costs
export const IMAGE_COSTS = {
  flux: 0.03,
  dalle3: 0.08,
  dalle2: 0.02,
} as const;

// Configuration for auto image generation
export interface AutoImageConfig {
  enabled: boolean;
  maxImagesPerDay: number;
  maxDestinationsPerDay: number;
  requiredSectionImages: number;
  preferredProvider: 'flux' | 'dalle3' | 'auto';
}

export const defaultAutoImageConfig: AutoImageConfig = {
  enabled: true,
  maxImagesPerDay: 10,
  maxDestinationsPerDay: 3,
  requiredSectionImages: 4,
  preferredProvider: 'auto',
};

// Result types
export interface ImageGenerationResult {
  destinationId: string;
  destinationName: string;
  heroGenerated: boolean;
  heroUrl?: string;
  sectionImagesGenerated: number;
  sectionImages: DestinationImage[];
  totalCost: number;
  provider: string;
  duration: number;
  error?: string;
}

export interface DailyImageGenerationResult {
  date: string;
  destinationsProcessed: number;
  totalImagesGenerated: number;
  totalCost: number;
  results: ImageGenerationResult[];
  errors: Array<{ destinationId: string; error: string }>;
}

/**
 * Find destinations that need images
 * Returns destinations missing hero images or with fewer than required section images
 */
export async function findDestinationsNeedingImages(
  config: AutoImageConfig = defaultAutoImageConfig
): Promise<Destination[]> {
  logger.info("Finding destinations needing images");

  try {
    const destinationsNeedingImages = await db
      .select()
      .from(destinations)
      .where(
        and(
          eq(destinations.isActive, true),
          or(
            isNull(destinations.heroImage),
            eq(destinations.heroImage, ""),
            sql`jsonb_array_length(COALESCE(${destinations.images}, '[]'::jsonb)) < ${config.requiredSectionImages}`
          )
        )
      )
      .orderBy(
        asc(destinations.lastImageGenerated),
        desc(destinations.isActive)
      )
      .limit(config.maxDestinationsPerDay);

    logger.info({ count: destinationsNeedingImages.length }, "Found destinations needing images");
    return destinationsNeedingImages;
  } catch (error) {
    logger.error({ error: String(error) }, "Failed to find destinations needing images");
    return [];
  }
}

/**
 * Generate SEO-optimized alt text for a destination image
 */
function generateAltText(
  destinationName: string,
  country: string,
  imageType: 'hero' | 'section',
  sectionName?: string
): string {
  if (imageType === 'hero') {
    return `${destinationName}, ${country} - Stunning cityscape and skyline view showcasing the destination's iconic landmarks and architecture`;
  }
  
  if (sectionName) {
    const sectionDescriptions: Record<string, string> = {
      attractions: `Top tourist attractions and landmarks to visit in ${destinationName}`,
      hotels: `Luxury and boutique hotels and accommodations in ${destinationName}`,
      restaurants: `Fine dining and local cuisine restaurants in ${destinationName}`,
      districts: `Popular neighborhoods and districts to explore in ${destinationName}`,
      events: `Cultural events and festivals happening in ${destinationName}`,
      tips: `Travel tips and practical information for visiting ${destinationName}`,
    };
    return sectionDescriptions[sectionName] || `${sectionName} in ${destinationName}, ${country}`;
  }
  
  return `Travel scene from ${destinationName}, ${country}`;
}

/**
 * Download image from URL and upload to Object Storage
 */
async function downloadAndUploadImage(
  imageUrl: string,
  destinationId: string,
  imageType: 'hero' | 'section',
  sectionName?: string
): Promise<string | null> {
  const storage = new ObjectStorageAdapter();
  
  try {
    logger.info({ imageUrl, destinationId, imageType }, "Downloading image from URL");
    
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const timestamp = Date.now();
    const slug = generateSlug(destinationId);
    const filename = sectionName 
      ? `${slug}-${sectionName}-${timestamp}.jpg`
      : `${slug}-${imageType}-${timestamp}.jpg`;
    
    const key = `public/ai-generated/destinations/${filename}`;
    
    logger.info({ key, size: buffer.length }, "Uploading image to Object Storage");
    const url = await storage.upload(key, buffer);
    
    logger.info({ url }, "Image uploaded successfully");
    return url;
  } catch (error) {
    logger.error({ error: String(error), imageUrl }, "Failed to download and upload image");
    return null;
  }
}

/**
 * Generate hero image and section images for a destination
 */
export async function generateDestinationImages(
  destinationId: string,
  config: AutoImageConfig = defaultAutoImageConfig
): Promise<ImageGenerationResult> {
  const startTime = Date.now();
  let totalCost = 0;
  let provider = 'unknown';
  
  logger.info({ destinationId }, "Starting image generation for destination");
  
  try {
    const [destination] = await db
      .select()
      .from(destinations)
      .where(eq(destinations.id, destinationId));
    
    if (!destination) {
      throw new Error(`Destination not found: ${destinationId}`);
    }
    
    const result: ImageGenerationResult = {
      destinationId,
      destinationName: destination.name,
      heroGenerated: false,
      sectionImagesGenerated: 0,
      sectionImages: [],
      totalCost: 0,
      provider: 'unknown',
      duration: 0,
    };
    
    const existingImages = (destination.images || []) as DestinationImage[];
    const needsHero = !destination.heroImage;
    const existingSectionCount = existingImages.length;
    const neededSections = Math.max(0, config.requiredSectionImages - existingSectionCount);
    
    logger.info({ 
      destinationId, 
      name: destination.name, 
      needsHero, 
      existingSectionCount,
      neededSections 
    }, "Image requirements assessed");
    
    // Generate hero image if needed
    if (needsHero) {
      logger.info({ destinationId }, "Generating hero image");
      
      const heroPrompt = await generateImagePrompt({
        contentType: 'destination' as any,
        title: `${destination.name} Travel Guide`,
        description: `Hero banner image for ${destination.name}, ${destination.country} travel destination page`,
        location: destination.name,
        style: 'photorealistic',
        generateHero: true,
      });
      
      if (heroPrompt) {
        const imageUrl = await generateImage(heroPrompt, {
          size: '1792x1024',
          quality: 'hd',
          style: 'natural',
          imageType: 'hero',
        });
        
        if (imageUrl) {
          provider = imageUrl.includes('replicate') || heroPrompt.length > 500 ? 'flux' : 'dalle3';
          totalCost += IMAGE_COSTS[provider as keyof typeof IMAGE_COSTS] || IMAGE_COSTS.dalle3;
          
          const storedUrl = await downloadAndUploadImage(
            imageUrl,
            destinationId,
            'hero'
          );
          
          if (storedUrl) {
            const heroAlt = generateAltText(destination.name, destination.country, 'hero');
            
            await db
              .update(destinations)
              .set({
                heroImage: storedUrl,
                heroImageAlt: heroAlt,
                updatedAt: new Date(),
              } as any)
              .where(eq(destinations.id, destinationId));
            
            result.heroGenerated = true;
            result.heroUrl = storedUrl;
            
            logger.info({ destinationId, heroUrl: storedUrl }, "Hero image generated and saved");
          }
        }
      }
    }
    
    // Generate section images if needed
    if (neededSections > 0) {
      const sectionTypes = ['attractions', 'hotels', 'restaurants', 'districts'];
      const sectionsToGenerate = sectionTypes.slice(0, neededSections);
      
      logger.info({ destinationId, sections: sectionsToGenerate }, "Generating section images");
      
      const newImages: DestinationImage[] = [];
      
      for (const section of sectionsToGenerate) {
        const sectionPrompt = await generateImagePrompt({
          contentType: 'destination' as any,
          title: `${destination.name} ${section}`,
          description: `${section} section image for ${destination.name}, ${destination.country}`,
          location: destination.name,
          style: 'photorealistic',
          generateHero: false,
        });
        
        if (sectionPrompt) {
          const imageUrl = await generateImage(sectionPrompt, {
            size: '1024x1024',
            quality: 'standard',
            style: 'natural',
            imageType: 'content',
          });
          
          if (imageUrl) {
            const sectionProvider = imageUrl.includes('replicate') ? 'flux' : 'dalle3';
            const sectionCost = IMAGE_COSTS[sectionProvider as keyof typeof IMAGE_COSTS] || IMAGE_COSTS.dalle3;
            totalCost += sectionCost;
            
            const storedUrl = await downloadAndUploadImage(
              imageUrl,
              destinationId,
              'section',
              section
            );
            
            if (storedUrl) {
              const alt = generateAltText(destination.name, destination.country, 'section', section);
              
              const newImage: DestinationImage = {
                url: storedUrl,
                alt,
                caption: `${section.charAt(0).toUpperCase() + section.slice(1)} in ${destination.name}`,
                section,
                generatedAt: new Date().toISOString(),
                provider: sectionProvider,
                cost: sectionCost,
              };
              
              newImages.push(newImage);
              result.sectionImagesGenerated++;
              
              logger.info({ destinationId, section, url: storedUrl }, "Section image generated");
            }
          }
        }
      }
      
      // Update destination with new images
      if (newImages.length > 0) {
        const allImages = [...existingImages, ...newImages];
        
        await db
          .update(destinations)
          .set({
            images: allImages,
            lastImageGenerated: new Date(),
            updatedAt: new Date(),
          } as any)
          .where(eq(destinations.id, destinationId));
        
        result.sectionImages = newImages;
      }
    }
    
    // Update last image generated timestamp
    await db
      .update(destinations)
      .set({
        lastImageGenerated: new Date(),
        updatedAt: new Date(),
      } as any)
      .where(eq(destinations.id, destinationId));
    
    result.totalCost = totalCost;
    result.provider = provider;
    result.duration = Date.now() - startTime;
    
    // Log successful generation
    await db.insert(aiGenerationLogs).values({
      targetType: "destination_images",
      targetId: destinationId,
      provider: result.provider,
      model: result.provider === 'flux' ? 'flux-1.1-pro' : 'dall-e-3',
      prompt: `Generated ${result.heroGenerated ? 1 : 0} hero + ${result.sectionImagesGenerated} section images`,
      success: true,
      duration: result.duration,
    } as any);
    
    logger.info({
      destinationId,
      heroGenerated: result.heroGenerated,
      sectionImages: result.sectionImagesGenerated,
      totalCost: result.totalCost,
      duration: result.duration,
    }, "Image generation completed for destination");
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error({ error: errorMessage, destinationId, duration }, "Image generation failed");
    
    // Log failed generation
    await db.insert(aiGenerationLogs).values({
      targetType: "destination_images",
      targetId: destinationId,
      provider: provider,
      model: 'unknown',
      prompt: "Image generation attempt",
      success: false,
      error: errorMessage,
      duration,
    } as any);
    
    return {
      destinationId,
      destinationName: destinationId,
      heroGenerated: false,
      sectionImagesGenerated: 0,
      sectionImages: [],
      totalCost,
      provider,
      duration,
      error: errorMessage,
    };
  }
}

/**
 * Run daily image generation
 * Main entry point for auto-pilot system
 * Generates images for up to maxDestinationsPerDay destinations
 */
export async function runDailyImageGeneration(
  config: AutoImageConfig = defaultAutoImageConfig
): Promise<DailyImageGenerationResult> {
  const startTime = Date.now();
  const date = new Date().toISOString().split('T')[0];
  
  logger.info({ date, config }, "Starting daily image generation");
  
  const result: DailyImageGenerationResult = {
    date,
    destinationsProcessed: 0,
    totalImagesGenerated: 0,
    totalCost: 0,
    results: [],
    errors: [],
  };
  
  if (!config.enabled) {
    logger.info("Auto image generation is disabled");
    return result;
  }
  
  try {
    const destinationsToProcess = await findDestinationsNeedingImages(config);
    
    if (destinationsToProcess.length === 0) {
      logger.info("No destinations need images");
      return result;
    }
    
    let imagesGenerated = 0;
    
    for (const destination of destinationsToProcess) {
      if (imagesGenerated >= config.maxImagesPerDay) {
        logger.info({ maxReached: config.maxImagesPerDay }, "Daily image limit reached");
        break;
      }
      
      try {
        logger.info({ destinationId: destination.id, name: destination.name }, "Processing destination");
        
        const genResult = await generateDestinationImages(destination.id, config);
        
        result.results.push(genResult);
        result.destinationsProcessed++;
        result.totalCost += genResult.totalCost;
        
        const imagesFromThisDestination = (genResult.heroGenerated ? 1 : 0) + genResult.sectionImagesGenerated;
        result.totalImagesGenerated += imagesFromThisDestination;
        imagesGenerated += imagesFromThisDestination;
        
        if (genResult.error) {
          result.errors.push({
            destinationId: destination.id,
            error: genResult.error,
          });
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error({ error: errorMessage, destinationId: destination.id }, "Failed to process destination");
        
        result.errors.push({
          destinationId: destination.id,
          error: errorMessage,
        });
      }
    }
    
    const duration = Date.now() - startTime;
    
    logger.info({
      date,
      destinationsProcessed: result.destinationsProcessed,
      totalImagesGenerated: result.totalImagesGenerated,
      totalCost: result.totalCost,
      errors: result.errors.length,
      duration,
    }, "Daily image generation completed");
    
    return result;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error: errorMessage }, "Daily image generation failed");
    
    return result;
  }
}

/**
 * Get image generation statistics
 */
export async function getImageGenerationStats(): Promise<{
  totalDestinations: number;
  destinationsWithHero: number;
  destinationsWithFullImages: number;
  destinationsNeedingImages: number;
  recentGenerations: number;
}> {
  try {
    const allDestinations = await db.select().from(destinations).where(eq(destinations.isActive, true));
    
    const withHero = allDestinations.filter(d => d.heroImage && d.heroImage.length > 0).length;
    const withFullImages = allDestinations.filter(d => {
      const images = (d.images || []) as DestinationImage[];
      return d.heroImage && images.length >= defaultAutoImageConfig.requiredSectionImages;
    }).length;
    
    const needingImages = allDestinations.filter(d => {
      const images = (d.images || []) as DestinationImage[];
      return !d.heroImage || images.length < defaultAutoImageConfig.requiredSectionImages;
    }).length;
    
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentGenerations = allDestinations.filter(d => 
      d.lastImageGenerated && d.lastImageGenerated > oneDayAgo
    ).length;
    
    return {
      totalDestinations: allDestinations.length,
      destinationsWithHero: withHero,
      destinationsWithFullImages: withFullImages,
      destinationsNeedingImages: needingImages,
      recentGenerations,
    };
  } catch (error) {
    logger.error({ error: String(error) }, "Failed to get image generation stats");
    return {
      totalDestinations: 0,
      destinationsWithHero: 0,
      destinationsWithFullImages: 0,
      destinationsNeedingImages: 0,
      recentGenerations: 0,
    };
  }
}

export const autoImageGenerator = {
  findDestinationsNeedingImages,
  generateDestinationImages,
  runDailyImageGeneration,
  getImageGenerationStats,
  IMAGE_COSTS,
  defaultConfig: defaultAutoImageConfig,
};

export default autoImageGenerator;
