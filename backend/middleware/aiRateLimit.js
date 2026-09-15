/**
 * In-Memory Sliding Window Rate Limiter for AI Copilot Endpoints
 */

const requestLog = new Map();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 40; // Max 40 AI requests per minute per user/IP

function aiRateLimit(req, res, next) {
  const key = req.user?.id ? `user_${req.user.id}` : `ip_${req.ip || req.connection.remoteAddress}`;
  const now = Date.now();

  if (!requestLog.has(key)) {
    requestLog.set(key, []);
  }

  const timestamps = requestLog.get(key);
  // Filter out older timestamps outside current window
  const validTimestamps = timestamps.filter(time => now - time < WINDOW_MS);

  if (validTimestamps.length >= MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      error: 'Too many AI requests. Please wait a moment before asking another question.',
      retryAfterSeconds: Math.ceil((WINDOW_MS - (now - validTimestamps[0])) / 1000)
    });
  }

  validTimestamps.push(now);
  requestLog.set(key, validTimestamps);
  next();
}

// Clean up stale map keys every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of requestLog.entries()) {
    const valid = timestamps.filter(t => now - t < WINDOW_MS);
    if (valid.length === 0) {
      requestLog.delete(key);
    } else {
      requestLog.set(key, valid);
    }
  }
}, 5 * 60 * 1000);

module.exports = { aiRateLimit };
