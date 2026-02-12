/**
 * SafeImage Component
 *
 * PHASE 8: Frontend image safety
 *
 * Features:
 * - onError fallback to placeholder
 * - Empty src protection
 * - Visual-only (NO backend calls)
 *
 * ACTIVATION: ENABLED
 */

import { useState, useCallback, useEffect, type ImgHTMLAttributes } from "react";

interface SafeImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "onError" | "src"> {
  src: string | undefined | null;
  alt: string;
  fallbackSrc?: string;
  fallbackElement?: React.ReactNode;
  srcSet?: string;
  sizes?: string;
  "data-testid"?: string;
}

const DEFAULT_FALLBACK = "/placeholder-image.svg";

export function SafeImage({
  src,
  alt,
  fallbackSrc = DEFAULT_FALLBACK,
  fallbackElement,
  srcSet,
  sizes,
  className,
  "data-testid": testId,
  ...props
}: Readonly<SafeImageProps>) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Empty src protection
  const safeSrc = src && src.trim() !== "" ? src : fallbackSrc;
  const displaySrc = hasError ? fallbackSrc : safeSrc;

  // If we have a custom fallback element and error occurred
  if (hasError && fallbackElement) {
    return <>{fallbackElement}</>;
  }

  return (
    <img
      src={displaySrc}
      alt={alt}
      srcSet={hasError ? undefined : srcSet}
      sizes={hasError ? undefined : sizes}
      className={`${className || ""} transition-opacity duration-300 ${isLoading ? "opacity-0" : "opacity-100"}`}
      style={{ backgroundColor: isLoading ? "var(--muted, #e2e8f0)" : undefined }}
      onError={handleError}
      onLoad={handleLoad}
      data-testid={testId}
      loading="lazy"
      decoding="async"
      {...props}
    />
  );
}

/**
 * SafeBackgroundImage Component
 *
 * For elements that use background-image instead of <img>
 */
interface SafeBackgroundImageProps {
  src: string | undefined | null;
  fallbackSrc?: string;
  className?: string;
  children?: React.ReactNode;
  "data-testid"?: string;
}

export function SafeBackgroundImage({
  src,
  fallbackSrc = DEFAULT_FALLBACK,
  className,
  children,
  "data-testid": testId,
}: Readonly<SafeBackgroundImageProps>) {
  const [hasError, setHasError] = useState(false);

  // Empty src protection
  const safeSrc = src && src.trim() !== "" ? src : fallbackSrc;
  const displaySrc = hasError ? fallbackSrc : safeSrc;

  // Preload image to detect errors (browser-only, SSR-safe)
  useEffect(() => {
    if (globalThis.window === undefined) return; // SSR guard
    if (!safeSrc || safeSrc === fallbackSrc) return;

    const img = new globalThis.Image();
    img.onerror = () => setHasError(true);
    img.src = safeSrc;
  }, [safeSrc, fallbackSrc]);

  return (
    <div
      className={className}
      style={{
        backgroundImage: `url(${displaySrc})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      data-testid={testId}
    >
      {children}
    </div>
  );
}
