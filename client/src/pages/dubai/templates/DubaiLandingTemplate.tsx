import { ReactNode } from "react";
import { DubaiPageLayout } from "../layouts/DubaiPageLayout";
import {
  DubaiHero,
  DubaiHeroProps,
  DubaiHighlightsGrid,
  DubaiHighlight,
  DubaiFAQ,
  DubaiFAQItem,
  DubaiCTA,
  DubaiCTAProps,
} from "../components";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon, Info } from "lucide-react";
import { BreadcrumbItem } from "@/components/breadcrumbs";
import { motion } from "framer-motion";

interface InfoSection {
  icon?: LucideIcon;
  title: string;
  description: string;
  items?: string[];
  badge?: string;
}

export interface DubaiLandingTemplateProps {
  title: string;
  metaDescription: string;
  canonicalPath?: string;
  ogImage?: string;
  keywords?: string[];
  breadcrumbs?: BreadcrumbItem[];
  hero: DubaiHeroProps;
  highlights: DubaiHighlight[];
  highlightsTitle?: string;
  highlightsSubtitle?: string;
  infoSections?: InfoSection[];
  infoSectionsTitle?: string;
  infoSectionsSubtitle?: string;
  faqs: DubaiFAQItem[];
  faqTitle?: string;
  cta: DubaiCTAProps;
  additionalSections?: ReactNode;
}

export function DubaiLandingTemplate({
  title,
  metaDescription,
  canonicalPath,
  ogImage,
  keywords,
  breadcrumbs = [],
  hero,
  highlights,
  highlightsTitle = "Key Highlights",
  highlightsSubtitle,
  infoSections,
  infoSectionsTitle = "Essential Information",
  infoSectionsSubtitle,
  faqs,
  faqTitle = "Frequently Asked Questions",
  cta,
  additionalSections,
}: DubaiLandingTemplateProps) {
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
      <DubaiHighlightsGrid
        highlights={highlights}
        title={highlightsTitle}
        subtitle={highlightsSubtitle}
        columns={highlights.length <= 3 ? (highlights.length as 2 | 3) : 4}
      />

      {infoSections && infoSections.length > 0 && (
        <section className="py-16 bg-muted/30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">{infoSectionsTitle}</h2>
              {infoSectionsSubtitle && (
                <p className="text-muted-foreground max-w-2xl mx-auto">{infoSectionsSubtitle}</p>
              )}
            </div>

            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
            >
              {infoSections.map((section, index) => {
                const Icon = section.icon || Info;
                return (
                  <motion.div key={index} variants={itemVariants}>
                    <Card className="h-full">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <Icon className="w-5 h-5 text-primary" />
                            </div>
                            <h3 className="font-semibold text-lg">{section.title}</h3>
                          </div>
                          {section.badge && (
                            <Badge variant="outline">{section.badge}</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                          {section.description}
                        </p>
                        {section.items && section.items.length > 0 && (
                          <ul className="space-y-2">
                            {section.items.map((item, itemIndex) => (
                              <li key={itemIndex} className="flex items-start gap-2 text-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        )}
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
