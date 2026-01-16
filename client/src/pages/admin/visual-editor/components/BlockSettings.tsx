import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Plus, Trash2, GripVertical, Image as ImageIcon } from "lucide-react";
import type { PageSection } from "./blocks";

interface BlockSettingsProps {
  section: PageSection | null;
  onUpdate: (updates: Partial<PageSection>) => void;
  onClose: () => void;
}

const ANIMATION_OPTIONS = [
  { value: "none", label: "None" },
  { value: "fade-in", label: "Fade In" },
  { value: "slide-up", label: "Slide Up" },
  { value: "slide-left", label: "Slide Left" },
  { value: "zoom-in", label: "Zoom In" },
];

const ICON_OPTIONS = [
  { value: "star", label: "Star" },
  { value: "check", label: "Check" },
  { value: "sparkles", label: "Sparkles" },
  { value: "zap", label: "Zap" },
  { value: "shield", label: "Shield" },
  { value: "heart", label: "Heart" },
  { value: "trending", label: "Trending" },
  { value: "users", label: "Users" },
  { value: "award", label: "Award" },
  { value: "map", label: "Map" },
];

export function BlockSettings({ section, onUpdate, onClose }: BlockSettingsProps) {
  const [localSection, setLocalSection] = useState<PageSection | null>(null);

  useEffect(() => {
    setLocalSection(section);
  }, [section]);

  if (!section || !localSection) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-center">
        <div className="space-y-2">
          <p className="text-muted-foreground">Select a block to edit its settings</p>
        </div>
      </div>
    );
  }

  const handleChange = (field: string, value: unknown) => {
    const updated = { ...localSection, [field]: value };
    setLocalSection(updated);
    onUpdate({ [field]: value });
  };

  const handleDataChange = (items: unknown[]) => {
    const updated = { ...localSection, data: { ...localSection.data, items } };
    setLocalSection(updated);
    onUpdate({ data: { ...localSection.data, items } });
  };

  const handleAddImage = (url: string) => {
    if (!url.trim()) return;
    const images = [...(localSection.images || []), url];
    handleChange("images", images);
  };

  const handleRemoveImage = (index: number) => {
    const images = localSection.images.filter((_, i) => i !== index);
    handleChange("images", images);
  };

  const renderItemsEditor = () => {
    const data = localSection.data as { items?: unknown[] } || {};
    const items = (data.items || []) as Record<string, unknown>[];

    switch (section.sectionType) {
      case "faq":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>FAQ Items</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDataChange([...items, { question: "", answer: "" }])}
                data-testid="button-add-faq-item"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            {items.map((item, index) => (
              <Card key={index}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Question</Label>
                        <Input
                          value={(item.question as string) || ""}
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[index] = { ...item, question: e.target.value };
                            handleDataChange(newItems);
                          }}
                          placeholder="Enter question"
                          data-testid={`input-faq-question-${index}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Answer</Label>
                        <Textarea
                          value={(item.answer as string) || ""}
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[index] = { ...item, answer: e.target.value };
                            handleDataChange(newItems);
                          }}
                          placeholder="Enter answer"
                          rows={2}
                          data-testid={`input-faq-answer-${index}`}
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDataChange(items.filter((_, i) => i !== index))}
                      data-testid={`button-remove-faq-${index}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case "testimonial":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Testimonials</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDataChange([...items, { name: "", role: "", contents: "", image: "" }])}
                data-testid="button-add-testimonial"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            {items.map((item, index) => (
              <Card key={index}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-3">
                      <Input
                        value={(item.name as string) || ""}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index] = { ...item, name: e.target.value };
                          handleDataChange(newItems);
                        }}
                        placeholder="Name"
                        data-testid={`input-testimonial-name-${index}`}
                      />
                      <Input
                        value={(item.role as string) || ""}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index] = { ...item, role: e.target.value };
                          handleDataChange(newItems);
                        }}
                        placeholder="Role / Company"
                        data-testid={`input-testimonial-role-${index}`}
                      />
                      <Textarea
                        value={(item.contents as string) || ""}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index] = { ...item, contents: e.target.value };
                          handleDataChange(newItems);
                        }}
                        placeholder="Testimonial contents"
                        rows={2}
                        data-testid={`input-testimonial-contents-${index}`}
                      />
                      <Input
                        value={(item.image as string) || ""}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index] = { ...item, image: e.target.value };
                          handleDataChange(newItems);
                        }}
                        placeholder="Image URL"
                        data-testid={`input-testimonial-image-${index}`}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDataChange(items.filter((_, i) => i !== index))}
                      data-testid={`button-remove-testimonial-${index}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case "stats":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Statistics</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDataChange([...items, { value: "", label: "", suffix: "" }])}
                data-testid="button-add-stat"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            {items.map((item, index) => (
              <Card key={index}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={(item.value as string) || ""}
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[index] = { ...item, value: e.target.value };
                            handleDataChange(newItems);
                          }}
                          placeholder="Value (e.g. 500)"
                          data-testid={`input-stat-value-${index}`}
                        />
                        <Input
                          value={(item.suffix as string) || ""}
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[index] = { ...item, suffix: e.target.value };
                            handleDataChange(newItems);
                          }}
                          placeholder="Suffix (e.g. +, %)"
                          data-testid={`input-stat-suffix-${index}`}
                        />
                      </div>
                      <Input
                        value={(item.label as string) || ""}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index] = { ...item, label: e.target.value };
                          handleDataChange(newItems);
                        }}
                        placeholder="Label (e.g. Happy Customers)"
                        data-testid={`input-stat-label-${index}`}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDataChange(items.filter((_, i) => i !== index))}
                      data-testid={`button-remove-stat-${index}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case "features":
      case "highlight_grid":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Features</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDataChange([...items, { icon: "check", title: "", description: "" }])}
                data-testid="button-add-feature"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            {items.map((item, index) => (
              <Card key={index}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-3">
                      <Select
                        value={(item.icon as string) || "check"}
                        onValueChange={(value) => {
                          const newItems = [...items];
                          newItems[index] = { ...item, icon: value };
                          handleDataChange(newItems);
                        }}
                      >
                        <SelectTrigger data-testid={`select-feature-icon-${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ICON_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={(item.title as string) || ""}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index] = { ...item, title: e.target.value };
                          handleDataChange(newItems);
                        }}
                        placeholder="Feature title"
                        data-testid={`input-feature-title-${index}`}
                      />
                      <Textarea
                        value={(item.description as string) || ""}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index] = { ...item, description: e.target.value };
                          handleDataChange(newItems);
                        }}
                        placeholder="Feature description"
                        rows={2}
                        data-testid={`input-feature-description-${index}`}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDataChange(items.filter((_, i) => i !== index))}
                      data-testid={`button-remove-feature-${index}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between gap-2 p-4 border-b">
        <div className="min-w-0">
          <h3 className="font-semibold truncate">Block Settings</h3>
          <Badge variant="secondary" className="mt-1">
            {section.sectionType}
          </Badge>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-settings">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <Tabs defaultValue="contents">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="contents" data-testid="tab-trigger-contents">Content</TabsTrigger>
              <TabsTrigger value="hebrew" data-testid="tab-trigger-hebrew">Hebrew</TabsTrigger>
            </TabsList>

            <TabsContent value="contents" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={localSection.title || ""}
                  onChange={(e) => handleChange("title", e.target.value)}
                  placeholder="Enter title"
                  data-testid="input-block-title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtitle">Subtitle</Label>
                <Input
                  id="subtitle"
                  value={localSection.subtitle || ""}
                  onChange={(e) => handleChange("subtitle", e.target.value)}
                  placeholder="Enter subtitle"
                  data-testid="input-block-subtitle"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={localSection.description || ""}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Enter description"
                  rows={3}
                  data-testid="input-block-description"
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="buttonText">Button Text</Label>
                <Input
                  id="buttonText"
                  value={localSection.buttonText || ""}
                  onChange={(e) => handleChange("buttonText", e.target.value)}
                  placeholder="e.g., Learn More"
                  data-testid="input-block-button-text"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="buttonLink">Button Link</Label>
                <Input
                  id="buttonLink"
                  value={localSection.buttonLink || ""}
                  onChange={(e) => handleChange("buttonLink", e.target.value)}
                  placeholder="e.g., /contact"
                  data-testid="input-block-button-link"
                />
              </div>
            </TabsContent>

            <TabsContent value="hebrew" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="titleHe">Title (Hebrew)</Label>
                <Input
                  id="titleHe"
                  value={localSection.titleHe || ""}
                  onChange={(e) => handleChange("titleHe", e.target.value)}
                  placeholder="הכנס כותרת"
                  dir="rtl"
                  data-testid="input-block-title-he"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtitleHe">Subtitle (Hebrew)</Label>
                <Input
                  id="subtitleHe"
                  value={localSection.subtitleHe || ""}
                  onChange={(e) => handleChange("subtitleHe", e.target.value)}
                  placeholder="הכנס כותרת משנה"
                  dir="rtl"
                  data-testid="input-block-subtitle-he"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descriptionHe">Description (Hebrew)</Label>
                <Textarea
                  id="descriptionHe"
                  value={localSection.descriptionHe || ""}
                  onChange={(e) => handleChange("descriptionHe", e.target.value)}
                  placeholder="הכנס תיאור"
                  rows={3}
                  dir="rtl"
                  data-testid="input-block-description-he"
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="buttonTextHe">Button Text (Hebrew)</Label>
                <Input
                  id="buttonTextHe"
                  value={localSection.buttonTextHe || ""}
                  onChange={(e) => handleChange("buttonTextHe", e.target.value)}
                  placeholder="טקסט הכפתור"
                  dir="rtl"
                  data-testid="input-block-button-text-he"
                />
              </div>
            </TabsContent>
          </Tabs>

          <Separator />

          <div className="space-y-4">
            <Label>Background Image</Label>
            <Input
              value={localSection.backgroundImage || ""}
              onChange={(e) => handleChange("backgroundImage", e.target.value)}
              placeholder="https://example.com/image.jpg"
              data-testid="input-block-bg-image"
            />
            {localSection.backgroundImage && (
              <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                <img
                  src={localSection.backgroundImage}
                  alt="Background preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          {(section.sectionType === "gallery" || section.sectionType === "intro_text" || section.sectionType === "text_image") && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Gallery Images</Label>
                  <ImageInputDialog onAdd={handleAddImage} />
                </div>
                {localSection.images?.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {localSection.images.map((img, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
                        <img
                          src={img}
                          alt={`Gallery ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveImage(index)}
                          data-testid={`button-remove-image-${index}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center border-2 border-dashed rounded-lg">
                    <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No images added</p>
                  </div>
                )}
              </div>
            </>
          )}

          {section.sectionType === "video" && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="videoUrl">Video URL</Label>
                <Input
                  id="videoUrl"
                  value={localSection.backgroundVideo || ""}
                  onChange={(e) => handleChange("backgroundVideo", e.target.value)}
                  placeholder="https://example.com/video.mp4"
                  data-testid="input-block-video-url"
                />
              </div>
            </>
          )}

          {renderItemsEditor()}

          <Separator />

          <div className="space-y-4">
            <h4 className="font-medium">Visibility Settings</h4>
            <div className="flex items-center justify-between">
              <Label htmlFor="isVisible">Visible</Label>
              <Switch
                id="isVisible"
                checked={localSection.isVisible}
                onCheckedChange={(checked) => handleChange("isVisible", checked)}
                data-testid="switch-block-visible"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="showOnMobile">Show on Mobile</Label>
              <Switch
                id="showOnMobile"
                checked={localSection.showOnMobile}
                onCheckedChange={(checked) => handleChange("showOnMobile", checked)}
                data-testid="switch-block-mobile"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="showOnDesktop">Show on Desktop</Label>
              <Switch
                id="showOnDesktop"
                checked={localSection.showOnDesktop}
                onCheckedChange={(checked) => handleChange("showOnDesktop", checked)}
                data-testid="switch-block-desktop"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Animation</Label>
            <Select
              value={localSection.animation || "none"}
              onValueChange={(value) => handleChange("animation", value)}
            >
              <SelectTrigger data-testid="select-block-animation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANIMATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="backgroundColor">Background Color</Label>
            <Input
              id="backgroundColor"
              value={localSection.backgroundColor || ""}
              onChange={(e) => handleChange("backgroundColor", e.target.value)}
              placeholder="e.g., #f5f5f5"
              data-testid="input-block-bg-color"
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function ImageInputDialog({ onAdd }: { onAdd: (url: string) => void }) {
  const [url, setUrl] = useState("");

  const handleAdd = () => {
    if (url.trim()) {
      onAdd(url.trim());
      setUrl("");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Image URL"
        className="w-40"
        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        data-testid="input-add-image-url"
      />
      <Button variant="outline" size="sm" onClick={handleAdd} data-testid="button-add-image">
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
