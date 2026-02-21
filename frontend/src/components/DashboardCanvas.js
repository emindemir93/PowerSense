import React, { useMemo, useCallback } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { useQuery } from '@tanstack/react-query';
import { useDashboardStore } from '../store/dashboardStore';
import { queryApi, sqlApi } from '../services/api';
import { buildQueryPayload, isWidgetConfigured, getDrillHierarchy, aggregateSqlData } from '../utils/helpers';
import { DASHBOARD_THEMES } from '../utils/themes';
import WidgetRenderer from './WidgetRenderer';
import SlicerWidget from './SlicerWidget';
import { useTranslation } from '../i18n';

const ResponsiveGridLayout = WidthProvider(Responsive);

function WidgetContainer({ widget, crossFilters, dateRange, editMode, isSelected, onSelect, onDelete, drillState }) {
  const { t } = useTranslation();
  const drillDown = useDashboardStore((s) => s.drillDown);
  const drillUp = useDashboardStore((s) => s.drillUp);
  const resetDrill = useDashboardStore((s) => s.resetDrill);
  const toggleCrossFilter = useDashboardStore((s) => s.toggleCrossFilter);
  const globalFilters = useDashboardStore((s) => s.globalFilters);

  const effectiveConfig = useMemo(() => {
    if (!drillState?.dimension || !widget.data_config) return widget.data_config;
    return {
      ...widget.data_config,
      dimensions: [drillState.dimension],
      filters: { ...(widget.data_config.filters || {}), ...drillState.filters },
    };
  }, [widget.data_config, drillState]);

  const queryPayload = useMemo(() => {
    const payload = buildQueryPayload(effectiveConfig, crossFilters, dateRange?.from ? dateRange : null);
    if (payload && globalFilters.length > 0) {
      return { ...payload, globalFilters };
    }
    return payload;
  }, [effectiveConfig, crossFilters, dateRange, globalFilters]);

  const configured = isWidgetConfigured(widget);

  const isSqlWidget = effectiveConfig?.type === 'sql';

  const { data: rawData, isLoading } = useQuery({
    queryKey: ['widget-data', widget.id, queryPayload, drillState],
    queryFn: async () => {
      if (isSqlWidget) {
        const res = await sqlApi.execute(queryPayload.sql, queryPayload.connection_id);
        return res.data.data?.rows || [];
      }
      const res = await queryApi.execute(queryPayload);
      return res.data.data;
    },
    enabled: configured && !!queryPayload && widget.type !== 'slicer',
    staleTime: 30000,
  });

  const data = useMemo(() => {
    if (!isSqlWidget || !rawData?.length) return rawData;
    const dims = effectiveConfig?.dimensions || [];
    const meas = effectiveConfig?.measures || [];
    if (meas.length === 0 && dims.length === 0) return rawData;
    if (widget.type === 'table') return rawData;
    return aggregateSqlData(rawData, dims, meas);
  }, [rawData, isSqlWidget, effectiveConfig, widget.type]);

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

  const handleDrillDown = useCallback(
    (dimValue) => {
      const currentDim = drillState?.dimension || widget.data_config?.dimensions?.[0];
      if (!currentDim || !widget.data_config?.source) return;
      const drill = getDrillHierarchy(widget.data_config.source, currentDim);
      if (drill) {
        drillDown(widget.id, drill.next, currentDim, dimValue);
      }
    },
    [widget.id, widget.data_config, drillState, drillDown]
  );

  const activeCrossFilter = crossFilters.find((f) => f.widgetId === widget.id);
  const currentDim = drillState?.dimension || widget.data_config?.dimensions?.[0];
  const canDrill = currentDim && widget.data_config?.source && getDrillHierarchy(widget.data_config.source, currentDim);
  const hasDrillHistory = drillState?.history?.length > 0;

  return (
    <div
      className={`widget-card ${isSelected ? 'selected' : ''}`}
      onClick={(e) => { if (editMode) { e.stopPropagation(); onSelect(widget.id); } }}
    >
      <div className="widget-header" style={{ textAlign: widget.visual_config?.titleAlign || 'left' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: widget.visual_config?.titleAlign === 'center' ? 'center' : widget.visual_config?.titleAlign === 'right' ? 'flex-end' : 'flex-start' }}>
            <span className="widget-title">{widget.title || t('dashboards.untitled')}</span>
            {widget.visual_config?.description && (
              <span title={widget.visual_config.description} style={{ cursor: 'help', display: 'inline-flex', color: 'var(--text-muted)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 12, height: 12 }}>
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </span>
            )}
          </div>
          {widget.visual_config?.subtitle && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {widget.visual_config.subtitle}
            </div>
          )}
        </div>
        <div className="widget-actions">
          {hasDrillHistory && (
            <button className="btn btn-ghost btn-icon btn-sm" onClick={(e) => { e.stopPropagation(); drillUp(widget.id); }} title={t('builder.drillUp')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14 }}>
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </button>
          )}
          {hasDrillHistory && (
            <button className="btn btn-ghost btn-icon btn-sm" onClick={(e) => { e.stopPropagation(); resetDrill(widget.id); }} title={t('builder.resetDrill')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14 }}>
                <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
              </svg>
            </button>
          )}
          {canDrill && !editMode && (
            <span style={{ fontSize: 9, color: 'var(--text-muted)', padding: '0 4px' }} title="Click chart to drill down">{t('builder.drill')}</span>
          )}
          {editMode && (
            <>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={(e) => { e.stopPropagation(); onSelect(widget.id); }} title={t('common.configure')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                </svg>
              </button>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={(e) => { e.stopPropagation(); onDelete(widget.id); }} style={{ color: 'var(--danger)' }} title={t('common.delete')}>
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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ width: 32, height: 32 }}>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            <h3>{t('builder.configureWidget')}</h3>
            <p>{t('builder.configureWidgetHint')}</p>
          </div>
        ) : widget.type === 'slicer' ? (
          <SlicerWidget widget={widget} />
        ) : (
          <WidgetRenderer
            widget={{ ...widget, data_config: effectiveConfig }}
            data={data}
            loading={isLoading}
            onCrossFilter={canDrill ? handleDrillDown : handleCrossFilter}
            activeCrossFilter={activeCrossFilter}
          />
        )}
      </div>
    </div>
  );
}

