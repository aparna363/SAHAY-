import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Compass, Locate, Plus, Minus, Maximize2, Shield } from 'lucide-react';
import { KERALA_DISTRICTS_GEOJSON } from '../data/keralaDistricts';
import { cleanDistrictName, getAlertColorHex, DISTRICT_CENTERS } from '../utils/districtUtils';

export interface DistrictAlertItem {
  district: string;
  alertLevel: 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' | string;
  alertType?: string;
  description?: string;
  source?: string;
  rainProbability?: number;
  windSpeed?: number;
  startTime?: string;
  endTime?: string;
  [key: string]: any;
}

interface KeralaAlertMapProps {
  alerts: DistrictAlertItem[];
  userLocation: {
    latitude: number;
    longitude: number;
    district?: string;
  } | null;
  selectedDistrict: string | null;
  onSelectDistrict: (districtName: string) => void;
  onLocateUser: () => void;
  loading?: boolean;
}

export const KeralaAlertMap: React.FC<KeralaAlertMapProps> = ({
  alerts,
  userLocation,
  selectedDistrict,
  onSelectDistrict,
  onLocateUser,
  loading = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const labelsLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  const [mapTheme] = useState<'dark' | 'light'>('dark');

  // Map district names to their alert object
  const alertMap = React.useMemo(() => {
    const map: Record<string, DistrictAlertItem> = {};
    alerts.forEach((alert) => {
      if (alert && alert.district) {
        const canonical = cleanDistrictName(alert.district);
        map[canonical] = alert;
      }
    });
    return map;
  }, [alerts]);

  const normalizedUserDistrict = React.useMemo(() => {
    return userLocation?.district ? cleanDistrictName(userLocation.district) : null;
  }, [userLocation?.district]);

  // Initialize Map with custom GIS dark/light tile layer
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    // Create map centered on Kerala [10.2, 76.2]
    const map = L.map(mapContainerRef.current, {
      center: [10.2, 76.2],
      zoom: 7.5,
      zoomControl: false,
      attributionControl: false,
      maxBounds: [
        [7.8, 74.0],
        [13.5, 78.5]
      ],
      maxBoundsViscosity: 0.9,
    });

    // Sleek CartoDB Dark Matter / Positron base tile layer for GIS thematic look
    const tileUrl = mapTheme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
      maxZoom: 18,
      subdomains: 'abcd',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapTheme]);

  // Render & Update GeoJSON Districts + Permanent District Labels
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old layers
    if (geoJsonLayerRef.current) {
      map.removeLayer(geoJsonLayerRef.current);
      geoJsonLayerRef.current = null;
    }
    if (labelsLayerRef.current) {
      map.removeLayer(labelsLayerRef.current);
      labelsLayerRef.current = null;
    }

    const labelsGroup = L.layerGroup();

    const getDistrictStyle = (feature: any) => {
      const distName = cleanDistrictName(feature?.properties?.district);
      const alert = alertMap[distName];
      const alertLevel = alert?.alertLevel || 'GREEN';
      const color = getAlertColorHex(alertLevel);

      const isUserDistrict = normalizedUserDistrict === distName;
      const isSelected = cleanDistrictName(selectedDistrict || '') === distName;

      if (isUserDistrict) {
        return {
          fillColor: color,
          fillOpacity: 0.85,
          color: '#38bdf8', // Neon cyan border for user district
          weight: 4,
          dashArray: '4, 4',
        };
      }

      if (isSelected) {
        return {
          fillColor: color,
          fillOpacity: 0.92,
          color: '#ffffff',
          weight: 3.5,
        };
      }

      return {
        fillColor: color,
        fillOpacity: 0.78,
        color: '#ffffff',
        weight: 1.8,
      };
    };

    const geoJsonLayer = L.geoJSON(KERALA_DISTRICTS_GEOJSON as any, {
      style: getDistrictStyle,
      onEachFeature: (feature, layer) => {
        const rawName = feature?.properties?.district || 'District';
        const canonicalName = cleanDistrictName(rawName);
        const alert = alertMap[canonicalName];
        const alertLevel = (alert?.alertLevel || 'GREEN').toUpperCase();
        const centerLat = feature?.properties?.centerLat || DISTRICT_CENTERS[canonicalName]?.lat || 10.0;
        const centerLng = feature?.properties?.centerLng || DISTRICT_CENTERS[canonicalName]?.lng || 76.3;

        // Permanent GIS text label over district centroid
        const isUserDist = canonicalName === normalizedUserDistrict;
        const labelIcon = L.divIcon({
          className: 'gis-district-permanent-label',
          html: `
            <div style="
              text-align: center;
              pointer-events: none;
              white-space: nowrap;
              transform: translate(-50%, -50%);
            ">
              <div style="
                font-family: system-ui, -apple-system, sans-serif;
                font-weight: 900;
                font-size: 11px;
                color: #ffffff;
                text-shadow: 0 1px 4px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.9);
                letter-spacing: 0.5px;
                line-height: 1.1;
              ">
                ${canonicalName}
              </div>
              ${isUserDist ? `
                <div style="
                  margin-top: 2px;
                  background: #0284c7;
                  color: #ffffff;
                  font-size: 7px;
                  font-weight: 900;
                  padding: 1px 4px;
                  border-radius: 3px;
                ">
                  YOU
                </div>
              ` : ''}
            </div>
          `,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });

        const labelMarker = L.marker([centerLat, centerLng], {
          icon: labelIcon,
          interactive: false,
        });
        labelsGroup.addLayer(labelMarker);

        // Hover tooltip
        const tooltipContent = `
          <div style="font-family: system-ui, sans-serif; padding: 4px 6px;">
            <div style="font-weight: 900; font-size: 14px; color: #0f172a; display: flex; align-items: center; gap: 6px;">
              <span>${canonicalName}</span>
              ${isUserDist ? '<span style="background:#0284c7; color:#fff; font-size:9px; padding:1px 6px; borderRadius:4px; font-weight:800;">YOUR LOCATION</span>' : ''}
            </div>
            <div style="font-size: 11px; color: #334155; margin-top: 3px; font-weight: 700;">
              Alert Status: <strong style="color: ${getAlertColorHex(alertLevel)}">${alertLevel} ALERT</strong>
            </div>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
              ${alert?.alertType || 'Click to view full district telemetry'}
            </div>
          </div>
        `;

        layer.bindTooltip(tooltipContent, {
          sticky: true,
          direction: 'auto',
          className: 'gis-district-tooltip',
        });

        // Polygon hover & click events
        layer.on({
          mouseover: (e) => {
            const target = e.target;
            target.setStyle({
              fillOpacity: 0.95,
              weight: 3,
            });
            if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
              target.bringToFront();
            }
          },
          mouseout: (e) => {
            geoJsonLayer.resetStyle(e.target);
          },
          click: () => {
            onSelectDistrict(canonicalName);
          },
        });
      },
    }).addTo(map);

    geoJsonLayerRef.current = geoJsonLayer;
    labelsLayerRef.current = labelsGroup.addTo(map);

    // FIT BOUNDS IMMEDIATELY SO KERALA OCCUPIES MOST OF VIEWPORT
    try {
      const bounds = geoJsonLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [10, 10],
          maxZoom: 10,
        });
      }
    } catch {
      // Ignore fitBounds error
    }
  }, [alertMap, normalizedUserDistrict, selectedDistrict, onSelectDistrict]);

  // Update User Location Marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }

    if (userLocation && Number.isFinite(userLocation.latitude) && Number.isFinite(userLocation.longitude)) {
      const userIcon = L.divIcon({
        className: 'custom-user-gps-marker',
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
            <div style="position: absolute; width: 36px; height: 36px; background: rgba(56, 189, 248, 0.4); border-radius: 50%; animation: pulse-ring 2s infinite ease-out;"></div>
            <div style="width: 18px; height: 18px; background: #0284c7; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 0 12px rgba(2, 132, 199, 0.9);"></div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([userLocation.latitude, userLocation.longitude], {
        icon: userIcon,
        zIndexOffset: 1000,
      }).addTo(map);

      marker.bindTooltip('<strong>🔵 You are here</strong>', {
        permanent: false,
        direction: 'top',
        offset: [0, -10],
      });

      userMarkerRef.current = marker;
    }
  }, [userLocation]);

  // Center map on selected district
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedDistrict) return;

    const canonical = cleanDistrictName(selectedDistrict);
    const center = DISTRICT_CENTERS[canonical];
    if (center) {
      map.flyTo([center.lat, center.lng], 9.2, { duration: 1.2 });
    }
  }, [selectedDistrict]);

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();

  const handleFitKeralaBounds = () => {
    if (geoJsonLayerRef.current && mapRef.current) {
      mapRef.current.fitBounds(geoJsonLayerRef.current.getBounds(), {
        padding: [10, 10],
        maxZoom: 10,
      });
    }
  };

  const handleLocateClick = () => {
    onLocateUser();
    if (userLocation && mapRef.current) {
      mapRef.current.flyTo([userLocation.latitude, userLocation.longitude], 9.5, { duration: 1.2 });
    }
  };

  return (
    <div className="relative w-full h-[620px] sm:h-[680px] lg:h-[760px] rounded-3xl overflow-hidden shadow-2xl border-2 border-slate-700/60 bg-[#090d16]">

      {/* GIS Header Overlay Bar */}
      <div className="absolute top-4 left-4 z-20 bg-slate-950/90 backdrop-blur-md border border-slate-700 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-3 text-white">
        <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping shrink-0" />
        <div>
          <h4 className="text-xs font-black tracking-wider uppercase text-emerald-400">
            Kerala GIS Thematic Disaster Map
          </h4>
          <p className="text-[10px] text-slate-300 font-medium">
            14 Districts Real-Time Telemetry & Hazard Layer
          </p>
        </div>
      </div>

      {/* Map Element */}
      <div ref={mapContainerRef} className="w-full h-full z-0 bg-[#090d16]" />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm z-30 flex items-center justify-center text-white">
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-700 px-6 py-4 rounded-2xl shadow-2xl">
            <Compass className="w-6 h-6 text-emerald-400 animate-spin" />
            <span className="text-sm font-black">Rendering Kerala District Boundaries...</span>
          </div>
        </div>
      )}

      {/* Floating Map Controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="w-10 h-10 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-white shadow-lg border border-slate-700 flex items-center justify-center font-bold hover:scale-105 transition"
        >
          <Plus className="w-5 h-5" />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="w-10 h-10 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-white shadow-lg border border-slate-700 flex items-center justify-center font-bold hover:scale-105 transition"
        >
          <Minus className="w-5 h-5" />
        </button>
        <button
          onClick={handleFitKeralaBounds}
          title="Fit Full Kerala Map"
          className="w-10 h-10 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-emerald-400 shadow-lg border border-slate-700 flex items-center justify-center font-bold hover:scale-105 transition"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleLocateClick}
          title="Locate Me"
          className="w-10 h-10 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white shadow-xl border border-emerald-500 flex items-center justify-center font-bold hover:scale-105 transition"
        >
          <Locate className="w-5 h-5" />
        </button>
      </div>

      {/* Floating GIS Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-20 bg-slate-950/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 shadow-2xl text-white text-xs max-w-[240px]">
        <div className="font-black uppercase tracking-wider text-[10px] text-slate-400 mb-2 border-b border-slate-800 pb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            Alert Level Scale
          </span>
          <span className="text-emerald-400 font-extrabold text-[9px]">LIVE</span>
        </div>

        <div className="space-y-2 font-bold text-[11px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-md bg-[#16a34a] border border-white/30 shrink-0" />
              <span className="text-slate-200">🟢 GREEN</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Safe</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-md bg-[#facc15] border border-white/30 shrink-0" />
              <span className="text-slate-200">🟡 YELLOW</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Watch</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-md bg-[#f97316] border border-white/30 shrink-0" />
              <span className="text-slate-200">🟠 ORANGE</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Warning</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-md bg-[#dc2626] border border-white/30 shrink-0" />
              <span className="text-slate-200">🔴 RED</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Critical</span>
          </div>

          {userLocation && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <span className="w-3.5 h-3.5 rounded-md bg-[#0284c7] ring-2 ring-sky-300 shrink-0" />
              <span className="text-sky-300 font-black text-[10px]">🔵 YOU ARE HERE</span>
            </div>
          )}
        </div>
      </div>

      {/* Custom Styles */}
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.6); opacity: 1; }
          100% { transform: scale(1.9); opacity: 0; }
        }
        .gis-district-tooltip {
          background: rgba(15, 23, 42, 0.95) !important;
          border: 1px solid #475569 !important;
          color: #ffffff !important;
          border-radius: 12px !important;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5) !important;
          padding: 6px 10px !important;
        }
        .gis-district-tooltip::before {
          display: none !important;
        }
      `}</style>
    </div>
  );
};
