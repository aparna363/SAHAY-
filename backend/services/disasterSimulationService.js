/**
 * ============================================================
 * SAHAY - Disaster Simulation & Testing Service
 * ============================================================
 *
 * Provides isolated simulation scenarios for developer testing of
 * the routing engine and risk calculation WITHOUT polluting the
 * production PostgreSQL database.
 *
 * Supported Scenarios:
 * 1. NORMAL_CONDITIONS: Clear roads, no hazards
 * 2. FLOOD_ZONE_CROSSING: Flood zone crossing normal path
 * 3. LANDSLIDE_ZONE_CROSSING: Active landslide along primary road
 * 4. BLOCKED_ROAD: Official road blockage / closure on direct route
 * 5. HIGH_SEVERITY_INCIDENT: Critical emergency incident along route
 * 6. MULTIPLE_HAZARDS: Flood + Blocked Road + Incident
 * 7. NO_SAFE_ROUTE: All candidate paths blocked or critical
 * 8. DESTINATION_IN_HAZARD_ZONE: Destination shelter is inside hazard area
 * 9. SHELTER_UNAVAILABLE: Shelter capacity is full or closed
 * 10. REALTIME_HAZARD_INJECTION: Dynamic hazard emitted via Socket.IO
 * ============================================================
 */

// Active in-memory simulation state (isolated per runtime/session)
let activeScenario = null; // null means live production database data only

