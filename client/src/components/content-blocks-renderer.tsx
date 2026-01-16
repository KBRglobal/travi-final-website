import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { sanitizeHTML } from "@/lib/sanitize";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Link } from "wouter";
import { Star, Lightbulb, Check, Info, ExternalLink, Quote, Calendar, ArrowRight } from "lucide-react";
import type { ContentBlock } from "@shared/schema";

interface HeroBlockData {
  title?: string;
  subtitle?: string;
  image?: string;
  ctaText?: string;
  ctaLink?: string;
}

interface TextBlockData {
  heading?: string;
  contents?: string;
}

interface ImageBlockData {
  url?: string;
  alt?: string;
  caption?: string;
}

interface GalleryBlockData {
  images?: { url: string; alt?: string }[];
}

interface FaqBlockData {
  title?: string;
  questions?: { question: string; answer: string }[];
  faqs?: { question: string; answer: string }[]; // RSS format uses 'faqs'
  // Editor format: single Q&A
  question?: string;
  answer?: string;
}

interface CtaBlockData {
  title?: string;
  description?: string;
  contents?: string; // RSS format uses 'contents' instead of 'description'
  buttonText?: string;
  buttonLink?: string;
}

interface InfoGridBlockData {
  items?: { icon?: string; title: string; value: string }[];
}

interface HighlightsBlockData {
  title?: string;
  items?: string[];
  contents?: string; // Editor format: newline-separated string
}

interface RoomCardsBlockData {
  rooms?: {
    image?: string;
    title: string;
    features?: string[];
    price?: string;
    ctaText?: string;
    ctaLink?: string;
  }[];
}

interface TipsBlockData {
  title?: string;
  tips?: string[];
  items?: string[]; // Editor uses 'items' instead of 'tips'
  contents?: string; // RSS format: newline-separated string
}

interface QuoteBlockData {
  text?: string;
  author?: string;
  source?: string;
}

interface HeadingBlockData {
  level?: "h2" | "h3";
  contents?: string;
}

interface DividerBlockData {
  style?: "line" | "dots" | "space";
}

interface BannerBlockData {
  title?: string;
  subtitle?: string;
  image?: string;
  overlayColor?: string;
  ctaText?: string;
  ctaLink?: string;
}

interface RecommendationsBlockData {
  title?: string;
  subtitle?: string;
  items?: {
    image?: string;
    title: string;
    description?: string;
    ctaText?: string;
    ctaLink?: string;
    price?: string;
  }[];
}

interface RelatedArticlesBlockData {
  title?: string;
  subtitle?: string;
  articles?: {
    image?: string;
    title: string;
    description?: string;
    date?: string;
    slug?: string;
    category?: string;
  }[];
}

