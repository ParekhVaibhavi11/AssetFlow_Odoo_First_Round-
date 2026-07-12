const express = require('express');
const { query } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ==========================================
// SHARED RESOURCE BOOKINGS (Screen 6)
// ==========================================

// Query params: asset_id (required to load calendar view)
router.get('/', authenticateToken, async (req, res) => {
  const { asset_id } = req.query;

  if (!asset_id) {
    return res.status(400).json({ message: 'Asset ID is required to fetch bookings.' });
  }

  try {
    const result = await query(
      `SELECT b.*, e.name as employee_name, e.email as employee_email, a.name as asset_name, a.asset_tag
       FROM bookings b
       LEFT JOIN employees e ON b.employee_id = e.id
       LEFT JOIN assets a ON b.asset_id = a.id
       WHERE b.asset_id = $1
       ORDER BY b.start_time ASC`,
      [asset_id]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Fetch Bookings Error:', error.message);
    res.status(500).json({ message: 'Server error retrieving calendar bookings.' });
  }
});

// Includes overlap validation constraints
router.post('/', authenticateToken, async (req, res) => {
  const { asset_id, start_time, end_time } = req.body;

  if (!asset_id || !start_time || !end_time) {
    return res.status(400).json({ message: 'Asset ID, start time, and end time are required.' });
  }

  const start = new Date(start_time);
  const end = new Date(end_time);

  if (start >= end) {
    return res.status(400).json({ message: 'End time must be after start time.' });
  }

  try {
    // 1. Verify resource is bookable
    const assetCheck = await query('SELECT name, asset_tag, shared_bookable, status FROM assets WHERE id = $1', [asset_id]);
    if (assetCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Asset not found.' });
    }

    const asset = assetCheck.rows[0];
    if (!asset.shared_bookable) {
      return res.status(400).json({ message: 'This asset is not marked as a shared/bookable resource.' });
    }

    if (['Retired', 'Disposed'].includes(asset.status)) {
      return res.status(400).json({ message: `Resource is unavailable for booking. Status: ${asset.status}.` });
    }

    // Formula: existing_start < new_end AND existing_end > new_start
    const overlapCheck = await query(
      `SELECT b.*, e.name as holder_name
       FROM bookings b
       LEFT JOIN employees e ON b.employee_id = e.id
       WHERE b.asset_id = $1 
         AND b.status IN ('Upcoming', 'Ongoing')
         AND b.start_time < $2 
         AND b.end_time > $3`,
      [asset_id, end, start]
    );

    if (overlapCheck.rows.length > 0) {
      const existing = overlapCheck.rows[0];
      const startStr = new Date(existing.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const endStr = new Date(existing.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return res.status(409).json({
        message: `Booking overlap conflict: Time slot is already booked by ${existing.holder_name || 'another user'} between ${startStr} and ${endStr}.`,
        conflict: true
      });
    }
    const result = await query(
      `INSERT INTO bookings (asset_id, employee_id, start_time, end_time, status)
       VALUES ($1, $2, $3, $4, 'Upcoming')
       RETURNING *`,
      [asset_id, req.user.id, start, end]
    );

    // Notify user of confirmation
    await query(
      `INSERT INTO notifications (employee_id, title, message)
       VALUES ($1, 'Booking Confirmed', $2)`,
      [req.user.id, `Your booking for ${asset.name} (${asset.asset_tag}) from ${start.toLocaleString()} to ${end.toLocaleString()} has been confirmed.`]
    );

    // Log action
    await query(
      `INSERT INTO audit_logs (employee_id, action, details)
       VALUES ($1, 'RESOURCE_BOOKING', $2)`,
      [req.user.id, `Booked resource: ${asset.name} (${asset.asset_tag}) for slot: ${start.toISOString()} to ${end.toISOString()}.`]
    );

    res.status(201).json({
      message: 'Booking successfully confirmed!',
      booking: result.rows[0]
    });
  } catch (error) {
    console.error('Create Booking Error:', error.message);
    res.status(500).json({ message: 'Server error processing booking.' });
  }
});

router.put('/:id/cancel', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const check = await query('SELECT * FROM bookings WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const booking = check.rows[0];

    // Auth check: Admin, Asset Managers, or the employee who placed the booking
    if (req.user.role !== 'Admin' && req.user.role !== 'Asset Manager' && parseInt(req.user.id) !== parseInt(booking.employee_id)) {
      return res.status(403).json({ message: 'Access denied. You do not have permissions to cancel this booking.' });
    }

    if (booking.status === 'Cancelled') {
      return res.status(400).json({ message: 'Booking is already cancelled.' });
    }

    await query(`UPDATE bookings SET status = 'Cancelled' WHERE id = $1`, [id]);

    // Notify employee if manager cancelled it
    if (parseInt(req.user.id) !== parseInt(booking.employee_id)) {
      await query(
        `INSERT INTO notifications (employee_id, title, message)
         VALUES ($1, 'Booking Cancelled', 'Your resource booking has been cancelled by an administrator.')`,
        [booking.employee_id]
      );
    }

    res.status(200).json({ message: 'Booking successfully cancelled.' });
  } catch (error) {
    console.error('Cancel Booking Error:', error.message);
    res.status(500).json({ message: 'Server error cancelling booking.' });
  }
});

// 4. Reschedule Booking (PUT /api/bookings/:id/reschedule)
router.put('/:id/reschedule', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { start_time, end_time } = req.body;

  if (!start_time || !end_time) {
    return res.status(400).json({ message: 'Start time and end time are required.' });
  }

  const start = new Date(start_time);
  const end = new Date(end_time);

  if (start >= end) {
    return res.status(400).json({ message: 'End time must be after start time.' });
  }

  try {
    const bookingCheck = await query('SELECT * FROM bookings WHERE id = $1', [id]);
    if (bookingCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const booking = bookingCheck.rows[0];

    // Auth check
    if (req.user.role !== 'Admin' && req.user.role !== 'Asset Manager' && parseInt(req.user.id) !== parseInt(booking.employee_id)) {
      return res.status(403).json({ message: 'Access denied: cannot edit this booking.' });
    }

    // Overlap validation (except this specific booking)
    const overlapCheck = await query(
      `SELECT b.*, e.name as holder_name
       FROM bookings b
       LEFT JOIN employees e ON b.employee_id = e.id
       WHERE b.asset_id = $1 
         AND b.id != $2
         AND b.status IN ('Upcoming', 'Ongoing')
         AND b.start_time < $3 
         AND b.end_time > $4`,
      [booking.asset_id, id, end, start]
    );

    if (overlapCheck.rows.length > 0) {
      const existing = overlapCheck.rows[0];
      return res.status(409).json({
        message: `Reschedule conflict: Selected slot overlaps with booking by ${existing.holder_name || 'another user'}.`,
        conflict: true
      });
    }

    const result = await query(
      `UPDATE bookings
       SET start_time = $1, end_time = $2, status = 'Upcoming'
       WHERE id = $3
       RETURNING *`,
      [start, end, id]
    );

    res.status(200).json({
      message: 'Booking rescheduled successfully.',
      booking: result.rows[0]
    });
  } catch (error) {
    console.error('Reschedule Booking Error:', error.message);
    res.status(500).json({ message: 'Server error rescheduling booking.' });
  }
});

module.exports = router;
