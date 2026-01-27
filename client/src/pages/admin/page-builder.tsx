import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Lightbulb,
  Plus,
  Trash2,
  Edit2,
  Save,
  Eye,
  Globe,
  ArrowLeft,
  GripVertical,
  FileText,
  Layout,
  LayoutGrid,
  Layers,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface EditablePage {
  id: string;
  slug: string;
  pageType: string;
  title: string;
  titleHe: string | null;
  metaTitle: string | null;
  metaTitleHe: string | null;
  metaDescription: string | null;
  metaDescriptionHe: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastEditedBy: string | null;
}

interface PageSection {
  id: string;
  pageId: string;
  sectionType: string;
  sectionKey: string | null;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  buttonText: string | null;
  buttonLink: string | null;
  titleHe: string | null;
  subtitleHe: string | null;
  descriptionHe: string | null;
  buttonTextHe: string | null;
  backgroundImage: string | null;
  backgroundVideo: string | null;
  images: string[];
  data: Record<string, unknown>;
  dataHe: Record<string, unknown>;
  backgroundColor: string | null;
  textColor: string | null;
  customCss: string | null;
  animation: string | null;
  sortOrder: number;
  isVisible: boolean;
  showOnMobile: boolean;
  showOnDesktop: boolean;
  createdAt: string;
  updatedAt: string;
  lastEditedBy: string | null;
}

const PAGE_TYPES = [
  { value: "home", label: "Home Page" },
  { value: "category", label: "Category Page" },
  { value: "landing", label: "Landing Page" },
  { value: "static", label: "Static Page" },
];

