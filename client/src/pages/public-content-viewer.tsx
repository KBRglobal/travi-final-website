import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Loader2, MapPin, Clock, Star, Users, DollarSign, Building, Utensils, Tag, ArrowLeft, Ticket, Phone, Globe, ChevronRight } from "lucide-react";
import { sanitizeHTML } from "@/lib/sanitize";
import posthog from "posthog-js";
import type { Content, Attraction, Hotel, Dining, District, Transport, Article, HighlightItem, RoomTypeItem, FaqItem, ContentCluster, ContentWithRelations } from "@shared/schema";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { ArticleHero, ArticleBody, TraviRecommends, RelatedArticles, NewsletterSignup } from "@/components/article";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type ContentWithExtensions = Content & {
  attraction?: Attraction | null;
  hotel?: Hotel | null;
  dining?: Dining | null;
  district?: District | null;
  transport?: Transport | null;
  article?: Article | null;
  cluster?: ContentCluster | null;
  clusterMembers?: Array<{ id: string; title: string; slug: string; type: string }>;
};

const contentTypeConfig: Record<string, { label: string; color: string; backHref: string; backLabel: string }> = {
  attraction: { label: "Attraction", color: "bg-travi-blue", backHref: "/attractions", backLabel: "Attractions" },
  hotel: { label: "Hotel", color: "bg-[#F4C542]", backHref: "/hotels", backLabel: "Hotels" },
  dining: { label: "Restaurant", color: "bg-[#6443F4]", backHref: "/dining", backLabel: "Dining" },
  district: { label: "District", color: "bg-[#6443F4]", backHref: "/districts", backLabel: "Districts" },
  transport: { label: "Transport", color: "bg-travi-green", backHref: "/transport", backLabel: "Transport" },
  article: { label: "Article", color: "bg-travi-green", backHref: "/articles", backLabel: "Articles" },
};

function generateContentSchema(contents: ContentWithExtensions, baseUrl: string) {
  const canonicalUrl = `${baseUrl}/${contents.type}/${contents.slug}`;
  
  const schema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": contents.type === "article" ? "Article" : 
             contents.type === "hotel" ? "Hotel" :
             contents.type === "attraction" ? "TouristAttraction" :
             contents.type === "dining" ? "Restaurant" : "WebPage",
    "name": contents.title,
    "description": contents.metaDescription || contents.title,
    "url": canonicalUrl,
  };

  if (contents.heroImage) {
    schema.image = contents.heroImage;
  }

  if (contents.publishedAt) {
    schema.datePublished = new Date(contents.publishedAt).toISOString();
  }

  if (contents.updatedAt) {
    schema.dateModified = new Date(contents.updatedAt).toISOString();
  }

  if (contents.cluster) {
    schema.isPartOf = {
      "@type": "CollectionPage",
      "name": contents.cluster.name,
    };
  }

  if (contents.clusterMembers && contents.clusterMembers.length > 0) {
    schema.hasPart = contents.clusterMembers.map(member => ({
      "@type": "WebPage",
      "name": member.title,
      "url": `${baseUrl}/${member.type}/${member.slug}`
    }));
  }

  return schema;
}

