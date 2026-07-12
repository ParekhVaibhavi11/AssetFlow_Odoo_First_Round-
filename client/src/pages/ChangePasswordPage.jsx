/**
 * pages/ChangePasswordPage.jsx
 *
 * First-login password change screen for employees.
 * Also available for general password changes.
 *
 * Flow:
 * - Employee logs in with temp password → requirePasswordChange=true
 * - Frontend redirects here
 * - Employee enters old (temp) password + new password + confirm
 * - On success → redirected to /login (must re-authenticate with new password)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const EyeIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeOffIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);
const AlertCircleIcon = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);
const CheckCircleIcon = () => (
  <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
);
const KeyIcon = () => (
  <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"/>
  </svg>
);

const PasswordField = ({ id, label, name, value, onChange, error, show, onToggle, placeholder }) => (
  <div className="form-group">
    <label className="form-label" htmlFor={id}>{label} <span>*</span></label>
    <div className="form-input-wrapper">
      <input
        id={id} name={name} type={show ? 'text' : 'password'}
        placeholder={placeholder} value={value} onChange={onChange}
        className={`form-input ${error ? 'error' : ''}`}
        autoComplete="new-password"
      />
      <button type="button" className="input-icon-right" onClick={onToggle}>
        {show ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
    {error && <p className="field-error"><AlertCircleIcon />{error}</p>}
  </div>
);

const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [formData, setFormData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors]     = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);
  const [show, setShow]         = useState({ old: false, new: false, confirm: false });

  const toggleShow = (field) => setShow(prev => ({ ...prev, [field]: !prev[field] }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (apiError) setApiError('');
  };

  const validate = () => {
    const errs = {};
    if (!formData.oldPassword) errs.oldPassword = 'Current password is required';
    if (!formData.newPassword) errs.newPassword = 'New password is required';
    else if (formData.newPassword.length < 8) errs.newPassword = 'Min 8 characters';
    else if (!/[A-Z]/.test(formData.newPassword)) errs.newPassword = 'Needs an uppercase letter';
    else if (!/[0-9]/.test(formData.newPassword)) errs.newPassword = 'Needs a number';
    else if (formData.newPassword === formData.oldPassword) errs.newPassword = 'New password must differ from current';
    if (!formData.confirmPassword) errs.confirmPassword = 'Please confirm your new password';
    else if (formData.newPassword !== formData.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    setApiError('');

    try {
      await api.post('/auth/change-password', {
        oldPassword: formData.oldPassword,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
      });

      setDone(true);
      // Log out and redirect after 2.5 seconds
      setTimeout(async () => {
        await logout();
        navigate('/login', { replace: true });
      }, 2500);

    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update password.';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Success state ────────────────────────────────────────────
  if (done) {
    return (
      <div className="page-center">
        <div className="card fade-in" style={{ padding:'48px 40px', textAlign:'center', maxWidth:420 }}>
          <div style={{ color:'#16a34a', margin:'0 auto 16px', display:'flex', justifyContent:'center' }}>
            <CheckCircleIcon />
          </div>
          <h2 style={{ fontSize:22, fontWeight:800, color:'#0f172a', marginBottom:8 }}>
            Password updated!
          </h2>
          <p style={{ fontSize:14, color:'#64748b', marginBottom:24 }}>
            Your password has been changed successfully. Redirecting you to the login page...
          </p>
          <div style={{ display:'flex', justifyContent:'center' }}>
            <div className="spinner spinner-blue" style={{ width:24, height:24 }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-center">
      <div className="fade-in" style={{ width:'100%', maxWidth:460 }}>
        <div className="card" style={{ padding:'40px' }}>
          {/* Header */}
          <div style={{ marginBottom:28 }}>
            <div style={{
              width:52, height:52, borderRadius:16,
              background:'linear-gradient(135deg, #2563eb, #1d4ed8)',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'white', marginBottom:16,
              boxShadow:'0 8px 20px rgba(37,99,235,0.3)'
            }}>
              <KeyIcon />
            </div>
            <h1 style={{ fontSize:22, fontWeight:800, color:'#0f172a', marginBottom:6, letterSpacing:'-0.3px' }}>
              Set your new password
            </h1>
            <p style={{ fontSize:14, color:'#64748b', lineHeight:1.5 }}>
              {user?.name ? `Welcome, ${user.name}! ` : ''}
              Please change your temporary password to continue.
            </p>
          </div>

          {/* Info banner */}
          <div className="alert alert-info" style={{ marginBottom:24, fontSize:13 }}>
            <span>🔒</span>
            <span>
              Enter the temporary password provided by your admin, then choose a new secure password.
            </span>
          </div>

          {/* API Error */}
          {apiError && (
            <div className="alert alert-error fade-in" style={{ marginBottom:20 }}>
              <AlertCircleIcon />
              <span>{apiError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate style={{ display:'flex', flexDirection:'column', gap:18 }}>
            <PasswordField
              id="oldPassword" name="oldPassword" label="Current (Temporary) Password"
              value={formData.oldPassword} onChange={handleChange}
              error={errors.oldPassword} show={show.old}
              onToggle={() => toggleShow('old')}
              placeholder="Enter your temporary password"
            />

            <div style={{ height:1, background:'#e2e8f0', margin:'4px 0' }} />

            <PasswordField
              id="newPassword" name="newPassword" label="New Password"
              value={formData.newPassword} onChange={handleChange}
              error={errors.newPassword} show={show.new}
              onToggle={() => toggleShow('new')}
              placeholder="Min 8 chars, 1 uppercase, 1 number"
            />

            <PasswordField
              id="confirmPassword" name="confirmPassword" label="Confirm New Password"
              value={formData.confirmPassword} onChange={handleChange}
              error={errors.confirmPassword} show={show.confirm}
              onToggle={() => toggleShow('confirm')}
              placeholder="Re-enter your new password"
            />

            <button
              id="btn-change-password"
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ marginTop:8, padding:'13px', fontSize:15 }}
            >
              {loading ? <><div className="spinner" />Updating password...</> : 'Update Password'}
            </button>
          </form>
        </div>

        <p style={{ textAlign:'center', fontSize:12, color:'#94a3b8', marginTop:16 }}>
          After updating, you'll be redirected to login with your new password.
        </p>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
