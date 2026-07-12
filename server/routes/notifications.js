const express = require('express');
const { query } = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// 1. Get user notifications (GET /api/notifications)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM notifications WHERE employee_id = $1 ORDER BY created_at DESC LIMIT 100',
      [req.user.id]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Fetch Notifications Error:', error.message);
    res.status(500).json({ message: 'Server error retrieving notifications.' });
  }
});

// 2. Mark specific notification as read (PUT /api/notifications/:id/read)
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND employee_id = $2 RETURNING *',
      [parseInt(req.params.id), req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Notification not found or access denied.' });
    }

    res.status(200).json({ message: 'Notification marked as read.', notification: result.rows[0] });
  } catch (error) {
    console.error('Mark Notification Read Error:', error.message);
    res.status(500).json({ message: 'Server error updating notification status.' });
  }
});

// 3. Mark all user notifications as read (PUT /api/notifications/read-all)
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    await query(
      'UPDATE notifications SET is_read = TRUE WHERE employee_id = $1',
      [req.user.id]
    );
    res.status(200).json({ message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('Mark All Read Error:', error.message);
    res.status(500).json({ message: 'Server error updating notifications.' });
  }
});

// 4. Retrieve global audit trail logs (GET /api/notifications/audit-logs) - Admin Only
router.get('/audit-logs', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
  try {
    const result = await query(`
      SELECT al.id, al.action, al.details, al.created_at,
             e.name as employee_name, e.email as employee_email
      FROM audit_logs al
      LEFT JOIN employees e ON al.employee_id = e.id
      ORDER BY al.created_at DESC
      LIMIT 300
    `);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Fetch Audit Logs Error:', error.message);
    res.status(500).json({ message: 'Server error retrieving system audit trails.' });
  }
});

module.exports = router;