function ContentHero({ 
  contents, 
  config 
}: { 
  contents: ContentWithExtensions; 
  config: typeof contentTypeConfig[string];
}) {
  const heroImage = contents.heroImage || "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1920&h=800&fit=crop";
  
  return (
    <section className="relative w-full min-h-[60vh] lg:min-h-[70vh] flex flex-col" data-testid="contents-hero">
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt={contents.heroImageAlt || contents.title}
          className="w-full h-full object-cover"
          data-testid="contents-hero-image"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30" />

      <div className="relative z-10 flex-1 flex flex-col">
        <div className="p-6 lg:p-8 pt-24">
          <Link href={config.backHref}>
            <Button
              variant="ghost"
              size="sm"
              className="text-white/90 hover:text-white hover:bg-white/10 gap-2"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to {config.backLabel}
            </Button>
          </Link>
        </div>

        <div className="mt-auto p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Badge
                className={`${config.color} text-white border-0 px-3 py-1`}
                data-testid="contents-type-badge"
              >
                {config.label}
              </Badge>
            </div>

            <h1
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4"
              data-testid="contents-title"
            >
              {contents.title}
            </h1>

            {contents.metaDescription && (
              <p className="text-lg text-white/90 max-w-2xl" data-testid="contents-description">
                {contents.metaDescription}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function renderBlock(block: any, index: number) {
  const data = block.data || block;
  
  switch (block.type) {
    case "hero":
      return (
        <div key={index} className="relative h-[50vh] min-h-[400px] w-full overflow-hidden">
          {data.imageUrl && (
            <img
              src={data.imageUrl}
              alt={data.title || "Hero image"}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
            {data.title && <h1 className="text-4xl font-bold mb-2">{data.title}</h1>}
            {data.subtitle && <p className="text-xl opacity-90">{data.subtitle}</p>}
          </div>
        </div>
      );

    case "text":
      return (
        <div key={index} className="prose prose-lg max-w-none dark:prose-invert py-6">
          {data.title && <h2 className="text-2xl font-semibold mb-4">{data.title}</h2>}
          <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(data.contents || "") }} />
        </div>
      );

    case "image":
      return (
        <figure key={index} className="py-6">
          {data.url && (
            <img
              src={data.url}
              alt={data.alt || data.caption || "Image"}
              className="w-full rounded-lg"
            />
          )}
          {data.caption && (
            <figcaption className="text-center text-muted-foreground mt-2">
              {data.caption}
            </figcaption>
          )}
        </figure>
      );

    case "gallery":
      return (
        <div key={index} className="py-6">
          {data.title && <h2 className="text-2xl font-semibold mb-4">{data.title}</h2>}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {data.images?.map((img: any, i: number) => (
              <img
                key={i}
                src={img.url}
                alt={img.alt || `Gallery image ${i + 1}`}
                className="w-full h-48 object-cover rounded-lg"
              />
            ))}
          </div>
        </div>
      );

    case "faq":
      const faqs = data.faqs || data.items || [];
      return (
        <div key={index} className="py-6">
          {data.title && <h2 className="text-2xl font-semibold mb-4">{data.title}</h2>}
          <div className="space-y-4">
            {faqs.map((item: any, i: number) => (
              <Card key={i} className="p-4">
                <h3 className="font-medium mb-2">{item.question}</h3>
                <p className="text-muted-foreground">{item.answer}</p>
              </Card>
            ))}
          </div>
        </div>
      );

    case "cta":
      return (
        <div key={index} className="py-6 text-center bg-primary/10 rounded-lg p-8">
          {data.title && <h2 className="text-2xl font-semibold mb-2">{data.title}</h2>}
          {(data.description || data.contents) && <p className="text-muted-foreground mb-4">{data.description || data.contents}</p>}
          {data.buttonText && (data.buttonUrl || data.buttonLink) && (
            <Link href={data.buttonUrl || data.buttonLink}>
              <Button data-testid="cta-button">
                {data.buttonText}
              </Button>
            </Link>
          )}
        </div>
      );

    case "info_grid":
      return (
        <div key={index} className="py-6">
          {data.title && <h2 className="text-2xl font-semibold mb-4">{data.title}</h2>}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.items?.map((item: any, i: number) => (
              <Card key={i} className="text-center p-4">
                <div className="font-semibold">{item.label}</div>
                <div className="text-muted-foreground">{item.value}</div>
              </Card>
            ))}
          </div>
        </div>
      );

    case "highlights":
      const highlights = data.items || [];
      return (
        <div key={index} className="py-6">
          {data.title && <h2 className="text-2xl font-semibold mb-4">{data.title}</h2>}
          <ul className="space-y-2">
            {highlights.map((item: any, i: number) => (
              <li key={i} className="flex items-start gap-2">
                <Star className="h-5 w-5 text-[#F4C542] mt-0.5 flex-shrink-0" />
                <span>{typeof item === 'string' ? item : item.title || item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      );

    case "tips":
      const tips = data.tips || data.items || [];
      return (
        <div key={index} className="py-6 bg-muted/50 rounded-lg p-6">
          {data.title && <h2 className="text-2xl font-semibold mb-4">{data.title}</h2>}
          <ul className="space-y-2">
            {tips.map((item: any, i: number) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-travi-green font-bold">•</span>
                <span>{typeof item === 'string' ? item : item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      );

    default:
      return null;
  }
}

function AttractionMeta({ attraction }: { attraction: Attraction }) {
  const metaItems = [];
  
  if (attraction.location) {
    metaItems.push({ icon: MapPin, label: "Location", value: attraction.location });
  }
  if (attraction.duration) {
    metaItems.push({ icon: Clock, label: "Duration", value: attraction.duration });
  }
  if (attraction.targetAudience && attraction.targetAudience.length > 0) {
    metaItems.push({ icon: Users, label: "Best For", value: attraction.targetAudience.join(", ") });
  }
  if (attraction.priceFrom) {
    metaItems.push({ icon: DollarSign, label: "Price", value: `From AED ${attraction.priceFrom}` });
  }
  
  if (metaItems.length === 0) return null;

  return (
    <section className="bg-background border-b border-border sticky top-20 z-30" data-testid="attraction-meta">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-6 py-4 overflow-x-auto">
          {metaItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 whitespace-nowrap" data-testid={`meta-${idx}`}>
              <item.icon className="h-5 w-5 text-[#6443F4]" />
              <div>
                <span className="text-xs text-muted-foreground block">{item.label}</span>
                <span className="text-sm font-medium text-foreground">{item.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HotelMeta({ hotel }: { hotel: Hotel }) {
  const metaItems = [];
  
  if (hotel.starRating) {
    metaItems.push({ icon: Star, label: "Rating", value: `${hotel.starRating} Star` });
  }
  if (hotel.location) {
    metaItems.push({ icon: MapPin, label: "Location", value: hotel.location });
  }
  if (hotel.numberOfRooms) {
    metaItems.push({ icon: Building, label: "Rooms", value: `${hotel.numberOfRooms} Rooms` });
  }
  if (hotel.targetAudience && hotel.targetAudience.length > 0) {
    metaItems.push({ icon: Users, label: "Best For", value: hotel.targetAudience.join(", ") });
  }
  
  if (metaItems.length === 0) return null;

  return (
    <section className="bg-background border-b border-border sticky top-20 z-30" data-testid="hotel-meta">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-6 py-4 overflow-x-auto">
          {metaItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 whitespace-nowrap" data-testid={`meta-${idx}`}>
              <item.icon className="h-5 w-5 text-[#F4C542]" />
              <div>
                <span className="text-xs text-muted-foreground block">{item.label}</span>
                <span className="text-sm font-medium text-foreground">{item.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DiningMeta({ dining }: { dining: Dining }) {
  const metaItems = [];
  
  if (dining.cuisineType) {
    metaItems.push({ icon: Utensils, label: "Cuisine", value: dining.cuisineType });
  }
  if (dining.priceRange) {
    metaItems.push({ icon: DollarSign, label: "Price Range", value: dining.priceRange });
  }
  if (dining.location) {
    metaItems.push({ icon: MapPin, label: "Location", value: dining.location });
  }
  if (dining.quickInfoBar && dining.quickInfoBar.length > 0) {
    const hours = dining.quickInfoBar.find((item) => 
      item.label?.toLowerCase().includes("hour") || item.label?.toLowerCase().includes("time")
    );
    if (hours) {
      metaItems.push({ icon: Clock, label: "Hours", value: hours.value || "See hours" });
    }
  }
  
  if (metaItems.length === 0) return null;

  return (
    <section className="bg-background border-b border-border sticky top-20 z-30" data-testid="dining-meta">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-6 py-4 overflow-x-auto">
          {metaItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 whitespace-nowrap" data-testid={`meta-${idx}`}>
              <item.icon className="h-5 w-5 text-[#6443F4]" />
              <div>
                <span className="text-xs text-muted-foreground block">{item.label}</span>
                <span className="text-sm font-medium text-foreground">{item.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DistrictMeta({ district }: { district: District }) {
  const metaItems = [];
  
  const hotelCount = district.attractionsGrid?.filter((a) => a.type?.toLowerCase().includes("hotel")).length || 0;
  const restaurantCount = district.diningHighlights?.length || 0;
  const activityCount = district.thingsToDo?.length || 0;

  if (hotelCount > 0) {
    metaItems.push({ icon: Building, label: "Hotels", value: `${hotelCount} Hotel${hotelCount !== 1 ? 's' : ''}` });
  }
  if (restaurantCount > 0) {
    metaItems.push({ icon: Utensils, label: "Restaurants", value: `${restaurantCount} Restaurant${restaurantCount !== 1 ? 's' : ''}` });
  }
  if (activityCount > 0) {
    metaItems.push({ icon: Star, label: "Things to Do", value: `${activityCount} Thing${activityCount !== 1 ? 's' : ''}` });
  }
  if (district.targetAudience && district.targetAudience.length > 0) {
    metaItems.push({ icon: Tag, label: "Best For", value: district.targetAudience.slice(0, 2).join(", ") });
  }

  if (metaItems.length === 0) return null;

  return (
    <section className="bg-background border-b border-border sticky top-20 z-30" data-testid="district-meta">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-6 py-4 overflow-x-auto">
          {metaItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 whitespace-nowrap" data-testid={`meta-${idx}`}>
              <item.icon className="h-5 w-5 text-[#6443F4]" />
              <div>
                <span className="text-xs text-muted-foreground block">{item.label}</span>
                <span className="text-sm font-medium text-foreground">{item.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

interface AIWriter {
  id: string;
  name: string;
  avatar: string;
  shortBio: string;
}

function ArticleDetailView({ contents }: { contents: ContentWithExtensions }) {
  const { data: allArticles = [] } = useQuery<ContentWithRelations[]>({
    queryKey: ["/api/contents?type=article&status=published"],
  });

  const { data: recommendations = [] } = useQuery<ContentWithRelations[]>({
    queryKey: ["/api/contents?status=published&limit=8"],
  });

  const { data: writerData } = useQuery<{ writer: AIWriter }>({
    queryKey: ["/api/writers", contents.writerId],
    enabled: !!contents.writerId,
  });

  const writer = writerData?.writer;

  const heroImage = contents.heroImage || "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1920&h=800&fit=crop";
  const keywords = contents.secondaryKeywords || contents.lsiKeywords || [];
  const category = contents.article?.category;
  const blocks = contents.blocks || [];

  const currentKeywords = new Set([
    ...(contents.secondaryKeywords || []),
    ...(contents.lsiKeywords || []),
    ...(contents.primaryKeyword ? [contents.primaryKeyword] : []),
  ].map(k => k.toLowerCase()));

  const relatedArticles = allArticles
    .filter((a) => a.id !== contents.id)
    .map((a) => {
      const articleKeywords = [
        ...(a.secondaryKeywords || []),
        ...(a.lsiKeywords || []),
        ...(a.primaryKeyword ? [a.primaryKeyword] : []),
      ].map(k => k.toLowerCase());
      
      let score = 0;
      if (category && a.article?.category === category) {
        score += 3;
      }
      articleKeywords.forEach(k => {
        if (currentKeywords.has(k)) score += 1;
      });
      
      return {
        id: a.id,
        title: a.title,
        slug: a.slug,
        heroImage: a.heroImage,
        metaDescription: a.metaDescription,
        publishedAt: a.publishedAt,
        category: a.article?.category || undefined,
        score,
      };
    })
    .filter(a => a.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const recommendationItems = recommendations
    .filter((r) => r.id !== contents.id && r.type !== "article")
    .slice(0, 4)
    .map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      type: r.type,
      heroImage: r.heroImage,
      metaDescription: r.metaDescription,
    }));

  return (
    <div className="min-h-screen bg-background" data-testid="article-detail-view">
      <PublicNav variant="transparent" />

      <ArticleHero
        title={contents.title}
        heroImage={heroImage}
        heroImageAlt={contents.heroImageAlt || undefined}
        category={category || undefined}
        publishedAt={contents.publishedAt}
        keywords={keywords}
        writerName={writer?.name}
        writerAvatar={writer?.avatar}
      />

      <ArticleBody
        blocks={blocks}
        metaDescription={contents.metaDescription || undefined}
      />

      {recommendationItems.length > 0 && (
        <TraviRecommends recommendations={recommendationItems} />
      )}

      {relatedArticles.length > 0 && (
        <RelatedArticles
          articles={relatedArticles}
          currentArticleId={contents.id}
        />
      )}

      <NewsletterSignup />

      <PublicFooter />
    </div>
  );
}

function RelatedContentSection({ contents, type }: { contents: ContentWithExtensions; type: string }) {
  const { data: relatedContent = [] } = useQuery<ContentWithRelations[]>({
    queryKey: [`/api/contents?type=${type}&status=published&limit=5`],
  });

  const filtered = relatedContent.filter(c => c.slug !== contents.slug).slice(0, 4);
  
  if (filtered.length === 0) return null;

  const config = contentTypeConfig[type];

  return (
    <section className="py-16 bg-muted/30" data-testid="section-related">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-end justify-between mb-8 gap-4">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            More {config.backLabel}
          </h2>
          <Link href={config.backHref}>
            <Button variant="outline" className="rounded-full" data-testid="button-view-all">
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filtered.map((item) => (
            <Link key={item.id} href={`/${item.type}/${item.slug}`} data-testid={`related-card-${item.id}`}>
              <Card className="overflow-hidden hover-elevate cursor-pointer h-full">
                <div className="aspect-[4/3]">
                  <img
                    src={item.heroImage || "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400"}
                    alt={item.heroImageAlt || item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-foreground line-clamp-2 mb-2">{item.title}</h3>
                  {item.metaDescription && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{item.metaDescription}</p>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function PublicContentViewer() {
  const [, params] = useRoute("/:type/:slug");
  const slug = params?.slug;
  const type = params?.type;
  const trackedRef = useRef<string | null>(null);

  const { data: contents, isLoading, error } = useQuery<ContentWithExtensions>({
    queryKey: ["/api/contents/slug", slug],
    enabled: !!slug,
  });

  useEffect(() => {
    if (contents?.id && trackedRef.current !== contents.id) {
      trackedRef.current = contents.id;
      posthog.capture("content_view", {
        content_id: contents.id,
        content_type: contents.type,
        content_slug: contents.slug,
        content_title: contents.title,
      });
    }
  }, [contents?.id, contents?.type, contents?.slug, contents?.title]);

  useEffect(() => {
    if (contents?.slug && contents?.type) {
      const baseUrl = "https://dubaitravelguide.com";
      const canonicalUrl = `${baseUrl}/${contents.type}/${contents.slug}`;
      
      const existingCanonical = document.querySelector('link[rel="canonical"]');
      if (existingCanonical) {
        existingCanonical.remove();
      }
      
      const link = document.createElement("link");
      link.rel = "canonical";
      link.href = canonicalUrl;
      document.head.appendChild(link);

      const existingSchema = document.querySelector('script[type="application/ld+json"][data-contents-viewer-schema]');
      if (existingSchema) {
        existingSchema.remove();
      }

      const schema = generateContentSchema(contents, baseUrl);
      const schemaScript = document.createElement('script');
      schemaScript.type = 'application/ld+json';
      schemaScript.setAttribute('data-contents-viewer-schema', 'true');
      schemaScript.textContent = JSON.stringify(schema);
      document.head.appendChild(schemaScript);
      
      return () => {
        link.remove();
        const schemaToRemove = document.querySelector('script[type="application/ld+json"][data-contents-viewer-schema]');
        if (schemaToRemove) {
          schemaToRemove.remove();
        }
      };
    }
  }, [contents?.slug, contents?.type, contents?.cluster, contents?.clusterMembers]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" data-testid="loading-state">
        <Loader2 className="h-8 w-8 animate-spin text-[#6443F4]" />
      </div>
    );
  }

  if (error || !contents) {
    return (
      <div className="min-h-screen bg-background" data-testid="error-state">
        <PublicNav variant="default" />
        <div className="pt-32 text-center px-6">
          <h1 className="text-2xl font-bold mb-4">Content Not Found</h1>
          <p className="text-muted-foreground mb-6">The page you're looking for doesn't exist.</p>
          <Link href="/">
            <Button data-testid="button-go-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go to Homepage
            </Button>
          </Link>
        </div>
        <PublicFooter />
      </div>
    );
  }

  if (contents.type === "article") {
    return <ArticleDetailView contents={contents} />;
  }

  const config = contentTypeConfig[contents.type] || contentTypeConfig.attraction;
  const blocks = contents.blocks || [];
  const hasBlocks = blocks.length > 0;

  return (
    <div className="min-h-screen bg-background" data-testid="contents-viewer">
      <PublicNav variant="transparent" />

      <ContentHero contents={contents} config={config} />

      {contents.attraction && <AttractionMeta attraction={contents.attraction} />}
      {contents.hotel && <HotelMeta hotel={contents.hotel} />}
      {contents.dining && <DiningMeta dining={contents.dining} />}
      {contents.district && <DistrictMeta district={contents.district} />}

      <main className="bg-background">
        {hasBlocks ? (
          <div className="max-w-4xl mx-auto px-6 py-12">
            {blocks.map((block: any, index: number) => renderBlock(block, index))}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-6 py-12">
            {contents.attraction?.highlights && contents.attraction.highlights.length > 0 && (
              <section className="py-8" data-testid="section-highlights">
                <h2 className="text-2xl font-bold mb-6">Highlights</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {contents.attraction.highlights.map((item: HighlightItem, i: number) => (
                    <Card key={i} className="flex items-start gap-4 p-4" data-testid={`highlight-${i}`}>
                      {item.image && (
                        <img src={item.image} alt={item.title} className="w-20 h-20 object-cover rounded-lg flex-shrink-0" />
                      )}
                      <div>
                        <h3 className="font-semibold text-foreground">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {contents.attraction?.visitorTips && contents.attraction.visitorTips.length > 0 && (
              <section className="py-8" data-testid="section-tips">
                <h2 className="text-2xl font-bold mb-6">Visitor Tips</h2>
                <Card className="p-6 bg-travi-green/5 border-travi-green/20">
                  <ul className="space-y-3">
                    {contents.attraction.visitorTips.map((tip: string, i: number) => (
                      <li key={i} className="flex items-start gap-3" data-testid={`tip-${i}`}>
                        <Star className="w-5 h-5 text-travi-green flex-shrink-0 mt-0.5" />
                        <span className="text-foreground">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </section>
            )}

            {contents.attraction?.faq && contents.attraction.faq.length > 0 && (
              <section className="py-8" data-testid="section-faq">
                <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
                <div className="space-y-4">
                  {contents.attraction.faq.map((item: FaqItem, i: number) => (
                    <Card key={i} className="p-5" data-testid={`faq-${i}`}>
                      <h3 className="font-semibold text-foreground mb-2">{item.question}</h3>
                      <p className="text-muted-foreground">{item.answer}</p>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {contents.hotel?.amenities && contents.hotel.amenities.length > 0 && (
              <section className="py-8" data-testid="section-amenities">
                <h2 className="text-2xl font-bold mb-6">Amenities</h2>
                <div className="flex flex-wrap gap-2">
                  {contents.hotel.amenities.map((amenity: string, i: number) => (
                    <Badge key={i} variant="secondary" className="px-3 py-1" data-testid={`amenity-${i}`}>
                      {amenity}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            {contents.hotel?.roomTypes && contents.hotel.roomTypes.length > 0 && (
              <section className="py-8" data-testid="section-room-types">
                <h2 className="text-2xl font-bold mb-6">Room Types</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {contents.hotel.roomTypes.map((room: RoomTypeItem, i: number) => (
                    <Card key={i} className="overflow-hidden" data-testid={`room-${i}`}>
                      {room.image && (
                        <img src={room.image} alt={room.title} className="w-full h-40 object-cover" />
                      )}
                      <div className="p-4">
                        <h3 className="font-semibold text-foreground">{room.title}</h3>
                        {room.price && <p className="text-[#6443F4] font-bold mt-1">{room.price}</p>}
                        {room.features && room.features.length > 0 && (
                          <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                            {room.features.map((f: string, fi: number) => (
                              <li key={fi}>• {f}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {contents.hotel?.highlights && contents.hotel.highlights.length > 0 && (
              <section className="py-8" data-testid="section-hotel-highlights">
                <h2 className="text-2xl font-bold mb-6">Highlights</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {contents.hotel.highlights.map((item: HighlightItem, i: number) => (
                    <Card key={i} className="flex items-start gap-4 p-4" data-testid={`hotel-highlight-${i}`}>
                      {item.image && (
                        <img src={item.image} alt={item.title} className="w-20 h-20 object-cover rounded-lg flex-shrink-0" />
                      )}
                      <div>
                        <h3 className="font-semibold text-foreground">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      <RelatedContentSection contents={contents} type={contents.type} />

      <NewsletterSignup />

      <PublicFooter />
    </div>
  );
}
