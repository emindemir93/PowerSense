import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

// ─── API ──────────────────────────────────────────────────────────────────────
const API = axios.create({ baseURL: 'http://localhost:4000/api', timeout: 15000 });
API.interceptors.request.use(c => {
  const t = localStorage.getItem('bo_token');
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});
API.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) { localStorage.clear(); window.location.reload(); }
  return Promise.reject(err);
});

// ─── Store ────────────────────────────────────────────────────────────────────
let authState = { user: null, token: null };
const authListeners = new Set();
const setAuth = (val) => { authState = val; authListeners.forEach(fn => fn(authState)); };
const useAuth = () => {
  const [state, setState] = useState(authState);
  useEffect(() => { authListeners.add(setState); return () => authListeners.delete(setState); }, []);
  return state;
};

// ─── CSS ──────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
  :root {
    --bg:#0a0e1a;--surface:#111827;--surface2:#1a2234;--surface3:#1f2d42;
    --border:#2a3a52;--accent:#00d4ff;--accent2:#7c3aed;--accent3:#10b981;
    --accent4:#f59e0b;--danger:#ef4444;--text:#e2e8f0;--text2:#94a3b8;--text3:#64748b;
  }
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'IBM Plex Sans',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;-webkit-font-smoothing:antialiased;}
  ::-webkit-scrollbar{width:6px;height:6px;}::-webkit-scrollbar-track{background:transparent;}
  ::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px;}
  input,select,textarea{outline:none;color:var(--text);}
  @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  .fu{animation:fadeUp 0.3s ease both;}
  @keyframes spin{to{transform:rotate(360deg)}}
  .spin{display:inline-block;width:18px;height:18px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin 0.7s linear infinite;}
`;

// ─── Components ───────────────────────────────────────────────────────────────
const Card = ({ children, style }) => (
  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, ...style }}>
    {children}
  </div>
);

const Btn = ({ children, onClick, variant = 'secondary', size = 'md', disabled, style, type = 'button' }) => {
  const variants = {
    primary: { background: 'var(--accent)', color: 'var(--bg)', border: 'none' },
    secondary: { background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' },
    danger: { background: 'rgba(239,68,68,0.15)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)' },
    ghost: { background: 'none', color: 'var(--text3)', border: 'none' },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: size === 'sm' ? '5px 10px' : '8px 14px',
      borderRadius: 7, fontFamily: 'IBM Plex Sans', fontSize: size === 'sm' ? 12 : 13,
      fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1, transition: 'all 0.15s', ...variants[variant], ...style
    }}>{children}</button>
  );
};

const Input = ({ label, type = 'text', value, onChange, placeholder, required, style }) => (
  <div style={{ marginBottom: 14 }}>
    {label && <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 5 }}>{label}</label>}
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required} style={{
      width: '100%', padding: '9px 12px', background: 'var(--surface2)',
      border: '1px solid var(--border)', borderRadius: 8, fontSize: 14,
      fontFamily: 'IBM Plex Sans', transition: 'all 0.2s', ...style
    }}
      onFocus={e => e.target.style.borderColor = 'var(--accent)'}
      onBlur={e => e.target.style.borderColor = 'var(--border)'}
    />
  </div>
);

const Select = ({ label, value, onChange, options, style }) => (
  <div style={{ marginBottom: 14 }}>
    {label && <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 5 }}>{label}</label>}
    <select value={value} onChange={onChange} style={{
      width: '100%', padding: '9px 12px', background: 'var(--surface2)',
      border: '1px solid var(--border)', borderRadius: 8, fontSize: 14,
      fontFamily: 'IBM Plex Sans', cursor: 'pointer', ...style
    }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const Badge = ({ children, type = 'blue' }) => {
  const styles = {
    green: { bg: 'rgba(16,185,129,0.15)', color: 'var(--accent3)' },
    blue: { bg: 'rgba(0,212,255,0.15)', color: 'var(--accent)' },
    yellow: { bg: 'rgba(245,158,11,0.15)', color: 'var(--accent4)' },
    red: { bg: 'rgba(239,68,68,0.15)', color: 'var(--danger)' },
    purple: { bg: 'rgba(124,58,237,0.15)', color: 'var(--accent2)' },
  };
  const s = styles[type] || styles.blue;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 12, fontSize: 10,
      fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
      background: s.bg, color: s.color
    }}>{children}</span>
  );
};

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 24, width: '100%', maxWidth: 480,
        maxHeight: '90vh', overflowY: 'auto'
      }} className="fu">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>{title}</h3>
          <Btn onClick={onClose} variant="ghost" size="sm">✕</Btn>
        </div>
        {children}
      </div>
    </div>
  );
};

const Alert = ({ type, children }) => (
  <div style={{
    padding: '12px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13,
    background: type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
    border: `1px solid ${type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
    color: type === 'success' ? 'var(--accent3)' : 'var(--danger)',
  }}>{type === 'success' ? '✅' : '⚠️'} {children}</div>
);

