import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Globe,
  MapPin,
  Link2,
  Settings,
  ArrowRight,
  Check,
  AlertCircle,
  Loader2,
  Download,
  Search,
  Play,
} from "lucide-react";

interface DashboardStats {
  cities: {
    total: number;
    configured: number;
    active: number;
  };
  attractions: {
    total: number;
    imported: number;
    ready: number;
    published: number;
  };
  integration: {
    status: "connected" | "error" | "not_configured";
    partnerId: string | null;
  };
}

export default function TiqetsDashboard() {
  const { toast } = useToast();
  const [importLogs, setImportLogs] = useState<string[]>([]);
  
  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/tiqets/dashboard-stats"],
  });

  const findCityIdsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/tiqets/find-city-ids");
      return response.json();
    },
    onSuccess: (data) => {
      setImportLogs(data.logs || []);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tiqets/dashboard-stats"] });
      toast({
        title: "City IDs Found",
        description: `Found ${data.found}/${data.total} cities`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to find city IDs",
        variant: "destructive",
      });
    },
  });

  const importAllMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/tiqets/import-all");
      return response.json();
    },
    onSuccess: (data) => {
      setImportLogs(data.logs || []);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tiqets/dashboard-stats"] });
      toast({
        title: "Import Complete",
        description: `Imported ${data.imported} new + ${data.updated} updated = ${data.total} attractions`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to import attractions",
        variant: "destructive",
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/tiqets/test-connection");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? "Connection Successful" : "Connection Failed",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to test connection",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const stats = data || {
    cities: { total: 0, configured: 0, active: 0 },
    attractions: { total: 0, imported: 0, ready: 0, published: 0 },
    integration: { status: "not_configured", partnerId: null },
  };

  const isConnected = stats.integration.status === "connected";
  const isImporting = findCityIdsMutation.isPending || importAllMutation.isPending;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Tiqets Dashboard</h1>
          <p className="text-muted-foreground">Manage attraction imports and content generation</p>
        </div>
        <Badge
          variant={isConnected ? "default" : "secondary"}
          className="h-7"
          data-testid="badge-integration-status"
        >
          {isConnected ? (
            <>
              <Check className="h-3 w-3 mr-1" />
              API Connected
            </>
          ) : (
            <>
              <AlertCircle className="h-3 w-3 mr-1" />
              Not Configured
            </>
          )}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Target Cities</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-cities-total">{stats.cities.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.cities.configured} configured, {stats.cities.active} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Attractions</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-attractions-total">{stats.attractions.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.attractions.imported} imported
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Ready</CardTitle>
            <Check className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-attractions-ready">{stats.attractions.ready}</div>
            <p className="text-xs text-muted-foreground">Content generated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-attractions-published">{stats.attractions.published}</div>
            <p className="text-xs text-muted-foreground">Live on website</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Import Actions
            </CardTitle>
            <CardDescription>
              Import attractions from Tiqets API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-between" 
              data-testid="button-test-connection"
              onClick={() => testConnectionMutation.mutate()}
              disabled={testConnectionMutation.isPending}
            >
              <span className="flex items-center gap-2">
                {testConnectionMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                Test API Connection
              </span>
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-between" 
              data-testid="button-find-city-ids"
              onClick={() => findCityIdsMutation.mutate()}
              disabled={isImporting || !isConnected}
            >
              <span className="flex items-center gap-2">
                {findCityIdsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Find City IDs
              </span>
              <Badge variant="secondary">{stats.cities.configured}/{stats.cities.total}</Badge>
            </Button>
            <Button 
              variant="default" 
              className="w-full justify-between" 
              data-testid="button-import-all"
              onClick={() => importAllMutation.mutate()}
              disabled={isImporting || stats.cities.configured === 0}
            >
              <span className="flex items-center gap-2">
                {importAllMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Import All Attractions
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Quick Links
            </CardTitle>
            <CardDescription>
              Manage destinations and settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin/tiqets/destinations">
              <Button variant="outline" className="w-full justify-between" data-testid="link-destinations">
                <span className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Manage Destinations
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/admin/tiqets/integrations">
              <Button variant="outline" className="w-full justify-between" data-testid="link-integrations">
                <span className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Check Integration Status
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/admin/tiqets/configuration">
              <Button variant="outline" className="w-full justify-between" data-testid="link-configuration">
                <span className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Configuration
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Follow these steps to import attractions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4 text-sm">
              <li className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                  {stats.integration.status === "connected" ? <Check className="h-3 w-3 text-green-500" /> : "1"}
                </div>
                <div>
                  <p className="font-medium">Configure API Connection</p>
                  <p className="text-muted-foreground">Set TIQETS_API_TOKEN and TIQETS_PARTNER_ID</p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                  {stats.cities.configured > 0 ? <Check className="h-3 w-3 text-green-500" /> : "2"}
                </div>
                <div>
                  <p className="font-medium">Link Cities to Tiqets IDs</p>
                  <p className="text-muted-foreground">Use "Find ID" button for each destination</p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                  {stats.attractions.imported > 0 ? <Check className="h-3 w-3 text-green-500" /> : "3"}
                </div>
                <div>
                  <p className="font-medium">Import Attractions</p>
                  <p className="text-muted-foreground">Fetch attractions from Tiqets API</p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                  {stats.attractions.ready > 0 ? <Check className="h-3 w-3 text-green-500" /> : "4"}
                </div>
                <div>
                  <p className="font-medium">Generate Content</p>
                  <p className="text-muted-foreground">Use Freepik + AI for images and descriptions</p>
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>

      {importLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Import Log
            </CardTitle>
            <CardDescription>
              Recent import activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-md p-4 max-h-64 overflow-y-auto font-mono text-sm">
              {importLogs.map((log, index) => (
                <div key={index} className="py-0.5">
                  {log}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
