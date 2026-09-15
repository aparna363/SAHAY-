/**
 * ============================================================
 * SAHAY - Client Socket.IO Service
 * ============================================================
 */

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

let socket: Socket | null = null;

export function getMapSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000
    });

    socket.on('connect', () => {
      console.log('⚡ [Socket.IO] Connected to SAHAY Live Disaster Telemetry Gateway');
    });

    socket.on('disconnect', () => {
      console.log('⚠️ [Socket.IO] Disconnected from SAHAY Telemetry Gateway');
    });
  }

  return socket;
}

export function subscribeToDistrict(district: string) {
  const s = getMapSocket();
  if (district) {
    s.emit('join:district', district);
  }
}

export function listenToMapEvents(callbacks: {
  onIncidentCreated?: (incident: any) => void;
  onIncidentUpdated?: (incident: any) => void;
  onRoadHazardUpdated?: (hazard: any) => void;
  onHazardZoneUpdated?: (zone: any) => void;
  onIoTSensorUpdated?: (sensor: any) => void;
  onShelterUpdated?: (shelter: any) => void;
}) {
  const s = getMapSocket();

  if (callbacks.onIncidentCreated) {
    s.on('incident:created', callbacks.onIncidentCreated);
  }
  if (callbacks.onIncidentUpdated) {
    s.on('incident:updated', callbacks.onIncidentUpdated);
  }
  if (callbacks.onRoadHazardUpdated) {
    s.on('road:hazard_update', callbacks.onRoadHazardUpdated);
  }
  if (callbacks.onHazardZoneUpdated) {
    s.on('hazard_zone:updated', callbacks.onHazardZoneUpdated);
  }
  if (callbacks.onIoTSensorUpdated) {
    s.on('iot_sensor:updated', callbacks.onIoTSensorUpdated);
  }
  if (callbacks.onShelterUpdated) {
    s.on('shelter:capacity_update', callbacks.onShelterUpdated);
  }

  return () => {
    if (callbacks.onIncidentCreated) s.off('incident:created', callbacks.onIncidentCreated);
    if (callbacks.onIncidentUpdated) s.off('incident:updated', callbacks.onIncidentUpdated);
    if (callbacks.onRoadHazardUpdated) s.off('road:hazard_update', callbacks.onRoadHazardUpdated);
    if (callbacks.onHazardZoneUpdated) s.off('hazard_zone:updated', callbacks.onHazardZoneUpdated);
    if (callbacks.onIoTSensorUpdated) s.off('iot_sensor:updated', callbacks.onIoTSensorUpdated);
    if (callbacks.onShelterUpdated) s.off('shelter:capacity_update', callbacks.onShelterUpdated);
  };
}
