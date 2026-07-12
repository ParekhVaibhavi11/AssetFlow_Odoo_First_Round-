import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { fetchApi } from '../utils/api';
import { 
  BarChart2, 
  TrendingUp, 
  Wrench, 
  PieChart, 
  Calendar,
  AlertTriangle,
  Download
} from 'lucide-react';

const Reports = () => {
  const { user } = useContext(AuthContext);
  const isAuthorized = user && ['Admin', 'Asset Manager'].includes(user.role);

  // Data States
  const [utilization, setUtilization] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthorized) {
      loadReportsData();
    } else {
      setLoading(false);
    }
  }, [isAuthorized]);

  const loadReportsData = async () => {
    setLoading(true);
    setError('');
    try {
      const [utilData, maintData, deptData, heatmapData] = await Promise.all([
        fetchApi('/analytics/utilization'),
        fetchApi('/analytics/maintenance'),
        fetchApi('/analytics/departments'),
        fetchApi('/analytics/booking-heatmap')
      ]);

      setUtilization(utilData);
      setMaintenance(maintData);
      setDepartments(deptData);
      setHeatmap(heatmapData);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch analytics metrics.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    // Generate simple exportable CSV data
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'AssetFlow Inventory Analytics Summary Report\r\n\r\n';
    
    // Utilization
    csvContent += 'CATEGORY UTILIZATION STATUS\r\n';
    csvContent += 'Category,Total,Available,Allocated,Under Maintenance,Inactive\r\n';
    utilization.forEach(row => {
      csvContent += `"${row.category_name}",${row.total_count},${row.available_count},${row.allocated_count},${row.maintenance_count},${row.inactive_count}\r\n`;
    });
    csvContent += '\r\n';

    // Department Value
    csvContent += 'DEPARTMENT ASSETS VALUATION\r\n';
    csvContent += 'Department,Allocated Assets,Valuation ($)\r\n';
    departments.forEach(row => {
      csvContent += `"${row.department_name}",${row.allocated_count},${row.total_value || 0}\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'assetflow_analytics_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAuthorized) {
    return (
      <div className="section-panel" style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-card)' }}>
        <AlertTriangle size={48} style={{ color: 'var(--color-overdue)', marginBottom: '16px' }} />
        <h3>Access Denied</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
          Reports and Inventory Analytics dashboard are restricted to Administrators and Asset Managers.
        </p>
      </div>
    );
  }

  // Find max value helper to scale CSS Bar charts
  const getMaxTotalAssets = () => {
    if (utilization.length === 0) return 1;
    return Math.max(...utilization.map(u => parseInt(u.total_count)));
  };

  const getMaxDeptAllocations = () => {
    if (departments.length === 0) return 1;
    return Math.max(...departments.map(d => parseInt(d.allocated_count)));
  };

  const getHeatmapBookingCount = (hour) => {
    const record = heatmap.find(h => parseInt(h.booking_hour) === hour);
    return record ? parseInt(record.booking_count) : 0;
  };

  const getMaxHeatmapBooking = () => {
    if (heatmap.length === 0) return 1;
    return Math.max(...heatmap.map(h => parseInt(h.booking_count)));
  };

  return (
    <div className="section-panel" style={{ gap: '24px' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="panel-title" style={{ fontSize: '22px' }}>Inventory Reports & Analytics</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Actionable operational snapshots detailing allocation values, maintenance frequencies, and peak usage periods.
          </p>
        </div>
        
        {!loading && (
          <button className="btn btn-outline" onClick={handleExportCSV}>
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        )}
      </div>

      {error && (
        <div className="alert-banner" style={{ background: 'var(--color-overdue-bg)', color: 'var(--color-overdue)' }}>
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Compiling analytics metrics database queries...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* SECTION 1: Asset Utilization & Department Valuation */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            
            {/* Panel Left: Category Utilization (Visual CSS segment bars) */}
            <div className="section-panel" style={{ background: 'var(--bg-card)', padding: '20px' }}>
              <h3 style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={16} style={{ color: 'var(--primary)' }} />
                <span>Asset Utilization by Category</span>
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
                {utilization.map(cat => {
                  const maxVal = getMaxTotalAssets();
                  const total = parseInt(cat.total_count);
                  
                  // Percentage calculations
                  const allocatedPct = Math.round((parseInt(cat.allocated_count) / total) * 100) || 0;
                  const availablePct = Math.round((parseInt(cat.available_count) / total) * 100) || 0;
                  const maintenancePct = Math.round((parseInt(cat.maintenance_count) / total) * 100) || 0;
                  const inactivePct = Math.round((parseInt(cat.inactive_count) / total) * 100) || 0;

                  return (
                    <div key={cat.category_name} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <strong>{cat.category_name}</strong>
                        <span style={{ color: 'var(--text-secondary)' }}>Total: {total}</span>
                      </div>
                      
                      {/* Segmented bar chart */}
                      <div style={{ height: '14px', borderRadius: '20px', overflow: 'hidden', display: 'flex', background: 'var(--bg-primary)' }}>
                        {allocatedPct > 0 && <div style={{ width: `${allocatedPct}%`, background: 'var(--primary)' }} title={`Allocated: ${allocatedPct}%`}></div>}
                        {availablePct > 0 && <div style={{ width: `${availablePct}%`, background: 'var(--color-available)' }} title={`Available: ${availablePct}%`}></div>}
                        {maintenancePct > 0 && <div style={{ width: `${maintenancePct}%`, background: 'var(--color-maintenance)' }} title={`Under Maintenance: ${maintenancePct}%`}></div>}
                        {inactivePct > 0 && <div style={{ width: `${inactivePct}%`, background: 'var(--color-overdue)' }} title={`Inactive (Lost/Retired): ${inactivePct}%`}></div>}
                      </div>

                      {/* Legend details */}
                      <div style={{ display: 'flex', gap: '12px', fontSize: '11px', flexWrap: 'wrap', marginTop: '2px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                          <span style={{ width: '8px', height: '8px', background: 'var(--primary)', borderRadius: '50%' }}></span>
                          <span>Allocated ({cat.allocated_count})</span>
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                          <span style={{ width: '8px', height: '8px', background: 'var(--color-available)', borderRadius: '50%' }}></span>
                          <span>Available ({cat.available_count})</span>
                        </span>
                        {parseInt(cat.maintenance_count) > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                            <span style={{ width: '8px', height: '8px', background: 'var(--color-maintenance)', borderRadius: '50%' }}></span>
                            <span>Service ({cat.maintenance_count})</span>
                          </span>
                        )}
                        {parseInt(cat.inactive_count) > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                            <span style={{ width: '8px', height: '8px', background: 'var(--color-overdue)', borderRadius: '50%' }}></span>
                            <span>Inactive ({cat.inactive_count})</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Panel Right: Department Allocations Valuation */}
            <div className="section-panel" style={{ background: 'var(--bg-card)', padding: '20px' }}>
              <h3 style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PieChart size={16} style={{ color: 'var(--primary)' }} />
                <span>Department Allocation Valuation</span>
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                {departments.map(dept => {
                  const maxDept = getMaxDeptAllocations();
                  const barWidth = Math.round((parseInt(dept.allocated_count) / maxDept) * 100) || 5;
                  
                  return (
                    <div key={dept.department_name} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span style={{ width: '120px', fontSize: '13px', fontWeight: 500, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {dept.department_name}
                      </span>
                      
                      {/* Scaled Value Bar */}
                      <div style={{ flex: '1', height: '24px', background: 'var(--bg-primary)', borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
                        <div 
                          style={{ 
                            width: `${barWidth}%`, 
                            height: '100%', 
                            background: 'var(--primary-light)', 
                            borderRight: '3px solid var(--primary)',
                            transition: 'width 0.5s ease' 
                          }}
                        ></div>
                        <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: 600, color: 'var(--primary)' }}>
                          {dept.allocated_count} Assets
                        </span>
                      </div>

                      <div style={{ width: '80px', textAlign: 'right', fontSize: '13px', fontWeight: 600 }}>
                        ${parseFloat(dept.total_value || 0).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* SECTION 2: Maintenance Frequency & Hourly Calendar Booking Heatmap */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            
            {/* Panel Left: Maintenance Request Frequency */}
            <div className="section-panel" style={{ background: 'var(--bg-card)', padding: '20px' }}>
              <h3 style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wrench size={16} style={{ color: 'var(--color-maintenance)' }} />
                <span>Maintenance Frequency by Category</span>
              </h3>

              <div className="table-container" style={{ marginTop: '16px' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Total Requests</th>
                      <th>Resolved</th>
                      <th>Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maintenance.map(m => (
                      <tr key={m.category_name}>
                        <td style={{ fontWeight: 600 }}>{m.category_name}</td>
                        <td><strong>{m.ticket_count || 0}</strong></td>
                        <td style={{ color: 'var(--color-available)', fontWeight: 500 }}>{m.resolved_count || 0}</td>
                        <td style={{ color: 'var(--color-overdue)', fontWeight: 500 }}>{m.pending_count || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Panel Right: Resource Booking Hourly Heatmap */}
            <div className="section-panel" style={{ background: 'var(--bg-card)', padding: '20px' }}>
              <h3 style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={16} style={{ color: 'var(--color-booking)' }} />
                <span>Peak Booking Heatmap (by Hour of Day)</span>
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
                {/* 24-hour horizontal slot blocks */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '6px' }}>
                  {/* Generate 8:00 AM to 7:00 PM blocks */}
                  {Array.from({ length: 12 }, (_, i) => {
                    const hour = i + 8; // 8 to 19
                    const count = getHeatmapBookingCount(hour);
                    const maxBooking = getMaxHeatmapBooking();
                    
                    // Determine HSL saturation color based on booking count
                    const opacity = count > 0 ? Math.max(0.15, count / maxBooking) : 0.05;
                    const displayHour = hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`;

                    return (
                      <div 
                        key={hour} 
                        style={{
                          height: '60px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: count > 0 ? `hsla(199, 89%, 48%, ${opacity})` : 'var(--bg-primary)',
                          border: count > 0 ? '1px solid var(--color-booking)' : '1px solid var(--border-color)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '4px',
                          textAlign: 'center'
                        }}
                        title={`${displayHour}: ${count} Bookings`}
                      >
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 500 }}>{displayHour}</span>
                        <strong style={{ fontSize: '15px', marginTop: '4px', color: count > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>{count}</strong>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <span>Low Usage</span>
                  <div style={{ width: '12px', height: '12px', background: 'hsla(199, 89%, 48%, 0.15)', borderRadius: '2px' }}></div>
                  <div style={{ width: '12px', height: '12px', background: 'hsla(199, 89%, 48%, 0.5)', borderRadius: '2px' }}></div>
                  <div style={{ width: '12px', height: '12px', background: 'hsla(199, 89%, 48%, 1)', borderRadius: '2px' }}></div>
                  <span>Peak Usage</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
};

export default Reports;
