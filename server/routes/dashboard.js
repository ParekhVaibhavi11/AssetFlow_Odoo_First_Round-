const express = require('express');
const { query } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 1. Get Dashboard Summary KPIs & Banner (GET /api/dashboard/stats)
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // Run multiple count queries in parallel using Promise.all for speed and efficiency
    const [
      totalResult,
      availableResult,
      allocatedResult,
      maintenanceResult,
      bookingsResult,
      overdueResult
    ] = await Promise.all([
      query("SELECT COUNT(*) FROM assets WHERE status NOT IN ('Retired', 'Disposed')"),
      query("SELECT COUNT(*) FROM assets WHERE status = 'Available'"),
      query("SELECT COUNT(*) FROM assets WHERE status = 'Allocated'"),
      query("SELECT COUNT(*) FROM assets WHERE status = 'Under Maintenance'"),
      query("SELECT COUNT(*) FROM bookings WHERE status IN ('Upcoming', 'Ongoing')"),
      query("SELECT COUNT(*) FROM assets WHERE status = 'Allocated' AND expected_return_date IS NOT NULL AND expected_return_date < CURRENT_DATE")
    ]);

    const stats = {
      totalAssets: parseInt(totalResult.rows[0].count),
      available: parseInt(availableResult.rows[0].count),
      allocated: parseInt(allocatedResult.rows[0].count),
      underMaintenance: parseInt(maintenanceResult.rows[0].count),
      activeBookings: parseInt(bookingsResult.rows[0].count),
      overdueReturns: parseInt(overdueResult.rows[0].count)
    };

    res.status(200).json(stats);
  } catch (error) {
    console.error('Fetch Dashboard Stats Error:', error.message);
    res.status(500).json({ message: 'Server error compiling dashboard statistics.' });
  }
});

// 2. Get Recent Activities Stream (GET /api/dashboard/activity)
router.get('/activity', authenticateToken, async (req, res) => {
  try {
    // Fetch latest 10 actions from history
    const result = await query(
      `SELECT h.id, h.action, h.notes, h.created_at,
              a.name as asset_name, a.asset_tag,
              e.name as employee_name
       FROM asset_history h
       LEFT JOIN assets a ON h.asset_id = a.id
       LEFT JOIN employees e ON h.action_by = e.id
       ORDER BY h.created_at DESC
       LIMIT 10`
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Fetch Dashboard Activity Error:', error.message);
    res.status(500).json({ message: 'Server error retrieving recent activity logs.' });
  }
});

module.exports = router;
