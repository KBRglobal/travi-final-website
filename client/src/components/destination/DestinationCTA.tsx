/**
 * DestinationCTA Section Component
 * Bottom CTA - same component style as homepage CTA.
 */

import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";
import { motion } from "framer-motion";
import { fadeInUp } from "@/lib/animations";
import type { DestinationCTAData } from "@/types/destination";

interface DestinationCTAProps {
  cta: DestinationCTAData;
  destinationName: string;
}

export function DestinationCTA({ cta, destinationName }: DestinationCTAProps) {
  return (
    <AnimatedSection 
      className="py-16 md:py-24 bg-transparent"
      data-testid="section-cta"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="relative"
        >
          <div className="bg-gradient-to-br from-primary/90 to-primary rounded-2xl p-8 md:p-12 text-center shadow-xl overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Sparkles className="w-6 h-6 text-white" />
              </div>

              <h2 
                className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4"
                data-testid="cta-headline"
              >
                {cta.headline}
              </h2>

              <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
                {cta.subheadline}
              </p>

              <Link href={cta.buttonLink}>
                <Button 
                  size="lg" 
                  className="bg-white text-primary hover:bg-white/90 font-semibold px-8 py-6 text-lg rounded-full shadow-lg"
                  data-testid="cta-button"
                >
                  {cta.buttonText}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatedSection>
  );
}
