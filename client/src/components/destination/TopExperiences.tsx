/**
 * TopExperiences Section Component
 * Card grid for top experiences/attractions.
 * Uses $XX-$YY placeholder format for pricing.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Coins } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/animations";
import type { Experience } from "@/types/destination";

interface TopExperiencesProps {
  experiences: Experience[];
  destinationName: string;
}

export function TopExperiences({ experiences, destinationName }: TopExperiencesProps) {
  return (
    <AnimatedSection 
      className="py-12 md:py-16 bg-transparent"
      data-testid="section-top-experiences"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
            Top Experiences in {destinationName}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Must-do activities and attractions for every traveler
          </p>
        </div>

        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {experiences.map((experience) => (
            <motion.div key={experience.id} variants={staggerItem}>
              <Card className="h-full bg-card/80 backdrop-blur-md border border-border/30 shadow-sm overflow-hidden hover-elevate group">
                {experience.imageUrl && (
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={experience.imageUrl}
                      alt={experience.imageAlt || experience.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  </div>
                )}
                <CardContent className="p-5">
                  <h3 className="font-bold text-lg mb-2 line-clamp-2" data-testid={`experience-title-${experience.id}`}>
                    {experience.title}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                    {experience.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{experience.duration}</span>
                    </div>
                    <Badge variant="secondary" className="font-medium">
                      <Coins className="w-3 h-3 mr-1" />
                      {experience.priceRange}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </AnimatedSection>
  );
}
