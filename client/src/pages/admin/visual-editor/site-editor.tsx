import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation, useRoute, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  Save,
  Globe,
  Eye,
  EyeOff,
  Plus,
  GripVertical,
  Trash2,
  Layout,
  Type,
  Image,
  Megaphone,
  HelpCircle,
  MessageSquareQuote,
  BarChart3,
  Star,
  Play,
  Mail,
  Loader2,
  Check,
  Undo2,
  Redo2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { renderBlock, BLOCK_TYPES, type PageSection } from "./components/blocks";
import { BlockSettings } from "./components/BlockSettings";

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
  sections?: PageSection[];
}

const BLOCK_ICONS: Record<string, any> = {
  hero: Layout,
  intro_text: Type,
  text_image: Type,
  gallery: Image,
  cta: Megaphone,
  faq: HelpCircle,
  testimonial: MessageSquareQuote,
  stats: BarChart3,
  features: Star,
  highlight_grid: Star,
  video: Play,
  newsletter: Mail,
};

function SortableBlock({
  section,
  isPreview,
  isSelected,
  onSelect,
  onTextEdit,
  onDelete,
}: {
  section: PageSection;
  isPreview: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onTextEdit: (field: string, value: string) => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (isPreview) {
    return renderBlock(section, true, false, () => {}, undefined);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group",
        isDragging && "opacity-50 z-50"
      )}
    >
      <div className="absolute left-0 top-0 z-20 flex items-center gap-1 p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background rounded-br-lg shadow-lg">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 rounded hover-elevate"
          data-testid={`drag-handle-${section.id}`}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <Badge variant="secondary" className="text-xs">
          {BLOCK_TYPES.find((b) => b.type === section.sectionType)?.label || section.sectionType}
        </Badge>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              data-testid={`button-delete-block-${section.id}`}
            >
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete block</TooltipContent>
        </Tooltip>
      </div>
      {renderBlock(section, false, isSelected, onSelect, onTextEdit)}
    </div>
  );
}

