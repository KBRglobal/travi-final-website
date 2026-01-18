import { ReactNode } from "react";
import { Link } from "wouter";
import { MapPin, ArrowRight } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { BreadcrumbItem } from "@/components/breadcrumbs";

interface NearbyDistrict {
  name: string;
  slug: string;
  description?: string;
}

export interface DubaiDistrictTemplateProps {
  title: string;
  metaDescription: string;
  canonicalPath?: string;
  ogImage?: string;
  keywords?: string[];
  breadcrumbs?: BreadcrumbItem[];
  hero: DubaiHeroProps;
  stats: DubaiKeyStat[];
  statsTitle?: string;
  statsSubtitle?: string;
  highlights: DubaiHighlight[];
  highlightsTitle?: string;
  highlightsSubtitle?: string;
  nearbyDistricts?: NearbyDistrict[];
  nearbyDistrictsTitle?: string;
  faqs: DubaiFAQItem[];
  faqTitle?: string;
  cta: DubaiCTAProps;
  additionalSections?: ReactNode;
}

export function DubaiDistrictTemplate({
  title,
  metaDescription,
  canonicalPath,
  ogImage,
  keywords,
  breadcrumbs = [],
  hero,
  stats,
  statsTitle = "District Overview",
  statsSubtitle,
  highlights,
  highlightsTitle = "What Makes This District Special",
  highlightsSubtitle,
  nearbyDistricts,
  nearbyDistrictsTitle = "Nearby Districts",
  faqs,
  faqTitle = "Frequently Asked Questions",
  cta,
  additionalSections,
}: DubaiDistrictTemplateProps) {
  const heroSection = <DubaiHero {...hero} />;

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
        stats={stats}
        title={statsTitle}
        subtitle={statsSubtitle}
        columns={stats.length <= 4 ? (stats.length as 2 | 3 | 4) : 5}
      />

      <DubaiHighlightsGrid
        highlights={highlights}
        title={highlightsTitle}
        subtitle={highlightsSubtitle}
        columns={highlights.length <= 3 ? (highlights.length as 2 | 3) : 4}
      />

      {additionalSections}

      {nearbyDistricts && nearbyDistricts.length > 0 && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold mb-8 text-center">{nearbyDistrictsTitle}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {nearbyDistricts.map((district, index) => (
                <Link key={index} href={`/dubai/${district.slug}`}>
                  <Card className="hover-elevate cursor-pointer h-full">
                    <CardContent className="p-5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <MapPin className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{district.name}</h3>
                          {district.description && (
                            <p className="text-sm text-muted-foreground">{district.description}</p>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <DubaiFAQ faqs={faqs} title={faqTitle} />

      <DubaiCTA {...cta} />
    </DubaiPageLayout>
  );
}
