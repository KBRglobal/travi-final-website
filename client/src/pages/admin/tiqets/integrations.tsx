import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Link2,
  Check,
  AlertCircle,
  ExternalLink,
  Settings,
  Loader2,
} from "lucide-react";

interface IntegrationStatus {
  tiqets: {
    configured: boolean;
    apiToken: boolean;
    partnerId: string | null;
    lastCheck: string | null;
    status: "connected" | "error" | "not_configured";
    message: string;
  };
}

export default function TiqetsIntegrations() {
  const { data, isLoading, refetch, isFetching } = useQuery<IntegrationStatus>({
    queryKey: ["/api/admin/tiqets/integration-status"],
  });

  const tiqets = data?.tiqets;
  const isConnected = tiqets?.status === "connected";
  const hasError = tiqets?.status === "error";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Integrations</h1>
          <p className="text-muted-foreground">Manage external API connections for attraction data</p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
          data-testid="button-refresh-status"
        >
          {isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Settings className="h-4 w-4 mr-2" />
          )}
          Refresh Status
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Link2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Tiqets API</CardTitle>
                    <CardDescription>
                      Import attractions with booking links and affiliate tracking
                    </CardDescription>
                  </div>
                </div>
                <Badge
                  variant={isConnected ? "default" : hasError ? "destructive" : "secondary"}
                  data-testid="badge-tiqets-status"
                >
                  {isConnected ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Connected
                    </>
                  ) : hasError ? (
                    <>
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Error
                    </>
                  ) : (
                    "Not Configured"
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 border rounded-lg space-y-2">
                  <p className="text-sm font-medium">API Token</p>
                  <div className="flex items-center gap-2">
                    {tiqets?.apiToken ? (
                      <>
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-muted-foreground">Configured</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm text-muted-foreground">Not set</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Set via TIQETS_API_TOKEN environment variable
                  </p>
                </div>

                <div className="p-4 border rounded-lg space-y-2">
                  <p className="text-sm font-medium">Partner ID</p>
                  <div className="flex items-center gap-2">
                    {tiqets?.partnerId ? (
                      <>
                        <Check className="h-4 w-4 text-green-500" />
                        <code className="text-sm bg-muted px-2 py-0.5 rounded">{tiqets.partnerId}</code>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm text-muted-foreground">Not set</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Set via TIQETS_PARTNER_ID environment variable
                  </p>
                </div>
              </div>

              {tiqets?.message && (
                <div className={`p-3 rounded-lg ${isConnected ? "bg-green-50 dark:bg-green-900/20" : "bg-yellow-50 dark:bg-yellow-900/20"}`}>
                  <p className="text-sm">{tiqets.message}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {tiqets?.lastCheck ? (
                    <>Last checked: {new Date(tiqets.lastCheck).toLocaleString()}</>
                  ) : (
                    "Status not checked yet"
                  )}
                </p>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://partner.tiqets.com" target="_blank" rel="noopener noreferrer">
                    Tiqets Partner Portal
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How It Works</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">1</div>
                    <p className="font-medium">Configure Cities</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Go to Destinations and link each city to its Tiqets ID using the "Find ID" button.
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">2</div>
                    <p className="font-medium">Import Attractions</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Once configured, import attractions from Tiqets for each city. Pricing and venue data is imported.
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">3</div>
                    <p className="font-medium">Generate Content</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Images and descriptions are generated using Freepik and AI - not imported from Tiqets.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
