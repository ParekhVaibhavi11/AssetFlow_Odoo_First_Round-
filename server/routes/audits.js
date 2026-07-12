const express = require('express');
const { query } = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// ==========================================
// ASSET AUDIT WORKFLOWS (Screen 8)
// ==========================================

// 1. Get All Audit Cycles (GET /api/audits)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT a.*, d.name as department_name
       FROM audits a
       LEFT JOIN departments d ON a.scope_department_id = d.id
       ORDER BY a.created_at DESC`
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Fetch Audits Error:', error.message);
    res.status(500).json({ message: 'Server error retrieving audit list.' });
  }
});

// 2. Create Audit Cycle (POST /api/audits) - Admin Only
router.post('/', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
  const { name, scope_department_id, scope_location, start_date, end_date } = req.body;

  if (!name || !start_date || !end_date) {
    return res.status(400).json({ message: 'Audit name, start date, and end date are required.' });
  }

  try {
    const result = await query(
      `INSERT INTO audits (name, scope_department_id, scope_location, start_date, end_date, status)
       VALUES ($1, $2, $3, $4, $5, 'Open')
       RETURNING *`,
      [name, scope_department_id || null, scope_location || null, start_date, end_date]
    );

    const audit = result.rows[0];

    // Log the audit launch
    await query(
      `INSERT INTO audit_logs (employee_id, action, details)
       VALUES ($1, 'AUDIT_CYCLE_CREATION', $2)`,
      [req.user.id, `Created audit cycle: ${name} (ID: ${audit.id}).`]
    );

    res.status(201).json({
      message: `Audit cycle "${name}" created successfully. Scope is now live.`,
      audit
    });
  } catch (error) {
    console.error('Create Audit Error:', error.message);
    res.status(500).json({ message: 'Server error launching audit cycle.' });
  }
});

// 3. Get Scoped Assets and Verification Status (GET /api/audits/:id/assets)
// Returns all assets that match this audit's scope + their verification status
router.get('/:id/assets', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    // Retrieve the audit scope details
    const auditResult = await query('SELECT * FROM audits WHERE id = $1', [id]);
    if (auditResult.rows.length === 0) {
      return res.status(404).json({ message: 'Audit cycle not found.' });
    }

    const audit = auditResult.rows[0];

    // Query all active assets that fall within the scope, joining any existing audit results
    let sql = `
      SELECT a.id, a.name, a.asset_tag, a.serial_number, a.location, a.condition, a.status as current_status,
             ar.status as audit_status, ar.notes as audit_notes, ar.updated_at as audited_at,
             e.name as audited_by_name
      FROM assets a
      LEFT JOIN audit_results ar ON (ar.asset_id = a.id AND ar.audit_id = $1)
      LEFT JOIN employees e ON ar.audited_by = e.id
      WHERE a.status NOT IN ('Retired', 'Disposed')
    `;
    const params = [id];
    let count = 2;

    if (audit.scope_department_id) {
      sql += ` AND a.department_id = $${count}`;
      params.push(audit.scope_department_id);
      count++;
    }

    if (audit.scope_location) {
      sql += ` AND a.location ILIKE $${count}`;
      params.push(`%${audit.scope_location}%`);
      count++;
    }

    sql += ' ORDER BY a.asset_tag ASC';

    const result = await query(sql, params);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Fetch Scoped Assets Error:', error.message);
    res.status(500).json({ message: 'Server error retrieving assets matching audit scope.' });
  }
});

// 4. Mark Asset Verification (POST /api/audits/:id/verify)
// Auditor marks asset: Verified / Missing / Damaged
router.post('/:id/verify', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { asset_id, status, notes } = req.body;

  if (!asset_id || !status) {
    return res.status(400).json({ message: 'Asset ID and audit status are required.' });
  }

  if (!['Verified', 'Missing', 'Damaged'].includes(status)) {
    return res.status(400).json({ message: 'Status must be Verified, Missing, or Damaged.' });
  }

  try {
    // 1. Verify audit is open
    const auditCheck = await query('SELECT status FROM audits WHERE id = $1', [id]);
    if (auditCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Audit cycle not found.' });
    }

    if (auditCheck.rows[0].status !== 'Open') {
      return res.status(400).json({ message: 'This audit cycle has been closed and locked.' });
    }

    // 2. Check if a record already exists in audit_results (UPSERT)
    const resultCheck = await query('SELECT id FROM audit_results WHERE audit_id = $1 AND asset_id = $2', [id, asset_id]);

    let result;
    if (resultCheck.rows.length > 0) {
      result = await query(
        `UPDATE audit_results
         SET status = $1, notes = $2, audited_by = $3, updated_at = CURRENT_TIMESTAMP
         WHERE audit_id = $4 AND asset_id = $5
         RETURNING *`,
        [status, notes || '', req.user.id, id, asset_id]
      );
    } else {
      result = await query(
        `INSERT INTO audit_results (audit_id, asset_id, status, notes, audited_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [id, asset_id, status, notes || '', req.user.id]
      );
    }

    // 3. Write details to Asset History for real-time tracking
    await query(
      `INSERT INTO asset_history (asset_id, action, action_by, notes)
       VALUES ($1, 'Audit Verify', $2, $3)`,
      [asset_id, req.user.id, `Verified during audit. Status: ${status}. Notes: ${notes || 'None'}`]
    );

    res.status(200).json({
      message: 'Asset successfully audited and logged.',
      result: result.rows[0]
    });
  } catch (error) {
    console.error('Audit Verification Error:', error.message);
    res.status(500).json({ message: 'Server error processing audit verification.' });
  }
});

