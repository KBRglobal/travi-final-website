import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  Timer, 
  Sun,
  Share2, 
  Facebook, 
  Twitter, 
  Linkedin, 
  Link2,
  ChevronRight,
  CheckCircle,
  Plane,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export interface ArticleAuthor {
  name: string;
  avatar?: string;
  bio?: string;
  role?: string;
}

export interface ArticleFaq {
  question: string;
  answer: string;
}

export interface ArticleSection {
  id: string;
  title: string;
  content: string;
  image?: {
    src: string;
    alt: string;
    caption?: string;
  };
  subsections?: {
    id: string;
    title: string;
    content: string;
  }[];
}

export interface ArticleQuickInfo {
  location?: string;
  duration?: string;
  bestTime?: string;
}

export interface RelatedArticle {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  heroImage?: string;
  category?: string;
  readTime?: string;
  publishedAt?: string;
}

export interface ArticlePageProps {
  title: string;
  slug: string;
  heroImage: {
    src: string;
    alt: string;
  };
  category: string;
  publishedAt: string;
  updatedAt?: string;
  author: ArticleAuthor;
  readTime: string;
  excerpt: string;
  quickInfo?: ArticleQuickInfo;
  sections: ArticleSection[];
  keyTakeaways: string[];
  faqs: ArticleFaq[];
  ctaTitle?: string;
  ctaButtonText?: string;
  ctaButtonUrl?: string;
  relatedArticles: RelatedArticle[];
}