function HeroBlock({ data }: { data: HeroBlockData }) {
  if (!data.image && !data.title) return null;
  
  return (
    <div className="relative aspect-[2/1] rounded-2xl overflow-hidden mb-8">
      {data.image && (
        <img
          src={data.image}
          alt={data.title || "Hero image"}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      )}
      {(data.title || data.subtitle) && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex flex-col justify-end p-6 sm:p-8">
          {data.title && (
            <h2 className="font-heading text-2xl sm:text-4xl font-bold text-white mb-2">
              {data.title}
            </h2>
          )}
          {data.subtitle && (
            <p className="text-white/90 text-lg max-w-2xl">{data.subtitle}</p>
          )}
          {data.ctaText && data.ctaLink && (
            <div className="mt-4">
              <Link href={data.ctaLink}>
                <Button className="bg-primary hover:bg-primary/90" data-testid="button-hero-cta">
                  {data.ctaText}
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TextBlock({ data }: { data: TextBlockData }) {
  if (!data.contents) return null;
  
  return (
    <Card className="p-6" data-testid="block-text">
      {data.heading && (
        <h2 className="font-heading text-xl font-semibold mb-4">{data.heading}</h2>
      )}
      <div 
        className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground"
        dangerouslySetInnerHTML={{ __html: sanitizeHTML(data.contents || "") }}
      />
    </Card>
  );
}

function HeadingBlock({ data }: { data: HeadingBlockData }) {
  if (!data.contents) return null;
  
  const level = data.level || "h2";
  
  if (level === "h3") {
    return (
      <h3 className="font-heading text-xl font-semibold mt-6 mb-3" data-testid="block-heading">
        {data.contents}
      </h3>
    );
  }
  
  return (
    <h2 className="font-heading text-2xl font-bold mt-8 mb-4" data-testid="block-heading">
      {data.contents}
    </h2>
  );
}

function DividerBlock({ data }: { data: DividerBlockData }) {
  const style = data.style || "line";
  
  if (style === "space") {
    return <div className="h-8" data-testid="block-divider" />;
  }
  
  if (style === "dots") {
    return (
      <div className="flex items-center justify-center gap-2 py-4" data-testid="block-divider">
        <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
        <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
        <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
      </div>
    );
  }
  
  return <hr className="border-t border-border my-6" data-testid="block-divider" />;
}

function ImageBlock({ data }: { data: ImageBlockData }) {
  if (!data.url) return null;
  
  return (
    <figure className="rounded-xl overflow-hidden" data-testid="block-image">
      <img
        src={data.url}
        alt={data.alt || "Content image"}
        className="w-full h-auto object-cover"
        loading="lazy"
      />
      {data.caption && (
        <figcaption className="text-sm text-muted-foreground mt-2 text-center">
          {data.caption}
        </figcaption>
      )}
    </figure>
  );
}

function GalleryBlock({ data }: { data: GalleryBlockData }) {
  if (!data.images?.length) return null;
  
  return (
    <div 
      className="grid grid-cols-2 sm:grid-cols-3 gap-4"
      role="list"
      aria-label="Image gallery"
      data-testid="block-gallery"
    >
      {data.images.map((image, index) => (
        <div 
          key={index}
          className="aspect-square rounded-xl overflow-hidden"
          role="listitem"
        >
          <img
            src={image.url}
            alt={image.alt || `Gallery image ${index + 1}`}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
}

function FaqBlock({ data }: { data: FaqBlockData }) {
  // Support all formats: questions array, faqs array (RSS), or single Q&A
  const faqItems = data.questions?.length 
    ? data.questions 
    : data.faqs?.length 
      ? data.faqs 
      : null;
  
  if (faqItems) {
    return (
      <Card className="p-6" data-testid="block-faq">
        <h2 className="font-heading text-xl font-semibold mb-4">
          {data.title || "Frequently Asked Questions"}
        </h2>
        <Accordion type="single" collapsible className="w-full">
          {faqItems.map((item, index) => (
            <AccordionItem key={index} value={`faq-${index}`}>
              <AccordionTrigger className="text-left font-medium">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Card>
    );
  }
  
  // Editor format: single Q&A block
  if (data.question && data.answer) {
    return (
      <Card className="p-4" data-testid="block-faq">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="faq-single">
            <AccordionTrigger className="text-left font-medium">
              {data.question}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              {data.answer}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>
    );
  }
  
  return null;
}

function CtaBlock({ data }: { data: CtaBlockData }) {
  if (!data.title && !data.buttonText) return null;
  
  // Support both 'description' and 'contents' (RSS format)
  const descText = data.description || data.contents;
  
  return (
    <Card 
      className="p-8 bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20"
      data-testid="block-cta"
    >
      <div className="text-center max-w-2xl mx-auto">
        {data.title && (
          <h2 className="font-heading text-2xl font-bold mb-3">{data.title}</h2>
        )}
        {descText && (
          <p className="text-muted-foreground mb-6">{descText}</p>
        )}
        {data.buttonText && (
          <Link href={data.buttonLink || "#"}>
            <Button className="bg-primary hover:bg-primary/90" data-testid="button-cta-action">
              {data.buttonText}
              <ExternalLink className="w-4 h-4 ml-2" aria-hidden="true" />
            </Button>
          </Link>
        )}
      </div>
    </Card>
  );
}

function InfoGridBlock({ data }: { data: InfoGridBlockData }) {
  if (!data.items?.length) return null;
  
  return (
    <Card className="p-6" data-testid="block-info-grid">
      <h2 className="font-heading text-xl font-semibold mb-4">Essential Information</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {data.items.map((item, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Info className="w-5 h-5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{item.title}</div>
              <div className="font-medium">{item.value}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function HighlightsBlock({ data }: { data: HighlightsBlockData }) {
  // Support both formats: array (items) or newline-separated string (contents)
  const items = data.items?.length 
    ? data.items 
    : data.contents 
      ? data.contents.split('\n').filter(item => item.trim())
      : [];
  
  if (!items.length) return null;
  
  return (
    <Card className="p-6" data-testid="block-highlights">
      {data.title && (
        <h2 className="font-heading text-xl font-semibold mb-4">{data.title}</h2>
      )}
      <ul className="space-y-3" role="list">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-3" role="listitem">
            <Star className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
            <span className="text-muted-foreground">{item}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function RoomCardsBlock({ data }: { data: RoomCardsBlockData }) {
  if (!data.rooms?.length) return null;
  
  return (
    <div className="space-y-4" data-testid="block-room-cards">
      <h2 className="font-heading text-xl font-semibold">Room Types</h2>
      <div className="grid gap-6 sm:grid-cols-2">
        {data.rooms.map((room, index) => (
          <Card key={index} className="overflow-hidden">
            {room.image && (
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={room.image}
                  alt={room.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            )}
            <div className="p-4">
              <h3 className="font-heading font-semibold text-lg mb-2">{room.title}</h3>
              {room.features && room.features.length > 0 && (
                <ul className="space-y-1 mb-4" role="list">
                  {room.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-2 text-sm text-muted-foreground" role="listitem">
                      <Check className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex items-center justify-between gap-4">
                {room.price && (
                  <div>
                    <span className="text-sm text-muted-foreground">From</span>
                    <div className="font-bold text-lg">{room.price}</div>
                  </div>
                )}
                {room.ctaText && (
                  <Link href={room.ctaLink || "#"}>
                    <Button size="sm" data-testid={`button-room-cta-${index}`}>
                      {room.ctaText}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function TipsBlock({ data }: { data: TipsBlockData }) {
  if (!data.tips?.length) return null;

  return (
    <Card className="p-6 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800" data-testid="block-tips">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
          <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h2 className="font-heading text-lg font-semibold mb-3">
            {data.title || "Pro Tips"}
          </h2>
          <ul className="space-y-2" role="list">
            {data.tips.map((tip: string, index: number) => (
              <li key={index} className="text-muted-foreground text-sm" role="listitem">
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}

function QuoteBlock({ data }: { data: QuoteBlockData }) {
  if (!data.text) return null;

  return (
    <Card className="p-8 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-l-amber-400 border-amber-200 dark:border-amber-800" data-testid="block-quote">
      <div className="relative">
        <Quote className="absolute -top-2 -left-2 w-8 h-8 text-amber-400/50" aria-hidden="true" />
        <blockquote className="pl-6">
          <p className="text-lg md:text-xl font-medium text-foreground italic leading-relaxed">
            "{data.text}"
          </p>
          {(data.author || data.source) && (
            <footer className="mt-4 text-sm text-muted-foreground">
              {data.author && <span className="font-semibold">{data.author}</span>}
              {data.author && data.source && <span className="mx-2">—</span>}
              {data.source && <cite>{data.source}</cite>}
            </footer>
          )}
        </blockquote>
      </div>
    </Card>
  );
}

function BannerBlock({ data }: { data: BannerBlockData }) {
  if (!data.title && !data.image) return null;

  return (
    <div
      className="relative w-full min-h-[300px] md:min-h-[400px] rounded-2xl overflow-hidden my-8"
      data-testid="block-banner"
    >
      {data.image && (
        <img
          src={data.image}
          alt={data.title || "Banner image"}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      )}
      <div
        className={`absolute inset-0 ${data.overlayColor || 'bg-gradient-to-r from-primary/80 via-primary/60 to-transparent'}`}
      />
      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center p-8">
        {data.subtitle && (
          <p className="text-white/90 text-sm md:text-base uppercase tracking-widest mb-2">
            {data.subtitle}
          </p>
        )}
        {data.title && (
          <h2 className="font-heading text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            {data.title}
          </h2>
        )}
        {data.ctaText && data.ctaLink && (
          <Link href={data.ctaLink}>
            <Button size="lg" variant="secondary" className="font-semibold" data-testid="button-banner-cta">
              {data.ctaText}
              <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

function RecommendationsBlock({ data }: { data: RecommendationsBlockData }) {
  if (!data.items?.length) return null;

  return (
    <div className="py-12 bg-amber-50 dark:bg-amber-950/10 -mx-4 px-4 md:-mx-8 md:px-8 rounded-2xl" data-testid="block-recommendations">
      <div className="text-center mb-8">
        {data.title && (
          <h2 className="font-heading text-2xl md:text-3xl font-bold mb-2">
            <span className="text-primary">Travi</span>{" "}
            <span className="font-script text-amber-500 italic">{data.title.replace('Travi ', '') || 'Recommends'}</span>
          </h2>
        )}
        {data.subtitle && (
          <p className="text-muted-foreground max-w-2xl mx-auto">{data.subtitle}</p>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {data.items.map((item, index) => (
          <Card key={index} className="overflow-hidden group hover:shadow-lg transition-shadow">
            {item.image && (
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
            )}
            <div className="p-4">
              <h3 className="font-heading font-semibold text-lg mb-2 line-clamp-2">{item.title}</h3>
              {item.description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{item.description}</p>
              )}
              {item.price && (
                <p className="text-sm font-semibold text-primary mb-3">{item.price}</p>
              )}
              {item.ctaText && (
                <Link href={item.ctaLink || "#"}>
                  <Button variant="outline" size="sm" className="w-full" data-testid={`button-recommendation-${index}`}>
                    {item.ctaText}
                  </Button>
                </Link>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function RelatedArticlesBlock({ data }: { data: RelatedArticlesBlockData }) {
  if (!data.articles?.length) return null;

  return (
    <div className="py-8" data-testid="block-related-articles">
      <div className="text-center mb-8">
        {data.title && (
          <h2 className="font-heading text-2xl md:text-3xl font-bold mb-2">
            {data.title.includes('Related') ? (
              <>Related <span className="font-script text-primary italic">Articles</span></>
            ) : (
              data.title
            )}
          </h2>
        )}
        {data.subtitle && (
          <p className="text-muted-foreground max-w-2xl mx-auto">{data.subtitle}</p>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {data.articles.map((article, index) => (
          <Link
            key={index}
            href={article.slug ? `/articles/${article.slug}` : "#"}
            className="group"
          >
            <Card className="overflow-hidden h-full hover:shadow-lg transition-shadow">
              <div className="relative aspect-[4/3] overflow-hidden">
                {article.image ? (
                  <img
                    src={article.image}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <span className="text-4xl font-bold text-primary/30">
                      {article.title.charAt(0)}
                    </span>
                  </div>
                )}
                {article.date && (
                  <div className="absolute top-3 left-3 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                    <Calendar className="w-3 h-3" aria-hidden="true" />
                    {article.date}
                  </div>
                )}
              </div>
              <div className="p-4">
                {article.category && (
                  <span className="text-xs font-medium text-primary uppercase tracking-wide">
                    {article.category}
                  </span>
                )}
                <h3 className="font-heading font-semibold text-base mt-1 mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                  {article.title}
                </h3>
                {article.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{article.description}</p>
                )}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

interface ContentBlocksRendererProps {
  blocks: ContentBlock[];
}

export function ContentBlocksRenderer({ blocks }: ContentBlocksRendererProps) {
  if (!blocks || blocks.length === 0) {
    return null;
  }

  const sortedBlocks = [...blocks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div className="space-y-8" data-testid="contents-blocks">
      {sortedBlocks.map((block) => {
        switch (block.type) {
          case "hero":
            return <HeroBlock key={block.id} data={block.data as HeroBlockData} />;
          case "text":
            return <TextBlock key={block.id} data={block.data as TextBlockData} />;
          case "heading":
            return <HeadingBlock key={block.id} data={block.data as HeadingBlockData} />;
          case "divider":
            return <DividerBlock key={block.id} data={block.data as DividerBlockData} />;
          case "image":
            return <ImageBlock key={block.id} data={block.data as ImageBlockData} />;
          case "gallery":
            return <GalleryBlock key={block.id} data={block.data as GalleryBlockData} />;
          case "faq":
            return <FaqBlock key={block.id} data={block.data as FaqBlockData} />;
          case "cta":
            return <CtaBlock key={block.id} data={block.data as CtaBlockData} />;
          case "info_grid":
            return <InfoGridBlock key={block.id} data={block.data as InfoGridBlockData} />;
          case "highlights":
            return <HighlightsBlock key={block.id} data={block.data as HighlightsBlockData} />;
          case "room_cards":
            return <RoomCardsBlock key={block.id} data={block.data as RoomCardsBlockData} />;
          case "tips":
            return <TipsBlock key={block.id} data={block.data as TipsBlockData} />;
          case "quote":
            return <QuoteBlock key={block.id} data={block.data as QuoteBlockData} />;
          case "banner":
            return <BannerBlock key={block.id} data={block.data as BannerBlockData} />;
          case "recommendations":
            return <RecommendationsBlock key={block.id} data={block.data as RecommendationsBlockData} />;
          case "related_articles":
            return <RelatedArticlesBlock key={block.id} data={block.data as RelatedArticlesBlockData} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
