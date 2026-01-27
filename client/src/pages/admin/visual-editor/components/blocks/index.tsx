import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  Star,
  Check,
  Sparkles,
  Shield,
  Heart,
  TrendingUp,
  Users,
  Award,
  MapPin,
  Play,
  Mail,
  Quote,
  Zap,
} from "lucide-react";

export interface PageSection {
  id: string;
  pageId: string;
  sectionType: string;
  sectionKey: string | null;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  buttonText: string | null;
  buttonLink: string | null;
  titleHe: string | null;
  subtitleHe: string | null;
  descriptionHe: string | null;
  buttonTextHe: string | null;
  backgroundImage: string | null;
  backgroundVideo: string | null;
  images: string[];
  data: Record<string, unknown>;
  dataHe: Record<string, unknown>;
  backgroundColor: string | null;
  textColor: string | null;
  customCss: string | null;
  animation: string | null;
  sortOrder: number;
  isVisible: boolean;
  showOnMobile: boolean;
  showOnDesktop: boolean;
  createdAt: string;
  updatedAt: string;
  lastEditedBy: string | null;
}

export interface BlockProps {
  section: PageSection;
  isPreview: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onTextEdit?: (field: string, value: string) => void;
}

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

function EditableText({
  value,
  placeholder,
  className,
  onEdit,
  isPreview,
  isHeading = false,
}: {
  value: string | null;
  placeholder: string;
  className?: string;
  onEdit?: (value: string) => void;
  isPreview: boolean;
  isHeading?: boolean;
}) {
  if (isPreview) {
    return value ? <span className={className}>{value}</span> : null;
  }

  const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
    onEdit?.(e.currentTarget.textContent || "");
  };

  return (
    <span
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      className={cn(
        className,
        "outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded px-1 -mx-1",
        !value && "text-muted-foreground italic"
      )}
      data-testid={isHeading ? "editable-heading" : "editable-text"}
    >
      {value || placeholder}
    </span>
  );
}

