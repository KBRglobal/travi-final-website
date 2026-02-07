import { useState, useCallback } from "react";
import { Sparkles, Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import type { MagicContentType, MagicFieldType } from "./magic-button";

/**
 * Field configuration for batch generation
 */
export interface MagicFieldConfig {
  /** Field identifier */
  fieldId: string;
  /** Type of content to generate */
  fieldType: MagicFieldType;
  /** Human-readable label */
  label: string;
  /** Whether to include in generation (default: true) */
  enabled?: boolean;
}

/**
 * Response from Magic All API
 */
export interface MagicAllResponse {
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

/**
 * Progress state for batch generation
 */
export interface MagicAllProgress {
  total: number;
  completed: number;
  current?: string;
  failed: string[];
}

/**
 * Props for the MagicAllButton component
 */
export interface MagicAllButtonProps {
  /** Content type being edited */
  contentType: MagicContentType;
  /** Primary input (e.g., entity name) */
  entityName: string;
  /** Parent destination for hierarchical content */
  parentDestination?: string;
  /** Fields to generate */
  fields: MagicFieldConfig[];
  /** Current field values */
  existingFields: Record<string, unknown>;
  /** Callback with all generated values */
  onResult: (fields: Record<string, unknown>) => void;
  /** Fields to exclude from generation */
  excludeFields?: string[];
  /** Generation mode */
  mode?: "quick" | "full" | "premium";
  /** Locale for generation */
  locale?: string;
  /** Disable the button */
  disabled?: boolean;
  /** Button variant */
  variant?: "default" | "outline" | "ghost";
  /** Button size */
  size?: "sm" | "md" | "lg";
  /** Additional CSS classes */
  className?: string;
  /** Show confirmation dialog before generating */
  showConfirmation?: boolean;
}

/**
 * Size configuration for button variants
 */
const sizeConfig = {
  sm: {
    button: "h-8 text-xs",
    icon: "h-3.5 w-3.5",
  },
  md: {
    button: "h-9 text-sm",
    icon: "h-4 w-4",
  },
  lg: {
    button: "h-10 text-base",
    icon: "h-5 w-5",
  },
} as const;

/**
 * Magic All Button Component
 *
 * A button that generates AI content for ALL fields at once.
 * Shows a progress dialog during generation and calls a single
 * API endpoint that returns all field values.
 *
 * @example
 * ```tsx
 * <MagicAllButton
 *   contentType="hotel"
 *   entityName="Marriott Sofia"
 *   fields={[
 *     { fieldId: 'description', fieldType: 'description', label: 'Description' },
 *     { fieldId: 'slug', fieldType: 'slug', label: 'URL Slug' },
 *     { fieldId: 'metaTitle', fieldType: 'meta_title', label: 'Meta Title' },
 *   ]}
 *   existingFields={{ name: 'Marriott Sofia' }}
 *   onResult={(fields) => {
 *     setDescription(fields.description);
 *     setSlug(fields.slug);
 *     setMetaTitle(fields.metaTitle);
 *   }}
 * />
 * ```
 */
export function MagicAllButton({
  contentType,
  entityName,
  parentDestination,
  fields,
  existingFields,
  onResult,
  excludeFields = [],
  mode = "full",
  locale = "en",
  disabled = false,
  variant = "outline",
  size = "md",
  className,
  showConfirmation = true,
}: MagicAllButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [progress, setProgress] = useState<MagicAllProgress>({
    total: 0,
    completed: 0,
    failed: [],
  });
  const { toast } = useToast();

  const config = sizeConfig[size];

  // Filter enabled fields that are not excluded
  const activeFields = fields.filter(
    f => f.enabled !== false && !excludeFields.includes(f.fieldId)
  );

  const handleGenerate = useCallback(async () => {
    if (isLoading || disabled || activeFields.length === 0) return;

    setIsLoading(true);
    setProgress({
      total: activeFields.length,
      completed: 0,
      current: activeFields[0]?.label,
      failed: [],
    });

    try {
      const response = await apiRequest("POST", "/api/octypo/magic/all", {
        contentType,
        input: entityName,
        parentDestination,
        mode,
        locale,
        fields: activeFields.map(f => ({
          fieldId: f.fieldId,
          fieldType: f.fieldType,
        })),
        existingFields,
        excludeFields,
      });

      const data: MagicAllResponse = await response.json();

      if (data.success && data.fields) {
        // Update progress to complete
        setProgress(prev => ({
          ...prev,
          completed: prev.total,
          current: undefined,
        }));

        onResult(data.fields);

        const successCount = Object.keys(data.fields).length;
        const failedCount = activeFields.length - successCount;

        toast({
          title: "Generation Complete",
          description: `Successfully generated ${successCount} field${successCount !== 1 ? "s" : ""}${
            failedCount > 0 ? `, ${failedCount} failed` : ""
          }`,
        });

        // Show metadata if available
        if (data.metadata) {
          // metadata available for debugging
        }
      } else {
        throw new Error(data.error || "Failed to generate content");
      }
    } catch (error) {
      console.error("Magic All generation error:", error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate content",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setShowDialog(false);
    }
  }, [
    isLoading,
    disabled,
    activeFields,
    contentType,
    entityName,
    parentDestination,
    mode,
    locale,
    existingFields,
    excludeFields,
    onResult,
    toast,
  ]);

  const handleClick = useCallback(() => {
    if (showConfirmation) {
      setShowDialog(true);
    } else {
      handleGenerate();
    }
  }, [showConfirmation, handleGenerate]);

  const handleConfirm = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  const progressPercent = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={variant}
              disabled={disabled || isLoading || activeFields.length === 0}
              onClick={handleClick}
              className={cn(
                config.button,
                "gap-2",
                isLoading && [
                  "bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10",
                  "border-primary/30",
                ],
                className
              )}
              data-testid="magic-all-button"
            >
              {isLoading ? (
                <>
                  <Loader2 className={cn(config.icon, "animate-spin")} />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Wand2 className={config.icon} />
                  <span>Magic All</span>
                  <Sparkles className={cn(config.icon, "text-primary")} />
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Generate all {activeFields.length} fields with AI</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Confirmation / Progress Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {isLoading ? "Generating Content" : "Magic All Fields"}
            </DialogTitle>
            <DialogDescription>
              {isLoading
                ? `Generating ${activeFields.length} fields using AI...`
                : `This will generate content for ${activeFields.length} fields based on "${entityName}".`}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-4 py-4">
              <Progress value={progressPercent} className="h-2" />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{progress.current || "Processing..."}</span>
                <span>
                  {progress.completed}/{progress.total}
                </span>
              </div>
              {progress.failed.length > 0 && (
                <div className="text-sm text-destructive">Failed: {progress.failed.join(", ")}</div>
              )}
            </div>
          ) : (
            <div className="py-4">
              <div className="text-sm text-muted-foreground mb-3">Fields to generate:</div>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {activeFields.map(field => (
                  <span
                    key={field.fieldId}
                    className="inline-flex items-center px-2 py-1 rounded-md bg-primary/5 dark:bg-primary/10 text-primary dark:text-primary/80 text-xs"
                  >
                    {field.label}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Mode: <span className="font-medium capitalize">{mode}</span>
              </p>
            </div>
          )}

          <DialogFooter>
            {!isLoading && (
              <>
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirm}
                  className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Sparkles className="h-4 w-4" />
                  Generate All
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default MagicAllButton;
