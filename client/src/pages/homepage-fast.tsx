import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  MapPin, ArrowRight, Bed, Camera, Newspaper, BookOpen, 
  Compass, ChevronDown, Heart, Sparkles, Tent, Baby, Wallet, Backpack, Globe
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Helmet } from "react-helmet-async";
import { PublicFooter } from "@/components/public-footer";
import { PublicNav } from "@/components/public-nav";
import { SkipLink } from "@/components/ui/skip-link";
import { useIsDesktop } from "@/hooks/use-mobile";

const SITE_URL = "https://travi.world";
const SITE_NAME = "TRAVI World";
const CURRENT_YEAR = new Date().getFullYear();


const DESTINATIONS = [
  { id: "dubai", name: "Dubai", country: "UAE", slug: "/destinations/dubai", cardImage: "/cards/dubai.webp", cardImageAlt: "Dubai skyline with Burj Khalifa tower at sunset" },
  { id: "london", name: "London", country: "UK", slug: "/destinations/london", cardImage: "/cards/london.webp", cardImageAlt: "London Big Ben and Houses of Parliament" },
  { id: "paris", name: "Paris", country: "France", slug: "/destinations/paris", cardImage: "/cards/paris.webp", cardImageAlt: "Paris Eiffel Tower illuminated at sunset" },
  { id: "new-york", name: "New York", country: "USA", slug: "/destinations/new-york", cardImage: "/cards/new-york.webp", cardImageAlt: "New York Manhattan skyline with Empire State Building" },
  { id: "tokyo", name: "Tokyo", country: "Japan", slug: "/destinations/tokyo", cardImage: "/cards/tokyo.webp", cardImageAlt: "Tokyo Shibuya crossing neon lights at night" },
  { id: "singapore", name: "Singapore", country: "Singapore", slug: "/destinations/singapore", cardImage: "/cards/singapore.webp", cardImageAlt: "Singapore Marina Bay Sands and Gardens by the Bay" },
  { id: "barcelona", name: "Barcelona", country: "Spain", slug: "/destinations/barcelona", cardImage: "/cards/barcelona.webp", cardImageAlt: "Barcelona Sagrada Familia at golden hour" },
  { id: "bangkok", name: "Bangkok", country: "Thailand", slug: "/destinations/bangkok", cardImage: "/cards/bangkok.webp", cardImageAlt: "Bangkok Grand Palace temple at sunrise" },
];

// TODO: Re-enable hotels card after hotel content is added to CMS
const CATEGORY_CARDS = [
  // { id: 1, icon: Bed, title: "Hotels", subtitle: "Find your perfect stay", linkUrl: "/hotels", bgColor: "bg-blue-50 dark:bg-blue-950/30", iconBg: "bg-blue-500" }, // DISABLED - no hotel content in CMS yet
  { id: 2, icon: Camera, title: "Attractions", subtitle: "Must-see places", linkUrl: "/attractions", bgColor: "bg-amber-50 dark:bg-amber-950/30", iconBg: "bg-amber-500" },
  { id: 3, icon: Newspaper, title: "Travel News", subtitle: "Latest updates", linkUrl: "/news", bgColor: "bg-violet-50 dark:bg-violet-950/30", iconBg: "bg-violet-500" },
  { id: 4, icon: BookOpen, title: "Guides", subtitle: "Destination guides", linkUrl: "/guides", bgColor: "bg-indigo-50 dark:bg-indigo-950/30", iconBg: "bg-indigo-500" },
];

