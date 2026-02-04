/**
 * Centralized Animation Variants Module
 * Single source of truth for all motion patterns across the platform.
 */

import type { Variants } from "framer-motion";

// Core animation timing - matches homepage patterns
export const ANIMATION_TIMING = {
  duration: 0.8,
  staggerDelay: 0.1,
  ease: [0.25, 0.46, 0.45, 0.94] as const,
};

// Stagger container for child elements
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: ANIMATION_TIMING.staggerDelay,
      delayChildren: 0.1,
    },
  },
};

// Stagger item - use inside staggerContainer
export const staggerItem: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: ANIMATION_TIMING.ease,
    },
  },
};

// Reveal from blur animation
export const revealFromBlur: Variants = {
  hidden: {
    opacity: 0,
    filter: "blur(10px)",
    y: 30,
  },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    y: 0,
    transition: {
      duration: 1,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
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
    },
  },
};
