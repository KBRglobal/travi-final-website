import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Wand2,
  Loader2,
  Shield,
  AlertCircle,
  Zap,
  Star,
  Lock,
  Unlock,
} from "lucide-react";

interface TierResult {
  score: number;
  maxScore: number;
  percentage: number;
  issues: Array<{
    field: string;
    issue: string;
    severity: string;
    fixable: boolean;
    suggestion?: string;
  }>;
}

interface ValidationResult {
  overallScore: number;
  tier1_critical: TierResult;
  tier2_essential: TierResult;
  tier3_technical: TierResult;
  tier4_quality: TierResult;
  canPublish: boolean;
  publishBlockReason?: string;
  fixableIssuesCount: number;
}

interface AutoFixResult {
  // Old format
  fieldsFixed?: string[];
  fixedArticle?: Record<string, unknown>;
  summary?: string;
  // New format from backend
  fixesApplied?: number;
  fixesFailed?: number;
  articleUpdated?: Record<string, unknown>;
  fixDetails?: Array<{ field: string; originalValue: unknown; fixedValue: unknown; fixType: string; success: boolean; message: string }>;
  remainingIssues?: string[];
}

interface SEOValidationGateProps {
  // Content data for validation
  title: string;
  metaTitle: string;
  metaDescription: string;
  primaryKeyword: string;
  heroImage?: string;
  heroImageAlt?: string;
  contents: string;
  headings: string[];
  blocks: Array<{ type: string; data: Record<string, unknown> }>;
  slug?: string;
  contentType: string;
  contentId?: string | number;
  // Callbacks
  onAutoFix?: (fixedData: Record<string, unknown>) => void;
  onValidationComplete?: (canPublish: boolean, result: ValidationResult) => void;
}

