/**
 * CategoryListingTemplate Component
 * Programmatic SEO template for "Best [Category] in [City]" pages.
 * Used to generate pages like /best-museums-in-paris, /best-restaurants-in-dubai, etc.
 */

import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin,
  Star,
  Clock,
  ArrowRight,
  ChevronRight,
  Ticket,
  Calendar,
  Check,
} from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface CategoryItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  image: string;
  rating?: number;
  reviewCount?: number;
  duration?: string;
  price?: string;
  category?: string;
  highlights?: string[];
}

interface CategoryListingTemplateProps {
  category: string;
  categoryDisplay: string;
  city: string;
  cityDisplay: string;
  items: CategoryItem[];
  description: string;
  faqs?: Array<{ question: string; answer: string }>;
  isLoading?: boolean;
}

const SITE_URL = "https://travi.world";

export function CategoryListingTemplate({
  category,
  categoryDisplay,
  city,
  cityDisplay,
  items,
  description,
  faqs = [],
  isLoading = false,
}: CategoryListingTemplateProps) {
  const { localePath } = useLocale();
  const currentYear = new Date().getFullYear();

  const pageTitle = `${items.length} Best ${categoryDisplay} in ${cityDisplay} ${currentYear} | TRAVI`;
  const metaDescription = `Discover the best ${categoryDisplay.toLowerCase()} in ${cityDisplay}. ${description.slice(0, 100)}...`;
  const canonicalUrl = `${SITE_URL}/best-${category}-in-${city}`;

  // Schema.org ItemList for rankings
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Best ${categoryDisplay} in ${cityDisplay}`,
    description: description,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "TouristAttraction",
        name: item.title,
        description: item.description,
        url: `${SITE_URL}/${city}/attractions/${item.slug}`,
        image: item.image,
        aggregateRating: item.rating
          ? {
              "@type": "AggregateRating",
              ratingValue: item.rating,
              reviewCount: item.reviewCount || 100,
            }
          : undefined,
      },
    })),
  };

  // Breadcrumb schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: cityDisplay,
        item: `${SITE_URL}/destinations/${city}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `Best ${categoryDisplay}`,
        item: canonicalUrl,
      },
    ],
  };

  // FAQ schema
  const faqSchema =
    faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map(faq => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer,
            },
          })),
        }
      : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950">
        <PublicNav />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Skeleton className="h-12 w-2/3 mb-4" />
          <Skeleton className="h-6 w-full mb-8" />
          <div className="grid gap-6">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        {items[0]?.image && <meta property="og:image" content={items[0].image} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={metaDescription} />
        <script type="application/ld+json">{JSON.stringify(itemListSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        {faqSchema && <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>}
      </Helmet>

      <div className="min-h-screen bg-white dark:bg-slate-950">
        <PublicNav />

        <main className="pb-16">
          {/* Hero Section */}
          <section className="bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#1e1b4b] py-16 md:py-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Breadcrumbs */}
              <nav className="flex items-center gap-2 text-sm text-white/70 mb-6">
                <Link href="/" className="hover:text-white transition-colors">
                  Home
                </Link>
                <ChevronRight className="w-4 h-4" />
                <Link
                  href={localePath(`/destinations/${city}`)}
                  className="hover:text-white transition-colors"
                >
                  {cityDisplay}
                </Link>
                <ChevronRight className="w-4 h-4" />
                <span className="text-white">Best {categoryDisplay}</span>
              </nav>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4"
                style={{ fontFamily: "'Chillax', var(--font-sans)" }}
              >
                {items.length} Best {categoryDisplay} in {cityDisplay}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-lg text-white/80 max-w-3xl mb-6"
              >
                {description}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-wrap items-center gap-4 text-sm text-white/70"
              >
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  Updated {currentYear}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {cityDisplay}
                </span>
                <span className="flex items-center gap-1.5">
                  <Ticket className="w-4 h-4" />
                  {items.length} places
                </span>
              </motion.div>
            </div>
          </section>

          {/* Quick Picks */}
          {items.length >= 3 && (
            <section className="py-12 bg-slate-50 dark:bg-slate-900/50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
                  Our Top 3 Picks
                </h2>
                <div className="grid sm:grid-cols-3 gap-4">
                  {items.slice(0, 3).map((item, index) => (
                    <Link key={item.id} href={localePath(`/${city}/attractions/${item.slug}`)}>
                      <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[#6443F4]/50 transition-colors cursor-pointer">
                        <div className="w-10 h-10 rounded-full bg-[#6443F4] text-white flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 dark:text-white truncate">
                            {item.title}
                          </p>
                          {item.rating && (
                            <div className="flex items-center gap-1 text-sm text-slate-500">
                              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                              <span>{item.rating}</span>
                            </div>
                          )}
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Full List */}
          <section className="py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">
                Complete List: Best {categoryDisplay} in {cityDisplay}
              </h2>

              <div className="space-y-6">
                {items.map((item, index) => (
                  <motion.article
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link href={localePath(`/${city}/attractions/${item.slug}`)}>
                      <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-[#6443F4]/30 cursor-pointer">
                        <div className="flex flex-col md:flex-row">
                          {/* Image */}
                          <div className="md:w-72 lg:w-80 flex-shrink-0">
                            <div className="aspect-[4/3] md:aspect-auto md:h-full relative overflow-hidden">
                              <img
                                src={item.image}
                                alt={item.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                              <div className="absolute top-3 left-3">
                                <Badge className="bg-[#6443F4] text-white font-bold px-3 py-1">
                                  #{index + 1}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          {/* Content */}
                          <CardContent className="flex-1 p-5 md:p-6">
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                {item.title}
                              </h3>
                              {item.rating && (
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                                  <span className="font-semibold text-slate-900 dark:text-white">
                                    {item.rating}
                                  </span>
                                  {item.reviewCount && (
                                    <span className="text-sm text-slate-500">
                                      ({item.reviewCount.toLocaleString()})
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            <p className="text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                              {item.description}
                            </p>

                            {/* Highlights */}
                            {item.highlights && item.highlights.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-4">
                                {item.highlights.slice(0, 3).map((highlight, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full"
                                  >
                                    <Check className="w-3 h-3" />
                                    {highlight}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                              <div className="flex items-center gap-4 text-sm text-slate-500">
                                {item.duration && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {item.duration}
                                  </span>
                                )}
                                {item.price && (
                                  <span className="flex items-center gap-1">
                                    <Ticket className="w-4 h-4" />
                                    {item.price}
                                  </span>
                                )}
                              </div>
                              <span className="text-[#6443F4] font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                                Learn more
                                <ArrowRight className="w-4 h-4" />
                              </span>
                            </div>
                          </CardContent>
                        </div>
                      </Card>
                    </Link>
                  </motion.article>
                ))}
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          {faqs.length > 0 && (
            <section className="py-12 bg-slate-50 dark:bg-slate-900/50">
              <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 text-center">
                  Frequently Asked Questions
                </h2>
                <div className="space-y-4">
                  {faqs.map((faq, index) => (
                    <div
                      key={index}
                      className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700"
                    >
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                        {faq.question}
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Related Categories */}
          <section className="py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
                Explore More in {cityDisplay}
              </h2>
              <div className="flex flex-wrap gap-3">
                {["museums", "restaurants", "shopping", "nightlife", "parks", "viewpoints"]
                  .filter(cat => cat !== category)
                  .slice(0, 5)
                  .map(cat => (
                    <Link key={cat} href={localePath(`/best-${cat}-in-${city}`)}>
                      <Button
                        variant="outline"
                        className="rounded-full capitalize hover:bg-[#6443F4] hover:text-white hover:border-[#6443F4]"
                      >
                        Best {cat}
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>
                  ))}
              </div>
            </div>
          </section>

          {/* Back to Destination CTA */}
          <section className="py-12 bg-gradient-to-r from-[#6443F4] to-[#8B5CF6]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="text-2xl font-bold text-white mb-4">
                Planning a trip to {cityDisplay}?
              </h2>
              <p className="text-white/80 mb-6">
                Explore our complete {cityDisplay} travel guide with hotels, attractions, and more.
              </p>
              <Link href={localePath(`/destinations/${city}`)}>
                <Button
                  size="lg"
                  className="bg-white text-[#6443F4] hover:bg-white/90 rounded-full px-8"
                >
                  Explore {cityDisplay} Guide
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </section>
        </main>

        <PublicFooter />
      </div>
    </>
  );
}
