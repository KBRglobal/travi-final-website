import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Languages, Globe, Check, Clock, AlertCircle, Loader2, RefreshCw, Eye, X, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { SUPPORTED_LOCALES, type Locale } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface TranslationManagerProps {
  contentId: string;
  contentTitle: string;
}

interface TranslationStatus {
  contentId: string;
  totalLocales: number;
  completedCount: number;
  pendingCount: number;
  percentage: number;
  completedLocales: Locale[];
  pendingLocales: Locale[];
  translations: Array<{
    locale: Locale;
    status: string;
    updatedAt: string;
  }>;
}

// Get flag emoji from locale code
const getFlag = (locale: Locale): string => {
  const flagMap: Record<string, string> = {
    en: "🇺🇸", ar: "🇸🇦", hi: "🇮🇳", ru: "🇷🇺", zh: "🇨🇳",
    de: "🇩🇪", fr: "🇫🇷", es: "🇪🇸", it: "🇮🇹", pt: "🇵🇹",
    nl: "🇳🇱", pl: "🇵🇱", uk: "🇺🇦", ta: "🇮🇳", te: "🇮🇳",
    bn: "🇧🇩", mr: "🇮🇳", gu: "🇮🇳", ml: "🇮🇳", kn: "🇮🇳",
    pa: "🇮🇳", ur: "🇵🇰", si: "🇱🇰", ne: "🇳🇵", ja: "🇯🇵",
    ko: "🇰🇷", th: "🇹🇭", vi: "🇻🇳", id: "🇮🇩", ms: "🇲🇾",
    tl: "🇵🇭", "zh-TW": "🇹🇼", fa: "🇮🇷", tr: "🇹🇷", he: "🇮🇱",
    kk: "🇰🇿", uz: "🇺🇿", az: "🇦🇿", cs: "🇨🇿", el: "🇬🇷",
    sv: "🇸🇪", no: "🇳🇴", da: "🇩🇰", fi: "🇫🇮", hu: "🇭🇺",
    ro: "🇷🇴", sw: "🇰🇪", am: "🇪🇹",
  };
  return flagMap[locale] || "🌐";
};

