import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { connectionsApi } from '../services/api';

const EMPTY_FORM = { name: '', db_type: 'postgresql', host: '', port: 5432, database: '', username: '', password: '', ssl: false, is_default: false };

const DB_TYPES = [
  { value: 'postgresql', label: 'PostgreSQL', defaultPort: 5432, icon: 'PG' },
  { value: 'mssql', label: 'SQL Server (MSSQL)', defaultPort: 1433, icon: 'MS' },
  { value: 'mysql', label: 'MySQL / MariaDB', defaultPort: 3306, icon: 'My' },
];

export default function ConnectionsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [testResult, setTestResult] = useState(null);
  const [testError, setTestError] = useState(null);
  const [testing, setTesting] = useState(false);

  const { data: connections, isLoading } = useQuery({
    queryKey: ['connections'],
    queryFn: () => connectionsApi.list().then((r) => r.data.data),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editId ? connectionsApi.update(editId, data) : connectionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => connectionsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['connections'] }),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id) => connectionsApi.setDefault(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['connections'] }),
  });

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm(EMPTY_FORM);
    setTestResult(null);
    setTestError(null);
  };

  const handleEdit = (conn) => {
    setEditId(conn.id);
    setForm({
      name: conn.name, db_type: conn.db_type || 'postgresql',
      host: conn.host, port: conn.port,
      database: conn.database, username: conn.username,
      password: '', ssl: conn.ssl, is_default: conn.is_default,
    });
    setTestResult(null);
    setTestError(null);
    setShowForm(true);
  };

  const handleTestNew = async () => {
    setTesting(true);
    setTestResult(null);
    setTestError(null);
    try {
      const res = await connectionsApi.testNew({
        host: form.host, port: form.port, database: form.database,
        username: form.username, password: form.password, ssl: form.ssl,
        db_type: form.db_type,
      });
      setTestResult(res.data.data);
    } catch (err) {
      setTestError(err.response?.data?.message || err.message);
    } finally {
      setTesting(false);
    }
  };

  const handleTestExisting = async (id) => {
    try {
      await connectionsApi.test(id);
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    } catch {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    }
  };

  const handleSave = () => {
    if (!form.name || !form.host || !form.database || !form.username) return;
    if (!editId && !form.password) return;
    saveMutation.mutate(form);
  };

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const statusColor = (status) => {
    if (status === 'connected') return '#3fb950';
    if (status === 'failed') return '#f85149';
    return '#8b949e';
  };

  return (
    <div className="content-area" style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" style={{ width: 24, height: 24 }}>
            <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
            <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
          </svg>
          <div>
            <h1 style={{ margin: 0 }}>Database Connections</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: 13 }}>
              Manage data source connections for BI queries, SQL Editor, and dashboards.
            </p>
          </div>
        </div>
      </div>

      {/* Add new connection button */}
      <div style={{ marginBottom: 20, display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 16, height: 16 }}>
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Connection
        </button>
      </div>

      {/* Connection Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 560 }}>
            <div className="modal-header">
              <h2>{editId ? 'Edit Connection' : 'New Connection'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={resetForm}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Connection Name *</label>
                <input className="form-input" value={form.name} onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g. Production Database" />
              </div>

              <div className="form-group">
                <label className="form-label">Database Type</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {DB_TYPES.map((dbt) => (
                    <button key={dbt.value} type="button"
                      onClick={() => {
                        updateField('db_type', dbt.value);
                        updateField('port', dbt.defaultPort);
                      }}
                      style={{
                        flex: 1, padding: '10px 8px', borderRadius: 8, cursor: 'pointer',
                        border: form.db_type === dbt.value ? '2px solid var(--accent)' : '1px solid var(--border)',
                        background: form.db_type === dbt.value ? 'var(--accent-soft)' : 'var(--bg-tertiary)',
                        color: form.db_type === dbt.value ? 'var(--accent)' : 'var(--text-secondary)',
                        textAlign: 'center', transition: 'all 0.15s',
                      }}>
                      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 2 }}>{dbt.icon}</div>
                      <div style={{ fontSize: 11, fontWeight: 500 }}>{dbt.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">{form.db_type === 'mssql' ? 'Server *' : 'Host *'}</label>
                  <input className="form-input" value={form.host} onChange={(e) => updateField('host', e.target.value)}
                    placeholder={form.db_type === 'mssql' ? 'e.g. SQLSERVER\\INSTANCE' : 'e.g. localhost or db.example.com'} />
                </div>
                <div className="form-group">
                  <label className="form-label">Port</label>
                  <input className="form-input" type="number" value={form.port}
                    onChange={(e) => updateField('port', parseInt(e.target.value) || 5432)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Database Name *</label>
                <input className="form-input" value={form.database} onChange={(e) => updateField('database', e.target.value)}
                  placeholder="e.g. qlicksense" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Username *</label>
                  <input className="form-input" value={form.username} onChange={(e) => updateField('username', e.target.value)}
                    placeholder="e.g. postgres" />
                </div>
                <div className="form-group">
                  <label className="form-label">Password {editId ? '(leave empty to keep)' : '*'}</label>
                  <input className="form-input" type="password" value={form.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    placeholder={editId ? '••••••••' : 'Enter password'} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <label className="form-checkbox">
                  <input type="checkbox" checked={form.ssl} onChange={(e) => updateField('ssl', e.target.checked)} />
                  Use SSL
                </label>
                <label className="form-checkbox">
                  <input type="checkbox" checked={form.is_default} onChange={(e) => updateField('is_default', e.target.checked)} />
                  Set as default connection
                </label>
              </div>

              {/* Test Result */}
              {testResult && (
                <div style={{
                  background: 'rgba(63, 185, 80, 0.1)', border: '1px solid rgba(63, 185, 80, 0.3)',
                  borderRadius: 8, padding: 12,
                }}>
                  <div style={{ fontWeight: 600, color: '#3fb950', fontSize: 13, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14 }}>
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    Connection Successful
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    <div>Database: <strong>{testResult.database}</strong> · User: <strong>{testResult.user}</strong></div>
                    <div>Tables: <strong>{testResult.tableCount}</strong></div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{testResult.version?.split('(')[0]}</div>
                  </div>
                </div>
              )}

              {testError && (
                <div style={{
                  background: 'rgba(248, 81, 73, 0.1)', border: '1px solid rgba(248, 81, 73, 0.3)',
                  borderRadius: 8, padding: 12,
                }}>
                  <div style={{ fontWeight: 600, color: '#f85149', fontSize: 13, marginBottom: 4 }}>Connection Failed</div>
                  <div style={{ fontSize: 12, color: '#ffa198', fontFamily: 'monospace' }}>{testError}</div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <button className="btn btn-secondary" onClick={handleTestNew} disabled={testing || !form.host || !form.database || !form.username || (!editId && !form.password)}>
                  {testing ? 'Testing...' : 'Test Connection'}
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost" onClick={resetForm}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleSave}
                    disabled={saveMutation.isPending || !form.name || !form.host || !form.database || !form.username || (!editId && !form.password)}>
                    {saveMutation.isPending ? 'Saving...' : editId ? 'Update' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connections List */}
      {isLoading && (
        <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
          <div className="loading-spinner" />
        </div>
      )}

      {connections && connections.length === 0 && (
        <div className="empty-state" style={{ padding: 60 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ width: 48, height: 48 }}>
            <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
            <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
          </svg>
          <h3>No Connections Yet</h3>
          <p>Add a database connection to start using BI features with your data.</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>The app will use the built-in database until you configure an external connection.</p>
        </div>
      )}

      {connections && connections.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {connections.map((conn) => (
            <div key={conn.id} style={{
              background: 'var(--bg-secondary)', border: `1px solid ${conn.is_default ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 10, padding: 16, transition: 'all 0.15s',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" style={{ width: 16, height: 16 }}>
                      <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
                    </svg>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{conn.name}</span>
                    <span style={{
                      background: conn.db_type === 'mssql' ? '#cc2927' : conn.db_type === 'mysql' ? '#00758f' : '#336791',
                      color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                    }}>
                      {(conn.db_type || 'postgresql').toUpperCase()}
                    </span>
                    {conn.is_default && (
                      <span style={{ background: 'var(--accent)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>DEFAULT</span>
                    )}
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor(conn.status), display: 'inline-block' }} />
                      {conn.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                    <span title="Host"><strong>Host:</strong> {conn.host}:{conn.port}</span>
                    <span title="Database"><strong>DB:</strong> {conn.database}</span>
                    <span title="User"><strong>User:</strong> {conn.username}</span>
                    {conn.ssl && <span style={{ color: '#3fb950' }}>SSL</span>}
                  </div>
                  {conn.last_error && conn.status === 'failed' && (
                    <div style={{ marginTop: 6, fontSize: 11, color: '#f85149', fontFamily: 'monospace', maxHeight: 40, overflow: 'hidden' }}>
                      {conn.last_error}
                    </div>
                  )}
                  {conn.last_tested_at && (
                    <div style={{ marginTop: 4, fontSize: 10, color: 'var(--text-muted)' }}>
                      Last tested: {new Date(conn.last_tested_at).toLocaleString('tr-TR')}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleTestExisting(conn.id)}>Test</button>
                  {!conn.is_default && (
                    <button className="btn btn-ghost btn-sm" onClick={() => setDefaultMutation.mutate(conn.id)}>Set Default</button>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(conn)}>Edit</button>
                  {!conn.is_default && (
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}
                      onClick={() => { if (window.confirm('Delete this connection?')) deleteMutation.mutate(conn.id); }}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div style={{
        marginTop: 24, background: 'rgba(68, 147, 248, 0.08)', border: '1px solid rgba(68, 147, 248, 0.2)',
        borderRadius: 8, padding: 16,
      }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--accent)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14 }}>
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          How it works
        </div>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <li>The <strong>default connection</strong> is used by SQL Editor, Schema Viewer, and BI queries</li>
          <li>If no connection is configured, the app uses the built-in database</li>
          <li>Always <strong>test the connection</strong> before setting it as default</li>
          <li>Only <strong>SELECT</strong> queries are allowed on external connections (read-only)</li>
          <li>Supports <strong>PostgreSQL</strong>, <strong>SQL Server (MSSQL)</strong>, and <strong>MySQL/MariaDB</strong></li>
          <li>MSSQL: use <code style={{ background: 'var(--bg-tertiary)', padding: '1px 4px', borderRadius: 3, fontSize: 11 }}>SERVER\INSTANCE</code> format for named instances</li>
        </ul>
      </div>
    </div>
  );
}
