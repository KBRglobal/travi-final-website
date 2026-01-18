/**
 * WhereToStay Section Component
 * Neighborhood/area cards with descriptions.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, DollarSign } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/animations";
import type { Neighborhood } from "@/types/destination";

interface WhereToStayProps {
  neighborhoods: Neighborhood[];
  destinationName: string;
}

const PRICE_LABELS: Record<string, string> = {
  "$": "Budget-Friendly",
  "$$": "Mid-Range",
  "$$$": "Upscale",
  "$$$$": "Luxury",
};

export function WhereToStay({ neighborhoods, destinationName }: WhereToStayProps) {
  return (
    <AnimatedSection 
      className="py-12 md:py-16 bg-transparent"
      data-testid="section-where-to-stay"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
            Where to Stay in {destinationName}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Best neighborhoods and areas for every type of traveler
          </p>
        </div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {neighborhoods.map((neighborhood) => (
            <motion.div key={neighborhood.id} variants={staggerItem}>
              <Card className="h-full bg-card/80 backdrop-blur-md border border-border/30 shadow-sm hover-elevate">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-primary" />
                      </div>
                      <CardTitle className="text-lg" data-testid={`neighborhood-name-${neighborhood.id}`}>
                        {neighborhood.name}
                      </CardTitle>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      <DollarSign className="w-3 h-3 mr-0.5" />
                      {neighborhood.priceLevel}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-muted-foreground text-sm mb-4">
                    {neighborhood.description}
                  </p>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Highlights
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {neighborhood.highlights.map((highlight, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {highlight}
                        </Badge>
                      ))}
                    </div>
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
