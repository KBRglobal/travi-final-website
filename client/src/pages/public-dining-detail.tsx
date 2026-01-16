import { useQuery } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import { 
  ArrowLeft, Star, MapPin, Clock, Phone, Globe, 
  Utensils, ChevronDown, Check, Calendar, CreditCard,
  Sparkles, Users
} from "lucide-react";
import type { ContentWithRelations, FaqItem, HighlightItem, MenuHighlightItem, EssentialInfoItem } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useDocumentMeta } from "@/hooks/use-document-meta";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const defaultHeroImage = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920&h=1080&fit=crop";

function generateJsonLd(contents: ContentWithRelations, imageUrl: string): object | null {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const pageUrl = `${baseUrl}/dining/${contents.slug}`;
  
  if (!contents.dining) return null;
  
  const restaurantSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: contents.title,
    url: pageUrl,
    image: imageUrl,
    servesCuisine: contents.dining.cuisineType || "International",
    priceRange: contents.dining.priceRange || "$$$",
  };
  
  if (contents.metaDescription) {
    restaurantSchema.description = contents.metaDescription;
  }
  if (contents.dining.location) {
    restaurantSchema.address = {
      "@type": "PostalAddress",
      addressLocality: contents.dining.location,
      addressRegion: "Dubai",
      addressCountry: "UAE"
    };
  }
  
  const schemas: object[] = [restaurantSchema];
  
  const faqItems = contents.dining.faq || [];
  if (faqItems.length > 0) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems.map((item: FaqItem) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer
        }
      }))
    });
  }
  
  return schemas.length === 1 ? schemas[0] : schemas;
}

function MenuCard({ item }: { item: MenuHighlightItem }) {
  return (
    <Card className="p-4 hover-elevate">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <h4 className="font-semibold text-sm mb-1">{item.name}</h4>
          <p className="text-xs text-muted-foreground">{item.description}</p>
        </div>
        <span className="font-bold text-primary whitespace-nowrap">{item.price}</span>
      </div>
    </Card>
  );
}

function HighlightCard({ highlight }: { highlight: HighlightItem }) {
  return (
    <div className="text-center p-4">
      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
        <Sparkles className="w-6 h-6 text-primary" />
      </div>
      <h4 className="font-semibold text-sm mb-1">{highlight.title}</h4>
      <p className="text-xs text-muted-foreground line-clamp-2">{highlight.description}</p>
    </div>
  );
}

function EssentialInfoCard({ info }: { info: EssentialInfoItem }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Clock className="w-4 h-4 text-primary" />
      </div>
      <div>
        <span className="text-xs text-muted-foreground">{info.label}</span>
        <p className="font-medium text-sm">{info.value}</p>
      </div>
    </div>
  );
}

