import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardsApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../i18n';

export default function DashboardsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const { data: dashboards, isLoading } = useQuery({
    queryKey: ['dashboards'],
    queryFn: () => dashboardsApi.list().then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => dashboardsApi.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      navigate(`/dashboards/${res.data.data.id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => dashboardsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboards'] }),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id) => dashboardsApi.duplicate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboards'] }),
  });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    createMutation.mutate({ name: newName.trim(), description: newDesc.trim() });
    setShowCreate(false);
    setNewName('');
    setNewDesc('');
  };

  const canEdit = user?.role === 'admin' || user?.role === 'analyst';

  return (
    <div className="content-area">
      <div className="page-header">
        <h1>{t('dashboards.title')}</h1>
        <p>{t('dashboards.subtitle')}</p>
      </div>

      <div className="dashboards-grid">
        {canEdit && (
          <div className="dashboard-card new-dashboard-card" onClick={() => setShowCreate(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{t('dashboards.newDashboard')}</span>
          </div>
        )}

        {isLoading && (
          <div className="dashboard-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 180 }}>
            <div className="loading-spinner" />
          </div>
        )}

        {dashboards?.map((d) => (
          <div key={d.id} className="dashboard-card" onClick={() => navigate(`/dashboards/${d.id}`)}>
            <div className="dashboard-card-header">
              <div>
                <h3>{d.name}</h3>
                <p>{d.description || t('dashboards.noDescription')}</p>
              </div>
              {canEdit && (
                <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => duplicateMutation.mutate(d.id)}
                    title={t('common.duplicate')}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                  </button>
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => { if (window.confirm(t('dashboards.deleteConfirm'))) deleteMutation.mutate(d.id); }}
                    title={t('common.delete')}
                    style={{ color: 'var(--danger)' }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                      <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            <div className="dashboard-card-meta">
              <span>{d.widget_count || 0} {t('dashboards.widgets')}</span>
              {d.creator_name && <span>{t('dashboards.by')} {d.creator_name}</span>}
              {d.is_public && <span className="badge badge-blue">{t('common.public')}</span>}
            </div>
          </div>
        ))}
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Dashboard</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCreate(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">{t('dashboards.dashboardName')}</label>
                  <input className="form-input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t('dashboards.namePlaceholder')} autoFocus required />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('common.description')}</label>
                  <input className="form-input" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder={t('dashboards.descPlaceholder')} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary">{t('common.create')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
