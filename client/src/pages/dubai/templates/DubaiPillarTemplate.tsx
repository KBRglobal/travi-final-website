import { ReactNode, useState, useEffect } from "react";
import { DubaiPageLayout } from "../layouts/DubaiPageLayout";
import {
  DubaiHero,
  DubaiHeroProps,
  DubaiKeyStats,
  DubaiKeyStat,
  DubaiFAQ,
  DubaiFAQItem,
  DubaiCTA,
  DubaiCTAProps,
} from "../components";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LucideIcon, List, ChevronRight } from "lucide-react";
import { BreadcrumbItem } from "@/components/breadcrumbs";
import { motion } from "framer-motion";

interface TocItem {
  id: string;
  title: string;
  icon?: LucideIcon;
}

interface ContentSection {
  id: string;
  title: string;
  icon?: LucideIcon;
  content: ReactNode;
  stats?: DubaiKeyStat[];
}

export interface DubaiPillarTemplateProps {
  title: string;
  metaDescription: string;
  canonicalPath?: string;
  ogImage?: string;
  keywords?: string[];
  breadcrumbs?: BreadcrumbItem[];
  hero: DubaiHeroProps;
  introStats?: DubaiKeyStat[];
  introStatsTitle?: string;
  tableOfContents: TocItem[];
  tocTitle?: string;
  sections: ContentSection[];
  faqs: DubaiFAQItem[];
  faqTitle?: string;
  cta: DubaiCTAProps;
  additionalSections?: ReactNode;
}

export function DubaiPillarTemplate({
  title,
  metaDescription,
  canonicalPath,
  ogImage,
  keywords,
  breadcrumbs = [],
  hero,
  introStats,
  introStatsTitle,
  tableOfContents,
  tocTitle = "What You'll Learn",
  sections,
  faqs,
  faqTitle = "Frequently Asked Questions",
  cta,
  additionalSections,
}: DubaiPillarTemplateProps) {
  const [activeSection, setActiveSection] = useState<string>("");
  const heroSection = <DubaiHero {...hero} />;

  useEffect(() => {
    const handleScroll = () => {
      const sectionElements = sections.map(section => ({
        id: section.id,
        element: document.getElementById(section.id),
      }));

      for (const { id, element } of sectionElements) {
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 150 && rect.bottom >= 150) {
            setActiveSection(id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sections]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 100;
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: elementPosition - offset,
        behavior: "smooth",
      });
    }
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
      {introStats && introStats.length > 0 && (
        <DubaiKeyStats
          stats={introStats}
          title={introStatsTitle}
          columns={introStats.length <= 4 ? (introStats.length as 2 | 3 | 4) : 5}
        />
      )}

      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Card className="overflow-hidden">
              <CardHeader className="bg-primary/5 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <List className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold">{tocTitle}</h2>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <nav className="divide-y">
                  {tableOfContents.map((item, index) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => scrollToSection(item.id)}
                        className={`w-full flex items-center gap-4 p-4 text-left transition-colors hover-elevate ${
                          isActive ? "bg-primary/5" : ""
                        }`}
                        data-testid={`toc-item-${item.id}`}
                      >
                        <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                          {index + 1}
                        </span>
                        {Icon && <Icon className="w-5 h-5 text-muted-foreground shrink-0" />}
                        <span className={`font-medium ${isActive ? "text-primary" : ""}`}>
                          {item.title}
                        </span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {sections.map((section, index) => {
        const Icon = section.icon;
        const isEven = index % 2 === 0;

        return (
          <section
            key={section.id}
            id={section.id}
            className={`py-16 ${isEven ? "" : "bg-muted/30"}`}
          >
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex items-center gap-4 mb-8">
                  {Icon && (
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                  )}
                  <div>
                    <Badge variant="outline" className="mb-2">Section {index + 1}</Badge>
                    <h2 className="text-2xl md:text-3xl font-bold">{section.title}</h2>
                  </div>
                </div>

                <div className="prose prose-lg dark:prose-invert max-w-none">
                  {section.content}
                </div>

                {section.stats && section.stats.length > 0 && (
                  <div className="mt-8">
                    <DubaiKeyStats
                      stats={section.stats}
                      columns={section.stats.length <= 4 ? (section.stats.length as 2 | 3 | 4) : 4}
                      variant="compact"
                    />
                  </div>
                )}
              </motion.div>
            </div>
          </section>
        );
      })}

      {additionalSections}

      <DubaiFAQ faqs={faqs} title={faqTitle} columns={2} />

      <DubaiCTA {...cta} />
    </DubaiPageLayout>
  );
}
