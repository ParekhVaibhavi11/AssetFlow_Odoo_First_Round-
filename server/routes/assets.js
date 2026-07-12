const express = require('express');
const { query } = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();


// 1. Get All Assets with Search and Filters (GET /api/assets)
router.get('/', authenticateToken, async (req, res) => {
  const { search, category_id, status, department_id, condition, shared_bookable } = req.query;

  let queryText = `
    SELECT a.*, c.name as category_name, d.name as department_name, e.name as assigned_employee_name
    FROM assets a
    LEFT JOIN asset_categories c ON a.category_id = c.id
    LEFT JOIN departments d ON a.department_id = d.id
    LEFT JOIN employees e ON a.assigned_to = e.id
    WHERE 1=1
  `;
  const queryParams = [];
  let paramCount = 1;

  // Search keyword filters name, tag, serial number, or location
  if (search) {
    queryText += ` AND (a.name ILIKE $${paramCount} OR a.asset_tag ILIKE $${paramCount} OR a.serial_number ILIKE $${paramCount} OR a.location ILIKE $${paramCount})`;
    queryParams.push(`%${search}%`);
    paramCount++;
  }

  // Category filter
  if (category_id) {
    queryText += ` AND a.category_id = $${paramCount}`;
    queryParams.push(parseInt(category_id));
    paramCount++;
  }

  // Status filter
  if (status) {
    queryText += ` AND a.status = $${paramCount}`;
    queryParams.push(status);
    paramCount++;
  }

  // Department filter
  if (department_id) {
    queryText += ` AND a.department_id = $${paramCount}`;
    queryParams.push(parseInt(department_id));
    paramCount++;
  }

  // Condition filter
  if (condition) {
    queryText += ` AND a.condition = $${paramCount}`;
    queryParams.push(condition);
    paramCount++;
  }

  // Shared/Bookable filter
  if (shared_bookable !== undefined) {
    queryText += ` AND a.shared_bookable = $${paramCount}`;
    queryParams.push(shared_bookable === 'true');
    paramCount++;
  }

  queryText += ' ORDER BY a.id DESC';

  try {
    const result = await query(queryText, queryParams);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Fetch Assets Error:', error.message);
    res.status(500).json({ message: 'Server error retrieving assets directory.' });
  }
});

// 2. Register New Asset (POST /api/assets) - Asset Manager & Admin Only
router.post('/', authenticateToken, authorizeRoles('Admin', 'Asset Manager'), async (req, res) => {
  const {
    name,
    category_id,
    serial_number,
    acquisition_date,
    acquisition_cost,
    condition,
    location,
    shared_bookable,
    department_id,
    assigned_to,
    custom_attributes,
    photo_url
  } = req.body;

  if (!name || !category_id || !acquisition_date) {
    return res.status(400).json({ message: 'Asset name, category, and acquisition date are required.' });
  }

  try {
    // Validate category existence
    const catCheck = await query('SELECT custom_fields FROM asset_categories WHERE id = $1', [category_id]);
    if (catCheck.rows.length === 0) {
      return res.status(400).json({ message: 'Selected asset category does not exist.' });
    }

    // Auto-generate Asset Tag (e.g., AF-0001)
    const lastAsset = await query('SELECT asset_tag FROM assets ORDER BY id DESC LIMIT 1');
    let nextTagNum = 1;
    if (lastAsset.rows.length > 0) {
      const match = lastAsset.rows[0].asset_tag.match(/AF-(\d+)/);
      if (match) {
        nextTagNum = parseInt(match[1]) + 1;
      }
    }
    const asset_tag = `AF-${String(nextTagNum).padStart(4, '0')}`;

    // Validate and clean custom attributes according to category field definitions
    const customFieldsConfig = catCheck.rows[0].custom_fields || [];
    const sanitizedAttributes = {};
    if (custom_attributes) {
      for (const field of customFieldsConfig) {
        const val = custom_attributes[field.name];
        if (field.required && (val === undefined || val === null || val === '')) {
          return res.status(400).json({ message: `Custom attribute "${field.name}" is required for this category.` });
        }
        if (val !== undefined && val !== null) {
          sanitizedAttributes[field.name] = val;
        }
      }
    }

    // Default status: Available
    const defaultStatus = 'Available';

    const result = await query(
      `INSERT INTO assets (
        name, category_id, asset_tag, serial_number, acquisition_date, 
        acquisition_cost, condition, location, shared_bookable, status, 
        department_id, assigned_to, custom_attributes, photo_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14)
      RETURNING *`,
      [
        name,
        category_id,
        asset_tag,
        serial_number || null,
        acquisition_date,
        acquisition_cost || 0.00,
        condition || 'Excellent',
        location || null,
        shared_bookable || false,
        defaultStatus,
        department_id || null,
        assigned_to || null,
        JSON.stringify(sanitizedAttributes),
        photo_url || null
      ]
    );

    const asset = result.rows[0];

    // Log registration action to history
    await query(
      `INSERT INTO asset_history (asset_id, action, action_by, notes)
       VALUES ($1, 'Registration', $2, 'Asset registered on system.')`,
      [asset.id, req.user.id]
    );

    // Write audit log
    await query(
      `INSERT INTO audit_logs (employee_id, action, details)
       VALUES ($1, 'ASSET_REGISTRATION', $2)`,
      [req.user.id, `Registered asset: ${name} (Tag: ${asset_tag}).`]
    );

    res.status(201).json({
      message: `Asset "${name}" successfully registered under tag ${asset_tag}.`,
      asset
    });
  } catch (error) {
    console.error('Register Asset Error:', error.message);
    res.status(500).json({ message: 'Server error registering asset.' });
  }
});

