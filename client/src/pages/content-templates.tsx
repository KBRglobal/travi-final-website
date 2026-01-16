import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  LayoutTemplate,
  Plus,
  Search,
  Copy,
  MoreVertical,
  Edit2,
  Trash2,
  MapPin,
  Building2,
  FileText,
  Utensils,
  CalendarDays,
  Route,
  Loader2,
  Eye,
  FileCheck,
} from "lucide-react";

// Content type configuration
const contentTypes = [
  { value: "attraction", label: "Attraction", icon: MapPin, color: "text-blue-600" },
  { value: "hotel", label: "Hotel", icon: Building2, color: "text-[#6443F4]" },
  { value: "article", label: "Article", icon: FileText, color: "text-green-600" },
  { value: "dining", label: "Restaurant", icon: Utensils, color: "text-orange-600" },
  { value: "event", label: "Event", icon: CalendarDays, color: "text-[#6443F4]" },
  { value: "itinerary", label: "Itinerary", icon: Route, color: "text-cyan-600" },
];

// Default templates with pre-filled structures
const defaultTemplates = [
  {
    id: "attraction-basic",
    name: "Basic Attraction",
    description: "Standard attraction page with key info and highlights",
    type: "attraction",
    structure: {
      sections: ["Overview", "Key Highlights", "Practical Information", "Tips & Recommendations"],
      blocks: [
        { type: "hero", placeholder: "Main attraction image" },
        { type: "intro", placeholder: "Brief introduction (2-3 sentences)" },
        { type: "highlights", placeholder: "3-5 key highlights" },
        { type: "details", placeholder: "Opening hours, tickets, location" },
        { type: "tips", placeholder: "Insider tips for visitors" },
      ],
    },
    isDefault: true,
  },
  {
    id: "hotel-luxury",
    name: "Luxury Hotel",
    description: "Premium hotel listing with amenities and experiences",
    type: "hotel",
    structure: {
      sections: ["About", "Rooms & Suites", "Dining", "Amenities", "Location"],
      blocks: [
        { type: "hero", placeholder: "Hotel exterior/lobby image" },
        { type: "intro", placeholder: "Hotel introduction and positioning" },
        { type: "rooms", placeholder: "Room types and rates" },
        { type: "dining", placeholder: "Restaurant and bar options" },
        { type: "amenities", placeholder: "Pool, spa, gym, etc." },
        { type: "location", placeholder: "Area guide and transportation" },
      ],
    },
    isDefault: true,
  },
  {
    id: "article-listicle",
    name: "Top 10 Listicle",
    description: "Engaging list-style article format",
    type: "article",
    structure: {
      sections: ["Introduction", "The List", "Conclusion"],
      blocks: [
        { type: "intro", placeholder: "Hook and context setting" },
        { type: "list", placeholder: "10 items with descriptions" },
        { type: "conclusion", placeholder: "Summary and call to action" },
      ],
    },
    isDefault: true,
  },
  {
    id: "dining-restaurant",
    name: "Restaurant Review",
    description: "Comprehensive dining guide with menu and atmosphere",
    type: "dining",
    structure: {
      sections: ["Overview", "Menu Highlights", "Ambiance", "Practical Info"],
      blocks: [
        { type: "hero", placeholder: "Restaurant interior/signature dish" },
        { type: "intro", placeholder: "Cuisine and concept" },
        { type: "menu", placeholder: "Must-try dishes" },
        { type: "ambiance", placeholder: "Atmosphere and vibe" },
        { type: "info", placeholder: "Reservations, dress code, prices" },
      ],
    },
    isDefault: true,
  },
];

interface Template {
  id: string;
  name: string;
  description: string;
  type: string;
  structure: {
    sections?: string[];
    blocks?: Array<{ type: string; placeholder: string }>;
    customFields?: Record<string, any>;
  };
  isDefault?: boolean;
  createdAt?: string;
  usageCount?: number;
}

