import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Globe,
  Languages,
  Check,
  X,
  Loader2,
  Play,
  Square,
  ChevronDown,
  Filter,
  RefreshCw,
} from "lucide-react";
import type { ContentWithRelations } from "@shared/schema";

// Language tiers
const LANGUAGE_TIERS = {
  tier1: [
    { code: "en", name: "English", flag: "🇬🇧" },
    { code: "ar", name: "Arabic", flag: "🇦🇪" },
    { code: "hi", name: "Hindi", flag: "🇮🇳" },
  ],
  tier2: [
    { code: "zh", name: "Chinese", flag: "🇨🇳" },
    { code: "ru", name: "Russian", flag: "🇷🇺" },
    { code: "fr", name: "French", flag: "🇫🇷" },
  ],
  tier3: [
    { code: "de", name: "German", flag: "🇩🇪" },
    { code: "es", name: "Spanish", flag: "🇪🇸" },
    { code: "ja", name: "Japanese", flag: "🇯🇵" },
  ],
};

const ALL_LANGUAGES = [
  ...LANGUAGE_TIERS.tier1,
  ...LANGUAGE_TIERS.tier2,
  ...LANGUAGE_TIERS.tier3,
].filter((l) => l.code !== "en");

interface TranslationData {
  contentId: string;
  locale: string;
  status: string;
}

interface BulkTranslationManagerProps {
  className?: string;
}

