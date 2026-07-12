const express = require('express');
const { query } = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// ==========================================
// MAINTENANCE MANAGEMENT 
// ==========================================

router.get('/', authenticateToken, async (req, res) => {
  try {
    let sql = `
      SELECT m.*, 
             a.name as asset_name, a.asset_tag, a.status as asset_status,
             e.name as reported_by_name, e.email as reported_by_email
      FROM maintenance m
      LEFT JOIN assets a ON m.asset_id = a.id
      LEFT JOIN employees e ON m.reported_by = e.id
    `;
    const params = [];

    if (req.user.role === 'Employee') {
      sql += ' WHERE m.reported_by = $1';
      params.push(req.user.id);
    }

    sql += ' ORDER BY m.created_at DESC';

    const result = await query(sql, params);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Fetch Maintenance Tickets Error:', error.message);
    res.status(500).json({ message: 'Server error retrieving maintenance list.' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const { asset_id, description, priority, photo_url } = req.body;

  if (!asset_id || !description) {
    return res.status(400).json({ message: 'Asset ID and description are required.' });
  }

  const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
  const selectPriority = validPriorities.includes(priority) ? priority : 'Medium';

  try {
    // Check asset existence
    const assetCheck = await query('SELECT name, asset_tag, status FROM assets WHERE id = $1', [asset_id]);
    if (assetCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Asset not found.' });
    }

    const asset = assetCheck.rows[0];

    // Raise ticket
    const result = await query(
      `INSERT INTO maintenance (asset_id, reported_by, description, priority, status, photo_url)
       VALUES ($1, $2, $3, $4, 'Pending', $5)
       RETURNING *`,
      [asset_id, req.user.id, description, selectPriority, photo_url || null]
    );

    // Log action to history
    await query(
      `INSERT INTO asset_history (asset_id, action, action_by, notes)
       VALUES ($1, 'Maintenance Request', $2, $3)`,
      [asset_id, req.user.id, `Maintenance requested (${selectPriority} priority): ${description}`]
    );

    res.status(201).json({
      message: 'Maintenance ticket created successfully.',
      ticket: result.rows[0]
    });
  } catch (error) {
    console.error('Create Maintenance Error:', error.message);
    res.status(500).json({ message: 'Server error filing maintenance ticket.' });
  }
});

// Restricted to Admin & Asset Managers
router.put('/:id/status', authenticateToken, authorizeRoles('Admin', 'Asset Manager'), async (req, res) => {
  const { id } = req.params;
  const { status, assigned_technician } = req.body;

  const validStatuses = ['Pending', 'Approved', 'Rejected', 'Technician Assigned', 'In Progress', 'Resolved'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Valid maintenance status is required.' });
  }

  try {
    const ticketCheck = await query(
      `SELECT m.*, a.name as asset_name, a.asset_tag 
       FROM maintenance m
       LEFT JOIN assets a ON m.asset_id = a.id
       WHERE m.id = $1`, 
      [id]
    );
    if (ticketCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Maintenance ticket not found.' });
    }

    const ticket = ticketCheck.rows[0];
    const assetId = ticket.asset_id;

    let updateFields = ['status = $1'];
    let params = [status];
    let index = 2;

    if (assigned_technician !== undefined) {
      updateFields.push(`assigned_technician = $${index}`);
      params.push(assigned_technician);
      index++;
    }

    if (status === 'Resolved') {
      updateFields.push(`resolved_at = CURRENT_TIMESTAMP`);
    }

    params.push(id);
    const updateQuery = `
      UPDATE maintenance
      SET ${updateFields.join(', ')}
      WHERE id = $${index}
      RETURNING *
    `;

    const result = await query(updateQuery, params);
    const updatedTicket = result.rows[0];

    // =============================================================
    // DYNAMIC ASSET STATE TRANSITIONS BASED ON MAINTENANCE WORKFLOW
    // =============================================================
    
    if (['Approved', 'Technician Assigned', 'In Progress'].includes(status)) {
      await query(
        `UPDATE assets 
         SET status = 'Under Maintenance' 
         WHERE id = $1`,
        [assetId]
      );
      
      // Update history
      await query(
        `INSERT INTO asset_history (asset_id, action, action_by, notes)
         VALUES ($1, 'Maintenance Status', $2, $3)`,
        [assetId, req.user.id, `Asset status updated to "Under Maintenance" (Ticket status: ${status}).`]
      );

      // Notify reporter
      await query(
        `INSERT INTO notifications (employee_id, title, message)
         VALUES ($1, 'Maintenance Request Approved', 'Your maintenance ticket for ${ticket.asset_name} was approved and is in progress.')`,
        [ticket.reported_by]
      );
    }
    
    if (status === 'Resolved') {
      await query(
        `UPDATE assets 
         SET status = 'Available', assigned_to = NULL, expected_return_date = NULL 
         WHERE id = $1`,
        [assetId]
      );
      
      // Update history
      await query(
        `INSERT INTO asset_history (asset_id, action, action_by, notes)
         VALUES ($1, 'Maintenance Resolved', $2, 'Maintenance repair resolved. Asset is set back to Available.')`,
        [assetId, req.user.id]
      );

      // Notify reporter
      await query(
        `INSERT INTO notifications (employee_id, title, message)
         VALUES ($1, 'Maintenance Resolved', 'Repair ticket for ${ticket.asset_name} is complete and asset is Available.')`,
        [ticket.reported_by]
      );
    }

    if (status === 'Rejected') {
      // Notify reporter
      await query(
        `INSERT INTO notifications (employee_id, title, message)
         VALUES ($1, 'Maintenance Rejected', 'Your maintenance request for ${ticket.asset_name} was rejected.')`,
        [ticket.reported_by]
      );
    }

    // Log the resolve action to system audit log
    await query(
      `INSERT INTO audit_logs (employee_id, action, details)
       VALUES ($1, 'MAINTENANCE_TICKET_UPDATE', $2)`,
      [req.user.id, `Updated ticket ID ${id} (${ticket.asset_tag}) to status "${status}".`]
    );

    res.status(200).json({
      message: `Maintenance ticket status successfully updated to "${status}".`,
      ticket: updatedTicket
    });
  } catch (error) {
    console.error('Update Maintenance Status Error:', error.message);
    res.status(500).json({ message: 'Server error updating maintenance ticket.' });
  }
});

module.exports = router;
