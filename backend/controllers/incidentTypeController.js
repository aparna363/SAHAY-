const pool = require('../db');

/**
 * GET /api/incident-types
 * Returns all active incident categories
 */
const getIncidentTypes = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, is_active FROM incident_types 
       WHERE is_active = TRUE 
       ORDER BY id ASC;`
    );
    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching incident types:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve incident types' });
  }
};

/**
 * POST /api/incident-types (Admin only)
 */
const createIncidentType = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Incident type name is required' });
    }

    const result = await pool.query(
      `INSERT INTO incident_types (name, description) VALUES ($1, $2) RETURNING *;`,
      [name.trim(), description ? description.trim() : null]
    );

    return res.status(201).json({
      success: true,
      message: 'Incident type created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating incident type:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getIncidentTypes,
  createIncidentType
};
