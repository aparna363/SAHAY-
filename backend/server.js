const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for all origins and headers
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Auth Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'SAHAY Backend API',
    database: 'PostgreSQL (sahay_db)',
    rolesSupported: ['citizen', 'rescue_team', 'collector'],
    timestamp: new Date().toISOString()
  });
});

// Start Express Server listening on 0.0.0.0 (IPv4 + IPv6 dual stack)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🚀 SAHAY Express Server running on http://localhost:${PORT} (0.0.0.0:${PORT})`);
  console.log(`🗄️ PostgreSQL Database: ${process.env.PGDATABASE || 'sahay_db'}`);
  console.log(`👥 Roles Configured: Citizen | Rescue Team | Collector`);
  console.log(`=======================================================`);
});
