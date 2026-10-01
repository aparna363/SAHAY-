import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Printer,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  X,
  Download,
  Building,
  ShieldCheck
} from 'lucide-react';
import { districtMaps, KERALA_DISTRICT_COORDS } from '../LiveMap/LiveMap';

interface StaticAdministrativeMapProps {
  district: string;
  onSwitchToLiveMap?: () => void;
  className?: string;
}

interface VillageData {
  number: number;
  name: string;
  taluk: string;
  color: string;
  vulnerability?: string;
  sdmaZone?: string;
  population?: number;
  areaKm2?: number;
}

// Complete 94 Revenue Villages of Kottayam District matching Official KSDMA Annexure 27
const KOTTAYAM_VILLAGES: VillageData[] = [
  // Changanassery Taluk (1 - 15, Soft Blue #bce4fa)
  { number: 1, name: 'Changanassery', taluk: 'Changanassery', color: '#bce4fa', vulnerability: 'Upper Kuttanad Inundation & Urban Runoff', sdmaZone: 'High Risk', population: 51000, areaKm2: 13.5 },
  { number: 2, name: 'Vazhappally East', taluk: 'Changanassery', color: '#bce4fa', vulnerability: 'Paddy Basin Waterlogging', sdmaZone: 'High Risk' },
  { number: 3, name: 'Vazhappally West', taluk: 'Changanassery', color: '#bce4fa', vulnerability: 'Canal Backflow Inundation', sdmaZone: 'High Risk' },
  { number: 4, name: 'Kurichy', taluk: 'Changanassery', color: '#bce4fa', vulnerability: 'Backwater Surge Zone', sdmaZone: 'High Risk' },
  { number: 5, name: 'Chethipuzha', taluk: 'Changanassery', color: '#bce4fa', vulnerability: 'Lowland Agricultural Flooding', sdmaZone: 'Moderate Risk' },
  { number: 6, name: 'Madappally', taluk: 'Changanassery', color: '#bce4fa', vulnerability: 'Runoff Channel Flooding', sdmaZone: 'Moderate Risk' },
  { number: 7, name: 'Thrikkodithanam', taluk: 'Changanassery', color: '#bce4fa', vulnerability: 'Stormwater Accumulation', sdmaZone: 'Moderate Risk' },
  { number: 8, name: 'Paippad', taluk: 'Changanassery', color: '#bce4fa', vulnerability: 'Manimala River Spillway Overflow', sdmaZone: 'High Risk' },
  { number: 9, name: 'Kangazha', taluk: 'Changanassery', color: '#bce4fa', vulnerability: 'Foothill Torrent Runoff', sdmaZone: 'Moderate Risk' },
  { number: 10, name: 'Nedumkunnam South', taluk: 'Changanassery', color: '#bce4fa', vulnerability: 'Slope Runoff & Siltation', sdmaZone: 'Moderate Risk' },
  { number: 11, name: 'Karukachal West', taluk: 'Changanassery', color: '#bce4fa', vulnerability: 'Drainage Choke Points', sdmaZone: 'Moderate Risk' },
  { number: 12, name: 'Vakathanam South', taluk: 'Changanassery', color: '#bce4fa', vulnerability: 'Lowland Silt Inundation', sdmaZone: 'Moderate Risk' },
  { number: 13, name: 'Thengana', taluk: 'Changanassery', color: '#bce4fa', vulnerability: 'Town Drainage Congestion', sdmaZone: 'Moderate Risk' },
  { number: 14, name: 'Perunna', taluk: 'Changanassery', color: '#bce4fa', vulnerability: 'Sub-Basin Water Stagnation', sdmaZone: 'Moderate Risk' },
  { number: 15, name: 'Puzhavathu', taluk: 'Changanassery', color: '#bce4fa', vulnerability: 'Canal Overflow Zone', sdmaZone: 'High Risk' },

  // Kanjirapally Taluk (16 - 26, Warm Peach #fbe4c8)
  { number: 16, name: 'Kanjirappally', taluk: 'Kanjirapally', color: '#fbe4c8', vulnerability: 'Highland Stream Flash Inundation', sdmaZone: 'Moderate Risk', population: 42000, areaKm2: 45 },
  { number: 17, name: 'Chirakkadavu', taluk: 'Kanjirapally', color: '#fbe4c8', vulnerability: 'River Tributary Overtopping', sdmaZone: 'Moderate Risk' },
  { number: 18, name: 'Cheruvally', taluk: 'Kanjirapally', color: '#fbe4c8', vulnerability: 'Manimala River Flood Plain', sdmaZone: 'High Risk' },
  { number: 19, name: 'Anakkal', taluk: 'Kanjirapally', color: '#fbe4c8', vulnerability: 'Valley Torrent Runoff', sdmaZone: 'Moderate Risk' },
  { number: 20, name: 'Koottickal', taluk: 'Kanjirapally', color: '#fbe4c8', vulnerability: 'Critical Landslide, Mudflow & Flash Flood Corridor', sdmaZone: 'Severe Risk' },
  { number: 21, name: 'Mundakayam', taluk: 'Kanjirapally', color: '#fbe4c8', vulnerability: 'Manimala River Gorge Torrent & Flash Floods', sdmaZone: 'Severe Risk' },
  { number: 22, name: 'Erumely North', taluk: 'Kanjirapally', color: '#fbe4c8', vulnerability: 'Pilgrim Corridor Flood Plain & River Spills', sdmaZone: 'High Risk' },
  { number: 23, name: 'Erumely South', taluk: 'Kanjirapally', color: '#fbe4c8', vulnerability: 'Forest Stream Flash Floods', sdmaZone: 'High Risk' },
  { number: 24, name: 'Manimala', taluk: 'Kanjirapally', color: '#fbe4c8', vulnerability: 'Riverbank Breach & Sediment Accumulation', sdmaZone: 'High Risk' },
  { number: 25, name: 'Elangulam', taluk: 'Kanjirapally', color: '#fbe4c8', vulnerability: 'Hill Terrain Soil Erosion', sdmaZone: 'Moderate Risk' },
  { number: 26, name: 'Koratty', taluk: 'Kanjirapally', color: '#fbe4c8', vulnerability: 'Stream Basin Water Surge', sdmaZone: 'Moderate Risk' },

  // Kottayam Taluk (27 - 52, Soft Lavender Pink #f7c3f0)
  { number: 27, name: 'Kumarakom', taluk: 'Kottayam', color: '#f7c3f0', vulnerability: 'Vembanad Lake Backwater Submergence', sdmaZone: 'Severe Risk', population: 24000, areaKm2: 51 },
  { number: 28, name: 'Aimanam', taluk: 'Kottayam', color: '#f7c3f0', vulnerability: 'Meenachil Tail Basin Severe Flooding', sdmaZone: 'Severe Risk' },
  { number: 29, name: 'Kaipuzha', taluk: 'Kottayam', color: '#f7c3f0', vulnerability: 'Lowland Inundation Corridor', sdmaZone: 'High Risk' },
  { number: 30, name: 'Arpookara', taluk: 'Kottayam', color: '#f7c3f0', vulnerability: 'Medical College Basin Stormwater Stagnation', sdmaZone: 'High Risk' },
  { number: 31, name: 'Athirampuzha', taluk: 'Kottayam', color: '#f7c3f0', vulnerability: 'Urban Overflow & Lowland Pockets', sdmaZone: 'Moderate Risk' },
  { number: 32, name: 'Perumbaikad', taluk: 'Kottayam', color: '#f7c3f0', vulnerability: 'Drainage Blockage Zone', sdmaZone: 'Moderate Risk' },
  { number: 33, name: 'Kottayam', taluk: 'Kottayam', color: '#f7c3f0', vulnerability: 'Town Center Flash Floods & River Siltation', sdmaZone: 'Moderate Risk', population: 60000, areaKm2: 18 },
  { number: 34, name: 'Nattakom', taluk: 'Kottayam', color: '#f7c3f0', vulnerability: 'Kodayar Canal & River Confluence Spills', sdmaZone: 'High Risk' },
  { number: 35, name: 'Panachikkad', taluk: 'Kottayam', color: '#f7c3f0', vulnerability: 'Low-Lying Wetlands Overflow', sdmaZone: 'Moderate Risk' },
  { number: 36, name: 'Vijayapuram', taluk: 'Kottayam', color: '#f7c3f0', vulnerability: 'Sub-Urban Stream Backflow', sdmaZone: 'Moderate Risk' },
  { number: 37, name: 'Manarcad', taluk: 'Kottayam', color: '#f7c3f0', vulnerability: 'Flash Torrent Channel Flooding', sdmaZone: 'Moderate Risk' },
  { number: 38, name: 'Ayarkunnam', taluk: 'Kottayam', color: '#f7c3f0', vulnerability: 'Meenachil Tributary Overtopping', sdmaZone: 'Moderate Risk' },
  { number: 39, name: 'Puthuppally', taluk: 'Kottayam', color: '#f7c3f0', vulnerability: 'Manimala Tributary Surge Zone', sdmaZone: 'Moderate Risk' },
  { number: 40, name: 'Thiruvarpu', taluk: 'Kottayam', color: '#f7c3f0', vulnerability: 'Backwater Ingress & Waterlogging', sdmaZone: 'High Risk' },
  { number: 41, name: 'Chengalam South', taluk: 'Kottayam', color: '#f7c3f0', vulnerability: 'Lowland Agricultural Inundation', sdmaZone: 'High Risk' },
  { number: 42, name: 'Chengalam East', taluk: 'Kottayam', color: '#f7c3f0', vulnerability: 'Paddy Embankment Breach Zone', sdmaZone: 'Moderate Risk' },
  { number: 43, name: 'Veloor', taluk: 'Kottayam', color: '#f7c3f0', vulnerability: 'River Confluence Waterlogging', sdmaZone: 'High Risk' },
  { number: 44, name: 'Thazhathangadi', taluk: 'Kottayam', color: '#f7c3f0', vulnerability: 'Meenachil Riverbank Direct Spill Zone', sdmaZone: 'High Risk' },
  { number: 45, name: 'Muttambalam', taluk: 'Kottayam', color: '#f7c3f0', vulnerability: 'Town Ridge Runoff Accumulation', sdmaZone: 'Moderate Risk' },
  { number: 46, name: 'Pambady', taluk: 'Kottayam', color: '#f7c3f0', vulnerability: 'Valley Stream Inundation', sdmaZone: 'Moderate Risk' },
  { number: 47, name: 'Meenadom', taluk: 'Kottayam', color: '#f7c3f0', vulnerability: 'Hill Terrain Watershed Surge', sdmaZone: 'Moderate Risk' },
  { number: 48, name: 'Kooroppada', taluk: 'Kottayam', color: '#f7c3f0', vulnerability: 'Midland Stream Flooding', sdmaZone: 'Moderate Risk' },
  { number: 49, name: 'Kooropada East', taluk: 'Kottayam', color: '#f7c3f0', vulnerability: 'Slope Water Infiltration Zone', sdmaZone: 'Moderate Risk' },
  { number: 50, name: 'Nedumkunnam', taluk: 'Kottayam', color: '#f7c3f0', vulnerability: 'Valley Creek Overtopping', sdmaZone: 'Moderate Risk' },
  { number: 51, name: 'Karukachal', taluk: 'Kottayam', color: '#f7c3f0', vulnerability: 'Midland Surface Runoff Congestion', sdmaZone: 'Moderate Risk' },
  { number: 52, name: 'Vakathanam', taluk: 'Kottayam', color: '#f7c3f0', vulnerability: 'Paddy Field Backwater Stagnation', sdmaZone: 'Moderate Risk' },

  // Meenachil Taluk (53 - 78, Mint Green #cbf3c8)
  { number: 53, name: 'Moonnilavu', taluk: 'Meenachil', color: '#cbf3c8', vulnerability: 'Critical Landslide Hazard Zone & Mountain Torrent', sdmaZone: 'Severe Risk' },
  { number: 54, name: 'Melukavu', taluk: 'Meenachil', color: '#cbf3c8', vulnerability: 'Hill Slope Instability & Flash Floods', sdmaZone: 'Severe Risk' },
  { number: 55, name: 'Teekoy', taluk: 'Meenachil', color: '#cbf3c8', vulnerability: 'Debris Flow, Landslip & Soil Piping Hazard', sdmaZone: 'Severe Risk' },
  { number: 56, name: 'Bharananganam', taluk: 'Meenachil', color: '#cbf3c8', vulnerability: 'Meenachil River Mid-Course Overflow', sdmaZone: 'High Risk' },
  { number: 57, name: 'Kondoor', taluk: 'Meenachil', color: '#cbf3c8', vulnerability: 'Flash Torrent Inundation', sdmaZone: 'High Risk' },
  { number: 58, name: 'Poonjar Thekkekara', taluk: 'Meenachil', color: '#cbf3c8', vulnerability: 'High Range Slope Failure & River Torrent', sdmaZone: 'Severe Risk' },
  { number: 59, name: 'Meenachil', taluk: 'Meenachil', color: '#cbf3c8', vulnerability: 'River Catchment Surge', sdmaZone: 'High Risk' },
  { number: 60, name: 'Poonjar', taluk: 'Meenachil', color: '#cbf3c8', vulnerability: 'Mountain Gorge Flash Flood Zone', sdmaZone: 'Severe Risk' },
  { number: 61, name: 'Lalam', taluk: 'Meenachil', color: '#cbf3c8', vulnerability: 'Pala Town Riverbank Flood Area', sdmaZone: 'High Risk' },
  { number: 62, name: 'Puliyannoor', taluk: 'Meenachil', color: '#cbf3c8', vulnerability: 'Meenachil Flood Plain Lowland', sdmaZone: 'High Risk' },
  { number: 63, name: 'Poovarany', taluk: 'Meenachil', color: '#cbf3c8', vulnerability: 'Tributary Water Surge', sdmaZone: 'Moderate Risk' },
  { number: 64, name: 'Erattupetta', taluk: 'Meenachil', color: '#cbf3c8', vulnerability: 'Flash Flood Funnel & Mountain Torrent Risk', sdmaZone: 'Severe Risk' },
  { number: 65, name: 'Thalappalam', taluk: 'Meenachil', color: '#cbf3c8', vulnerability: 'River Siltation & Water Accumulation', sdmaZone: 'High Risk' },
  { number: 66, name: 'Elikulam', taluk: 'Meenachil', color: '#cbf3c8', vulnerability: 'Slope Runoff Corridor', sdmaZone: 'Moderate Risk' },
  { number: 67, name: 'Karoor', taluk: 'Meenachil', color: '#cbf3c8', vulnerability: 'Meenachil River Meander Overflow', sdmaZone: 'High Risk' },
  { number: 68, name: 'Kidangoor', taluk: 'Meenachil', color: '#cbf3c8', vulnerability: 'Kidangoor Temple Basin Flooding', sdmaZone: 'High Risk' },
  { number: 69, name: 'Uzhavoor', taluk: 'Meenachil', color: '#cbf3c8', vulnerability: 'Valley Basin Water Accumulation', sdmaZone: 'Moderate Risk' },
  { number: 70, name: 'Monippally', taluk: 'Meenachil', color: '#cbf3c8', vulnerability: 'Stream Flood Crossings', sdmaZone: 'Moderate Risk' },
  { number: 71, name: 'Veliyannoor', taluk: 'Meenachil', color: '#cbf3c8', vulnerability: 'Hilly Watershed Runoff', sdmaZone: 'Moderate Risk' },
  { number: 72, name: 'Ramapuram', taluk: 'Meenachil', color: '#cbf3c8', vulnerability: 'Valley Stream Inundation Zone', sdmaZone: 'Moderate Risk' },
  { number: 73, name: 'Kurichithanam', taluk: 'Meenachil', color: '#cbf3c8', vulnerability: 'Lowland Agricultural Flooding', sdmaZone: 'Moderate Risk' },
  { number: 74, name: 'Kadanad', taluk: 'Meenachil', color: '#cbf3c8', vulnerability: 'Hill Torrent Flash Spill', sdmaZone: 'High Risk' },
  { number: 75, name: 'Kollappally', taluk: 'Meenachil', color: '#cbf3c8', vulnerability: 'Bridge Approaches Inundation Zone', sdmaZone: 'High Risk' },
  { number: 76, name: 'Kozhuvanal', taluk: 'Meenachil', color: '#cbf3c8', vulnerability: 'Stream Inundation Pockets', sdmaZone: 'Moderate Risk' },
  { number: 77, name: 'Akalakunnam', taluk: 'Meenachil', color: '#cbf3c8', vulnerability: 'Midland Drainage Basin Stagnation', sdmaZone: 'Moderate Risk' },
  { number: 78, name: 'Anicadu', taluk: 'Meenachil', color: '#cbf3c8', vulnerability: 'Hill Terrain Water Surge', sdmaZone: 'Moderate Risk' },

  // Vaikom Taluk (79 - 94, Dusty Red / Terracotta Rose #cf8282)
  { number: 79, name: 'Naduvile', taluk: 'Vaikom', color: '#cf8282', vulnerability: 'Vembanad Lake Estuary Backwater Floods', sdmaZone: 'High Risk' },
  { number: 80, name: 'Vaikom', taluk: 'Vaikom', color: '#cf8282', vulnerability: 'Coastal Lake Tidal Inundation & Temple Basin Stagnation', sdmaZone: 'High Risk', population: 23000, areaKm2: 8.7 },
  { number: 81, name: 'Udayanapuram', taluk: 'Vaikom', color: '#cf8282', vulnerability: 'Tidal Canal Ingress & Salinity Intrusion', sdmaZone: 'High Risk' },
  { number: 82, name: 'Vadakkemuri', taluk: 'Vaikom', color: '#cf8282', vulnerability: 'Lake Basin Flooding', sdmaZone: 'High Risk' },
  { number: 83, name: 'Kulasekharamangalam', taluk: 'Vaikom', color: '#cf8282', vulnerability: 'Low-Lying Island Sector Submergence', sdmaZone: 'Severe Risk' },
  { number: 84, name: 'Chemmanathukara', taluk: 'Vaikom', color: '#cf8282', vulnerability: 'Muvattupuzha River Tail Inundation', sdmaZone: 'High Risk' },
  { number: 85, name: 'Velloor', taluk: 'Vaikom', color: '#cf8282', vulnerability: 'Muvattupuzha River Overtopping & Industrial Corridor Spills', sdmaZone: 'High Risk' },
  { number: 86, name: 'Manjoor', taluk: 'Vaikom', color: '#cf8282', vulnerability: 'Lowland Agricultural Inundation', sdmaZone: 'Moderate Risk' },
  { number: 87, name: 'Kaduthuruthy', taluk: 'Vaikom', color: '#cf8282', vulnerability: 'River Confluence Water Stagnation Zone', sdmaZone: 'High Risk' },
  { number: 88, name: 'Memuri', taluk: 'Vaikom', color: '#cf8282', vulnerability: 'Paddy Basin Waterlogging', sdmaZone: 'Moderate Risk' },
  { number: 89, name: 'Mulakkulam', taluk: 'Vaikom', color: '#cf8282', vulnerability: 'Muvattupuzha River Bank Erosion & Floods', sdmaZone: 'High Risk' },
  { number: 90, name: 'Muttuchira', taluk: 'Vaikom', color: '#cf8282', vulnerability: 'Canal Embankment Spills', sdmaZone: 'Moderate Risk' },
  { number: 91, name: 'Njeezhoor', taluk: 'Vaikom', color: '#cf8282', vulnerability: 'Valley Stream Inundation', sdmaZone: 'Moderate Risk' },
  { number: 92, name: 'Kuravilangad', taluk: 'Vaikom', color: '#cf8282', vulnerability: 'Town Surface Runoff Congestion', sdmaZone: 'Moderate Risk' },
  { number: 93, name: 'Kanakkary', taluk: 'Vaikom', color: '#cf8282', vulnerability: 'Low-Lying Roadway Submergence', sdmaZone: 'Moderate Risk' },
  { number: 94, name: 'Kothanalloor', taluk: 'Vaikom', color: '#cf8282', vulnerability: 'Agricultural Lowland Flooding', sdmaZone: 'Moderate Risk' }
];

