import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';
import { useTranslation } from '../i18n';

export default function ProfilePage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (newPwd !== confirmPwd) {
      setError(t('profile.passwordMismatch'));
      return;
    }
    if (newPwd.length < 6) {
      setError(t('profile.passwordTooShort'));
      return;
    }

    setLoading(true);
    try {
      await authApi.changePassword(currentPwd, newPwd);
      setMessage(t('profile.passwordChanged'));
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } catch (err) {
      setError(err.response?.data?.message || t('profile.passwordFailed'));
    } finally {
      setLoading(false);
    }
  };

  const roleBadge = {
    admin: 'badge-purple',
    analyst: 'badge-blue',
    viewer: 'badge-green',
  };

  return (
    <div className="content-area">
      <div className="page-header">
        <h1>{t('profile.title')}</h1>
        <p>{t('profile.subtitle')}</p>
      </div>

      <div className="profile-section">
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent), #7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 700, color: '#fff',
            }}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <h2 style={{ fontSize: 18, marginBottom: 4 }}>{user?.name}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{user?.email}</span>
                <span className={`badge ${roleBadge[user?.role] || 'badge-blue'}`}>{user?.role}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>{t('profile.changePassword')}</h3>
          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label className="form-label">{t('profile.currentPassword')}</label>
              <input className="form-input" type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">{t('profile.newPassword')}</label>
              <input className="form-input" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">{t('profile.confirmPassword')}</label>
              <input className="form-input" type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} required />
            </div>

            {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error}</div>}
            {message && <div style={{ color: 'var(--success)', fontSize: 13, marginBottom: 12 }}>{message}</div>}

            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? t('profile.changingPassword') : t('profile.changePassword')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
