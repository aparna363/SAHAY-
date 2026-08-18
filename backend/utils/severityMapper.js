/**
 * Pure function to map raw severity strings / event titles from meteorological feeds
 * into one of 4 standard SAHAY alert levels: 'GREEN', 'YELLOW', 'ORANGE', 'RED'.
 *
 * Rules:
 * 1. NEVER guess or calculate alert levels from temperature/rain/wind numbers.
 * 2. Strictly evaluate source severity strings or event category titles.
 * 3. Default to 'GREEN' if no active alerts exist or category indicates no warning.
 */

const SEVERITY_HIERARCHY = {
  GREEN: 0,
  YELLOW: 1,
  ORANGE: 2,
  RED: 3
};

/**
 * Normalizes input string for case-insensitive matching
 */
function normalizeCategory(cat) {
  if (!cat) return '';
  return String(cat).trim().toLowerCase();
}

/**
 * Maps raw source severity category or event string to standard 4 levels.
 *
 * @param {string|object} rawInput - Raw severity string (e.g. "Red Warning", "Extreme", "Yellow Advisory") or object with severity/event properties
 * @param {Array} customMappings - Optional custom mapping list from database
 * @returns {string} - 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED'
 */
function mapSeverityLevel(rawInput, customMappings = []) {
  if (!rawInput) return 'GREEN';

  let categoryStr = '';
  if (typeof rawInput === 'string') {
    categoryStr = rawInput;
  } else if (typeof rawInput === 'object') {
    categoryStr = rawInput.severity || rawInput.category || rawInput.event || rawInput.level || '';
  }

  const normalized = normalizeCategory(categoryStr);
  if (!normalized || ['nil', 'none', 'no alert', 'normal', 'green', 'clear', 'no warning'].includes(normalized)) {
    return 'GREEN';
  }

  // 1. Check custom database mappings first if provided
  if (Array.isArray(customMappings) && customMappings.length > 0) {
    const matchedCustom = customMappings.find(m => 
      m.is_active !== false && 
      normalizeCategory(m.source_category) === normalized
    );
    if (matchedCustom && matchedCustom.mapped_level) {
      return String(matchedCustom.mapped_level).toUpperCase();
    }
  }

  // 2. Built-in strict mapping table matching IMD, OpenWeatherMap, CAP, NWS severity categories
  if (/red|extreme|critical|severe|disaster|emergency/i.test(normalized)) {
    return 'RED';
  }

  if (/orange|high|moderate|heavy rain|squall|amber/i.test(normalized)) {
    return 'ORANGE';
  }

  if (/yellow|advisory|minor|watch|notice|alert/i.test(normalized)) {
    return 'YELLOW';
  }

  if (/green|normal|nil|no warning|info/i.test(normalized)) {
    return 'GREEN';
  }

  // Fallback default for unknown non-empty warning categories
  return 'YELLOW';
}

/**
 * Computes highest severity badge level from a list of active alerts.
 *
 * @param {Array} alertList - Array of alert objects
 * @returns {string} - Highest alert level ('GREEN', 'YELLOW', 'ORANGE', 'RED')
 */
function getHighestSeverityLevel(alertList = []) {
  if (!Array.isArray(alertList) || alertList.length === 0) {
    return 'GREEN';
  }

  let highestLevel = 'GREEN';
  let maxScore = 0;

  for (const alert of alertList) {
    const level = alert.mapped_severity || mapSeverityLevel(alert.raw_severity || alert.severity || alert.event || 'GREEN');
    const score = SEVERITY_HIERARCHY[level] || 0;
    if (score > maxScore) {
      maxScore = score;
      highestLevel = level;
    }
  }

  return highestLevel;
}

module.exports = {
  mapSeverityLevel,
  getHighestSeverityLevel,
  SEVERITY_HIERARCHY
};
