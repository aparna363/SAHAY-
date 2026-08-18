const express = require('express');
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
const { startPollingTimer } = require('./services/officialWeatherAlertFetcher');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/collector', collectorRoutes);
app.use('/api/rescue', rescueRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/weather-alerts', weatherAlertsRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/incident-types', incidentTypeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/family-members', familyRoutes);

// Start official background weather alert polling every 20 mins
startPollingTimer(20 * 60 * 1000);

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

// Start Express Server listening on 0.0.0.0 (IPv4 + IPv6 dual stack)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🚀 SAHAY Express Server running on http://localhost:${PORT} (0.0.0.0:${PORT})`);
  console.log(`🗄️ PostgreSQL Database: ${process.env.PGDATABASE || 'sahay_db'} + PostGIS`);
  console.log(`👥 Roles Configured: Citizen | Rescue Team | Collector | Admin`);
  console.log(`=======================================================`);
});

