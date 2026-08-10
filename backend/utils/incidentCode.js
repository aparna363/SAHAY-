/**
 * Utility to generate a unique human-readable Incident Code.
 * Format: INC-YYYY-XXXXXX (e.g. INC-2026-000001)
 */
async function generateIncidentCode(client) {
  const currentYear = new Date().getFullYear();
  const prefix = `INC-${currentYear}-`;

  // Query database for the latest code in the current year
  const result = await client.query(
    `SELECT incident_code FROM incidents 
     WHERE incident_code LIKE $1 
     ORDER BY id DESC LIMIT 1;`,
    [`${prefix}%`]
  );

  let nextSequence = 1;
  if (result.rows.length > 0) {
    const lastCode = result.rows[0].incident_code;
    const parts = lastCode.split('-');
    if (parts.length === 3) {
      const parsedSeq = parseInt(parts[2], 10);
      if (!isNaN(parsedSeq)) {
        nextSequence = parsedSeq + 1;
      }
    }
  }

  const paddedSequence = String(nextSequence).padStart(6, '0');
  return `${prefix}${paddedSequence}`;
}

module.exports = { generateIncidentCode };
