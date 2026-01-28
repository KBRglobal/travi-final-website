import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LayoutPanelTop,
  Plus,
  Trash2,
  GripVertical,
  Edit2,
  Save,
  Lightbulb,
  ExternalLink,
  Link as LinkIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface FooterLink {
  id: string;
  sectionId: string;
  label: string;
  labelHe: string | null;
  href: string;
  icon: string | null;
  openInNewTab: boolean;
  sortOrder: number;
  isActive: boolean;
}

interface FooterSection {
  id: string;
  title: string;
  titleHe: string | null;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  links: FooterLink[];
}

export default function FooterManagerPage() {
  const { toast } = useToast();
  const [showAddSectionDialog, setShowAddSectionDialog] = useState(false);
  const [showAddLinkDialog, setShowAddLinkDialog] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [newSection, setNewSection] = useState({ title: "", titleHe: "", slug: "" });
  const [newLink, setNewLink] = useState({
    label: "",
    labelHe: "",
    href: "",
    icon: "",
    openInNewTab: false,
  });

  const { data: sections, isLoading } = useQuery<FooterSection[]>({
    queryKey: ["/api/site-config/footer"],
  });

  const createSectionMutation = useMutation({
    mutationFn: async (data: { title: string; titleHe: string; slug: string }) => {
      return apiRequest("POST", "/api/site-config/footer/sections", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-config/footer"] });
      toast({ title: "Section created" });
      setShowAddSectionDialog(false);
      setNewSection({ title: "", titleHe: "", slug: "" });
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/site-config/footer/sections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-config/footer"] });
      toast({ title: "Section deleted" });
    },
  });

  const createLinkMutation = useMutation({
    mutationFn: async (data: {
      sectionId: string;
      label: string;
      labelHe: string;
      href: string;
      icon: string;
      openInNewTab: boolean;
    }) => {
      return apiRequest("POST", "/api/site-config/footer/links", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-config/footer"] });
      toast({ title: "Link added" });
      setShowAddLinkDialog(false);
      setNewLink({ label: "", labelHe: "", href: "", icon: "", openInNewTab: false });
    },
  });

  const updateLinkMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FooterLink> }) => {
      return apiRequest("PUT", `/api/site-config/footer/links/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-config/footer"] });
    },
  });

  const deleteLinkMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/site-config/footer/links/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-config/footer"] });
      toast({ title: "Link deleted" });
    },
  });

  const handleAddSection = () => {
    if (!newSection.title || !newSection.slug) return;
    createSectionMutation.mutate(newSection);
  };

  const handleAddLink = () => {
    if (!selectedSectionId || !newLink.label || !newLink.href) return;
    createLinkMutation.mutate({ ...newLink, sectionId: selectedSectionId });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--admin-bg))]">
      <div className="border-b border-[hsl(var(--admin-border))] bg-white">
        <div className="px-6 py-4">
          <h1 className="text-xl font-semibold text-[hsl(var(--admin-text))]">Footer Manager</h1>
          <p className="text-sm text-[hsl(var(--admin-text-secondary))] mt-1">
            Configure your website's footer sections and links
          </p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="p-4 bg-muted rounded-lg border">
          <h3 className="font-medium flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            How It Works
          </h3>
          <p className="text-sm text-muted-foreground">
            Footer management lets you organize links at the bottom of your site by category. Create
            new sections and add links to each section.
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => setShowAddSectionDialog(true)} data-testid="button-add-section">
            <Plus className="h-4 w-4 mr-2" />
            Add Section
          </Button>
        </div>

        {!sections || sections.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <LayoutPanelTop className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Footer Sections</h3>
              <p className="text-muted-foreground mb-4">
                Create sections to organize your footer links
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {sections.map(section => (
              <Card key={section.id}>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                    {section.titleHe && (
                      <p className="text-sm text-muted-foreground" dir="rtl">
                        {section.titleHe}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedSectionId(section.id);
                        setShowAddLinkDialog(true);
                      }}
                      data-testid={`button-add-link-${section.slug}`}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Link
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteSectionMutation.mutate(section.id)}
                      data-testid={`button-delete-section-${section.slug}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {section.links.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No links in this section
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {section.links
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map(link => (
                          <div
                            key={link.id}
                            className="flex items-center gap-3 p-2 border rounded hover-elevate"
                          >
                            <LinkIcon className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">{link.label}</span>
                                {link.openInNewTab && (
                                  <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground truncate block">
                                {link.href}
                              </span>
                            </div>
                            <Switch
                              checked={link.isActive}
                              onCheckedChange={checked =>
                                updateLinkMutation.mutate({
                                  id: link.id,
                                  data: { isActive: checked },
                                })
                              }
                              data-testid={`switch-link-active-${link.id}`}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteLinkMutation.mutate(link.id)}
                              data-testid={`button-delete-link-${link.id}`}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={showAddSectionDialog} onOpenChange={setShowAddSectionDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Footer Section</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Title (English)</Label>
                  <Input
                    placeholder="Explore"
                    value={newSection.title}
                    onChange={e => setNewSection({ ...newSection, title: e.target.value })}
                    data-testid="input-section-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Title (Hebrew)</Label>
                  <Input
                    placeholder="Explore"
                    value={newSection.titleHe}
                    onChange={e => setNewSection({ ...newSection, titleHe: e.target.value })}
                    dir="rtl"
                    data-testid="input-section-title-he"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input
                  placeholder="explore"
                  value={newSection.slug}
                  onChange={e =>
                    setNewSection({
                      ...newSection,
                      slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                    })
                  }
                  data-testid="input-section-slug"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddSectionDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddSection}
                disabled={createSectionMutation.isPending}
                data-testid="button-save-section"
              >
                <Save className="h-4 w-4 mr-2" />
                Create Section
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showAddLinkDialog} onOpenChange={setShowAddLinkDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Footer Link</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Label (English)</Label>
                  <Input
                    placeholder="Attractions"
                    value={newLink.label}
                    onChange={e => setNewLink({ ...newLink, label: e.target.value })}
                    data-testid="input-link-label"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Label (Hebrew)</Label>
                  <Input
                    placeholder="Attractions"
                    value={newLink.labelHe}
                    onChange={e => setNewLink({ ...newLink, labelHe: e.target.value })}
                    dir="rtl"
                    data-testid="input-link-label-he"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>URL</Label>
                <Input
                  placeholder="/attractions"
                  value={newLink.href}
                  onChange={e => setNewLink({ ...newLink, href: e.target.value })}
                  data-testid="input-link-href"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={newLink.openInNewTab}
                  onCheckedChange={checked => setNewLink({ ...newLink, openInNewTab: checked })}
                  data-testid="switch-link-new-tab"
                />
                <Label>Open in new tab</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddLinkDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddLink}
                disabled={createLinkMutation.isPending}
                data-testid="button-save-link"
              >
                <Save className="h-4 w-4 mr-2" />
                Add Link
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
