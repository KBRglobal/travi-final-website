import { ChevronDown, Lightbulb, Star, AlertCircle, CheckCircle } from "lucide-react";
import { marked } from "marked";
import { sanitizeHTML } from "@/lib/sanitize";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Configure marked for safe rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

// Helper to convert markdown to HTML with XSS protection
function parseMarkdown(contents: string): string {
  if (!contents) return "";
  // Check if contents already contains HTML tags
  let html: string;
  if (/<[a-z][\s\S]*>/i.test(contents)) {
    html = contents;
  } else {
    html = marked.parse(contents) as string;
  }
  // Sanitize to prevent XSS attacks
  return sanitizeHTML(html);
}

interface FaqItem {
  question: string;
  answer: string;
}

interface ContentBlock {
  type: string;
  data?: Record<string, any>;
  [key: string]: any;
}

interface ArticleBodyProps {
  blocks?: ContentBlock[];
  metaDescription?: string;
  className?: string;
}

function renderTextBlock(data: Record<string, any>, index: number) {
  const htmlContent = parseMarkdown(data.contents || "");
  
  return (
    <div key={index} className="py-6" data-testid={`text-block-${index}`}>
      {data.title && (
        <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4">
          {data.title}
        </h2>
      )}
      <div
        className="prose prose-lg max-w-none dark:prose-invert 
                   prose-headings:font-bold prose-headings:text-foreground
                   prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4
                   prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
                   propose-p:text-muted-foreground prose-p:leading-relaxed
                   propose-a:text-[#6443F4] prose-a:no-underline hover:prose-a:underline
                   propose-strong:text-foreground prose-strong:font-semibold
                   propose-ul:text-muted-foreground prose-ol:text-muted-foreground
                   propose-li:marker:text-[#F4C542]"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
}

function renderBlockquote(data: Record<string, any>, index: number) {
  return (
    <blockquote
      key={index}
      className="relative my-8 pl-6 py-4 border-l-4 border-[#F4C542] bg-gradient-to-r from-[#F4C542]/10 to-transparent"
      data-testid={`blockquote-block-${index}`}
    >
      <p className="text-lg italic text-muted-foreground leading-relaxed">
        {data.quote || data.contents || data.text}
      </p>
      {data.author && (
        <cite className="block mt-3 text-sm font-medium text-foreground not-italic">
          — {data.author}
        </cite>
      )}
    </blockquote>
  );
}

function renderImage(data: Record<string, any>, index: number) {
  return (
    <figure key={index} className="my-8" data-testid={`image-block-${index}`}>
      <div className="rounded-lg overflow-hidden">
        <img
          src={data.url || data.imageUrl}
          alt={data.alt || data.caption || "Article image"}
          className="w-full h-auto object-cover"
          loading="lazy"
        />
      </div>
      {data.caption && (
        <figcaption className="mt-3 text-center text-sm text-muted-foreground italic">
          {data.caption}
        </figcaption>
      )}
    </figure>
  );
}

function renderGallery(data: Record<string, any>, index: number) {
  const images = data.images || [];
  return (
    <div key={index} className="my-8" data-testid={`gallery-block-${index}`}>
      {data.title && (
        <h3 className="text-xl font-semibold text-foreground mb-4">{data.title}</h3>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {images.map((img: any, i: number) => (
          <div key={i} className="rounded-lg overflow-hidden aspect-[4/3]">
            <img
              src={img.url}
              alt={img.alt || `Gallery image ${i + 1}`}
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function renderFaq(data: Record<string, any>, index: number) {
  // Handle both array format (legacy) and individual Q/A format (new)
  if (data.question && data.answer) {
    // Individual FAQ block format
    return (
      <div key={index} className="my-4" data-testid={`faq-block-${index}`}>
        <Accordion type="single" collapsible>
          <AccordionItem
            value={`faq-${index}`}
            className="border border-border/50 rounded-lg px-5 bg-card/50"
            data-testid={`faq-item-${index}`}
          >
            <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-4">
              {data.question}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground pb-4 leading-relaxed">
              {data.answer}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    );
  }
  
  // Legacy array format
  const faqs: FaqItem[] = data.faqs || data.items || [];
  if (faqs.length === 0) return null;
  
  return (
    <div key={index} className="my-10" data-testid={`faq-block-${index}`}>
      {data.title && (
        <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-6">
          {data.title}
        </h2>
      )}
      <Accordion type="single" collapsible className="space-y-3">
        {faqs.map((item, i) => (
          <AccordionItem
            key={i}
            value={`faq-${i}`}
            className="border border-border/50 rounded-lg px-5 bg-card/50"
            data-testid={`faq-item-${i}`}
          >
            <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-4">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground pb-4 leading-relaxed">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

function renderTips(data: Record<string, any>, index: number) {
  // Handle both array format (legacy) and contents string format (new)
  let tips: string[] = [];
  if (typeof data.contents === "string" && data.contents.trim()) {
    tips = data.contents.split("\n").filter((line: string) => line.trim());
  } else if (Array.isArray(data.tips)) {
    tips = data.tips.map((item: any) => typeof item === "string" ? item : item.text || item.contents || "");
  } else if (Array.isArray(data.items)) {
    tips = data.items.map((item: any) => typeof item === "string" ? item : item.text || item.contents || "");
  }
  
  if (tips.length === 0) return null;
  
  return (
    <div
      key={index}
      className="my-8 p-6 rounded-lg bg-gradient-to-br from-[#6443F4]/5 to-[#6443F4]/10 dark:from-[#6443F4]/10 dark:to-[#6443F4]/5 border border-[#6443F4]/10 dark:border-[#6443F4]/20"
      data-testid={`tips-block-${index}`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-[#6443F4]/10 flex items-center justify-center">
          <Lightbulb className="w-5 h-5 text-[#6443F4]" />
        </div>
        <h3 className="text-xl font-semibold text-foreground">
          {data.title || "Pro Tips"}
        </h3>
      </div>
      <ul className="space-y-3">
        {tips.map((tip: string, i: number) => (
          <li key={i} className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-travi-green mt-0.5 flex-shrink-0" />
            <span className="text-muted-foreground leading-relaxed">{tip}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function renderHighlights(data: Record<string, any>, index: number) {
  // Handle both array format (legacy) and contents string format (new)
  let highlights: string[] = [];
  if (typeof data.contents === "string" && data.contents.trim()) {
    highlights = data.contents.split("\n").filter((line: string) => line.trim());
  } else if (Array.isArray(data.items)) {
    highlights = data.items.map((item: any) => typeof item === "string" ? item : item.title || item.text || "");
  } else if (Array.isArray(data.highlights)) {
    highlights = data.highlights.map((item: any) => typeof item === "string" ? item : item.title || item.text || "");
  }
  
  if (highlights.length === 0) return null;
  
  return (
    <div key={index} className="my-8" data-testid={`highlights-block-${index}`}>
      {data.title && (
        <h3 className="text-xl font-semibold text-foreground mb-4">{data.title}</h3>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {highlights.map((highlight: string, i: number) => (
          <div
            key={i}
            className="flex items-start gap-3 p-4 rounded-lg bg-card border border-border/50"
          >
            <Star className="w-5 h-5 text-[#F4C542] mt-0.5 flex-shrink-0" />
            <span className="font-medium text-foreground">{highlight}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderCta(data: Record<string, any>, index: number) {
  return (
    <div
      key={index}
      className="my-10 p-8 rounded-lg bg-[#6443F4] text-center"
      data-testid={`cta-block-${index}`}
    >
      {data.title && (
        <h3 className="text-2xl font-bold text-white mb-2">{data.title}</h3>
      )}
      {(data.description || data.contents) && (
        <p className="text-white/90 mb-6 max-w-xl mx-auto">
          {data.description || data.contents}
        </p>
      )}
      {data.buttonText && (data.buttonUrl || data.buttonLink) && (
        <a
          href={data.buttonUrl || data.buttonLink}
          className="inline-block bg-white text-[#6443F4] px-6 py-3 rounded-md font-medium transition-transform hover:scale-105"
          data-testid={`cta-button-${index}`}
        >
          {data.buttonText}
        </a>
      )}
    </div>
  );
}

function renderInfoGrid(data: Record<string, any>, index: number) {
  const items = data.items || [];
  
  return (
    <div key={index} className="my-8" data-testid={`info-grid-block-${index}`}>
      {data.title && (
        <h3 className="text-xl font-semibold text-foreground mb-4">{data.title}</h3>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((item: any, i: number) => (
          <div key={i} className="text-center p-4 rounded-lg bg-card border border-border/50">
            <div className="text-lg font-semibold text-foreground">{item.value}</div>
            <div className="text-sm text-muted-foreground">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderBlock(block: ContentBlock, index: number) {
  const data = block.data || block;
  
  switch (block.type) {
    case "text":
      return renderTextBlock(data, index);
    case "blockquote":
    case "quote":
      return renderBlockquote(data, index);
    case "image":
      return renderImage(data, index);
    case "gallery":
      return renderGallery(data, index);
    case "faq":
      return renderFaq(data, index);
    case "tips":
      return renderTips(data, index);
    case "highlights":
      return renderHighlights(data, index);
    case "cta":
      return renderCta(data, index);
    case "info_grid":
      return renderInfoGrid(data, index);
    case "hero":
      return null;
    default:
      return null;
  }
}

export function ArticleBody({ blocks = [], metaDescription, className = "" }: ArticleBodyProps) {
  const filteredBlocks = blocks.filter((block) => block.type !== "hero");

  return (
    <article
      className={`max-w-3xl mx-auto px-6 lg:px-8 py-10 lg:py-16 ${className}`}
      data-testid="article-body"
    >
      {metaDescription && filteredBlocks.length === 0 && (
        <p className="text-xl text-muted-foreground leading-relaxed mb-8">
          {metaDescription}
        </p>
      )}
      
      {filteredBlocks.map((block, index) => renderBlock(block, index))}
    </article>
  );
}