export function HeroBlock({ section, isPreview, isSelected, onSelect, onTextEdit }: BlockProps) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "relative min-h-[400px] flex items-center justify-center overflow-hidden cursor-pointer",
        !isPreview && "ring-offset-2 transition-all",
        !isPreview && isSelected && "ring-2 ring-primary"
      )}
      data-testid={`block-hero-${section.id}`}
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

      <div className="relative z-10 container mx-auto px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1
            className={cn(
              "text-4xl md:text-5xl font-bold leading-tight",
              section.backgroundImage ? "text-white" : "text-foreground"
            )}
          >
            <EditableText
              value={section.title}
              placeholder="Add a compelling headline"
              onEdit={value => onTextEdit?.("title", value)}
              isPreview={isPreview}
              isHeading
            />
          </h1>
          <p
            className={cn(
              "text-lg md:text-xl",
              section.backgroundImage ? "text-white/90" : "text-muted-foreground"
            )}
          >
            <EditableText
              value={section.subtitle}
              placeholder="Add a supporting subtitle"
              onEdit={value => onTextEdit?.("subtitle", value)}
              isPreview={isPreview}
            />
          </p>
          {(section.buttonText || !isPreview) && (
            <div className="pt-4">
              <Button size="lg">
                <EditableText
                  value={section.buttonText}
                  placeholder="Button text"
                  onEdit={value => onTextEdit?.("buttonText", value)}
                  isPreview={isPreview}
                />
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function TextBlock({ section, isPreview, isSelected, onSelect, onTextEdit }: BlockProps) {
  const images = section.images || [];

  return (
    <div
      onClick={onSelect}
      className={cn(
        "py-16 cursor-pointer",
        !isPreview && "ring-offset-2 transition-all",
        !isPreview && isSelected && "ring-2 ring-primary"
      )}
      style={{ backgroundColor: section.backgroundColor || undefined }}
      data-testid={`block-text-${section.id}`}
    >
      <div className="container mx-auto px-4">
        <div
          className={cn(
            "grid gap-8 items-center",
            images.length > 0 ? "md:grid-cols-2" : "max-w-3xl mx-auto"
          )}
        >
          <div className="space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">
              <EditableText
                value={section.title}
                placeholder="Section title"
                onEdit={value => onTextEdit?.("title", value)}
                isPreview={isPreview}
                isHeading
              />
            </h2>
            <div className="text-muted-foreground text-lg leading-relaxed">
              <EditableText
                value={section.description}
                placeholder="Add your contents here. You can describe your services, share your story, or provide valuable information to your visitors."
                onEdit={value => onTextEdit?.("description", value)}
                isPreview={isPreview}
              />
            </div>
          </div>
          {images.length > 0 && (
            <div className="relative">
              <img
                src={images[0]}
                alt=""
                className="rounded-lg shadow-lg w-full object-cover aspect-[4/3]"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function GalleryBlock({ section, isPreview, isSelected, onSelect, onTextEdit }: BlockProps) {
  const images = section.images || [];

  return (
    <div
      onClick={onSelect}
      className={cn(
        "py-16 cursor-pointer",
        !isPreview && "ring-offset-2 transition-all",
        !isPreview && isSelected && "ring-2 ring-primary"
      )}
      data-testid={`block-gallery-${section.id}`}
    >
      <div className="container mx-auto px-4">
        {(section.title || !isPreview) && (
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            <EditableText
              value={section.title}
              placeholder="Gallery Title"
              onEdit={value => onTextEdit?.("title", value)}
              isPreview={isPreview}
              isHeading
            />
          </h2>
        )}
        {images.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div key={index} className="aspect-square overflow-hidden rounded-lg">
                <img
                  src={image}
                  alt={`Gallery image ${index + 1}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform"
                />
              </div>
            ))}
          </div>
        ) : (
          !isPreview && (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">
                No images yet. Add images in the settings panel.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export function CtaBlock({ section, isPreview, isSelected, onSelect, onTextEdit }: BlockProps) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "py-16 md:py-24 relative overflow-hidden cursor-pointer",
        !isPreview && "ring-offset-2 transition-all",
        !isPreview && isSelected && "ring-2 ring-primary"
      )}
      data-testid={`block-cta-${section.id}`}
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
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            <EditableText
              value={section.title}
              placeholder="Ready to get started?"
              onEdit={value => onTextEdit?.("title", value)}
              isPreview={isPreview}
              isHeading
            />
          </h2>
          <p className="text-lg text-white/90">
            <EditableText
              value={section.subtitle}
              placeholder="Join thousands of satisfied customers today."
              onEdit={value => onTextEdit?.("subtitle", value)}
              isPreview={isPreview}
            />
          </p>
          {(section.buttonText || !isPreview) && (
            <Button size="lg" variant="secondary">
              <EditableText
                value={section.buttonText}
                placeholder="Get Started"
                onEdit={value => onTextEdit?.("buttonText", value)}
                isPreview={isPreview}
              />
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function FaqBlock({ section, isPreview, isSelected, onSelect, onTextEdit }: BlockProps) {
  const data = section.data as { items?: Array<{ question?: string; answer?: string }> };
  const items = data?.items || [];

  return (
    <div
      onClick={onSelect}
      className={cn(
        "py-16 cursor-pointer",
        !isPreview && "ring-offset-2 transition-all",
        !isPreview && isSelected && "ring-2 ring-primary"
      )}
      data-testid={`block-faq-${section.id}`}
    >
      <div className="container mx-auto px-4">
        {(section.title || !isPreview) && (
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            <EditableText
              value={section.title}
              placeholder="Frequently Asked Questions"
              onEdit={value => onTextEdit?.("title", value)}
              isPreview={isPreview}
              isHeading
            />
          </h2>
        )}
        <div className="max-w-3xl mx-auto">
          {items.length > 0 ? (
            <Accordion type="single" collapsible className="space-y-3">
              {items.map((item, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="border rounded-lg px-4"
                >
                  <AccordionTrigger
                    className="text-start"
                    data-testid={`accordion-trigger-faq-${index}`}
                  >
                    {item.question || "Question"}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {item.answer || "Answer"}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            !isPreview && (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">
                  No FAQs yet. Add questions in the settings panel.
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export function TestimonialBlock({
  section,
  isPreview,
  isSelected,
  onSelect,
  onTextEdit,
}: BlockProps) {
  const data = section.data as {
    items?: Array<{ name?: string; role?: string; contents?: string; image?: string }>;
  };
  const items = data?.items || [];

  return (
    <div
      onClick={onSelect}
      className={cn(
        "py-16 bg-muted cursor-pointer",
        !isPreview && "ring-offset-2 transition-all",
        !isPreview && isSelected && "ring-2 ring-primary"
      )}
      data-testid={`block-testimonial-${section.id}`}
    >
      <div className="container mx-auto px-4">
        {(section.title || !isPreview) && (
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            <EditableText
              value={section.title}
              placeholder="What Our Customers Say"
              onEdit={value => onTextEdit?.("title", value)}
              isPreview={isPreview}
              isHeading
            />
          </h2>
        )}
        {items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item, index) => (
              <Card key={index} className="h-full">
                <CardContent className="pt-6 space-y-4">
                  <Quote className="h-8 w-8 text-primary/30" />
                  <p className="text-muted-foreground italic">
                    {item.contents || "Testimonial contents"}
                  </p>
                  <div className="flex items-center gap-3">
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <p className="font-medium">{item.name || "Customer Name"}</p>
                      <p className="text-sm text-muted-foreground">{item.role || "Role"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          !isPreview && (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">
                No testimonials yet. Add them in the settings panel.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export function StatsBlock({ section, isPreview, isSelected, onSelect, onTextEdit }: BlockProps) {
  const data = section.data as {
    items?: Array<{ value?: string; label?: string; suffix?: string }>;
  };
  const items = data?.items || [];

  return (
    <div
      onClick={onSelect}
      className={cn(
        "py-16 bg-muted cursor-pointer",
        !isPreview && "ring-offset-2 transition-all",
        !isPreview && isSelected && "ring-2 ring-primary"
      )}
      data-testid={`block-stats-${section.id}`}
    >
      <div className="container mx-auto px-4">
        {(section.title || !isPreview) && (
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            <EditableText
              value={section.title}
              placeholder="Our Impact"
              onEdit={value => onTextEdit?.("title", value)}
              isPreview={isPreview}
              isHeading
            />
          </h2>
        )}
        {items.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {items.map((item, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
                  {item.value || "0"}
                  {item.suffix && <span className="text-2xl">{item.suffix}</span>}
                </div>
                <div className="text-muted-foreground">{item.label || "Label"}</div>
              </div>
            ))}
          </div>
        ) : (
          !isPreview && (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">No stats yet. Add them in the settings panel.</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export function FeaturesBlock({
  section,
  isPreview,
  isSelected,
  onSelect,
  onTextEdit,
}: BlockProps) {
  const data = section.data as {
    items?: Array<{ icon?: string; title?: string; description?: string }>;
  };
  const items = data?.items || [];

  return (
    <div
      onClick={onSelect}
      className={cn(
        "py-16 cursor-pointer",
        !isPreview && "ring-offset-2 transition-all",
        !isPreview && isSelected && "ring-2 ring-primary"
      )}
      data-testid={`block-features-${section.id}`}
    >
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <EditableText
              value={section.title}
              placeholder="Our Features"
              onEdit={value => onTextEdit?.("title", value)}
              isPreview={isPreview}
              isHeading
            />
          </h2>
          <p className="text-lg text-muted-foreground">
            <EditableText
              value={section.subtitle}
              placeholder="Discover what makes us different"
              onEdit={value => onTextEdit?.("subtitle", value)}
              isPreview={isPreview}
            />
          </p>
        </div>
        {items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {items.map((item, index) => {
              const IconComponent = iconMap[item.icon || "check"] || Check;
              return (
                <div key={index} className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <IconComponent className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">{item.title || "Feature Title"}</h3>
                    <p className="text-muted-foreground text-sm">
                      {item.description || "Feature description"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          !isPreview && (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">
                No features yet. Add them in the settings panel.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export function VideoBlock({ section, isPreview, isSelected, onSelect, onTextEdit }: BlockProps) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "py-16 cursor-pointer",
        !isPreview && "ring-offset-2 transition-all",
        !isPreview && isSelected && "ring-2 ring-primary"
      )}
      data-testid={`block-video-${section.id}`}
    >
      <div className="container mx-auto px-4">
        {(section.title || !isPreview) && (
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            <EditableText
              value={section.title}
              placeholder="Watch Our Video"
              onEdit={value => onTextEdit?.("title", value)}
              isPreview={isPreview}
              isHeading
            />
          </h2>
        )}
        <div className="max-w-4xl mx-auto">
          {section.backgroundVideo ? (
            <div className="aspect-video rounded-lg overflow-hidden">
              <video
                src={section.backgroundVideo}
                controls
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="aspect-video rounded-lg bg-muted flex items-center justify-center border-2 border-dashed">
              <div className="text-center">
                <Play className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {isPreview ? "No video added" : "Add a video URL in the settings panel"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function NewsletterBlock({
  section,
  isPreview,
  isSelected,
  onSelect,
  onTextEdit,
}: BlockProps) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "py-16 bg-muted cursor-pointer",
        !isPreview && "ring-offset-2 transition-all",
        !isPreview && isSelected && "ring-2 ring-primary"
      )}
      data-testid={`block-newsletter-${section.id}`}
    >
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <Mail className="h-12 w-12 mx-auto text-primary" />
          <h2 className="text-3xl md:text-4xl font-bold">
            <EditableText
              value={section.title}
              placeholder="Subscribe to Our Newsletter"
              onEdit={value => onTextEdit?.("title", value)}
              isPreview={isPreview}
              isHeading
            />
          </h2>
          <p className="text-lg text-muted-foreground">
            <EditableText
              value={section.subtitle}
              placeholder="Get the latest updates delivered to your inbox"
              onEdit={value => onTextEdit?.("subtitle", value)}
              isPreview={isPreview}
            />
          </p>
          <div className="flex gap-2 max-w-md mx-auto">
            <Input
              placeholder="Enter your email"
              className="flex-1"
              data-testid="input-newsletter-email"
            />
            <Button data-testid="button-newsletter-subscribe">
              <EditableText
                value={section.buttonText}
                placeholder="Subscribe"
                onEdit={value => onTextEdit?.("buttonText", value)}
                isPreview={isPreview}
              />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const BLOCK_TYPES = [
  { type: "hero", label: "Hero", icon: "layout" },
  { type: "intro_text", label: "Text", icon: "text" },
  { type: "gallery", label: "Gallery", icon: "image" },
  { type: "cta", label: "Call to Action", icon: "megaphone" },
  { type: "faq", label: "FAQ", icon: "help" },
  { type: "testimonial", label: "Testimonials", icon: "quote" },
  { type: "stats", label: "Statistics", icon: "chart" },
  { type: "features", label: "Features", icon: "star" },
  { type: "video", label: "Video", icon: "play" },
  { type: "newsletter", label: "Newsletter", icon: "mail" },
];

export function renderBlock(
  section: PageSection,
  isPreview: boolean,
  isSelected: boolean,
  onSelect: () => void,
  onTextEdit?: (field: string, value: string) => void
) {
  const props: BlockProps = { section, isPreview, isSelected, onSelect, onTextEdit };

  switch (section.sectionType) {
    case "hero":
      return <HeroBlock {...props} />;
    case "intro_text":
    case "text_image":
      return <TextBlock {...props} />;
    case "gallery":
      return <GalleryBlock {...props} />;
    case "cta":
      return <CtaBlock {...props} />;
    case "faq":
      return <FaqBlock {...props} />;
    case "testimonial":
      return <TestimonialBlock {...props} />;
    case "stats":
      return <StatsBlock {...props} />;
    case "features":
    case "highlight_grid":
      return <FeaturesBlock {...props} />;
    case "video":
      return <VideoBlock {...props} />;
    case "newsletter":
      return <NewsletterBlock {...props} />;
    default:
      return <TextBlock {...props} />;
  }
}
