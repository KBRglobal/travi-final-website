// Live Edit Type Definitions

export type SidebarTab = "components" | "settings" | "layers";
export type DevicePreview = "desktop" | "tablet" | "mobile";
export type DialogType = "discard" | "publish" | "recovery" | "contentPicker" | "mediaPicker";
export type ChangeType = "add" | "remove" | "update" | "move";

export interface User {
  id: string;
  email: string;
  role: "admin" | "editor" | "author" | "viewer";
  name?: string;
}

export interface Position {
  index: number;
  parentId?: string;
}

export interface ComponentState {
  id: string;
  type: string;
  order: number;
  parentId?: string;
  props: Record<string, any>;
}

export interface ComponentChange {
  componentId: string;
  type: ChangeType;
  before: ComponentState | null;
  after: ComponentState | null;
  timestamp: number;
}

export interface HistoryEntry {
  id: string;
  changes: ComponentChange[];
  timestamp: number;
  description: string;
}

export interface LiveEditStore {
  // Mode state
  isEditMode: boolean;
  isPreviewMode: boolean;
  isDragging: boolean;
  isSaving: boolean;
  isPublishing: boolean;
  isLoading: boolean;

  // Selection state
  selectedComponentId: string | null;
  hoveredComponentId: string | null;
  focusedFieldId: string | null;

  // Content state
  pageSlug: string | null;
  originalLayout: Record<string, ComponentState>;
  currentLayout: Record<string, ComponentState>;
  componentOrder: string[];
  pendingChanges: ComponentChange[];

  // History state
  history: HistoryEntry[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;

  // UI state
  sidebarOpen: boolean;
  sidebarTab: SidebarTab;
  devicePreview: DevicePreview;
  lastSavedAt: Date | null;
  hasUnsavedChanges: boolean;

  // Dialog state
  activeDialog: DialogType | null;
  dialogProps: Record<string, any>;

  // User state
  currentUser: User | null;

  // Mode Actions
  enterEditMode: (pageSlug: string) => Promise<void>;
  exitEditMode: (force?: boolean) => void;
  togglePreviewMode: () => void;

  // Selection Actions
  selectComponent: (id: string | null) => void;
  hoverComponent: (id: string | null) => void;
  focusField: (fieldId: string | null) => void;

  // Edit Actions
  updateComponent: (id: string, changes: Partial<ComponentState>) => void;
  updateComponentProps: (id: string, props: Record<string, any>) => void;
  addComponent: (type: string, position: Position, props?: Record<string, any>) => string;
  removeComponent: (id: string) => void;
  moveComponent: (id: string, newPosition: Position) => void;
  duplicateComponent: (id: string) => string | null;
  reorderComponents: (newOrder: string[]) => void;

  // History Actions
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;

  // Save Actions
  saveDraft: () => Promise<void>;
  publishChanges: () => Promise<void>;
  discardChanges: () => void;
  recoverDraft: () => Promise<void>;

  // UI Actions
  setSidebarOpen: (open: boolean) => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setDevicePreview: (device: DevicePreview) => void;
  openDialog: (dialog: DialogType, props?: Record<string, any>) => void;
  closeDialog: () => void;

  // Layout Actions
  loadLayout: (pageSlug: string) => Promise<void>;
  setCurrentUser: (user: User | null) => void;
  setDragging: (isDragging: boolean) => void;

  // Internal Helpers
  _addToHistory: (changes: ComponentChange[], description: string) => void;
  _getComponentById: (id: string) => ComponentState | undefined;
  _getNextOrder: () => number;
}

// Component Registry Types
export type ComponentCategory = "layout" | "content" | "media" | "interactive";

export interface EditableField {
  name: string;
  type: "text" | "textarea" | "richtext" | "image" | "link" | "color" | "select" | "number" | "boolean";
  label: string;
  labelHe?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  defaultValue?: any;
}

export interface ComponentConfig {
  type: string;
  name: string;
  nameHe?: string;
  icon: string;
  category: ComponentCategory;
  description?: string;
  descriptionHe?: string;
  editableFields: EditableField[];
  defaultProps: Record<string, any>;
  capabilities: {
    canDrag: boolean;
    canDuplicate: boolean;
    canDelete: boolean;
    canResize: boolean;
    canHaveChildren: boolean;
  };
}

export type ComponentRegistry = Record<string, ComponentConfig>;
