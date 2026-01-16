import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  Lightbulb,
  TrendingUp,
  Target,
  Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AITitleSuggestionsProps {
  currentTitle: string;
  contentType: string;
  contentBody?: string;
  onSelectTitle: (title: string) => void;
}

interface TitleSuggestion {
  title: string;
  style: "seo" | "emotional" | "question" | "power" | "listicle";
  score: number;
}

const styleIcons = {
  seo: Target,
  emotional: Lightbulb,
  question: Zap,
  power: TrendingUp,
  listicle: Sparkles,
};

const styleLabels = {
  seo: "SEO Optimized",
  emotional: "Emotional Hook",
  question: "Question",
  power: "Power Words",
  listicle: "Listicle",
};

const styleColors = {
  seo: "bg-blue-100 text-blue-700",
  emotional: "bg-[#6443F4]/10 text-[#6443F4]",
  question: "bg-[#6443F4]/10 text-[#6443F4]",
  power: "bg-orange-100 text-orange-700",
  listicle: "bg-green-100 text-green-700",
};

// Generate title suggestions locally (can be replaced with API call)
function generateTitleSuggestions(
  currentTitle: string,
  contentType: string,
  contentBody?: string
): TitleSuggestion[] {
  const suggestions: TitleSuggestion[] = [];
  const baseKeywords = currentTitle.toLowerCase().split(" ").filter(w => w.length > 3);

  // SEO Optimized
  if (contentType === "attraction") {
    suggestions.push({
      title: `${currentTitle}: Complete 2025 Visitor Guide`,
      style: "seo",
      score: 92,
    });
    suggestions.push({
      title: `${currentTitle} Dubai - Tickets, Tips & What to Expect`,
      style: "seo",
      score: 88,
    });
  } else if (contentType === "hotel") {
    suggestions.push({
      title: `${currentTitle} Review: Is It Worth the Price?`,
      style: "seo",
      score: 90,
    });
    suggestions.push({
      title: `${currentTitle} Dubai - Honest Review & Booking Tips`,
      style: "seo",
      score: 87,
    });
  } else if (contentType === "dining") {
    suggestions.push({
      title: `${currentTitle}: Menu, Prices & Reservation Guide`,
      style: "seo",
      score: 89,
    });
  } else if (contentType === "article") {
    suggestions.push({
      title: `${currentTitle} - Everything You Need to Know`,
      style: "seo",
      score: 85,
    });
  } else {
    suggestions.push({
      title: `${currentTitle}: The Ultimate Guide`,
      style: "seo",
      score: 86,
    });
  }

  // Emotional Hook
  suggestions.push({
    title: `Why ${currentTitle} Will Take Your Breath Away`,
    style: "emotional",
    score: 78,
  });

  // Question Style
  suggestions.push({
    title: `Is ${currentTitle} Worth Visiting? Here's the Truth`,
    style: "question",
    score: 82,
  });

  // Power Words
  suggestions.push({
    title: `The Ultimate ${currentTitle} Experience You Can't Miss`,
    style: "power",
    score: 80,
  });

  // Listicle
  suggestions.push({
    title: `10 Things to Know Before Visiting ${currentTitle}`,
    style: "listicle",
    score: 84,
  });

  return suggestions.sort((a, b) => b.score - a.score);
}

export function AITitleSuggestions({
  currentTitle,
  contentType,
  contentBody,
  onSelectTitle,
}: AITitleSuggestionsProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<TitleSuggestion[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [customContext, setCustomContext] = useState("");

  const generateMutation = useMutation({
    mutationFn: async () => {
      // For now, generate locally. Can be replaced with API call to AI service
      return generateTitleSuggestions(currentTitle, contentType, contentBody);
    },
    onSuccess: (data) => {
      setSuggestions(data);
    },
  });

  const handleGenerate = () => {
    if (!currentTitle.trim()) {
      toast({
        title: "Enter a title first",
        description: "Please enter a base title to generate suggestions",
        variant: "destructive",
      });
      return;
    }
    generateMutation.mutate();
  };

  const handleCopy = (title: string, index: number) => {
    navigator.clipboard.writeText(title);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSelect = (title: string) => {
    onSelectTitle(title);
    setOpen(false);
    toast({
      title: "Title applied",
      description: "The suggested title has been applied",
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Sparkles className="h-4 w-4" />
          AI Titles
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[450px] p-4" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Title Suggestions
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Get SEO-optimized title ideas
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : suggestions.length > 0 ? (
                <RefreshCw className="h-4 w-4" />
              ) : (
                "Generate"
              )}
            </Button>
          </div>

          {/* Current Title Display */}
          <div className="p-2 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Current title:</p>
            <p className="text-sm font-medium">{currentTitle || "No title yet"}</p>
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {suggestions.map((suggestion, index) => {
                const Icon = styleIcons[suggestion.style];
                return (
                  <div
                    key={index}
                    className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium leading-tight">
                          {suggestion.title}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge
                            variant="secondary"
                            className={`text-xs ${styleColors[suggestion.style]}`}
                          >
                            <Icon className="h-3 w-3 mr-1" />
                            {styleLabels[suggestion.style]}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Score: {suggestion.score}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleCopy(suggestion.title, index)}
                        >
                          {copiedIndex === index ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleSelect(suggestion.title)}
                        >
                          Use
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {suggestions.length === 0 && !generateMutation.isPending && (
            <div className="text-center py-6 text-muted-foreground">
              <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Click "Generate" to get AI title suggestions</p>
            </div>
          )}

          {/* Loading State */}
          {generateMutation.isPending && (
            <div className="text-center py-6">
              <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
              <p className="text-sm text-muted-foreground mt-2">
                Generating suggestions...
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
