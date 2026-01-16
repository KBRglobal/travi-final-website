import { PublishDialog } from "./PublishDialog";
import { DiscardDialog } from "./DiscardDialog";
import { RecoveryDialog } from "./RecoveryDialog";

/**
 * Container component that renders all live edit dialogs.
 * Include this once at the app level to enable all dialog functionality.
 */
export function LiveEditDialogs() {
  return (
    <>
      <PublishDialog />
      <DiscardDialog />
      <RecoveryDialog />
    </>
  );
}
