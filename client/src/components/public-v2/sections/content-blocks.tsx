import { useState, type ReactNode } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ContentBlocksProps {
  blocks?: ReactNode | null;
  children?: ReactNode;
}

export function ContentBlocks({ blocks, children }: ContentBlocksProps) {
  const contents = children || blocks;
  
  if (!contents) {
    return null;
  }

  return (
    <section 
      className="prose prose-lg max-w-none dark:prose-invert
        prose-headings:font-bold 
        prose-headings:tracking-tight 
        prose-headings:scroll-mt-24
        prose-h2:text-2xl prose-h2:md:text-3xl prose-h2:mt-12 prose-h2:mb-6
        prose-h3:text-xl prose-h3:md:text-2xl prose-h3:mt-8 prose-h3:mb-4
        prose-p:leading-[1.75] prose-p:text-foreground/90 prose-p:mb-6
        prose-li:leading-[1.7] prose-li:text-foreground/90
        prose-ul:my-6 prose-ul:space-y-2
        prose-ol:my-6 prose-ol:space-y-2
        prose-a:text-[#6443F4] prose-a:no-underline hover:prose-a:underline
        prose-strong:text-foreground prose-strong:font-semibold
        prose-blockquote:border-l-0 prose-blockquote:pl-0 prose-blockquote:not-italic
        prose-img:rounded-xl prose-img:shadow-lg
        prose-figcaption:text-center prose-figcaption:text-sm prose-figcaption:text-muted-foreground
      "
      data-testid="section-contents-blocks"
    >
      {contents}
    </section>
  );
}

interface PullQuoteProps {
  children: ReactNode;
  author?: string;
  source?: string;
}

export function PullQuote({ children, author, source }: PullQuoteProps) {
  return (
    <blockquote 
      className="relative my-12 md:my-16 py-8 px-6 md:px-10
        bg-gradient-to-br from-[#6443F4]/5 via-[#6443F4]/5 to-[#F4C542]/5
        rounded-2xl
        before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5
        before:bg-gradient-to-b before:from-[#6443F4] before:via-[#6443F4] before:to-[#F4C542]
        before:rounded-l-2xl
      "
      data-testid="pull-quote"
    >
      <div className="relative">
        <svg 
          className="absolute -top-2 -left-2 w-8 h-8 text-[#6443F4]/20" 
          fill="currentColor" 
          viewBox="0 0 24 24"
        >
          <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
        </svg>
        
        <p className="text-xl md:text-2xl font-medium leading-relaxed text-foreground/95 italic pl-6">
          {children}
        </p>
        
        {(author || source) && (
          <footer className="mt-4 pl-6 flex items-center gap-2 text-sm text-muted-foreground">
            {author && <cite className="not-italic font-medium">{author}</cite>}
            {author && source && <span>—</span>}
            {source && <span>{source}</span>}
          </footer>
        )}
      </div>
    </blockquote>
  );
}

interface ArticleImageProps {
  src: string;
  alt: string;
  caption?: string;
  credit?: string;
  aspectRatio?: "landscape" | "portrait" | "square" | "wide";
  fullWidth?: boolean;
}

export function ArticleImage({ 
  src, 
  alt, 
  caption, 
  credit,
  aspectRatio = "landscape",
  fullWidth = false
}: ArticleImageProps) {
  const [isOpen, setIsOpen] = useState(false);

  const aspectRatioClasses = {
    landscape: "aspect-[16/10]",
    portrait: "aspect-[3/4]",
    square: "aspect-square",
    wide: "aspect-[21/9]"
  };

  return (
    <>
      <figure 
        className={`my-8 md:my-12 ${fullWidth ? "-mx-4 md:-mx-8 lg:-mx-16" : ""}`}
        data-testid="article-image"
      >
        <div 
          className={`relative ${aspectRatioClasses[aspectRatio]} rounded-xl overflow-hidden cursor-zoom-in group`}
          onClick={() => setIsOpen(true)}
        >
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg">
                <ZoomIn className="w-5 h-5 text-foreground" />
              </div>
            </div>
          </div>
        </div>
        
        {(caption || credit) && (
          <figcaption className="mt-3 px-2 text-center text-sm text-muted-foreground">
            {caption && <span>{caption}</span>}
            {caption && credit && <span> — </span>}
            {credit && <span className="italic">Photo: {credit}</span>}
          </figcaption>
        )}
      </figure>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent 
          className="max-w-[95vw] max-h-[95vh] p-0 border-0 bg-black/95 backdrop-blur-xl"
          data-testid="image-lightbox"
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
            onClick={() => setIsOpen(false)}
            data-testid="lightbox-close"
          >
            <X className="w-6 h-6" />
          </Button>
          <div className="flex items-center justify-center p-4">
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
          </div>
          {caption && (
            <div className="absolute bottom-4 left-0 right-0 text-center text-white/80 text-sm px-4">
              {caption}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

interface ImageGalleryProps {
  images: Array<{
    src: string;
    alt: string;
    caption?: string;
  }>;
  layout?: "grid" | "masonry" | "carousel";
}

export function ImageGallery({ images, layout = "grid" }: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  if (layout === "grid") {
    return (
      <div 
        className="my-8 md:my-12 grid grid-cols-2 md:grid-cols-3 gap-4"
        data-testid="image-gallery"
      >
        {images.map((image, index) => (
          <div 
            key={index}
            className="relative aspect-square rounded-xl overflow-hidden cursor-zoom-in group"
            onClick={() => setSelectedImage(index)}
          >
            <img
              src={image.src}
              alt={image.alt}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
          </div>
        ))}
        
        {selectedImage !== null && (
          <Dialog open={true} onOpenChange={() => setSelectedImage(null)}>
            <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-0 bg-black/95 backdrop-blur-xl">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
                onClick={() => setSelectedImage(null)}
              >
                <X className="w-6 h-6" />
              </Button>
              <div className="flex items-center justify-center p-4">
                <img
                  src={images[selectedImage].src}
                  alt={images[selectedImage].alt}
                  className="max-w-full max-h-[85vh] object-contain rounded-lg"
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }

  return null;
}

interface InfoBoxProps {
  type?: "tip" | "warning" | "info" | "note";
  title?: string;
  children: ReactNode;
}

export function InfoBox({ type = "info", title, children }: InfoBoxProps) {
  const styles = {
    tip: {
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      border: "border-l-emerald-500",
      icon: "text-emerald-600"
    },
    warning: {
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-l-amber-500",
      icon: "text-amber-600"
    },
    info: {
      bg: "bg-sky-50 dark:bg-sky-950/30",
      border: "border-l-sky-500",
      icon: "text-sky-600"
    },
    note: {
      bg: "bg-[#6443F4]/10 dark:bg-[#6443F4]/20",
      border: "border-l-[#6443F4]",
      icon: "text-[#6443F4]"
    }
  };

  const style = styles[type];

  return (
    <aside 
      className={`my-8 p-6 rounded-r-xl border-l-4 ${style.bg} ${style.border}`}
      data-testid={`info-box-${type}`}
    >
      {title && (
        <h4 
          className={`font-semibold mb-2 ${style.icon}`}
          style={{ fontFamily: "'Chillax', var(--font-sans)" }}
        >
          {title}
        </h4>
      )}
      <div className="text-foreground/80 leading-relaxed">
        {children}
      </div>
    </aside>
  );
}

interface KeyTakeawaysProps {
  items: string[];
  title?: string;
}

export function KeyTakeaways({ items, title = "Key Takeaways" }: KeyTakeawaysProps) {
  return (
    <aside 
      className="my-8 md:my-12 p-6 md:p-8 rounded-2xl bg-gradient-to-br from-[#6443F4]/10 to-[#6443F4]/5 border border-[#6443F4]/20"
      data-testid="key-takeaways"
    >
      <h3 
        className="font-bold text-xl mb-4 text-[#6443F4]"
        style={{ fontFamily: "'Chillax', var(--font-sans)" }}
      >
        {title}
      </h3>
      <ul className="space-y-3">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#6443F4] text-white text-sm font-medium flex items-center justify-center mt-0.5">
              {index + 1}
            </span>
            <span className="text-foreground/90 leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

interface HighlightTextProps {
  children: ReactNode;
  color?: "purple" | "pink" | "yellow";
}

export function HighlightText({ children, color = "yellow" }: HighlightTextProps) {
  const colors = {
    purple: "bg-[#6443F4]/20",
    pink: "bg-[#6443F4]/20",
    yellow: "bg-[#F4C542]/30"
  };

  return (
    <mark 
      className={`${colors[color]} px-1 rounded-sm text-foreground`}
      data-testid="highlight-text"
    >
      {children}
    </mark>
  );
}
