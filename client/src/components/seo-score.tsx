import { useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, AlertCircle, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { analyzeSeo, getScoreColor, getScoreLabel, type SeoInput, type SeoIssue } from "@/lib/seo-analyzer";

interface SeoScoreProps {
  title: string;
  metaTitle: string;
  metaDescription: string;
  primaryKeyword: string;
  content: string;
  headings?: { level: number; text: string }[];
  images?: { url: string; alt: string }[];
  internalLinks?: number;
  externalLinks?: number;
}

function IssueIcon({ type }: { type: SeoIssue["type"] }) {
  switch (type) {
    case "error":
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case "success":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "info":
      return <Info className="h-4 w-4 text-blue-500" />;
  }
}

export function SeoScore({
  title,
  metaTitle,
  metaDescription,
  primaryKeyword,
  content,
  headings = [],
  images = [],
  internalLinks = 0,
  externalLinks = 0,
}: SeoScoreProps) {
  const analysis = useMemo(() => {
    const input: SeoInput = {
      title,
      metaTitle,
      metaDescription,
      primaryKeyword,
      content,
      headings,
      images,
      internalLinks,
      externalLinks,
    };
    return analyzeSeo(input);
  }, [title, metaTitle, metaDescription, primaryKeyword, content, headings, images, internalLinks, externalLinks]);

  const errors = analysis.issues.filter(i => i.type === "error");
  const warnings = analysis.issues.filter(i => i.type === "warning");
  const successes = analysis.issues.filter(i => i.type === "success");

  return (
    <div className="space-y-4" data-testid="seo-score-panel">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">SEO Score</span>
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-bold ${getScoreColor(analysis.score)}`} data-testid="seo-score-value">
            {analysis.score}
          </span>
          <Badge variant={analysis.score >= 80 ? "default" : analysis.score >= 60 ? "secondary" : "destructive"}>
            {getScoreLabel(analysis.score)}
          </Badge>
        </div>
      </div>

      <Progress value={analysis.score} className="h-2" data-testid="seo-score-progress" />

      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>{analysis.wordCount} words</span>
        <span>{analysis.keywordDensity.toFixed(1)}% keyword density</span>
      </div>

      <div className="flex gap-2 text-xs">
        {errors.length > 0 && (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            {errors.length} error{errors.length > 1 ? "s" : ""}
          </Badge>
        )}
        {warnings.length > 0 && (
          <Badge variant="secondary" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            {warnings.length} warning{warnings.length > 1 ? "s" : ""}
          </Badge>
        )}
        {successes.length > 0 && (
          <Badge variant="outline" className="gap-1 text-green-600">
            <CheckCircle className="h-3 w-3" />
            {successes.length} passed
          </Badge>
        )}
      </div>

      <Collapsible defaultOpen={analysis.score < 80}>
        <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-sm font-medium hover-elevate rounded px-2 -mx-2">
          <span>Details</span>
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-2 pt-2">
            {analysis.issues.map((issue, i) => (
              <div key={i} className="flex gap-2 text-sm p-2 rounded bg-muted/50" data-testid={`seo-issue-${i}`}>
                <IssueIcon type={issue.type} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-xs text-muted-foreground">{issue.category}</span>
                  </div>
                  <p className="text-foreground">{issue.message}</p>
                  {issue.recommendation && (
                    <p className="text-xs text-muted-foreground mt-1">{issue.recommendation}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
