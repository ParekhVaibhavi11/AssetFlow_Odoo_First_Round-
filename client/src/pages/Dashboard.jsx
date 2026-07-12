import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { fetchApi } from '../utils/api';
import { 
  Box, 
  CheckCircle, 
  UserCheck, 
  Wrench, 
  Calendar, 
  Clock, 
  AlertTriangle 
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [statsData, activityData] = await Promise.all([
          fetchApi('/dashboard/stats'),
          fetchApi('/dashboard/activity')
        ]);
        setStats(statsData);
        setActivities(activityData);
      } catch (err) {
        console.error('Error loading dashboard:', err.message);
        setError('Could not connect to backend server. Make sure the database and API are online.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Format today's date to match mockup: "Sunday, 12 July 2026 • Here's your asset management overview."
  const formatDate = () => {
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const dateStr = new Date().toLocaleDateString('en-US', options);
    // Replace comma after year with a dot
    return `${dateStr} • Here's your asset management overview.`;
  };

  // Helper to format time relative to now (e.g. "2m ago", "1h ago")
  const formatRelativeTime = (dateInput) => {
    const now = new Date();
    const past = new Date(dateInput);
    const diffMs = now - past;
    const diffMins = Math.max(1, Math.floor(diffMs / 60000));
    
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Helper to map activity action type to displayable text matching mockup
  const renderActivityText = (item) => {
    const tagSpan = item.asset_tag ? ` ${item.asset_tag}` : '';
    
    switch (item.action) {
      case 'Registration':
        return `New asset registered: ${item.asset_name}${tagSpan}`;
      case 'Allocation':
        return `Asset ${item.asset_name}${tagSpan} allocated to ${item.employee_name || 'employee'}`;
      case 'Return':
        return `Asset ${item.asset_name}${tagSpan} returned to inventory`;
      case 'Transfer':
        return `${item.notes || `Asset ${item.asset_name}${tagSpan} transferred`}`;
      case 'Maintenance Request':
        return `Maintenance ticket raised for ${item.asset_name}${tagSpan}`;
      case 'Maintenance Resolved':
        return `Projector ${item.asset_tag} — maintenance resolved`;
      default:
        // Parse notes if notes contain specific details, or default to general text
        if (item.notes) return item.notes;
        return `${item.action} logged for ${item.asset_name || 'asset'}${tagSpan}`;
    }
  };

  // Helper to resolve icon background color for activity items
  const getActivityIconStyles = (action) => {
    switch (action) {
      case 'Allocation':
        return { bg: 'var(--color-allocated-bg)', color: 'var(--primary)', icon: UserCheck };
      case 'Return':
        return { bg: 'var(--color-available-bg)', color: 'var(--color-available)', icon: CheckCircle };
      case 'Maintenance Request':
      case 'Maintenance Status':
        return { bg: 'var(--color-maintenance-bg)', color: 'var(--color-maintenance)', icon: Wrench };
      case 'Maintenance Resolved':
        return { bg: 'var(--color-available-bg)', color: 'var(--color-available)', icon: CheckCircle };
      case 'Resource Booking':
        return { bg: 'var(--color-booking-bg)', color: 'var(--color-booking)', icon: Calendar };
      default:
        return { bg: 'var(--primary-light)', color: 'var(--primary)', icon: Box };
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-secondary)' }}>
        <p>Loading asset management metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert-banner" style={{ background: 'var(--color-overdue-bg)', color: 'var(--color-overdue)', borderColor: 'hsl(354, 70%, 90%)' }}>
        <AlertTriangle size={20} />
        <div>
          <strong>Connection Error:</strong> {error}
        </div>
      </div>
    );
  }

  // Fallback default stats if DB is completely empty
  const displayStats = stats || {
    totalAssets: 0,
    available: 0,
    allocated: 0,
    underMaintenance: 0,
    activeBookings: 0,
    overdueReturns: 0
  };

  return (
    <>
      {/* 1. Header Greeting */}
      <div className="greeting-header">
        <h1 className="greeting-title">
          Good morning, {user?.name?.split(' ')[0] || 'falguni'} 👋
        </h1>
        <p className="greeting-subtitle">{formatDate()}</p>
      </div>

      {/* 2. Metrics Cards Row */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <div className="kpi-icon-wrapper kpi-icon-total">
              <Box size={20} />
            </div>
          </div>
          <span className="kpi-value">{displayStats.totalAssets}</span>
          <span className="kpi-title">Total Assets</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <div className="kpi-icon-wrapper kpi-icon-available">
              <CheckCircle size={20} />
            </div>
          </div>
          <span className="kpi-value">{displayStats.available}</span>
          <span className="kpi-title">Available</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <div className="kpi-icon-wrapper kpi-icon-allocated">
              <UserCheck size={20} />
            </div>
          </div>
          <span className="kpi-value">{displayStats.allocated}</span>
          <span className="kpi-title">Allocated</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <div className="kpi-icon-wrapper kpi-icon-maintenance">
              <Wrench size={20} />
            </div>
          </div>
          <span className="kpi-value">{displayStats.underMaintenance}</span>
          <span className="kpi-title">Under Maintenance</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <div className="kpi-icon-wrapper kpi-icon-bookings">
              <Calendar size={20} />
            </div>
          </div>
          <span className="kpi-value">{displayStats.activeBookings}</span>
          <span className="kpi-title">Active Bookings</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <div className="kpi-icon-wrapper kpi-icon-overdue">
              <Clock size={20} />
            </div>
          </div>
          <span className="kpi-value">{displayStats.overdueReturns}</span>
          <span className="kpi-title">Overdue Returns</span>
        </div>
      </div>

      {/* 3. Alert Banner for Overdue Returns */}
      {displayStats.overdueReturns > 0 && (
        <div className="alert-banner">
          <Clock size={16} />
          <span>{displayStats.overdueReturns} assets overdue for return — flagged for follow-up</span>
        </div>
      )}

      {/* 4. Quick Actions Panel */}
      <div className="section-panel">
        <h3 className="panel-title">Quick Actions</h3>
        <div className="actions-row">
          <button className="btn btn-primary" onClick={() => navigate('/assets', { state: { openRegister: true } })}>+ Register Asset</button>
          <button className="btn btn-outline" onClick={() => navigate('/bookings', { state: { openBook: true } })}>Book Resource</button>
          <button className="btn btn-outline" onClick={() => navigate('/maintenance', { state: { openRequest: true } })}>Raise Request</button>
          <button className="btn btn-outline" onClick={() => navigate('/org-setup', { state: { activeTab: 'employees' } })}>Create Employee</button>
        </div>
      </div>

      {/* 5. Recent Activity Feed */}
      <div className="section-panel">
        <h3 className="panel-title">Recent Activity</h3>
        <div className="activity-list">
          {activities.length > 0 ? (
            activities.map((item) => {
              const styles = getActivityIconStyles(item.action);
              const ActivityIcon = styles.icon;
              return (
                <div className="activity-item" key={item.id}>
                  <div className="activity-details">
                    <div className="activity-icon-box" style={{ backgroundColor: styles.bg, color: styles.color }}>
                      <ActivityIcon size={16} />
                    </div>
                    <span className="activity-text">{renderActivityText(item)}</span>
                  </div>
                  <span className="activity-time">{formatRelativeTime(item.created_at)}</span>
                </div>
              );
            })
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No recent system activities logged.</p>
          )}
        </div>
      </div>
    </>
  );
};

export default Dashboard;
