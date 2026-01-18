import { ReactNode } from "react";
import { DubaiPageLayout } from "../layouts/DubaiPageLayout";
import {
  DubaiHero,
  DubaiHeroProps,
  DubaiKeyStats,
  DubaiKeyStat,
  DubaiCTA,
  DubaiCTAProps,
} from "../components";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon, Lightbulb, CheckCircle2, BookOpen } from "lucide-react";
import { BreadcrumbItem } from "@/components/breadcrumbs";
import { motion } from "framer-motion";

interface StoryHighlight {
  title: string;
  content: string;
  icon?: LucideIcon;
}

interface LessonLearned {
  title: string;
  description: string;
  takeaway?: string;
}

export interface DubaiCaseStudyTemplateProps {
  title: string;
  metaDescription: string;
  canonicalPath?: string;
  ogImage?: string;
  keywords?: string[];
  breadcrumbs?: BreadcrumbItem[];
  hero: DubaiHeroProps;
  keyStats: DubaiKeyStat[];
  keyStatsTitle?: string;
  keyStatsSubtitle?: string;
  storyHighlights: StoryHighlight[];
  storyHighlightsTitle?: string;
  storyHighlightsSubtitle?: string;
  lessonsLearned: LessonLearned[];
  lessonsLearnedTitle?: string;
  lessonsLearnedSubtitle?: string;
  cta: DubaiCTAProps;
  additionalSections?: ReactNode;
}

export function DubaiCaseStudyTemplate({
  title,
  metaDescription,
  canonicalPath,
  ogImage,
  keywords,
  breadcrumbs = [],
  hero,
  keyStats,
  keyStatsTitle = "Investment Overview",
  keyStatsSubtitle,
  storyHighlights,
  storyHighlightsTitle = "The Story",
  storyHighlightsSubtitle,
  lessonsLearned,
  lessonsLearnedTitle = "Key Lessons Learned",
  lessonsLearnedSubtitle,
  cta,
  additionalSections,
}: DubaiCaseStudyTemplateProps) {
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
        stats={keyStats}
        title={keyStatsTitle}
        subtitle={keyStatsSubtitle}
        columns={keyStats.length <= 4 ? (keyStats.length as 2 | 3 | 4) : 5}
        variant="large"
      />

      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">{storyHighlightsTitle}</h2>
            {storyHighlightsSubtitle && (
              <p className="text-muted-foreground max-w-2xl mx-auto">{storyHighlightsSubtitle}</p>
            )}
          </div>

          <motion.div
            className="space-y-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {storyHighlights.map((highlight, index) => {
              const Icon = highlight.icon || BookOpen;
              return (
                <motion.div key={index} variants={itemVariants}>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-2">{highlight.title}</h3>
                          <p className="text-muted-foreground leading-relaxed">{highlight.content}</p>
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

      <section className="py-16 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
              <Lightbulb className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-3xl font-bold mb-3">{lessonsLearnedTitle}</h2>
            {lessonsLearnedSubtitle && (
              <p className="text-muted-foreground max-w-2xl mx-auto">{lessonsLearnedSubtitle}</p>
            )}
          </div>

          <motion.div
            className="grid md:grid-cols-2 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {lessonsLearned.map((lesson, index) => (
              <motion.div key={index} variants={itemVariants}>
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-sm">
                        {index + 1}
                      </div>
                      <h3 className="font-semibold text-lg">{lesson.title}</h3>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                      {lesson.description}
                    </p>
                    {lesson.takeaway && (
                      <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg">
                        <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <p className="text-sm font-medium">{lesson.takeaway}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {additionalSections}

      <DubaiCTA {...cta} />
    </DubaiPageLayout>
  );
}
