import { useState, useEffect, useRef, useCallback } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Image,
  Type,
  HelpCircle,
  MousePointer,
  LayoutGrid,
  Star,
  Lightbulb,
  Video,
  Quote,
  Minus,
  Heading1,
  ImagePlus,
  PanelTop,
} from "lucide-react";
import type { ContentBlock } from "@shared/schema";

interface BlockTypeOption {
  type: ContentBlock["type"];
  label: string;
  icon: typeof Image;
  description: string;
  keywords: string[];
}

const slashCommandOptions: BlockTypeOption[] = [
  { 
    type: "hero", 
    label: "Hero", 
    icon: PanelTop, 
    description: "Full-width hero section",
    keywords: ["banner", "header", "hero", "featured", "cover"]
  },
  { 
    type: "heading", 
    label: "Heading", 
    icon: Heading1, 
    description: "Section heading H2/H3",
    keywords: ["title", "header", "h1", "h2", "h3"]
  },
  { 
    type: "text", 
    label: "Text", 
    icon: Type, 
    description: "Plain text paragraph",
    keywords: ["paragraph", "contents", "write", "text"]
  },
  { 
    type: "image", 
    label: "Image", 
    icon: ImagePlus, 
    description: "Single image with caption",
    keywords: ["photo", "picture", "media", "upload"]
  },
  { 
    type: "gallery", 
    label: "Gallery", 
    icon: LayoutGrid, 
    description: "Image gallery grid",
    keywords: ["images", "photos", "grid", "collection"]
  },
  { 
    type: "faq", 
    label: "FAQ", 
    icon: HelpCircle, 
    description: "Question & answer",
    keywords: ["question", "answer", "accordion", "help"]
  },
  { 
    type: "cta", 
    label: "CTA", 
    icon: MousePointer, 
    description: "Call to action button",
    keywords: ["button", "action", "link", "click"]
  },
  { 
    type: "video", 
    label: "Video", 
    icon: Video, 
    description: "YouTube/Vimeo embed",
    keywords: ["youtube", "vimeo", "embed", "media"]
  },
  { 
    type: "quote", 
    label: "Quote", 
    icon: Quote, 
    description: "Blockquote / testimonial",
    keywords: ["blockquote", "testimonial", "citation"]
  },
  { 
    type: "divider", 
    label: "Divider", 
    icon: Minus, 
    description: "Section separator",
    keywords: ["line", "separator", "hr", "break"]
  },
  { 
    type: "info_grid", 
    label: "Info Grid", 
    icon: LayoutGrid, 
    description: "Quick facts grid",
    keywords: ["facts", "information", "grid", "stats"]
  },
  { 
    type: "highlights", 
    label: "Highlights", 
    icon: Star, 
    description: "Key feature highlights",
    keywords: ["features", "bullets", "list", "points"]
  },
  { 
    type: "tips", 
    label: "Tips", 
    icon: Lightbulb, 
    description: "Pro tips & advice",
    keywords: ["advice", "hints", "suggestions", "pro"]
  },
];

interface SlashCommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: ContentBlock["type"]) => void;
  position: { top: number; left: number };
  searchQuery: string;
}

