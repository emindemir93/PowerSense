import React, { useEffect, useCallback, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardsApi, bookmarksApi } from '../services/api';
import { useDashboardStore } from '../store/dashboardStore';
import { useAuthStore } from '../store/authStore';
import { WIDGET_TYPES } from '../utils/helpers';
import DashboardCanvas from '../components/DashboardCanvas';
import WidgetConfigPanel from '../components/WidgetConfigPanel';
import FilterBar from '../components/FilterBar';

export default function BuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const dashboardRef = useRef(null);

  const {
    dashboard, setDashboard, widgets, editMode, setEditMode,
    selectedWidgetId, selectWidget, deselectWidget,
    showAddWidget, setShowAddWidget, addWidget, crossFilters,
    dateRange, reset, applyBookmark,
  } = useDashboardStore();

  const [showBookmarks, setShowBookmarks] = useState(false);
  const [bookmarkName, setBookmarkName] = useState('');
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', id],
    queryFn: () => dashboardsApi.get(id).then((r) => r.data.data),
    enabled: !!id,
  });

  const { data: bookmarks, refetch: refetchBookmarks } = useQuery({
    queryKey: ['bookmarks', id],
    queryFn: () => bookmarksApi.list(id).then((r) => r.data.data),
    enabled: !!id,
  });

  useEffect(() => {
    if (data) setDashboard(data);
    return () => reset();
  }, [data, setDashboard, reset]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await dashboardsApi.update(id, { name: dashboard?.name, description: dashboard?.description });
      const layoutPayload = widgets.map((w) => ({ id: w.id, position: w.position }));
      await dashboardsApi.updateLayout(id, layoutPayload);
      for (const w of widgets) {
        await dashboardsApi.updateWidget(id, w.id, {
          type: w.type, title: w.title, data_config: w.data_config,
          visual_config: w.visual_config, position: w.position,
        });
      }
    },
  });

  const addWidgetMutation = useMutation({
    mutationFn: (widgetData) => dashboardsApi.addWidget(id, widgetData),
    onSuccess: (res) => { addWidget(res.data.data); selectWidget(res.data.data.id); },
  });

  const saveBookmarkMutation = useMutation({
    mutationFn: (data) => bookmarksApi.create(data),
    onSuccess: () => { refetchBookmarks(); setBookmarkName(''); },
  });

  const deleteBookmarkMutation = useMutation({
    mutationFn: (bmId) => bookmarksApi.delete(bmId),
    onSuccess: () => refetchBookmarks(),
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

  const handleSave = useCallback(() => saveMutation.mutate(), [saveMutation]);

  const handleSaveBookmark = () => {
    if (!bookmarkName.trim()) return;
    saveBookmarkMutation.mutate({
      dashboard_id: id,
      name: bookmarkName.trim(),
      filters_state: crossFilters,
      date_range: dateRange,
    });
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const el = dashboardRef.current;
      if (!el) return;
      const canvas = await html2canvas(el, { backgroundColor: '#0d1117', scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: canvas.width > canvas.height ? 'landscape' : 'portrait', unit: 'px', format: [canvas.width, canvas.height] });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${dashboard?.name || 'dashboard'}.pdf`);
    } catch (err) { console.error('PDF export failed:', err); }
    setExporting(false);
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      for (const w of widgets) {
        if (w.type === 'slicer') continue;
        try {
          const queryPayload = { source: w.data_config?.source, dimensions: w.data_config?.dimensions || [], measures: w.data_config?.measures || [], limit: w.data_config?.limit || 1000 };
          if (!queryPayload.source) continue;
          const { queryApi } = await import('../services/api');
          const res = await queryApi.execute(queryPayload);
          const data = res.data.data || [];
          if (data.length > 0) {
            const ws = XLSX.utils.json_to_sheet(data);
            const sheetName = (w.title || 'Sheet').substring(0, 31).replace(/[[\]*?/\\]/g, '');
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
          }
        } catch { /* skip failed widgets */ }
      }
      XLSX.writeFile(wb, `${dashboard?.name || 'dashboard'}.xlsx`);
    } catch (err) { console.error('Excel export failed:', err); }
    setExporting(false);
  };

  const selectedWidget = widgets.find((w) => w.id === selectedWidgetId);
  const canEdit = user?.role === 'admin' || user?.role === 'analyst';

  if (isLoading) {
    return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="loading-spinner" /></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div className="toolbar">
        <button className="btn btn-ghost btn-icon" onClick={() => navigate('/dashboards')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
        </button>
        <div className="toolbar-title">
          {editMode ? (
            <input value={dashboard?.name || ''} onChange={(e) => setDashboard({ ...dashboard, widgets, name: e.target.value })} placeholder="Dashboard name..." />
          ) : (
            <span>{dashboard?.name || 'Untitled Dashboard'}</span>
          )}
        </div>
        <div className="toolbar-actions">
          {/* Export buttons */}
          <button className="btn btn-ghost btn-sm" onClick={handleExportPDF} disabled={exporting} title="Export PDF">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14 }}>
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
            PDF
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleExportExcel} disabled={exporting} title="Export Excel">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14 }}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Excel
          </button>

          {/* Bookmarks */}
          <div style={{ position: 'relative' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowBookmarks(!showBookmarks)} title="Bookmarks">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14 }}>
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
              </svg>
              Bookmarks
            </button>
            {showBookmarks && (
              <div style={{ position: 'absolute', top: '100%', right: 0, width: 280, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Bookmarks</div>
                {/* Save new */}
                {canEdit && (
                  <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                    <input className="form-input" placeholder="Bookmark name..." value={bookmarkName} onChange={(e) => setBookmarkName(e.target.value)} style={{ flex: 1, height: 28, fontSize: 11 }} />
                    <button className="btn btn-primary btn-sm" onClick={handleSaveBookmark} disabled={!bookmarkName.trim()}>Save</button>
                  </div>
                )}
                {/* List */}
                {bookmarks && bookmarks.length > 0 ? (
                  <div style={{ maxHeight: 200, overflow: 'auto' }}>
                    {bookmarks.map((bm) => (
                      <div key={bm.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
                        onClick={() => { applyBookmark(bm); setShowBookmarks(false); }}>
                        <span>{bm.name}</span>
                        {canEdit && (
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={(e) => { e.stopPropagation(); deleteBookmarkMutation.mutate(bm.id); }} style={{ color: 'var(--danger)' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 10, height: 10 }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>No bookmarks saved yet</p>
                )}
              </div>
            )}
          </div>

          {editMode && (
            <>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAddWidget(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14 }}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                Add Widget
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : saveMutation.isSuccess ? 'Saved!' : 'Save'}
              </button>
            </>
          )}
          {canEdit && (
            <button className={`btn btn-sm ${editMode ? 'btn-secondary' : 'btn-primary'}`} onClick={() => { setEditMode(!editMode); deselectWidget(); }}>
              {editMode ? 'View Mode' : 'Edit'}
            </button>
          )}
        </div>
      </div>

      <FilterBar />

      {/* Main Area */}
      <div ref={dashboardRef} style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <DashboardCanvas />
        {editMode && selectedWidget && (<WidgetConfigPanel widget={selectedWidget} onClose={deselectWidget} />)}
      </div>

      {/* Add Widget Modal */}
      {showAddWidget && (
        <div className="modal-overlay" onClick={() => setShowAddWidget(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 500 }}>
            <div className="modal-header">
              <h2>Add Widget</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAddWidget(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
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
    scatter: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="7" cy="14" r="2" /><circle cx="14" cy="8" r="2" /><circle cx="18" cy="16" r="2" /></svg>,
    table: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /></svg>,
    slicer: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>,
  };
  return iconMap[type] || iconMap.bar;
}
