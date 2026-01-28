import { PublicLayout } from "@/components/public-layout";
import { useDocumentMeta } from "@/hooks/use-document-meta";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Globe,
  Users,
  Target,
  BookOpen,
  Compass,
  Building2,
  Mail,
  ShieldCheck,
  Heart,
  MapPin,
  Star,
  Plane,
  Hotel,
  Utensils,
  Newspaper,
  ArrowRight,
} from "lucide-react";

export default function AboutPage() {
  const { t } = useTranslation();
  const { isRTL, localePath } = useLocale();

  useDocumentMeta({
    title: t("pages.about.metaTitle"),
    description: t("pages.about.metaDescription"),
  });

  const offerings = [
    {
      icon: MapPin,
      title: t("pages.about.offerings.destinations.title"),
      description: t("pages.about.offerings.destinations.description"),
    },
    {
      icon: Star,
      title: t("pages.about.offerings.attractions.title"),
      description: t("pages.about.offerings.attractions.description"),
    },
    {
      icon: Hotel,
      title: t("pages.about.offerings.hotels.title"),
      description: t("pages.about.offerings.hotels.description"),
    },
    {
      icon: Utensils,
      title: t("pages.about.offerings.restaurants.title"),
      description: t("pages.about.offerings.restaurants.description"),
    },
    {
      icon: Plane,
      title: t("pages.about.offerings.articles.title"),
      description: t("pages.about.offerings.articles.description"),
    },
    {
      icon: Newspaper,
      title: t("pages.about.offerings.news.title"),
      description: t("pages.about.offerings.news.description"),
    },
  ];

  const values = [
    {
      icon: ShieldCheck,
      title: t("pages.about.values.accuracy.title"),
      description: t("pages.about.values.accuracy.description"),
      color: "#6443F4",
    },
    {
      icon: BookOpen,
      title: t("pages.about.values.transparency.title"),
      description: t("pages.about.values.transparency.description"),
      color: "#6443F4",
    },
    {
      icon: Heart,
      title: t("pages.about.values.userFocused.title"),
      description: t("pages.about.values.userFocused.description"),
      color: "#F4C542",
    },
  ];

  const stats = [
    { value: "16+", label: t("pages.about.stats.destinations") },
    { value: "1000+", label: t("pages.about.stats.articles") },
    { value: "24/7", label: t("pages.about.stats.support") },
    { value: "Global", label: t("pages.about.stats.coverage") },
  ];

  return (
    <PublicLayout>
      <div dir={isRTL ? "rtl" : "ltr"}>
        {/* Hero Section with Gradient Background and Mascot */}
        <section
          className="relative pt-28 pb-20 overflow-hidden bg-gradient-to-b from-[#6443F4]/10 via-[#6443F4]/5 to-white dark:from-[#6443F4]/20 dark:via-[#6443F4]/10 dark:to-background"
          data-testid="section-hero"
        >
          {/* Decorative gradient orbs */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-[#6443F4]/20 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#6443F4]/15 rounded-full blur-3xl" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Content */}
              <div className="text-center lg:text-start">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-white/10 backdrop-blur-sm border border-white/20 dark:border-white/10 mb-6">
                  <Globe className="w-4 h-4 text-[#6443F4]" />
                  <span className="text-sm font-medium text-[#6443F4]">
                    {t("pages.about.badge")}
                  </span>
                </div>

                <h1
                  className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-6 leading-tight"
                  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                  data-testid="heading-about"
                >
                  {t("pages.about.title")}{" "}
                  <span className="text-[#6443F4]">{t("pages.about.titleHighlight")}</span>
                </h1>

                <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto lg:ms-0 mb-8">
                  {t("pages.about.subtitle")}
                </p>

                <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                  <Link href={localePath("/destinations")}>
                    <Button className="rounded-[--radius-card] px-6 bg-[#6443F4] hover:bg-[#5339D9] text-white">
                      {t("pages.about.ctaExplore")}
                      <ArrowRight className="w-4 h-4 ms-2" />
                    </Button>
                  </Link>
                  <Link href={localePath("/contact")}>
                    <Button variant="outline" className="rounded-[--radius-card] px-6">
                      {t("pages.about.ctaContact")}
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Right - Mascot Image with Glassmorphism Frame */}
              <div className="relative flex justify-center lg:justify-end">
                <div className="relative">
                  {/* Glow effect behind image */}
                  <div className="absolute -inset-4 bg-gradient-to-r from-[#6443F4] via-[#6443F4] to-[#F4C542] rounded-3xl blur-2xl opacity-30" />

                  {/* Glass frame */}
                  <div className="relative bg-white/80 dark:bg-white/10 backdrop-blur-sm rounded-3xl p-3 border border-white/20 dark:border-white/10 shadow-2xl">
                    <img
                      src="/hero/travi-world-mascot-colorful-pool-arches.webp"
                      alt="TRAVI mascot exploring the world"
                      className="w-full max-w-md rounded-2xl object-cover"
                      data-testid="img-mascot"
                    />
                  </div>

                  {/* Floating stat badge */}
                  <div className="absolute -bottom-4 -left-4 bg-white dark:bg-slate-800 rounded-xl px-4 py-3 shadow-lg border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                        <Globe className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("pages.about.stats.destinations")}
                        </p>
                        <p className="font-bold text-foreground">{t("pages.about.stats.cities")}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-white/10 text-center"
                  data-testid={`stat-card-${index}`}
                >
                  <p
                    className="text-3xl md:text-4xl font-bold text-[#6443F4]"
                    style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                  >
                    {stat.value}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Who We Are & Mission - White Background */}
        <section className="py-20 bg-white dark:bg-background" data-testid="section-who-we-are">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Who We Are */}
              <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-slate-100 dark:border-white/10 shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <h2
                    className="text-2xl font-bold text-foreground"
                    style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                  >
                    {t("pages.about.whoWeAre.title")}
                  </h2>
                </div>
                {/* OUT_OF_SCOPE: Editorial body text */}
                <div className="space-y-4 text-muted-foreground">
                  <p>
                    TRAVI World is an independent travel information platform dedicated to providing
                    comprehensive travel guides, destination information, and resources for
                    travelers worldwide.
                  </p>
                  <p>
                    We publish detailed information about attractions, hotels, restaurants, and
                    local experiences to help you plan your travels effectively.
                  </p>
                  <div className="pt-4 border-t border-slate-100 dark:border-white/10">
                    <p className="text-sm">
                      Operated by{" "}
                      <span className="font-semibold text-foreground">
                        KBR Global Creative Consulting Ltd
                      </span>
                      , a company registered in Gibraltar (Company No. 125571).
                    </p>
                  </div>
                </div>
              </div>

              {/* Our Mission */}
              <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-slate-100 dark:border-white/10 shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#6443F4] to-[#F4C542] flex items-center justify-center">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <h2
                    className="text-2xl font-bold text-foreground"
                    style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                  >
                    {t("pages.about.mission.title")}
                  </h2>
                </div>
                {/* OUT_OF_SCOPE: Editorial body text */}
                <div className="space-y-4 text-muted-foreground">
                  <p>
                    Our mission is to provide accurate, up-to-date travel information to help
                    travelers make informed decisions.
                  </p>
                  <p>
                    We strive to offer practical, useful contents that enhances your travel planning
                    experience, from discovering hidden gems to understanding local customs and
                    finding the best places to stay and eat.
                  </p>
                  <div className="flex items-center gap-2 pt-4">
                    <div className="flex -space-x-2">
                      {[0, 1, 2].map(i => (
                        <div
                          key={i}
                          className="w-8 h-8 rounded-full bg-gradient-to-r from-[#6443F4] to-[#6443F4] border-2 border-white dark:border-slate-800"
                        />
                      ))}
                    </div>
                    <span className="text-sm">Trusted by travelers worldwide</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What We Offer - Alternating Background */}
        <section
          className="py-20 bg-slate-50 dark:bg-slate-900/50"
          data-testid="section-what-we-offer"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#6443F4]/10 mb-4">
                <Compass className="w-4 h-4 text-[#6443F4]" />
                <span className="text-sm font-medium text-[#6443F4]">
                  {t("pages.about.services.badge")}
                </span>
              </div>
              <h2
                className="text-3xl md:text-4xl font-bold text-foreground mb-4"
                style={{ fontFamily: "'Chillax', var(--font-sans)" }}
              >
                {t("pages.about.services.title")}
              </h2>
              {/* OUT_OF_SCOPE: Editorial body text */}
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Comprehensive travel resources designed to help you explore the world with
                confidence
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {offerings.map((item, index) => (
                <div
                  key={index}
                  className="group bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-white/10 hover-elevate transition-all duration-300"
                  data-testid={`offering-card-${index}`}
                >
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-r from-[#6443F4]/10 to-[#6443F4]/10 flex items-center justify-center mb-4 group-hover:from-[#6443F4] group-hover:to-[#6443F4] transition-all duration-300">
                    <item.icon className="w-7 h-7 text-[#6443F4] group-hover:text-white transition-colors duration-300" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Editorial Independence - White Background */}
        <section className="py-20 bg-white dark:bg-background" data-testid="section-editorial">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-8 md:p-12 border border-slate-100 dark:border-white/10 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <h2
                  className="text-2xl font-bold text-foreground"
                  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                >
                  {t("pages.about.editorial.title")}
                </h2>
              </div>

              {/* OUT_OF_SCOPE: Editorial body text */}
              <p className="text-muted-foreground mb-6">
                TRAVI World is an independent travel information resource. Our editorial contents is
                reviewed internally to maintain quality and accuracy. We are committed to providing
                useful information to help you plan your travels.
              </p>

              {/* Affiliate Disclosure Banner */}
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 p-6">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#F4C542]/20 to-transparent rounded-full blur-2xl" />
                <div className="relative">
                  <p className="font-semibold text-amber-800 dark:text-amber-200 mb-2">
                    {t("pages.about.editorial.affiliateTitle")}
                  </p>
                  {/* OUT_OF_SCOPE: Editorial body text */}
                  <p className="text-amber-700 dark:text-amber-300 text-sm">
                    Some contents on our website contains affiliate links. When you click these
                    links and make a purchase, we may earn a commission at no additional cost to
                    you. Please see our{" "}
                    <Link
                      href={localePath("/affiliate-disclosure")}
                      className="underline hover:no-underline font-medium"
                    >
                      Affiliate Disclosure
                    </Link>{" "}
                    for complete details.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Our Values - Timeline Style - Alternating Background */}
        <section className="py-20 bg-slate-50 dark:bg-slate-900/50" data-testid="section-values">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#6443F4]/10 mb-4">
                <Heart className="w-4 h-4 text-[#6443F4]" />
                <span className="text-sm font-medium text-[#6443F4]">
                  {t("pages.about.values.badge")}
                </span>
              </div>
              <h2
                className="text-3xl md:text-4xl font-bold text-foreground mb-4"
                style={{ fontFamily: "'Chillax', var(--font-sans)" }}
              >
                {t("pages.about.values.title")}
              </h2>
              {/* OUT_OF_SCOPE: Editorial body text */}
              <p className="text-muted-foreground max-w-2xl mx-auto">
                The principles that guide everything we do at TRAVI World
              </p>
            </div>

            {/* Timeline Layout */}
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#6443F4] via-[#6443F4] to-[#F4C542] transform md:-translate-x-1/2" />

              <div className="space-y-12">
                {values.map((value, index) => (
                  <div
                    key={index}
                    className={`relative flex items-center gap-8 ${index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}
                    data-testid={`value-item-${index}`}
                  >
                    {/* Timeline node */}
                    <div className="absolute left-8 md:left-1/2 transform md:-translate-x-1/2 z-10">
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
                        style={{ backgroundColor: value.color }}
                      >
                        <value.icon className="w-7 h-7 text-white" />
                      </div>
                    </div>

                    {/* Content card */}
                    <div
                      className={`ml-24 md:ml-0 md:w-[calc(50%-4rem)] ${index % 2 === 0 ? "md:pr-8 md:text-right" : "md:pl-8"}`}
                    >
                      <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-white/10 shadow-lg">
                        <h3
                          className="text-xl font-bold text-foreground mb-2"
                          style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                        >
                          {value.title}
                        </h3>
                        <p className="text-muted-foreground">{value.description}</p>
                      </div>
                    </div>

                    {/* Spacer for alternating layout */}
                    <div className="hidden md:block md:w-[calc(50%-4rem)]" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Contact CTA - Gradient Background */}
        <section
          className="py-20 bg-gradient-to-r from-[#6443F4] via-[#6443F4] to-[#6443F4] relative overflow-hidden"
          data-testid="section-contact-cta"
        >
          {/* Decorative elements */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />

          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm mb-6">
              <Mail className="w-4 h-4 text-white" />
              <span className="text-sm font-medium text-white">
                {t("pages.about.connect.badge")}
              </span>
            </div>

            <h2
              className="text-3xl md:text-4xl font-bold text-white mb-4"
              style={{ fontFamily: "'Chillax', var(--font-sans)" }}
            >
              {t("pages.about.connect.title")}
            </h2>
            {/* OUT_OF_SCOPE: Editorial body text */}
            <p className="text-white/80 max-w-2xl mx-auto mb-8">
              We value your feedback and inquiries. Whether you have questions, suggestions, or
              would like to report any issues with our contents, we'd love to hear from you.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <Link href={localePath("/contact")}>
                <Button className="rounded-[--radius-card] px-8 bg-white text-[#6443F4] hover:bg-white/90">
                  <Mail className="w-4 h-4 mr-2" />
                  {t("common.contactUs")}
                </Button>
              </Link>
              <a href="mailto:info@travi.world">
                <Button
                  variant="outline"
                  className="rounded-[--radius-card] px-8 border-white/30 text-white bg-white/10 backdrop-blur-sm"
                >
                  info@travi.world
                </Button>
              </a>
            </div>
          </div>
        </section>

        {/* Company Information - White Background */}
        <section className="py-20 bg-white dark:bg-background" data-testid="section-company-info">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-8 md:p-12 border border-slate-100 dark:border-white/10 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#6443F4] to-[#6443F4] flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <h2
                  className="text-2xl font-bold text-foreground"
                  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                >
                  {t("pages.about.company.title")}
                </h2>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6">
                  <p className="font-semibold text-foreground text-lg mb-3">
                    KBR Global Creative Consulting Ltd
                  </p>
                  <div className="space-y-2 text-muted-foreground">
                    <p>Company No. 125571</p>
                    <p>Suite 4.3.02, Block 4, Eurotowers</p>
                    <p>Gibraltar GX11 1AA</p>
                    <p>Gibraltar</p>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6">
                  <p className="font-semibold text-foreground text-lg mb-3">
                    {t("pages.about.company.contactTitle")}
                  </p>
                  <div className="space-y-3">
                    <a
                      href="mailto:info@travi.world"
                      className="flex items-center gap-3 text-muted-foreground hover:text-[#6443F4] transition-colors"
                    >
                      <Mail className="w-5 h-5" />
                      info@travi.world
                    </a>
                    <Link
                      href={localePath("/contact")}
                      className="flex items-center gap-3 text-muted-foreground hover:text-[#6443F4] transition-colors"
                    >
                      <Globe className="w-5 h-5" />
                      {t("pages.about.company.contactForm")}
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer text */}
            <div className="mt-12 text-center">
              <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent mb-8" />
              <p className="text-sm text-muted-foreground">
                © 2026 TRAVI World. All rights reserved.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Operated by KBR Global Creative Consulting Ltd, Gibraltar
              </p>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
