import React, { useState, useEffect } from 'react';
import { fetchApi } from '../utils/api';
import { 
  Users, 
  Search, 
  Mail, 
  Building2, 
  ShieldCheck,
  UserPlus
} from 'lucide-react';

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search & Filter State
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  useEffect(() => {
    loadDirectoryData();
  }, []);

  const loadDirectoryData = async () => {
    setLoading(true);
    setError('');
    try {
      const [empsList, deptsList] = await Promise.all([
        fetchApi('/auth/employees'),
        fetchApi('/org/departments')
      ]);
      // Filter out only active employees for the general directory view
      const activeEmps = empsList.filter(e => e.status === 'Active');
      setEmployees(activeEmps);
      setDepartments(deptsList);
    } catch (err) {
      console.error(err);
      setError('Failed to retrieve employee directory.');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'EE';
    const split = name.split(' ');
    if (split.length > 1) return `${split[0][0]}${split[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  // Filter list locally
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.name.toLowerCase().includes(search.toLowerCase()) || 
      emp.email.toLowerCase().includes(search.toLowerCase()) ||
      emp.role.toLowerCase().includes(search.toLowerCase());
      
    const matchesDept = deptFilter === '' || parseInt(emp.department_id) === parseInt(deptFilter);
    
    return matchesSearch && matchesDept;
  });

  return (
    <div className="section-panel" style={{ gap: '24px' }}>
      {/* Header bar */}
      <div>
        <h2 className="panel-title" style={{ fontSize: '22px' }}>Employee Directory</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
          Connect with team members, department managers, and asset managers across the organization.
        </p>
      </div>

      {error && (
        <div className="alert-banner" style={{ background: 'var(--color-overdue-bg)', color: 'var(--color-overdue)' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="actions-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Search Directory</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '36px' }}
              placeholder="Search by name, email, or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Filter Department</label>
          <select 
            className="form-input"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Directory Grid cards layout */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading employee directory...
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No employees found matching the search criteria.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {filteredEmployees.map(emp => {
            const roleStyle = emp.role === 'Admin' 
              ? { bg: 'var(--color-overdue-bg)', color: 'var(--color-overdue)' }
              : emp.role === 'Asset Manager'
              ? { bg: 'var(--color-maintenance-bg)', color: 'var(--color-maintenance)' }
              : emp.role === 'Department Head'
              ? { bg: 'var(--color-booking-bg)', color: 'var(--color-booking)' }
              : { bg: 'var(--primary-light)', color: 'var(--primary)' };

            return (
              <div 
                key={emp.id} 
                className="kpi-card" 
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  gap: '16px',
                  padding: '20px'
                }}
              >
                {/* Profile initials avatar */}
                <div 
                  className="avatar" 
                  style={{ 
                    width: '56px', 
                    height: '56px', 
                    fontSize: '18px',
                    borderRadius: 'var(--radius-md)',
                    background: roleStyle.bg,
                    color: roleStyle.color,
                    flexShrink: 0
                  }}
                >
                  {getInitials(emp.name)}
                </div>

                {/* Profile detail cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {emp.name}
                  </h4>
                  
                  {/* Role Badge */}
                  <div>
                    <span 
                      className="badge" 
                      style={{ 
                        backgroundColor: roleStyle.bg, 
                        color: roleStyle.color, 
                        fontSize: '11px',
                        padding: '2px 8px',
                        fontWeight: 600
                      }}
                    >
                      {emp.role}
                    </span>
                  </div>

                  {/* Department */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>
                    <Building2 size={12} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {emp.department_name || 'Executive Staff'}
                    </span>
                  </div>

                  {/* Email */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                    <Mail size={12} style={{ color: 'var(--text-muted)' }} />
                    <a 
                      href={`mailto:${emp.email}`} 
                      style={{ color: 'var(--text-secondary)', textDecoration: 'none', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}
                      title={emp.email}
                    >
                      {emp.email}
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Employees;
