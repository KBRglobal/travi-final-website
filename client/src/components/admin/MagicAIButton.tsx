import { useState, useCallback } from "react";
import { Sparkles, ChevronDown, Check, X, Loader2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  generateContent,
  getLocaleInfo,
  getLocalesByTier,
  getTierLabel,
  getAllLocaleCodes,
  type GeneratedContent,
  type GenerationResult,
} from "@/lib/magic-ai";

export interface MagicAIButtonProps {
  field: string;
  context: Record<string, unknown>;
  targetLanguages?: string[];
  onGenerated?: (results: GeneratedContent[]) => void;
  variant?: "button" | "icon" | "inline";
  disabled?: boolean;
  className?: string;
  currentLocale?: string;
}

export function MagicAIButton({
  field,
  context,
  targetLanguages,
  onGenerated,
  variant = "button",
  disabled = false,
  className,
  currentLocale = "en",
}: Readonly<MagicAIButtonProps>) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationResult | null>(null);
  const { toast } = useToast();

  const handleGenerate = useCallback(
    async (locales: string[]) => {
      setIsGenerating(true);
      setProgress({
        completed: [],
        failed: [],
        pending: [...locales],
      });

      try {
        const result = await generateContent(
          {
            field,
            context,
            targetLanguages: locales,
            onProgress: setProgress,
          },
          false
        );

        if (result.completed.length > 0) {
          onGenerated?.(result.completed);
          toast({
            title: "Generation Complete",
            description: `Successfully generated ${result.completed.length} translation${result.completed.length > 1 ? "s" : ""}${result.failed.length > 0 ? ", " + result.failed.length + " failed" : ""}`,
          });
        } else if (result.failed.length > 0) {
          toast({
            title: "Generation Failed",
            description: `Failed to generate content for ${result.failed.length} language${result.failed.length > 1 ? "s" : ""}`,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error(error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to generate content",
          variant: "destructive",
        });
      } finally {
        setIsGenerating(false);
        setProgress(null);
      }
    },
    [field, context, onGenerated, toast]
  );

  const handleGenerateCurrent = () => {
    handleGenerate([currentLocale]);
  };

  const handleGenerateAll = () => {
    const allLocales = targetLanguages || getAllLocaleCodes();
    handleGenerate(allLocales);
  };

  const handleGenerateTier = (tier: number) => {
    const tierLocales = getLocalesByTier(tier).map(l => l.code);
    handleGenerate(tierLocales);
  };

  const handleGenerateSingle = (locale: string) => {
    handleGenerate([locale]);
  };

  const totalCount = progress
    ? progress.completed.length + progress.failed.length + progress.pending.length
    : 0;
  const completedCount = progress ? progress.completed.length : 0;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const buttonContent = isGenerating ? (
    <div className="flex items-center gap-2">
      <Loader2 className="h-4 w-4 animate-spin" />
      {variant === "button" && (
        <span className="text-xs">
          {completedCount}/{totalCount}
        </span>
      )}
    </div>
  ) : (
    <>
      <Sparkles className="h-4 w-4" />
      {variant === "button" && <span>Magic AI</span>}
    </>
  );

  if (variant === "icon") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            disabled={disabled || isGenerating}
            className={cn("relative", isGenerating && "animate-pulse", className)}
            data-testid={`magic-ai-icon-${field}`}
          >
            {buttonContent}
            {isGenerating && progress && (
              <div
                className="absolute inset-0 rounded-md bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-purple-500/20 animate-gradient-x"
                style={{ backgroundSize: "200% 200%" }}
              />
            )}
          </Button>
        </DropdownMenuTrigger>
        <MagicAIDropdownContent
          currentLocale={currentLocale}
          isGenerating={isGenerating}
          progress={progress}
          onGenerateCurrent={handleGenerateCurrent}
          onGenerateAll={handleGenerateAll}
          onGenerateTier={handleGenerateTier}
          onGenerateSingle={handleGenerateSingle}
        />
      </DropdownMenu>
    );
  }

  if (variant === "inline") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            disabled={disabled || isGenerating}
            className={cn("text-xs gap-1", isGenerating && "animate-pulse", className)}
            data-testid={`magic-ai-inline-${field}`}
          >
            <Sparkles className="h-3 w-3" />
            {isGenerating ? (
              <span>
                {completedCount}/{totalCount}
              </span>
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <MagicAIDropdownContent
          currentLocale={currentLocale}
          isGenerating={isGenerating}
          progress={progress}
          onGenerateCurrent={handleGenerateCurrent}
          onGenerateAll={handleGenerateAll}
          onGenerateTier={handleGenerateTier}
          onGenerateSingle={handleGenerateSingle}
        />
      </DropdownMenu>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled || isGenerating}
            className={cn(
              "gap-2",
              isGenerating && [
                "bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10",
                "border-purple-500/30",
              ]
            )}
            data-testid={`magic-ai-button-${field}`}
          >
            {buttonContent}
            {!isGenerating && <ChevronDown className="h-4 w-4 ml-1" />}
          </Button>
        </DropdownMenuTrigger>
        <MagicAIDropdownContent
          currentLocale={currentLocale}
          isGenerating={isGenerating}
          progress={progress}
          onGenerateCurrent={handleGenerateCurrent}
          onGenerateAll={handleGenerateAll}
          onGenerateTier={handleGenerateTier}
          onGenerateSingle={handleGenerateSingle}
        />
      </DropdownMenu>

      {isGenerating && progress && (
        <div className="absolute top-full left-0 right-0 mt-2 p-3 rounded-md border bg-popover shadow-md z-50">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Generating...</span>
              <span className="font-medium">
                {completedCount}/{totalCount}
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
              {progress.completed.map(item => (
                <LocaleBadge key={item.locale} locale={item.locale} status="completed" />
              ))}
              {progress.failed.map(item => (
                <LocaleBadge key={item.locale} locale={item.locale} status="failed" />
              ))}
              {progress.pending.map(locale => (
                <LocaleBadge key={locale} locale={locale} status="pending" />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface MagicAIDropdownContentProps {
  currentLocale: string;
  isGenerating: boolean;
  progress: GenerationResult | null;
  onGenerateCurrent: () => void;
  onGenerateAll: () => void;
  onGenerateTier: (tier: number) => void;
  onGenerateSingle: (locale: string) => void;
}

function MagicAIDropdownContent({
  currentLocale,
  isGenerating,
  progress,
  onGenerateCurrent,
  onGenerateAll,
  onGenerateTier,
  onGenerateSingle,
}: Readonly<MagicAIDropdownContentProps>) {
  const currentLocaleInfo = getLocaleInfo(currentLocale);

  return (
    <DropdownMenuContent align="end" className="w-56">
      <DropdownMenuLabel className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-purple-500" />
        Magic AI Generation
      </DropdownMenuLabel>
      <DropdownMenuSeparator />

      <DropdownMenuItem
        onClick={onGenerateCurrent}
        disabled={isGenerating}
        data-testid="magic-ai-generate-current"
      >
        <Globe className="h-4 w-4 mr-2" />
        Generate for {currentLocaleInfo?.name || currentLocale}
      </DropdownMenuItem>

      <DropdownMenuItem
        onClick={onGenerateAll}
        disabled={isGenerating}
        data-testid="magic-ai-generate-all"
      >
        <Sparkles className="h-4 w-4 mr-2 text-purple-500" />
        <span className="font-medium">All 30 Languages</span>
      </DropdownMenuItem>

      <DropdownMenuSeparator />
      <DropdownMenuLabel className="text-xs text-muted-foreground">By Tier</DropdownMenuLabel>

      {[1, 2, 3, 4, 5].map(tier => (
        <DropdownMenuSub key={tier}>
          <DropdownMenuSubTrigger disabled={isGenerating}>
            {getTierLabel(tier)}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-60 overflow-y-auto">
            <DropdownMenuItem
              onClick={() => onGenerateTier(tier)}
              data-testid={`magic-ai-tier-${tier}-all`}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              All Tier {tier} Languages
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {getLocalesByTier(tier).map(locale => (
              <DropdownMenuItem
                key={locale.code}
                onClick={() => onGenerateSingle(locale.code)}
                data-testid={`magic-ai-locale-${locale.code}`}
              >
                <span className="w-8 text-muted-foreground">{locale.code}</span>
                <span>{locale.nativeName}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      ))}

      {isGenerating && progress && (
        <>
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            <div className="flex items-center justify-between mb-1">
              <span>Progress</span>
              <span>
                {progress.completed.length}/
                {progress.completed.length + progress.failed.length + progress.pending.length}
              </span>
            </div>
            <Progress
              value={
                (progress.completed.length /
                  (progress.completed.length + progress.failed.length + progress.pending.length)) *
                100
              }
              className="h-1"
            />
          </div>
        </>
      )}
    </DropdownMenuContent>
  );
}

interface LocaleBadgeProps {
  locale: string;
  status: "completed" | "failed" | "pending";
}

function LocaleBadge({ locale, status }: Readonly<LocaleBadgeProps>) {
  const localeInfo = getLocaleInfo(locale);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium",
        status === "completed" && "bg-green-500/10 text-green-600 dark:text-green-400",
        status === "failed" && "bg-red-500/10 text-red-600 dark:text-red-400",
        status === "pending" && "bg-muted text-muted-foreground"
      )}
    >
      {status === "completed" && <Check className="h-3 w-3" />}
      {status === "failed" && <X className="h-3 w-3" />}
      {status === "pending" && <Loader2 className="h-3 w-3 animate-spin" />}
      <span>{locale.toUpperCase()}</span>
    </span>
  );
}

export { type GeneratedContent } from "@/lib/magic-ai";
