/**
 * News Article Editor - Magic-enabled RSS to Article Transformer
 * Processes RSS feed items and transforms them into full news articles
 * with AI-powered content generation across all fields
 */

import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Icons
import {
  Sparkles,
  Wand2,
  Save,
  Send,
  Eye,
  ArrowLeft,
  ExternalLink,
  Clock,
  Loader2,
  Check,
  X,
  RefreshCw,
  Globe,
  TrendingUp,
  Search,
  Target,
  MapPin,
  Calendar,
  DollarSign,
  Facebook,
  Twitter,
  Bell,
  Mail,
  ChevronDown,
  ChevronRight,
  FileText,
  Link2,
  Languages,
  AlertCircle,
  CheckCircle2,
  Copy,
  RotateCcw,
  Zap,
} from "lucide-react";

import { MagicAIButton, type GeneratedContent } from "@/components/admin/MagicAIButton";
import { SUPPORTED_LOCALES } from "@shared/schema";

// ============================================================================
// Types
// ============================================================================

interface RssSourceItem {
  id: string;
  feedId: string;
  feedName: string;
  feedUrl: string;
  title: string;
  link: string;
  description: string;
  content: string;
  pubDate: string;
  fetchedAt: string;
  guid: string;
  author?: string;
  categories?: string[];
  enclosure?: {
    url: string;
    type: string;
    length?: number;
  };
}

interface HeadlineVariant {
  type: "seo" | "viral" | "aeo";
  value: string;
  score?: number;
}

interface FAQ {
  question: string;
  answer: string;
}

interface NewsArticle {
  // Original Source (read-only)
  sourceId: string;
  sourceUrl: string;
  originalTitle: string;
  originalContent: string;
  fetchedAt: string;

  // Generated Content
  headline: string;
  headlineVariants: HeadlineVariant[];
  selectedHeadlineType: "seo" | "viral" | "aeo";
  slug: string;
  body: string;
  tldr: string[];

  // Classification
  storyTier: "S1" | "S2" | "S3";
  destination: string;
  destinationId: string;
  touristType: string[];
  category: string;

  // SEO
  metaTitle: string;
  metaDescription: string;
  primaryKeyword: string;
  faqs: FAQ[];

  // Tourism Data
  coordinates: { lat: number; lng: number } | null;
  travelDates: { start: string; end: string } | null;
  priceIndication: string;

  // Social Distribution
  facebookHook: string;
  twitterHook: string;
  pushNotification: string;
  newsletterSubject: string;

  // Scores
  seoScore: number;
  aeoScore: number;
  viralPotential: number;
  compositeScore: number;

  // Status
  gate1Decision: "approved" | "rejected" | "pending";
  humanReview: "pending" | "approved" | "needs_revision";
  translationStatus: Record<string, "pending" | "in_progress" | "completed" | "failed">;
}

type FieldKey = keyof Omit<
  NewsArticle,
  "sourceId" | "sourceUrl" | "originalTitle" | "originalContent" | "fetchedAt"
>;

interface GenerationProgress {
  field: string;
  status: "pending" | "generating" | "completed" | "failed";
  error?: string;
}

// ============================================================================
// Initial State
// ============================================================================

const initialArticle: NewsArticle = {
  sourceId: "",
  sourceUrl: "",
  originalTitle: "",
  originalContent: "",
  fetchedAt: "",
  headline: "",
  headlineVariants: [],
  selectedHeadlineType: "seo",
  slug: "",
  body: "",
  tldr: [],
  storyTier: "S2",
  destination: "",
  destinationId: "",
  touristType: [],
  category: "",
  metaTitle: "",
  metaDescription: "",
  primaryKeyword: "",
  faqs: [],
  coordinates: null,
  travelDates: null,
  priceIndication: "",
  facebookHook: "",
  twitterHook: "",
  pushNotification: "",
  newsletterSubject: "",
  seoScore: 0,
  aeoScore: 0,
  viralPotential: 0,
  compositeScore: 0,
  gate1Decision: "pending",
  humanReview: "pending",
  translationStatus: {},
};

// Story tier descriptions
const STORY_TIERS = {
  S1: {
    label: "S1 - Breaking",
    description: "Major breaking news, requires immediate publication",
    color: "bg-red-500",
  },
  S2: {
    label: "S2 - Priority",
    description: "Important story, publish within 24 hours",
    color: "bg-yellow-500",
  },
  S3: {
    label: "S3 - Standard",
    description: "Regular news, standard workflow",
    color: "bg-green-500",
  },
};

// Tourist type options
const TOURIST_TYPES = [
  "luxury_traveler",
  "budget_backpacker",
  "family_vacation",
  "business_traveler",
  "adventure_seeker",
  "cultural_explorer",
  "digital_nomad",
  "honeymooner",
  "solo_traveler",
  "group_tour",
];

