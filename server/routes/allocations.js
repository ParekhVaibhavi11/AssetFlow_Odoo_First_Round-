const express = require('express');
const { query } = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// ==========================================
// ASSET ALLOCATION, RETURNS, AND TRANSFERS
// ==========================================

// 1. Allocate Asset (POST /api/allocations/allocate)
// Purpose: Allocate asset to employee/department with conflict checks
router.post('/allocate', authenticateToken, authorizeRoles('Admin', 'Asset Manager'), async (req, res) => {
  const { asset_id, employee_id, department_id, expected_return_date } = req.body;

  if (!asset_id || (!employee_id && !department_id)) {
    return res.status(400).json({ message: 'Asset ID and either Employee ID or Department ID are required.' });
  }

  try {
    // 1. Check if asset exists and check its current status
    const assetCheck = await query(
      `SELECT a.*, e.name as current_holder_name, d.name as current_dept_name 
       FROM assets a
       LEFT JOIN employees e ON a.assigned_to = e.id
       LEFT JOIN departments d ON a.department_id = d.id
       WHERE a.id = $1`,
      [asset_id]
    );

    if (assetCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Asset not found.' });
    }

    const asset = assetCheck.rows[0];

    // Conflict rule: You can't allocate an asset that's already taken.
    if (asset.status === 'Allocated') {
      const holderName = asset.current_holder_name || asset.current_dept_name || 'another department';
      return res.status(409).json({
        message: `Allocation conflict: Asset is already allocated.`,
        conflict: true,
        currently_held_by: holderName,
        assigned_to_id: asset.assigned_to,
        department_id: asset.department_id
      });
    }

    if (asset.status !== 'Available') {
      return res.status(400).json({ message: `Asset is not in an allocatable state. Current state: ${asset.status}` });
    }

    // 2. Resolve targets details
    let assigneeName = '';
    let targetDeptId = department_id || null;

    if (employee_id) {
      const empResult = await query('SELECT name, department_id FROM employees WHERE id = $1', [employee_id]);
      if (empResult.rows.length === 0) {
        return res.status(400).json({ message: 'Target employee not found.' });
      }
      assigneeName = empResult.rows[0].name;
      // Auto-assign department if employee belongs to one
      if (!targetDeptId) {
        targetDeptId = empResult.rows[0].department_id;
      }
    } else if (department_id) {
      const deptResult = await query('SELECT name FROM departments WHERE id = $1', [department_id]);
      if (deptResult.rows.length === 0) {
        return res.status(400).json({ message: 'Target department not found.' });
      }
      assigneeName = `Department: ${deptResult.rows[0].name}`;
    }

    // 3. Update Asset
    const updatedAssetResult = await query(
      `UPDATE assets
       SET status = 'Allocated',
           assigned_to = $1,
           department_id = $2,
           expected_return_date = $3
       WHERE id = $4
       RETURNING *`,
      [employee_id || null, targetDeptId, expected_return_date || null, asset_id]
    );

    const updatedAsset = updatedAssetResult.rows[0];

    // 4. Log to history
    const historyNotes = `Allocated to ${assigneeName}. Expected return: ${expected_return_date || 'No Date Specified'}.`;
    await query(
      `INSERT INTO asset_history (asset_id, action, action_by, notes)
       VALUES ($1, 'Allocation', $2, $3)`,
      [asset_id, req.user.id, historyNotes]
    );

    // 5. Send Notification
    if (employee_id) {
      await query(
        `INSERT INTO notifications (employee_id, title, message)
         VALUES ($1, 'Asset Allocated', $2)`,
        [employee_id, `Asset ${updatedAsset.name} (Tag: ${updatedAsset.asset_tag}) has been allocated to you. Expected return: ${expected_return_date || 'N/A'}.`]
      );
    }

    // 6. Write to audit logs
    await query(
      `INSERT INTO audit_logs (employee_id, action, details)
       VALUES ($1, 'ASSET_ALLOCATION', $2)`,
      [req.user.id, `Allocated asset ${updatedAsset.name} (${updatedAsset.asset_tag}) to ${assigneeName}.`]
    );

    res.status(200).json({
      message: `Asset ${updatedAsset.asset_tag} successfully allocated to ${assigneeName}.`,
      asset: updatedAsset
    });
  } catch (error) {
    console.error('Allocate Asset Error:', error.message);
    res.status(500).json({ message: 'Server error allocating asset.' });
  }
});

