import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  Check,
  X,
  Edit3,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileText,
  MapPin,
  Hotel,
  Utensils,
  Building2,
  Calendar,
  Bus,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  PlayCircle,
} from "lucide-react";
import type { ContentSuggestion, ResearchUpload } from "@shared/schema";

type SuggestionStatus = "pending" | "approved" | "rejected" | "generating" | "generated" | "published";

const CONTENT_TYPE_CONFIG: Record<string, { label: string; labelHe: string; icon: typeof FileText; color: string }> = {
  article: { label: "Articles", labelHe: "מאמרים", icon: FileText, color: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
  attraction: { label: "Attractions", labelHe: "אטרקציות", icon: MapPin, color: "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" },
  hotel: { label: "Hotels", labelHe: "מלונות", icon: Hotel, color: "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
  dining: { label: "Dining", labelHe: "מסעדות", icon: Utensils, color: "bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800" },
  district: { label: "Districts", labelHe: "שכונות", icon: Building2, color: "bg-[#6443F4]/10 dark:bg-[#6443F4]/20 text-[#6443F4] dark:text-[#6443F4] border-[#6443F4]/30 dark:border-[#6443F4]/30" },
  event: { label: "Events", labelHe: "אירועים", icon: Calendar, color: "bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800" },
  transport: { label: "Transport", labelHe: "תחבורה", icon: Bus, color: "bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800" },
};

const STATUS_CONFIG: Record<SuggestionStatus, { label: string; labelHe: string; className: string; icon: typeof Clock }> = {
  pending: {
    label: "Pending",
    labelHe: "ממתין",
    className: "border-amber-400 text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900",
    icon: Clock,
  },
  approved: {
    label: "Approved",
    labelHe: "אושר",
    className: "border-emerald-400 text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    labelHe: "נדחה",
    className: "border-rose-400 text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900",
    icon: XCircle,
  },
  generating: {
    label: "Generating",
    labelHe: "מייצר",
    className: "border-blue-400 text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900",
    icon: Loader2,
  },
  generated: {
    label: "Generated",
    labelHe: "נוצר",
    className: "border-[#6443F4] text-[#6443F4] dark:text-[#6443F4] bg-[#6443F4]/10 dark:bg-[#6443F4]/20",
    icon: Sparkles,
  },
  published: {
    label: "Published",
    labelHe: "פורסם",
    className: "border-emerald-500 text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-900",
    icon: CheckCircle2,
  },
};

interface ResearchWithSuggestions extends ResearchUpload {
  suggestions: ContentSuggestion[];
}

interface GroupedSuggestionsResponse {
  researchId: string;
  totalSuggestions: number;
  byContentType: Record<string, ContentSuggestion[]>;
}

function StatusBadge({ status }: { status: SuggestionStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const isSpinning = status === "generating";

  return (
    <Badge
      variant="outline"
      className={`${config.className} gap-1.5 no-default-hover-elevate`}
      data-testid={`badge-suggestion-status-${status}`}
    >
      <Icon className={`w-3 h-3 ${isSpinning ? "animate-spin" : ""}`} />
      <span className="hidden sm:inline">{config.label}</span>
      <span className="sm:hidden">{config.labelHe}</span>
    </Badge>
  );
}

function ContentTypeBadge({ type }: { type: string }) {
  const config = CONTENT_TYPE_CONFIG[type] || { label: type, labelHe: type, icon: FileText, color: "bg-muted text-muted-foreground" };
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={`${config.color} gap-1.5 no-default-hover-elevate`}
      data-testid={`badge-contents-type-${type}`}
    >
      <Icon className="w-3 h-3" />
      <span className="hidden sm:inline">{config.label}</span>
      <span className="sm:hidden">{config.labelHe}</span>
    </Badge>
  );
}

interface SuggestionCardProps {
  suggestion: ContentSuggestion;
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
  onGenerate: () => void;
  isUpdating: boolean;
}

function SuggestionCard({ suggestion, onApprove, onReject, onEdit, onGenerate, isUpdating }: SuggestionCardProps) {
  const [keyPointsOpen, setKeyPointsOpen] = useState(false);
  const [excerptOpen, setExcerptOpen] = useState(false);
  
  const keyPoints = (suggestion.keyPoints as string[] | null) || [];
  const keywords = (suggestion.keywords as string[] | null) || [];
  const status = suggestion.status as SuggestionStatus;
  const canApprove = status === "pending" || status === "rejected";
  const canReject = status === "pending" || status === "approved";
  const canGenerate = status === "approved";

  return (
    <Card className="overflow-visible" data-testid={`card-suggestion-${suggestion.id}`}>
      <CardHeader className="pb-3 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <ContentTypeBadge type={suggestion.contentType} />
            {suggestion.category && (
              <Badge variant="secondary" className="text-xs" data-testid={`badge-category-${suggestion.id}`}>
                {suggestion.category}
              </Badge>
            )}
          </div>
          <StatusBadge status={status} />
        </div>
        <CardTitle className="text-lg leading-snug" data-testid={`text-suggestion-title-${suggestion.id}`}>
          {suggestion.suggestedTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestion.summary && (
          <p className="text-sm text-muted-foreground leading-relaxed" data-testid={`text-suggestion-summary-${suggestion.id}`}>
            {suggestion.summary}
          </p>
        )}

        {suggestion.priority !== null && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Priority / עדיפות</span>
              <span className="font-medium" data-testid={`text-priority-${suggestion.id}`}>{suggestion.priority}/100</span>
            </div>
            <Progress value={suggestion.priority || 0} className="h-1.5" />
          </div>
        )}

        {keyPoints.length > 0 && (
          <Collapsible open={keyPointsOpen} onOpenChange={setKeyPointsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between gap-2 text-muted-foreground"
                data-testid={`button-toggle-keypoints-${suggestion.id}`}
              >
                <span className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5" />
                  Key Points / נקודות מפתח ({keyPoints.length})
                </span>
                {keyPointsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <ul className="space-y-1.5 text-sm text-muted-foreground pl-4" data-testid={`list-keypoints-${suggestion.id}`} dir="rtl">
                {keyPoints.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-[#7B4BA4] mt-1.5">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        )}

        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5" data-testid={`keywords-${suggestion.id}`}>
            {keywords.map((keyword, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className="text-xs bg-muted border-muted-foreground/20 no-default-hover-elevate"
              >
                {keyword}
              </Badge>
            ))}
          </div>
        )}

        {suggestion.sourceExcerpt && (
          <Collapsible open={excerptOpen} onOpenChange={setExcerptOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between gap-2 text-muted-foreground"
                data-testid={`button-toggle-excerpt-${suggestion.id}`}
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" />
                  Source Excerpt / קטע מקור
                </span>
                {excerptOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <p className="text-xs text-muted-foreground italic bg-muted p-3 rounded-md" data-testid={`text-excerpt-${suggestion.id}`}>
                "{suggestion.sourceExcerpt}"
              </p>
            </CollapsibleContent>
          </Collapsible>
        )}

        {suggestion.rejectionReason && (
          <div className="text-xs text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900 p-2 rounded-md" data-testid={`text-rejection-reason-${suggestion.id}`}>
            <strong dir="rtl">סיבת דחייה:</strong> {suggestion.rejectionReason}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
          {canApprove && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-emerald-600 border-emerald-500/30"
              onClick={onApprove}
              disabled={isUpdating}
              data-testid={`button-approve-${suggestion.id}`}
            >
              <Check className="w-3.5 h-3.5" />
              Approve / אשר
            </Button>
          )}
          {canReject && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-[#6443F4] border-[#6443F4]/30"
              onClick={onReject}
              disabled={isUpdating}
              data-testid={`button-reject-${suggestion.id}`}
            >
              <X className="w-3.5 h-3.5" />
              Reject / דחה
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={onEdit}
            disabled={isUpdating}
            data-testid={`button-edit-${suggestion.id}`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit / ערוך
          </Button>
          {canGenerate && (
            <Button
              size="sm"
              className="gap-1.5 bg-[#6443F4] text-white ml-auto"
              onClick={onGenerate}
              disabled={isUpdating}
              data-testid={`button-generate-${suggestion.id}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Generate / ייצר
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SuggestionsReviewPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<ContentSuggestion | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editSummary, setEditSummary] = useState("");

  const { data: research, isLoading: isLoadingResearch } = useQuery<ResearchWithSuggestions>({
    queryKey: ["/api/research-uploads", id],
    enabled: !!id,
  });

  const { data: groupedData, isLoading: isLoadingGrouped } = useQuery<GroupedSuggestionsResponse>({
    queryKey: ["/api/research-uploads", id, "suggestions"],
    enabled: !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ suggestionId, status, rejectionReason }: { suggestionId: string; status: string; rejectionReason?: string }) => {
      const res = await apiRequest("PATCH", `/api/research-suggestions/${suggestionId}/status`, { status, rejectionReason });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Suggestion updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/research-uploads", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/research-uploads", id, "suggestions"] });
      setRejectDialogOpen(false);
      setRejectionReason("");
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const batchGenerateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/research-batch/generate", { researchId: id });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Generation started",
        description: `Processing ${data.processing} approved suggestions`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/research-uploads", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/research-uploads", id, "suggestions"] });
    },
    onError: (error: Error) => {
      toast({ title: "Generation failed", description: error.message, variant: "destructive" });
    },
  });

  const handleApprove = (suggestion: ContentSuggestion) => {
    updateStatusMutation.mutate({ suggestionId: suggestion.id, status: "approved" });
  };

  const handleRejectClick = (suggestion: ContentSuggestion) => {
    setSelectedSuggestion(suggestion);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (selectedSuggestion) {
      updateStatusMutation.mutate({
        suggestionId: selectedSuggestion.id,
        status: "rejected",
        rejectionReason: rejectionReason || undefined,
      });
    }
  };

  const handleEditClick = (suggestion: ContentSuggestion) => {
    setSelectedSuggestion(suggestion);
    setEditTitle(suggestion.suggestedTitle);
    setEditCategory(suggestion.category || "");
    setEditSummary(suggestion.summary || "");
    setEditDialogOpen(true);
  };

  const handleGenerate = (suggestion: ContentSuggestion) => {
    if (suggestion.status !== "approved") {
      updateStatusMutation.mutate({ suggestionId: suggestion.id, status: "approved" });
    }
    toast({ title: "Single generation not yet implemented", description: "Use 'Generate All Approved' instead" });
  };

  const isLoading = isLoadingResearch || isLoadingGrouped;
  const suggestions = research?.suggestions || [];
  const contentTypes = groupedData?.byContentType || {};

  const stats = {
    total: suggestions.length,
    pending: suggestions.filter(s => s.status === "pending").length,
    approved: suggestions.filter(s => s.status === "approved").length,
    rejected: suggestions.filter(s => s.status === "rejected").length,
    generated: suggestions.filter(s => s.status === "generated" || s.status === "published").length,
  };

  const filteredSuggestions = activeTab === "all"
    ? suggestions
    : contentTypes[activeTab] || [];

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-8 w-full max-w-md" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  if (!research) {
    return (
      <div className="max-w-6xl mx-auto text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Document not found / מסמך לא נמצא</h2>
        <p className="text-muted-foreground mb-6">The research document you're looking for doesn't exist.</p>
        <Link href="/admin/research">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Octopus / חזור למערכת התמנון
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="space-y-4">
          <Link href="/admin/research">
            <Button variant="ghost" size="sm" className="gap-2 mb-2" data-testid="button-back-research">
              <ArrowLeft className="w-4 h-4" />
              Back to Octopus / חזור למערכת התמנון
            </Button>
          </Link>
          
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" data-testid="heading-research-title">
                  {research.title}
                </h1>
                <Badge
                  variant="outline"
                  className={`${STATUS_CONFIG[research.status as SuggestionStatus]?.className || "border-muted text-muted-foreground"} no-default-hover-elevate`}
                  data-testid="badge-research-status"
                >
                  <span className="hidden sm:inline">{research.status}</span>
                  <span className="sm:hidden">{STATUS_CONFIG[research.status as SuggestionStatus]?.labelHe || research.status}</span>
                </Badge>
              </div>
              <p className="text-muted-foreground" dir="rtl">
                סקור ואשר הצעות תוכן שהופקו מהמחקר שלך
              </p>
              <p className="text-muted-foreground">
                Review and approve contents suggestions extracted from your research
              </p>
            </div>

            <Button
              className="gap-2 bg-[#6443F4] text-white shrink-0 h-11 px-6 text-base"
              onClick={() => batchGenerateMutation.mutate()}
              disabled={stats.approved === 0 || batchGenerateMutation.isPending}
              data-testid="button-generate-all"
            >
              {batchGenerateMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <PlayCircle className="w-5 h-5" />
              )}
              Generate All Approved ({stats.approved}) / ייצר הכל ({stats.approved})
            </Button>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted">
              <span className="text-sm text-muted-foreground">Total / סה"כ:</span>
              <span className="font-semibold" data-testid="stat-total">{stats.total}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-100 dark:bg-amber-900">
              <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="text-sm text-amber-700 dark:text-amber-300">Pending / ממתין:</span>
              <span className="font-semibold text-amber-700 dark:text-amber-300" data-testid="stat-pending">{stats.pending}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm text-emerald-700 dark:text-emerald-300">Approved / אושר:</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-300" data-testid="stat-approved">{stats.approved}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-rose-100 dark:bg-rose-900">
              <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span className="text-sm text-rose-700 dark:text-rose-300">Rejected / נדחה:</span>
              <span className="font-semibold text-rose-700 dark:text-rose-300" data-testid="stat-rejected">{stats.rejected}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#6443F4]/10 dark:bg-[#6443F4]/20">
              <Sparkles className="w-3.5 h-3.5 text-[#6443F4] dark:text-[#6443F4]" />
              <span className="text-sm text-[#6443F4] dark:text-[#6443F4]">Generated / נוצר:</span>
              <span className="font-semibold text-[#6443F4] dark:text-[#6443F4]" data-testid="stat-generated">{stats.generated}</span>
            </div>
          </div>
        </header>

        <div className="p-4 bg-muted rounded-lg border">
          <h3 className="font-medium flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-primary" />
            איך זה עובד / How It Works
          </h3>
          <p className="text-sm text-muted-foreground mb-1" dir="rtl">
            סקור את הצעות התוכן שהופקו. באפשרותך לאשר, לדחות או לערוך כל הצעה. לאחר האישור, לחץ על "ייצר הכל" כדי ליצור את התוכן המלא.
          </p>
          <p className="text-sm text-muted-foreground">
            Review the generated contents suggestions. You can approve, reject, or edit each suggestion. Once approved, click "Generate All" to create the full contents.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex-wrap h-auto gap-1 p-1.5 bg-muted" data-testid="tabs-contents-types">
            <TabsTrigger value="all" className="gap-1.5" data-testid="tab-all">
              All / הכל
              <Badge variant="secondary" className="ml-1">{stats.total}</Badge>
            </TabsTrigger>
            {Object.entries(CONTENT_TYPE_CONFIG).map(([type, config]) => {
              const count = (contentTypes[type] || []).length;
              if (count === 0) return null;
              const Icon = config.icon;
              return (
                <TabsTrigger key={type} value={type} className="gap-1.5" data-testid={`tab-${type}`}>
                  <Icon className="w-3.5 h-3.5" />
                  {config.label} / {config.labelHe}
                  <Badge variant="secondary" className="ml-1">{count}</Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            {filteredSuggestions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p dir="rtl">אין הצעות בקטגוריה זו</p>
                <p>No suggestions in this category</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredSuggestions.map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    onApprove={() => handleApprove(suggestion)}
                    onReject={() => handleRejectClick(suggestion)}
                    onEdit={() => handleEditClick(suggestion)}
                    onGenerate={() => handleGenerate(suggestion)}
                    isUpdating={updateStatusMutation.isPending}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Suggestion / דחה הצעה</DialogTitle>
              <DialogDescription dir="rtl">
                ניתן לספק סיבה לדחיית ההצעה הזו (אופציונלי).
              </DialogDescription>
              <DialogDescription>
                Optionally provide a reason for rejecting this suggestion.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                placeholder="Enter rejection reason (optional)... / הזן סיבת דחייה (אופציונלי)..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[100px]"
                data-testid="input-rejection-reason"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)} data-testid="button-cancel-reject">
                Cancel / ביטול
              </Button>
              <Button
                onClick={handleRejectConfirm}
                disabled={updateStatusMutation.isPending}
                className="bg-[#6443F4] text-white"
                data-testid="button-confirm-reject"
              >
                {updateStatusMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reject / דחה"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Suggestion / עריכת הצעה</DialogTitle>
              <DialogDescription dir="rtl">
                שנה את פרטי ההצעה לפני ייצור התוכן.
              </DialogDescription>
              <DialogDescription>
                Modify the suggestion details before generating contents.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title / כותרת</label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Suggested title"
                  data-testid="input-edit-title"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Category / קטגוריה</label>
                <Input
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  placeholder="Category"
                  data-testid="input-edit-category"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Summary / תמצית</label>
                <Textarea
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  placeholder="Brief summary..."
                  className="min-h-[100px]"
                  data-testid="input-edit-summary"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)} data-testid="button-cancel-edit">
                Cancel / ביטול
              </Button>
              <Button
                onClick={() => {
                  toast({ title: "Edit functionality coming soon" });
                  setEditDialogOpen(false);
                }}
                className="bg-[#6443F4] text-white"
                data-testid="button-save-edit"
              >
                Save Changes / שמור שינויים
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
