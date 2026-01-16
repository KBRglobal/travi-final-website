import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  Key,
  Link2,
  DollarSign,
  MapPin,
  Check,
  X,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  PlayCircle,
  Save,
} from "lucide-react";

const TIQETS_AFFILIATE_LINK = "https://tiqets.tpo.lu/k16k6RXU";

interface ConfigData {
  apiKeys: {
    openai: { configured: boolean; lastTested?: string };
    anthropic: { configured: boolean; lastTested?: string };
    gemini: { configured: boolean; lastTested?: string };
    freepik: { configured: boolean; lastTested?: string };
    googlePlaces: { configured: boolean; lastTested?: string };
    tripadvisor: { configured: boolean; lastTested?: string };
  };
  budget: {
    dailyLimit: number;
    warningThreshold: number;
    currentSpend: number;
  };
  destinations: Array<{
    id: string;
    name: string;
    country: string;
    enabled: boolean;
    locationCount: number;
  }>;
  affiliateLink: string;
}

export default function TraviConfiguration() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [testingApi, setTestingApi] = useState<string | null>(null);
  const [budgetLimit, setBudgetLimit] = useState<number>(0);
  const [warningThreshold, setWarningThreshold] = useState<number>(0);
  const [savingBudget, setSavingBudget] = useState(false);

  const { data: config, isLoading } = useQuery<ConfigData>({
    queryKey: ["/api/admin/travi/config"],
    queryFn: async () => {
      const response = await fetch("/api/admin/travi/config");
      if (!response.ok) {
        return {
          apiKeys: {
            openai: { configured: false },
            anthropic: { configured: false },
            gemini: { configured: false },
            freepik: { configured: false },
            googlePlaces: { configured: false },
            tripadvisor: { configured: false },
          },
          budget: {
            dailyLimit: 50,
            warningThreshold: 40,
            currentSpend: 0,
          },
          destinations: [],
          affiliateLink: TIQETS_AFFILIATE_LINK,
        };
      }
      return response.json();
    },
  });

  const testApiMutation = useMutation({
    mutationFn: async (provider: string) => {
      setTestingApi(provider);
      return apiRequest("POST", `/api/admin/travi/config/test-api`, { provider });
    },
    onSuccess: (_, provider) => {
      toast({ title: `${provider} API connection successful` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/travi/config"] });
    },
    onError: (_, provider) => {
      toast({ title: `${provider} API test failed`, variant: "destructive" });
    },
    onSettled: () => {
      setTestingApi(null);
    },
  });

  const toggleDestinationMutation = useMutation({
    mutationFn: async ({ destinationId, enabled }: { destinationId: string; enabled: boolean }) => {
      return apiRequest("PATCH", `/api/admin/travi/config/destinations/${destinationId}`, { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/travi/config"] });
      toast({ title: "Destination setting updated" });
    },
    onError: () => {
      toast({ title: "Failed to update destination", variant: "destructive" });
    },
  });

  const saveBudgetMutation = useMutation({
    mutationFn: async () => {
      setSavingBudget(true);
      return apiRequest("PATCH", "/api/admin/travi/config/budget", {
        dailyLimit: budgetLimit,
        warningThreshold: warningThreshold,
      });
    },
    onSuccess: () => {
      toast({ title: "Budget settings saved" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/travi/config"] });
    },
    onError: () => {
      toast({ title: "Failed to save budget settings", variant: "destructive" });
    },
    onSettled: () => {
      setSavingBudget(false);
    },
  });

  const toggleShowKey = (key: string) => {
    setShowApiKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[400px] lg:col-span-2" />
        </div>
      </div>
    );
  }

  const apiKeyStatus = config?.apiKeys || {
    openai: { configured: false },
    anthropic: { configured: false },
    gemini: { configured: false },
    freepik: { configured: false },
    googlePlaces: { configured: false },
    tripadvisor: { configured: false },
  };

  const budget = config?.budget || {
    dailyLimit: 50,
    warningThreshold: 40,
    currentSpend: 0,
  };

  if (budgetLimit === 0 && budget.dailyLimit > 0) {
    setBudgetLimit(budget.dailyLimit);
    setWarningThreshold(budget.warningThreshold);
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/admin/travi/locations")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">TRAVI Configuration</h1>
          <p className="text-muted-foreground">
            Manage API keys, budget limits, and destination settings
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Keys
            </CardTitle>
            <CardDescription>
              Configure API credentials for external services. Keys are stored securely and masked.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(apiKeyStatus).map(([provider, status]) => (
              <div key={provider} className="flex items-center justify-between gap-4 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {status.configured ? (
                    <Check className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                  )}
                  <div>
                    <p className="font-medium capitalize">{provider.replace(/([A-Z])/g, " $1").trim()}</p>
                    <p className="text-xs text-muted-foreground">
                      {status.configured ? (
                        showApiKeys[provider] ? "••••••••••••••••" : "Configured"
                      ) : (
                        "Not configured"
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {status.configured && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleShowKey(provider)}
                        data-testid={`button-toggle-${provider}`}
                      >
                        {showApiKeys[provider] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testApiMutation.mutate(provider)}
                        disabled={testingApi === provider}
                        data-testid={`button-test-${provider}`}
                      >
                        {testingApi === provider ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <PlayCircle className="h-4 w-4" />
                        )}
                      </Button>
                    </>
                  )}
                  {!status.configured && (
                    <Badge variant="outline" className="text-amber-600">
                      Required
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground mt-4">
              API keys are configured via environment variables (Secrets tab). Add the appropriate secret for each service.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Budget Settings
            </CardTitle>
            <CardDescription>
              Set daily spending limits and warning thresholds for AI API usage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Today's Spend</span>
                <span className="font-semibold">${budget.currentSpend.toFixed(2)}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    budget.currentSpend >= budget.dailyLimit
                      ? "bg-red-500"
                      : budget.currentSpend >= budget.warningThreshold
                        ? "bg-amber-500"
                        : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min((budget.currentSpend / budget.dailyLimit) * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                <span>$0</span>
                <span>${budget.dailyLimit}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dailyLimit">Daily Limit ($)</Label>
                <Input
                  id="dailyLimit"
                  type="number"
                  value={budgetLimit}
                  onChange={(e) => setBudgetLimit(Number(e.target.value))}
                  min={1}
                  data-testid="input-daily-limit"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="warningThreshold">Warning Threshold ($)</Label>
                <Input
                  id="warningThreshold"
                  type="number"
                  value={warningThreshold}
                  onChange={(e) => setWarningThreshold(Number(e.target.value))}
                  min={1}
                  max={budgetLimit}
                  data-testid="input-warning-threshold"
                />
                <p className="text-xs text-muted-foreground">
                  You'll receive a warning when spend reaches this amount.
                </p>
              </div>
              <Button
                onClick={() => saveBudgetMutation.mutate()}
                disabled={savingBudget}
                className="w-full"
                data-testid="button-save-budget"
              >
                {savingBudget ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Budget Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Affiliate Settings
            </CardTitle>
            <CardDescription>
              Tiqets affiliate link for ticket bookings. This link is locked system-wide.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex-1">
                <Label className="text-sm text-muted-foreground">Tiqets Affiliate Link</Label>
                <Input
                  value={TIQETS_AFFILIATE_LINK}
                  readOnly
                  className="mt-1 bg-muted font-mono text-sm"
                  data-testid="input-affiliate-link"
                />
              </div>
              <Button variant="outline" asChild data-testid="button-test-affiliate">
                <a href={TIQETS_AFFILIATE_LINK} target="_blank" rel="noopener noreferrer">
                  Test Link
                </a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              This affiliate link is enforced throughout the system and cannot be changed.
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Destinations
            </CardTitle>
            <CardDescription>
              Enable or disable content generation for each destination.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {config?.destinations && config.destinations.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {config.destinations.map((destination) => (
                  <div
                    key={destination.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    data-testid={`destination-${destination.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{destination.name}</p>
                      <p className="text-xs text-muted-foreground">{destination.country}</p>
                      {destination.locationCount > 0 && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          {destination.locationCount} locations
                        </Badge>
                      )}
                    </div>
                    <Switch
                      checked={destination.enabled}
                      onCheckedChange={(enabled) =>
                        toggleDestinationMutation.mutate({
                          destinationId: destination.id,
                          enabled,
                        })
                      }
                      disabled={toggleDestinationMutation.isPending}
                      data-testid={`toggle-${destination.id}`}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No destinations configured yet.</p>
                <p className="text-sm">Run the destination seeder to populate.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
