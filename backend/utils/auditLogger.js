const pool = require('../db');

/**
 * Utility function to write an entry to audit_logs table
 * @param {Object} req Express request object (optional)
 * @param {string} action Action performed (e.g. OFFICER_VERIFIED, COLLECTOR_CREATED)
 * @param {string} entityType Affected entity type (e.g. Officer, User, Incident)
 * @param {string|number} entityId Identifier of entity
 * @param {string} district District context
 * @param {Object} details Additional JSON details
 */
async function createAuditLog(req, action, entityType = null, entityId = null, district = null, details = null) {
  try {
    const userId = req && req.user ? req.user.id : null;
    const role = req && req.user ? (req.user.role || 'system').toUpperCase() : 'SYSTEM';
    const dist = district || (req && req.user ? req.user.district : null);
    const ipAddress = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1') : '127.0.0.1';
    const userAgent = req ? (req.headers['user-agent'] || '') : '';

    await pool.query(`
      INSERT INTO audit_logs (user_id, role, action, entity_type, entity_id, district, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
    `, [
      userId,
      role,
      action,
      entityType,
      entityId ? String(entityId) : null,
      dist,
      details ? JSON.stringify(details) : null,
      ipAddress,
      userAgent
    ]);
  } catch (err) {
    console.error('Audit Log Insertion Note:', err.message);
  }
}

module.exports = { createAuditLog };