// ─── Login ────────────────────────────────────────────────────────────────────
function LoginView() {
  const [email, setEmail] = useState('admin@qlicksense.com');
  const [pwd, setPwd] = useState('Admin123!');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const { data } = await API.post('/auth/login', { email, password: pwd });
      if (data.data.user.role !== 'admin') {
        setErr('Bu panele erişmek için admin yetkisi gereklidir.');
        setLoading(false);
        return;
      }
      localStorage.setItem('bo_token', data.data.accessToken);
      localStorage.setItem('bo_refresh', data.data.refreshToken);
      setAuth({ user: data.data.user, token: data.data.accessToken });
    } catch (err) {
      setErr(err.response?.data?.message || 'Giriş başarısız.');
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)'
    }}>
      <div style={{ width: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52,
            background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
            borderRadius: 14, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 26, margin: '0 auto 12px'
          }}>⚙️</div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>
            <span style={{ color: 'var(--accent)' }}>Qlick</span>Sense Admin
          </h1>
          <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 4 }}>Yönetici Paneli</p>
        </div>

        <Card>
          {err && <Alert type="error">{err}</Alert>}
          <form onSubmit={submit}>
            <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            <Input label="Şifre" type="password" value={pwd} onChange={e => setPwd(e.target.value)} required />
            <Btn type="submit" variant="primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '11px' }}>
              {loading ? <><span className="spin" /> Giriş yapılıyor...</> : '🔐 Admin Girişi'}
            </Btn>
          </form>
        </Card>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const NAV = [
  { id: 'dashboard', icon: '📊', label: 'Genel Bakış' },
  { id: 'users', icon: '👥', label: 'Kullanıcılar' },
  { id: 'audit', icon: '📋', label: 'Audit Logları' },
  { id: 'system', icon: '⚙️', label: 'Sistem' },
];

function Sidebar({ active, setActive, user, onLogout }) {
  return (
    <aside style={{
      width: 220, background: 'var(--surface)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', flexShrink: 0
    }}>
      <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)', height: 56 }}>
        <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, var(--accent), var(--accent2))', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚙️</div>
        <span style={{ fontWeight: 700, fontSize: 15 }}>
          <span style={{ color: 'var(--accent)' }}>Qlick</span>Sense Admin
        </span>
      </div>

      <nav style={{ flex: 1, padding: '12px 8px' }}>
        {NAV.map(item => (
          <div key={item.id} onClick={() => setActive(item.id)} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 7, marginBottom: 2,
            fontSize: 13, fontWeight: active === item.id ? 600 : 400,
            color: active === item.id ? 'var(--accent)' : 'var(--text2)',
            background: active === item.id ? 'rgba(0,212,255,0.08)' : 'transparent',
            borderLeft: active === item.id ? '2px solid var(--accent)' : '2px solid transparent',
            cursor: 'pointer', transition: 'all 0.15s',
          }}>
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            {item.label}
          </div>
        ))}
      </nav>

      <div style={{ borderTop: '1px solid var(--border)', padding: '12px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', marginBottom: 4 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
            {user?.name?.charAt(0)}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500 }}>{user?.name}</div>
            <div style={{ fontSize: 10, color: 'var(--text3)' }}>Super Admin</div>
          </div>
        </div>
        <div onClick={onLogout} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
          borderRadius: 7, cursor: 'pointer', fontSize: 13, color: 'var(--text3)',
          transition: 'color 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
        >
          🚪 Çıkış Yap
        </div>
      </div>
    </aside>
  );
}

