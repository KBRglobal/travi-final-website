import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Download,
  Maximize2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface LightboxImage {
  src: string;
  alt?: string;
  title?: string;
  caption?: string;
}

interface LightboxProps {
  images: LightboxImage[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
  showThumbnails?: boolean;
  showDownload?: boolean;
  enableZoom?: boolean;
  enableSwipe?: boolean;
  enableKeyboard?: boolean;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;
const SWIPE_THRESHOLD = 50;

export function Lightbox({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
  onIndexChange,
  showThumbnails = true,
  showDownload = false,
  enableZoom = true,
  enableSwipe = true,
  enableKeyboard = true,
}: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [preloadedImages, setPreloadedImages] = useState<Set<number>>(new Set());
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapRef = useRef<number>(0);
  const pinchStartRef = useRef<{ distance: number; zoom: number } | null>(null);

  const currentImage = images[currentIndex];
  const hasMultipleImages = images.length > 1;

  const goToIndex = useCallback((index: number) => {
    const newIndex = Math.max(0, Math.min(images.length - 1, index));
    setCurrentIndex(newIndex);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setIsLoading(true);
    onIndexChange?.(newIndex);
  }, [images.length, onIndexChange]);

  const goToPrev = useCallback(() => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
    goToIndex(newIndex);
  }, [currentIndex, images.length, goToIndex]);

  const goToNext = useCallback(() => {
    const newIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
    goToIndex(newIndex);
  }, [currentIndex, images.length, goToIndex]);

  const goToFirst = useCallback(() => {
    goToIndex(0);
  }, [goToIndex]);

  const goToLast = useCallback(() => {
    goToIndex(images.length - 1);
  }, [goToIndex, images.length]);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(MAX_ZOOM, prev + ZOOM_STEP));
  }, []);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(MIN_ZOOM, zoom - ZOOM_STEP);
    setZoom(newZoom);
    if (newZoom === 1) {
      setPan({ x: 0, y: 0 });
    }
  }, [zoom]);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const preloadImage = useCallback((index: number) => {
    if (index < 0 || index >= images.length || preloadedImages.has(index)) {
      return;
    }
    const img = new Image();
    img.src = images[index].src;
    img.onload = () => {
      setPreloadedImages(prev => new Set([...prev, index]));
    };
  }, [images, preloadedImages]);

  useEffect(() => {
    if (isOpen) {
      preloadImage(currentIndex);
      preloadImage(currentIndex - 1);
      preloadImage(currentIndex + 1);
    }
  }, [isOpen, currentIndex, preloadImage]);

  useEffect(() => {
    if (!isOpen || !enableKeyboard) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case "Escape":
          e.preventDefault();
          onClose();
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (hasMultipleImages && zoom === 1) {
            goToPrev();
          } else if (zoom > 1) {
            setPan(prev => ({ ...prev, x: prev.x + 50 }));
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (hasMultipleImages && zoom === 1) {
            goToNext();
          } else if (zoom > 1) {
            setPan(prev => ({ ...prev, x: prev.x - 50 }));
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          if (zoom > 1) {
            setPan(prev => ({ ...prev, y: prev.y + 50 }));
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          if (zoom > 1) {
            setPan(prev => ({ ...prev, y: prev.y - 50 }));
          }
          break;
        case "Home":
          e.preventDefault();
          if (hasMultipleImages) goToFirst();
          break;
        case "End":
          e.preventDefault();
          if (hasMultipleImages) goToLast();
          break;
        case "+":
        case "=":
          e.preventDefault();
          if (enableZoom) handleZoomIn();
          break;
        case "-":
          e.preventDefault();
          if (enableZoom) handleZoomOut();
          break;
        case "0":
          e.preventDefault();
          if (enableZoom) handleResetZoom();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, enableKeyboard, hasMultipleImages, zoom, enableZoom, onClose, goToPrev, goToNext, goToFirst, goToLast, handleZoomIn, handleZoomOut, handleResetZoom]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
    }
  }, [isOpen, initialIndex]);

  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enableSwipe) return;

    if (e.touches.length === 2 && enableZoom) {
      e.preventDefault();
      pinchStartRef.current = {
        distance: getTouchDistance(e.touches),
        zoom: zoom,
      };
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
    }
  }, [enableSwipe, enableZoom, zoom]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enableSwipe) return;

    if (e.touches.length === 2 && enableZoom && pinchStartRef.current) {
      e.preventDefault();
      const currentDistance = getTouchDistance(e.touches);
      const scale = currentDistance / pinchStartRef.current.distance;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pinchStartRef.current.zoom * scale));
      setZoom(newZoom);
      return;
    }

    if (zoom > 1 && e.touches.length === 1 && touchStartRef.current) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      setPan(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }));
      touchStartRef.current = {
        ...touchStartRef.current,
        x: touch.clientX,
        y: touch.clientY,
      };
    }
  }, [enableSwipe, enableZoom, zoom]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!enableSwipe) return;

    if (pinchStartRef.current) {
      pinchStartRef.current = null;
      if (zoom <= 1) {
        setPan({ x: 0, y: 0 });
      }
      return;
    }

    if (!touchStartRef.current || zoom > 1) {
      touchStartRef.current = null;
      return;
    }

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;

    const now = Date.now();
    if (now - lastTapRef.current < 300 && enableZoom) {
      handleZoomIn();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }

    if (Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY) && deltaTime < 300) {
      if (deltaX > 0) {
        goToPrev();
      } else {
        goToNext();
      }
    }

    touchStartRef.current = null;
  }, [enableSwipe, enableZoom, zoom, goToPrev, goToNext, handleZoomIn]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom > 1) {
      e.preventDefault();
      setIsDragging(true);
      touchStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    }
  }, [zoom]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && touchStartRef.current && zoom > 1) {
      const deltaX = e.clientX - touchStartRef.current.x;
      const deltaY = e.clientY - touchStartRef.current.y;
      setPan(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }));
      touchStartRef.current = { ...touchStartRef.current, x: e.clientX, y: e.clientY };
    }
  }, [isDragging, zoom]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    touchStartRef.current = null;
  }, []);

  const handleDoubleClick = useCallback(() => {
    if (!enableZoom) return;
    if (zoom > 1) {
      handleResetZoom();
    } else {
      setZoom(2);
    }
  }, [enableZoom, zoom, handleResetZoom]);

  const handleDownload = useCallback(() => {
    const link = document.createElement("a");
    link.href = currentImage.src;
    link.download = currentImage.title || `image-${currentIndex + 1}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [currentImage, currentIndex]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col bg-black/95"
        role="dialog"
        aria-modal="true"
        aria-label="Image lightbox"
        data-testid="lightbox-container"
      >
        <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between gap-4 p-4 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center gap-2 text-white">
            {hasMultipleImages && (
              <span 
                className="text-sm font-medium"
                data-testid="lightbox-counter"
                aria-live="polite"
              >
                {currentIndex + 1} / {images.length}
              </span>
            )}
            {currentImage.title && (
              <span className="text-sm truncate max-w-[200px] md:max-w-none">
                {currentImage.title}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {enableZoom && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={handleZoomOut}
                  disabled={zoom <= MIN_ZOOM}
                  aria-label="Zoom out"
                  data-testid="lightbox-zoom-out"
                >
                  <ZoomOut className="w-5 h-5" />
                </Button>
                <span className="text-white text-xs min-w-[3rem] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={handleZoomIn}
                  disabled={zoom >= MAX_ZOOM}
                  aria-label="Zoom in"
                  data-testid="lightbox-zoom-in"
                >
                  <ZoomIn className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={handleResetZoom}
                  aria-label="Reset zoom"
                  data-testid="lightbox-zoom-reset"
                >
                  <RotateCcw className="w-5 h-5" />
                </Button>
              </>
            )}
            {showDownload && (
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={handleDownload}
                aria-label="Download image"
                data-testid="lightbox-download"
              >
                <Download className="w-5 h-5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={onClose}
              aria-label="Close lightbox"
              data-testid="lightbox-close"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </header>

        <div
          className="flex-1 flex items-center justify-center relative select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={handleDoubleClick}
          style={{ cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}
        >
          {hasMultipleImages && zoom === 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10 text-white bg-black/40 hover:bg-black/60 h-12 w-12 rounded-full"
                onClick={goToPrev}
                aria-label="Previous image"
                data-testid="lightbox-prev"
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10 text-white bg-black/40 hover:bg-black/60 h-12 w-12 rounded-full"
                onClick={goToNext}
                aria-label="Next image"
                data-testid="lightbox-next"
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            </>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative flex items-center justify-center w-full h-full p-4 md:p-16"
            >
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
              <motion.img
                ref={imageRef}
                src={currentImage.src}
                alt={currentImage.alt || ""}
                className={cn(
                  "max-w-full max-h-full object-contain transition-opacity duration-200",
                  isLoading ? "opacity-0" : "opacity-100"
                )}
                style={{
                  transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                  transformOrigin: "center center",
                }}
                onLoad={() => setIsLoading(false)}
                onError={() => setIsLoading(false)}
                draggable={false}
                data-testid="lightbox-image"
              />
            </motion.div>
          </AnimatePresence>

          {currentImage.caption && (
            <div className="absolute bottom-20 left-0 right-0 text-center px-4">
              <p className="text-white text-sm bg-black/50 px-4 py-2 rounded-lg inline-block max-w-2xl">
                {currentImage.caption}
              </p>
            </div>
          )}
        </div>

        {showThumbnails && hasMultipleImages && (
          <footer className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
            <div 
              className="flex justify-center gap-2 overflow-x-auto max-w-full px-4"
              role="tablist"
              aria-label="Image thumbnails"
            >
              {images.map((img, index) => (
                <button
                  key={index}
                  role="tab"
                  aria-selected={index === currentIndex}
                  onClick={() => goToIndex(index)}
                  className={cn(
                    "flex-shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-md overflow-hidden border-2 transition-all",
                    index === currentIndex 
                      ? "border-white ring-2 ring-white/50" 
                      : "border-transparent opacity-60 hover:opacity-100"
                  )}
                  aria-label={`View image ${index + 1}`}
                  data-testid={`lightbox-thumbnail-${index}`}
                >
                  <img
                    src={img.src}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </footer>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

interface GalleryWithLightboxProps {
  images: (string | LightboxImage)[];
  className?: string;
  columns?: 2 | 3 | 4;
  aspectRatio?: "square" | "video" | "portrait";
  showTitle?: boolean;
  onImageClick?: (index: number) => void;
}

export function GalleryWithLightbox({
  images,
  className,
  columns = 3,
  aspectRatio = "square",
  showTitle = false,
}: GalleryWithLightboxProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const normalizedImages: LightboxImage[] = images.map((img) =>
    typeof img === "string" ? { src: img } : img
  );

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const columnsClass = {
    2: "grid-cols-2",
    3: "grid-cols-2 md:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
  };

  const aspectClass = {
    square: "aspect-square",
    video: "aspect-video",
    portrait: "aspect-[3/4]",
  };

  return (
    <>
      <div
        className={cn("grid gap-3", columnsClass[columns], className)}
        role="grid"
        aria-label="Image gallery"
        data-testid="gallery-grid"
      >
        {normalizedImages.map((image, index) => (
          <button
            key={index}
            onClick={() => openLightbox(index)}
            className={cn(
              "relative overflow-hidden rounded-lg group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
              aspectClass[aspectRatio]
            )}
            aria-label={image.alt || `Open image ${index + 1}`}
            data-testid={`gallery-image-${index}`}
          >
            <img
              src={image.src}
              alt={image.alt || ""}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <Maximize2 className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            {showTitle && image.title && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                <p className="text-white text-sm font-medium truncate">
                  {image.title}
                </p>
              </div>
            )}
          </button>
        ))}
      </div>

      <Lightbox
        images={normalizedImages}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onIndexChange={setLightboxIndex}
      />
    </>
  );
}

export function useLightbox(images: (string | LightboxImage)[]) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const normalizedImages: LightboxImage[] = images.map((img) =>
    typeof img === "string" ? { src: img } : img
  );

  const open = useCallback((index: number = 0) => {
    setCurrentIndex(index);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const LightboxComponent = useCallback(() => (
    <Lightbox
      images={normalizedImages}
      initialIndex={currentIndex}
      isOpen={isOpen}
      onClose={close}
      onIndexChange={setCurrentIndex}
    />
  ), [normalizedImages, currentIndex, isOpen, close]);

  return {
    isOpen,
    currentIndex,
    open,
    close,
    Lightbox: LightboxComponent,
  };
}
