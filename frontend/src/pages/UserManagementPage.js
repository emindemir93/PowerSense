import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../i18n';

export default function UserManagementPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'viewer', is_active: true });

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, roleFilter],
    queryFn: () => usersApi.list({ search: search || undefined, role: roleFilter || undefined, limit: 100 }).then(r => r.data),
  });

  const users = data?.data || [];

  const createMutation = useMutation({
    mutationFn: (data) => usersApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); closeModal(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => usersApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); closeModal(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => usersApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const openCreate = () => {
    setEditingUser(null);
    setForm({ name: '', email: '', password: '', role: 'viewer', is_active: true });
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({ name: user.name, email: user.email, password: '', role: user.role, is_active: user.is_active });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
  };

  const handleSubmit = () => {
    if (editingUser) {
      const { password, ...updates } = form;
      updateMutation.mutate({ id: editingUser.id, data: updates });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleDelete = (user) => {
    if (user.id === currentUser?.id) return;
    if (window.confirm(t('userMgmt.deleteConfirm', { name: user.name }))) {
      deleteMutation.mutate(user.id);
    }
  };

  const handleToggleActive = (user) => {
    updateMutation.mutate({ id: user.id, data: { is_active: !user.is_active } });
  };

  const roleColors = { admin: '#f85149', analyst: '#4493f8', viewer: '#3fb950' };
  const roleLabels = { admin: t('userMgmt.admin'), analyst: t('userMgmt.analyst'), viewer: t('userMgmt.viewer') };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="empty-state" style={{ height: '100%' }}>
        <h3>{t('userMgmt.accessDenied')}</h3>
        <p>{t('userMgmt.accessDeniedHint')}</p>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 24, gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{t('userMgmt.title')}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>{t('userMgmt.subtitle')}</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 16, height: 16 }}>
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t('userMgmt.newUser')}
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14, position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="form-input"
            placeholder={t('userMgmt.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 32 }}
          />
        </div>
        <select className="form-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ width: 160 }}>
          <option value="">{t('userMgmt.allRoles')}</option>
          <option value="admin">{t('userMgmt.admin')}</option>
          <option value="analyst">{t('userMgmt.analyst')}</option>
          <option value="viewer">{t('userMgmt.viewer')}</option>
        </select>
        {users.length > 0 && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
            {users.length} {t('userMgmt.userCount')}
          </span>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="empty-state"><p>{t('common.loading')}</p></div>
      ) : users.length === 0 ? (
        <div className="empty-state"><p>{t('common.noResults')}</p></div>
      ) : (
        <div style={{ overflow: 'auto', flex: 1 }}>
          <table className="widget-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>{t('userMgmt.name')}</th>
                <th>{t('userMgmt.email')}</th>
                <th>{t('userMgmt.role')}</th>
                <th>{t('userMgmt.status')}</th>
                <th>{t('userMgmt.lastLogin')}</th>
                <th style={{ width: 100 }}>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td style={{ fontWeight: 500 }}>{user.name}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{user.email}</td>
                  <td>
                    <span style={{ background: roleColors[user.role] + '20', color: roleColors[user.role], padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                      {roleLabels[user.role]}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => handleToggleActive(user)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      <div style={{ width: 36, height: 20, borderRadius: 10, background: user.is_active ? 'var(--accent)' : 'var(--bg-tertiary)', transition: 'background 0.2s', position: 'relative' }}>
                        <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: user.is_active ? 18 : 2, transition: 'left 0.2s' }} />
                      </div>
                    </button>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {user.last_login ? new Date(user.last_login).toLocaleString('tr-TR') : t('common.never')}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(user)} title={t('common.edit')}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14 }}>
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      {user.id !== currentUser?.id && (
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(user)} style={{ color: 'var(--danger)' }} title={t('common.delete')}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14 }}>
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 420 }}>
            <div className="modal-header">
              <h2>{editingUser ? t('userMgmt.editUser') : t('userMgmt.newUser')}</h2>
              <button className="btn btn-ghost btn-icon" onClick={closeModal}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">{t('userMgmt.name')}</label>
                <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('userMgmt.email')}</label>
                <input className="form-input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              </div>
              {!editingUser && (
                <div className="form-group">
                  <label className="form-label">{t('userMgmt.password')}</label>
                  <input className="form-input" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder={t('userMgmt.passwordHint')} />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">{t('userMgmt.role')}</label>
                <select className="form-select" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                  <option value="admin">{t('userMgmt.admin')}</option>
                  <option value="analyst">{t('userMgmt.analyst')}</option>
                  <option value="viewer">{t('userMgmt.viewer')}</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-checkbox">
                  <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} />
                  {t('userMgmt.activeUser')}
                </label>
              </div>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={!form.name || !form.email || (!editingUser && !form.password)}>
                {editingUser ? t('common.update') : t('common.create')}
              </button>
              {(createMutation.error || updateMutation.error) && (
                <div style={{ color: 'var(--danger)', fontSize: 12 }}>
                  {createMutation.error?.response?.data?.message || updateMutation.error?.response?.data?.message || t('common.error')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
