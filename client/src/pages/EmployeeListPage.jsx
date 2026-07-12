/**
 * pages/EmployeeListPage.jsx
 *
 * Admin-only page — lists all employees in the system.
 * Calls GET /api/users
 * Shows: Name, Email, Department, Role, First Login status, Active status
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

// ── Icons ────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const ArrowLeftIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const RefreshIcon = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
);
const UsersIcon = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </svg>
);

// ── Avatar initials ───────────────────────────────────────────
const getInitials = (name = '') =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

// ── Role Badge ────────────────────────────────────────────────
const RoleBadge = ({ role }) => {
  const styles = {
    ADMIN:    { bg: '#eff6ff', color: '#1d4ed8', label: 'Admin' },
    EMPLOYEE: { bg: '#f0fdf4', color: '#15803d', label: 'Employee' },
  };
  const s = styles[role] || styles.EMPLOYEE;
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 999, fontSize: 11,
      fontWeight: 700, background: s.bg, color: s.color,
      letterSpacing: '0.04em', textTransform: 'uppercase'
    }}>{s.label}</span>
  );
};

// ── Status Badge ──────────────────────────────────────────────
const StatusBadge = ({ active }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '3px 10px', borderRadius: 999, fontSize: 11,
    fontWeight: 700,
    background: active ? '#f0fdf4' : '#fef2f2',
    color: active ? '#15803d' : '#dc2626',
    letterSpacing: '0.03em', textTransform: 'uppercase'
  }}>
    <span style={{
      width: 6, height: 6, borderRadius: '50%',
      background: active ? '#22c55e' : '#ef4444',
      display: 'inline-block'
    }} />
    {active ? 'Active' : 'Inactive'}
  </span>
);

// ── First Login Warning ───────────────────────────────────────
const FirstLoginBadge = ({ isFirstLogin }) =>
  isFirstLogin ? (
    <span style={{
      padding: '3px 10px', borderRadius: 999, fontSize: 11,
      fontWeight: 700, background: '#fffbeb', color: '#b45309',
      letterSpacing: '0.03em', textTransform: 'uppercase'
    }}>⏳ Pending</span>
  ) : (
    <span style={{
      padding: '3px 10px', borderRadius: 999, fontSize: 11,
      fontWeight: 700, background: '#f0fdf4', color: '#15803d',
      letterSpacing: '0.03em', textTransform: 'uppercase'
    }}>✅ Done</span>
  );

// ── Skeleton row ─────────────────────────────────────────────
const SkeletonRow = () => (
  <tr>
    {[44, 160, 180, 120, 90, 90, 90].map((w, i) => (
      <td key={i} style={{ padding: '16px' }}>
        <div style={{
          height: 14, width: w, borderRadius: 6,
          background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.4s infinite',
        }} />
      </td>
    ))}
  </tr>
);

// ── Main Component ────────────────────────────────────────────
const EmployeeListPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [employees, setEmployees]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [filterRole, setFilterRole] = useState('All');

  // ── Fetch employees ─────────────────────────────────────────
  const fetchEmployees = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/users');
      setEmployees(res.data.data.users);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load employees.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEmployees(); }, []);

  // ── Derived filter values ───────────────────────────────────
  const departments = ['All', ...new Set(employees.map(e => e.department).filter(Boolean))];

  const filtered = employees.filter(emp => {
    const q = search.toLowerCase();
    const matchSearch =
      emp.name.toLowerCase().includes(q) ||
      emp.email.toLowerCase().includes(q) ||
      (emp.department || '').toLowerCase().includes(q);
    const matchDept = filterDept === 'All' || emp.department === filterDept;
    const matchRole = filterRole === 'All' || emp.role === filterRole;
    return matchSearch && matchDept && matchRole;
  });

  // ── Stat counters ───────────────────────────────────────────
  const totalCount    = employees.length;
  const adminCount    = employees.filter(e => e.role === 'ADMIN').length;
  const pendingCount  = employees.filter(e => e.isFirstLogin).length;
  const activeCount   = employees.filter(e => e.isActive).length;

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <div className="dashboard-layout">
      {/* ── Shimmer animation ─────────────────────────────────── */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* ── Topbar ─────────────────────────────────────────────── */}
      <header className="topbar">
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          fontWeight: 800, fontSize: 18, color: '#1d4ed8', letterSpacing: '-0.3px'
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: '#2563eb',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 12, fontWeight: 800
          }}>AF</div>
          AssetFlow
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="avatar">{initials}</div>
          <div style={{ lineHeight: 1.3 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{user?.name}</p>
            <p style={{ fontSize: 12, color: '#94a3b8' }}>{user?.email}</p>
          </div>
          <span style={{
            padding: '3px 10px', borderRadius: 999, fontSize: 12,
            fontWeight: 600, background: '#eff6ff', color: '#1d4ed8'
          }}>Administrator</span>
          <button onClick={() => { logout(); navigate('/login'); }}
            className="btn btn-ghost btn-sm" style={{ width: 'auto', gap: 6 }}>
            Sign out
          </button>
        </div>
      </header>

      {/* ── Sidebar ────────────────────────────────────────────── */}
      <aside className="sidebar">
        <p style={{
          fontSize: 11, fontWeight: 700, color: '#94a3b8',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          padding: '0 8px 10px', marginBottom: 4
        }}>Navigation</p>
        {[
          { icon: '🏠', label: 'Dashboard',        path: '/dashboard' },
          { icon: '📦', label: 'Assets',            path: '/assets' },
          { icon: '🔄', label: 'Allocation',        path: '/allocation' },
          { icon: '📅', label: 'Bookings',          path: '/bookings' },
          { icon: '🛠️', label: 'Maintenance',       path: '/maintenance' },
          { icon: '🔍', label: 'Audit',             path: '/audit' },
          { icon: '📊', label: 'Reports',           path: '/reports' },
          { icon: '🔔', label: 'Notifications',     path: '/notifications' },
          { icon: '⚙️', label: 'Org Setup',         path: '/org-setup' },
          { icon: '👥', label: 'Employees',         path: '/employees', active: true },
        ].map((item, i) => (
          <div key={i} className={`nav-item ${item.active ? 'active' : ''}`}
            onClick={() => navigate(item.path)}>
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            {item.label}
          </div>
        ))}
      </aside>

      {/* ── Main Content ───────────────────────────────────────── */}
      <main className="main-content">

        {/* Header row */}
        <div className="fade-in" style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <button onClick={() => navigate('/dashboard')}
                className="btn btn-ghost btn-sm"
                style={{ width: 'auto', padding: '6px 12px', gap: 6 }}>
                <ArrowLeftIcon /> Dashboard
              </button>
            </div>
            <h1 style={{
              fontSize: 26, fontWeight: 800, color: '#0f172a',
              letterSpacing: '-0.3px', marginBottom: 4
            }}>👥 Employee Directory</h1>
            <p style={{ fontSize: 14, color: '#64748b' }}>
              Manage all user accounts in AssetFlow
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={fetchEmployees}
              className="btn btn-ghost btn-sm"
              style={{ width: 'auto', gap: 6, padding: '9px 16px' }}>
              <RefreshIcon /> Refresh
            </button>
            <button onClick={() => navigate('/users/create')}
              className="btn btn-primary"
              style={{ width: 'auto', gap: 6, padding: '9px 20px', fontSize: 14 }}>
              <PlusIcon /> Add Employee
            </button>
          </div>
        </div>

        {/* ── Stat Cards ─────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 16, marginBottom: 24
        }}>
          {[
            { label: 'Total Users',      value: totalCount,   color: '#2563eb', bg: '#eff6ff', icon: '👥' },
            { label: 'Admins',           value: adminCount,   color: '#7c3aed', bg: '#f5f3ff', icon: '🔐' },
            { label: 'Active',           value: activeCount,  color: '#15803d', bg: '#f0fdf4', icon: '✅' },
            { label: 'Pending Setup',    value: pendingCount, color: '#b45309', bg: '#fffbeb', icon: '⏳' },
          ].map((s, i) => (
            <div key={i} className={`card fade-in fade-in-delay-${i + 1}`}
              style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: s.bg, display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0
              }}>{s.icon}</div>
              <div>
                <p style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: 12, color: '#64748b', marginTop: 3, fontWeight: 500 }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filters ────────────────────────────────────────── */}
        <div className="card fade-in" style={{ marginBottom: 20 }}>
          <div style={{
            padding: '16px 20px', display: 'flex',
            gap: 12, flexWrap: 'wrap', alignItems: 'center'
          }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <div style={{
                position: 'absolute', left: 12, top: '50%',
                transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none'
              }}><SearchIcon /></div>
              <input
                type="text"
                placeholder="Search by name, email, department..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="form-input"
                style={{ paddingLeft: 38, fontSize: 13 }}
              />
            </div>

            {/* Department filter */}
            <select
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              className="form-input"
              style={{ width: 'auto', fontSize: 13, cursor: 'pointer', paddingRight: 32 }}
            >
              {departments.map(d => <option key={d}>{d}</option>)}
            </select>

            {/* Role filter */}
            <select
              value={filterRole}
              onChange={e => setFilterRole(e.target.value)}
              className="form-input"
              style={{ width: 'auto', fontSize: 13, cursor: 'pointer', paddingRight: 32 }}
            >
              <option>All</option>
              <option value="ADMIN">Admin</option>
              <option value="EMPLOYEE">Employee</option>
            </select>

            {/* Result count */}
            <span style={{ fontSize: 13, color: '#94a3b8', whiteSpace: 'nowrap', fontWeight: 500 }}>
              {filtered.length} of {totalCount} users
            </span>
          </div>
        </div>

        {/* ── Table ──────────────────────────────────────────── */}
        <div className="card fade-in">
          {error && (
            <div className="alert alert-error" style={{ margin: 20 }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Employee</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Role</th>
                  <th>Password Setup</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  // Skeleton rows
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '48px 24px' }}>
                      <div style={{ color: '#94a3b8' }}>
                        <UsersIcon />
                        <p style={{ marginTop: 12, fontSize: 15, fontWeight: 600, color: '#64748b' }}>
                          {search || filterDept !== 'All' || filterRole !== 'All'
                            ? 'No users match your filters'
                            : 'No employees found'}
                        </p>
                        <p style={{ fontSize: 13, marginTop: 4 }}>
                          {search || filterDept !== 'All' || filterRole !== 'All'
                            ? 'Try adjusting your search or filters'
                            : 'Click "Add Employee" to create the first employee'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((emp, idx) => (
                    <tr key={emp.id}>
                      <td style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>
                        {idx + 1}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: '50%',
                            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                            color: 'white', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: 12, fontWeight: 700,
                            flexShrink: 0, letterSpacing: '0.03em'
                          }}>
                            {getInitials(emp.name)}
                          </div>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                              {emp.name}
                            </p>
                            {emp.phone && (
                              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                                📞 {emp.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 13, color: '#475569' }}>{emp.email}</td>
                      <td>
                        {emp.department ? (
                          <span style={{
                            padding: '3px 10px', borderRadius: 999, fontSize: 12,
                            fontWeight: 600, background: '#f1f5f9', color: '#475569'
                          }}>{emp.department}</span>
                        ) : (
                          <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td><RoleBadge role={emp.role} /></td>
                      <td><FirstLoginBadge isFirstLogin={emp.isFirstLogin} /></td>
                      <td><StatusBadge active={emp.isActive} /></td>
                      <td style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        {new Date(emp.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {!loading && filtered.length > 0 && (
            <div style={{
              padding: '12px 20px', borderTop: '1px solid #f1f5f9',
              fontSize: 12, color: '#94a3b8', display: 'flex',
              justifyContent: 'space-between', alignItems: 'center'
            }}>
              <span>Showing {filtered.length} of {totalCount} users</span>
              <span>Last refreshed: {new Date().toLocaleTimeString('en-IN')}</span>
            </div>
          )}
        </div>

      </main>
    </div>
  );
};

export default EmployeeListPage;
