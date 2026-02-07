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
 * No resize proxy is currently available, so srcSet generation is disabled.
 * When a resize proxy is added, replace this constant with a function that
 * checks whether the URL supports query-based resizing.
 */
const SUPPORTS_RESIZE = false;

function buildSrcSet(src: string, widths: number[]): string | undefined {
  if (!SUPPORTS_RESIZE) return undefined;
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
}: Readonly<ResponsiveImageProps>) {
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
