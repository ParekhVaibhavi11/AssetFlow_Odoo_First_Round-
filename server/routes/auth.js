const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkeyforassetflow';

router.post('/signup', async (req, res) => {
  const { name, password, department_id } = req.body;
  const email = req.body.email ? req.body.email.toLowerCase().trim() : '';

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required.' });
  }

  try {
    // Check if email already exists
    const existingUser = await query('SELECT id FROM employees WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Default values: role = 'Employee', status = 'Active'
    const result = await query(
      `INSERT INTO employees (name, email, password_hash, role, status, department_id)
       VALUES ($1, $2, $3, 'Employee', 'Active', $4)
       RETURNING id, name, email, role, status, department_id`,
      [name, email, passwordHash, department_id || null]
    );

    res.status(201).json({
      message: 'Account created successfully. Please login to continue.',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Signup Error:', error.message);
    res.status(500).json({ message: 'Server error during signup.' });
  }
});

// 2. Employee Login (POST /api/auth/login)
router.post('/login', async (req, res) => {
  const password = req.body.password;
  const email = req.body.email ? req.body.email.toLowerCase().trim() : '';

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    // Retrieve employee along with department name
    const result = await query(
      `SELECT e.*, d.name as department_name 
       FROM employees e 
       LEFT JOIN departments d ON e.department_id = d.id 
       WHERE e.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = result.rows[0];

    // Check status
    if (user.status !== 'Active') {
      return res.status(403).json({ message: 'Your account is deactivated. Please contact an administrator.' });
    }

    // Compare password hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Create JWT token containing user id and roles
    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department_id: user.department_id,
      department_name: user.department_name
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        department_id: user.department_id,
        department_name: user.department_name
      }
    });
  } catch (error) {
    console.error('Login Error:', error.message);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// 3. Get Current User Details (GET /api/auth/me)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT e.id, e.name, e.email, e.role, e.status, e.department_id, d.name as department_name
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE e.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Get Me Error:', error.message);
    res.status(500).json({ message: 'Server error retrieving profile details.' });
  }
});

// 4. Admin Promotes Employee (PUT /api/auth/promote)
// Purpose: Admin creates/promotes Department Heads and Asset Managers from the Employee Directory
router.put('/promote', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
  const { employee_id, role, department_id } = req.body;

  if (!employee_id || !role) {
    return res.status(400).json({ message: 'Employee ID and role are required.' });
  }

  const validRoles = ['Admin', 'Asset Manager', 'Department Head', 'Employee'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ message: 'Invalid role selection.' });
  }

  try {
    // Check if employee exists
    const employeeCheck = await query('SELECT name, role FROM employees WHERE id = $1', [employee_id]);
    if (employeeCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    const employeeName = employeeCheck.rows[0].name;
    const oldRole = employeeCheck.rows[0].role;

    // Update role (and optionally department if provided)
    let result;
    if (department_id !== undefined) {
      result = await query(
        `UPDATE employees 
         SET role = $1, department_id = $2 
         WHERE id = $3 
         RETURNING id, name, email, role, department_id`,
        [role, department_id, employee_id]
      );
    } else {
      result = await query(
        `UPDATE employees 
         SET role = $1 
         WHERE id = $2 
         RETURNING id, name, email, role, department_id`,
        [role, employee_id]
      );
    }

    // Log the action in system audit logs
    await query(
      `INSERT INTO audit_logs (employee_id, action, details)
       VALUES ($1, 'ROLE_PROMOTION', $2)`,
      [req.user.id, `Promoted ${employeeName} (ID: ${employee_id}) from ${oldRole} to ${role}.`]
    );

    res.status(200).json({
      message: `Employee ${employeeName} successfully updated to ${role}.`,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Promotion Error:', error.message);
    res.status(500).json({ message: 'Server error updating employee role.' });
  }
});

// 5. Get All Employees (GET /api/auth/employees)
// Returns full directory list (Admin/Manager use case)
router.get('/employees', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT e.id, e.name, e.email, e.role, e.status, e.department_id, d.name as department_name, e.created_at
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       ORDER BY e.name ASC`
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Get Employees Error:', error.message);
    res.status(500).json({ message: 'Server error fetching employee directory.' });
  }
});

// 6. Update Employee Status / Deactivate (PUT /api/auth/employees/:id/status)
router.put('/employees/:id/status', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['Active', 'Inactive'].includes(status)) {
    return res.status(400).json({ message: 'Valid status (Active or Inactive) is required.' });
  }

  try {
    const check = await query('SELECT name FROM employees WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    await query('UPDATE employees SET status = $1 WHERE id = $2', [status, id]);

    // Log the action
    await query(
      `INSERT INTO audit_logs (employee_id, action, details)
       VALUES ($1, 'EMPLOYEE_STATUS_CHANGE', $2)`,
      [req.user.id, `Changed status of ${check.rows[0].name} (ID: ${id}) to ${status}.`]
    );

    res.status(200).json({ message: `Employee status successfully set to ${status}.` });
  } catch (error) {
    console.error('Update Employee Status Error:', error.message);
    res.status(500).json({ message: 'Server error updating employee status.' });
  }
});

module.exports = router;
