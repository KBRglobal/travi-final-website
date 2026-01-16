import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { ContentTypeBadge } from "@/components/contents-type-badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DashboardLayout, StatCard, AdminSection } from "@/components/admin";
import { Link } from "wouter";
import {
  Target,
  MapPin,
  Building2,
  FileText,
  Utensils,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  Plus,
  ArrowRight,
  RefreshCw,
  Globe,
  Rss,
  Lightbulb,
  AlertTriangle,
  Calendar,
  Eye,
  Search,
  Image,
  Link2,
  Sparkles,
  Settings,
  ChevronDown,
  ChevronUp,
  Languages,
  BarChart3,
  Flame,
  ExternalLink,
  Hash,
  Layers,
} from "lucide-react";
import { useState, useMemo } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ContentWithRelations } from "@shared/schema";

const CONTENT_TARGETS = {
  attraction: { target: 200, label: "Attractions", icon: MapPin, color: "text-blue-600" },
  hotel: { target: 100, label: "Hotels", icon: Building2, color: "text-[#6443F4]" },
  dining: { target: 150, label: "Restaurants", icon: Utensils, color: "text-rose-600" },
  article: { target: 1000, label: "Articles", icon: FileText, color: "text-green-600" },
};

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

export default function Dashboard() {
  const { toast } = useToast();
  const [toolsExpanded, setToolsExpanded] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<{
    attractions: number;
    hotels: number;
    articles: number;
    dining: number;
    drafts: number;
    published: number;
    inReview: number;
    scheduled: number;
  }>({
    queryKey: ["/api/stats"],
  });

  const { data: recentContent, isLoading: contentLoading } = useQuery<ContentWithRelations[]>({
    queryKey: ["/api/contents?limit=5&sort=updatedAt"],
  });

  const { data: rssStats } = useQuery<{ pendingCount: number }>({
    queryKey: ["/api/rss-feeds/stats"],
  });

  const { data: topicStats } = useQuery<{ unusedCount: number }>({
    queryKey: ["/api/topic-bank/stats"],
  });

  const { data: translationStats } = useQuery<Record<string, { translated: number; total: number }>>({
    queryKey: ["/api/translations/coverage"],
  });

  const { data: attentionItems } = useQuery<{
    lowSeo: ContentWithRelations[];
    noViews: ContentWithRelations[];
    scheduledToday: ContentWithRelations[];
  }>({
    queryKey: ["/api/contents/attention"],
  });

  const overallStats = useMemo(() => {
    const published = stats?.published ?? 0;
    const totalTranslated = translationStats
      ? Object.values(translationStats).reduce((sum, lang) => sum + lang.translated, 0)
      : 0;
    const totalPossible = translationStats
      ? Object.values(translationStats).reduce((sum, lang) => sum + lang.total, 0)
      : 0;
    const translationCoverage = totalPossible > 0 ? Math.round((totalTranslated / totalPossible) * 100) : 0;
    return { published, translationCoverage, languageCount: 17 };
  }, [stats, translationStats]);

  const recommendations = useMemo(() => {
    const items: Array<{ id: string; icon: React.ElementType; text: string; action: string; link: string; priority: "high" | "medium" | "low" }> = [];

    if (rssStats?.pendingCount && rssStats.pendingCount > 0) {
      items.push({
        id: "rss",
        icon: Rss,
        text: `${rssStats.pendingCount} articles from RSS waiting for review`,
        action: "Review",
        link: "/admin/rss-feeds",
        priority: "high",
      });
    }

    if (stats?.inReview && stats.inReview > 0) {
      items.push({
        id: "review",
        icon: Clock,
        text: `${stats.inReview} contents items pending approval`,
        action: "Review",
        link: "/admin/contents?status=in_review",
        priority: "high",
      });
    }

    if (attentionItems?.lowSeo && attentionItems.lowSeo.length > 0) {
      items.push({
        id: "seo",
        icon: AlertTriangle,
        text: `${attentionItems.lowSeo.length} pages with SEO score below 70`,
        action: "Improve",
        link: "/admin/contents?filter=low_seo",
        priority: "medium",
      });
    }

    if (attentionItems?.scheduledToday && attentionItems.scheduledToday.length > 0) {
      items.push({
        id: "scheduled",
        icon: Calendar,
        text: `${attentionItems.scheduledToday.length} articles scheduled for today`,
        action: "Check",
        link: "/admin/contents?status=scheduled",
        priority: "medium",
      });
    }

    if (topicStats?.unusedCount && topicStats.unusedCount > 0) {
      items.push({
        id: "topics",
        icon: Lightbulb,
        text: `${topicStats.unusedCount} topics in bank ready for contents`,
        action: "Create",
        link: "/admin/topic-bank",
        priority: "low",
      });
    }

    return items.slice(0, 4);
  }, [rssStats, stats, attentionItems, topicStats]);

  const getContentIcon = (type: string) => {
    switch (type) {
      case "attraction": return MapPin;
      case "hotel": return Building2;
      case "article": return FileText;
      case "dining": return Utensils;
      default: return FileText;
    }
  };

  const getProgressColor = (current: number, target: number) => {
    const pct = (current / target) * 100;
    if (pct >= 80) return "bg-green-500";
    if (pct >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getTranslationStatus = (translated: number, total: number) => {
    const pct = total > 0 ? (translated / total) * 100 : 0;
    if (pct >= 90) return { color: "text-green-600", bg: "bg-green-100", icon: "🟢" };
    if (pct >= 50) return { color: "text-yellow-600", bg: "bg-yellow-100", icon: "🟡" };
    return { color: "text-red-600", bg: "bg-red-100", icon: "🔴" };
  };

  const statsCards = (
    <>
      <StatCard
        label="Attractions"
        value={statsLoading ? "-" : (stats?.attractions ?? 0)}
        icon={<MapPin className="h-4 w-4" />}
        data-testid="stat-attractions"
      />
      <StatCard
        label="Hotels"
        value={statsLoading ? "-" : (stats?.hotels ?? 0)}
        icon={<Building2 className="h-4 w-4" />}
        data-testid="stat-hotels"
      />
      <StatCard
        label="Articles"
        value={statsLoading ? "-" : (stats?.articles ?? 0)}
        icon={<FileText className="h-4 w-4" />}
        data-testid="stat-articles"
      />
      <StatCard
        label="Dining"
        value={statsLoading ? "-" : (stats?.dining ?? 0)}
        icon={<Utensils className="h-4 w-4" />}
        data-testid="stat-dining"
      />
    </>
  );

  return (
    <DashboardLayout
      title="Dashboard"
      description="Content management overview"
      stats={statsCards}
    >
      <AdminSection>
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl p-4 border">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Mission: #1 on Google for Dubai Tourism</h2>
                <p className="text-sm text-muted-foreground">SEO Command Center</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{overallStats.published}</div>
                <div className="text-xs text-muted-foreground">Published</div>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <div className="text-2xl font-bold">{overallStats.languageCount}</div>
                <div className="text-xs text-muted-foreground">Languages</div>
              </div>
            </div>
          </div>
        </div>
      </AdminSection>

      <AdminSection title="Content Overview">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Content Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {statsLoading ? (
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-2 w-full" />
                    </div>
                  ))}
                </div>
              ) : (
                Object.entries(CONTENT_TARGETS).map(([type, config]) => {
                  const count = type === "attraction" ? stats?.attractions ?? 0
                    : type === "hotel" ? stats?.hotels ?? 0
                    : type === "dining" ? stats?.dining ?? 0
                    : stats?.articles ?? 0;
                  const pct = Math.min(100, Math.round((count / config.target) * 100));
                  const Icon = config.icon;

                  return (
                    <Link
                      key={type}
                      href={`/admin/${type}s`}
                      className="block group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${config.color}`} />
                          <span className="text-sm font-medium group-hover:text-primary transition-colors">
                            {config.label}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {count} / {config.target}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${getProgressColor(count, config.target)}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </Link>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-primary" />
                Pipeline Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {statsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <Link href="/admin/contents?status=draft" className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors group">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-gray-400" />
                      <span className="text-sm">Drafts</span>
                    </div>
                    <Badge variant="secondary" className="group-hover:bg-primary group-hover:text-primary-foreground">
                      {stats?.drafts ?? 0}
                    </Badge>
                  </Link>

                  <Link href="/admin/contents?status=in_review" className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors group">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      <span className="text-sm">In Review</span>
                    </div>
                    <Badge variant="secondary" className="group-hover:bg-primary group-hover:text-primary-foreground">
                      {stats?.inReview ?? 0}
                    </Badge>
                  </Link>

                  <Link href="/admin/contents?status=scheduled" className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors group">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-sm">Scheduled</span>
                    </div>
                    <Badge variant="secondary" className="group-hover:bg-primary group-hover:text-primary-foreground">
                      {stats?.scheduled ?? 0}
                    </Badge>
                  </Link>

                  <Link href="/admin/contents?status=published" className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors group">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-sm">Published</span>
                    </div>
                    <Badge variant="secondary" className="group-hover:bg-primary group-hover:text-primary-foreground">
                      {stats?.published ?? 0}
                    </Badge>
                  </Link>

                  <div className="h-px bg-border my-2" />

                  <Link href="/admin/rss-feeds" className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors group">
                    <div className="flex items-center gap-2">
                      <Rss className="h-4 w-4 text-rose-500" />
                      <span className="text-sm">RSS Pending</span>
                    </div>
                    <Badge variant={rssStats?.pendingCount ? "destructive" : "secondary"}>
                      {rssStats?.pendingCount ?? 0}
                    </Badge>
                  </Link>

                  <Link href="/admin/topic-bank" className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors group">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">Topic Bank</span>
                    </div>
                    <Badge variant="secondary">
                      {topicStats?.unusedCount ?? 0}
                    </Badge>
                  </Link>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Languages className="h-4 w-4 text-primary" />
                  Language Coverage
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {overallStats.translationCoverage}% overall
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {[...LANGUAGE_TIERS.tier1, ...LANGUAGE_TIERS.tier2].map((lang) => {
                const langStats = translationStats?.[lang.code];
                const translated = langStats?.translated ?? (lang.code === "en" ? stats?.published ?? 0 : 0);
                const total = langStats?.total ?? stats?.published ?? 0;
                const status = getTranslationStatus(translated, total);

                return (
                  <Link
                    key={lang.code}
                    href={`/admin/translations?lang=${lang.code}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <span>{status.icon}</span>
                      <span className="text-sm">{lang.flag} {lang.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {translated}/{total}
                      </span>
                      {translated < total && (
                        <Button size="sm" variant="ghost" className="h-6 text-xs opacity-0 group-hover:opacity-100">
                          Translate
                        </Button>
                      )}
                    </div>
                  </Link>
                );
              })}
              <div className="pt-2">
                <Link href="/admin/translations">
                  <Button variant="outline" size="sm" className="w-full">
                    <Globe className="h-4 w-4 mr-2" />
                    View All Languages
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminSection>

      <AdminSection
        title="Quick Actions"
        actions={
          <Link href="/admin/contents/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Content
            </Button>
          </Link>
        }
      >
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2 mb-4">
              <Link href="/admin/attractions/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Attraction
                </Button>
              </Link>
              <Link href="/admin/hotels/new">
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Hotel
                </Button>
              </Link>
              <Link href="/admin/dining/new">
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Restaurant
                </Button>
              </Link>
              <Link href="/admin/articles/new">
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Article
                </Button>
              </Link>
            </div>

            {recommendations.length > 0 && (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">Smart Recommendations</span>
                </div>
                <div className="space-y-2">
                  {recommendations.map((rec) => {
                    const Icon = rec.icon;
                    return (
                      <Link
                        key={rec.id}
                        href={rec.link}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors hover:bg-muted ${
                          rec.priority === "high" ? "border-red-200 bg-red-50/50" :
                          rec.priority === "medium" ? "border-yellow-200 bg-yellow-50/50" :
                          "border-border"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`h-4 w-4 ${
                            rec.priority === "high" ? "text-red-500" :
                            rec.priority === "medium" ? "text-yellow-500" :
                            "text-muted-foreground"
                          }`} />
                          <span className="text-sm">{rec.text}</span>
                        </div>
                        <Button size="sm" variant="ghost">
                          {rec.action}
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </AdminSection>

      <AdminSection title="Recent Activity">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Recent Content
              </CardTitle>
              <Link href="/admin/contents">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {contentLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentContent && recentContent.length > 0 ? (
                <div className="space-y-2">
                  {recentContent.slice(0, 5).map((contents) => {
                    const Icon = getContentIcon(contents.type);
                    const timeAgo = getTimeAgo(contents.updatedAt);

                    return (
                      <Link
                        key={contents.id}
                        href={`/admin/${contents.type}s/${contents.id}`}
                        className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{contents.title}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <StatusBadge status={contents.status} />
                            <span className="text-xs text-muted-foreground">
                              {contents.wordCount} words
                            </span>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {timeAgo}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No contents yet. Create your first page!</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                SEO Performance
              </CardTitle>
              <Link href="/admin/analytics">
                <Button variant="ghost" size="sm">
                  Full Report
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="h-4 w-4 text-rose-500" />
                  <span className="text-sm font-medium">Top Performers</span>
                </div>
                <div className="text-center py-6 text-muted-foreground">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Analytics coming soon</p>
                  <p className="text-xs">Connect Google Analytics to see top performing contents</p>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">Needs Attention</span>
                </div>
                <div className="space-y-2">
                  {attentionItems?.lowSeo && attentionItems.lowSeo.length > 0 ? (
                    <Link
                      href="/admin/contents?filter=low_seo"
                      className="flex items-center justify-between p-2 rounded-lg border border-yellow-200 bg-yellow-50/50 hover:bg-yellow-100/50 transition-colors"
                    >
                      <span className="text-sm">Pages with SEO score &lt; 70</span>
                      <Badge variant="outline" className="text-yellow-600">
                        {attentionItems.lowSeo.length}
                      </Badge>
                    </Link>
                  ) : null}
                  {attentionItems?.noViews && attentionItems.noViews.length > 0 ? (
                    <Link
                      href="/admin/contents?filter=no_views"
                      className="flex items-center justify-between p-2 rounded-lg border border-red-200 bg-red-50/50 hover:bg-red-100/50 transition-colors"
                    >
                      <span className="text-sm">No views in 30 days</span>
                      <Badge variant="outline" className="text-red-600">
                        {attentionItems.noViews.length}
                      </Badge>
                    </Link>
                  ) : null}
                  {(!attentionItems?.lowSeo?.length && !attentionItems?.noViews?.length) && (
                    <div className="text-center py-4 text-muted-foreground">
                      <CheckCircle2 className="h-6 w-6 mx-auto mb-1 text-green-500" />
                      <p className="text-sm">All contents looks good</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminSection>

      <AdminSection title="Activity">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Recent Activity
            </CardTitle>
            <Link href="/admin/audit-logs">
              <Button variant="ghost" size="sm">
                View Logs
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground" data-testid="live-activity-empty">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent activity</p>
              <p className="text-xs">Activity will appear here as you work</p>
            </div>
          </CardContent>
        </Card>
      </AdminSection>

      <AdminSection title="Tools & Management">
        <Collapsible open={toolsExpanded} onOpenChange={setToolsExpanded}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="h-4 w-4 text-primary" />
                    Tools & Management
                  </CardTitle>
                  <Button variant="ghost" size="sm">
                    {toolsExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {[
                    { label: "RSS Feeds", icon: Rss, href: "/admin/rss-feeds" },
                    { label: "Topic Bank", icon: Lightbulb, href: "/admin/topic-bank" },
                    { label: "Keywords", icon: Hash, href: "/admin/keywords" },
                    { label: "Media Library", icon: Image, href: "/admin/media" },
                    { label: "Affiliates", icon: Link2, href: "/admin/affiliate-links" },
                    { label: "AI Generator", icon: Sparkles, href: "/admin/ai-generator" },
                    { label: "Image Engine", icon: Image, href: "/admin/image-engine" },
                    { label: "Translations", icon: Globe, href: "/admin/translations" },
                    { label: "Analytics", icon: BarChart3, href: "/admin/analytics" },
                    { label: "Settings", icon: Settings, href: "/admin/settings" },
                  ].map((tool) => {
                    const Icon = tool.icon;
                    return (
                      <Link key={tool.label} href={tool.href}>
                        <Button variant="outline" className="w-full justify-start h-auto py-3">
                          <Icon className="h-4 w-4 mr-2" />
                          <span className="text-sm">{tool.label}</span>
                        </Button>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </AdminSection>
    </DashboardLayout>
  );
}

function getTimeAgo(date: string | Date | null | undefined): string {
  if (!date) return "";
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return past.toLocaleDateString();
}