// 2. Request Transfer (POST /api/allocations/transfer/request)
// Purpose: Initiate a request to transfer an already-allocated asset
router.post('/transfer/request', authenticateToken, async (req, res) => {
  const { asset_id, to_employee_id, notes } = req.body;

  if (!asset_id || !to_employee_id) {
    return res.status(400).json({ message: 'Asset ID and target Employee ID are required.' });
  }

  try {
    // Check asset status
    const assetCheck = await query(
      `SELECT a.*, e.name as current_holder_name 
       FROM assets a
       LEFT JOIN employees e ON a.assigned_to = e.id
       WHERE a.id = $1`,
      [asset_id]
    );

    if (assetCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Asset not found.' });
    }

    const asset = assetCheck.rows[0];

    if (asset.status !== 'Allocated' || !asset.assigned_to) {
      return res.status(400).json({ message: 'Only currently allocated assets can be requested for transfer.' });
    }

    if (parseInt(asset.assigned_to) === parseInt(to_employee_id)) {
      return res.status(400).json({ message: 'Target user is already the current holder of this asset.' });
    }

    // Verify target employee
    const targetCheck = await query('SELECT name, department_id FROM employees WHERE id = $1', [to_employee_id]);
    if (targetCheck.rows.length === 0) {
      return res.status(400).json({ message: 'Target employee not found.' });
    }

    // Insert pending transfer request
    const result = await query(
      `INSERT INTO transfers (asset_id, from_employee_id, to_employee_id, requested_by, status, notes)
       VALUES ($1, $2, $3, $4, 'Pending', $5)
       RETURNING *`,
      [asset_id, asset.assigned_to, to_employee_id, req.user.id, notes || '']
    );

    // Notify current holder and asset managers
    await query(
      `INSERT INTO notifications (employee_id, title, message)
       VALUES ($1, 'Transfer Requested', $2)`,
      [asset.assigned_to, `${targetCheck.rows[0].name} has requested a transfer of asset ${asset.name} (${asset.asset_tag}) currently held by you.`]
    );

    res.status(201).json({
      message: 'Transfer request submitted successfully. Awaiting approval.',
      transfer: result.rows[0]
    });
  } catch (error) {
    console.error('Request Transfer Error:', error.message);
    res.status(500).json({ message: 'Server error requesting asset transfer.' });
  }
});

