/**
 * QuickFacts Section Component
 * 6-item grid: Currency, Language, Visa, Weather, Airport, Safety
 * Uses placeholder values where real data is unavailable.
 */

import { Card, CardContent } from "@/components/ui/card";
import { 
  Coins, Languages, FileCheck, Cloud, Plane, ShieldCheck,
  LucideIcon
} from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/animations";
import type { QuickFact } from "@/types/destination";

const ICON_MAP: Record<string, LucideIcon> = {
  Coins,
  Languages,
  FileCheck,
  Cloud,
  Plane,
  ShieldCheck,
};

function getIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] || Coins;
}

interface QuickFactsProps {
  facts: QuickFact[];
  destinationName: string;
}

export function QuickFacts({ facts, destinationName }: QuickFactsProps) {
  return (
    <AnimatedSection 
      className="py-12 md:py-16 bg-transparent"
      data-testid="section-quick-facts"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
            Essential {destinationName} Travel Facts
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Everything you need to know before your trip
          </p>
        </div>

        <motion.div 
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {facts.map((fact, index) => {
            const IconComponent = getIcon(fact.icon);
            return (
              <motion.div key={index} variants={staggerItem}>
                <Card className="h-full bg-card/80 backdrop-blur-md border border-border/30 shadow-sm hover-elevate">
                  <CardContent className="p-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <IconComponent className="w-6 h-6 text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      {fact.label}
                    </p>
                    <p className="font-semibold text-sm" data-testid={`quick-fact-${fact.label.toLowerCase()}`}>
                      {fact.value}
                    </p>
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
