import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Upload,
  FileText,
  ClipboardPaste,
  Loader2,
  Trash2,
  RefreshCw,
  Lightbulb,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  AlertCircle,
  File,
  Zap,
} from "lucide-react";
import { AIChatPanel } from "@/components/ai-chat-panel";
import type { ResearchUpload } from "@shared/schema";

const uploadFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  contents: z.string().min(100, "Content must be at least 100 characters"),
  sourceType: z.enum(["paste", "file"]),
});

type UploadFormValues = z.infer<typeof uploadFormSchema>;

interface ResearchUploadWithCount extends ResearchUpload {
  suggestionsCount?: number;
}

const STATUS_CONFIG = {
  pending: {
    label: "Waiting for analysis",
    labelHe: "ממתין לניתוח",
    variant: "outline" as const,
    className: "border-amber-400 text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900",
    icon: Clock,
  },
  analyzing: {
    label: "Extracting contents ideas...",
    labelHe: "מנתח ומחלץ רעיונות...",
    variant: "outline" as const,
    className: "border-blue-400 text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900",
    icon: Loader2,
    spinning: true,
  },
  analyzed: {
    label: "Ready for review",
    labelHe: "מוכן לסקירה",
    variant: "outline" as const,
    className: "border-emerald-400 text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900",
    icon: CheckCircle2,
  },
  generating: {
    label: "Creating contents...",
    labelHe: "מייצר תוכן...",
    variant: "outline" as const,
    className: "border-[#6443F4] text-[#6443F4] dark:text-[#6443F4] bg-[#6443F4]/10 dark:bg-[#6443F4]/20",
    icon: Sparkles,
    spinning: true,
  },
  completed: {
    label: "All contents generated",
    labelHe: "הושלם",
    variant: "outline" as const,
    className: "border-emerald-500 text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-900",
    icon: CheckCircle2,
  },
  failed: {
    label: "Analysis failed",
    labelHe: "ניתוח נכשל",
    variant: "outline" as const,
    className: "border-rose-400 text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900",
    icon: XCircle,
  },
} as const;

function StatusBadge({ status }: { status: keyof typeof STATUS_CONFIG }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const isSpinning = "spinning" in config && config.spinning;

  return (
    <Badge
      variant={config.variant}
      className={`${config.className} gap-1.5 no-default-hover-elevate`}
      data-testid={`badge-status-${status}`}
    >
      <Icon className={`w-3 h-3 ${isSpinning ? "animate-spin" : ""}`} />
      <span className="hidden sm:inline">{config.label}</span>
      <span className="sm:hidden">{config.labelHe}</span>
    </Badge>
  );
}

interface SuperAgentProgressData {
  researchId: string;
  researchStatus: string;
  progress: {
    phase: string;
    message: string;
    suggestionsGenerated: number;
    contentGenerated: number;
    contentFailed: number;
    startedAt: string;
    completedAt?: string;
  } | null;
  contentGenerated: number;
  suggestionsTotal: number;
  suggestionsByType: Record<string, number>;
  suggestionsByStatus: Record<string, number>;
}

const PHASE_CONFIG: Record<string, { label: string; labelHe: string; progress: number }> = {
  analyzing: { label: "Extracting entities...", labelHe: "מחלץ ישויות...", progress: 20 },
  approving: { label: "Auto-approving suggestions...", labelHe: "מאשר הצעות אוטומטית...", progress: 40 },
  generating: { label: "Creating contents...", labelHe: "יוצר תוכן...", progress: 60 },
  linking: { label: "Adding internal links...", labelHe: "מוסיף קישורים פנימיים...", progress: 90 },
  completed: { label: "All done!", labelHe: "הושלם!", progress: 100 },
  failed: { label: "Pipeline failed", labelHe: "הצינור נכשל", progress: 0 },
};

