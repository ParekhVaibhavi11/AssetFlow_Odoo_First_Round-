import React, { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { fetchApi } from '../utils/api';
import { 
  Wrench, 
  Plus, 
  X, 
  Check, 
  UserPlus, 
  Play, 
  CheckSquare, 
  AlertCircle,
  FileText
} from 'lucide-react';

const Maintenance = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const isManagerOrAdmin = user && ['Admin', 'Asset Manager'].includes(user.role);

  // Core Data States
  const [tickets, setTickets] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Toggles
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Form Request State
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [ticketPriority, setTicketPriority] = useState('Medium');
  const [photoUrl, setPhotoUrl] = useState('');

  // Form Assign State
  const [technicianName, setTechnicianName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  // Listen for dashboard quick action triggers
  useEffect(() => {
    if (location.state?.openRequest) {
      setShowRequestModal(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [ticketsList, assetsList] = await Promise.all([
        fetchApi('/maintenance'),
        fetchApi('/assets')
      ]);
      setTickets(ticketsList);
      setAssets(assetsList);
    } catch (err) {
      console.error(err);
      setError('Failed to retrieve maintenance records.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetchApi('/maintenance', {
        method: 'POST',
        body: {
          asset_id: parseInt(selectedAssetId),
          description: issueDescription,
          priority: ticketPriority,
          photo_url: photoUrl || null
        }
      });

      setSuccessMsg(res.message);
      setShowRequestModal(false);
      resetRequestForm();
      loadData();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to file maintenance request.');
    }
  };

  const handleUpdateStatus = async (ticketId, status, extraFields = {}) => {
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetchApi(`/maintenance/${ticketId}/status`, {
        method: 'PUT',
        body: { status, ...extraFields }
      });
      setSuccessMsg(res.message);
      loadData();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to update ticket status.');
    }
  };

  const openAssignModal = (ticket) => {
    setSelectedTicket(ticket);
    setTechnicianName('');
    setShowAssignModal(true);
  };

  const handleAssignSubmit = (e) => {
    e.preventDefault();
    setShowAssignModal(false);
    handleUpdateStatus(selectedTicket.id, 'Technician Assigned', {
      assigned_technician: technicianName
    });
  };

  const resetRequestForm = () => {
    setSelectedAssetId('');
    setIssueDescription('');
    setTicketPriority('Medium');
    setPhotoUrl('');
  };

  const getPriorityBadgeColor = (p) => {
    switch (p) {
      case 'Critical': return { bg: 'hsl(354, 70%, 95%)', color: 'hsl(354, 70%, 54%)' };
      case 'High': return { bg: 'hsl(25, 95%, 95%)', color: 'hsl(25, 95%, 53%)' };
      case 'Medium': return { bg: 'hsl(45, 90%, 95%)', color: 'hsl(45, 90%, 45%)' };
      default: return { bg: 'var(--primary-light)', color: 'var(--primary)' };
    }
  };

  const getStatusBadgeColor = (s) => {
    switch (s) {
      case 'Pending': return 'badge-booking';
      case 'Approved': return 'badge-allocated';
      case 'Technician Assigned': return 'badge-allocated';
      case 'In Progress': return 'badge-maintenance';
      case 'Resolved': return 'badge-available';
      default: return 'badge-overdue';
    }
  };

  return (
    <div className="section-panel" style={{ gap: '20px' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="panel-title" style={{ fontSize: '22px' }}>Maintenance & Repairs Board</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            File repair request tickets and track approval states. Asset statuses update dynamically as work completes.
          </p>
        </div>
        
        <button className="btn btn-primary" onClick={() => setShowRequestModal(true)}>
          <Plus size={16} />
          <span>File Ticket</span>
        </button>
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

      {/* Tickets board container */}
      <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading maintenance board...
          </div>
        ) : tickets.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No maintenance tickets reported. All systems operational!
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Description</th>
                <th>Priority</th>
                <th>Reported By</th>
                <th>Status</th>
                <th>Assigned Technician</th>
                <th>Filed Date</th>
                {isManagerOrAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {tickets.map(ticket => {
                const priorityStyles = getPriorityBadgeColor(ticket.priority);
                return (
                  <tr key={ticket.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{ticket.asset_tag}</div>
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>{ticket.asset_name}</div>
                    </td>
                    <td style={{ maxWidth: '240px' }}>
                      <div style={{ fontSize: '14px', whiteSpace: 'normal', wordBreak: 'break-word' }}>{ticket.description}</div>
                      {ticket.photo_url && (
                        <a href={ticket.photo_url} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: 'var(--primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                          <FileText size={11} />
                          <span>View Attached Photo</span>
                        </a>
                      )}
                    </td>
                    <td>
                      <span 
                        className="badge" 
                        style={{ backgroundColor: priorityStyles.bg, color: priorityStyles.color }}
                      >
                        {ticket.priority}
                      </span>
                    </td>
                    <td>{ticket.reported_by_name}</td>
                    <td>
                      <span className={`badge ${getStatusBadgeColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td>
                      {ticket.assigned_technician ? (
                        <strong>{ticket.assigned_technician}</strong>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Unassigned</span>
                      )}
                    </td>
                    <td>{new Date(ticket.created_at).toLocaleDateString()}</td>
                    {isManagerOrAdmin && (
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          {/* 1. Pending Approvals */}
                          {ticket.status === 'Pending' && (
                            <>
                              <button 
                                className="btn btn-primary"
                                style={{ padding: '6px 12px', fontSize: '12px', background: 'var(--color-available)', borderColor: 'var(--color-available)' }}
                                onClick={() => handleUpdateStatus(ticket.id, 'Approved')}
                              >
                                <Check size={12} />
                                <span>Approve</span>
                              </button>
                              <button 
                                className="btn btn-outline"
                                style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--color-overdue)', borderColor: 'var(--color-overdue)' }}
                                onClick={() => handleUpdateStatus(ticket.id, 'Rejected')}
                              >
                                <X size={12} />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          {/* 2. Approved -> Assign Tech */}
                          {ticket.status === 'Approved' && (
                            <button 
                              className="btn btn-primary"
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                              onClick={() => openAssignModal(ticket)}
                            >
                              <UserPlus size={12} />
                              <span>Assign Tech</span>
                            </button>
                          )}

                          {/* 3. Tech Assigned -> In Progress */}
                          {ticket.status === 'Technician Assigned' && (
                            <button 
                              className="btn btn-primary"
                              style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: 'var(--color-maintenance)', borderColor: 'var(--color-maintenance)' }}
                              onClick={() => handleUpdateStatus(ticket.id, 'In Progress')}
                            >
                              <Play size={12} />
                              <span>Start Work</span>
                            </button>
                          )}

                          {/* 4. In Progress -> Resolve */}
                          {ticket.status === 'In Progress' && (
                            <button 
                              className="btn btn-primary"
                              style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: 'var(--color-available)', borderColor: 'var(--color-available)' }}
                              onClick={() => handleUpdateStatus(ticket.id, 'Resolved')}
                            >
                              <CheckSquare size={12} />
                              <span>Mark Resolved</span>
                            </button>
                          )}

                          {/* 5. Closed tickets */}
                          {['Resolved', 'Rejected'].includes(ticket.status) && (
                            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Ticket Locked</span>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 4. MODAL: File Request Ticket */}
      {showRequestModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '18px' }}>File Maintenance Ticket</h3>
              <X size={18} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => { setShowRequestModal(false); resetRequestForm(); }} />
            </div>

            <form onSubmit={handleRequestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
              <div className="form-group">
                <label className="form-label">Select Damaged/Faulty Asset *</label>
                <select 
                  className="form-input"
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  required
                >
                  <option value="">Choose Asset</option>
                  {assets.map(a => (
                    <option key={a.id} value={a.id}>{a.asset_tag} - {a.name} ({a.location || 'General'})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Urgency Priority *</label>
                <select 
                  className="form-input"
                  value={ticketPriority}
                  onChange={(e) => setTicketPriority(e.target.value)}
                  required
                >
                  <option value="Low">Low (General checkup)</option>
                  <option value="Medium">Medium (Affects use, not broken)</option>
                  <option value="High">High (Item unusable)</option>
                  <option value="Critical">Critical (Immediate safety / hazard issue)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Issue Details & Description *</label>
                <textarea 
                  className="form-input"
                  style={{ minHeight: '90px', resize: 'vertical' }}
                  placeholder="Describe exact error codes, broken elements, or noises..."
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Attach Photo URL (Optional)</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="http://example.com/photo.jpg"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <button type="button" className="btn btn-outline" onClick={() => { setShowRequestModal(false); resetRequestForm(); }}>Cancel</button>
                <button type="submit" className="btn btn-primary">File Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL: Assign Technician */}
      {showAssignModal && selectedTicket && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px' }}>Assign Technician</h3>
                <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}>{selectedTicket.asset_name} ({selectedTicket.asset_tag})</span>
              </div>
              <X size={18} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setShowAssignModal(false)} />
            </div>

            <form onSubmit={handleAssignSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
              <div className="form-group">
                <label className="form-label">Technician Name / Department *</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="e.g. Mike Tyson (Service Engineer)"
                  value={technicianName}
                  onChange={(e) => setTechnicianName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAssignModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Assign</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Maintenance;
