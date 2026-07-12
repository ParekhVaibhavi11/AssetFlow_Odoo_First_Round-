import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { fetchApi } from '../utils/api';
import { 
  Repeat, 
  Check, 
  X, 
  AlertTriangle,
  Clock,
  UserCheck,
  ArrowRight,
  ClipboardList
} from 'lucide-react';

const Allocation = () => {
  const { user } = useContext(AuthContext);
  const isManagerOrAdmin = user && ['Admin', 'Asset Manager', 'Department Head'].includes(user.role);

  // Core Data States
  const [allocations, setAllocations] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [availableAssets, setAvailableAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'transfers', 'overdue'
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals Toggle
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);

  // Form States
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [allocationTarget, setAllocationTarget] = useState('employee'); // 'employee' or 'department'
  
  // Return Form State
  const [returnCondition, setReturnCondition] = useState('Excellent');
  const [returnNotes, setReturnNotes] = useState('');

  // Conflict state management
  const [conflictData, setConflictData] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [assetsData, emps, depts, transfersList, overdueList] = await Promise.all([
        fetchApi('/assets'),
        fetchApi('/auth/employees'),
        fetchApi('/org/departments'),
        fetchApi('/allocations/transfers'),
        fetchApi('/allocations/overdue')
      ]);

      // Filter all assets that are currently Allocated
      const activeAllocated = assetsData.filter(a => a.status === 'Allocated');
      setAllocations(activeAllocated);
      
      // Filter assets available for allocation
      const available = assetsData.filter(a => a.status === 'Available');
      setAvailableAssets(available);

      setEmployees(emps);
      setDepartments(depts);
      setTransfers(transfersList);
      setOverdue(overdueList);
    } catch (err) {
      console.error(err);
      setError('Failed to load allocation data.');
    } finally {
      setLoading(false);
    }
  };

  const handleAllocateSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setConflictData(null);

    const payload = {
      asset_id: parseInt(selectedAssetId),
      employee_id: allocationTarget === 'employee' ? parseInt(selectedEmployeeId) : null,
      department_id: allocationTarget === 'department' ? parseInt(selectedDeptId) : null,
      expected_return_date: expectedReturnDate || null
    };

    try {
      const res = await fetchApi('/allocations/allocate', {
        method: 'POST',
        body: payload
      });

      setSuccessMsg(res.message);
      setShowAllocateModal(false);
      resetAllocateForm();
      loadData();
    } catch (err) {
      console.error(err);
      // Catch allocation conflict
      if (err.message.includes('conflict') || err.message.includes('already allocated')) {
        // Find the asset to display conflict details
        const conflictingAsset = availableAssets.find(a => parseInt(a.id) === parseInt(selectedAssetId)) || 
                                  allocations.find(a => parseInt(a.id) === parseInt(selectedAssetId));
        
        setConflictData({
          assetId: selectedAssetId,
          assetName: conflictingAsset ? conflictingAsset.name : 'Asset',
          assetTag: conflictingAsset ? conflictingAsset.asset_tag : '',
          heldBy: err.currently_held_by || 'another user',
          targetEmployeeId: allocationTarget === 'employee' ? selectedEmployeeId : null
        });
      } else {
        setError(err.message || 'Failed to complete allocation.');
      }
    }
  };

  const handleRequestTransfer = async () => {
    if (!conflictData) return;
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetchApi('/allocations/transfer/request', {
        method: 'POST',
        body: {
          asset_id: parseInt(conflictData.assetId),
          to_employee_id: parseInt(conflictData.targetEmployeeId),
          notes: `System-generated transfer request from Raj (re-allocation conflict)`
        }
      });

      setSuccessMsg(res.message);
      setConflictData(null);
      setShowAllocateModal(false);
      resetAllocateForm();
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to request transfer.');
    }
  };

  const handleResolveTransfer = async (transferId, action) => {
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetchApi(`/allocations/transfers/${transferId}/resolve`, {
        method: 'PUT',
        body: { action }
      });
      setSuccessMsg(res.message);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to resolve transfer request.');
    }
  };

  const openReturnModal = (asset) => {
    setSelectedAsset(asset);
    setReturnCondition(asset.condition);
    setReturnNotes('');
    setShowReturnModal(true);
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetchApi('/allocations/return', {
        method: 'POST',
        body: {
          asset_id: selectedAsset.id,
          condition: returnCondition,
          notes: returnNotes
        }
      });

      setSuccessMsg(res.message);
      setShowReturnModal(false);
      setSelectedAsset(null);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to check-in asset return.');
    }
  };

  const resetAllocateForm = () => {
    setSelectedAssetId('');
    setSelectedEmployeeId('');
    setSelectedDeptId('');
    setExpectedReturnDate('');
    setConflictData(null);
  };

  return (
    <div className="section-panel" style={{ gap: '20px' }}>
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="panel-title" style={{ fontSize: '22px' }}>Asset Allocations & Transfers</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Check-out assets to staff, log returned condition notes, or approve dynamic transfer workflows.
          </p>
        </div>
        
        {isManagerOrAdmin && (
          <button className="btn btn-primary" onClick={() => setShowAllocateModal(true)}>
            <UserCheck size={16} />
            <span>Check-out Asset</span>
          </button>
        )}
      </div>

      {error && (
        <div className="alert-banner" style={{ background: 'var(--color-overdue-bg)', color: 'var(--color-overdue)', borderColor: 'hsl(354, 70%, 90%)' }}>
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="alert-banner" style={{ background: 'var(--color-available-bg)', color: 'var(--color-available)', borderColor: 'hsl(142, 60%, 90%)' }}>
          <Check size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tabs Menu navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '16px' }}>
        <button 
          className={`btn-signout ${activeTab === 'active' ? 'btn-primary' : ''}`}
          style={{ borderBottom: activeTab === 'active' ? '2px solid var(--primary)' : 'none', border: 'none', background: 'none', borderRadius: 0, paddingBottom: '10px', color: activeTab === 'active' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 600 }}
          onClick={() => setActiveTab('active')}
        >
          Active Allocations ({allocations.length})
        </button>
        
        <button 
          className={`btn-signout ${activeTab === 'transfers' ? 'btn-primary' : ''}`}
          style={{ borderBottom: activeTab === 'transfers' ? '2px solid var(--primary)' : 'none', border: 'none', background: 'none', borderRadius: 0, paddingBottom: '10px', color: activeTab === 'transfers' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 600 }}
          onClick={() => setActiveTab('transfers')}
        >
          Transfer Workflow Requests ({transfers.filter(t => t.status === 'Pending').length})
        </button>
        
        <button 
          className={`btn-signout ${activeTab === 'overdue' ? 'btn-primary' : ''}`}
          style={{ borderBottom: activeTab === 'overdue' ? '2px solid var(--primary)' : 'none', border: 'none', background: 'none', borderRadius: 0, paddingBottom: '10px', color: activeTab === 'overdue' ? 'var(--color-overdue)' : 'var(--text-secondary)', fontWeight: 600 }}
          onClick={() => setActiveTab('overdue')}
        >
          Overdue Returns ({overdue.length})
        </button>
      </div>

      {/* TABS INNER PAGES CONTENT */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading allocations registry...
        </div>
      ) : (
        <>
          {/* TAB 1: Active Allocations */}
          {activeTab === 'active' && (
            <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)' }}>
              {allocations.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No assets are currently checked-out.
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tag</th>
                      <th>Asset</th>
                      <th>Category</th>
                      <th>Current Holder</th>
                      <th>Expected Return Date</th>
                      {isManagerOrAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {allocations.map(asset => (
                      <tr key={asset.id}>
                        <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{asset.asset_tag}</td>
                        <td style={{ fontWeight: 500 }}>{asset.name}</td>
                        <td>{asset.category_name}</td>
                        <td>
                          <strong>{asset.assigned_employee_name || asset.department_name}</strong>
                          {asset.department_name && asset.assigned_employee_name && (
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block' }}>Dept: {asset.department_name}</span>
                          )}
                        </td>
                        <td>
                          {asset.expected_return_date ? (
                            new Date(asset.expected_return_date).toLocaleDateString()
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>No Return Date</span>
                          )}
                        </td>
                        {isManagerOrAdmin && (
                          <td style={{ textAlign: 'right' }}>
                            <button 
                              className="btn btn-outline"
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                              onClick={() => openReturnModal(asset)}
                            >
                              Check-in / Return
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 2: Transfer Requests */}
          {activeTab === 'transfers' && (
            <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)' }}>
              {transfers.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No transfer workflow history.
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>Current Holder</th>
                      <th></th>
                      <th>Target Holder</th>
                      <th>Requested By</th>
                      <th>Status</th>
                      {isManagerOrAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {transfers.map(tr => (
                      <tr key={tr.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{tr.asset_tag}</div>
                          <div style={{ fontSize: '13px' }}>{tr.asset_name}</div>
                        </td>
                        <td>{tr.from_employee_name}</td>
                        <td><ArrowRight size={16} style={{ color: 'var(--text-secondary)' }} /></td>
                        <td><strong>{tr.to_employee_name}</strong></td>
                        <td>{tr.requested_by_name}</td>
                        <td>
                          <span className={`badge badge-${tr.status.toLowerCase()}`}>
                            {tr.status}
                          </span>
                        </td>
                        {isManagerOrAdmin && (
                          <td style={{ textAlign: 'right' }}>
                            {tr.status === 'Pending' ? (
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button 
                                  className="btn btn-primary"
                                  style={{ padding: '4px 10px', fontSize: '12px', background: 'var(--color-available)', borderColor: 'var(--color-available)' }}
                                  onClick={() => handleResolveTransfer(tr.id, 'Approve')}
                                >
                                  <Check size={12} />
                                  <span>Approve</span>
                                </button>
                                <button 
                                  className="btn btn-outline"
                                  style={{ padding: '4px 10px', fontSize: '12px', color: 'var(--color-overdue)', borderColor: 'var(--color-overdue)' }}
                                  onClick={() => handleResolveTransfer(tr.id, 'Reject')}
                                >
                                  <X size={12} />
                                  <span>Reject</span>
                                </button>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Resolved</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 3: Overdue Returns */}
          {activeTab === 'overdue' && (
            <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)' }}>
              {overdue.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No assets are currently overdue. Excellent!
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tag</th>
                      <th>Asset</th>
                      <th>Current Holder</th>
                      <th>Contact Email</th>
                      <th>Expected Return Date</th>
                      <th>Days Overdue</th>
                      {isManagerOrAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {overdue.map(asset => {
                      const overdueDays = Math.floor((new Date() - new Date(asset.expected_return_date)) / 86400000);
                      return (
                        <tr key={asset.id} style={{ backgroundColor: 'var(--color-overdue-bg)' }}>
                          <td style={{ fontWeight: 600, color: 'var(--color-overdue)' }}>{asset.asset_tag}</td>
                          <td style={{ fontWeight: 500 }}>{asset.name}</td>
                          <td><strong>{asset.assigned_employee_name || asset.department_name}</strong></td>
                          <td>{asset.assigned_employee_email || '—'}</td>
                          <td style={{ color: 'var(--color-overdue)', fontWeight: 600 }}>
                            {new Date(asset.expected_return_date).toLocaleDateString()}
                          </td>
                          <td style={{ color: 'var(--color-overdue)', fontWeight: 700 }}>
                            {overdueDays} days
                          </td>
                          {isManagerOrAdmin && (
                            <td style={{ textAlign: 'right' }}>
                              <button 
                                className="btn btn-outline"
                                style={{ padding: '6px 12px', fontSize: '12px', borderColor: 'var(--color-overdue)', color: 'var(--color-overdue)' }}
                                onClick={() => openReturnModal(asset)}
                              >
                                Check-in Return
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}

      {/* 4. MODAL: Allocate Asset */}
      {showAllocateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '18px' }}>Allocate / Check-out Asset</h3>
              <X size={18} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => { setShowAllocateModal(false); resetAllocateForm(); }} />
            </div>

            {/* Conflict banner */}
            {conflictData ? (
              <div style={{ padding: '16px', background: 'var(--color-overdue-bg)', border: '1px solid var(--color-overdue)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-overdue)', fontWeight: 600 }}>
                  <AlertTriangle size={18} />
                  <span>Allocation Conflict Detected</span>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                  Asset <strong>{conflictData.assetName} ({conflictData.assetTag})</strong> is already allocated. 
                  Currently held by: <strong>{conflictData.heldBy}</strong>.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  System rules block double allocations. Would you like to request a Transfer Request from {conflictData.heldBy} instead?
                </p>
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleRequestTransfer}>
                    <Repeat size={14} />
                    <span>Request Transfer</span>
                  </button>
                  <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setConflictData(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAllocateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Select Available Asset *</label>
                  <select 
                    className="form-input"
                    value={selectedAssetId}
                    onChange={(e) => setSelectedAssetId(e.target.value)}
                    required
                  >
                    <option value="">Choose Asset</option>
                    {/* Combine available and allocated (allocated will trigger conflict testing) */}
                    <option disabled style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>-- AVAILABLE ASSETS --</option>
                    {availableAssets.map(a => (
                      <option key={a.id} value={a.id}>{a.asset_tag} - {a.name} ({a.location})</option>
                    ))}
                    <option disabled style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>-- ALREADY CHECKED-OUT ASSETS (TEST CONFLICT) --</option>
                    {allocations.map(a => (
                      <option key={a.id} value={a.id}>{a.asset_tag} - {a.name} (held by: {a.assigned_employee_name || a.department_name})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Allocation Target *</label>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
                      <input 
                        type="radio" 
                        name="target" 
                        checked={allocationTarget === 'employee'} 
                        onChange={() => setAllocationTarget('employee')} 
                      />
                      <span>Employee</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
                      <input 
                        type="radio" 
                        name="target" 
                        checked={allocationTarget === 'department'} 
                        onChange={() => setAllocationTarget('department')} 
                      />
                      <span>Department</span>
                    </label>
                  </div>
                </div>

                {allocationTarget === 'employee' ? (
                  <div className="form-group">
                    <label className="form-label">Assign to Employee *</label>
                    <select 
                      className="form-input"
                      value={selectedEmployeeId}
                      onChange={(e) => setSelectedEmployeeId(e.target.value)}
                      required
                    >
                      <option value="">Select Employee</option>
                      {employees.map(e => (
                        <option key={e.id} value={e.id}>{e.name} ({e.role} - {e.department_name || 'No Dept'})</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">Assign to Department *</label>
                    <select 
                      className="form-input"
                      value={selectedDeptId}
                      onChange={(e) => setSelectedDeptId(e.target.value)}
                      required
                    >
                      <option value="">Select Department</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Expected Return Date</label>
                  <input 
                    type="date" 
                    className="form-input"
                    value={expectedReturnDate}
                    onChange={(e) => setExpectedReturnDate(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <button type="button" className="btn btn-outline" onClick={() => { setShowAllocateModal(false); resetAllocateForm(); }}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Check-out</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 5. MODAL: Return check-in */}
      {showReturnModal && selectedAsset && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px' }}>Asset Return Check-in</h3>
                <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}>{selectedAsset.name} ({selectedAsset.asset_tag})</span>
              </div>
              <X size={18} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setShowReturnModal(false)} />
            </div>

            <form onSubmit={handleReturnSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
              <div className="form-group">
                <label className="form-label">Check-in Condition *</label>
                <select 
                  className="form-input"
                  value={returnCondition}
                  onChange={(e) => setReturnCondition(e.target.value)}
                  required
                >
                  <option value="Excellent">Excellent</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Poor">Poor</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Condition / Return Notes *</label>
                <textarea 
                  className="form-input"
                  style={{ minHeight: '100px', resize: 'vertical' }}
                  placeholder="Describe condition details, warranty verification, missing accessories, etc."
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowReturnModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: 'var(--color-available)', borderColor: 'var(--color-available)' }}>Check-in</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Allocation;