// Category options
const CATEGORIES = [
  "breaking_news",
  "travel_updates",
  "events",
  "culture",
  "food_dining",
  "attractions",
  "hotels",
  "transportation",
  "safety",
  "deals_offers",
];

// ============================================================================
// Field Group Components
// ============================================================================

interface MagicFieldProps {
  label: string;
  field: FieldKey;
  value: string;
  onChange: (value: string) => void;
  onMagicGenerate: (field: FieldKey) => void;
  isGenerating: boolean;
  multiline?: boolean;
  placeholder?: string;
  helpText?: string;
  maxLength?: number;
  showCharCount?: boolean;
  context: Record<string, unknown>;
}

function MagicField({
  label,
  field,
  value,
  onChange,
  onMagicGenerate,
  isGenerating,
  multiline = false,
  placeholder,
  helpText,
  maxLength,
  showCharCount = false,
  context,
}: MagicFieldProps) {
  const charCount = value?.length || 0;
  const isOverLimit = maxLength ? charCount > maxLength : false;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={field} className="text-sm font-medium">
          {label}
        </Label>
        <div className="flex items-center gap-2">
          {showCharCount && (
            <span className={cn("text-xs", isOverLimit ? "text-red-500" : "text-muted-foreground")}>
              {charCount}
              {maxLength ? `/${maxLength}` : ""}
            </span>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onMagicGenerate(field)}
                  disabled={isGenerating}
                  className="h-7 px-2 gap-1"
                >
                  {isGenerating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                  )}
                  <span className="text-xs">Magic</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Generate with AI</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      {multiline ? (
        <Textarea
          id={field}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn("min-h-[100px]", isOverLimit && "border-red-500")}
        />
      ) : (
        <Input
          id={field}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(isOverLimit && "border-red-500")}
        />
      )}
      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
    </div>
  );
}

// ============================================================================
// Score Display Component
// ============================================================================

interface ScoreDisplayProps {
  label: string;
  score: number;
  icon: React.ReactNode;
  color: string;
}

function ScoreDisplay({ label, score, icon, color }: ScoreDisplayProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      <div className={cn("p-2 rounded-md", color)}>{icon}</div>
      <div className="flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={cn("text-xl font-bold", getScoreColor(score))}>{score}</div>
      </div>
      <Progress value={score} className="w-16 h-2" />
    </div>
  );
}

// ============================================================================
// Headline Variant Selector
// ============================================================================

interface HeadlineVariantSelectorProps {
  variants: HeadlineVariant[];
  selected: "seo" | "viral" | "aeo";
  onSelect: (type: "seo" | "viral" | "aeo") => void;
  onHeadlineChange: (value: string) => void;
}