const tierConfig = {
  tier1_critical: {
    name: "Critical",
    description: "Must pass 100% to publish",
    icon: Shield,
    color: "text-red-500",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
  tier2_essential: {
    name: "Essential",
    description: "Target: 90%+",
    icon: AlertCircle,
    color: "text-orange-500",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
  },
  tier3_technical: {
    name: "Technical",
    description: "Target: 85%+",
    icon: Zap,
    color: "text-blue-500",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  tier4_quality: {
    name: "Quality",
    description: "Target: 75%+",
    icon: Star,
    color: "text-[#6443F4]",
    bgColor: "bg-[#6443F4]/5",
    borderColor: "border-[#6443F4]",
  },
};

function TierSection({
  tierKey,
  result,
  expanded,
  onToggle,
}: {
  tierKey: keyof typeof tierConfig;
  result: TierResult;
  expanded: boolean;
  onToggle: () => void;
}) {
  const config = tierConfig[tierKey];
  const Icon = config.icon;
  const isPassing = result.percentage >= (tierKey === "tier1_critical" ? 100 : tierKey === "tier2_essential" ? 90 : tierKey === "tier3_technical" ? 85 : 75);

  return (
    <Collapsible open={expanded} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <button className={`w-full p-3 rounded-lg border ${config.borderColor} ${config.bgColor} hover:opacity-90 transition-all`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${config.color}`} />
              <span className="font-medium text-sm">{config.name}</span>
              <Badge variant={isPassing ? "default" : "destructive"} className="text-xs">
                {result.percentage}%
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {result.issues.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {result.issues.length} issue{result.issues.length > 1 ? "s" : ""}
                </Badge>
              )}
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>
          <div className="mt-2">
            <Progress
              value={result.percentage}
              className="h-1.5"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1 text-left">{config.description}</p>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {result.issues.length > 0 && (
          <div className="mt-2 space-y-2 pl-2">
            {result.issues.map((issue, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-2 rounded-md bg-muted/50 text-xs"
              >
                <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-medium">{issue.field}:</span>{" "}
                  <span className="text-muted-foreground">{issue.issue}</span>
                  {issue.fixable && (
                    <Badge variant="outline" className="ml-2 text-xs py-0">
                      <Wand2 className="h-2.5 w-2.5 mr-1" />
                      Fixable
                    </Badge>
                  )}
                  {issue.suggestion && (
                    <div className="mt-1 text-muted-foreground italic">
                      Suggestion: {issue.suggestion}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {result.issues.length === 0 && (
          <div className="mt-2 pl-2">
            <div className="flex items-center gap-2 p-2 rounded-md bg-green-50 text-xs text-green-700">
              <CheckCircle className="h-3.5 w-3.5" />
              All checks passed!
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function SEOValidationGate({
  title,
  metaTitle,
  metaDescription,
  primaryKeyword,
  heroImage,
  heroImageAlt,
  contents,
  headings,
  blocks,
  slug,
  contentType,
  contentId,
  onAutoFix,
  onValidationComplete,
}: SEOValidationGateProps) {
  const { toast } = useToast();
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [expandedTiers, setExpandedTiers] = useState<Record<string, boolean>>({});
  const [autoValidated, setAutoValidated] = useState(false);

  // Map contents type to page type for SEO validation
  const getPageType = (): string => {
    switch (contentType) {
      case "attraction": return "attraction";
      case "hotel": return "hotel";
      case "article": return "article";
      case "dining": return "dining";
      case "district": return "district";
      case "event": return "event";
      case "itinerary": return "itinerary";
      case "transport": return "transport";
      default: return "article";
    }
  };

  // Build contents data for validation
  const buildContentData = () => {
    // Extract FAQs from blocks
    const faqBlocks = blocks.filter(b => b.type === "faq");
    const faq = faqBlocks.flatMap(b => {
      // Handle both single FAQ blocks and FAQ blocks with multiple items
      if (b.data.faqs && Array.isArray(b.data.faqs)) {
        return b.data.faqs;
      }
      if (b.data.question && b.data.answer) {
        return [{ question: b.data.question, answer: b.data.answer }];
      }
      return [];
    });
    
    // Extract tips from blocks
    const tipsBlocks = blocks.filter(b => b.type === "tips");
    const proTips = tipsBlocks.flatMap(b => {
      if (b.data.tips && Array.isArray(b.data.tips)) {
        return b.data.tips;
      }
      if (b.data.contents && typeof b.data.contents === "string") {
        return b.data.contents.split("\n").filter((t: string) => t.trim());
      }
      return [];
    });
    
    return {
      title,
      metaTitle,
      metaDescription,
      primaryKeyword,
      heroImage: heroImage || "",
      heroAlt: heroImageAlt || "",
      contents,
      headings,
      slug: slug || "",
      faq,
      proTips,
      // Extract images from blocks
      images: blocks
        .filter(b => b.type === "image" || b.type === "hero" || b.type === "gallery")
        .flatMap(b => {
          if (b.type === "gallery" && Array.isArray(b.data.images)) {
            return b.data.images.map((img: { url?: string; alt?: string }) => ({
              url: img.url || "",
              alt: img.alt || "",
            }));
          }
          return [{
            url: (b.data.image as string) || (b.data.url as string) || "",
            alt: (b.data.alt as string) || "",
          }];
        }),
    };
  };

  // Validate mutation
  const validateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/seo/validate", {
        contents: buildContentData(),
        pageType: getPageType(),
      });
      return res.json() as Promise<ValidationResult>;
    },
    onSuccess: (result) => {
      setValidation(result);
      onValidationComplete?.(result.canPublish, result);

      // Auto-expand tiers with issues
      const newExpanded: Record<string, boolean> = {};
      if (result.tier1_critical.issues.length > 0) newExpanded.tier1_critical = true;
      if (result.tier2_essential.issues.length > 0) newExpanded.tier2_essential = true;
      setExpandedTiers(newExpanded);
    },
    onError: (error) => {
      toast({
        title: "Validation Failed",
        description: error instanceof Error ? error.message : "Failed to validate SEO",
        variant: "destructive",
      });
    },
  });

  // Auto-fix mutation
  const autoFixMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/seo/auto-fix", {
        article: {
          title,
          metaTitle,
          metaDescription,
          primaryKeyword,
          heroImage,
          heroAlt: heroImageAlt,
          contents,
          slug,
          contentType,
        },
      });
      return res.json() as Promise<AutoFixResult>;
    },
    onSuccess: (result) => {
      // Handle both old format (fieldsFixed) and new format (fixDetails)
      const fieldsFixed = result.fieldsFixed || (result.fixDetails?.map((f: any) => f.field) ?? []);
      const fixedArticle = result.fixedArticle || result.articleUpdated;
      
      toast({
        title: "Auto-Fix Complete",
        description: `Fixed ${result.fixesApplied || fieldsFixed.length} field(s): ${fieldsFixed.join(", ")}`,
      });
      if (fixedArticle) {
        onAutoFix?.(fixedArticle);
      }
      // Re-validate after fix
      setTimeout(() => validateMutation.mutate(), 500);
    },
    onError: (error) => {
      toast({
        title: "Auto-Fix Failed",
        description: error instanceof Error ? error.message : "Failed to auto-fix SEO issues",
        variant: "destructive",
      });
    },
  });

  // Auto-validate when contents changes significantly
  useEffect(() => {
    if (!autoValidated && title && contents) {
      const timer = setTimeout(() => {
        validateMutation.mutate();
        setAutoValidated(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [title, contents, autoValidated]);

  // Re-validate on significant changes
  useEffect(() => {
    if (autoValidated) {
      const timer = setTimeout(() => {
        validateMutation.mutate();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [title, metaTitle, metaDescription, primaryKeyword, heroImage, heroImageAlt]);

  const toggleTier = (tier: string) => {
    setExpandedTiers(prev => ({ ...prev, [tier]: !prev[tier] }));
  };

  const isLoading = validateMutation.isPending;

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            SEO Publishing Gate
          </CardTitle>
          <div className="flex items-center gap-2">
            {validation && (
              <Badge
                variant={validation.canPublish ? "default" : "destructive"}
                className="gap-1"
              >
                {validation.canPublish ? (
                  <>
                    <Unlock className="h-3 w-3" />
                    Ready
                  </>
                ) : (
                  <>
                    <Lock className="h-3 w-3" />
                    Blocked
                  </>
                )}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Score */}
        {validation && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
            <div>
              <div className="text-2xl font-bold">{validation.overallScore}%</div>
              <div className="text-xs text-muted-foreground">Overall SEO Score</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">
                {validation.fixableIssuesCount > 0 && (
                  <span className="text-orange-600">
                    {validation.fixableIssuesCount} fixable issue{validation.fixableIssuesCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {validation.publishBlockReason && (
                <div className="text-xs text-red-600 mt-1">
                  {validation.publishBlockReason}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tier Sections */}
        {validation && (
          <div className="space-y-2">
            <TierSection
              tierKey="tier1_critical"
              result={validation.tier1_critical}
              expanded={!!expandedTiers.tier1_critical}
              onToggle={() => toggleTier("tier1_critical")}
            />
            <TierSection
              tierKey="tier2_essential"
              result={validation.tier2_essential}
              expanded={!!expandedTiers.tier2_essential}
              onToggle={() => toggleTier("tier2_essential")}
            />
            <TierSection
              tierKey="tier3_technical"
              result={validation.tier3_technical}
              expanded={!!expandedTiers.tier3_technical}
              onToggle={() => toggleTier("tier3_technical")}
            />
            <TierSection
              tierKey="tier4_quality"
              result={validation.tier4_quality}
              expanded={!!expandedTiers.tier4_quality}
              onToggle={() => toggleTier("tier4_quality")}
            />
          </div>
        )}

        {/* Loading State */}
        {isLoading && !validation && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* No Validation Yet */}
        {!validation && !isLoading && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Click "Validate" to check SEO requirements
          </div>
        )}

        <Separator />

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => validateMutation.mutate()}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Validate
          </Button>

          {validation && validation.fixableIssuesCount > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={() => autoFixMutation.mutate()}
              disabled={autoFixMutation.isPending}
              className="flex-1 bg-[#6443F4] hover:bg-[#5539d4]"
            >
              {autoFixMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              Auto-Fix ({validation.fixableIssuesCount})
            </Button>
          )}
        </div>

        {/* Publish Warning */}
        {validation && !validation.canPublish && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">Publishing Blocked</div>
              <div className="mt-0.5">
                {validation.publishBlockReason || "Critical SEO requirements must be 100% complete before publishing."}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
