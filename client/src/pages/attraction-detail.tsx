import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  MapPin,
  Clock,
  Star,
  Users,
  Calendar,
  CheckCircle2,
  ChevronRight,
  AlertCircle,
  Lightbulb,
  Train,
  Car,
  Timer,
  Sparkles,
  ShieldCheck,
  Smartphone,
  Ticket,
  ArrowRight,
  Info,
  Search,
} from "lucide-react";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { sanitizeHTML } from "@/lib/sanitize";
import SubtleSkyBackground from "@/components/ui/subtle-sky-background";
import type { TiqetsAttraction } from "@shared/schema";

const heroAnimationStyles = `
  @keyframes gradient-flow {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  .hero-gradient-text {
    background: linear-gradient(
      135deg,
      #6443F4 0%,
      #8B5CF6 20%,
      #A78BFA 40%,
      #6443F4 60%,
      #8B5CF6 80%,
      #6443F4 100%
    );
    background-size: 300% 300%;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: gradient-flow 6s ease infinite;
  }
`;

interface AttractionResponse {
  attraction: TiqetsAttraction;
  relatedAttractions?: TiqetsAttraction[];
  affiliateLink: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface TiqetsImage {
  small?: string;
  medium?: string;
  large?: string;
  extra_large?: string;
  alt_text?: string;
}

interface AIContentItem {
  title: string;
  description: string;
  icon: string;
}

interface AIContentTransport {
  mode: string;
  details: string;
}

interface AIContent {
  introduction?: string;
  whyVisit?: string;
  proTip?: string;
  whatToExpect?: Array<AIContentItem>;
  visitorTips?: Array<AIContentItem>;
  howToGetThere?: { description: string; transport: Array<AIContentTransport> };
  answerCapsule?: string;
}

function AttractionDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background" data-testid="loading-skeleton">
      <style dangerouslySetInnerHTML={{ __html: heroAnimationStyles }} />
      <div className="h-[70vh] bg-slate-200 dark:bg-slate-800 animate-pulse" />
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-12 space-y-8">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

function AttractionError({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-background" data-testid="error-container">
      <style dangerouslySetInnerHTML={{ __html: heroAnimationStyles }} />
      <PublicNav />
      <SubtleSkyBackground />
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-24 text-center relative z-10">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
        <h1
          className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4"
          style={{ fontFamily: "'Chillax', var(--font-sans)" }}
        >
          Attraction Not Found
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8" data-testid="error-message">
          {message}
        </p>
        <Button
          className="bg-[#6443F4] hover:bg-[#5539d4] text-white"
          onClick={() => window.history.back()}
          data-testid="button-go-back"
        >
          Go Back
        </Button>
      </div>
      <PublicFooter />
    </div>
  );
}

function HeroSection({
  attraction,
  heroImage,
  destination,
  onAffiliateClick,
  localePath,
}: {
  attraction: TiqetsAttraction;
  heroImage: string;
  destination: string;
  onAffiliateClick: () => void;
  localePath: (path: string) => string;
}) {
  const title = attraction.h1Title || attraction.title;
  const rating = attraction.tiqetsRating || "4.5";
  const reviewCount = attraction.tiqetsReviewCount || 0;

  return (
    <section
      className="relative w-full min-h-[70vh] md:min-h-[80vh] overflow-hidden"
      data-testid="section-hero"
    >
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt={attraction.title}
          className="w-full h-full object-cover"
          loading="eager"
          {...({ fetchpriority: "high" } as React.ImgHTMLAttributes<HTMLImageElement>)}
          onError={e => {
            (e.target as HTMLImageElement).src = "/cards/dubai.webp";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/30" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative container mx-auto px-4 md:px-6 lg:px-8 py-16 md:py-20 lg:py-24 flex flex-col justify-end min-h-[70vh] md:min-h-[80vh]"
      >
        <div className="max-w-4xl space-y-6">
          <nav
            className="flex flex-wrap items-center gap-2 text-sm text-white/70"
            aria-label="Breadcrumb"
            data-testid="nav-breadcrumb"
          >
            <Link
              href={localePath("/")}
              className="hover:text-white transition-colors"
              data-testid="breadcrumb-home"
            >
              Home
            </Link>
            <ChevronRight className="w-4 h-4" />
            <Link
              href={localePath("/attractions")}
              className="hover:text-white transition-colors"
              data-testid="breadcrumb-all-attractions"
            >
              Attractions
            </Link>
            <ChevronRight className="w-4 h-4" />
            <Link
              href={localePath(`/destinations/${destination.toLowerCase()}`)}
              className="hover:text-white transition-colors capitalize"
              data-testid="breadcrumb-destination"
            >
              {destination}
            </Link>
            <ChevronRight className="w-4 h-4" />
            <Link
              href={localePath(`/attractions/list/${destination.toLowerCase()}`)}
              className="hover:text-white transition-colors"
              data-testid="breadcrumb-attractions"
            >
              Attractions
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white font-medium" data-testid="breadcrumb-current">
              {attraction.title}
            </span>
          </nav>

          <h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight leading-[1.05]"
            style={{ fontFamily: "'Chillax', var(--font-sans)" }}
            data-testid="text-h1-title"
          >
            {title}
          </h1>

          <div
            className="flex flex-wrap items-center gap-3 md:gap-4"
            data-testid="hero-quick-stats"
          >
            <Badge className="bg-[#6443F4]/20 backdrop-blur-sm text-white border-[#6443F4]/40 px-4 py-2 text-sm">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 mr-1.5" />
              <span className="font-semibold">{rating}</span>
              {reviewCount > 0 && (
                <span className="text-white/80 ml-1">({reviewCount.toLocaleString()})</span>
              )}
            </Badge>

            {attraction.duration && (
              <Badge className="bg-[#6443F4]/20 backdrop-blur-sm text-white border-[#6443F4]/40 px-4 py-2 text-sm">
                <Clock className="w-4 h-4 mr-1.5" />
                <span>{attraction.duration}</span>
              </Badge>
            )}

            <Badge className="bg-[#6443F4]/20 backdrop-blur-sm text-white border-[#6443F4]/40 px-4 py-2 text-sm">
              <Ticket className="w-4 h-4 mr-1.5" />
              <span>Skip the Line</span>
            </Badge>
          </div>

          {attraction.productUrl && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <a
                href={attraction.productUrl}
                target="_blank"
                rel="noopener noreferrer sponsored"
                onClick={onAffiliateClick}
                className="inline-flex items-center gap-2.5 bg-[#6443F4] hover:bg-[#5539d4] text-white font-semibold px-8 py-4 rounded-xl shadow-lg shadow-[#6443F4]/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-[#6443F4]/40 active:scale-[0.98]"
                data-testid="button-hero-cta"
              >
                <Ticket className="w-5 h-5" />
                Book Tickets
                <ArrowRight className="w-5 h-5" />
              </a>
            </motion.div>
          )}
        </div>
      </motion.div>
    </section>
  );
}

interface TicketOption {
  id: string;
  name: string;
  description?: string;
  features?: string[];
  popular?: boolean;
}

function LivePricingWidget({
  attraction,
  onAffiliateClick,
}: {
  attraction: TiqetsAttraction;
  onAffiliateClick: () => void;
}) {
  const highlights = attraction.highlights || attraction.tiqetsHighlights || [];
  const hasFreeCancellation =
    attraction.cancellationPolicy?.toLowerCase().includes("free") ||
    attraction.cancellationPolicy?.toLowerCase().includes("24");

  const ticketOptions = [
    {
      id: "standard",
      name: "Standard Entry",
      description: attraction.tiqetsSummary || "General admission with skip-the-line access",
      features: ["Skip the ticket line", "Mobile ticket", "Instant confirmation"],
      popular: true,
    },
    {
      id: "priority",
      name: "Priority Access",
      description: "Fast-track entry with flexible timing",
      features: ["Skip all lines", "Flexible timing", "Mobile ticket", "Priority entry"],
      popular: false,
    },
  ];

  return (
    <motion.section
      id="tickets"
      className="container mx-auto px-4 md:px-6 lg:px-8 py-16 md:py-20"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      data-testid="section-live-pricing"
    >
      <div className="max-w-6xl mx-auto">
        <h2
          className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-3"
          style={{ fontFamily: "'Chillax', var(--font-sans)" }}
        >
          Available Ticket Options
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-10 flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
          Tickets available – Check availability
        </p>

        <div className="space-y-5">
          {ticketOptions.map((ticket, index) => {
            const features = ticket.features || highlights.slice(0, 4);

            return (
              <Card
                key={ticket.id || index}
                className={`border-2 shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl ${
                  ticket.popular
                    ? "border-[#6443F4] dark:border-[#6443F4]"
                    : "border-slate-200 dark:border-slate-700 hover:border-[#6443F4]/50"
                }`}
                data-testid={`ticket-card-${index}`}
              >
                <CardContent className="p-0">
                  <div className="p-6 md:p-8">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        {ticket.popular && (
                          <Badge className="bg-[#6443F4]/10 text-[#6443F4] border-[#6443F4]/20 mb-3">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Most Popular
                          </Badge>
                        )}
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                          {ticket.name}
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                          {ticket.description ||
                            "Experience this amazing attraction with flexible booking options."}
                        </p>
                      </div>
                    </div>

                    {features.length > 0 && (
                      <ul className="space-y-2.5 mb-6">
                        {features.slice(0, 4).map((feature, featureIndex) => (
                          <li
                            key={featureIndex}
                            className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300"
                          >
                            <CheckCircle2 className="w-4 h-4 text-[#6443F4] flex-shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {attraction.productUrl && (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-4 pt-5 border-t border-slate-200 dark:border-slate-700">
                        <a
                          href={attraction.productUrl}
                          target="_blank"
                          rel="noopener noreferrer sponsored"
                          onClick={onAffiliateClick}
                          className="inline-flex items-center gap-2 bg-[#6443F4] hover:bg-[#5539d4] text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-[#6443F4]/25"
                          data-testid={`button-book-now-${index}`}
                        >
                          Check Availability
                          <ArrowRight className="w-4 h-4" />
                        </a>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div
          className="mt-8 p-5 bg-[#6443F4]/5 dark:bg-[#6443F4]/10 border-l-4 border-[#6443F4] rounded-r-lg"
          data-testid="trust-bar"
        >
          <div className="flex flex-wrap items-center gap-5 md:gap-8 text-sm text-[#6443F4] dark:text-[#8B5CF6]">
            {hasFreeCancellation && (
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span className="font-medium">Free cancellation</span>
              </div>
            )}
            {attraction.smartphoneTicket && (
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                <span className="font-medium">Mobile tickets</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Ticket className="w-4 h-4" />
              <span className="font-medium">Skip the ticket line</span>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function IntroductionSection({ attraction }: { attraction: TiqetsAttraction }) {
  const title = attraction.title;
  const description = attraction.description || attraction.tiqetsDescription || "";
  const aiContent = attraction.aiContent as AIContent | null;

  const placeholderIntro =
    description.split("\n")[0] ||
    `Discover ${title}, one of the most iconic experiences in ${attraction.cityName}. This attraction offers an unforgettable journey that combines stunning views, rich history, and world-class experiences. Whether you're a first-time visitor or returning for another memorable experience, you'll find something new to appreciate each time.`;

  const introContent = aiContent?.introduction || placeholderIntro;
  const whyVisitContent = aiContent?.whyVisit;

  const placeholderProTip = `Book your tickets at least 3-4 days in advance, especially during peak season (December-February). Sunset time slots are the most popular and sell out quickly. Consider visiting early morning for smaller crowds and better photo opportunities.`;
  const proTipContent = aiContent?.proTip || placeholderProTip;

  return (
    <motion.section
      className="container mx-auto px-4 md:px-6 lg:px-8 py-16 md:py-20"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      data-testid="section-introduction"
    >
      <div className="max-w-5xl mx-auto">
        <h2
          className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-8"
          style={{ fontFamily: "'Chillax', var(--font-sans)" }}
        >
          Why Visit <span className="hero-gradient-text">{title}</span> in 2026?
        </h2>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <div
            className="text-lg leading-relaxed text-slate-700 dark:text-slate-300"
            dangerouslySetInnerHTML={{ __html: sanitizeHTML(introContent) }}
          />
          {whyVisitContent && (
            <div
              className="text-lg leading-relaxed text-slate-700 dark:text-slate-300 mt-5"
              dangerouslySetInnerHTML={{ __html: sanitizeHTML(whyVisitContent) }}
            />
          )}
        </div>

        <div
          className="mt-10 p-6 bg-[#6443F4]/5 dark:bg-[#6443F4]/10 border-l-4 border-[#6443F4] rounded-r-xl"
          data-testid="pro-tip-box"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#6443F4]/10 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-5 h-5 text-[#6443F4]" />
            </div>
            <div>
              <p className="font-semibold text-[#6443F4] dark:text-[#8B5CF6] mb-1.5">Pro Tip</p>
              <div
                className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: sanitizeHTML(proTipContent) }}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function QuickFactsBox({ attraction }: { attraction: TiqetsAttraction }) {
  const facts = [
    {
      icon: MapPin,
      label: "Location",
      value: attraction.venueAddress || attraction.venueName || attraction.cityName,
    },
    {
      icon: Clock,
      label: "Hours",
      value: "Daily, varies by season",
    },
    {
      icon: Timer,
      label: "Duration",
      value: attraction.duration || "1-2 hours",
    },
    {
      icon: Calendar,
      label: "Best Time",
      value: "Early morning or sunset",
    },
    {
      icon: Ticket,
      label: "Tickets",
      value: "Book online in advance",
    },
    {
      icon: Users,
      label: "Best For",
      value: "All ages, families, couples",
    },
  ];

  return (
    <motion.section
      className="container mx-auto px-4 md:px-6 lg:px-8 py-16 md:py-20"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      data-testid="section-quick-facts"
    >
      <div className="max-w-6xl mx-auto">
        <Card className="border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardContent className="p-6 md:p-8">
            <h3
              className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-8"
              style={{ fontFamily: "'Chillax', var(--font-sans)" }}
            >
              Quick Facts
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
              {facts.map((fact, index) => {
                const IconComponent = fact.icon;
                return (
                  <div
                    key={index}
                    className="flex items-start gap-3"
                    data-testid={`quick-fact-${index}`}
                  >
                    <div className="w-11 h-11 rounded-xl bg-[#6443F4]/10 dark:bg-[#6443F4]/20 flex items-center justify-center flex-shrink-0">
                      <IconComponent className="w-5 h-5 text-[#6443F4]" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide font-medium mb-0.5">
                        {fact.label}
                      </p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {fact.value}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-start gap-3 text-sm text-[#6443F4] dark:text-[#8B5CF6]">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>
                  <strong>Important:</strong> Book 2-3 weeks ahead for peak season (Dec-Feb).
                  Same-day tickets are often unavailable for popular time slots.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.section>
  );
}

function TicketOptionsTable({
  attraction,
  onAffiliateClick,
}: {
  attraction: TiqetsAttraction;
  onAffiliateClick: () => void;
}) {
  const ticketOptions = [
    {
      type: "Standard Entry",
      access: "General admission",
      perks: ["Skip the ticket line", "Mobile ticket"],
      popular: false,
    },
    {
      type: "Priority Access",
      access: "Fast-track entry",
      perks: ["Skip all lines", "Mobile ticket", "Flexible timing"],
      popular: true,
    },
    {
      type: "VIP Experience",
      access: "Exclusive access",
      perks: ["Private guide", "Skip all lines", "Complimentary refreshments", "Photo package"],
      popular: false,
    },
  ];

  return (
    <motion.section
      className="container mx-auto px-4 md:px-6 lg:px-8 py-16 md:py-20"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      data-testid="section-ticket-options"
    >
      <div className="max-w-6xl mx-auto">
        <h2
          className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-10"
          style={{ fontFamily: "'Chillax', var(--font-sans)" }}
        >
          Compare Ticket Options
        </h2>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-4 px-5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Ticket Type
                </th>
                <th className="text-left py-4 px-5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Access
                </th>
                <th className="text-left py-4 px-5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Perks
                </th>
                <th className="py-4 px-5"></th>
              </tr>
            </thead>
            <tbody>
              {ticketOptions.map((ticket, index) => (
                <tr
                  key={index}
                  className={`border-b border-slate-200 dark:border-slate-700 transition-colors ${
                    ticket.popular
                      ? "bg-[#6443F4]/5 dark:bg-[#6443F4]/10"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/30"
                  }`}
                  data-testid={`ticket-row-${index}`}
                >
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {ticket.type}
                      </span>
                      {ticket.popular && (
                        <Badge className="bg-[#6443F4]/10 text-[#6443F4] border-[#6443F4]/20 text-xs">
                          Popular
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-5 text-sm text-slate-600 dark:text-slate-400">
                    {ticket.access}
                  </td>
                  <td className="py-4 px-5">
                    <ul className="space-y-1.5">
                      {ticket.perks.map((perk, pIndex) => (
                        <li
                          key={pIndex}
                          className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#6443F4]" />
                          {perk}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="py-4 px-5">
                    {attraction.productUrl ? (
                      <a
                        href={attraction.productUrl}
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                        onClick={onAffiliateClick}
                        className="inline-flex items-center gap-1.5 bg-[#6443F4] hover:bg-[#5539d4] text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-all duration-200 hover:shadow-md"
                        data-testid={`button-book-ticket-${index}`}
                      >
                        Book Now
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500 text-sm">
                        Coming soon
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.section>
  );
}

function WhatToExpectSection({ attraction }: { attraction: TiqetsAttraction }) {
  const tiqetsImages = (attraction.tiqetsImages as TiqetsImage[]) || [];
  const aiContent = attraction.aiContent as AIContent | null;

  const defaultHighlights: AIContentItem[] = [
    {
      icon: "Sparkles",
      title: "Stunning Views",
      description:
        "Experience breathtaking panoramic views that stretch across the city skyline and beyond. Perfect for photography enthusiasts and first-time visitors alike.",
    },
    {
      icon: "Star",
      title: "World-Class Experience",
      description:
        "Immerse yourself in a carefully curated experience designed to engage all your senses. Interactive exhibits and informative displays enhance your visit.",
    },
    {
      icon: "Camera",
      title: "Memorable Moments",
      description:
        "Create lasting memories with unique photo opportunities and exclusive experiences. Every corner offers something new to discover and appreciate.",
    },
  ];

  const highlights =
    Array.isArray(aiContent?.whatToExpect) && aiContent.whatToExpect.length > 0
      ? aiContent.whatToExpect
      : defaultHighlights;

  const placeholderWhatToExpect = `As you step inside, the first thing that strikes you is the sheer scale of the experience. The atmosphere is electric with anticipation as visitors from around the world gather to witness something truly extraordinary. Whether you're here for the views, the history, or simply to check it off your bucket list, ${attraction.title} delivers an experience that transcends expectations and creates memories that last a lifetime.`;

  return (
    <motion.section
      className="container mx-auto px-4 md:px-6 lg:px-8 py-16 md:py-20"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      data-testid="section-what-to-expect"
    >
      <div className="max-w-6xl mx-auto">
        <h2
          className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-10"
          style={{ fontFamily: "'Chillax', var(--font-sans)" }}
        >
          What to Expect at {attraction.title}
        </h2>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {highlights.map((item, index) => {
            const image =
              tiqetsImages[index + 1]?.large ||
              tiqetsImages[index + 1]?.medium ||
              "/cards/dubai.webp";
            return (
              <Card
                key={index}
                className="overflow-hidden border-slate-200 dark:border-slate-700 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                data-testid={`highlight-card-${index}`}
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={image}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    loading="lazy"
                    onError={e => {
                      (e.target as HTMLImageElement).src = "/cards/dubai.webp";
                    }}
                  />
                </div>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-[#6443F4]/10 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-[#6443F4]" />
                    </div>
                    <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                      {item.title}
                    </h3>
                  </div>
                  <div
                    className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: sanitizeHTML(item.description) }}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-200 dark:border-slate-700">
          <div
            className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed italic"
            dangerouslySetInnerHTML={{ __html: sanitizeHTML(placeholderWhatToExpect) }}
          />
        </div>
      </div>
    </motion.section>
  );
}

function VisitorTipsSection({ attraction }: { attraction: TiqetsAttraction }) {
  const aiContent = attraction.aiContent as AIContent | null;

  const defaultTips: AIContentItem[] = [
    {
      icon: "Clock",
      title: "Best Time to Visit",
      description:
        "Avoid peak sunset hours (5-7 PM). Go for early morning (8-10 AM) for smaller crowds. Weekday mornings are ideal for a relaxed experience.",
    },
    {
      icon: "Lightbulb",
      title: "Pro Tips",
      description:
        "Arrive 15 minutes early for security screening. Wear comfortable shoes for walking. Bring a camera and portable charger.",
    },
    {
      icon: "Calendar",
      title: "Book Ahead",
      description:
        "Book online to skip the ticket line. Consider combo tickets to bundle with nearby attractions. Morning slots typically have shorter waits.",
    },
  ];

  const tips =
    Array.isArray(aiContent?.visitorTips) && aiContent.visitorTips.length > 0
      ? aiContent.visitorTips
      : defaultTips;

  return (
    <motion.section
      className="container mx-auto px-4 md:px-6 lg:px-8 py-16 md:py-20"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      data-testid="section-visitor-tips"
    >
      <div className="max-w-6xl mx-auto">
        <h2
          className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-10"
          style={{ fontFamily: "'Chillax', var(--font-sans)" }}
        >
          Insider Tips for Your Visit
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {tips.map((tip, index) => (
            <Card
              key={index}
              className="border-slate-200 dark:border-slate-700 transition-all duration-300 hover:shadow-xl hover:border-[#6443F4]/30"
              data-testid={`tip-card-${index}`}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-[#6443F4]/10 dark:bg-[#6443F4]/20 flex items-center justify-center">
                    <Lightbulb className="w-5 h-5 text-[#6443F4]" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">{tip.title}</h3>
                </div>
                <div
                  className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: sanitizeHTML(tip.description) }}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

function HowToGetThereSection({ attraction }: { attraction: TiqetsAttraction }) {
  const aiContent = attraction.aiContent as AIContent | null;

  const defaultTransport: AIContentTransport[] = [
    {
      mode: "Metro",
      details: `Nearest metro station to ${attraction.venueName || attraction.title}. 5-10 minute walk from station. NOL card required for public transport.`,
    },
    {
      mode: "Taxi/Ride-share",
      details:
        "15-30 minutes from city center depending on traffic. Drop-off at main entrance. Uber and Careem available.",
    },
    {
      mode: "Car",
      details: "Parking available on-site. Tip: Arrive early for best spots near the entrance.",
    },
  ];

  const transportOptions =
    Array.isArray(aiContent?.howToGetThere?.transport) &&
    aiContent.howToGetThere.transport.length > 0
      ? aiContent.howToGetThere.transport
      : defaultTransport;

  const description = aiContent?.howToGetThere?.description;

  const getTransportIcon = (mode: string) => {
    const lowerMode = mode.toLowerCase();
    if (lowerMode.includes("metro") || lowerMode.includes("train") || lowerMode.includes("rail")) {
      return Train;
    }
    return Car;
  };

  return (
    <motion.section
      className="container mx-auto px-4 md:px-6 lg:px-8 py-16 md:py-20"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      data-testid="section-how-to-get-there"
    >
      <div className="max-w-6xl mx-auto">
        <h2
          className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-10"
          style={{ fontFamily: "'Chillax', var(--font-sans)" }}
        >
          How to Get to {attraction.title}
        </h2>

        <div
          className="aspect-video bg-slate-200 dark:bg-slate-700 rounded-2xl mb-10 overflow-hidden shadow-lg"
          data-testid="map-placeholder"
        >
          {attraction.latitude && attraction.longitude ? (
            <iframe
              src={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3000!2d${attraction.longitude}!3d${attraction.latitude}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2z${attraction.latitude}%C2%B0${attraction.longitude}%C2%B0!5e0!3m2!1sen!2sae!4v1700000000000!5m2!1sen!2sae`}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Map showing location of ${attraction.title}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500 dark:text-slate-400">
              <div className="text-center">
                <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">{attraction.venueAddress || attraction.cityName}</p>
                <p className="text-sm mt-1">Map loading...</p>
              </div>
            </div>
          )}
        </div>

        {description && (
          <div className="mb-10 p-6 bg-[#6443F4]/5 dark:bg-[#6443F4]/10 border-l-4 border-[#6443F4] rounded-r-lg">
            <div
              className="text-sm text-slate-700 dark:text-slate-300"
              dangerouslySetInnerHTML={{ __html: sanitizeHTML(description) }}
            />
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {transportOptions.map((option, index) => {
            const IconComponent = getTransportIcon(option.mode);
            return (
              <Card
                key={index}
                className="border-slate-200 dark:border-slate-700 transition-all duration-300 hover:shadow-xl hover:border-[#6443F4]/30"
                data-testid={`transport-option-${index}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-[#6443F4]/10 dark:bg-[#6443F4]/20 flex items-center justify-center">
                      <IconComponent className="w-5 h-5 text-[#6443F4]" />
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      By {option.mode}
                    </h3>
                  </div>
                  <div
                    className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: sanitizeHTML(option.details) }}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}

function FAQSection({ faqs, attractionName }: { faqs: FAQItem[] | null; attractionName: string }) {
  const defaultFaqs: FAQItem[] = [
    {
      question: `How do I book tickets for ${attractionName}?`,
      answer: `You can book tickets online in advance to secure the best availability. We recommend booking at least 2-3 weeks ahead during peak season (December-February). Premium experiences with skip-the-line access and priority entry options are available. Check the official ticketing page for current availability.`,
    },
    {
      question: `Is ${attractionName} worth visiting in 2026?`,
      answer: `Absolutely! ${attractionName} remains one of the top attractions and offers unforgettable experiences. Whether you're a first-time visitor or returning, you'll find the experience well worth the investment. For the best experience, book morning or sunset time slots.`,
    },
    {
      question: `What is the best time to visit ${attractionName}?`,
      answer: `Early morning (8-10 AM) offers smaller crowds and pleasant temperatures. Sunset hours (4-6 PM) provide stunning views but are more crowded and expensive. Weekdays are generally less busy than weekends. Avoid peak tourist season (December-February) if possible.`,
    },
    {
      question: `How long should I spend at ${attractionName}?`,
      answer: `Plan for 1-2 hours for a standard visit. If you've booked a premium experience with additional activities, allow 2-3 hours. Factor in 15-30 minutes for security screening and ticket collection upon arrival.`,
    },
  ];

  const displayFaqs = faqs && faqs.length > 0 ? faqs : defaultFaqs;

  return (
    <motion.section
      className="container mx-auto px-4 md:px-6 lg:px-8 py-16 md:py-20"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      data-testid="section-faq"
    >
      <div className="max-w-5xl mx-auto">
        <h2
          className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-10"
          style={{ fontFamily: "'Chillax', var(--font-sans)" }}
        >
          Frequently Asked Questions
        </h2>

        <Accordion type="single" collapsible className="w-full space-y-4">
          {displayFaqs.map((item, index) => (
            <AccordionItem
              key={index}
              value={`faq-${index}`}
              className="border border-slate-200 dark:border-slate-700 rounded-xl px-5 data-[state=open]:bg-[#6443F4]/5 dark:data-[state=open]:bg-[#6443F4]/10 data-[state=open]:border-[#6443F4]/30 transition-all duration-200"
            >
              <AccordionTrigger
                className="text-left py-5 hover:no-underline"
                data-testid={`faq-trigger-${index}`}
              >
                <span className="font-semibold text-slate-900 dark:text-slate-100 pr-4">
                  {item.question}
                </span>
              </AccordionTrigger>
              <AccordionContent
                className="text-slate-600 dark:text-slate-400 leading-relaxed pb-5"
                data-testid={`faq-content-${index}`}
              >
                <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(item.answer) }} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </motion.section>
  );
}

function RelatedAttractionsSection({
  attractions,
  currentCity,
  localePath,
}: {
  attractions: TiqetsAttraction[];
  currentCity: string;
  localePath: (path: string) => string;
}) {
  if (!attractions || attractions.length === 0) return null;

  return (
    <motion.section
      className="container mx-auto px-4 md:px-6 lg:px-8 py-16 md:py-20"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      data-testid="section-related-attractions"
    >
      <div className="max-w-6xl mx-auto">
        <h2
          className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-10"
          style={{ fontFamily: "'Chillax', var(--font-sans)" }}
        >
          You Might Also Like
        </h2>

        <div className="flex overflow-x-auto gap-6 pb-4 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
          {attractions.slice(0, 6).map((attraction, index) => {
            const tiqetsImages = (attraction.tiqetsImages as TiqetsImage[]) || [];
            const image = tiqetsImages[0]?.large || tiqetsImages[0]?.medium || "/cards/dubai.webp";

            return (
              <Link
                key={attraction.id}
                href={localePath(
                  `/${currentCity.toLowerCase()}/attractions/${attraction.seoSlug || attraction.slug}`
                )}
                className="flex-shrink-0 w-72 snap-start"
                data-testid={`related-attraction-${index}`}
              >
                <Card className="overflow-hidden border-slate-200 dark:border-slate-700 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-[#6443F4]/30">
                  <div className="aspect-[4/3] overflow-hidden relative">
                    <img
                      src={image}
                      alt={attraction.title}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      loading="lazy"
                      onError={e => {
                        (e.target as HTMLImageElement).src = "/cards/dubai.webp";
                      }}
                    />
                    {attraction.primaryCategory && (
                      <Badge className="absolute top-3 left-3 bg-[#6443F4]/10 backdrop-blur-sm text-[#6443F4] border-[#6443F4]/20">
                        {attraction.primaryCategory}
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 line-clamp-2">
                      {attraction.title}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                      {attraction.tiqetsRating && (
                        <div className="flex items-center gap-1.5">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span className="font-medium">{attraction.tiqetsRating}</span>
                        </div>
                      )}
                      {attraction.duration && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          <span>{attraction.duration}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}

function StickyBookingCTA({
  attractionName,
  productUrl,
  onAffiliateClick,
}: {
  attractionName: string;
  productUrl?: string | null;
  onAffiliateClick: () => void;
}) {
  if (!productUrl) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-700 shadow-lg"
      data-testid="sticky-booking-cta"
    >
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Ready to experience {attractionName}?
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Book now for the best availability
            </p>
          </div>
          <a
            href={productUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={onAffiliateClick}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-[#6443F4] hover:bg-[#5539d4] text-white font-semibold px-8 py-3.5 rounded-full shadow-lg shadow-[#6443F4]/25 transition-all duration-300 hover:shadow-xl hover:shadow-[#6443F4]/30 hover:scale-[1.02] active:scale-[0.98]"
            data-testid="button-sticky-book"
          >
            <Ticket className="w-5 h-5" />
            Book Tickets Now
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}

export default function AttractionDetail() {
  const { localePath } = useLocale();
  const params = useParams<{ destination?: string; city?: string; slug: string }>();

  const destination = params.destination || params.city || "";
  const slug = params.slug || "";

  const apiEndpoint = `/api/public/${destination}/attractions/${slug}`;

  const { data, isLoading, error } = useQuery<AttractionResponse>({
    queryKey: ["/api/public/attractions", destination, slug],
    queryFn: async () => {
      const response = await fetch(apiEndpoint);
      if (!response.ok) {
        throw new Error("Attraction not found");
      }
      return response.json();
    },
    enabled: !!destination && !!slug,
  });

  if (isLoading) {
    return (
      <>
        <PublicNav />
        <AttractionDetailSkeleton />
        <PublicFooter />
      </>
    );
  }

  if (error || !data?.attraction) {
    return (
      <AttractionError
        message={
          error instanceof Error
            ? error.message
            : "The attraction you're looking for doesn't exist or has been removed."
        }
      />
    );
  }

  const attraction = data.attraction;
  const relatedAttractions = data.relatedAttractions || [];
  const title = attraction.h1Title || attraction.title;
  const metaTitle = attraction.metaTitle || `${title} Tickets 2026: Best Time & Tips | TRAVI`;

  const trackAffiliateClick = async () => {
    try {
      await fetch("/api/affiliate/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attractionId: attraction.id,
          destination: destination,
        }),
      });
    } catch (e) {
      // Silent fail - don't block user
    }
  };
  const metaDescription =
    attraction.metaDescription ||
    `Visit ${title} in ${attraction.cityName}. Book skip-the-line tickets, get insider tips, and plan your visit for 2026. Reserve now with TRAVI.`;

  const tiqetsImages = (attraction.tiqetsImages as TiqetsImage[]) || [];
  const heroImage =
    tiqetsImages[0]?.extra_large ||
    tiqetsImages[0]?.large ||
    tiqetsImages[0]?.medium ||
    "/cards/dubai.webp";

  const canonicalUrl = `https://travi.world/${destination.toLowerCase()}/attractions/${slug}`;

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://travi.world" },
      {
        "@type": "ListItem",
        position: 2,
        name: "Attractions",
        item: "https://travi.world/attractions",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: attraction.cityName,
        item: `https://travi.world/destinations/${destination.toLowerCase()}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: `${attraction.cityName} Attractions`,
        item: `https://travi.world/attractions/list/${destination.toLowerCase()}`,
      },
      { "@type": "ListItem", position: 5, name: title },
    ],
  };

  const touristAttractionSchema = {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: title,
    description: attraction.description || attraction.tiqetsDescription || metaDescription,
    url: canonicalUrl,
    image: heroImage,
    address: {
      "@type": "PostalAddress",
      addressLocality: attraction.cityName,
      streetAddress: attraction.venueAddress || undefined,
    },
    geo:
      attraction.latitude && attraction.longitude
        ? {
            "@type": "GeoCoordinates",
            latitude: parseFloat(attraction.latitude),
            longitude: parseFloat(attraction.longitude),
          }
        : undefined,
    aggregateRating: attraction.tiqetsRating
      ? {
          "@type": "AggregateRating",
          ratingValue: parseFloat(attraction.tiqetsRating),
          reviewCount: attraction.tiqetsReviewCount || 100,
        }
      : undefined,
  };

  const faqItems = (attraction.faqs as FAQItem[] | null) || [];
  const faqPageSchema =
    faqItems.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqItems.map(faq => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer,
            },
          })),
        }
      : null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: heroAnimationStyles }} />
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:image" content={heroImage} />
        <meta property="og:type" content="place" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content="TRAVI" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@traviworld" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="twitter:image" content={heroImage} />
        <link rel="canonical" href={canonicalUrl} />
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(touristAttractionSchema)}</script>
        {faqPageSchema && (
          <script type="application/ld+json">{JSON.stringify(faqPageSchema)}</script>
        )}
      </Helmet>

      <PublicNav />

      <main className="min-h-screen pb-24 bg-background">
        <HeroSection
          attraction={attraction}
          heroImage={heroImage}
          destination={destination}
          onAffiliateClick={trackAffiliateClick}
          localePath={localePath}
        />

        {/* Top CTA - Explore More Attractions */}
        <div className="container mx-auto px-4 md:px-6 lg:px-8 py-6">
          <Link
            href={localePath(`/attractions/list/${destination.toLowerCase()}`)}
            className="inline-flex items-center gap-2 text-[#6443F4] hover:text-[#5539d4] font-medium transition-colors group"
            data-testid="link-explore-more-top"
          >
            <Search className="w-4 h-4" />
            <span>Explore more attractions in {attraction.cityName || destination}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="relative">
          <SubtleSkyBackground />

          <LivePricingWidget attraction={attraction} onAffiliateClick={trackAffiliateClick} />

          <IntroductionSection attraction={attraction} />

          <QuickFactsBox attraction={attraction} />

          <TicketOptionsTable attraction={attraction} onAffiliateClick={trackAffiliateClick} />

          <WhatToExpectSection attraction={attraction} />

          <VisitorTipsSection attraction={attraction} />

          <HowToGetThereSection attraction={attraction} />

          <FAQSection faqs={attraction.faqs as FAQItem[] | null} attractionName={title} />

          <RelatedAttractionsSection
            attractions={relatedAttractions}
            currentCity={destination}
            localePath={localePath}
          />

          {/* Bottom CTA - Explore More Attractions */}
          <div className="container mx-auto px-4 md:px-6 lg:px-8 py-12 text-center">
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Looking for more things to do in {attraction.cityName || destination}?
            </p>
            <Link
              href={localePath(`/attractions/list/${destination.toLowerCase()}`)}
              data-testid="link-explore-more-bottom"
            >
              <Button
                variant="outline"
                size="lg"
                className="rounded-full border-2 border-[#6443F4] text-[#6443F4]"
              >
                <Search className="w-5 h-5 mr-2" />
                Explore more attractions in {attraction.cityName || destination}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <StickyBookingCTA
        attractionName={title}
        productUrl={attraction.productUrl}
        onAffiliateClick={trackAffiliateClick}
      />
      <div className="h-20" />
      <PublicFooter />
    </>
  );
}