function HeadlineVariantSelector({
  variants,
  selected,
  onSelect,
  onHeadlineChange,
}: HeadlineVariantSelectorProps) {
  const variantLabels = {
    seo: {
      label: "SEO Optimized",
      icon: <Search className="h-4 w-4" />,
      color: "bg-blue-500/10 text-blue-500 border-blue-500/30",
    },
    viral: {
      label: "Viral Potential",
      icon: <TrendingUp className="h-4 w-4" />,
      color: "bg-orange-500/10 text-orange-500 border-orange-500/30",
    },
    aeo: {
      label: "AEO Friendly",
      icon: <Target className="h-4 w-4" />,
      color: "bg-green-500/10 text-green-500 border-green-500/30",
    },
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["seo", "viral", "aeo"] as const).map(type => {
          const variant = variants.find(v => v.type === type);
          const config = variantLabels[type];
          return (
            <button
              key={type}
              type="button"
              onClick={() => {
                onSelect(type);
                if (variant) {
                  onHeadlineChange(variant.value);
                }
              }}
              className={cn(
                "flex-1 p-3 rounded-lg border-2 transition-all",
                selected === type ? config.color : "border-transparent bg-muted hover:bg-muted/80"
              )}
            >
              <div className="flex items-center gap-2 justify-center mb-1">
                {config.icon}
                <span className="text-xs font-medium">{config.label}</span>
              </div>
              {variant?.score !== undefined && (
                <div className="text-xs text-muted-foreground">Score: {variant.score}</div>
              )}
            </button>
          );
        })}
      </div>
      {variants.length > 0 && (
        <div className="p-3 rounded-lg bg-muted">
          <div className="text-xs text-muted-foreground mb-1">Selected Headline:</div>
          <div className="font-medium">
            {variants.find(v => v.type === selected)?.value || "No variant generated"}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Translation Status Grid
// ============================================================================

interface TranslationStatusGridProps {
  status: Record<string, "pending" | "in_progress" | "completed" | "failed">;
  onTranslate: (locale: string) => void;
  onTranslateAll: () => void;
}

function TranslationStatusGrid({
  status,
  onTranslate,
  onTranslateAll,
}: TranslationStatusGridProps) {
  const getStatusIcon = (s: string) => {
    switch (s) {
      case "completed":
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case "in_progress":
        return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />;
      case "failed":
        return <X className="h-3 w-3 text-red-500" />;
      default:
        return <Clock className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const completedCount = Object.values(status).filter(s => s === "completed").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {completedCount} / {SUPPORTED_LOCALES.length} languages
        </div>
        <Button size="sm" variant="outline" onClick={onTranslateAll}>
          <Languages className="h-4 w-4 mr-1" />
          Translate All
        </Button>
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {SUPPORTED_LOCALES.map(locale => (
          <TooltipProvider key={locale.code}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onTranslate(locale.code)}
                  className={cn(
                    "p-1.5 rounded text-xs font-medium flex items-center justify-center gap-1",
                    status[locale.code] === "completed" && "bg-green-500/10",
                    status[locale.code] === "in_progress" && "bg-blue-500/10",
                    status[locale.code] === "failed" && "bg-red-500/10",
                    !status[locale.code] && "bg-muted hover:bg-muted/80"
                  )}
                >
                  {getStatusIcon(status[locale.code] || "pending")}
                  {locale.code.toUpperCase()}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {locale.name} - {locale.nativeName}
                </p>
                <p className="text-xs text-muted-foreground">Tier {locale.tier}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// FAQ Editor
// ============================================================================

interface FAQEditorProps {
  faqs: FAQ[];
  onChange: (faqs: FAQ[]) => void;
  onMagicGenerate: () => void;
  isGenerating: boolean;
}

function FAQEditor({ faqs, onChange, onMagicGenerate, isGenerating }: FAQEditorProps) {
  const addFaq = () => {
    onChange([...faqs, { question: "", answer: "" }]);
  };

  const removeFaq = (index: number) => {
    onChange(faqs.filter((_, i) => i !== index));
  };

  const updateFaq = (index: number, field: "question" | "answer", value: string) => {
    const updated = [...faqs];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">FAQs</Label>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={addFaq}>
            Add FAQ
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onMagicGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-purple-500 mr-1" />
            )}
            Magic Generate
          </Button>
        </div>
      </div>
      {faqs.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
          No FAQs yet. Add one or use Magic Generate.
        </div>
      ) : (
        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div key={index} className="p-3 border rounded-lg space-y-2">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Question"
                    value={faq.question}
                    onChange={e => updateFaq(index, "question", e.target.value)}
                    className="mb-2"
                  />
                  <Textarea
                    placeholder="Answer"
                    value={faq.answer}
                    onChange={e => updateFaq(index, "answer", e.target.value)}
                    className="min-h-[60px]"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFaq(index)}
                  className="text-red-500"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TLDR Editor
// ============================================================================

interface TLDREditorProps {
  bullets: string[];
  onChange: (bullets: string[]) => void;
  onMagicGenerate: () => void;
  isGenerating: boolean;
}

function TLDREditor({ bullets, onChange, onMagicGenerate, isGenerating }: TLDREditorProps) {
  const addBullet = () => {
    if (bullets.length < 4) {
      onChange([...bullets, ""]);
    }
  };

  const removeBullet = (index: number) => {
    onChange(bullets.filter((_, i) => i !== index));
  };

  const updateBullet = (index: number, value: string) => {
    const updated = [...bullets];
    updated[index] = value;
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">TLDR (3-4 bullets)</Label>
        <div className="flex gap-2">
          {bullets.length < 4 && (
            <Button type="button" variant="outline" size="sm" onClick={addBullet}>
              Add Bullet
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onMagicGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-purple-500 mr-1" />
            )}
            Magic Generate
          </Button>
        </div>
      </div>
      {bullets.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
          No TLDR bullets yet. Add one or use Magic Generate.
        </div>
      ) : (
        <div className="space-y-2">
          {bullets.map((bullet, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-muted-foreground">•</span>
              <Input
                value={bullet}
                onChange={e => updateBullet(index, e.target.value)}
                placeholder={`Bullet point ${index + 1}`}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeBullet(index)}
                className="text-red-500 h-8 w-8"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function NewsEditor() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const rssItemId = new URLSearchParams(window.location.search).get("rssItemId");

  // State
  const [article, setArticle] = useState<NewsArticle>(initialArticle);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isMagicAllRunning, setIsMagicAllRunning] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress[]>([]);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeTab, setActiveTab] = useState("content");
  const [showSideBySide, setShowSideBySide] = useState(true);

  // Fetch RSS item if provided
  const { data: rssItem, isLoading: isLoadingRssItem } = useQuery<RssSourceItem>({
    queryKey: ["/api/octypo/rss/items", rssItemId],
    enabled: !!rssItemId,
  });

  // Fetch destinations for dropdown
  const { data: destinations = [] } = useQuery<{ id: string; name: string; slug: string }[]>({
    queryKey: ["/api/destinations"],
  });

  // Load RSS item data into article
  useEffect(() => {
    if (rssItem) {
      setArticle(prev => ({
        ...prev,
        sourceId: rssItem.id,
        sourceUrl: rssItem.link,
        originalTitle: rssItem.title,
        originalContent: rssItem.content || rssItem.description || "",
        fetchedAt: rssItem.fetchedAt,
      }));
    }
  }, [rssItem]);

  // Track unsaved changes
  useEffect(() => {
    if (article.headline || article.body || article.slug) {
      setHasUnsavedChanges(true);
    }
  }, [article]);

  // Field update helper
  const updateField = useCallback((field: FieldKey, value: unknown) => {
    setArticle(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  }, []);

  // Magic generation for single field
  const generateField = useCallback(
    async (field: FieldKey) => {
      setGenerationProgress(prev => [
        ...prev.filter(p => p.field !== field),
        { field, status: "generating" },
      ]);

      try {
        const response = await apiRequest("POST", "/api/ai/news/generate-field", {
          field,
          context: {
            originalTitle: article.originalTitle,
            originalContent: article.originalContent,
            sourceUrl: article.sourceUrl,
            currentArticle: article,
          },
        });

        const data = await response.json();

        if (data.value !== undefined) {
          updateField(field, data.value);
          setGenerationProgress(prev =>
            prev.map(p => (p.field === field ? { ...p, status: "completed" } : p))
          );
        }
      } catch (error) {
        setGenerationProgress(prev =>
          prev.map(p =>
            p.field === field
              ? { ...p, status: "failed", error: error instanceof Error ? error.message : "Failed" }
              : p
          )
        );
        toast({
          title: "Generation Failed",
          description: `Failed to generate ${field}`,
          variant: "destructive",
        });
      }
    },
    [article, updateField, toast]
  );

  // Generate headline variants
  const generateHeadlineVariants = useCallback(async () => {
    setGenerationProgress(prev => [
      ...prev.filter(p => p.field !== "headlineVariants"),
      { field: "headlineVariants", status: "generating" },
    ]);

    try {
      const response = await apiRequest("POST", "/api/ai/news/generate-headlines", {
        context: {
          originalTitle: article.originalTitle,
          originalContent: article.originalContent,
        },
      });

      const data = await response.json();

      if (data.variants) {
        const variants: HeadlineVariant[] = data.variants;
        updateField("headlineVariants", variants);

        // Set the SEO variant as default headline
        const seoVariant = variants.find(v => v.type === "seo");
        if (seoVariant) {
          updateField("headline", seoVariant.value);
        }

        setGenerationProgress(prev =>
          prev.map(p => (p.field === "headlineVariants" ? { ...p, status: "completed" } : p))
        );
      }
    } catch (error) {
      setGenerationProgress(prev =>
        prev.map(p =>
          p.field === "headlineVariants"
            ? { ...p, status: "failed", error: error instanceof Error ? error.message : "Failed" }
            : p
        )
      );
      toast({
        title: "Generation Failed",
        description: "Failed to generate headline variants",
        variant: "destructive",
      });
    }
  }, [article.originalTitle, article.originalContent, updateField, toast]);

  // Magic All - Transform entire RSS item into article
  const handleMagicAll = useCallback(async () => {
    setIsMagicAllRunning(true);

    const fieldsToGenerate: FieldKey[] = [
      "headline",
      "slug",
      "body",
      "tldr",
      "storyTier",
      "destination",
      "touristType",
      "category",
      "metaTitle",
      "metaDescription",
      "primaryKeyword",
      "faqs",
      "coordinates",
      "travelDates",
      "priceIndication",
      "facebookHook",
      "twitterHook",
      "pushNotification",
      "newsletterSubject",
    ];

    // Initialize progress for all fields
    setGenerationProgress(fieldsToGenerate.map(field => ({ field, status: "pending" })));

    try {
      // Generate headlines first (special handling for variants)
      await generateHeadlineVariants();

      // Generate remaining fields in batches
      const batchSize = 3;
      const remainingFields = fieldsToGenerate.filter(f => f !== "headline");

      for (let i = 0; i < remainingFields.length; i += batchSize) {
        const batch = remainingFields.slice(i, i + batchSize);
        await Promise.all(batch.map(field => generateField(field)));
      }

      // Calculate scores
      await calculateScores();

      toast({
        title: "Magic All Complete",
        description: "Article has been fully generated from RSS source",
      });
    } catch (error) {
      toast({
        title: "Magic All Failed",
        description: error instanceof Error ? error.message : "Some generations failed",
        variant: "destructive",
      });
    } finally {
      setIsMagicAllRunning(false);
    }
  }, [generateHeadlineVariants, generateField, toast]);

  // Calculate scores
  const calculateScores = useCallback(async () => {
    try {
      const response = await apiRequest("POST", "/api/ai/news/calculate-scores", {
        article,
      });

      const data = await response.json();

      if (data.scores) {
        setArticle(prev => ({
          ...prev,
          seoScore: data.scores.seo || 0,
          aeoScore: data.scores.aeo || 0,
          viralPotential: data.scores.viral || 0,
          compositeScore: data.scores.composite || 0,
        }));
      }
    } catch (error) {
      console.error("Failed to calculate scores:", error);
    }
  }, [article]);

  // Save draft
  const saveDraft = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/news/draft", {
        ...article,
        status: "draft",
      });
    },
    onSuccess: () => {
      setHasUnsavedChanges(false);
      toast({
        title: "Draft Saved",
        description: "Your article draft has been saved",
      });
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Failed to save draft",
        variant: "destructive",
      });
    },
  });

  // Publish article
  const publishArticle = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/news/publish", {
        ...article,
        status: "published",
      });
    },
    onSuccess: () => {
      setHasUnsavedChanges(false);
      toast({
        title: "Article Published",
        description: "Your article has been published successfully",
      });
      setLocation("/admin/news");
    },
    onError: () => {
      toast({
        title: "Publish Failed",
        description: "Failed to publish article",
        variant: "destructive",
      });
    },
  });

  // Translation handler
  const handleTranslate = useCallback(
    async (locale: string) => {
      setArticle(prev => ({
        ...prev,
        translationStatus: { ...prev.translationStatus, [locale]: "in_progress" },
      }));

      try {
        await apiRequest("POST", "/api/ai/news/translate", {
          articleId: article.sourceId,
          targetLocale: locale,
          content: {
            headline: article.headline,
            body: article.body,
            metaTitle: article.metaTitle,
            metaDescription: article.metaDescription,
          },
        });

        setArticle(prev => ({
          ...prev,
          translationStatus: { ...prev.translationStatus, [locale]: "completed" },
        }));
      } catch {
        setArticle(prev => ({
          ...prev,
          translationStatus: { ...prev.translationStatus, [locale]: "failed" },
        }));
      }
    },
    [article]
  );

  const handleTranslateAll = useCallback(async () => {
    const locales = SUPPORTED_LOCALES.map(l => l.code).filter(code => code !== "en");
    for (const locale of locales) {
      await handleTranslate(locale);
    }
  }, [handleTranslate]);

  // Check if field is generating
  const isFieldGenerating = useCallback(
    (field: string) => {
      return generationProgress.some(p => p.field === field && p.status === "generating");
    },
    [generationProgress]
  );

  // Loading state
  if (isLoadingRssItem && rssItemId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading RSS item...</p>
        </div>
      </div>
    );
  }

  // Context for Magic AI generation
  const magicContext = {
    originalTitle: article.originalTitle,
    originalContent: article.originalContent,
    sourceUrl: article.sourceUrl,
    currentArticle: article,
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="h-16 min-h-16 px-6 flex items-center justify-between gap-4 border-b bg-background sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">News Article Editor</h1>
            <p className="text-sm text-muted-foreground">
              {rssItem ? "Transform RSS item into article" : "Create new article"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 mr-4">
            <span className="text-sm text-muted-foreground">Side-by-side</span>
            <Switch checked={showSideBySide} onCheckedChange={setShowSideBySide} />
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={handleMagicAll}
                  disabled={isMagicAllRunning || !article.originalContent}
                  className="gap-2"
                >
                  {isMagicAllRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4 text-purple-500" />
                  )}
                  Magic All
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Transform entire RSS item into a full article</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            variant="outline"
            onClick={() => saveDraft.mutate()}
            disabled={saveDraft.isPending || !hasUnsavedChanges}
          >
            {saveDraft.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Draft
          </Button>
          <Button
            onClick={() => publishArticle.mutate()}
            disabled={publishArticle.isPending || !article.headline || !article.body}
          >
            {publishArticle.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Publish
          </Button>
        </div>
      </div>

      {/* Magic All Progress */}
      {isMagicAllRunning && (
        <div className="px-6 py-3 bg-purple-500/10 border-b">
          <div className="flex items-center gap-3">
            <Sparkles className="h-4 w-4 text-purple-500 animate-pulse" />
            <span className="text-sm font-medium">Magic All in progress...</span>
            <div className="flex-1">
              <Progress
                value={
                  (generationProgress.filter(p => p.status === "completed").length /
                    generationProgress.length) *
                  100
                }
                className="h-2"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {generationProgress.filter(p => p.status === "completed").length} /{" "}
              {generationProgress.length}
            </span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Original Source (Side Panel) */}
        {showSideBySide && article.originalContent && (
          <div className="w-96 border-r bg-muted/30 flex flex-col">
            <div className="p-4 border-b bg-background">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Original Source
              </h3>
              <p className="text-xs text-muted-foreground mt-1">Read-only RSS content</p>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">RSS Source URL</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Input value={article.sourceUrl} readOnly className="text-xs bg-muted" />
                    {article.sourceUrl && (
                      <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Original Title</Label>
                  <div className="mt-1 p-3 rounded-md bg-muted text-sm font-medium">
                    {article.originalTitle || "No title"}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Original Content</Label>
                  <div className="mt-1 p-3 rounded-md bg-muted text-sm max-h-96 overflow-y-auto">
                    {article.originalContent || "No content"}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fetched Date</Label>
                  <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {article.fetchedAt ? new Date(article.fetchedAt).toLocaleString() : "Unknown"}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Editor Panel */}
        <div className="flex-1 overflow-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <div className="px-6 pt-4 border-b">
              <TabsList>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="classification">Classification</TabsTrigger>
                <TabsTrigger value="seo">SEO</TabsTrigger>
                <TabsTrigger value="tourism">Tourism Data</TabsTrigger>
                <TabsTrigger value="social">Social</TabsTrigger>
                <TabsTrigger value="status">Status</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {/* Content Tab */}
              <TabsContent value="content" className="mt-0 space-y-6">
                {/* Headline Variants */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Headline</CardTitle>
                        <CardDescription>Select headline variant or customize</CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={generateHeadlineVariants}
                        disabled={isFieldGenerating("headlineVariants")}
                      >
                        {isFieldGenerating("headlineVariants") ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5 text-purple-500 mr-1" />
                        )}
                        Generate Variants
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <HeadlineVariantSelector
                      variants={article.headlineVariants}
                      selected={article.selectedHeadlineType}
                      onSelect={type => updateField("selectedHeadlineType", type)}
                      onHeadlineChange={value => updateField("headline", value)}
                    />
                    <div className="mt-4">
                      <Input
                        value={article.headline}
                        onChange={e => updateField("headline", e.target.value)}
                        placeholder="Or enter custom headline..."
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Slug */}
                <MagicField
                  label="Slug"
                  field="slug"
                  value={article.slug}
                  onChange={v => updateField("slug", v)}
                  onMagicGenerate={generateField}
                  isGenerating={isFieldGenerating("slug")}
                  placeholder="article-url-slug"
                  helpText="URL-friendly version of the headline"
                  context={magicContext}
                />

                {/* Body */}
                <MagicField
                  label="Body"
                  field="body"
                  value={article.body}
                  onChange={v => updateField("body", v)}
                  onMagicGenerate={generateField}
                  isGenerating={isFieldGenerating("body")}
                  multiline
                  placeholder="Article body content..."
                  helpText="Rewritten from source content"
                  context={magicContext}
                />

                {/* TLDR */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">TLDR</CardTitle>
                    <CardDescription>Key takeaways in 3-4 bullet points</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TLDREditor
                      bullets={article.tldr}
                      onChange={v => updateField("tldr", v)}
                      onMagicGenerate={() => generateField("tldr")}
                      isGenerating={isFieldGenerating("tldr")}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Classification Tab */}
              <TabsContent value="classification" className="mt-0 space-y-6">
                {/* Story Tier */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Story Tier</CardTitle>
                        <CardDescription>Auto-classified priority level</CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => generateField("storyTier")}
                        disabled={isFieldGenerating("storyTier")}
                      >
                        {isFieldGenerating("storyTier") ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5 text-purple-500 mr-1" />
                        )}
                        Auto-classify
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                      {(
                        Object.entries(STORY_TIERS) as [
                          keyof typeof STORY_TIERS,
                          (typeof STORY_TIERS)[keyof typeof STORY_TIERS],
                        ][]
                      ).map(([tier, config]) => (
                        <button
                          key={tier}
                          type="button"
                          onClick={() => updateField("storyTier", tier)}
                          className={cn(
                            "p-3 rounded-lg border-2 transition-all text-left",
                            article.storyTier === tier
                              ? "border-primary bg-primary/5"
                              : "border-transparent bg-muted hover:bg-muted/80"
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className={cn("w-2 h-2 rounded-full", config.color)} />
                            <span className="font-medium text-sm">{config.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{config.description}</p>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Destination */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Destination</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => generateField("destination")}
                      disabled={isFieldGenerating("destination")}
                    >
                      {isFieldGenerating("destination") ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 text-purple-500 mr-1" />
                      )}
                      Extract
                    </Button>
                  </div>
                  <Select
                    value={article.destinationId}
                    onValueChange={v => {
                      const dest = destinations.find(d => d.id === v);
                      updateField("destinationId", v);
                      if (dest) {
                        updateField("destination", dest.name);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination..." />
                    </SelectTrigger>
                    <SelectContent>
                      {destinations.map(dest => (
                        <SelectItem key={dest.id} value={dest.id}>
                          {dest.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tourist Type */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Tourist Type</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => generateField("touristType")}
                      disabled={isFieldGenerating("touristType")}
                    >
                      {isFieldGenerating("touristType") ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 text-purple-500 mr-1" />
                      )}
                      Classify
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {TOURIST_TYPES.map(type => (
                      <Badge
                        key={type}
                        variant={article.touristType.includes(type) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          const newTypes = article.touristType.includes(type)
                            ? article.touristType.filter(t => t !== type)
                            : [...article.touristType, type];
                          updateField("touristType", newTypes);
                        }}
                      >
                        {type.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Category</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => generateField("category")}
                      disabled={isFieldGenerating("category")}
                    >
                      {isFieldGenerating("category") ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 text-purple-500 mr-1" />
                      )}
                      Classify
                    </Button>
                  </div>
                  <Select value={article.category} onValueChange={v => updateField("category", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {cat.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              {/* SEO Tab */}
              <TabsContent value="seo" className="mt-0 space-y-6">
                <MagicField
                  label="Meta Title"
                  field="metaTitle"
                  value={article.metaTitle}
                  onChange={v => updateField("metaTitle", v)}
                  onMagicGenerate={generateField}
                  isGenerating={isFieldGenerating("metaTitle")}
                  placeholder="SEO-optimized title..."
                  maxLength={60}
                  showCharCount
                  context={magicContext}
                />

                <MagicField
                  label="Meta Description"
                  field="metaDescription"
                  value={article.metaDescription}
                  onChange={v => updateField("metaDescription", v)}
                  onMagicGenerate={generateField}
                  isGenerating={isFieldGenerating("metaDescription")}
                  multiline
                  placeholder="SEO meta description..."
                  maxLength={160}
                  showCharCount
                  context={magicContext}
                />

                <MagicField
                  label="Primary Keyword"
                  field="primaryKeyword"
                  value={article.primaryKeyword}
                  onChange={v => updateField("primaryKeyword", v)}
                  onMagicGenerate={generateField}
                  isGenerating={isFieldGenerating("primaryKeyword")}
                  placeholder="Main target keyword..."
                  context={magicContext}
                />

                {/* FAQs */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">FAQs</CardTitle>
                    <CardDescription>Structured FAQ schema for SEO</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FAQEditor
                      faqs={article.faqs}
                      onChange={v => updateField("faqs", v)}
                      onMagicGenerate={() => generateField("faqs")}
                      isGenerating={isFieldGenerating("faqs")}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tourism Data Tab */}
              <TabsContent value="tourism" className="mt-0 space-y-6">
                {/* Coordinates */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Coordinates
                        </CardTitle>
                        <CardDescription>Location if mentioned in article</CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => generateField("coordinates")}
                        disabled={isFieldGenerating("coordinates")}
                      >
                        {isFieldGenerating("coordinates") ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5 text-purple-500 mr-1" />
                        )}
                        Extract
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Latitude</Label>
                        <Input
                          type="number"
                          step="any"
                          value={article.coordinates?.lat || ""}
                          onChange={e =>
                            updateField("coordinates", {
                              ...article.coordinates,
                              lat: parseFloat(e.target.value) || 0,
                            })
                          }
                          placeholder="25.2048"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Longitude</Label>
                        <Input
                          type="number"
                          step="any"
                          value={article.coordinates?.lng || ""}
                          onChange={e =>
                            updateField("coordinates", {
                              ...article.coordinates,
                              lng: parseFloat(e.target.value) || 0,
                            })
                          }
                          placeholder="55.2708"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Travel Dates */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Travel Dates
                        </CardTitle>
                        <CardDescription>Event dates if applicable</CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => generateField("travelDates")}
                        disabled={isFieldGenerating("travelDates")}
                      >
                        {isFieldGenerating("travelDates") ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5 text-purple-500 mr-1" />
                        )}
                        Extract
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Start Date</Label>
                        <Input
                          type="date"
                          value={article.travelDates?.start || ""}
                          onChange={e =>
                            updateField("travelDates", {
                              ...article.travelDates,
                              start: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">End Date</Label>
                        <Input
                          type="date"
                          value={article.travelDates?.end || ""}
                          onChange={e =>
                            updateField("travelDates", {
                              ...article.travelDates,
                              end: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Price Indication */}
                <MagicField
                  label="Price Indication"
                  field="priceIndication"
                  value={article.priceIndication}
                  onChange={v => updateField("priceIndication", v)}
                  onMagicGenerate={generateField}
                  isGenerating={isFieldGenerating("priceIndication")}
                  placeholder="e.g., Free, $, $$, $$$, From $50..."
                  helpText="Price range or cost if mentioned"
                  context={magicContext}
                />
              </TabsContent>

              {/* Social Tab */}
              <TabsContent value="social" className="mt-0 space-y-6">
                <MagicField
                  label="Facebook Hook"
                  field="facebookHook"
                  value={article.facebookHook}
                  onChange={v => updateField("facebookHook", v)}
                  onMagicGenerate={generateField}
                  isGenerating={isFieldGenerating("facebookHook")}
                  multiline
                  placeholder="Engaging Facebook post..."
                  maxLength={280}
                  showCharCount
                  context={magicContext}
                />

                <MagicField
                  label="Twitter Hook"
                  field="twitterHook"
                  value={article.twitterHook}
                  onChange={v => updateField("twitterHook", v)}
                  onMagicGenerate={generateField}
                  isGenerating={isFieldGenerating("twitterHook")}
                  multiline
                  placeholder="Tweet with hashtags..."
                  helpText="Include relevant hashtags"
                  maxLength={280}
                  showCharCount
                  context={magicContext}
                />

                <MagicField
                  label="Push Notification"
                  field="pushNotification"
                  value={article.pushNotification}
                  onChange={v => updateField("pushNotification", v)}
                  onMagicGenerate={generateField}
                  isGenerating={isFieldGenerating("pushNotification")}
                  placeholder="Short, urgent notification..."
                  maxLength={100}
                  showCharCount
                  context={magicContext}
                />

                <MagicField
                  label="Newsletter Subject"
                  field="newsletterSubject"
                  value={article.newsletterSubject}
                  onChange={v => updateField("newsletterSubject", v)}
                  onMagicGenerate={generateField}
                  isGenerating={isFieldGenerating("newsletterSubject")}
                  placeholder="Email subject line..."
                  maxLength={60}
                  showCharCount
                  context={magicContext}
                />
              </TabsContent>

              {/* Status Tab */}
              <TabsContent value="status" className="mt-0 space-y-6">
                {/* Scores */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Content Scores</CardTitle>
                    <CardDescription>AI-calculated quality metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <ScoreDisplay
                        label="SEO Score"
                        score={article.seoScore}
                        icon={<Search className="h-4 w-4 text-white" />}
                        color="bg-blue-500"
                      />
                      <ScoreDisplay
                        label="AEO Score"
                        score={article.aeoScore}
                        icon={<Target className="h-4 w-4 text-white" />}
                        color="bg-green-500"
                      />
                      <ScoreDisplay
                        label="Viral Potential"
                        score={article.viralPotential}
                        icon={<TrendingUp className="h-4 w-4 text-white" />}
                        color="bg-orange-500"
                      />
                      <ScoreDisplay
                        label="Composite Score"
                        score={article.compositeScore}
                        icon={<Zap className="h-4 w-4 text-white" />}
                        color="bg-purple-500"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 w-full"
                      onClick={calculateScores}
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-2" />
                      Recalculate Scores
                    </Button>
                  </CardContent>
                </Card>

                {/* Gate1 Decision */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Gate1 Decision</CardTitle>
                    <CardDescription>AI content quality gate</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      {article.gate1Decision === "approved" && (
                        <Badge className="bg-green-500">
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Approved
                        </Badge>
                      )}
                      {article.gate1Decision === "rejected" && (
                        <Badge variant="destructive">
                          <X className="h-3.5 w-3.5 mr-1" />
                          Rejected
                        </Badge>
                      )}
                      {article.gate1Decision === "pending" && (
                        <Badge variant="outline">
                          <Clock className="h-3.5 w-3.5 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Human Review */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Human Review</CardTitle>
                    <CardDescription>Editorial review status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Select
                      value={article.humanReview}
                      onValueChange={v =>
                        updateField("humanReview", v as NewsArticle["humanReview"])
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending Review</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="needs_revision">Needs Revision</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {/* Translation Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Translation Status</CardTitle>
                    <CardDescription>30 language translations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TranslationStatusGrid
                      status={article.translationStatus}
                      onTranslate={handleTranslate}
                      onTranslateAll={handleTranslateAll}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Discard Changes Dialog */}
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave? Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => window.history.back()}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
