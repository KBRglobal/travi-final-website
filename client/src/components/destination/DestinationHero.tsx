/**
 * DestinationHero Component - CINEMATIC REDESIGN with CMS-DRIVEN CAROUSEL
 * Full-bleed immersive hero with image carousel and destination-specific mood.
 * Loads from CMS data - no hardcoded contents.
 */

import { useRef, useMemo, useState, useCallback, useEffect } from "react";
import { Link } from "wouter";
import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { cinematicText, revealFromBlur } from "@/lib/animations";
import type { DestinationHeroData, DestinationMood, HeroImage } from "@/types/destination";

interface DestinationHeroProps extends DestinationHeroData {
  destinationName: string;
  mood: DestinationMood;
}

export function DestinationHero({
  title,
  subtitle,
  imageUrl,
  imageAlt,
  ctaText,
  ctaLink,
  destinationName,
  mood,
  images,
}: DestinationHeroProps) {
  const heroRef = useRef<HTMLDivElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  
  const prefersReducedMotion = useMemo(() => 
    typeof window !== "undefined" && 
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    []
  );
  
  // Prepare carousel images - use CMS images or fallback to single image
  const carouselImages = useMemo<HeroImage[]>(() => {
    if (images && images.length > 0) {
      return images.filter(img => img.isActive !== false).sort((a, b) => a.order - b.order);
    }
    // Fallback to single image
    return [{
      filename: "hero",
      url: imageUrl,
      alt: imageAlt,
      order: 0,
    }];
  }, [images, imageUrl, imageAlt]);

  // Auto-advance carousel - match homepage timing
  useEffect(() => {
    if (!isAutoPlaying || carouselImages.length <= 1 || prefersReducedMotion) return;
    
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % carouselImages.length);
    }, 3000); // Fast 3 second interval for dynamic feel
    
    return () => clearInterval(interval);
  }, [isAutoPlaying, carouselImages.length, prefersReducedMotion]);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
    // Resume auto-play after 10 seconds of inactivity
    setTimeout(() => setIsAutoPlaying(true), 10000);
  }, []);

  const nextSlide = useCallback(() => {
    goToSlide((currentSlide + 1) % carouselImages.length);
  }, [currentSlide, carouselImages.length, goToSlide]);

  const prevSlide = useCallback(() => {
    goToSlide((currentSlide - 1 + carouselImages.length) % carouselImages.length);
  }, [currentSlide, carouselImages.length, goToSlide]);
  
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });
  
  // Multi-layer parallax for depth
  const bgY = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [0, 200]);
  const contentY = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [0, -50]);
  // Minimal overlay opacity - hero images should be vibrant and clear
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.5], [0.08, 0.25]);
  const scale = useTransform(scrollYProgress, [0, 0.5], prefersReducedMotion ? [1, 1] : [1, 1.1]);

  const currentImage = carouselImages[currentSlide];

  return (
    <div 
      ref={heroRef} 
      className="relative h-screen min-h-[700px] overflow-hidden"
      data-testid="destination-hero"
    >
      {/* Background Image Layer - Cross-fade Carousel (matches homepage) */}
      <motion.div 
        className="absolute inset-0"
        style={{ y: bgY, scale }}
      >
        {/* Cross-fade: all images stacked, only active one visible - NO white flash */}
        {carouselImages.map((img, index) => {
          const isActive = index === currentSlide;
          return (
            <motion.img
              key={img.url}
              src={img.url}
              alt={img.alt}
              className="absolute inset-0 w-full h-full object-cover"
              loading={index === 0 ? "eager" : "lazy"}
              initial={{ opacity: 0 }}
              animate={{ opacity: isActive ? 1 : 0 }}
              transition={{ 
                duration: prefersReducedMotion ? 0 : 1.4, 
                ease: [0.4, 0, 0.2, 1] // Match homepage easing
              }}
            />
          );
        })}
      </motion.div>

      {/* Carousel Navigation Arrows - Only show if multiple images */}
      {carouselImages.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-6 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/30 backdrop-blur-sm border border-white/20 text-white transition-all duration-300 opacity-60"
            aria-label="Previous image"
            data-testid="hero-carousel-prev"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-6 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/30 backdrop-blur-sm border border-white/20 text-white transition-all duration-300 opacity-60"
            aria-label="Next image"
            data-testid="hero-carousel-next"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Gradient Overlay - Destination Specific */}
      <motion.div 
        className="absolute inset-0"
        style={{ 
          opacity: overlayOpacity,
          background: `linear-gradient(180deg, ${mood.gradientFrom} 0%, ${mood.gradientTo} 100%)`
        }}
      />
      
      {/* Additional atmospheric overlay - minimal for clear images */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

      {/* Hero Content */}
      <motion.div 
        className="relative z-20 flex flex-col items-center justify-center h-full px-4 pt-24 pb-24"
        style={{ y: contentY }}
      >
        <div className="max-w-5xl mx-auto text-center">
          {/* Destination tagline - Premium glass pill */}
          <motion.div
            variants={revealFromBlur}
            initial="hidden"
            animate="visible"
            className="mb-8"
          >
            <span 
              className="inline-block px-8 py-3 rounded-full text-sm font-semibold tracking-[0.2em] uppercase bg-white/15 backdrop-blur-xl border border-white/30 text-white shadow-lg"
            >
              {mood.tagline}
            </span>
          </motion.div>

          {/* Main Headline - Premium typography */}
          <motion.h1
            variants={cinematicText}
            initial="hidden"
            animate="visible"
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-extrabold text-white mb-6 leading-[0.85] tracking-[-0.02em]"
            style={{ 
              fontFamily: "'Chillax', var(--font-sans)",
              textShadow: "0 4px 60px rgba(0,0,0,0.5)"
            }}
            data-testid="destination-hero-title"
          >
            {title || destinationName}
          </motion.h1>

          {/* Subheadline - Refined */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="text-lg sm:text-xl md:text-2xl text-white/85 mb-10 max-w-2xl mx-auto font-medium leading-relaxed"
            style={{ textShadow: "0 2px 20px rgba(0,0,0,0.4)" }}
            data-testid="destination-hero-subtitle"
          >
            {subtitle}
          </motion.p>

          {/* CTA Button - Glassmorphism style matching newsletter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mb-8"
          >
            <Link href={ctaLink}>
              <Button 
                size="lg" 
                className="group text-base sm:text-lg px-8 sm:px-12 py-6 sm:py-7 rounded-full font-bold transition-all duration-300"
                style={{
                  background: "rgba(255, 255, 255, 0.85)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: "1px solid rgba(255, 255, 255, 0.4)",
                  color: '#1e293b',
                  boxShadow: "0 4px 24px rgba(0, 0, 0, 0.1)",
                }}
                data-testid="destination-hero-cta"
              >
                {ctaText}
                <ChevronRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </motion.div>


      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-10" />
    </div>
  );
}
