import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Link2Off,
  Link2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  RefreshCw,
  FileText,
  Globe,
} from "lucide-react";
import type { ContentWithRelations } from "@shared/schema";

interface BrokenLinkCheckerProps {
  contentId?: string;
  contentBody?: string;
  checkAllContent?: boolean;
}

interface LinkStatus {
  url: string;
  status: "valid" | "broken" | "warning" | "checking";
  statusCode?: number;
  message?: string;
  contentId?: string;
  contentTitle?: string;
}

// Extract links from HTML contents
function extractLinks(htmlContent: string): string[] {
  const linkRegex = /href=["']([^"']+)["']/gi;
  const links: string[] = [];
  let match;

  while ((match = linkRegex.exec(htmlContent)) !== null) {
    const url = match[1];
    // Filter out anchors and javascript
    if (!url.startsWith("#") && !url.startsWith("javascript:")) {
      links.push(url);
    }
  }

  return [...new Set(links)]; // Remove duplicates
}

// Extract HTML contents from contents blocks
function getContentBody(contents: ContentWithRelations): string {
  if (!contents.blocks || !Array.isArray(contents.blocks)) return "";

  return contents.blocks
    .map((block: { type: string; data?: Record<string, unknown> }) => {
      if (!block.data) return "";
      // Extract text contents from various block types
      const parts: string[] = [];
      if (typeof block.data.text === "string") parts.push(block.data.text);
      if (typeof block.data.html === "string") parts.push(block.data.html);
      if (typeof block.data.contents === "string") parts.push(block.data.contents);
      if (typeof block.data.description === "string") parts.push(block.data.description);
      if (typeof block.data.caption === "string") parts.push(block.data.caption);
      return parts.join(" ");
    })
    .join(" ");
}

