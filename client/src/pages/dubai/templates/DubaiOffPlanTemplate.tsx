import { ReactNode } from "react";
import { DubaiPageLayout } from "../layouts/DubaiPageLayout";
import {
  DubaiHero,
  DubaiHeroProps,
  DubaiKeyStats,
  DubaiKeyStat,
  DubaiHighlightsGrid,
  DubaiHighlight,
  DubaiFAQ,
  DubaiFAQItem,
  DubaiCTA,
  DubaiCTAProps,
} from "../components";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon, CheckCircle2 } from "lucide-react";
import { BreadcrumbItem } from "@/components/breadcrumbs";
import { motion } from "framer-motion";

interface InvestmentBenefit {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface DubaiOffPlanTemplateProps {
  title: string;
  metaDescription: string;
  canonicalPath?: string;
  ogImage?: string;
  keywords?: string[];
  breadcrumbs?: BreadcrumbItem[];
  hero: DubaiHeroProps;
  marketStats: DubaiKeyStat[];
  marketStatsTitle?: string;
  marketStatsSubtitle?: string;
  highlights: DubaiHighlight[];
  highlightsTitle?: string;
  highlightsSubtitle?: string;
  investmentBenefits?: InvestmentBenefit[];
  investmentBenefitsTitle?: string;
  investmentBenefitsSubtitle?: string;
  faqs: DubaiFAQItem[];
  faqTitle?: string;
  cta: DubaiCTAProps;
  additionalSections?: ReactNode;
}

export function DubaiOffPlanTemplate({
  title,
  metaDescription,
  canonicalPath,
  ogImage,
  keywords,
  breadcrumbs = [],
  hero,
  marketStats,
  marketStatsTitle = "Market Overview",
  marketStatsSubtitle,
  highlights,
  highlightsTitle = "Key Features",
  highlightsSubtitle,
  investmentBenefits,
  investmentBenefitsTitle = "Investment Benefits",
  investmentBenefitsSubtitle,
  faqs,
  faqTitle = "Frequently Asked Questions",
  cta,
  additionalSections,
}: DubaiOffPlanTemplateProps) {
  const heroSection = <DubaiHero {...hero} />;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
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
      <DubaiKeyStats
        stats={marketStats}
        title={marketStatsTitle}
        subtitle={marketStatsSubtitle}
        columns={marketStats.length <= 4 ? (marketStats.length as 2 | 3 | 4) : 5}
      />

      <DubaiHighlightsGrid
        highlights={highlights}
        title={highlightsTitle}
        subtitle={highlightsSubtitle}
        columns={highlights.length <= 3 ? (highlights.length as 2 | 3) : 4}
      />

      {investmentBenefits && investmentBenefits.length > 0 && (
        <section className="py-16 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">{investmentBenefitsTitle}</h2>
              {investmentBenefitsSubtitle && (
                <p className="text-muted-foreground max-w-2xl mx-auto">{investmentBenefitsSubtitle}</p>
              )}
            </div>

            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
            >
              {investmentBenefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <motion.div key={index} variants={itemVariants}>
                    <Card className="h-full">
                      <CardContent className="p-6 flex gap-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-2">{benefit.title}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {benefit.description}
                          </p>
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