const SCENARIO_DEFINITIONS = {
  NORMAL_CONDITIONS: {
    id: 'NORMAL_CONDITIONS',
    title: 'Normal Conditions',
    description: 'Weather clear, zero active hazards or road blockages on route. Normal route is low risk.',
    hazards: [],
    blockedRoads: [],
    incidents: [],
    shelterOverride: null,
    weatherRisk: 'LOW'
  },

  FLOOD_ZONE_CROSSING: {
    id: 'FLOOD_ZONE_CROSSING',
    title: 'Flood Zone Crossing Route',
    description: 'High-risk monsoon flood inundation sector cuts across the primary direct road.',
    hazards: [
      {
        id: 'sim-hz-1',
        name: 'Puzhakkal River Flood Inundation Sector',
        hazard_type: 'FLOOD',
        severity: 'HIGH',
        description: 'Water levels rising rapidly across low-lying road corridors',
        centerOffset: 0.0 // Placed right on midpoint of route
      }
    ],
    blockedRoads: [],
    incidents: [],
    weatherRisk: 'HIGH'
  },

  LANDSLIDE_ZONE_CROSSING: {
    id: 'LANDSLIDE_ZONE_CROSSING',
    title: 'Landslide Zone Crossing Route',
    description: 'Mudslide & rockfall warning on main road; slope instability detected.',
    hazards: [
      {
        id: 'sim-hz-2',
        name: 'Western Hill Slope Landslide Caution Zone',
        hazard_type: 'LANDSLIDE',
        severity: 'CRITICAL',
        description: 'Slope failure with debris blocking primary lanes',
        centerOffset: 0.0
      }
    ],
    blockedRoads: [],
    incidents: [],
    weatherRisk: 'HIGH'
  },

  BLOCKED_ROAD: {
    id: 'BLOCKED_ROAD',
    title: 'Blocked Road (Strict Avoidance)',
    description: 'Primary highway officially closed due to fallen electrical towers & deep water.',
    hazards: [],
    blockedRoads: [
      {
        id: 'sim-br-1',
        road_name: 'Main Arterial Avenue (SH-69 Sector)',
        status: 'BLOCKED',
        hazard_type: 'Severe Flooding & Uprooted Trees',
        severity: 'CRITICAL',
        description: 'Police barricades deployed. Completely impassable for civil traffic.'
      }
    ],
    incidents: [],
    weatherRisk: 'MODERATE'
  },

  HIGH_SEVERITY_INCIDENT: {
    id: 'HIGH_SEVERITY_INCIDENT',
    title: 'High-Severity Incident',
    description: 'Critical chemical spill / building collapse requiring immediate cordon-off.',
    hazards: [],
    blockedRoads: [],
    incidents: [
      {
        id: 'sim-inc-1',
        incident_code: 'INC-SIM-099',
        severity: 'CRITICAL',
        description: 'Major flash flood rescue operation underway with NDRF boats',
        hazard_type_name: 'Flash Flood Rescue'
      }
    ],
    weatherRisk: 'MODERATE'
  },

  MULTIPLE_HAZARDS: {
    id: 'MULTIPLE_HAZARDS',
    title: 'Multiple Hazards (Compound Disaster)',
    description: 'Concurrent flood zone, confirmed road blockage, and critical ongoing emergency.',
    hazards: [
      {
        id: 'sim-hz-multi-1',
        name: 'Ayyanthole Lowland Flood Zone',
        hazard_type: 'FLOOD',
        severity: 'CRITICAL',
        description: '3ft standing water'
      }
    ],
    blockedRoads: [
      {
        id: 'sim-br-multi-1',
        road_name: 'Central Link Bridge Corridor',
        status: 'BLOCKED',
        hazard_type: 'Structural Integrity Hazard',
        severity: 'CRITICAL',
        description: 'Bridge closed by PWD engineers'
      }
    ],
    incidents: [
      {
        id: 'sim-inc-multi-1',
        incident_code: 'INC-SIM-MULTI',
        severity: 'HIGH',
        description: 'Submerged passenger vehicles'
      }
    ],
    weatherRisk: 'HIGH'
  },

  NO_SAFE_ROUTE: {
    id: 'NO_SAFE_ROUTE',
    title: 'No Safe Route Available',
    description: 'Widespread disaster condition where all candidate routes suffer severe risks.',
    hazards: [
      {
        id: 'sim-hz-all-1',
        name: 'District-Wide River Overflow Inundation Zone',
        hazard_type: 'FLOOD',
        severity: 'CRITICAL',
        description: 'All arterial roads inundated'
      }
    ],
    blockedRoads: [
      {
        id: 'sim-br-all-1',
        road_name: 'Direct Highway',
        status: 'BLOCKED',
        hazard_type: 'Submerged Roadway',
        severity: 'CRITICAL'
      },
      {
        id: 'sim-br-all-2',
        road_name: 'Northern Detour Bypass',
        status: 'BLOCKED',
        hazard_type: 'Landslide Debris',
        severity: 'CRITICAL'
      },
      {
        id: 'sim-br-all-3',
        road_name: 'Southern Link Corridor',
        status: 'BLOCKED',
        hazard_type: 'Bridge Submerged',
        severity: 'CRITICAL'
      }
    ],
    incidents: [],
    weatherRisk: 'CRITICAL'
  },

  DESTINATION_IN_HAZARD_ZONE: {
    id: 'DESTINATION_IN_HAZARD_ZONE',
    title: 'Destination Inside Hazard Zone',
    description: 'The destination shelter itself lies within an expanding active flood boundary.',
    hazards: [
      {
        id: 'sim-hz-dest-1',
        name: 'Shelter Perimeter Submergence Area',
        hazard_type: 'FLOOD',
        severity: 'CRITICAL',
        description: 'Water has reached the school compound gates',
        targetDestination: true
      }
    ],
    blockedRoads: [],
    incidents: [],
    weatherRisk: 'HIGH'
  },

  SHELTER_UNAVAILABLE: {
    id: 'SHELTER_UNAVAILABLE',
    title: 'Shelter Becomes Unavailable (100% Full)',
    description: 'Candidate relief hub has zero remaining capacity, requiring alternative shelter routing.',
    hazards: [],
    blockedRoads: [],
    incidents: [],
    shelterOverride: {
      availableCapacity: 0,
      status: 'FULL'
    },
    weatherRisk: 'MODERATE'
  },

  REALTIME_HAZARD_INJECTION: {
    id: 'REALTIME_HAZARD_INJECTION',
    title: 'Real-time Hazard Injected During Navigation',
    description: 'Simulates a sudden flash flood report that invalidates the citizen’s active route in real-time.',
    hazards: [
      {
        id: 'sim-hz-rt-1',
        name: 'Sudden Torrential Flash Flood Corridor',
        hazard_type: 'FLASH_FLOOD',
        severity: 'CRITICAL',
        description: 'Water breached canal wall just 2 minutes ago'
      }
    ],
    blockedRoads: [
      {
        id: 'sim-br-rt-1',
        road_name: 'Active Route Ahead (Kilometer 2.1)',
        status: 'BLOCKED',
        hazard_type: 'Canal Overflow',
        severity: 'CRITICAL'
      }
    ],
    incidents: [],
    weatherRisk: 'HIGH'
  }
};

