import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Key, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface DetectedKeys {
  detected: Record<string, string[]>;
  total: number;
}

interface EngineStats {
  stats: {
    total: number;
    healthy: number;
    byProvider: Record<string, number>;
  };
  engines: Array<{
    id: string;
    name: string;
    provider: string;
    model: string;
    isHealthy: boolean;
    successCount: number;
    errorCount: number;
  }>;
}

export default function ApiKeysSetup() {
  const { data: detected, isLoading: detectLoading } = useQuery<DetectedKeys>({
    queryKey: ["/api/admin/api-keys/detected"],
  });

  const { data: engineStats, isLoading: statsLoading } = useQuery<EngineStats>({
    queryKey: ["/api/admin/content-quality/engine-stats"],
  });

  if (detectLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const providers = [
    { key: "anthropic", name: "Claude / Anthropic", prefix: "ANTHROPIC_API_KEY" },
    { key: "helicone", name: "Helicone Proxy", prefix: "HELICONE_API_KEY" },
    { key: "openai", name: "OpenAI", prefix: "OPENAI_API_KEY" },
    { key: "openrouter", name: "OpenRouter", prefix: "OPENROUTER_API_KEY" },
    { key: "gemini", name: "Google Gemini", prefix: "GEMINI_API_KEY" },
    { key: "groq", name: "Groq", prefix: "GROQ_API_KEY" },
    { key: "mistral", name: "Mistral", prefix: "MISTRAL_API_KEY" },
    { key: "deepseek", name: "DeepSeek", prefix: "DEEPSEEK_API_KEY" },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            API Keys Status
          </h1>
          <p className="text-muted-foreground">
            View detected API keys and active AI engines
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="text-lg px-4 py-2">
            <Key className="h-4 w-4 mr-2" />
            {detected?.total || 0} Keys Detected
          </Badge>
          <Badge variant="default" className="text-lg px-4 py-2">
            <CheckCircle className="h-4 w-4 mr-2" />
            {engineStats?.stats.total || 0} Engines Active
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            How to Add API Keys
          </CardTitle>
          <CardDescription>
            Add your API keys in the Replit Secrets panel. Use these naming conventions:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm font-mono">
            <div>
              <p className="font-bold mb-1">Claude/Anthropic:</p>
              <p className="text-muted-foreground">ANTHROPIC_API_KEY_1 through _20</p>
            </div>
            <div>
              <p className="font-bold mb-1">Helicone:</p>
              <p className="text-muted-foreground">HELICONE_API_KEY_1 through _20</p>
            </div>
            <div>
              <p className="font-bold mb-1">OpenAI:</p>
              <p className="text-muted-foreground">OPENAI_API_KEY_1 through _20</p>
            </div>
            <div>
              <p className="font-bold mb-1">OpenRouter:</p>
              <p className="text-muted-foreground">OPENROUTER_API_KEY_1 through _20</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {providers.map((provider) => {
          const keys = detected?.detected[provider.key] || [];
          const engineCount = engineStats?.stats.byProvider[provider.key] || 0;
          
          return (
            <Card key={provider.key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  {provider.name}
                  {keys.length > 0 ? (
                    <Badge variant="default">{keys.length}</Badge>
                  ) : (
                    <Badge variant="secondary">0</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {keys.length > 0 ? (
                  <div className="space-y-1">
                    {keys.slice(0, 5).map((key) => (
                      <div key={key} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span className="font-mono text-xs">{key}</span>
                      </div>
                    ))}
                    {keys.length > 5 && (
                      <p className="text-xs text-muted-foreground">
                        +{keys.length - 5} more...
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {engineCount} engine{engineCount !== 1 ? "s" : ""} active
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <XCircle className="h-3 w-3" />
                    No keys detected
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {engineStats && engineStats.engines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Engines ({engineStats.stats.healthy}/{engineStats.stats.total} Healthy)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {engineStats.engines.map((engine) => (
                <div
                  key={engine.id}
                  className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                  data-testid={`engine-${engine.id}`}
                >
                  <div className="flex items-center gap-2">
                    {engine.isHealthy ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{engine.name}</p>
                      <p className="text-xs text-muted-foreground">{engine.model}</p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{engine.successCount} ok</p>
                    <p>{engine.errorCount} err</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
