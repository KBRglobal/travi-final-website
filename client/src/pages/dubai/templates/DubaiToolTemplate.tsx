import { ReactNode } from "react";
import { DubaiPageLayout } from "../layouts/DubaiPageLayout";
import {
  DubaiHero,
  DubaiHeroProps,
  DubaiCalculatorShell,
  CalculatorResult,
  DubaiFAQ,
  DubaiFAQItem,
  DubaiCTA,
  DubaiCTAProps,
} from "../components";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon, Lightbulb } from "lucide-react";
import { BreadcrumbItem } from "@/components/breadcrumbs";
import { motion } from "framer-motion";

interface HelpfulTip {
  icon?: LucideIcon;
  title: string;
  description: string;
}

export interface DubaiToolTemplateProps {
  title: string;
  metaDescription: string;
  canonicalPath?: string;
  ogImage?: string;
  keywords?: string[];
  breadcrumbs?: BreadcrumbItem[];
  hero: DubaiHeroProps;
  calculatorTitle: string;
  calculatorSubtitle?: string;
  calculatorIcon?: LucideIcon;
  calculatorBadges?: string[];
  inputSection: ReactNode;
  results?: CalculatorResult[];
  disclaimer?: string;
  onCalculate?: () => void;
  calculateLabel?: string;
  isCalculating?: boolean;
  additionalCalculatorContent?: ReactNode;
  helpfulTips?: HelpfulTip[];
  helpfulTipsTitle?: string;
  helpfulTipsSubtitle?: string;
  faqs: DubaiFAQItem[];
  faqTitle?: string;
  cta: DubaiCTAProps;
  additionalSections?: ReactNode;
}

export function DubaiToolTemplate({
  title,
  metaDescription,
  canonicalPath,
  ogImage,
  keywords,
  breadcrumbs = [],
  hero,
  calculatorTitle,
  calculatorSubtitle,
  calculatorIcon,
  calculatorBadges,
  inputSection,
  results,
  disclaimer,
  onCalculate,
  calculateLabel,
  isCalculating,
  additionalCalculatorContent,
  helpfulTips,
  helpfulTipsTitle = "Helpful Tips",
  helpfulTipsSubtitle,
  faqs,
  faqTitle = "Frequently Asked Questions",
  cta,
  additionalSections,
}: DubaiToolTemplateProps) {
  const heroSection = <DubaiHero {...hero} />;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <DubaiPageLayout
      title={title}
      description={metaDescription}
      canonicalPath={canonicalPath}
      ogImage={ogImage}
      keywords={keywords}
      breadcrumbs={breadcrumbs}
      heroSection={heroSection}
      showBreadcrumbs={false}
    >
      <DubaiCalculatorShell
        title={calculatorTitle}
        subtitle={calculatorSubtitle}
        icon={calculatorIcon}
        badges={calculatorBadges}
        inputSection={inputSection}
        results={results}
        disclaimer={disclaimer}
        onCalculate={onCalculate}
        calculateLabel={calculateLabel}
        isCalculating={isCalculating}
        additionalContent={additionalCalculatorContent}
      />

      {helpfulTips && helpfulTips.length > 0 && (
        <section className="py-16 bg-muted/30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">{helpfulTipsTitle}</h2>
              {helpfulTipsSubtitle && (
                <p className="text-muted-foreground max-w-2xl mx-auto">{helpfulTipsSubtitle}</p>
              )}
            </div>

            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
            >
              {helpfulTips.map((tip, index) => {
                const Icon = tip.icon || Lightbulb;
                return (
                  <motion.div key={index} variants={itemVariants}>
                    <Card className="h-full">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                            <Icon className="w-5 h-5 text-amber-500" />
                          </div>
                          <div>
                            <h3 className="font-semibold mb-1">{tip.title}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {tip.description}
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
        </section>
      )}

      {additionalSections}

      <DubaiFAQ faqs={faqs} title={faqTitle} />

      <DubaiCTA {...cta} />
    </DubaiPageLayout>
  );
}
