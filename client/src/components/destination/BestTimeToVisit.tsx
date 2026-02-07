/**
 * BestTimeToVisit Section Component
 * Seasonal breakdown in table/structured layout.
 * Uses placeholder weather data clearly marked.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sun, Cloud, Snowflake, Leaf, Users } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/animations";
import type { SeasonInfo } from "@/types/destination";

interface BestTimeToVisitProps {
  seasons: SeasonInfo[];
  destinationName: string;
}

const SEASON_ICONS: Record<string, typeof Sun> = {
  Spring: Leaf,
  Summer: Sun,
  Fall: Leaf,
  Winter: Snowflake,
  Autumn: Leaf,
};

const CROWD_COLORS: Record<string, string> = {
  Low: "bg-green-100 text-green-700",
  Medium: "bg-yellow-100 text-yellow-700",
  High: "bg-red-100 text-red-700",
};

export function BestTimeToVisit({ seasons, destinationName }: Readonly<BestTimeToVisitProps>) {
  return (
    <AnimatedSection className="py-12 md:py-16 bg-transparent" data-testid="section-best-time">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
            Best Time to Visit {destinationName}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Plan your trip around the perfect season
          </p>
        </div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {seasons.map((season, index) => {
            const SeasonIcon = SEASON_ICONS[season.name] || Cloud;
            return (
              <motion.div key={season.name} variants={staggerItem}>
                <Card className="h-full bg-card/80 backdrop-blur-md border border-border/30 shadow-sm hover-elevate">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <SeasonIcon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3
                          className="font-bold text-lg"
                          data-testid={`season-name-${season.name.toLowerCase()}`}
                        >
                          {season.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">{season.months}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                          Weather
                        </p>
                        <p className="text-sm">{season.weather}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Crowds:</span>
                        <Badge className={`text-xs ${CROWD_COLORS[season.crowds]}`}>
                          {season.crowds}
                        </Badge>
                      </div>

                      <div className="pt-2 border-t border-border/50">
                        <p className="text-sm text-muted-foreground italic">
                          {season.recommendation}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </AnimatedSection>
  );
}
