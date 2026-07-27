const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'sahay_disaster_portal_secret_key_2026';

// -------------------------------------------------------------
// POST /api/auth/register
// Inserts into 'users' table AND separate 'login' table
// -------------------------------------------------------------
router.post('/register', async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, phone, email, password, role, district, panchayat, designation, departmentId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Full Name is required' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ error: 'Mobile Phone Number is required' });
    }
    if (!password || password.trim().length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const validRoles = ['citizen', 'rescue_team', 'collector'];
    const userRole = (role || 'citizen').toLowerCase();
    if (!validRoles.includes(userRole)) {
      return res.status(400).json({ error: `Invalid role specified. Must be one of: ${validRoles.join(', ')}` });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const userEmail = email ? email.trim().toLowerCase() : null;

    // Check if phone or login credential already exists
    const existingCheck = await client.query(
      'SELECT id FROM users WHERE phone = $1 OR (email IS NOT NULL AND LOWER(email) = $2)',
      [cleanPhone, userEmail || cleanPhone]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Mobile number or Email is already registered in SAHAY portal. Please Login.' });
    }

    // Begin DB Transaction
    await client.query('BEGIN');

    // Hash Password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password.trim(), salt);

    // 1. Insert into 'users' profile table (storing password_hash as well)
    const insertUserQuery = `
      INSERT INTO users (name, phone, email, password_hash, role, district, panchayat, designation, department_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, name, phone, email, role, district, panchayat, designation, department_id, created_at;
    `;
    const userValues = [
      name.trim(),
      cleanPhone,
      userEmail,
      passwordHash,
      userRole,
      district || 'Idukki',
      panchayat ? panchayat.trim() : null,
      designation ? designation.trim() : null,
      departmentId ? departmentId.trim() : null
    ];

    const userResult = await client.query(insertUserQuery, userValues);
    const newUser = userResult.rows[0];

    // 2. Insert into separate 'login' credentials table
    const insertLoginQuery = `
      INSERT INTO login (user_id, phone_or_email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (phone_or_email) DO UPDATE SET password_hash = EXCLUDED.password_hash
      RETURNING id;
    `;
    await client.query(insertLoginQuery, [newUser.id, cleanPhone, passwordHash, userRole]);

    // If email provided and different from cleanPhone, add email handle
    if (userEmail && userEmail !== cleanPhone) {
      try {
        await client.query(
          `INSERT INTO login (user_id, phone_or_email, password_hash, role) VALUES ($1, $2, $3, $4) ON CONFLICT (phone_or_email) DO NOTHING;`,
          [newUser.id, userEmail, passwordHash, userRole]
        );
      } catch (e) {
        // ignore duplicate handle
      }
    }

    // Commit Transaction
    await client.query('COMMIT');

    // Generate Token
    const token = jwt.sign(
      { id: newUser.id, role: newUser.role, phone: newUser.phone },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    delete newUser.password_hash;

    return res.status(201).json({
      message: 'Registration successful!',
      user: newUser,
      token
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Register Error:', error);
    return res.status(500).json({ error: 'Server error during registration: ' + error.message });
  } finally {
    client.release();
  }
});

// -------------------------------------------------------------
// POST /api/auth/login
// Smart lookup: Checks separate 'login' table & 'users' table
// -------------------------------------------------------------
router.post('/login', async (req, res) => {
  try {
    const { phoneOrEmail, password, role } = req.body;

    if (!phoneOrEmail || !phoneOrEmail.trim()) {
      return res.status(400).json({ error: 'Mobile Phone or Email is required' });
    }
    if (!password || !password.trim()) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const inputVal = phoneOrEmail.trim();
    const cleanPhone = inputVal.replace(/\D/g, '');

    // 1. Primary Lookup: JOIN 'login' table with 'users'
    const primaryQuery = `
      SELECT l.id AS login_id, l.password_hash AS login_pass_hash, l.role AS login_role, l.last_login,
             u.id, u.name, u.phone, u.email, u.password_hash AS user_pass_hash, u.role, u.district, u.panchayat, u.designation, u.department_id, u.created_at
      FROM login l
      JOIN users u ON l.user_id = u.id
      WHERE l.phone_or_email = $1 OR l.phone_or_email = $2 OR u.phone = $1 OR u.phone = $2 OR (u.email IS NOT NULL AND LOWER(u.email) = LOWER($2));
    `;

    let result = await pool.query(primaryQuery, [cleanPhone, inputVal]);
    let targetRow = null;

    if (result.rows.length > 0) {
      targetRow = {
        ...result.rows[0],
        effective_pass_hash: result.rows[0].login_pass_hash || result.rows[0].user_pass_hash
      };
    } else {
      // 2. Fallback Lookup: Query 'users' table directly (for pre-existing rows before login table creation)
      const fallbackQuery = `
        SELECT id, name, phone, email, password_hash AS effective_pass_hash, role, district, panchayat, designation, department_id, created_at
        FROM users
        WHERE phone = $1 OR phone = $2 OR (email IS NOT NULL AND LOWER(email) = LOWER($2));
      `;

      const fallbackResult = await pool.query(fallbackQuery, [cleanPhone, inputVal]);

      if (fallbackResult.rows.length > 0) {
        const u = fallbackResult.rows[0];
        targetRow = {
          login_id: null,
          ...u
        };

        // Auto-migrate credentials into 'login' table for smooth future logins
        if (u.effective_pass_hash) {
          try {
            await pool.query(
              `INSERT INTO login (user_id, phone_or_email, password_hash, role) VALUES ($1, $2, $3, $4) ON CONFLICT (phone_or_email) DO NOTHING;`,
              [u.id, u.phone, u.effective_pass_hash, u.role]
            );
          } catch (e) {
            // Ignore
          }
        }
      }
    }

    if (!targetRow) {
      return res.status(404).json({ error: 'No registered user found with these login credentials. Please register first.' });
    }

    // Role Validation (Case Insensitive)
    if (role && role !== 'all') {
      const targetRole = role.toLowerCase();
      if (targetRow.role.toLowerCase() !== targetRole) {
        return res.status(403).json({
          error: `Account found, but registered under the '${targetRow.role.toUpperCase()}' role. Please select the correct tab.`
        });
      }
    }

    if (!targetRow.effective_pass_hash) {
      return res.status(400).json({ error: 'Account exists without password. Please register or reset password.' });
    }

    // Compare Password Hash
    const isMatch = await bcrypt.compare(password.trim(), targetRow.effective_pass_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password. Please check your credentials and try again.' });
    }

    // Update last_login timestamp if login_id exists
    if (targetRow.login_id) {
      await pool.query('UPDATE login SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [targetRow.login_id]);
    }

    // Build User Profile
    const userProfile = {
      id: targetRow.id,
      name: targetRow.name,
      phone: targetRow.phone,
      email: targetRow.email,
      role: targetRow.role,
      district: targetRow.district,
      panchayat: targetRow.panchayat,
      designation: targetRow.designation,
      departmentId: targetRow.department_id,
      lastLogin: new Date(),
      createdAt: targetRow.created_at
    };

    const token = jwt.sign(
      { id: userProfile.id, role: userProfile.role, phone: userProfile.phone },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: `Welcome back, ${userProfile.name}!`,
      user: userProfile,
      token
    });

  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ error: 'Server error during login authentication: ' + error.message });
  }
});