// 5. Close Audit Cycle & Reconcile (PUT /api/audits/:id/close)
// Locks the cycle and updates affected assets (e.g. status sets to Lost for missing items)
router.put('/:id/close', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
  const { id } = req.params;

  try {
    const auditCheck = await query('SELECT name, status FROM audits WHERE id = $1', [id]);
    if (auditCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Audit cycle not found.' });
    }

    if (auditCheck.rows[0].status !== 'Open') {
      return res.status(400).json({ message: 'This audit cycle is already closed.' });
    }

    // 1. Reconcile missing assets: Mark as 'Lost' in assets table
    const missingAssets = await query(
      `SELECT asset_id FROM audit_results 
       WHERE audit_id = $1 AND status = 'Missing'`,
      [id]
    );

    const missingAssetIds = missingAssets.rows.map(r => r.asset_id);

    if (missingAssetIds.length > 0) {
      await query(
        `UPDATE assets 
         SET status = 'Lost' 
         WHERE id = ANY($1::int[])`,
        [missingAssetIds]
      );

      // Record state change in asset history
      for (const assetId of missingAssetIds) {
        await query(
          `INSERT INTO asset_history (asset_id, action, action_by, notes)
           VALUES ($1, 'Audit Reconcile', $2, 'Asset set to Lost after being reported Missing during audit.')`,
          [assetId, req.user.id]
        );
      }
    }

    // 2. Lock / Close the audit cycle
    await query(`UPDATE audits SET status = 'Closed' WHERE id = $1`, [id]);

    // 3. Generate summary counts for discrepancy report
    const summary = await query(
      `SELECT status, COUNT(*) as count 
       FROM audit_results 
       WHERE audit_id = $1 
       GROUP BY status`,
      [id]
    );

    const report = {
      verified: 0,
      missing: 0,
      damaged: 0
    };

    summary.rows.forEach(row => {
      if (row.status === 'Verified') report.verified = parseInt(row.count);
      if (row.status === 'Missing') report.missing = parseInt(row.count);
      if (row.status === 'Damaged') report.damaged = parseInt(row.count);
    });

    // Write audit log
    await query(
      `INSERT INTO audit_logs (employee_id, action, details)
       VALUES ($1, 'AUDIT_CYCLE_CLOSED', $2)`,
      [req.user.id, `Closed audit cycle "${auditCheck.rows[0].name}" (ID: ${id}). Reconciled ${report.missing} missing assets.`]
    );

    res.status(200).json({
      message: `Audit cycle "${auditCheck.rows[0].name}" successfully closed and reconciled.`,
      discrepancyReport: report
    });
  } catch (error) {
    console.error('Close Audit Error:', error.message);
    res.status(500).json({ message: 'Server error closing and reconciling audit cycle.' });
  }
});

module.exports = router;
