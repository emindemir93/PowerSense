import { create } from 'zustand';

export const useDashboardStore = create((set) => ({
  dashboard: null,
  widgets: [],
  editMode: false,
  selectedWidgetId: null,
  crossFilters: [],
  dateRange: { from: '', to: '' },
  drillStates: {},
  showAddWidget: false,
  globalFilters: [],
  dashboardTheme: 'default',

  setDashboard: (dashboard) => set({
    dashboard,
    widgets: (dashboard?.widgets || []).map((w) => ({
      ...w,
      data_config: typeof w.data_config === 'string' ? JSON.parse(w.data_config) : w.data_config,
      visual_config: typeof w.visual_config === 'string' ? JSON.parse(w.visual_config) : w.visual_config,
      position: typeof w.position === 'string' ? JSON.parse(w.position) : w.position,
    })),
    crossFilters: [],
    dateRange: { from: '', to: '' },
    drillStates: {},
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

  setDashboardTheme: (theme) => set({ dashboardTheme: theme }),

  setGlobalFilters: (filters) => set({ globalFilters: filters }),
  addGlobalFilter: (filter) => set((state) => ({ globalFilters: [...state.globalFilters, filter] })),
  removeGlobalFilter: (index) => set((state) => ({ globalFilters: state.globalFilters.filter((_, i) => i !== index) })),
  clearGlobalFilters: () => set({ globalFilters: [] }),

  setDateRange: (dateRange) => set({ dateRange }),

  drillDown: (widgetId, dimension, filterField, filterValue) => set((state) => ({
    drillStates: {
      ...state.drillStates,
      [widgetId]: {
        dimension,
        filters: {
          ...(state.drillStates[widgetId]?.filters || {}),
          [filterField]: filterValue,
        },
        history: [
          ...(state.drillStates[widgetId]?.history || []),
          { dimension: state.drillStates[widgetId]?.dimension || null, filters: state.drillStates[widgetId]?.filters || {} },
        ],
      },
    },
  })),

  drillUp: (widgetId) => set((state) => {
    const ds = state.drillStates[widgetId];
    if (!ds?.history?.length) {
      const newStates = { ...state.drillStates };
      delete newStates[widgetId];
      return { drillStates: newStates };
    }
    const prev = ds.history[ds.history.length - 1];
    return {
      drillStates: {
        ...state.drillStates,
        [widgetId]: {
          dimension: prev.dimension,
          filters: prev.filters,
          history: ds.history.slice(0, -1),
        },
      },
    };
  }),

  resetDrill: (widgetId) => set((state) => {
    const newStates = { ...state.drillStates };
    delete newStates[widgetId];
    return { drillStates: newStates };
  }),

  applyBookmark: (bookmark) => set({
    crossFilters: typeof bookmark.filters_state === 'string'
      ? JSON.parse(bookmark.filters_state)
      : (bookmark.filters_state || []),
    dateRange: typeof bookmark.date_range === 'string'
      ? JSON.parse(bookmark.date_range)
      : (bookmark.date_range || { from: '', to: '' }),
  }),

  reset: () => set({
    dashboard: null,
    widgets: [],
    editMode: false,
    selectedWidgetId: null,
    crossFilters: [],
    dateRange: { from: '', to: '' },
    drillStates: {},
    showAddWidget: false,
    globalFilters: [],
    dashboardTheme: 'default',
  }),
}));
