import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { sanitizeHTML } from "@/lib/sanitize";
import { SlashCommandMenu } from "@/components/slash-command-menu";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/use-permissions";
import { useImageUpload } from "@/hooks/use-image-upload";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Save,
  Eye,
  Send,
  ArrowLeft,
  GripVertical,
  Trash2,
  Image,
  Type,
  HelpCircle,
  MousePointer,
  LayoutGrid,
  Star,
  Lightbulb,
  Monitor,
  Smartphone,
  X,
  Sparkles,
  Loader2,
  Zap,
  Copy,
  ChevronUp,
  ChevronDown,
  Upload,
  Settings,
  FileText,
  PanelLeft,
  ImagePlus,
  History,
  RotateCcw,
  Check,
  FolderOpen,
  Search,
  Video,
  Quote,
  Minus,
  MessageSquare,
  Award,
  MapPin,
  Clock,
  CalendarDays,
  DollarSign,
  Plus,
  GripHorizontal,
  Map,
  Heading1,
  Share2,
  ChevronRight,
  Layers,
  Code,
  ExternalLink,
  ArrowUpDown,
  Palette,
  Undo2,
  Redo2,
  EyeOff,
  Tablet,
  AlertTriangle,
  CheckCircle,
  Keyboard,
  Lock,
} from "lucide-react";
import type {
  ContentWithRelations,
  ContentBlock,
  ContentVersion,
  QuickInfoItem,
  HighlightItem,
  TicketInfoItem,
  EssentialInfoItem,
  RelatedItem
} from "@shared/schema";
import { SeoScore } from "@/components/seo-score";
import { SEOValidationGate } from "@/components/seo-validation-gate";
import { SchemaPreview } from "@/components/schema-preview";
import { AttractionSeoEditor } from "@/components/attraction-seo-editor";
import { HotelSeoEditor } from "@/components/hotel-seo-editor";
import { DiningSeoEditor } from "@/components/dining-seo-editor";
import { DistrictSeoEditor } from "@/components/district-seo-editor";
import { TranslationManager } from "@/components/translation-manager";
import { AITitleSuggestions } from "@/components/ai-title-suggestions";
import { AIFieldAssistant } from "@/components/ai-field-assistant";
import { RelatedContentFinder } from "@/components/related-content-finder";
import { BrokenLinkChecker } from "@/components/broken-link-checker";
import { ReadingTimeCalculator } from "@/components/reading-time-calculator";
import { WriterSelector } from "@/components/writers/WriterSelector";
import { useRegisterTab } from "@/components/multi-tab-editor";
import { VersionDiff } from "@/components/version-diff";

type ContentType = "attraction" | "hotel" | "article" | "dining" | "district";
// TEMPORARILY DISABLED: "transport" | "event" | "itinerary" - Will be enabled later

interface BlockTypeConfig {
  type: ContentBlock["type"];
  label: string;
  icon: typeof Image;
  description: string;
  category: "media" | "contents" | "layout" | "interactive";
  color: string;
}

