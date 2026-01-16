/**
 * Octopus - Image Metrics
 * 
 * PHASE 7.1: Per-surface image metrics
 * 
 * Features:
 * - Per surface tracking (homepage, destination, article)
 * - Reuse depth histogram
 * - Fallback frequency over time
 * 
 * ACTIVATION: ENABLED
 */

import { log } from '../lib/logger';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[ImageMetrics] ${msg}`, data),
};

type ImageSurface = 'homepage' | 'destination' | 'article' | 'card' | 'hero' | 'gallery';

interface SurfaceMetrics {
  surface: ImageSurface;
  totalImages: number;
  uniqueImages: number;
  reusedImages: number;
  fallbackCount: number;
  lastUpdated: Date;
}

interface ReuseHistogram {
  // Key: reuse count, Value: number of images with that reuse count
  // e.g., { 1: 50, 2: 20, 3: 5 } means 50 images used once, 20 used twice, etc.
  distribution: Record<number, number>;
  maxReuseDepth: number;
  averageReuse: number;
}

interface FallbackEvent {
  timestamp: Date;
  surface: ImageSurface;
  entityType: string;
  entityId: string;
  reason: string;
}

class ImageMetrics {
  private surfaceMetrics: Map<ImageSurface, SurfaceMetrics> = new Map();
  private reuseCounter: Map<string, number> = new Map(); // imageUrl -> reuse count
  private fallbackEvents: FallbackEvent[] = [];
  private maxFallbackEvents = 500;

  constructor() {
    this.initializeSurfaces();
  }

  private initializeSurfaces(): void {
    const surfaces: ImageSurface[] = [
      'homepage', 'destination', 'article', 'card', 'hero', 'gallery'
    ];

    for (const surface of surfaces) {
      this.surfaceMetrics.set(surface, {
        surface,
        totalImages: 0,
        uniqueImages: 0,
        reusedImages: 0,
        fallbackCount: 0,
        lastUpdated: new Date(),
      });
    }
  }

  /**
   * Record an image usage
   */
  recordUsage(
    surface: ImageSurface,
    imageUrl: string,
    _entityType: string,
    _entityId: string
  ): void {
    const metrics = this.surfaceMetrics.get(surface);
    if (!metrics) return;

    // Track total
    metrics.totalImages++;

    // Track reuse
    const currentReuse = this.reuseCounter.get(imageUrl) || 0;
    if (currentReuse === 0) {
      metrics.uniqueImages++;
    } else {
      metrics.reusedImages++;
    }
    this.reuseCounter.set(imageUrl, currentReuse + 1);

    metrics.lastUpdated = new Date();
  }

  /**
   * Record a fallback event
   */
  recordFallback(
    surface: ImageSurface,
    entityType: string,
    entityId: string,
    reason: string
  ): void {
    const metrics = this.surfaceMetrics.get(surface);
    if (metrics) {
      metrics.fallbackCount++;
      metrics.lastUpdated = new Date();
    }

    this.fallbackEvents.push({
      timestamp: new Date(),
      surface,
      entityType,
      entityId,
      reason,
    });

    // Prune old events
    if (this.fallbackEvents.length > this.maxFallbackEvents) {
      this.fallbackEvents = this.fallbackEvents.slice(-this.maxFallbackEvents);
    }

    logger.info('Fallback recorded', { surface, entityType, entityId, reason });
  }

  /**
   * Get metrics for a specific surface
   */
  getSurfaceMetrics(surface: ImageSurface): SurfaceMetrics | undefined {
    return this.surfaceMetrics.get(surface);
  }

  /**
   * Get all surface metrics
   */
  getAllSurfaceMetrics(): SurfaceMetrics[] {
    return Array.from(this.surfaceMetrics.values());
  }

  /**
   * Get reuse histogram
   */
  getReuseHistogram(): ReuseHistogram {
    const distribution: Record<number, number> = {};
    let maxReuseDepth = 0;
    let totalReuse = 0;
    let imageCount = 0;

    for (const count of this.reuseCounter.values()) {
      distribution[count] = (distribution[count] || 0) + 1;
      if (count > maxReuseDepth) maxReuseDepth = count;
      totalReuse += count;
      imageCount++;
    }

    return {
      distribution,
      maxReuseDepth,
      averageReuse: imageCount > 0 ? totalReuse / imageCount : 0,
    };
  }

  /**
   * Get fallback frequency over time (last 24 hours, by hour)
   */
  getFallbackFrequency(): { hour: string; count: number }[] {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const hourlyBuckets: Record<string, number> = {};

    // Initialize all 24 hours
    for (let i = 0; i < 24; i++) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      const key = hour.toISOString().slice(0, 13);
      hourlyBuckets[key] = 0;
    }

    // Count events
    for (const event of this.fallbackEvents) {
      if (event.timestamp < oneDayAgo) continue;
      const key = event.timestamp.toISOString().slice(0, 13);
      if (hourlyBuckets[key] !== undefined) {
        hourlyBuckets[key]++;
      }
    }

    return Object.entries(hourlyBuckets)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour));
  }

  /**
   * Get recent fallback events
   */
  getRecentFallbacks(limit = 20): FallbackEvent[] {
    return this.fallbackEvents.slice(-limit).reverse();
  }

  /**
   * Get summary for API
   */
  getSummary(): {
    surfaces: SurfaceMetrics[];
    reuseHistogram: ReuseHistogram;
    fallbackFrequency: { hour: string; count: number }[];
    totalUniqueImages: number;
    totalReusedImages: number;
    fallbackRate: number;
  } {
    const surfaces = this.getAllSurfaceMetrics();
    const totalImages = surfaces.reduce((sum, s) => sum + s.totalImages, 0);
    const totalFallbacks = surfaces.reduce((sum, s) => sum + s.fallbackCount, 0);

    return {
      surfaces,
      reuseHistogram: this.getReuseHistogram(),
      fallbackFrequency: this.getFallbackFrequency(),
      totalUniqueImages: this.reuseCounter.size,
      totalReusedImages: surfaces.reduce((sum, s) => sum + s.reusedImages, 0),
      fallbackRate: totalImages > 0 ? (totalFallbacks / totalImages) * 100 : 0,
    };
  }

  /**
   * Reset all metrics (for testing)
   */
  reset(): void {
    this.initializeSurfaces();
    this.reuseCounter.clear();
    this.fallbackEvents = [];
  }
}

// Singleton
let instance: ImageMetrics | null = null;

export function getImageMetrics(): ImageMetrics {
  if (!instance) {
    instance = new ImageMetrics();
  }
  return instance;
}

export { ImageMetrics, ImageSurface, SurfaceMetrics, ReuseHistogram, FallbackEvent };
