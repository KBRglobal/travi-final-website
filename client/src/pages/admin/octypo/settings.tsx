import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Key,
  Save,
  TestTube,
  Loader2,
  CheckCircle2,
  XCircle,
  Shield,
  Settings2,
  Cpu,
  Eye,
  EyeOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface OctypoSettings {
  // API Keys
  anthropicApiKey?: string;
  openaiApiKey?: string;
  openrouterApiKey?: string;
  geminiApiKey?: string;
  groqApiKey?: string;
  mistralApiKey?: string;
  deepseekApiKey?: string;
  togetherApiKey?: string;
  perplexityApiKey?: string;
  heliconeApiKey?: string;

  // Gatekeeper Settings
  preferredProvider?: string;
  seoWeight?: number;
  aeoWeight?: number;
  viralityWeight?: number;
  minScoreForS1?: number;
  minScoreForS2?: number;
  skipBelowScore?: number;

  // General
  enabled?: boolean;
  autoPublish?: boolean;
  maxDailyArticles?: number;

  _masked?: Record<string, boolean>;
}

interface EngineStats {
  total: number;
  healthy: number;
  byProvider: Record<string, number>;
}

const API_KEY_FIELDS = [
  { key: "anthropicApiKey", label: "Anthropic", provider: "anthropic", placeholder: "sk-ant-..." },
  { key: "openaiApiKey", label: "OpenAI", provider: "openai", placeholder: "sk-..." },
  { key: "openrouterApiKey", label: "OpenRouter", provider: "openrouter", placeholder: "sk-or-..." },
  { key: "geminiApiKey", label: "Gemini", provider: "gemini", placeholder: "AI..." },
  { key: "groqApiKey", label: "Groq", provider: "groq", placeholder: "gsk_..." },
  { key: "mistralApiKey", label: "Mistral", provider: "mistral", placeholder: "..." },
  { key: "deepseekApiKey", label: "DeepSeek", provider: "deepseek", placeholder: "sk-..." },
  { key: "togetherApiKey", label: "Together", provider: "together", placeholder: "..." },
  { key: "perplexityApiKey", label: "Perplexity", provider: "perplexity", placeholder: "pplx-..." },
  { key: "heliconeApiKey", label: "Helicone (Monitoring)", provider: "helicone", placeholder: "sk-..." },
];

