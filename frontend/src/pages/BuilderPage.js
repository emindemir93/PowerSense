import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardsApi, bookmarksApi, commentsApi, alertsApi } from '../services/api';
import { useDashboardStore } from '../store/dashboardStore';
import { useAuthStore } from '../store/authStore';
import { WIDGET_TYPES } from '../utils/helpers';
import { DASHBOARD_THEMES } from '../utils/themes';
import { useTranslation } from '../i18n';
import DashboardCanvas from '../components/DashboardCanvas';
import WidgetConfigPanel from '../components/WidgetConfigPanel';
import FilterBar from '../components/FilterBar';
import FilterPanel from '../components/FilterPanel';

export default function BuilderPage() {
  const { t } = useTranslation();
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

  const dashboardTheme = useDashboardStore((s) => s.dashboardTheme);
  const setDashboardTheme = useDashboardStore((s) => s.setDashboardTheme);

  const [showFilters, setShowFilters] = useState(false);
  const globalFilters = useDashboardStore((s) => s.globalFilters);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [bookmarkName, setBookmarkName] = useState('');
  const [exporting, setExporting] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showAlerts, setShowAlerts] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [showThemes, setShowThemes] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [shareToken, setShareToken] = useState(null);
  const [copied, setCopied] = useState('');

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);
  const relativeTime = useMemo(() => {
    const diff = Math.floor((now - lastRefresh.getTime()) / 1000);
    if (diff < 10) return t('builder.justNow');
    if (diff < 60) return `${diff}s ${t('builder.ago')}`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ${t('builder.ago')}`;
    return `${Math.floor(diff / 3600)}h ${t('builder.ago')}`;
  }, [now, lastRefresh, t]);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', id],
    queryFn: () => dashboardsApi.get(id).then((r) => r.data.data),
    enabled: !!id,
    staleTime: 0,
  });

  const { data: bookmarks, refetch: refetchBookmarks } = useQuery({
    queryKey: ['bookmarks', id],
    queryFn: () => bookmarksApi.list(id).then((r) => r.data.data),
    enabled: !!id,
  });

  const { data: comments, refetch: refetchComments } = useQuery({
    queryKey: ['comments', id],
    queryFn: () => commentsApi.list(id).then((r) => r.data.data),
    enabled: !!id,
  });

  const { data: alerts, refetch: refetchAlerts } = useQuery({
    queryKey: ['alerts', id],
    queryFn: () => alertsApi.list(id).then((r) => r.data.data),
    enabled: !!id,
  });

  useEffect(() => {
    if (data) setDashboard(data);
    return () => reset();
  }, [data, setDashboard, reset]);

  useEffect(() => {
    if (refreshInterval <= 0) return;
    const timer = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['widget-data'] });
      setLastRefresh(new Date());
    }, refreshInterval);
    return () => clearInterval(timer);
  }, [refreshInterval, queryClient]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['widget-data'] });
    setLastRefresh(new Date());
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      await dashboardsApi.update(id, { name: dashboard?.name, description: dashboard?.description });

      const serverDash = await dashboardsApi.get(id).then((r) => r.data.data);
      const serverWidgetIds = (serverDash.widgets || []).map((w) => w.id);
      const localWidgetIds = widgets.map((w) => w.id);

      const deletedIds = serverWidgetIds.filter((sid) => !localWidgetIds.includes(sid));
      for (const wid of deletedIds) {
        await dashboardsApi.deleteWidget(id, wid);
      }

      const layoutPayload = widgets.map((w) => ({ id: w.id, position: w.position }));
      await dashboardsApi.updateLayout(id, layoutPayload);
      for (const w of widgets) {
        await dashboardsApi.updateWidget(id, w.id, {
          type: w.type, title: w.title, data_config: w.data_config,
          visual_config: w.visual_config, position: w.position,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', id] });
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

  const addCommentMutation = useMutation({
    mutationFn: (data) => commentsApi.create(data),
    onSuccess: () => { refetchComments(); setCommentText(''); },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (cId) => commentsApi.delete(cId),
    onSuccess: () => refetchComments(),
  });

  const deleteAlertMutation = useMutation({
    mutationFn: (aId) => alertsApi.delete(aId),
    onSuccess: () => refetchAlerts(),
  });

  const shareMutation = useMutation({
    mutationFn: () => dashboardsApi.share(id),
    onSuccess: (res) => setShareToken(res.data.data.shareToken),
  });

  const unshareMutation = useMutation({
    mutationFn: () => dashboardsApi.unshare(id),
    onSuccess: () => setShareToken(null),
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
          let data;
          if (w.data_config?.type === 'sql' && w.data_config?.sql) {
            const { sqlApi } = await import('../services/api');
            const res = await sqlApi.execute(w.data_config.sql, w.data_config.connection_id);
            data = res.data.data?.rows || [];
          } else {
            const queryPayload = { source: w.data_config?.source, dimensions: w.data_config?.dimensions || [], measures: w.data_config?.measures || [], limit: w.data_config?.limit || 1000 };
            if (!queryPayload.source) continue;
            const { queryApi } = await import('../services/api');
            const res = await queryApi.execute(queryPayload);
            data = res.data.data || [];
          }
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
            <input value={dashboard?.name || ''} onChange={(e) => setDashboard({ ...dashboard, widgets, name: e.target.value })} placeholder={t('builder.namePlaceholder')} />
          ) : (
            <span>{dashboard?.name || 'Untitled Dashboard'}</span>
          )}
        </div>
        <div className="toolbar-actions">
          {/* Auto Refresh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={handleRefresh} title={t('builder.refresh')} style={{ display: 'flex', alignItems: 'center' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14 }}>
                <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
              </svg>
            </button>
            <select value={refreshInterval} onChange={(e) => setRefreshInterval(Number(e.target.value))}
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px', color: 'var(--text-secondary)', fontSize: 10, cursor: 'pointer' }}>
              <option value={0}>{t('builder.refreshOff')}</option>
              <option value={30000}>30s</option>
              <option value={60000}>1m</option>
              <option value={300000}>5m</option>
              <option value={900000}>15m</option>
              <option value={1800000}>30m</option>
            </select>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{relativeTime}</span>
          </div>
          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

          {/* Theme Selector */}
          <div style={{ position: 'relative' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowThemes(!showThemes)} title={t('builder.theme')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14 }}>
                <circle cx="12" cy="12" r="10" /><path d="M12 2a10 10 0 0110 10" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" />
              </svg>
              {t('builder.theme')}
            </button>
            {showThemes && (
              <div style={{ position: 'absolute', top: '100%', right: 0, width: 240, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: 8, zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, padding: '0 4px' }}>{t('builder.selectTheme')}</div>
                {Object.entries(DASHBOARD_THEMES).map(([key, theme]) => (
                  <div key={key} onClick={() => { setDashboardTheme(key); setShowThemes(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px', borderRadius: 6,
                      cursor: 'pointer', background: dashboardTheme === key ? 'var(--bg-tertiary)' : 'transparent',
                      border: dashboardTheme === key ? '1px solid var(--accent)' : '1px solid transparent',
                    }}>
                    <div style={{ display: 'flex', gap: 2 }}>
                      {theme.colors.slice(0, 5).map((c, i) => (
                        <div key={i} style={{ width: 12, height: 12, borderRadius: 2, background: c }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-primary)' }}>{theme.name}</span>
                    {dashboardTheme === key && <span style={{ fontSize: 10, color: 'var(--accent)', marginLeft: 'auto' }}>✓</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Export buttons */}
          <button className="btn btn-ghost btn-sm" onClick={handleExportPDF} disabled={exporting} title="Export PDF">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14 }}>
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
            {t('builder.pdf')}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleExportExcel} disabled={exporting} title="Export Excel">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14 }}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {t('builder.excel')}
          </button>

          <button className="btn btn-ghost btn-sm" onClick={() => { setShowShare(true); if (!shareToken) shareMutation.mutate(); }} title={t('builder.share')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14 }}>
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            {t('builder.share')}
          </button>

          {/* Bookmarks */}
          <div style={{ position: 'relative' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowBookmarks(!showBookmarks)} title="Bookmarks">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14 }}>
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
              </svg>
              {t('builder.bookmarks')}
            </button>
            {showBookmarks && (
              <div style={{ position: 'absolute', top: '100%', right: 0, width: 280, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{t('builder.bookmarks')}</div>
                {/* Save new */}
                {canEdit && (
                  <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                    <input className="form-input" placeholder={t('builder.bookmarkPlaceholder')} value={bookmarkName} onChange={(e) => setBookmarkName(e.target.value)} style={{ flex: 1, height: 28, fontSize: 11 }} />
                    <button className="btn btn-primary btn-sm" onClick={handleSaveBookmark} disabled={!bookmarkName.trim()}>{t('common.save')}</button>
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
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('builder.noBookmarks')}</p>
                )}
              </div>
            )}
          </div>

          {/* Comments */}
          <button className="btn btn-ghost btn-sm" onClick={() => setShowComments(!showComments)} title="Comments">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14 }}>
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            {comments?.length > 0 && <span style={{ fontSize: 10, color: 'var(--accent)' }}>{comments.length}</span>}
          </button>

          {/* Alerts */}
          {canEdit && (
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAlerts(!showAlerts)} title="Alerts">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14 }}>
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
              {alerts?.filter((a) => a.triggered).length > 0 && <span style={{ fontSize: 10, color: 'var(--danger)' }}>{alerts.filter((a) => a.triggered).length}</span>}
            </button>
          )}

          <button className="btn btn-ghost btn-sm" onClick={() => setShowFilters(!showFilters)} title={t('builder.filters')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14 }}>
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            {t('builder.filters')}
            {globalFilters.length > 0 && <span style={{ fontSize: 10, color: 'var(--accent)', marginLeft: 4 }}>{globalFilters.length}</span>}
          </button>

          {editMode && (
            <>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAddWidget(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14 }}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                {t('builder.addWidget')}
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? t('common.saving') : saveMutation.isSuccess ? t('common.saved') : t('common.save')}
              </button>
            </>
          )}
          {canEdit && (
            <button className={`btn btn-sm ${editMode ? 'btn-secondary' : 'btn-primary'}`} onClick={() => { setEditMode(!editMode); deselectWidget(); }}>
              {editMode ? t('builder.viewMode') : t('builder.editMode')}
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
              <h2>{t('builder.addWidgetTitle')}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAddWidget(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="widget-palette">
              {WIDGET_TYPES.map((wt) => (
                <div key={wt.type} className="palette-item" onClick={() => handleAddWidget(wt)}>
                  <WidgetTypeIcon type={wt.type} />
                  <span>{t('chartTypes.' + wt.type)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showComments && (
        <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 340, background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border)', zIndex: 100, display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 20px rgba(0,0,0,0.3)' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>{t('builder.comments')}</h3>
            <button className="btn btn-ghost btn-icon" onClick={() => setShowComments(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14 }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
            {comments?.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', marginTop: 40 }}>{t('builder.noComments')}</p>}
            {comments?.map((c) => (
              <div key={c.id} style={{ background: 'var(--bg-tertiary)', borderRadius: 8, padding: 10, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--accent)' }}>{c.user_name || 'User'}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleString('tr-TR')}</span>
                    <button onClick={() => deleteCommentMutation.mutate(c.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>×</button>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.4 }}>{c.text}</p>
              </div>
            ))}
          </div>
          <div style={{ padding: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
            <input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder={t('builder.commentPlaceholder')}
              onKeyDown={(e) => { if (e.key === 'Enter' && commentText.trim()) addCommentMutation.mutate({ dashboard_id: id, text: commentText }); }}
              style={{ flex: 1, background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', color: 'var(--text-primary)', fontSize: 12 }} />
            <button className="btn btn-primary btn-sm" disabled={!commentText.trim()} onClick={() => addCommentMutation.mutate({ dashboard_id: id, text: commentText })}>{t('builder.send')}</button>
          </div>
        </div>
      )}

      {showAlerts && (
        <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 380, background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border)', zIndex: 100, display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 20px rgba(0,0,0,0.3)' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>{t('builder.alerts')}</h3>
            <button className="btn btn-ghost btn-icon" onClick={() => setShowAlerts(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14 }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
            <AlertManager dashboardId={id} alerts={alerts || []} onDelete={(aId) => deleteAlertMutation.mutate(aId)} onRefresh={refetchAlerts} />
          </div>
        </div>
      )}

      <FilterPanel show={showFilters} onClose={() => setShowFilters(false)} />

      {showShare && (
        <div className="modal-overlay" onClick={() => setShowShare(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 480 }}>
            <div className="modal-header">
              <h2>{t('builder.shareTitle')}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowShare(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div style={{ padding: 16 }}>
              {shareMutation.isPending ? (
                <div style={{ textAlign: 'center', padding: 20 }}><div className="loading-spinner" /></div>
              ) : shareToken ? (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, display: 'block' }}>{t('builder.publicLink')}</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input className="form-input" readOnly value={`${window.location.origin}/shared/${shareToken}`} style={{ flex: 1, fontSize: 11, fontFamily: 'monospace' }} />
                      <button className="btn btn-primary btn-sm" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/shared/${shareToken}`); setCopied('link'); setTimeout(() => setCopied(''), 2000); }}>
                        {copied === 'link' ? t('common.saved') : t('builder.copy')}
                      </button>
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, display: 'block' }}>{t('builder.embedCode')}</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input className="form-input" readOnly value={`<iframe src="${window.location.origin}/shared/${shareToken}" width="100%" height="600" frameborder="0"></iframe>`} style={{ flex: 1, fontSize: 11, fontFamily: 'monospace' }} />
                      <button className="btn btn-primary btn-sm" onClick={() => { navigator.clipboard.writeText(`<iframe src="${window.location.origin}/shared/${shareToken}" width="100%" height="600" frameborder="0"></iframe>`); setCopied('embed'); setTimeout(() => setCopied(''), 2000); }}>
                        {copied === 'embed' ? t('common.saved') : t('builder.copy')}
                      </button>
                    </div>
                  </div>

                  <div style={{ marginBottom: 16, textAlign: 'center' }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, display: 'block' }}>{t('builder.qrCode')}</label>
                    <div style={{ background: '#fff', display: 'inline-block', padding: 16, borderRadius: 8 }}>
                      <div style={{ width: 120, height: 120, display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 1 }}>
                        {Array.from({ length: 100 }, (_, i) => {
                          const hash = (shareToken.charCodeAt(i % shareToken.length) * (i + 1)) % 3;
                          return <div key={i} style={{ background: hash === 0 ? '#000' : '#fff', borderRadius: 1 }} />;
                        })}
                      </div>
                      <div style={{ fontSize: 8, color: '#666', marginTop: 4 }}>{t('builder.scanToView')}</div>
                    </div>
                  </div>

                  <button className="btn btn-ghost btn-sm" style={{ width: '100%', color: 'var(--danger)' }} onClick={() => unshareMutation.mutate()}>
                    {t('builder.disableSharing')}
                  </button>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
                  <p>{t('builder.shareDisabled')}</p>
                  <button className="btn btn-primary btn-sm" onClick={() => shareMutation.mutate()}>{t('builder.enableSharing')}</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AlertManager({ dashboardId, alerts, onDelete, onRefresh }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [measure, setMeasure] = useState('');
  const [operator, setOperator] = useState('>');
  const [threshold, setThreshold] = useState('');

  const createMutation = useMutation({
    mutationFn: (data) => alertsApi.create(data),
    onSuccess: () => { setName(''); setMeasure(''); setThreshold(''); onRefresh(); },
  });

  const handleCreate = () => {
    if (!name || !measure || !threshold) return;
    createMutation.mutate({ dashboard_id: dashboardId, name, measure, operator, threshold: parseFloat(threshold) });
  };

  return (
    <div>
      <div style={{ background: 'var(--bg-tertiary)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>{t('builder.newAlert')}</div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('builder.alertName')} style={{ width: '100%', marginBottom: 6, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 8px', color: 'var(--text-primary)', fontSize: 12 }} />
        <input value={measure} onChange={(e) => setMeasure(e.target.value)} placeholder={t('builder.measureName')} style={{ width: '100%', marginBottom: 6, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 8px', color: 'var(--text-primary)', fontSize: 12 }} />
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <select value={operator} onChange={(e) => setOperator(e.target.value)} style={{ flex: 1, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 8px', color: 'var(--text-primary)', fontSize: 12 }}>
            <option value=">">{'>'}</option><option value=">=">{'>='}</option><option value="<">{'<'}</option><option value="<=">{'<='}</option><option value="=">{'='}</option>
          </select>
          <input type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} placeholder={t('builder.threshold')} style={{ flex: 2, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 8px', color: 'var(--text-primary)', fontSize: 12 }} />
        </div>
        <button className="btn btn-primary btn-sm" onClick={handleCreate} style={{ width: '100%' }}>{t('builder.createAlert')}</button>
      </div>
      {alerts.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', marginTop: 20 }}>{t('builder.noAlerts')}</p>}
      {alerts.map((a) => (
        <div key={a.id} style={{ background: 'var(--bg-tertiary)', borderRadius: 8, padding: 10, marginBottom: 6, borderLeft: `3px solid ${a.triggered ? 'var(--danger)' : a.is_active ? 'var(--accent)' : 'var(--text-muted)'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: 12 }}>{a.name}</span>
            <button onClick={() => onDelete(a.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>×</button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {a.measure} {a.operator} {a.threshold}
            {a.triggered && <span style={{ color: 'var(--danger)', fontWeight: 600, marginLeft: 8 }}>{t('builder.triggered')}</span>}
          </div>
        </div>
      ))}
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
    gauge: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12" /><path d="M12 12l4-4" /><circle cx="12" cy="12" r="1" /></svg>,
    funnel: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 4h18l-5 7v6l-4 3V11z" /></svg>,
    treemap: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="8" height="10" rx="1" /><rect x="13" y="3" width="8" height="6" rx="1" /><rect x="13" y="11" width="8" height="10" rx="1" /><rect x="3" y="15" width="8" height="6" rx="1" /></svg>,
    waterfall: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="14" width="3" height="7" rx="1" /><rect x="8" y="8" width="3" height="6" rx="1" /><rect x="13" y="11" width="3" height="3" rx="1" /><rect x="18" y="3" width="3" height="8" rx="1" /></svg>,
    regionmap: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15 15 0 014 10 15 15 0 01-4 10 15 15 0 01-4-10A15 15 0 0112 2" /></svg>,
    pivot: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /></svg>,
  };
  return iconMap[type] || iconMap.bar;
}
