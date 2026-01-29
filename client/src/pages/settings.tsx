import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Settings as SettingsIcon,
  Database,
  Key,
  Globe,
  Bell,
  Shield,
  Loader2,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SettingsData {
  site?: {
    siteName?: string;
    siteUrl?: string;
    defaultLanguage?: string;
  };
  api?: {
    gygAffiliateId?: string;
    bookingAffiliateId?: string;
  };
  contents?: {
    autoSlug?: boolean;
    autoSave?: boolean;
    aiSuggestions?: boolean;
  };
  notifications?: {
    emailNotifications?: boolean;
    browserNotifications?: boolean;
  };
  security?: {
    sessionTimeout?: boolean;
  };
}

export default function Settings() {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<SettingsData>({
    queryKey: ["/api/settings/grouped"],
  });

  const [formData, setFormData] = useState<SettingsData>({
    site: { siteName: "TRAVI", siteUrl: "https://travi.world", defaultLanguage: "English" },
    api: { gygAffiliateId: "", bookingAffiliateId: "" },
    contents: { autoSlug: true, autoSave: true, aiSuggestions: true },
    notifications: { emailNotifications: false, browserNotifications: false },
    security: { sessionTimeout: true },
  });

  useEffect(() => {
    if (settings) {
      setFormData(prev => ({
        site: { ...prev.site, ...settings.site },
        api: { ...prev.api, ...settings.api },
        contents: { ...prev.contents, ...settings.contents },
        notifications: { ...prev.notifications, ...settings.notifications },
        security: { ...prev.security, ...settings.security },
      }));
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: SettingsData) => {
      return apiRequest("POST", "/api/settings/bulk", { settings: data });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/settings/grouped"] });
      toast({
        title: "Settings saved",
        description: "Your settings have been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const updateField = (category: keyof SettingsData, field: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value,
      },
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">Manage your CMS configuration</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Site Settings</CardTitle>
            </div>
            <CardDescription>Configure your website details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="site-name">Site Name</Label>
              <Input
                id="site-name"
                value={formData.site?.siteName || ""}
                onChange={e => updateField("site", "siteName", e.target.value)}
                placeholder="Your site name"
                data-testid="input-site-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-url">Site URL</Label>
              <Input
                id="site-url"
                value={formData.site?.siteUrl || ""}
                onChange={e => updateField("site", "siteUrl", e.target.value)}
                placeholder="https://example.com"
                data-testid="input-site-url"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="default-language">Default Language</Label>
              <Input
                id="default-language"
                value={formData.site?.defaultLanguage || ""}
                onChange={e => updateField("site", "defaultLanguage", e.target.value)}
                placeholder="English"
                data-testid="input-default-language"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">API Configuration</CardTitle>
            </div>
            <CardDescription>Manage API keys and integrations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openai-key">OpenAI API Key</Label>
              <Input
                id="openai-key"
                type="password"
                placeholder="sk-..."
                disabled
                data-testid="input-openai-key"
              />
              <p className="text-xs text-muted-foreground">
                OpenAI is configured via Replit AI Integrations
              </p>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="gyg-key">GetYourGuide Affiliate ID</Label>
              <Input
                id="gyg-key"
                value={formData.api?.gygAffiliateId || ""}
                onChange={e => updateField("api", "gygAffiliateId", e.target.value)}
                placeholder="Your affiliate ID"
                data-testid="input-gyg-key"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="booking-key">Booking.com Affiliate ID</Label>
              <Input
                id="booking-key"
                value={formData.api?.bookingAffiliateId || ""}
                onChange={e => updateField("api", "bookingAffiliateId", e.target.value)}
                placeholder="Your affiliate ID"
                data-testid="input-booking-key"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Content Settings</CardTitle>
            </div>
            <CardDescription>Configure contents creation defaults</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label>Auto-generate slugs</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically generate URL slugs from titles
                </p>
              </div>
              <Switch
                checked={formData.contents?.autoSlug ?? true}
                onCheckedChange={checked => updateField("contents", "autoSlug", checked)}
                data-testid="switch-auto-slug"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label>Auto-save drafts</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically save contents while editing
                </p>
              </div>
              <Switch
                checked={formData.contents?.autoSave ?? true}
                onCheckedChange={checked => updateField("contents", "autoSave", checked)}
                data-testid="switch-auto-save"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label>AI contents suggestions</Label>
                <p className="text-sm text-muted-foreground">Show AI-powered writing suggestions</p>
              </div>
              <Switch
                checked={formData.contents?.aiSuggestions ?? true}
                onCheckedChange={checked => updateField("contents", "aiSuggestions", checked)}
                data-testid="switch-ai-suggestions"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Notifications</CardTitle>
            </div>
            <CardDescription>Configure notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label>Email notifications</Label>
                <p className="text-sm text-muted-foreground">Receive emails for contents updates</p>
              </div>
              <Switch
                checked={formData.notifications?.emailNotifications ?? false}
                onCheckedChange={checked =>
                  updateField("notifications", "emailNotifications", checked)
                }
                data-testid="switch-email-notifications"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label>Browser notifications</Label>
                <p className="text-sm text-muted-foreground">Show browser push notifications</p>
              </div>
              <Switch
                checked={formData.notifications?.browserNotifications ?? false}
                onCheckedChange={checked =>
                  updateField("notifications", "browserNotifications", checked)
                }
                data-testid="switch-browser-notifications"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Security</CardTitle>
            </div>
            <CardDescription>Manage security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label>Two-factor authentication</Label>
                <p className="text-sm text-muted-foreground">Configure in your Profile page</p>
              </div>
              <Button variant="outline" size="sm" disabled data-testid="button-configure-2fa">
                Configure in Profile
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label>Session timeout</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically log out after inactivity
                </p>
              </div>
              <Switch
                checked={formData.security?.sessionTimeout ?? true}
                onCheckedChange={checked => updateField("security", "sessionTimeout", checked)}
                data-testid="switch-session-timeout"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            data-testid="button-save-settings"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <SettingsIcon className="h-4 w-4 mr-2" />
            )}
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