export default function OctypoSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState<Partial<OctypoSettings>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [testingKey, setTestingKey] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ settings: OctypoSettings; engines: EngineStats }>({
    queryKey: ["/api/admin/octypo/settings"],
  });

  const saveMutation = useMutation({
    mutationFn: async (settings: Partial<OctypoSettings>) => {
      const response = await apiRequest("POST", "/api/admin/octypo/settings", settings);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Settings saved", description: "Your changes have been saved." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/octypo/settings"] });
      setLocalSettings({});
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const testKeyMutation = useMutation({
    mutationFn: async ({ provider, apiKey }: { provider: string; apiKey: string }) => {
      const response = await apiRequest("POST", "/api/admin/octypo/settings/test-key", {
        provider,
        apiKey,
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        toast({ title: "Key Valid", description: data.message });
      } else {
        toast({ title: "Key Invalid", description: data.message, variant: "destructive" });
      }
      setTestingKey(null);
    },
    onError: (error) => {
      toast({ title: "Test Failed", description: error.message, variant: "destructive" });
      setTestingKey(null);
    },
  });

  const settings = { ...data?.settings, ...localSettings };
  const engines = data?.engines;

  const handleChange = (key: string, value: any) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    saveMutation.mutate(localSettings);
  };

  const handleTestKey = (provider: string, keyField: string) => {
    const apiKey = localSettings[keyField as keyof OctypoSettings] || settings[keyField as keyof OctypoSettings];
    if (!apiKey || (typeof apiKey === 'string' && apiKey.startsWith('••••'))) {
      toast({ title: "No key to test", description: "Enter a new key first", variant: "destructive" });
      return;
    }
    setTestingKey(keyField);
    testKeyMutation.mutate({ provider, apiKey: apiKey as string });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const hasChanges = Object.keys(localSettings).length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Octypo Settings</h1>
          <p className="text-muted-foreground">Configure API keys and gatekeeper parameters</p>
        </div>
        <div className="flex items-center gap-4">
          {engines && (
            <Badge variant="outline" className="text-sm">
              <Cpu className="h-4 w-4 mr-1" />
              {engines.healthy}/{engines.total} Engines
            </Badge>
          )}
          <Button onClick={handleSave} disabled={!hasChanges || saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="api-keys">
        <TabsList>
          <TabsTrigger value="api-keys">
            <Key className="h-4 w-4 mr-2" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="gatekeeper">
            <Shield className="h-4 w-4 mr-2" />
            Gatekeeper
          </TabsTrigger>
          <TabsTrigger value="general">
            <Settings2 className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                LLM Provider API Keys
              </CardTitle>
              <CardDescription>
                Add your API keys here. They are encrypted and stored securely.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {API_KEY_FIELDS.map((field) => {
                const currentValue = settings[field.key as keyof OctypoSettings] as string || "";
                const isMasked = data?.settings?._masked?.[field.key];
                const isVisible = showKeys[field.key];
                const engineCount = engines?.byProvider?.[field.provider] || 0;

                return (
                  <div key={field.key} className="grid grid-cols-[200px_1fr_auto_auto] gap-4 items-center">
                    <Label className="flex items-center gap-2">
                      {field.label}
                      {engineCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {engineCount} engines
                        </Badge>
                      )}
                    </Label>
                    <div className="relative">
                      <Input
                        type={isVisible ? "text" : "password"}
                        placeholder={field.placeholder}
                        value={localSettings[field.key as keyof OctypoSettings] as string ?? currentValue}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowKeys((prev) => ({ ...prev, [field.key]: !prev[field.key] }))}
                      >
                        {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestKey(field.provider, field.key)}
                      disabled={testingKey === field.key}
                    >
                      {testingKey === field.key ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <TestTube className="h-4 w-4" />
                      )}
                    </Button>
                    {isMasked && !localSettings[field.key as keyof OctypoSettings] && (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gatekeeper" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Scoring Weights</CardTitle>
              <CardDescription>
                Adjust how Gate 1 evaluates content for publication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>SEO Weight</Label>
                  <span className="text-sm font-medium">{settings.seoWeight || 40}%</span>
                </div>
                <Slider
                  value={[settings.seoWeight || 40]}
                  onValueChange={([v]) => handleChange("seoWeight", v)}
                  min={0}
                  max={100}
                  step={5}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>AEO Weight (Answer Engine Optimization)</Label>
                  <span className="text-sm font-medium">{settings.aeoWeight || 35}%</span>
                </div>
                <Slider
                  value={[settings.aeoWeight || 35]}
                  onValueChange={([v]) => handleChange("aeoWeight", v)}
                  min={0}
                  max={100}
                  step={5}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Virality Weight</Label>
                  <span className="text-sm font-medium">{settings.viralityWeight || 25}%</span>
                </div>
                <Slider
                  value={[settings.viralityWeight || 25]}
                  onValueChange={([v]) => handleChange("viralityWeight", v)}
                  min={0}
                  max={100}
                  step={5}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tier Thresholds</CardTitle>
              <CardDescription>
                Content scoring thresholds for S1/S2/S3 classification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Minimum Score for S1 (Breaking/Exclusive)</Label>
                  <span className="text-sm font-medium">{settings.minScoreForS1 || 80}</span>
                </div>
                <Slider
                  value={[settings.minScoreForS1 || 80]}
                  onValueChange={([v]) => handleChange("minScoreForS1", v)}
                  min={50}
                  max={100}
                  step={5}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Minimum Score for S2 (High Value)</Label>
                  <span className="text-sm font-medium">{settings.minScoreForS2 || 60}</span>
                </div>
                <Slider
                  value={[settings.minScoreForS2 || 60]}
                  onValueChange={([v]) => handleChange("minScoreForS2", v)}
                  min={30}
                  max={90}
                  step={5}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Skip Below Score</Label>
                  <span className="text-sm font-medium">{settings.skipBelowScore || 40}</span>
                </div>
                <Slider
                  value={[settings.skipBelowScore || 40]}
                  onValueChange={([v]) => handleChange("skipBelowScore", v)}
                  min={0}
                  max={60}
                  step={5}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline Settings</CardTitle>
              <CardDescription>
                Control the autonomous content pipeline
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Octypo</Label>
                  <p className="text-sm text-muted-foreground">
                    Turn the autonomous pipeline on/off
                  </p>
                </div>
                <Switch
                  checked={settings.enabled ?? true}
                  onCheckedChange={(v) => handleChange("enabled", v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-Publish</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically publish approved content
                  </p>
                </div>
                <Switch
                  checked={settings.autoPublish ?? false}
                  onCheckedChange={(v) => handleChange("autoPublish", v)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Max Daily Articles</Label>
                  <span className="text-sm font-medium">{settings.maxDailyArticles || 50}</span>
                </div>
                <Slider
                  value={[settings.maxDailyArticles || 50]}
                  onValueChange={([v]) => handleChange("maxDailyArticles", v)}
                  min={1}
                  max={200}
                  step={5}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
