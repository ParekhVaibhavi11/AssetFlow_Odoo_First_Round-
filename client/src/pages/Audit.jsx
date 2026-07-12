import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { fetchApi } from '../utils/api';
import { 
  ClipboardCheck, 
  Plus, 
  X, 
  Check, 
  AlertCircle, 
  AlertTriangle,
  Lock,
  Unlock,
  CheckCircle,
  Eye,
  Settings
} from 'lucide-react';

const Audit = () => {
  const { user } = useContext(AuthContext);
  const isAdmin = user && user.role === 'Admin';

  // Core Data States
  const [audits, setAudits] = useState([]);
  const [scopedAssets, setScopedAssets] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Selection & UI Toggles
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Create Audit Form States
  const [auditName, setAuditName] = useState('');
  const [scopeDeptId, setScopeDeptId] = useState('');
  const [scopeLocation, setScopeLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Verify Action Notes Form State
  const [showNotesForm, setShowNotesForm] = useState(null); // holds assetId
  const [verificationNotes, setVerificationNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [auditsList, deptsList] = await Promise.all([
        fetchApi('/audits'),
        fetchApi('/org/departments')
      ]);
      setAudits(auditsList);
      setDepartments(deptsList);
    } catch (err) {
      console.error(err);
      setError('Failed to retrieve audit cycles.');
    } finally {
      setLoading(false);
    }
  };

  const loadAuditAssets = async (auditId) => {
    setAssetsLoading(true);
    try {
      const data = await fetchApi(`/audits/${auditId}/assets`);
      setScopedAssets(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load assets checklist for this audit.');
    } finally {
      setAssetsLoading(false);
    }
  };

  const handleSelectAudit = (audit) => {
    setSelectedAudit(audit);
    loadAuditAssets(audit.id);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetchApi('/audits', {
        method: 'POST',
        body: {
          name: auditName,
          scope_department_id: scopeDeptId ? parseInt(scopeDeptId) : null,
          scope_location: scopeLocation || null,
          start_date: startDate,
          end_date: endDate
        }
      });

      setSuccessMsg(res.message);
      setShowCreateModal(false);
      resetCreateForm();
      loadData();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to launch audit cycle.');
    }
  };

  const handleVerifyAsset = async (assetId, status) => {
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetchApi(`/audits/${selectedAudit.id}/verify`, {
        method: 'POST',
        body: {
          asset_id: assetId,
          status,
          notes: verificationNotes || `${status} check-off`
        }
      });

      // Reload checklist to update audit state
      loadAuditAssets(selectedAudit.id);
      setShowNotesForm(null);
      setVerificationNotes('');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to submit verification.');
    }
  };

  const handleCloseAudit = async () => {
    if (!window.confirm('Reconciliation Warning: Closing this audit cycle will LOCK all evaluations and automatically update all confirmed "Missing" assets to "Lost" in the database. Proceed?')) return;
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetchApi(`/audits/${selectedAudit.id}/close`, {
        method: 'PUT'
      });

      setSuccessMsg(res.message);
      // Reload details
      const updatedAudit = { ...selectedAudit, status: 'Closed' };
      setSelectedAudit(updatedAudit);
      loadAuditAssets(selectedAudit.id);
      loadData();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to close and reconcile audit.');
    }
  };

  const resetCreateForm = () => {
    setAuditName('');
    setScopeDeptId('');
    setScopeLocation('');
    setStartDate('');
    setEndDate('');
  };

  const openVerifyNotes = (assetId) => {
    setVerificationNotes('');
    setShowNotesForm(assetId);
  };

  // Compile checklist metrics dynamically
  const getAuditProgressMetrics = () => {
    const total = scopedAssets.length;
    const verified = scopedAssets.filter(a => a.audit_status === 'Verified').length;
    const missing = scopedAssets.filter(a => a.audit_status === 'Missing').length;
    const damaged = scopedAssets.filter(a => a.audit_status === 'Damaged').length;
    const audited = verified + missing + damaged;
    const pending = total - audited;
    const percent = total > 0 ? Math.round((audited / total) * 100) : 0;

    return { total, verified, missing, damaged, audited, pending, percent };
  };

  const metrics = getAuditProgressMetrics();

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selectedAudit ? '280px 1fr' : '1fr', gap: '24px', alignItems: 'start' }}>
      
      {/* LEFT COLUMN: Audits list */}
      <div className="section-panel" style={{ gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="panel-title">Audit Cycles</h3>
          {isAdmin && (
            <button className="btn btn-primary" style={{ padding: '6px 10px' }} onClick={() => setShowCreateModal(true)}>
              <Plus size={14} />
            </button>
          )}
        </div>

        {error && !selectedAudit && (
          <div className="alert-banner" style={{ background: 'var(--color-overdue-bg)', color: 'var(--color-overdue)' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {loading ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Loading audits...</p>
          ) : audits.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>No audit cycles created.</p>
          ) : (
            audits.map(aud => (
              <div
                key={aud.id}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  background: selectedAudit && selectedAudit.id === aud.id ? 'var(--primary-light)' : 'var(--bg-card)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  borderColor: selectedAudit && selectedAudit.id === aud.id ? 'var(--primary)' : 'var(--border-color)'
                }}
                onClick={() => handleSelectAudit(aud)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <strong style={{ fontSize: '14px', color: 'var(--text-primary)', display: 'block' }}>{aud.name}</strong>
                  <span className={`badge badge-${aud.status.toLowerCase() === 'open' ? 'available' : 'overdue'}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                    {aud.status}
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                  Dept: {aud.department_name || 'All'} | Loc: {aud.scope_location || 'All'}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                  Ends: {new Date(aud.end_date).toLocaleDateString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Scoped Checklist Workspace */}
      {selectedAudit ? (
        <div className="section-panel" style={{ gap: '20px' }}>
          {/* Header & Closing panel */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 className="panel-title" style={{ fontSize: '20px' }}>{selectedAudit.name} Workspace</h2>
                <span className={`badge badge-${selectedAudit.status.toLowerCase() === 'open' ? 'available' : 'overdue'}`}>
                  {selectedAudit.status === 'Open' ? <Unlock size={12} style={{ marginRight: '4px' }} /> : <Lock size={12} style={{ marginRight: '4px' }} />}
                  {selectedAudit.status}
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                Scope: Departments: {selectedAudit.department_name || 'All'} | Location: {selectedAudit.scope_location || 'All'}
              </p>
            </div>

            {selectedAudit.status === 'Open' && isAdmin && (
              <button 
                className="btn btn-primary"
                style={{ backgroundColor: 'var(--color-overdue)', borderColor: 'var(--color-overdue)' }}
                onClick={handleCloseAudit}
              >
                Close & Reconcile Audit
              </button>
            )}
          </div>

          {error && (
            <div className="alert-banner" style={{ background: 'var(--color-overdue-bg)', color: 'var(--color-overdue)', borderColor: 'hsl(354, 70%, 90%)' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="alert-banner" style={{ background: 'var(--color-available-bg)', color: 'var(--color-available)', borderColor: 'hsl(142, 60%, 90%)' }}>
              <Check size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Dynamic Progress statistics bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
            <div style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', fontWeight: 600 }}>Progress</span>
              <strong style={{ fontSize: '18px', color: 'var(--primary)' }}>{metrics.percent}% ({metrics.audited}/{metrics.total})</strong>
            </div>
            <div style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', fontWeight: 600 }}>Verified</span>
              <strong style={{ fontSize: '18px', color: 'var(--color-available)' }}>{metrics.verified}</strong>
            </div>
            <div style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', fontWeight: 600 }}>Missing Flag</span>
              <strong style={{ fontSize: '18px', color: 'var(--color-overdue)' }}>{metrics.missing}</strong>
            </div>
            <div style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', fontWeight: 600 }}>Damaged Flag</span>
              <strong style={{ fontSize: '18px', color: 'hsl(25, 95%, 53%)' }}>{metrics.damaged}</strong>
            </div>
          </div>

          {/* Scoped checklist list */}
          <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)' }}>
            {assetsLoading ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading checklist...</div>
            ) : scopedAssets.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>No assets in scope.</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tag</th>
                    <th>Asset Name</th>
                    <th>Location</th>
                    <th>Condition</th>
                    <th>Current Status</th>
                    <th>Verification Status</th>
                    {selectedAudit.status === 'Open' && <th style={{ textAlign: 'right' }}>Audit Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {scopedAssets.map(asset => (
                    <tr key={asset.id}>
                      <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{asset.asset_tag}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{asset.name}</div>
                        {asset.serial_number && <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>S/N: {asset.serial_number}</span>}
                      </td>
                      <td>{asset.location || '—'}</td>
                      <td>{asset.condition}</td>
                      <td>
                        <span className={`badge badge-${asset.current_status.toLowerCase().replace(' ', '-')}`}>
                          {asset.current_status}
                        </span>
                      </td>
                      <td>
                        {asset.audit_status ? (
                          <div>
                            <span className={`badge badge-${asset.audit_status === 'Verified' ? 'available' : asset.audit_status === 'Missing' ? 'overdue' : 'maintenance'}`} style={{ textTransform: 'capitalize' }}>
                              {asset.audit_status}
                            </span>
                            {asset.audit_notes && (
                              <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>"{asset.audit_notes}"</span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Unchecked</span>
                        )}
                      </td>
                      {selectedAudit.status === 'Open' && (
                        <td style={{ textAlign: 'right' }}>
                          {showNotesForm === asset.id ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '200px', marginLeft: 'auto' }}>
                              <input
                                type="text"
                                className="form-input"
                                style={{ padding: '4px 8px', fontSize: '12px' }}
                                placeholder="Verification notes..."
                                value={verificationNotes}
                                onChange={(e) => setVerificationNotes(e.target.value)}
                              />
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button className="btn btn-primary" style={{ padding: '2px 8px', fontSize: '11px', background: 'var(--color-available)', borderColor: 'var(--color-available)' }} onClick={() => handleVerifyAsset(asset.id, 'Verified')}>Verify</button>
                                <button className="btn btn-primary" style={{ padding: '2px 8px', fontSize: '11px', background: 'var(--color-overdue)', borderColor: 'var(--color-overdue)' }} onClick={() => handleVerifyAsset(asset.id, 'Missing')}>Missing</button>
                                <button className="btn btn-primary" style={{ padding: '2px 8px', fontSize: '11px', background: 'hsl(25, 95%, 53%)', borderColor: 'hsl(25, 95%, 53%)' }} onClick={() => handleVerifyAsset(asset.id, 'Damaged')}>Damaged</button>
                                <button className="btn-signout" style={{ padding: '2px 8px', fontSize: '11px' }} onClick={() => setShowNotesForm(null)}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <button 
                              className="btn btn-outline"
                              style={{ padding: '4px 10px', fontSize: '12px' }}
                              onClick={() => openVerifyNotes(asset.id)}
                            >
                              Verify Asset
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        <div className="section-panel" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <ClipboardCheck size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <h3>Select an Audit Cycle from the left menu to start verification checklist.</h3>
        </div>
      )}

      {/* 5. MODAL: Create Audit Cycle */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '18px' }}>Launch Scoped Audit Cycle</h3>
              <X size={18} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => { setShowCreateModal(false); resetCreateForm(); }} />
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
              <div className="form-group">
                <label className="form-label">Audit Name *</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="e.g. Q3 IT Hardware Audit"
                  value={auditName}
                  onChange={(e) => setAuditName(e.target.value)}
                  required
                />
              </div>

              <div style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>Filter Scope (Leave blank for all)</h4>
                
                <div className="form-group">
                  <label className="form-label">Target Department</label>
                  <select 
                    className="form-input"
                    value={scopeDeptId}
                    onChange={(e) => setScopeDeptId(e.target.value)}
                  >
                    <option value="">All Departments</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Target Location Keywords</label>
                  <input 
                    type="text" 
                    className="form-input"
                    placeholder="e.g. HQ Floor 2"
                    value={scopeLocation}
                    onChange={(e) => setScopeLocation(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Start Date *</label>
                  <input 
                    type="date" 
                    className="form-input"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">End Date *</label>
                  <input 
                    type="date" 
                    className="form-input"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <button type="button" className="btn btn-outline" onClick={() => { setShowCreateModal(false); resetCreateForm(); }}>Cancel</button>
                <button type="submit" className="btn btn-primary">Launch Audit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Audit;
