import { useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Clock, BookOpen, Eye, Zap, Coffee } from "lucide-react";

interface ReadingTimeCalculatorProps {
  contents?: string;
  wordCount?: number;
  showDetails?: boolean;
  className?: string;
}

// Reading speeds (words per minute)
const READING_SPEEDS = {
  slow: 150,      // Careful reading
  average: 200,   // Normal reading
  fast: 300,      // Speed reading
  skim: 450,      // Skimming
};

// Extract text from HTML
function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
}

// Count words in text
function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

// Count images in HTML
function countImages(html: string): number {
  const imgRegex = /<img[^>]*>/gi;
  const matches = html.match(imgRegex);
  return matches ? matches.length : 0;
}

// Count headings in HTML
function countHeadings(html: string): number {
  const headingRegex = /<h[1-6][^>]*>/gi;
  const matches = html.match(headingRegex);
  return matches ? matches.length : 0;
}

// Format time in minutes and seconds
function formatTime(minutes: number): string {
  if (minutes < 1) {
    const seconds = Math.round(minutes * 60);
    return `${seconds} sec`;
  }
  if (minutes < 60) {
    const mins = Math.floor(minutes);
    const secs = Math.round((minutes - mins) * 60);
    if (secs === 0) return `${mins} min`;
    return `${mins} min ${secs} sec`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}m`;
}

export function ReadingTimeCalculator({
  contents,
  wordCount: providedWordCount,
  showDetails = false,
  className,
}: ReadingTimeCalculatorProps) {
  const analysis = useMemo(() => {
    let words = providedWordCount || 0;
    let images = 0;
    let headings = 0;

    if (contents) {
      const plainText = stripHtml(contents);
      words = countWords(plainText);
      images = countImages(contents);
      headings = countHeadings(contents);
    }

    // Calculate reading times for different speeds
    // Add 12 seconds per image (industry standard)
    const imageTime = (images * 12) / 60;

    const times = {
      slow: words / READING_SPEEDS.slow + imageTime,
      average: words / READING_SPEEDS.average + imageTime,
      fast: words / READING_SPEEDS.fast + imageTime,
      skim: words / READING_SPEEDS.skim + imageTime,
    };

    // Determine contents complexity
    const wordsPerHeading = headings > 0 ? words / headings : words;
    let complexity: "easy" | "medium" | "complex" = "medium";
    if (wordsPerHeading < 150) complexity = "easy";
    if (wordsPerHeading > 400) complexity = "complex";

    // Reading level estimation (simple heuristic)
    const avgWordLength = contents
      ? stripHtml(contents).replace(/\s+/g, "").length / words
      : 0;
    let level: "basic" | "intermediate" | "advanced" = "intermediate";
    if (avgWordLength < 4.5) level = "basic";
    if (avgWordLength > 5.5) level = "advanced";

    return {
      words,
      images,
      headings,
      times,
      complexity,
      level,
    };
  }, [contents, providedWordCount]);

  if (analysis.words === 0) {
    return (
      <Badge variant="outline" className={className}>
        <Clock className="h-3 w-3 mr-1" />
        No contents
      </Badge>
    );
  }

  if (!showDetails) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`cursor-help ${className}`}>
            <Clock className="h-3 w-3 mr-1" />
            {formatTime(analysis.times.average)}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="w-64 p-3">
          <div className="space-y-2">
            <div className="font-medium flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Reading Time Analysis
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <Coffee className="h-3 w-3 text-orange-500" />
                Slow: {formatTime(analysis.times.slow)}
              </div>
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3 text-blue-500" />
                Normal: {formatTime(analysis.times.average)}
              </div>
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-green-500" />
                Fast: {formatTime(analysis.times.fast)}
              </div>
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-[#6443F4]" />
                Skim: {formatTime(analysis.times.skim)}
              </div>
            </div>
            <div className="text-xs text-muted-foreground pt-1 border-t">
              {analysis.words.toLocaleString()} words • {analysis.images} images
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Detailed view
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">Reading Time</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 rounded-lg bg-muted/50">
          <div className="flex items-center gap-1 text-sm font-medium">
            <Coffee className="h-3 w-3 text-orange-500" />
            Careful Read
          </div>
          <div className="text-lg font-bold">{formatTime(analysis.times.slow)}</div>
          <div className="text-xs text-muted-foreground">150 wpm</div>
        </div>
        <div className="p-2 rounded-lg bg-primary/10 border-2 border-primary/20">
          <div className="flex items-center gap-1 text-sm font-medium">
            <Eye className="h-3 w-3 text-primary" />
            Average
          </div>
          <div className="text-lg font-bold">{formatTime(analysis.times.average)}</div>
          <div className="text-xs text-muted-foreground">200 wpm</div>
        </div>
        <div className="p-2 rounded-lg bg-muted/50">
          <div className="flex items-center gap-1 text-sm font-medium">
            <Zap className="h-3 w-3 text-green-500" />
            Fast Read
          </div>
          <div className="text-lg font-bold">{formatTime(analysis.times.fast)}</div>
          <div className="text-xs text-muted-foreground">300 wpm</div>
        </div>
        <div className="p-2 rounded-lg bg-muted/50">
          <div className="flex items-center gap-1 text-sm font-medium">
            <Zap className="h-3 w-3 text-[#6443F4]" />
            Skim
          </div>
          <div className="text-lg font-bold">{formatTime(analysis.times.skim)}</div>
          <div className="text-xs text-muted-foreground">450 wpm</div>
        </div>
      </div>

      <div className="pt-2 border-t space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Word count</span>
          <span className="font-medium">{analysis.words.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Images</span>
          <span className="font-medium">{analysis.images}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Sections</span>
          <span className="font-medium">{analysis.headings}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Complexity</span>
          <Badge
            variant="outline"
            className={
              analysis.complexity === "easy"
                ? "text-green-600"
                : analysis.complexity === "complex"
                ? "text-orange-600"
                : ""
            }
          >
            {analysis.complexity}
          </Badge>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Reading level</span>
          <Badge variant="outline">{analysis.level}</Badge>
        </div>
      </div>
    </div>
  );
}
