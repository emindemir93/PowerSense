import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';
import { useTranslation, LANGUAGES } from '../i18n';

const navIcons = {
  dashboards: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
  reports: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>,
  dataExplorer: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" /><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" /></svg>,
  sqlEditor: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>,
  connections: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" /></svg>,
  dbSchema: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" /><rect x="2" y="7" width="8" height="5" rx="1" /><rect x="14" y="7" width="8" height="5" rx="1" /></svg>,
  userGuide: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
  users: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>,
};

const navConfig = [
  { path: '/dashboards', labelKey: 'nav.dashboards', icon: navIcons.dashboards },
  { path: '/reports', labelKey: 'nav.reports', icon: navIcons.reports },
  { path: '/explore', labelKey: 'nav.dataExplorer', icon: navIcons.dataExplorer },
  { path: '/sql', labelKey: 'nav.sqlEditor', icon: navIcons.sqlEditor },
  { path: '/connections', labelKey: 'nav.connections', icon: navIcons.connections, adminOnly: true },
  { path: '/schema', labelKey: 'nav.dbSchema', icon: navIcons.dbSchema, adminOnly: true },
  { path: '/users', labelKey: 'nav.users', icon: navIcons.users, adminOnly: true },
  { path: '/guide', labelKey: 'nav.userGuide', icon: navIcons.userGuide },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { t, lang, setLang } = useTranslation();

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    logout();
    navigate('/login');
  };

  const visibleItems = navConfig.filter((item) => {
    if (!item.adminOnly) return true;
    return user?.role === 'admin' || (item.path === '/schema' && user?.role === 'analyst');
  });

  const currentLang = LANGUAGES.find((l) => l.code === lang);
  const nextLang = LANGUAGES.find((l) => l.code !== lang);

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo" onClick={() => navigate('/dashboards')} style={{ cursor: 'pointer' }}>
          P
        </div>
        <nav className="sidebar-nav">
          {visibleItems.map((item) => (
            <button
              key={item.path}
              className={`sidebar-item ${location.pathname.startsWith(item.path) ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              {item.icon}
              <span className="tooltip">{t(item.labelKey)}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className="sidebar-item"
            onClick={() => setLang(nextLang.code)}
            title={`${currentLang?.flag} ${currentLang?.label} → ${nextLang?.flag} ${nextLang?.label}`}
            style={{ fontSize: 16 }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>{currentLang?.flag}</span>
            <span className="tooltip">{nextLang?.flag} {nextLang?.label}</span>
          </button>
          <button
            className="sidebar-item"
            onClick={() => navigate('/profile')}
            title={user?.name}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
            <span className="tooltip">{t('nav.profile')}</span>
          </button>
          <button className="sidebar-item" onClick={handleLogout}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="tooltip">{t('nav.logout')}</span>
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