export function SlashCommandMenu({
  isOpen,
  onClose,
  onSelect,
  position,
  searchQuery,
}: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredOptions = slashCommandOptions.filter((option) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      option.label.toLowerCase().includes(query) ||
      option.type.toLowerCase().includes(query) ||
      option.description.toLowerCase().includes(query) ||
      option.keywords.some((k) => k.includes(query))
    );
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredOptions[selectedIndex]) {
          onSelect(filteredOptions[selectedIndex].type);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredOptions, selectedIndex, onSelect, onClose]);

  useEffect(() => {
    if (listRef.current && selectedIndex >= 0) {
      const selectedItem = listRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      );
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-72 rounded-lg border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95"
      style={{
        top: position.top,
        left: position.left,
      }}
      data-testid="slash-command-menu"
    >
      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
        Add block
        {searchQuery && (
          <span className="ml-1 text-foreground">/ {searchQuery}</span>
        )}
      </div>
      <div ref={listRef} className="max-h-[300px] overflow-y-auto">
        {filteredOptions.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No blocks found
          </div>
        ) : (
          filteredOptions.map((option, index) => (
            <button
              key={option.type}
              data-index={index}
              onClick={() => onSelect(option.type)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full flex items-center gap-3 px-2 py-2 rounded-md text-left transition-colors ${
                selectedIndex === index
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50"
              }`}
              data-testid={`slash-command-${option.type}`}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-md border bg-background">
                <option.icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{option.label}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {option.description}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
      <div className="px-2 py-1.5 text-[10px] text-muted-foreground border-t mt-1 flex items-center gap-3">
        <span>
          <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd> navigate
        </span>
        <span>
          <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">↵</kbd> select
        </span>
        <span>
          <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">esc</kbd> close
        </span>
      </div>
    </div>
  );
}

interface UseSlashCommandOptions {
  onAddBlock: (type: ContentBlock["type"], insertAfterIndex?: number) => void;
  currentBlockIndex?: number;
}

export function useSlashCommand({ onAddBlock, currentBlockIndex }: UseSlashCommandOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [triggerBlockIndex, setTriggerBlockIndex] = useState<number | undefined>(undefined);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  const openMenu = useCallback((element: HTMLElement, blockIndex?: number) => {
    const rect = element.getBoundingClientRect();
    const caretPosition = getCaretCoordinates(element);
    
    setPosition({
      top: rect.top + caretPosition.top + 24,
      left: rect.left + caretPosition.left,
    });
    setTriggerBlockIndex(blockIndex);
    setIsOpen(true);
    setSearchQuery("");
  }, []);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setSearchQuery("");
    setTriggerBlockIndex(undefined);
  }, []);

  const handleSelect = useCallback((type: ContentBlock["type"]) => {
    onAddBlock(type, triggerBlockIndex);
    closeMenu();
  }, [onAddBlock, triggerBlockIndex, closeMenu]);

  const handleInputChange = useCallback((
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
    blockIndex?: number
  ) => {
    const value = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;
    
    const textBeforeCursor = value.substring(0, cursorPosition);
    const slashMatch = textBeforeCursor.match(/\/([a-zA-Z]*)$/);
    
    if (slashMatch) {
      if (!isOpen) {
        openMenu(e.target as HTMLElement, blockIndex);
      }
      setSearchQuery(slashMatch[1] || "");
    } else if (isOpen) {
      closeMenu();
    }
  }, [isOpen, openMenu, closeMenu]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (isOpen && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter")) {
      e.preventDefault();
    }
  }, [isOpen]);

  return {
    isOpen,
    searchQuery,
    position,
    openMenu,
    closeMenu,
    handleSelect,
    handleInputChange,
    handleKeyDown,
    SlashCommandMenuComponent: (
      <SlashCommandMenu
        isOpen={isOpen}
        onClose={closeMenu}
        onSelect={handleSelect}
        position={position}
        searchQuery={searchQuery}
      />
    ),
  };
}

function getCaretCoordinates(element: HTMLElement): { top: number; left: number } {
  const isInput = element.tagName === "INPUT" || element.tagName === "TEXTAREA";
  
  if (isInput) {
    const input = element as HTMLInputElement | HTMLTextAreaElement;
    const { selectionStart } = input;
    
    const dummy = document.createElement("div");
    const style = window.getComputedStyle(input);
    
    dummy.style.position = "absolute";
    dummy.style.visibility = "hidden";
    dummy.style.whiteSpace = "pre-wrap";
    dummy.style.font = style.font;
    dummy.style.padding = style.padding;
    dummy.style.border = style.border;
    dummy.style.width = style.width;
    
    const textBeforeCaret = input.value.substring(0, selectionStart || 0);
    dummy.textContent = textBeforeCaret;
    
    const span = document.createElement("span");
    span.textContent = "|";
    dummy.appendChild(span);
    
    document.body.appendChild(dummy);
    
    const spanRect = span.getBoundingClientRect();
    const dummyRect = dummy.getBoundingClientRect();
    
    document.body.removeChild(dummy);
    
    return {
      top: spanRect.top - dummyRect.top,
      left: spanRect.left - dummyRect.left,
    };
  }
  
  return { top: 20, left: 0 };
}