// Official Taluk Metadata for Kottayam District
const KOTTAYAM_TALUKS = [
  { name: 'Vaikom', color: '#cf8282', range: 'Villages #79 - #94 (16 Villages)', hq: 'Vaikom Taluk Office', areaKm2: 220, pop: 320000, risk: 'Vembanad Lake Surge & Tidal Flooding' },
  { name: 'Meenachil', color: '#cbf3c8', range: 'Villages #53 - #78 (26 Villages)', hq: 'Pala Taluk Office', areaKm2: 440, pop: 410000, risk: 'Flash Floods & Mountain Slope Soil Piping' },
  { name: 'Kottayam', color: '#f7c3f0', range: 'Villages #27 - #52 (26 Villages)', hq: 'Kottayam Mini Civil Station', areaKm2: 345, pop: 532000, risk: 'Severe Waterlogging & Flash Floods (Meenachil Basin)' },
  { name: 'Changanassery', color: '#bce4fa', range: 'Villages #1 - #15 (15 Villages)', hq: 'Changanassery Taluk Office', areaKm2: 242, pop: 395000, risk: 'Upper Kuttanad Inundation & Embankment Breaches' },
  { name: 'Kanjirapally', color: '#fbe4c8', range: 'Villages #16 - #26 (11 Villages)', hq: 'Kanjirappally Mini Civil Station', areaKm2: 565, pop: 380000, risk: 'Landslide Hazard, Soil Erosion & Flash Inundation' }
];

