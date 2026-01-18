import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { motion } from "framer-motion";

export interface DubaiFAQItem {
  question: string;
  answer: string;
}

export interface DubaiFAQProps {
  faqs: DubaiFAQItem[];
  title?: string;
  subtitle?: string;
  defaultOpen?: string;
  columns?: 1 | 2;
}

export function DubaiFAQ({
  faqs,
  title = "Frequently Asked Questions",
  subtitle,
  defaultOpen,
  columns = 1,
}: DubaiFAQProps) {
  const halfLength = Math.ceil(faqs.length / 2);
  const leftColumn = columns === 2 ? faqs.slice(0, halfLength) : faqs;
  const rightColumn = columns === 2 ? faqs.slice(halfLength) : [];

  const renderFAQColumn = (items: DubaiFAQItem[], startIndex: number = 0) => (
    <Accordion 
      type="single" 
      collapsible 
      defaultValue={defaultOpen}
      className="w-full"
    >
      {items.map((faq, index) => (
        <AccordionItem 
          key={startIndex + index} 
          value={`faq-${startIndex + index}`}
          className="border-b last:border-b-0"
        >
          <AccordionTrigger 
            className="text-left py-4 hover:no-underline"
            data-testid={`faq-trigger-${startIndex + index}`}
          >
            <span className="font-medium pr-4">{faq.question}</span>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground pb-4 leading-relaxed">
            {faq.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );

  return (
    <section className="py-16 bg-muted/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {(title || subtitle) && (
            <div className="text-center mb-12">
              {title && (
                <h2 className="text-3xl font-bold mb-3">{title}</h2>
              )}
              {subtitle && (
                <p className="text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>
              )}
            </div>
          )}

          {columns === 2 ? (
            <div className="grid md:grid-cols-2 gap-8">
              <div>{renderFAQColumn(leftColumn, 0)}</div>
              <div>{renderFAQColumn(rightColumn, halfLength)}</div>
            </div>
          ) : (
            renderFAQColumn(leftColumn, 0)
          )}
        </motion.div>
      </div>
    </section>
  );
}
