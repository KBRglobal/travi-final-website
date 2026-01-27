import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { SettingsLayout, AdminSection } from "@/components/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Settings,
  Globe,
  Share2,
  Mail,
  Code,
  Shield,
  Lightbulb,
  Save,
  Plus,
  Trash2,
  Image,
  Link,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Linkedin,
  Bot,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SocialLink {
  platform: string;
  url: string;
  icon: string;
  isActive: boolean;
}

interface SiteSettingsData {
  siteName?: string;
  siteTagline?: string;
  brandDescription?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  defaultMetaTitle?: string;
  defaultMetaDescription?: string;
  googleAnalyticsId?: string;
  customHeadScripts?: string;
  customFooterScripts?: string;
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  socialLinks?: SocialLink[];
  botBlockingDisabled?: boolean;
}

const navItems = [
  { id: "branding", label: "Branding", icon: Image },
  { id: "seo", label: "SEO", icon: Globe },
  { id: "social", label: "Social", icon: Share2 },
  { id: "contact", label: "Contact", icon: Mail },
  { id: "advanced", label: "Advanced", icon: Code },
];

export default function SiteSettingsPage() {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState("branding");

  const { data: settings, isLoading } = useQuery<SiteSettingsData>({
    queryKey: ["/api/site-config/settings"],
  });

  const [formData, setFormData] = useState({
    siteName: "",
    siteTagline: "",
    brandDescription: "",
    contactEmail: "",
    contactPhone: "",
    contactAddress: "",
    defaultMetaTitle: "",
    defaultMetaDescription: "",
    googleAnalyticsId: "",
    customHeadScripts: "",
    customFooterScripts: "",
    maintenanceMode: false,
    maintenanceMessage: "",
    socialLinks: [] as SocialLink[],
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        siteName: settings.siteName || "",
        siteTagline: settings.siteTagline || "",
        brandDescription: settings.brandDescription || "",
        contactEmail: settings.contactEmail || "",
        contactPhone: settings.contactPhone || "",
        contactAddress: settings.contactAddress || "",
        defaultMetaTitle: settings.defaultMetaTitle || "",
        defaultMetaDescription: settings.defaultMetaDescription || "",
        googleAnalyticsId: settings.googleAnalyticsId || "",
        customHeadScripts: settings.customHeadScripts || "",
        customFooterScripts: settings.customFooterScripts || "",
        maintenanceMode: settings.maintenanceMode || false,
        maintenanceMessage: settings.maintenanceMessage || "",
        socialLinks: settings.socialLinks || [],
      });
    }
  }, [settings]);

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      return apiRequest("PUT", `/api/site-config/settings/${key}`, { value, category: "site" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-config/settings"] });
      toast({ title: "Setting saved", description: "Your changes have been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save setting.", variant: "destructive" });
    },
  });

  const handleSave = (key: string, value: unknown) => {
    updateSettingMutation.mutate({ key, value });
  };

  const addSocialLink = () => {
    const newLinks = [...formData.socialLinks, { platform: "", url: "", icon: "", isActive: true }];
    setFormData({ ...formData, socialLinks: newLinks });
  };

  const removeSocialLink = (index: number) => {
    const newLinks = formData.socialLinks.filter((_, i) => i !== index);
    setFormData({ ...formData, socialLinks: newLinks });
  };

  const updateSocialLink = (index: number, field: keyof SocialLink, value: string | boolean) => {
    const newLinks = [...formData.socialLinks];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setFormData({ ...formData, socialLinks: newLinks });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const navigation = (
    <div className="space-y-1">
      {navItems.map(item => (
        <Button
          key={item.id}
          variant={activeSection === item.id ? "secondary" : "ghost"}
          className={cn("w-full justify-start gap-2", activeSection === item.id && "bg-muted")}
          onClick={() => setActiveSection(item.id)}
          data-testid={`nav-${item.id}`}
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </Button>
      ))}
    </div>
  );

  return (
    <SettingsLayout
      title="Site Settings"
      description="Configure your website's branding, SEO defaults, and global settings"
      navigation={navigation}
    >
      <div className="space-y-6">
        <div className="p-4 bg-muted rounded-lg border">
          <h3 className="font-medium flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            How It Works
          </h3>
          <p className="text-sm text-muted-foreground">
            Site settings let you control all aspects of your brand: site name, description, logo,
            social media links, default SEO settings, and custom scripts. Changes apply site-wide.
          </p>
        </div>

        {activeSection === "branding" && (
          <AdminSection
            title="Brand Identity"
            description="Configure your site's name, tagline, and description"
          >
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="siteName">Site Name</Label>
                    <Input
                      id="siteName"
                      placeholder="Travi"
                      defaultValue={settings?.siteName || ""}
                      onBlur={e => handleSave("siteName", e.target.value)}
                      data-testid="input-site-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="siteTagline">Tagline</Label>
                    <Input
                      id="siteTagline"
                      placeholder="Your Dubai Travel Guide"
                      defaultValue={settings?.siteTagline || ""}
                      onBlur={e => handleSave("siteTagline", e.target.value)}
                      data-testid="input-site-tagline"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brandDescription">Brand Description</Label>
                  <Textarea
                    id="brandDescription"
                    placeholder="Your friendly guide to Dubai's wonders..."
                    defaultValue={settings?.brandDescription || ""}
                    onBlur={e => handleSave("brandDescription", e.target.value)}
                    rows={3}
                    data-testid="input-brand-description"
                  />
                  <p className="text-xs text-muted-foreground">
                    This text appears in the footer and about sections
                  </p>
                </div>
              </CardContent>
            </Card>
          </AdminSection>
        )}

        {activeSection === "seo" && (
          <AdminSection
            title="Default SEO Settings"
            description="Configure default meta tags for your site"
          >
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultMetaTitle">Default Meta Title</Label>
                  <Input
                    id="defaultMetaTitle"
                    placeholder="Travi - Discover Dubai Like a Local"
                    defaultValue={settings?.defaultMetaTitle || ""}
                    onBlur={e => handleSave("defaultMetaTitle", e.target.value)}
                    data-testid="input-default-meta-title"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used when pages don't have their own meta title (50-60 characters recommended)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultMetaDescription">Default Meta Description</Label>
                  <Textarea
                    id="defaultMetaDescription"
                    placeholder="Discover Dubai's best attractions, hotels, restaurants, and hidden gems..."
                    defaultValue={settings?.defaultMetaDescription || ""}
                    onBlur={e => handleSave("defaultMetaDescription", e.target.value)}
                    rows={2}
                    data-testid="input-default-meta-description"
                  />
                  <p className="text-xs text-muted-foreground">
                    150-160 characters recommended for optimal SERP display
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="googleAnalyticsId">Google Analytics ID</Label>
                  <Input
                    id="googleAnalyticsId"
                    placeholder="G-XXXXXXXXXX"
                    defaultValue={settings?.googleAnalyticsId || ""}
                    onBlur={e => handleSave("googleAnalyticsId", e.target.value)}
                    data-testid="input-ga-id"
                  />
                </div>
              </CardContent>
            </Card>
          </AdminSection>
        )}

        {activeSection === "social" && (
          <AdminSection
            title="Social Media Links"
            description="Manage your social media profiles"
            actions={
              <Button onClick={addSocialLink} size="sm" data-testid="button-add-social">
                <Plus className="h-4 w-4 mr-2" />
                Add Link
              </Button>
            }
          >
            <Card>
              <CardContent className="pt-6 space-y-4">
                {formData.socialLinks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Share2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No social media links configured</p>
                    <p className="text-sm">Click "Add Link" to add your first social profile</p>
                  </div>
                ) : (
                  formData.socialLinks.map((link, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex-1 grid gap-4 md:grid-cols-3">
                        <div className="space-y-1">
                          <Label>Platform</Label>
                          <Input
                            placeholder="Instagram"
                            value={link.platform}
                            onChange={e => updateSocialLink(index, "platform", e.target.value)}
                            data-testid={`input-social-platform-${index}`}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>URL</Label>
                          <Input
                            placeholder="https://instagram.com/yourhandle"
                            value={link.url}
                            onChange={e => updateSocialLink(index, "url", e.target.value)}
                            data-testid={`input-social-url-${index}`}
                          />
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={link.isActive}
                              onCheckedChange={checked =>
                                updateSocialLink(index, "isActive", checked)
                              }
                              data-testid={`switch-social-active-${index}`}
                            />
                            <Label>Active</Label>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeSocialLink(index)}
                            data-testid={`button-remove-social-${index}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {formData.socialLinks.length > 0 && (
                  <Button
                    onClick={() => handleSave("socialLinks", formData.socialLinks)}
                    className="w-full"
                    data-testid="button-save-social"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Social Links
                  </Button>
                )}
              </CardContent>
            </Card>
          </AdminSection>
        )}

        {activeSection === "contact" && (
          <AdminSection title="Contact Information" description="Your business contact details">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">Contact Email</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      placeholder="hello@travi.com"
                      defaultValue={settings?.contactEmail || ""}
                      onBlur={e => handleSave("contactEmail", e.target.value)}
                      data-testid="input-contact-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPhone">Phone Number</Label>
                    <Input
                      id="contactPhone"
                      placeholder="+971 4 XXX XXXX"
                      defaultValue={settings?.contactPhone || ""}
                      onBlur={e => handleSave("contactPhone", e.target.value)}
                      data-testid="input-contact-phone"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactAddress">Address</Label>
                  <Textarea
                    id="contactAddress"
                    placeholder="Dubai, United Arab Emirates"
                    defaultValue={settings?.contactAddress || ""}
                    onBlur={e => handleSave("contactAddress", e.target.value)}
                    rows={2}
                    data-testid="input-contact-address"
                  />
                </div>
              </CardContent>
            </Card>
          </AdminSection>
        )}

        {activeSection === "advanced" && (
          <div className="space-y-6">
            <AdminSection title="Custom Scripts" description="Add custom scripts to your site">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="customHeadScripts">Head Scripts</Label>
                    <Textarea
                      id="customHeadScripts"
                      placeholder="<!-- Custom scripts to inject in <head> -->"
                      defaultValue={settings?.customHeadScripts || ""}
                      onBlur={e => handleSave("customHeadScripts", e.target.value)}
                      rows={4}
                      className="font-mono text-sm"
                      data-testid="input-head-scripts"
                    />
                    <p className="text-xs text-muted-foreground">
                      Scripts placed in the &lt;head&gt; section (analytics, tracking pixels, etc.)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customFooterScripts">Footer Scripts</Label>
                    <Textarea
                      id="customFooterScripts"
                      placeholder="<!-- Custom scripts to inject before </body> -->"
                      defaultValue={settings?.customFooterScripts || ""}
                      onBlur={e => handleSave("customFooterScripts", e.target.value)}
                      rows={4}
                      className="font-mono text-sm"
                      data-testid="input-footer-scripts"
                    />
                  </div>
                </CardContent>
              </Card>
            </AdminSection>

            <AdminSection title="Maintenance Mode" description="Control site availability">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label>Enable Maintenance Mode</Label>
                      <p className="text-xs text-muted-foreground">
                        When enabled, visitors will see a maintenance page
                      </p>
                    </div>
                    <Switch
                      checked={settings?.maintenanceMode || false}
                      onCheckedChange={checked => handleSave("maintenanceMode", checked)}
                      data-testid="switch-maintenance-mode"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maintenanceMessage">Maintenance Message</Label>
                    <Textarea
                      id="maintenanceMessage"
                      placeholder="We're currently performing scheduled maintenance. Please check back soon!"
                      defaultValue={settings?.maintenanceMessage || ""}
                      onBlur={e => handleSave("maintenanceMessage", e.target.value)}
                      rows={2}
                      data-testid="input-maintenance-message"
                    />
                  </div>
                </CardContent>
              </Card>
            </AdminSection>

            <AdminSection
              title="Bot & Crawler Access"
              description="Control bot access to your site"
            >
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-green-500" />
                        Disable Bot Blocking
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        When ON, all bots (including verification bots like Trustpilot) can access
                        the site freely. Use this when performing domain verification or testing.
                      </p>
                    </div>
                    <Switch
                      checked={settings?.botBlockingDisabled || false}
                      onCheckedChange={checked => handleSave("botBlockingDisabled", checked)}
                      data-testid="switch-bot-blocking-disabled"
                    />
                  </div>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="text-sm font-medium mb-2">Current Status:</p>
                    <Badge variant={settings?.botBlockingDisabled ? "default" : "secondary"}>
                      {settings?.botBlockingDisabled
                        ? "All Bots Allowed"
                        : "Only Approved Bots Allowed"}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-2">
                      Approved bots include: Google, Bing, ChatGPT, Perplexity, Claude, Facebook,
                      Twitter, LinkedIn, Trustpilot, and more.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </AdminSection>
          </div>
        )}
      </div>
    </SettingsLayout>
  );
}