function SuperAgentProgressIndicator({ researchId, status }: { researchId: string; status: string }) {
  const isActivePhase = status === "analyzing" || status === "generating";
  
  const { data, isLoading } = useQuery<SuperAgentProgressData>({
    queryKey: ["/api/research-uploads", researchId, "super-agent/progress"],
    refetchInterval: isActivePhase ? 3000 : false, // Stop polling once completed
    staleTime: isActivePhase ? 0 : 30000,
  });

  // Invalidate research list when pipeline completes to update status
  useEffect(() => {
    if (data?.progress?.phase === "completed" || data?.progress?.phase === "failed") {
      queryClient.invalidateQueries({ queryKey: ["/api/research-uploads"] });
    }
  }, [data?.progress?.phase]);

  if (isLoading) {
    return (
      <div className="space-y-2 mt-3">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-1.5 w-full" />
      </div>
    );
  }

  if (!data?.progress) {
    return null;
  }

  const phase = data.progress.phase;
  const phaseConfig = PHASE_CONFIG[phase] || PHASE_CONFIG.analyzing;
  
  const suggestionsGenerated = data.progress.suggestionsGenerated || 0;
  const contentGenerated = data.progress.contentGenerated || 0;
  const contentFailed = data.progress.contentFailed || 0;
  
  let progressValue = phaseConfig.progress;
  if (phase === "generating" && suggestionsGenerated > 0) {
    const generationProgress = ((contentGenerated + contentFailed) / suggestionsGenerated) * 50;
    progressValue = 40 + generationProgress;
  }

  const isComplete = phase === "completed";
  const isFailed = phase === "failed";

  return (
    <div className="space-y-2 mt-3" data-testid={`progress-super-agent-${researchId}`}>
      <div className="flex items-center justify-between text-xs">
        <span className={`flex items-center gap-1.5 ${isComplete ? "text-emerald-600" : isFailed ? "text-red-500" : "text-muted-foreground"}`}>
          {isComplete ? (
            <CheckCircle2 className="w-3 h-3" />
          ) : isFailed ? (
            <XCircle className="w-3 h-3" />
          ) : (
            <Zap className="w-3 h-3 text-[#7B4BA4]" />
          )}
          <span className="hidden sm:inline">{phaseConfig.label}</span>
          <span className="sm:hidden">{phaseConfig.labelHe}</span>
        </span>
        <span className="text-muted-foreground">
          {contentGenerated}/{suggestionsGenerated} {contentFailed > 0 && `(${contentFailed} failed)`}
        </span>
      </div>
      <Progress 
        value={Math.min(progressValue, 100)} 
        className={`h-1.5 ${isComplete ? "[&>div]:bg-emerald-500" : ""}`}
      />
      {data.progress.message && !isComplete && (
        <p className="text-xs text-muted-foreground truncate" title={data.progress.message}>
          {data.progress.message}
        </p>
      )}
    </div>
  );
}

