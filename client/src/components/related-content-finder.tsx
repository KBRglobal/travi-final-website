import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Link2,
  Search,
  MapPin,
  Building2,
  FileText,
  Utensils,
  CalendarDays,
  Plus,
  ExternalLink,
  Tag,
  Percent,
} from "lucide-react";
import type { ContentWithRelations } from "@shared/schema";

interface RelatedContentFinderProps {
  currentContentId?: string;
  currentTitle: string;
  currentType: string;
  currentTags?: Array<{ id: string; name: string }>;
  onInsertLink?: (url: string, title: string) => void;
}

const contentTypeIcons: Record<string, React.ElementType> = {
  attraction: MapPin,
  hotel: Building2,
  article: FileText,
  dining: Utensils,
  event: CalendarDays,
};

const contentTypeColors: Record<string, string> = {
  attraction: "bg-blue-100 text-blue-700",
  hotel: "bg-[#6443F4]/10 text-[#6443F4]",
  article: "bg-green-100 text-green-700",
  dining: "bg-rose-100 text-rose-700",
  event: "bg-[#6443F4]/10 text-[#6443F4]",
};

// Calculate relevance score between two contents
function calculateRelevance(
  contents: ContentWithRelations,
  currentTitle: string,
  currentType: string,
  currentTags: Array<{ id: string; name: string }>
): number {
  let score = 0;

  // Same type bonus
  if (contents.type === currentType) {
    score += 20;
  }

  // Tag overlap
  const contentTagIds = contents.tags?.map((t) => t.id) || [];
  const currentTagIds = currentTags.map((t) => t.id);
  const tagOverlap = contentTagIds.filter((id) => currentTagIds.includes(id)).length;
  score += tagOverlap * 15;

  // Title word overlap
  const currentWords = currentTitle.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const contentWords = (contents.title || "").toLowerCase().split(/\s+/);
  const wordOverlap = currentWords.filter((w) => contentWords.includes(w)).length;
  score += wordOverlap * 10;

  // Published contents bonus
  if (contents.status === "published") {
    score += 10;
  }

  // High SEO score bonus
  if (contents.seoScore && contents.seoScore >= 70) {
    score += 5;
  }

  return Math.min(score, 100);
}

export function RelatedContentFinder({
  currentContentId,
  currentTitle,
  currentType,
  currentTags = [],
  onInsertLink,
}: RelatedContentFinderProps) {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all contents
  const { data: contents = [] } = useQuery<ContentWithRelations[]>({
    queryKey: ["/api/contents"],
  });

  // Calculate related contents with relevance scores
  const relatedContent = useMemo(() => {
    return contents
      .filter((c) => c.id !== currentContentId && c.status === "published")
      .map((contents) => ({
        ...contents,
        relevance: calculateRelevance(contents, currentTitle, currentType, currentTags),
      }))
      .filter((c) => {
        if (!searchQuery) return c.relevance > 0;
        const query = searchQuery.toLowerCase();
        return (
          c.title?.toLowerCase().includes(query) ||
          c.slug?.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 20);
  }, [contents, currentContentId, currentTitle, currentType, currentTags, searchQuery]);

  // Group by relevance
  const highRelevance = relatedContent.filter((c) => c.relevance >= 50);
  const mediumRelevance = relatedContent.filter(
    (c) => c.relevance >= 20 && c.relevance < 50
  );
  const lowRelevance = relatedContent.filter((c) => c.relevance < 20);

  const handleInsertLink = (contents: ContentWithRelations) => {
    if (onInsertLink) {
      const pathMap: Record<string, string> = {
        attraction: "attractions",
        hotel: "hotels",
        article: "articles",
        dining: "dining",
        event: "events",
      };
      const url = `/${pathMap[contents.type] || contents.type}/${contents.slug}`;
      onInsertLink(url, contents.title || "");
    }
  };

  const handleViewContent = (contents: ContentWithRelations) => {
    navigate(`/admin/${contents.type}s/${contents.id}`);
    setOpen(false);
  };

  const renderContentItem = (contents: ContentWithRelations & { relevance: number }) => {
    const Icon = contentTypeIcons[contents.type] || FileText;
    const colorClass = contentTypeColors[contents.type] || "bg-gray-100 text-gray-700";

    return (
      <div
        key={contents.id}
        className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${colorClass}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium truncate">{contents.title}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              /{contents.slug}
            </p>
            {contents.tags && contents.tags.length > 0 && (
              <div className="flex items-center gap-1 mt-2 flex-wrap">
                {contents.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag.id} variant="outline" className="text-xs">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag.name}
                  </Badge>
                ))}
                {contents.tags.length > 3 && (
                  <span className="text-xs text-muted-foreground">
                    +{contents.tags.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge
              variant="secondary"
              className={`text-xs ${
                contents.relevance >= 50
                  ? "bg-green-100 text-green-700"
                  : contents.relevance >= 20
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              <Percent className="h-3 w-3 mr-1" />
              {contents.relevance}%
            </Badge>
            <div className="flex gap-1">
              {onInsertLink && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleInsertLink(contents)}
                  title="Insert link"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleViewContent(contents)}
                title="View contents"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Link2 className="h-4 w-4" />
          Related Content
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[450px] sm:max-w-[450px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Related Content Finder
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Current Content Info */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Finding contents related to:</p>
            <p className="text-sm font-medium">{currentTitle || "Untitled"}</p>
            {currentTags.length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {currentTags.map((tag) => (
                  <Badge key={tag.id} variant="secondary" className="text-xs">
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Results */}
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-4">
              {/* High Relevance */}
              {highRelevance.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Highly Relevant ({highRelevance.length})
                  </h3>
                  <div className="space-y-2">
                    {highRelevance.map(renderContentItem)}
                  </div>
                </div>
              )}

              {/* Medium Relevance */}
              {mediumRelevance.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-yellow-700 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                    Somewhat Related ({mediumRelevance.length})
                  </h3>
                  <div className="space-y-2">
                    {mediumRelevance.map(renderContentItem)}
                  </div>
                </div>
              )}

              {/* Low Relevance */}
              {lowRelevance.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gray-400" />
                    Other Content ({lowRelevance.length})
                  </h3>
                  <div className="space-y-2">
                    {lowRelevance.map(renderContentItem)}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {relatedContent.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Link2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No related contents found</p>
                  <p className="text-xs mt-1">Try adding tags to find related contents</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
