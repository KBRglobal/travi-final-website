import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Keyboard,
  Command,
  Search,
  Save,
  Eye,
  Send,
  ArrowLeft,
  ArrowRight,
  Undo,
  Redo,
  Plus,
  FileText,
  MapPin,
  Building2,
  Utensils,
} from "lucide-react";

interface ShortcutGroup {
  title: string;
  shortcuts: Array<{
    keys: string[];
    description: string;
    icon?: React.ElementType;
  }>;
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: "Global Navigation",
    shortcuts: [
      { keys: ["Cmd", "K"], description: "Open command palette / search", icon: Search },
      { keys: ["?"], description: "Show keyboard shortcuts", icon: Keyboard },
      { keys: ["Escape"], description: "Close dialogs and modals" },
      { keys: ["G", "D"], description: "Go to Dashboard" },
      { keys: ["G", "A"], description: "Go to Attractions", icon: MapPin },
      { keys: ["G", "H"], description: "Go to Hotels", icon: Building2 },
      { keys: ["G", "R"], description: "Go to Restaurants", icon: Utensils },
      { keys: ["G", "N"], description: "Go to News", icon: FileText },
    ],
  },
  {
    title: "Content Editor",
    shortcuts: [
      { keys: ["Cmd", "S"], description: "Save contents", icon: Save },
      { keys: ["Cmd", "Z"], description: "Undo", icon: Undo },
      { keys: ["Cmd", "Shift", "Z"], description: "Redo", icon: Redo },
      { keys: ["Cmd", "Enter"], description: "Submit for review", icon: Send },
      { keys: ["Cmd", "P"], description: "Preview contents", icon: Eye },
      { keys: ["Cmd", "/"], description: "Open block inserter", icon: Plus },
      { keys: ["Cmd", "B"], description: "Bold text" },
      { keys: ["Cmd", "I"], description: "Italic text" },
      { keys: ["Cmd", "U"], description: "Underline text" },
      { keys: ["Cmd", "K"], description: "Insert link" },
    ],
  },
  {
    title: "Content List",
    shortcuts: [
      { keys: ["N"], description: "Create new contents", icon: Plus },
      { keys: ["J"], description: "Move selection down" },
      { keys: ["K"], description: "Move selection up" },
      { keys: ["Enter"], description: "Open selected item" },
      { keys: ["E"], description: "Edit selected item" },
      { keys: ["P"], description: "Preview selected item" },
      { keys: ["Cmd", "A"], description: "Select all items" },
      { keys: ["Delete"], description: "Delete selected items" },
    ],
  },
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["["], description: "Go back", icon: ArrowLeft },
      { keys: ["]"], description: "Go forward", icon: ArrowRight },
      { keys: ["Cmd", "\\"], description: "Toggle sidebar" },
    ],
  },
];

interface KeyboardShortcutsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcuts({ open, onOpenChange }: Readonly<KeyboardShortcutsProps>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[60vh]">
          <div className="space-y-6 pr-4">
            {shortcutGroups.map(group => (
              <div key={group.title}>
                <h3 className="font-medium text-sm text-muted-foreground mb-3 uppercase tracking-wider">
                  {group.title}
                </h3>
                <div className="space-y-2">
                  {group.shortcuts.map((shortcut, idx) => {
                    const Icon = shortcut.icon;
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                          <span className="text-sm">{shortcut.description}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, keyIdx) => (
                            <span key={keyIdx} className="flex items-center gap-1">
                              <kbd className="px-2 py-1 text-xs font-mono bg-muted border rounded shadow-sm">
                                {key === "Cmd" ? (
                                  <span className="flex items-center gap-0.5">
                                    <Command className="h-3 w-3" />
                                  </span>
                                ) : (
                                  key
                                )}
                              </kbd>
                              {keyIdx < shortcut.keys.length - 1 && (
                                <span className="text-xs text-muted-foreground">+</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] mx-1">?</kbd> anywhere to
          toggle this help
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook for global keyboard shortcut (?)
export function useKeyboardShortcuts() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input field
      const target = e.target as HTMLElement;
      const isInputField =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      if (e.key === "?" && !isInputField) {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { open, setOpen };
}
