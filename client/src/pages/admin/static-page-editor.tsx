import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { sanitizeHTML } from "@/lib/sanitize";
import mammoth from "mammoth";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { SUPPORTED_LOCALES } from "@shared/schema";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  Save,
  Eye,
  Send,
  Plus,
  Trash2,
  Copy,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Type,
  Heading2,
  HelpCircle,
  MousePointer,
  Minus,
  Image,
  Quote,
  Loader2,
  ClipboardPaste,
  FileUp,
  Languages,
} from "lucide-react";

interface StaticPageBlock {
  id: string;
  type: "heading" | "text" | "faq" | "cta" | "divider" | "image" | "quote";
  data: Record<string, unknown>;
}

interface StaticPage {
  id: string;
  slug: string;
  title: string;
  titleHe: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  contents: string | null;
  contentHe: string | null;
  blocks: StaticPageBlock[];
  isActive: boolean;
  showInFooter: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BlockTypeConfig {
  type: StaticPageBlock["type"];
  label: string;
  icon: typeof Type;
  description: string;
}

const blockTypes: BlockTypeConfig[] = [
  { type: "heading", label: "Heading", icon: Heading2, description: "H2 or H3 heading" },
  { type: "text", label: "Text", icon: Type, description: "Rich text contents" },
  { type: "faq", label: "FAQ", icon: HelpCircle, description: "Question & answer" },
  { type: "cta", label: "CTA Button", icon: MousePointer, description: "Call to action" },
  { type: "divider", label: "Divider", icon: Minus, description: "Horizontal line" },
  { type: "image", label: "Image", icon: Image, description: "Image with caption" },
  { type: "quote", label: "Quote", icon: Quote, description: "Blockquote" },
];

function generateBlockId(): string {
  return `block-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function getDefaultBlockData(type: StaticPageBlock["type"]): Record<string, unknown> {
  switch (type) {
    case "heading":
      return { level: "h2", contents: "", contentHe: "" };
    case "text":
      return { contents: "", contentHe: "" };
    case "faq":
      return { question: "", questionHe: "", answer: "", answerHe: "" };
    case "cta":
      return { text: "", textHe: "", link: "", variant: "primary" };
    case "divider":
      return { style: "line" };
    case "image":
      return { url: "", alt: "", altHe: "", caption: "", captionHe: "" };
    case "quote":
      return { text: "", textHe: "", author: "", authorHe: "" };
    default:
      return {};
  }
}

function detectWordHeadingLevel(el: HTMLElement): number | null {
  const className = el.className || "";
  if (/MsoHeading1|Heading1/i.test(className)) return 1;
  if (/MsoHeading2|Heading2/i.test(className)) return 2;
  if (/MsoHeading3|Heading3/i.test(className)) return 3;
  if (/MsoTitle|Title/i.test(className)) return 1;

  const style = el.getAttribute("style") || "";
  const fontSizeMatch = style.match(/font-size:\s*(\d+)/i);
  const fontWeight = style.match(/font-weight:\s*(\d+|bold)/i);
  if (fontSizeMatch && fontWeight) {
    const size = parseInt(fontSizeMatch[1], 10);
    const isBold = fontWeight[1] === "bold" || parseInt(fontWeight[1], 10) >= 600;
    if (isBold && size >= 18) return 2;
    if (isBold && size >= 14) return 3;
  }
  return null;
}

function isBoldOnlyParagraph(el: HTMLElement): boolean {
  const textContent = el.textContent?.trim() || "";
  if (!textContent || textContent.length > 150) return false;

  const cloned = el.cloneNode(true) as HTMLElement;
  const links = cloned.querySelectorAll("a");
  links.forEach(a => {
    const span = document.createElement("span");
    span.innerHTML = a.innerHTML;
    a.replaceWith(span);
  });

  const boldContent = cloned.querySelectorAll("b, strong");
  if (boldContent.length === 0) return false;

  let boldText = "";
  boldContent.forEach(b => {
    boldText += b.textContent || "";
  });
  const normalizedBold = boldText.replace(/\s+/g, "").toLowerCase();
  const normalizedFull = textContent.replace(/\s+/g, "").toLowerCase();

  return normalizedBold === normalizedFull && normalizedFull.length > 0;
}

function cleanPastedHtml(html: string): string {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;

  const removeElements = tempDiv.querySelectorAll(
    "meta, style, script, link, title, xml, o\\:p, font[face], font[size]"
  );
  removeElements.forEach(el => el.remove());

  const paragraphs = tempDiv.querySelectorAll("p");
  paragraphs.forEach(p => {
    const headingLevel = detectWordHeadingLevel(p);
    if (headingLevel) {
      const tag = headingLevel === 1 ? "h2" : headingLevel === 2 ? "h2" : "h3";
      const h = document.createElement(tag);
      h.innerHTML = p.innerHTML;
      p.replaceWith(h);
    } else if (isBoldOnlyParagraph(p)) {
      const h = document.createElement("h2");
      h.textContent = p.textContent?.trim() || "";
      p.replaceWith(h);
    }
  });

  const allElements = tempDiv.querySelectorAll("*");
  allElements.forEach(el => {
    const htmlEl = el as HTMLElement;
    const attributesToRemove: string[] = [];
    for (let i = 0; i < htmlEl.attributes.length; i++) {
      const attr = htmlEl.attributes[i];
      if (
        attr.name.startsWith("data-") ||
        attr.name.startsWith("mso-") ||
        attr.name === "class" ||
        attr.name === "style" ||
        attr.name === "lang" ||
        attr.name === "dir"
      ) {
        attributesToRemove.push(attr.name);
      }
    }
    attributesToRemove.forEach(attr => htmlEl.removeAttribute(attr));
  });

  const emptySpans = tempDiv.querySelectorAll("span:empty, p:empty, div:empty");
  emptySpans.forEach(el => {
    if (!el.querySelector("*")) {
      el.remove();
    }
  });

  const spans = tempDiv.querySelectorAll("span");
  spans.forEach(span => {
    if (!span.innerHTML.trim()) {
      span.remove();
    } else {
      const parent = span.parentNode;
      if (parent) {
        while (span.firstChild) {
          parent.insertBefore(span.firstChild, span);
        }
        parent.removeChild(span);
      }
    }
  });

  let cleaned = tempDiv.innerHTML;
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, "");
  cleaned = cleaned.replace(/<o:p>[\s\S]*?<\/o:p>/gi, "");
  cleaned = cleaned.replace(/\s{2,}/g, " ");
  cleaned = cleaned.replace(/&nbsp;/g, " ");

  return sanitizeHTML(cleaned);
}

function parseDocumentToBlocks(html: string): StaticPageBlock[] {
  const cleanedHtml = cleanPastedHtml(html);
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = cleanedHtml;

  const blocks: StaticPageBlock[] = [];
  let currentTextContent = "";

  const flushTextContent = () => {
    if (currentTextContent.trim()) {
      const cleaned = currentTextContent.trim().replace(/<p>\s*<\/p>/g, "");
      if (cleaned) {
        blocks.push({
          id: generateBlockId(),
          type: "text",
          data: { contents: cleaned, contentHe: "" },
        });
      }
      currentTextContent = "";
    }
  };

  const processNode = (node: ChildNode) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        currentTextContent += `<p>${text}</p>`;
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as HTMLElement;
    const tagName = el.tagName.toLowerCase();

    if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(tagName)) {
      flushTextContent();
      const headingText = el.textContent?.trim() || "";
      if (headingText) {
        const level = tagName === "h1" || tagName === "h2" ? "h2" : "h3";
        blocks.push({
          id: generateBlockId(),
          type: "heading",
          data: { level, contents: headingText, contentHe: "" },
        });
      }
    } else if (tagName === "p") {
      const innerHTML = el.innerHTML.trim();
      if (innerHTML) {
        currentTextContent += `<p>${innerHTML}</p>`;
      }
    } else if (
      tagName === "div" ||
      tagName === "span" ||
      tagName === "section" ||
      tagName === "article"
    ) {
      for (const child of Array.from(el.childNodes)) {
        processNode(child);
      }
    } else if (["ul", "ol"].includes(tagName)) {
      currentTextContent += el.outerHTML;
    } else if (tagName === "br") {
      currentTextContent += "<br>";
    } else {
      for (const child of Array.from(el.childNodes)) {
        processNode(child);
      }
    }
  };

  for (const child of Array.from(tempDiv.childNodes)) {
    processNode(child);
  }

  flushTextContent();

  return blocks;
}

function normalizeBlocks(blocks: StaticPageBlock[]): StaticPageBlock[] {
  return blocks.map(block => {
    if (block.type === "heading" && block.data.level === "h1") {
      return { ...block, data: { ...block.data, level: "h2" } };
    }
    return block;
  });
}

function SortableBlock({
  block,
  isExpanded,
  onToggleExpand,
  onDelete,
  onDuplicate,
  onUpdate,
  activeTab,
}: {
  block: StaticPageBlock;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onUpdate: (data: Record<string, unknown>) => void;
  activeTab: "en" | "he";
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const blockConfig = blockTypes.find(b => b.type === block.type);
  const Icon = blockConfig?.icon || Type;

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const html = e.clipboardData.getData("text/html");
      if (html) {
        e.preventDefault();
        const cleanedHtml = cleanPastedHtml(html);
        const field = activeTab === "he" ? "contentHe" : "contents";
        onUpdate({ ...block.data, [field]: cleanedHtml });
      }
    },
    [block.data, onUpdate, activeTab]
  );

  return (
    <div ref={setNodeRef} style={style} className="mb-3">
      <Card className={isDragging ? "ring-2 ring-primary" : ""}>
        <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
          <CardHeader className="py-2 px-3">
            <div className="flex items-center gap-2">
              <button
                {...attributes}
                {...listeners}
                className="cursor-grab p-1 hover:bg-muted rounded"
                data-testid={`drag-handle-${block.id}`}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </button>
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium flex-1">{blockConfig?.label}</span>
              <Badge variant="outline" className="text-xs">
                {block.type}
              </Badge>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" data-testid={`toggle-block-${block.id}`}>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid={`block-menu-${block.id}`}>
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 15 15"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM12.5 8.625C13.1213 8.625 13.625 8.12132 13.625 7.5C13.625 6.87868 13.1213 6.375 12.5 6.375C11.8787 6.375 11.375 6.87868 11.375 7.5C11.375 8.12132 11.8787 8.625 12.5 8.625Z"
                        fill="currentColor"
                        fillRule="evenodd"
                        clipRule="evenodd"
                      ></path>
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={onDuplicate}
                    data-testid={`duplicate-block-${block.id}`}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-destructive"
                    data-testid={`delete-block-${block.id}`}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-3 px-3">
              <Separator className="mb-3" />
              <BlockEditor
                block={block}
                onUpdate={onUpdate}
                activeTab={activeTab}
                onPaste={handlePaste}
              />
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}

function BlockEditor({
  block,
  onUpdate,
  activeTab,
  onPaste,
}: {
  block: StaticPageBlock;
  onUpdate: (data: Record<string, unknown>) => void;
  activeTab: "en" | "he";
  onPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
}) {
  const data = block.data;
  const isHebrew = activeTab === "he";
  const dir = isHebrew ? "rtl" : "ltr";

  switch (block.type) {
    case "heading":
      return (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
            Note: The page title is automatically rendered as H1. Use H2 for main sections and H3
            for subsections.
          </p>
          <div className="space-y-2">
            <Label>Heading Level</Label>
            <Select
              value={(data.level as string) || "h2"}
              onValueChange={value => onUpdate({ ...data, level: value })}
            >
              <SelectTrigger data-testid={`heading-level-${block.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="h2">H2 - Section</SelectItem>
                <SelectItem value="h3">H3 - Subsection</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{isHebrew ? "Content (Hebrew)" : "Content (English)"}</Label>
            <Input
              value={((isHebrew ? data.contentHe : data.contents) as string) || ""}
              onChange={e =>
                onUpdate({
                  ...data,
                  [isHebrew ? "contentHe" : "contents"]: e.target.value,
                })
              }
              dir={dir}
              placeholder={isHebrew ? "Heading text (Hebrew)..." : "Heading text..."}
              data-testid={`heading-contents-${block.id}`}
            />
          </div>
        </div>
      );

    case "text":
      return (
        <div className="space-y-2">
          <Label>{isHebrew ? "Content (Hebrew)" : "Content (English)"}</Label>
          <p className="text-xs text-muted-foreground mb-1">
            Supports HTML. Paste from Word/Google Docs to auto-clean formatting.
          </p>
          <Textarea
            value={((isHebrew ? data.contentHe : data.contents) as string) || ""}
            onChange={e =>
              onUpdate({
                ...data,
                [isHebrew ? "contentHe" : "contents"]: e.target.value,
              })
            }
            onPaste={onPaste}
            dir={dir}
            rows={6}
            placeholder={isHebrew ? "Text content (Hebrew)..." : "Text contents..."}
            data-testid={`text-contents-${block.id}`}
          />
        </div>
      );

    case "faq":
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>{isHebrew ? "Question (Hebrew)" : "Question (English)"}</Label>
            <Input
              value={((isHebrew ? data.questionHe : data.question) as string) || ""}
              onChange={e =>
                onUpdate({
                  ...data,
                  [isHebrew ? "questionHe" : "question"]: e.target.value,
                })
              }
              dir={dir}
              placeholder={isHebrew ? "Question (Hebrew)..." : "Question..."}
              data-testid={`faq-question-${block.id}`}
            />
          </div>
          <div className="space-y-2">
            <Label>{isHebrew ? "Answer (Hebrew)" : "Answer (English)"}</Label>
            <Textarea
              value={((isHebrew ? data.answerHe : data.answer) as string) || ""}
              onChange={e =>
                onUpdate({
                  ...data,
                  [isHebrew ? "answerHe" : "answer"]: e.target.value,
                })
              }
              onPaste={onPaste}
              dir={dir}
              rows={4}
              placeholder={isHebrew ? "Answer (Hebrew)..." : "Answer..."}
              data-testid={`faq-answer-${block.id}`}
            />
          </div>
        </div>
      );