// 3. Get Active / Pending Transfers (GET /api/allocations/transfers)
router.get('/transfers', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT t.*,
              a.name as asset_name, a.asset_tag,
              f.name as from_employee_name,
              to_emp.name as to_employee_name,
              r.name as requested_by_name
       FROM transfers t
       LEFT JOIN assets a ON t.asset_id = a.id
       LEFT JOIN employees f ON t.from_employee_id = f.id
       LEFT JOIN employees to_emp ON t.to_employee_id = to_emp.id
       LEFT JOIN employees r ON t.requested_by = r.id
       ORDER BY t.created_at DESC`
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Get Transfers Error:', error.message);
    res.status(500).json({ message: 'Server error retrieving transfer list.' });
  }
});

// 4. Resolve Transfer: Approve / Reject (PUT /api/allocations/transfers/:id/resolve)
// Admin, Asset Managers, or Department Heads of the department can approve transfers
router.put('/transfers/:id/resolve', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'Approve' or 'Reject'

  if (!action || !['Approve', 'Reject'].includes(action)) {
    return res.status(400).json({ message: 'Action must be Approve or Reject.' });
  }

  // Authorization check (Only Admins, Managers, or Department Heads)
  if (!['Admin', 'Asset Manager', 'Department Head'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied: insufficient permissions to resolve transfers.' });
  }

  try {
    const transferCheck = await query(
      `SELECT t.*, a.name as asset_name, a.asset_tag,
              f.name as from_name, to_emp.name as to_name, to_emp.department_id as to_dept_id
       FROM transfers t
       LEFT JOIN assets a ON t.asset_id = a.id
       LEFT JOIN employees f ON t.from_employee_id = f.id
       LEFT JOIN employees to_emp ON t.to_employee_id = to_emp.id
       WHERE t.id = $1`,
      [id]
    );

    if (transferCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Transfer record not found.' });
    }

    const transfer = transferCheck.rows[0];

    if (transfer.status !== 'Pending') {
      return res.status(400).json({ message: `Transfer has already been resolved with status: ${transfer.status}.` });
    }

    const statusMap = action === 'Approve' ? 'Approved' : 'Rejected';

    if (action === 'Approve') {
      // 1. Reallocate Asset to the target user
      await query(
        `UPDATE assets
         SET assigned_to = $1,
             department_id = $2
         WHERE id = $3`,
        [transfer.to_employee_id, transfer.to_dept_id, transfer.asset_id]
      );

      // 2. Update transfer record
      await query(
        `UPDATE transfers
         SET status = 'Approved', approved_by = $1
         WHERE id = $2`,
        [req.user.id, id]
      );

      // 3. Log to history
      const historyNotes = `Transferred from ${transfer.from_name} to ${transfer.to_name}. Approved by: ${req.user.name}.`;
      await query(
        `INSERT INTO asset_history (asset_id, action, action_by, notes)
         VALUES ($1, 'Transfer', $2, $3)`,
        [transfer.asset_id, req.user.id, historyNotes]
      );

      // 4. Send Notifications
      await query(
        `INSERT INTO notifications (employee_id, title, message)
         VALUES 
         ($1, 'Transfer Approved', 'Your transfer request for ${transfer.asset_name} was approved.'),
         ($2, 'Asset Transferred', 'Asset ${transfer.asset_name} previously held by you has been transferred to ${transfer.to_name}.')`,
        [transfer.to_employee_id, transfer.from_employee_id]
      );

      // 5. System log
      await query(
        `INSERT INTO audit_logs (employee_id, action, details)
         VALUES ($1, 'ASSET_TRANSFER_APPROVED', $2)`,
        [req.user.id, `Approved transfer of ${transfer.asset_name} (${transfer.asset_tag}) to ${transfer.to_name}.`]
      );

      res.status(200).json({ message: 'Transfer approved and asset re-allocated successfully.' });
    } else {
      // Reject
      await query(
        `UPDATE transfers
         SET status = 'Rejected', approved_by = $1
         WHERE id = $2`,
        [req.user.id, id]
      );

      await query(
        `INSERT INTO notifications (employee_id, title, message)
         VALUES ($1, 'Transfer Rejected', 'Your transfer request for ${transfer.asset_name} was rejected.')`,
        [transfer.to_employee_id]
      );

      res.status(200).json({ message: 'Transfer request rejected.' });
    }
  } catch (error) {
    console.error('Resolve Transfer Error:', error.message);
    res.status(500).json({ message: 'Server error resolving asset transfer.' });
  }
});

// 5. Return Asset (POST /api/allocations/return)
// Reverts asset status to Available and sets check-in condition notes
router.post('/return', authenticateToken, authorizeRoles('Admin', 'Asset Manager'), async (req, res) => {
  const { asset_id, condition, notes } = req.body;

  if (!asset_id) {
    return res.status(400).json({ message: 'Asset ID is required.' });
  }

  try {
    const assetCheck = await query(
      `SELECT a.*, e.name as holder_name 
       FROM assets a
       LEFT JOIN employees e ON a.assigned_to = e.id
       WHERE a.id = $1`,
      [asset_id]
    );

    if (assetCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Asset not found.' });
    }

    const asset = assetCheck.rows[0];

    if (asset.status !== 'Allocated') {
      return res.status(400).json({ message: 'Asset is not currently allocated.' });
    }

    // Revert status to Available, remove assignment and expected return date
    const updatedCondition = condition || asset.condition;
    await query(
      `UPDATE assets
       SET status = 'Available',
           assigned_to = NULL,
           expected_return_date = NULL,
           condition = $1
       WHERE id = $2`,
      [updatedCondition, asset_id]
    );

    // Write to asset history
    const historyNotes = `Returned by ${asset.holder_name || 'user'}. Condition checked: ${updatedCondition}. Notes: ${notes || 'None'}`;
    await query(
      `INSERT INTO asset_history (asset_id, action, action_by, notes)
       VALUES ($1, 'Return', $2, $3)`,
      [asset_id, req.user.id, historyNotes]
    );

    // Notify employee of check-in
    if (asset.assigned_to) {
      await query(
        `INSERT INTO notifications (employee_id, title, message)
         VALUES ($1, 'Asset Return Check-in', $2)`,
        [asset.assigned_to, `Asset ${asset.name} (${asset.asset_tag}) was successfully marked as returned.`]
      );
    }

    // Write to audit log
    await query(
      `INSERT INTO audit_logs (employee_id, action, details)
       VALUES ($1, 'ASSET_RETURN', $2)`,
      [req.user.id, `Checked in asset ${asset.name} (${asset.asset_tag}) returned by ${asset.holder_name || 'holder'}.`]
    );

    res.status(200).json({ message: `Asset ${asset.asset_tag} successfully checked-in and set to Available.` });
  } catch (error) {
    console.error('Return Asset Error:', error.message);
    res.status(500).json({ message: 'Server error checking-in returned asset.' });
  }
});

// 6. Get Overdue Return Allocations (GET /api/allocations/overdue)
router.get('/overdue', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT a.id, a.name, a.asset_tag, a.expected_return_date,
              e.name as assigned_employee_name, e.email as assigned_employee_email,
              d.name as department_name
       FROM assets a
       LEFT JOIN employees e ON a.assigned_to = e.id
       LEFT JOIN departments d ON a.department_id = d.id
       WHERE a.status = 'Allocated' 
         AND a.expected_return_date IS NOT NULL 
         AND a.expected_return_date < CURRENT_DATE
       ORDER BY a.expected_return_date ASC`
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Get Overdue Error:', error.message);
    res.status(500).json({ message: 'Server error retrieving overdue allocations.' });
  }
});

module.exports = router;