/**
 * Set the current active simulation scenario
 */
function setActiveScenario(scenarioId) {
  if (!scenarioId || scenarioId === 'LIVE_PRODUCTION' || scenarioId === 'RESET') {
    activeScenario = null;
    return { success: true, activeScenario: null, message: 'Returned to live database mode' };
  }

  const scenario = SCENARIO_DEFINITIONS[scenarioId];
  if (!scenario) {
    throw new Error(`Unknown simulation scenario: ${scenarioId}`);
  }

  activeScenario = scenarioId;
  return { success: true, activeScenario, scenarioDetails: scenario };
}

/**
 * Get active simulation scenario
 */
function getActiveScenario() {
  return activeScenario ? SCENARIO_DEFINITIONS[activeScenario] : null;
}

/**
 * List all available scenarios with metadata
 */
function listScenarios() {
  return Object.values(SCENARIO_DEFINITIONS).map(s => ({
    id: s.id,
    title: s.title,
    description: s.description,
    isActive: activeScenario === s.id
  }));
}

/**
 * Overlay simulated hazards onto candidate routes without altering database
 */
function applySimulationToCollisionCheck(origin, destination, routeCoords, baseCollisions, scenarioIdOverride = null, routeContext = {}) {
  const scenario = scenarioIdOverride 
    ? SCENARIO_DEFINITIONS[scenarioIdOverride] 
    : getActiveScenario();

  if (!scenario) {
    return baseCollisions;
  }

  const merged = {
    intersectingHazardZones: [...baseCollisions.intersectingHazardZones],
    intersectingBlockedRoads: [...baseCollisions.intersectingBlockedRoads],
    intersectingCriticalIncidents: [...baseCollisions.intersectingCriticalIncidents],
    isHazardFree: baseCollisions.isHazardFree,
    simulationApplied: scenario.id
  };

  // If scenario is NORMAL_CONDITIONS, force hazard-free test case
  if (scenario.id === 'NORMAL_CONDITIONS') {
    return {
      intersectingHazardZones: [],
      intersectingBlockedRoads: [],
      intersectingCriticalIncidents: [],
      isHazardFree: true,
      simulationApplied: 'NORMAL_CONDITIONS'
    };
  }

  const isDetour = Boolean(routeContext.isDetour);

  // In NO_SAFE_ROUTE, everything is affected
  // In DESTINATION_IN_HAZARD_ZONE, destination is inside hazard so all routes end in it
  const affectsThisRoute = !isDetour || scenario.id === 'NO_SAFE_ROUTE' || scenario.id === 'DESTINATION_IN_HAZARD_ZONE';

  if (affectsThisRoute) {
    // If scenario has simulated hazard zones
    if (scenario.hazards && scenario.hazards.length > 0) {
      scenario.hazards.forEach(h => {
        merged.intersectingHazardZones.push({
          id: h.id,
          name: h.name,
          hazard_type: h.hazard_type,
          severity: h.severity,
          description: h.description,
          isSimulated: true
        });
      });
    }

    // If scenario has simulated blocked roads
    if (scenario.blockedRoads && scenario.blockedRoads.length > 0) {
      scenario.blockedRoads.forEach(br => {
        merged.intersectingBlockedRoads.push({
          id: br.id,
          road_name: br.road_name,
          status: br.status,
          hazard_type: br.hazard_type,
          severity: br.severity,
          description: br.description,
          isSimulated: true
        });
      });
    }

    // If scenario has simulated critical incidents
    if (scenario.incidents && scenario.incidents.length > 0) {
      scenario.incidents.forEach(inc => {
        merged.intersectingCriticalIncidents.push({
          id: inc.id,
          incident_code: inc.incident_code,
          severity: inc.severity,
          description: inc.description,
          isSimulated: true
        });
      });
    }
  }

  merged.isHazardFree = merged.intersectingHazardZones.length === 0 &&
                        merged.intersectingBlockedRoads.length === 0 &&
                        merged.intersectingCriticalIncidents.length === 0;

  return merged;
}

module.exports = {
  setActiveScenario,
  getActiveScenario,
  listScenarios,
  applySimulationToCollisionCheck,
  SCENARIO_DEFINITIONS
};
