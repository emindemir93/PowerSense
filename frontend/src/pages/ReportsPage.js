import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsApi } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function ReportsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const canEdit = user?.role === 'admin' || user?.role === 'analyst';

  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => reportsApi.list().then((r) => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => reportsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] }),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id) => reportsApi.duplicate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] }),
  });

  const handleExport = (id, name) => {
    reportsApi.export(id).then((res) => {
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  };

  const formatDate = (d) => {
    if (!d) return 'Never';
    return new Date(d).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const getSourceLabel = (report) => {
    const qc = typeof report.query_config === 'string' ? JSON.parse(report.query_config) : report.query_config;
    return qc?.source ? qc.source.charAt(0).toUpperCase() + qc.source.slice(1) : '-';
  };

  return (
    <div className="content-area">
      <div className="page-header">
        <h1>Reports</h1>
        <p>Create, save, and run reusable queries. Export results as CSV.</p>
      </div>

      {canEdit && (
        <div style={{ marginBottom: 20 }}>
          <button className="btn btn-primary" onClick={() => navigate('/reports/new')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 16, height: 16 }}>
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Report
          </button>
        </div>
      )}

      {isLoading && (
        <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
          <div className="loading-spinner" />
        </div>
      )}

      {reports && reports.length === 0 && (
        <div className="empty-state" style={{ padding: 60 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ width: 48, height: 48 }}>
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
          </svg>
          <h3>No Reports Yet</h3>
          <p>Create your first report to save and reuse queries</p>
        </div>
      )}

      {reports && reports.length > 0 && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <table className="widget-table">
            <thead>
              <tr>
                <th>Report Name</th>
                <th>Source</th>
                <th>Created By</th>
                <th>Last Run</th>
                <th>Runs</th>
                <th style={{ width: 200 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div>
                      <div style={{ fontWeight: 600 }}>{r.name}</div>
                      {r.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{r.description}</div>}
                    </div>
                  </td>
                  <td><span className="badge badge-blue">{getSourceLabel(r)}</span></td>
                  <td style={{ color: 'var(--text-secondary)' }}>{r.creator_name || '-'}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{formatDate(r.last_run_at)}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{r.run_count || 0}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-primary btn-sm" onClick={() => navigate(`/reports/${r.id}`)}>
                        Open
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleExport(r.id, r.name)} title="Export CSV">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14 }}>
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        CSV
                      </button>
                      {canEdit && (
                        <>
                          <button className="btn btn-ghost btn-sm" onClick={() => duplicateMutation.mutate(r.id)} title="Duplicate">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14 }}>
                              <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                            </svg>
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--danger)' }}
                            onClick={() => { if (window.confirm('Delete this report?')) deleteMutation.mutate(r.id); }}
                            title="Delete"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14 }}>
                              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