export const StaticAdministrativeMap: React.FC<StaticAdministrativeMapProps> = ({
  district,
  onSwitchToLiveMap,
  className = ''
}) => {
  const isKottayam = district.toLowerCase().trim() === 'kottayam';
  
  // Interactive View Controls
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panPosition, setPanPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Taluk Filter & Village Search
  const [selectedTaluk, setSelectedTaluk] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedVillage, setSelectedVillage] = useState<VillageData | null>(null);

  // Leaflet Map ref for other districts
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const boundariesLayerRef = useRef<L.GeoJSON | null>(null);

  // Filtered villages for directory
  const filteredVillages = useMemo(() => {
    return KOTTAYAM_VILLAGES.filter(v => {
      const matchTaluk = selectedTaluk === 'all' || v.taluk.toLowerCase() === selectedTaluk.toLowerCase();
      const query = searchQuery.trim().toLowerCase();
      const matchQuery = !query ||
        v.name.toLowerCase().includes(query) ||
        String(v.number) === query ||
        v.taluk.toLowerCase().includes(query);
      return matchTaluk && matchQuery;
    });
  }, [selectedTaluk, searchQuery]);

  // Reset zoom & pan
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 3.5));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.75));

  // Pan dragging handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Initialize Leaflet Map for other districts if not Kottayam
  useEffect(() => {
    if (isKottayam || !mapContainerRef.current || mapRef.current) return;

    const matchedKey = Object.keys(KERALA_DISTRICT_COORDS).find(
      k => k.toLowerCase() === district.toLowerCase().trim()
    );
    const center: [number, number] = (matchedKey && KERALA_DISTRICT_COORDS[matchedKey])
      ? KERALA_DISTRICT_COORDS[matchedKey]
      : [9.5916, 76.5222];

    const map = L.map(mapContainerRef.current, {
      center: center,
      zoom: 11,
      zoomControl: false,
      attributionControl: false
    });

    const matchedMapKey = Object.keys(districtMaps).find(
      k => k.toLowerCase() === district.toLowerCase().trim()
    );
    const mapUrl = matchedMapKey ? districtMaps[matchedMapKey] : `/maps/${district.toLowerCase()}.geojson`;

    fetch(mapUrl)
      .then(res => res.json())
      .then(data => {
        if (boundariesLayerRef.current) {
          boundariesLayerRef.current.remove();
        }
        const geoLayer = L.geoJSON(data, {
          style: (feat) => ({
            color: feat?.properties?.adminType === 'district' ? '#000000' : '#1f2937',
            weight: feat?.properties?.adminType === 'district' ? 3 : 1.2,
            fillColor: feat?.properties?.color || '#e5e7eb',
            fillOpacity: 0.85
          })
        }).addTo(map);
        boundariesLayerRef.current = geoLayer;
        try {
          const b = geoLayer.getBounds();
          if (b.isValid()) map.fitBounds(b, { padding: [20, 20] });
        } catch (err) {
          // ignore
        }
      })
      .catch(console.error);

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isKottayam, district]);

  return (
    <div className={`relative flex flex-col w-full bg-white select-none ${isFullscreen ? 'fixed inset-0 z-50 overflow-hidden' : 'rounded-3xl border border-slate-300 shadow-xl overflow-hidden'} ${className}`}>

      {/* TOP COMMAND TOOLBAR */}
      <div className="bg-slate-900 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-800 print:hidden">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              <span>{district} District Map</span>
            </h2>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold uppercase">
            Official KSDMA DDMP Annexure 27
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Zoom Controls for Cartographic Plate */}
          {isKottayam && (
            <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700">
              <button
                onClick={handleZoomIn}
                className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleResetZoom}
                className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors"
                title="Reset View"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono px-2 text-slate-400 font-bold">
                {Math.round(zoomLevel * 100)}%
              </span>
            </div>
          )}

          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5"
            title="Print Official Map Sheet"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print Sheet</span>
          </button>

          {isKottayam && (
            <a
              href="/maps/kottayam_admin_official.png"
              download="Kottayam_District_Administrative_Subdivisions_KSDMA.png"
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5"
              title="Download High-Res Plate"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </a>
          )}

          {onSwitchToLiveMap && (
            <button
              onClick={onSwitchToLiveMap}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <span>⚡ Switch to Live Disaster Map</span>
            </button>
          )}

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA: MAP SHEET + INTERACTIVE DOSSIER DIRECTORY */}
      <div className="relative flex-1 flex flex-col lg:flex-row w-full bg-slate-100 overflow-hidden min-h-[700px]">

        {/* LEFT / CENTER: THE AUTHENTIC KSDMA MAP PLATE */}
        <div
          className={`relative flex-1 flex flex-col items-center justify-center p-3 sm:p-6 bg-slate-200/80 overflow-hidden ${zoomLevel > 1 ? 'cursor-grab active:cursor-grabbing' : ''}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {isKottayam ? (
            <div className="relative flex flex-col items-center max-w-full">
              {/* Paper Plate Canvas Container */}
              <div
                className="relative bg-white border-2 border-black p-2 shadow-2xl transition-transform duration-75 select-none"
                style={{
                  transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel})`,
                  transformOrigin: 'center center'
                }}
              >
                {/* The Exact Official High-Res Map Plate from KSDMA Annexure 27 */}
                <img
                  src="/maps/kottayam_admin_official.png"
                  alt="FIGURE 1: ADMINISTRATIVE SUBDIVISIONS OF KOTTAYAM DISTRICT (ANNEXURE 27)"
                  className="w-full max-w-[850px] h-auto object-contain block pointer-events-none"
                  draggable={false}
                />
              </div>

              {/* Official Document Caption directly beneath the map plate */}
              <div className="mt-3 text-center print:mt-1">
                <div className="text-xs sm:text-sm font-black font-serif uppercase tracking-wider text-black">
                  FIGURE 1: ADMINISTRATIVE SUBDIVISIONS OF KOTTAYAM DISTRICT (ANNEXURE 27)
                </div>
                <div className="text-[10px] text-slate-600 font-serif mt-0.5">
                  STATE EMERGENCY OPERATIONS CENTRE (SEOC), DEPARTMENT OF DISASTER MANAGEMENT, GOVT OF KERALA
                </div>
              </div>
            </div>
          ) : (
            <div ref={mapContainerRef} className="w-full h-full min-h-[600px] bg-white border border-black" />
          )}

          {/* Quick Floating Hint */}
          {zoomLevel > 1 && (
            <div className="absolute bottom-4 left-4 z-10 bg-slate-900/80 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-[11px] font-medium shadow-lg pointer-events-none">
              Drag to pan across district subdivisions
            </div>
          )}
        </div>

        {/* RIGHT: INTERACTIVE ADMINISTRATIVE DOSSIER & 94 VILLAGES DIRECTORY */}
        {isKottayam && (
          <div className="w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-l border-slate-300 flex flex-col shadow-lg z-10">

            {/* Directory Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-emerald-700" />
                    <span>Administrative Jurisdictions</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    5 Taluks &bull; 94 Revenue Villages
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
                  KSDMA DDMP
                </span>
              </div>

              {/* Taluk Quick Filter Buttons */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => { setSelectedTaluk('all'); setSelectedVillage(null); }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                    selectedTaluk === 'all'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  All (94)
                </button>
                {KOTTAYAM_TALUKS.map(t => (
                  <button
                    key={t.name}
                    onClick={() => { setSelectedTaluk(t.name); setSelectedVillage(null); }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all border flex items-center gap-1 ${
                      selectedTaluk.toLowerCase() === t.name.toLowerCase()
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: t.color }}></span>
                    <span>{t.name}</span>
                  </button>
                ))}
              </div>

              {/* Village Quick Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search village name or number (e.g. 40, Kumarakom)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Selected Village / Taluk Dossier Card */}
            {selectedVillage ? (
              <div className="p-4 bg-emerald-50/70 border-b border-emerald-200 animate-fadeIn space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-black uppercase text-slate-900 border border-slate-400"
                      style={{ backgroundColor: selectedVillage.color }}
                    >
                      Village #{selectedVillage.number}
                    </span>
                    <h4 className="text-sm font-black text-slate-900 mt-1">
                      {selectedVillage.name} Village
                    </h4>
                  </div>
                  <button
                    onClick={() => setSelectedVillage(null)}
                    className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-emerald-100 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-emerald-200 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Taluk Jurisdiction:</span>
                    <strong className="text-slate-900">{selectedVillage.taluk} Taluk</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Parent District:</span>
                    <strong className="text-slate-900">Kottayam</strong>
                  </div>
                  {selectedVillage.population && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Population:</span>
                      <strong className="text-slate-900">{selectedVillage.population.toLocaleString()}</strong>
                    </div>
                  )}
                  {selectedVillage.areaKm2 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Area:</span>
                      <strong className="text-slate-900">{selectedVillage.areaKm2} sq. km</strong>
                    </div>
                  )}
                </div>

                <div className="bg-emerald-100/60 p-2.5 rounded-xl border border-emerald-300 text-xs space-y-1">
                  <div className="font-bold text-emerald-950 flex items-center gap-1 text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                    <span>KSDMA Baseline Risk Profile</span>
                  </div>
                  <p className="text-[11px] text-emerald-900 leading-relaxed font-medium">
                    {selectedVillage.vulnerability || 'Standard revenue village jurisdiction under DDMA Kottayam baseline plan.'}
                  </p>
                </div>
              </div>
            ) : selectedTaluk !== 'all' ? (
              // Selected Taluk Summary
              (() => {
                const talukInfo = KOTTAYAM_TALUKS.find(t => t.name.toLowerCase() === selectedTaluk.toLowerCase());
                if (!talukInfo) return null;
                return (
                  <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded border border-black" style={{ backgroundColor: talukInfo.color }}></span>
                      <h4 className="text-sm font-black text-slate-900">{talukInfo.name} Taluk</h4>
                    </div>
                    <p className="text-xs text-slate-600 font-semibold">{talukInfo.range}</p>
                    <div className="bg-white p-2 rounded-xl border border-slate-200 text-xs space-y-1 text-slate-700">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Headquarters:</span>
                        <strong className="text-slate-900">{talukInfo.hq}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Area:</span>
                        <strong className="text-slate-900">{talukInfo.areaKm2} sq. km</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Population:</span>
                        <strong className="text-slate-900">{talukInfo.pop.toLocaleString()}</strong>
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-600 italic">
                      {talukInfo.risk}
                    </div>
                  </div>
                );
              })()
            ) : null}

            {/* 94 Revenue Villages Scrollable Directory List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1 divide-y divide-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 pb-1 flex justify-between">
                <span>Revenue Villages ({filteredVillages.length})</span>
                <span>Click to Inspect</span>
              </div>

              {filteredVillages.map(v => (
                <div
                  key={v.number}
                  onClick={() => setSelectedVillage(v)}
                  className={`pt-1.5 pb-1.5 px-2 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                    selectedVillage?.number === v.number
                      ? 'bg-emerald-100 border border-emerald-300'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-6 h-5 rounded flex items-center justify-center text-[10px] font-mono font-black border border-black shrink-0 text-black shadow-2xs"
                      style={{ backgroundColor: v.color }}
                    >
                      {v.number}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-800 leading-tight">
                        {v.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        {v.taluk} Taluk
                      </div>
                    </div>
                  </div>

                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                    #{v.number}
                  </span>
                </div>
              ))}

              {filteredVillages.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-400">
                  No villages match "{searchQuery}"
                </div>
              )}
            </div>

            {/* SEOC Reference Footnote */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-500 text-center font-serif">
              State Emergency Operations Centre (SEOC) &bull; KSDMA DDMP Baseline
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
