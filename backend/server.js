const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for all origins and headers
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded files (evidence images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const collectorRoutes = require('./routes/collector');
const weatherRoutes = require('./routes/weather');
const incidentRoutes = require('./routes/incidentRoutes');
const incidentTypeRoutes = require('./routes/incidentTypeRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const rescueRoutes = require('./routes/rescue');
const weatherAlertsRoutes = require('./routes/weatherAlerts');
const familyRoutes = require('./routes/family');
const mapRoutes = require('./routes/map');
const reliefRoutes = require('./routes/reliefRoutes');
const aiRoutes = require('./routes/ai.routes');
const { startPollingTimer } = require('./services/officialWeatherAlertFetcher');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/collector', collectorRoutes);
app.use('/api/rescue', rescueRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/weather-alerts', weatherAlertsRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/incident-types', incidentTypeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/family-members', familyRoutes);
app.use('/api/relief', reliefRoutes);
app.use('/api/ai', aiRoutes);

// Start official background weather alert polling every 20 mins
startPollingTimer(20 * 60 * 1000);

// Public portal aggregated metrics endpoint (Real PostgreSQL DB Counts)
app.get('/api/public-stats', async (req, res) => {
  try {
    const pool = require('./db');

    // 1. Active Rescue Teams (Approved Rescue/Station users in DB)
    const teamsRes = await pool.query(
      "SELECT COUNT(*) FROM users WHERE role IN ('station', 'station_admin', 'rescue_team') AND status = 'approved'"
    ).catch(() => ({ rows: [{ count: '0' }] }));

    const activeRescueTeams = parseInt(teamsRes.rows[0].count, 10);

    // 2. Open Relief Camps (Shelters count)
    const sheltersRes = await pool.query(
      "SELECT COUNT(*) FROM shelters"
    ).catch(() => ({ rows: [{ count: '0' }] }));

    const openReliefCamps = parseInt(sheltersRes.rows[0].count, 10);

    // 3. Sheltered Citizens (Sum of capacity - available_capacity in shelters)
    const shelteredRes = await pool.query(
      "SELECT COALESCE(SUM(GREATEST(capacity - available_capacity, 0)), 0) as total FROM shelters"
    ).catch(() => ({ rows: [{ total: '0' }] }));

    const shelteredCitizens = parseInt(shelteredRes.rows[0].total, 10);

    // 4. Active Monitoring Incidents
    const incidentsRes = await pool.query(
      "SELECT COUNT(*) FROM incidents WHERE status NOT IN ('RESOLVED', 'CLOSED', 'REJECTED')"
    ).catch(() => ({ rows: [{ count: '0' }] }));

    const activeIncidents = parseInt(incidentsRes.rows[0].count, 10);

    return res.json({
      success: true,
      stats: {
        activeRescueTeams,
        openReliefCamps,
        shelteredCitizens,
        activeIncidents
      }
    });
  } catch (err) {
    console.error('Error fetching public stats:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'SAHAY Backend API',
    database: 'PostgreSQL (sahay_db) + PostGIS',
    rolesSupported: ['citizen', 'rescue_team', 'collector', 'station', 'admin'],
    timestamp: new Date().toISOString()
  });
});

// Global Error Handler (Multer & Server Errors)
app.use((err, req, res, next) => {
  if (err) {
    console.error('Server Express Error:', err.message);
    return res.status(400).json({
      success: false,
      error: err.message || 'An unexpected error occurred.'
    });
  }
  next();
});

// Start HTTP + Socket.IO Server listening on 0.0.0.0 (IPv4 + IPv6 dual stack)
const server = http.createServer(app);
const { initSocketServer } = require('./services/socketService');
initSocketServer(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🚀 SAHAY Server + Socket.IO running on http://localhost:${PORT} (0.0.0.0:${PORT})`);
  console.log(`🗄️ PostgreSQL Database: ${process.env.PGDATABASE || 'sahay_db'} + PostGIS`);
  console.log(`👥 Roles Configured: Citizen | Rescue Team | Collector | Admin`);
  console.log(`=======================================================`);
});

