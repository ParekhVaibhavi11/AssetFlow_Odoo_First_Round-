/**
 * pages/LoginPage.jsx
 *
 * Login screen for Admin and Employee.
 * - Validates email + password
 * - Calls POST /api/auth/login
 * - On success: stores token, redirects to /dashboard or /change-password
 * - White/Blue light theme with split-screen layout
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

// ── Icons (inline SVG — no icon library needed) ──────────────
const EyeIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeOffIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);
const MailIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);
const LockIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const AlertCircleIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

// ── Brand Panel (Left side) ───────────────────────────────────
const BrandPanel = () => (
  <div style={{
    background: 'linear-gradient(145deg, #1d4ed8 0%, #1e40af 40%, #1e3a8a 100%)',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '48px', gap: '32px', color: 'white',
    position: 'relative', overflow: 'hidden',
  }}>
    {/* Decorative circles */}
    <div style={{
      position:'absolute', top:'-60px', right:'-60px',
      width:'280px', height:'280px', borderRadius:'50%',
      background:'rgba(255,255,255,0.06)', pointerEvents:'none'
    }}/>
    <div style={{
      position:'absolute', bottom:'-80px', left:'-40px',
      width:'320px', height:'320px', borderRadius:'50%',
      background:'rgba(255,255,255,0.04)', pointerEvents:'none'
    }}/>

    {/* Logo */}
    <div style={{
      width:72, height:72, borderRadius:20,
      background:'rgba(255,255,255,0.15)',
      backdropFilter:'blur(8px)',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:28, fontWeight:800, letterSpacing:'-0.5px',
      border:'1.5px solid rgba(255,255,255,0.25)',
    }}>AF</div>

    <div style={{ textAlign:'center', maxWidth:'320px' }}>
      <h1 style={{ fontSize:32, fontWeight:800, lineHeight:1.2, marginBottom:12, letterSpacing:'-0.5px' }}>
        AssetFlow
      </h1>
      <p style={{ fontSize:16, opacity:0.8, lineHeight:1.6 }}>
        Smart Asset Management System for modern enterprises. Track, allocate, and manage all your assets in one place.
      </p>
    </div>

    {/* Feature pills */}
    <div style={{ display:'flex', flexDirection:'column', gap:12, width:'100%', maxWidth:280 }}>
      {[
        { icon: '📦', text: 'Real-time asset tracking' },
        { icon: '🔐', text: 'Role-based access control' },
        { icon: '📊', text: 'Comprehensive analytics' },
        { icon: '🔔', text: 'Instant notifications' },
      ].map((f, i) => (
        <div key={i} style={{
          display:'flex', alignItems:'center', gap:12,
          background:'rgba(255,255,255,0.10)',
          borderRadius:10, padding:'10px 16px',
          border:'1px solid rgba(255,255,255,0.12)',
          fontSize:14, fontWeight:500
        }}>
          <span>{f.icon}</span> {f.text}
        </div>
      ))}
    </div>
  </div>
);

// ── Main Login Page ───────────────────────────────────────────
const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors]     = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPwd, setShowPwd]   = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (apiError) setApiError('');
  };

  const validate = () => {
    const errs = {};
    if (!formData.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = 'Enter a valid email address';
    if (!formData.password) errs.password = 'Password is required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    setApiError('');

    try {
      const res = await api.post('/auth/login', {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      const { token, user, requirePasswordChange } = res.data.data;
      login(token, user);

      if (requirePasswordChange) {
        navigate('/change-password', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split">
      {/* Left: Brand Panel */}
      <div className="auth-split__brand">
        <BrandPanel />
      </div>

      {/* Right: Login Form */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:'48px 32px', background:'#f8fafc', overflowY:'auto'
      }}>
        <div style={{ width:'100%', maxWidth:420 }} className="fade-in">
          {/* Header */}
          <div style={{ marginBottom:36 }}>
            <div style={{
              width:48, height:48, borderRadius:14,
              background:'linear-gradient(135deg, #2563eb, #1d4ed8)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:20, fontWeight:800, color:'white',
              marginBottom:20, boxShadow:'0 8px 20px rgba(37,99,235,0.3)'
            }}>AF</div>
            <h2 style={{ fontSize:26, fontWeight:800, color:'#0f172a', marginBottom:6, letterSpacing:'-0.3px' }}>
              Welcome back
            </h2>
            <p style={{ fontSize:14, color:'#64748b' }}>
              Sign in to your AssetFlow account
            </p>
          </div>

          {/* API Error */}
          {apiError && (
            <div className="alert alert-error fade-in" style={{ marginBottom:20 }}>
              <AlertCircleIcon />
              <span>{apiError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate style={{ display:'flex', flexDirection:'column', gap:20 }}>
            {/* Email */}
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Email address <span>*</span>
              </label>
              <div className="form-input-wrapper">
                <div style={{
                  position:'absolute', left:14, top:'50%', transform:'translateY(-50%)',
                  color: errors.email ? '#ef4444' : '#94a3b8', pointerEvents:'none'
                }}>
                  <MailIcon />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@company.com"
                  value={formData.email}
                  onChange={handleChange}
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  style={{ paddingLeft:44 }}
                />
              </div>
              {errors.email && (
                <p className="field-error"><AlertCircleIcon />{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="form-group">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <label className="form-label" htmlFor="password">
                  Password <span>*</span>
                </label>
              </div>
              <div className="form-input-wrapper">
                <div style={{
                  position:'absolute', left:14, top:'50%', transform:'translateY(-50%)',
                  color: errors.password ? '#ef4444' : '#94a3b8', pointerEvents:'none'
                }}>
                  <LockIcon />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`form-input ${errors.password ? 'error' : ''}`}
                  style={{ paddingLeft:44 }}
                />
                <button
                  type="button"
                  className="input-icon-right"
                  onClick={() => setShowPwd(p => !p)}
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                >
                  {showPwd ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {errors.password && (
                <p className="field-error"><AlertCircleIcon />{errors.password}</p>
              )}
            </div>

            {/* Submit */}
            <button
              id="btn-login"
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ marginTop:4, padding:'13px 24px', fontSize:15 }}
            >
              {loading ? (
                <><div className="spinner" />Signing in...</>
              ) : 'Sign in to AssetFlow'}
            </button>
          </form>

          {/* Divider */}
          <div className="divider" style={{ margin:'28px 0' }}>
            <span>New to AssetFlow?</span>
          </div>

          {/* Info box */}
          <div className="alert alert-info" style={{ fontSize:13 }}>
            <span style={{ fontSize:18 }}>ℹ️</span>
            <div>
              <strong>Employee accounts</strong> are created by your Admin.<br />
              Contact your system administrator if you don't have access.
            </div>
          </div>

          {/* Register link (Admin setup) */}
          <p style={{ textAlign:'center', fontSize:13, color:'#94a3b8', marginTop:20 }}>
            Setting up for the first time?{' '}
            <Link to="/register" className="text-link">Create Admin account</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