const EXPERIENCE_CATEGORIES = [
  { id: 1, name: "Luxury Travel", description: "Premium travel experiences and exclusive destinations", slug: "luxury", image: "/experiences/experiences-luxury-resort-infinity-pool.webp", imageAlt: "Luxury resort with infinity pool overlooking ocean", icon: Sparkles, href: "/travel-styles/luxury-travel-complete-guide" },
  { id: 2, name: "Adventure & Outdoors", description: "Thrilling outdoor experiences and adventures", slug: "adventure", image: "/experiences/experiences-adventure-hiker-mountain-trail-snowy-peaks.webp", imageAlt: "Hiker on mountain trail with snowy peaks", icon: Tent, href: "/travel-styles/adventure-outdoors-complete-guide" },
  { id: 3, name: "Family Travel", description: "Family-friendly destinations and activities", slug: "family", image: "/experiences/picnic-modern-architecture-outdoor-activity.webp", imageAlt: "Family enjoying outdoor picnic activity", icon: Baby, href: "/travel-styles/family-travel-complete-guide" },
  { id: 4, name: "Budget Travel", description: "Affordable travel options and destinations", slug: "budget", image: "/experiences/solo-travel-backpack-map-camera-desert-architecture.webp", imageAlt: "Budget travel backpack with map and camera", icon: Wallet, href: "/travel-styles/budget-travel-complete-guide" },
  { id: 5, name: "Honeymoon & Romance", description: "Romantic getaways and honeymoon destinations", slug: "romance", image: "/experiences/romantic-couple-beach-sunset-modern-architecture.webp", imageAlt: "Romantic couple watching sunset on beach", icon: Heart, href: "/travel-styles/honeymoon-romance-complete-guide" },
  { id: 6, name: "Solo Travel", description: "Perfect destinations for solo travelers", slug: "solo", image: "/experiences/solo-traveler-canoe-mountain-lake-archway-reflection.webp", imageAlt: "Solo traveler in canoe on peaceful mountain lake", icon: Backpack, href: "/travel-styles/solo-travel-complete-guide" },
];

const FAQ_ITEMS = [
  { q: "What is TRAVI World?", a: "TRAVI World is a comprehensive travel information platform covering 17 destinations worldwide with detailed guides for 3,000+ attractions, hotels, restaurants, and activities." },
  { q: "How many destinations does TRAVI cover?", a: "TRAVI World covers 17 major travel destinations including Dubai, Paris, Tokyo, New York, Barcelona, Singapore, London, Bangkok, Abu Dhabi, Amsterdam, Hong Kong, Istanbul, Las Vegas, Los Angeles, Miami, and Rome." },
  { q: "Is TRAVI World free to use?", a: "Yes, TRAVI World is completely free to use. Browse thousands of travel guides, attraction reviews, hotel recommendations, and restaurant suggestions at no cost." },
  { q: "How often is content updated?", a: "TRAVI World content is updated daily with the latest travel news, new attraction reviews, and updated information about hotels and restaurants across all 17 destinations." },
];

const ALL_DESTINATIONS_SEO = [
  { name: "Abu Dhabi", slug: "abu-dhabi", country: "UAE" },
  { name: "Amsterdam", slug: "amsterdam", country: "Netherlands" },
  { name: "Bangkok", slug: "bangkok", country: "Thailand" },
  { name: "Barcelona", slug: "barcelona", country: "Spain" },
  { name: "Dubai", slug: "dubai", country: "UAE" },
  { name: "Hong Kong", slug: "hong-kong", country: "China" },
  { name: "Istanbul", slug: "istanbul", country: "Turkey" },
  { name: "Las Vegas", slug: "las-vegas", country: "USA" },
  { name: "London", slug: "london", country: "UK" },
  { name: "Los Angeles", slug: "los-angeles", country: "USA" },
  { name: "Miami", slug: "miami", country: "USA" },
  { name: "New York", slug: "new-york", country: "USA" },
  { name: "Paris", slug: "paris", country: "France" },
  { name: "Rome", slug: "rome", country: "Italy" },
  { name: "Singapore", slug: "singapore", country: "Singapore" },
  { name: "Tokyo", slug: "tokyo", country: "Japan" },
];


