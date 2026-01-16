import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Code, Copy, Check, RefreshCw, FileJson } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SchemaPreviewProps {
  contentId: string;
}

interface SchemaResponse {
  schemas: {
    primary: Record<string, unknown>;
    faq?: Record<string, unknown> | null;
    breadcrumb?: Record<string, unknown>;
    webpage?: Record<string, unknown>;
  };
  jsonLd: string;
  htmlEmbed: string;
}

export function SchemaPreview({ contentId }: SchemaPreviewProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const { toast } = useToast();

  const { data, isLoading, error, refetch, isFetching } = useQuery<SchemaResponse>({
    queryKey: [`/api/contents/${contentId}/schema`],
    queryFn: async () => {
      const res = await fetch(`/api/contents/${contentId}/schema`);
      if (!res.ok) throw new Error("Failed to fetch schema");
      return res.json();
    },
    enabled: !!contentId,
    staleTime: 30000,
  });

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  if (!contentId) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">
            Save the contents first to generate schema markup.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-muted-foreground">Generating schema...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive text-center">Failed to generate schema</p>
          <Button variant="outline" onClick={() => refetch()} className="mt-2 mx-auto block">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const schemaTypes = [
    { key: "primary", label: "Primary Schema", data: data.schemas.primary },
    data.schemas.faq && { key: "faq", label: "FAQ Schema", data: data.schemas.faq },
    data.schemas.breadcrumb && { key: "breadcrumb", label: "Breadcrumb", data: data.schemas.breadcrumb },
    data.schemas.webpage && { key: "webpage", label: "WebPage", data: data.schemas.webpage },
  ].filter(Boolean) as { key: string; label: string; data: Record<string, unknown> }[];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileJson className="h-4 w-4" />
            JSON-LD Schema Markup
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            data-testid="button-refresh-schema"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {schemaTypes.map((schema) => (
            <Badge key={schema.key} variant="secondary" className="text-xs">
              {(schema.data as { "@type"?: string | string[] })["@type"]?.toString() || schema.label}
            </Badge>
          ))}
        </div>

        <Tabs defaultValue="preview" className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="preview" data-testid="tab-schema-preview">Preview</TabsTrigger>
            <TabsTrigger value="html" data-testid="tab-schema-html">HTML Embed</TabsTrigger>
            <TabsTrigger value="raw" data-testid="tab-schema-raw">Raw JSON</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="space-y-3 mt-3">
            {schemaTypes.map((schema) => (
              <div key={schema.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{schema.label}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(JSON.stringify(schema.data, null, 2), schema.key)}
                    data-testid={`button-copy-schema-${schema.key}`}
                  >
                    {copied === schema.key ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                <ScrollArea className="h-40 rounded-md border bg-muted/50">
                  <pre className="p-3 text-xs font-mono whitespace-pre-wrap">
                    {JSON.stringify(schema.data, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="html" className="mt-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Copy this code and paste it in your HTML head section
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(data.htmlEmbed, "html")}
                  data-testid="button-copy-html-embed"
                >
                  {copied === "html" ? (
                    <><Check className="h-3 w-3 mr-1" /> Copied</>
                  ) : (
                    <><Copy className="h-3 w-3 mr-1" /> Copy</>
                  )}
                </Button>
              </div>
              <ScrollArea className="h-64 rounded-md border bg-muted/50">
                <pre className="p-3 text-xs font-mono whitespace-pre-wrap">
                  {data.htmlEmbed}
                </pre>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="raw" className="mt-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Combined JSON-LD output</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(data.jsonLd, "raw")}
                  data-testid="button-copy-raw-json"
                >
                  {copied === "raw" ? (
                    <><Check className="h-3 w-3 mr-1" /> Copied</>
                  ) : (
                    <><Copy className="h-3 w-3 mr-1" /> Copy</>
                  )}
                </Button>
              </div>
              <ScrollArea className="h-64 rounded-md border bg-muted/50">
                <pre className="p-3 text-xs font-mono whitespace-pre-wrap">
                  {data.jsonLd}
                </pre>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
