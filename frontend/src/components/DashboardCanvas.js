import React, { useMemo, useCallback } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { useQuery } from '@tanstack/react-query';
import { useDashboardStore } from '../store/dashboardStore';
import { queryApi } from '../services/api';
import { buildQueryPayload, isWidgetConfigured } from '../utils/helpers';
import WidgetRenderer from './WidgetRenderer';

const ResponsiveGridLayout = WidthProvider(Responsive);

function WidgetContainer({ widget, crossFilters, editMode, isSelected, onSelect, onDelete }) {
  const queryPayload = useMemo(
    () => buildQueryPayload(widget.data_config, crossFilters),
    [widget.data_config, crossFilters]
  );

  const configured = isWidgetConfigured(widget);

  const { data, isLoading } = useQuery({
    queryKey: ['widget-data', widget.id, queryPayload],
    queryFn: () => queryApi.execute(queryPayload).then((r) => r.data.data),
    enabled: configured && !!queryPayload,
    staleTime: 30000,
  });

  const toggleCrossFilter = useDashboardStore((s) => s.toggleCrossFilter);

  const handleCrossFilter = useCallback(
    (field, value) => {
      if (!widget.data_config?.source) return;
      toggleCrossFilter({
        widgetId: widget.id,
        source: widget.data_config.source,
        field,
        value,
      });
    },
    [widget.id, widget.data_config?.source, toggleCrossFilter]
  );

  const activeCrossFilter = crossFilters.find((f) => f.widgetId === widget.id);

  return (
    <div
      className={`widget-card ${isSelected ? 'selected' : ''}`}
      onClick={(e) => { if (editMode) { e.stopPropagation(); onSelect(widget.id); } }}
    >
      <div className="widget-header">
        <span className="widget-title">{widget.title || 'Untitled'}</span>
        <div className="widget-actions">
          {editMode && (
            <>
              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={(e) => { e.stopPropagation(); onSelect(widget.id); }}
                title="Configure"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                </svg>
              </button>
              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={(e) => { e.stopPropagation(); onDelete(widget.id); }}
                style={{ color: 'var(--danger)' }}
                title="Delete"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
      <div className="widget-body">
        {!configured ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            <h3>Configure Widget</h3>
            <p>Click to select data source and measures</p>
          </div>
        ) : (
          <WidgetRenderer
            widget={widget}
            data={data}
            loading={isLoading}
            onCrossFilter={handleCrossFilter}
            activeCrossFilter={activeCrossFilter}
          />
        )}
      </div>
    </div>
  );
}

export default function DashboardCanvas() {
  const widgets = useDashboardStore((s) => s.widgets);
  const editMode = useDashboardStore((s) => s.editMode);
  const selectedWidgetId = useDashboardStore((s) => s.selectedWidgetId);
  const crossFilters = useDashboardStore((s) => s.crossFilters);
  const updateLayout = useDashboardStore((s) => s.updateLayout);
  const selectWidget = useDashboardStore((s) => s.selectWidget);
  const removeWidget = useDashboardStore((s) => s.removeWidget);

  const layout = useMemo(
    () => widgets.map((w) => ({
      i: w.id,
      x: w.position?.x ?? 0,
      y: w.position?.y ?? 0,
      w: w.position?.w ?? 6,
      h: w.position?.h ?? 4,
      minW: 2,
      minH: 2,
      static: !editMode,
    })),
    [widgets, editMode]
  );

  const handleLayoutChange = useCallback(
    (newLayout) => {
      if (!editMode) return;
      updateLayout(newLayout);
    },
    [editMode, updateLayout]
  );

  const handleDelete = useCallback(
    (id) => {
      if (window.confirm('Remove this widget?')) {
        removeWidget(id);
      }
    },
    [removeWidget]
  );

  if (widgets.length === 0) {
    return (
      <div className="empty-state" style={{ height: '100%' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
        </svg>
        <h3>No Widgets Yet</h3>
        <p>{editMode ? 'Click "+ Add Widget" in the toolbar to get started' : 'This dashboard has no widgets'}</p>
      </div>
    );
  }

  return (
    <div className="dashboard-grid-wrapper" onClick={() => editMode && selectWidget(null)}>
      <ResponsiveGridLayout
        className="layout"
        layouts={{ lg: layout }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
        cols={{ lg: 12, md: 12, sm: 6, xs: 4 }}
        rowHeight={60}
        isDraggable={editMode}
        isResizable={editMode}
        onLayoutChange={handleLayoutChange}
        compactType="vertical"
        margin={[12, 12]}
        useCSSTransforms={false}
      >
        {widgets.map((widget) => (
          <div key={widget.id}>
            <WidgetContainer
              widget={widget}
              crossFilters={crossFilters}
              editMode={editMode}
              isSelected={selectedWidgetId === widget.id}
              onSelect={selectWidget}
              onDelete={handleDelete}
            />
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}
