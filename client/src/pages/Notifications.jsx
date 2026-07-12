import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { fetchApi } from '../utils/api';
import { 
  Bell, 
  History, 
  Check, 
  Search, 
  AlertCircle, 
  Trash2,
  Clock,
  User,
  Activity
} from 'lucide-react';

const Notifications = () => {
  const { user } = useContext(AuthContext);
  const isAdmin = user && user.role === 'Admin';

  // Data States
  const [notifications, setNotifications] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Tab State
  const [activeTab, setActiveTab] = useState('notifications'); // 'notifications', 'audit'

  // Audit Logs Local Search
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'notifications') {
        const data = await fetchApi('/notifications');
        setNotifications(data);
      } else if (activeTab === 'audit' && isAdmin) {
        const data = await fetchApi('/notifications/audit-logs');
        setAuditLogs(data);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch notifications or log registers.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    setError('');
    try {
      await fetchApi(`/notifications/${id}/read`, { method: 'PUT' });
      // Update local state to show it read
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error(err);
      setError('Failed to update notification status.');
    }
  };

  const handleMarkAllRead = async () => {
    setError('');
    setSuccessMsg('');
    try {
      await fetchApi('/notifications/read-all', { method: 'PUT' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setSuccessMsg('All notifications marked as read.');
    } catch (err) {
      console.error(err);
      setError('Failed to update notifications.');
    }
  };

  // Filter audit logs locally
  const filteredLogs = auditLogs.filter(log => {
    const query = searchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(query) ||
      (log.details && log.details.toLowerCase().includes(query)) ||
      (log.employee_name && log.employee_name.toLowerCase().includes(query)) ||
      (log.employee_email && log.employee_email.toLowerCase().includes(query))
    );
  });

  return (
    <div className="section-panel" style={{ gap: '20px' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="panel-title" style={{ fontSize: '22px' }}>Alerts & Telemetry Logs</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Check your system notification warnings or query the complete administrative event trails.
          </p>
        </div>
      </div>

      {error && (
        <div className="alert-banner" style={{ background: 'var(--color-overdue-bg)', color: 'var(--color-overdue)' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="alert-banner" style={{ background: 'var(--color-available-bg)', color: 'var(--color-available)' }}>
          <Check size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tabs Menu navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '16px' }}>
        <button 
          className={`btn-signout ${activeTab === 'notifications' ? 'btn-primary' : ''}`}
          style={{ borderBottom: activeTab === 'notifications' ? '2px solid var(--primary)' : 'none', border: 'none', background: 'none', borderRadius: 0, paddingBottom: '10px', color: activeTab === 'notifications' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 600 }}
          onClick={() => setActiveTab('notifications')}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Bell size={14} />
            <span>My Notifications ({notifications.filter(n => !n.is_read).length})</span>
          </span>
        </button>
        
        {isAdmin && (
          <button 
            className={`btn-signout ${activeTab === 'audit' ? 'btn-primary' : ''}`}
            style={{ borderBottom: activeTab === 'audit' ? '2px solid var(--primary)' : 'none', border: 'none', background: 'none', borderRadius: 0, paddingBottom: '10px', color: activeTab === 'audit' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 600 }}
            onClick={() => setActiveTab('audit')}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <History size={14} />
              <span>System Audit Trail (Admin Only)</span>
            </span>
          </button>
        )}
      </div>

      {/* TAB CONTENTS */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading log feeds...
        </div>
      ) : (
        <>
          {/* Tab 1: Notifications Inbox */}
          {activeTab === 'notifications' && (
            <div>
              {notifications.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                  <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={handleMarkAllRead}>
                    <Check size={13} />
                    <span>Mark All as Read</span>
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                    <Bell size={36} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
                    <p>Your notification inbox is empty.</p>
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div 
                      key={notif.id}
                      style={{
                        padding: '16px',
                        background: 'var(--bg-card)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        position: 'relative',
                        opacity: notif.is_read ? 0.7 : 1,
                        transition: 'all 0.2s ease',
                        borderLeft: notif.is_read ? '1px solid var(--border-color)' : '4px solid var(--primary)'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingRight: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{notif.title}</strong>
                          {!notif.is_read && (
                            <span style={{ width: '8px', height: '8px', backgroundColor: 'var(--primary)', borderRadius: '50%' }}></span>
                          )}
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{notif.message}</p>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                          <Clock size={11} />
                          <span>{new Date(notif.created_at).toLocaleString()}</span>
                        </span>
                      </div>

                      {!notif.is_read && (
                        <button 
                          className="btn-signout"
                          style={{ padding: '6px', color: 'var(--primary)', borderColor: 'transparent', background: 'transparent' }}
                          title="Mark as Read"
                          onClick={() => handleMarkAsRead(notif.id)}
                        >
                          <Check size={16} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab 2: System Audit logs */}
          {activeTab === 'audit' && isAdmin && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Search filter input */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ position: 'relative', maxWidth: '350px' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '36px' }}
                    placeholder="Search logs by action, details, user..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>

              {/* Logs table */}
              <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)' }}>
                {filteredLogs.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No audit logs matching search queries.
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Action Log</th>
                        <th>User Actor</th>
                        <th>Event Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map(log => (
                        <tr key={log.id}>
                          <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td>
                            <span 
                              className="badge" 
                              style={{ 
                                backgroundColor: log.action.includes('REJECT') || log.action.includes('CANCEL') || log.action.includes('DEACTIVATE') ? 'var(--color-overdue-bg)' : log.action.includes('APPROVE') || log.action.includes('ALLOCATE') || log.action.includes('RESOLVE') ? 'var(--color-available-bg)' : 'var(--bg-primary)',
                                color: log.action.includes('REJECT') || log.action.includes('CANCEL') || log.action.includes('DEACTIVATE') ? 'var(--color-overdue)' : log.action.includes('APPROVE') || log.action.includes('ALLOCATE') || log.action.includes('RESOLVE') ? 'var(--color-available)' : 'var(--text-primary)',
                                fontSize: '11px',
                                padding: '2px 8px',
                                fontWeight: 600
                              }}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 500 }}>{log.employee_name || 'System'}</div>
                            {log.employee_email && (
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{log.employee_email}</span>
                            )}
                          </td>
                          <td style={{ fontSize: '13px', whiteSpace: 'normal', wordBreak: 'break-word', maxWidth: '300px' }}>
                            {log.details}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Notifications;