function HeroSection() {
  const isDesktop = useIsDesktop();
  
  const websiteSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    "name": SITE_NAME,
    "url": SITE_URL,
    "description": "Comprehensive travel information for 17 destinations worldwide with detailed guides for 3,000+ attractions, hotels, restaurants, and activities.",
    "inLanguage": "en-US",
    "potentialAction": {
      "@type": "SearchAction",
      "target": { "@type": "EntryPoint", "urlTemplate": `${SITE_URL}/search?q={search_term_string}` },
      "query-input": "required name=search_term_string"
    }
  });

  const organizationSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    "name": SITE_NAME,
    "url": SITE_URL,
    "logo": { "@type": "ImageObject", "url": `${SITE_URL}/logo.png`, "width": 512, "height": 512 },
    "description": "Your trusted travel resource for 17 destinations worldwide.",
  });

  const faqSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": FAQ_ITEMS.map(faq => ({
      "@type": "Question",
      "name": faq.q,
      "acceptedAnswer": { "@type": "Answer", "text": faq.a }
    }))
  });

  return (
    <section 
      className="relative min-h-screen flex items-center pt-24 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden bg-white dark:bg-slate-950" 
      data-testid="hero-section"
      aria-label="Welcome to TRAVI World"
    >
      <Helmet>
        <title>{"TRAVI World - Travel Guides for Hotels, Attractions & Things to Do | " + CURRENT_YEAR}</title>
        <meta name="description" content="Your complete travel guide for 17 destinations worldwide. Expert information about hotels, attractions, restaurants, and activities for 3,000+ places." />
        <link rel="canonical" href={SITE_URL} />
        <meta property="og:title" content="TRAVI World - Travel Guides for Hotels, Attractions & Things to Do" />
        <meta property="og:description" content="Your complete travel guide for 17 destinations worldwide with 3,000+ attractions, hotels, and restaurants." />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={`${SITE_URL}/ogImage.jpg`} />
        {isDesktop && <link rel="preload" as="image" href="/hero/travi-world-mascot-globe-city-sunset.jpeg" />}
        <script type="application/ld+json">{websiteSchema}</script>
        <script type="application/ld+json">{organizationSchema}</script>
        <script type="application/ld+json">{faqSchema}</script>
      </Helmet>

      <div className="flex flex-col lg:flex-row items-center justify-between w-full max-w-7xl mx-auto gap-8 lg:gap-16">
        <div className="flex-1 max-w-xl text-center lg:text-left">
          <div className="mb-6">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white dark:bg-slate-800 shadow-md border border-[#6443F4]/20">
              <Globe className="w-4 h-4 text-[#6443F4]" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Your Gateway to <span className="text-[#6443F4]">World Adventures</span>
              </span>
            </div>
          </div>

          <h1 className="mb-6">
            <span 
              className="block text-4xl sm:text-5xl lg:text-6xl font-semibold text-slate-900 dark:text-white leading-tight" 
              style={{ fontFamily: "'Chillax', var(--font-sans)" }}
            >
              Your Trusted Travel
            </span>
            <span className="relative inline-block">
              <span 
                className="block text-4xl sm:text-5xl lg:text-6xl font-semibold leading-tight bg-gradient-to-r from-[#6443F4] via-[#8B5CF6] to-[#F24294] bg-clip-text text-transparent"
                style={{ fontFamily: "'Chillax', var(--font-sans)" }}
              >
                Resource
              </span>
              <span className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-[#6443F4] to-[#F24294] rounded-full" />
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 mb-8 leading-relaxed max-w-lg mx-auto lg:mx-0">
            Comprehensive travel information for <span className="font-medium text-slate-700 dark:text-slate-300">17 destinations</span> worldwide. 
            Discover detailed guides for <span className="font-medium text-slate-700 dark:text-slate-300">3,000+ attractions</span>.
          </p>

          <dl className="flex flex-wrap justify-center lg:justify-start items-center gap-6 mb-8">
            {[
              { num: '3,000+', label: 'ATTRACTIONS' },
              { num: '16', label: 'DESTINATIONS' },
              { num: '17+', label: 'LANGUAGES' }
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-6">
                <div className="text-center lg:text-left">
                  <dd className="text-2xl sm:text-3xl font-medium text-slate-900 dark:text-white" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                    {stat.num}
                  </dd>
                  <dt className="text-[10px] text-slate-400 tracking-wider mt-1">{stat.label}</dt>
                </div>
                {i < 2 && <div className="hidden sm:block w-px h-10 bg-slate-200 dark:bg-slate-700" />}
              </div>
            ))}
          </dl>

          <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
            <Link href="/destinations">
              <Button 
                className="rounded-full bg-gradient-to-r from-[#6443F4] to-[#8B5CF6] hover:opacity-90 text-white px-8 py-6 text-base font-semibold shadow-lg"
                data-testid="button-explore-destinations"
              >
                Explore Destinations
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/guides">
              <Button 
                variant="outline" 
                className="rounded-full bg-white hover:bg-slate-50 text-slate-700 px-8 py-6 text-base font-medium border-2 border-slate-200"
                data-testid="button-view-guides"
              >
                View Guides
              </Button>
            </Link>
          </div>
        </div>

        {isDesktop && (
          <div className="flex-1 w-full max-w-md lg:max-w-lg relative mt-8 lg:mt-0">
            <div className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl">
              <img 
                src="/hero/travi-world-mascot-globe-city-sunset.jpeg" 
                alt="TRAVI mascot with world landmarks - explore travel guides for Dubai, Paris, London, Rome and more" 
                title="TRAVI World - Travel Guides for Global Destinations"
                className="w-full h-full object-cover"
                width={600}
                height={750}
                loading="eager"
                decoding="async"
                {...{ fetchpriority: "high" } as React.ImgHTMLAttributes<HTMLImageElement>}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              
              <div className="absolute bottom-6 left-6 right-6">
                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-2xl p-4 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6443F4] to-[#8B5CF6] flex items-center justify-center flex-shrink-0">
                      <Globe className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">Worldwide</div>
                      <div className="text-sm text-slate-500">Explore the World</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <nav className="sr-only" aria-label="All destination guides">
        <h2>Travel Guides for All {ALL_DESTINATIONS_SEO.length} Destinations</h2>
        <ul>
          {ALL_DESTINATIONS_SEO.map((d) => (
            <li key={d.slug}>
              <a href={`/destinations/${d.slug}`}>{d.name}, {d.country} - Complete Travel Guide</a>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}

function DestinationsSection() {
  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-900" aria-label="Popular destinations">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-full mb-4">
            <MapPin className="w-4 h-4 text-[#6443F4]" />
            <span className="text-xs font-semibold tracking-wide text-[#6443F4] uppercase">Popular Destinations</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
            Explore the World
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Discover detailed travel guides for the world's most popular destinations
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {DESTINATIONS.map((dest) => (
            <Link key={dest.id} href={dest.slug}>
              <article className="group relative aspect-[3/4] rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300" data-testid={`card-destination-${dest.id}`}>
                <img 
                  src={dest.cardImage} 
                  alt={dest.cardImageAlt}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  width={300}
                  height={400}
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="font-bold text-white text-lg">{dest.name}</h3>
                  <p className="text-white/80 text-sm">{dest.country}</p>
                </div>
              </article>
            </Link>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link href="/destinations">
            <Button variant="outline" className="rounded-full px-8 py-5" data-testid="button-view-all-destinations">
              View All Destinations
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function CategoriesSection() {
  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8" aria-label="Browse travel categories">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-full mb-4">
            <Compass className="w-4 h-4 text-[#6443F4]" />
            <span className="text-xs font-semibold tracking-wide text-[#6443F4] uppercase">Browse Categories</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
            Explore by Type
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Find exactly what you're looking for with our curated travel categories
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {CATEGORY_CARDS.map((card) => {
            const IconComponent = card.icon;
            return (
              <Link key={card.id} href={card.linkUrl}>
                <article 
                  className={cn(
                    "group relative p-6 rounded-2xl transition-all duration-300 cursor-pointer h-full hover:shadow-xl hover:-translate-y-1",
                    card.bgColor
                  )}
                  data-testid={`card-category-${card.title.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110", card.iconBg)}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-1" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                    {card.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{card.subtitle}</p>
                  <div className="flex items-center gap-1 mt-3 text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-[#6443F4] transition-colors">
                    <span>Explore</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TravelStylesSection() {
  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-900" aria-label="Travel style categories">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10 sm:mb-14">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
            Find Your Perfect Travel Style
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Explore destinations by travel experience
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {EXPERIENCE_CATEGORIES.map((category) => {
            const IconComponent = category.icon;
            return (
              <article key={category.id}>
                <Link href={category.href} title={`${category.name} - Complete Travel Guide ${CURRENT_YEAR}`}>
                  <Card className="group overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white dark:bg-slate-800 h-full">
                    <div className="relative h-40 sm:h-48 overflow-hidden">
                      {category.image ? (
                        <img 
                          src={category.image} 
                          alt={category.imageAlt} 
                          title={category.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                          loading="lazy"
                          width={400}
                          height={250}
                          decoding="async"
                        />
                      ) : (
                        <div className="h-full bg-[#6443F4] flex items-center justify-center">
                          <IconComponent className="w-16 h-16 text-white/90 group-hover:scale-110 transition-transform" aria-hidden="true" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" aria-hidden="true" />
                      <div className="absolute bottom-4 left-4 right-4">
                        <h3 className="text-lg sm:text-xl font-bold text-white mb-1" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>{category.name}</h3>
                        <p className="text-sm text-white/80 line-clamp-2">{category.description}</p>
                      </div>
                    </div>
                    <CardContent className="p-4 flex items-center justify-between">
                      <span className="text-sm font-medium text-[#6443F4]">Explore guides</span>
                      <ArrowRight className="w-4 h-4 text-[#6443F4] group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                    </CardContent>
                  </Card>
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-950" aria-label="Frequently asked questions">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
            Frequently Asked Questions
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-400">
            Everything you need to know about TRAVI World
          </p>
        </div>

        <div className="space-y-4" itemScope itemType="https://schema.org/FAQPage">
          {FAQ_ITEMS.map((faq, index) => (
            <div 
              key={index}
              className="bg-slate-50 dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
              itemScope
              itemProp="mainEntity"
              itemType="https://schema.org/Question"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                aria-expanded={openIndex === index}
                data-testid={`button-faq-${index}`}
              >
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white pr-4" itemProp="name">
                  {faq.q}
                </h3>
                <ChevronDown className={cn("w-5 h-5 text-slate-500 flex-shrink-0 transition-transform duration-300", openIndex === index && "rotate-180")} />
              </button>
              <div
                className={cn("grid transition-all duration-300 ease-out", openIndex === index ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}
                itemScope
                itemProp="acceptedAnswer"
                itemType="https://schema.org/Answer"
              >
                <div className="overflow-hidden">
                  <p className="px-6 pb-5 text-slate-600 dark:text-slate-400 leading-relaxed" itemProp="text">
                    {faq.a}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function NewsletterSectionLite() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && email.includes("@")) {
      setIsSubmitted(true);
    }
  };

  return (
    <section className="relative py-20 overflow-hidden" data-testid="newsletter-section">
      <div className="absolute inset-0 z-0">
        <img
          src="/newsletter/home-newsletter-duck-surfing-wave.webp"
          alt=""
          className="w-full h-full object-cover"
          width={1920}
          height={600}
          loading="lazy"
          decoding="async"
        />
      </div>

      <div className="relative z-10 container mx-auto px-4">
        <div className="max-w-xl ml-0 md:ml-8 lg:ml-16">
          <div 
            className="rounded-3xl p-8 md:p-10"
            style={{
              background: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.4)",
            }}
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-sm font-semibold tracking-widest uppercase text-slate-700">Join the Adventure</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3 text-slate-800" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
              Get Travel Magic in Your Inbox
            </h2>

            <p className="text-center text-slate-600 mb-8">
              Weekly tips, hidden gems, and exclusive deals - no spam, just wanderlust.
            </p>

            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3" data-testid="newsletter-form">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 h-12 px-5 text-base rounded-full bg-white/80 border border-slate-200 focus:border-[#6443F4] focus:ring-2 focus:ring-[#6443F4]/20 outline-none transition-colors"
                  data-testid="input-newsletter-email"
                />
                <Button
                  type="submit"
                  className="h-12 px-8 rounded-full text-base font-semibold bg-[#6443F4] hover:bg-[#5539d4] text-white"
                  data-testid="button-newsletter-subscribe"
                >
                  Subscribe
                </Button>
              </form>
            ) : (
              <div className="text-center py-4" data-testid="newsletter-success">
                <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-500/20 text-green-700 font-medium">
                  You're subscribed! Check your inbox.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomepageFast() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <SkipLink />
      <PublicNav variant="default" />
      <main id="main-content">
        <HeroSection />
        <DestinationsSection />
        <CategoriesSection />
        <TravelStylesSection />
        <FAQSection />
        <NewsletterSectionLite />
      </main>
      <PublicFooter />
    </div>
  );
}
