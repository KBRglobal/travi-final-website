import { useState, useCallback } from "react";
import { Sparkles, Loader2, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

/**
 * Magic field types supported by the Octypo Magic Engine
 */
export type MagicFieldType =
  // Text fields
  | "title"
  | "headline"
  | "subtitle"
  | "description"
  | "summary"
  | "tldr"
  | "body_content"
  | "intro_paragraph"
  | "tagline"
  // SEO fields
  | "meta_title"
  | "meta_description"
  | "slug"
  | "keywords"
  | "alt_text"
  | "og_title"
  | "og_description"
  // Tourism specific
  | "coordinates"
  | "address"
  | "price_range"
  | "opening_hours"
  | "amenities"
  | "highlights"
  | "tips"
  | "transport_info"
  | "directions"
  // Social
  | "social_facebook"
  | "social_twitter"
  | "social_instagram"
  | "social_linkedin"
  | "push_notification"
  | "newsletter_subject"
  | "hashtags"
  // Complex
  | "faqs"
  | "sections"
  | "gallery_images"
  | "related_items"
  | "internal_links"
  | "toc_generate"
  // Research
  | "research_single"
  | "list_research"
  | "list_generate"
  | "boolean_research"
  | "auto_detect"
  | "auto_categorize"
  | "auto_tag"
  | "keyword_research"
  | "color_extract"
  | "image_search"
  | "entity_extract"
  | "affiliate_link"
  | "link_research"
  // CTA
  | "cta_text"
  | "cta_headline"
  | "helper_text"
  // News
  | "news_headline"
  | "news_body"
  | "headline_variants"
  | "auto_tier"
  // Marketing
  | "push_title"
  | "push_body"
  | "preheader"
  | "newsletter_body"
  // Media
  | "caption"
  | "image_tags"
  | "image_title";

/**
 * Content type for the entity being edited
 */
export type MagicContentType =
  | "destination"
  | "hotel"
  | "attraction"
  | "restaurant"
  | "article"
  | "news"
  | "event"
  | "page";

/**
 * Context provided to the Magic API for field generation
 */
export interface MagicContext {
  contentType: MagicContentType;
  entityName?: string;
  parentDestination?: string;
  existingFields: Record<string, unknown>;
  locale?: string;
}

/**
 * Response from the Magic API
 */
export interface MagicFieldResponse {
  success: boolean;
  value: unknown;
  confidence?: number;
  alternatives?: unknown[];
  error?: string;
}

/**
 * Props for the MagicButton component
 */
export interface MagicButtonProps {
  /** Unique identifier for the field */
  fieldId: string;
  /** Type of content to generate */
  fieldType: MagicFieldType;
  /** Context data for AI generation */
  context: MagicContext;
  /** Callback with the generated value */
  onResult: (value: unknown) => void;
  /** Optional callback for alternative suggestions */
  onAlternatives?: (alternatives: unknown[]) => void;
  /** Disable the button */
  disabled?: boolean;
  /** Button size variant */
  size?: "sm" | "md" | "lg";
  /** Additional CSS classes */
  className?: string;
}

/**
 * Size configuration for button variants
 */
const sizeConfig = {
  sm: {
    button: "h-6 w-6",
    icon: "h-3 w-3",
  },
  md: {
    button: "h-8 w-8",
    icon: "h-4 w-4",
  },
  lg: {
    button: "h-10 w-10",
    icon: "h-5 w-5",
  },
} as const;

/**
 * Universal Magic Button Component
 *
 * A reusable button that generates AI content for any field type.
 * Shows a sparkle icon with loading state, calls the Octypo Magic API,
 * and returns generated values via callback.
 *
 * @example
 * ```tsx
 * <MagicButton
 *   fieldId="hotel-description"
 *   fieldType="description"
 *   context={{
 *     contentType: 'hotel',
 *     entityName: 'Marriott Sofia',
 *     existingFields: { name: 'Marriott Sofia', starRating: 5 }
 *   }}
 *   onResult={(value) => setDescription(value as string)}
 *   size="sm"
 * />
 * ```
 */
export function MagicButton({
  fieldId,
  fieldType,
  context,
  onResult,
  onAlternatives,
  disabled = false,
  size = "md",
  className,
}: MagicButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [alternatives, setAlternatives] = useState<unknown[]>([]);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const { toast } = useToast();

  const config = sizeConfig[size];

  const handleGenerate = useCallback(async () => {
    if (isLoading || disabled) return;

    setIsLoading(true);
    setAlternatives([]);
    setShowAlternatives(false);

    try {
      const response = await apiRequest("POST", "/api/octypo/magic/field", {
        fieldType,
        context: {
          contentType: context.contentType,
          entityName: context.entityName,
          parentDestination: context.parentDestination,
          existingFields: context.existingFields,
          locale: context.locale || "en",
        },
      });

      const data: MagicFieldResponse = await response.json();

      if (data.success && data.value !== undefined) {
        onResult(data.value);

        // Handle alternatives if available
        if (data.alternatives && data.alternatives.length > 0) {
          setAlternatives(data.alternatives);
          onAlternatives?.(data.alternatives);
          setShowAlternatives(true);
        }

        toast({
          title: "Generated",
          description: `${fieldType.replace(/_/g, " ")} generated successfully`,
        });
      } else {
        throw new Error(data.error || "Failed to generate content");
      }
    } catch (error) {
      console.error("Magic generation error:", error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate content",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, disabled, fieldType, context, onResult, onAlternatives, toast]);

  const handleSelectAlternative = useCallback(
    (alternative: unknown) => {
      onResult(alternative);
      setShowAlternatives(false);
      toast({
        title: "Applied",
        description: "Alternative suggestion applied",
      });
    },
    [onResult, toast]
  );

  // If we have alternatives, show a dropdown
  if (alternatives.length > 0 && showAlternatives) {
    return (
      <TooltipProvider>
        <DropdownMenu open={showAlternatives} onOpenChange={setShowAlternatives}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={disabled || isLoading}
                  className={cn(
                    config.button,
                    "relative text-purple-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30",
                    className
                  )}
                  data-testid={`magic-button-${fieldId}`}
                >
                  <Sparkles className={cn(config.icon)} />
                  <ChevronDown className="h-2 w-2 absolute bottom-0 right-0" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>View alternatives</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-64 max-h-72 overflow-y-auto">
            <DropdownMenuLabel className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              Alternative Suggestions
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {alternatives.map((alt, index) => (
              <DropdownMenuItem
                key={index}
                onClick={() => handleSelectAlternative(alt)}
                className="cursor-pointer"
              >
                <Check className="h-4 w-4 mr-2 opacity-0 group-hover:opacity-100" />
                <span className="truncate text-sm">
                  {typeof alt === "string"
                    ? alt.length > 60
                      ? `${alt.slice(0, 60)}...`
                      : alt
                    : JSON.stringify(alt).slice(0, 60)}
                </span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleGenerate} className="cursor-pointer text-purple-600">
              <Sparkles className="h-4 w-4 mr-2" />
              Regenerate
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipProvider>
    );
  }

  // Default button without alternatives
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled || isLoading}
            onClick={handleGenerate}
            className={cn(
              config.button,
              "relative text-purple-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30",
              isLoading && "animate-pulse",
              className
            )}
            data-testid={`magic-button-${fieldId}`}
          >
            {isLoading ? (
              <Loader2 className={cn(config.icon, "animate-spin")} />
            ) : (
              <Sparkles className={config.icon} />
            )}
            {isLoading && (
              <span className="absolute inset-0 rounded-md bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 animate-pulse" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>Generate with AI</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default MagicButton;
