import { PageContainer } from "@/components/public-layout";
import { SEOHead } from "@/components/seo-head";
import { useLocale } from "@/lib/i18n/LocaleRouter";
import { Helmet } from "react-helmet-async";
import mascotImg from "@assets/Mascot_for_Light_Background_1765497703861.png";
import { Heart, Globe, Users, Compass, Star, Languages, RefreshCw, Wifi, Map } from "lucide-react";

export default function PublicAbout() {
  const { t } = useLocale();

  const tagline = "Your friendly multilingual travel guide. We help travelers discover destinations worldwide with comprehensive guides, local insights, and real-time recommendations in 17 languages.";

  const values = [
    {
      icon: Heart,
      title: "Passion for Travel",
      description: "We're passionate about sharing the magic of destinations worldwide with travelers from every corner of the globe."
    },
    {
      icon: Globe,
      title: "Local Expertise",
      description: "Our team includes locals and travel experts who know every hidden gem and authentic experience."
    },
    {
      icon: Users,
      title: "Community First",
      description: "We build connections between travelers and vibrant local communities around the world."
    },
    {
      icon: Compass,
      title: "Authentic Experiences",
      description: "We focus on authentic, memorable experiences beyond the typical tourist trail."
    }
  ];

  const platformStats = [
    { value: "17", label: "Languages", icon: Languages },
    { value: "Daily", label: "Updates", icon: RefreshCw },
    { value: "24/7", label: "Access", icon: Wifi },
    { value: "Global", label: "Coverage", icon: Map }
  ];

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Travi",
    "description": "Travel guide platform providing destination information, attraction guides, and trip planning resources in 17 languages",
    "url": "https://travi.world",
    "logo": "https://travi.world/travi-logo.png",
    "foundingDate": "2024",
    "knowsAbout": [
      "Travel Guides",
      "Destination Information", 
      "Tourist Attractions",
      "Hotels and Accommodations",
      "Trip Planning",
      "Local Experiences"
    ],
    "areaServed": "Worldwide",
    "inLanguage": [
      "en", "ar", "hi", "zh", "ru", "ur", "fr", "de", 
      "fa", "bn", "fil", "es", "tr", "it", "ja", "ko", "he"
    ]
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is Travi?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": tagline
        }
      },
      {
        "@type": "Question", 
        "name": "How many languages does Travi support?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Travi supports 17 languages including English, Arabic, Hindi, Chinese, Russian, French, German, Spanish, Turkish, Italian, Japanese, Korean, Hebrew, Urdu, Persian, Bengali, and Filipino."
        }
      },
      {
        "@type": "Question",
        "name": "What makes Travi different from other travel guides?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Travi combines passion for travel with local expertise, prioritizes community connections, and focuses on authentic experiences beyond the typical tourist trail. Our platform is available in 17 languages with daily updates and 24/7 access."
        }
      }
    ]
  };

  return (
    <PageContainer>
      <SEOHead
        title="About Travi - Your Multilingual Travel Guide | 17 Languages"
        description="Learn about Travi - your friendly multilingual travel guide. Discover destinations worldwide with comprehensive guides in 17 languages."
        keywords={["about travi", "multilingual travel guide", "travel platform", "destination guides", "17 languages"]}
      />

      {/* Organization Schema - in head */}
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(organizationSchema)}
        </script>
      </Helmet>

      {/* Hero Section */}
      <section className="relative py-16 md:py-24 bg-gradient-to-br from-[#6443F4]/8 via-background to-[#6443F4]/8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
            <div className="lg:w-3/5 text-center lg:text-left">
              <h1 
                className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight"
                data-testid="about-h1"
              >
                About Travi - Your Multilingual Travel Guide
              </h1>
              
              {/* Prominent intro paragraph with tagline */}
              <p className="text-lg sm:text-xl text-muted-foreground mb-6 leading-relaxed">
                <strong className="text-foreground">{tagline}</strong>
              </p>
              
              <p className="text-muted-foreground leading-relaxed text-base sm:text-lg">
                Travi was created with a simple mission: to make exploring the world accessible, enjoyable, and unforgettable for every traveler. Whether you're planning your first international trip or you're a seasoned globetrotter, we're here to help you make the most of your journey.
              </p>
            </div>
            <div className="lg:w-2/5 flex justify-center lg:justify-end">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[#6443F4]/20 to-[#6443F4]/20 rounded-full blur-3xl" />
                <img 
                  src={mascotImg} 
                  alt="Travi travel guide mascot helping travelers discover destinations"
                  className="relative w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96 object-contain drop-shadow-2xl"
                  data-testid="about-mascot-image"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Stats Section */}
      <section className="py-12 bg-card border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {platformStats.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <div 
                  key={index}
                  className="text-center p-4 sm:p-6"
                  data-value={stat.value}
                  data-label={stat.label}
                  data-testid={`stat-${stat.label.toLowerCase()}`}
                >
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-[#6443F4]/10 to-[#6443F4]/10 flex items-center justify-center">
                    <IconComponent className="w-6 h-6 text-[#6443F4]" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Hidden accessible table for screen readers and SEO */}
          <details className="mt-8 text-sm text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground transition-colors">
              Platform Features Overview
            </summary>
            <table className="mt-4 w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 pr-4">Feature</th>
                  <th className="py-2">Value</th>
                </tr>
              </thead>
              <tbody>
                {platformStats.map((stat, index) => (
                  <tr key={index} className="border-b border-border/50">
                    <td className="py-2 pr-4">{stat.label}</td>
                    <td className="py-2">{stat.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
              {t('about.missionTitle') || "Our Mission"}
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              We believe that every traveler deserves access to the best information, tips, and insights about destinations worldwide. Our mission is to be your trusted companion, providing comprehensive guides, honest recommendations, and up-to-date information to help you create lasting memories wherever you go.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => {
              const IconComponent = value.icon;
              return (
                <div 
                  key={index} 
                  className="text-center p-6 rounded-xl bg-card border border-border transition-all duration-300 hover:shadow-md hover:border-[#6443F4]/20"
                  data-testid={`value-card-${index}`}
                >
                  <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#6443F4]/10 to-[#6443F4]/10 flex items-center justify-center">
                    <IconComponent className="w-7 h-7 text-[#6443F4]" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {value.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {value.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Travel With Us Section */}
      <section className="py-16 md:py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
            <div className="lg:w-1/2">
              <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-[#6443F4]/10">
                <Globe className="w-4 h-4 text-[#6443F4]" />
                <span className="text-sm font-medium text-[#6443F4]">
                  Global Destinations
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">
                Discover the World Your Way
              </h2>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                From vibrant cities to serene beaches, from historic landmarks to modern marvels, Travi covers destinations across the globe. Our platform provides detailed information about attractions, hotels, dining, and local experiences in 17 languages.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Whether you're exploring Dubai's futuristic skyline, wandering through Paris's charming streets, or discovering Tokyo's unique blend of tradition and innovation, Travi is your trusted companion every step of the way.
              </p>
            </div>
            <div className="lg:w-1/2 w-full">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { stat: "15+", label: "Destinations" },
                  { stat: "17", label: "Languages" },
                  { stat: "1000+", label: "Attractions" },
                  { stat: "24/7", label: "Available" }
                ].map((item, index) => (
                  <div 
                    key={index}
                    className="p-5 sm:p-6 rounded-xl bg-background border border-border text-center transition-all duration-300 hover:border-[#6443F4]/20"
                    data-value={item.stat}
                    data-label={item.label}
                  >
                    <div className="text-2xl sm:text-3xl font-bold text-[#6443F4] mb-1">
                      {item.stat}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Last updated - before CTA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-right">
        <p className="last-updated">
          <small>Last updated: December 2024</small>
        </p>
      </div>

      {/* CTA Section */}
      <section className="py-16 md:py-20 bg-gradient-to-r from-[#6443F4] to-[#6443F4]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-14 h-14 mx-auto mb-6 rounded-full bg-white/20 flex items-center justify-center">
            <Star className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Start Your Adventure
          </h2>
          <p className="text-white/90 text-base sm:text-lg mb-6 max-w-2xl mx-auto">
            Ready to explore? Browse our destination guides, discover attractions, and plan your perfect trip with Travi.
          </p>
        </div>
      </section>

      {/* FAQPage Schema - placed before closing body */}
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
      </Helmet>
    </PageContainer>
  );
}