interface Translation {
  id: string;
  contentId: string;
  locale: Locale;
  title: string;
  metaDescription: string;
  blocks: unknown[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function TranslationManager({ contentId, contentTitle }: TranslationManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTiers, setSelectedTiers] = useState<number[]>([1, 2]); // Default: Tier 1 & 2
  const [isTranslating, setIsTranslating] = useState(false);
  const [activeTab, setActiveTab] = useState<"manage" | "preview">("manage");
  const [previewLocale, setPreviewLocale] = useState<Locale | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch translation status
  const { data: status, isLoading, refetch } = useQuery<TranslationStatus>({
    queryKey: ["translation-status", contentId],
    queryFn: async () => {
      const res = await fetch(`/api/contents/${contentId}/translation-status`);
      if (!res.ok) throw new Error("Failed to fetch translation status");
      return res.json();
    },
    enabled: isOpen,
    refetchInterval: isTranslating ? 5000 : false, // Poll while translating
  });

  // Fetch all translations for preview
  const { data: translations } = useQuery<Translation[]>({
    queryKey: ["translations", contentId],
    queryFn: async () => {
      const res = await fetch(`/api/contents/${contentId}/translations`);
      if (!res.ok) throw new Error("Failed to fetch translations");
      return res.json();
    },
    enabled: isOpen && activeTab === "preview",
  });

  // Cancel translation mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/contents/${contentId}/cancel-translation`);
      return res.json();
    },
    onSuccess: () => {
      setIsTranslating(false);
      toast({
        title: "Translation cancelled",
        description: "The translation process has been stopped.",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Failed to cancel",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  // Start translation mutation
  const translateMutation = useMutation({
    mutationFn: async (tiers: number[]) => {
      const res = await apiRequest("POST", `/api/contents/${contentId}/translate-all`, {
        tiers: tiers.length > 0 ? tiers : undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setIsTranslating(true);
      toast({
        title: "Translation started",
        description: `Translating to ${data.targetLanguages} languages. This may take a few minutes.`,
      });
      // Start polling for updates
      setTimeout(() => refetch(), 3000);
    },
    onError: (error) => {
      toast({
        title: "Translation failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  // Stop polling when translation is complete
  useEffect(() => {
    if (status && status.percentage >= 100) {
      setIsTranslating(false);
    }
  }, [status]);

  const tierGroups = [
    { tier: 1, name: "🔴 Tier 1 - Core (EN, AR, HI)", count: 3 },
    { tier: 2, name: "🟡 Tier 2 - High ROI (UR, RU, FA, ZH)", count: 4 },
    { tier: 3, name: "🟢 Tier 3 - European (FR, DE, IT)", count: 3 },
    { tier: 4, name: "⚪ Tier 4 - Optional (ES, TR)", count: 2 },
  ];

  const toggleTier = (tier: number) => {
    setSelectedTiers((prev) =>
      prev.includes(tier) ? prev.filter((t) => t !== tier) : [...prev, tier]
    );
  };

  const selectedLanguageCount = tierGroups
    .filter((g) => selectedTiers.includes(g.tier))
    .reduce((sum, g) => sum + g.count, 0);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Languages className="h-4 w-4" />
          Translate
          {status && status.completedCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {status.completedCount}/{status.totalLocales}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Translation Manager
          </DialogTitle>
          <DialogDescription>
            Translate "{contentTitle}" to multiple languages for international SEO
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "manage" | "preview")} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="manage" className="gap-2" data-testid="tab-manage">
              <Languages className="h-4 w-4" />
              Manage
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2" data-testid="tab-preview">
              <Eye className="h-4 w-4" />
              Preview ({translations?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manage" className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Progress Overview */}
                {status && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Translation Progress</span>
                      <span className="font-medium">
                        {status.completedCount} / {status.totalLocales} languages ({status.percentage}%)
                      </span>
                    </div>
                    <Progress value={status.percentage} className="h-2" />
                    {isTranslating && (
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Translation in progress...
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => cancelMutation.mutate()}
                          disabled={cancelMutation.isPending}
                          data-testid="button-cancel-translation"
                        >
                          {cancelMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <StopCircle className="h-4 w-4" />
                          )}
                          <span className="ml-1">Cancel</span>
                        </Button>
                      </div>
                    )}
                  </div>
                )}

            {/* Tier Selection */}
            <div className="space-y-3">
              <Label>Select Language Tiers to Translate</Label>
              <div className="grid gap-2">
                {tierGroups.map((group) => (
                  <div
                    key={group.tier}
                    className="flex items-center space-x-3 rounded-md border p-3 hover:bg-accent cursor-pointer"
                    onClick={() => toggleTier(group.tier)}
                  >
                    <Checkbox
                      checked={selectedTiers.includes(group.tier)}
                      onCheckedChange={() => toggleTier(group.tier)}
                    />
                    <div className="flex-1">
                      <span className="font-medium">{group.name}</span>
                      <span className="text-muted-foreground ml-2">({group.count} languages)</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Selected: {selectedLanguageCount} languages
              </p>
            </div>

            {/* Translation Status Grid */}
            {status && status.translations.length > 0 && (
              <div className="space-y-2">
                <Label>Current Translations</Label>
                <ScrollArea className="h-48 rounded-md border p-2">
                  <div className="grid grid-cols-3 gap-2">
                    {SUPPORTED_LOCALES.map((locale) => {
                      const translation = status.translations.find(
                        (t) => t.locale === locale.code
                      );
                      const isCompleted = translation?.status === "completed";
                      const isPending =
                        translation?.status === "pending" ||
                        translation?.status === "in_progress";

                      return (
                        <div
                          key={locale.code}
                          className={`flex items-center gap-2 rounded-md p-2 text-sm ${
                            isCompleted
                              ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                              : isPending
                              ? "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <span>{getFlag(locale.code)}</span>
                          <span className="truncate flex-1">{locale.code.toUpperCase()}</span>
                          {isCompleted && <Check className="h-4 w-4" />}
                          {isPending && <Clock className="h-4 w-4" />}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="preview" className="flex-1 overflow-auto">
            {translations && translations.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {translations
                    .filter(t => t.status === "completed")
                    .map((t) => (
                      <Button
                        key={t.locale}
                        size="sm"
                        variant={previewLocale === t.locale ? "default" : "outline"}
                        onClick={() => setPreviewLocale(t.locale)}
                        data-testid={`preview-locale-${t.locale}`}
                      >
                        {getFlag(t.locale)} {t.locale.toUpperCase()}
                      </Button>
                    ))}
                </div>
                
                {previewLocale && (
                  <div className="space-y-4">
                    {(() => {
                      const preview = translations.find(t => t.locale === previewLocale);
                      if (!preview) return null;
                      return (
                        <ScrollArea className="h-80 rounded-md border p-4">
                          <div className="space-y-4">
                            <div>
                              <Label className="text-muted-foreground text-xs">Title</Label>
                              <p className="font-semibold text-lg">{preview.title}</p>
                            </div>
                            <div>
                              <Label className="text-muted-foreground text-xs">Meta Description</Label>
                              <p className="text-sm">{preview.metaDescription}</p>
                            </div>
                            {preview.blocks && Array.isArray(preview.blocks) && preview.blocks.length > 0 && (
                              <div>
                                <Label className="text-muted-foreground text-xs">Content Blocks ({preview.blocks.length})</Label>
                                <div className="space-y-2 mt-2">
                                  {preview.blocks.slice(0, 5).map((block: any, idx: number) => (
                                    <div key={idx} className="p-2 bg-muted rounded text-sm">
                                      <Badge variant="secondary" className="mb-1">{block.type}</Badge>
                                      {block.data?.contents && (
                                        <p className="text-xs line-clamp-2">{String(block.data.contents).substring(0, 150)}...</p>
                                      )}
                                    </div>
                                  ))}
                                  {preview.blocks.length > 5 && (
                                    <p className="text-xs text-muted-foreground">... and {preview.blocks.length - 5} more blocks</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      );
                    })()}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Globe className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No translations yet</p>
                <p className="text-sm text-muted-foreground">Create translations to preview them here</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={() => translateMutation.mutate(selectedTiers)}
            disabled={translateMutation.isPending || isTranslating || selectedTiers.length === 0}
          >
            {translateMutation.isPending || isTranslating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Translating...
              </>
            ) : (
              <>
                <Languages className="h-4 w-4 mr-2" />
                Translate to {selectedLanguageCount} Languages
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Simple translation badge for contents lists
export function TranslationBadge({ contentId }: { contentId: string }) {
  const { data: status } = useQuery<TranslationStatus>({
    queryKey: ["translation-status", contentId],
    queryFn: async () => {
      const res = await fetch(`/api/contents/${contentId}/translation-status`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 60000, // Cache for 1 minute
  });

  if (!status || status.completedCount === 0) return null;

  return (
    <Badge variant="outline" className="gap-1">
      <Globe className="h-3 w-3" />
      {status.completedCount}/{status.totalLocales}
    </Badge>
  );
}
