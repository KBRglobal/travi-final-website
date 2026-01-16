import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Tags as TagsIcon, Trash2, Edit2, FileText, RefreshCw } from "lucide-react";
import { insertTagSchema, type Tag, type Content, type InsertTag } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface EnrichedTag extends Tag {
  contentCount: number;
  contents: { contents?: Content }[];
}

const colorOptions = [
  { value: "#3b82f6", label: "Blue" },
  { value: "#10b981", label: "Green" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#ef4444", label: "Red" },
  { value: "#8b5cf6", label: "Purple" },
  { value: "#6443F4", label: "Violet" },
  { value: "#6366f1", label: "Indigo" },
  { value: "#14b8a6", label: "Teal" },
];

const tagFormSchema = insertTagSchema.extend({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  slug: z.string().min(1, "Slug is required").max(100, "Slug is too long").regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens only"),
});

type TagFormValues = z.infer<typeof tagFormSchema>;

export default function TagsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  const form = useForm<TagFormValues>({
    resolver: zodResolver(tagFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      color: "#3b82f6",
    },
  });

  const { data: tags, isLoading } = useQuery<EnrichedTag[]>({
    queryKey: ["/api/tags"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertTag) =>
      apiRequest("POST", "/api/tags", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      resetForm();
      toast({ title: "Tag created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create tag", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InsertTag }) =>
      apiRequest("PATCH", `/api/tags/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      resetForm();
      toast({ title: "Tag updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update tag", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/tags/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      toast({ title: "Tag deleted" });
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/tags/sync"),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      toast({
        title: "Tags synced successfully",
        description: `Created ${data.created?.length || 0} new tags from contents`
      });
    },
    onError: () => {
      toast({ title: "Failed to sync tags", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setDialogOpen(false);
    setEditingTag(null);
    form.reset({
      name: "",
      slug: "",
      description: "",
      color: "#3b82f6",
    });
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleNameChange = (value: string) => {
    form.setValue("name", value);
    if (!editingTag) {
      form.setValue("slug", generateSlug(value));
    }
  };

  const openEditDialog = (tag: Tag) => {
    setEditingTag(tag);
    form.reset({
      name: tag.name,
      slug: tag.slug,
      description: tag.description || "",
      color: tag.color || "#3b82f6",
    });
    setDialogOpen(true);
  };

  const onSubmit = (values: TagFormValues) => {
    const data: InsertTag = {
      name: values.name,
      slug: values.slug,
      description: values.description || null,
      color: values.color || null,
    };

    if (editingTag) {
      updateMutation.mutate({ id: editingTag.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Reset form when dialog closes
  useEffect(() => {
    if (!dialogOpen) {
      resetForm();
    }
  }, [dialogOpen]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  const totalTags = tags?.length || 0;
  const totalUsage = tags?.reduce((sum, t) => sum + (t.usageCount || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Tags</h1>
          <p className="text-muted-foreground">Organize contents with tags for better discoverability</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            data-testid="button-sync-tags"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? "animate-spin" : ""}`} />
            {syncMutation.isPending ? "Syncing..." : "Sync from Content"}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-tag">
                <Plus className="h-4 w-4 mr-2" />
                Add Tag
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingTag ? "Edit Tag" : "Add Tag"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => handleNameChange(e.target.value)}
                          placeholder="e.g., Beach Activities"
                          data-testid="input-tag-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., beach-activities"
                          data-testid="input-tag-slug"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ""}
                          placeholder="Brief description of this tag..."
                          rows={2}
                          data-testid="input-tag-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <div className="flex gap-2 flex-wrap">
                          {colorOptions.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              className={`w-8 h-8 rounded-md border-2 transition-all ${
                                field.value === opt.value ? "border-foreground scale-110" : "border-transparent"
                              }`}
                              style={{ backgroundColor: opt.value }}
                              onClick={() => field.onChange(opt.value)}
                              title={opt.label}
                              data-testid={`color-${opt.label.toLowerCase()}`}
                            />
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-save-tag"
                  >
                    {editingTag ? "Update" : "Add"} Tag
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <TagsIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalTags}</p>
                <p className="text-sm text-muted-foreground">Total Tags</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <FileText className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalUsage}</p>
                <p className="text-sm text-muted-foreground">Total Usages</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {!tags || tags.length === 0 ? (
        <EmptyState
          icon={TagsIcon}
          title="No tags found"
          description="Create tags to organize and categorize your contents for better discoverability."
          actionLabel="Create Your First Tag"
          onAction={() => setDialogOpen(true)}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tags.map((tag) => (
            <Card key={tag.id} data-testid={`card-tag-${tag.id}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: tag.color || "#3b82f6" }}
                    />
                    <CardTitle className="text-base truncate">{tag.name}</CardTitle>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{tag.slug}</p>
                </div>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {tag.usageCount || 0} used
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                {tag.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {tag.description}
                  </p>
                )}
                {tag.contents && tag.contents.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Recent contents:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {tag.contents.slice(0, 3).map((ct, i) => (
                        <Badge key={i} variant="outline" className="text-xs truncate max-w-[150px]">
                          {ct.contents?.title || "Untitled"}
                        </Badge>
                      ))}
                      {tag.contentCount > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{tag.contentCount - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openEditDialog(tag)}
                    data-testid={`button-edit-${tag.id}`}
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMutation.mutate(tag.id)}
                    data-testid={`button-delete-${tag.id}`}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
