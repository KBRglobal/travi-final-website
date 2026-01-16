/**
 * Centralized Animation Variants Module
 * Single source of truth for all motion patterns across the platform.
 * Destination pages MUST use these variants - no inline or ad-hoc animations allowed.
 */

import type { Variants } from "framer-motion";

// Core animation timing - matches homepage patterns
export const ANIMATION_TIMING = {
  duration: 0.8,
  staggerDelay: 0.1,
  ease: [0.25, 0.46, 0.45, 0.94] as const, // Custom easing from homepage
};

// Fade in from bottom - primary entrance animation
export const fadeInUp: Variants = {
  hidden: { 
    opacity: 0, 
    y: 60 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: ANIMATION_TIMING.duration,
      ease: ANIMATION_TIMING.ease,
    }
  },
};

// Fade in from left
export const fadeInLeft: Variants = {
  hidden: { 
    opacity: 0, 
    x: -40 
  },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: ANIMATION_TIMING.duration,
      ease: ANIMATION_TIMING.ease,
    }
  },
};

// Fade in from right
export const fadeInRight: Variants = {
  hidden: { 
    opacity: 0, 
    x: 40 
  },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: ANIMATION_TIMING.duration,
      ease: ANIMATION_TIMING.ease,
    }
  },
};

// Simple fade
export const fadeIn: Variants = {
  hidden: { 
    opacity: 0 
  },
  visible: { 
    opacity: 1,
    transition: {
      duration: ANIMATION_TIMING.duration,
      ease: ANIMATION_TIMING.ease,
    }
  },
};

// Scale up animation
export const scaleUp: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.95 
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      duration: ANIMATION_TIMING.duration,
      ease: ANIMATION_TIMING.ease,
    }
  },
};

// Stagger container for child elements
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: ANIMATION_TIMING.staggerDelay,
      delayChildren: 0.1,
    }
  },
};

// Stagger item - use inside staggerContainer
export const staggerItem: Variants = {
  hidden: { 
    opacity: 0, 
    y: 30 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.5,
      ease: ANIMATION_TIMING.ease,
    }
  },
};

// Hero parallax scroll values
export const HERO_SCROLL_CONFIG = {
  opacityRange: [0, 0.5] as [number, number],
  opacityOutput: [1, 0] as [number, number],
  scaleRange: [0, 0.5] as [number, number],
  scaleOutput: [1, 1.1] as [number, number],
  yRange: [0, 0.5] as [number, number],
  yOutput: [0, 100] as [number, number],
};

// Section animation with delay support
export const sectionAnimation = (delay: number = 0): Variants => ({
  hidden: { 
    opacity: 0, 
    y: 60 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: ANIMATION_TIMING.duration,
      delay,
      ease: ANIMATION_TIMING.ease,
    }
  },
});

// ============================================
// IMMERSIVE DESTINATION PAGE ANIMATIONS
// ============================================

// Editorial card hover effect
export const cardHover = {
  scale: 1.02,
  y: -8,
  transition: { duration: 0.3, ease: "easeOut" }
};

// Image zoom on hover
export const imageHover = {
  scale: 1.1,
  transition: { duration: 0.6, ease: "easeOut" }
};

// Reveal from blur animation
export const revealFromBlur: Variants = {
  hidden: { 
    opacity: 0, 
    filter: "blur(10px)",
    y: 30 
  },
  visible: { 
    opacity: 1, 
    filter: "blur(0px)",
    y: 0,
    transition: {
      duration: 1,
      ease: [0.25, 0.46, 0.45, 0.94],
    }
  },
};

// Cinematic text reveal
export const cinematicText: Variants = {
  hidden: { 
    opacity: 0, 
    y: 100,
    rotateX: -15,
  },
  visible: { 
    opacity: 1, 
    y: 0,
    rotateX: 0,
    transition: {
      duration: 1.2,
      ease: [0.25, 0.1, 0.25, 1],
    }
  },
};

// Editorial stagger with longer delays
export const editorialStagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    }
  },
};

// Editorial item with scale
export const editorialItem: Variants = {
  hidden: { 
    opacity: 0, 
    y: 50,
    scale: 0.95 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.7,
      ease: [0.25, 0.46, 0.45, 0.94],
    }
  },
};

// Floating animation for decorative elements
export const floatingAnimation = {
  y: [0, -10, 0],
  transition: {
    duration: 4,
    repeat: Infinity,
    ease: "easeInOut"
  }
};

// Parallax layer configs for depth
export const PARALLAX_LAYERS = {
  background: { yOutput: [0, 150] },
  midground: { yOutput: [0, 80] },
  foreground: { yOutput: [0, 30] },
  content: { yOutput: [0, -20] },
};
