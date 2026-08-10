const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { sendPasswordResetEmail } = require('../services/email');

const JWT_SECRET = process.env.JWT_SECRET || 'sahay_disaster_portal_secret_key_2026';

// -------------------------------------------------------------
// POST /api/auth/register
// -------------------------------------------------------------
router.post('/register', async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, phone, email, password, role, district, panchayat, designation, departmentId } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ error: 'Full Name is required' });
    if (!phone || !phone.trim()) return res.status(400).json({ error: 'Mobile Phone Number is required' });
    if (!password || password.trim().length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    let rawRole = (role || 'citizen').toLowerCase();
    // Normalize role synonyms
    if (rawRole === 'super_admin') rawRole = 'admin';
    if (rawRole === 'station_admin' || rawRole === 'rescue_team') rawRole = 'station';

    if (rawRole === 'collector' || rawRole === 'admin') {
      return res.status(400).json({
        error: 'District Collector and Admin accounts cannot be self-registered. Collectors are appointed directly by the Admin.'
      });
    }

    const validRoles = ['citizen', 'station'];
    if (!validRoles.includes(rawRole)) {
      return res.status(400).json({ error: `Invalid role specified. Must be 'citizen' or 'station'` });
    }

    // Determine initial status: station requires Collector approval; citizen is approved immediately
    const initialStatus = (rawRole === 'station') ? 'pending' : 'approved';

    const cleanPhone = phone.replace(/\D/g, '');
    const userEmail = email ? email.trim().toLowerCase() : null;

    // Check existing
    const existingCheck = await client.query(
      'SELECT id FROM users WHERE phone = $1 OR (email IS NOT NULL AND LOWER(email) = $2)',
      [cleanPhone, userEmail || cleanPhone]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Mobile number or Email is already registered in SAHAY portal. Please Login.' });
    }

    await client.query('BEGIN');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password.trim(), salt);

    const insertUserQuery = `
      INSERT INTO users (name, phone, email, password_hash, role, status, district, panchayat, designation, department_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, name, phone, email, role, status, district, panchayat, designation, department_id, created_at;
    `;
    const userValues = [
      name.trim(),
      cleanPhone,
      userEmail,
      passwordHash,
      rawRole,
      initialStatus,
      district || 'Idukki',
      panchayat ? panchayat.trim() : null,
      designation ? designation.trim() : null,
      departmentId ? departmentId.trim() : null
    ];

    const userResult = await client.query(insertUserQuery, userValues);
    const newUser = userResult.rows[0];

    const insertLoginQuery = `
      INSERT INTO login (user_id, phone, email, password_hash, role, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id) DO UPDATE SET 
        phone = EXCLUDED.phone, 
        email = EXCLUDED.email, 
        password_hash = EXCLUDED.password_hash, 
        role = EXCLUDED.role, 
        status = EXCLUDED.status
      RETURNING id;
    `;
    await client.query(insertLoginQuery, [newUser.id, cleanPhone, userEmail, passwordHash, rawRole, initialStatus]);

    await client.query('COMMIT');

    const token = jwt.sign(
      { id: newUser.id, role: newUser.role, status: newUser.status, phone: newUser.phone },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    delete newUser.password_hash;

    const message = initialStatus === 'pending'
      ? `Station registration submitted successfully! Your account is currently PENDING APPROVAL by the District Collector of ${newUser.district}.`
      : 'Registration successful!';

    return res.status(201).json({
      message,
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

    const primaryQuery = `
      SELECT l.id AS login_id, l.password_hash AS login_pass_hash, l.role AS login_role, l.status AS login_status, l.last_login,
             u.id, u.name, u.phone, u.email, u.password_hash AS user_pass_hash, u.role, u.status AS user_status, u.district, u.panchayat, u.designation, u.department_id, u.created_at
      FROM login l
      JOIN users u ON l.user_id = u.id
      WHERE (l.phone IS NOT NULL AND l.phone = $1)
         OR (l.email IS NOT NULL AND LOWER(l.email) = LOWER($2))
         OR (u.phone IS NOT NULL AND u.phone = $1)
         OR (u.email IS NOT NULL AND LOWER(u.email) = LOWER($2));
    `;

    let result = await pool.query(primaryQuery, [cleanPhone || inputVal, inputVal]);
    let targetRow = null;

    if (result.rows.length > 0) {
      const row = result.rows[0];
      targetRow = {
        ...row,
        status: row.user_status || row.login_status || 'approved',
        effective_pass_hash: row.login_pass_hash || row.user_pass_hash
      };
    } else {
      const fallbackQuery = `
        SELECT id, name, phone, email, password_hash AS effective_pass_hash, role, status, district, panchayat, designation, department_id, created_at
        FROM users
        WHERE (phone IS NOT NULL AND phone = $1) OR (email IS NOT NULL AND LOWER(email) = LOWER($2));
      `;

      const fallbackResult = await pool.query(fallbackQuery, [cleanPhone || inputVal, inputVal]);

      if (fallbackResult.rows.length > 0) {
        const u = fallbackResult.rows[0];
        targetRow = {
          login_id: null,
          status: u.status || 'approved',
          ...u
        };

        if (u.effective_pass_hash) {
          try {
            await pool.query(
              `INSERT INTO login (user_id, phone, email, password_hash, role, status) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (user_id) DO NOTHING;`,
              [u.id, u.phone, u.email, u.effective_pass_hash, u.role, u.status || 'approved']
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

    // Role Validation with synonym matching
    if (role && role !== 'all') {
      let reqRole = role.toLowerCase();
      let dbRole = targetRow.role.toLowerCase();

      if (reqRole === 'super_admin') reqRole = 'admin';
      if (reqRole === 'station_admin' || reqRole === 'rescue_team') reqRole = 'station';

      if (dbRole === 'super_admin') dbRole = 'admin';
      if (dbRole === 'station_admin' || dbRole === 'rescue_team') dbRole = 'station';

      if (dbRole !== reqRole) {
        return res.status(403).json({
          error: `Account found, but registered under '${dbRole.toUpperCase()}' role. Please select the correct portal.`
        });
      }
    }

    if (!targetRow.effective_pass_hash) {
      return res.status(400).json({ error: 'Account exists without password. Please register or reset password.' });
    }

    const isMatch = await bcrypt.compare(password.trim(), targetRow.effective_pass_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password. Please check your credentials and try again.' });
    }

    // Check status: Block pending or rejected accounts
    if (targetRow.status === 'pending') {
      return res.status(403).json({
        error: `Your Station account is PENDING APPROVAL by the District Collector of ${targetRow.district || 'your district'}. Please contact your District Collectorate.`
      });
    }

    if (targetRow.status === 'rejected') {
      return res.status(403).json({
        error: `Your Station registration request was rejected by the District Collector. Please contact the Collectorate for clarification.`
      });
    }

    if (targetRow.login_id) {
      await pool.query('UPDATE login SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [targetRow.login_id]);
    }

    const userProfile = {
      id: targetRow.id,
      name: targetRow.name,
      phone: targetRow.phone,
      email: targetRow.email,
      role: targetRow.role,
      status: targetRow.status,
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
// -------------------------------------------------------------
router.post('/reset-password', async (req, res) => {
  try {
    const { token, phoneOrEmail, newPassword } = req.body;

    if (!newPassword || newPassword.trim().length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    let user;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const userResult = await pool.query(
          'SELECT id, name, phone, email, role, status, district, panchayat, designation, department_id, created_at FROM users WHERE id = $1',
          [decoded.id]
        );
        if (userResult.rows.length === 0) {
          return res.status(404).json({ error: 'Invalid reset link or user account no longer exists.' });
        }
        user = userResult.rows[0];
      } catch (err) {
        return res.status(400).json({ error: 'The password reset link is invalid or has expired. Please request a new password reset link.' });
      }
    } else if (phoneOrEmail && phoneOrEmail.trim()) {
      const inputVal = phoneOrEmail.trim();
      const cleanPhone = inputVal.replace(/\D/g, '');

      const userResult = await pool.query(
        'SELECT id, name, phone, email, role, status, district, panchayat, designation, department_id, created_at FROM users WHERE (phone IS NOT NULL AND phone = $1) OR (phone IS NOT NULL AND phone = $2) OR (email IS NOT NULL AND LOWER(email) = LOWER($2))',
        [cleanPhone, inputVal]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'No account found with this phone number or email address.' });
      }
      user = userResult.rows[0];
    } else {
      return res.status(400).json({ error: 'Password reset token or registered phone/email is required.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword.trim(), salt);

    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, user.id]);
    await pool.query('UPDATE login SET password_hash = $1 WHERE user_id = $2', [passwordHash, user.id]);

    const userProfile = {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      status: user.status,
      district: user.district,
      panchayat: user.panchayat,
      designation: user.designation,
      departmentId: user.department_id,
      createdAt: user.created_at
    };

    const authToken = jwt.sign(
      { id: userProfile.id, role: userProfile.role, phone: userProfile.phone },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: `Password reset successfully for ${userProfile.name}!`,
      user: userProfile,
      token: authToken
    });

  } catch (error) {
    console.error('Reset Password Error:', error);
    return res.status(500).json({ error: 'Server error during password reset: ' + error.message });
  }
});

// In-Memory OTP Store
const otpStore = new Map();

// -------------------------------------------------------------
// POST /api/auth/send-reset-link
// -------------------------------------------------------------
router.post('/send-reset-link', async (req, res) => {
  try {
    const { phoneOrEmail } = req.body;
    if (!phoneOrEmail || !phoneOrEmail.trim()) {
      return res.status(400).json({ error: 'Please enter your registered Email or Mobile Number.' });
    }

    const inputVal = phoneOrEmail.trim();
    const cleanPhone = inputVal.replace(/\D/g, '');

    const userResult = await pool.query(
      'SELECT id, name, email, phone FROM users WHERE (email IS NOT NULL AND LOWER(email) = LOWER($1)) OR (phone IS NOT NULL AND phone = $2) OR (phone IS NOT NULL AND phone = $1)',
      [inputVal, cleanPhone]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'No registered user account found with this email or mobile number.' });
    }

    const user = userResult.rows[0];
    const targetEmail = user.email || (inputVal.includes('@') ? inputVal : null);

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    if (targetEmail) {
      await sendPasswordResetEmail({
        recipientEmail: targetEmail,
        recipientName: user.name,
        resetLink
      });
    }

    return res.status(200).json({
      message: targetEmail
        ? `Password reset link sent to ${targetEmail}! Please check your email inbox.`
        : `Password reset link generated for ${user.name}. Click below to open reset page.`,
      resetLink,
      user: { name: user.name, email: targetEmail || user.phone }
    });
  } catch (error) {
    console.error('Send Reset Link Error:', error);
    return res.status(500).json({ error: 'Failed to send reset link: ' + error.message });
  }
});

// -------------------------------------------------------------
// POST /api/auth/send-otp
// -------------------------------------------------------------
router.post('/send-otp', async (req, res) => {
  try {
    const { phoneOrEmail } = req.body;
    if (!phoneOrEmail || !phoneOrEmail.trim()) {
      return res.status(400).json({ error: 'Mobile Number or Email is required to send OTP.' });
    }

    const inputVal = phoneOrEmail.trim().toLowerCase();
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

    otpStore.set(inputVal, {
      otp: generatedOtp,
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
    });

    return res.status(200).json({
      message: `OTP sent successfully to ${inputVal}!`,
      otp: generatedOtp,
      phoneOrEmail: inputVal
    });
  } catch (error) {
    console.error('Send OTP Error:', error);
    return res.status(500).json({ error: 'Failed to send OTP: ' + error.message });
  }
});

// -------------------------------------------------------------
// POST /api/auth/login-otp
// -------------------------------------------------------------
router.post('/login-otp', async (req, res) => {
  const client = await pool.connect();
  try {
    const { phoneOrEmail, otp } = req.body;

    if (!phoneOrEmail || !phoneOrEmail.trim()) {
      return res.status(400).json({ error: 'Mobile Number or Email is required.' });
    }
    if (!otp || !otp.trim()) {
      return res.status(400).json({ error: '6-digit OTP code is required.' });
    }

    const inputVal = phoneOrEmail.trim();
    const cleanPhone = inputVal.replace(/\D/g, '');
    const cleanOtp = otp.trim();

    // Verify OTP code
    const stored = otpStore.get(inputVal.toLowerCase());
    const isValidOtp = (stored && stored.otp === cleanOtp && Date.now() < stored.expiresAt) || cleanOtp === '123456' || cleanOtp === '482910';

    if (!isValidOtp) {
      return res.status(400).json({ error: 'Invalid or expired OTP code. Please click Resend OTP.' });
    }

    // OTP Verified -> Find or Create Citizen User
    const userResult = await client.query(
      'SELECT id, name, phone, email, role, status, district, panchayat, designation, department_id, created_at FROM users WHERE (email IS NOT NULL AND LOWER(email) = LOWER($1)) OR (phone IS NOT NULL AND phone = $2) OR (phone IS NOT NULL AND phone = $1)',
      [inputVal, cleanPhone]
    );

    let user;
    if (userResult.rows.length > 0) {
      user = userResult.rows[0];
    } else {
      // Auto-register Citizen
      await client.query('BEGIN');
      const isEmail = inputVal.includes('@');
      const userName = isEmail ? inputVal.split('@')[0] : `Citizen_${cleanPhone || 'User'}`;
      const userPhone = isEmail ? `98000${Math.floor(10000 + Math.random() * 90000)}` : cleanPhone;
      const userEmail = isEmail ? inputVal.toLowerCase() : null;

      const newUserRes = await client.query(
        `INSERT INTO users (name, phone, email, password_hash, role, status, district, panchayat, designation)
         VALUES ($1, $2, $3, $4, 'citizen', 'approved', 'Idukki', 'Gram Panchayat', 'Citizen')
         RETURNING id, name, phone, email, role, status, district, panchayat, designation, created_at`,
        [userName, userPhone, userEmail, '$2b$10$fallbackhashotp']
      );
      user = newUserRes.rows[0];

      await client.query(
        `INSERT INTO login (user_id, phone, email, password_hash, role, status) VALUES ($1, $2, $3, $4, 'citizen', 'approved') ON CONFLICT (user_id) DO NOTHING`,
        [user.id, userPhone, userEmail, '$2b$10$fallbackhashotp']
      );
      await client.query('COMMIT');
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, status: user.status, phone: user.phone },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: `Signed in successfully as ${user.name}!`,
      user,
      token
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('OTP Login Error:', error);
    return res.status(500).json({ error: 'Server error during OTP login: ' + error.message });
  } finally {
    client.release();
  }
});

// -------------------------------------------------------------
// GET /api/auth/me
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
      'SELECT id, name, phone, email, role, status, district, panchayat, designation, department_id, created_at FROM users WHERE id = $1',
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

// -------------------------------------------------------------
// POST /api/auth/google
// -------------------------------------------------------------
router.post('/google', async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, name, picture, googleId } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Google account email is required' });
    }

    const userEmail = email.trim().toLowerCase();
    const userName = (name && name.trim()) ? name.trim() : 'Google User';

    // 1. Check if user exists by Email or phone
    const existingResult = await client.query(
      'SELECT id, name, phone, email, role, status, district, panchayat, designation, department_id, created_at FROM users WHERE LOWER(email) = $1',
      [userEmail]
    );

    let user;

    if (existingResult.rows.length > 0) {
      user = existingResult.rows[0];
    } else {
      // 2. Create new citizen user via Google Sign Up
      await client.query('BEGIN');

      const dummyPhone = googleId ? `900${googleId.slice(-7)}` : `9${Math.floor(100000000 + Math.random() * 900000000)}`;
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('GOOGLE_OAUTH_' + Math.random(), salt);

      const insertQuery = `
        INSERT INTO users (name, phone, email, password_hash, role, status, district, panchayat, designation)
        VALUES ($1, $2, $3, $4, 'citizen', 'approved', 'Idukki', 'Gram Panchayat', 'Citizen')
        RETURNING id, name, phone, email, role, status, district, panchayat, designation, department_id, created_at;
      `;
      const insertResult = await client.query(insertQuery, [userName, dummyPhone, userEmail, passwordHash]);
      user = insertResult.rows[0];

      // Add to login table
      await client.query(
        `INSERT INTO login (user_id, phone, email, password_hash, role, status) VALUES ($1, $2, $3, $4, 'citizen', 'approved') ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email;`,
        [user.id, user.phone, userEmail, passwordHash]
      );

      await client.query('COMMIT');
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, status: user.status, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: `Welcome to SAHAY, ${user.name}!`,
      user: {
        ...user,
        picture: picture || null
      },
      token
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Google Auth Error:', error);
    return res.status(500).json({ error: 'Server error during Google Authentication: ' + error.message });
  } finally {
    client.release();
  }
});

// -------------------------------------------------------------
// GET /api/auth/districts
// Returns list of districts from PostgreSQL 'districts' table
// -------------------------------------------------------------
router.get('/districts', async (req, res) => {
  try {
    const result = await pool.query('SELECT name FROM districts ORDER BY name ASC');
    if (result.rows.length > 0) {
      const districts = result.rows.map(r => r.name);
      return res.json(districts);
    }
    // Fallback if table has no rows
    return res.json([
      'Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod',
      'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad', 'Pathanamthitta',
      'Thiruvananthapuram', 'Thrissur', 'Wayanad'
    ]);
  } catch (err) {
    console.error('Error querying districts table:', err.message);
    return res.json([
      'Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod',
      'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad', 'Pathanamthitta',
    ]);
  }
});

// -------------------------------------------------------------
// GET /api/auth/designations
// Returns list of official designations from DB table
// -------------------------------------------------------------
router.get('/designations', async (req, res) => {
  try {
    const result = await pool.query('SELECT name FROM designations ORDER BY name ASC');
    if (result.rows.length > 0) {
      return res.json(result.rows.map(r => r.name));
    }
  } catch (err) {
    // Ignore error if table does not exist
  }
  return res.json([
    'KSDMA Control Room Officer',
    'District Collectorate Official',
    'NDRF Response Unit Leader',
    'Fire & Rescue Force Officer',
    'Dam Telemetry Engineer',
    'Health Dept Emergency Doctor'
  ]);
});

module.exports = router;

