import React, { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { fetchApi } from '../utils/api';
import { 
  Settings, 
  Plus, 
  X, 
  Check, 
  AlertCircle, 
  UserCheck, 
  FolderPlus, 
  Sliders,
  Trash2
} from 'lucide-react';

const OrgSetup = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const isAdmin = user && user.role === 'Admin';

  // Core Data States
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Active setup tab
  const [activeTab, setActiveTab] = useState('departments'); // 'departments', 'categories', 'employees'

  // Modals Toggles
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [editingCat, setEditingCat] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);

  // Form States - Departments
  const [deptName, setDeptName] = useState('');
  const [deptParentId, setDeptParentId] = useState('');
  const [deptManagerId, setDeptManagerId] = useState('');
  const [deptStatus, setDeptStatus] = useState('Active');

  // Form States - Categories
  const [catName, setCatName] = useState('');
  const [catCustomFields, setCatCustomFields] = useState([]); // array of {name, type, required}

  // Form States - Employees Role & Promotion
  const [employeeRole, setEmployeeRole] = useState('Employee');
  const [employeeDeptId, setEmployeeDeptId] = useState('');

  useEffect(() => {
    if (isAdmin) {
      loadSetupData();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  // Listen for dashboard quick action triggers
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const loadSetupData = async () => {
    setLoading(true);
    setError('');
    try {
      const [depts, cats, emps] = await Promise.all([
        fetchApi('/org/departments'),
        fetchApi('/org/categories'),
        fetchApi('/auth/employees')
      ]);
      setDepartments(depts);
      setCategories(cats);
      setEmployees(emps);
    } catch (err) {
      console.error(err);
      setError('Failed to retrieve setup master records.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // DEPARTMENTS METHODS
  // ==========================================
  const handleOpenDeptModal = (dept = null) => {
    setError('');
    setSuccessMsg('');
    if (dept) {
      setEditingDept(dept);
      setDeptName(dept.name);
      setDeptParentId(dept.parent_department_id || '');
      setDeptManagerId(dept.manager_id || '');
      setDeptStatus(dept.status);
    } else {
      setEditingDept(null);
      setDeptName('');
      setDeptParentId('');
      setDeptManagerId('');
      setDeptStatus('Active');
    }
    setShowDeptModal(true);
  };

  const handleDeptSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const payload = {
      name: deptName,
      parent_department_id: deptParentId ? parseInt(deptParentId) : null,
      manager_id: deptManagerId ? parseInt(deptManagerId) : null,
      status: deptStatus
    };

    try {
      let res;
      if (editingDept) {
        res = await fetchApi(`/org/departments/${editingDept.id}`, {
          method: 'PUT',
          body: payload
        });
      } else {
        res = await fetchApi('/org/departments', {
          method: 'POST',
          body: payload
        });
      }
      setSuccessMsg(res.message);
      setShowDeptModal(false);
      loadSetupData();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error processing department.');
    }
  };

  // ==========================================
  // CATEGORIES METHODS
  // ==========================================
  const handleOpenCatModal = (cat = null) => {
    setError('');
    setSuccessMsg('');
    if (cat) {
      setEditingCat(cat);
      setCatName(cat.name);
      setCatCustomFields(cat.custom_fields || []);
    } else {
      setEditingCat(null);
      setCatName('');
      setCatCustomFields([]);
    }
    setShowCatModal(true);
  };

  const handleAddCustomField = () => {
    setCatCustomFields(prev => [
      ...prev,
      { name: '', type: 'text', required: false }
    ]);
  };

  const handleRemoveCustomField = (index) => {
    setCatCustomFields(prev => prev.filter((_, i) => i !== index));
  };

  const handleCustomFieldChange = (index, fieldKey, value) => {
    setCatCustomFields(prev => {
      const updated = [...prev];
      updated[index][fieldKey] = value;
      return updated;
    });
  };

  const handleCatSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // Clean field names to avoid duplicates or spacing
    const cleanedFields = catCustomFields.map(f => ({
      name: f.name.trim().toLowerCase().replace(/\s+/g, '_'),
      type: f.type,
      required: f.required
    })).filter(f => f.name !== '');

    const payload = {
      name: catName,
      custom_fields: cleanedFields
    };

    try {
      let res;
      if (editingCat) {
        res = await fetchApi(`/org/categories/${editingCat.id}`, {
          method: 'PUT',
          body: payload
        });
      } else {
        res = await fetchApi('/org/categories', {
          method: 'POST',
          body: payload
        });
      }
      setSuccessMsg(res.message);
      setShowCatModal(false);
      loadSetupData();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error processing category.');
    }
  };

  // ==========================================
  // EMPLOYEE ROLES / DIRECTORY METHODS
  // ==========================================
  const handleOpenRoleModal = (emp) => {
    setError('');
    setSuccessMsg('');
    setEditingEmployee(emp);
    setEmployeeRole(emp.role);
    setEmployeeDeptId(emp.department_id || '');
    setShowRoleModal(true);
  };

  const handleRoleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetchApi('/auth/promote', {
        method: 'PUT',
        body: {
          employee_id: editingEmployee.id,
          role: employeeRole,
          department_id: employeeDeptId ? parseInt(employeeDeptId) : null
        }
      });
      setSuccessMsg(res.message);
      setShowRoleModal(false);
      loadSetupData();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error updating employee permissions.');
    }
  };

  const handleToggleEmployeeStatus = async (empId, currentStatus) => {
    setError('');
    setSuccessMsg('');
    const targetStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      const res = await fetchApi(`/auth/employees/${empId}/status`, {
        method: 'PUT',
        body: { status: targetStatus }
      });
      setSuccessMsg(res.message);
      loadSetupData();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to update employee status.');
    }
  };

  if (!isAdmin) {
    return (
      <div className="section-panel" style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-card)' }}>
        <AlertCircle size={48} style={{ color: 'var(--color-overdue)', marginBottom: '16px' }} />
        <h3>Access Denied</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
          Organization Setup configurations are restricted to System Administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="section-panel" style={{ gap: '20px' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="panel-title" style={{ fontSize: '22px' }}>Organization Master Settings</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Maintain foundational departments, asset categories custom forms, and directory roles.
          </p>
        </div>
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

      {/* Tabs Menu navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '16px' }}>
        <button 
          className={`btn-signout ${activeTab === 'departments' ? 'btn-primary' : ''}`}
          style={{ borderBottom: activeTab === 'departments' ? '2px solid var(--primary)' : 'none', border: 'none', background: 'none', borderRadius: 0, paddingBottom: '10px', color: activeTab === 'departments' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 600 }}
          onClick={() => setActiveTab('departments')}
        >
          Tab A - Department Management ({departments.length})
        </button>
        
        <button 
          className={`btn-signout ${activeTab === 'categories' ? 'btn-primary' : ''}`}
          style={{ borderBottom: activeTab === 'categories' ? '2px solid var(--primary)' : 'none', border: 'none', background: 'none', borderRadius: 0, paddingBottom: '10px', color: activeTab === 'categories' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 600 }}
          onClick={() => setActiveTab('categories')}
        >
          Tab B - Asset Category Management ({categories.length})
        </button>
        
        <button 
          className={`btn-signout ${activeTab === 'employees' ? 'btn-primary' : ''}`}
          style={{ borderBottom: activeTab === 'employees' ? '2px solid var(--primary)' : 'none', border: 'none', background: 'none', borderRadius: 0, paddingBottom: '10px', color: activeTab === 'employees' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 600 }}
          onClick={() => setActiveTab('employees')}
        >
          Tab C - Employee Directory ({employees.length})
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading settings...</div>
      ) : (
        <>
          {/* TAB A: Departments */}
          {activeTab === 'departments' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <button className="btn btn-primary" onClick={() => handleOpenDeptModal(null)}>
                  <Plus size={14} />
                  <span>Create Department</span>
                </button>
              </div>

              <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)' }}>
                {departments.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>No departments created.</div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Department Name</th>
                        <th>Parent Department</th>
                        <th>Department Head</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departments.map(dept => (
                        <tr key={dept.id}>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{dept.name}</td>
                          <td>{dept.parent_department_name || <span style={{ color: 'var(--text-muted)' }}>Top-level</span>}</td>
                          <td>{dept.manager_name ? `${dept.manager_name} (${dept.manager_email})` : <span style={{ color: 'var(--text-muted)' }}>No Head Assigned</span>}</td>
                          <td>
                            <span className={`badge badge-${dept.status === 'Active' ? 'available' : 'overdue'}`}>
                              {dept.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleOpenDeptModal(dept)}>
                              Edit Settings
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB B: Categories */}
          {activeTab === 'categories' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <button className="btn btn-primary" onClick={() => handleOpenCatModal(null)}>
                  <Plus size={14} />
                  <span>Create Category</span>
                </button>
              </div>

              <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)' }}>
                {categories.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>No asset categories created.</div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Category Name</th>
                        <th>Dynamic Custom Attributes Definitions</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map(cat => (
                        <tr key={cat.id}>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cat.name}</td>
                          <td>
                            {cat.custom_fields && cat.custom_fields.length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {cat.custom_fields.map(f => (
                                  <span key={f.name} style={{ fontSize: '12px', padding: '2px 8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                                    {f.name.replace('_', ' ')} ({f.type}){f.required ? '*' : ''}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Standard parameters only</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleOpenCatModal(cat)}>
                              Edit Fields
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB C: Employee Directory */}
          {activeTab === 'employees' && (
            <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>System Role</th>
                    <th>Account Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp.id}>
                      <td style={{ fontWeight: 600 }}>{emp.name}</td>
                      <td>{emp.email}</td>
                      <td>{emp.department_name || <span style={{ color: 'var(--text-muted)' }}>No Department</span>}</td>
                      <td>
                        <span className={`badge ${emp.role === 'Admin' ? 'badge-overdue' : emp.role === 'Asset Manager' ? 'badge-maintenance' : emp.role === 'Department Head' ? 'badge-booking' : 'badge-available'}`}>
                          {emp.role}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${emp.status === 'Active' ? 'available' : 'overdue'}`}>
                          {emp.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button className="btn btn-outline" style={{ padding: '6px 10px', fontSize: '12px' }} onClick={() => handleOpenRoleModal(emp)}>
                            Change Permissions
                          </button>
                          
                          <button 
                            className="btn btn-outline" 
                            style={{ padding: '6px 10px', fontSize: '12px', color: emp.status === 'Active' ? 'var(--color-overdue)' : 'var(--color-available)' }}
                            onClick={() => handleToggleEmployeeStatus(emp.id, emp.status)}
                          >
                            {emp.status === 'Active' ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* 4. MODAL: Create / Edit Department */}
      {showDeptModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '18px' }}>{editingDept ? 'Edit Department Settings' : 'Create Department'}</h3>
              <X size={18} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setShowDeptModal(false)} />
            </div>

            <form onSubmit={handleDeptSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
              <div className="form-group">
                <label className="form-label">Department Name *</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="e.g. Operations Team"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Parent Department (for Hierarchies)</label>
                <select 
                  className="form-input"
                  value={deptParentId}
                  onChange={(e) => setDeptParentId(e.target.value)}
                >
                  <option value="">None (Top Level)</option>
                  {departments
                    .filter(d => !editingDept || parseInt(d.id) !== parseInt(editingDept.id))
                    .map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Department Head (Manager)</label>
                <select 
                  className="form-input"
                  value={deptManagerId}
                  onChange={(e) => setDeptManagerId(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.email})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select 
                  className="form-input"
                  value={deptStatus}
                  onChange={(e) => setDeptStatus(e.target.value)}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowDeptModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingDept ? 'Save Changes' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL: Create / Edit Category with custom properties builder */}
      {showCatModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '18px' }}>{editingCat ? 'Edit Custom Fields Schema' : 'Create Asset Category'}</h3>
              <X size={18} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setShowCatModal(false)} />
            </div>

            <form onSubmit={handleCatSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
              <div className="form-group">
                <label className="form-label">Category Name *</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="e.g. Laptops, Vehicles, Office Supplies"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  required
                />
              </div>

              <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Custom Attributes Builder</h4>
                  <button type="button" className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={handleAddCustomField}>
                    + Add Field
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {catCustomFields.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', padding: '10px' }}>Only standard assets parameters are registered by default.</p>
                  ) : (
                    catCustomFields.map((field, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 80px 40px', gap: '10px', alignItems: 'center' }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Field name (e.g. warranty)"
                          value={field.name}
                          onChange={(e) => handleCustomFieldChange(idx, 'name', e.target.value)}
                          required
                        />
                        <select
                          className="form-input"
                          value={field.type}
                          onChange={(e) => handleCustomFieldChange(idx, 'type', e.target.value)}
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="date">Date</option>
                          <option value="boolean">Boolean</option>
                        </select>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => handleCustomFieldChange(idx, 'required', e.target.checked)}
                          />
                          <span>Required</span>
                        </label>
                        <button type="button" className="btn-signout" style={{ padding: '6px', color: 'var(--color-overdue)', borderColor: 'transparent', background: 'transparent' }} onClick={() => handleRemoveCustomField(idx)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowCatModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingCat ? 'Save Fields' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: Change Permissions / Roles Promotion */}
      {showRoleModal && editingEmployee && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px' }}>Update Employee Permissions</h3>
                <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}>{editingEmployee.name} ({editingEmployee.email})</span>
              </div>
              <X size={18} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setShowRoleModal(false)} />
            </div>

            <form onSubmit={handleRoleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
              <div className="form-group">
                <label className="form-label">Promote/Assign System Role *</label>
                <select 
                  className="form-input"
                  value={employeeRole}
                  onChange={(e) => setEmployeeRole(e.target.value)}
                  required
                >
                  <option value="Employee">Employee (Standard View)</option>
                  <option value="Department Head">Department Head (Approvals & bookings)</option>
                  <option value="Asset Manager">Asset Manager (Allocations & repair actions)</option>
                  <option value="Admin">Admin (Setup configurations & audits)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Assign Department</label>
                <select 
                  className="form-input"
                  value={employeeDeptId}
                  onChange={(e) => setEmployeeDeptId(e.target.value)}
                >
                  <option value="">No Department (Top Level Staff)</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowRoleModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update Permissions</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrgSetup;
