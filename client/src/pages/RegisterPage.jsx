/**
 * pages/RegisterPage.jsx
 *
 * One-time Admin registration screen.
 * - Only works if no admin exists yet (server enforces 409 if already registered)
 * - Calls POST /api/auth/register
 * - On success: auto-logs in and redirects to /dashboard
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const EyeIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeOffIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);
const AlertCircleIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const ShieldIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

// Password strength indicator
const PasswordStrength = ({ password }) => {
  const checks = [
    { label: 'At least 8 characters', pass: password.length >= 8 },
    { label: 'One uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'One number', pass: /[0-9]/.test(password) },
  ];
  if (!password) return null;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:4, marginTop:4 }}>
      {checks.map((c, i) => (
        <div key={i} style={{
          display:'flex', alignItems:'center', gap:6,
          fontSize:12, color: c.pass ? '#16a34a' : '#94a3b8', fontWeight:500,
          transition:'color 0.2s'
        }}>
          <div style={{
            width:14, height:14, borderRadius:'50%',
            background: c.pass ? '#16a34a' : '#e2e8f0',
            display:'flex', alignItems:'center', justifyContent:'center',
            flexShrink:0, transition:'background 0.2s'
          }}>
            {c.pass && <svg width="8" height="8" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
          </div>
          {c.label}
        </div>
      ))}
    </div>
  );
};

const RegisterPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors]     = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPwd, setShowPwd]   = useState(false);
  const [success, setSuccess]   = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (apiError) setApiError('');
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Full name is required';
    else if (formData.name.trim().length < 2) errs.name = 'Name must be at least 2 characters';
    if (!formData.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = 'Enter a valid email address';
    if (!formData.password) errs.password = 'Password is required';
    else if (formData.password.length < 8) errs.password = 'Password must be at least 8 characters';
    else if (!/[A-Z]/.test(formData.password)) errs.password = 'Password needs an uppercase letter';
    else if (!/[0-9]/.test(formData.password)) errs.password = 'Password needs a number';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    setApiError('');

    try {
      // Step 1: Register admin
      await api.post('/auth/register', {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      setSuccess(true);

      // Step 2: Auto-login
      await new Promise(r => setTimeout(r, 1200)); // Brief success feedback

      const loginRes = await api.post('/auth/login', {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      const { token, user } = loginRes.data.data;
      login(token, user);
      navigate('/dashboard', { replace: true });

    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.';
      setApiError(msg);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-center">
      <div className="fade-in" style={{ width:'100%', maxWidth:480 }}>
        {/* Card */}
        <div className="card" style={{ padding:'40px 40px 36px' }}>
          {/* Header */}
          <div style={{ textAlign:'center', marginBottom:32 }}>
            <div style={{
              width:60, height:60, borderRadius:18,
              background:'linear-gradient(135deg, #2563eb, #1d4ed8)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:22, fontWeight:800, color:'white',
              margin:'0 auto 16px',
              boxShadow:'0 10px 24px rgba(37,99,235,0.35)'
            }}>AF</div>
            <h1 style={{ fontSize:24, fontWeight:800, color:'#0f172a', marginBottom:6, letterSpacing:'-0.3px' }}>
              Admin Setup
            </h1>
            <p style={{ fontSize:14, color:'#64748b' }}>
              Create the system administrator account
            </p>
          </div>

          {/* One-time warning banner */}
          <div style={{
            background:'#fffbeb', border:'1px solid #fcd34d',
            borderRadius:10, padding:'12px 16px',
            display:'flex', gap:10, alignItems:'flex-start', marginBottom:24
          }}>
            <span style={{ fontSize:18, flexShrink:0 }}>⚠️</span>
            <div style={{ fontSize:13, color:'#92400e', lineHeight:1.5 }}>
              <strong>One-time operation.</strong> Admin registration can only be performed once.
              This account will have full system access.
            </div>
          </div>

          {/* Success state */}
          {success && (
            <div className="alert alert-success fade-in" style={{ marginBottom:20 }}>
              <CheckIcon />
              <span>Admin account created! Signing you in...</span>
            </div>
          )}

          {/* API Error */}
          {apiError && !success && (
            <div className="alert alert-error fade-in" style={{ marginBottom:20 }}>
              <AlertCircleIcon />
              <span>{apiError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate style={{ display:'flex', flexDirection:'column', gap:18 }}>
            {/* Full Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="name">Full Name <span>*</span></label>
              <input
                id="name" name="name" type="text"
                autoComplete="name" placeholder="e.g. Rohan Mehta"
                value={formData.name} onChange={handleChange}
                className={`form-input ${errors.name ? 'error' : ''}`}
              />
              {errors.name && <p className="field-error"><AlertCircleIcon />{errors.name}</p>}
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label" htmlFor="reg-email">Email Address <span>*</span></label>
              <input
                id="reg-email" name="email" type="email"
                autoComplete="email" placeholder="admin@company.com"
                value={formData.email} onChange={handleChange}
                className={`form-input ${errors.email ? 'error' : ''}`}
              />
              {errors.email && <p className="field-error"><AlertCircleIcon />{errors.email}</p>}
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="reg-password">Password <span>*</span></label>
              <div className="form-input-wrapper">
                <input
                  id="reg-password" name="password"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="new-password" placeholder="Min 8 chars, 1 uppercase, 1 number"
                  value={formData.password} onChange={handleChange}
                  className={`form-input ${errors.password ? 'error' : ''}`}
                />
                <button type="button" className="input-icon-right"
                  onClick={() => setShowPwd(p => !p)} aria-label="Toggle password">
                  {showPwd ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {errors.password && <p className="field-error"><AlertCircleIcon />{errors.password}</p>}
              <PasswordStrength password={formData.password} />
            </div>

            {/* Security note */}
            <div style={{
              display:'flex', gap:8, alignItems:'center',
              background:'#eff6ff', borderRadius:8, padding:'10px 14px',
              color:'#1d4ed8', fontSize:12, fontWeight:500
            }}>
              <ShieldIcon />
              Your password is securely hashed using bcrypt before storage.
            </div>

            {/* Submit */}
            <button
              id="btn-register"
              type="submit"
              className="btn btn-primary"
              disabled={loading || success}
              style={{ marginTop:4, padding:'13px 24px', fontSize:15 }}
            >
              {loading ? (
                <><div className="spinner" />{success ? 'Signing in...' : 'Creating account...'}</>
              ) : 'Create Admin Account'}
            </button>
          </form>

          <p style={{ textAlign:'center', fontSize:13, color:'#94a3b8', marginTop:20 }}>
            Already have an account?{' '}
            <Link to="/login" className="text-link">Sign in</Link>
          </p>
        </div>

        <p style={{ textAlign:'center', fontSize:12, color:'#94a3b8', marginTop:16 }}>
          AssetFlow © 2026 · Smart Asset Management
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
