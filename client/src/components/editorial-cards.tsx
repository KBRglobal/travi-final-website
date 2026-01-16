import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Calendar, MapPin, Clock } from "lucide-react";

interface FeaturedCardProps {
  title: string;
  description?: string;
  image: string;
  href: string;
  category?: string;
  categoryColor?: string;
  location?: string;
  date?: string;
  className?: string;
}

export function FeaturedCard({
  title,
  description,
  image,
  href,
  category,
  categoryColor = "bg-primary",
  location,
  date,
  className = "",
}: FeaturedCardProps) {
  return (
    <Link href={href}>
      <article
        className={`group relative overflow-hidden rounded-lg cursor-pointer ${className}`}
        data-testid="featured-card"
      >
        <div className="relative aspect-[16/10] lg:aspect-[16/9]">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            data-testid="featured-card-image"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          
          <div className="absolute inset-0 flex flex-col justify-end p-6 lg:p-8">
            {category && (
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge 
                  className={`${categoryColor} text-white border-0`}
                  data-testid="featured-card-category"
                >
                  {category}
                </Badge>
              </div>
            )}
            
            <h2 
              className="text-2xl lg:text-3xl font-bold text-white mb-2 line-clamp-2 group-hover:text-white/90 transition-colors"
              style={{ fontFamily: "'Chillax', var(--font-sans)" }}
              data-testid="featured-card-title"
            >
              {title}
            </h2>
            
            {description && (
              <p 
                className="text-white/80 text-base lg:text-lg line-clamp-2 mb-3"
                data-testid="featured-card-description"
              >
                {description}
              </p>
            )}
            
            <div className="flex flex-wrap items-center gap-4 text-white/70 text-sm">
              {location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {location}
                </span>
              )}
              {date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {date}
                </span>
              )}
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

interface EditorialCardProps {
  title: string;
  excerpt?: string;
  image: string;
  href: string;
  category?: string;
  categoryColor?: string;
  author?: string;
  date?: string;
  readTime?: string;
  variant?: "horizontal" | "vertical";
  size?: "small" | "medium" | "large";
  className?: string;
}

export function EditorialCard({
  title,
  excerpt,
  image,
  href,
  category,
  categoryColor = "text-primary",
  author,
  date,
  readTime,
  variant = "vertical",
  size = "medium",
  className = "",
}: EditorialCardProps) {
  const sizeClasses = {
    small: {
      title: "text-base font-semibold",
      excerpt: "text-sm",
      image: "aspect-[4/3]",
    },
    medium: {
      title: "text-lg lg:text-xl font-semibold",
      excerpt: "text-sm lg:text-base",
      image: "aspect-[16/10]",
    },
    large: {
      title: "text-xl lg:text-2xl font-bold",
      excerpt: "text-base",
      image: "aspect-[16/9]",
    },
  };

  const currentSize = sizeClasses[size];

  if (variant === "horizontal") {
    return (
      <Link href={href}>
        <article
          className={`group flex gap-4 cursor-pointer ${className}`}
          data-testid="editorial-card-horizontal"
        >
          <div className="flex-shrink-0 w-24 sm:w-32 lg:w-40">
            <div className="relative aspect-square rounded-lg overflow-hidden">
              <img
                src={image}
                alt={title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          </div>
          
          <div className="flex flex-col justify-center flex-1 min-w-0">
            {category && (
              <span className={`text-xs font-medium uppercase tracking-wider ${categoryColor} mb-1`}>
                {category}
              </span>
            )}
            
            <h3 
              className={`${currentSize.title} text-foreground line-clamp-2 group-hover:text-primary transition-colors`}
              style={{ fontFamily: "'Chillax', var(--font-sans)" }}
              data-testid="editorial-card-title"
            >
              {title}
            </h3>
            
            <div className="flex flex-wrap items-center gap-2 mt-2 text-muted-foreground text-xs">
              {date && <span>{date}</span>}
              {readTime && (
                <>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {readTime}
                  </span>
                </>
              )}
            </div>
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link href={href}>
      <article
        className={`group cursor-pointer ${className}`}
        data-testid="editorial-card-vertical"
      >
        <div className={`relative ${currentSize.image} rounded-lg overflow-hidden mb-4`}>
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            data-testid="editorial-card-image"
          />
        </div>
        
        <div className="space-y-2">
          {category && (
            <span 
              className={`text-xs font-medium uppercase tracking-wider ${categoryColor}`}
              data-testid="editorial-card-category"
            >
              {category}
            </span>
          )}
          
          <h3 
            className={`${currentSize.title} text-foreground line-clamp-2 group-hover:text-primary transition-colors`}
            style={{ fontFamily: "'Chillax', var(--font-sans)" }}
            data-testid="editorial-card-title"
          >
            {title}
          </h3>
          
          {excerpt && (
            <p 
              className={`${currentSize.excerpt} text-muted-foreground line-clamp-2`}
              data-testid="editorial-card-excerpt"
            >
              {excerpt}
            </p>
          )}
          
          <div className="flex flex-wrap items-center gap-2 pt-2 text-muted-foreground text-xs">
            {author && <span className="font-medium text-foreground">{author}</span>}
            {author && date && <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />}
            {date && <span>{date}</span>}
            {readTime && (
              <>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {readTime}
                </span>
              </>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}

interface ContentGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function ContentGrid({ children, columns = 3, className = "" }: ContentGridProps) {
  const columnClasses = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={`grid ${columnClasses[columns]} gap-6 lg:gap-8 ${className}`}>
      {children}
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    href: string;
  };
  className?: string;
}

export function SectionHeader({ title, subtitle, action, className = "" }: SectionHeaderProps) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 ${className}`}>
      <div>
        <h2 className="text-2xl lg:text-3xl font-bold text-foreground" style={{ fontFamily: "'Chillax', var(--font-sans)" }} data-testid="section-title">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-muted-foreground" data-testid="section-subtitle">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <Link 
          href={action.href}
          className="text-primary font-medium text-sm hover:underline underline-offset-4"
          data-testid="section-action"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