export function BulkTranslationManager({ className }: BulkTranslationManagerProps) {
  const { toast } = useToast();
  const [selectedContents, setSelectedContents] = useState<Set<string>>(new Set());
  const [selectedLocales, setSelectedLocales] = useState<Set<string>>(new Set());
  const [contentTypeFilter, setContentTypeFilter] = useState<string>("all");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState({ current: 0, total: 0 });

  // Fetch published contents only
  const { data: contents = [] } = useQuery<ContentWithRelations[]>({
    queryKey: ["/api/contents"],
    select: (data) => data.filter((c) => c.status === "published"),
  });

  // Fetch existing translations
  const { data: translations = [] } = useQuery<TranslationData[]>({
    queryKey: ["/api/translations"],
  });

  // Translation mutation
  const translateMutation = useMutation({
    mutationFn: async ({ contentId, locales }: { contentId: string; locales: string[] }) => {
      return apiRequest("POST", `/api/translations/${contentId}/translate`, { locales });
    },
  });

  // Build translation matrix
  const translationMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, string>> = {};

    contents.forEach((contents) => {
      matrix[contents.id] = {};
      ALL_LANGUAGES.forEach((lang) => {
        const translation = translations.find(
          (t) => t.contentId === contents.id && t.locale === lang.code
        );
        matrix[contents.id][lang.code] = translation?.status || "missing";
      });
    });

    return matrix;
  }, [contents, translations]);

  // Filter contents
  const filteredContents = useMemo(() => {
    if (contentTypeFilter === "all") return contents;
    return contents.filter((c) => c.type === contentTypeFilter);
  }, [contents, contentTypeFilter]);

  // Stats
  const stats = useMemo(() => {
    let total = 0;
    let translated = 0;
    let missing = 0;

    filteredContents.forEach((contents) => {
      ALL_LANGUAGES.forEach((lang) => {
        total++;
        const status = translationMatrix[contents.id]?.[lang.code];
        if (status === "completed") {
          translated++;
        } else {
          missing++;
        }
      });
    });

    return { total, translated, missing, percentage: total > 0 ? Math.round((translated / total) * 100) : 0 };
  }, [filteredContents, translationMatrix]);

  // Toggle contents selection
  const toggleContent = (id: string) => {
    const newSelected = new Set(selectedContents);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedContents(newSelected);
  };

  // Toggle locale selection
  const toggleLocale = (code: string) => {
    const newSelected = new Set(selectedLocales);
    if (newSelected.has(code)) {
      newSelected.delete(code);
    } else {
      newSelected.add(code);
    }
    setSelectedLocales(newSelected);
  };

  // Select all contents
  const selectAllContents = () => {
    if (selectedContents.size === filteredContents.length) {
      setSelectedContents(new Set());
    } else {
      setSelectedContents(new Set(filteredContents.map((c) => c.id)));
    }
  };

  // Select all locales
  const selectAllLocales = () => {
    if (selectedLocales.size === ALL_LANGUAGES.length) {
      setSelectedLocales(new Set());
    } else {
      setSelectedLocales(new Set(ALL_LANGUAGES.map((l) => l.code)));
    }
  };

  // Select missing translations only
  const selectMissingOnly = () => {
    const newContents = new Set<string>();
    const newLocales = new Set<string>();

    filteredContents.forEach((contents) => {
      ALL_LANGUAGES.forEach((lang) => {
        if (translationMatrix[contents.id]?.[lang.code] !== "completed") {
          newContents.add(contents.id);
          newLocales.add(lang.code);
        }
      });
    });

    setSelectedContents(newContents);
    setSelectedLocales(newLocales);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedContents(new Set());
    setSelectedLocales(new Set());
  };

  // Count translations to be created
  const translationsToCreate = useMemo(() => {
    let count = 0;
    selectedContents.forEach((contentId) => {
      selectedLocales.forEach((locale) => {
        if (translationMatrix[contentId]?.[locale] !== "completed") {
          count++;
        }
      });
    });
    return count;
  }, [selectedContents, selectedLocales, translationMatrix]);

  // Start bulk translation
  const startBulkTranslation = async () => {
    setShowConfirmDialog(false);
    setIsTranslating(true);
    setTranslationProgress({ current: 0, total: translationsToCreate });

    let completed = 0;
    let failed = 0;

    for (const contentId of Array.from(selectedContents)) {
      const localesToTranslate = Array.from(selectedLocales).filter(
        (locale) => translationMatrix[contentId]?.[locale] !== "completed"
      );

      if (localesToTranslate.length === 0) continue;

      try {
        await translateMutation.mutateAsync({ contentId, locales: localesToTranslate });
        completed += localesToTranslate.length;
      } catch (error) {
        failed += localesToTranslate.length;
      }

      setTranslationProgress({ current: completed + failed, total: translationsToCreate });
    }

    setIsTranslating(false);
    queryClient.invalidateQueries({ queryKey: ["/api/translations"] });
    clearSelection();

    toast({
      title: "Bulk translation complete",
      description: `${completed} translations created, ${failed} failed`,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <Check className="h-4 w-4 text-green-600" />;
      case "pending":
      case "in_progress":
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <X className="h-4 w-4 text-gray-300" />;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5" />
              Bulk Translation Manager
            </CardTitle>
            <CardDescription>
              Select contents and languages to translate in bulk
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={contentTypeFilter} onValueChange={setContentTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="attraction">Attractions</SelectItem>
                <SelectItem value="hotel">Hotels</SelectItem>
                <SelectItem value="article">Articles</SelectItem>
                <SelectItem value="dining">Dining</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mt-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <div className="text-2xl font-bold">{stats.percentage}%</div>
            <div className="text-xs text-muted-foreground">Translated</div>
          </div>
          <div className="flex-1">
            <Progress value={stats.percentage} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{stats.translated} completed</span>
              <span>{stats.missing} missing</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Selection Controls */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Button variant="outline" size="sm" onClick={selectAllContents}>
            {selectedContents.size === filteredContents.length ? "Deselect" : "Select"} All Content
          </Button>
          <Button variant="outline" size="sm" onClick={selectAllLocales}>
            {selectedLocales.size === ALL_LANGUAGES.length ? "Deselect" : "Select"} All Languages
          </Button>
          <Button variant="outline" size="sm" onClick={selectMissingOnly}>
            Select Missing Only
          </Button>
          {(selectedContents.size > 0 || selectedLocales.size > 0) && (
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Clear Selection
            </Button>
          )}
          <div className="flex-1" />
          {selectedContents.size > 0 && selectedLocales.size > 0 && (
            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={translationsToCreate === 0}
            >
              <Play className="h-4 w-4 mr-2" />
              Translate {translationsToCreate} items
            </Button>
          )}
        </div>

        {/* Progress bar during translation */}
        {isTranslating && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="font-medium">Translating...</span>
              <span className="text-sm text-muted-foreground">
                {translationProgress.current} / {translationProgress.total}
              </span>
            </div>
            <Progress
              value={(translationProgress.current / translationProgress.total) * 100}
              className="h-2"
            />
          </div>
        )}

        {/* Language Selection Header */}
        <div className="flex items-center gap-2 mb-2 ml-[250px]">
          {ALL_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => toggleLocale(lang.code)}
              className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center text-xs transition-all ${
                selectedLocales.has(lang.code)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
              title={lang.name}
            >
              <span className="text-base">{lang.flag}</span>
            </button>
          ))}
        </div>

        {/* Content Matrix */}
        <ScrollArea className="h-[400px]">
          <div className="space-y-1">
            {filteredContents.map((contents) => (
              <div
                key={contents.id}
                className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                  selectedContents.has(contents.id) ? "bg-primary/10" : "hover:bg-muted/50"
                }`}
              >
                <Checkbox
                  checked={selectedContents.has(contents.id)}
                  onCheckedChange={() => toggleContent(contents.id)}
                />
                <div className="w-[200px] min-w-[200px]">
                  <div className="text-sm font-medium truncate">{contents.title}</div>
                  <div className="text-xs text-muted-foreground capitalize">{contents.type}</div>
                </div>
                <div className="flex items-center gap-2">
                  {ALL_LANGUAGES.map((lang) => {
                    const status = translationMatrix[contents.id]?.[lang.code] || "missing";
                    const isSelected =
                      selectedContents.has(contents.id) && selectedLocales.has(lang.code);

                    return (
                      <div
                        key={lang.code}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                          isSelected
                            ? status === "completed"
                              ? "bg-green-100 ring-2 ring-green-500"
                              : "bg-blue-100 ring-2 ring-blue-500"
                            : status === "completed"
                            ? "bg-green-50"
                            : "bg-gray-50"
                        }`}
                        title={`${lang.name}: ${status}`}
                      >
                        {getStatusIcon(status)}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Check className="h-3 w-3 text-green-600" /> Translated
          </span>
          <span className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 text-blue-600" /> In Progress
          </span>
          <span className="flex items-center gap-1">
            <X className="h-3 w-3 text-gray-300" /> Missing
          </span>
        </div>
      </CardContent>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Bulk Translation</DialogTitle>
            <DialogDescription>
              You are about to translate {translationsToCreate} contents items. This action will use
              your translation API quota.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span>Selected contents:</span>
              <span className="font-medium">{selectedContents.size} items</span>
            </div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span>Selected languages:</span>
              <span className="font-medium">{selectedLocales.size} languages</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>New translations:</span>
              <span className="font-medium text-primary">{translationsToCreate}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={startBulkTranslation}>
              <Play className="h-4 w-4 mr-2" />
              Start Translation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
