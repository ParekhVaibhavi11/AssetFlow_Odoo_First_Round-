/**
 * pages/DashboardPage.jsx
 *
 * Admin Dashboard — premium white/blue ERP design.
 * Sections:
 *   - Topbar (logo, notifications, user profile, logout)
 *   - Sidebar (role-filtered navigation)
 *   - KPI Cards × 6
 *   - Overdue return alert banner
 *   - Recent Activity feed
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ─────────────────────────────────────────────────────────────
// Inline SVG Icons
// ─────────────────────────────────────────────────────────────
const Icon = {
  logout: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
    </svg>
  ),
  bell: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  ),
  box: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  ),
  checkCircle: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  arrowUpRight: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
    </svg>
  ),
  calendar: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  repeat: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/>
      <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
    </svg>
  ),
  tool: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
    </svg>
  ),
  alertTriangle: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  plus: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  activity: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  chevronRight: () => (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
};

// ─────────────────────────────────────────────────────────────
// Mock Data (replace with API calls in future modules)
// ─────────────────────────────────────────────────────────────
const KPI_DATA = [
  {
    id: 'available',
    label: 'Available Assets',
    value: 128,
    trend: '+4 this week',
    trendUp: true,
    icon: Icon.checkCircle,
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
  },
  {
    id: 'allocated',
    label: 'Allocated Assets',
    value: 76,
    trend: '+2 today',
    trendUp: true,
    icon: Icon.arrowUpRight,
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
  },
  {
    id: 'maintenance',
    label: 'Under Maintenance',
    value: 14,
    trend: '3 critical',
    trendUp: false,
    icon: Icon.tool,
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fecaca',
  },
  {
    id: 'bookings',
    label: 'Active Bookings',
    value: 9,
    trend: '2 ending today',
    trendUp: null,
    icon: Icon.calendar,
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
  },
  {
    id: 'transfers',
    label: 'Pending Transfers',
    value: 3,
    trend: 'Needs approval',
    trendUp: false,
    icon: Icon.repeat,
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
  },
  {
    id: 'upcoming',
    label: 'Upcoming Returns',
    value: 12,
    trend: '5 due this week',
    trendUp: null,
    icon: Icon.box,
    color: '#0891b2',
    bg: '#ecfeff',
    border: '#a5f3fc',
  },
];

const RECENT_ACTIVITY = [
  {
    id: 1,
    icon: '📦',
    iconBg: '#eff6ff',
    text: 'Laptop AF-0114 allocated to Priya Shah',
    sub: 'IT Department',
    time: '2m ago',
    type: 'allocation',
    typeBg: '#eff6ff',
    typeColor: '#2563eb',
    typeLabel: 'Allocation',
  },
  {
    id: 2,
    icon: '📅',
    iconBg: '#f5f3ff',
    text: 'Room B2 booking confirmed',
    sub: '2:00 PM – 3:00 PM today',
    time: '18m ago',
    type: 'booking',
    typeBg: '#f5f3ff',
    typeColor: '#7c3aed',
    typeLabel: 'Booking',
  },
  {
    id: 3,
    icon: '✅',
    iconBg: '#f0fdf4',
    text: 'Projector AF-0062 maintenance resolved',
    sub: 'Technician: R. Varma',
    time: '1h ago',
    type: 'maintenance',
    typeBg: '#f0fdf4',
    typeColor: '#16a34a',
    typeLabel: 'Maintenance',
  },
  {
    id: 4,
    icon: '🔄',
    iconBg: '#fffbeb',
    text: 'Transfer approved: AF-0033',
    sub: 'Engineering → Facilities',
    time: '3h ago',
    type: 'transfer',
    typeBg: '#fffbeb',
    typeColor: '#d97706',
    typeLabel: 'Transfer',
  },
  {
    id: 5,
    icon: '⚠️',
    iconBg: '#fef2f2',
    text: 'Overdue return: Van AF-0021',
    sub: 'Was due 3 days ago — Field Ops',
    time: '1d ago',
    type: 'overdue',
    typeBg: '#fef2f2',
    typeColor: '#dc2626',
    typeLabel: 'Overdue',
  },
  {
    id: 6,
    icon: '👤',
    iconBg: '#f0fdf4',
    text: 'New employee added: Sana Iqbal',
    sub: 'Field Operations (East)',
    time: '1d ago',
    type: 'user',
    typeBg: '#eff6ff',
    typeColor: '#2563eb',
    typeLabel: 'User',
  },
];

const NAV_ITEMS = [
  { icon: '🏠', label: 'Dashboard',         path: '/dashboard',    active: true },
  { icon: '⚙️', label: 'Org Setup',         path: '/org-setup' },
  { icon: '📦', label: 'Assets',            path: '/assets' },
  { icon: '🔄', label: 'Allocation',        path: '/allocation' },
  { icon: '📅', label: 'Resource Booking',  path: '/bookings' },
  { icon: '🛠️', label: 'Maintenance',       path: '/maintenance' },
  { icon: '🔍', label: 'Audit',             path: '/audit' },
  { icon: '📊', label: 'Reports',           path: '/reports' },
  { icon: '🔔', label: 'Notifications',     path: '/notifications' },
];

const ADMIN_NAV = [
  { icon: '👥', label: 'Employees',         path: '/employees' },
];

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

/** Single KPI card with icon, value, label, and trend line */
const KpiCard = ({ card, index }) => {
  const Ico = card.icon;
  return (
    <div
      className={`card fade-in fade-in-delay-${(index % 3) + 1}`}
      style={{
        padding: '22px 24px',
        border: `1.5px solid ${card.border}`,
        cursor: 'default',
        transition: 'transform 220ms ease, box-shadow 220ms ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.09)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      {/* Decorative background blob */}
      <div style={{
        position: 'absolute', top: -20, right: -20,
        width: 90, height: 90, borderRadius: '50%',
        background: card.bg, opacity: 0.7, pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: card.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: card.color, flexShrink: 0,
        }}>
          <Ico />
        </div>
        {card.trendUp !== null && (
          <div style={{
            fontSize: 11, fontWeight: 700,
            color: card.trendUp ? '#16a34a' : '#dc2626',
            background: card.trendUp ? '#f0fdf4' : '#fef2f2',
            padding: '3px 8px', borderRadius: 999,
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            {card.trendUp ? '↑' : '↓'} {card.trend}
          </div>
        )}
        {card.trendUp === null && (
          <div style={{
            fontSize: 11, fontWeight: 600, color: '#64748b',
            background: '#f1f5f9', padding: '3px 8px', borderRadius: 999,
          }}>
            {card.trend}
          </div>
        )}
      </div>

      <p style={{
        fontSize: 34, fontWeight: 800, color: '#0f172a',
        letterSpacing: '-1px', lineHeight: 1, marginBottom: 6,
      }}>
        {card.value}
      </p>
      <p style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
        {card.label}
      </p>

      {/* Bottom color accent bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 3, background: card.color, opacity: 0.25,
      }} />
    </div>
  );
};

/** Sidebar navigation item */
const NavItem = ({ item, onClick }) => (
  <div
    className={`nav-item ${item.active ? 'active' : ''}`}
    onClick={onClick}
    style={{ marginBottom: 2 }}
  >
    <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{item.icon}</span>
    <span style={{ fontSize: 13.5 }}>{item.label}</span>
    {item.active && (
      <div style={{ marginLeft: 'auto' }}>
        <Icon.chevronRight />
      </div>
    )}
  </div>
);

/** Activity feed item */
const ActivityItem = ({ item, isLast }) => (
  <div style={{
    display: 'flex', gap: 14, padding: '14px 24px',
    borderBottom: isLast ? 'none' : '1px solid #f8fafc',
    transition: 'background 150ms ease',
    cursor: 'default',
  }}
    onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; }}
    onMouseLeave={e => { e.currentTarget.style.background = ''; }}
  >
    {/* Icon */}
    <div style={{
      width: 38, height: 38, borderRadius: 10,
      background: item.iconBg, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 17,
    }}>
      {item.icon}
    </div>

    {/* Text */}
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 2, lineHeight: 1.4 }}>
        {item.text}
      </p>
      <p style={{ fontSize: 12, color: '#94a3b8' }}>{item.sub}</p>
    </div>

    {/* Right side: type badge + time */}
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
      <span style={{
        fontSize: 10, fontWeight: 700, padding: '2px 8px',
        borderRadius: 999, background: item.typeBg,
        color: item.typeColor, letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}>
        {item.typeLabel}
      </span>
      <span style={{ fontSize: 11, color: '#94a3b8' }}>{item.time}</span>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// Main Dashboard Component
// ─────────────────────────────────────────────────────────────
const DashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [notifOpen, setNotifOpen]   = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    navigate('/login', { replace: true });
  };

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="dashboard-layout">

      {/* ════════════════════════════════════════════════
          TOPBAR
      ════════════════════════════════════════════════ */}
      <header className="topbar">
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 13, fontWeight: 800,
            boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
          }}>AF</div>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#1d4ed8', letterSpacing: '-0.4px' }}>
            AssetFlow
          </span>
        </div>

        {/* Breadcrumb */}
        <div style={{
          marginLeft: 24, display: 'flex', alignItems: 'center',
          gap: 6, fontSize: 13, color: '#94a3b8',
        }}>
          <span>Home</span>
          <Icon.chevronRight />
          <span style={{ color: '#2563eb', fontWeight: 600 }}>Dashboard</span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setNotifOpen(p => !p)}
            style={{
              width: 38, height: 38, borderRadius: 10,
              border: '1.5px solid #e2e8f0', background: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#64748b', cursor: 'pointer',
              transition: 'all 150ms ease', position: 'relative',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#2563eb'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#64748b'; }}
          >
            <Icon.bell />
            {/* Unread dot */}
            <span style={{
              position: 'absolute', top: 6, right: 6,
              width: 8, height: 8, borderRadius: '50%',
              background: '#ef4444', border: '2px solid white',
            }} />
          </button>

          {/* Notification dropdown */}
          {notifOpen && (
            <div style={{
              position: 'absolute', top: 46, right: 0, width: 320,
              background: 'white', borderRadius: 14, boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
              border: '1px solid #e2e8f0', zIndex: 100, overflow: 'hidden',
            }}>
              <div style={{
                padding: '14px 18px', borderBottom: '1px solid #f1f5f9',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Notifications</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, background: '#eff6ff',
                  color: '#2563eb', padding: '2px 8px', borderRadius: 999
                }}>3 new</span>
              </div>
              {RECENT_ACTIVITY.slice(0, 3).map((item, i) => (
                <div key={i} style={{
                  padding: '12px 18px', borderBottom: '1px solid #f8fafc',
                  display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 12
                }}>
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  <div>
                    <p style={{ color: '#334155', fontWeight: 600 }}>{item.text}</p>
                    <p style={{ color: '#94a3b8', marginTop: 2 }}>{item.time}</p>
                  </div>
                </div>
              ))}
              <div style={{ padding: '10px 18px', textAlign: 'center' }}>
                <span
                  onClick={() => { setNotifOpen(false); navigate('/notifications'); }}
                  className="text-link" style={{ fontSize: 13 }}
                >View all notifications →</span>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 28, background: '#e2e8f0', margin: '0 4px' }} />

        {/* User profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="avatar">{initials}</div>
          <div style={{ lineHeight: 1.35 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{user?.name}</p>
            <p style={{ fontSize: 11, color: '#94a3b8' }}>Administrator</p>
          </div>
          <button
            id="btn-logout"
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8, fontSize: 13,
              fontWeight: 600, color: '#64748b', background: 'white',
              border: '1.5px solid #e2e8f0', cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#fecaca'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
          >
            {loggingOut
              ? <div className="spinner spinner-blue" style={{ width: 14, height: 14 }} />
              : <Icon.logout />
            }
            {loggingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      </header>

      {/* ════════════════════════════════════════════════
          SIDEBAR
      ════════════════════════════════════════════════ */}
      <aside className="sidebar">
        {/* Main nav */}
        <p style={{
          fontSize: 10.5, fontWeight: 700, color: '#94a3b8',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          padding: '0 10px 8px', marginBottom: 4,
        }}>Main Menu</p>

        {NAV_ITEMS.map((item, i) => (
          <NavItem key={i} item={item} onClick={() => navigate(item.path)} />
        ))}

        {/* Admin section */}
        <div style={{ height: 1, background: '#f1f5f9', margin: '16px 8px' }} />
        <p style={{
          fontSize: 10.5, fontWeight: 700, color: '#94a3b8',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          padding: '0 10px 8px',
        }}>Admin</p>
        {ADMIN_NAV.map((item, i) => (
          <NavItem key={i} item={item} onClick={() => navigate(item.path)} />
        ))}

        {/* Bottom user card */}
        <div style={{ marginTop: 'auto', paddingTop: 24 }}>
          <div style={{
            background: 'linear-gradient(135deg, #eff6ff, #e0eafc)',
            borderRadius: 12, padding: '14px',
            border: '1px solid #bfdbfe',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                {initials}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
                <p style={{ fontSize: 10, color: '#60a5fa' }}>Administrator</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ════════════════════════════════════════════════
          MAIN CONTENT
      ════════════════════════════════════════════════ */}
      <main className="main-content" onClick={() => notifOpen && setNotifOpen(false)}>

        {/* ── Welcome Header ─────────────────────────────── */}
        <div className="fade-in" style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{
                fontSize: 26, fontWeight: 800, color: '#0f172a',
                letterSpacing: '-0.4px', marginBottom: 5,
              }}>
                {greeting()}, {user?.name?.split(' ')[0]} 👋
              </h1>
              <p style={{ fontSize: 13.5, color: '#64748b' }}>
                📅 {today} &nbsp;·&nbsp; Here's your asset management overview for today.
              </p>
            </div>
            {/* Quick add button */}
            <button
              onClick={() => navigate('/users/create')}
              className="btn btn-primary"
              style={{ width: 'auto', gap: 8, padding: '10px 20px', fontSize: 13 }}
            >
              <Icon.plus /> Add Employee
            </button>
          </div>
        </div>

        {/* ── KPI Cards Grid ─────────────────────────────── */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 18,
          marginBottom: 24,
        }}>
          {KPI_DATA.map((card, i) => (
            <KpiCard key={card.id} card={card} index={i} />
          ))}
        </section>

        {/* ── Overdue Return Alert ────────────────────────── */}
        <div className="fade-in" style={{
          background: 'linear-gradient(135deg, #fef2f2 0%, #fff5f5 100%)',
          border: '1.5px solid #fecaca',
          borderLeft: '4px solid #ef4444',
          borderRadius: 12,
          padding: '14px 20px',
          display: 'flex', alignItems: 'center', gap: 14,
          marginBottom: 24,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: '#fef2f2', border: '1px solid #fecaca',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#dc2626', flexShrink: 0,
          }}>
            <Icon.alertTriangle />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#991b1b', marginBottom: 2 }}>
              3 assets overdue for return — flagged for follow-up
            </p>
            <p style={{ fontSize: 12, color: '#b91c1c', opacity: 0.8 }}>
              Van AF-0021 (3 days) · Drill AF-0055 (5 days) · Camera AF-0301 (1 day)
            </p>
          </div>
          <button
            onClick={() => navigate('/allocation')}
            style={{
              padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              background: '#dc2626', color: 'white', border: 'none', cursor: 'pointer',
              whiteSpace: 'nowrap', transition: 'background 150ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#b91c1c'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#dc2626'; }}
          >
            View All →
          </button>
        </div>

        {/* ── Bottom grid: Quick Actions + Recent Activity ─ */}
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>

          {/* Quick Actions panel */}
          <div>
            <div className="card fade-in" style={{ padding: '20px' }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>
                ⚡ Quick Actions
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: '+ Register Asset', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', path: '/assets' },
                  { label: '📅 Book Resource',  color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', path: '/bookings' },
                  { label: '🛠️ Raise Request',  color: '#d97706', bg: '#fffbeb', border: '#fde68a', path: '/maintenance' },
                  { label: '👥 Add Employee',   color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', path: '/users/create' },
                  { label: '🔍 Start Audit',    color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', path: '/audit' },
                ].map((a, i) => (
                  <button
                    key={i}
                    onClick={() => navigate(a.path)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '11px 14px', borderRadius: 10, fontSize: 13,
                      fontWeight: 600, color: a.color, background: a.bg,
                      border: `1.5px solid ${a.border}`, cursor: 'pointer',
                      transition: 'all 150ms ease', textAlign: 'left',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mini stat summary */}
            <div className="card fade-in" style={{ padding: '20px', marginTop: 18 }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 14 }}>
                📊 Maintenance Summary
              </h2>
              {[
                { label: 'Pending Approval', value: 4,  color: '#f59e0b' },
                { label: 'In Progress',      value: 6,  color: '#3b82f6' },
                { label: 'Resolved Today',   value: 2,  color: '#22c55e' },
              ].map((s, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                    <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>{s.label}</span>
                  </div>
                  <span style={{
                    fontSize: 14, fontWeight: 800, color: '#0f172a',
                    background: '#f8fafc', padding: '2px 10px', borderRadius: 999
                  }}>{s.value}</span>
                </div>
              ))}
              <button
                onClick={() => navigate('/maintenance')}
                style={{
                  width: '100%', padding: '9px', borderRadius: 8,
                  fontSize: 12, fontWeight: 700, color: '#2563eb',
                  background: '#eff6ff', border: '1px solid #bfdbfe',
                  cursor: 'pointer', marginTop: 4, transition: 'all 150ms ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#dbeafe'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#eff6ff'; }}
              >
                Open Maintenance Board →
              </button>
            </div>
          </div>

          {/* Recent Activity feed */}
          <div className="card fade-in" style={{ overflow: 'hidden' }}>
            <div style={{
              padding: '18px 24px', borderBottom: '1px solid #f1f5f9',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: '#eff6ff', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: '#2563eb',
                }}>
                  <Icon.activity />
                </div>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Recent Activity</h2>
                  <p style={{ fontSize: 11, color: '#94a3b8' }}>Last 24 hours</p>
                </div>
              </div>
              <span
                onClick={() => navigate('/notifications')}
                className="text-link"
                style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                View all <Icon.chevronRight />
              </span>
            </div>

            {RECENT_ACTIVITY.map((item, i) => (
              <ActivityItem key={item.id} item={item} isLast={i === RECENT_ACTIVITY.length - 1} />
            ))}
          </div>
        </div>

      </main>
    </div>
  );
};

export default DashboardPage;
