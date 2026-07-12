const express = require('express');
const { query } = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();


// 1. Asset Utilization by Category (GET /api/analytics/utilization)
router.get('/utilization', authenticateToken, authorizeRoles('Admin', 'Asset Manager'), async (req, res) => {
  try {
    const result = await query(`
      SELECT c.name as category_name,
             COUNT(*) FILTER (WHERE a.status = 'Allocated') as allocated_count,
             COUNT(*) FILTER (WHERE a.status = 'Available') as available_count,
             COUNT(*) FILTER (WHERE a.status = 'Under Maintenance') as maintenance_count,
             COUNT(*) FILTER (WHERE a.status IN ('Lost', 'Retired', 'Disposed')) as inactive_count,
             COUNT(*) as total_count
      FROM assets a
      JOIN asset_categories c ON a.category_id = c.id
      GROUP BY c.name
      ORDER BY total_count DESC
    `);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Utilization Analytics Error:', error.message);
    res.status(500).json({ message: 'Server error compiling utilization metrics.' });
  }
});

// 2. Maintenance Frequency & Repair Costs by Category (GET /api/analytics/maintenance)
router.get('/maintenance', authenticateToken, authorizeRoles('Admin', 'Asset Manager'), async (req, res) => {
  try {
    const result = await query(`
      SELECT c.name as category_name, 
             COUNT(m.id) as ticket_count,
             COUNT(m.id) FILTER (WHERE m.status = 'Resolved') as resolved_count,
             COUNT(m.id) FILTER (WHERE m.status = 'Pending') as pending_count
      FROM asset_categories c
      LEFT JOIN assets a ON a.category_id = c.id
      LEFT JOIN maintenance m ON m.asset_id = a.id
      GROUP BY c.name
      ORDER BY ticket_count DESC
    `);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Maintenance Analytics Error:', error.message);
    res.status(500).json({ message: 'Server error compiling maintenance statistics.' });
  }
});

// 3. Department-wise Allocation Summary (GET /api/analytics/departments)
router.get('/departments', authenticateToken, authorizeRoles('Admin', 'Asset Manager'), async (req, res) => {
  try {
    const result = await query(`
      SELECT d.name as department_name,
             COUNT(a.id) as allocated_count,
             SUM(a.acquisition_cost) as total_value
      FROM departments d
      LEFT JOIN assets a ON a.department_id = d.id AND a.status = 'Allocated'
      GROUP BY d.name
      ORDER BY allocated_count DESC
    `);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Department Allocation Analytics Error:', error.message);
    res.status(500).json({ message: 'Server error compiling department metrics.' });
  }
});

// 4. Resource Booking Heatmap (GET /api/analytics/booking-heatmap)
router.get('/booking-heatmap', authenticateToken, authorizeRoles('Admin', 'Asset Manager'), async (req, res) => {
  try {
    const result = await query(`
      SELECT EXTRACT(HOUR FROM start_time) as booking_hour,
             COUNT(*) as booking_count
      FROM bookings
      WHERE status != 'Cancelled'
      GROUP BY booking_hour
      ORDER BY booking_hour ASC
    `);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Booking Heatmap Analytics Error:', error.message);
    res.status(500).json({ message: 'Server error compiling resource booking heatmap.' });
  }
});

module.exports = router;