    case "cta":
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>{isHebrew ? "Button Text (Hebrew)" : "Button Text (English)"}</Label>
            <Input
              value={((isHebrew ? data.textHe : data.text) as string) || ""}
              onChange={e =>
                onUpdate({
                  ...data,
                  [isHebrew ? "textHe" : "text"]: e.target.value,
                })
              }
              dir={dir}
              placeholder={isHebrew ? "Button text (Hebrew)..." : "Button text..."}
              data-testid={`cta-text-${block.id}`}
            />
          </div>
          <div className="space-y-2">
            <Label>Link URL</Label>
            <Input
              value={(data.link as string) || ""}
              onChange={e => onUpdate({ ...data, link: e.target.value })}
              placeholder="https://..."
              data-testid={`cta-link-${block.id}`}
            />
          </div>
          <div className="space-y-2">
            <Label>Variant</Label>
            <Select
              value={(data.variant as string) || "primary"}
              onValueChange={value => onUpdate({ ...data, variant: value })}
            >
              <SelectTrigger data-testid={`cta-variant-${block.id}`}>
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

    case "divider":
      return (
        <p className="text-sm text-muted-foreground text-center py-2">
          A horizontal line will be displayed here
        </p>
      );

    case "image":
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Image URL</Label>
            <Input
              value={(data.url as string) || ""}
              onChange={e => onUpdate({ ...data, url: e.target.value })}
              placeholder="https://..."
              data-testid={`image-url-${block.id}`}
            />
          </div>
          <div className="space-y-2">
            <Label>{isHebrew ? "Alt Text (Hebrew)" : "Alt Text (English)"}</Label>
            <Input
              value={((isHebrew ? data.altHe : data.alt) as string) || ""}
              onChange={e =>
                onUpdate({
                  ...data,
                  [isHebrew ? "altHe" : "alt"]: e.target.value,
                })
              }
              dir={dir}
              placeholder={isHebrew ? "Image description (Hebrew)..." : "Image description..."}
              data-testid={`image-alt-${block.id}`}
            />
          </div>
          <div className="space-y-2">
            <Label>{isHebrew ? "Caption (Hebrew)" : "Caption (English)"}</Label>
            <Input
              value={((isHebrew ? data.captionHe : data.caption) as string) || ""}
              onChange={e =>
                onUpdate({
                  ...data,
                  [isHebrew ? "captionHe" : "caption"]: e.target.value,
                })
              }
              dir={dir}
              placeholder={isHebrew ? "Caption (Hebrew)..." : "Caption..."}
              data-testid={`image-caption-${block.id}`}
            />
          </div>
          {typeof data.url === "string" && data.url && (
            <div className="mt-2">
              <img
                src={data.url}
                alt={(data.alt as string) || "Preview"}
                className="max-h-32 rounded border object-cover"
              />
            </div>
          )}
        </div>
      );

    case "quote":
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>{isHebrew ? "Quote Text (Hebrew)" : "Quote Text (English)"}</Label>
            <Textarea
              value={((isHebrew ? data.textHe : data.text) as string) || ""}
              onChange={e =>
                onUpdate({
                  ...data,
                  [isHebrew ? "textHe" : "text"]: e.target.value,
                })
              }
              dir={dir}
              rows={3}
              placeholder={isHebrew ? "Quote text (Hebrew)..." : "Quote text..."}
              data-testid={`quote-text-${block.id}`}
            />
          </div>
          <div className="space-y-2">
            <Label>{isHebrew ? "Author (Hebrew)" : "Author (English)"}</Label>
            <Input
              value={((isHebrew ? data.authorHe : data.author) as string) || ""}
              onChange={e =>
                onUpdate({
                  ...data,
                  [isHebrew ? "authorHe" : "author"]: e.target.value,
                })
              }
              dir={dir}
              placeholder={isHebrew ? "Author name (Hebrew)..." : "Author name..."}
              data-testid={`quote-author-${block.id}`}
            />
          </div>
        </div>
      );

    default:
      return null;
  }
}