export default function DashboardCanvas() {
  const { t } = useTranslation();
  const widgets = useDashboardStore((s) => s.widgets);
  const editMode = useDashboardStore((s) => s.editMode);
  const selectedWidgetId = useDashboardStore((s) => s.selectedWidgetId);
  const crossFilters = useDashboardStore((s) => s.crossFilters);
  const dateRange = useDashboardStore((s) => s.dateRange);
  const drillStates = useDashboardStore((s) => s.drillStates);
  const dashboardTheme = useDashboardStore((s) => s.dashboardTheme);
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
    (newLayout) => { if (editMode) updateLayout(newLayout); },
    [editMode, updateLayout]
  );

  const theme = DASHBOARD_THEMES[dashboardTheme] || DASHBOARD_THEMES.default;

  const handleDelete = useCallback(
    (id) => { if (window.confirm(t('builder.removeWidgetConfirm'))) removeWidget(id); },
    [removeWidget, t]
  );

  if (widgets.length === 0) {
    return (
      <div className="empty-state" style={{ height: '100%' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ width: 40, height: 40 }}>
          <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
        </svg>
        <h3>{t('builder.noWidgets')}</h3>
        <p>{editMode ? t('builder.noWidgetsEditHint') : t('builder.noWidgetsViewHint')}</p>
      </div>
    );
  }

  return (
    <div className="dashboard-grid-wrapper" onClick={() => editMode && selectWidget(null)} style={{ background: theme.bg }}>
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
              dateRange={dateRange}
              editMode={editMode}
              isSelected={selectedWidgetId === widget.id}
              onSelect={selectWidget}
              onDelete={handleDelete}
              drillState={drillStates[widget.id]}
            />
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}
