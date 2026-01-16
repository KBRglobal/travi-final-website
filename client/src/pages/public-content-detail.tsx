import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { ArrowLeft, Star, MapPin, Clock, Share2, Heart, Menu, X, Building2, ExternalLink } from "lucide-react";
import type { ContentWithRelations, ContentBlock } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/logo";
import { useState, useEffect } from "react";
import { useDocumentMeta } from "@/hooks/use-document-meta";
import { ContentBlocksRenderer } from "@/components/content-blocks-renderer";

function generateJsonLd(contents: ContentWithRelations, imageUrl: string): object | null {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const pageUrl = `${baseUrl}/${contents.slug}`;
  
  const schemas: object[] = [];
  
  // Base schema based on contents type
  if (contents.type === 'hotel' && contents.hotel) {
    const hotelSchema: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Hotel",
      name: contents.title,
      url: pageUrl,
      image: imageUrl,
    };
    
    if (contents.metaDescription) {
      hotelSchema.description = contents.metaDescription;
    }
    if (contents.hotel.location) {
      hotelSchema.address = {
        "@type": "PostalAddress",
        addressLocality: contents.hotel.location,
        addressCountry: "UAE"
      };
    }
    if (contents.hotel.starRating) {
      hotelSchema.starRating = {
        "@type": "Rating",
        ratingValue: contents.hotel.starRating,
        bestRating: 5
      };
    }
    if (contents.hotel.amenities && contents.hotel.amenities.length > 0) {
      hotelSchema.amenityFeature = contents.hotel.amenities.map(amenity => ({
        "@type": "LocationFeatureSpecification",
        name: amenity
      }));
    }
    if (contents.hotel.numberOfRooms) {
      hotelSchema.numberOfRooms = contents.hotel.numberOfRooms;
    }
    
    schemas.push(hotelSchema);
  } else if (contents.type === 'attraction' && contents.attraction) {
    const attractionSchema: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "TouristAttraction",
      name: contents.title,
      url: pageUrl,
      image: imageUrl,
    };
    
    if (contents.metaDescription) {
      attractionSchema.description = contents.metaDescription;
    }
    if (contents.attraction.location) {
      attractionSchema.address = {
        "@type": "PostalAddress",
        addressLocality: contents.attraction.location,
        addressCountry: "UAE"
      };
    }
    if (contents.attraction.targetAudience && contents.attraction.targetAudience.length > 0) {
      attractionSchema.touristType = contents.attraction.targetAudience;
    }
    
    schemas.push(attractionSchema);
  } else if (contents.type === 'article') {
    const articleSchema: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: contents.title,
      url: pageUrl,
      image: imageUrl,
      author: {
        "@type": "Organization",
        name: "Dubai Travel"
      },
      publisher: {
        "@type": "Organization",
        name: "Dubai Travel"
      }
    };
    
    if (contents.metaDescription) {
      articleSchema.description = contents.metaDescription;
    }
    if (contents.createdAt) {
      articleSchema.datePublished = contents.createdAt;
    }
    if (contents.updatedAt) {
      articleSchema.dateModified = contents.updatedAt;
    }
    
    schemas.push(articleSchema);
  }
  
  // Add FAQPage schema if there are FAQ blocks
  const blocks = contents.blocks as ContentBlock[] | undefined;
  if (blocks && Array.isArray(blocks) && blocks.length > 0) {
    const faqBlocks = blocks.filter(block => block.type === 'faq');
    
    if (faqBlocks.length > 0) {
      const faqItems: { question: string; answer: string }[] = [];
      faqBlocks.forEach(block => {
        const data = block.data as { items?: { question: string; answer: string }[] } | undefined;
        if (data?.items && Array.isArray(data.items)) {
          data.items.forEach((item) => {
            if (item.question && item.answer) {
              faqItems.push(item);
            }
          });
        }
      });
      
      if (faqItems.length > 0) {
        schemas.push({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqItems.map(item => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer
            }
          }))
        });
      }
    }
  }
  
  // Return null if no schemas, array if multiple, single object if one
  if (schemas.length === 0) return null;
  return schemas.length === 1 ? schemas[0] : schemas;
}

const defaultPlaceholderImages = [
  "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&h=600&fit=crop",
  "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1200&h=600&fit=crop",
];

