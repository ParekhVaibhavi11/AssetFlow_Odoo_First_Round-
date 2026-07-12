/**
 * pages/CreateEmployeePage.jsx
 *
 * Admin-only page to create a new employee account.
 * - Protected by ProtectedRoute with roles={['ADMIN']}
 * - Calls POST /api/users
 * - Creates employee with isFirstLogin=true (server enforces)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const AlertCircleIcon = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);
const CheckCircleIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
);
const ArrowLeftIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
);

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

const DEPARTMENTS = [
  'Engineering', 'Product', 'Design', 'Sales',
  'Marketing', 'HR', 'Finance', 'Operations',
  'Legal', 'Field Operations', 'Facilities', 'IT Support'
];

const CreateEmployeePage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '', email: '', department: '', temporaryPassword: '', phone: ''
  });
  const [errors, setErrors]   = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(null);
  const [showPwd, setShowPwd] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (apiError) setApiError('');
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Full name is required';
    else if (formData.name.trim().length < 2) errs.name = 'Min 2 characters';
    if (!formData.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = 'Invalid email format';
    if (!formData.department) errs.department = 'Department is required';
    if (!formData.temporaryPassword) errs.temporaryPassword = 'Temporary password is required';
    else if (formData.temporaryPassword.length < 8) errs.temporaryPassword = 'Min 8 characters';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    setApiError('');

    try {
      const res = await api.post('/users', {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        department: formData.department,
        temporaryPassword: formData.temporaryPassword,
        phone: formData.phone.trim() || null,
      });
      setCreated(res.data.data);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create employee.';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnother = () => {
    setCreated(null);
    setFormData({ name:'', email:'', department:'', temporaryPassword:'', phone:'' });
    setErrors({});
  };

  // Success state
  if (created) {
    return (
      <div className="page-center">
        <div className="card fade-in" style={{ padding:'40px', maxWidth:460, width:'100%', textAlign:'center' }}>
          <div style={{ color:'#16a34a', display:'flex', justifyContent:'center', marginBottom:16 }}>
            <svg width="52" height="52" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h2 style={{ fontSize:22, fontWeight:800, color:'#0f172a', marginBottom:8 }}>Employee Created!</h2>
          <p style={{ fontSize:14, color:'#64748b', marginBottom:24, lineHeight:1.6 }}>
            <strong>{created.name}</strong> has been added to the system.<br/>
            They can now log in with their temporary password and will be prompted to change it.
          </p>
          {/* Employee summary */}
          <div style={{ background:'#f8fafc', borderRadius:10, padding:20, textAlign:'left', marginBottom:24 }}>
            {[
              { label:'Name', value: created.name },
              { label:'Email', value: created.email },
              { label:'Department', value: created.department },
              { label:'Role', value: created.role },
              { label:'First Login', value: created.isFirstLogin ? 'Must change password' : 'Ready' },
            ].map((r, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'8px 0', borderBottom: i < 4 ? '1px solid #e2e8f0' : 'none' }}>
                <span style={{ fontSize:13, color:'#64748b', fontWeight:500 }}>{r.label}</span>
                <span style={{ fontSize:13, color:'#0f172a', fontWeight:600 }}>{r.value}</span>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
            <button onClick={handleCreateAnother} className="btn btn-ghost" style={{ width:'auto', padding:'10px 20px' }}>
              + Create Another
            </button>
            <button onClick={() => navigate('/dashboard')} className="btn btn-primary" style={{ width:'auto', padding:'10px 20px' }}>
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-center" style={{ alignItems:'flex-start', paddingTop:48 }}>
      <div className="fade-in" style={{ width:'100%', maxWidth:520 }}>
        {/* Back */}
        <button
          onClick={() => navigate('/dashboard')}
          className="btn btn-ghost btn-sm"
          style={{ width:'auto', marginBottom:20, gap:6 }}
        >
          <ArrowLeftIcon /> Back to Dashboard
        </button>

        <div className="card" style={{ padding:'36px 40px' }}>
          {/* Header */}
          <div style={{ marginBottom:28 }}>
            <h1 style={{ fontSize:22, fontWeight:800, color:'#0f172a', marginBottom:6, letterSpacing:'-0.3px' }}>
              👥 Create Employee Account
            </h1>
            <p style={{ fontSize:14, color:'#64748b' }}>
              Fill in the details below. A temporary password will be securely hashed and stored.
            </p>
          </div>

          {/* API Error */}
          {apiError && (
            <div className="alert alert-error fade-in" style={{ marginBottom:20 }}>
              <AlertCircleIcon />
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate style={{ display:'flex', flexDirection:'column', gap:18 }}>
            {/* Full Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="emp-name">Full Name <span>*</span></label>
              <input id="emp-name" name="name" type="text" placeholder="e.g. Sana Iqbal"
                value={formData.name} onChange={handleChange}
                className={`form-input ${errors.name ? 'error' : ''}`} />
              {errors.name && <p className="field-error"><AlertCircleIcon />{errors.name}</p>}
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label" htmlFor="emp-email">Work Email <span>*</span></label>
              <input id="emp-email" name="email" type="email" placeholder="employee@company.com"
                value={formData.email} onChange={handleChange}
                className={`form-input ${errors.email ? 'error' : ''}`} />
              {errors.email && <p className="field-error"><AlertCircleIcon />{errors.email}</p>}
            </div>

            {/* Department */}
            <div className="form-group">
              <label className="form-label" htmlFor="emp-dept">Department <span>*</span></label>
              <select id="emp-dept" name="department" value={formData.department} onChange={handleChange}
                className={`form-input ${errors.department ? 'error' : ''}`}
                style={{ appearance:'none', cursor:'pointer' }}>
                <option value="">Select department...</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              {errors.department && <p className="field-error"><AlertCircleIcon />{errors.department}</p>}
            </div>

            {/* Phone (optional) */}
            <div className="form-group">
              <label className="form-label" htmlFor="emp-phone">
                Phone <span style={{ color:'#94a3b8', fontWeight:400 }}>(optional)</span>
              </label>
              <input id="emp-phone" name="phone" type="tel" placeholder="+91 98765 43210"
                value={formData.phone} onChange={handleChange} className="form-input" />
            </div>

            {/* Temporary Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="emp-pwd">Temporary Password <span>*</span></label>
              <div className="form-input-wrapper">
                <input id="emp-pwd" name="temporaryPassword" type={showPwd ? 'text' : 'password'}
                  placeholder="Min 8 characters"
                  value={formData.temporaryPassword} onChange={handleChange}
                  className={`form-input ${errors.temporaryPassword ? 'error' : ''}`} />
                <button type="button" className="input-icon-right" onClick={() => setShowPwd(p => !p)}>
                  {showPwd ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {errors.temporaryPassword && <p className="field-error"><AlertCircleIcon />{errors.temporaryPassword}</p>}
            </div>

            {/* Info */}
            <div className="alert alert-info" style={{ fontSize:13 }}>
              <span>ℹ️</span>
              <span>Communicate this temporary password to the employee. They'll be required to change it on first login.</span>
            </div>

            <button id="btn-create-employee" type="submit" className="btn btn-primary"
              disabled={loading} style={{ marginTop:4, padding:'13px', fontSize:15 }}>
              {loading ? <><div className="spinner" />Creating employee...</> : 'Create Employee Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateEmployeePage;