export default function SiteEditor() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/admin/visual-editor/:slug");
  const slug = params?.slug;
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const initialPreview = searchParams.get("preview") === "true";

  const [isPreview, setIsPreview] = useState(initialPreview);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [deletingSection, setDeletingSection] = useState<PageSection | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: pageData, isLoading } = useQuery<EditablePage>({
    queryKey: ["/api/page-builder/pages", slug],
    enabled: !!slug,
  });

  const sections = pageData?.sections || [];
  const selectedBlock = sections.find((s) => s.id === selectedBlockId) || null;

  const createSectionMutation = useMutation({
    mutationFn: async (data: Partial<PageSection>) => {
      return apiRequest("POST", "/api/page-builder/sections", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/page-builder/pages", slug] });
      toast({ title: "Block added" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateSectionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PageSection> }) => {
      return apiRequest("PUT", `/api/page-builder/sections/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/page-builder/pages", slug] });
      setHasUnsavedChanges(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/page-builder/sections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/page-builder/pages", slug] });
      toast({ title: "Block deleted" });
      if (selectedBlockId === deletingSection?.id) {
        setSelectedBlockId(null);
      }
      setDeletingSection(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const reorderSectionsMutation = useMutation({
    mutationFn: async (sectionUpdates: { id: string; sortOrder: number }[]) => {
      return apiRequest("PUT", "/api/page-builder/sections/reorder", { sections: sectionUpdates });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/page-builder/pages", slug] });
    },
  });

  const publishPageMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PUT", `/api/page-builder/pages/${pageData?.id}`, {
        isPublished: true,
        publishedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/page-builder/pages", slug] });
      toast({ title: "Page published!", description: "Your page is now live." });
    },
    onError: (error: Error) => {
      toast({ title: "Error publishing", description: error.message, variant: "destructive" });
    },
  });

  const handleAddBlock = (blockType: string) => {
    if (!pageData) return;
    createSectionMutation.mutate({
      pageId: pageData.id,
      sectionType: blockType,
      sortOrder: sections.length,
      isVisible: true,
      showOnMobile: true,
      showOnDesktop: true,
      images: [],
      data: {},
      dataHe: {},
    });
  };

  const handleUpdateBlock = useCallback((updates: Partial<PageSection>) => {
    if (!selectedBlockId) return;
    setHasUnsavedChanges(true);

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      setIsSaving(true);
      updateSectionMutation.mutate(
        { id: selectedBlockId, data: updates },
        {
          onSettled: () => setIsSaving(false),
        }
      );
    }, 1000);
  }, [selectedBlockId, updateSectionMutation]);

  const handleTextEdit = useCallback((sectionId: string, field: string, value: string) => {
    setHasUnsavedChanges(true);

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      setIsSaving(true);
      updateSectionMutation.mutate(
        { id: sectionId, data: { [field]: value } },
        {
          onSettled: () => setIsSaving(false),
        }
      );
    }, 1000);
  }, [updateSectionMutation]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);

    const reordered = arrayMove(sections, oldIndex, newIndex);
    const updates = reordered.map((s, i) => ({ id: s.id, sortOrder: i }));
    reorderSectionsMutation.mutate(updates);
  };

  const handleSave = async () => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    toast({ title: "All changes saved" });
    setHasUnsavedChanges(false);
  };

  const handlePublish = () => {
    publishPageMutation.mutate();
  };

  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen flex">
        <div className="w-64 border-r p-4 space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="flex-1 p-8">
          <Skeleton className="h-64 w-full mb-4" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!pageData) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Page Not Found</h2>
          <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation("/admin/visual-editor")} data-testid="button-back-to-dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const activeSection = sections.find((s) => s.id === activeId);

  return (
    <div className="h-screen flex flex-col bg-muted">
      <header className="h-14 border-b bg-background flex items-center justify-between gap-4 px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/admin/visual-editor")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div className="min-w-0">
            <h1 className="font-semibold truncate" data-testid="text-page-title">
              {pageData.title}
            </h1>
          </div>
          <Badge variant={pageData.isPublished ? "default" : "secondary"}>
            {pageData.isPublished ? "Published" : "Draft"}
          </Badge>
          {isSaving && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </div>
          )}
          {!isSaving && hasUnsavedChanges && (
            <div className="text-sm text-muted-foreground">Unsaved changes</div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isPreview ? "default" : "outline"}
                size="sm"
                onClick={() => setIsPreview(!isPreview)}
                data-testid="button-toggle-preview"
              >
                {isPreview ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {isPreview ? "Edit" : "Preview"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isPreview ? "Switch to edit mode" : "Preview your page"}
            </TooltipContent>
          </Tooltip>

          <Button variant="outline" size="sm" onClick={handleSave} data-testid="button-save">
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>

          <Button
            size="sm"
            onClick={handlePublish}
            disabled={publishPageMutation.isPending}
            data-testid="button-publish"
          >
            {publishPageMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Globe className="h-4 w-4 mr-2" />
            )}
            Publish
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {!isPreview && (
          <aside className="w-64 border-r bg-background shrink-0 flex flex-col">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                Add Blocks
              </h2>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-1">
                {BLOCK_TYPES.map((block) => {
                  const Icon = BLOCK_ICONS[block.type] || Layout;
                  return (
                    <Button
                      key={block.type}
                      variant="ghost"
                      className="w-full justify-start gap-2 h-auto py-2"
                      onClick={() => handleAddBlock(block.type)}
                      disabled={createSectionMutation.isPending}
                      data-testid={`button-add-block-${block.type}`}
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div className="text-left">
                        <div className="text-sm">{block.label}</div>
                        <div className="text-xs text-muted-foreground" dir="rtl">
                          {block.labelHe}
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </ScrollArea>
          </aside>
        )}

        <main className={cn("flex-1 overflow-auto", isPreview ? "bg-background" : "bg-muted")}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sections.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className={cn(isPreview ? "" : "p-4 space-y-4")}>
                {sections.length === 0 ? (
                  <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center space-y-4 max-w-md">
                      <Layout className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-medium">Start Building Your Page</h3>
                      <p className="text-muted-foreground">
                        Add blocks from the sidebar to create your page. Drag and drop to reorder.
                      </p>
                      {!isPreview && (
                        <Button onClick={() => handleAddBlock("hero")} data-testid="button-add-first-block">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Hero Block
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  sections
                    .filter((s) => s.isVisible)
                    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                    .map((section) => (
                      <div
                        key={section.id}
                        className={cn(
                          !isPreview && "bg-background rounded-lg shadow-sm overflow-hidden"
                        )}
                      >
                        <SortableBlock
                          section={section}
                          isPreview={isPreview}
                          isSelected={selectedBlockId === section.id}
                          onSelect={() => setSelectedBlockId(section.id)}
                          onTextEdit={(field, value) => handleTextEdit(section.id, field, value)}
                          onDelete={() => setDeletingSection(section)}
                        />
                      </div>
                    ))
                )}
              </div>
            </SortableContext>

            <DragOverlay>
              {activeSection && (
                <div className="bg-background rounded-lg shadow-2xl opacity-90 overflow-hidden">
                  {renderBlock(activeSection, true, false, () => {}, undefined)}
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </main>

        {!isPreview && (
          <aside className="w-80 border-l bg-background shrink-0">
            <BlockSettings
              section={selectedBlock}
              onUpdate={handleUpdateBlock}
              onClose={() => setSelectedBlockId(null)}
            />
          </aside>
        )}
      </div>

      <AlertDialog open={!!deletingSection} onOpenChange={() => setDeletingSection(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Block?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {deletingSection?.sectionType} block? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-block">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingSection && deleteSectionMutation.mutate(deletingSection.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-block"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
