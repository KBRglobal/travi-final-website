/**
 * LazyImage Component
 * SEO-optimized image component with responsive images, lazy loading, and schema support
 * This is the PRIMARY image component - use this for all images in the application
 */

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { generateSrcset, generateSizes, ImageLocation } from "@/lib/image-seo-utils";

// ==================== Types ====================

export interface LazyImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'loading'> {
  // Required
  src: string;
  alt: string;

  // Dimensions (recommended for CLS prevention)
  width?: number;
  height?: number;

  // SEO enhancements
  title?: string;
  caption?: string;

  // Multilingual alt text
  altHe?: string;
  altAr?: string;

  // Schema metadata
  contentLocation?: ImageLocation;
  datePublished?: string;
  author?: string;
  pageUrl?: string;

  // Loading behavior
  priority?: boolean; // For LCP images (above the fold)
  loading?: 'lazy' | 'eager';
  fetchPriority?: 'high' | 'low' | 'auto';

  // Responsive images
  srcset?: string;
  sizes?: string;
  imageType?: 'hero' | 'featured' | 'content' | 'thumbnail' | 'gallery';

  // Fallback
  fallback?: string;

  // Display options
  aspectRatio?: 'video' | 'square' | 'portrait' | 'auto' | '4/3' | '3/2';
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';

  // Figure/Caption
  showCaption?: boolean;
  showSchema?: boolean;
  captionClassName?: string;
  figureClassName?: string;

  // Container
  containerClassName?: string;
}

// ==================== Main Component ====================

export function LazyImage({
  src,
  alt,
  width,
  height,
  title,
  caption,
  altHe,
  altAr,
  contentLocation,
  datePublished,
  author = 'TripMD',
  pageUrl,
  priority = false,
  loading: loadingProp,
  fetchPriority: fetchPriorityProp,
  srcset: srcsetProp,
  sizes: sizesProp,
  imageType = 'content',
  fallback = "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=300&fit=crop",
  aspectRatio = "auto",
  objectFit = "cover",
  showCaption = false,
  showSchema = false,
  captionClassName,
  figureClassName,
  containerClassName,
  className,
  style,
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Determine loading strategy
  const loading = loadingProp || (priority ? 'eager' : 'lazy');
  const fetchPriority = fetchPriorityProp || (priority ? 'high' : 'auto');

  // Generate responsive attributes automatically for supported sources
  const shouldGenerateSrcset = src.includes('unsplash.com') || src.includes('cloudinary') || src.includes('imgix');
  const srcset = srcsetProp || (shouldGenerateSrcset ? generateSrcset(src) : undefined);
  const sizes = sizesProp || (srcset ? generateSizes(imageType) : undefined);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  // Aspect ratio classes
  const aspectClasses: Record<string, string> = {
    video: "aspect-video",
    square: "aspect-square",
    portrait: "aspect-[3/4]",
    "4/3": "aspect-[4/3]",
    "3/2": "aspect-[3/2]",
    auto: "",
  };

  // Calculate aspect ratio style for auto mode
  const containerStyle = aspectRatio === 'auto' && width && height
    ? { ...style, aspectRatio: `${width}/${height}` }
    : style;

  // Object fit classes
  const objectFitClasses: Record<string, string> = {
    cover: "object-cover",
    contain: "object-contain",
    fill: "object-fill",
    none: "object-none",
    "scale-down": "object-scale-down",
  };

  // Generate schema data for JSON-LD
  const generateSchemaMarkup = () => {
    if (!showSchema) return null;

    const schema: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "ImageObject",
      contentUrl: error ? fallback : src,
      name: title || alt,
      description: alt,
    };

    if (pageUrl) schema.url = pageUrl;
    if (width) schema.width = String(width);
    if (height) schema.height = String(height);
    if (datePublished) schema.datePublished = datePublished;
    if (author) {
      schema.author = { "@type": "Organization", name: author };
    }
    if (caption) schema.caption = caption;

    // Detect format
    const formatMatch = src.match(/\.(webp|jpg|jpeg|png|gif)(\?|$)/i);
    if (formatMatch) {
      const format = formatMatch[1].toLowerCase();
      schema.encodingFormat = `image/${format === 'jpg' ? 'jpeg' : format}`;
    }

    if (contentLocation) {
      schema.contentLocation = {
        "@type": "Place",
        name: contentLocation.name,
        address: {
          "@type": "PostalAddress",
          addressLocality: contentLocation.address?.addressLocality || "Dubai",
          addressRegion: contentLocation.address?.addressRegion || "Dubai",
          addressCountry: contentLocation.address?.addressCountry || "AE",
        },
      };
      if (contentLocation.geo) {
        (schema.contentLocation as Record<string, unknown>).geo = {
          "@type": "GeoCoordinates",
          latitude: contentLocation.geo.latitude,
          longitude: contentLocation.geo.longitude,
        };
      }
    }

    return schema;
  };

  // Image container element
  const imageContainer = (
    <div
      ref={containerRef}
      className={cn(
        "overflow-hidden bg-muted relative",
        aspectClasses[aspectRatio],
        containerClassName
      )}
      style={containerStyle}
    >
      {/* Placeholder skeleton */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-muted via-muted/50 to-muted animate-pulse" />
      )}

      {/* Picture element for format support */}
      {isInView && (
        <picture>
          {/* WebP source for supported CDNs */}
          {srcset && src.includes('unsplash.com') && (
            <source
              type="image/webp"
              srcSet={srcset.replace(/\.(jpg|jpeg|png)/gi, '.webp')}
              sizes={sizes}
            />
          )}

          {/* Main image */}
          <img
            src={error ? fallback : src}
            alt={alt}
            title={title}
            width={width}
            height={height}
            loading={loading}
            decoding="async"
            srcSet={!error && srcset ? srcset : undefined}
            sizes={!error && sizes ? sizes : undefined}
            onLoad={() => setIsLoaded(true)}
            onError={() => setError(true)}
            className={cn(
              "w-full h-full transition-opacity duration-300",
              objectFitClasses[objectFit],
              isLoaded ? "opacity-100" : "opacity-0",
              className
            )}
            // @ts-expect-error fetchPriority is valid but not in types
            fetchpriority={fetchPriority}
            {...props}
          />
        </picture>
      )}
    </div>
  );

  // Return just the image if no caption or schema needed
  if (!showCaption && !showSchema && !caption) {
    return imageContainer;
  }

  // Full figure with caption and schema
  const schemaMarkup = generateSchemaMarkup();

  return (
    <figure
      itemScope={showSchema}
      itemType={showSchema ? "https://schema.org/ImageObject" : undefined}
      className={figureClassName}
    >
      {imageContainer}

      {/* Caption */}
      {(showCaption || caption) && caption && (
        <figcaption
          itemProp={showSchema ? "caption" : undefined}
          className={cn(
            "mt-2 text-sm text-muted-foreground",
            captionClassName
          )}
        >
          {caption}
        </figcaption>
      )}

      {/* Schema metadata (hidden) */}
      {showSchema && (
        <>
          <meta itemProp="contentUrl" content={src} />
          <meta itemProp="name" content={title || alt} />
          <meta itemProp="description" content={alt} />
          {width && <meta itemProp="width" content={String(width)} />}
          {height && <meta itemProp="height" content={String(height)} />}
          {datePublished && <meta itemProp="datePublished" content={datePublished} />}
        </>
      )}

      {/* JSON-LD Schema */}
      {showSchema && schemaMarkup && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaMarkup) }}
        />
      )}
    </figure>
  );
}

