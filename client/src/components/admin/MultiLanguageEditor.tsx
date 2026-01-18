import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Globe,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { MagicAIButton, type GeneratedContent } from "./MagicAIButton";
import { SUPPORTED_LOCALES } from "@shared/schema";

const RTL_LOCALES = ["ar", "fa", "ur", "he"];

export interface MultiLanguageEditorProps {
  field: string;
  values: Record<string, string>;
  onChange: (locale: string, value: string) => void;
  onBulkChange: (values: Record<string, string>) => void;
  placeholder?: string;
  label: string;
  required?: boolean;
  multiline?: boolean;
  maxLength?: number;
  disabled?: boolean;
  showMagicAI?: boolean;
  className?: string;
  context?: Record<string, unknown>;
}

interface TierInfo {
  tier: number;
  label: string;
  locales: typeof SUPPORTED_LOCALES;
  completedCount: number;
}

function getTierLabel(tier: number): string {
  switch (tier) {
    case 1:
      return "Core Markets";
    case 2:
      return "High ROI";
    case 3:
      return "Growing Markets";
    case 4:
      return "Niche Markets";
    case 5:
      return "European";
    default:
      return `Tier ${tier}`;
  }
}

function getTierColor(tier: number): string {
  switch (tier) {
    case 1:
      return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
    case 2:
      return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20";
    case 3:
      return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
    case 4:
      return "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20";
    case 5:
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function isRTL(locale: string): boolean {
  return RTL_LOCALES.includes(locale);
}

export function MultiLanguageEditor({
  field,
  values,
  onChange,
  onBulkChange,
  placeholder = "",
  label,
  required = false,
  multiline = false,
  maxLength,
  disabled = false,
  showMagicAI = true,
  className,
  context = {},
}: MultiLanguageEditorProps) {
  const [selectedLocale, setSelectedLocale] = useState("en");
  const [expandedTiers, setExpandedTiers] = useState<number[]>([1]);
  const [copiedLocale, setCopiedLocale] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const tierGroups = useMemo(() => {
    const groups: TierInfo[] = [];
    for (let tier = 1; tier <= 5; tier++) {
      const tierLocales = SUPPORTED_LOCALES.filter((l) => l.tier === tier);
      const completedCount = tierLocales.filter(
        (l) => values[l.code]?.trim()
      ).length;
      groups.push({
        tier,
        label: getTierLabel(tier),
        locales: tierLocales,
        completedCount,
      });
    }
    return groups;
  }, [values]);

  const completionStats = useMemo(() => {
    const total = SUPPORTED_LOCALES.length;
    const completed = SUPPORTED_LOCALES.filter(
      (l) => values[l.code]?.trim()
    ).length;
    return {
      total,
      completed,
      percentage: Math.round((completed / total) * 100),
    };
  }, [values]);

  const currentValue = values[selectedLocale] || "";
  const currentLocaleInfo = SUPPORTED_LOCALES.find(
    (l) => l.code === selectedLocale
  );
  const isCurrentRTL = isRTL(selectedLocale);

  useEffect(() => {
    if (multiline && textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.max(80, textareaRef.current.scrollHeight)}px`;
    }
  }, [currentValue, multiline]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      if (maxLength && newValue.length > maxLength) return;
      onChange(selectedLocale, newValue);
    },
    [selectedLocale, onChange, maxLength]
  );

  const handleLocaleSelect = useCallback((locale: string) => {
    setSelectedLocale(locale);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const allLocales = SUPPORTED_LOCALES.map((l) => l.code);
        const currentIndex = allLocales.indexOf(selectedLocale);
        const direction = e.key === "ArrowLeft" ? -1 : 1;
        const newIndex =
          (currentIndex + direction + allLocales.length) % allLocales.length;
        setSelectedLocale(allLocales[newIndex]);
        e.preventDefault();
      }
    },
    [selectedLocale]
  );

  const handleCopyFromLocale = useCallback(
    (sourceLocale: string) => {
      const sourceValue = values[sourceLocale];
      if (sourceValue && sourceLocale !== selectedLocale) {
        onChange(selectedLocale, sourceValue);
        setCopiedLocale(sourceLocale);
        setTimeout(() => setCopiedLocale(null), 2000);
        toast({
          title: "Content copied",
          description: `Copied from ${SUPPORTED_LOCALES.find((l) => l.code === sourceLocale)?.name || sourceLocale}`,
        });
      }
    },
    [values, selectedLocale, onChange, toast]
  );

  const handleAIGenerated = useCallback(
    (results: GeneratedContent[]) => {
      const newValues: Record<string, string> = {};
      results.forEach((result) => {
        newValues[result.locale] = result.value;
      });
      onBulkChange(newValues);
    },
    [onBulkChange]
  );

  const toggleTier = useCallback((tier: number) => {
    setExpandedTiers((prev) =>
      prev.includes(tier) ? prev.filter((t) => t !== tier) : [...prev, tier]
    );
  }, []);

  const hasValue = (locale: string) => !!values[locale]?.trim();

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Label
            htmlFor={`${field}-${selectedLocale}`}
            className="text-sm font-medium"
          >
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Badge variant="outline" className="text-xs font-normal gap-1">
            <Globe className="h-3 w-3" />
            {completionStats.completed}/{completionStats.total}
            <span className="text-muted-foreground">
              ({completionStats.percentage}%)
            </span>
          </Badge>
        </div>

        {showMagicAI && (
          <MagicAIButton
            field={field}
            context={{ ...context, field, currentValues: values }}
            currentLocale={selectedLocale}
            onGenerated={handleAIGenerated}
            variant="inline"
            disabled={disabled}
            data-testid={`multi-lang-magic-ai-${field}`}
          />
        )}
      </div>

      <div className="border rounded-md overflow-hidden">
        <div className="bg-muted/50 border-b">
          <div
            ref={tabsContainerRef}
            className="overflow-x-auto"
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="tablist"
            aria-label="Language selection"
          >
            {tierGroups.map((tierGroup) => (
              <div key={tierGroup.tier}>
                {tierGroup.tier === 1 ? (
                  <div className="flex items-center gap-1 p-1.5 border-b border-border/50">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] px-1.5 py-0 h-5 shrink-0",
                        getTierColor(tierGroup.tier)
                      )}
                    >
                      {tierGroup.label} ({tierGroup.completedCount}/
                      {tierGroup.locales.length})
                    </Badge>
                    <div className="flex items-center gap-0.5">
                      {tierGroup.locales.map((locale) => (
                        <LocaleTab
                          key={locale.code}
                          locale={locale}
                          isSelected={selectedLocale === locale.code}
                          hasValue={hasValue(locale.code)}
                          onSelect={handleLocaleSelect}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <Collapsible
                    open={expandedTiers.includes(tierGroup.tier)}
                    onOpenChange={() => toggleTier(tierGroup.tier)}
                  >
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center gap-1.5 w-full p-1.5 text-left hover-elevate border-b border-border/50"
                        data-testid={`tier-toggle-${tierGroup.tier}`}
                      >
                        {expandedTiers.includes(tierGroup.tier) ? (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 py-0 h-5",
                            getTierColor(tierGroup.tier)
                          )}
                        >
                          Tier {tierGroup.tier}: {tierGroup.label} (
                          {tierGroup.completedCount}/{tierGroup.locales.length})
                        </Badge>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="flex items-center gap-0.5 p-1.5 flex-wrap">
                        {tierGroup.locales.map((locale) => (
                          <LocaleTab
                            key={locale.code}
                            locale={locale}
                            isSelected={selectedLocale === locale.code}
                            hasValue={hasValue(locale.code)}
                            onSelect={handleLocaleSelect}
                          />
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">
                {currentLocaleInfo?.nativeName}
              </span>
              <span className="text-muted-foreground">
                ({currentLocaleInfo?.name})
              </span>
              {isCurrentRTL && (
                <Badge variant="secondary" className="text-[10px] h-5">
                  RTL
                </Badge>
              )}
            </div>

            {Object.entries(values).some(
              ([code, val]) => code !== selectedLocale && val?.trim()
            ) && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Copy from:</span>
                {SUPPORTED_LOCALES.filter(
                  (l) =>
                    l.code !== selectedLocale && values[l.code]?.trim()
                )
                  .slice(0, 5)
                  .map((locale) => (
                    <Tooltip key={locale.code}>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1.5 text-xs"
                          onClick={() => handleCopyFromLocale(locale.code)}
                          disabled={disabled}
                          data-testid={`copy-from-${locale.code}`}
                        >
                          {copiedLocale === locale.code ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          <span className="ml-1">{locale.code.toUpperCase()}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Copy from {locale.name}
                      </TooltipContent>
                    </Tooltip>
                  ))}
              </div>
            )}
          </div>

          {multiline ? (
            <Textarea
              ref={textareaRef}
              id={`${field}-${selectedLocale}`}
              value={currentValue}
              onChange={handleChange}
              placeholder={placeholder}
              disabled={disabled}
              dir={isCurrentRTL ? "rtl" : "ltr"}
              className={cn(
                "min-h-[80px] resize-none transition-all",
                isCurrentRTL && "text-right"
              )}
              data-testid={`multi-lang-textarea-${field}-${selectedLocale}`}
            />
          ) : (
            <Input
              id={`${field}-${selectedLocale}`}
              value={currentValue}
              onChange={handleChange}
              placeholder={placeholder}
              disabled={disabled}
              dir={isCurrentRTL ? "rtl" : "ltr"}
              className={cn(isCurrentRTL && "text-right")}
              data-testid={`multi-lang-input-${field}-${selectedLocale}`}
            />
          )}

          <div className="flex items-center justify-between text-xs">
            <div>
              {required && !currentValue.trim() && (
                <span className="text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Required field
                </span>
              )}
            </div>
            {maxLength && (
              <span
                className={cn(
                  "text-muted-foreground",
                  currentValue.length > maxLength * 0.9 && "text-yellow-600",
                  currentValue.length >= maxLength && "text-destructive"
                )}
              >
                {currentValue.length}/{maxLength}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface LocaleTabProps {
  locale: (typeof SUPPORTED_LOCALES)[number];
  isSelected: boolean;
  hasValue: boolean;
  onSelect: (code: string) => void;
}

function LocaleTab({ locale, isSelected, hasValue, onSelect }: LocaleTabProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          role="tab"
          aria-selected={isSelected}
          onClick={() => onSelect(locale.code)}
          className={cn(
            "px-2 py-1 text-xs font-medium rounded transition-colors",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            isSelected
              ? "bg-background text-foreground shadow-sm border"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50",
            hasValue && !isSelected && "text-foreground",
            !hasValue && !isSelected && "opacity-60"
          )}
          data-testid={`locale-tab-${locale.code}`}
        >
          <span className="flex items-center gap-1">
            {locale.code.toUpperCase()}
            {hasValue && (
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            )}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <p className="font-medium">{locale.nativeName}</p>
        <p className="text-muted-foreground">{locale.name}</p>
        {isRTL(locale.code) && (
          <p className="text-muted-foreground">Right-to-left</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export default MultiLanguageEditor;
