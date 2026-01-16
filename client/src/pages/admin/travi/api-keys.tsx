import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  Key,
  Check,
  X,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  PlayCircle,
  Save,
  Clock,
  Database,
  Server,
  Trash2,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  History,
} from "lucide-react";

interface ApiKeyData {
  serviceName: string;
  displayName: string;
  status: "valid" | "invalid" | "not_configured" | "rate_limited" | "expired";
  maskedKey: string | null;
  hasDbKey: boolean;
  hasEnvFallback: boolean;
  lastTested: string | null;
  lastTestResult: string | null;
  updatedAt?: string;
  updatedBy?: string;
}

interface ApiKeysResponse {
  success: boolean;
  data: {
    keys: ApiKeyData[];
    encryptionConfigured: boolean;
    supportedServices: Array<{ name: string; displayName: string; envVar: string }>;
  };
}

interface AuditEntry {
  id: string;
  serviceName: string;
  action: "created" | "updated" | "deleted" | "tested";
  performedBy: string | null;
  performedAt: string;
  status: string | null;
  details: string | null;
}

interface AuditResponse {
  success: boolean;
  data: {
    auditLog: AuditEntry[];
    count: number;
  };
}

function getStatusBadge(status: string) {
  switch (status) {
    case "valid":
      return <Badge className="bg-green-600"><Check className="w-3 h-3 mr-1" />Valid</Badge>;
    case "invalid":
      return <Badge variant="destructive"><X className="w-3 h-3 mr-1" />Invalid</Badge>;
    case "not_configured":
      return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />Not Configured</Badge>;
    case "rate_limited":
      return <Badge className="bg-yellow-600"><Clock className="w-3 h-3 mr-1" />Rate Limited</Badge>;
    case "expired":
      return <Badge variant="destructive"><Clock className="w-3 h-3 mr-1" />Expired</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  return date.toLocaleDateString() + " " + date.toLocaleTimeString();
}

export default function TraviApiKeysManagement() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [editingKeys, setEditingKeys] = useState<Record<string, string>>({});
  const [testingService, setTestingService] = useState<string | null>(null);
  const [showAudit, setShowAudit] = useState(false);

  const { data: keysData, isLoading: keysLoading, refetch: refetchKeys } = useQuery<ApiKeysResponse>({
    queryKey: ["/api/travi/api-keys"],
  });

  const { data: auditData, isLoading: auditLoading } = useQuery<AuditResponse>({
    queryKey: ["/api/travi/api-keys/audit"],
    enabled: showAudit,
  });

  const updateKeyMutation = useMutation({
    mutationFn: async ({ serviceName, apiKey }: { serviceName: string; apiKey: string }) => {
      return apiRequest("POST", "/api/travi/api-keys", { serviceName, apiKey });
    },
    onSuccess: (_, { serviceName }) => {
      toast({ title: "API key updated successfully" });
      setEditingKeys(prev => ({ ...prev, [serviceName]: "" }));
      queryClient.invalidateQueries({ queryKey: ["/api/travi/api-keys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/travi/api-keys/audit"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update API key", description: error.message, variant: "destructive" });
    },
  });

  const testKeyMutation = useMutation({
    mutationFn: async (serviceName: string) => {
      setTestingService(serviceName);
      const response = await fetch(`/api/travi/api-keys/${serviceName}/test`, { method: "POST" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Test failed");
      }
      return response.json();
    },
    onSuccess: (data, serviceName) => {
      const keyData = keysData?.data.keys.find(k => k.serviceName === serviceName);
      if (data.success) {
        toast({ title: `${keyData?.displayName || serviceName} API test passed` });
      } else {
        toast({ 
          title: `${keyData?.displayName || serviceName} API test failed`, 
          description: data.data?.testResult,
          variant: "destructive" 
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/travi/api-keys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/travi/api-keys/audit"] });
    },
    onError: (error: Error, serviceName) => {
      toast({ title: `Test failed for ${serviceName}`, description: error.message, variant: "destructive" });
    },
    onSettled: () => {
      setTestingService(null);
    },
  });

  const deleteKeyMutation = useMutation({
    mutationFn: async (serviceName: string) => {
      return apiRequest("DELETE", `/api/travi/api-keys/${serviceName}`);
    },
    onSuccess: () => {
      toast({ title: "API key deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/travi/api-keys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/travi/api-keys/audit"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete API key", description: error.message, variant: "destructive" });
    },
  });

  const toggleShowKey = (serviceName: string) => {
    setShowKeys(prev => ({ ...prev, [serviceName]: !prev[serviceName] }));
  };

  if (keysLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const keys = keysData?.data.keys || [];
  const encryptionConfigured = keysData?.data.encryptionConfigured ?? false;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/travi")}
            data-testid="button-back-travi"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Key className="w-6 h-6" />
              API Keys Management
            </h1>
            <p className="text-muted-foreground text-sm">
              Securely manage API keys for external services
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAudit(!showAudit)}
            data-testid="button-toggle-audit"
          >
            <History className="w-4 h-4 mr-2" />
            {showAudit ? "Hide Audit Log" : "Show Audit Log"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchKeys()}
            data-testid="button-refresh-keys"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {!encryptionConfigured && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" />
              Encryption Not Configured
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              API_KEYS_ENCRYPTION_KEY environment variable is not set. Using a temporary encryption key 
              that will change on restart. Configure a permanent key in your secrets.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {keys.map((key) => (
          <Card key={key.serviceName} data-testid={`card-api-key-${key.serviceName}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">{key.displayName}</CardTitle>
                  {getStatusBadge(key.status)}
                </div>
                <div className="flex items-center gap-2">
                  {key.hasDbKey && (
                    <Badge variant="outline" className="gap-1">
                      <Database className="w-3 h-3" />
                      Database
                    </Badge>
                  )}
                  {key.hasEnvFallback && (
                    <Badge variant="outline" className="gap-1">
                      <Server className="w-3 h-3" />
                      Env Var
                    </Badge>
                  )}
                </div>
              </div>
              {key.lastTested && (
                <CardDescription className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Last tested: {formatDate(key.lastTested)}
                  {key.lastTestResult && ` - ${key.lastTestResult}`}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {key.maskedKey && (
                <div className="flex items-center gap-2">
                  <Label className="w-24">Current Key:</Label>
                  <code className="bg-muted px-2 py-1 rounded text-sm font-mono flex-1">
                    {showKeys[key.serviceName] ? key.maskedKey : "***"}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleShowKey(key.serviceName)}
                    data-testid={`button-toggle-key-${key.serviceName}`}
                  >
                    {showKeys[key.serviceName] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Label className="w-24">New Key:</Label>
                <Input
                  type="password"
                  placeholder="Enter new API key..."
                  value={editingKeys[key.serviceName] || ""}
                  onChange={(e) => setEditingKeys(prev => ({ ...prev, [key.serviceName]: e.target.value }))}
                  className="flex-1 font-mono text-sm"
                  data-testid={`input-api-key-${key.serviceName}`}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between gap-2 flex-wrap">
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  disabled={!editingKeys[key.serviceName] || updateKeyMutation.isPending}
                  onClick={() => updateKeyMutation.mutate({ 
                    serviceName: key.serviceName, 
                    apiKey: editingKeys[key.serviceName] 
                  })}
                  data-testid={`button-save-key-${key.serviceName}`}
                >
                  {updateKeyMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(!key.hasDbKey && !key.hasEnvFallback) || testingService === key.serviceName}
                  onClick={() => testKeyMutation.mutate(key.serviceName)}
                  data-testid={`button-test-key-${key.serviceName}`}
                >
                  {testingService === key.serviceName ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <PlayCircle className="w-4 h-4 mr-2" />
                  )}
                  Test
                </Button>
              </div>
              {key.hasDbKey && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => {
                    if (confirm(`Delete the stored API key for ${key.displayName}?`)) {
                      deleteKeyMutation.mutate(key.serviceName);
                    }
                  }}
                  data-testid={`button-delete-key-${key.serviceName}`}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      {showAudit && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Audit Log
              </CardTitle>
              <CardDescription>
                Recent API key operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {(auditData?.data.auditLog || []).map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between gap-4 p-3 rounded-md border bg-muted/30"
                        data-testid={`audit-entry-${entry.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="capitalize">
                            {entry.action}
                          </Badge>
                          <span className="font-medium">{entry.serviceName}</span>
                          {entry.details && (
                            <span className="text-muted-foreground text-sm">
                              - {entry.details}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{entry.performedBy || "System"}</span>
                          <span>{formatDate(entry.performedAt)}</span>
                        </div>
                      </div>
                    ))}
                    {(!auditData?.data.auditLog || auditData.data.auditLog.length === 0) && (
                      <p className="text-center text-muted-foreground py-8">
                        No audit entries yet
                      </p>
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            Security Information
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            All API keys stored in the database are encrypted using AES-256-GCM encryption.
            Keys are never logged or exposed in plain text through the API.
          </p>
          <p>
            If both a database key and environment variable are configured for a service,
            the database key takes priority. Environment variables serve as fallbacks.
          </p>
          <p>
            All key operations (create, update, delete, test) are logged in the audit trail
            for security compliance.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
