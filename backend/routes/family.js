const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

// 1. Get all family members for authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT id, user_id, name, relation, age, gender, phone, blood_group, 
              medical_needs, is_emergency_contact, status, location, govt_id, 
              notes, last_checkin, created_at, updated_at 
       FROM family_members 
       WHERE user_id = $1 
       ORDER BY created_at ASC`,
      [userId]
    );

    res.json({
      success: true,
      familyMembers: result.rows
    });
  } catch (error) {
    console.error('Error fetching family members:', error.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve family members.' });
  }
});

// 2. Add new family member
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      relation,
      age,
      gender,
      phone,
      blood_group,
      medical_needs,
      is_emergency_contact,
      status,
      location,
      govt_id,
      notes
    } = req.body;

    // Server-side validation
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Full Name is required (minimum 2 characters).' });
    }
    if (!relation) {
      return res.status(400).json({ success: false, error: 'Relationship is required.' });
    }
    if (age !== undefined && age !== null && age !== '') {
      const parsedAge = parseInt(age, 10);
      if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 120) {
        return res.status(400).json({ success: false, error: 'Age must be a valid number between 0 and 120.' });
      }
    }
    if (phone && phone.trim() !== '') {
      const cleanPhone = phone.replace(/[\s\-\+\(\)]/g, '');
      if (!/^\d{10,12}$/.test(cleanPhone)) {
        return res.status(400).json({ success: false, error: 'Phone number must be a valid 10-digit number.' });
      }
    }

    const insertResult = await pool.query(
      `INSERT INTO family_members 
        (user_id, name, relation, age, gender, phone, blood_group, medical_needs, is_emergency_contact, status, location, govt_id, notes, last_checkin, created_at, updated_at) 
       VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
       RETURNING *`,
      [
        userId,
        name.trim(),
        relation,
        age ? parseInt(age, 10) : null,
        gender || 'Prefer not to say',
        phone ? phone.trim() : null,
        blood_group || 'Unknown',
        medical_needs || 'None',
        Boolean(is_emergency_contact),
        status || 'Safe',
        location || 'Home',
        govt_id ? govt_id.trim() : null,
        notes ? notes.trim() : null
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Family member registered successfully.',
      familyMember: insertResult.rows[0]
    });
  } catch (error) {
    console.error('Error adding family member:', error.message);
    res.status(500).json({ success: false, error: 'Failed to add family member.' });
  }
});

// 3. Update family member
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const memberId = req.params.id;
    const {
      name,
      relation,
      age,
      gender,
      phone,
      blood_group,
      medical_needs,
      is_emergency_contact,
      status,
      location,
      govt_id,
      notes
    } = req.body;

    // Check ownership
    const checkResult = await pool.query(
      'SELECT id FROM family_members WHERE id = $1 AND user_id = $2',
      [memberId, userId]
    );
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Family member record not found or access denied.' });
    }

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Full Name is required (minimum 2 characters).' });
    }
    if (!relation) {
      return res.status(400).json({ success: false, error: 'Relationship is required.' });
    }
    if (age !== undefined && age !== null && age !== '') {
      const parsedAge = parseInt(age, 10);
      if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 120) {
        return res.status(400).json({ success: false, error: 'Age must be a valid number between 0 and 120.' });
      }
    }
    if (phone && phone.trim() !== '') {
      const cleanPhone = phone.replace(/[\s\-\+\(\)]/g, '');
      if (!/^\d{10,12}$/.test(cleanPhone)) {
        return res.status(400).json({ success: false, error: 'Phone number must be a valid 10-digit number.' });
      }
    }

    const updateResult = await pool.query(
      `UPDATE family_members 
       SET name = $1, 
           relation = $2, 
           age = $3, 
           gender = $4, 
           phone = $5, 
           blood_group = $6, 
           medical_needs = $7, 
           is_emergency_contact = $8, 
           status = $9, 
           location = $10, 
           govt_id = $11, 
           notes = $12, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $13 AND user_id = $14 
       RETURNING *`,
      [
        name.trim(),
        relation,
        age ? parseInt(age, 10) : null,
        gender || 'Prefer not to say',
        phone ? phone.trim() : null,
        blood_group || 'Unknown',
        medical_needs || 'None',
        Boolean(is_emergency_contact),
        status || 'Safe',
        location || 'Home',
        govt_id ? govt_id.trim() : null,
        notes ? notes.trim() : null,
        memberId,
        userId
      ]
    );

    res.json({
      success: true,
      message: 'Family member updated successfully.',
      familyMember: updateResult.rows[0]
    });
  } catch (error) {
    console.error('Error updating family member:', error.message);
    res.status(500).json({ success: false, error: 'Failed to update family member.' });
  }
});

// 4. Quick patch status update & last check-in
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const memberId = req.params.id;
    const { status, location } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required.' });
    }

    const updateResult = await pool.query(
      `UPDATE family_members 
       SET status = $1, 
           location = COALESCE($2, location), 
           last_checkin = CURRENT_TIMESTAMP, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 AND user_id = $4 
       RETURNING *`,
      [status, location || null, memberId, userId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Family member not found or access denied.' });
    }

    res.json({
      success: true,
      message: 'Safety status updated.',
      familyMember: updateResult.rows[0]
    });
  } catch (error) {
    console.error('Error patching family status:', error.message);
    res.status(500).json({ success: false, error: 'Failed to update status.' });
  }
});

// 5. Delete family member
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const memberId = req.params.id;

    const deleteResult = await pool.query(
      'DELETE FROM family_members WHERE id = $1 AND user_id = $2 RETURNING id',
      [memberId, userId]
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Family member not found or access denied.' });
    }

    res.json({
      success: true,
      message: 'Family member removed successfully.'
    });
  } catch (error) {
    console.error('Error deleting family member:', error.message);
    res.status(500).json({ success: false, error: 'Failed to delete family member.' });
  }
});

module.exports = router;
