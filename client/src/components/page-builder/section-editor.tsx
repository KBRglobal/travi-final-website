import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, RotateCcw, Image as ImageIcon, Palette, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLiveEdit } from "./live-edit-provider";
import { useLocale } from "@/lib/i18n/LocaleRouter";
import { cn } from "@/lib/utils";
import type { PageSection } from "@shared/schema";

interface PageBuilderSectionEditorProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

const BACKGROUND_COLORS = [
  { value: "", label: "Default" },
  { value: "bg-background", label: "Background" },
  { value: "bg-muted", label: "Muted" },
  { value: "bg-primary", label: "Primary" },
  { value: "bg-secondary", label: "Secondary" },
  { value: "bg-accent", label: "Accent" },
];

const ANIMATIONS = [
  { value: "", label: "None" },
  { value: "fade-in", label: "Fade In" },
  { value: "slide-up", label: "Slide Up" },
  { value: "slide-down", label: "Slide Down" },
  { value: "scale-in", label: "Scale In" },
  { value: "bounce", label: "Bounce" },
];

export function PageBuilderSectionEditor({
  isOpen,
  onClose,
  className,
}: PageBuilderSectionEditorProps) {
  const { isRTL } = useLocale();
  const {
    selectedSection,
    updateSection,
    saveChanges,
    discardChanges,
    isSaving,
    hasUnsavedChanges,
  } = useLiveEdit();

  const [localChanges, setLocalChanges] = useState<Partial<PageSection>>({});
  const [activeTab, setActiveTab] = useState<"en" | "he">("en");

  useEffect(() => {
    if (selectedSection) {
      setLocalChanges({});
    }
  }, [selectedSection?.id]);

  const handleFieldChange = (field: keyof PageSection, value: any) => {
    setLocalChanges((prev) => ({ ...prev, [field]: value }));
    if (selectedSection) {
      updateSection(selectedSection.id, { [field]: value });
    }
  };

  const handleSave = async () => {
    await saveChanges();
    onClose();
  };

  const handleDiscard = () => {
    discardChanges();
    setLocalChanges({});
  };

  const currentValue = <K extends keyof PageSection>(field: K): PageSection[K] | undefined => {
    if (field in localChanges) {
      return localChanges[field] as PageSection[K];
    }
    return selectedSection?.[field];
  };

  if (!selectedSection) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: isRTL ? -320 : 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: isRTL ? -320 : 320, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className={cn(
            "fixed top-0 z-50 h-screen w-80 bg-background border-l shadow-xl",
            isRTL ? "left-0 border-r border-l-0" : "right-0",
            className
          )}
          data-testid="section-editor-panel"
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between gap-2 p-4 border-b">
              <div>
                <h2 className="font-semibold text-lg">
                  {selectedSection.sectionType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                </h2>
                <p className="text-xs text-muted-foreground">Edit section properties</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                data-testid="editor-close-button"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-6">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "en" | "he")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="en" data-testid="tab-english">English</TabsTrigger>
                    <TabsTrigger value="he" data-testid="tab-hebrew">עברית</TabsTrigger>
                  </TabsList>

                  <TabsContent value="en" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={currentValue("title") || ""}
                        onChange={(e) => handleFieldChange("title", e.target.value)}
                        placeholder="Section title"
                        data-testid="input-title"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subtitle">Subtitle</Label>
                      <Input
                        id="subtitle"
                        value={currentValue("subtitle") || ""}
                        onChange={(e) => handleFieldChange("subtitle", e.target.value)}
                        placeholder="Section subtitle"
                        data-testid="input-subtitle"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={currentValue("description") || ""}
                        onChange={(e) => handleFieldChange("description", e.target.value)}
                        placeholder="Section description"
                        rows={4}
                        data-testid="input-description"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="buttonText">Button Text</Label>
                      <Input
                        id="buttonText"
                        value={currentValue("buttonText") || ""}
                        onChange={(e) => handleFieldChange("buttonText", e.target.value)}
                        placeholder="Call to action text"
                        data-testid="input-button-text"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="he" className="space-y-4 mt-4" dir="rtl">
                    <div className="space-y-2">
                      <Label htmlFor="titleHe">כותרת</Label>
                      <Input
                        id="titleHe"
                        value={currentValue("titleHe") || ""}
                        onChange={(e) => handleFieldChange("titleHe", e.target.value)}
                        placeholder="כותרת הסקשן"
                        data-testid="input-title-he"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subtitleHe">כותרת משנה</Label>
                      <Input
                        id="subtitleHe"
                        value={currentValue("subtitleHe") || ""}
                        onChange={(e) => handleFieldChange("subtitleHe", e.target.value)}
                        placeholder="כותרת משנה"
                        data-testid="input-subtitle-he"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="descriptionHe">תיאור</Label>
                      <Textarea
                        id="descriptionHe"
                        value={currentValue("descriptionHe") || ""}
                        onChange={(e) => handleFieldChange("descriptionHe", e.target.value)}
                        placeholder="תיאור הסקשן"
                        rows={4}
                        data-testid="input-description-he"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="buttonTextHe">טקסט כפתור</Label>
                      <Input
                        id="buttonTextHe"
                        value={currentValue("buttonTextHe") || ""}
                        onChange={(e) => handleFieldChange("buttonTextHe", e.target.value)}
                        placeholder="טקסט קריאה לפעולה"
                        data-testid="input-button-text-he"
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Media
                  </h3>

                  <div className="space-y-2">
                    <Label htmlFor="backgroundImage">Background Image URL</Label>
                    <Input
                      id="backgroundImage"
                      value={currentValue("backgroundImage") || ""}
                      onChange={(e) => handleFieldChange("backgroundImage", e.target.value)}
                      placeholder="https://..."
                      data-testid="input-background-image"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="buttonLink">Button Link</Label>
                    <Input
                      id="buttonLink"
                      value={currentValue("buttonLink") || ""}
                      onChange={(e) => handleFieldChange("buttonLink", e.target.value)}
                      placeholder="/page or https://..."
                      data-testid="input-button-link"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Styling
                  </h3>

                  <div className="space-y-2">
                    <Label htmlFor="backgroundColor">Background Color</Label>
                    <Select
                      value={currentValue("backgroundColor") || ""}
                      onValueChange={(value) => handleFieldChange("backgroundColor", value)}
                    >
                      <SelectTrigger data-testid="select-background-color">
                        <SelectValue placeholder="Select color" />
                      </SelectTrigger>
                      <SelectContent>
                        {BACKGROUND_COLORS.map((color) => (
                          <SelectItem key={color.value} value={color.value || "default"}>
                            {color.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="animation">Animation</Label>
                    <Select
                      value={currentValue("animation") || ""}
                      onValueChange={(value) => handleFieldChange("animation", value)}
                    >
                      <SelectTrigger data-testid="select-animation">
                        <SelectValue placeholder="Select animation" />
                      </SelectTrigger>
                      <SelectContent>
                        {ANIMATIONS.map((anim) => (
                          <SelectItem key={anim.value} value={anim.value || "none"}>
                            {anim.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Visibility
                  </h3>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="isVisible">Show Section</Label>
                    <Switch
                      id="isVisible"
                      checked={currentValue("isVisible") ?? true}
                      onCheckedChange={(checked) => handleFieldChange("isVisible", checked)}
                      data-testid="switch-is-visible"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="showOnMobile">Show on Mobile</Label>
                    <Switch
                      id="showOnMobile"
                      checked={currentValue("showOnMobile") ?? true}
                      onCheckedChange={(checked) => handleFieldChange("showOnMobile", checked)}
                      data-testid="switch-show-mobile"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="showOnDesktop">Show on Desktop</Label>
                    <Switch
                      id="showOnDesktop"
                      checked={currentValue("showOnDesktop") ?? true}
                      onCheckedChange={(checked) => handleFieldChange("showOnDesktop", checked)}
                      data-testid="switch-show-desktop"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    value={currentValue("sortOrder") ?? 0}
                    onChange={(e) => handleFieldChange("sortOrder", parseInt(e.target.value) || 0)}
                    min={0}
                    data-testid="input-sort-order"
                  />
                </div>
              </div>
            </ScrollArea>

            <div className="p-4 border-t space-y-2">
              {hasUnsavedChanges && (
                <p className="text-xs text-amber-600 mb-2">You have unsaved changes</p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleDiscard}
                  disabled={!hasUnsavedChanges || isSaving}
                  data-testid="button-discard"
                >
                  <RotateCcw className="w-4 h-4 me-2" />
                  Discard
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges || isSaving}
                  data-testid="button-save"
                >
                  <Save className="w-4 h-4 me-2" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
