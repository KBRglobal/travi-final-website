/**
 * DestinationFAQ Section Component
 * 8-12 destination-specific questions with Accordion.
 */

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";
import { motion } from "framer-motion";
import { fadeInUp } from "@/lib/animations";
import type { FAQ } from "@/types/destination";

interface DestinationFAQProps {
  faqs: FAQ[];
  destinationName: string;
}

export function DestinationFAQ({ faqs, destinationName }: DestinationFAQProps) {
  return (
    <AnimatedSection 
      className="py-12 md:py-16 bg-transparent"
      data-testid="section-faq"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <HelpCircle className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
            {destinationName} Travel FAQ
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Common questions about visiting {destinationName}
          </p>
        </div>

        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          <div className="bg-card/80 backdrop-blur-md border border-border/30 rounded-xl shadow-sm p-4 md:p-6">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger 
                    className="text-left text-base font-medium hover:no-underline"
                    data-testid={`faq-question-${index}`}
                  >
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </motion.div>

        {/* Schema.org FAQPage structured data placeholder */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": faqs.map((faq) => ({
                "@type": "Question",
                "name": faq.question,
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": faq.answer
                }
              }))
            })
          }}
        />
      </div>
    </AnimatedSection>
  );
}
