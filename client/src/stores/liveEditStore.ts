import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  LiveEditStore,
  ComponentState,
  ComponentChange,
  HistoryEntry,
  Position,
  SidebarTab,
  DevicePreview,
  DialogType,
  User,
} from "@/types/liveEdit";

// Helper functions
function generateId(): string {
  return `comp_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

const MAX_HISTORY_SIZE = 50;

// Initial state
const initialState = {
  // Mode state
  isEditMode: false,
  isPreviewMode: false,
  isDragging: false,
  isSaving: false,
  isPublishing: false,
  isLoading: false,

  // Selection state
  selectedComponentId: null as string | null,
  hoveredComponentId: null as string | null,
  focusedFieldId: null as string | null,

  // Content state
  pageSlug: null as string | null,
  originalLayout: {} as Record<string, ComponentState>,
  currentLayout: {} as Record<string, ComponentState>,
  componentOrder: [] as string[],
  pendingChanges: [] as ComponentChange[],

  // History state
  history: [] as HistoryEntry[],
  historyIndex: -1,
  canUndo: false,
  canRedo: false,

  // UI state
  sidebarOpen: true,
  sidebarTab: "components" as SidebarTab,
  devicePreview: "desktop" as DevicePreview,
  lastSavedAt: null as Date | null,
  hasUnsavedChanges: false,

  // Dialog state
  activeDialog: null as DialogType | null,
  dialogProps: {} as Record<string, any>,

  // User state
  currentUser: null as User | null,
};

export const useLiveEditStore = create<LiveEditStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // ===== Mode Actions =====
        enterEditMode: async (pageSlug: string) => {
          set(state => {
            state.isLoading = true;
            state.pageSlug = pageSlug;
          });

          try {
            await get().loadLayout(pageSlug);
            set(state => {
              state.isEditMode = true;
              state.isLoading = false;
              state.selectedComponentId = null;
              state.history = [];
              state.historyIndex = -1;
              state.canUndo = false;
              state.canRedo = false;
            });
          } catch (error) {
            set(state => {
              state.isLoading = false;
            });
            throw error;
          }
        },

        exitEditMode: (force = false) => {
          const { hasUnsavedChanges } = get();
          if (hasUnsavedChanges && !force) {
            get().openDialog("discard");
            return;
          }

          set(state => {
            state.isEditMode = false;
            state.isPreviewMode = false;
            state.selectedComponentId = null;
            state.hoveredComponentId = null;
            state.focusedFieldId = null;
            state.pendingChanges = [];
            state.hasUnsavedChanges = false;
            state.sidebarOpen = true;
            state.sidebarTab = "components";
            state.activeDialog = null;
            state.dialogProps = {};
          });
        },

        togglePreviewMode: () => {
          set(state => {
            state.isPreviewMode = !state.isPreviewMode;
            if (state.isPreviewMode) {
              state.selectedComponentId = null;
              state.hoveredComponentId = null;
              state.sidebarOpen = false;
            } else {
              state.sidebarOpen = true;
            }
          });
        },

        // ===== Selection Actions =====
        selectComponent: (id: string | null) => {
          set(state => {
            state.selectedComponentId = id;
            if (id) {
              state.sidebarTab = "settings";
            }
          });
        },

        hoverComponent: (id: string | null) => {
          set(state => {
            state.hoveredComponentId = id;
          });
        },

        focusField: (fieldId: string | null) => {
          set(state => {
            state.focusedFieldId = fieldId;
          });
        },

        // ===== Edit Actions =====
        updateComponent: (id: string, changes: Partial<ComponentState>) => {
          const { currentLayout, _addToHistory, _getComponentById } = get();
          const component = _getComponentById(id);

          if (!component) return;

          const before = deepClone(component);
          const after = { ...component, ...changes };

          set(state => {
            state.currentLayout[id] = after as ComponentState;
            state.hasUnsavedChanges = true;
          });

          _addToHistory(
            [
              {
                componentId: id,
                type: "update",
                before,
                after,
                timestamp: Date.now(),
              },
            ],
            `Updated ${component.type}`
          );
        },

        updateComponentProps: (id: string, props: Record<string, any>) => {
          const { _addToHistory, _getComponentById } = get();
          const component = _getComponentById(id);

          if (!component) return;

          const before = deepClone(component);
          const after = {
            ...component,
            props: { ...component.props, ...props },
          };

          set(state => {
            state.currentLayout[id] = after;
            state.hasUnsavedChanges = true;
          });

          _addToHistory(
            [
              {
                componentId: id,
                type: "update",
                before,
                after,
                timestamp: Date.now(),
              },
            ],
            `Updated ${component.type} props`
          );
        },

        addComponent: (type: string, position: Position, props: Record<string, any> = {}) => {
          const { componentOrder, _addToHistory } = get();
          const newId = generateId();

          const newComponent: ComponentState = {
            id: newId,
            type,
            order: position.index,
            parentId: position.parentId,
            props,
          };

          // Update order of subsequent components
          const newOrder = [...componentOrder];
          newOrder.splice(position.index, 0, newId);

          set(state => {
            state.currentLayout[newId] = newComponent;
            state.componentOrder = newOrder;

            // Update order values
            newOrder.forEach((compId, idx) => {
              if (state.currentLayout[compId]) {
                state.currentLayout[compId].order = idx;
              }
            });

            state.hasUnsavedChanges = true;
            state.selectedComponentId = newId;
          });

          _addToHistory(
            [
              {
                componentId: newId,
                type: "add",
                before: null,
                after: newComponent,
                timestamp: Date.now(),
              },
            ],
            `Added ${type}`
          );

          return newId;
        },

        removeComponent: (id: string) => {
          const { currentLayout, componentOrder, _addToHistory } = get();
          const component = currentLayout[id];

          if (!component) return;

          const before = deepClone(component);
          const newOrder = componentOrder.filter(compId => compId !== id);

          set(state => {
            delete state.currentLayout[id];
            state.componentOrder = newOrder;

            // Update order values
            newOrder.forEach((compId, idx) => {
              if (state.currentLayout[compId]) {
                state.currentLayout[compId].order = idx;
              }
            });

            state.hasUnsavedChanges = true;
            if (state.selectedComponentId === id) {
              state.selectedComponentId = null;
            }
          });

          _addToHistory(
            [
              {
                componentId: id,
                type: "remove",
                before,
                after: null,
                timestamp: Date.now(),
              },
            ],
            `Removed ${component.type}`
          );
        },

        moveComponent: (id: string, newPosition: Position) => {
          const { currentLayout, componentOrder, _addToHistory } = get();
          const component = currentLayout[id];

          if (!component) return;

          const before = deepClone(component);
          const currentIndex = componentOrder.indexOf(id);
          const newOrder = [...componentOrder];

          // Remove from current position
          newOrder.splice(currentIndex, 1);
          // Insert at new position
          newOrder.splice(newPosition.index, 0, id);

          set(state => {
            state.componentOrder = newOrder;
            state.currentLayout[id].parentId = newPosition.parentId;

            // Update order values
            newOrder.forEach((compId, idx) => {
              if (state.currentLayout[compId]) {
                state.currentLayout[compId].order = idx;
              }
            });

            state.hasUnsavedChanges = true;
          });

          const after = get().currentLayout[id];

          _addToHistory(
            [
              {
                componentId: id,
                type: "move",
                before,
                after,
                timestamp: Date.now(),
              },
            ],
            `Moved ${component.type}`
          );
        },

        duplicateComponent: (id: string) => {
          const { currentLayout, componentOrder, _addToHistory } = get();
          const component = currentLayout[id];

          if (!component) return null;

          const newId = generateId();
          const currentIndex = componentOrder.indexOf(id);
          const newComponent: ComponentState = {
            ...deepClone(component),
            id: newId,
            order: currentIndex + 1,
          };

          const newOrder = [...componentOrder];
          newOrder.splice(currentIndex + 1, 0, newId);

          set(state => {
            state.currentLayout[newId] = newComponent;
            state.componentOrder = newOrder;

            // Update order values
            newOrder.forEach((compId, idx) => {
              if (state.currentLayout[compId]) {
                state.currentLayout[compId].order = idx;
              }
            });

            state.hasUnsavedChanges = true;
            state.selectedComponentId = newId;
          });

          _addToHistory(
            [
              {
                componentId: newId,
                type: "add",
                before: null,
                after: newComponent,
                timestamp: Date.now(),
              },
            ],
            `Duplicated ${component.type}`
          );

          return newId;
        },

        reorderComponents: (newOrder: string[]) => {
          const { componentOrder, _addToHistory } = get();

          if (JSON.stringify(newOrder) === JSON.stringify(componentOrder)) {
            return;
          }

          const changes: ComponentChange[] = [];

          set(state => {
            state.componentOrder = newOrder;

            newOrder.forEach((compId, idx) => {
              if (state.currentLayout[compId]) {
                const before = deepClone(state.currentLayout[compId]);
                state.currentLayout[compId].order = idx;
                const after = state.currentLayout[compId];

                if (before.order !== idx) {
                  changes.push({
                    componentId: compId,
                    type: "move",
                    before,
                    after,
                    timestamp: Date.now(),
                  });
                }
              }
            });

            state.hasUnsavedChanges = true;
          });

          if (changes.length > 0) {
            _addToHistory(changes, "Reordered components");
          }
        },

        // ===== History Actions =====
        undo: () => {
          const { history, historyIndex } = get();
          if (historyIndex < 0) return;

          const entry = history[historyIndex];

          set(state => {
            // Reverse changes
            entry.changes.forEach(change => {
              if (change.type === "update" || change.type === "move") {
                if (change.before) {
                  state.currentLayout[change.componentId] = deepClone(change.before);
                }
              } else if (change.type === "add") {
                delete state.currentLayout[change.componentId];
                state.componentOrder = state.componentOrder.filter(id => id !== change.componentId);
              } else if (change.type === "remove") {
                if (change.before) {
                  state.currentLayout[change.componentId] = deepClone(change.before);
                  // Re-insert at original position
                  const order = change.before.order;
                  state.componentOrder.splice(order, 0, change.componentId);
                }
              }
            });

            state.historyIndex = historyIndex - 1;
            state.canUndo = historyIndex > 0;
            state.canRedo = true;
            state.hasUnsavedChanges = true;
          });
        },

        redo: () => {
          const { history, historyIndex } = get();
          if (historyIndex >= history.length - 1) return;

          const entry = history[historyIndex + 1];

          set(state => {
            // Apply changes
            entry.changes.forEach(change => {
              if (change.type === "update" || change.type === "move") {
                if (change.after) {
                  state.currentLayout[change.componentId] = deepClone(change.after);
                }
              } else if (change.type === "add") {
                if (change.after) {
                  state.currentLayout[change.componentId] = deepClone(change.after);
                  const order = change.after.order;
                  state.componentOrder.splice(order, 0, change.componentId);
                }
              } else if (change.type === "remove") {
                delete state.currentLayout[change.componentId];
                state.componentOrder = state.componentOrder.filter(id => id !== change.componentId);
              }
            });

            state.historyIndex = historyIndex + 1;
            state.canUndo = true;
            state.canRedo = historyIndex + 1 < history.length - 1;
            state.hasUnsavedChanges = true;
          });
        },

        clearHistory: () => {
          set(state => {
            state.history = [];
            state.historyIndex = -1;
            state.canUndo = false;
            state.canRedo = false;
          });
        },

        // ===== Save Actions =====
        saveDraft: async () => {
          const { currentLayout, componentOrder, pageSlug } = get();

          if (!pageSlug) return;

          set(state => {
            state.isSaving = true;
          });

          try {
            // Convert layout to array for API
            const components = componentOrder.map(id => currentLayout[id]);

            const response = await fetch(`/api/layouts/${pageSlug}/draft`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ components }),
            });

            if (!response.ok) {
              throw new Error("Failed to save draft");
            }

            // Also save to localStorage as backup
            localStorage.setItem(
              `live-edit-draft-${pageSlug}`,
              JSON.stringify({
                components,
                savedAt: new Date().toISOString(),
              })
            );

            set(state => {
              state.isSaving = false;
              state.lastSavedAt = new Date();
              state.hasUnsavedChanges = false;
              state.pendingChanges = [];
            });
          } catch (error) {
            set(state => {
              state.isSaving = false;
            });
            throw error;
          }
        },

        publishChanges: async () => {
          const { pageSlug, saveDraft } = get();

          if (!pageSlug) return;

          set(state => {
            state.isPublishing = true;
          });

          try {
            // Save draft first
            await saveDraft();

            // Then publish
            const response = await fetch(`/api/layouts/${pageSlug}/publish`, {
              method: "POST",
              credentials: "include",
            });

            if (!response.ok) {
              throw new Error("Failed to publish");
            }

            // Clear localStorage backup
            localStorage.removeItem(`live-edit-draft-${pageSlug}`);

            set(state => {
              state.isPublishing = false;
              state.originalLayout = deepClone(state.currentLayout);
              state.activeDialog = null;
            });
          } catch (error) {
            set(state => {
              state.isPublishing = false;
            });
            throw error;
          }
        },

        discardChanges: () => {
          const { originalLayout, pageSlug } = get();

          if (pageSlug) {
            localStorage.removeItem(`live-edit-draft-${pageSlug}`);
          }

          set(state => {
            state.currentLayout = deepClone(originalLayout);
            state.componentOrder = Object.values(originalLayout)
              .sort((a, b) => a.order - b.order)
              .map(c => c.id);
            state.hasUnsavedChanges = false;
            state.pendingChanges = [];
            state.history = [];
            state.historyIndex = -1;
            state.canUndo = false;
            state.canRedo = false;
            state.activeDialog = null;
          });
        },

        recoverDraft: async () => {
          const { pageSlug } = get();

          if (!pageSlug) return;

          const stored = localStorage.getItem(`live-edit-draft-${pageSlug}`);
          if (!stored) return;

          try {
            const { components } = JSON.parse(stored);

            const layout: Record<string, ComponentState> = {};
            components.forEach((comp: ComponentState) => {
              layout[comp.id] = comp;
            });

            set(state => {
              state.currentLayout = layout;
              state.componentOrder = components.map((c: ComponentState) => c.id);
              state.hasUnsavedChanges = true;
              state.activeDialog = null;
            });
          } catch (error) {}
        },

        // ===== UI Actions =====
        setSidebarOpen: (open: boolean) => {
          set(state => {
            state.sidebarOpen = open;
          });
        },

        setSidebarTab: (tab: SidebarTab) => {
          set(state => {
            state.sidebarTab = tab;
          });
        },

        setDevicePreview: (device: DevicePreview) => {
          set(state => {
            state.devicePreview = device;
          });
        },

        openDialog: (dialog: DialogType, props: Record<string, any> = {}) => {
          set(state => {
            state.activeDialog = dialog;
            state.dialogProps = props;
          });
        },

        closeDialog: () => {
          set(state => {
            state.activeDialog = null;
            state.dialogProps = {};
          });
        },

        // ===== Layout Actions =====
        loadLayout: async (pageSlug: string) => {
          try {
            const response = await fetch(`/api/layouts/${pageSlug}`, {
              credentials: "include",
            });

            if (!response.ok) {
              // If no layout exists, start with empty
              if (response.status === 404) {
                set(state => {
                  state.originalLayout = {};
                  state.currentLayout = {};
                  state.componentOrder = [];
                });
                return;
              }
              throw new Error("Failed to load layout");
            }

            const data = await response.json();

            // Check for local draft
            const localDraft = localStorage.getItem(`live-edit-draft-${pageSlug}`);
            if (localDraft) {
              const { savedAt } = JSON.parse(localDraft);
              const draftDate = new Date(savedAt);
              const serverDate = data.draftUpdatedAt ? new Date(data.draftUpdatedAt) : null;

              if (!serverDate || draftDate > serverDate) {
                // Show recovery dialog
                set(state => {
                  state.activeDialog = "recovery";
                });
              }
            }

            // Use draft components if available, otherwise published
            const components = data.draftComponents || data.components || [];

            const layout: Record<string, ComponentState> = {};
            components.forEach((comp: ComponentState) => {
              layout[comp.id] = comp;
            });

            set(state => {
              state.originalLayout = deepClone(layout);
              state.currentLayout = layout;
              state.componentOrder = components
                .sort((a: ComponentState, b: ComponentState) => a.order - b.order)
                .map((c: ComponentState) => c.id);
            });
          } catch (error) {
            // Start with empty layout on error
            set(state => {
              state.originalLayout = {};
              state.currentLayout = {};
              state.componentOrder = [];
            });
          }
        },

        setCurrentUser: (user: User | null) => {
          set(state => {
            state.currentUser = user;
          });
        },

        setDragging: (isDragging: boolean) => {
          set(state => {
            state.isDragging = isDragging;
          });
        },

        // ===== Internal Helpers =====
        _addToHistory: (changes: ComponentChange[], description: string) => {
          const { history, historyIndex } = get();

          const newEntry: HistoryEntry = {
            id: generateId(),
            changes,
            timestamp: Date.now(),
            description,
          };

          // Truncate future history if we're not at the end
          const newHistory = history.slice(0, historyIndex + 1);
          newHistory.push(newEntry);

          // Limit history size
          if (newHistory.length > MAX_HISTORY_SIZE) {
            newHistory.shift();
          }

          set(state => {
            state.history = newHistory;
            state.historyIndex = newHistory.length - 1;
            state.canUndo = true;
            state.canRedo = false;
          });
        },

        _getComponentById: (id: string) => {
          return get().currentLayout[id];
        },

        _getNextOrder: () => {
          return get().componentOrder.length;
        },
      })),
      {
        name: "live-edit-storage",
        partialize: state => ({
          // Only persist certain UI state
          sidebarOpen: state.sidebarOpen,
          sidebarTab: state.sidebarTab,
          devicePreview: state.devicePreview,
        }),
      }
    ),
    { name: "LiveEditStore" }
  )
);

// Selector hooks for optimized re-renders
export const useIsEditMode = () => useLiveEditStore(state => state.isEditMode);
export const useIsPreviewMode = () => useLiveEditStore(state => state.isPreviewMode);
export const useSelectedComponent = () =>
  useLiveEditStore(state => {
    const id = state.selectedComponentId;
    return id ? state.currentLayout[id] : null;
  });
export const useHasUnsavedChanges = () => useLiveEditStore(state => state.hasUnsavedChanges);
export const useCanUndo = () => useLiveEditStore(state => state.canUndo);
export const useCanRedo = () => useLiveEditStore(state => state.canRedo);
