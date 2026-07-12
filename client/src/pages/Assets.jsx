import React, { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { fetchApi } from '../utils/api';
import { 
  Plus, 
  Search, 
  Filter, 
  History, 
  Info, 
  X, 
  AlertCircle,
  FileText
} from 'lucide-react';

const Assets = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const isManagerOrAdmin = user && ['Admin', 'Asset Manager'].includes(user.role);

  // Core Data States
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters State
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');

  // Modals Toggle States
  const [showRegModal, setShowRegModal] = useState(false);
  const [showHistModal, setShowHistModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);

  // Form State for Asset Registration
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formSerial, setFormSerial] = useState('');
  const [formAcqDate, setFormAcqDate] = useState('');
  const [formAcqCost, setFormAcqCost] = useState('');
  const [formCondition, setFormCondition] = useState('Excellent');
  const [formLocation, setFormLocation] = useState('');
  const [formShared, setFormShared] = useState(false);
  const [formDept, setFormDept] = useState('');
  const [formAssignee, setFormAssignee] = useState('');
  const [formPhoto, setFormPhoto] = useState('');
  const [formCustomAttrs, setFormCustomAttrs] = useState({});

  // Load Main Data on mount & filter change
  useEffect(() => {
    loadAssets();
  }, [categoryFilter, statusFilter, conditionFilter]);

  // Load helper directories metadata once
  useEffect(() => {
    loadMetadata();
  }, []);

  // Listen for dashboard quick action triggers
  useEffect(() => {
    if (location.state?.openRegister) {
      setShowRegModal(true);
      // Clean state after reading so it doesn't reopen on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const loadAssets = async () => {
    setLoading(true);
    setError('');
    try {
      let endpoint = '/assets?';
      if (categoryFilter) endpoint += `category_id=${categoryFilter}&`;
      if (statusFilter) endpoint += `status=${statusFilter}&`;
      if (conditionFilter) endpoint += `condition=${conditionFilter}&`;
      if (search) endpoint += `search=${search}&`;

      const data = await fetchApi(endpoint);
      setAssets(data);
    } catch (err) {
      console.error(err);
      setError('Failed to retrieve assets list.');
    } finally {
      setLoading(false);
    }
  };

  const loadMetadata = async () => {
    try {
      const [cats, depts, emps] = await Promise.all([
        fetchApi('/org/categories'),
        fetchApi('/org/departments'),
        fetchApi('/auth/employees')
      ]);
      setCategories(cats);
      setDepartments(depts);
      setEmployees(emps);
    } catch (err) {
      console.error('Failed to load metadata:', err.message);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadAssets();
  };

  const handleClearFilters = () => {
    setSearch('');
    setCategoryFilter('');
    setStatusFilter('');
    setConditionFilter('');
    // Direct call since state updates are asynchronous
    setLoading(true);
    fetchApi('/assets').then(data => {
      setAssets(data);
      setLoading(false);
    });
  };

  // Find dynamic fields config of currently selected category in register form
  const getSelectedCategoryFields = () => {
    if (!formCategory) return [];
    const cat = categories.find(c => parseInt(c.id) === parseInt(formCategory));
    return cat ? cat.custom_fields : [];
  };

  // Manage dynamic text change in custom attributes inputs
  const handleCustomAttrChange = (name, value) => {
    setFormCustomAttrs(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetRegisterForm = () => {
    setFormName('');
    setFormCategory('');
    setFormSerial('');
    setFormAcqDate('');
    setFormAcqCost('');
    setFormCondition('Excellent');
    setFormLocation('');
    setFormShared(false);
    setFormDept('');
    setFormAssignee('');
    setFormPhoto('');
    setFormCustomAttrs({});
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const payload = {
      name: formName,
      category_id: parseInt(formCategory),
      serial_number: formSerial,
      acquisition_date: formAcqDate,
      acquisition_cost: formAcqCost ? parseFloat(formAcqCost) : 0,
      condition: formCondition,
      location: formLocation,
      shared_bookable: formShared,
      department_id: formDept ? parseInt(formDept) : null,
      assigned_to: formAssignee ? parseInt(formAssignee) : null,
      custom_attributes: formCustomAttrs,
      photo_url: formPhoto
    };

    try {
      await fetchApi('/assets', {
        method: 'POST',
        body: payload
      });
      setShowRegModal(false);
      resetRegisterForm();
      loadAssets(); // reload checklist
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error registering new asset.');
    }
  };

  const handleViewHistory = async (asset) => {
    setSelectedAsset(asset);
    try {
      const logs = await fetchApi(`/assets/${asset.id}/history`);
      setHistoryLogs(logs);
      setShowHistModal(true);
    } catch (err) {
      console.error(err);
      alert('Error fetching history logs.');
    }
  };

  const handleViewDetails = (asset) => {
    setSelectedAsset(asset);
    setShowDetailModal(true);
  };

  return (
    <div className="section-panel" style={{ gap: '20px' }}>
      {/* 1. Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="panel-title" style={{ fontSize: '22px' }}>Asset Directory</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Centrally track, search, and manage your organization's physical assets.
          </p>
        </div>
        
        {isManagerOrAdmin && (
          <button className="btn btn-primary" onClick={() => setShowRegModal(true)}>
            <Plus size={16} />
            <span>Register Asset</span>
          </button>
        )}
      </div>

      {error && (
        <div className="alert-banner" style={{ background: 'var(--color-overdue-bg)', color: 'var(--color-overdue)', borderColor: 'hsl(354, 70%, 90%)' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Filters Row */}
      <form onSubmit={handleSearchSubmit} className="actions-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr)) 100px', gap: '12px', alignItems: 'end' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Search Keywords</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '36px' }}
              placeholder="Tag, Name, Serial, Location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Category</label>
          <select 
            className="form-input"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Status</label>
          <select 
            className="form-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Allocated">Allocated</option>
            <option value="Under Maintenance">Under Maintenance</option>
            <option value="Reserved">Reserved</option>
            <option value="Lost">Lost</option>
            <option value="Retired">Retired</option>
            <option value="Disposed">Disposed</option>
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Condition</label>
          <select 
            className="form-input"
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
          >
            <option value="">All Conditions</option>
            <option value="Excellent">Excellent</option>
            <option value="Good">Good</option>
            <option value="Fair">Fair</option>
            <option value="Poor">Poor</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="submit" className="btn btn-primary" style={{ padding: '10px 14px' }}>
            Apply
          </button>
          <button type="button" className="btn btn-outline" style={{ padding: '10px 14px' }} onClick={handleClearFilters}>
            Clear
          </button>
        </div>
      </form>

      {/* 3. Assets Table List */}
      <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading database assets...
          </div>
        ) : assets.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No assets found matching the filter options.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Tag</th>
                <th>Asset Name</th>
                <th>Category</th>
                <th>Condition</th>
                <th>Location</th>
                <th>Status</th>
                <th>Holder</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.id}>
                  <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{asset.asset_tag}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{asset.name}</div>
                    {asset.serial_number && (
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>S/N: {asset.serial_number}</span>
                    )}
                  </td>
                  <td>{asset.category_name}</td>
                  <td>
                    <span style={{ fontSize: '13px' }}>{asset.condition}</span>
                  </td>
                  <td>{asset.location || '—'}</td>
                  <td>
                    <span className={`badge badge-${asset.status.toLowerCase().replace(' ', '-')}`}>
                      {asset.status}
                    </span>
                  </td>
                  <td>
                    {asset.status === 'Allocated' ? (
                      <div style={{ fontSize: '13px' }}>
                        {asset.assigned_employee_name || asset.department_name || 'Allocated'}
                      </div>
                    ) : asset.shared_bookable ? (
                      <span style={{ fontSize: '11px', padding: '2px 6px', background: 'var(--color-booking-bg)', color: 'var(--color-booking)', borderRadius: '4px', fontWeight: 600 }}>Shared Bookable</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>—</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button 
                        className="btn-signout" 
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                        title="View Details"
                        onClick={() => handleViewDetails(asset)}
                      >
                        <Info size={13} />
                        <span>Details</span>
                      </button>
                      <button 
                        className="btn-signout" 
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                        title="View History"
                        onClick={() => handleViewHistory(asset)}
                      >
                        <History size={13} />
                        <span>Logs</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 4. MODAL: Register Asset */}
      {showRegModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '18px' }}>Register New Asset</h3>
              <X size={18} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setShowRegModal(false)} />
            </div>

            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Asset Name *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. MacBook Pro 16"
                    value={formName} 
                    onChange={(e) => setFormName(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select 
                    className="form-input" 
                    value={formCategory} 
                    onChange={(e) => {
                      setFormCategory(e.target.value);
                      setFormCustomAttrs({}); // reset custom attributes
                    }} 
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Serial Number</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. SN-998822"
                    value={formSerial} 
                    onChange={(e) => setFormSerial(e.target.value)} 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Acquisition Date *</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={formAcqDate} 
                    onChange={(e) => setFormAcqDate(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Acquisition Cost ($)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="form-input" 
                    placeholder="e.g. 1500"
                    value={formAcqCost} 
                    onChange={(e) => setFormAcqCost(e.target.value)} 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Initial Condition</label>
                  <select 
                    className="form-input" 
                    value={formCondition} 
                    onChange={(e) => setFormCondition(e.target.value)}
                  >
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Poor">Poor</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. IT Storage Room 204"
                    value={formLocation} 
                    onChange={(e) => setFormLocation(e.target.value)} 
                  />
                </div>

                <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', height: '100%', gap: '8px', paddingTop: '28px' }}>
                  <input 
                    type="checkbox" 
                    id="shared_bookable" 
                    checked={formShared} 
                    onChange={(e) => setFormShared(e.target.checked)} 
                  />
                  <label htmlFor="shared_bookable" className="form-label" style={{ cursor: 'pointer' }}>Mark as Shared / Bookable Resource</label>
                </div>
              </div>

              {/* DYNAMIC CATEGORY FIELDS SECTION */}
              {getSelectedCategoryFields().length > 0 && (
                <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: 600 }}>Category Attributes ({categories.find(c => parseInt(c.id) === parseInt(formCategory))?.name})</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {getSelectedCategoryFields().map(field => (
                      <div className="form-group" key={field.name} style={{ marginBottom: 0 }}>
                        <label className="form-label">{field.name.replace('_', ' ')} {field.required ? '*' : ''}</label>
                        <input
                          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                          className="form-input"
                          placeholder={`Enter ${field.name.replace('_', ' ')}`}
                          value={formCustomAttrs[field.name] || ''}
                          onChange={(e) => handleCustomAttrChange(field.name, e.target.value)}
                          required={field.required}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <button type="button" className="btn btn-outline" onClick={() => { setShowRegModal(false); resetRegisterForm(); }}>Cancel</button>
                <button type="submit" className="btn btn-primary">Register</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL: View History Logs */}
      {showHistModal && selectedAsset && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '550px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px' }}>Asset Audit Logs</h3>
                <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}>{selectedAsset.name} ({selectedAsset.asset_tag})</span>
              </div>
              <X size={18} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setShowHistModal(false)} />
            </div>

            <div className="activity-list" style={{ marginTop: '16px' }}>
              {historyLogs.length > 0 ? (
                historyLogs.map(log => (
                  <div key={log.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="badge badge-allocated" style={{ padding: '2px 8px', fontSize: '11px', background: 'var(--primary-light)', color: 'var(--primary)' }}>
                        {log.action}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p style={{ fontSize: '14px', marginTop: '4px', color: 'var(--text-primary)' }}>{log.notes}</p>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Logged by: {log.action_by_name || 'System'}</span>
                  </div>
                ))
              ) : (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>No history records logged for this asset.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: View Asset Details */}
      {showDetailModal && selectedAsset && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px' }}>Asset Details</h3>
                <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}>{selectedAsset.asset_tag}</span>
              </div>
              <X size={18} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setShowDetailModal(false)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Asset Name</span>
                <p style={{ fontSize: '15px', fontWeight: 500, marginTop: '2px' }}>{selectedAsset.name}</p>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Category</span>
                <p style={{ fontSize: '15px', fontWeight: 500, marginTop: '2px' }}>{selectedAsset.category_name}</p>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Serial Number</span>
                <p style={{ fontSize: '15px', marginTop: '2px' }}>{selectedAsset.serial_number || '—'}</p>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Location</span>
                <p style={{ fontSize: '15px', marginTop: '2px' }}>{selectedAsset.location || '—'}</p>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Acquisition Date</span>
                <p style={{ fontSize: '15px', marginTop: '2px' }}>{new Date(selectedAsset.acquisition_date).toLocaleDateString()}</p>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Acquisition Cost</span>
                <p style={{ fontSize: '15px', marginTop: '2px' }}>${selectedAsset.acquisition_cost}</p>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Status</span>
                <div style={{ marginTop: '4px' }}>
                  <span className={`badge badge-${selectedAsset.status.toLowerCase().replace(' ', '-')}`}>
                    {selectedAsset.status}
                  </span>
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Condition</span>
                <p style={{ fontSize: '15px', marginTop: '2px' }}>{selectedAsset.condition}</p>
              </div>
            </div>

            {/* Custom attributes panel */}
            {selectedAsset.custom_attributes && Object.keys(selectedAsset.custom_attributes).length > 0 && (
              <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginTop: '16px' }}>
                <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>Category Attributes</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {Object.entries(selectedAsset.custom_attributes).map(([key, val]) => (
                    <div key={key}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{key.replace('_', ' ')}</span>
                      <p style={{ fontSize: '14px', fontWeight: 500 }}>{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Allocation details if allocated */}
            {selectedAsset.status === 'Allocated' && (
              <div style={{ padding: '12px 16px', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 600 }}>Active Allocation Details</h4>
                <p style={{ fontSize: '14px' }}>
                  Currently assigned to: <strong>{selectedAsset.assigned_employee_name || selectedAsset.department_name}</strong>
                </p>
                {selectedAsset.expected_return_date && (
                  <span style={{ fontSize: '12px' }}>
                    Expected Return Date: {new Date(selectedAsset.expected_return_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <button className="btn btn-primary" onClick={() => setShowDetailModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assets;