const blockTypes: BlockTypeConfig[] = [
  // Media blocks
  { type: "hero", label: "Hero", icon: Image, description: "Full-width hero section", category: "media", color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  { type: "image", label: "Image", icon: ImagePlus, description: "Single image with caption", category: "media", color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  { type: "gallery", label: "Gallery", icon: LayoutGrid, description: "Image gallery grid", category: "media", color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  { type: "video", label: "Video", icon: Video, description: "YouTube/Vimeo embed", category: "media", color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  { type: "map", label: "Map", icon: Map, description: "Google Maps location", category: "media", color: "bg-blue-500/10 text-blue-600 border-blue-200" },

  // Content blocks
  { type: "heading", label: "Heading", icon: Heading1, description: "Section heading H2/H3", category: "contents", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  { type: "text", label: "Text", icon: Type, description: "Rich text paragraph", category: "contents", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  { type: "highlights", label: "Highlights", icon: Star, description: "Key feature highlights", category: "contents", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  { type: "tips", label: "Tips", icon: Lightbulb, description: "Pro tips & advice", category: "contents", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  { type: "quote", label: "Quote", icon: Quote, description: "Blockquote / testimonial", category: "contents", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  { type: "social", label: "Social", icon: Share2, description: "Social media links", category: "contents", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },

  // Layout blocks
  { type: "info_grid", label: "Info Grid", icon: LayoutGrid, description: "Quick facts grid", category: "layout", color: "bg-[#6443F4]/10 text-[#6443F4] border-[#6443F4]/20" },
  { type: "divider", label: "Divider", icon: Minus, description: "Section separator", category: "layout", color: "bg-[#6443F4]/10 text-[#6443F4] border-[#6443F4]/20" },
  { type: "spacer", label: "Spacer", icon: ArrowUpDown, description: "Vertical spacing", category: "layout", color: "bg-[#6443F4]/10 text-[#6443F4] border-[#6443F4]/20" },
  { type: "columns", label: "Columns", icon: Layers, description: "Two column layout", category: "layout", color: "bg-[#6443F4]/10 text-[#6443F4] border-[#6443F4]/20" },

  // Interactive blocks
  { type: "faq", label: "FAQ", icon: HelpCircle, description: "Question & answer", category: "interactive", color: "bg-amber-500/10 text-amber-600 border-amber-200" },
  { type: "accordion", label: "Accordion", icon: ChevronRight, description: "Collapsible sections", category: "interactive", color: "bg-amber-500/10 text-amber-600 border-amber-200" },
  { type: "tabs", label: "Tabs", icon: Layers, description: "Tabbed contents", category: "interactive", color: "bg-amber-500/10 text-amber-600 border-amber-200" },
  { type: "cta", label: "CTA", icon: MousePointer, description: "Call to action button", category: "interactive", color: "bg-amber-500/10 text-amber-600 border-amber-200" },
  { type: "html", label: "HTML", icon: Code, description: "Custom HTML/embed", category: "interactive", color: "bg-amber-500/10 text-amber-600 border-amber-200" },
];

const blockCategories = [
  { id: "media", label: "Media", icon: Image },
  { id: "contents", label: "Content", icon: Type },
  { id: "layout", label: "Layout", icon: LayoutGrid },
  { id: "interactive", label: "Interactive", icon: MousePointer },
];

// Environment-based configuration
const GOOGLE_MAPS_API_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || "";

// Safe deep clone function to handle potential JSON errors
function safeDeepClone<T>(obj: T): T | null {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    console.error("Failed to deep clone object:", e);
    return null;
  }
}

const defaultTemplateBlocks: ContentBlock[] = [
  { id: "hero-default", type: "hero", data: { image: "", alt: "", title: "" }, order: 0 },
  { id: "intro-default", type: "text", data: { contents: "" }, order: 1 },
  { id: "highlights-default", type: "highlights", data: { items: [] }, order: 2 },
  { id: "tips-default", type: "tips", data: { items: [] }, order: 3 },
  { id: "faq-default", type: "faq", data: { question: "", answer: "" }, order: 4 },
];

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function generateId(): string {
  // Use crypto.randomUUID() for secure ID generation, fallback to less secure method
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().substring(0, 8);
  }
  return Math.random().toString(36).substring(2, 9);
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    return `${mins} minute${mins > 1 ? 's' : ''} ago`;
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  if (seconds < 604800) {
    const days = Math.floor(seconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Topic categories for filtering media
const MEDIA_TOPICS = [
  { value: "all", label: "All Images" },
  { value: "property", label: "Properties" },
  { value: "dubai", label: "Dubai" },
  { value: "luxury", label: "Luxury" },
  { value: "interior", label: "Interior" },
  { value: "exterior", label: "Exterior" },
  { value: "amenities", label: "Amenities" },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "skyline", label: "Skyline" },
  { value: "beach", label: "Beach" },
  { value: "pool", label: "Pool" },
];

interface MediaFile {
  id: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  url: string;
  altText?: string;
  width?: number;
  height?: number;
  createdAt?: string;
}

// Auto-generate tags from filename
function generateAutoTags(filename: string): string[] {
  const name = filename.toLowerCase().replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
  const words = name.split(/\s+/).filter(w => w.length > 2);
  const tags: string[] = [];
  
  const topicKeywords: Record<string, string[]> = {
    property: ["property", "apartment", "villa", "tower", "residence", "unit", "home", "house", "flat"],
    dubai: ["dubai", "marina", "downtown", "palm", "jumeirah", "creek", "business", "bay"],
    luxury: ["luxury", "premium", "elegant", "exclusive", "high-end", "penthouse"],
    interior: ["interior", "living", "bedroom", "bathroom", "kitchen", "room", "lounge"],
    exterior: ["exterior", "facade", "building", "entrance", "lobby"],
    amenities: ["amenities", "gym", "spa", "fitness", "sauna", "restaurant"],
    lifestyle: ["lifestyle", "family", "couple", "dining", "entertainment"],
    skyline: ["skyline", "view", "panorama", "city", "night"],
    beach: ["beach", "sea", "ocean", "coast", "sand"],
    pool: ["pool", "swimming", "infinity", "rooftop"],
  };
  
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (words.some(w => keywords.some(k => w.includes(k)))) {
      tags.push(topic);
    }
  }
  
  return tags.length > 0 ? tags : ["general"];
}

// Media Library Picker Dialog
function MediaLibraryPicker({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string, alt: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("all");
  const [selectedImage, setSelectedImage] = useState<MediaFile | null>(null);
  
  const { data: mediaFiles = [], isLoading } = useQuery<MediaFile[]>({
    queryKey: ["/api/media"],
    enabled: open,
  });
  
  // Filter and tag media files
  const filteredMedia = useMemo(() => {
    return mediaFiles.filter((file) => {
      if (!file.mimeType.startsWith("image/")) return false;
      
      const tags = generateAutoTags(file.originalFilename);
      const matchesSearch = searchQuery === "" || 
        file.originalFilename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (file.altText && file.altText.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesTopic = selectedTopic === "all" || tags.includes(selectedTopic);
      
      return matchesSearch && matchesTopic;
    });
  }, [mediaFiles, searchQuery, selectedTopic]);
  
  const handleSelect = () => {
    if (selectedImage) {
      onSelect(selectedImage.url, selectedImage.altText || selectedImage.originalFilename);
      onOpenChange(false);
      setSelectedImage(null);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Media Library</DialogTitle>
          <DialogDescription>Select an image from your media library</DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search images..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-media-search"
            />
          </div>
          <Select value={selectedTopic} onValueChange={setSelectedTopic}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-media-topic">
              <SelectValue placeholder="Filter by topic" />
            </SelectTrigger>
            <SelectContent>
              {MEDIA_TOPICS.map((topic) => (
                <SelectItem key={topic.value} value={topic.value}>
                  {topic.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 py-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mb-4" />
              <p>No images found</p>
              <p className="text-sm">Try adjusting your search or topic filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 py-4">
              {filteredMedia.map((file) => {
                const tags = generateAutoTags(file.originalFilename);
                const isSelected = selectedImage?.id === file.id;
                return (
                  <button
                    key={file.id}
                    onClick={() => setSelectedImage(file)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      isSelected 
                        ? "border-primary ring-2 ring-primary/20" 
                        : "border-transparent hover:border-muted-foreground/30"
                    }`}
                    data-testid={`media-image-${file.id}`}
                  >
                    <img
                      src={file.url}
                      alt={file.altText || file.originalFilename}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="bg-primary text-primary-foreground rounded-full p-1">
                          <Check className="h-4 w-4" />
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <div className="flex flex-wrap gap-1">
                        {tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px] px-1 py-0">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
        
        {selectedImage && (
          <div className="border-t pt-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <img
                src={selectedImage.url}
                alt={selectedImage.altText || selectedImage.originalFilename}
                className="h-12 w-12 rounded object-cover flex-shrink-0"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{selectedImage.originalFilename}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedImage.width && selectedImage.height && `${selectedImage.width} x ${selectedImage.height} • `}
                  {(selectedImage.size / 1024).toFixed(0)} KB
                </p>
              </div>
            </div>
            <Button onClick={handleSelect} data-testid="button-select-media">
              Select Image
            </Button>
          </div>
        )}
        
        {!selectedImage && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ContentLockIndicator({ contentId }: { contentId: string }) {
  const { data: lockData } = useQuery<{
    isLocked: boolean;
    lockedBy?: { name: string; avatar?: string };
    lockedAt?: string;
  }>({
    queryKey: ["/api/contents-locks", contentId],
    refetchInterval: 30000,
  });

  if (!lockData?.isLocked) return null;

  return (
    <div 
      className="flex items-center gap-2 px-2 py-1 bg-yellow-100 dark:bg-yellow-950/50 border border-yellow-300 dark:border-yellow-800 rounded-md"
      data-testid="contents-lock-indicator"
    >
      <Lock className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
      <div className="flex items-center gap-2">
        {lockData.lockedBy?.avatar ? (
          <img 
            src={lockData.lockedBy.avatar} 
            alt={lockData.lockedBy.name}
            className="h-5 w-5 rounded-full object-cover border border-yellow-400"
          />
        ) : (
          <div className="h-5 w-5 rounded-full bg-yellow-200 dark:bg-yellow-800 flex items-center justify-center text-xs font-medium text-yellow-700 dark:text-yellow-200">
            {lockData.lockedBy?.name?.charAt(0) || "?"}
          </div>
        )}
        <span className="text-xs font-medium text-yellow-700 dark:text-yellow-400">
          {lockData.lockedBy?.name || "Someone"} is editing
        </span>
      </div>
    </div>
  );
}

export default function ContentEditor() {
  const [, attractionMatch] = useRoute("/admin/attractions/:id");
  const [, hotelMatch] = useRoute("/admin/hotels/:id");
  const [, articleMatch] = useRoute("/admin/articles/:id");
  const [, attractionNewMatch] = useRoute("/admin/attractions/new");
  const [, hotelNewMatch] = useRoute("/admin/hotels/new");
  const [, articleNewMatch] = useRoute("/admin/articles/new");
  const [, diningMatch] = useRoute("/admin/dining/:id");
  const [, diningNewMatch] = useRoute("/admin/dining/new");
  const [, districtMatch] = useRoute("/admin/districts/:id");
  const [, districtNewMatch] = useRoute("/admin/districts/new");
  const [, transportMatch] = useRoute("/admin/transport/:id");
  const [, transportNewMatch] = useRoute("/admin/transport/new");
  const [, eventMatch] = useRoute("/admin/events/:id");
  const [, eventNewMatch] = useRoute("/admin/events/new");
  const [, itineraryMatch] = useRoute("/admin/itineraries/:id");
  const [, itineraryNewMatch] = useRoute("/admin/itineraries/new");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { canPublish } = usePermissions();

  const isNew = !!(attractionNewMatch || hotelNewMatch || articleNewMatch || diningNewMatch || districtNewMatch || transportNewMatch || eventNewMatch || itineraryNewMatch);
  const contentId = isNew ? undefined : (
    (attractionMatch as { id?: string } | null)?.id ||
    (hotelMatch as { id?: string } | null)?.id ||
    (articleMatch as { id?: string } | null)?.id ||
    (diningMatch as { id?: string } | null)?.id ||
    (districtMatch as { id?: string } | null)?.id ||
    (transportMatch as { id?: string } | null)?.id ||
    (eventMatch as { id?: string } | null)?.id ||
    (itineraryMatch as { id?: string } | null)?.id
  );

  const getContentType = (): ContentType => {
    if (attractionMatch || attractionNewMatch) return "attraction";
    if (hotelMatch || hotelNewMatch) return "hotel";
    if (diningMatch || diningNewMatch) return "dining";
    if (districtMatch || districtNewMatch) return "district";
    // TEMPORARILY DISABLED: transport, event, and itinerary will be enabled later
    // if (transportMatch || transportNewMatch) return "transport";
    // if (eventMatch || eventNewMatch) return "event";
    // if (itineraryMatch || itineraryNewMatch) return "itinerary";
    return "article";
  };
  const contentType: ContentType = getContentType();

  // Multi-tab editing support
  const { registerTab, markDirty, updateTitle } = useRegisterTab(
    contentType,
    contentId || "new",
    ""
  );

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [primaryKeyword, setPrimaryKeyword] = useState("");
  const [secondaryKeywords, setSecondaryKeywords] = useState("");
  const [internalLinksText, setInternalLinksText] = useState("");
  const [externalLinksText, setExternalLinksText] = useState("");
  const [heroImage, setHeroImage] = useState("");
  const [heroImageAlt, setHeroImageAlt] = useState("");
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [status, setStatus] = useState<string>("draft");
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [selectedWriterId, setSelectedWriterId] = useState<string | undefined>(undefined);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile" | null>(null);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [imageGenerationDialog, setImageGenerationDialog] = useState<{ open: boolean; blockId: string | null; images: Array<{ url: string; alt: string }> }>({
    open: false,
    blockId: null,
    images: [],
  });
  const [aiGenerateDialogOpen, setAiGenerateDialogOpen] = useState(false);
  const [aiGenerateInput, setAiGenerateInput] = useState("");
  const [imageGeneratingBlock, setImageGeneratingBlock] = useState<string | null>(null);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<ContentVersion | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [lastAutosaveTime, setLastAutosaveTime] = useState<string | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  // NEW: Enhanced Editor Features
  const [blockSearchQuery, setBlockSearchQuery] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; blockId: string } | null>(null);

  // Slash Command Menu state
  const [slashCommandMenu, setSlashCommandMenu] = useState<{
    isOpen: boolean;
    position: { top: number; left: number };
    blockIndex: number;
    searchQuery: string;
  }>({
    isOpen: false,
    position: { top: 0, left: 0 },
    blockIndex: 0,
    searchQuery: "",
  });

  const handleSlashCommand = useCallback((position: { top: number; left: number }, blockIndex: number, searchQuery: string) => {
    setSlashCommandMenu({
      isOpen: true,
      position,
      blockIndex,
      searchQuery,
    });
  }, []);

  const handleSlashCommandClose = useCallback(() => {
    setSlashCommandMenu(prev => ({ ...prev, isOpen: false }));
  }, []);

  // SEO Validation Gate state
  const [seoCanPublish, setSeoCanPublish] = useState(true);

  // Undo/Redo History
  const [history, setHistory] = useState<ContentBlock[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const maxHistorySize = 50;

  // Save state to history (called when blocks change significantly)
  const pushToHistory = useCallback((newBlocks: ContentBlock[]) => {
    const cloned = safeDeepClone(newBlocks);
    if (!cloned) return; // Skip if cloning failed

    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(cloned);
      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, maxHistorySize - 1));
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const cloned = safeDeepClone(history[historyIndex - 1]);
      if (cloned) {
        setHistoryIndex(prev => prev - 1);
        setBlocks(cloned);
      }
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const cloned = safeDeepClone(history[historyIndex + 1]);
      if (cloned) {
        setHistoryIndex(prev => prev + 1);
        setBlocks(cloned);
      }
    }
  }, [history, historyIndex]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo: Ctrl+Z
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        redo();
      }
      // Save: Ctrl+S
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // Preview: Ctrl+P
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        setShowPreview(prev => !prev);
      }
      // Delete selected block: Delete or Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBlockId && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        removeBlock(selectedBlockId);
      }
      // Duplicate: Ctrl+D
      if (e.ctrlKey && e.key === 'd' && selectedBlockId) {
        e.preventDefault();
        duplicateBlock(selectedBlockId);
      }
      // Escape: Close preview or deselect
      if (e.key === 'Escape') {
        if (showPreview) setShowPreview(false);
        else if (contextMenu) setContextMenu(null);
        else setSelectedBlockId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, selectedBlockId, showPreview, contextMenu]);

  // Live SEO Score calculation
  const seoScore = useMemo(() => {
    let score = 0;
    const issues: string[] = [];
    const passed: string[] = [];

    // Title (15 points)
    if (title) {
      score += 5;
      passed.push("Title exists");
      if (title.length >= 30 && title.length <= 60) {
        score += 5;
        passed.push("Title length optimal (30-60)");
      } else {
        issues.push(`Title length: ${title.length} (optimal: 30-60)`);
      }
      if (primaryKeyword && title.toLowerCase().includes(primaryKeyword.toLowerCase())) {
        score += 5;
        passed.push("Keyword in title");
      } else if (primaryKeyword) {
        issues.push("Primary keyword not in title");
      }
    } else {
      issues.push("Missing title");
    }

    // Meta Description (15 points)
    if (metaDescription) {
      score += 5;
      passed.push("Meta description exists");
      if (metaDescription.length >= 120 && metaDescription.length <= 160) {
        score += 5;
        passed.push("Meta description length optimal");
      } else {
        issues.push(`Meta description: ${metaDescription.length} chars (optimal: 120-160)`);
      }
      if (primaryKeyword && metaDescription.toLowerCase().includes(primaryKeyword.toLowerCase())) {
        score += 5;
        passed.push("Keyword in meta description");
      } else if (primaryKeyword) {
        issues.push("Primary keyword not in meta description");
      }
    } else {
      issues.push("Missing meta description");
    }

    // Hero Image (15 points)
    if (heroImage) {
      score += 10;
      passed.push("Hero image exists");
      if (heroImage.includes('.webp')) {
        score += 5;
        passed.push("Image is WebP format");
      } else {
        issues.push("Hero image not WebP format");
      }
    } else {
      issues.push("Missing hero image");
    }

    // Content (15 points) - count all text contents, not just text blocks
    const allTextContent = blocks.map(b => {
      if (b.type === "text") return String(b.data?.contents || '');
      if (b.type === "hero") return String(b.data?.title || '');
      if (b.type === "faq" && b.data?.faqs) {
        return (b.data.faqs as Array<{question?: string; answer?: string}>)
          .map(f => `${f.question || ''} ${f.answer || ''}`).join(' ');
      }
      if (b.type === "highlights" && b.data?.items) {
        return (b.data.items as Array<{title?: string; description?: string}>)
          .map(i => `${i.title || ''} ${i.description || ''}`).join(' ');
      }
      if (b.type === "tips" && b.data?.tips) {
        return (b.data.tips as string[]).join(' ');
      }
      if (b.type === "cta") return String(b.data?.text || '');
      return '';
    }).join(' ');
    const totalWords = allTextContent.split(/\s+/).filter(w => w.length > 0).length;

    if (totalWords >= 300) { score += 5; passed.push("Content ≥300 words"); }
    else issues.push(`Content: ${totalWords} words (min: 300)`);

    if (totalWords >= 600) { score += 5; passed.push("Content ≥600 words"); }
    if (totalWords >= 1000) { score += 5; passed.push("Content ≥1000 words"); }

    // Structure (15 points)
    if (blocks.length > 0) { score += 5; passed.push("Has contents blocks"); }
    else issues.push("No contents blocks");

    const hasHeading = blocks.some(b => b.type === 'heading' || b.type === 'hero');
    if (hasHeading) { score += 5; passed.push("Has headings"); }
    else issues.push("No headings found");

    const hasImages = blocks.some(b => b.type === 'image' || b.type === 'gallery');
    if (hasImages) { score += 5; passed.push("Has images"); }
    else issues.push("No images in contents");

    // Keyword (15 points)
    if (primaryKeyword) {
      score += 5;
      passed.push("Primary keyword defined");

      const contentText = blocks.map(b => JSON.stringify(b.data || {})).join(' ').toLowerCase();
      if (contentText.includes(primaryKeyword.toLowerCase())) {
        score += 5;
        passed.push("Keyword in contents");
      } else {
        issues.push("Keyword not found in contents");
      }
    } else {
      issues.push("No primary keyword set");
    }

    // Slug (10 points)
    if (slug) {
      score += 3;
      passed.push("Slug exists");
      if (slug.length <= 75) { score += 3; passed.push("Slug length OK"); }
      if (primaryKeyword && slug.toLowerCase().includes(primaryKeyword.toLowerCase().replace(/\s+/g, '-'))) {
        score += 4;
        passed.push("Keyword in slug");
      }
    } else {
      issues.push("Missing slug");
    }

    return { score, maxScore: 100, percentage: score, issues, passed, totalWords };
  }, [title, metaDescription, heroImage, blocks, primaryKeyword, slug]);

  // Filter blocks by search
  const filteredBlockTypes = useMemo(() => {
    if (!blockSearchQuery.trim()) return blockTypes;
    const query = blockSearchQuery.toLowerCase();
    return blockTypes.filter(bt =>
      bt.label.toLowerCase().includes(query) ||
      bt.description.toLowerCase().includes(query) ||
      bt.type.toLowerCase().includes(query)
    );
  }, [blockSearchQuery]);

  // Context menu handler
  const handleContextMenu = useCallback((e: React.MouseEvent, blockId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, blockId });
    setSelectedBlockId(blockId);
  }, []);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  // Drag and drop sensors
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

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveBlockId(event.active.id as string);
    setSelectedBlockId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setBlocks((items) => {
        pushToHistory(items); // Save before drag reorder
        const oldIndex = items.findIndex((b) => b.id === active.id);
        const newIndex = items.findIndex((b) => b.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        return newItems.map((b, i) => ({ ...b, order: i }));
      });
    }

    setActiveBlockId(null);
  }, [pushToHistory]);

  const activeBlock = activeBlockId ? blocks.find(b => b.id === activeBlockId) : null;

  // Attraction-specific SEO data
  const [attractionSeoData, setAttractionSeoData] = useState({
    introText: "",
    expandedIntroText: "",
    quickInfoBar: [] as QuickInfoItem[],
    highlights: [] as HighlightItem[],
    ticketInfo: [] as TicketInfoItem[],
    essentialInfo: [] as EssentialInfoItem[],
    visitorTips: [] as string[],
    relatedAttractions: [] as RelatedItem[],
    trustSignals: [] as string[],
    primaryCta: "",
    location: "",
    priceFrom: "",
    duration: "",
  });

  // Hotel-specific SEO data
  const [hotelSeoData, setHotelSeoData] = useState({
    location: "",
    starRating: "",
    numberOfRooms: "",
    amenities: [] as string[],
    targetAudience: [] as string[],
    primaryCta: "",
    quickInfoBar: [] as QuickInfoItem[],
    highlights: [] as HighlightItem[],
    roomTypes: [] as any[],
    essentialInfo: [] as EssentialInfoItem[],
    diningPreview: [] as any[],
    activities: [] as string[],
    travelerTips: [] as string[],
    faq: [] as any[],
    locationNearby: [] as any[],
    relatedHotels: [] as RelatedItem[],
    photoGallery: [] as any[],
    trustSignals: [] as string[],
  });

  // Dining-specific SEO data
  const [diningSeoData, setDiningSeoData] = useState({
    location: "",
    cuisineType: "",
    priceRange: "",
    targetAudience: [] as string[],
    primaryCta: "",
    quickInfoBar: [] as QuickInfoItem[],
    highlights: [] as HighlightItem[],
    menuHighlights: [] as any[],
    essentialInfo: [] as EssentialInfoItem[],
    diningTips: [] as string[],
    faq: [] as any[],
    relatedDining: [] as RelatedItem[],
    photoGallery: [] as any[],
    trustSignals: [] as string[],
  });

  // District-specific SEO data
  const [districtSeoData, setDistrictSeoData] = useState({
    location: "",
    neighborhood: "",
    subcategory: "",
    targetAudience: [] as string[],
    primaryCta: "",
    introText: "",
    expandedIntroText: "",
    quickInfoBar: [] as QuickInfoItem[],
    highlights: [] as HighlightItem[],
    thingsToDo: [] as any[],
    attractionsGrid: [] as any[],
    diningHighlights: [] as any[],
    essentialInfo: [] as EssentialInfoItem[],
    localTips: [] as string[],
    faq: [] as any[],
    relatedDistricts: [] as RelatedItem[],
    photoGallery: [] as any[],
    trustSignals: [] as string[],
  });

  const canvasRef = useRef<HTMLDivElement>(null);
  const hasChangedRef = useRef(false);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);

  const { data: contents, isLoading } = useQuery<ContentWithRelations>({
    queryKey: [`/api/contents/${contentId}`],
    enabled: !!contentId,
  });

  // Fetch assigned writer details
  interface AIWriterInfo {
    id: string;
    name: string;
    slug: string;
    avatar: string;
    nationality: string;
    expertise: string[];
    writingStyle: string;
  }
  const { data: assignedWriter } = useQuery<AIWriterInfo>({
    queryKey: ['/api/writers', selectedWriterId],
    queryFn: async () => {
      if (!selectedWriterId) return null;
      const response = await fetch(`/api/writers/${selectedWriterId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!selectedWriterId,
  });

  useEffect(() => {
    if (contents) {
      setTitle(contents.title || "");
      setSlug(contents.slug || "");
      setMetaTitle(contents.metaTitle || "");
      setMetaDescription(contents.metaDescription || "");
      setPrimaryKeyword(contents.primaryKeyword || "");
      setHeroImage(contents.heroImage || "");
      setHeroImageAlt(contents.heroImageAlt || "");
      setStatus(contents.status || "draft");
      
      // Load writer ID if contents has an assigned writer
      if (contents.writerId) {
        setSelectedWriterId(contents.writerId);
      }

      // Load attraction-specific SEO data if it exists
      if (contents.attraction) {
        setAttractionSeoData({
          introText: contents.attraction.introText || "",
          expandedIntroText: contents.attraction.expandedIntroText || "",
          quickInfoBar: contents.attraction.quickInfoBar || [],
          highlights: contents.attraction.highlights || [],
          ticketInfo: contents.attraction.ticketInfo || [],
          essentialInfo: contents.attraction.essentialInfo || [],
          visitorTips: contents.attraction.visitorTips || [],
          relatedAttractions: contents.attraction.relatedAttractions || [],
          trustSignals: contents.attraction.trustSignals || [],
          primaryCta: contents.attraction.primaryCta || "",
          location: contents.attraction.location || "",
          priceFrom: contents.attraction.priceFrom || "",
          duration: contents.attraction.duration || "",
        });
      }

      // Load hotel-specific SEO data if it exists
      if (contents.hotel) {
        setHotelSeoData({
          location: contents.hotel.location || "",
          starRating: contents.hotel.starRating?.toString() || "",
          numberOfRooms: contents.hotel.numberOfRooms?.toString() || "",
          amenities: contents.hotel.amenities || [],
          targetAudience: contents.hotel.targetAudience || [],
          primaryCta: contents.hotel.primaryCta || "",
          quickInfoBar: contents.hotel.quickInfoBar || [],
          highlights: contents.hotel.highlights || [],
          roomTypes: contents.hotel.roomTypes || [],
          essentialInfo: contents.hotel.essentialInfo || [],
          diningPreview: contents.hotel.diningPreview || [],
          activities: contents.hotel.activities || [],
          travelerTips: contents.hotel.travelerTips || [],
          faq: contents.hotel.faq || [],
          locationNearby: contents.hotel.locationNearby || [],
          relatedHotels: contents.hotel.relatedHotels || [],
          photoGallery: contents.hotel.photoGallery || [],
          trustSignals: contents.hotel.trustSignals || [],
        });
      }

      // Load dining-specific SEO data if it exists
      if (contents.dining) {
        setDiningSeoData({
          location: contents.dining.location || "",
          cuisineType: contents.dining.cuisineType || "",
          priceRange: contents.dining.priceRange || "",
          targetAudience: contents.dining.targetAudience || [],
          primaryCta: contents.dining.primaryCta || "",
          quickInfoBar: contents.dining.quickInfoBar || [],
          highlights: contents.dining.highlights || [],
          menuHighlights: contents.dining.menuHighlights || [],
          essentialInfo: contents.dining.essentialInfo || [],
          diningTips: contents.dining.diningTips || [],
          faq: contents.dining.faq || [],
          relatedDining: contents.dining.relatedDining || [],
          photoGallery: contents.dining.photoGallery || [],
          trustSignals: contents.dining.trustSignals || [],
        });
      }

      // Load district-specific SEO data if it exists
      if (contents.district) {
        setDistrictSeoData({
          location: contents.district.location || "",
          neighborhood: contents.district.neighborhood || "",
          subcategory: contents.district.subcategory || "",
          targetAudience: contents.district.targetAudience || [],
          primaryCta: contents.district.primaryCta || "",
          introText: contents.district.introText || "",
          expandedIntroText: contents.district.expandedIntroText || "",
          quickInfoBar: contents.district.quickInfoBar || [],
          highlights: contents.district.highlights || [],
          thingsToDo: contents.district.thingsToDo || [],
          attractionsGrid: contents.district.attractionsGrid || [],
          diningHighlights: contents.district.diningHighlights || [],
          essentialInfo: contents.district.essentialInfo || [],
          localTips: contents.district.localTips || [],
          faq: contents.district.faq || [],
          relatedDistricts: contents.district.relatedDistricts || [],
          photoGallery: contents.district.photoGallery || [],
          trustSignals: contents.district.trustSignals || [],
        });
      }

      // Check if blocks are empty but extension data exists - auto-generate blocks
      const existingBlocks = contents.blocks || [];
      let initialBlocks: ContentBlock[];
      if (existingBlocks.length === 0) {
        const generatedBlocks = generateBlocksFromExtensionData(contents);
        initialBlocks = generatedBlocks.length > 0 ? generatedBlocks : [];
      } else {
        // Ensure all loaded blocks have IDs (blocks saved before ID support might not have them)
        initialBlocks = existingBlocks.map((block, index) => ({
          ...block,
          id: block.id || generateId(),
          order: block.order ?? index,
        }));
      }
      setBlocks(initialBlocks);
      // Initialize history with loaded blocks
      setHistory([JSON.parse(JSON.stringify(initialBlocks))]);
      setHistoryIndex(0);
    } else if (isNew && blocks.length === 0) {
      const newBlocks = defaultTemplateBlocks.map(b => ({ ...b, id: generateId() }));
      setBlocks(newBlocks);
      // Initialize history for new contents
      setHistory([JSON.parse(JSON.stringify(newBlocks))]);
      setHistoryIndex(0);
    }
  }, [contents, isNew]);

  // Register tab for multi-tab editing
  useEffect(() => {
    if (contents?.title || title) {
      registerTab();
      updateTitle(contents?.title || title || "Untitled");
    }
  }, [contents?.title, contentId]);

  // Update tab title when title changes
  useEffect(() => {
    if (title) {
      updateTitle(title);
    }
  }, [title, updateTitle]);

  // Mark tab as dirty when contents changes
  useEffect(() => {
    if (hasChangedRef.current) {
      markDirty(true);
    }
  }, [title, slug, blocks, markDirty]);

  // Autosave effect - debounce changes and auto-save after 30 seconds of inactivity
  useEffect(() => {
    // Skip on initial load
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }

    // Only autosave for existing draft contents
    if (!contentId || status !== "draft") {
      return;
    }

    // Mark as changed
    hasChangedRef.current = true;

    // Clear existing timer
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    // Set new timer for 30 seconds
    autosaveTimerRef.current = setTimeout(() => {
      if (hasChangedRef.current && status === "draft" && !saveMutation.isPending && !autosaveMutation.isPending) {
        setAutosaveStatus("saving");
        const currentWordCount = blocks.reduce((count, block) => {
          if (block.type === "text" && typeof block.data?.contents === "string") {
            return count + block.data.contents.split(/\s+/).filter(Boolean).length;
          }
          return count;
        }, 0);

        const autosaveData: Record<string, unknown> = {
          title,
          slug: slug || generateSlug(title),
          metaTitle,
          metaDescription,
          primaryKeyword,
          heroImage,
          heroImageAlt,
          blocks,
          wordCount: currentWordCount,
          status,
        };

        // Include contents-type-specific SEO data (use property names expected by backend)
        if (contentType === "attraction") {
          autosaveData.attraction = attractionSeoData;
        } else if (contentType === "hotel") {
          autosaveData.hotel = hotelSeoData;
        } else if (contentType === "dining") {
          autosaveData.dining = diningSeoData;
        } else if (contentType === "district") {
          autosaveData.district = districtSeoData;
        }

        autosaveMutation.mutate(autosaveData);
      }
    }, 30000);

    // Cleanup on unmount or before next effect
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [title, slug, metaTitle, metaDescription, primaryKeyword, heroImage, heroImageAlt, blocks, status, contentId, contentType, attractionSeoData, hotelSeoData, diningSeoData, districtSeoData]);

  // Generate blocks from attraction/hotel/article extension data
  // Blocks use simple string contents (one item per line) for tips, highlights, info_grid
  function generateBlocksFromExtensionData(contents: ContentWithRelations): ContentBlock[] {
    const blocks: ContentBlock[] = [];
    let order = 0;

    // Add hero block if heroImage exists
    if (contents.heroImage) {
      blocks.push({
        id: generateId(),
        type: "hero",
        data: { image: contents.heroImage, alt: contents.heroImageAlt || contents.title, title: contents.title },
        order: order++,
      });
    }

    // Add intro text block if metaDescription exists
    if (contents.metaDescription) {
      blocks.push({
        id: generateId(),
        type: "text",
        data: { contents: contents.metaDescription },
        order: order++,
      });
    }

    // Handle attraction-specific data
    if (contents.attraction) {
      const attraction = contents.attraction;
      
      // Add expanded intro if available
      if (attraction.expandedIntroText) {
        blocks.push({
          id: generateId(),
          type: "text",
          data: { contents: attraction.expandedIntroText },
          order: order++,
        });
      }

      // Add highlights block - convert HighlightItem[] to string contents (one per line)
      if (attraction.highlights && attraction.highlights.length > 0) {
        const highlightsContent = attraction.highlights
          .map(h => `${h.title}: ${h.description}`)
          .join("\n");
        blocks.push({
          id: generateId(),
          type: "highlights",
          data: { contents: highlightsContent },
          order: order++,
        });
      }

      // Add gallery if available - convert to images array with url/alt
      if (attraction.gallery && attraction.gallery.length > 0) {
        blocks.push({
          id: generateId(),
          type: "gallery",
          data: { images: attraction.gallery.map(g => ({ url: g.image, alt: g.alt })) },
          order: order++,
        });
      }

      // Add visitor tips - convert string[] to string contents (one per line)
      if (attraction.visitorTips && attraction.visitorTips.length > 0) {
        blocks.push({
          id: generateId(),
          type: "tips",
          data: { contents: attraction.visitorTips.join("\n") },
          order: order++,
        });
      }

      // Add insider tips as additional tips block
      if (attraction.insiderTips && attraction.insiderTips.length > 0) {
        blocks.push({
          id: generateId(),
          type: "tips",
          data: { contents: attraction.insiderTips.join("\n") },
          order: order++,
        });
      }

      // Add FAQ blocks
      if (attraction.faq && attraction.faq.length > 0) {
        attraction.faq.forEach((faqItem) => {
          blocks.push({
            id: generateId(),
            type: "faq",
            data: { question: faqItem.question, answer: faqItem.answer },
            order: order++,
          });
        });
      }

      // Add CTA if primaryCta exists
      if (attraction.primaryCta) {
        blocks.push({
          id: generateId(),
          type: "cta",
          data: { text: attraction.primaryCta, url: "" },
          order: order++,
        });
      }
    }

    // Handle hotel-specific data
    if (contents.hotel) {
      const hotel = contents.hotel;

      // Add highlights block - convert HighlightItem[] to string contents
      if (hotel.highlights && hotel.highlights.length > 0) {
        const highlightsContent = hotel.highlights
          .map(h => `${h.title}: ${h.description}`)
          .join("\n");
        blocks.push({
          id: generateId(),
          type: "highlights",
          data: { contents: highlightsContent },
          order: order++,
        });
      }

      // Add amenities as info grid - convert string[] to string contents (one per line)
      if (hotel.amenities && hotel.amenities.length > 0) {
        blocks.push({
          id: generateId(),
          type: "info_grid",
          data: { contents: hotel.amenities.join("\n") },
          order: order++,
        });
      }

      // Add photo gallery - convert to images array with url/alt
      if (hotel.photoGallery && hotel.photoGallery.length > 0) {
        blocks.push({
          id: generateId(),
          type: "gallery",
          data: { images: hotel.photoGallery.map(g => ({ url: g.image, alt: g.alt })) },
          order: order++,
        });
      }

      // Add traveler tips - convert string[] to string contents
      if (hotel.travelerTips && hotel.travelerTips.length > 0) {
        blocks.push({
          id: generateId(),
          type: "tips",
          data: { contents: hotel.travelerTips.join("\n") },
          order: order++,
        });
      }

      // Add FAQ blocks
      if (hotel.faq && hotel.faq.length > 0) {
        hotel.faq.forEach((faqItem) => {
          blocks.push({
            id: generateId(),
            type: "faq",
            data: { question: faqItem.question, answer: faqItem.answer },
            order: order++,
          });
        });
      }

      // Add CTA if primaryCta exists
      if (hotel.primaryCta) {
        blocks.push({
          id: generateId(),
          type: "cta",
          data: { text: hotel.primaryCta, url: "" },
          order: order++,
        });
      }
    }

    // Handle article-specific data
    if (contents.article) {
      const article = contents.article;

      // Add quick facts as text block
      if (article.quickFacts && article.quickFacts.length > 0) {
        blocks.push({
          id: generateId(),
          type: "text",
          data: { contents: article.quickFacts.map(f => `- ${f}`).join("\n") },
          order: order++,
        });
      }

      // Add pro tips - convert string[] to string contents
      if (article.proTips && article.proTips.length > 0) {
        blocks.push({
          id: generateId(),
          type: "tips",
          data: { contents: article.proTips.join("\n") },
          order: order++,
        });
      }

      // Add warnings as tips
      if (article.warnings && article.warnings.length > 0) {
        blocks.push({
          id: generateId(),
          type: "tips",
          data: { contents: article.warnings.join("\n") },
          order: order++,
        });
      }

      // Add FAQ blocks
      if (article.faq && article.faq.length > 0) {
        article.faq.forEach((faqItem) => {
          blocks.push({
            id: generateId(),
            type: "faq",
            data: { question: faqItem.question, answer: faqItem.answer },
            order: order++,
          });
        });
      }
    }

    return blocks;
  }

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      if (contentId) {
        const res = await apiRequest("PATCH", `/api/contents/${contentId}`, data);
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/contents", { ...data, type: contentType });
        return res.json();
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contents"] });
      queryClient.invalidateQueries({ queryKey: [`/api/contents?type=${contentType}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Saved", description: "Your contents has been saved." });
      hasChangedRef.current = false;
      if (isNew && result?.id) {
        navigate(`/admin/${contentType}s/${result.id}`);
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save contents.", variant: "destructive" });
    },
  });

  const autosaveMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      if (!contentId) return null;
      const res = await apiRequest("PATCH", `/api/contents/${contentId}`, data);
      return res.json();
    },
    onSuccess: () => {
      hasChangedRef.current = false;
      setAutosaveStatus("saved");
      const now = new Date();
      setLastAutosaveTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      queryClient.invalidateQueries({ queryKey: [`/api/contents/${contentId}`] });
      setTimeout(() => setAutosaveStatus("idle"), 3000);
    },
    onError: () => {
      setAutosaveStatus("idle");
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      if (contentId) {
        const res = await apiRequest("PATCH", `/api/contents/${contentId}`, data);
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/contents", { ...data, type: contentType });
        return res.json();
      }
    },
    onSuccess: (result) => {
      setStatus("published");
      // Invalidate admin contents caches
      queryClient.invalidateQueries({ queryKey: ["/api/contents"] });
      queryClient.invalidateQueries({ queryKey: [`/api/contents?type=${contentType}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      // Invalidate public contents caches so published contents appears immediately
      queryClient.invalidateQueries({ queryKey: ["/api/public/contents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/contents?includeExtensions=true"] });
      // Invalidate specific slug cache if editing existing contents
      if (slug) {
        queryClient.invalidateQueries({ queryKey: ["/api/contents/slug", slug] });
      }
      toast({ title: "Published", description: "Your contents is now live." });
      if (isNew && result?.id) {
        navigate(`/admin/${contentType}s/${result.id}`);
      }
    },
    onError: () => {
      toast({ title: "Publish Failed", description: "Failed to publish contents.", variant: "destructive" });
    },
  });

  // Approval Workflow Mutations
  const submitForReviewMutation = useMutation({
    mutationFn: async () => {
      if (!contentId) return null;
      const res = await apiRequest("PATCH", `/api/contents/${contentId}`, { status: "in_review" });
      return res.json();
    },
    onSuccess: () => {
      setStatus("in_review");
      queryClient.invalidateQueries({ queryKey: [`/api/contents/${contentId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/contents"] });
      queryClient.invalidateQueries({ queryKey: [`/api/contents?type=${contentType}`] });
      toast({ title: "Submitted for Review", description: "Your contents has been submitted for editorial review." });
    },
    onError: () => {
      toast({ title: "Submission Failed", description: "Failed to submit contents for review.", variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!contentId) return null;
      const res = await apiRequest("PATCH", `/api/contents/${contentId}`, { status: "approved" });
      return res.json();
    },
    onSuccess: () => {
      setStatus("approved");
      queryClient.invalidateQueries({ queryKey: [`/api/contents/${contentId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/contents"] });
      queryClient.invalidateQueries({ queryKey: [`/api/contents?type=${contentType}`] });
      toast({ title: "Approved", description: "Content has been approved and is ready to publish." });
    },
    onError: () => {
      toast({ title: "Approval Failed", description: "Failed to approve contents.", variant: "destructive" });
    },
  });

  const requestChangesMutation = useMutation({
    mutationFn: async () => {
      if (!contentId) return null;
      const res = await apiRequest("PATCH", `/api/contents/${contentId}`, { status: "draft" });
      return res.json();
    },
    onSuccess: () => {
      setStatus("draft");
      queryClient.invalidateQueries({ queryKey: [`/api/contents/${contentId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/contents"] });
      queryClient.invalidateQueries({ queryKey: [`/api/contents?type=${contentType}`] });
      toast({ title: "Changes Requested", description: "Content returned to draft status for revisions." });
    },
    onError: () => {
      toast({ title: "Request Failed", description: "Failed to request changes.", variant: "destructive" });
    },
  });

  const aiImageMutation = useMutation({
    mutationFn: async (data: { blockId: string; blockType: "hero" | "image" }) => {
      const isHero = data.blockType === "hero";
      const res = await apiRequest("POST", "/api/ai/generate-images", {
        contentType,
        title: title || "Dubai Travel",
        description: primaryKeyword || metaDescription,
        generateHero: isHero,
        generateContentImages: !isHero,
        contentImageCount: isHero ? 0 : 3,
      });
      return res.json();
    },
    onSuccess: (result, variables) => {
      const images = result.images as Array<{ url: string; alt: string; type: string }> | undefined;
      if (images && images.length > 0) {
        setImageGenerationDialog({
          open: true,
          blockId: variables.blockId,
          images: images.map(img => ({ url: img.url, alt: img.alt || `${title} image` })),
        });
      } else {
        toast({ title: "No Images", description: "AI could not generate images.", variant: "destructive" });
      }
      setImageGeneratingBlock(null);
    },
    onError: (error: Error) => {
      const message = error.message?.includes("API_NOT_CONFIGURED") || error.message?.includes("not configured")
        ? "Image generation API not configured. Please add OPENAI_API_KEY or REPLICATE_API_KEY."
        : "Failed to generate images. Check server logs for details.";
      toast({ title: "Generation Failed", description: message, variant: "destructive" });
      setImageGeneratingBlock(null);
    },
  });

  const aiGenerateMutation = useMutation({
    mutationFn: async (input: string) => {
      const endpoint =
        contentType === "hotel" ? "/api/ai/generate-hotel" :
        contentType === "attraction" ? "/api/ai/generate-attraction" :
        contentType === "dining" ? "/api/ai/generate-dining" :
        contentType === "district" ? "/api/ai/generate-district" :
        // TEMPORARILY DISABLED: transport, event, and itinerary will be enabled later
        // contentType === "transport" ? "/api/ai/generate-transport" :
        // contentType === "event" ? "/api/ai/generate-event" :
        // contentType === "itinerary" ? "/api/ai/generate-itinerary" :
        "/api/ai/generate-article";

      // Build request body with primaryKeyword for better SEO
      const body = contentType === "article"
        ? { topic: input, primaryKeyword: primaryKeyword || input }
        : { name: input, primaryKeyword: primaryKeyword || input };
      // Note: When itinerary is re-enabled, use: contentType === "itinerary" ? { duration: input } : { name: input }

      const res = await apiRequest("POST", endpoint, body);
      return res.json();
    },
    onSuccess: (result) => {
      if (result.contents) {
        setTitle(result.contents.title || "");
        setSlug(result.contents.slug || "");
        setMetaTitle(result.contents.metaTitle || "");
        setMetaDescription(result.contents.metaDescription || "");
        setPrimaryKeyword(result.contents.primaryKeyword || "");
        if (result.contents.heroImage) setHeroImage(result.contents.heroImage);
        setHeroImageAlt(result.contents.heroImageAlt || "");

        // Process blocks - expand FAQ and Tips blocks that have arrays
        let processedBlocks: ContentBlock[] = [];
        let orderIndex = 0;
        const rawBlocks = Array.isArray(result.contents.blocks) ? result.contents.blocks : [];

        for (const block of rawBlocks) {
          // Handle FAQ blocks with faqs array
          if (block.type === "faq" && Array.isArray(block.data?.faqs)) {
            for (const faqItem of block.data.faqs) {
              processedBlocks.push({
                id: `faq-${Math.random().toString(36).substring(2, 9)}`,
                type: "faq",
                data: { question: faqItem.question || "", answer: faqItem.answer || "" },
                order: orderIndex++,
              });
            }
          }
          // Handle tips blocks with tips array
          else if (block.type === "tips" && Array.isArray(block.data?.tips)) {
            processedBlocks.push({
              id: block.id || `tips-${Math.random().toString(36).substring(2, 9)}`,
              type: "tips",
              data: { contents: block.data.tips.join("\n") },
              order: orderIndex++,
            });
          }
          // Handle highlights blocks with items array
          else if (block.type === "highlights" && Array.isArray(block.data?.items)) {
            const items = block.data.items.map((item: string | { title?: string; description?: string }) =>
              typeof item === "string" ? item : `${item.title || ""}: ${item.description || ""}`
            );
            processedBlocks.push({
              id: block.id || `highlights-${Math.random().toString(36).substring(2, 9)}`,
              type: "highlights",
              data: { contents: items.join("\n") },
              order: orderIndex++,
            });
          }
          // Keep other blocks as-is
          else {
            processedBlocks.push({
              ...block,
              id: block.id || `block-${Math.random().toString(36).substring(2, 9)}`,
              order: orderIndex++,
            });
          }
        }

        setBlocks(processedBlocks);
      }

      // Populate attraction-specific SEO data if available
      if (result.attraction && contentType === "attraction") {
        setAttractionSeoData({
          introText: result.attraction.introText || "",
          expandedIntroText: result.attraction.expandedIntroText || "",
          quickInfoBar: result.attraction.quickInfoBar || [],
          highlights: result.attraction.highlights || [],
          ticketInfo: result.attraction.ticketInfo || [],
          essentialInfo: result.attraction.essentialInfo || [],
          visitorTips: result.attraction.visitorTips || [],
          relatedAttractions: result.attraction.relatedAttractions || result.attraction.nearbyAttractions || [],
          trustSignals: result.attraction.trustSignals || [],
          primaryCta: result.attraction.primaryCta || "",
          location: result.attraction.location || "",
          priceFrom: result.attraction.priceFrom || "",
          duration: result.attraction.duration || "",
        });
      }

      // Populate hotel-specific SEO data if available
      if (result.hotel && contentType === "hotel") {
        setHotelSeoData(prev => ({
          ...prev,
          quickInfoBar: result.hotel.quickInfoBar || prev.quickInfoBar,
          highlights: result.hotel.highlights || prev.highlights,
          roomTypes: result.hotel.roomTypes || prev.roomTypes,
          amenities: result.hotel.amenities || prev.amenities,
          trustSignals: result.hotel.trustSignals || prev.trustSignals,
          primaryCta: result.hotel.primaryCta || prev.primaryCta,
          location: result.hotel.location || prev.location,
          starRating: result.hotel.starRating || prev.starRating,
        }));
      }

      // Populate dining-specific SEO data if available
      if (result.dining && contentType === "dining") {
        setDiningSeoData(prev => ({
          ...prev,
          quickInfoBar: result.dining.quickInfoBar || prev.quickInfoBar,
          highlights: result.dining.highlights || prev.highlights,
          menuHighlights: result.dining.menuHighlights || prev.menuHighlights,
          trustSignals: result.dining.trustSignals || prev.trustSignals,
          primaryCta: result.dining.primaryCta || prev.primaryCta,
          location: result.dining.location || prev.location,
          priceRange: result.dining.priceRange || prev.priceRange,
          cuisineType: result.dining.cuisineType || prev.cuisineType,
        }));
      }

      // Populate district-specific SEO data if available
      if (result.district && contentType === "district") {
        setDistrictSeoData(prev => ({
          ...prev,
          introText: result.district.introText || prev.introText,
          expandedIntroText: result.district.expandedIntroText || prev.expandedIntroText,
          quickInfoBar: result.district.quickInfoBar || prev.quickInfoBar,
          highlights: result.district.highlights || prev.highlights,
          thingsToDo: result.district.topAttractions || prev.thingsToDo,
          diningHighlights: result.district.diningOptions || prev.diningHighlights,
          trustSignals: result.district.trustSignals || prev.trustSignals,
          primaryCta: result.district.primaryCta || prev.primaryCta,
          location: result.district.location || prev.location,
        }));
      }

      setAiGenerateDialogOpen(false);
      setAiGenerateInput("");
      toast({ title: "Generated", description: "AI contents generated. Review and edit as needed." });
    },
    onError: (error: Error) => {
      toast({ title: "Generation Failed", description: error.message || "Failed to generate contents.", variant: "destructive" });
    },
  });

  // Generate individual sections (FAQ, Tips, Highlights) when empty
  const [generatingSectionId, setGeneratingSectionId] = useState<string | null>(null);

  const generateSectionMutation = useMutation({
    mutationFn: async ({ sectionType, blockId }: { sectionType: string; blockId: string }) => {
      // Collect existing contents for context
      const existingContent = blocks
        .filter(b => b.type === "text" || b.type === "hero")
        .map(b => b.data?.contents || b.data?.title || "")
        .join("\n");

      const res = await apiRequest("POST", "/api/ai/generate-section", {
        sectionType,
        title: title || "Dubai Attraction",
        existingContent,
        contentType,
      });
      return { result: await res.json(), sectionType, blockId };
    },
    onSuccess: ({ result, sectionType, blockId }) => {
      if (sectionType === "faq" && result.faqs) {
        // Replace the empty FAQ block with generated FAQs
        const newBlocks = blocks.filter(b => b.id !== blockId);
        let orderIndex = newBlocks.length;
        const faqBlocks = result.faqs.map((faq: { question: string; answer: string }) => ({
          id: `faq-${Math.random().toString(36).substring(2, 9)}`,
          type: "faq" as const,
          data: { question: faq.question, answer: faq.answer },
          order: orderIndex++,
        }));
        setBlocks([...newBlocks, ...faqBlocks]);
        toast({ title: "FAQ Generated", description: `Generated ${result.faqs.length} FAQ items.` });
      } else if (sectionType === "tips" && result.tips) {
        // Update the tips block with generated contents
        updateBlock(blockId, { contents: result.tips.join("\n") });
        toast({ title: "Tips Generated", description: `Generated ${result.tips.length} tips.` });
      } else if (sectionType === "highlights" && result.highlights) {
        // Update the highlights block with generated contents
        const highlightText = result.highlights
          .map((h: { title: string; description: string }) => `${h.title}: ${h.description}`)
          .join("\n");
        updateBlock(blockId, { contents: highlightText });
        toast({ title: "Highlights Generated", description: `Generated ${result.highlights.length} highlights.` });
      }
      setGeneratingSectionId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Generation Failed", description: error.message || "Failed to generate section.", variant: "destructive" });
      setGeneratingSectionId(null);
    },
  });

  const handleGenerateSection = (sectionType: string, blockId: string) => {
    if (!title) {
      toast({ title: "Title Required", description: "Please enter a title before generating sections.", variant: "destructive" });
      return;
    }
    setGeneratingSectionId(blockId);
    generateSectionMutation.mutate({ sectionType, blockId });
  };

  const { data: versions = [], isLoading: isLoadingVersions } = useQuery<ContentVersion[]>({
    queryKey: [`/api/contents/${contentId}/versions`],
    enabled: !!contentId && versionHistoryOpen,
  });

  const restoreMutation = useMutation({
    mutationFn: async (versionId: string) => {
      const res = await apiRequest("POST", `/api/contents/${contentId}/versions/${versionId}/restore`);
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [`/api/contents/${contentId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/contents/${contentId}/versions`] });
      setVersionHistoryOpen(false);
      setSelectedVersion(null);
      if (result) {
        setTitle(result.title || "");
        setSlug(result.slug || "");
        setMetaTitle(result.metaTitle || "");
        setMetaDescription(result.metaDescription || "");
        setPrimaryKeyword(result.primaryKeyword || "");
        setHeroImage(result.heroImage || "");
        setHeroImageAlt(result.heroImageAlt || "");
        // Ensure all restored blocks have IDs
        const restoredBlocks = (result.blocks || []).map((block: ContentBlock, index: number) => ({
          ...block,
          id: block.id || generateId(),
          order: block.order ?? index,
        }));
        setBlocks(restoredBlocks);
        setStatus(result.status || "draft");
      }
      toast({ title: "Restored", description: "Content restored from previous version." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to restore version.", variant: "destructive" });
    },
  });

  // Word count - use same logic as SEO calculation for consistency
  const wordCount = useMemo(() => {
    const allText = blocks.map(b => {
      if (b.type === "text") return String(b.data?.contents || '');
      if (b.type === "hero") return String(b.data?.title || '');
      if (b.type === "faq" && b.data?.faqs) {
        return (b.data.faqs as Array<{question?: string; answer?: string}>)
          .map(f => `${f.question || ''} ${f.answer || ''}`).join(' ');
      }
      if (b.type === "highlights" && b.data?.items) {
        return (b.data.items as Array<{title?: string; description?: string}>)
          .map(i => `${i.title || ''} ${i.description || ''}`).join(' ');
      }
      if (b.type === "tips" && b.data?.tips) {
        return (b.data.tips as string[]).join(' ');
      }
      if (b.type === "cta") return String(b.data?.text || '');
      return '';
    }).join(' ');
    return allText.split(/\s+/).filter(w => w.length > 0).length;
  }, [blocks]);

  const seoContentText = useMemo(() => {
    return blocks.map(b => {
      if (b.type === "text") return (b.data?.contents as string) || "";
      if (b.type === "faq") return `${(b.data?.question as string) || ""} ${(b.data?.answer as string) || ""}`;
      if (b.type === "hero") return (b.data?.title as string) || "";
      if (b.type === "cta") return (b.data?.text as string) || "";
      if (b.type === "highlights" || b.type === "tips" || b.type === "info_grid") {
        if (typeof b.data?.contents === "string") return b.data.contents;
        if (Array.isArray(b.data?.items)) {
          return (b.data.items as Array<string | { title?: string; description?: string; text?: string }>)
            .map(item => {
              if (typeof item === "string") return item;
              return `${item.title || ""} ${item.description || ""} ${item.text || ""}`;
            }).join(" ");
        }
        return "";
      }
      return "";
    }).join(" ");
  }, [blocks]);

  const seoHeadings = useMemo(() => {
    const headings: { level: number; text: string }[] = [];
    if (title) headings.push({ level: 1, text: title });
    blocks.forEach(b => {
      if (b.type === "text" && b.data?.heading) {
        headings.push({ level: 2, text: (b.data.heading as string) || "" });
      }
    });
    return headings;
  }, [blocks, title]);

  const seoImages = useMemo(() => {
    const images: { url: string; alt: string }[] = [];
    if (heroImage) {
      images.push({ url: heroImage, alt: heroImageAlt || "" });
    }
    blocks.forEach(b => {
      if (b.type === "hero" && b.data?.image) {
        images.push({ url: (b.data.image as string) || "", alt: (b.data.alt as string) || "" });
      }
      if (b.type === "image" && b.data?.image) {
        images.push({ url: (b.data.image as string) || "", alt: (b.data.alt as string) || "" });
      }
      if (b.type === "gallery" && Array.isArray(b.data?.images)) {
        (b.data.images as Array<{ url: string; alt: string }>).forEach(img => {
          images.push({ url: img.url || "", alt: img.alt || "" });
        });
      }
    });
    return images;
  }, [blocks, heroImage, heroImageAlt]);

  // Handler for SEO auto-fix results
  const handleSeoAutoFix = useCallback((fixedData: Record<string, unknown>) => {
    if (fixedData.metaTitle) setMetaTitle(fixedData.metaTitle as string);
    if (fixedData.metaDescription) setMetaDescription(fixedData.metaDescription as string);
    if (fixedData.primaryKeyword) setPrimaryKeyword(fixedData.primaryKeyword as string);
    if (fixedData.heroAlt) setHeroImageAlt(fixedData.heroAlt as string);
    if (fixedData.slug) setSlug(fixedData.slug as string);
    toast({ title: "SEO Auto-Fixed", description: "Fields have been automatically updated." });
  }, [toast]);

  // Handler for SEO validation complete
  const handleSeoValidationComplete = useCallback((canPublishResult: boolean) => {
    setSeoCanPublish(canPublishResult);
  }, []);

  const handleSave = () => {
    const saveData: Record<string, unknown> = {
      title,
      slug: slug || generateSlug(title),
      metaTitle,
      metaDescription,
      primaryKeyword,
      heroImage,
      heroImageAlt,
      blocks,
      wordCount,
      status,
    };

    // Include scheduled date if status is scheduled
    if (status === "scheduled" && scheduledDate) {
      saveData.scheduledAt = scheduledDate.toISOString();
    }

    // Include contents-type-specific SEO data (use property names expected by backend)
    if (contentType === "attraction") {
      saveData.attraction = attractionSeoData;
    } else if (contentType === "hotel") {
      saveData.hotel = hotelSeoData;
    } else if (contentType === "dining") {
      saveData.dining = diningSeoData;
    } else if (contentType === "district") {
      saveData.district = districtSeoData;
    }

    saveMutation.mutate(saveData);
  };

  const handlePublish = () => {
    // Approval workflow: Block publishing unless contents is approved
    if (status !== "approved" && status !== "published" && status !== "scheduled") {
      toast({
        title: "Cannot Publish",
        description: "Content must be approved before publishing. Submit for review first.",
        variant: "destructive",
      });
      return;
    }

    const publishData: Record<string, unknown> = {
      title,
      slug: slug || generateSlug(title),
      metaTitle,
      metaDescription,
      primaryKeyword,
      heroImage,
      heroImageAlt,
      blocks,
      wordCount,
      status: "published",
      publishedAt: new Date().toISOString(),
    };

    // Include contents-type-specific SEO data (use property names expected by backend)
    if (contentType === "attraction") {
      publishData.attraction = attractionSeoData;
    } else if (contentType === "hotel") {
      publishData.hotel = hotelSeoData;
    } else if (contentType === "dining") {
      publishData.dining = diningSeoData;
    } else if (contentType === "district") {
      publishData.district = districtSeoData;
    }

    publishMutation.mutate(publishData);
  };

  const getDefaultBlockData = (type: ContentBlock["type"]): Record<string, unknown> => {
    switch (type) {
      case "hero":
        return { image: "", alt: "", title: "" };
      case "heading":
        return { text: "", level: "h2" };
      case "text":
        return { contents: "" };
      case "image":
        return { image: "", alt: "", caption: "" };
      case "gallery":
        return { images: [] };
      case "faq":
        return { question: "", answer: "" };
      case "cta":
        return { text: "Learn More", url: "", style: "primary" };
      case "info_grid":
        return { contents: "" };
      case "highlights":
        return { contents: "" };
      case "tips":
        return { contents: "" };
      case "video":
        return { url: "", caption: "", provider: "youtube" };
      case "quote":
        return { text: "", author: "", role: "" };
      case "divider":
        return { style: "line" };
      case "spacer":
        return { height: 40 };
      case "map":
        return { address: "", lat: 25.2048, lng: 55.2708, zoom: 14 }; // Dubai default
      case "social":
        return { links: [] };
      case "accordion":
        return { items: [{ title: "", contents: "" }] };
      case "tabs":
        return { tabs: [{ title: "Tab 1", contents: "" }] };
      case "columns":
        return { left: "", right: "" };
      case "html":
        return { code: "" };
      default:
        return {};
    }
  };

  const addBlock = (type: ContentBlock["type"], insertAfterIndex?: number) => {
    pushToHistory(blocks); // Save before adding
    const newBlock: ContentBlock = {
      id: generateId(),
      type,
      data: getDefaultBlockData(type),
      order: blocks.length,
    };
    if (insertAfterIndex !== undefined) {
      const newBlocks = [...blocks];
      newBlocks.splice(insertAfterIndex + 1, 0, newBlock);
      setBlocks(newBlocks.map((b, i) => ({ ...b, order: i })));
    } else {
      setBlocks([...blocks, newBlock]);
    }
    setSelectedBlockId(newBlock.id ?? null);
  };

  // Track last history push time for debouncing text updates
  const lastHistoryPushRef = useRef<number>(0);
  const historyDebounceMs = 500;

  const updateBlock = (id: string, data: Record<string, unknown>) => {
    const newBlocks = blocks.map((b) => (b.id === id ? { ...b, data: { ...b.data, ...data } } : b));
    // Debounce history push for text updates
    const now = Date.now();
    if (now - lastHistoryPushRef.current > historyDebounceMs) {
      pushToHistory(blocks); // Save current state before change
      lastHistoryPushRef.current = now;
    }
    setBlocks(newBlocks);
  };

  const removeBlock = (id: string) => {
    pushToHistory(blocks); // Save before delete
    setBlocks(blocks.filter((b) => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  const duplicateBlock = (id: string) => {
    const blockIndex = blocks.findIndex((b) => b.id === id);
    if (blockIndex !== -1) {
      pushToHistory(blocks); // Save before duplicate
      const block = blocks[blockIndex];
      const newBlock: ContentBlock = {
        ...block,
        id: generateId(),
        order: blockIndex + 1,
      };
      const newBlocks = [...blocks];
      newBlocks.splice(blockIndex + 1, 0, newBlock);
      setBlocks(newBlocks.map((b, i) => ({ ...b, order: i })));
      setSelectedBlockId(newBlock.id ?? null);
    }
  };

  const moveBlock = (id: string, direction: "up" | "down") => {
    const index = blocks.findIndex((b) => b.id === id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < blocks.length) {
      pushToHistory(blocks); // Save before move
      const newBlocks = [...blocks];
      [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
      setBlocks(newBlocks.map((b, i) => ({ ...b, order: i })));
    }
  };

  const handleGenerateImage = (blockId: string, blockType: "hero" | "image") => {
    if (!title.trim()) {
      toast({ title: "Title Required", description: "Please enter a title before generating images.", variant: "destructive" });
      return;
    }
    setImageGeneratingBlock(blockId);
    aiImageMutation.mutate({ blockId, blockType });
  };

  const selectGeneratedImage = (url: string, alt: string) => {
    if (imageGenerationDialog.blockId) {
      updateBlock(imageGenerationDialog.blockId, { image: url, alt });
      toast({ title: "Image Selected", description: "Image added to block." });
    }
    setImageGenerationDialog({ open: false, blockId: null, images: [] });
  };

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setSelectedBlockId(null);
    }
  };

  if (contentId && isLoading) {
    return (
      <div className="h-[calc(100vh-100px)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    );
  }

  if (previewMode) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <div className="flex items-center justify-between gap-4 p-3 border-b">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setPreviewMode(null)} data-testid="button-close-preview">
              <X className="h-4 w-4" />
            </Button>
            <span className="font-medium">Preview: {title || "Untitled"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={previewMode === "desktop" ? "default" : "outline"} size="sm" onClick={() => setPreviewMode("desktop")} data-testid="button-preview-desktop">
              <Monitor className="h-4 w-4 mr-1" />
              Desktop
            </Button>
            <Button variant={previewMode === "mobile" ? "default" : "outline"} size="sm" onClick={() => setPreviewMode("mobile")} data-testid="button-preview-mobile">
              <Smartphone className="h-4 w-4 mr-1" />
              Mobile
            </Button>
          </div>
        </div>
        <div className="flex justify-center p-8 bg-muted min-h-[calc(100vh-65px)] overflow-auto">
          <div className={`bg-background rounded-lg shadow-lg overflow-auto ${previewMode === "mobile" ? "w-[375px]" : "w-full max-w-4xl"}`}>
            <div className="space-y-0">
              {blocks.map((block) => (
                <PreviewBlock key={block.id} block={block} title={title} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col">
      {/* Top toolbar */}
      <div className="flex items-center justify-between gap-4 px-4 py-2 border-b bg-background shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/${contentType}s`)} data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)} data-testid="button-toggle-panel">
            <PanelLeft className="h-4 w-4" />
          </Button>

          {/* Undo/Redo Controls */}
          <div className="flex items-center border rounded-md">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-r-none" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
              <Undo2 className="h-4 w-4" />
            </Button>
            <div className="w-px h-4 bg-border" />
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-l-none" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)">
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={status as "draft" | "in_review" | "approved" | "scheduled" | "published"} />
          </div>

          {/* Assigned Writer Display */}
          {assignedWriter && (
            <div className="flex items-center gap-2 px-2 py-1 bg-muted rounded-md" data-testid="assigned-writer-badge">
              <div className="flex items-center gap-2">
                {assignedWriter.avatar ? (
                  <img 
                    src={assignedWriter.avatar} 
                    alt={assignedWriter.name}
                    className="h-6 w-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                    {assignedWriter.name.charAt(0)}
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-xs font-medium">{assignedWriter.name}</span>
                  <span className="text-[10px] text-muted-foreground">{assignedWriter.writingStyle}</span>
                </div>
              </div>
            </div>
          )}

          {/* Content Locking Indicator - Shows when other editors are working on this contents */}
          {contentId && !isNew && (
            <ContentLockIndicator contentId={contentId} />
          )}

        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setAiGenerateDialogOpen(true)} data-testid="button-generate-ai">
            <Sparkles className="h-4 w-4 mr-2" />
            AI Generate
          </Button>
          {/* Enhanced Preview with Device Toggle */}
          <div className="flex items-center border rounded-md">
            <Button
              variant={showPreview ? "secondary" : "ghost"}
              size="sm"
              className="rounded-r-none gap-1.5"
              onClick={() => setShowPreview(!showPreview)}
              data-testid="button-preview"
            >
              {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showPreview ? "Exit" : "Preview"}
            </Button>
            {showPreview && (
              <>
                <div className="w-px h-6 bg-border" />
                <Button
                  variant={previewDevice === "desktop" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8 rounded-none"
                  onClick={() => setPreviewDevice("desktop")}
                  title="Desktop"
                >
                  <Monitor className="h-4 w-4" />
                </Button>
                <Button
                  variant={previewDevice === "tablet" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8 rounded-none"
                  onClick={() => setPreviewDevice("tablet")}
                  title="Tablet"
                >
                  <Tablet className="h-4 w-4" />
                </Button>
                <Button
                  variant={previewDevice === "mobile" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8 rounded-l-none"
                  onClick={() => setPreviewDevice("mobile")}
                  title="Mobile"
                >
                  <Smartphone className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
          {contentId && (
            <Button variant="outline" size="sm" onClick={() => setVersionHistoryOpen(true)} data-testid="button-history">
              <History className="h-4 w-4 mr-2" />
              History
            </Button>
          )}
          {/* Broken Link Checker */}
          <BrokenLinkChecker contentBody={blocks.filter(b => b.type === "text").map(b => b.data?.contents || "").join(" ")} />
          {/* Related Content Finder */}
          {contentId && (
            <RelatedContentFinder
              currentContentId={contentId}
              currentTitle={title}
              currentType={contentType}
            />
          )}
          {/* Translation Manager - Only for PUBLISHED contents */}
          {contentId && title && status === "published" && (
            <TranslationManager contentId={contentId} contentTitle={title} />
          )}
          <Button variant="outline" size="sm" onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-draft">
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>

          {/* Approval Workflow Buttons */}
          {contentId && status === "draft" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => submitForReviewMutation.mutate()}
              disabled={submitForReviewMutation.isPending}
              data-testid="button-submit-review"
            >
              {submitForReviewMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              Submit for Review
            </Button>
          )}

          {contentId && status === "in_review" && canPublish && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => requestChangesMutation.mutate()}
                disabled={requestChangesMutation.isPending}
                className="text-amber-600 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-950"
                data-testid="button-request-changes"
              >
                {requestChangesMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <AlertTriangle className="h-4 w-4 mr-2" />
                )}
                Request Changes
              </Button>
              <Button
                size="sm"
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
                data-testid="button-approve"
              >
                {approveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Approve
              </Button>
            </div>
          )}

          {/* Improved Auto-save Indicator */}
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all duration-300 ${
            autosaveStatus === "saving"
              ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
              : autosaveStatus === "saved"
                ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                : hasChangedRef.current && status === "draft"
                  ? "bg-muted text-muted-foreground"
                  : "hidden"
          }`}>
            {autosaveStatus === "saving" && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-amber-500 animate-ping opacity-20" />
                  <Loader2 className="h-3.5 w-3.5 animate-spin relative" />
                </div>
                <span className="font-medium" data-testid="autosave-saving">Saving changes...</span>
              </>
            )}
            {autosaveStatus === "saved" && lastAutosaveTime && (
              <>
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-green-500 animate-[pulse_1s_ease-in-out_1] opacity-30" />
                  <Check className="h-3.5 w-3.5 relative" />
                </div>
                <span className="font-medium" data-testid="autosave-saved">Saved at {lastAutosaveTime}</span>
              </>
            )}
            {autosaveStatus === "idle" && hasChangedRef.current && status === "draft" && (
              <>
                <Clock className="h-3.5 w-3.5" />
                <span>Auto-save in 30s</span>
              </>
            )}
          </div>
          {canPublish && (status === "approved" || status === "published" || status === "scheduled") && (
            <div className="flex items-center gap-2">
              {!seoCanPublish && (
                <div className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                  <Lock className="h-3 w-3" />
                  <span>SEO Blocked</span>
                </div>
              )}
              <Button
                size="sm"
                onClick={handlePublish}
                disabled={publishMutation.isPending || !seoCanPublish}
                data-testid="button-publish"
                title={!seoCanPublish ? "Fix critical SEO issues before publishing" : undefined}
              >
                {publishMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                Publish
              </Button>
            </div>
          )}
          {canPublish && status !== "approved" && status !== "published" && status !== "scheduled" && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              <Lock className="h-3 w-3" />
              <span>Approval required to publish</span>
            </div>
          )}
        </div>
      </div>

      {/* Main editor area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Block Library */}
        {!leftPanelCollapsed && (
          <div className="w-72 border-r bg-gradient-to-b from-background to-muted/20 shrink-0 flex flex-col">
            <div className="p-4 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Block
              </h3>
              <p className="text-xs text-muted-foreground mt-1">Drag or click to add</p>
              {/* Search blocks */}
              <div className="relative mt-3">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search blocks..."
                  value={blockSearchQuery}
                  onChange={(e) => setBlockSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
                {blockSearchQuery && (
                  <button
                    onClick={() => setBlockSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-4">
                {filteredBlockTypes.length === 0 && blockSearchQuery && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No blocks match "{blockSearchQuery}"</p>
                    <button
                      onClick={() => setBlockSearchQuery("")}
                      className="text-xs text-primary mt-1 hover:underline"
                    >
                      Clear search
                    </button>
                  </div>
                )}
                {blockCategories.map((category) => {
                  const categoryBlocks = filteredBlockTypes.filter(b => b.category === category.id);
                  if (categoryBlocks.length === 0) return null;
                  return (
                    <div key={category.id} className="space-y-2">
                      <div className="flex items-center gap-2 px-1">
                        <category.icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{category.label}</span>
                      </div>
                      <div className="space-y-1.5">
                        {categoryBlocks.map((bt) => (
                          <button
                            key={bt.type}
                            onClick={() => addBlock(bt.type)}
                            className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 cursor-grab active:cursor-grabbing ${bt.color}`}
                            data-testid={`block-add-${bt.type}`}
                          >
                            <div className="p-1.5 rounded-md bg-background/80">
                              <bt.icon className="h-4 w-4" />
                            </div>
                            <div className="text-left flex-1 min-w-0">
                              <div className="text-sm font-medium">{bt.label}</div>
                              <div className="text-[10px] opacity-70 truncate">{bt.description}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Center - Canvas */}
        <div className="flex-1 overflow-auto bg-muted/50" ref={canvasRef} onClick={handleCanvasClick}>
          {/* Preview Mode Container */}
          {showPreview ? (
            <div className="flex justify-center py-8 px-4">
              <div
                className={`bg-background rounded-lg shadow-lg overflow-hidden transition-all duration-300 ${
                  previewDevice === "mobile"
                    ? "w-[375px]"
                    : previewDevice === "tablet"
                      ? "w-[768px]"
                      : "w-full max-w-4xl"
                }`}
              >
                <div className="space-y-0">
                  {blocks.map((block) => (
                    <PreviewBlock key={block.id} block={block} title={title} />
                  ))}
                  {blocks.length === 0 && (
                    <div className="text-center py-20 text-muted-foreground">
                      <p>No contents to preview</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
          <div className="max-w-3xl mx-auto py-8 px-4">
            {/* Canvas blocks with Drag & Drop */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={blocks.map(b => b.id).filter(Boolean) as string[]}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {blocks.map((block, index) => {
                    const blockId = block.id ?? `block-${index}`;
                    return (
                      <SortableCanvasBlock
                        key={blockId}
                        id={blockId}
                        block={block}
                        isSelected={selectedBlockId === blockId}
                        isDragging={activeBlockId === blockId}
                        onSelect={() => setSelectedBlockId(blockId)}
                        onUpdate={(data) => updateBlock(blockId, data)}
                        onDelete={() => removeBlock(blockId)}
                        onDuplicate={() => duplicateBlock(blockId)}
                        onMoveUp={() => moveBlock(blockId, "up")}
                        onMoveDown={() => moveBlock(blockId, "down")}
                        canMoveUp={index > 0}
                        canMoveDown={index < blocks.length - 1}
                        title={title}
                        onTitleChange={setTitle}
                        onGenerateImage={() => handleGenerateImage(blockId, block.type === "hero" ? "hero" : "image")}
                        isGeneratingImage={imageGeneratingBlock === blockId}
                        onGenerateSection={(sectionType) => handleGenerateSection(sectionType, blockId)}
                        isGeneratingSection={generatingSectionId === blockId}
                        onContextMenu={(e) => handleContextMenu(e, blockId)}
                        blockIndex={index}
                        onSlashCommand={handleSlashCommand}
                      />
                    );
                  })}

                  {blocks.length === 0 && (
                    <EmptyStateWithSlashCommand
                      onSlashCommand={handleSlashCommand}
                      onAddBlock={addBlock}
                    />
                  )}
                </div>
              </SortableContext>

              {/* Drag Overlay for smooth dragging */}
              <DragOverlay>
                {activeBlock ? (
                  <div className="opacity-80 shadow-2xl">
                    <CanvasBlockContent
                      block={activeBlock}
                      isSelected={true}
                      title={title}
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>

            {/* Context Menu */}
            {contextMenu && (
              <div
                className="fixed bg-popover border rounded-lg shadow-xl py-1 z-50 min-w-[180px] animate-in fade-in-0 zoom-in-95"
                style={{ left: contextMenu.x, top: contextMenu.y }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                  onClick={() => {
                    duplicateBlock(contextMenu.blockId);
                    setContextMenu(null);
                  }}
                >
                  <Copy className="h-4 w-4" />
                  Duplicate Block
                </button>
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                  onClick={() => {
                    moveBlock(contextMenu.blockId, "up");
                    setContextMenu(null);
                  }}
                >
                  <ChevronUp className="h-4 w-4" />
                  Move Up
                </button>
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                  onClick={() => {
                    moveBlock(contextMenu.blockId, "down");
                    setContextMenu(null);
                  }}
                >
                  <ChevronDown className="h-4 w-4" />
                  Move Down
                </button>
                <div className="h-px bg-border my-1" />
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-destructive hover:text-destructive-foreground flex items-center gap-2 text-destructive"
                  onClick={() => {
                    removeBlock(contextMenu.blockId);
                    setContextMenu(null);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Block
                </button>
              </div>
            )}

            {/* Slash Command Menu */}
            <SlashCommandMenu
              isOpen={slashCommandMenu.isOpen}
              onClose={handleSlashCommandClose}
              onSelect={(type) => {
                const currentBlock = blocks[slashCommandMenu.blockIndex];
                if (currentBlock && currentBlock.type === "text") {
                  const contents = String(currentBlock.data?.contents || "");
                  const cleanedContent = contents.replace(/\/[a-zA-Z]*$/, "").trimEnd();
                  updateBlock(currentBlock.id!, { contents: cleanedContent });
                }
                addBlock(type, slashCommandMenu.blockIndex);
                handleSlashCommandClose();
              }}
              position={slashCommandMenu.position}
              searchQuery={slashCommandMenu.searchQuery}
            />

            {/* Bottom Collapsible Settings Section */}
            <div className="mt-8 space-y-4">
              <Accordion type="multiple" defaultValue={[]} className="space-y-3">
                {/* Page Settings Accordion */}
                <AccordionItem value="page-settings" className="border rounded-lg bg-background shadow-sm">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline" data-testid="accordion-page-settings">
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Page Settings</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <PageSettingsPanel
                      title={title}
                      onTitleChange={setTitle}
                      slug={slug}
                      onSlugChange={setSlug}
                      status={status}
                      onStatusChange={setStatus}
                      scheduledDate={scheduledDate}
                      onScheduledDateChange={setScheduledDate}
                      metaTitle={metaTitle}
                      onMetaTitleChange={setMetaTitle}
                      metaDescription={metaDescription}
                      onMetaDescriptionChange={setMetaDescription}
                      primaryKeyword={primaryKeyword}
                      onPrimaryKeywordChange={setPrimaryKeyword}
                      secondaryKeywords={secondaryKeywords}
                      onSecondaryKeywordsChange={setSecondaryKeywords}
                      internalLinksText={internalLinksText}
                      onInternalLinksTextChange={setInternalLinksText}
                      externalLinksText={externalLinksText}
                      onExternalLinksTextChange={setExternalLinksText}
                      contentId={contentId}
                      contentType={contentType}
                      selectedWriterId={selectedWriterId}
                      onWriterSelect={setSelectedWriterId}
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* SEO Score Accordion */}
                <AccordionItem value="seo-score" className="border rounded-lg bg-background shadow-sm">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline" data-testid="accordion-seo-score">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">SEO Score</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <SeoScore
                      title={title}
                      metaTitle={metaTitle}
                      metaDescription={metaDescription}
                      primaryKeyword={primaryKeyword}
                      content={seoContentText}
                      headings={seoHeadings}
                      images={seoImages}
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* SEO Validation Accordion */}
                <AccordionItem value="seo-validation" className="border rounded-lg bg-background shadow-sm">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline" data-testid="accordion-seo-validation">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">SEO Validation</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <SEOValidationGate
                      title={title}
                      metaTitle={metaTitle}
                      metaDescription={metaDescription}
                      primaryKeyword={primaryKeyword}
                      heroImage={heroImage}
                      heroImageAlt={heroImageAlt}
                      contents={seoContentText}
                      headings={seoHeadings.map(h => h.text)}
                      blocks={blocks}
                      slug={slug}
                      contentType={contentType}
                      contentId={contentId}
                      onAutoFix={handleSeoAutoFix}
                      onValidationComplete={handleSeoValidationComplete}
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* Content Type Specific SEO Sections */}
                {(contentType === "attraction" || contentType === "hotel" || contentType === "dining" || contentType === "district") && (
                  <AccordionItem value="seo-sections" className="border rounded-lg bg-background shadow-sm">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline" data-testid="accordion-seo-sections">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">SEO Sections</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      {contentType === "attraction" && (
                        <AttractionSeoEditor
                          data={attractionSeoData}
                          onChange={setAttractionSeoData}
                          title={title}
                          contentType={contentType}
                          primaryKeyword={primaryKeyword}
                        />
                      )}
                      {contentType === "hotel" && (
                        <HotelSeoEditor
                          data={hotelSeoData}
                          onChange={setHotelSeoData}
                          title={title}
                          contentType={contentType}
                          primaryKeyword={primaryKeyword}
                        />
                      )}
                      {contentType === "dining" && (
                        <DiningSeoEditor
                          data={diningSeoData}
                          onChange={setDiningSeoData}
                          title={title}
                          contentType={contentType}
                          primaryKeyword={primaryKeyword}
                        />
                      )}
                      {contentType === "district" && (
                        <DistrictSeoEditor
                          data={districtSeoData}
                          onChange={setDistrictSeoData}
                          title={title}
                          contentType={contentType}
                          primaryKeyword={primaryKeyword}
                        />
                      )}
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            </div>
          </div>
          )}
        </div>

        {/* Right Panel - Block Settings Only (when block is selected) */}
        {selectedBlock && (
          <div className="w-80 border-l bg-background shrink-0 flex flex-col overflow-hidden">
            <div className="p-3 border-b shrink-0">
              <h3 className="font-medium text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Block Settings
              </h3>
            </div>
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4 pb-8">
                <BlockSettingsPanel
                  block={selectedBlock}
                  onUpdate={(data) => updateBlock(selectedBlock.id ?? '', data)}
                  onGenerateImage={() => handleGenerateImage(selectedBlock.id ?? '', selectedBlock.type === "hero" ? "hero" : "image")}
                  isGeneratingImage={imageGeneratingBlock === selectedBlock.id}
                />
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Image Generation Dialog */}
      <Dialog open={imageGenerationDialog.open} onOpenChange={(open) => !open && setImageGenerationDialog({ open: false, blockId: null, images: [] })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select an Image</DialogTitle>
            <DialogDescription>Choose one of the AI-generated images for this block</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4 py-4">
            {imageGenerationDialog.images.map((img, i) => (
              <button
                key={i}
                onClick={() => selectGeneratedImage(img.url, img.alt)}
                className="aspect-video rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-colors cursor-pointer"
                data-testid={`select-generated-image-${i}`}
              >
                <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImageGenerationDialog({ open: false, blockId: null, images: [] })}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Generate Dialog */}
      <Dialog open={aiGenerateDialogOpen} onOpenChange={setAiGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate with AI</DialogTitle>
            <DialogDescription>
              {contentType === "article" ? "Enter a topic for your article" : `Enter the ${contentType} name`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              value={aiGenerateInput}
              onChange={(e) => setAiGenerateInput(e.target.value)}
              placeholder={contentType === "article" ? "e.g., Best Dubai beaches for families" : contentType === "hotel" ? "e.g., Atlantis The Palm" : "e.g., Burj Khalifa"}
              disabled={aiGenerateMutation.isPending}
              data-testid="input-ai-generate"
            />
            {aiGenerateMutation.isPending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating contents... This may take 15-30 seconds.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiGenerateDialogOpen(false)} disabled={aiGenerateMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={() => aiGenerateMutation.mutate(aiGenerateInput)} disabled={aiGenerateMutation.isPending || !aiGenerateInput.trim()} data-testid="button-confirm-ai-generate">
              {aiGenerateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog - Improved UI */}
      <Dialog open={versionHistoryOpen} onOpenChange={(open) => { setVersionHistoryOpen(open); if (!open) setSelectedVersion(null); }}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10">
                <History className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg">Version History</DialogTitle>
                <DialogDescription className="text-sm">Browse and restore previous versions of your contents</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex gap-0 min-h-[450px] border rounded-lg overflow-hidden">
            {/* Version Timeline */}
            <div className="w-80 bg-muted/30 border-r">
              <div className="p-3 border-b bg-background/50 backdrop-blur-sm sticky top-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {versions.length} {versions.length === 1 ? 'Version' : 'Versions'}
                </p>
              </div>
              <ScrollArea className="h-[400px]">
                {isLoadingVersions ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3" data-testid="loading-versions">
                    <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
                    <p className="text-sm text-muted-foreground">Loading versions...</p>
                  </div>
                ) : versions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center" data-testid="empty-versions">
                    <div className="p-3 rounded-full bg-muted mb-3">
                      <History className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">No versions yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Versions are created each time you save changes</p>
                  </div>
                ) : (
                  <div className="relative py-2">
                    {/* Timeline line */}
                    <div className="absolute left-6 top-4 bottom-4 w-px bg-border" />

                    {versions.map((version, index) => {
                      const isLatest = index === 0;
                      const isSelected = selectedVersion?.id === version.id;
                      const createdDate = version.createdAt ? new Date(version.createdAt) : null;
                      const timeAgo = createdDate ? getTimeAgo(createdDate) : '';

                      return (
                        <button
                          key={version.id}
                          onClick={() => setSelectedVersion(version)}
                          className={`w-full text-left px-3 py-2 transition-all relative ${
                            isSelected
                              ? "bg-primary/10"
                              : "hover:bg-muted/80"
                          }`}
                          data-testid={`version-item-${version.versionNumber}`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Timeline dot */}
                            <div className={`relative z-10 mt-1.5 w-3 h-3 rounded-full border-2 ${
                              isLatest
                                ? "bg-green-500 border-green-500"
                                : isSelected
                                  ? "bg-primary border-primary"
                                  : "bg-background border-muted-foreground/40"
                            }`} />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`font-medium text-sm ${isSelected ? "text-primary" : ""}`}>
                                  v{version.versionNumber}
                                </span>
                                {isLatest && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700 border-green-200">
                                    Latest
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{timeAgo}</p>
                              {version.changeNote && (
                                <p className="text-xs text-muted-foreground mt-1 truncate italic">
                                  "{version.changeNote}"
                                </p>
                              )}
                            </div>

                            {isSelected && (
                              <ChevronRight className="h-4 w-4 text-primary mt-1" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Version Details */}
            <div className="flex-1 bg-background">
              {selectedVersion ? (
                <div className="h-full flex flex-col">
                  {/* Header */}
                  <div className="p-4 border-b bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold">Version {selectedVersion.versionNumber}</h4>
                          <p className="text-xs text-muted-foreground">
                            {selectedVersion.createdAt
                              ? new Date(selectedVersion.createdAt).toLocaleString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : 'Unknown date'}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => restoreMutation.mutate(selectedVersion.id)}
                        disabled={restoreMutation.isPending}
                        size="sm"
                        data-testid="button-restore-version"
                      >
                        {restoreMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4 mr-2" />
                        )}
                        Restore
                      </Button>
                    </div>
                  </div>

                  {/* Tabs for Details and Changes */}
                  <Tabs defaultValue="changes" className="flex-1 flex flex-col">
                    <div className="px-4 pt-2 border-b">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="changes" data-testid="tab-version-changes">
                          Changes
                        </TabsTrigger>
                        <TabsTrigger value="details" data-testid="tab-version-details">
                          Details
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    {/* Changes Tab - Diff View */}
                    <TabsContent value="changes" className="flex-1 mt-0 overflow-hidden">
                      <div className="p-4 h-full">
                        <VersionDiff
                          currentVersion={selectedVersion}
                          previousVersion={versions.find(v => v.versionNumber === selectedVersion.versionNumber - 1) || null}
                          showFullDiff={true}
                        />
                      </div>
                    </TabsContent>

                    {/* Details Tab - Original View */}
                    <TabsContent value="details" className="flex-1 mt-0 overflow-hidden">
                      <ScrollArea className="h-full">
                        <div className="p-4 space-y-4">
                          {/* Stats Row */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-lg bg-muted/50 text-center">
                              <p className="text-2xl font-bold text-primary">
                                {Array.isArray(selectedVersion.blocks) ? selectedVersion.blocks.length : 0}
                              </p>
                              <p className="text-xs text-muted-foreground">Blocks</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50 text-center">
                              <p className="text-2xl font-bold text-primary">
                                v{selectedVersion.versionNumber}
                              </p>
                              <p className="text-xs text-muted-foreground">Version</p>
                            </div>
                          </div>

                          {/* Title */}
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Title</Label>
                            <div className="p-3 rounded-lg border bg-muted/30">
                              <p className="text-sm font-medium">{selectedVersion.title || '(No title)'}</p>
                            </div>
                          </div>

                          {/* Meta Description */}
                          {selectedVersion.metaDescription && (
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Meta Description</Label>
                              <div className="p-3 rounded-lg border bg-muted/30">
                                <p className="text-sm text-muted-foreground">{selectedVersion.metaDescription}</p>
                              </div>
                            </div>
                          )}

                          {/* Blocks Preview */}
                          {Array.isArray(selectedVersion.blocks) && selectedVersion.blocks.length > 0 && (
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Content Blocks</Label>
                              <div className="space-y-1.5">
                                {(selectedVersion.blocks as ContentBlock[]).slice(0, 5).map((block, idx) => {
                                  const config = blockTypes.find(bt => bt.type === block.type);
                                  return (
                                    <div key={idx} className="flex items-center gap-2 p-2 rounded-md border bg-muted/30">
                                      <div className={`p-1 rounded ${config?.color || 'bg-muted'}`}>
                                        {config?.icon && <config.icon className="h-3 w-3" />}
                                      </div>
                                      <span className="text-xs font-medium">{config?.label || block.type}</span>
                                    </div>
                                  );
                                })}
                                {selectedVersion.blocks.length > 5 && (
                                  <p className="text-xs text-muted-foreground text-center py-1">
                                    +{selectedVersion.blocks.length - 5} more blocks
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Change Note */}
                          {selectedVersion.changeNote && (
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Change Note</Label>
                              <div className="p-3 rounded-lg border bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
                                <p className="text-sm italic">"{selectedVersion.changeNote}"</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                  <div className="p-4 rounded-full bg-muted mb-4">
                    <Clock className="h-8 w-8" />
                  </div>
                  <p className="font-medium">Select a version</p>
                  <p className="text-sm text-center mt-1">Click on a version from the timeline to view its details and restore it</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Sortable Canvas Block Wrapper - Uses dnd-kit for drag & drop
function SortableCanvasBlock({
  id,
  block,
  isSelected,
  isDragging,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  title,
  onTitleChange,
  onGenerateImage,
  isGeneratingImage,
  onGenerateSection,
  isGeneratingSection,
  onContextMenu,
  blockIndex,
  onSlashCommand,
}: {
  id: string;
  block: ContentBlock;
  isSelected: boolean;
  isDragging: boolean;
  onSelect: () => void;
  onUpdate: (data: Record<string, unknown>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  title: string;
  onTitleChange: (title: string) => void;
  onGenerateImage: () => void;
  isGeneratingImage: boolean;
  onGenerateSection?: (sectionType: string) => void;
  isGeneratingSection?: boolean;
  onContextMenu?: (e: React.MouseEvent) => void;
  blockIndex?: number;
  onSlashCommand?: (position: { top: number; left: number }, blockIndex: number, searchQuery: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const blockConfig = blockTypes.find((bt) => bt.type === block.type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative transition-all cursor-pointer ${
        isSelected
          ? "ring-2 ring-primary shadow-xl scale-[1.01]"
          : "hover:ring-2 hover:ring-primary/30 hover:shadow-lg"
      } ${isDragging ? "z-50" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onContextMenu={onContextMenu}
      data-testid={`canvas-block-${block.id}`}
    >
      {/* Block header - visible on hover/select */}
      <div className={`absolute -top-10 left-0 right-0 flex items-center justify-between px-2 transition-all ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
        <div className="flex items-center gap-2">
          {/* Drag handle in header */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${blockConfig?.color || "bg-muted"}`}>
            {blockConfig?.icon && <blockConfig.icon className="h-3 w-3" />}
            {blockConfig?.label || block.type}
          </div>
        </div>
        <div className="flex items-center gap-0.5 bg-background/95 backdrop-blur-sm rounded-lg border shadow-sm p-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted" onClick={(e) => { e.stopPropagation(); onMoveUp(); }} disabled={!canMoveUp} data-testid={`move-up-${block.id}`} title="Move up">
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted" onClick={(e) => { e.stopPropagation(); onMoveDown(); }} disabled={!canMoveDown} data-testid={`move-down-${block.id}`} title="Move down">
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted" onClick={(e) => { e.stopPropagation(); onDuplicate(); }} data-testid={`duplicate-${block.id}`} title="Duplicate">
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }} data-testid={`delete-${block.id}`} title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Side drag handle */}
      <div
        {...attributes}
        {...listeners}
        className={`absolute -left-8 top-1/2 -translate-y-1/2 transition-opacity cursor-grab active:cursor-grabbing ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-60"}`}
        title="Drag to reorder"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Block contents */}
      <CanvasBlockContent
        block={block}
        isSelected={isSelected}
        title={title}
        onTitleChange={onTitleChange}
        onUpdate={onUpdate}
        onGenerateImage={onGenerateImage}
        isGeneratingImage={isGeneratingImage}
        onGenerateSection={onGenerateSection}
        isGeneratingSection={isGeneratingSection}
        blockIndex={blockIndex}
        onSlashCommand={onSlashCommand}
      />
    </div>
  );
}

// Canvas Block Content - The actual visual contents of each block type
function CanvasBlockContent({
  block,
  isSelected,
  title,
  onTitleChange,
  onUpdate,
  onGenerateImage,
  isGeneratingImage,
  onGenerateSection,
  isGeneratingSection,
  blockIndex,
  onSlashCommand,
}: {
  block: ContentBlock;
  isSelected: boolean;
  title: string;
  onTitleChange?: (title: string) => void;
  onUpdate?: (data: Record<string, unknown>) => void;
  onGenerateImage?: () => void;
  isGeneratingImage?: boolean;
  onGenerateSection?: (sectionType: string) => void;
  isGeneratingSection?: boolean;
  blockIndex?: number;
  onSlashCommand?: (position: { top: number; left: number }, blockIndex: number, searchQuery: string) => void;
}) {
  // Provide no-op fallbacks for optional handlers (used in DragOverlay)
  const handleUpdate = onUpdate || (() => {});
  const handleTitleChange = onTitleChange || (() => {});
  const handleGenerateImage = onGenerateImage || (() => {});
  const handleGenerateSection = onGenerateSection || (() => {});
  const generating = isGeneratingImage || false;
  const generatingSection = isGeneratingSection || false;

  return (
    <div className="bg-background rounded-lg overflow-hidden">
        {block.type === "hero" && (
          <HeroBlockCanvas
            block={block}
            title={title}
            onTitleChange={handleTitleChange}
            onUpdate={handleUpdate}
            onGenerateImage={handleGenerateImage}
            isGeneratingImage={generating}
            isSelected={isSelected}
          />
        )}
        {block.type === "text" && (
          <TextBlockCanvas 
            block={block} 
            onUpdate={handleUpdate} 
            isSelected={isSelected} 
            blockIndex={blockIndex}
            onSlashCommand={onSlashCommand}
          />
        )}
        {block.type === "image" && (
          <ImageBlockCanvas block={block} onUpdate={handleUpdate} onGenerateImage={handleGenerateImage} isGeneratingImage={generating} isSelected={isSelected} />
        )}
        {block.type === "faq" && (
          <FAQBlockCanvas block={block} onUpdate={handleUpdate} isSelected={isSelected} onGenerateSection={handleGenerateSection} isGeneratingSection={generatingSection} />
        )}
        {block.type === "cta" && (
          <CTABlockCanvas block={block} onUpdate={handleUpdate} isSelected={isSelected} />
        )}
        {block.type === "highlights" && (
          <HighlightsBlockCanvas block={block} onUpdate={handleUpdate} isSelected={isSelected} onGenerateSection={handleGenerateSection} isGeneratingSection={generatingSection} />
        )}
        {block.type === "tips" && (
          <TipsBlockCanvas block={block} onUpdate={handleUpdate} isSelected={isSelected} onGenerateSection={handleGenerateSection} isGeneratingSection={generatingSection} />
        )}
        {block.type === "info_grid" && (
          <InfoGridBlockCanvas block={block} onUpdate={handleUpdate} isSelected={isSelected} />
        )}
        {block.type === "gallery" && (
          <GalleryBlockCanvas block={block} onUpdate={handleUpdate} isSelected={isSelected} />
        )}
        {block.type === "video" && (
          <VideoBlockCanvas block={block} onUpdate={handleUpdate} isSelected={isSelected} />
        )}
        {block.type === "quote" && (
          <QuoteBlockCanvas block={block} onUpdate={handleUpdate} isSelected={isSelected} />
        )}
        {block.type === "divider" && (
          <DividerBlockCanvas block={block} onUpdate={handleUpdate} isSelected={isSelected} />
        )}
        {block.type === "heading" && (
          <HeadingBlockCanvas block={block} onUpdate={handleUpdate} isSelected={isSelected} />
        )}
        {block.type === "spacer" && (
          <SpacerBlockCanvas block={block} onUpdate={handleUpdate} isSelected={isSelected} />
        )}
        {block.type === "map" && (
          <MapBlockCanvas block={block} onUpdate={handleUpdate} isSelected={isSelected} />
        )}
        {block.type === "social" && (
          <SocialBlockCanvas block={block} onUpdate={handleUpdate} isSelected={isSelected} />
        )}
        {block.type === "accordion" && (
          <AccordionBlockCanvas block={block} onUpdate={handleUpdate} isSelected={isSelected} />
        )}
        {block.type === "tabs" && (
          <TabsBlockCanvas block={block} onUpdate={handleUpdate} isSelected={isSelected} />
        )}
        {block.type === "columns" && (
          <ColumnsBlockCanvas block={block} onUpdate={handleUpdate} isSelected={isSelected} />
        )}
        {block.type === "html" && (
          <HtmlBlockCanvas block={block} onUpdate={handleUpdate} isSelected={isSelected} />
        )}
    </div>
  );
}

// Hero Block Canvas
function HeroBlockCanvas({
  block,
  title,
  onTitleChange,
  onUpdate,
  onGenerateImage,
  isGeneratingImage,
  isSelected,
}: {
  block: ContentBlock;
  title: string;
  onTitleChange: (title: string) => void;
  onUpdate: (data: Record<string, unknown>) => void;
  onGenerateImage: () => void;
  isGeneratingImage: boolean;
  isSelected: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const hasImage = !!block.data?.image;

  // Use unified image upload hook
  const { uploadFile: upload, isUploading } = useImageUpload();

  const handleUpload = async (file: File) => {
    const result = await upload(file, {
      showSuccessToast: true,
      successMessage: "Hero image uploaded successfully"
    });
    if (result) {
      onUpdate({ image: result.url, alt: file.name });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      await handleUpload(file);
    }
  };

  const handleLibrarySelect = (url: string, alt: string) => {
    onUpdate({ image: url, alt });
  };

  return (
    <div
      className={`relative aspect-[21/9] overflow-hidden transition-all rounded-lg ${
        hasImage
          ? ""
          : isDragging
            ? "bg-primary/5 border-2 border-dashed border-primary"
            : "bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:bg-primary/5"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <MediaLibraryPicker open={showLibrary} onOpenChange={setShowLibrary} onSelect={handleLibrarySelect} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
      {hasImage ? (
        <div className="relative w-full h-full group">
          <img src={String(block.data.image)} alt={String(block.data?.alt || "")} className="w-full h-full object-cover" />
          {/* Gradient overlay for better button visibility */}
          <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 transition-opacity ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} />
          {/* Controls to change image */}
          <div className={`absolute top-4 right-4 z-30 transition-all flex gap-2 ${isSelected ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"}`}>
            <Button variant="secondary" size="sm" className="shadow-lg backdrop-blur-sm bg-white/90 hover:bg-white dark:bg-slate-900/90 dark:hover:bg-slate-900" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} disabled={isUploading} data-testid={`hero-change-upload-${block.id}`}>
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            </Button>
            <Button variant="secondary" size="sm" className="shadow-lg backdrop-blur-sm bg-white/90 hover:bg-white dark:bg-slate-900/90 dark:hover:bg-slate-900" onClick={(e) => { e.stopPropagation(); setShowLibrary(true); }} data-testid={`hero-change-library-${block.id}`}>
              <FolderOpen className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="sm" className="shadow-lg backdrop-blur-sm bg-white/90 hover:bg-white dark:bg-slate-900/90 dark:hover:bg-slate-900 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950" onClick={(e) => { e.stopPropagation(); onUpdate({ image: "", alt: "" }); }} data-testid={`hero-remove-${block.id}`}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 p-6">
          <div className={`p-4 rounded-full transition-all ${isDragging ? "bg-primary/20 scale-110" : "bg-slate-100 dark:bg-slate-800"}`}>
            <ImagePlus className={`h-10 w-10 transition-colors ${isDragging ? "text-primary" : "text-slate-400 dark:text-slate-500"}`} />
          </div>
          {isDragging ? (
            <p className="text-lg font-semibold text-primary animate-pulse">Drop image here</p>
          ) : (
            <>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Hero Image</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Drag & drop or choose an option</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button size="sm" className="shadow-sm" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} disabled={isUploading} data-testid={`hero-upload-${block.id}`}>
                  {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  Upload
                </Button>
                <Button variant="outline" size="sm" className="shadow-sm" onClick={(e) => { e.stopPropagation(); setShowLibrary(true); }} data-testid={`hero-library-${block.id}`}>
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Library
                </Button>
                <Button variant="outline" size="sm" className="shadow-sm bg-[#6443F4]/10 border-[#6443F4]/20 dark:border-[#6443F4]/30 hover:bg-[#6443F4]/20" onClick={(e) => { e.stopPropagation(); onGenerateImage(); }} disabled={isGeneratingImage} data-testid={`hero-generate-${block.id}`}>
                  {isGeneratingImage ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2 text-[#6443F4]" />}
                  <span className="text-[#6443F4] font-medium">AI Generate</span>
                </Button>
              </div>
            </>
          )}
        </div>
      )}
      {/* Dark overlay for text - pointer-events-none so buttons remain clickable */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
      {/* Inline editable title */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          placeholder="Enter page title..."
          className="w-full bg-transparent border-none outline-none text-white text-3xl font-bold placeholder:text-white/50 focus:ring-0"
          data-testid="input-title"
        />
      </div>
    </div>
  );
}

// Empty State with Slash Command Support
function EmptyStateWithSlashCommand({
  onSlashCommand,
  onAddBlock,
}: {
  onSlashCommand: (position: { top: number; left: number }, blockIndex: number, searchQuery: string) => void;
  onAddBlock: (type: ContentBlock["type"], insertAfterIndex?: number) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;
    
    setInputValue(value);
    
    const textBeforeCursor = value.substring(0, cursorPosition);
    const slashMatch = textBeforeCursor.match(/\/([a-zA-Z]*)$/);
    
    if (slashMatch && textareaRef.current) {
      const rect = textareaRef.current.getBoundingClientRect();
      
      onSlashCommand(
        { 
          top: rect.top + 40, 
          left: rect.left + 16 
        },
        -1,
        slashMatch[1] || ""
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && inputValue.trim() && !inputValue.startsWith("/")) {
      e.preventDefault();
      onAddBlock("text", -1);
    }
  };

  return (
    <div 
      className="text-center py-12 text-muted-foreground"
      data-testid="empty-state-editor"
    >
      <LayoutGrid className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p className="text-lg font-medium mb-2">Start building your page</p>
      <p className="text-sm mb-6">Type <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">/</kbd> to add blocks or select from the left panel</p>
      <div className="max-w-lg mx-auto">
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type / for block commands..."
          className="w-full min-h-[80px] p-4 bg-card border rounded-lg outline-none resize-none text-base leading-relaxed placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
          data-testid="input-empty-state-slash"
        />
      </div>
    </div>
  );
}

// Text Block Canvas with Slash Command Support
function TextBlockCanvas({
  block,
  onUpdate,
  isSelected,
  blockIndex,
  onSlashCommand,
}: {
  block: ContentBlock;
  onUpdate: (data: Record<string, unknown>) => void;
  isSelected: boolean;
  blockIndex?: number;
  onSlashCommand?: (position: { top: number; left: number }, blockIndex: number, searchQuery: string) => void;
}) {
  const contents = String(block.data?.contents || "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isSlashActive, setIsSlashActive] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;
    
    onUpdate({ contents: value });
    
    const textBeforeCursor = value.substring(0, cursorPosition);
    const slashMatch = textBeforeCursor.match(/\/([a-zA-Z]*)$/);
    
    if (slashMatch && textareaRef.current && onSlashCommand && blockIndex !== undefined) {
      const rect = textareaRef.current.getBoundingClientRect();
      const lineHeight = parseInt(window.getComputedStyle(textareaRef.current).lineHeight) || 24;
      const linesBeforeCursor = textBeforeCursor.split('\n').length - 1;
      
      onSlashCommand(
        { 
          top: rect.top + (linesBeforeCursor + 1) * lineHeight + 8, 
          left: rect.left + 16 
        },
        blockIndex,
        slashMatch[1] || ""
      );
      setIsSlashActive(true);
    } else if (isSlashActive) {
      setIsSlashActive(false);
    }
  };

  return (
    <div className="p-6">
      <textarea
        ref={textareaRef}
        value={contents}
        onChange={handleChange}
        onClick={(e) => e.stopPropagation()}
        placeholder="Start typing... Type / for commands"
        className="w-full min-h-[120px] bg-transparent border-none outline-none resize-none text-base leading-relaxed placeholder:text-muted-foreground/50 focus:ring-0"
        data-testid={`textarea-${block.id}`}
      />
    </div>
  );
}

// Image Block Canvas
function ImageBlockCanvas({
  block,
  onUpdate,
  onGenerateImage,
  isGeneratingImage,
  isSelected,
}: {
  block: ContentBlock;
  onUpdate: (data: Record<string, unknown>) => void;
  onGenerateImage: () => void;
  isGeneratingImage: boolean;
  isSelected: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const hasImage = !!block.data?.image;

  // Use unified image upload hook
  const { uploadFile: upload, isUploading } = useImageUpload();

  const handleUpload = async (file: File) => {
    const result = await upload(file, {
      showSuccessToast: true,
      successMessage: "Image uploaded successfully"
    });
    if (result) {
      onUpdate({ image: result.url, alt: file.name });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      await handleUpload(file);
    }
  };

  const handleLibrarySelect = (url: string, alt: string) => {
    onUpdate({ image: url, alt });
  };

  return (
    <div 
      className="p-4"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <MediaLibraryPicker open={showLibrary} onOpenChange={setShowLibrary} onSelect={handleLibrarySelect} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
      {hasImage ? (
        <div className="relative aspect-video rounded-lg overflow-hidden group shadow-sm">
          <img src={String(block.data.image)} alt={String(block.data?.alt || "")} className="w-full h-full object-cover" />
          {/* Gradient overlay for better button visibility */}
          <div className={`absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 transition-opacity ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} />
          {/* Controls to change image */}
          <div className={`absolute top-3 right-3 z-10 transition-all flex gap-2 ${isSelected ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"}`}>
            <Button variant="secondary" size="sm" className="shadow-lg backdrop-blur-sm bg-white/90 hover:bg-white dark:bg-slate-900/90 dark:hover:bg-slate-900" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} disabled={isUploading} data-testid={`image-change-upload-${block.id}`}>
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            </Button>
            <Button variant="secondary" size="sm" className="shadow-lg backdrop-blur-sm bg-white/90 hover:bg-white dark:bg-slate-900/90 dark:hover:bg-slate-900" onClick={(e) => { e.stopPropagation(); setShowLibrary(true); }} data-testid={`image-change-library-${block.id}`}>
              <FolderOpen className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="sm" className="shadow-lg backdrop-blur-sm bg-white/90 hover:bg-white dark:bg-slate-900/90 dark:hover:bg-slate-900 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950" onClick={(e) => { e.stopPropagation(); onUpdate({ image: "", alt: "" }); }} data-testid={`image-remove-${block.id}`}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className={`aspect-video rounded-lg flex flex-col items-center justify-center gap-4 transition-all ${
          isDragging
            ? "bg-primary/5 border-2 border-dashed border-primary"
            : "bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:bg-primary/5"
        }`}>
          <div className={`p-3 rounded-full transition-all ${isDragging ? "bg-primary/20 scale-110" : "bg-slate-100 dark:bg-slate-800"}`}>
            <ImagePlus className={`h-8 w-8 transition-colors ${isDragging ? "text-primary" : "text-slate-400 dark:text-slate-500"}`} />
          </div>
          {isDragging ? (
            <p className="text-lg font-semibold text-primary animate-pulse">Drop image here</p>
          ) : (
            <>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Add Image</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Drag & drop or choose an option</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button size="sm" className="shadow-sm" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} disabled={isUploading} data-testid={`image-upload-${block.id}`}>
                  {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  Upload
                </Button>
                <Button variant="outline" size="sm" className="shadow-sm" onClick={(e) => { e.stopPropagation(); setShowLibrary(true); }} data-testid={`image-library-${block.id}`}>
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Library
                </Button>
                <Button variant="outline" size="sm" className="shadow-sm bg-[#6443F4]/10 border-[#6443F4]/20 dark:border-[#6443F4]/30 hover:bg-[#6443F4]/20" onClick={(e) => { e.stopPropagation(); onGenerateImage(); }} disabled={isGeneratingImage} data-testid={`image-generate-${block.id}`}>
                  {isGeneratingImage ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2 text-[#6443F4]" />}
                  <span className="text-[#6443F4] font-medium">AI Generate</span>
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// FAQ Block Canvas
function FAQBlockCanvas({
  block,
  onUpdate,
  isSelected,
  onGenerateSection,
  isGeneratingSection,
}: {
  block: ContentBlock;
  onUpdate: (data: Record<string, unknown>) => void;
  isSelected: boolean;
  onGenerateSection?: (sectionType: string) => void;
  isGeneratingSection?: boolean;
}) {
  const isEmpty = !block.data?.question && !block.data?.answer;

  return (
    <div className="p-6 space-y-3">
      {isEmpty && onGenerateSection ? (
        <div className="flex flex-col items-center justify-center py-8 gap-3 bg-muted/30 rounded-lg border-2 border-dashed">
          <HelpCircle className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No FAQ contents yet</p>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onGenerateSection("faq"); }}
            disabled={isGeneratingSection}
          >
            {isGeneratingSection ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Generate FAQ
          </Button>
        </div>
      ) : (
        <>
          <input
            type="text"
            value={String(block.data?.question || "")}
            onChange={(e) => onUpdate({ question: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            placeholder="Enter your question..."
            className="w-full bg-transparent border-none outline-none text-lg font-semibold placeholder:text-muted-foreground/50 focus:ring-0"
            data-testid={`faq-question-${block.id}`}
          />
          <textarea
            value={String(block.data?.answer || "")}
            onChange={(e) => onUpdate({ answer: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            placeholder="Enter your answer..."
            className="w-full min-h-[80px] bg-transparent border-none outline-none resize-none text-muted-foreground placeholder:text-muted-foreground/50 focus:ring-0"
            data-testid={`faq-answer-${block.id}`}
          />
        </>
      )}
    </div>
  );
}

// CTA Block Canvas
function CTABlockCanvas({
  block,
  onUpdate,
  isSelected,
}: {
  block: ContentBlock;
  onUpdate: (data: Record<string, unknown>) => void;
  isSelected: boolean;
}) {
  return (
    <div className="p-6 flex flex-col items-center gap-4 bg-primary/5">
      <input
        type="text"
        value={String(block.data?.text || "")}
        onChange={(e) => onUpdate({ text: e.target.value })}
        onClick={(e) => e.stopPropagation()}
        placeholder="Button text..."
        className="bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium text-center border-none outline-none focus:ring-2 focus:ring-primary/50"
        data-testid={`cta-text-${block.id}`}
      />
      <input
        type="text"
        value={String(block.data?.url || "")}
        onChange={(e) => onUpdate({ url: e.target.value })}
        onClick={(e) => e.stopPropagation()}
        placeholder="https://..."
        className="text-sm text-muted-foreground bg-transparent border-none outline-none text-center placeholder:text-muted-foreground/50 focus:ring-0"
        data-testid={`cta-url-${block.id}`}
      />
    </div>
  );
}

// Highlights Block Canvas
function HighlightsBlockCanvas({
  block,
  onUpdate,
  isSelected,
  onGenerateSection,
  isGeneratingSection,
}: {
  block: ContentBlock;
  onUpdate: (data: Record<string, unknown>) => void;
  isSelected: boolean;
  onGenerateSection?: (sectionType: string) => void;
  isGeneratingSection?: boolean;
}) {
  const contents = String(block.data?.contents || "");
  const isEmpty = !contents.trim();

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-3">
        <Star className="h-5 w-5 text-primary" />
        <span className="font-semibold">Highlights</span>
      </div>
      {isEmpty && onGenerateSection ? (
        <div className="flex flex-col items-center justify-center py-6 gap-3 bg-muted/30 rounded-lg border-2 border-dashed">
          <Star className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No highlights yet</p>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onGenerateSection("highlights"); }}
            disabled={isGeneratingSection}
          >
            {isGeneratingSection ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Generate Highlights
          </Button>
        </div>
      ) : (
        <textarea
          value={contents}
          onChange={(e) => onUpdate({ contents: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          placeholder="Enter highlights (one per line)..."
          className="w-full min-h-[100px] bg-transparent border-none outline-none resize-none placeholder:text-muted-foreground/50 focus:ring-0"
          data-testid={`highlights-contents-${block.id}`}
        />
      )}
    </div>
  );
}

// Tips Block Canvas
function TipsBlockCanvas({
  block,
  onUpdate,
  isSelected,
  onGenerateSection,
  isGeneratingSection,
}: {
  block: ContentBlock;
  onUpdate: (data: Record<string, unknown>) => void;
  isSelected: boolean;
  onGenerateSection?: (sectionType: string) => void;
  isGeneratingSection?: boolean;
}) {
  const contents = String(block.data?.contents || "");
  const isEmpty = !contents.trim();

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="h-5 w-5 text-yellow-500" />
        <span className="font-semibold">Tips</span>
      </div>
      {isEmpty && onGenerateSection ? (
        <div className="flex flex-col items-center justify-center py-6 gap-3 bg-muted/30 rounded-lg border-2 border-dashed">
          <Lightbulb className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No tips yet</p>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onGenerateSection("tips"); }}
            disabled={isGeneratingSection}
          >
            {isGeneratingSection ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Generate Tips
          </Button>
        </div>
      ) : (
        <textarea
          value={contents}
          onChange={(e) => onUpdate({ contents: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          placeholder="Enter tips (one per line)..."
          className="w-full min-h-[100px] bg-transparent border-none outline-none resize-none placeholder:text-muted-foreground/50 focus:ring-0"
          data-testid={`tips-contents-${block.id}`}
        />
      )}
    </div>
  );
}

// Info Grid Block Canvas
function InfoGridBlockCanvas({
  block,
  onUpdate,
  isSelected,
}: {
  block: ContentBlock;
  onUpdate: (data: Record<string, unknown>) => void;
  isSelected: boolean;
}) {
  const contents = String(block.data?.contents || "");

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-3">
        <LayoutGrid className="h-5 w-5 text-muted-foreground" />
        <span className="font-semibold">Info Grid</span>
      </div>
      <textarea
        value={contents}
        onChange={(e) => onUpdate({ contents: e.target.value })}
        onClick={(e) => e.stopPropagation()}
        placeholder="Enter info items (one per line)..."
        className="w-full min-h-[100px] bg-transparent border-none outline-none resize-none placeholder:text-muted-foreground/50 focus:ring-0"
        data-testid={`info-grid-contents-${block.id}`}
      />
    </div>
  );
}

// Gallery Block Canvas
function GalleryBlockCanvas({
  block,
  onUpdate,
  isSelected,
}: {
  block: ContentBlock;
  onUpdate: (data: Record<string, unknown>) => void;
  isSelected: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const images = (block.data?.images as Array<{ url: string; alt: string }>) || [];

  // Use unified image upload hook
  const { uploadFile: upload, uploadFiles, isUploading } = useImageUpload();

  const handleUpload = async (file: File) => {
    const result = await upload(file, {
      showSuccessToast: true,
      successMessage: "Image added to gallery"
    });
    if (result) {
      const newImages = [...images, { url: result.url, alt: file.name.replace(/\.[^/.]+$/, "") }];
      onUpdate({ images: newImages });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Upload files one by one to maintain gallery order
      for (const file of Array.from(files)) {
        await handleUpload(file);
      }
    }
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onUpdate({ images: newImages });
  };

  const updateImageAlt = (index: number, alt: string) => {
    const newImages = [...images];
    newImages[index] = { ...newImages[index], alt };
    onUpdate({ images: newImages });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-muted-foreground" />
          <span className="font-semibold">Gallery ({images.length} images)</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
          disabled={isUploading}
          data-testid={`gallery-add-image-${block.id}`}
        >
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          <span className="ml-1">Add Image</span>
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          data-testid={`gallery-file-input-${block.id}`}
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {images.map((img, index) => (
          <div key={index} className="relative group aspect-square rounded-md bg-muted overflow-hidden">
            <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
              <Button
                size="icon"
                variant="destructive"
                className="h-7 w-7"
                onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                data-testid={`gallery-remove-image-${block.id}-${index}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <input
              type="text"
              value={img.alt}
              onChange={(e) => updateImageAlt(index, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="Alt text..."
              className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs px-2 py-1 border-none outline-none"
              data-testid={`gallery-alt-input-${block.id}-${index}`}
            />
          </div>
        ))}
        {images.length === 0 && (
          <div
            className="aspect-square rounded-md bg-muted flex flex-col items-center justify-center cursor-pointer hover-elevate"
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
          >
            <ImagePlus className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <span className="text-xs text-muted-foreground">Click to add images</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Video Block Canvas
function VideoBlockCanvas({
  block,
  onUpdate,
  isSelected,
}: {
  block: ContentBlock;
  onUpdate: (data: Record<string, unknown>) => void;
  isSelected: boolean;
}) {
  const url = String(block.data?.url || "");
  const caption = String(block.data?.caption || "");

  // Extract video ID from YouTube or Vimeo URL
  const getEmbedUrl = (videoUrl: string) => {
    // YouTube
    const ytMatch = videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&\s]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    // Vimeo
    const vimeoMatch = videoUrl.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return "";
  };

  const embedUrl = getEmbedUrl(url);

  return (
    <div className={`p-4 ${isSelected ? "bg-muted/30" : ""}`} onClick={(e) => e.stopPropagation()}>
      {embedUrl ? (
        <div className="space-y-3">
          <div className="aspect-video rounded-lg overflow-hidden bg-black">
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          {caption && <p className="text-sm text-muted-foreground text-center">{caption}</p>}
        </div>
      ) : (
        <div className="aspect-video rounded-lg bg-gradient-to-br from-muted to-muted/50 flex flex-col items-center justify-center">
          <Video className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <Input
            value={url}
            onChange={(e) => onUpdate({ url: e.target.value })}
            placeholder="Paste YouTube or Vimeo URL..."
            className="max-w-md text-center"
            data-testid={`video-url-input-${block.id}`}
          />
          <p className="text-xs text-muted-foreground mt-2">Supports YouTube and Vimeo</p>
        </div>
      )}
    </div>
  );
}

// Quote Block Canvas
function QuoteBlockCanvas({
  block,
  onUpdate,
  isSelected,
}: {
  block: ContentBlock;
  onUpdate: (data: Record<string, unknown>) => void;
  isSelected: boolean;
}) {
  const text = String(block.data?.text || "");
  const author = String(block.data?.author || "");
  const role = String(block.data?.role || "");

  return (
    <div className={`p-6 ${isSelected ? "bg-muted/30" : ""}`} onClick={(e) => e.stopPropagation()}>
      <div className="relative pl-6 border-l-4 border-primary/60">
        <Quote className="absolute -left-3 -top-2 h-6 w-6 text-primary/40 bg-background" />
        <Textarea
          value={text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          placeholder="Enter quote text..."
          className="min-h-[100px] text-lg italic border-none bg-transparent resize-none focus-visible:ring-0 p-0"
          data-testid={`quote-text-input-${block.id}`}
        />
        <div className="flex gap-2 mt-3">
          <Input
            value={author}
            onChange={(e) => onUpdate({ author: e.target.value })}
            placeholder="Author name"
            className="max-w-[200px] text-sm font-medium"
            data-testid={`quote-author-input-${block.id}`}
          />
          <Input
            value={role}
            onChange={(e) => onUpdate({ role: e.target.value })}
            placeholder="Title/Role"
            className="max-w-[200px] text-sm text-muted-foreground"
            data-testid={`quote-role-input-${block.id}`}
          />
        </div>
      </div>
    </div>
  );
}

// Divider Block Canvas
function DividerBlockCanvas({
  block,
  onUpdate,
  isSelected,
}: {
  block: ContentBlock;
  onUpdate: (data: Record<string, unknown>) => void;
  isSelected: boolean;
}) {
  const style = String(block.data?.style || "line");

  return (
    <div className={`py-6 px-4 ${isSelected ? "bg-muted/30" : ""}`} onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          {style === "line" && <div className="h-px bg-border" />}
          {style === "dots" && (
            <div className="flex items-center justify-center gap-2">
              <span className="text-muted-foreground">•••</span>
            </div>
          )}
          {style === "space" && <div className="h-8" />}
        </div>
        {isSelected && (
          <Select value={style} onValueChange={(val) => onUpdate({ style: val })}>
            <SelectTrigger className="w-28 h-8" data-testid={`divider-style-${block.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="line">Line</SelectItem>
              <SelectItem value="dots">Dots</SelectItem>
              <SelectItem value="space">Space</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}

// Heading Block Canvas
function HeadingBlockCanvas({
  block,
  onUpdate,
  isSelected,
}: {
  block: ContentBlock;
  onUpdate: (data: Record<string, unknown>) => void;
  isSelected: boolean;
}) {
  const text = String(block.data?.text || "");
  const level = String(block.data?.level || "h2");

  return (
    <div className={`p-4 ${isSelected ? "bg-muted/30" : ""}`} onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-3">
        <Input
          value={text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          placeholder="Enter heading text..."
          className={`flex-1 border-none bg-transparent focus-visible:ring-0 ${level === "h2" ? "text-2xl font-bold" : "text-xl font-semibold"}`}
          data-testid={`heading-text-${block.id}`}
        />
        {isSelected && (
          <Select value={level} onValueChange={(val) => onUpdate({ level: val })}>
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="h2">H2</SelectItem>
              <SelectItem value="h3">H3</SelectItem>
              <SelectItem value="h4">H4</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}

// Spacer Block Canvas
function SpacerBlockCanvas({
  block,
  onUpdate,
  isSelected,
}: {
  block: ContentBlock;
  onUpdate: (data: Record<string, unknown>) => void;
  isSelected: boolean;
}) {
  const height = Number(block.data?.height || 40);

  return (
    <div className={`px-4 ${isSelected ? "bg-muted/30" : ""}`} onClick={(e) => e.stopPropagation()}>
      <div
        className="border-2 border-dashed border-muted-foreground/20 rounded flex items-center justify-center transition-all"
        style={{ height: `${height}px` }}
      >
        {isSelected && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{height}px</span>
            <input
              type="range"
              min="20"
              max="200"
              value={height}
              onChange={(e) => onUpdate({ height: Number(e.target.value) })}
              className="w-24"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Map Block Canvas
function MapBlockCanvas({
  block,
  onUpdate,
  isSelected,
}: {
  block: ContentBlock;
  onUpdate: (data: Record<string, unknown>) => void;
  isSelected: boolean;
}) {
  const address = String(block.data?.address || "");
  const lat = Number(block.data?.lat || 25.2048);
  const lng = Number(block.data?.lng || 55.2708);

  const mapUrl = address
    ? `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(address)}`
    : `https://www.google.com/maps/embed/v1/view?key=${GOOGLE_MAPS_API_KEY}&center=${lat},${lng}&zoom=14`;

  // Check if API key is configured
  const hasApiKey = GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY.length > 0;

  return (
    <div className={`p-4 ${isSelected ? "bg-muted/30" : ""}`} onClick={(e) => e.stopPropagation()}>
      {!hasApiKey ? (
        <div className="aspect-video rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border-2 border-yellow-200 dark:border-yellow-800 flex flex-col items-center justify-center p-6">
          <Map className="h-12 w-12 text-yellow-600 dark:text-yellow-400 mb-3" />
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">Google Maps API Key Required</p>
          <p className="text-xs text-yellow-700 dark:text-yellow-300 text-center">
            Set VITE_GOOGLE_MAPS_API_KEY environment variable to enable map embeds
          </p>
        </div>
      ) : address ? (
        <div className="space-y-3">
          <div className="aspect-video rounded-lg overflow-hidden bg-muted">
            <iframe
              src={mapUrl}
              className="w-full h-full border-0"
              allowFullScreen
              loading="lazy"
            />
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {address}
          </p>
        </div>
      ) : (
        <div className="aspect-video rounded-lg bg-gradient-to-br from-muted to-muted/50 flex flex-col items-center justify-center">
          <Map className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <Input
            value={address}
            onChange={(e) => onUpdate({ address: e.target.value })}
            placeholder="Enter location address..."
            className="max-w-md text-center"
            data-testid={`map-address-${block.id}`}
          />
          <p className="text-xs text-muted-foreground mt-2">e.g., Burj Khalifa, Dubai</p>
        </div>
      )}
    </div>
  );
}

// Social Block Canvas
function SocialBlockCanvas({
  block,
  onUpdate,
  isSelected,
}: {
  block: ContentBlock;
  onUpdate: (data: Record<string, unknown>) => void;
  isSelected: boolean;
}) {
  const links = (block.data?.links as Array<{ platform: string; url: string }>) || [];

  const addLink = () => {
    onUpdate({ links: [...links, { platform: "instagram", url: "" }] });
  };

  const updateLink = (index: number, field: string, value: string) => {
    const newLinks = [...links];
    newLinks[index] = { ...newLinks[index], [field]: value };
    onUpdate({ links: newLinks });
  };

  const removeLink = (index: number) => {
    onUpdate({ links: links.filter((_, i) => i !== index) });
  };

  const platforms = ["instagram", "facebook", "twitter", "youtube", "tiktok", "linkedin", "whatsapp"];

  return (
    <div className={`p-4 ${isSelected ? "bg-muted/30" : ""}`} onClick={(e) => e.stopPropagation()}>
      <div className="space-y-3">
        {links.map((link, index) => (
          <div key={index} className="flex items-center gap-2">
            <Select value={link.platform} onValueChange={(val) => updateLink(index, "platform", val)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {platforms.map((p) => (
                  <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={link.url}
              onChange={(e) => updateLink(index, "url", e.target.value)}
              placeholder="Profile URL..."
              className="flex-1"
            />
            <Button variant="ghost" size="icon" onClick={() => removeLink(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addLink} className="w-full">
          <Plus className="h-4 w-4 mr-2" /> Add Social Link
        </Button>
      </div>
    </div>
  );
}

// Accordion Block Canvas
function AccordionBlockCanvas({
  block,
  onUpdate,
  isSelected,
}: {
  block: ContentBlock;
  onUpdate: (data: Record<string, unknown>) => void;
  isSelected: boolean;
}) {
  const items = (block.data?.items as Array<{ title: string; contents: string }>) || [];
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const addItem = () => {
    onUpdate({ items: [...items, { title: "", contents: "" }] });
  };

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onUpdate({ items: newItems });
  };

  const removeItem = (index: number) => {
    onUpdate({ items: items.filter((_, i) => i !== index) });
  };

  return (
    <div className={`p-4 ${isSelected ? "bg-muted/30" : ""}`} onClick={(e) => e.stopPropagation()}>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="border rounded-lg overflow-hidden">
            <div
              className="flex items-center gap-2 p-3 bg-muted/50 cursor-pointer"
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
            >
              <ChevronRight className={`h-4 w-4 transition-transform ${openIndex === index ? "rotate-90" : ""}`} />
              <Input
                value={item.title}
                onChange={(e) => { e.stopPropagation(); updateItem(index, "title", e.target.value); }}
                onClick={(e) => e.stopPropagation()}
                placeholder="Accordion title..."
                className="flex-1 border-none bg-transparent p-0 h-auto focus-visible:ring-0"
              />
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); removeItem(index); }}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            {openIndex === index && (
              <div className="p-3 border-t">
                <Textarea
                  value={item.contents}
                  onChange={(e) => updateItem(index, "contents", e.target.value)}
                  placeholder="Accordion contents..."
                  className="min-h-[80px]"
                />
              </div>
            )}
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addItem} className="w-full">
          <Plus className="h-4 w-4 mr-2" /> Add Accordion Item
        </Button>
      </div>
    </div>
  );
}

// Tabs Block Canvas
function TabsBlockCanvas({
  block,
  onUpdate,
  isSelected,
}: {
  block: ContentBlock;
  onUpdate: (data: Record<string, unknown>) => void;
  isSelected: boolean;
}) {
  const tabs = (block.data?.tabs as Array<{ title: string; contents: string }>) || [];
  const [activeTab, setActiveTab] = useState(0);

  const addTab = () => {
    onUpdate({ tabs: [...tabs, { title: `Tab ${tabs.length + 1}`, contents: "" }] });
  };

  const updateTab = (index: number, field: string, value: string) => {
    const newTabs = [...tabs];
    newTabs[index] = { ...newTabs[index], [field]: value };
    onUpdate({ tabs: newTabs });
  };

  const removeTab = (index: number) => {
    if (tabs.length > 1) {
      onUpdate({ tabs: tabs.filter((_, i) => i !== index) });
      if (activeTab >= tabs.length - 1) setActiveTab(Math.max(0, tabs.length - 2));
    }
  };

  return (
    <div className={`p-4 ${isSelected ? "bg-muted/30" : ""}`} onClick={(e) => e.stopPropagation()}>
      <div className="space-y-3">
        <div className="flex items-center gap-1 border-b">
          {tabs.map((tab, index) => (
            <div key={index} className="relative group">
              <button
                className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === index ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setActiveTab(index)}
              >
                <Input
                  value={tab.title}
                  onChange={(e) => updateTab(index, "title", e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-20 border-none bg-transparent p-0 h-auto text-center focus-visible:ring-0"
                />
              </button>
              {tabs.length > 1 && (
                <button
                  className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 bg-destructive text-destructive-foreground rounded-full p-0.5"
                  onClick={(e) => { e.stopPropagation(); removeTab(index); }}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={addTab} className="h-8">
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        {tabs[activeTab] && (
          <Textarea
            value={tabs[activeTab].contents}
            onChange={(e) => updateTab(activeTab, "contents", e.target.value)}
            placeholder="Tab contents..."
            className="min-h-[120px]"
          />
        )}
      </div>
    </div>
  );
}

// Columns Block Canvas
function ColumnsBlockCanvas({
  block,
  onUpdate,
  isSelected,
}: {
  block: ContentBlock;
  onUpdate: (data: Record<string, unknown>) => void;
  isSelected: boolean;
}) {
  const left = String(block.data?.left || "");
  const right = String(block.data?.right || "");

  return (
    <div className={`p-4 ${isSelected ? "bg-muted/30" : ""}`} onClick={(e) => e.stopPropagation()}>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Left Column</Label>
          <Textarea
            value={left}
            onChange={(e) => onUpdate({ left: e.target.value })}
            placeholder="Left column contents..."
            className="min-h-[100px]"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Right Column</Label>
          <Textarea
            value={right}
            onChange={(e) => onUpdate({ right: e.target.value })}
            placeholder="Right column contents..."
            className="min-h-[100px]"
          />
        </div>
      </div>
    </div>
  );
}

// HTML Block Canvas
function HtmlBlockCanvas({
  block,
  onUpdate,
  isSelected,
}: {
  block: ContentBlock;
  onUpdate: (data: Record<string, unknown>) => void;
  isSelected: boolean;
}) {
  const code = String(block.data?.code || "");
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className={`p-4 ${isSelected ? "bg-muted/30" : ""}`} onClick={(e) => e.stopPropagation()}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <Code className="h-3 w-3" /> Custom HTML / Embed
          </Label>
          <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? "Edit" : "Preview"}
          </Button>
        </div>
        {showPreview ? (
          <div
            className="border rounded-lg p-4 min-h-[100px] bg-background"
            dangerouslySetInnerHTML={{ __html: sanitizeHTML(code) }}
          />
        ) : (
          <Textarea
            value={code}
            onChange={(e) => onUpdate({ code: e.target.value })}
            placeholder="<iframe>...</iframe> or custom HTML..."
            className="min-h-[150px] font-mono text-sm"
          />
        )}
      </div>
    </div>
  );
}

// Preview Block Component
function PreviewBlock({ block, title }: { block: ContentBlock; title: string }) {
  if (block.type === "hero") {
    const hasImage = !!block.data?.image;
    return (
      <div className="relative aspect-[21/9] bg-gradient-to-br from-muted to-muted/50">
        {hasImage && <img src={String(block.data.image)} alt={String(block.data?.alt || "")} className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <h1 className="text-4xl font-bold text-white">{title || "Untitled"}</h1>
        </div>
      </div>
    );
  }

  if (block.type === "text") {
    return (
      <div className="p-8">
        <p className="text-lg leading-relaxed whitespace-pre-wrap">{String(block.data?.contents || "")}</p>
      </div>
    );
  }

  if (block.type === "heading") {
    return (
      <div className="p-8">
        <h2 className="text-2xl font-bold">{String(block.data?.contents || "")}</h2>
      </div>
    );
  }

  if (block.type === "image" && block.data?.image) {
    return (
      <div className="p-8">
        <img src={String(block.data.image)} alt={String(block.data?.alt || "")} className="w-full rounded-lg" />
        {block.data?.caption ? <p className="text-sm text-muted-foreground text-center mt-2">{String(block.data.caption)}</p> : null}
      </div>
    );
  }

  if (block.type === "gallery") {
    const images = (block.data?.images as Array<{ url: string; alt: string }>) || [];
    if (images.length === 0) return null;
    return (
      <div className="p-8">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((img: { url: string; alt: string }, i: number) => (
            <img key={i} src={img.url} alt={img.alt} className="w-full aspect-square object-cover rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (block.type === "video") {
    const videoUrl = String(block.data?.url || "");
    if (!videoUrl) return null;
    return (
      <div className="p-8">
        <div className="aspect-video rounded-lg overflow-hidden bg-muted">
          <iframe src={videoUrl} className="w-full h-full border-0" allowFullScreen />
        </div>
      </div>
    );
  }

  if (block.type === "quote") {
    return (
      <div className="p-8">
        <blockquote className="border-l-4 border-primary pl-6 italic text-lg">
          <p>{String(block.data?.contents || "")}</p>
          {block.data?.author ? <cite className="block mt-2 text-sm text-muted-foreground">— {String(block.data.author)}</cite> : null}
        </blockquote>
      </div>
    );
  }

  if (block.type === "divider") {
    return (
      <div className="p-8">
        <hr className="border-t border-border" />
      </div>
    );
  }

  if (block.type === "faq") {
    return (
      <div className="p-8 space-y-2 border-b last:border-b-0">
        <h3 className="text-xl font-semibold">{String(block.data?.question || "Question")}</h3>
        <p className="text-muted-foreground">{String(block.data?.answer || "Answer")}</p>
      </div>
    );
  }

  if (block.type === "tips") {
    const contents = String(block.data?.contents || "");
    if (!contents) return null;
    return (
      <div className="p-8">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <div className="flex gap-3">
            <Lightbulb className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-amber-900">{contents}</p>
          </div>
        </div>
      </div>
    );
  }

  if (block.type === "highlights") {
    const items = (block.data?.items as string[]) || [];
    if (items.length === 0) return null;
    return (
      <div className="p-8">
        <div className="bg-primary/5 rounded-lg p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Highlights
          </h3>
          <ul className="space-y-2">
            {items.map((item: string, i: number) => (
              <li key={i} className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (block.type === "map") {
    const address = String(block.data?.address || "");
    if (!address) return null;
    const mapUrl = `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(address)}`;
    return (
      <div className="p-8">
        <div className="aspect-video rounded-lg overflow-hidden bg-muted">
          <iframe src={mapUrl} className="w-full h-full border-0" loading="lazy" />
        </div>
        <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
          <MapPin className="h-3 w-3" /> {address}
        </p>
      </div>
    );
  }

  if (block.type === "cta") {
    return (
      <div className="p-8 text-center">
        <Button size="lg">{String(block.data?.text || "Click here")}</Button>
      </div>
    );
  }

  if (block.type === "html") {
    const code = String(block.data?.code || "");
    if (!code) return null;
    return (
      <div className="p-8">
        <div
          className="rounded-lg overflow-hidden"
          dangerouslySetInnerHTML={{ __html: sanitizeHTML(code) }}
        />
      </div>
    );
  }

  // Fallback for unknown block types - show a placeholder in preview
  return null;
}

// Block Settings Panel
function BlockSettingsPanel({
  block,
  onUpdate,
  onGenerateImage,
  isGeneratingImage,
}: {
  block: ContentBlock;
  onUpdate: (data: Record<string, unknown>) => void;
  onGenerateImage: () => void;
  isGeneratingImage: boolean;
}) {
  if (block.type === "hero" || block.type === "image") {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Image URL</Label>
          <Input
            value={String(block.data?.image || "")}
            onChange={(e) => onUpdate({ image: e.target.value })}
            placeholder="https://..."
            data-testid={`settings-image-url-${block.id}`}
          />
        </div>
        <div className="space-y-2">
          <Label>Alt Text</Label>
          <Input
            value={String(block.data?.alt || "")}
            onChange={(e) => onUpdate({ alt: e.target.value })}
            placeholder="Describe the image..."
            data-testid={`settings-image-alt-${block.id}`}
          />
        </div>
        <Separator />
        <div className="space-y-2">
          <Label>AI Image Generation</Label>
          <Button variant="outline" className="w-full" onClick={onGenerateImage} disabled={isGeneratingImage} data-testid={`settings-generate-image-${block.id}`}>
            {isGeneratingImage ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Generate with AI
          </Button>
        </div>
      </div>
    );
  }

  if (block.type === "cta") {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Button Text</Label>
          <Input
            value={String(block.data?.text || "")}
            onChange={(e) => onUpdate({ text: e.target.value })}
            placeholder="Click here"
            data-testid={`settings-cta-text-${block.id}`}
          />
        </div>
        <div className="space-y-2">
          <Label>Button URL</Label>
          <Input
            value={String(block.data?.url || "")}
            onChange={(e) => onUpdate({ url: e.target.value })}
            placeholder="https://..."
            data-testid={`settings-cta-url-${block.id}`}
          />
        </div>
        <div className="space-y-2">
          <Label>Button Style</Label>
          <Select value={String(block.data?.style || "primary")} onValueChange={(val) => onUpdate({ style: val })}>
            <SelectTrigger data-testid={`settings-cta-style-${block.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="primary">Primary</SelectItem>
              <SelectItem value="secondary">Secondary</SelectItem>
              <SelectItem value="outline">Outline</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  if (block.type === "video") {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Video URL</Label>
          <Input
            value={String(block.data?.url || "")}
            onChange={(e) => onUpdate({ url: e.target.value })}
            placeholder="YouTube or Vimeo URL"
            data-testid={`settings-video-url-${block.id}`}
          />
          <p className="text-xs text-muted-foreground">Supports YouTube and Vimeo links</p>
        </div>
        <div className="space-y-2">
          <Label>Caption (optional)</Label>
          <Input
            value={String(block.data?.caption || "")}
            onChange={(e) => onUpdate({ caption: e.target.value })}
            placeholder="Video description..."
            data-testid={`settings-video-caption-${block.id}`}
          />
        </div>
      </div>
    );
  }

  if (block.type === "quote") {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Quote Text</Label>
          <Textarea
            value={String(block.data?.text || "")}
            onChange={(e) => onUpdate({ text: e.target.value })}
            placeholder="Enter the quote..."
            data-testid={`settings-quote-text-${block.id}`}
          />
        </div>
        <div className="space-y-2">
          <Label>Author Name</Label>
          <Input
            value={String(block.data?.author || "")}
            onChange={(e) => onUpdate({ author: e.target.value })}
            placeholder="Who said this?"
            data-testid={`settings-quote-author-${block.id}`}
          />
        </div>
        <div className="space-y-2">
          <Label>Author Title/Role</Label>
          <Input
            value={String(block.data?.role || "")}
            onChange={(e) => onUpdate({ role: e.target.value })}
            placeholder="CEO, Traveler, etc."
            data-testid={`settings-quote-role-${block.id}`}
          />
        </div>
      </div>
    );
  }

  if (block.type === "divider") {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Divider Style</Label>
          <Select value={String(block.data?.style || "line")} onValueChange={(val) => onUpdate({ style: val })}>
            <SelectTrigger data-testid={`settings-divider-style-${block.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="line">Line</SelectItem>
              <SelectItem value="dots">Dots</SelectItem>
              <SelectItem value="space">Spacer</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  return (
    <div className="text-sm text-muted-foreground text-center py-4">
      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
      <p>Edit this block directly on the canvas.</p>
    </div>
  );
}

// Page Settings Panel
function PageSettingsPanel({
  title,
  onTitleChange,
  slug,
  onSlugChange,
  status,
  onStatusChange,
  scheduledDate,
  onScheduledDateChange,
  metaTitle,
  onMetaTitleChange,
  metaDescription,
  onMetaDescriptionChange,
  primaryKeyword,
  onPrimaryKeywordChange,
  secondaryKeywords,
  onSecondaryKeywordsChange,
  internalLinksText,
  onInternalLinksTextChange,
  externalLinksText,
  onExternalLinksTextChange,
  contentId,
  contentType = "article",
  selectedWriterId,
  onWriterSelect,
}: {
  title: string;
  onTitleChange: (v: string) => void;
  slug: string;
  onSlugChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
  scheduledDate?: Date;
  onScheduledDateChange?: (v: Date | undefined) => void;
  metaTitle: string;
  onMetaTitleChange: (v: string) => void;
  metaDescription: string;
  onMetaDescriptionChange: (v: string) => void;
  primaryKeyword: string;
  onPrimaryKeywordChange: (v: string) => void;
  secondaryKeywords: string;
  onSecondaryKeywordsChange: (v: string) => void;
  internalLinksText: string;
  onInternalLinksTextChange: (v: string) => void;
  externalLinksText: string;
  onExternalLinksTextChange: (v: string) => void;
  contentId?: string;
  contentType?: string;
  selectedWriterId?: string;
  onWriterSelect?: (writerId: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Basic */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium">Basic</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Title</Label>
            <AITitleSuggestions
              currentTitle={title}
              contentType={contentType}
              onSelectTitle={(newTitle: string) => {
                onTitleChange(newTitle);
                if (!slug || slug === generateSlug(title)) {
                  onSlugChange(generateSlug(newTitle));
                }
              }}
            />
          </div>
          <Input
            value={title}
            onChange={(e) => {
              onTitleChange(e.target.value);
              if (!slug || slug === generateSlug(title)) {
                onSlugChange(generateSlug(e.target.value));
              }
            }}
            placeholder="Page title..."
            data-testid="settings-title"
          />
        </div>
        <div className="space-y-2">
          <Label>URL Slug</Label>
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">/</span>
            <Input
              value={slug}
              onChange={(e) => onSlugChange(e.target.value)}
              placeholder="url-slug"
              className="font-mono text-sm"
              data-testid="settings-slug"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger data-testid="settings-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="in_review">In Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {status === "scheduled" && onScheduledDateChange && (
          <div className="space-y-2">
            <Label>Scheduled Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  data-testid="settings-scheduled-date"
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {scheduledDate ? format(scheduledDate, "PPP 'at' p") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={scheduledDate}
                  onSelect={onScheduledDateChange}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
                <div className="p-3 border-t">
                  <Label className="text-xs text-muted-foreground">Time</Label>
                  <Input
                    type="time"
                    value={scheduledDate ? format(scheduledDate, "HH:mm") : "12:00"}
                    onChange={(e) => {
                      const [hours, minutes] = e.target.value.split(":").map(Number);
                      const newDate = scheduledDate ? new Date(scheduledDate) : new Date();
                      newDate.setHours(hours, minutes, 0, 0);
                      onScheduledDateChange(newDate);
                    }}
                    className="mt-1"
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}
        {onWriterSelect && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI Writer
            </Label>
            <WriterSelector
              contentType={contentType}
              topic={title}
              onSelect={(writer) => onWriterSelect(writer.id)}
              selectedWriterId={selectedWriterId}
            />
            {selectedWriterId && (
              <p className="text-xs text-muted-foreground">
                Content will be written in this writer's unique voice and style
              </p>
            )}
          </div>
        )}
      </div>

      <Separator />

      {/* SEO */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium">SEO</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Meta Title</Label>
            <div className="flex items-center gap-2">
              <AIFieldAssistant
                fieldName="Meta Title"
                fieldType="metaTitle"
                currentValue={metaTitle}
                contentContext={{
                  title,
                  contentType,
                  primaryKeyword,
                }}
                onApply={onMetaTitleChange}
                maxLength={60}
              />
              <span className={`text-xs ${metaTitle.length > 60 ? "text-destructive" : "text-muted-foreground"}`}>
                {metaTitle.length}/60
              </span>
            </div>
          </div>
          <Input
            value={metaTitle}
            onChange={(e) => onMetaTitleChange(e.target.value)}
            placeholder="SEO title..."
            data-testid="settings-meta-title"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Meta Description</Label>
            <div className="flex items-center gap-2">
              <AIFieldAssistant
                fieldName="Meta Description"
                fieldType="metaDescription"
                currentValue={metaDescription}
                contentContext={{
                  title,
                  contentType,
                  primaryKeyword,
                }}
                onApply={onMetaDescriptionChange}
                maxLength={155}
              />
              <span className={`text-xs ${metaDescription.length > 155 ? "text-destructive" : "text-muted-foreground"}`}>
                {metaDescription.length}/155
              </span>
            </div>
          </div>
          <Textarea
            value={metaDescription}
            onChange={(e) => onMetaDescriptionChange(e.target.value)}
            placeholder="SEO description..."
            className="min-h-[80px]"
            data-testid="settings-meta-description"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Primary Keyword</Label>
            <AIFieldAssistant
              fieldName="Primary Keyword"
              fieldType="keyword"
              currentValue={primaryKeyword}
              contentContext={{
                title,
                contentType,
                primaryKeyword,
              }}
              onApply={onPrimaryKeywordChange}
            />
          </div>
          <Input
            value={primaryKeyword}
            onChange={(e) => onPrimaryKeywordChange(e.target.value)}
            placeholder="Main keyword..."
            data-testid="settings-primary-keyword"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Secondary Keywords</Label>
            <AIFieldAssistant
              fieldName="Secondary Keywords"
              fieldType="secondaryKeywords"
              currentValue={secondaryKeywords}
              contentContext={{
                title,
                contentType,
                primaryKeyword,
              }}
              onApply={onSecondaryKeywordsChange}
            />
          </div>
          <Textarea
            value={secondaryKeywords}
            onChange={(e) => onSecondaryKeywordsChange(e.target.value)}
            placeholder="Comma-separated LSI keywords..."
            className="min-h-[60px]"
            data-testid="settings-secondary-keywords"
          />
          <p className="text-xs text-muted-foreground">
            Add related/LSI keywords separated by commas
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Internal Links</Label>
            <AIFieldAssistant
              fieldName="Internal Links"
              fieldType="internalLinks"
              currentValue={internalLinksText}
              contentContext={{
                title,
                contentType,
                primaryKeyword,
              }}
              onApply={onInternalLinksTextChange}
            />
          </div>
          <Textarea
            value={internalLinksText}
            onChange={(e) => onInternalLinksTextChange(e.target.value)}
            placeholder="Anchor text | Target page..."
            className="min-h-[80px] font-mono text-xs"
            data-testid="settings-internal-links"
          />
          <p className="text-xs text-muted-foreground">
            Format: Anchor text | Target page (one per line)
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>External Links</Label>
            <AIFieldAssistant
              fieldName="External Links"
              fieldType="externalLinks"
              currentValue={externalLinksText}
              contentContext={{
                title,
                contentType,
                primaryKeyword,
              }}
              onApply={onExternalLinksTextChange}
            />
          </div>
          <Textarea
            value={externalLinksText}
            onChange={(e) => onExternalLinksTextChange(e.target.value)}
            placeholder="Anchor text | URL..."
            className="min-h-[80px] font-mono text-xs"
            data-testid="settings-external-links"
          />
          <p className="text-xs text-muted-foreground">
            Format: Anchor text | URL (one per line)
          </p>
        </div>
      </div>

      <Separator />

      {/* Search Preview */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Search Preview</h4>
        <div className="p-3 rounded-lg bg-muted space-y-1">
          <div className="text-blue-600 dark:text-blue-400 truncate">
            {metaTitle || title || "Page Title"}
          </div>
          <div className="text-green-700 dark:text-green-500 text-sm font-mono truncate">
            example.com/{slug || "page-url"}
          </div>
          <div className="text-sm text-muted-foreground line-clamp-2">
            {metaDescription || "Meta description will appear here..."}
          </div>
        </div>
      </div>

      {contentId && (
        <>
          <Separator />
          <SchemaPreview contentId={contentId} />
        </>
      )}
    </div>
  );
}