export default function PublicContentDetail() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const { data: contents, isLoading } = useQuery<ContentWithRelations>({
    queryKey: ["/api/contents/slug", slug],
    enabled: !!slug,
  });

  const contentType = contents?.type || 'attraction';
  
  function getBackLink(type: string) {
    switch (type) {
      case 'dining': return '/dining';
      case 'district': return '/districts';
      case 'transport': return '/transport';
      default: return `/${type}s`;
    }
  }
  
  function getTypeLabel(type: string) {
    switch (type) {
      case 'dining': return 'Dining';
      case 'district': return 'Districts';
      case 'transport': return 'Transport';
      case 'hotel': return 'Hotels';
      case 'attraction': return 'Attractions';
      case 'article': return 'News';
      default: return type;
    }
  }
  
  const backLink = getBackLink(contentType);
  const imageUrl = contents?.heroImage || defaultPlaceholderImages[0];

  useDocumentMeta({
    title: contents ? `${contents.title} | Dubai Travel` : "Content | Dubai Travel",
    description: contents?.metaDescription || "Discover amazing destinations and experiences in Dubai.",
    ogTitle: contents?.title || undefined,
    ogDescription: contents?.metaDescription || undefined,
    ogImage: imageUrl,
    ogType: "article",
  });

  // Inject JSON-LD structured data into document head
  useEffect(() => {
    if (!contents) return;
    
    const jsonLd = generateJsonLd(contents, imageUrl);
    
    // Remove existing script if present
    const existingScript = document.getElementById('json-ld-schema');
    if (existingScript) {
      existingScript.remove();
    }
    
    // Only add script if we have valid JSON-LD data
    if (jsonLd) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = 'json-ld-schema';
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
    
    return () => {
      const scriptToRemove = document.getElementById('json-ld-schema');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [contents, imageUrl]);

  const navLinks = [
    { href: "/hotels", label: "Hotels", type: "hotel" },
    { href: "/attractions", label: "Attractions", type: "attraction" },
    { href: "/dining", label: "Dining", type: "dining" },
    { href: "/districts", label: "Districts", type: "district" },
    { href: "/transport", label: "Transport", type: "transport" },
    { href: "/articles", label: "News", type: "article" },
  ];

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen">
        <a 
          href="#main-contents" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none"
        >
          Skip to main contents
        </a>
        <header>
          <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b" aria-label="Main navigation">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <Logo variant="primary" height={28} />
              </div>
            </div>
          </nav>
        </header>
        <main id="main-contents" className="max-w-4xl mx-auto px-4 py-16">
          <div className="animate-pulse" aria-hidden="true">
            <div className="h-8 w-32 bg-muted rounded mb-6" />
            <div className="aspect-[2/1] bg-muted rounded-2xl mb-8" />
            <div className="h-10 w-3/4 bg-muted rounded mb-4" />
            <div className="h-6 w-full bg-muted rounded mb-2" />
            <div className="h-6 w-2/3 bg-muted rounded" />
          </div>
          <p className="sr-only" aria-live="polite">Loading contents details...</p>
        </main>
      </div>
    );
  }

  if (!contents) {
    return (
      <div className="bg-background min-h-screen">
        <a 
          href="#main-contents" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none"
        >
          Skip to main contents
        </a>
        <header>
          <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b" aria-label="Main navigation">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <Logo variant="primary" height={28} />
                <div className="hidden md:flex items-center gap-8">
                  <Link href="/hotels" className="text-foreground/80 hover:text-primary font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md px-2 py-1">Hotels</Link>
                  <Link href="/attractions" className="text-foreground/80 hover:text-primary font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md px-2 py-1">Attractions</Link>
                  <Link href="/articles" className="text-foreground/80 hover:text-primary font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md px-2 py-1">News</Link>
                </div>
              </div>
            </div>
          </nav>
        </header>
        <main id="main-contents" className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="font-heading text-2xl font-bold text-foreground mb-4">Content Not Found</h1>
          <p className="text-muted-foreground mb-8">The contents you're looking for doesn't exist or has been removed.</p>
          <Link href="/">
            <Button data-testid="button-back-home">Back to Home</Button>
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <a 
        href="#main-contents" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none"
      >
        Skip to main contents
      </a>
      
      <header>
        <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b" aria-label="Main navigation">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 gap-4">
              <Logo variant="primary" height={28} />
              
              <div className="hidden md:flex items-center gap-6">
                {navLinks.map((link) => (
                  <Link 
                    key={link.href}
                    href={link.href} 
                    className={`font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md px-2 py-1 ${contentType === link.type ? 'text-primary' : 'text-foreground/80 hover:text-primary'}`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                  aria-expanded={mobileMenuOpen}
                  aria-controls="mobile-menu"
                  data-testid="button-mobile-menu"
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
                </Button>
              </div>
            </div>
          </div>
          
          {mobileMenuOpen && (
            <div 
              id="mobile-menu" 
              className="md:hidden border-t bg-background"
              role="navigation"
              aria-label="Mobile navigation"
            >
              <div className="px-4 py-4 space-y-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`block px-3 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${contentType === link.type ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>
      </header>

      <main id="main-contents">
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link 
            href={backLink} 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md px-2 py-1"
            data-testid="link-back"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Back to {getTypeLabel(contentType)}</span>
          </Link>

          <div className="aspect-[2/1] rounded-2xl overflow-hidden mb-8">
            <img 
              src={imageUrl} 
              alt={contents.heroImageAlt || contents.title}
              className="w-full h-full object-cover"
              loading="lazy"
              width={1200}
              height={600}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Badge variant="secondary" className="capitalize">
              {contents.type}
            </Badge>
            {contents.hotel?.starRating && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                {Array.from({ length: contents.hotel.starRating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                ))}
                <span className="sr-only">{contents.hotel.starRating} star hotel</span>
              </span>
            )}
            {(contents.attraction?.location || contents.hotel?.location) && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" aria-hidden="true" />
                <span>{contents.attraction?.location || contents.hotel?.location}</span>
              </span>
            )}
            {contents.attraction?.duration && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" aria-hidden="true" />
                <span>{contents.attraction.duration}</span>
                <span className="sr-only">typical visit duration</span>
              </span>
            )}
            {contents.hotel?.numberOfRooms && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Building2 className="w-4 h-4" aria-hidden="true" />
                <span>{contents.hotel.numberOfRooms} rooms</span>
              </span>
            )}
          </div>

          <h1 id="contents-title" className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {contents.title}
          </h1>

          <p className="text-lg text-muted-foreground mb-8">
            {contents.metaDescription || "Discover this amazing destination in Dubai."}
          </p>

          <div className="flex flex-wrap items-center gap-3 mb-12">
            {contents.attraction?.primaryCta && (
              <Button className="bg-primary hover:bg-primary/90" data-testid="button-primary-cta">
                {contents.attraction.primaryCta}
              </Button>
            )}
            {contents.hotel?.primaryCta && (
              <Button className="bg-primary hover:bg-primary/90" data-testid="button-primary-cta">
                {contents.hotel.primaryCta}
              </Button>
            )}
            {!contents.attraction?.primaryCta && !contents.hotel?.primaryCta && (
              <Button className="bg-primary hover:bg-primary/90" data-testid="button-book-now">
                Book Now
              </Button>
            )}
            <Button variant="outline" size="icon" aria-label="Save to favorites" data-testid="button-favorite">
              <Heart className="w-5 h-5" aria-hidden="true" />
            </Button>
            <Button variant="outline" size="icon" aria-label="Share this page" data-testid="button-share">
              <Share2 className="w-5 h-5" aria-hidden="true" />
            </Button>
          </div>

          {contents.blocks && contents.blocks.length > 0 ? (
            <ContentBlocksRenderer blocks={contents.blocks} />
          ) : (
            <div className="space-y-8">
              <Card className="p-6">
                <h2 className="font-heading text-xl font-semibold mb-4">About</h2>
                <p className="text-muted-foreground">
                  {contents.metaDescription || "Experience the best of Dubai with this amazing destination."}
                </p>
              </Card>
            </div>
          )}

          {contents.hotel?.amenities && contents.hotel.amenities.length > 0 && (
            <section className="mt-8" aria-labelledby="amenities-heading">
              <Card className="p-6">
                <h2 id="amenities-heading" className="font-heading text-xl font-semibold mb-4">Amenities</h2>
                <div className="flex flex-wrap gap-2">
                  {contents.hotel.amenities.map((amenity, index) => (
                    <Badge key={index} variant="outline">{amenity}</Badge>
                  ))}
                </div>
              </Card>
            </section>
          )}

          {contents.attraction?.ticketInfo && contents.attraction.ticketInfo.length > 0 && (
            <section className="mt-8" aria-labelledby="tickets-heading">
              <Card className="p-6">
                <h2 id="tickets-heading" className="font-heading text-xl font-semibold mb-4">Ticket Information</h2>
                <div className="space-y-3">
                  {contents.attraction.ticketInfo.map((ticket, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                      <span className="font-medium">{ticket.type}</span>
                      <span className="text-muted-foreground">{ticket.description}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </section>
          )}

          {contents.affiliateLinks && contents.affiliateLinks.length > 0 && (
            <section className="mt-8" aria-labelledby="booking-heading">
              <Card className="p-6">
                <h2 id="booking-heading" className="font-heading text-xl font-semibold mb-4">Book Now</h2>
                <div className="space-y-3">
                  {contents.affiliateLinks.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                      data-testid={`affiliate-link-${link.id}`}
                    >
                      <div>
                        <div className="font-medium">{link.anchor}</div>
                        {link.provider && (
                          <div className="text-sm text-muted-foreground">via {link.provider}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <ExternalLink className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                      </div>
                    </a>
                  ))}
                </div>
              </Card>
            </section>
          )}

          {(contents.attraction?.location || contents.hotel?.location) && (
            <section className="mt-8" aria-labelledby="location-heading">
              <Card className="p-6">
                <h2 id="location-heading" className="font-heading text-xl font-semibold mb-4">Location</h2>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-5 h-5 text-primary" aria-hidden="true" />
                  <span>{contents.attraction?.location || contents.hotel?.location}</span>
                </div>
              </Card>
            </section>
          )}
        </article>
      </main>

      <footer className="py-8 border-t mt-16" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 flex-wrap">
            <Logo variant="primary" height={28} />
            <nav aria-label="Footer navigation">
              <div className="flex items-center gap-6 text-muted-foreground text-sm flex-wrap">
                <Link href="/hotels" className="hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md px-1">Hotels</Link>
                <Link href="/attractions" className="hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md px-1">Attractions</Link>
                <Link href="/articles" className="hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md px-1">News</Link>
              </div>
            </nav>
            <div className="flex items-center gap-4 text-muted-foreground text-sm flex-wrap">
              <Link href="/privacy" className="hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md px-1">Privacy</Link>
              <Link href="/terms" className="hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md px-1">Terms</Link>
              <span>2026 Travi</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