// ─── Dashboard View ───────────────────────────────────────────────────────────
function DashboardView() {
  const { data: usersData } = useQuery({ queryKey: ['admin-users-count'], queryFn: () => API.get('/users?limit=1').then(r => r.data) });
  const { data: ordersData } = useQuery({ queryKey: ['admin-orders-count'], queryFn: () => API.get('/orders?limit=1').then(r => r.data) });
  const { data: kpiData } = useQuery({ queryKey: ['admin-kpis'], queryFn: () => API.get('/dashboard/kpis?period=3m').then(r => r.data.data) });

  const stats = [
    { label: 'Toplam Kullanıcı', value: usersData?.meta?.total || '—', icon: '👥', color: 'var(--accent)' },
    { label: 'Toplam Sipariş', value: ordersData?.meta?.total || '—', icon: '📦', color: 'var(--accent2)' },
    { label: 'Toplam Satış', value: kpiData ? `₺${(kpiData.totalSales.value / 1000000).toFixed(1)}M` : '—', icon: '💰', color: 'var(--accent3)' },
    { label: 'İade Oranı', value: kpiData ? `%${kpiData.returnRate.value.toFixed(1)}` : '—', icon: '↩️', color: 'var(--accent4)' },
  ];

  return (
    <div className="fu">
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Genel Bakış</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {stats.map(s => (
          <Card key={s.label}>
            <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
              {s.label} <span style={{ fontSize: 18 }}>{s.icon}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color, fontFamily: 'IBM Plex Mono' }}>{s.value}</div>
          </Card>
        ))}
      </div>

      <Card>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>🛡️ Sistem Bilgileri</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { k: 'Backend', v: 'Node.js v18 + Express' },
            { k: 'Veritabanı', v: 'PostgreSQL 14' },
            { k: 'Auth', v: 'JWT (Access + Refresh Token)' },
            { k: 'API', v: 'REST + Swagger/OpenAPI 3.0' },
            { k: 'Ortam', v: process.env.NODE_ENV || 'development' },
            { k: 'Versiyon', v: '1.0.0' },
          ].map(row => (
            <div key={row.k} style={{ display: 'flex', gap: 8, fontSize: 12, padding: '8px 12px', background: 'var(--surface2)', borderRadius: 6 }}>
              <span style={{ color: 'var(--text3)', minWidth: 100, fontWeight: 500 }}>{row.k}:</span>
              <span style={{ color: 'var(--text2)', fontFamily: 'IBM Plex Mono' }}>{row.v}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Users View ───────────────────────────────────────────────────────────────
function UsersView() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | 'create' | {user}
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'viewer', is_active: true });
  const [alert, setAlert] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search],
    queryFn: () => API.get('/users', { params: { page, limit: 15, search: search || undefined } }).then(r => r.data),
  });

  const openCreate = () => { setForm({ name: '', email: '', password: '', role: 'viewer', is_active: true }); setModal('create'); setAlert(null); };
  const openEdit = (u) => { setForm({ name: u.name, email: u.email, password: '', role: u.role, is_active: u.is_active }); setModal(u); setAlert(null); };

  const saveMutation = useMutation({
    mutationFn: (data) => modal === 'create'
      ? API.post('/users', data)
      : API.put(`/users/${modal.id}`, data),
    onSuccess: () => {
      qc.invalidateQueries(['admin-users']);
      setAlert({ type: 'success', msg: modal === 'create' ? 'Kullanıcı oluşturuldu.' : 'Kullanıcı güncellendi.' });
      setTimeout(() => { setModal(null); setAlert(null); }, 1200);
    },
    onError: (e) => setAlert({ type: 'error', msg: e.response?.data?.message || 'Hata oluştu.' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => API.delete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries(['admin-users']),
  });

  const handleSave = (e) => {
    e.preventDefault();
    const payload = { name: form.name, email: form.email, role: form.role, is_active: form.is_active };
    if (modal === 'create') payload.password = form.password;
    saveMutation.mutate(payload);
  };

  const roleColor = { admin: 'blue', analyst: 'purple', viewer: 'green' };

  return (
    <div className="fu">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Kullanıcı Yönetimi</h2>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{data?.meta?.total ? `${data.meta.total} kullanıcı` : ''}</div>
        </div>
        <Btn variant="primary" onClick={openCreate}>+ Kullanıcı Ekle</Btn>
      </div>

      <div style={{ marginBottom: 12, maxWidth: 300 }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: 13 }}>🔍</span>
          <input style={{
            width: '100%', padding: '8px 12px 8px 34px',
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 8, fontSize: 13, fontFamily: 'inherit'
          }} placeholder="Ad veya email ara..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--surface2)' }}>
              {['Kullanıcı', 'Email', 'Rol', 'Son Giriş', 'Durum', 'İşlem'].map(h => (
                <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text3)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}><div className="spin" style={{ margin: 'auto' }} /></td></tr>
            ) : data?.data?.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid rgba(42,58,82,0.5)' }}>
                <td style={{ padding: '10px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent2),var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                      {u.name.charAt(0)}
                    </div>
                    <strong style={{ color: 'var(--text)' }}>{u.name}</strong>
                  </div>
                </td>
                <td style={{ padding: '10px 16px', color: 'var(--text3)', fontSize: 12 }}>{u.email}</td>
                <td style={{ padding: '10px 16px' }}><Badge type={roleColor[u.role]}>{u.role}</Badge></td>
                <td style={{ padding: '10px 16px', fontSize: 11, fontFamily: 'IBM Plex Mono', color: 'var(--text3)' }}>
                  {u.last_login ? new Date(u.last_login).toLocaleDateString('tr-TR') : '—'}
                </td>
                <td style={{ padding: '10px 16px' }}><Badge type={u.is_active ? 'green' : 'red'}>{u.is_active ? 'Aktif' : 'Pasif'}</Badge></td>
                <td style={{ padding: '10px 16px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Btn size="sm" onClick={() => openEdit(u)}>✏️ Düzenle</Btn>
                    <Btn size="sm" variant="danger"
                      onClick={() => window.confirm(`${u.name} silinsin mi?`) && deleteMutation.mutate(u.id)}>
                      🗑️
                    </Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {data?.meta && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>Sayfa {page} / {data.meta.totalPages}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <Btn size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</Btn>
              <Btn size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= data.meta.totalPages}>›</Btn>
            </div>
          </div>
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Modal open={!!modal} onClose={() => setModal(null)}
        title={modal === 'create' ? '➕ Yeni Kullanıcı' : `✏️ Kullanıcı Düzenle`}>
        {alert && <Alert type={alert.type}>{alert.msg}</Alert>}
        <form onSubmit={handleSave}>
          <Input label="Ad Soyad *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <Input label="Email *" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          {modal === 'create' && (
            <Input label="Şifre * (min 8 karakter, büyük/küçük harf, rakam)" type="password" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
          )}
          <Select label="Rol" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            options={[
              { value: 'admin', label: '🔵 Admin - Tam yetki' },
              { value: 'analyst', label: '🟣 Analist - Okuma + analiz' },
              { value: 'viewer', label: '🟢 Görüntüleyici - Sadece okuma' },
            ]} />
          <Select label="Durum" value={String(form.is_active)} onChange={e => setForm(f => ({ ...f, is_active: e.target.value === 'true' }))}
            options={[{ value: 'true', label: '✅ Aktif' }, { value: 'false', label: '⛔ Pasif' }]} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <Btn onClick={() => setModal(null)}>İptal</Btn>
            <Btn type="submit" variant="primary" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <><span className="spin" /> Kaydediliyor...</> : '💾 Kaydet'}
            </Btn>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ─── Audit View ───────────────────────────────────────────────────────────────
function AuditView() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['audit', page],
    queryFn: () => API.get('/audit', { params: { page, limit: 25 } }).then(r => r.data),
  });

  return (
    <div className="fu">
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Audit Logları</h2>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Tüm sistem aktiviteleri kaydedilmektedir.</div>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--surface2)' }}>
              {['Kullanıcı', 'İşlem', 'Endpoint', 'Method', 'Durum', 'IP', 'Zaman'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text3)', fontWeight: 600, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}><div className="spin" style={{ margin: 'auto' }} /></td></tr>
            ) : data?.data?.map(log => (
              <tr key={log.id} style={{ borderBottom: '1px solid rgba(42,58,82,0.4)' }}>
                <td style={{ padding: '9px 14px', color: 'var(--text2)' }}>{log.user_name || 'Sistem'}</td>
                <td style={{ padding: '9px 14px' }}>
                  <Badge type="purple">{log.action}</Badge>
                </td>
                <td style={{ padding: '9px 14px', fontFamily: 'IBM Plex Mono', fontSize: 11, color: 'var(--text3)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.resource}</td>
                <td style={{ padding: '9px 14px' }}>
                  <Badge type={{ GET: 'blue', POST: 'green', PUT: 'yellow', DELETE: 'red' }[log.method] || 'blue'}>{log.method}</Badge>
                </td>
                <td style={{ padding: '9px 14px' }}>
                  <Badge type={log.status_code < 300 ? 'green' : log.status_code < 400 ? 'yellow' : 'red'}>{log.status_code}</Badge>
                </td>
                <td style={{ padding: '9px 14px', fontFamily: 'IBM Plex Mono', fontSize: 11, color: 'var(--text3)' }}>{log.ip_address}</td>
                <td style={{ padding: '9px 14px', fontFamily: 'IBM Plex Mono', fontSize: 10, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                  {new Date(log.created_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {data?.meta && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>Toplam {data.meta.total} kayıt</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <Btn size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</Btn>
              <span style={{ fontSize: 12, color: 'var(--text2)', padding: '4px 8px' }}>{page}/{data.meta.totalPages}</span>
              <Btn size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= data.meta.totalPages}>›</Btn>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── System View ──────────────────────────────────────────────────────────────
function SystemView() {
  return (
    <div className="fu">
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Sistem Bilgileri</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>🔌 API Bağlantıları</h3>
          {[
            { name: 'Backend API', url: 'http://localhost:4000', color: 'var(--accent3)' },
            { name: 'Swagger Docs', url: 'http://localhost:4000/api-docs', color: 'var(--accent)' },
            { name: 'PostgreSQL', url: 'localhost:5432', color: 'var(--accent2)' },
            { name: 'Frontend', url: 'http://localhost:3000', color: 'var(--accent4)' },
          ].map(s => (
            <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--surface2)', borderRadius: 7, marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</div>
                <div style={{ fontSize: 11, fontFamily: 'IBM Plex Mono', color: 'var(--text3)', marginTop: 2 }}>{s.url}</div>
              </div>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, boxShadow: `0 0 8px ${s.color}` }} />
            </div>
          ))}
        </Card>

        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>🔒 Güvenlik Ayarları</h3>
          {[
            { label: 'Rate Limiting', value: '100 req / 15dk', ok: true },
            { label: 'CORS', value: 'Aktif (whitelist)', ok: true },
            { label: 'Helmet', value: 'Aktif', ok: true },
            { label: 'JWT Rotation', value: 'Refresh token rotation', ok: true },
            { label: 'Password Hashing', value: 'bcrypt (round: 12)', ok: true },
            { label: 'Audit Log', value: 'Tüm mutasyonlar loglanır', ok: true },
          ].map(r => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(42,58,82,0.3)', fontSize: 12 }}>
              <span style={{ color: 'var(--text3)' }}>{r.label}</span>
              <span style={{ color: r.ok ? 'var(--accent3)' : 'var(--danger)', fontWeight: 500 }}>
                {r.ok ? '✓' : '✗'} {r.value}
              </span>
            </div>
          ))}
        </Card>

        <Card style={{ gridColumn: '1/-1' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>📦 Teknik Stack</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              { cat: 'Backend', items: ['Node.js 18', 'Express 4', 'Knex.js', 'bcryptjs'] },
              { cat: 'Database', items: ['PostgreSQL 14', 'UUID PK', 'Migrations', 'Seeding'] },
              { cat: 'Auth', items: ['JWT (15m)', 'Refresh Token (7g)', 'RBAC', 'Token Rotation'] },
              { cat: 'Frontend', items: ['React 18', 'TanStack Query', 'Chart.js', 'Zustand'] },
            ].map(col => (
              <div key={col.cat}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text3)', marginBottom: 8 }}>{col.cat}</div>
                {col.items.map(item => (
                  <div key={item} style={{ fontSize: 12, color: 'var(--text2)', padding: '4px 8px', background: 'var(--surface2)', borderRadius: 5, marginBottom: 4 }}>
                    • {item}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 3 * 60 * 1000, retry: 1 } } });

function App() {
  const auth = useAuth();
  const [activeView, setActiveView] = useState('dashboard');

  useEffect(() => {
    const token = localStorage.getItem('bo_token');
    if (token) {
      API.get('/auth/me').then(r => {
        if (r.data.data.role === 'admin') setAuth({ user: r.data.data, token });
        else localStorage.clear();
      }).catch(() => localStorage.clear());
    }
  }, []);

  const handleLogout = async () => {
    try { await API.post('/auth/logout', { refreshToken: localStorage.getItem('bo_refresh') }); } catch {}
    localStorage.clear();
    setAuth({ user: null, token: null });
  };

  if (!auth.user) return <LoginView />;

  const views = { dashboard: DashboardView, users: UsersView, audit: AuditView, system: SystemView };
  const View = views[activeView] || DashboardView;

  return (
    <QueryClientProvider client={qc}>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar active={activeView} setActive={setActiveView} user={auth.user} onLogout={handleLogout} />
        <main style={{ flex: 1, overflowY: 'auto', padding: 24, background: 'var(--bg)' }}>
          <View />
        </main>
      </div>
    </QueryClientProvider>
  );
}

// Mount
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <style>{css}</style>
    <App />
  </React.StrictMode>
);
