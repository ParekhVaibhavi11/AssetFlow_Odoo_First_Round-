const express = require('express');
const { query } = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// ==========================================
// DEPARTMENTS MANAGEMENT (Tab A)
// ==========================================

// 1. Get All Departments (GET /api/org/departments)
// Anyone authenticated can view departments
router.get('/departments', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT d.id, d.name, d.parent_department_id, d.manager_id, d.status, d.created_at,
              p.name as parent_department_name,
              e.name as manager_name, e.email as manager_email
       FROM departments d
       LEFT JOIN departments p ON d.parent_department_id = p.id
       LEFT JOIN employees e ON d.manager_id = e.id
       ORDER BY d.name ASC`
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Get Departments Error:', error.message);
    res.status(500).json({ message: 'Server error retrieving departments list.' });
  }
});

// 2. Create Department (POST /api/org/departments) - Admin Only
router.post('/departments', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
  const { name, parent_department_id, manager_id, status } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Department name is required.' });
  }

  try {
    // Validate parent department if provided
    if (parent_department_id) {
      const parentCheck = await query('SELECT id FROM departments WHERE id = $1', [parent_department_id]);
      if (parentCheck.rows.length === 0) {
        return res.status(400).json({ message: 'Invalid parent department selection.' });
      }
    }

    // Validate manager if provided
    if (manager_id) {
      const managerCheck = await query('SELECT id, name FROM employees WHERE id = $1', [manager_id]);
      if (managerCheck.rows.length === 0) {
        return res.status(400).json({ message: 'Selected manager employee does not exist.' });
      }
    }

    const result = await query(
      `INSERT INTO departments (name, parent_department_id, manager_id, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, parent_department_id, manager_id, status`,
      [name, parent_department_id || null, manager_id || null, status || 'Active']
    );

    // Write audit log
    await query(
      `INSERT INTO audit_logs (employee_id, action, details)
       VALUES ($1, 'DEPARTMENT_CREATION', $2)`,
      [req.user.id, `Created department: ${name} (ID: ${result.rows[0].id}).`]
    );

    res.status(201).json({
      message: `Department "${name}" created successfully.`,
      department: result.rows[0]
    });
  } catch (error) {
    console.error('Create Department Error:', error.message);
    res.status(500).json({ message: 'Server error creating department.' });
  }
});

// 3. Update Department (PUT /api/org/departments/:id) - Admin Only
router.put('/departments/:id', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
  const { id } = req.params;
  const { name, parent_department_id, manager_id, status } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Department name is required.' });
  }

  if (parent_department_id && parseInt(parent_department_id) === parseInt(id)) {
    return res.status(400).json({ message: 'A department cannot be its own parent.' });
  }

  try {
    // Check if department exists
    const check = await query('SELECT id, name FROM departments WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Department not found.' });
    }

    // Validate parent department
    if (parent_department_id) {
      const parentCheck = await query('SELECT id FROM departments WHERE id = $1', [parent_department_id]);
      if (parentCheck.rows.length === 0) {
        return res.status(400).json({ message: 'Invalid parent department selection.' });
      }
    }

    // Validate manager
    if (manager_id) {
      const managerCheck = await query('SELECT id FROM employees WHERE id = $1', [manager_id]);
      if (managerCheck.rows.length === 0) {
        return res.status(400).json({ message: 'Selected manager employee does not exist.' });
      }
    }

    const result = await query(
      `UPDATE departments
       SET name = $1, parent_department_id = $2, manager_id = $3, status = $4
       WHERE id = $5
       RETURNING id, name, parent_department_id, manager_id, status`,
      [name, parent_department_id || null, manager_id || null, status || 'Active', id]
    );

    // Update the employee directory as well if they are selected as a manager (auto promote role to Department Head if needed)
    if (manager_id) {
      await query(
        `UPDATE employees 
         SET role = 'Department Head' 
         WHERE id = $1 AND role = 'Employee'`,
        [manager_id]
      );
    }

    // Write audit log
    await query(
      `INSERT INTO audit_logs (employee_id, action, details)
       VALUES ($1, 'DEPARTMENT_UPDATE', $2)`,
      [req.user.id, `Updated department: ${check.rows[0].name} (ID: ${id}) to name "${name}", status "${status}".`]
    );

    res.status(200).json({
      message: `Department "${name}" updated successfully.`,
      department: result.rows[0]
    });
  } catch (error) {
    console.error('Update Department Error:', error.message);
    res.status(500).json({ message: 'Server error updating department.' });
  }
});


// ==========================================
// ASSET CATEGORY MANAGEMENT (Tab B)
// ==========================================

// 1. Get All Categories (GET /api/org/categories)
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM asset_categories ORDER BY name ASC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Get Categories Error:', error.message);
    res.status(500).json({ message: 'Server error retrieving asset categories.' });
  }
});

// 2. Create Category (POST /api/org/categories) - Admin Only
router.post('/categories', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
  const { name, custom_fields } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Category name is required.' });
  }

  // Validate custom_fields format (must be JSON array)
  let customFieldsParsed = '[]';
  if (custom_fields) {
    if (!Array.isArray(custom_fields)) {
      return res.status(400).json({ message: 'Custom fields schema must be an array.' });
    }
    // Check fields contain name and type
    for (const field of custom_fields) {
      if (!field.name || !field.type) {
        return res.status(400).json({ message: 'Each custom field must have a "name" and a "type".' });
      }
      if (!['text', 'number', 'date', 'boolean'].includes(field.type)) {
        return res.status(400).json({ message: 'Invalid custom field type. Allowed: text, number, date, boolean.' });
      }
    }
    customFieldsParsed = JSON.stringify(custom_fields);
  }

  try {
    // Check uniqueness
    const categoryCheck = await query('SELECT id FROM asset_categories WHERE name = $1', [name]);
    if (categoryCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Category with this name already exists.' });
    }

    const result = await query(
      `INSERT INTO asset_categories (name, custom_fields)
       VALUES ($1, $2::jsonb)
       RETURNING id, name, custom_fields`,
      [name, customFieldsParsed]
    );

    // Log action
    await query(
      `INSERT INTO audit_logs (employee_id, action, details)
       VALUES ($1, 'CATEGORY_CREATION', $2)`,
      [req.user.id, `Created asset category: ${name} (ID: ${result.rows[0].id}).`]
    );

    res.status(201).json({
      message: `Category "${name}" created successfully.`,
      category: result.rows[0]
    });
  } catch (error) {
    console.error('Create Category Error:', error.message);
    res.status(500).json({ message: 'Server error creating category.' });
  }
});

// 3. Update Category (PUT /api/org/categories/:id) - Admin Only
router.put('/categories/:id', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
  const { id } = req.params;
  const { name, custom_fields } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Category name is required.' });
  }

  // Validate custom_fields format
  let customFieldsParsed = '[]';
  if (custom_fields) {
    if (!Array.isArray(custom_fields)) {
      return res.status(400).json({ message: 'Custom fields schema must be an array.' });
    }
    for (const field of custom_fields) {
      if (!field.name || !field.type) {
        return res.status(400).json({ message: 'Each custom field must have a name and a type.' });
      }
      if (!['text', 'number', 'date', 'boolean'].includes(field.type)) {
        return res.status(400).json({ message: 'Invalid custom field type.' });
      }
    }
    customFieldsParsed = JSON.stringify(custom_fields);
  }

  try {
    const check = await query('SELECT id, name FROM asset_categories WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found.' });
    }

    // Check if new name collides with another category
    const collisionCheck = await query('SELECT id FROM asset_categories WHERE name = $1 AND id != $2', [name, id]);
    if (collisionCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Another category with this name already exists.' });
    }

    const result = await query(
      `UPDATE asset_categories
       SET name = $1, custom_fields = $2::jsonb
       WHERE id = $3
       RETURNING id, name, custom_fields`,
      [name, customFieldsParsed, id]
    );

    // Log action
    await query(
      `INSERT INTO audit_logs (employee_id, action, details)
       VALUES ($1, 'CATEGORY_UPDATE', $2)`,
      [req.user.id, `Updated asset category: ${check.rows[0].name} (ID: ${id}) to name "${name}".`]
    );

    res.status(200).json({
      message: `Category "${name}" updated successfully.`,
      category: result.rows[0]
    });
  } catch (error) {
    console.error('Update Category Error:', error.message);
    res.status(500).json({ message: 'Server error updating category.' });
  }
});

module.exports = router;