const SECTION_TYPES = [
  { value: "hero", label: "Hero" },
  { value: "intro_text", label: "Introduction" },
  { value: "highlight_grid", label: "Highlight Grid" },
  { value: "filter_bar", label: "Filter Bar" },
  { value: "content_grid", label: "Content Grid" },
  { value: "cta", label: "Call to Action" },
  { value: "faq", label: "FAQ" },
  { value: "testimonial", label: "Testimonials" },
  { value: "gallery", label: "Gallery" },
  { value: "stats", label: "Statistics" },
  { value: "features", label: "Features" },
  { value: "text_image", label: "Text & Image" },
  { value: "video", label: "Video" },
  { value: "newsletter", label: "Newsletter" },
  { value: "custom", label: "Custom" },
];

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function SortableSectionItem({
  section,
  onEdit,
  onDelete,
  onToggleVisibility,
}: {
  section: PageSection;
  onEdit: (section: PageSection) => void;
  onDelete: (section: PageSection) => void;
  onToggleVisibility: (section: PageSection) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const sectionTypeInfo = SECTION_TYPES.find(t => t.value === section.sectionType);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 border rounded-md bg-background"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground"
      >
        <GripVertical className="h-5 w-5" />
      </div>
      <Badge variant="secondary" className="shrink-0">
        {sectionTypeInfo?.label || section.sectionType}
      </Badge>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {section.title || section.sectionKey || "Untitled Section"}
        </p>
        {section.titleHe && (
          <p className="text-xs text-muted-foreground truncate" dir="rtl">
            {section.titleHe}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Switch
          checked={section.isVisible}
          onCheckedChange={() => onToggleVisibility(section)}
          data-testid={`switch-visibility-${section.id}`}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(section)}
          data-testid={`button-edit-section-${section.id}`}
        >
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(section)}
          data-testid={`button-delete-section-${section.id}`}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

export default function PageBuilderPage() {
  const { toast } = useToast();
  const [selectedPage, setSelectedPage] = useState<EditablePage | null>(null);
  const [showCreatePageDialog, setShowCreatePageDialog] = useState(false);
  const [showCreateSectionDialog, setShowCreateSectionDialog] = useState(false);
  const [editingSection, setEditingSection] = useState<PageSection | null>(null);
  const [deletingPage, setDeletingPage] = useState<EditablePage | null>(null);
  const [deletingSection, setDeletingSection] = useState<PageSection | null>(null);
  const [newPage, setNewPage] = useState({
    title: "",
    titleHe: "",
    slug: "",
    pageType: "landing",
  });
  const [newSectionType, setNewSectionType] = useState("hero");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: pages, isLoading: pagesLoading } = useQuery<EditablePage[]>({
    queryKey: ["/api/page-builder/pages"],
  });

  const { data: pageWithSections, isLoading: sectionsLoading } = useQuery<
    EditablePage & { sections: PageSection[] }
  >({
    queryKey: ["/api/page-builder/pages", selectedPage?.slug],
    enabled: !!selectedPage?.slug,
  });

  const sections = pageWithSections?.sections || [];

  const createPageMutation = useMutation({
    mutationFn: async (data: typeof newPage) => {
      return apiRequest("POST", "/api/page-builder/pages", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/page-builder/pages"] });
      toast({ title: "Page created successfully" });
      setShowCreatePageDialog(false);
      setNewPage({ title: "", titleHe: "", slug: "", pageType: "landing" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updatePageMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EditablePage> }) => {
      return apiRequest("PUT", `/api/page-builder/pages/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/page-builder/pages"] });
      toast({ title: "Page updated" });
    },
  });

  const deletePageMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/page-builder/pages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/page-builder/pages"] });
      toast({ title: "Page deleted" });
      setDeletingPage(null);
      if (selectedPage?.id === deletingPage?.id) {
        setSelectedPage(null);
      }
    },
  });

  const createSectionMutation = useMutation({
    mutationFn: async (data: Partial<PageSection>) => {
      return apiRequest("POST", "/api/page-builder/sections", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/page-builder/pages", selectedPage?.slug] });
      toast({ title: "Section created" });
      setShowCreateSectionDialog(false);
    },
  });

  const updateSectionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PageSection> }) => {
      return apiRequest("PUT", `/api/page-builder/sections/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/page-builder/pages", selectedPage?.slug] });
      toast({ title: "Section updated" });
      setEditingSection(null);
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/page-builder/sections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/page-builder/pages", selectedPage?.slug] });
      toast({ title: "Section deleted" });
      setDeletingSection(null);
    },
  });

  const reorderSectionsMutation = useMutation({
    mutationFn: async (sectionUpdates: { id: string; sortOrder: number }[]) => {
      return apiRequest("PUT", "/api/page-builder/sections/reorder", { sections: sectionUpdates });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/page-builder/pages", selectedPage?.slug] });
    },
  });

  useEffect(() => {
    if (newPage.title && !newPage.slug) {
      setNewPage(prev => ({ ...prev, slug: generateSlug(prev.title) }));
    }
  }, [newPage.title]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex(s => s.id === active.id);
    const newIndex = sections.findIndex(s => s.id === over.id);

    const reordered = arrayMove(sections, oldIndex, newIndex);
    const updates = reordered.map((s, i) => ({ id: s.id, sortOrder: i }));
    reorderSectionsMutation.mutate(updates);
  };

  const handleToggleVisibility = (section: PageSection) => {
    updateSectionMutation.mutate({
      id: section.id,
      data: { isVisible: !section.isVisible },
    });
  };

  const handleCreateSection = () => {
    if (!selectedPage) return;
    createSectionMutation.mutate({
      pageId: selectedPage.id,
      sectionType: newSectionType,
      sortOrder: sections.length,
      isVisible: true,
    });
  };

  if (pagesLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  if (selectedPage) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setSelectedPage(null)} data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Pages
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Layers className="h-8 w-8 text-primary" />
            {selectedPage.title}
          </h1>
          <p className="text-muted-foreground mt-1">Manage sections for /{selectedPage.slug}</p>
        </div>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Badge variant={selectedPage.isPublished ? "default" : "secondary"}>
              {selectedPage.isPublished ? "Published" : "Draft"}
            </Badge>
            <Badge variant="outline">{selectedPage.pageType}</Badge>
          </div>
          <Button onClick={() => setShowCreateSectionDialog(true)} data-testid="button-add-section">
            <Plus className="h-4 w-4 mr-2" />
            Add Section
          </Button>
        </div>

        {sectionsLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : sections.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <LayoutGrid className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Sections Yet</h3>
              <p className="text-muted-foreground mb-4">Add sections to build your page layout</p>
              <Button onClick={() => setShowCreateSectionDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Section
              </Button>
            </CardContent>
          </Card>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {sections.map(section => (
                  <SortableSectionItem
                    key={section.id}
                    section={section}
                    onEdit={setEditingSection}
                    onDelete={setDeletingSection}
                    onToggleVisibility={handleToggleVisibility}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <Dialog open={showCreateSectionDialog} onOpenChange={setShowCreateSectionDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Section</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Section Type</Label>
                <Select value={newSectionType} onValueChange={setNewSectionType}>
                  <SelectTrigger data-testid="select-section-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTION_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateSectionDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateSection}
                disabled={createSectionMutation.isPending}
                data-testid="button-create-section"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Section
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingSection} onOpenChange={() => setEditingSection(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Section</DialogTitle>
            </DialogHeader>
            {editingSection && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Section Type</Label>
                  <Input value={editingSection.sectionType} disabled />
                </div>

                <Tabs defaultValue="en">
                  <TabsList>
                    <TabsTrigger value="en">English</TabsTrigger>
                    <TabsTrigger value="he">Hebrew</TabsTrigger>
                  </TabsList>
                  <TabsContent value="en" className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input
                        value={editingSection.title || ""}
                        onChange={e =>
                          setEditingSection({ ...editingSection, title: e.target.value })
                        }
                        data-testid="input-section-title-en"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Subtitle</Label>
                      <Input
                        value={editingSection.subtitle || ""}
                        onChange={e =>
                          setEditingSection({ ...editingSection, subtitle: e.target.value })
                        }
                        data-testid="input-section-subtitle-en"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={editingSection.description || ""}
                        onChange={e =>
                          setEditingSection({ ...editingSection, description: e.target.value })
                        }
                        rows={3}
                        data-testid="input-section-description-en"
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="he" className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Title (Hebrew)</Label>
                      <Input
                        value={editingSection.titleHe || ""}
                        onChange={e =>
                          setEditingSection({ ...editingSection, titleHe: e.target.value })
                        }
                        dir="rtl"
                        data-testid="input-section-title-he"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Subtitle (Hebrew)</Label>
                      <Input
                        value={editingSection.subtitleHe || ""}
                        onChange={e =>
                          setEditingSection({ ...editingSection, subtitleHe: e.target.value })
                        }
                        dir="rtl"
                        data-testid="input-section-subtitle-he"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description (Hebrew)</Label>
                      <Textarea
                        value={editingSection.descriptionHe || ""}
                        onChange={e =>
                          setEditingSection({ ...editingSection, descriptionHe: e.target.value })
                        }
                        rows={3}
                        dir="rtl"
                        data-testid="input-section-description-he"
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="space-y-2">
                  <Label>Background Image URL</Label>
                  <Input
                    value={editingSection.backgroundImage || ""}
                    onChange={e =>
                      setEditingSection({ ...editingSection, backgroundImage: e.target.value })
                    }
                    placeholder="https://..."
                    data-testid="input-section-bg-image"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Button Text</Label>
                    <Input
                      value={editingSection.buttonText || ""}
                      onChange={e =>
                        setEditingSection({ ...editingSection, buttonText: e.target.value })
                      }
                      data-testid="input-section-button-text"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Button Link</Label>
                    <Input
                      value={editingSection.buttonLink || ""}
                      onChange={e =>
                        setEditingSection({ ...editingSection, buttonLink: e.target.value })
                      }
                      data-testid="input-section-button-link"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editingSection.isVisible}
                      onCheckedChange={checked =>
                        setEditingSection({ ...editingSection, isVisible: checked })
                      }
                    />
                    <Label>Visible</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editingSection.showOnMobile}
                      onCheckedChange={checked =>
                        setEditingSection({ ...editingSection, showOnMobile: checked })
                      }
                    />
                    <Label>Show on Mobile</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editingSection.showOnDesktop}
                      onCheckedChange={checked =>
                        setEditingSection({ ...editingSection, showOnDesktop: checked })
                      }
                    />
                    <Label>Show on Desktop</Label>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingSection(null)}>
                Cancel
              </Button>
              <Button
                onClick={() =>
                  editingSection &&
                  updateSectionMutation.mutate({ id: editingSection.id, data: editingSection })
                }
                disabled={updateSectionMutation.isPending}
                data-testid="button-save-section"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deletingSection} onOpenChange={() => setDeletingSection(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Section?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The section will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingSection && deleteSectionMutation.mutate(deletingSection.id)}
                className="bg-destructive text-destructive-foreground"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Layout className="h-8 w-8 text-primary" />
          Page Builder
        </h1>
        <p className="text-muted-foreground mt-1">
          Create and manage editable pages with customizable sections
        </p>

        <div className="mt-4 p-4 bg-muted rounded-lg border">
          <h3 className="font-medium flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            How It Works
          </h3>
          <p className="text-sm text-muted-foreground">
            The Page Builder lets you create and edit dynamic pages with customizable sections.
            Click on a page to manage its sections - drag and drop to reorder, add new sections, and
            edit content.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setShowCreatePageDialog(true)} data-testid="button-create-page">
          <Plus className="h-4 w-4 mr-2" />
          Create Page
        </Button>
      </div>

      {!pages || pages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Pages Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first editable page to get started
            </p>
            <Button onClick={() => setShowCreatePageDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Page
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map(page => (
                <TableRow key={page.id} data-testid={`row-page-${page.slug}`}>
                  <TableCell className="font-medium">
                    <div>
                      <p>{page.title}</p>
                      {page.titleHe && (
                        <p className="text-xs text-muted-foreground" dir="rtl">
                          {page.titleHe}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-sm">/{page.slug}</code>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{page.pageType}</Badge>
                  </TableCell>
                  <TableCell>
                    {page.isPublished ? (
                      <Badge className="bg-green-500/10 text-green-600">Published</Badge>
                    ) : (
                      <Badge variant="secondary">Draft</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(page.updatedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedPage(page)}
                        data-testid={`button-edit-page-${page.slug}`}
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={`/${page.slug}`} target="_blank" rel="noopener noreferrer">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingPage(page)}
                        data-testid={`button-delete-page-${page.slug}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={showCreatePageDialog} onOpenChange={setShowCreatePageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Page</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="My New Page"
                value={newPage.title}
                onChange={e => setNewPage({ ...newPage, title: e.target.value })}
                data-testid="input-page-title"
              />
            </div>
            <div className="space-y-2">
              <Label>Title (Hebrew)</Label>
              <Input
                placeholder="My New Page"
                value={newPage.titleHe}
                onChange={e => setNewPage({ ...newPage, titleHe: e.target.value })}
                dir="rtl"
                data-testid="input-page-title-he"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug (URL)</Label>
              <Input
                placeholder="my-new-page"
                value={newPage.slug}
                onChange={e =>
                  setNewPage({
                    ...newPage,
                    slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                  })
                }
                data-testid="input-page-slug"
              />
              <p className="text-xs text-muted-foreground">
                Auto-generated from title. Will be accessible at /{newPage.slug || "..."}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Page Type</Label>
              <Select
                value={newPage.pageType}
                onValueChange={value => setNewPage({ ...newPage, pageType: value })}
              >
                <SelectTrigger data-testid="select-page-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreatePageDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createPageMutation.mutate(newPage)}
              disabled={createPageMutation.isPending || !newPage.title || !newPage.slug}
              data-testid="button-save-new-page"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingPage} onOpenChange={() => setDeletingPage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Page?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deletingPage?.title}" and all its sections. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingPage && deletePageMutation.mutate(deletingPage.id)}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
