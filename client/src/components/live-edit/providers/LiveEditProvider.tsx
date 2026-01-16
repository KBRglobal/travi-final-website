import { useEffect, ReactNode } from "react";
import { useLiveEditStore } from "@/stores/liveEditStore";
import { useAuth } from "@/hooks/use-auth";

interface LiveEditProviderProps {
  children: ReactNode;
  enabled?: boolean;
  autoSaveInterval?: number;
}

export function LiveEditProvider({
  children,
  enabled = true,
  autoSaveInterval = 30000,
}: LiveEditProviderProps) {
  const { user } = useAuth();
  const {
    isEditMode,
    hasUnsavedChanges,
    saveDraft,
    exitEditMode,
    undo,
    redo,
    setCurrentUser,
  } = useLiveEditStore();

  // Set current user from auth context
  useEffect(() => {
    if (user) {
      const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
      setCurrentUser({
        id: String(user.id),
        email: user.email,
        role: user.role as "admin" | "editor" | "author" | "viewer",
        name: displayName,
      });
    } else {
      setCurrentUser(null);
    }
  }, [user, setCurrentUser]);

  // Auto-save draft periodically when in edit mode
  useEffect(() => {
    if (!isEditMode || !hasUnsavedChanges || !enabled) return;

    const interval = setInterval(() => {
      saveDraft().catch(console.error);
    }, autoSaveInterval);

    return () => clearInterval(interval);
  }, [isEditMode, hasUnsavedChanges, enabled, autoSaveInterval, saveDraft]);

  // Warn before unload if unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isEditMode || !enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl/Cmd + Z - Undo
      if (modKey && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y - Redo
      if ((modKey && e.shiftKey && e.key === "z") || (modKey && e.key === "y")) {
        e.preventDefault();
        redo();
      }

      // Ctrl/Cmd + S - Save
      if (modKey && e.key === "s") {
        e.preventDefault();
        saveDraft().catch(console.error);
      }

      // Escape - Exit edit mode (with confirmation if unsaved)
      if (e.key === "Escape") {
        exitEditMode();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditMode, enabled, undo, redo, saveDraft, exitEditMode]);

  // Add/remove body class for styling
  useEffect(() => {
    if (isEditMode) {
      document.body.classList.add("live-edit-mode");
    } else {
      document.body.classList.remove("live-edit-mode");
    }

    return () => {
      document.body.classList.remove("live-edit-mode");
    };
  }, [isEditMode]);

  // Check if user can edit
  const canEdit =
    enabled &&
    user &&
    ["admin", "editor", "author"].includes(user.role);

  if (!canEdit) {
    return <>{children}</>;
  }

  return <>{children}</>;
}