export default function ContentTemplatesPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    type: "attraction",
    structure: { sections: [""], blocks: [{ type: "text", placeholder: "" }] },
  });

  // Fetch templates from API
  const { data: apiTemplates = [], isLoading } = useQuery<Template[]>({
    queryKey: ["/api/contents-templates"],
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (template: Omit<Template, "id">) => {
      return apiRequest("/api/contents-templates", {
        method: "POST",
        body: JSON.stringify({
          name: template.name,
          description: template.description,
          contentType: template.type,
          blocks: template.structure.blocks || [],
          seoDefaults: {},
          isPublic: true,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contents-templates"] });
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/contents-templates/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contents-templates"] });
    },
  });

  // Transform API templates to match our interface
  const customTemplates: Template[] = apiTemplates.map((t: any) => ({
    id: t.id,
    name: t.name,
    description: t.description || "",
    type: t.contentType,
    structure: {
      blocks: t.blocks || [],
      sections: t.blocks?.map((b: any) => b.type) || [],
    },
    createdAt: t.createdAt,
    usageCount: t.usageCount || 0,
    isDefault: false,
  }));

  // All templates (default + custom from API)
  const allTemplates = [...defaultTemplates, ...customTemplates];

  // Filter templates
  const filteredTemplates = allTemplates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || template.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Create new template
  const handleCreateTemplate = async () => {
    try {
      await createTemplateMutation.mutateAsync({
        name: newTemplate.name,
        description: newTemplate.description,
        type: newTemplate.type,
        structure: newTemplate.structure,
      });

      setShowCreateDialog(false);
      setNewTemplate({
        name: "",
        description: "",
        type: "attraction",
        structure: { sections: [""], blocks: [{ type: "text", placeholder: "" }] },
      });

      toast({
        title: "Template created",
        description: `"${newTemplate.name}" has been saved to the database.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create template. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Delete template
  const handleDeleteTemplate = async (id: string) => {
    try {
      await deleteTemplateMutation.mutateAsync(id);
      toast({
        title: "Template deleted",
        description: "The template has been removed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete template. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Duplicate template
  const handleDuplicateTemplate = async (template: Template) => {
    try {
      await createTemplateMutation.mutateAsync({
        name: `${template.name} (Copy)`,
        description: template.description,
        type: template.type,
        structure: template.structure,
      });

      toast({
        title: "Template duplicated",
        description: `"${template.name} (Copy)" has been created.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to duplicate template. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Use template (navigate to editor with template)
  const handleUseTemplate = (template: Template) => {
    // Store selected template for the editor to use
    sessionStorage.setItem("selected-template", JSON.stringify(template));
    // Navigate to new contents of that type
    const paths: Record<string, string> = {
      attraction: "/admin/attractions/new",
      hotel: "/admin/hotels/new",
      article: "/admin/articles/new",
      dining: "/admin/dining/new",
      event: "/admin/events/new",
      itinerary: "/admin/itineraries/new",
    };
    window.location.href = paths[template.type] || "/admin";
  };

  const getTypeConfig = (type: string) => {
    return contentTypes.find((t) => t.value === type) || contentTypes[0];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <LayoutTemplate className="h-6 w-6" />
            Content Templates
          </h1>
          <p className="text-muted-foreground">
            Reusable contents structures for faster contents creation
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
              <DialogDescription>
                Define a reusable structure for your contents
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input
                  placeholder="e.g., Detailed Attraction Guide"
                  value={newTemplate.name}
                  onChange={(e) =>
                    setNewTemplate({ ...newTemplate, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Describe when to use this template..."
                  value={newTemplate.description}
                  onChange={(e) =>
                    setNewTemplate({ ...newTemplate, description: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Content Type</Label>
                <Select
                  value={newTemplate.type}
                  onValueChange={(v) => setNewTemplate({ ...newTemplate, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {contentTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <span className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${type.color}`} />
                            {type.label}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sections (one per line)</Label>
                <Textarea
                  placeholder="Overview&#10;Highlights&#10;Practical Info"
                  value={newTemplate.structure.sections?.join("\n") || ""}
                  onChange={(e) =>
                    setNewTemplate({
                      ...newTemplate,
                      structure: {
                        ...newTemplate.structure,
                        sections: e.target.value.split("\n").filter(Boolean),
                      },
                    })
                  }
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateTemplate}
                disabled={!newTemplate.name || createTemplateMutation.isPending}
              >
                {createTemplateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {contentTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <EmptyState
          icon={LayoutTemplate}
          title="No templates found"
          description={
            searchQuery || typeFilter !== "all"
              ? "Try adjusting your search or filters"
              : "Create your first template to get started"
          }
          actionLabel={searchQuery || typeFilter !== "all" ? "Clear filters" : "Create Template"}
          onAction={() => {
            if (searchQuery || typeFilter !== "all") {
              setSearchQuery("");
              setTypeFilter("all");
            } else {
              setShowCreateDialog(true);
            }
          }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => {
            const typeConfig = getTypeConfig(template.type);
            const Icon = typeConfig.icon;

            return (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg bg-muted`}>
                        <Icon className={`h-4 w-4 ${typeConfig.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {typeConfig.label}
                          </Badge>
                          {template.isDefault && (
                            <Badge variant="secondary" className="text-xs">
                              Default
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleUseTemplate(template)}>
                          <FileCheck className="h-4 w-4 mr-2" />
                          Use Template
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicateTemplate(template)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        {!template.isDefault && (
                          <DropdownMenuItem
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="line-clamp-2 mb-3">
                    {template.description}
                  </CardDescription>

                  {/* Structure Preview */}
                  {template.structure.sections && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Sections: </span>
                      {template.structure.sections.slice(0, 3).join(", ")}
                      {template.structure.sections.length > 3 &&
                        ` +${template.structure.sections.length - 3} more`}
                    </div>
                  )}

                  <Button
                    className="w-full mt-4"
                    variant="outline"
                    onClick={() => handleUseTemplate(template)}
                  >
                    <FileCheck className="h-4 w-4 mr-2" />
                    Use This Template
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
