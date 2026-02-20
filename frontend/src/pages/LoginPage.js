import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';

const demoAccounts = [
  { email: 'admin@qlicksense.com', password: 'Admin123!', role: 'Admin' },
  { email: 'analyst@qlicksense.com', password: 'Analyst123!', role: 'Analyst' },
  { email: 'viewer@qlicksense.com', password: 'Viewer123!', role: 'Viewer' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.login(email, password);
      setAuth(data.data.user, data.data.accessToken, data.data.refreshToken);
      navigate('/dashboards');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
  };

  return (
    <div className="login-page">
      <div className="login-bg" />
      <div className="login-card">
        <div className="login-logo">P</div>
        <h1 className="login-title">PowerSense</h1>
        <p className="login-subtitle">Business Intelligence Platform</p>

        <form className="login-form" onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {error && (
            <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 14 }}>{error}</div>
          )}

          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="login-demo">
          <h4>Demo Accounts</h4>
          <div className="demo-accounts">
            {demoAccounts.map((acc) => (
              <div key={acc.email} className="demo-account" onClick={() => fillDemo(acc)}>
                <span>{acc.role}</span>
                <span>{acc.email}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
