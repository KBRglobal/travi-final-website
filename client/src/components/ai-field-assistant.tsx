import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sparkles, Loader2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export type FieldType = 
  | "metaTitle" 
  | "metaDescription" 
  | "keyword" 
  | "intro" 
  | "expandedIntro" 
  | "tips" 
  | "highlights" 
  | "quickInfo" 
  | "altText"
  | "secondaryKeywords"
  | "internalLinks"
  | "externalLinks";

interface AIFieldAssistantProps {
  readonly fieldName: string;
  readonly fieldType: FieldType;
  readonly currentValue: string;
  readonly contentContext: {
    readonly title: string;
    readonly contentType: string;
    readonly primaryKeyword?: string;
  };
  readonly onApply: (value: string) => void;
  readonly maxLength?: number;
  readonly disabled?: boolean;
}

export function AIFieldAssistant({
  fieldName,
  fieldType,
  currentValue,
  contentContext,
  onApply,
  maxLength,
  disabled = false,
}: AIFieldAssistantProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [appliedIndex, setAppliedIndex] = useState<number | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setLoading(true);
    setAppliedIndex(null);
    
    try {
      const response = await apiRequest(
        "POST",
        "/api/ai/generate-field",
        {
          fieldType,
          currentValue,
          title: contentContext.title,
          contentType: contentContext.contentType,
          primaryKeyword: contentContext.primaryKeyword,
          maxLength,
        }
      );
      
      const data = await response.json() as { suggestions: string[] };
      
      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
      } else {
        toast({
          title: "No suggestions",
          description: "Unable to generate suggestions at this time",
          variant: "destructive",
        });
      }
    } catch (error: unknown) {
      // Extract meaningful error message
      let errorMessage = "Failed to generate suggestions";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      } else if (error && typeof error === "object" && "message" in error) {
        errorMessage = String((error as { message: unknown }).message);
      }
      
      console.error("Error generating field suggestions:", errorMessage, error);
      toast({
        title: "Generation failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (suggestion: string, index: number) => {
    onApply(suggestion);
    setAppliedIndex(index);
    toast({
      title: "Applied",
      description: `${fieldName} updated successfully`,
    });
    
    // Close popover after a brief moment
    setTimeout(() => {
      setOpen(false);
      setSuggestions([]);
      setAppliedIndex(null);
    }, 1000);
  };

  const getFieldLabel = () => {
    const labels: Record<FieldType, string> = {
      metaTitle: "Meta Title",
      metaDescription: "Meta Description",
      keyword: "Primary Keyword",
      intro: "Intro Text",
      expandedIntro: "Expanded Intro",
      tips: "Tips",
      highlights: "Highlights",
      quickInfo: "Quick Info",
      altText: "Alt Text",
      secondaryKeywords: "Secondary Keywords",
      internalLinks: "Internal Links",
      externalLinks: "External Links",
    };
    return labels[fieldType];
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          AI Assist
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-4" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">
              AI Suggestions for {getFieldLabel()}
            </h4>
            {maxLength && (
              <Badge variant="outline" className="text-xs">
                Max {maxLength} chars
              </Badge>
            )}
          </div>

          {suggestions.length === 0 && !loading && (
            <div className="text-center py-6">
              <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Generate AI-powered suggestions for this field
              </p>
              <Button onClick={handleGenerate} size="sm">
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Suggestions
              </Button>
            </div>
          )}

          {loading && (
            <div className="text-center py-6">
              <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Generating suggestions...
              </p>
            </div>
          )}

          {suggestions.length > 0 && !loading && (
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={`${fieldType}-suggestion-${index}`}
                    className="border rounded-lg p-3 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm">{suggestion}</p>
                        {maxLength && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {suggestion.length} / {maxLength} chars
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={appliedIndex === index ? "default" : "outline"}
                        onClick={() => handleApply(suggestion, index)}
                        disabled={appliedIndex !== null}
                        className="shrink-0"
                      >
                        {appliedIndex === index ? (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Applied
                          </>
                        ) : (
                          "Apply"
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {suggestions.length > 0 && (
            <div className="flex justify-between pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGenerate}
                disabled={loading}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Regenerate
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOpen(false);
                  setSuggestions([]);
                  setAppliedIndex(null);
                }}
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
