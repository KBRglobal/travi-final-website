import { motion } from "framer-motion";
import { useLocale } from "@/lib/i18n/LocaleRouter";
import type { PageSection } from "@shared/schema";
import { sanitizeHTML } from "@/lib/sanitize";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Star,
  ArrowRight,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Quote,
  Mail,
  Sparkles,
  Zap,
  Shield,
  Heart,
  TrendingUp,
  Users,
  Award,
  MapPin,
  Maximize2,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { Lightbox, type LightboxImage } from "@/components/ui/lightbox";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

interface SectionRendererProps {
  section: PageSection;
  className?: string;
}

export function HeroSection({ section, className }: SectionRendererProps) {
  const { locale, isRTL } = useLocale();
  const title = locale === "he" ? section.titleHe || section.title : section.title;
  const subtitle = locale === "he" ? section.subtitleHe || section.subtitle : section.subtitle;
  const buttonText = locale === "he" ? section.buttonTextHe || section.buttonText : section.buttonText;

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeInUp}
      className={cn(
        "relative min-h-[500px] md:min-h-[600px] flex items-center justify-center overflow-hidden",
        className
      )}
      data-testid={`section-hero-${section.id}`}
    >
      {section.backgroundImage && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${section.backgroundImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
        </>
      )}
      {!section.backgroundImage && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/10" />
      )}

      <div className={cn("relative z-10 container mx-auto px-4 py-16 md:py-24", isRTL && "text-right")}>
        <motion.div
          variants={staggerContainer}
          className="max-w-3xl mx-auto text-center space-y-6"
        >
          {title && (
            <motion.h1
              variants={fadeInUp}
              className={cn(
                "text-4xl md:text-5xl lg:text-6xl font-bold leading-tight",
                section.backgroundImage ? "text-white" : "text-foreground"
              )}
            >
              {title}
            </motion.h1>
          )}
          {subtitle && (
            <motion.p
              variants={fadeInUp}
              className={cn(
                "text-lg md:text-xl max-w-2xl mx-auto",
                section.backgroundImage ? "text-white/90" : "text-muted-foreground"
              )}
            >
              {subtitle}
            </motion.p>
          )}
          {buttonText && section.buttonLink && (
            <motion.div variants={fadeInUp} className="pt-4">
              <Button size="lg" asChild>
                <a href={section.buttonLink}>
                  {buttonText}
                  {isRTL ? <ArrowLeft className="w-4 h-4 ms-2" /> : <ArrowRight className="w-4 h-4 ms-2" />}
                </a>
              </Button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.section>
  );
}

export function IntroTextSection({ section, className }: SectionRendererProps) {
  const { locale, isRTL } = useLocale();
  const title = locale === "he" ? section.titleHe || section.title : section.title;
  const description = locale === "he" ? section.descriptionHe || section.description : section.description;
  const images = section.images || [];

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeInUp}
      className={cn("py-16 md:py-20", className)}
      style={{ backgroundColor: section.backgroundColor || undefined }}
      data-testid={`section-intro-${section.id}`}
    >
      <div className="container mx-auto px-4">
        <div className={cn(
          "grid gap-8 md:gap-12 items-center",
          images.length > 0 ? "md:grid-cols-2" : "max-w-3xl mx-auto text-center"
        )}>
          <motion.div variants={staggerContainer} className={cn("space-y-4", isRTL && "text-right")}>
            {title && (
              <motion.h2
                variants={fadeInUp}
                className="text-3xl md:text-4xl font-bold text-foreground"
              >
                {title}
              </motion.h2>
            )}
            {description && (
              <motion.div
                variants={fadeInUp}
                className="text-muted-foreground text-lg leading-relaxed prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: sanitizeHTML(description || "") }}
              />
            )}
          </motion.div>
          {images.length > 0 && (
            <motion.div variants={fadeInUp} className="relative">
              <img
                src={images[0]}
                alt=""
                className="rounded-lg shadow-lg w-full object-cover aspect-[4/3]"
              />
            </motion.div>
          )}
        </div>
      </div>
    </motion.section>
  );
}

