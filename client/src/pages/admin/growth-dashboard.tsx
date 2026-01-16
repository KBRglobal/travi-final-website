import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DashboardLayout, StatCard, AdminSection } from "@/components/admin";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock,
  FileText,
  Globe,
  Image,
  Languages,
  Lightbulb,
  MapPin,
  Play,
  RefreshCw,
  TrendingUp,
  XCircle,
  AlertTriangle,
  Zap,
  Calendar,
  Cpu,
  Circle,
} from "lucide-react";

interface OverviewData {
  totalDestinations: number;
  contentCoverage: number;
  imageCoverage: number;
  translationCoverage: number;
  activeTasks: number;
  updatedAt: string;
}

interface ContentPipelineData {
  queue: Array<{
    id: string;
    name: string;
    country: string;
    isActive: boolean;
    status: string;
    seoScore: number;
    wordCount: number;
    lastGenerated: string | null;
  }>;
  completed: Array<{
    id: string;
    name: string;
    status: string;
  }>;
  stats: {
    empty: number;
    partial: number;
    complete: number;
  };
  totalInQueue: number;
  completionRate: number;
  estimatedDaysToComplete: number;
  ratePerDay: number;
}

interface ImagePipelineData {
  needingHeroImage: Array<{
    id: string;
    name: string;
    country: string;
    isActive: boolean;
    sectionImagesCount: number;
  }>;
  needingSectionImages: Array<{
    id: string;
    name: string;
    country: string;
    hasHeroImage: boolean;
    sectionImagesCount: number;
    imagesNeeded: number;
  }>;
  stats: {
    totalWithoutHero: number;
    totalNeedingSections: number;
    totalImagesNeeded: number;
  };
  costEstimate: {
    flux: number;
    dalle: number;
    fluxPerImage: number;
    dallePerImage: number;
  };
}

interface TranslationPipelineData {
  locales: Array<{
    code: string;
    name: string;
    nativeName: string;
    tier: number;
    coverage: {
      translated: number;
      total: number;
      percentage: number;
    };
  }>;
  contentNeedingTranslation: Array<{
    id: string;
    title: string;
    type: string;
    translatedCount: number;
    totalLocales: number;
    missingLocales: Array<{ code: string; name: string; nativeName: string }>;
    coveragePercent: number;
  }>;
  stats: {
    totalPublished: number;
    totalTranslations: number;
    totalLanguages: number;
    overallCoverage: number;
  };
}

interface ActivityLogData {
  activities: Array<{
    id: string;
    type: string;
    targetId: string;
    provider: string;
    model: string;
    success: boolean;
    error: string | null;
    seoScore: number | null;
    qualityTier: string | null;
    duration: number | null;
    timestamp: string;
  }>;
  total: number;
}

interface GrowthMetricsData {
  contents: { thisWeek: number; thisMonth: number };
  images: { thisWeek: number; thisMonth: number };
  translations: { thisWeek: number; thisMonth: number };
  projectedGrowth: { weeklyRate: number; projectedMonthly: number };
  updatedAt: string;
}

interface ProviderStatusItem {
  name: string;
  model: string;
  status: "available" | "rate_limited" | "no_credits" | "not_configured";
  message?: string;
  retryAfter?: number;
}

interface AIStatusData {
  available: boolean;
  provider: string | null;
  safeMode: boolean;
  providerStatuses: ProviderStatusItem[];
  features: {
    textGeneration: boolean;
    imageGeneration: boolean;
    translation: boolean;
  };
}

interface IntelligenceStatsData {
  totalPublished: number;
  indexed: number;
  indexedPercent: number;
  withAEO: number;
  aeoPercent: number;
  entityLinked: number;
  entityLinkedPercent: number;
}

interface JobsData {
  jobs: Array<{
    id: string;
    type: string;
    targetId: string;
    provider: string;
    model: string;
    status: string;
    error: string | null;
    duration: number | null;
    timestamp: string | null;
  }>;
  stats: {
    total: number;
    successful: number;
    failed: number;
    last24h: boolean;
  };
}

interface RssStatusData {
  lastRunTime: string | null;
  processing: {
    itemsProcessed: number;
    entityExtractionSuccess: number;
    entityExtractionFailure: number;
  };
  feeds: Array<{
    id: string;
    name: string;
    isActive: boolean;
    lastFetched: string | null;
  }>;
  clusters: {
    total: number;
    pending: number;
    merged: number;
  };
  recentItems24h: number;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-80" />
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-80" />
        ))}
      </div>
    </div>
  );
}