function generateArticleSchema(article: ArticlePageProps, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    image: article.heroImage.src,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
    author: {
      "@type": "Person",
      name: article.author.name,
    },
    publisher: {
      "@type": "Organization",
      name: "TRAVI",
      logo: {
        "@type": "ImageObject",
        url: "https://travi.world/logo.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    articleSection: article.category,
  };
}

function generateFaqSchema(faqs: ArticleFaq[]) {
  if (!faqs?.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

function generateBreadcrumbSchema(article: ArticlePageProps, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://travi.world",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: article.category,
        item: `https://travi.world/${article.category.toLowerCase().replace(/\s+/g, "-")}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: article.title,
        item: url,
      },
    ],
  };
}

export default function ArticlePage({
  title,
  slug,
  heroImage,
  category,
  publishedAt,
  updatedAt,
  author,
  readTime,
  excerpt,
  quickInfo,
  sections,
  keyTakeaways,
  faqs,
  ctaTitle = "Plan Your Trip",
  ctaButtonText = "Book Now",
  ctaButtonUrl = "/contact",
  relatedArticles,
}: ArticlePageProps) {
  const [activeSection, setActiveSection] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const tocItems = useMemo(() => {
    return sections.map((section) => ({
      id: section.id,
      title: section.title,
    }));
  }, [sections]);

  useEffect(() => {
    const handleScroll = () => {
      const sectionElements = sections.map((s) => ({
        id: s.id,
        element: document.getElementById(s.id),
      }));

      for (const section of sectionElements) {
        if (section.element) {
          const rect = section.element.getBoundingClientRect();
          if (rect.top <= 150 && rect.bottom > 150) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sections]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link");
    }
  };

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

  const hasQuickInfo = quickInfo?.location || quickInfo?.duration || quickInfo?.bestTime;

  return (
    <article className="min-h-screen bg-white dark:bg-slate-950" data-testid="article-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateArticleSchema({ title, slug, heroImage, category, publishedAt, updatedAt, author, readTime, excerpt, quickInfo, sections, keyTakeaways, faqs, ctaTitle, ctaButtonText, ctaButtonUrl, relatedArticles }, shareUrl)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateBreadcrumbSchema({ title, slug, heroImage, category, publishedAt, updatedAt, author, readTime, excerpt, quickInfo, sections, keyTakeaways, faqs, ctaTitle, ctaButtonText, ctaButtonUrl, relatedArticles }, shareUrl)),
        }}
      />
      {faqs?.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(generateFaqSchema(faqs)),
          }}
        />
      )}

      {/* 1. Hero Section */}
      <section className="relative" data-testid="section-hero">
        <div className="relative w-full aspect-video max-h-[600px] overflow-hidden">
          {heroImage?.src ? (
            <img
              src={heroImage.src}
              alt={heroImage.alt || title}
              className="w-full h-full object-cover"
              loading="eager"
              data-testid="img-hero"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#6443F4] to-[#5339D9]" data-testid="img-hero-fallback" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 pb-8 md:pb-12 px-5 md:px-8 lg:px-[140px]">
          <div className="max-w-4xl">
            <Badge 
              className="mb-4 bg-[#6443F4] text-white border-none"
              data-testid="badge-category"
            >
              {category}
            </Badge>
            
            <h1 
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4"
              data-testid="text-title"
            >
              {title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 md:gap-6 text-white/90 text-sm md:text-base" data-testid="meta-info">
              <div className="flex items-center gap-2" data-testid="meta-date">
                <Calendar className="w-4 h-4" />
                <time dateTime={publishedAt}>
                  {new Date(publishedAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
              </div>
              
              <div className="flex items-center gap-2" data-testid="meta-author">
                <User className="w-4 h-4" />
                <span>{author.name}</span>
              </div>
              
              <div className="flex items-center gap-2" data-testid="meta-read-time">
                <Clock className="w-4 h-4" />
                <span>{readTime}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Quick Info Bar (Optional) */}
      {hasQuickInfo && (
        <section 
          className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-4"
          data-testid="section-quick-info"
        >
          <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-[140px]">
            <div className="flex flex-wrap items-center gap-6 md:gap-10">
              {quickInfo?.location && (
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300" data-testid="quick-info-location">
                  <MapPin className="w-5 h-5 text-[#6443F4]" />
                  <span className="text-sm md:text-base font-medium">{quickInfo.location}</span>
                </div>
              )}
              
              {quickInfo?.duration && (
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300" data-testid="quick-info-duration">
                  <Timer className="w-5 h-5 text-[#6443F4]" />
                  <span className="text-sm md:text-base font-medium">{quickInfo.duration}</span>
                </div>
              )}
              
              {quickInfo?.bestTime && (
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300" data-testid="quick-info-best-time">
                  <Sun className="w-5 h-5 text-[#6443F4]" />
                  <span className="text-sm md:text-base font-medium">{quickInfo.bestTime}</span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 3. Introduction + 4. Table of Contents + 5. Main Content */}
      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-[140px] py-10 md:py-16">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Sidebar - Table of Contents */}
          <aside className="lg:w-64 lg:shrink-0" data-testid="section-toc">
            <nav className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-120px)] overflow-y-auto">
              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-5 border border-slate-200 dark:border-slate-800">
                <h2 className="font-semibold text-slate-900 dark:text-white mb-4 text-sm uppercase tracking-wide">
                  Table of Contents
                </h2>
                <ul className="space-y-2">
                  {tocItems.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className={cn(
                          "block text-sm py-1.5 px-3 rounded-md transition-colors",
                          activeSection === item.id
                            ? "bg-[#6443F4]/10 text-[#6443F4] font-medium"
                            : "text-slate-600 dark:text-slate-400 hover:text-[#6443F4] hover:bg-slate-100 dark:hover:bg-slate-800"
                        )}
                        data-testid={`toc-link-${item.id}`}
                      >
                        {item.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Introduction */}
            <section className="mb-10" data-testid="section-introduction">
              <p className="text-lg md:text-xl text-slate-700 dark:text-slate-300 leading-relaxed">
                {excerpt}
              </p>
            </section>

            <Separator className="mb-10" />

            {/* Content Sections */}
            <div className="space-y-12" data-testid="section-main-content">
              {sections.map((section, index) => (
                <section key={section.id} id={section.id} className="scroll-mt-24">
                  <h2 
                    className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-4"
                    data-testid={`heading-${section.id}`}
                  >
                    {section.title}
                  </h2>
                  
                  <div 
                    className="prose prose-lg max-w-none dark:prose-invert prose-headings:text-slate-900 dark:prose-headings:text-white prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-a:text-[#6443F4] prose-a:no-underline hover:prose-a:underline"
                    dangerouslySetInnerHTML={{ __html: section.content }}
                    data-testid={`content-${section.id}`}
                  />
                  
                  {section.image && (
                    <figure className="my-8">
                      <img
                        src={section.image.src}
                        alt={section.image.alt}
                        className="w-full max-w-2xl mx-auto rounded-lg shadow-md"
                        loading="lazy"
                        data-testid={`img-${section.id}`}
                      />
                      {section.image.caption && (
                        <figcaption className="text-center text-sm text-slate-500 dark:text-slate-400 mt-3">
                          {section.image.caption}
                        </figcaption>
                      )}
                    </figure>
                  )}
                  
                  {section.subsections?.map((sub) => (
                    <div key={sub.id} id={sub.id} className="mt-8 scroll-mt-24">
                      <h3 
                        className="text-xl md:text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-3"
                        data-testid={`subheading-${sub.id}`}
                      >
                        {sub.title}
                      </h3>
                      <div 
                        className="prose prose-base max-w-none dark:prose-invert prose-p:text-slate-700 dark:prose-p:text-slate-300"
                        dangerouslySetInnerHTML={{ __html: sub.content }}
                        data-testid={`subcontent-${sub.id}`}
                      />
                    </div>
                  ))}
                </section>
              ))}
            </div>

            {/* 6. Key Takeaways Box */}
            {keyTakeaways?.length > 0 && (
              <section 
                className="mt-12 bg-gradient-to-br from-[#6443F4]/5 to-[#6443F4]/5 dark:from-[#6443F4]/10 dark:to-[#6443F4]/10 rounded-xl p-6 md:p-8 border border-[#6443F4]/20"
                data-testid="section-key-takeaways"
              >
                <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
                  <CheckCircle className="w-6 h-6 text-[#6443F4]" />
                  Key Takeaways
                </h2>
                <ul className="space-y-3">
                  {keyTakeaways.map((takeaway, index) => (
                    <li 
                      key={index}
                      className="flex items-start gap-3 text-slate-700 dark:text-slate-300"
                      data-testid={`takeaway-${index}`}
                    >
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#6443F4] text-white text-sm font-semibold flex items-center justify-center mt-0.5">
                        {index + 1}
                      </span>
                      <span className="text-base md:text-lg">{takeaway}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* 7. FAQ Section */}
            {faqs?.length > 0 && (
              <section className="mt-12" data-testid="section-faq">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-6">
                  Frequently Asked Questions
                </h2>
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq, index) => (
                    <AccordionItem 
                      key={index} 
                      value={`faq-${index}`}
                      className="border-slate-200 dark:border-slate-700"
                      data-testid={`faq-item-${index}`}
                    >
                      <AccordionTrigger 
                        className="text-left text-base md:text-lg font-medium text-slate-900 dark:text-white py-4 hover:no-underline hover:text-[#6443F4]"
                        data-testid={`faq-trigger-${index}`}
                      >
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent 
                        className="text-slate-600 dark:text-slate-400 text-base leading-relaxed pb-4"
                        data-testid={`faq-content-${index}`}
                      >
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            )}
          </div>
        </div>
      </div>

      {/* 8. CTA Section */}
      <section 
        className="bg-gradient-to-r from-[#6443F4] to-[#5339D9] py-16 md:py-20"
        data-testid="section-cta"
      >
        <div className="max-w-4xl mx-auto px-5 md:px-8 text-center">
          <Plane className="w-12 h-12 text-white/80 mx-auto mb-4" />
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4">
            {ctaTitle}
          </h2>
          <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
            Ready to experience this destination? Start planning your perfect trip today.
          </p>
          <Link href={ctaButtonUrl}>
            <Button 
              size="lg" 
              className="bg-white text-[#6443F4] hover:bg-white/90 rounded-full px-8 py-6 text-lg font-semibold"
              data-testid="button-cta"
            >
              {ctaButtonText}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* 9. Related Content */}
      {relatedArticles?.length > 0 && (
        <section 
          className="bg-slate-50 dark:bg-slate-900 py-16 md:py-20"
          data-testid="section-related"
        >
          <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-[140px]">
            <div className="flex items-center justify-between gap-4 mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                Related Articles
              </h2>
              <Link href="/articles">
                <Button variant="ghost" className="text-[#6443F4]" data-testid="button-view-all">
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedArticles.slice(0, 4).map((article) => (
                <Link key={article.id} href={`/articles/${article.slug}`}>
                  <Card 
                    className="overflow-visible bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 h-full hover-elevate"
                    data-testid={`related-card-${article.id}`}
                  >
                    {article.heroImage && (
                      <div className="relative aspect-video overflow-hidden rounded-t-lg">
                        <img
                          src={article.heroImage}
                          alt={article.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                          data-testid={`related-img-${article.id}`}
                        />
                        {article.category && (
                          <Badge 
                            className="absolute top-3 left-3 bg-[#6443F4] text-white border-none text-xs"
                            data-testid={`related-badge-${article.id}`}
                          >
                            {article.category}
                          </Badge>
                        )}
                      </div>
                    )}
                    <CardContent className="p-4">
                      <h3 
                        className="font-semibold text-slate-900 dark:text-white line-clamp-2 mb-2"
                        data-testid={`related-title-${article.id}`}
                      >
                        {article.title}
                      </h3>
                      {article.readTime && (
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{article.readTime}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 10. Author Bio + Share Buttons */}
      <section 
        className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 py-12 md:py-16"
        data-testid="section-author"
      >
        <div className="max-w-4xl mx-auto px-5 md:px-8 lg:px-[140px]">
          <div className="flex flex-col md:flex-row items-start gap-6 md:gap-8">
            {/* Author Info */}
            <div className="flex items-start gap-4 flex-1">
              <Avatar className="w-16 h-16 md:w-20 md:h-20">
                {author.avatar ? (
                  <AvatarImage src={author.avatar} alt={author.name} data-testid="img-author-avatar" />
                ) : (
                  <AvatarFallback className="bg-[#6443F4] text-white text-xl">
                    {author.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Written by</p>
                <h3 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-white" data-testid="text-author-name">
                  {author.name}
                </h3>
                {author.role && (
                  <p className="text-sm text-[#6443F4] font-medium mb-2" data-testid="text-author-role">
                    {author.role}
                  </p>
                )}
                {author.bio && (
                  <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base leading-relaxed" data-testid="text-author-bio">
                    {author.bio}
                  </p>
                )}
              </div>
            </div>
            
            {/* Share Buttons */}
            <div className="flex flex-col items-start md:items-end">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Share this article</p>
              <div className="flex items-center gap-2" data-testid="share-buttons">
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Share on Facebook"
                >
                  <Button 
                    size="icon" 
                    variant="outline" 
                    className="rounded-full"
                    data-testid="button-share-facebook"
                  >
                    <Facebook className="w-4 h-4" />
                  </Button>
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Share on Twitter"
                >
                  <Button 
                    size="icon" 
                    variant="outline" 
                    className="rounded-full"
                    data-testid="button-share-twitter"
                  >
                    <Twitter className="w-4 h-4" />
                  </Button>
                </a>
                <a
                  href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Share on LinkedIn"
                >
                  <Button 
                    size="icon" 
                    variant="outline" 
                    className="rounded-full"
                    data-testid="button-share-linkedin"
                  >
                    <Linkedin className="w-4 h-4" />
                  </Button>
                </a>
                <Button 
                  size="icon" 
                  variant="outline" 
                  className="rounded-full"
                  onClick={handleCopyLink}
                  aria-label="Copy link"
                  data-testid="button-copy-link"
                >
                  {copied ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Link2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </article>
  );
}
