import React, { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { fetchApi } from '../utils/api';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  X, 
  Trash2, 
  AlertCircle,
  Check,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

const Bookings = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  // Data States
  const [sharedResources, setSharedResources] = useState([]);
  const [selectedResourceId, setSelectedResourceId] = useState('');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal Control
  const [showBookModal, setShowBookModal] = useState(false);
  
  // New Booking Form States
  const [bookingDate, setBookingDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');

  // Selected Day agenda filter
  const [selectedDayOffset, setSelectedDayOffset] = useState(0); // 0 = Today, 1 = Tomorrow, etc.

  useEffect(() => {
    loadResources();
  }, []);

  useEffect(() => {
    if (selectedResourceId) {
      loadBookings(selectedResourceId);
    } else {
      setBookings([]);
    }
  }, [selectedResourceId]);

  // Listen for dashboard quick action triggers
  useEffect(() => {
    if (location.state?.openBook) {
      setShowBookModal(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const loadResources = async () => {
    try {
      // Fetch only shared/bookable assets
      const data = await fetchApi('/assets?shared_bookable=true');
      setSharedResources(data);
      if (data.length > 0) {
        setSelectedResourceId(data[0].id);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch shared bookable resources.');
    }
  };

  const loadBookings = async (resourceId) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchApi(`/bookings?asset_id=${resourceId}`);
      setBookings(data);
    } catch (err) {
      console.error(err);
      setError('Failed to retrieve bookings calendar.');
    } finally {
      setLoading(false);
    }
  };

  const handleBookSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // Combine date and times to ISO strings
    const startIso = new Date(`${bookingDate}T${startTime}:00`).toISOString();
    const endIso = new Date(`${bookingDate}T${endTime}:00`).toISOString();

    try {
      const res = await fetchApi('/bookings', {
        method: 'POST',
        body: {
          asset_id: parseInt(selectedResourceId),
          start_time: startIso,
          end_time: endIso
        }
      });

      setSuccessMsg(res.message);
      setShowBookModal(false);
      loadBookings(selectedResourceId);
      resetBookingForm();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to complete booking.');
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    setError('');
    setSuccessMsg('');

    try {
      await fetchApi(`/bookings/${bookingId}/cancel`, { method: 'PUT' });
      setSuccessMsg('Booking cancelled successfully.');
      loadBookings(selectedResourceId);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to cancel booking.');
    }
  };

  const resetBookingForm = () => {
    const today = new Date().toISOString().split('T')[0];
    setBookingDate(today);
    setStartTime('09:00');
    setEndTime('10:00');
  };

  const openNewBookingModal = () => {
    resetBookingForm();
    setShowBookModal(true);
  };

  // Helper to generate next 7 days list for agenda selection view
  const getDaysArray = () => {
    const arr = [];
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      arr.push({
        offset: i,
        dayName: weekdays[d.getDay()],
        dayNum: d.getDate(),
        fullDateString: d.toISOString().split('T')[0],
        dateObject: d
      });
    }
    return arr;
  };

  const daysList = getDaysArray();
  const activeDayObj = daysList[selectedDayOffset];

  // Filter bookings that match the selected day
  const filteredBookings = bookings.filter(b => {
    if (b.status === 'Cancelled') return false;
    const bookingDateStr = new Date(b.start_time).toISOString().split('T')[0];
    return bookingDateStr === activeDayObj.fullDateString;
  });

  const getResourceDetails = () => {
    return sharedResources.find(r => parseInt(r.id) === parseInt(selectedResourceId));
  };

  return (
    <div className="section-panel" style={{ gap: '20px' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="panel-title" style={{ fontSize: '22px' }}>Resource Bookings</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Book shared rooms, vehicles, or equipment. Double bookings are blocked automatically.
          </p>
        </div>
        
        {selectedResourceId && (
          <button className="btn btn-primary" onClick={openNewBookingModal}>
            <Plus size={16} />
            <span>Book Time Slot</span>
          </button>
        )}
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

      {/* Resource selector bar */}
      <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ marginBottom: 0, flex: '1', minWidth: '220px' }}>
          <label className="form-label">Select Shared Resource</label>
          <select 
            className="form-input"
            value={selectedResourceId}
            onChange={(e) => setSelectedResourceId(e.target.value)}
          >
            {sharedResources.map(r => (
              <option key={r.id} value={r.id}>{r.asset_tag} - {r.name} ({r.location})</option>
            ))}
          </select>
        </div>
        
        {/* Dynamic Category attributes visual helper */}
        {getResourceDetails() && (
          <div style={{ flex: '2', minWidth: '300px', display: 'flex', gap: '20px', background: 'var(--bg-card)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '13px' }}>
            <div>
              <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Location</span>
              <strong>{getResourceDetails().location || 'General'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Capacity / Specs</span>
              {getResourceDetails().custom_attributes && Object.entries(getResourceDetails().custom_attributes).map(([k, v]) => (
                <span key={k} style={{ marginRight: '8px' }}><strong>{k}:</strong> {v}</span>
              )) || 'Standard'}
            </div>
          </div>
        )}
      </div>

      {/* Week Day selector buttons (Agenda visual calendar representation) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
        {daysList.map(day => (
          <button
            key={day.offset}
            className="btn-signout"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '12px 8px',
              borderRadius: 'var(--radius-md)',
              background: selectedDayOffset === day.offset ? 'var(--primary-light)' : 'var(--bg-card)',
              borderColor: selectedDayOffset === day.offset ? 'var(--primary)' : 'var(--border-color)',
              color: selectedDayOffset === day.offset ? 'var(--primary)' : 'var(--text-primary)',
              cursor: 'pointer',
              height: 'auto'
            }}
            onClick={() => setSelectedDayOffset(day.offset)}
          >
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>{day.dayName}</span>
            <span style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-display)', marginTop: '4px' }}>{day.dayNum}</span>
          </button>
        ))}
      </div>

      {/* Day Agenda agenda slots list */}
      <div className="section-panel" style={{ background: 'var(--bg-card)', padding: '24px' }}>
        <h3 style={{ fontSize: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          Schedule for {activeDayObj.dateObject.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
        </h3>

        {loading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading schedule agenda...</div>
        ) : filteredBookings.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <CalendarIcon size={36} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
            <p>No reservations scheduled for this day.</p>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>Timeslots are open for booking.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            {filteredBookings.map(b => {
              const startStr = new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const endStr = new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const isMine = user && parseInt(user.id) === parseInt(b.employee_id);
              const isManager = user && ['Admin', 'Asset Manager'].includes(user.role);

              return (
                <div 
                  key={b.id} 
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    background: isMine ? 'var(--primary-light)' : 'var(--bg-primary)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontWeight: 600 }}>
                      <Clock size={16} />
                      <span>{startStr} - {endStr}</span>
                    </div>
                    <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-color)' }}></div>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>
                        Reserved by {b.employee_name}
                      </span>
                      <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {b.employee_email}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span className="badge badge-booking" style={{ textTransform: 'capitalize' }}>
                      {b.status}
                    </span>

                    {(isMine || isManager) && (
                      <button 
                        className="btn-signout"
                        style={{ padding: '6px', borderColor: 'transparent', color: 'var(--color-overdue)', background: 'transparent' }}
                        title="Cancel Reservation"
                        onClick={() => handleCancelBooking(b.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. MODAL: Book Time Slot */}
      {showBookModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '18px' }}>Book Time Slot</h3>
              <X size={18} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setShowBookModal(false)} />
            </div>

            <form onSubmit={handleBookSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
              <div className="form-group">
                <label className="form-label">Selected Resource</label>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ background: 'var(--bg-primary)', fontWeight: 600 }}
                  value={`${getResourceDetails()?.asset_tag} - ${getResourceDetails()?.name}`}
                  disabled 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Booking Date *</label>
                <input 
                  type="date" 
                  className="form-input"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Start Time *</label>
                  <input 
                    type="time" 
                    className="form-input"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">End Time *</label>
                  <input 
                    type="time" 
                    className="form-input"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowBookModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Confirm Booking</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bookings;
