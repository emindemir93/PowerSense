import { create } from 'zustand';

export const useDashboardStore = create((set) => ({
  dashboard: null,
  widgets: [],
  editMode: false,
  selectedWidgetId: null,
  crossFilters: [],
  showAddWidget: false,

  setDashboard: (dashboard) => set({
    dashboard,
    widgets: (dashboard?.widgets || []).map((w) => ({
      ...w,
      data_config: typeof w.data_config === 'string' ? JSON.parse(w.data_config) : w.data_config,
      visual_config: typeof w.visual_config === 'string' ? JSON.parse(w.visual_config) : w.visual_config,
      position: typeof w.position === 'string' ? JSON.parse(w.position) : w.position,
    })),
    crossFilters: [],
    selectedWidgetId: null,
  }),

  setEditMode: (editMode) => set({ editMode }),
  setShowAddWidget: (show) => set({ showAddWidget: show }),

  selectWidget: (id) => set({ selectedWidgetId: id }),
  deselectWidget: () => set({ selectedWidgetId: null }),

  addWidget: (widget) => set((state) => ({
    widgets: [...state.widgets, {
      ...widget,
      data_config: typeof widget.data_config === 'string' ? JSON.parse(widget.data_config) : widget.data_config,
      visual_config: typeof widget.visual_config === 'string' ? JSON.parse(widget.visual_config) : widget.visual_config,
      position: typeof widget.position === 'string' ? JSON.parse(widget.position) : widget.position,
    }],
    showAddWidget: false,
  })),

  updateWidget: (id, updates) => set((state) => ({
    widgets: state.widgets.map((w) =>
      w.id === id ? {
        ...w,
        ...updates,
        data_config: updates.data_config
          ? (typeof updates.data_config === 'string' ? JSON.parse(updates.data_config) : updates.data_config)
          : w.data_config,
        visual_config: updates.visual_config
          ? (typeof updates.visual_config === 'string' ? JSON.parse(updates.visual_config) : updates.visual_config)
          : w.visual_config,
        position: updates.position
          ? (typeof updates.position === 'string' ? JSON.parse(updates.position) : updates.position)
          : w.position,
      } : w
    ),
  })),

  removeWidget: (id) => set((state) => ({
    widgets: state.widgets.filter((w) => w.id !== id),
    selectedWidgetId: state.selectedWidgetId === id ? null : state.selectedWidgetId,
  })),

  updateLayout: (layout) => set((state) => ({
    widgets: state.widgets.map((w) => {
      const li = layout.find((l) => l.i === w.id);
      return li ? { ...w, position: { x: li.x, y: li.y, w: li.w, h: li.h } } : w;
    }),
  })),

  toggleCrossFilter: (filter) => set((state) => {
    const idx = state.crossFilters.findIndex(
      (f) => f.field === filter.field && f.value === filter.value
    );
    if (idx >= 0) {
      return { crossFilters: state.crossFilters.filter((_, i) => i !== idx) };
    }
    const cleaned = state.crossFilters.filter((f) => f.widgetId !== filter.widgetId);
    return { crossFilters: [...cleaned, filter] };
  }),

  removeCrossFilter: (index) => set((state) => ({
    crossFilters: state.crossFilters.filter((_, i) => i !== index),
  })),

  clearCrossFilters: () => set({ crossFilters: [] }),

  reset: () => set({
    dashboard: null,
    widgets: [],
    editMode: false,
    selectedWidgetId: null,
    crossFilters: [],
    showAddWidget: false,
  }),
}));
