import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SUPPORTED_LOCALES, type Locale, type Content, type Translation } from "@shared/schema";
import { Globe, RefreshCw, Languages, Check, X, AlertCircle, Loader2 } from "lucide-react";
import { BulkTranslationManager } from "@/components/bulk-translation-manager";

interface TranslationStats {
  totalContent: number;
  translatedByLocale: Record<Locale, number>;
  pendingByLocale: Record<Locale, number>;
  deeplUsage?: {
    character_count: number;
    character_limit: number;
  };
}

interface TranslationStatus {
  contentId: string;
  title: string;
  type: string;
  translatedLocales: Locale[];
  pendingLocales: Locale[];
}

export default function TranslationsPage() {
  const { toast } = useToast();
  const [selectedLocale, setSelectedLocale] = useState<Locale | "all">("all");
  const [translatingContent, setTranslatingContent] = useState<string | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery<TranslationStats>({
    queryKey: ["/api/translations/stats"],
  });

  const { data: contents, isLoading: contentsLoading } = useQuery<Content[]>({
    queryKey: ["/api/contents"],
  });

  const { data: translations } = useQuery<Translation[]>({
    queryKey: ["/api/translations"],
  });

  const translateMutation = useMutation({
    mutationFn: async ({ contentId, locales }: { contentId: string; locales: Locale[] }) => {
      return apiRequest("POST", `/api/translations/${contentId}/translate`, { locales });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/translations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/translations/stats"] });
      toast({
        title: "Translation started",
        description: "Content is being translated. This may take a moment.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Translation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const translateAllMutation = useMutation({
    mutationFn: async (tier: number) => {
      return apiRequest("POST", "/api/translations/translate-all", { tier });
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/translations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/translations/stats"] });
      toast({
        title: "Batch translation complete",
        description: `Translated ${result.translated} items, ${result.failed} failed`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Batch translation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getTranslationStatus = (contentId: string): TranslationStatus | null => {
    const foundContent = contents?.find((c) => c.id === contentId);
    if (!foundContent) return null;

    const contentTranslations = translations?.filter((t) => t.contentId === contentId) || [];
    const translatedLocales = contentTranslations.map((t) => t.locale);
    const allLocales = SUPPORTED_LOCALES.map((l) => l.code).filter((l) => l !== "en") as Locale[];
    const pendingLocales = allLocales.filter((l) => !translatedLocales.includes(l));

    return {
      contentId,
      title: foundContent.title,
      type: foundContent.type,
      translatedLocales: translatedLocales as Locale[],
      pendingLocales: pendingLocales as Locale[],
    };
  };

  const handleTranslateContent = async (contentId: string, locales: Locale[]) => {
    setTranslatingContent(contentId);
    try {
      await translateMutation.mutateAsync({ contentId, locales });
    } finally {
      setTranslatingContent(null);
    }
  };

  const tierLocales = {
    1: SUPPORTED_LOCALES.filter((l) => l.tier === 1).map((l) => l.code),
    2: SUPPORTED_LOCALES.filter((l) => l.tier === 2).map((l) => l.code),
    3: SUPPORTED_LOCALES.filter((l) => l.tier === 3).map((l) => l.code),
    4: SUPPORTED_LOCALES.filter((l) => l.tier === 4).map((l) => l.code),
  };

  const publishedContents = contents?.filter((c) => c.status === "published") || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Translations</h1>
          <p className="text-muted-foreground">Manage contents translations across 17 languages</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedLocale} onValueChange={(v) => setSelectedLocale(v as Locale | "all")}>
            <SelectTrigger className="w-40" data-testid="select-locale">
              <SelectValue placeholder="Filter by language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Languages</SelectItem>
              {SUPPORTED_LOCALES.filter((l) => l.code !== "en").map((locale) => (
                <SelectItem key={locale.code} value={locale.code}>
                  {locale.nativeName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Content</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-contents">
              {stats?.totalContent ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Published items to translate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tier 1 Languages</CardTitle>
            <Languages className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-1">
              {tierLocales[1].map((locale) => (
                <Badge key={locale} variant="secondary" className="text-xs">
                  {locale?.toUpperCase() ?? locale}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Arabic, Hindi (Core)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tier 2 Languages</CardTitle>
            <Languages className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {tierLocales[2].map((locale) => (
                <Badge key={locale} variant="outline" className="text-xs">
                  {locale?.toUpperCase() ?? locale}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Chinese, Russian, Urdu, French</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">DeepL Usage</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats?.deeplUsage ? (
              <>
                <Progress
                  value={(stats.deeplUsage.character_count / stats.deeplUsage.character_limit) * 100}
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.deeplUsage.character_count.toLocaleString()} / {stats.deeplUsage.character_limit.toLocaleString()} chars
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">API key not configured</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="contents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="contents">Content Status</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Manager</TabsTrigger>
          <TabsTrigger value="batch">Batch Translate</TabsTrigger>
        </TabsList>

        <TabsContent value="contents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Translation Status by Content</CardTitle>
              <CardDescription>View and manage translations for each contents item</CardDescription>
            </CardHeader>
            <CardContent>
              {contentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Content</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Translated</TableHead>
                      <TableHead>Pending</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {publishedContents.slice(0, 20).map((contents) => {
                      const status = getTranslationStatus(contents.id);
                      const isTranslating = translatingContent === contents.id;
                      
                      return (
                        <TableRow key={contents.id}>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {contents.title}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{contents.type}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {status?.translatedLocales.slice(0, 5).map((locale) => (
                                <Badge key={locale} variant="secondary" className="text-xs">
                                  <Check className="h-3 w-3 mr-0.5" />
                                  {locale?.toUpperCase() ?? locale}
                                </Badge>
                              ))}
                              {(status?.translatedLocales.length || 0) > 5 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{(status?.translatedLocales.length || 0) - 5}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {status?.pendingLocales.length || 16} languages
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isTranslating || (status?.pendingLocales.length || 0) === 0}
                              onClick={() => handleTranslateContent(contents.id, status?.pendingLocales || [])}
                              data-testid={`button-translate-${contents.id}`}
                            >
                              {isTranslating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Languages className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <BulkTranslationManager />
        </TabsContent>

        <TabsContent value="batch" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((tier) => (
              <Card key={tier}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Languages className="h-5 w-5" />
                    Tier {tier} Languages
                  </CardTitle>
                  <CardDescription>
                    {tier === 1 && "Core markets: Arabic, Hindi"}
                    {tier === 2 && "High ROI: Chinese, Russian, Urdu, French"}
                    {tier === 3 && "Growing: German, Persian, Bengali, Filipino"}
                    {tier === 4 && "Niche: Spanish, Turkish, Italian, Japanese, Korean, Hebrew"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {tierLocales[tier as 1 | 2 | 3 | 4].map((locale) => (
                      <Badge key={locale} variant="outline">
                        {SUPPORTED_LOCALES.find((l) => l.code === locale)?.nativeName}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    className="w-full"
                    variant={tier === 1 ? "default" : "outline"}
                    disabled={translateAllMutation.isPending}
                    onClick={() => translateAllMutation.mutate(tier)}
                    data-testid={`button-translate-tier-${tier}`}
                  >
                    {translateAllMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Translate All Content to Tier {tier}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-amber-200 dark:border-amber-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600">
                <AlertCircle className="h-5 w-5" />
                Translation Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>DeepL supports: Arabic, Chinese, Russian, French, German, Spanish, Turkish, Italian, Japanese, Korean</p>
              <p>Fallback needed for: Urdu, Persian, Bengali, Filipino, Hebrew (will be marked for manual translation)</p>
              <p>Each translation consumes API characters. Monitor usage in the stats above.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