// Check if internal link exists
function checkInternalLink(
  url: string,
  contents: ContentWithRelations[]
): LinkStatus {
  // Parse the URL to get the path
  let path = url;
  if (url.startsWith("http")) {
    try {
      const urlObj = new URL(url);
      path = urlObj.pathname;
    } catch {
      return { url, status: "warning", message: "Invalid URL format" };
    }
  }

  // Remove leading slash
  path = path.replace(/^\//, "");

  // Check if it matches any contents slug
  const pathParts = path.split("/");
  if (pathParts.length >= 2) {
    const type = pathParts[0];
    const slug = pathParts[1];

    const matchingContent = contents.find(
      (c) =>
        c.slug === slug &&
        c.status === "published"
    );

    if (matchingContent) {
      return { url, status: "valid", message: "Content exists" };
    } else {
      return {
        url,
        status: "broken",
        message: "Content not found or not published",
      };
    }
  }

  // Known static routes
  const staticRoutes = [
    "/", "/attractions", "/hotels", "/dining", "/articles",
    "/events", "/districts", "/search", "/about", "/contact"
  ];

  if (staticRoutes.includes("/" + path) || staticRoutes.includes(path)) {
    return { url, status: "valid", message: "Static route" };
  }

  return { url, status: "warning", message: "Cannot verify" };
}

export function BrokenLinkChecker({
  contentId,
  contentBody,
  checkAllContent = false,
}: BrokenLinkCheckerProps) {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [linkStatuses, setLinkStatuses] = useState<LinkStatus[]>([]);
  const [progress, setProgress] = useState(0);

  // Fetch all contents for cross-reference
  const { data: contents = [] } = useQuery<ContentWithRelations[]>({
    queryKey: ["/api/contents"],
  });

  // Check links in current contents
  const checkCurrentContent = async () => {
    if (!contentBody) return;

    setIsChecking(true);
    setLinkStatuses([]);
    setProgress(0);

    const links = extractLinks(contentBody);
    const results: LinkStatus[] = [];

    for (let i = 0; i < links.length; i++) {
      const url = links[i];

      // Check if internal or external
      const isExternal = url.startsWith("http") && !url.includes(window.location.host);

      if (isExternal) {
        // For external links, we just mark them as "warning" since we can't check them client-side
        results.push({
          url,
          status: "warning",
          message: "External link (verify manually)",
        });
      } else {
        // Check internal links
        const status = checkInternalLink(url, contents);
        results.push(status);
      }

      setProgress(Math.round(((i + 1) / links.length) * 100));
    }

    setLinkStatuses(results);
    setIsChecking(false);
  };

  // Check all contents
  const checkAll = async () => {
    setIsChecking(true);
    setLinkStatuses([]);
    setProgress(0);

    const publishedContent = contents.filter((c) => c.status === "published");
    const allResults: LinkStatus[] = [];
    let processed = 0;

    for (const contents of publishedContent) {
      const body = getContentBody(contents);
      if (body) {
        const links = extractLinks(body);

        for (const url of links) {
          const isExternal = url.startsWith("http") && !url.includes(window.location.host);

          if (isExternal) {
            allResults.push({
              url,
              status: "warning",
              message: "External link",
              contentId: contents.id,
              contentTitle: contents.title,
            });
          } else {
            const status = checkInternalLink(url, contents);
            allResults.push({
              ...status,
              contentId: contents.id,
              contentTitle: contents.title,
            });
          }
        }
      }

      processed++;
      setProgress(Math.round((processed / publishedContent.length) * 100));
    }

    setLinkStatuses(allResults);
    setIsChecking(false);
  };

  // Stats
  const stats = useMemo(() => {
    return {
      total: linkStatuses.length,
      valid: linkStatuses.filter((l) => l.status === "valid").length,
      broken: linkStatuses.filter((l) => l.status === "broken").length,
      warnings: linkStatuses.filter((l) => l.status === "warning").length,
    };
  }, [linkStatuses]);

  const getStatusIcon = (status: LinkStatus["status"]) => {
    switch (status) {
      case "valid":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "broken":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case "checking":
        return <Loader2 className="h-4 w-4 animate-spin" />;
    }
  };

  const getStatusBadge = (status: LinkStatus["status"]) => {
    switch (status) {
      case "valid":
        return <Badge className="bg-green-100 text-green-700">Valid</Badge>;
      case "broken":
        return <Badge variant="destructive">Broken</Badge>;
      case "warning":
        return <Badge className="bg-yellow-100 text-yellow-700">Warning</Badge>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Link2Off className="h-4 w-4" />
          Check Links
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Broken Link Checker
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Action Buttons */}
          <div className="flex gap-2">
            {contentBody && (
              <Button onClick={checkCurrentContent} disabled={isChecking}>
                {isChecking ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                Check This Content
              </Button>
            )}
            {checkAllContent && (
              <Button onClick={checkAll} disabled={isChecking} variant="outline">
                {isChecking ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Globe className="h-4 w-4 mr-2" />
                )}
                Check All Content
              </Button>
            )}
          </div>

          {/* Progress */}
          {isChecking && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Checking links...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Stats */}
          {linkStatuses.length > 0 && !isChecking && (
            <div className="flex gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total Links</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.valid}</div>
                <div className="text-xs text-muted-foreground">Valid</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.broken}</div>
                <div className="text-xs text-muted-foreground">Broken</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.warnings}</div>
                <div className="text-xs text-muted-foreground">Warnings</div>
              </div>
            </div>
          )}

          {/* Results */}
          {linkStatuses.length > 0 && (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {/* Show broken first */}
                {linkStatuses
                  .sort((a, b) => {
                    const order = { broken: 0, warning: 1, valid: 2, checking: 3 };
                    return order[a.status] - order[b.status];
                  })
                  .map((link, index) => (
                    <div
                      key={index}
                      className={`p-3 border rounded-lg ${
                        link.status === "broken"
                          ? "border-red-200 bg-red-50"
                          : link.status === "warning"
                          ? "border-yellow-200 bg-yellow-50"
                          : "border-green-200 bg-green-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {getStatusIcon(link.status)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-background px-2 py-1 rounded truncate block max-w-[400px]">
                              {link.url}
                            </code>
                            {getStatusBadge(link.status)}
                          </div>
                          {link.message && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {link.message}
                            </p>
                          )}
                          {link.contentTitle && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Found in: {link.contentTitle}
                            </p>
                          )}
                        </div>
                        {link.status === "broken" && link.contentId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              navigate(`/admin/articles/${link.contentId}`);
                              setOpen(false);
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </ScrollArea>
          )}

          {/* Empty State */}
          {!isChecking && linkStatuses.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Link2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Click a button above to check links</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