// ==================== Hero Variant ====================

export interface HeroImageProps extends Omit<LazyImageProps, 'priority' | 'imageType' | 'aspectRatio'> {
  overlayOpacity?: number;
  children?: React.ReactNode;
  minHeight?: string;
}

export function HeroImage({
  overlayOpacity = 0.4,
  children,
  minHeight = "400px",
  className,
  containerClassName,
  ...props
}: HeroImageProps) {
  return (
    <div className={cn("relative", containerClassName)} style={{ minHeight }}>
      <LazyImage
        {...props}
        priority
        imageType="hero"
        aspectRatio="auto"
        className={cn("absolute inset-0 w-full h-full", className)}
        containerClassName="absolute inset-0"
      />

      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black pointer-events-none"
        style={{ opacity: overlayOpacity }}
      />

      {/* Content */}
      {children && (
        <div className="relative z-10 h-full flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}

// ==================== Gallery Variant ====================

export interface GalleryImageProps extends Omit<LazyImageProps, 'imageType'> {
  onClick?: () => void;
}

export function GalleryImage({
  onClick,
  className,
  ...props
}: GalleryImageProps) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      className={cn(
        onClick && "cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary",
        className
      )}
    >
      <LazyImage {...props} imageType="gallery" />
    </div>
  );
}

// ==================== Thumbnail Variant ====================

export function ThumbnailImage(props: Omit<LazyImageProps, 'imageType' | 'aspectRatio'>) {
  return <LazyImage {...props} imageType="thumbnail" aspectRatio="video" />;
}

// ==================== Default Export ====================

export default LazyImage;