export default function GrowthDashboard() {
  const { toast } = useToast();

  const { data: overview, isLoading: overviewLoading } = useQuery<OverviewData>({
    queryKey: ["/api/admin/growth/overview"],
  });

  const { data: contentPipeline, isLoading: contentLoading } = useQuery<ContentPipelineData>({
    queryKey: ["/api/admin/growth/contents-pipeline"],
  });

  const { data: imagePipeline, isLoading: imageLoading } = useQuery<ImagePipelineData>({
    queryKey: ["/api/admin/growth/image-pipeline"],
  });

  const { data: translationPipeline, isLoading: translationLoading } = useQuery<TranslationPipelineData>({
    queryKey: ["/api/admin/growth/translation-pipeline"],
  });

  const { data: activityLog, isLoading: activityLoading } = useQuery<ActivityLogData>({
    queryKey: ["/api/admin/growth/activity-log"],
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery<GrowthMetricsData>({
    queryKey: ["/api/admin/growth/metrics"],
  });

  const { data: aiStatus, isLoading: aiStatusLoading } = useQuery<AIStatusData>({
    queryKey: ["/api/ai/status"],
    refetchInterval: 30000,
  });

  const { data: intelligenceStats, isLoading: intelligenceLoading } = useQuery<IntelligenceStatsData>({
    queryKey: ["/api/admin/intelligence-stats"],
  });

  const { data: jobsData, isLoading: jobsLoading } = useQuery<JobsData>({
    queryKey: ["/api/admin/jobs/recent"],
    refetchInterval: 60000,
  });

  const { data: rssStatus, isLoading: rssLoading } = useQuery<RssStatusData>({
    queryKey: ["/api/admin/rss/status"],
    refetchInterval: 60000,
  });

  const triggerImagesMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/growth/trigger-images"),
    onSuccess: () => {
      toast({ title: "Image generation triggered", description: "Processing in background..." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/growth"] });
    },
    onError: () => toast({ title: "Failed to trigger images", variant: "destructive" }),
  });

  const triggerTranslationsMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/growth/trigger-translations"),
    onSuccess: () => {
      toast({ title: "Translation batch triggered", description: "Processing in background..." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/growth"] });
    },
    onError: () => toast({ title: "Failed to trigger translations", variant: "destructive" }),
  });

  if (overviewLoading) {
    return <LoadingSkeleton />;
  }

  const statsContent = (
    <>
      <div data-testid="stat-total-destinations">
        <StatCard
          label="Total Destinations"
          value={overview?.totalDestinations || 0}
          icon={<MapPin className="h-4 w-4" />}
        />
      </div>
      <div data-testid="stat-contents-coverage">
        <StatCard
          label="Content Coverage"
          value={`${overview?.contentCoverage || 0}%`}
          icon={<FileText className="h-4 w-4" />}
        />
      </div>
      <div data-testid="stat-image-coverage">
        <StatCard
          label="Image Coverage"
          value={`${overview?.imageCoverage || 0}%`}
          icon={<Image className="h-4 w-4" />}
        />
      </div>
      <div data-testid="stat-translation-coverage">
        <StatCard
          label="Translation Coverage"
          value={`${overview?.translationCoverage || 0}%`}
          icon={<Languages className="h-4 w-4" />}
        />
      </div>
      <div data-testid="stat-active-tasks">
        <StatCard
          label="Active Tasks"
          value={overview?.activeTasks || 0}
          icon={<Zap className="h-4 w-4" />}
        />
      </div>
    </>
  );

  const actionsContent = (
    <Badge variant={overview?.activeTasks ? "default" : "secondary"} className="text-sm">
      {overview?.activeTasks || 0} Active Tasks
    </Badge>
  );

  return (
    <DashboardLayout
      title="Growth Dashboard"
      description="Track contents and traffic growth"
      stats={statsContent}
      actions={actionsContent}
    >
      <AdminSection title="Pipelines">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Content Generation Pipeline
              </CardTitle>
              <CardDescription>
                Destinations awaiting contents generation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg border">
                <h3 className="font-medium flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  How It Works / איך זה עובד
                </h3>
                <p className="text-sm text-muted-foreground">
                  Content is generated for destinations in priority order: active destinations first, 
                  then by status (empty, partial, complete). Rate: 3 destinations per day.
                  <br />
                  <span className="text-xs">
                    תוכן נוצר ליעדים לפי סדר עדיפות: יעדים פעילים קודם, 
                    ואז לפי סטטוס (ריק, חלקי, מלא). קצב: 3 יעדים ביום.
                  </span>
                </p>
              </div>

              {contentLoading ? (
                <Skeleton className="h-40" />
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span>Overall Progress</span>
                    <span className="font-medium">{contentPipeline?.completionRate || 0}%</span>
                  </div>
                  <Progress value={contentPipeline?.completionRate || 0} className="h-2" />

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 rounded-lg bg-muted">
                      <div className="text-lg font-bold text-red-600" data-testid="stat-contents-empty">
                        {contentPipeline?.stats.empty || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Empty</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted">
                      <div className="text-lg font-bold text-yellow-600" data-testid="stat-contents-partial">
                        {contentPipeline?.stats.partial || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Partial</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted">
                      <div className="text-lg font-bold text-green-600" data-testid="stat-contents-complete">
                        {contentPipeline?.stats.complete || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Complete</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Est. Completion</span>
                    </div>
                    <span className="font-medium">{contentPipeline?.estimatedDaysToComplete || 0} days</span>
                  </div>

                  <ScrollArea className="h-[150px]">
                    <div className="space-y-2">
                      {contentPipeline?.queue.slice(0, 10).map((dest) => (
                        <div
                          key={dest.id}
                          className="flex items-center justify-between p-2 rounded-lg border"
                          data-testid={`contents-queue-item-${dest.id}`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{dest.name}</p>
                            <p className="text-xs text-muted-foreground">{dest.country}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {dest.isActive && <Badge variant="outline" className="text-xs">Active</Badge>}
                            <Badge 
                              variant={dest.status === "empty" ? "destructive" : "secondary"}
                              className="text-xs"
                            >
                              {dest.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      {(!contentPipeline?.queue || contentPipeline.queue.length === 0) && (
                        <div className="text-center py-4 text-muted-foreground">
                          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">All destinations have contents</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Image Generation Pipeline
              </CardTitle>
              <CardDescription>
                Destinations needing images
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg border">
                <h3 className="font-medium flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  How It Works / איך זה עובד
                </h3>
                <p className="text-sm text-muted-foreground">
                  Images are generated using Flux (faster, cheaper) or DALL-E (higher quality). 
                  Each destination needs 1 hero + 4 section images.
                  <br />
                  <span className="text-xs">
                    תמונות נוצרות באמצעות Flux (מהיר וזול יותר) או DALL-E (איכות גבוהה יותר).
                    כל יעד צריך 1 תמונה ראשית + 4 תמונות סעיפים.
                  </span>
                </p>
              </div>

              {imageLoading ? (
                <Skeleton className="h-40" />
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-3 rounded-lg bg-muted">
                      <div className="text-lg font-bold" data-testid="stat-no-hero">
                        {imagePipeline?.stats.totalWithoutHero || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Need Hero Image</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted">
                      <div className="text-lg font-bold" data-testid="stat-need-sections">
                        {imagePipeline?.stats.totalNeedingSections || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Need Section Images</div>
                    </div>
                  </div>

                  <div className="p-3 bg-muted rounded-lg space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Total Images Needed</span>
                      <span className="font-bold">{imagePipeline?.stats.totalImagesNeeded || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Flux Cost (${imagePipeline?.costEstimate.fluxPerImage}/img)</span>
                      <span className="font-medium">${imagePipeline?.costEstimate.flux.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>DALL-E Cost (${imagePipeline?.costEstimate.dallePerImage}/img)</span>
                      <span className="font-medium">${imagePipeline?.costEstimate.dalle.toFixed(2)}</span>
                    </div>
                  </div>

                  <ScrollArea className="h-[120px]">
                    <div className="space-y-2">
                      {imagePipeline?.needingHeroImage.slice(0, 8).map((dest) => (
                        <div
                          key={dest.id}
                          className="flex items-center justify-between p-2 rounded-lg border"
                          data-testid={`image-queue-item-${dest.id}`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{dest.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {dest.sectionImagesCount}/4 section images
                            </p>
                          </div>
                          <Badge variant="destructive" className="text-xs">No Hero</Badge>
                        </div>
                      ))}
                      {(!imagePipeline?.needingHeroImage || imagePipeline.needingHeroImage.length === 0) && (
                        <div className="text-center py-4 text-muted-foreground">
                          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">All destinations have hero images</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  <Button
                    onClick={() => triggerImagesMutation.mutate()}
                    disabled={triggerImagesMutation.isPending}
                    className="w-full"
                    variant="outline"
                    data-testid="button-trigger-images"
                  >
                    <Play className={`mr-2 h-4 w-4 ${triggerImagesMutation.isPending ? "animate-spin" : ""}`} />
                    Generate Images
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Languages className="h-5 w-5" />
                Translation Pipeline
              </CardTitle>
              <CardDescription>
                Content awaiting translation ({translationPipeline?.stats.totalLanguages || 17} languages)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg border">
                <h3 className="font-medium flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  How It Works / איך זה עובד
                </h3>
                <p className="text-sm text-muted-foreground">
                  Published contents is automatically translated to all supported languages. 
                  Priority: Tier 1 (core markets) first.
                  <br />
                  <span className="text-xs">
                    תוכן שפורסם מתורגם אוטומטית לכל השפות הנתמכות.
                    עדיפות: רמה 1 (שווקי ליבה) קודם.
                  </span>
                </p>
              </div>

              {translationLoading ? (
                <Skeleton className="h-40" />
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span>Overall Coverage</span>
                    <span className="font-medium">{translationPipeline?.stats.overallCoverage || 0}%</span>
                  </div>
                  <Progress value={translationPipeline?.stats.overallCoverage || 0} className="h-2" />

                  <ScrollArea className="h-[180px]">
                    <div className="space-y-2">
                      {translationPipeline?.locales.slice(0, 12).map((locale) => (
                        <div
                          key={locale.code}
                          className="flex items-center justify-between p-2 rounded-lg border"
                          data-testid={`translation-locale-${locale.code}`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium truncate">{locale.name}</p>
                              <p className="text-xs text-muted-foreground">{locale.nativeName}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {locale.tier === 1 && (
                              <Badge variant="outline" className="text-xs">Tier 1</Badge>
                            )}
                            <div className="w-16">
                              <Progress value={locale.coverage.percentage} className="h-1.5" />
                            </div>
                            <span className="text-xs font-medium w-10 text-right">
                              {locale.coverage.percentage}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  <Button
                    onClick={() => triggerTranslationsMutation.mutate()}
                    disabled={triggerTranslationsMutation.isPending}
                    className="w-full"
                    variant="outline"
                    data-testid="button-trigger-translations"
                  >
                    <Play className={`mr-2 h-4 w-4 ${triggerTranslationsMutation.isPending ? "animate-spin" : ""}`} />
                    Trigger Translation Batch
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Activity Timeline
              </CardTitle>
              <CardDescription>
                Recent auto-pilot activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-muted rounded-lg border mb-4">
                <h3 className="font-medium flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  How It Works / איך זה עובד
                </h3>
                <p className="text-sm text-muted-foreground">
                  All automated actions are logged here with status and details. 
                  Green = success, Yellow = warning, Red = error.
                  <br />
                  <span className="text-xs">
                    כל הפעולות האוטומטיות נרשמות כאן עם סטטוס ופרטים.
                    ירוק = הצלחה, צהוב = אזהרה, אדום = שגיאה.
                  </span>
                </p>
              </div>

              {activityLoading ? (
                <Skeleton className="h-60" />
              ) : (
                <ScrollArea className="h-[280px]">
                  <div className="space-y-2">
                    {activityLog?.activities.map((activity) => (
                      <div
                        key={activity.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border ${
                          activity.success
                            ? "border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20"
                            : "border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20"
                        }`}
                        data-testid={`activity-item-${activity.id}`}
                      >
                        {activity.success ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">{activity.type}</Badge>
                            <span className="text-xs text-muted-foreground">{activity.provider}</span>
                          </div>
                          <p className="text-sm mt-1 truncate">
                            Target: {activity.targetId}
                          </p>
                          {activity.error && (
                            <p className="text-xs text-red-600 mt-1 truncate">{activity.error}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{new Date(activity.timestamp).toLocaleString()}</span>
                            {activity.duration && <span>{activity.duration}ms</span>}
                            {activity.seoScore && <span>SEO: {activity.seoScore}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!activityLog?.activities || activityLog.activities.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No recent activity</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </AdminSection>

      <AdminSection title="Intelligence Metrics">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              Content Intelligence
            </CardTitle>
            <CardDescription>
              Coverage metrics for indexed, AEO, and entity-linked contents
            </CardDescription>
          </CardHeader>
          <CardContent>
            {intelligenceLoading ? (
              <Skeleton className="h-32" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-muted space-y-2" data-testid="stat-total-published">
                  <div className="text-sm text-muted-foreground">Total Published</div>
                  <div className="text-2xl font-bold">{intelligenceStats?.totalPublished || 0}</div>
                </div>
                <div className="p-4 rounded-lg bg-muted space-y-2" data-testid="stat-indexed-percent">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Indexed</span>
                    <Badge variant="outline" className="text-xs">{intelligenceStats?.indexed || 0}</Badge>
                  </div>
                  <div className="text-2xl font-bold">{intelligenceStats?.indexedPercent || 0}%</div>
                  <Progress value={intelligenceStats?.indexedPercent || 0} className="h-1.5" />
                </div>
                <div className="p-4 rounded-lg bg-muted space-y-2" data-testid="stat-aeo-percent">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">AEO Coverage</span>
                    <Badge variant="outline" className="text-xs">{intelligenceStats?.withAEO || 0}</Badge>
                  </div>
                  <div className="text-2xl font-bold">{intelligenceStats?.aeoPercent || 0}%</div>
                  <Progress value={intelligenceStats?.aeoPercent || 0} className="h-1.5" />
                </div>
                <div className="p-4 rounded-lg bg-muted space-y-2" data-testid="stat-entity-linked-percent">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Entity-Linked</span>
                    <Badge variant="outline" className="text-xs">{intelligenceStats?.entityLinked || 0}</Badge>
                  </div>
                  <div className="text-2xl font-bold">{intelligenceStats?.entityLinkedPercent || 0}%</div>
                  <Progress value={intelligenceStats?.entityLinkedPercent || 0} className="h-1.5" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </AdminSection>

      <AdminSection title="Growth Metrics">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Growth Metrics Over Time
            </CardTitle>
            <CardDescription>
              Content, images, and translations performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-muted rounded-lg border mb-4">
              <h3 className="font-medium flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                How It Works / איך זה עובד
              </h3>
              <p className="text-sm text-muted-foreground">
                Track weekly and monthly progress across all automated contents generation. 
                Projections are based on current weekly rate.
                <br />
                <span className="text-xs">
                  עקוב אחר ההתקדמות השבועית והחודשית בכל יצירת התוכן האוטומטית.
                  התחזיות מבוססות על הקצב השבועי הנוכחי.
                </span>
              </p>
            </div>

            {metricsLoading ? (
              <Skeleton className="h-40" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-muted space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">Content Published</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div>
                      <div className="text-xl font-bold" data-testid="metric-contents-week">
                        {metrics?.contents.thisWeek || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">This Week</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold" data-testid="metric-contents-month">
                        {metrics?.contents.thisMonth || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">This Month</div>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted space-y-3">
                  <div className="flex items-center gap-2">
                    <Image className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Images Generated</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div>
                      <div className="text-xl font-bold" data-testid="metric-images-week">
                        {metrics?.images.thisWeek || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">This Week</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold" data-testid="metric-images-month">
                        {metrics?.images.thisMonth || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">This Month</div>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted space-y-3">
                  <div className="flex items-center gap-2">
                    <Languages className="h-5 w-5 text-[#6443F4]" />
                    <span className="font-medium">Translations</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div>
                      <div className="text-xl font-bold" data-testid="metric-translations-week">
                        {metrics?.translations.thisWeek || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">This Week</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold" data-testid="metric-translations-month">
                        {metrics?.translations.thisMonth || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">This Month</div>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted space-y-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-orange-600" />
                    <span className="font-medium">Projected Growth</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div>
                      <div className="text-xl font-bold" data-testid="metric-weekly-rate">
                        {metrics?.projectedGrowth.weeklyRate || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Weekly Rate</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold" data-testid="metric-projected-monthly">
                        {metrics?.projectedGrowth.projectedMonthly || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Proj. Monthly</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </AdminSection>

      <AdminSection title="AI Provider Status">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              AI Provider Status
            </CardTitle>
            <CardDescription>
              Status of AI providers used for contents generation
            </CardDescription>
          </CardHeader>
          <CardContent>
            {aiStatusLoading ? (
              <Skeleton className="h-40" />
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg border">
                  <h3 className="font-medium flex items-center gap-2 mb-2">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    How It Works
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    The system tries providers in order: Anthropic, OpenRouter, DeepSeek, Replit AI (free fallback), then OpenAI.
                    Rate-limited providers are skipped for 5 minutes.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {aiStatus?.providerStatuses?.map((provider) => (
                    <div
                      key={provider.name}
                      className="flex items-start gap-3 p-3 rounded-lg border"
                      data-testid={`provider-status-${provider.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    >
                      <Circle
                        className={`h-4 w-4 mt-0.5 ${
                          provider.status === "available"
                            ? "text-green-500 fill-green-500"
                            : provider.status === "rate_limited"
                            ? "text-yellow-500 fill-yellow-500"
                            : provider.status === "no_credits"
                            ? "text-red-500 fill-red-500"
                            : "text-muted-foreground"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm">{provider.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {provider.model}
                        </div>
                        <div className="text-xs mt-1">
                          {provider.status === "available" && (
                            <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                              Available
                            </Badge>
                          )}
                          {provider.status === "rate_limited" && (
                            <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-200">
                              Rate Limited{provider.retryAfter ? ` (${provider.retryAfter}s)` : ""}
                            </Badge>
                          )}
                          {provider.status === "no_credits" && (
                            <Badge variant="outline" className="text-xs text-red-600 border-red-200">
                              No Credits
                            </Badge>
                          )}
                          {provider.status === "not_configured" && (
                            <Badge variant="secondary" className="text-xs">
                              Not Configured
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">System Status</span>
                  </div>
                  <Badge
                    variant={aiStatus?.available ? "default" : "destructive"}
                  >
                    {aiStatus?.available ? "AI Available" : "AI Unavailable"}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </AdminSection>

      <AdminSection title="System Observability">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Jobs (Last 24h)
              </CardTitle>
              <CardDescription>
                AI generation jobs and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <Skeleton className="h-40" />
              ) : (jobsData?.jobs && jobsData.jobs.length > 0) ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                    <div className="flex items-center gap-1" data-testid="stat-jobs-successful">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>{jobsData.stats.successful} successful</span>
                    </div>
                    <div className="flex items-center gap-1" data-testid="stat-jobs-failed">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span>{jobsData.stats.failed} failed</span>
                    </div>
                  </div>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {jobsData.jobs.slice(0, 20).map((job) => (
                        <div
                          key={job.id}
                          className="flex items-center justify-between p-2 rounded-lg border text-sm"
                          data-testid={`job-item-${job.id}`}
                        >
                          <div className="flex items-center gap-2">
                            {job.status === "success" ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                            <span className="font-medium">{job.type}</span>
                            <Badge variant="outline" className="text-xs">
                              {job.provider}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {job.duration ? `${job.duration}ms` : "-"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-center" data-testid="empty-jobs">
                  <Activity className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No jobs in the last 24 hours</p>
                  <p className="text-xs text-muted-foreground">AI generation jobs will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                RSS & Topic Clusters
              </CardTitle>
              <CardDescription>
                RSS feed processing and topic clustering status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rssLoading ? (
                <Skeleton className="h-40" />
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-3 rounded-lg bg-muted">
                      <div className="text-lg font-bold" data-testid="stat-clusters-total">
                        {rssStatus?.clusters.total || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Total Clusters</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted">
                      <div className="text-lg font-bold text-yellow-600" data-testid="stat-clusters-pending">
                        {rssStatus?.clusters.pending || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Pending</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted">
                      <div className="text-lg font-bold text-green-600" data-testid="stat-clusters-merged">
                        {rssStatus?.clusters.merged || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Merged</div>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Items fetched (24h): <span className="font-medium">{rssStatus?.recentItems24h || 0}</span>
                  </div>

                  {rssStatus?.feeds && rssStatus.feeds.length > 0 ? (
                    <ScrollArea className="h-32">
                      <div className="space-y-2">
                        {rssStatus.feeds.map((feed) => (
                          <div
                            key={feed.id}
                            className="flex items-center justify-between p-2 rounded-lg border text-sm"
                            data-testid={`feed-item-${feed.id}`}
                          >
                            <div className="flex items-center gap-2">
                              <Circle
                                className={`h-3 w-3 ${feed.isActive ? "text-green-500 fill-green-500" : "text-muted-foreground"}`}
                              />
                              <span className="truncate max-w-[150px]">{feed.name}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {feed.lastFetched ? new Date(feed.lastFetched).toLocaleDateString() : "Never"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-24 text-center" data-testid="empty-feeds">
                      <Globe className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">No RSS feeds configured</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </AdminSection>
    </DashboardLayout>
  );
}
