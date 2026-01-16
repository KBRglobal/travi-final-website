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
import { AlertTriangle } from "lucide-react";
import { useLiveEditStore } from "@/stores/liveEditStore";
import { useLocale } from "@/lib/i18n/LocaleRouter";

export function DiscardDialog() {
  const { isRTL } = useLocale();
  const { activeDialog, closeDialog, discardChanges } = useLiveEditStore();

  const isOpen = activeDialog === "discard";

  const handleDiscard = () => {
    discardChanges();
    closeDialog();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && closeDialog()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            {isRTL ? "לבטל שינויים?" : "Discard Changes?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isRTL
              ? "יש לך שינויים שלא נשמרו. אם תמשיך, כל השינויים יאבדו."
              : "You have unsaved changes. If you continue, all changes will be lost."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {isRTL ? "המשך עריכה" : "Keep Editing"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDiscard}
            className="bg-red-500 hover:bg-red-600"
          >
            {isRTL ? "בטל שינויים" : "Discard"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
