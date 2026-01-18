import { ReactNode } from "react";
import { DubaiPageLayout } from "../layouts/DubaiPageLayout";
import {
  DubaiHero,
  DubaiHeroProps,
  DubaiComparisonTable,
  ComparisonFeature,
  DubaiFAQ,
  DubaiFAQItem,
  DubaiCTA,
  DubaiCTAProps,
} from "../components";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, LucideIcon, Award } from "lucide-react";
import { BreadcrumbItem } from "@/components/breadcrumbs";
import { motion } from "framer-motion";

interface ProConItem {
  text: string;
  type: "pro" | "con";
}

interface ComparisonOption {
  title: string;
  badge?: string;
  prosAndCons: ProConItem[];
}

interface VerdictSection {
  title?: string;
  recommendation: string;
  description: string;
  winnerLabel?: string;
}

export interface DubaiComparisonTemplateProps {
  title: string;
  metaDescription: string;
  canonicalPath?: string;
  ogImage?: string;
  keywords?: string[];
  breadcrumbs?: BreadcrumbItem[];
  hero: DubaiHeroProps;
  comparisonTitle?: string;
  comparisonSubtitle?: string;
  optionATitle: string;
  optionABadge?: string;
  optionBTitle: string;
  optionBBadge?: string;
  features: ComparisonFeature[];
  recommendedOption?: "A" | "B";
  optionA: ComparisonOption;
  optionB: ComparisonOption;
  verdict?: VerdictSection;
  faqs: DubaiFAQItem[];
  faqTitle?: string;
  cta: DubaiCTAProps;
  additionalSections?: ReactNode;
}

export function DubaiComparisonTemplate({
  title,
  metaDescription,
  canonicalPath,
  ogImage,
  keywords,
  breadcrumbs = [],
  hero,
  comparisonTitle = "Side-by-Side Comparison",
  comparisonSubtitle,
  optionATitle,
  optionABadge,
  optionBTitle,
  optionBBadge,
  features,
  recommendedOption,
  optionA,
  optionB,
  verdict,
  faqs,
  faqTitle = "Frequently Asked Questions",
  cta,
  additionalSections,
}: DubaiComparisonTemplateProps) {
  const heroSection = <DubaiHero {...hero} />;

  const renderProsCons = (option: ComparisonOption, isRecommended: boolean) => {
    const pros = option.prosAndCons.filter(item => item.type === "pro");
    const cons = option.prosAndCons.filter(item => item.type === "con");

    return (
      <Card className={`h-full ${isRecommended ? "ring-2 ring-primary" : ""}`}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-xl font-bold">{option.title}</h3>
            {option.badge && (
              <Badge variant={isRecommended ? "default" : "outline"}>{option.badge}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {pros.length > 0 && (
            <div>
              <h4 className="font-medium text-green-600 dark:text-green-400 mb-2">Advantages</h4>
              <ul className="space-y-2">
                {pros.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {cons.length > 0 && (
            <div>
              <h4 className="font-medium text-red-600 dark:text-red-400 mb-2">Considerations</h4>
              <ul className="space-y-2">
                {cons.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    );
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
      <DubaiComparisonTable
        title={comparisonTitle}
        subtitle={comparisonSubtitle}
        optionATitle={optionATitle}
        optionABadge={optionABadge}
        optionBTitle={optionBTitle}
        optionBBadge={optionBBadge}
        features={features}
        recommendedOption={recommendedOption}
      />

      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-8">Pros & Cons</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              {renderProsCons(optionA, recommendedOption === "A")}
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {renderProsCons(optionB, recommendedOption === "B")}
            </motion.div>
          </div>
        </div>
      </section>

      {verdict && (
        <section className="py-16 bg-muted/30">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Card className="border-primary/20">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Award className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">{verdict.title || "Our Verdict"}</h2>
                  {verdict.winnerLabel && (
                    <Badge className="mb-4">{verdict.winnerLabel}</Badge>
                  )}
                  <h3 className="text-xl font-semibold text-primary mb-4">{verdict.recommendation}</h3>
                  <p className="text-muted-foreground leading-relaxed">{verdict.description}</p>
                </CardContent>
              </Card>
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
