import { Calendar, Clock, MapPin, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export interface ArticleSection {
  id: string;
  title: string;
  content: string;
}

export interface RelatedArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  readTime: string;
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
  author: {
    name: string;
    role: string;
  };
  readTime: string;
  excerpt: string;
  quickInfo?: {
    location?: string;
    duration?: string;
    bestTime?: string;
  };
  sections: ArticleSection[];
  keyTakeaways?: string[];
  relatedArticles?: RelatedArticle[];
}

export default function ArticlePage({
  title,
  heroImage,
  category,
  publishedAt,
  author,
  readTime,
  excerpt,
  quickInfo,
  sections,
  keyTakeaways,
  relatedArticles,
}: ArticlePageProps) {
  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="relative aspect-[16/9] overflow-hidden rounded-xl mb-8">
        <img
          src={heroImage.src}
          alt={heroImage.alt}
          className="w-full h-full object-cover"
          loading="eager"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6">
          <Badge variant="secondary" className="mb-3">
            {category}
          </Badge>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">
            {title}
          </h1>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4" />
          <span>{author.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <time dateTime={publishedAt}>
            {new Date(publishedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span>{readTime}</span>
        </div>
      </div>

      <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
        {excerpt}
      </p>

      {quickInfo && (
        <Card className="mb-8 bg-muted/50">
          <CardContent className="p-6">
            <h2 className="font-semibold text-lg mb-4">Quick Info</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {quickInfo.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">{quickInfo.location}</p>
                  </div>
                </div>
              )}
              {quickInfo.duration && (
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Travel Time</p>
                    <p className="text-sm text-muted-foreground">{quickInfo.duration}</p>
                  </div>
                </div>
              )}
              {quickInfo.bestTime && (
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Best Time</p>
                    <p className="text-sm text-muted-foreground">{quickInfo.bestTime}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <nav className="mb-8 p-4 bg-muted/30 rounded-lg" aria-label="Table of contents">
        <h2 className="font-semibold mb-3">In This Guide</h2>
        <ul className="space-y-2">
          {sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {section.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="prose prose-slate dark:prose-invert max-w-none">
        {sections.map((section) => (
          <section key={section.id} id={section.id} className="mb-12 scroll-mt-24">
            <h2 className="text-2xl font-bold text-foreground mb-4">{section.title}</h2>
            <div
              className="text-muted-foreground [&_p]:mb-4 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground [&_ul]:mb-4 [&_li]:mb-1"
              dangerouslySetInnerHTML={{ __html: section.content }}
            />
          </section>
        ))}
      </div>

      {keyTakeaways && keyTakeaways.length > 0 && (
        <Card className="my-8 border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <h2 className="font-semibold text-lg mb-4">Key Takeaways</h2>
            <ul className="space-y-2">
              {keyTakeaways.map((takeaway, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  <span className="text-sm">{takeaway}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {relatedArticles && relatedArticles.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold mb-6">Related Guides</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {relatedArticles.map((article) => (
              <Card key={article.id} className="hover-elevate transition-all">
                <CardContent className="p-4">
                  <Badge variant="outline" className="mb-2 text-xs">
                    {article.category}
                  </Badge>
                  <h3 className="font-semibold text-sm mb-2 line-clamp-2">{article.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {article.excerpt}
                  </p>
                  <span className="text-xs text-muted-foreground">{article.readTime}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
