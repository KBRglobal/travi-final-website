import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { useLiveEditStore } from "@/stores/liveEditStore";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useState } from "react";

export function PublishDialog() {
  const { isRTL } = useLocale();
  const { activeDialog, closeDialog, publishChanges, isPublishing, componentOrder, pageSlug } =
    useLiveEditStore();

  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState(false);

  const isOpen = activeDialog === "publish";

  const handlePublish = async () => {
    try {
      setPublishError(null);
      setPublishSuccess(false);
      await publishChanges();
      setPublishSuccess(true);
      // Close dialog after a short delay
      setTimeout(() => {
        closeDialog();
        setPublishSuccess(false);
      }, 1500);
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : "Failed to publish changes");
    }
  };

  const handleClose = () => {
    if (!isPublishing) {
      closeDialog();
      setPublishError(null);
      setPublishSuccess(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-green-600" />
            Publish Changes
          </DialogTitle>
          <DialogDescription>These changes will be visible to all site visitors.</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {publishSuccess ? (
            <div className="flex items-center gap-3 p-4 bg-green-50 text-green-700 rounded-lg">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">Changes published successfully!</p>
            </div>
          ) : publishError ? (
            <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-lg">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{publishError}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Page: {pageSlug}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {componentOrder.length} components
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to publish these changes?
              </p>
            </div>
          )}
        </div>

        {!publishSuccess && (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleClose} disabled={isPublishing}>
              Cancel
            </Button>
            <Button
              onClick={handlePublish}
              disabled={isPublishing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isPublishing ? (
                <>Publishing...</>
              ) : (
                <>
                  <Upload className="w-4 h-4 me-1" />
                  Publish
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