export default function PublicDiningDetail() {
  const [, params] = useRoute("/dining/:slug");
  const { slug = "" } = params ?? {};
  
  const { data: contents, isLoading } = useQuery<ContentWithRelations>({
    queryKey: [`/api/contents/slug/${slug}`],
    enabled: !!slug,
  });

  const dining = contents?.dining;
  const imageUrl = contents?.heroImage || defaultHeroImage;

  useDocumentMeta({
    title: contents ? `${contents.title} | Dubai Restaurants | Travi` : "Restaurant | Travi",
    description: contents?.metaDescription || "Discover exceptional dining in Dubai.",
    ogTitle: contents?.title || undefined,
    ogDescription: contents?.metaDescription || undefined,
    ogImage: imageUrl,
    ogType: "article",
  });

  useEffect(() => {
    if (!contents) return;
    
    const jsonLd = generateJsonLd(contents, imageUrl);
    const existingScript = document.getElementById('json-ld-schema');
    if (existingScript) existingScript.remove();
    
    if (jsonLd) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = 'json-ld-schema';
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
  }, [contents, imageUrl]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <PublicNav />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!contents || contents.type !== 'dining') {
    return (
      <div className="min-h-screen bg-background">
        <PublicNav />
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <h1 className="text-2xl font-bold mb-4">Restaurant Not Found</h1>
          <p className="text-muted-foreground mb-6">The restaurant you're looking for doesn't exist.</p>
          <Link href="/dining">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dining
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const highlights = dining?.highlights || [];
  const menuHighlights = dining?.menuHighlights || [];
  const essentialInfo = dining?.essentialInfo || [];
  const diningTips = dining?.diningTips || [];
  const faqItems = dining?.faq || [];
  const cuisineType = dining?.cuisineType || "International";
  const priceRange = dining?.priceRange || "$$$";
  const location = dining?.location || "Dubai, UAE";

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      {/* Hero Section */}
      <section className="relative min-h-[60vh] overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src={imageUrl}
            alt={contents.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>
        
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Badge variant="secondary" className="gap-1">
              <Utensils className="w-3 h-3" />
              {cuisineType}
            </Badge>
            <Badge variant="outline" className="bg-background/50 backdrop-blur-sm">
              {priceRange}
            </Badge>
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg">
            {contents.title}
          </h1>
          
          <div className="flex items-center justify-center gap-4 text-white/80">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {location}
            </span>
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              4.8
            </span>
          </div>
        </div>
      </section>

      <main className="relative z-20 -mt-8">
        {/* Restaurant Overview */}
        <section className="py-12 md:py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="text-primary font-medium text-sm">About</span>
                <h2 className="text-2xl md:text-3xl font-bold mt-1 mb-4">Restaurant Overview</h2>
                <p className="text-muted-foreground leading-relaxed">
                  {contents.metaDescription || `Experience exceptional cuisine at ${contents.title}, one of Dubai's premier dining destinations offering ${cuisineType.toLowerCase()} flavors in an unforgettable setting.`}
                </p>
              </div>
              
              <div className="rounded-xl overflow-hidden shadow-lg">
                <img 
                  src={dining?.photoGallery?.[0]?.image || imageUrl}
                  alt={`${contents.title} interior`}
                  className="w-full aspect-[4/3] object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Why Diners Love This Restaurant */}
        {highlights.length > 0 && (
          <section className="py-12 md:py-16 bg-muted/30">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-10">
                <span className="text-primary font-medium text-sm">Highlights</span>
                <h2 className="text-2xl md:text-3xl font-bold mt-1">Why Diners Love This Restaurant</h2>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {highlights.map((highlight: HighlightItem, i: number) => (
                  <Card key={i} className="bg-background">
                    <HighlightCard highlight={highlight} />
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Menu Highlights */}
        {menuHighlights.length > 0 && (
          <section className="py-12 md:py-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-10">
                <span className="text-primary font-medium text-sm">Culinary Delights</span>
                <h2 className="text-2xl md:text-3xl font-bold mt-1">Menu Highlights</h2>
                <p className="text-muted-foreground mt-2">Signature dishes you must try</p>
              </div>
              
              <div className="space-y-3">
                {menuHighlights.map((item: MenuHighlightItem, i: number) => (
                  <MenuCard key={i} item={item} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Essential Information */}
        {essentialInfo.length > 0 && (
          <section className="py-12 md:py-16 bg-muted/30">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-bold">Essential Information</h2>
              </div>
              
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {essentialInfo.map((info: EssentialInfoItem, i: number) => (
                  <EssentialInfoCard key={i} info={info} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Dining Tips */}
        {diningTips.length > 0 && (
          <section className="py-12 md:py-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <Card className="p-6 md:p-8 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-orange-500" />
                  Insider Tips
                </h3>
                <ul className="space-y-3">
                  {diningTips.map((tip: string, i: number) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{tip}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </section>
        )}

        {/* FAQ Section */}
        {faqItems.length > 0 && (
          <section className="py-12 md:py-16 bg-muted/30">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-bold">Frequently Asked Questions</h2>
                <p className="text-muted-foreground mt-2">Everything you need to know before your visit</p>
              </div>
              
              <Accordion type="single" collapsible className="space-y-2">
                {faqItems.map((faq: FaqItem, i: number) => (
                  <AccordionItem
                    key={i}
                    value={`faq-${i}`}
                    className="bg-background rounded-lg px-4 border"
                  >
                    <AccordionTrigger className="text-left text-sm font-medium hover:no-underline" data-testid={`faq-trigger-${i}`}>
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-sm">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="py-16 md:py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="relative overflow-hidden bg-gradient-to-r from-orange-500 to-rose-500 border-0 p-8 md:p-12 text-center">
              <div className="absolute inset-0 opacity-10">
                <img 
                  src={imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="relative z-10">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  Ready to Reserve Your Table?
                </h2>
                <p className="text-white/90 mb-6 max-w-xl mx-auto">
                  Experience the exceptional cuisine and ambiance at {contents.title}. Book now to secure your perfect dining experience.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button size="lg" className="bg-white text-orange-600 hover:bg-white/90" data-testid="button-reserve-now">
                    <Calendar className="w-4 h-4 mr-2" />
                    Make a Reservation
                  </Button>
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10" data-testid="button-contact-restaurant">
                    <Phone className="w-4 h-4 mr-2" />
                    Contact Restaurant
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Newsletter Section */}
        <section className="py-12 md:py-16 border-t">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h3 className="text-xl md:text-2xl font-bold mb-2">Subscribe to our Newsletter</h3>
            <p className="text-muted-foreground mb-6">Get the latest Dubai restaurant recommendations and exclusive offers</p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input 
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                data-testid="input-newsletter-email"
              />
              <Button data-testid="button-subscribe">Subscribe</Button>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
