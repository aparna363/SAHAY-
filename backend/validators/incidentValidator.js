/**
 * Validation helper for incident creation and status updates.
 */
function validateIncidentSubmission(body) {
  const errors = [];

  const { incident_type_id, severity, description, latitude, longitude } = body;

  // Incident Type check
  if (!incident_type_id) {
    errors.push('Incident type selection is required.');
  }

  // Severity check
  const validSeverities = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'];
  if (!severity || !validSeverities.includes(severity.toUpperCase())) {
    errors.push('Invalid severity level. Must be one of LOW, MODERATE, HIGH, or CRITICAL.');
  }

  // Description check
  if (!description || typeof description !== 'string') {
    errors.push('Incident description is required.');
  } else {
    const trimmed = description.trim();
    if (trimmed.length < 10) {
      errors.push('Description must be at least 10 characters long.');
    }
    if (trimmed.length > 2000) {
      errors.push('Description cannot exceed 2000 characters.');
    }
  }

  // Location validation (Lat: -90 to 90, Lng: -180 to 180)
  const latNum = parseFloat(latitude);
  const lngNum = parseFloat(longitude);

  if (isNaN(latNum) || latNum < -90 || latNum > 90) {
    errors.push('Latitude must be a valid coordinate between -90 and 90.');
  }

  if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
    errors.push('Longitude must be a valid coordinate between -180 and 180.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      incident_type_id: parseInt(incident_type_id, 10),
      severity: (severity || '').toUpperCase(),
      description: (description || '').trim(),
      latitude: latNum,
      longitude: lngNum,
      location_address: body.location_address ? String(body.location_address).trim() : null
    }
  };
}

/**
 * Sanitize text input to prevent XSS / malicious injection
 */
function sanitizeInput(text) {
  if (!text) return '';
  return String(text)
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

module.exports = {
  validateIncidentSubmission,
  sanitizeInput
};
