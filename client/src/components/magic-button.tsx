import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

export type MagicFieldType =
  // Text fields
  | "title"
  | "headline"
  | "subtitle"
  | "description"
  | "summary"
  | "tldr"
  | "body_content"
  // SEO fields
  | "meta_title"
  | "meta_description"
  | "slug"
  | "keywords"
  | "alt_text"
  // Tourism specific
  | "coordinates"
  | "address"
  | "price_range"
  | "opening_hours"
  | "amenities"
  | "highlights"
  | "tips"
  | "transport_info"
  | "transport_overview"
  | "transport_modes"
  | "transit_card"
  | "taxi_apps"
  | "taxi_info"
  | "airport_info"
  | "bike_share"
  | "walkability"
  // Research types
  | "research_single"
  | "list_research"
  | "boolean_research"
  // Social
  | "social_facebook"
  | "social_twitter"
  | "social_instagram"
  | "push_notification"
  | "newsletter_subject"
  // Complex
  | "faqs"
  | "sections"
  | "gallery_images"
  | "related_items";

export interface MagicContext {
  contentType:
    | "destination"
    | "hotel"
    | "attraction"
    | "restaurant"
    | "article"
    | "news"
    | "event"
    | "page";
  entityName?: string;
  parentDestination?: string;
  existingFields: Record<string, unknown>;
  locale?: string;
}

export interface MagicButtonProps {
  fieldId: string;
  fieldType: MagicFieldType;
  context: MagicContext;
  onResult: (value: unknown) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

interface MagicResponse {
  success: boolean;
  value: unknown;
  confidence?: number;
  alternatives?: unknown[];
  error?: string;
}

export function MagicButton({
  fieldId,
  fieldType,
  context,
  onResult,
  disabled = false,
  size = "sm",
  className,
}: MagicButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleClick = async () => {
    setIsGenerating(true);

    try {
      const response = await apiRequest("/api/octypo/magic/field", {
        method: "POST",
        body: {
          fieldType,
          fieldId,
          context,
        },
      });

      const data: MagicResponse = await response.json();

      if (data.success && data.value !== undefined) {
        onResult(data.value);
        toast({
          title: "Magic complete",
          description: `${fieldId} has been generated successfully.`,
        });
      } else {
        throw new Error(data.error || "Failed to generate content");
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate content",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const sizeClasses = {
    sm: "h-7 w-7",
    md: "h-8 w-8",
    lg: "h-9 w-9",
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={disabled || isGenerating}
      className={cn(
        sizeClasses[size],
        "text-purple-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950",
        isGenerating && "animate-pulse",
        className
      )}
      title={`Generate ${fieldId} with AI`}
      data-testid={`magic-button-${fieldId}`}
    >
      {isGenerating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
    </Button>
  );
}

export interface MagicAllButtonProps {
  contentType: MagicContext["contentType"];
  entityName: string;
  existingFields: Record<string, unknown>;
  fields: string[];
  onResults: (results: Record<string, unknown>) => void;
  disabled?: boolean;
  className?: string;
}

interface MagicAllResponse {
  success: boolean;
  fields: Record<string, unknown>;
  metadata?: {
    sources?: string[];
    confidence?: number;
    tokensUsed?: number;
    processingTimeMs?: number;
  };
  error?: string;
}

export function MagicAllButton({
  contentType,
  entityName,
  existingFields,
  fields,
  onResults,
  disabled = false,
  className,
}: MagicAllButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleClick = async () => {
    setIsGenerating(true);

    try {
      const response = await apiRequest("/api/octypo/magic/batch", {
        method: "POST",
        body: {
          contentType,
          entityName,
          existingFields,
          fields,
        },
      });

      const data: MagicAllResponse = await response.json();

      if (data.success && data.fields) {
        onResults(data.fields);
        toast({
          title: "Magic All complete",
          description: `${Object.keys(data.fields).length} fields have been generated successfully.`,
        });
      } else {
        throw new Error(data.error || "Failed to generate content");
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate content",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={disabled || isGenerating}
      className={cn(
        "gap-2 border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-950",
        isGenerating && "animate-pulse",
        className
      )}
      data-testid="magic-all-button"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          Magic All
        </>
      )}
    </Button>
  );
}
