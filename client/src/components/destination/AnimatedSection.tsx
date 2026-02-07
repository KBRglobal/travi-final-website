/**
 * AnimatedSection Component
 * Reusable scroll-triggered animation wrapper - extracted from homepage.
 * Uses centralized animation variants from lib/animations.ts
 */

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ANIMATION_TIMING } from "@/lib/animations";
import { cn } from "@/lib/utils";

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  "data-testid"?: string;
}

export function AnimatedSection({
  children,
  className,
  delay = 0,
  "data-testid": testId,
}: Readonly<AnimatedSectionProps>) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
      transition={{
        duration: ANIMATION_TIMING.duration,
        delay,
        ease: ANIMATION_TIMING.ease,
      }}
      className={cn("bg-transparent", className)}
      data-testid={testId}
    >
      {children}
    </motion.section>
  );
}
