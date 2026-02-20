import React, { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { dashboardsApi } from '../services/api';
import { useDashboardStore } from '../store/dashboardStore';
import { useAuthStore } from '../store/authStore';
import { WIDGET_TYPES } from '../utils/helpers';
import DashboardCanvas from '../components/DashboardCanvas';
import WidgetConfigPanel from '../components/WidgetConfigPanel';
import FilterBar from '../components/FilterBar';

export default function BuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const {
    dashboard, setDashboard, widgets, editMode, setEditMode,
    selectedWidgetId, selectWidget, deselectWidget,
    showAddWidget, setShowAddWidget, addWidget, reset,
  } = useDashboardStore();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', id],
    queryFn: () => dashboardsApi.get(id).then((r) => r.data.data),
    enabled: !!id,
  });

  useEffect(() => {
    if (data) setDashboard(data);
    return () => reset();
  }, [data, setDashboard, reset]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await dashboardsApi.update(id, {
        name: dashboard?.name,
        description: dashboard?.description,
      });
      const layoutPayload = widgets.map((w) => ({
        id: w.id,
        position: w.position,
      }));
      await dashboardsApi.updateLayout(id, layoutPayload);

      for (const w of widgets) {
        await dashboardsApi.updateWidget(id, w.id, {
          type: w.type,
          title: w.title,
          data_config: w.data_config,
          visual_config: w.visual_config,
          position: w.position,
        });
      }
    },
  });

  const addWidgetMutation = useMutation({
    mutationFn: (widgetData) => dashboardsApi.addWidget(id, widgetData),
    onSuccess: (res) => {
      addWidget(res.data.data);
      selectWidget(res.data.data.id);
    },
  });

  const deleteWidgetMutation = useMutation({
    mutationFn: (widgetId) => dashboardsApi.deleteWidget(id, widgetId),
  });

  const handleAddWidget = useCallback((widgetType) => {
    const typeDef = WIDGET_TYPES.find((t) => t.type === widgetType.type);
    const maxY = widgets.reduce((max, w) => Math.max(max, (w.position?.y || 0) + (w.position?.h || 0)), 0);

    addWidgetMutation.mutate({
      type: widgetType.type,
      title: `New ${typeDef?.label || widgetType.type}`,
      data_config: {},
      visual_config: {},
      position: { x: 0, y: maxY, w: typeDef?.defaultSize?.w || 6, h: typeDef?.defaultSize?.h || 4 },
    });
    setShowAddWidget(false);
  }, [widgets, addWidgetMutation, setShowAddWidget]);

  const handleSave = useCallback(() => {
    saveMutation.mutate();
  }, [saveMutation]);

  const selectedWidget = widgets.find((w) => w.id === selectedWidgetId);
  const canEdit = user?.role === 'admin' || user?.role === 'analyst';

  if (isLoading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div className="toolbar">
        <button className="btn btn-ghost btn-icon" onClick={() => navigate('/dashboards')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </button>

        <div className="toolbar-title">
          {editMode ? (
            <input
              value={dashboard?.name || ''}
              onChange={(e) => setDashboard({ ...dashboard, widgets, name: e.target.value })}
              placeholder="Dashboard name..."
            />
          ) : (
            <span>{dashboard?.name || 'Untitled Dashboard'}</span>
          )}
        </div>

        <div className="toolbar-actions">
          {editMode && (
            <>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAddWidget(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14 }}>
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Widget
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSave}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? 'Saving...' : saveMutation.isSuccess ? 'Saved!' : 'Save'}
              </button>
            </>
          )}
          {canEdit && (
            <button
              className={`btn btn-sm ${editMode ? 'btn-secondary' : 'btn-primary'}`}
              onClick={() => { setEditMode(!editMode); deselectWidget(); }}
            >
              {editMode ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14 }}>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                  </svg>
                  View Mode
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14 }}>
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar />

      {/* Main Area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <DashboardCanvas />
        {editMode && selectedWidget && (
          <WidgetConfigPanel widget={selectedWidget} onClose={deselectWidget} />
        )}
      </div>

      {/* Add Widget Modal */}
      {showAddWidget && (
        <div className="modal-overlay" onClick={() => setShowAddWidget(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 440 }}>
            <div className="modal-header">
              <h2>Add Widget</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAddWidget(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="widget-palette">
              {WIDGET_TYPES.map((wt) => (
                <div key={wt.type} className="palette-item" onClick={() => handleAddWidget(wt)}>
                  <WidgetTypeIcon type={wt.type} />
                  <span>{wt.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WidgetTypeIcon({ type }) {
  const iconMap = {
    kpi: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M12 8v8" /><path d="M8 14l4-6 4 6" /></svg>,
    bar: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="12" width="4" height="9" rx="1" /><rect x="10" y="6" width="4" height="15" rx="1" /><rect x="17" y="3" width="4" height="18" rx="1" /></svg>,
    hbar: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="4" rx="1" /><rect x="3" y="10" width="12" height="4" rx="1" /><rect x="3" y="17" width="15" height="4" rx="1" /></svg>,
    line: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 18 8 12 13 15 21 6" /></svg>,
    area: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 18L8 12L13 15L21 6V18H3Z" fill="currentColor" opacity="0.2" /><polyline points="3 18 8 12 13 15 21 6" /></svg>,
    pie: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21.21 15.89A10 10 0 118 2.83" /><path d="M22 12A10 10 0 0012 2v10z" /></svg>,
    donut: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /><path d="M12 2v4" /></svg>,
    scatter: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="7" cy="14" r="2" /><circle cx="14" cy="8" r="2" /><circle cx="18" cy="16" r="2" /><circle cx="10" cy="18" r="1.5" /></svg>,
    table: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /></svg>,
  };
  return iconMap[type] || iconMap.bar;
}