export default function ResearchUploadPage() {
  const { toast } = useToast();
  const [sourceType, setSourceType] = useState<"paste" | "file">("paste");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      title: "",
      contents: "",
      sourceType: "paste",
    },
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsParsingFile(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("contentType", "article");

      const response = await fetch("/api/doc-upload/parse", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to parse document");
      }

      if (result.success && result.preview) {
        const parsedContent = result.preview;
        const extractedTitle = parsedContent.title || file.name.replace(/\.[^/.]+$/, "");
        
        // Handle different contents structures - could be string, object with blocks, or summary
        let extractedContent = "";
        if (typeof parsedContent.contents === "string") {
          extractedContent = parsedContent.contents;
        } else if (parsedContent.contents?.blocks && Array.isArray(parsedContent.contents.blocks)) {
          // Extract text from contents blocks
          extractedContent = parsedContent.contents.blocks
            .map((b: { type?: string; data?: { contents?: string; text?: string } }) => 
              b.data?.contents || b.data?.text || ""
            )
            .filter((s: string) => s.length > 0)
            .join("\n\n");
        } else if (parsedContent.summary) {
          extractedContent = parsedContent.summary;
        }
        
        // Fallback to stringifying if still empty
        if (!extractedContent) {
          extractedContent = parsedContent.rawText || JSON.stringify(parsedContent, null, 2);
        }

        form.setValue("title", extractedTitle);
        form.setValue("contents", extractedContent);
        
        const wordCount = typeof extractedContent === "string" 
          ? extractedContent.split(/\s+/).filter(Boolean).length 
          : 0;
        
        toast({
          title: "Document parsed successfully",
          description: `Extracted ${wordCount} words from ${file.name}`,
        });
      }
    } catch (error) {
      toast({
        title: "Failed to parse document",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsParsingFile(false);
    }
  };

  const { data: uploads, isLoading } = useQuery<ResearchUploadWithCount[]>({
    queryKey: ["/api/research-uploads"],
  });

  const createMutation = useMutation({
    mutationFn: async (values: UploadFormValues) => {
      const res = await apiRequest("POST", "/api/research-uploads", values);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Research uploaded",
        description: "Your contents is being analyzed for contents ideas.",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/research-uploads"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/research-uploads/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Research deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/research-uploads"] });
    },
    onError: () => {
      toast({ title: "Delete failed", variant: "destructive" });
    },
  });

  const reanalyzeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/research-uploads/${id}/reanalyze`);
    },
    onSuccess: () => {
      toast({ title: "Re-analyzing research..." });
      queryClient.invalidateQueries({ queryKey: ["/api/research-uploads"] });
    },
    onError: () => {
      toast({ title: "Reanalysis failed", variant: "destructive" });
    },
  });

  const onSubmit = (values: UploadFormValues) => {
    createMutation.mutate(values);
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        <header className="text-center space-y-3">
          <div className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-[#6443F4]/10 border border-[#6443F4]/20">
            <Sparkles className="w-4 h-4 text-[#6443F4]" />
            <span className="text-sm font-medium text-[#6443F4]">AI Content Factory / מפעל תוכן בינה מלאכותית</span>
          </div>
          <h1
            className="text-4xl sm:text-5xl font-bold tracking-tight"
            data-testid="heading-research-upload"
          >
            The{" "}
            <span className="text-[#6443F4]">
              Octopus
            </span>
            {" "}System
            {" / "}
            מערכת{" "}
            <span className="text-[#6443F4]">
              התמנון
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto" dir="rtl">
            מחקר אחד, זרועות רבות: הפוך מסמך מחקר לעשרות פריטי תוכן במקביל
          </p>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            One research, many arms: Transform a single document into dozens of contents pieces simultaneously
          </p>
        </header>

        <Card className="overflow-visible">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Upload className="w-5 h-5 text-[#6443F4]" />
              Upload New Research / העלאת מחקר חדש
            </CardTitle>
            <CardDescription dir="rtl">
              הדבק את תוכן המחקר שלך או העלה מסמך לניתוח בינה מלאכותית
            </CardDescription>
            <CardDescription>
              Paste your research contents or upload a document for AI analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Research Title / כותרת המחקר</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Dubai Travel Trends Q4 2025"
                          data-testid="input-research-title"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3">
                  <FormLabel>Source Type / סוג מקור</FormLabel>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={sourceType === "paste" ? "default" : "outline"}
                      onClick={() => {
                        setSourceType("paste");
                        form.setValue("sourceType", "paste");
                      }}
                      className="flex-1 gap-2"
                      data-testid="button-source-paste"
                    >
                      <ClipboardPaste className="w-4 h-4" />
                      Paste Content / הדבקת תוכן
                    </Button>
                    <Button
                      type="button"
                      variant={sourceType === "file" ? "default" : "outline"}
                      onClick={() => {
                        setSourceType("file");
                        form.setValue("sourceType", "file");
                      }}
                      className="flex-1 gap-2"
                      data-testid="button-source-file"
                    >
                      <FileText className="w-4 h-4" />
                      Upload File / העלאת קובץ
                    </Button>
                  </div>
                </div>

                {sourceType === "file" && (
                  <div className="space-y-3">
                    <FormLabel>Upload Document / העלאת מסמך</FormLabel>
                    <div className="flex items-center gap-4">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept=".docx,.doc,.txt"
                        className="hidden"
                        data-testid="input-file-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isParsingFile}
                        className="gap-2"
                        data-testid="button-select-file"
                      >
                        {isParsingFile ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Parsing... / מנתח...
                          </>
                        ) : (
                          <>
                            <File className="w-4 h-4" />
                            Select File / בחר קובץ
                          </>
                        )}
                      </Button>
                      {selectedFile && (
                        <span className="text-sm text-muted-foreground">
                          {selectedFile.name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Supported: .docx, .doc, .txt files up to 10MB / נתמכים: קבצי .docx, .doc, .txt עד 10MB
                    </p>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="contents"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {sourceType === "paste" ? "Research Content / תוכן המחקר" : "Parsed Content / תוכן שנותח"}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={
                            sourceType === "paste"
                              ? "Paste your research contents here... / הדבק את תוכן המחקר כאן..."
                              : "Upload a document above to extract contents, or paste directly... / העלה מסמך למעלה כדי לחלץ תוכן, או הדבק ישירות..."
                          }
                          className="min-h-[240px] resize-y"
                          data-testid="textarea-research-contents"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="gap-2 bg-[#6443F4] text-white border-0"
                    data-testid="button-upload-research"
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading... / מעלה...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Upload & Analyze / העלה ונתח מחקר
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <AIChatPanel
          researchTitle="Research Analysis"
          className="border-[#6443F4]/20"
          defaultExpanded={true}
        />

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight" data-testid="heading-research-list">
              Your Research / המחקרים שלך
            </h2>
            {uploads && uploads.length > 0 && (
              <Badge variant="secondary" className="gap-1">
                <FileText className="w-3 h-3" />
                {uploads.length} document{uploads.length !== 1 ? "s" : ""} / {uploads.length} מסמכים
              </Badge>
            )}
          </div>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : uploads && uploads.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {uploads.map((upload) => (
                <Card
                  key={upload.id}
                  className="group overflow-visible hover-elevate"
                  data-testid={`card-research-${upload.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg line-clamp-2" data-testid={`text-title-${upload.id}`}>
                        {upload.title}
                      </CardTitle>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(upload.id)}
                        disabled={deleteMutation.isPending}
                        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        data-testid={`button-delete-${upload.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                    <CardDescription
                      className="flex items-center gap-1.5"
                      data-testid={`text-date-${upload.id}`}
                    >
                      <Clock className="w-3 h-3" />
                      {upload.createdAt
                        ? format(new Date(upload.createdAt), "MMM d, yyyy 'at' h:mm a")
                        : "Unknown date"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={upload.status as keyof typeof STATUS_CONFIG} />
                      {upload.suggestionsCount !== undefined && upload.suggestionsCount > 0 && (
                        <Badge variant="secondary" className="gap-1" data-testid={`badge-suggestions-${upload.id}`}>
                          <Lightbulb className="w-3 h-3" />
                          {upload.suggestionsCount} idea{upload.suggestionsCount !== 1 ? "s" : ""} / {upload.suggestionsCount} רעיונות
                        </Badge>
                      )}
                    </div>

                    {(upload.status === "analyzing" || upload.status === "generating" || upload.status === "completed") && (
                      <SuperAgentProgressIndicator researchId={upload.id} status={upload.status} />
                    )}

                    <div className="flex items-center gap-2 pt-2">
                      {upload.status === "failed" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => reanalyzeMutation.mutate(upload.id)}
                          disabled={reanalyzeMutation.isPending}
                          className="flex-1 gap-1.5 border-[#6443F4]/30 text-[#6443F4]"
                          data-testid={`button-retry-${upload.id}`}
                        >
                          {reanalyzeMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                          )}
                          Retry Analysis / נסה שוב
                        </Button>
                      ) : upload.status === "analyzed" ||
                        upload.status === "generating" ||
                        upload.status === "completed" ? (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1.5"
                          data-testid={`button-view-suggestions-${upload.id}`}
                        >
                          <Link href={`/admin/research/${upload.id}/suggestions`}>
                            <Lightbulb className="w-3.5 h-3.5" />
                            View Suggestions / צפה בהצעות
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                      ) : (
                        <div className="flex-1 text-sm text-muted-foreground text-center py-1">
                          {upload.status === "pending"
                            ? "Queued for analysis... / ממתין לניתוח..."
                            : "Processing... / מעבד..."}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <FileText className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-medium" data-testid="text-empty-state">No research documents yet / לא נמצאו מסמכי מחקר</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto" dir="rtl">
                    העלה את מסמך המחקר הראשון שלך כדי להתחיל להפיק רעיונות לתוכן עם בינה מלאכותית
                  </p>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Upload your first research document to start generating contents ideas with AI
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        <Card className="bg-[#6443F4]/5 border-[#6443F4]/20">
          <CardContent className="py-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="p-3 rounded-full bg-[#6443F4]">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="font-medium">How it works / איך זה עובד</h3>
                <p className="text-sm text-muted-foreground mb-1" dir="rtl">
                  העלה מסמכי מחקר וה-AI שלנו ינתח אותם כדי להפיק רעיונות לתוכן, כותרות מוצעות, מילות מפתח ונושאים. סקור ואשר הצעות כדי לייצר תוכן מלא באופן אוטומטי.
                </p>
                <p className="text-sm text-muted-foreground">
                  Upload research documents and our AI will analyze them to extract contents ideas,
                  suggested titles, keywords, and topics. Review and approve suggestions to generate
                  full contents automatically.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
