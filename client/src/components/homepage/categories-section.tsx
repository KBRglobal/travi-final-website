import { Link } from "wouter";
import { ArrowRight, Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { AnimatedSection } from "./animated-section";
import { CATEGORY_CARDS, SITE_URL, SITE_NAME } from "./homepage-data";

export function CategoriesSection() {
  const { t } = useTranslation("common");
  const { localePath } = useLocale();
  const categoriesSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Travel Categories",
    description: "Browse travel information by category on TRAVI World",
    numberOfItems: CATEGORY_CARDS.length,
    itemListElement: CATEGORY_CARDS.map((cat, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Service",
        name: cat.title,
        description: cat.description,
        url: `${SITE_URL}${cat.linkUrl}`,
        provider: {
          "@type": "Organization",
          name: SITE_NAME,
        },
      },
    })),
  });

  return (
    <AnimatedSection
      className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 lg:px-8"
      ariaLabel="Browse travel categories"
    >
      <Helmet>
        <script type="application/ld+json">{categoriesSchema}</script>
      </Helmet>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 dark:bg-primary/20 rounded-full mb-4">
            <Compass className="w-4 h-4 text-primary" aria-hidden="true" />
            <span className="text-xs font-semibold tracking-wide text-primary uppercase">
              {t("home.categoriesSection.badge", "Browse Travel Categories")}
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground dark:text-white mb-4 font-chillax">
            {t("home.categoriesSection.title", "Explore by Type")}
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground dark:text-muted-foreground max-w-2xl mx-auto">
            {t(
              "home.categoriesSection.subtitle",
              "Find exactly what you're looking for with our curated travel categories"
            )}
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
          {CATEGORY_CARDS.map((card, index) => {
            const IconComponent = card.icon;
            return (
              <div
                key={card.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <Link href={localePath(card.linkUrl)} title={card.description}>
                  <article
                    className={cn(
                      "group relative p-6 rounded-2xl transition-all duration-300 cursor-pointer h-full",
                      "hover:shadow-2xl hover:-translate-y-2",
                      card.bgColor,
                      card.hoverGlow
                    )}
                  >
                    <div
                      className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3",
                        card.iconBg
                      )}
                    >
                      <IconComponent className="w-7 h-7 text-white" aria-hidden="true" />
                    </div>

                    <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-1 font-chillax">
                      {card.title}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                      {card.subtitle}
                    </p>

                    <div className="flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                      <span>{t("home.categoriesSection.explore", "Explore")}</span>
                      <ArrowRight
                        className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                        aria-hidden="true"
                      />
                    </div>

                    <div
                      className={cn(
                        "absolute bottom-0 left-4 right-4 h-1 rounded-full bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                        card.gradient
                      )}
                      aria-hidden="true"
                    />
                  </article>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </AnimatedSection>
  );
}
