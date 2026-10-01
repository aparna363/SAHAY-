/**
 * ============================================================
 * SAHAY - Real-Time Socket.IO Service
 * ============================================================
 *
 * Provides real-time event broadcasting for live citizen safety map:
 * - New incident creation
 * - Incident status change / verification
 * - Road blockages & road condition updates
 * - Disaster zone updates
 * - IoT sensor telemetry updates
 * - Shelter capacity updates
 * ============================================================
 */

const { Server } = require('socket.io');

let io = null;

function initSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
    },
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket) => {
    console.log(`🔌 [Socket.IO] Client connected: ${socket.id}`);

    socket.on('join:district', (district) => {
      if (district) {
        socket.join(`district:${district.toLowerCase()}`);
        console.log(`📡 [Socket.IO] Client ${socket.id} joined district room: district:${district.toLowerCase()}`);
      }
    });

    socket.on('disconnect', () => {
      // client disconnected
    });
  });

  return io;
}

function getIo() {
  return io;
}

function broadcastEvent(eventName, payload, district = null) {
  if (!io) return;
  try {
    io.emit(eventName, payload);
    if (district) {
      io.to(`district:${district.toLowerCase()}`).emit(`${eventName}:district`, payload);
    }
  } catch (err) {
    console.error(`[Socket.IO] Broadcast error on ${eventName}:`, err.message);
  }
}

// Typed broadcast helpers
const notifyNewIncident = (incident) => broadcastEvent('incident:created', incident, incident.district || incident.reporter_district);
const notifyIncidentUpdate = (incident) => broadcastEvent('incident:updated', incident, incident.district || incident.reporter_district);
const notifyRoadHazardUpdate = (hazard) => broadcastEvent('road:hazard_update', hazard, hazard.district);
const notifyHazardZoneUpdate = (zone) => broadcastEvent('hazard_zone:updated', zone);
const notifyIoTSensorUpdate = (sensor) => broadcastEvent('iot_sensor:updated', sensor, sensor.district);
const notifyShelterUpdate = (shelter) => broadcastEvent('shelter:capacity_update', shelter, shelter.district);
const notifyNewSOS = (sosData) => broadcastEvent('sos:created', sosData, sosData.sos?.district);
const notifySOSUpdate = (sos) => broadcastEvent('sos:updated', sos, sos.district);

module.exports = {
  initSocketServer,
  getIo,
  broadcastEvent,
  notifyNewIncident,
  notifyIncidentUpdate,
  notifyRoadHazardUpdate,
  notifyHazardZoneUpdate,
  notifyIoTSensorUpdate,
  notifyShelterUpdate,
  notifyNewSOS,
  notifySOSUpdate
};
