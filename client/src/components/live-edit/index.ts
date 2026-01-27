// Live Edit System - Main exports

// Providers
export { LiveEditProvider } from "./providers/LiveEditProvider";
export { DragDropProvider } from "./providers/DragDropProvider";

// Core Components
export { LiveEditToggle } from "./core/LiveEditToggle";
export { EditableWrapper } from "./core/EditableWrapper";

// Renderers
export { PageRenderer, ComponentRenderer } from "./renderers";

// Sidebar Components
export { LiveEditSidebar } from "./sidebar/LiveEditSidebar";
export { ComponentLibrary } from "./sidebar/ComponentLibrary";
export { ComponentSettings } from "./sidebar/ComponentSettings";

// Dialog Components
export { LiveEditDialogs } from "./dialogs/LiveEditDialogs";
export { PublishDialog } from "./dialogs/PublishDialog";
export { DiscardDialog } from "./dialogs/DiscardDialog";
export { RecoveryDialog } from "./dialogs/RecoveryDialog";

// Editors
export { InlineTextEditor } from "./editors/InlineTextEditor";

// Component Registry
export {
  componentRegistry,
  getComponentConfig,
  getComponentsByCategory,
  getAllComponents,
  getComponentCategories,
  getCategoryLabel,
} from "@/lib/live-edit/componentRegistry";

// Store and Hooks
export {
  useLiveEditStore,
  useIsEditMode,
  useIsPreviewMode,
  useSelectedComponent,
  useHasUnsavedChanges,
  useCanUndo,
  useCanRedo,
} from "@/stores/liveEditStore";

// Types
export type {
  LiveEditStore,
  ComponentState,
  ComponentChange,
  HistoryEntry,
  Position,
  SidebarTab,
  DevicePreview,
  DialogType,
  User,
  ComponentConfig,
  ComponentRegistry,
  EditableField,
  ComponentCategory,
} from "@/types/liveEdit";

export type { EditableComponentConfig } from "@/lib/live-edit/componentRegistry";
