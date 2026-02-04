import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RotateCcw, Trash2, Clock } from "lucide-react";
import { useLiveEditStore } from "@/stores/liveEditStore";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useMemo } from "react";

export function RecoveryDialog() {
  const { isRTL } = useLocale();
  const { activeDialog, closeDialog, recoverDraft, pageSlug } = useLiveEditStore();

  const isOpen = activeDialog === "recovery";

  // Get recovery data from localStorage
  const recoveryData = useMemo(() => {
    if (!pageSlug) return null;
    const stored = localStorage.getItem(`live-edit-draft-${pageSlug}`);
    if (!stored) return null;
    try {
      const data = JSON.parse(stored);
      return {
        timestamp: data.savedAt,
        pageSlug,
        componentCount: data.components?.length || 0,
      };
    } catch {
      return null;
    }
  }, [pageSlug]);

  const handleRecover = async () => {
    await recoverDraft();
    closeDialog();
  };

  const handleDiscard = () => {
    // Remove the local storage draft
    if (pageSlug) {
      localStorage.removeItem(`live-edit-draft-${pageSlug}`);
    }
    closeDialog();
  };

  const formatTime = (timestamp: string | number | undefined) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleString(isRTL ? "he-IL" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && closeDialog()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-blue-600" />
            Recover Draft
          </DialogTitle>
          <DialogDescription>We found an unsaved draft from a previous session.</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Last saved:</span>
              <span className="font-medium">{formatTime(recoveryData?.timestamp)}</span>
            </div>
            {recoveryData?.pageSlug && (
              <p className="text-sm">
                <span className="text-muted-foreground">Page:</span>{" "}
                <span className="font-medium">{recoveryData.pageSlug}</span>
              </p>
            )}
            {recoveryData?.componentCount !== undefined && (
              <p className="text-sm text-muted-foreground">
                {recoveryData.componentCount} components
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleDiscard}>
            <Trash2 className="w-4 h-4 me-1" />
            Discard
          </Button>
          <Button onClick={handleRecover} className="bg-blue-600 hover:bg-blue-700">
            <RotateCcw className="w-4 h-4 me-1" />
            Recover
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
