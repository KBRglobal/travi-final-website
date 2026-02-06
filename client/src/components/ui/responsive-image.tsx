import { type ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ResponsiveImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src: string;
  alt: string;
  sizes?: string;
  widths?: number[];
  fallbackSrc?: string;
}

const DEFAULT_WIDTHS = [400, 800, 1200];
const DEFAULT_FALLBACK = "/placeholder-image.svg";

/**
 * Check if a URL supports query-based resizing (local assets or known CDNs).
 * External URLs (tiqets, unsplash, etc.) are left as-is.
 */
function supportsResize(src: string): boolean {
  if (src.startsWith("/") || src.startsWith("./")) return false;
  // For now, only local images that go through a resize proxy would qualify.
  // Since we don't have a resize proxy, return false for all.
  return false;
}

function buildSrcSet(src: string, widths: number[]): string | undefined {
  if (!supportsResize(src)) return undefined;
  return widths.map(w => `${src}?w=${w} ${w}w`).join(", ");
}

export function ResponsiveImage({
  src,
  alt,
  sizes,
  widths = DEFAULT_WIDTHS,
  fallbackSrc = DEFAULT_FALLBACK,
  className,
  loading = "lazy",
  ...props
}: ResponsiveImageProps) {
  const srcSet = buildSrcSet(src, widths);

  return (
    <img
      src={src}
      alt={alt}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      loading={loading}
      decoding="async"
      className={cn(className)}
      onError={e => {
        (e.target as HTMLImageElement).src = fallbackSrc;
      }}
      {...props}
    />
  );
}