export default function StaticPageEditor() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [matchEdit, paramsEdit] = useRoute("/admin/static-pages/edit/:id");
  const [matchNew] = useRoute("/admin/static-pages/new");

  const isNew = matchNew;
  const { id: pageId = "" } = paramsEdit ?? {};

  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showTranslateDialog, setShowTranslateDialog] = useState(false);
  const [translationProgress, setTranslationProgress] = useState(0);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationStatus, setTranslationStatus] = useState<string>("");

  const [formData, setFormData] = useState({
    slug: "",
    title: "",
    titleHe: "",
    metaTitle: "",
    metaDescription: "",
    isActive: false,
    showInFooter: false,
    blocks: [] as StaticPageBlock[],
  });

  const { data: page, isLoading } = useQuery<StaticPage>({
    queryKey: ["/api/site-config/pages/by-id", pageId],
    enabled: !!pageId && !isNew,
  });

  useEffect(() => {
    if (page) {
      setFormData({
        slug: page.slug,
        title: page.title,
        titleHe: page.titleHe || "",
        metaTitle: page.metaTitle || "",
        metaDescription: page.metaDescription || "",
        isActive: page.isActive,
        showInFooter: page.showInFooter,
        blocks: normalizeBlocks((page.blocks || []) as StaticPageBlock[]),
      });
    }
  }, [page]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const normalizedData = { ...data, blocks: normalizeBlocks(data.blocks) };
      if (isNew) {
        return apiRequest("POST", "/api/site-config/pages", normalizedData);
      }
      return apiRequest("PUT", `/api/site-config/pages/${pageId}`, normalizedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-config/pages"] });
      toast({ title: isNew ? "Page created" : "Page saved" });
      setHasChanges(false);
      if (isNew) {
        navigate("/admin/static-pages");
      }
    },
    onError: () => {
      toast({ title: "Failed to save page", variant: "destructive" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PUT", `/api/site-config/pages/${pageId}`, {
        ...formData,
        blocks: normalizeBlocks(formData.blocks),
        isActive: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-config/pages"] });
      toast({ title: "Page published" });
      setFormData(prev => ({ ...prev, isActive: true }));
      setHasChanges(false);
    },
  });

  const translateToAllLanguages = useCallback(async () => {
    if (!pageId) {
      toast({
        title: "Save the page first",
        description: "Please save the page before translating",
        variant: "destructive",
      });
      return;
    }

    setShowTranslateDialog(true);
    setIsTranslating(true);
    setTranslationProgress(0);

    const targetLocales = SUPPORTED_LOCALES.filter(l => l.code !== "en");
    const totalLocales = targetLocales.length;
    let completed = 0;

    try {
      for (const locale of targetLocales) {
        setTranslationStatus(`Translating to ${locale.name} (${locale.nativeName})...`);

        await apiRequest("POST", `/api/site-config/pages/${pageId}/translate`, {
          targetLocale: locale.code,
          title: formData.title,
          metaTitle: formData.metaTitle,
          metaDescription: formData.metaDescription,
          blocks: formData.blocks,
        });

        completed++;
        setTranslationProgress(Math.round((completed / totalLocales) * 100));
      }

      setTranslationStatus("Translation complete!");
      toast({
        title: "Translation complete",
        description: `Translated to ${totalLocales} languages`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/site-config/pages"] });
    } catch (error) {
      toast({
        title: "Translation failed",
        description: "Some translations may have failed",
        variant: "destructive",
      });
      setTranslationStatus("Translation failed");
    } finally {
      setIsTranslating(false);
    }
  }, [pageId, formData, toast]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setFormData(prev => {
        const oldIndex = prev.blocks.findIndex(b => b.id === active.id);
        const newIndex = prev.blocks.findIndex(b => b.id === over.id);
        return {
          ...prev,
          blocks: arrayMove(prev.blocks, oldIndex, newIndex),
        };
      });
      setHasChanges(true);
    }
  }, []);

  const addBlock = useCallback((type: StaticPageBlock["type"]) => {
    const newBlock: StaticPageBlock = {
      id: generateBlockId(),
      type,
      data: getDefaultBlockData(type),
    };
    setFormData(prev => ({
      ...prev,
      blocks: [...prev.blocks, newBlock],
    }));
    setExpandedBlocks(prev => new Set([...prev, newBlock.id]));
    setHasChanges(true);
  }, []);

  const updateBlock = useCallback((blockId: string, data: Record<string, unknown>) => {
    setFormData(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => (b.id === blockId ? { ...b, data } : b)),
    }));
    setHasChanges(true);
  }, []);

  const deleteBlock = useCallback((blockId: string) => {
    setFormData(prev => ({
      ...prev,
      blocks: prev.blocks.filter(b => b.id !== blockId),
    }));
    setHasChanges(true);
  }, []);

  const duplicateBlock = useCallback((blockId: string) => {
    setFormData(prev => {
      const blockIndex = prev.blocks.findIndex(b => b.id === blockId);
      if (blockIndex === -1) return prev;
      const original = prev.blocks[blockIndex];
      const duplicate: StaticPageBlock = {
        ...original,
        id: generateBlockId(),
        data: { ...original.data },
      };
      const newBlocks = [...prev.blocks];
      newBlocks.splice(blockIndex + 1, 0, duplicate);
      return { ...prev, blocks: newBlocks };
    });
    setHasChanges(true);
  }, []);

  const toggleBlockExpand = useCallback((blockId: string) => {
    setExpandedBlocks(prev => {
      const next = new Set(prev);
      if (next.has(blockId)) {
        next.delete(blockId);
      } else {
        next.add(blockId);
      }
      return next;
    });
  }, []);

  const importDocumentFromClipboard = useCallback(async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      let html = "";
      let plainText = "";

      for (const item of clipboardItems) {
        if (item.types.includes("text/html")) {
          const blob = await item.getType("text/html");
          html = await blob.text();
        }
        if (item.types.includes("text/plain")) {
          const blob = await item.getType("text/plain");
          plainText = await blob.text();
        }
      }

      if (!html && plainText) {
        html = plainText
          .split("\n")
          .filter(line => line.trim())
          .map(line => `<p>${line}</p>`)
          .join("");
      }

      if (!html) {
        toast({
          title: "No contents in clipboard",
          description: "Copy contents from Word or Google Docs first",
          variant: "destructive",
        });
        return;
      }

      const newBlocks = parseDocumentToBlocks(html);

      if (newBlocks.length === 0) {
        toast({
          title: "No contents detected",
          description: "Could not parse the clipboard contents",
          variant: "destructive",
        });
        return;
      }

      setFormData(prev => ({
        ...prev,
        blocks: [...prev.blocks, ...newBlocks],
      }));
      setExpandedBlocks(prev => {
        const next = new Set(prev);
        newBlocks.forEach(block => next.add(block.id));
        return next;
      });
      setHasChanges(true);
      toast({
        title: "Document imported",
        description: `Added ${newBlocks.length} blocks (${newBlocks.filter(b => b.type === "heading").length} headings, ${newBlocks.filter(b => b.type === "text").length} text sections)`,
      });
    } catch (error) {
      toast({
        title: "Clipboard access denied",
        description: "Please allow clipboard access or use Ctrl+V in a text block",
        variant: "destructive",
      });
    }
  }, [toast]);

  const importDocumentFromFile = useCallback(
    async (file: File) => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        const html = result.value;

        if (!html.trim()) {
          toast({
            title: "Empty document",
            description: "The document appears to be empty",
            variant: "destructive",
          });
          return;
        }

        const newBlocks = parseDocumentToBlocks(html);

        if (newBlocks.length === 0) {
          toast({
            title: "No contents detected",
            description: "Could not parse the document contents",
            variant: "destructive",
          });
          return;
        }

        setFormData(prev => ({
          ...prev,
          blocks: [...prev.blocks, ...newBlocks],
        }));
        setExpandedBlocks(prev => {
          const next = new Set(prev);
          newBlocks.forEach(block => next.add(block.id));
          return next;
        });
        setHasChanges(true);
        toast({
          title: "Document imported",
          description: `Added ${newBlocks.length} blocks from ${file.name}`,
        });
      } catch (error) {
        toast({
          title: "Import failed",
          description: "Could not read the document. Make sure it's a valid DOCX file.",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        importDocumentFromFile(file);
        e.target.value = "";
      }
    },
    [importDocumentFromFile]
  );

  const handlePreview = useCallback(() => {
    window.open(`/${formData.slug}`, "_blank");
  }, [formData.slug]);

  const updateFormField = useCallback((field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  }, []);

  if (!isNew && isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--admin-bg))] flex flex-col">
      <div className="border-b border-[hsl(var(--admin-border))] bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin/static-pages")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-[hsl(var(--admin-text))]">
                {isNew ? "Create Static Page" : `Edit: ${page?.title || ""}`}
              </h1>
              {!isNew && page && (
                <p className="text-sm text-[hsl(var(--admin-text-secondary))] mt-1">/{page.slug}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge variant="outline" className="text-orange-600 border-orange-300">
                Unsaved changes
              </Badge>
            )}
            {!isNew && formData.slug && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreview}
                data-testid="button-preview"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => saveMutation.mutate(formData)}
              disabled={saveMutation.isPending}
              data-testid="button-save"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Draft
            </Button>
            {!isNew && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={translateToAllLanguages}
                  disabled={isTranslating || hasChanges}
                  data-testid="button-translate"
                >
                  <Languages className="h-4 w-4 mr-2" />
                  Translate to All Languages
                </Button>
                <Button
                  size="sm"
                  onClick={() => publishMutation.mutate()}
                  disabled={publishMutation.isPending || formData.isActive}
                  data-testid="button-publish"
                >
                  {publishMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {formData.isActive ? "Published" : "Publish"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          <ScrollArea className="flex-1">
            <div className="p-6">
              <div className="max-w-3xl mx-auto space-y-6">
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-base">Page Settings</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Edit contents in English. Use "Translate to All Languages" button to
                      auto-translate to 16 languages.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Slug (URL path)</Label>
                        <Input
                          value={formData.slug}
                          onChange={e =>
                            updateFormField(
                              "slug",
                              e.target.value.toLowerCase().replace(/\s+/g, "-")
                            )
                          }
                          placeholder="privacy-policy"
                          data-testid="input-slug"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input
                          value={formData.title}
                          onChange={e => updateFormField("title", e.target.value)}
                          placeholder="Page title"
                          data-testid="input-title"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Meta Title</Label>
                      <Input
                        value={formData.metaTitle}
                        onChange={e => updateFormField("metaTitle", e.target.value)}
                        placeholder="Page Title | Site Name"
                        data-testid="input-meta-title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Meta Description</Label>
                      <Textarea
                        value={formData.metaDescription}
                        onChange={e => updateFormField("metaDescription", e.target.value)}
                        rows={2}
                        placeholder="Brief description for search engines..."
                        data-testid="input-meta-description"
                      />
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.isActive}
                          onCheckedChange={checked => updateFormField("isActive", checked)}
                          data-testid="switch-active"
                        />
                        <Label>Active</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.showInFooter}
                          onCheckedChange={checked => updateFormField("showInFooter", checked)}
                          data-testid="switch-footer"
                        />
                        <Label>Show in footer</Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold">Content Blocks</h2>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".docx,.doc"
                        onChange={handleFileSelect}
                        data-testid="input-file-upload"
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" data-testid="button-import-document">
                            <FileUp className="h-4 w-4 mr-2" />
                            Import Document
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuItem
                            onClick={() => fileInputRef.current?.click()}
                            data-testid="import-from-file"
                          >
                            <FileUp className="h-4 w-4 mr-2" />
                            <div>
                              <div className="font-medium">Upload DOCX File</div>
                              <div className="text-xs text-muted-foreground">
                                Import from Word document
                              </div>
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={importDocumentFromClipboard}
                            data-testid="import-from-clipboard"
                          >
                            <ClipboardPaste className="h-4 w-4 mr-2" />
                            <div>
                              <div className="font-medium">Paste from Clipboard</div>
                              <div className="text-xs text-muted-foreground">
                                Copy from Word or Google Docs
                              </div>
                            </div>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button data-testid="button-add-block">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Block
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          {blockTypes.map(blockType => (
                            <DropdownMenuItem
                              key={blockType.type}
                              onClick={() => addBlock(blockType.type)}
                              data-testid={`add-block-${blockType.type}`}
                            >
                              <blockType.icon className="h-4 w-4 mr-2" />
                              <div>
                                <div className="font-medium">{blockType.label}</div>
                                <div className="text-xs text-muted-foreground">
                                  {blockType.description}
                                </div>
                              </div>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {formData.blocks.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <Type className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <h3 className="text-lg font-medium mb-2">No contents blocks</h3>
                        <p className="text-muted-foreground mb-4">
                          Paste a document from Word/Google Docs or add blocks manually
                        </p>
                        <div className="flex items-center justify-center gap-3 flex-wrap">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" data-testid="button-import-first-document">
                                <FileUp className="h-4 w-4 mr-2" />
                                Import Document
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56">
                              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                                <FileUp className="h-4 w-4 mr-2" />
                                <div>
                                  <div className="font-medium">Upload DOCX File</div>
                                  <div className="text-xs text-muted-foreground">
                                    Import from Word document
                                  </div>
                                </div>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={importDocumentFromClipboard}>
                                <ClipboardPaste className="h-4 w-4 mr-2" />
                                <div>
                                  <div className="font-medium">Paste from Clipboard</div>
                                  <div className="text-xs text-muted-foreground">
                                    Copy from Word or Google Docs
                                  </div>
                                </div>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button data-testid="button-add-first-block">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Block
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56">
                              {blockTypes.map(blockType => (
                                <DropdownMenuItem
                                  key={blockType.type}
                                  onClick={() => addBlock(blockType.type)}
                                >
                                  <blockType.icon className="h-4 w-4 mr-2" />
                                  <div>
                                    <div className="font-medium">{blockType.label}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {blockType.description}
                                    </div>
                                  </div>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={formData.blocks.map(b => b.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {formData.blocks.map(block => (
                          <SortableBlock
                            key={block.id}
                            block={block}
                            isExpanded={expandedBlocks.has(block.id)}
                            onToggleExpand={() => toggleBlockExpand(block.id)}
                            onDelete={() => deleteBlock(block.id)}
                            onDuplicate={() => duplicateBlock(block.id)}
                            onUpdate={data => updateBlock(block.id, data)}
                            activeTab="en"
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>

      <Dialog open={showTranslateDialog} onOpenChange={setShowTranslateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5" />
              Translating to All Languages
            </DialogTitle>
            <DialogDescription>
              Translating contents to {SUPPORTED_LOCALES.filter(l => l.code !== "en").length}{" "}
              languages using AI
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Progress value={translationProgress} className="h-2" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{translationStatus}</span>
              <span className="font-medium">{translationProgress}%</span>
            </div>
            {translationProgress === 100 && !isTranslating && (
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md p-3 text-sm text-green-800 dark:text-green-200">
                All translations complete! The page is now available in{" "}
                {SUPPORTED_LOCALES.filter(l => l.code !== "en").length} languages.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTranslateDialog(false)}
              disabled={isTranslating}
            >
              {isTranslating ? "Please wait..." : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