export function HighlightGridSection({ section, className }: SectionRendererProps) {
  const { locale, isRTL } = useLocale();
  const title = locale === "he" ? section.titleHe || section.title : section.title;
  const data = (locale === "he" ? section.dataHe || section.data : section.data) as {
    items?: Array<{ icon?: string; title?: string; description?: string }>;
  };
  const items = data?.items || [];

  const iconMap: Record<string, any> = {
    star: Star,
    check: Check,
    sparkles: Sparkles,
    zap: Zap,
    shield: Shield,
    heart: Heart,
    trending: TrendingUp,
    users: Users,
    award: Award,
    map: MapPin,
  };

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={staggerContainer}
      className={cn("py-16 md:py-20 bg-muted/30", className)}
      data-testid={`section-highlight-grid-${section.id}`}
    >
      <div className="container mx-auto px-4">
        {title && (
          <motion.h2
            variants={fadeInUp}
            className={cn("text-3xl md:text-4xl font-bold text-center mb-12", isRTL && "text-right")}
          >
            {title}
          </motion.h2>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((item, index) => {
            const IconComponent = iconMap[item.icon || "star"] || Star;
            return (
              <motion.div key={index} variants={fadeInUp}>
                <Card className="h-full hover-elevate">
                  <CardContent className={cn("pt-6 space-y-3", isRTL && "text-right")}>
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <IconComponent className="w-6 h-6 text-primary" />
                    </div>
                    {item.title && (
                      <h3 className="font-semibold text-lg">{item.title}</h3>
                    )}
                    {item.description && (
                      <p className="text-muted-foreground text-sm">{item.description}</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}

export function ContentGridSection({ section, className }: SectionRendererProps) {
  const { locale, isRTL } = useLocale();
  const title = locale === "he" ? section.titleHe || section.title : section.title;
  const data = (locale === "he" ? section.dataHe || section.data : section.data) as {
    items?: Array<{ image?: string; title?: string; description?: string; link?: string }>;
  };
  const items = data?.items || [];

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={staggerContainer}
      className={cn("py-16 md:py-20", className)}
      data-testid={`section-contents-grid-${section.id}`}
    >
      <div className="container mx-auto px-4">
        {title && (
          <motion.h2
            variants={fadeInUp}
            className={cn("text-3xl md:text-4xl font-bold text-center mb-12", isRTL && "text-right")}
          >
            {title}
          </motion.h2>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item, index) => (
            <motion.div key={index} variants={fadeInUp}>
              <Card className="h-full overflow-hidden group hover-elevate">
                {item.image && (
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.title || ""}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                )}
                <CardContent className={cn("pt-4 space-y-2", isRTL && "text-right")}>
                  {item.title && (
                    <h3 className="font-semibold text-lg">{item.title}</h3>
                  )}
                  {item.description && (
                    <p className="text-muted-foreground text-sm line-clamp-2">{item.description}</p>
                  )}
                  {item.link && (
                    <Button variant="ghost" size="sm" asChild className="mt-2">
                      <a href={item.link}>
                        {isRTL ? "קרא עוד" : "Read more"}
                        {isRTL ? <ArrowLeft className="w-3 h-3 ms-1" /> : <ArrowRight className="w-3 h-3 ms-1" />}
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

export function CTASection({ section, className }: SectionRendererProps) {
  const { locale, isRTL } = useLocale();
  const title = locale === "he" ? section.titleHe || section.title : section.title;
  const subtitle = locale === "he" ? section.subtitleHe || section.subtitle : section.subtitle;
  const buttonText = locale === "he" ? section.buttonTextHe || section.buttonText : section.buttonText;

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeInUp}
      className={cn(
        "py-16 md:py-24 relative overflow-hidden",
        className
      )}
      style={{ backgroundColor: section.backgroundColor || undefined }}
      data-testid={`section-cta-${section.id}`}
    >
      {section.backgroundImage && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${section.backgroundImage})` }}
          />
          <div className="absolute inset-0 bg-primary/80" />
        </>
      )}
      {!section.backgroundImage && (
        <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80" />
      )}

      <div className="container mx-auto px-4 relative z-10">
        <div className={cn("max-w-3xl mx-auto text-center space-y-6", isRTL && "text-right")}>
          {title && (
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-bold text-white">
              {title}
            </motion.h2>
          )}
          {subtitle && (
            <motion.p variants={fadeInUp} className="text-lg text-white/90">
              {subtitle}
            </motion.p>
          )}
          {buttonText && section.buttonLink && (
            <motion.div variants={fadeInUp}>
              <Button size="lg" variant="secondary" asChild>
                <a href={section.buttonLink}>
                  {buttonText}
                  {isRTL ? <ArrowLeft className="w-4 h-4 ms-2" /> : <ArrowRight className="w-4 h-4 ms-2" />}
                </a>
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.section>
  );
}

export function FAQSection({ section, className }: SectionRendererProps) {
  const { locale, isRTL } = useLocale();
  const title = locale === "he" ? section.titleHe || section.title : section.title;
  const data = (locale === "he" ? section.dataHe || section.data : section.data) as {
    items?: Array<{ question?: string; answer?: string }>;
  };
  const items = data?.items || [];

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeInUp}
      className={cn("py-16 md:py-20", className)}
      data-testid={`section-faq-${section.id}`}
    >
      <div className="container mx-auto px-4">
        {title && (
          <motion.h2
            variants={fadeInUp}
            className={cn("text-3xl md:text-4xl font-bold text-center mb-12", isRTL && "text-right")}
          >
            {title}
          </motion.h2>
        )}
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-3">
            {items.map((item, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <AccordionItem value={`item-${index}`} className="border rounded-lg px-4">
                  <AccordionTrigger className={cn("text-start", isRTL && "text-right")}>
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className={cn("text-muted-foreground", isRTL && "text-right")}>
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>
      </div>
    </motion.section>
  );
}

export function StatsSection({ section, className }: SectionRendererProps) {
  const { locale, isRTL } = useLocale();
  const title = locale === "he" ? section.titleHe || section.title : section.title;
  const data = (locale === "he" ? section.dataHe || section.data : section.data) as {
    items?: Array<{ value?: string; label?: string; suffix?: string }>;
  };
  const items = data?.items || [];

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={staggerContainer}
      className={cn("py-16 md:py-20 bg-muted/50", className)}
      data-testid={`section-stats-${section.id}`}
    >
      <div className="container mx-auto px-4">
        {title && (
          <motion.h2
            variants={fadeInUp}
            className={cn("text-3xl md:text-4xl font-bold text-center mb-12", isRTL && "text-right")}
          >
            {title}
          </motion.h2>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {items.map((item, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              className={cn("text-center", isRTL && "text-right")}
            >
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
                {item.value}
                {item.suffix && <span className="text-2xl">{item.suffix}</span>}
              </div>
              <div className="text-muted-foreground">{item.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

export function FeaturesSection({ section, className }: SectionRendererProps) {
  const { locale, isRTL } = useLocale();
  const title = locale === "he" ? section.titleHe || section.title : section.title;
  const subtitle = locale === "he" ? section.subtitleHe || section.subtitle : section.subtitle;
  const data = (locale === "he" ? section.dataHe || section.data : section.data) as {
    items?: Array<{ icon?: string; title?: string; description?: string }>;
  };
  const items = data?.items || [];

  const iconMap: Record<string, any> = {
    star: Star,
    check: Check,
    sparkles: Sparkles,
    zap: Zap,
    shield: Shield,
    heart: Heart,
    trending: TrendingUp,
    users: Users,
    award: Award,
  };

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={staggerContainer}
      className={cn("py-16 md:py-20", className)}
      data-testid={`section-features-${section.id}`}
    >
      <div className="container mx-auto px-4">
        <div className={cn("text-center max-w-3xl mx-auto mb-12", isRTL && "text-right")}>
          {title && (
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-bold mb-4">
              {title}
            </motion.h2>
          )}
          {subtitle && (
            <motion.p variants={fadeInUp} className="text-lg text-muted-foreground">
              {subtitle}
            </motion.p>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((item, index) => {
            const IconComponent = iconMap[item.icon || "check"] || Check;
            return (
              <motion.div
                key={index}
                variants={fadeInUp}
                className={cn("flex gap-4", isRTL && "flex-row-reverse text-right")}
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <IconComponent className="w-5 h-5 text-primary" />
                </div>
                <div>
                  {item.title && (
                    <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                  )}
                  {item.description && (
                    <p className="text-muted-foreground text-sm">{item.description}</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}

export function GallerySection({ section, className }: SectionRendererProps) {
  const { locale, isRTL } = useLocale();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [preloadedImages, setPreloadedImages] = useState<Set<number>>(new Set());
  const title = locale === "he" ? section.titleHe || section.title : section.title;
  const images = section.images || [];

  const lightboxImages: LightboxImage[] = images.map((src, index) => ({
    src,
    alt: `Gallery image ${index + 1}`,
  }));

  const preloadImage = useCallback((index: number) => {
    if (index < 0 || index >= images.length || preloadedImages.has(index)) {
      return;
    }
    const img = new Image();
    img.src = images[index];
    img.onload = () => {
      setPreloadedImages(prev => new Set([...prev, index]));
    };
  }, [images, preloadedImages]);

  useEffect(() => {
    preloadImage(currentIndex);
    preloadImage(currentIndex - 1);
    preloadImage(currentIndex + 1);
  }, [currentIndex, preloadImage]);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const goToFirst = useCallback(() => {
    setCurrentIndex(0);
  }, []);

  const goToLast = useCallback(() => {
    setCurrentIndex(images.length - 1);
  }, [images.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxOpen) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          prevSlide();
          break;
        case "ArrowRight":
          e.preventDefault();
          nextSlide();
          break;
        case "Home":
          e.preventDefault();
          goToFirst();
          break;
        case "End":
          e.preventDefault();
          goToLast();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, prevSlide, nextSlide, goToFirst, goToLast]);

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  if (images.length === 0) return null;

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeInUp}
      className={cn("py-16 md:py-20", className)}
      data-testid={`section-gallery-${section.id}`}
      role="region"
      aria-label={title || "Image gallery"}
    >
      <div className="container mx-auto px-4">
        {title && (
          <motion.h2
            variants={fadeInUp}
            className={cn("text-3xl md:text-4xl font-bold text-center mb-12", isRTL && "text-right")}
          >
            {title}
          </motion.h2>
        )}

        <div className="relative max-w-4xl mx-auto">
          <button
            className="aspect-video overflow-hidden rounded-lg w-full relative group cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            onClick={() => openLightbox(currentIndex)}
            aria-label={`Open image ${currentIndex + 1} in fullscreen`}
            data-testid="gallery-main-image"
          >
            <motion.img
              key={currentIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              src={images[currentIndex]}
              alt={`Gallery image ${currentIndex + 1}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <Maximize2 className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>

          {images.length > 1 && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="absolute top-1/2 -translate-y-1/2 left-4 bg-background"
                onClick={(e) => { e.stopPropagation(); prevSlide(); }}
                aria-label="Previous image"
                data-testid="gallery-prev"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute top-1/2 -translate-y-1/2 right-4 bg-background"
                onClick={(e) => { e.stopPropagation(); nextSlide(); }}
                aria-label="Next image"
                data-testid="gallery-next"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>

              <div 
                className="flex justify-center gap-2 mt-4"
                role="tablist"
                aria-label="Gallery navigation dots"
              >
                {images.map((_, index) => (
                  <button
                    key={index}
                    role="tab"
                    aria-selected={index === currentIndex}
                    onClick={() => setCurrentIndex(index)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
                      index === currentIndex ? "bg-primary" : "bg-muted"
                    )}
                    aria-label={`Go to image ${index + 1}`}
                    data-testid={`gallery-dot-${index}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {images.length > 4 && (
          <div 
            className="grid grid-cols-4 md:grid-cols-6 gap-2 mt-4 max-w-4xl mx-auto"
            role="tablist"
            aria-label="Gallery thumbnails"
          >
            {images.slice(0, 6).map((img, index) => (
              <button
                key={index}
                role="tab"
                aria-selected={index === currentIndex}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "aspect-square rounded-md overflow-hidden border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
                  index === currentIndex ? "border-primary" : "border-transparent"
                )}
                aria-label={`View image ${index + 1}`}
                data-testid={`gallery-thumbnail-${index}`}
              >
                <img 
                  src={img} 
                  alt="" 
                  className="w-full h-full object-cover"
                  loading="lazy" 
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <Lightbox
        images={lightboxImages}
        initialIndex={currentIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onIndexChange={setCurrentIndex}
      />
    </motion.section>
  );
}

export function NewsletterSection({ section, className }: SectionRendererProps) {
  const { locale, isRTL } = useLocale();
  const [email, setEmail] = useState("");
  const title = locale === "he" ? section.titleHe || section.title : section.title;
  const subtitle = locale === "he" ? section.subtitleHe || section.subtitle : section.subtitle;
  const buttonText = locale === "he" ? section.buttonTextHe || section.buttonText : section.buttonText;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Newsletter signup:", email);
    setEmail("");
  };

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeInUp}
      className={cn("py-16 md:py-20 bg-muted/50", className)}
      data-testid={`section-newsletter-${section.id}`}
    >
      <div className="container mx-auto px-4">
        <div className={cn("max-w-2xl mx-auto text-center", isRTL && "text-right")}>
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          {title && (
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-bold mb-4">
              {title}
            </motion.h2>
          )}
          {subtitle && (
            <motion.p variants={fadeInUp} className="text-lg text-muted-foreground mb-8">
              {subtitle}
            </motion.p>
          )}
          <motion.form
            variants={fadeInUp}
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
          >
            <Input
              type="email"
              placeholder={isRTL ? "כתובת אימייל" : "Enter your email"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1"
              data-testid="newsletter-email"
            />
            <Button type="submit" data-testid="newsletter-submit">
              {buttonText || (isRTL ? "הרשמה" : "Subscribe")}
            </Button>
          </motion.form>
        </div>
      </div>
    </motion.section>
  );
}

export function TestimonialSection({ section, className }: SectionRendererProps) {
  const { locale, isRTL } = useLocale();
  const [currentIndex, setCurrentIndex] = useState(0);
  const title = locale === "he" ? section.titleHe || section.title : section.title;
  const data = (locale === "he" ? section.dataHe || section.data : section.data) as {
    items?: Array<{ quote?: string; author?: string; role?: string; avatar?: string; rating?: number }>;
  };
  const items = data?.items || [];

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  if (items.length === 0) return null;

  const currentItem = items[currentIndex];

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeInUp}
      className={cn("py-16 md:py-20", className)}
      data-testid={`section-testimonial-${section.id}`}
    >
      <div className="container mx-auto px-4">
        {title && (
          <motion.h2
            variants={fadeInUp}
            className={cn("text-3xl md:text-4xl font-bold text-center mb-12", isRTL && "text-right")}
          >
            {title}
          </motion.h2>
        )}

        <div className="max-w-3xl mx-auto">
          <Card className="relative">
            <CardContent className={cn("pt-8 pb-6", isRTL && "text-right")}>
              <Quote className="w-10 h-10 text-primary/20 mb-4" />

              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {currentItem.rating && (
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "w-4 h-4",
                          i < currentItem.rating! ? "fill-yellow-400 text-yellow-400" : "text-muted"
                        )}
                      />
                    ))}
                  </div>
                )}

                <p className="text-lg md:text-xl text-foreground mb-6 italic">
                  "{currentItem.quote}"
                </p>

                <div className={cn("flex items-center gap-4", isRTL && "flex-row-reverse")}>
                  {currentItem.avatar && (
                    <img
                      src={currentItem.avatar}
                      alt={currentItem.author || ""}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <div className="font-semibold">{currentItem.author}</div>
                    {currentItem.role && (
                      <div className="text-sm text-muted-foreground">{currentItem.role}</div>
                    )}
                  </div>
                </div>
              </motion.div>

              {items.length > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <Button variant="ghost" size="sm" onClick={prevSlide}>
                    {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                  </Button>
                  <div className="flex gap-1">
                    {items.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentIndex(index)}
                        className={cn(
                          "w-2 h-2 rounded-full transition-colors",
                          index === currentIndex ? "bg-primary" : "bg-muted"
                        )}
                      />
                    ))}
                  </div>
                  <Button variant="ghost" size="sm" onClick={nextSlide}>
                    {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.section>
  );
}

export function SectionRenderer({ section, className }: SectionRendererProps) {
  if (!section.isVisible) return null;

  const renderers: Record<string, (props: SectionRendererProps) => JSX.Element | null> = {
    hero: HeroSection,
    intro_text: IntroTextSection,
    highlight_grid: HighlightGridSection,
    content_grid: ContentGridSection,
    cta: CTASection,
    faq: FAQSection,
    stats: StatsSection,
    features: FeaturesSection,
    gallery: GallerySection,
    newsletter: NewsletterSection,
    testimonial: TestimonialSection,
  };

  const Renderer = renderers[section.sectionType];
  if (!Renderer) {
    console.warn(`Unknown section type: ${section.sectionType}`);
    return null;
  }

  return <Renderer section={section} className={className} />;
}