// 3. Get Asset Details (GET /api/assets/:id)
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(
      `SELECT a.*, c.name as category_name, c.custom_fields as category_fields_config,
              d.name as department_name, e.name as assigned_employee_name, e.email as assigned_employee_email
       FROM assets a
       LEFT JOIN asset_categories c ON a.category_id = c.id
       LEFT JOIN departments d ON a.department_id = d.id
       LEFT JOIN employees e ON a.assigned_to = e.id
       WHERE a.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Asset not found.' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Get Asset Details Error:', error.message);
    res.status(500).json({ message: 'Server error retrieving asset details.' });
  }
});

// 4. Get Asset History Logs (GET /api/assets/:id/history)
router.get('/:id/history', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    // Retrieve past allocation changes and maintenance operations
    const result = await query(
      `SELECT h.id, h.action, h.notes, h.created_at, e.name as action_by_name
       FROM asset_history h
       LEFT JOIN employees e ON h.action_by = e.id
       WHERE h.asset_id = $1
       ORDER BY h.created_at DESC`,
      [id]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Get Asset History Error:', error.message);
    res.status(500).json({ message: 'Server error retrieving asset log history.' });
  }
});

// 5. Update Asset parameters (PUT /api/assets/:id) - Managers & Admin Only
router.put('/:id', authenticateToken, authorizeRoles('Admin', 'Asset Manager'), async (req, res) => {
  const { id } = req.params;
  const {
    name,
    serial_number,
    condition,
    location,
    shared_bookable,
    status,
    department_id,
    assigned_to,
    custom_attributes,
    photo_url
  } = req.body;

  try {
    // Retrieve current asset status
    const assetCheck = await query('SELECT * FROM assets WHERE id = $1', [id]);
    if (assetCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Asset not found.' });
    }

    const currentAsset = assetCheck.rows[0];

    // Build update parameters query
    const fieldsToUpdate = [];
    const queryParams = [];
    let count = 1;

    if (name) { fieldsToUpdate.push(`name = $${count}`); queryParams.push(name); count++; }
    if (serial_number !== undefined) { fieldsToUpdate.push(`serial_number = $${count}`); queryParams.push(serial_number); count++; }
    if (condition) { fieldsToUpdate.push(`condition = $${count}`); queryParams.push(condition); count++; }
    if (location !== undefined) { fieldsToUpdate.push(`location = $${count}`); queryParams.push(location); count++; }
    if (shared_bookable !== undefined) { fieldsToUpdate.push(`shared_bookable = $${count}`); queryParams.push(shared_bookable); count++; }
    if (status) { fieldsToUpdate.push(`status = $${count}`); queryParams.push(status); count++; }
    if (department_id !== undefined) { fieldsToUpdate.push(`department_id = $${count}`); queryParams.push(department_id); count++; }
    if (assigned_to !== undefined) { fieldsToUpdate.push(`assigned_to = $${count}`); queryParams.push(assigned_to); count++; }
    if (custom_attributes) { fieldsToUpdate.push(`custom_attributes = $${count}::jsonb`); queryParams.push(JSON.stringify(custom_attributes)); count++; }
    if (photo_url !== undefined) { fieldsToUpdate.push(`photo_url = $${count}`); queryParams.push(photo_url); count++; }

    if (fieldsToUpdate.length === 0) {
      return res.status(400).json({ message: 'No fields provided to update.' });
    }

    queryParams.push(id);
    const updateQuery = `
      UPDATE assets 
      SET ${fieldsToUpdate.join(', ')} 
      WHERE id = $${count} 
      RETURNING *
    `;

    const result = await query(updateQuery, queryParams);
    const updatedAsset = result.rows[0];

    // Log to history if status/condition/assignment changes
    const historyNotes = [];
    if (status && status !== currentAsset.status) historyNotes.push(`Status changed from "${currentAsset.status}" to "${status}".`);
    if (condition && condition !== currentAsset.condition) historyNotes.push(`Condition updated from "${currentAsset.condition}" to "${condition}".`);
    if (assigned_to !== undefined && assigned_to !== currentAsset.assigned_to) {
      historyNotes.push(assigned_to ? 'Asset assigned to a new user.' : 'Asset unassigned.');
    }

    if (historyNotes.length > 0) {
      await query(
        `INSERT INTO asset_history (asset_id, action, action_by, notes)
         VALUES ($1, 'Update', $2, $3)`,
        [id, req.user.id, historyNotes.join(' ')]
      );
    }

    // Write audit log
    await query(
      `INSERT INTO audit_logs (employee_id, action, details)
       VALUES ($1, 'ASSET_UPDATE', $2)`,
      [req.user.id, `Updated asset properties for ${updatedAsset.name} (Tag: ${updatedAsset.asset_tag}).`]
    );

    res.status(200).json({
      message: 'Asset updated successfully.',
      asset: updatedAsset
    });
  } catch (error) {
    console.error('Update Asset Error:', error.message);
    res.status(500).json({ message: 'Server error updating asset parameters.' });
  }
});

module.exports = router;