// -------------------------------------------------------------
// POST /api/auth/reset-password
// Resets user password in PostgreSQL database
// -------------------------------------------------------------
router.post('/reset-password', async (req, res) => {
  try {
    const { phoneOrEmail, newPassword } = req.body;

    if (!phoneOrEmail || !phoneOrEmail.trim()) {
      return res.status(400).json({ error: 'Registered Mobile Phone or Email is required' });
    }
    if (!newPassword || newPassword.trim().length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const inputVal = phoneOrEmail.trim();
    const cleanPhone = inputVal.replace(/\D/g, '');

    // Lookup user in users table
    const userResult = await pool.query(
      'SELECT id, name FROM users WHERE phone = $1 OR phone = $2 OR (email IS NOT NULL AND LOWER(email) = LOWER($2))',
      [cleanPhone, inputVal]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'No account found with this phone number or email address.' });
    }

    const user = userResult.rows[0];

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword.trim(), salt);

    // Update password_hash in users table
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, user.id]);

    // Update password_hash in login table (if row exists)
    await pool.query('UPDATE login SET password_hash = $1 WHERE user_id = $2', [passwordHash, user.id]);

    return res.status(200).json({
      message: `Password reset successfully for ${user.name}! Please sign in with your new password.`
    });

  } catch (error) {
    console.error('Reset Password Error:', error);
    return res.status(500).json({ error: 'Server error during password reset: ' + error.message });
  }
});

// -------------------------------------------------------------
// GET /api/auth/me (Current Session Profile)
// -------------------------------------------------------------
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const result = await pool.query(
      'SELECT id, name, phone, email, role, district, panchayat, designation, department_id, created_at FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ user: result.rows[0] });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

module.exports = router;
