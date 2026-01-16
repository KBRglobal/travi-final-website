import { Link } from "wouter";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface NewsFeedPreviewProps {
  articles: ReactNode | null;
  viewAllLink: string;
}

export function NewsFeedPreview({ articles, viewAllLink }: NewsFeedPreviewProps) {
  if (!articles) {
    return null;
  }

  return (
    <section 
      className="container mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14"
      data-testid="section-news-feed-preview"
    >
      <div className="flex items-center justify-between gap-4 mb-8 md:mb-10">
        <h2 
          className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight"
          style={{ fontFamily: "'Chillax', var(--font-sans)" }}
        >
          {null}
        </h2>
        <Link href={viewAllLink}>
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
            {null}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {articles}
      </div>
    </section>
  );
}
