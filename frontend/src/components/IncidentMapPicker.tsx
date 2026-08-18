import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, Search, AlertCircle, CheckCircle2, Compass } from 'lucide-react';

// Fix Leaflet default icon URL issues in Vite build safely
try {
  if (L && L.Icon && L.Icon.Default && L.Icon.Default.prototype) {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  }
} catch (e) {
  // Ignore fallback icon override warnings
}

// Helper: Reverse Geocode coordinates to human readable address using OpenStreetMap Nominatim
export const reverseGeocodeCoords = async (lat: number, lng: number): Promise<string> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`,
      {
        headers: { 'Accept-Language': 'en' },
        signal: controller.signal
      }
    );
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const addr = data.address || {};

      const place =
        addr.village ||
        addr.suburb ||
        addr.town ||
        addr.city ||
        addr.neighbourhood ||
        addr.hamlet ||
        addr.quarter ||
        addr.road ||
        addr.amenity ||
        addr.building ||
        null;

      const district =
        addr.state_district ||
        addr.district ||
        addr.county ||
        null;

      const state = addr.state || 'Kerala';

      const parts: string[] = [];
      if (place) parts.push(place);
      if (district && district.toLowerCase() !== (place || '').toLowerCase()) {
        parts.push(district.replace(/\s+district\b/gi, ''));
      }
      if (state && !parts.join(', ').toLowerCase().includes(state.toLowerCase())) {
        parts.push(state);
      }

      if (parts.length > 0) {
        return parts.join(', ');
      }

      if (data.display_name) {
        return data.display_name.split(',').slice(0, 3).map((s: string) => s.trim()).join(', ');
      }
    }
  } catch (err) {
    console.warn('[IncidentMapPicker] Reverse geocoding fetch error:', err);
  }

  return `Location (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`;
};

// Development Presets for testing (Requirement Section 7 & 44)
export const DEV_TEST_LOCATIONS = [
  { name: 'Kottayam (Kanjirappally)', lat: 9.5558, lng: 76.7884, address: 'Kanjirappally, Kottayam, Kerala' },
  { name: 'Idukki (Munnar / Meppadi)', lat: 10.0889, lng: 77.0595, address: 'Munnar, Idukki District, Kerala' },
  { name: 'Wayanad (Kalpetta)', lat: 11.6050, lng: 76.0830, address: 'Kalpetta, Wayanad, Kerala' },
  { name: 'Ernakulam (Aluva River Basin)', lat: 10.1080, lng: 76.3570, address: 'Aluva, Ernakulam, Kerala' },
  { name: 'Thrissur (Chalakudy)', lat: 10.3070, lng: 76.3330, address: 'Chalakudy, Thrissur, Kerala' }
];

interface IncidentMapPickerProps {
  latitude: number | null;
  longitude: number | null;
  onLocationSelect: (lat: number, lng: number, address?: string) => void;
  locationError?: string | null;
}

export const IncidentMapPicker: React.FC<IncidentMapPickerProps> = ({
  latitude,
  longitude,
  onLocationSelect,
  locationError: externalLocationError
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(externalLocationError || null);
  const [manualAddress, setManualAddress] = useState<string>('');

  const currentLat = latitude ?? 9.5916; // Default Kerala center
  const currentLng = longitude ?? 76.5222;

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [currentLat, currentLng],
        zoom: latitude && longitude ? 13 : 8,
        scrollWheelZoom: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      // Map Click Event listener with automatic reverse geocoding
      map.on('click', async (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        setManualAddress(`Resolving address for ${lat.toFixed(4)}°, ${lng.toFixed(4)}°...`);
        const resolvedAddr = await reverseGeocodeCoords(lat, lng);
        setManualAddress(resolvedAddr);
        onLocationSelect(lat, lng, resolvedAddr);
      });

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Marker Position and Map Center whenever latitude / longitude props change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    if (latitude !== null && longitude !== null) {
      const latLng: [number, number] = [latitude, longitude];

      if (markerRef.current) {
        markerRef.current.setLatLng(latLng);
      } else {
        const customPinIcon = L.divIcon({
          className: 'custom-leaflet-marker',
          html: `<div class="bg-red-600 text-white rounded-full p-2 shadow-2xl border-2 border-white animate-bounce">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 36]
        });
        markerRef.current = L.marker(latLng, { icon: customPinIcon }).addTo(map);
      }

      map.setView(latLng, Math.max(map.getZoom(), 12), { animate: true });
    }
  }, [latitude, longitude]);

  // Method 1: Request Browser Geolocation with reverse geocoding
  const handleGetBrowserLocation = () => {
    setIsLocating(true);
    setGpsError(null);

    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser. Please select location manually on the map.');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setGpsError(null);
        setManualAddress(`Detecting location address (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)...`);
        
        // Reverse geocode to get actual place name
        const address = await reverseGeocodeCoords(lat, lng);
        setIsLocating(false);
        setManualAddress(address);
        onLocationSelect(lat, lng, address);
      },
      (error) => {
        setIsLocating(false);
        let msg = 'Unable to obtain browser location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location access is denied. Please select the incident location manually on the map.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location position unavailable. Please pick location manually on map.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out. Please select location manually.';
        }
        setGpsError(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Search location search query
  const handleSearchLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Search against development preset locations or match coordinates
    const matchedPreset = DEV_TEST_LOCATIONS.find(loc =>
      loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.address.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (matchedPreset) {
      onLocationSelect(matchedPreset.lat, matchedPreset.lng, matchedPreset.address);
      setSearchQuery('');
      return;
    }

    // Coordinate parser format "lat, lng"
    const coordParts = searchQuery.split(',');
    if (coordParts.length === 2) {
      const lat = parseFloat(coordParts[0].trim());
      const lng = parseFloat(coordParts[1].trim());
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        onLocationSelect(lat, lng, `Manual Coordinates (${lat}, ${lng})`);
        setSearchQuery('');
        return;
      }
    }

    alert(`Location "${searchQuery}" not recognized. Please click directly on the interactive map or choose a test location.`);
  };

  return (
    <div className="space-y-4">
      {/* Search & Browser Location Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Method 1 Button */}
        <button
          type="button"
          onClick={handleGetBrowserLocation}
          disabled={isLocating}
          className="inline-flex items-center justify-center gap-2 bg-[#043e2e] hover:bg-[#065f46] text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
        >
          <Navigation className={`w-4 h-4 text-emerald-400 ${isLocating ? 'animate-spin' : ''}`} />
          <span>{isLocating ? 'Detecting GPS...' : 'Use My Browser Location'}</span>
        </button>

        {/* Location Search Bar */}
        <form onSubmit={handleSearchLocation} className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search location or enter 'lat, lng' (e.g. 9.59, 76.52)..."
            className="w-full bg-slate-100 border border-slate-300 rounded-xl pl-9 pr-20 py-2 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1 rounded-lg text-xs font-bold transition-all"
          >
            Search
          </button>
        </form>
      </div>

      {/* GPS Location Error Warning (Requirement Section 8) */}
      {(gpsError || externalLocationError) && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-3.5 rounded-r-xl flex items-start gap-3 text-xs sm:text-sm text-amber-900">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-950">Location Access Warning</p>
            <p className="mt-0.5 text-amber-800">{gpsError || externalLocationError}</p>
          </div>
        </div>
      )}

      {/* Development Mode Quick Test Locations (Requirement Section 7 & 44) */}
      <div className="bg-slate-100 p-3 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 mb-2">
          <Compass className="w-3.5 h-3.5 text-emerald-600" />
          <span>Quick Select Test Locations (Kerala Emergency Hotspots):</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {DEV_TEST_LOCATIONS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onLocationSelect(preset.lat, preset.lng, preset.address)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all shadow-sm ${
                latitude === preset.lat && longitude === preset.lng
                  ? 'bg-emerald-800 border-emerald-900 text-white ring-2 ring-emerald-400'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-emerald-500'
              }`}
            >
              📍 {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Method 2: Interactive Leaflet Map Container */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-slate-300 shadow-inner bg-slate-200" style={{ height: '320px' }}>
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Click Instruction Badge */}
        <div className="absolute top-3 right-3 z-[400] bg-slate-900/80 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-lg pointer-events-none flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-red-400" />
          <span>Click anywhere on map to set pin position</span>
        </div>
      </div>

      {/* Selected Location Summary Box */}
      {latitude !== null && longitude !== null ? (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 text-white rounded-full p-2 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-950 uppercase tracking-wide">Selected Location Confirmed</p>
              <p className="text-xs sm:text-sm font-semibold text-emerald-900 mt-0.5">
                Latitude: <span className="font-mono text-emerald-950">{latitude.toFixed(6)}°</span> | Longitude: <span className="font-mono text-emerald-950">{longitude.toFixed(6)}°</span>
              </p>
              {manualAddress && <p className="text-xs text-emerald-700 mt-0.5 font-normal">{manualAddress}</p>}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center text-xs text-red-700 font-bold">
          ⚠️ Please select a location using your browser GPS, clicking on the map, or selecting a test location above.
        </div>
      )}
    </div>
  );
};
