import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Camera,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  User,
  Shield,
  Upload,
  Trash2,
  Navigation,
  FileText,
  Home,
  RotateCw,
  Send,
  Info,
  Lock,
  Scale
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  fetchFieldOfficerClaimDetail,
  fetchSdrfNorms,
  uploadFieldOfficerPhotos,
  submitFieldOfficerReport,
  type SdrfNorm
} from '../../services/api';

interface FieldVisitDetailPageProps {
  claimId: string | number;
  onBack: () => void;
  onSuccess: () => void;
}

// Haversine distance calculator in frontend
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371e3;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1);
  const deltaLambda = toRad(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export const FieldVisitDetailPage: React.FC<FieldVisitDetailPageProps> = ({
  claimId,
  onBack,
  onSuccess
}) => {
  const [claim, setClaim] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [visitDate, setVisitDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [visitTime, setVisitTime] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [actualDamageObserved, setActualDamageObserved] = useState<string>('');
  const [damageCategory, setDamageCategory] = useState<string>('Severely Damaged');
  const [officerRemarks, setOfficerRemarks] = useState<string>('');

  // SDRF Normative Assessment Fields (Configurable Rules)
  const [sdrfNorms, setSdrfNorms] = useState<SdrfNorm[]>([]);
  const [sdrfCategory, setSdrfCategory] = useState<string>('House Damage');
  const [propertyType, setPropertyType] = useState<string>('Residential House');
  const [geographicZone, setGeographicZone] = useState<'Plains' | 'Hilly'>('Plains');
  const [damagePercentage, setDamagePercentage] = useState<number>(75);
  const [affectedQuantity, setAffectedQuantity] = useState<number>(1);
  const [matchedNorm, setMatchedNorm] = useState<SdrfNorm | null>(null);
  const [calculationBasis, setCalculationBasis] = useState<string>('');
  const [isEligible, setIsEligible] = useState<boolean>(true);
  const [calculatedAssistance, setCalculatedAssistance] = useState<number>(0);

  // GPS Verification
  const [officerLat, setOfficerLat] = useState<number | null>(null);
  const [officerLng, setOfficerLng] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [isCapturingGPS, setIsCapturingGPS] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [locationConfirmed, setLocationConfirmed] = useState(true);

  // Photographs
  const [uploadedOfficerPhotos, setUploadedOfficerPhotos] = useState<any[]>([]);
  const [newSelectedFiles, setNewSelectedFiles] = useState<File[]>([]);
  const [newFilePreviews, setNewFilePreviews] = useState<string[]>([]);
  const [photoDescription, setPhotoDescription] = useState('Ground structural damage verified');
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Applicant Acknowledgement
  const [applicantPresent, setApplicantPresent] = useState(true);
  const [identityVerified, setIdentityVerified] = useState(true);
  const [applicantConfirmedName, setApplicantConfirmedName] = useState('');
  const [applicantAcknowledgementNotes, setApplicantAcknowledgementNotes] = useState(
    'Applicant was physically present during the inspection and acknowledged the recorded damage details.'
  );

  // Outcome & Correction
  const [reportOutcome, setReportOutcome] = useState<'VERIFIED' | 'REQUIRES_CORRECTION'>('VERIFIED');
  const [correctionInstructions, setCorrectionInstructions] = useState('');

  // Lightbox
  const [previewMedia, setPreviewMedia] = useState<{ url: string; title: string } | null>(null);

  // Mini Map ref
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Derived distinct categories from active configured norms
  const availableCategories = useMemo(() => {
    const cats = Array.from(new Set(sdrfNorms.map((n) => n.damage_category).filter(Boolean)));
    return cats.length > 0 ? cats : [
      'House Damage',
      'Agricultural / Crop Loss',
      'Livestock Loss',
      'Fisheries / Boat & Craft Loss',
      'Handicrafts / Artisans / Micro-Enterprise',
      'Immediate Gratuitous Relief / Essential Items'
    ];
  }, [sdrfNorms]);

  // Derived simplified House Types / Property types
  const availablePropertyTypes = useMemo(() => {
    if (sdrfCategory.toLowerCase().includes('hous') || !sdrfCategory) {
      return ['Residential House', 'Apartment / Flat', 'Other Residential Structure'];
    }
    const props = Array.from(
      new Set(
        sdrfNorms
          .filter((n) => n.damage_category.toLowerCase() === sdrfCategory.toLowerCase())
          .map((n) => n.property_type)
          .filter((p) => p && p !== 'ALL')
      )
    );
    if (props.length > 0) return props;
    if (sdrfCategory === 'Agricultural / Crop Loss') {
      return ['Rainfed Land', 'Irrigated Land', 'Perennial / Plantation Crops'];
    }
    if (sdrfCategory === 'Livestock Loss') {
      return ['Milch Cattle / Buffalo', 'Goat / Sheep / Pig', 'Commercial / Backyard Poultry'];
    }
    return ['Residential House', 'Apartment / Flat', 'Other Residential Structure'];
  }, [sdrfNorms, sdrfCategory]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFieldOfficerClaimDetail(claimId);
      setClaim(data);

      // Load active SDRF Norms from backend / database
      let loadedNorms: SdrfNorm[] = [];
      if (data.sdrfNorms && data.sdrfNorms.length > 0) {
        loadedNorms = data.sdrfNorms;
      } else {
        try {
          loadedNorms = await fetchSdrfNorms();
        } catch {
          loadedNorms = [];
        }
      }
      setSdrfNorms(loadedNorms);

      // Determine default geographic zone (Wayanad & Idukki are official hilly districts)
      const districtLower = (data.district || '').toLowerCase();
      const isHilly = districtLower.includes('wayanad') || districtLower.includes('idukki');
      const defaultZone = isHilly ? 'Hilly' : 'Plains';
      setGeographicZone(defaultZone);

      // Prepopulate form if existing verification record exists
      if (data.verificationRecord) {
        const vr = data.verificationRecord;
        if (vr.damage_observed) setActualDamageObserved(vr.damage_observed);
        if (vr.verified_damage_category) setDamageCategory(vr.verified_damage_category);
        else if (data.damage_severity) setDamageCategory(data.damage_severity);

        // Prepopulate SDRF Assessment values if saved
        if (vr.damage_category) setSdrfCategory(vr.damage_category);
        if (vr.property_type) setPropertyType(vr.property_type);
        if (vr.geographic_zone) setGeographicZone(vr.geographic_zone as 'Plains' | 'Hilly');
        if (vr.damage_percentage !== undefined && vr.damage_percentage !== null) {
          setDamagePercentage(parseFloat(vr.damage_percentage));
        }
        if (vr.affected_quantity !== undefined && vr.affected_quantity !== null) {
          setAffectedQuantity(parseFloat(vr.affected_quantity));
        }

        if (vr.recommended_assistance && parseFloat(vr.recommended_assistance) > 0) {
          setCalculatedAssistance(parseFloat(vr.recommended_assistance));
        }
        if (vr.calculation_basis) setCalculationBasis(vr.calculation_basis);

        if (vr.officer_remarks) setOfficerRemarks(vr.officer_remarks);
        if (vr.officer_latitude && vr.officer_longitude) {
          setOfficerLat(parseFloat(vr.officer_latitude));
          setOfficerLng(parseFloat(vr.officer_longitude));
        }
        if (vr.applicant_name_confirmed) setApplicantConfirmedName(vr.applicant_name_confirmed);
        else setApplicantConfirmedName(data.applicant_name || '');

        if (vr.reverification_notes) setCorrectionInstructions(vr.reverification_notes);
      } else {
        // Smart initialization from citizen application baseline
        const dt = (data.damage_type || data.assistance_category || '').toLowerCase();
        let cat = 'House Damage';
        let prop = 'Pucca / Concrete / Brick';
        let dmgPct = 75;
        let qty = 1;

        if (dt.includes('crop') || dt.includes('agri')) {
          cat = 'Agricultural / Crop Loss';
          prop = dt.includes('rubber') || dt.includes('banana') ? 'Perennial / Plantation Crops' : (data.agricultural_land_type === 'Irrigated' ? 'Irrigated Land' : 'Rainfed Land');
          dmgPct = parseFloat(data.crop_loss_percentage) || 50;
          qty = parseFloat(data.affected_crop_area) || 1.0;
        } else if (dt.includes('live') || dt.includes('animal') || dt.includes('poultry')) {
          cat = 'Livestock Loss';
          prop = (data.livestock_type || '').toLowerCase().includes('poultry') ? 'Commercial / Backyard Poultry' : ((data.livestock_type || '').toLowerCase().includes('goat') ? 'Goat / Sheep / Pig' : 'Milch Cattle / Buffalo');
          dmgPct = 100;
          qty = parseFloat(data.livestock_lost) || 1;
        } else if (dt.includes('boat') || dt.includes('fish')) {
          cat = 'Fisheries / Boat & Craft Loss';
          prop = 'Boat / Fishing Craft (Fully Damaged)';
          dmgPct = 80;
          qty = 1;
        } else if (dt.includes('artisan') || dt.includes('livelihood')) {
          cat = 'Handicrafts / Artisans / Micro-Enterprise';
          prop = 'Artisan Equipment / Raw Materials';
          dmgPct = 50;
          qty = 1;
        } else if (dt.includes('immediate') || dt.includes('relief') || dt.includes('food')) {
          cat = 'Immediate Gratuitous Relief / Essential Items';
          prop = 'Family Household';
          dmgPct = 100;
          qty = 1;
        } else {
          cat = 'House Damage';
          const ht = (data.house_type || '').toLowerCase();
          if (ht.includes('mud') || ht.includes('traditional') || ht.includes('thatch') || ht.includes('temporary') || ht.includes('hut')) {
            prop = 'Other Residential Structure';
          } else if (ht.includes('apartment') || ht.includes('flat')) {
            prop = 'Apartment / Flat';
          } else {
            prop = 'Residential House';
          }
          if (data.damage_severity === 'Fully Destroyed' || data.house_damage_level === 'Complete') {
            dmgPct = 100;
          } else if (data.damage_severity === 'Severely Damaged' || data.house_damage_level === 'Severe') {
            dmgPct = 50;
          } else {
            dmgPct = 25;
          }
        }

        setSdrfCategory(cat);
        setPropertyType(prop);
        setDamagePercentage(dmgPct);
        setAffectedQuantity(qty);
        if (data.applicant_name) setApplicantConfirmedName(data.applicant_name);
      }

      if (data.officerEvidence) {
        setUploadedOfficerPhotos(data.officerEvidence);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load claim inspection details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [claimId]);

  // Automated SDRF Norm Identification & Assistance Calculation Engine
  useEffect(() => {
    if (sdrfNorms.length === 0) return;

    // 1. Filter candidate norms by category
    const categoryNorms = sdrfNorms.filter(
      (n) => n.damage_category.toLowerCase() === sdrfCategory.toLowerCase()
    );

    // 2. Filter candidates by simplified house / property type
    const normalizedPropertyType = (() => {
      const ptLower = (propertyType || '').toLowerCase();
      if (ptLower.includes('residential house') || ptLower.includes('apartment') || ptLower.includes('flat') || ptLower.includes('pucca')) {
        return ['pucca / concrete / brick', 'residential house', 'apartment / flat', 'pucca'];
      }
      if (ptLower.includes('other residential') || ptLower.includes('kutcha') || ptLower.includes('traditional') || ptLower.includes('mud') || ptLower.includes('shack') || ptLower.includes('hut')) {
        return ['kutcha / mud / traditional / wood', 'slum hut / temporary shack', 'other residential structure', 'kutcha', 'mud', 'hut'];
      }
      return [ptLower];
    })();

    let propertyNorms = categoryNorms.filter(
      (n) => n.property_type === 'ALL' || normalizedPropertyType.some((t) => n.property_type.toLowerCase().includes(t))
    );
    if (propertyNorms.length === 0) propertyNorms = categoryNorms;

    // 3. Filter candidates by zone (if rule is zone-specific)
    let zoneNorms = propertyNorms.filter(
      (n) => n.geographic_zone === 'ALL' || n.geographic_zone.toLowerCase() === geographicZone.toLowerCase()
    );
    if (zoneNorms.length === 0) zoneNorms = propertyNorms;

    // 4. Select norm by damage percentage bracket
    let bestNorm = zoneNorms.find(
      (n) => damagePercentage >= (n.min_damage_percentage ?? 0) && damagePercentage <= (n.max_damage_percentage ?? 100)
    );

    // If none matches bracket exactly, find closest or highest threshold satisfied
    if (!bestNorm) {
      const satisfied = zoneNorms.filter((n) => damagePercentage >= (n.min_damage_percentage ?? 0));
      if (satisfied.length > 0) {
        bestNorm = satisfied.sort((a, b) => (b.min_damage_percentage ?? 0) - (a.min_damage_percentage ?? 0))[0];
      } else {
        bestNorm = zoneNorms.sort((a, b) => (a.min_damage_percentage ?? 0) - (b.min_damage_percentage ?? 0))[0];
      }
    }

    if (!bestNorm) {
      setMatchedNorm(null);
      setCalculatedAssistance(0);
      setIsEligible(false);
      setCalculationBasis('No matching SDRF norm configured in database for current criteria.');
      return;
    }

    setMatchedNorm(bestNorm);

    // 5. Evaluate Eligibility & Calculate Recommended Assistance
    const minThreshold = Number(bestNorm.min_damage_percentage) || 0;
    const rate = Number(bestNorm.rate_per_unit || bestNorm.maximum_amount || 0);
    const unit = bestNorm.unit || 'Unit';
    const rawQty = Math.max(0, Number(affectedQuantity) || 0);
    const maxUnits = bestNorm.max_units ? Number(bestNorm.max_units) : null;
    const effectiveQty = maxUnits ? Math.min(rawQty, maxUnits) : rawQty;
    const maxCeiling = bestNorm.maximum_ceiling ? Number(bestNorm.maximum_ceiling) : null;

    if (damagePercentage < minThreshold) {
      setIsEligible(false);
      setCalculatedAssistance(0);
      setCalculationBasis(
        `${bestNorm.norm_code} (${bestNorm.norm_title}) → Eligibility: NOT MET (${damagePercentage}% is below minimum statutory threshold of ${minThreshold}%) → Prescribed Rate: ₹${rate.toLocaleString('en-IN')}/${unit} → Eligible Quantity: 0 ${unit} → Recommended Assistance: ₹0`
      );
    } else {
      setIsEligible(true);
      let total = effectiveQty * rate;
      if (maxCeiling && total > maxCeiling) {
        total = maxCeiling;
      }
      setCalculatedAssistance(total);

      const capInfo = maxUnits && rawQty > maxUnits ? ` (Capped from ${rawQty} to max ${maxUnits} statutory limit)` : '';
      const ceilingInfo = maxCeiling && effectiveQty * rate > maxCeiling ? ` (Capped to statutory ceiling ₹${maxCeiling.toLocaleString('en-IN')})` : '';

      setCalculationBasis(
        `${bestNorm.norm_code} (${bestNorm.norm_title}) → Eligibility: MET (${damagePercentage}% ≥ ${minThreshold}% threshold) → Prescribed Rate: ₹${rate.toLocaleString('en-IN')} / ${unit} → Quantity: ${rawQty} ${unit}${capInfo} → Recommended Assistance: ₹${total.toLocaleString('en-IN')}${ceilingInfo}`
      );
    }

    // Harmonize legacy severity label
    if (damagePercentage >= 75) {
      setDamageCategory('Fully Destroyed');
    } else if (damagePercentage >= 40) {
      setDamageCategory('Severely Damaged');
    } else if (damagePercentage >= 15) {
      setDamageCategory('Partially Damaged');
    } else {
      setDamageCategory('No Significant Damage');
    }
  }, [sdrfNorms, sdrfCategory, propertyType, geographicZone, damagePercentage, affectedQuantity]);

  // Leaflet Mini Location & Comparison Map
  useEffect(() => {
    if (!claim || !mapContainerRef.current) return;

    const repLat = parseFloat(claim.latitude);
    const repLng = parseFloat(claim.longitude);
    if (isNaN(repLat) || isNaN(repLng)) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const centerLat = officerLat ? (repLat + officerLat) / 2 : repLat;
    const centerLng = officerLng ? (repLng + officerLng) / 2 : repLng;

    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLng],
      zoom: officerLat ? 16 : 15,
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    // Marker 1: Reported Applicant Location
    const applicantIcon = L.divIcon({
      className: 'custom-applicant-pin',
      html: `
        <div style="background-color: #0284c7; width: 28px; height: 28px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 4px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 900; font-size: 13px;">
          🏠
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    const m1 = L.marker([repLat, repLng], { icon: applicantIcon }).addTo(map);
    m1.bindPopup(`<b>Reported Disaster Site</b><br/>${claim.applicant_name}<br/>${claim.village || ''}, ${claim.district}`);

    // Marker 2: Officer Current / Verification GPS
    if (officerLat && officerLng) {
      const officerIcon = L.divIcon({
        className: 'custom-officer-pin',
        html: `
          <div style="background-color: #059669; width: 30px; height: 30px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 4px 10px rgba(5,150,105,0.5); display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 14px;">
            📍
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      const m2 = L.marker([officerLat, officerLng], { icon: officerIcon }).addTo(map);
      m2.bindPopup(`<b>Officer Verified Location</b><br/>Distance: ${distanceMeters || 0}m from reported`);

      // Connecting Line
      const latlngs: [number, number][] = [
        [repLat, repLng],
        [officerLat, officerLng]
      ];
      L.polyline(latlngs, {
        color: distanceMeters && distanceMeters <= 250 ? '#059669' : '#e11d48',
        weight: 3,
        dashArray: '6, 6'
      }).addTo(map);
    }

    mapInstanceRef.current = map;
  }, [claim, officerLat, officerLng, distanceMeters]);

  // Handle GPS Capture
  const handleCaptureCurrentGPS = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setIsCapturingGPS(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const curLat = pos.coords.latitude;
        const curLng = pos.coords.longitude;
        const acc = pos.coords.accuracy;

        setOfficerLat(curLat);
        setOfficerLng(curLng);
        setGpsAccuracy(Math.round(acc));

        if (claim && claim.latitude && claim.longitude) {
          const dist = calculateDistanceMeters(
            parseFloat(claim.latitude),
            parseFloat(claim.longitude),
            curLat,
            curLng
          );
          setDistanceMeters(dist);
        }

        setIsCapturingGPS(false);
      },
      (err) => {
        setIsCapturingGPS(false);
        setGpsError(`GPS Capture Failed: ${err.message}. Please enable location permissions.`);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  // Handle Photo Selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);
    setNewSelectedFiles((prev) => [...prev, ...files]);

    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setNewFilePreviews((prev) => [...prev, ...newPreviews]);
  };

  const handleRemoveSelectedFile = (index: number) => {
    setNewSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setNewFilePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Upload Selected Photos
  const handleUploadPhotos = async () => {
    if (newSelectedFiles.length === 0) return;

    setUploadingPhotos(true);
    setError(null);
    try {
      const res = await uploadFieldOfficerPhotos(claim.id, newSelectedFiles, {
        latitude: officerLat || undefined,
        longitude: officerLng || undefined,
        damageCategory,
        description: photoDescription
      });

      if (res.photos) {
        setUploadedOfficerPhotos((prev) => [...res.photos, ...prev]);
        setNewSelectedFiles([]);
        setNewFilePreviews([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload field photos');
    } finally {
      setUploadingPhotos(false);
    }
  };

  // Submit Final Verification Report
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actualDamageObserved.trim()) {
      setError('Please record your actual physical damage observations.');
      return;
    }

    if (reportOutcome === 'REQUIRES_CORRECTION' && !correctionInstructions.trim()) {
      setError('Please provide specific correction instructions for the citizen.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      // 1. If there are pending un-uploaded photos, upload them first
      if (newSelectedFiles.length > 0) {
        await uploadFieldOfficerPhotos(claim.id, newSelectedFiles, {
          latitude: officerLat || undefined,
          longitude: officerLng || undefined,
          damageCategory,
          description: photoDescription
        });
        setNewSelectedFiles([]);
        setNewFilePreviews([]);
      }

      // 2. Submit Verification Report with complete SDRF normative findings
      const res = await submitFieldOfficerReport(claim.claim_id || claim.id, {
        outcome: reportOutcome,
        damageCategory: sdrfCategory,
        damageObserved: actualDamageObserved,
        estimatedLoss: calculatedAssistance,
        recommendedAssistance: calculatedAssistance,
        officerRemarks,
        officerLatitude: officerLat || undefined,
        officerLongitude: officerLng || undefined,
        gpsAccuracyMeters: gpsAccuracy || 5,
        locationVerified: locationConfirmed,
        applicantVerified: identityVerified,
        applicantAcknowledged: applicantPresent,
        applicantAcknowledgementNotes,
        applicantNameConfirmed: applicantConfirmedName,
        correctionInstructions: reportOutcome === 'REQUIRES_CORRECTION' ? correctionInstructions : undefined,
        // Configured SDRF Norm Audit fields
        sdrfNormId: matchedNorm?.id,
        sdrfNormCode: matchedNorm?.norm_code,
        sdrfRuleVersion: matchedNorm?.rule_version || 'SDRF-2023-26-v2.1',
        propertyType,
        geographicZone,
        damagePercentage,
        affectedQuantity,
        affectedUnit: matchedNorm?.unit || 'Unit',
        prescribedRate: matchedNorm?.rate_per_unit || 0,
        calculationBasis,
        statutoryReference: matchedNorm?.statutory_reference
      });

      setSuccessMsg(res.message);
      onSuccess();
      setTimeout(() => {
        onBack();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to submit verification report');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8 text-slate-500">
        <RotateCw className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
        <p className="font-bold text-slate-700">Loading ground verification dossier...</p>
        <p className="text-xs text-slate-400">Fetching claim details, uploaded proofs, and spatial coordinates</p>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800">Claim Record Not Found</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">The requested relief claim could not be retrieved.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Breadcrumb & Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex items-center justify-center"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-extrabold text-emerald-800 text-lg sm:text-xl">
                {claim.claim_id}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                {claim.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Disaster Field Verification &bull; {claim.district} District &bull; {claim.taluk || 'Taluk'}
            </p>
          </div>
        </div>

        {/* Quick Identity Tag */}
        <div className="flex items-center gap-3 bg-emerald-50/70 border border-emerald-200/80 px-4 py-2 rounded-2xl">
          <User className="w-5 h-5 text-emerald-700" />
          <div>
            <div className="font-bold text-slate-900 text-xs">{claim.applicant_name}</div>
            <div className="text-[11px] text-slate-500 font-mono">{claim.applicant_phone || 'No phone'}</div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 flex items-center gap-3 font-semibold text-xs shadow-xs animate-shake">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3 font-semibold text-xs shadow-xs">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid: Left Column (Dossier & Evidence) | Right Column (Field Verification Form) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Claim Dossier, Applicant Details, Citizen Documents & Location Map (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Card 1: Applicant & Family Details */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5">
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 mb-3.5 pb-2 border-b border-slate-100">
              <User className="w-4 h-4 text-emerald-600" />
              <span>Applicant & Household Profile</span>
            </h4>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Full Name</span>
                <span className="font-bold text-slate-900">{claim.applicant_name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Contact Phone</span>
                <span className="font-mono font-bold text-slate-900">{claim.applicant_phone || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Email</span>
                <span className="text-slate-800 font-medium">{claim.applicant_email || 'Not provided'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Affected Family Members</span>
                <span className="font-bold text-slate-900">{claim.affected_family_members || 1} Person(s)</span>
              </div>
              {claim.vulnerable_person_category && claim.vulnerable_person_category.length > 0 && (
                <div className="py-1">
                  <span className="text-slate-500 font-medium block mb-1">Vulnerable Members</span>
                  <div className="flex flex-wrap gap-1">
                    {claim.vulnerable_person_category.map((v: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Family Members List if any */}
            {claim.familyMembers && claim.familyMembers.length > 0 && (
              <div className="mt-3.5 pt-3 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-700 block mb-2">Registered Household Members:</span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {claim.familyMembers.map((fam: any) => (
                    <div key={fam.id} className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-[11px]">
                      <div>
                        <span className="font-bold text-slate-800">{fam.name}</span>
                        <span className="text-slate-500 ml-1">({fam.relation})</span>
                      </div>
                      <span className="text-slate-600 font-medium">{fam.age ? `${fam.age} yrs` : ''} &bull; {fam.status || 'Safe'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Disaster & Claimed Damage Details */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5">
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 mb-3.5 pb-2 border-b border-slate-100">
              <Home className="w-4 h-4 text-emerald-600" />
              <span>Disaster & Claimed Damage Information</span>
            </h4>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Disaster Type</span>
                <span className="font-bold text-slate-900">{claim.disaster_type}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Disaster Date</span>
                <span className="font-bold text-slate-900">{claim.disaster_date}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Assistance Category</span>
                <span className="font-bold text-emerald-800">{claim.assistance_category}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Claimed Severity</span>
                <span className="font-bold text-slate-900">{claim.damage_severity}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Claimed Loss Estimate</span>
                <span className="font-mono font-bold text-amber-700">₹{parseFloat(claim.estimated_loss || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Requested Assistance</span>
                <span className="font-mono font-bold text-emerald-700">₹{parseFloat(claim.requested_amount || 0).toLocaleString('en-IN')}</span>
              </div>

              {claim.damage_description && (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 mt-2">
                  <span className="text-[11px] font-bold text-slate-600 block mb-1">Applicant's Damage Description:</span>
                  <p className="text-slate-700 leading-relaxed text-[11px] italic">
                    "{claim.damage_description}"
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Address & Interactive Mini Comparison Map */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5">
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center justify-between mb-3.5 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>Geographic Site Location</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {parseFloat(claim.latitude).toFixed(4)}°, {parseFloat(claim.longitude).toFixed(4)}°
              </span>
            </h4>

            <div className="text-xs mb-3 space-y-1 text-slate-700">
              <div>
                <strong>Location:</strong> {claim.village || claim.locality || ''}, {claim.taluk || ''}, {claim.district} District
              </div>
              {claim.locality && <div className="text-slate-500">{claim.locality}</div>}
            </div>

            {/* Map Container */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 h-44 shadow-inner">
              <div ref={mapContainerRef} className="w-full h-full z-0" />
            </div>

            {/* Map Legend */}
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-600"></span>
                <span>Applicant Reported Site</span>
              </div>
              {officerLat && (
                <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                  <span className="w-3 h-3 rounded-full bg-emerald-600"></span>
                  <span>Officer Live GPS ({distanceMeters || 0}m away)</span>
                </div>
              )}
            </div>
          </div>

          {/* Card 4: Citizen Uploaded Evidence Documents */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5">
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center justify-between mb-3.5 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Citizen Uploaded Proofs</span>
              </div>
              <span className="text-xs text-slate-500">
                {claim.citizenEvidence?.length || 0} file(s)
              </span>
            </h4>

            {claim.citizenEvidence && claim.citizenEvidence.length > 0 ? (
              <div className="grid grid-cols-2 gap-2.5">
                {claim.citizenEvidence.map((ev: any) => (
                  <div
                    key={ev.id}
                    onClick={() => setPreviewMedia({ url: `http://localhost:5000${ev.file_path}`, title: ev.file_name })}
                    className="group relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 cursor-pointer hover:border-emerald-500 transition-all"
                  >
                    <img
                      src={`http://localhost:5000${ev.file_path}`}
                      alt={ev.file_name}
                      className="w-full h-24 object-cover group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="p-1.5 bg-white/95 text-[10px] font-medium truncate text-slate-700">
                      {ev.description || ev.file_name}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">
                No initial photographs attached by applicant. Field verification photographs are critical!
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Official Field Verification Form (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">Official Field Verification Assessment</h3>
                <p className="text-xs text-slate-500">Record on-site findings, physical damage verification, and geo-evidence</p>
              </div>
              <span className="px-3 py-1 rounded-xl text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                Officer Duty Mode
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmitReport} className="space-y-6 text-xs font-semibold">
            {/* Section 1: Visit Date & Time */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>1. Field Visit Date & Inspection Time</span>
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Inspection Date</label>
                  <input
                    type="date"
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-sans text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Time of Inspection</label>
                  <input
                    type="time"
                    value={visitTime}
                    onChange={(e) => setVisitTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-sans text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: GPS Verification Module */}
            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                  <Navigation className="w-4 h-4 text-emerald-700" />
                  <span>2. Live GPS Site Verification</span>
                </h5>
                <button
                  type="button"
                  onClick={handleCaptureCurrentGPS}
                  disabled={isCapturingGPS}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-60"
                >
                  <Navigation className={`w-3.5 h-3.5 ${isCapturingGPS ? 'animate-spin' : ''}`} />
                  <span>{isCapturingGPS ? 'Locating...' : 'Capture Current GPS'}</span>
                </button>
              </div>

              {gpsError && (
                <div className="p-2.5 rounded-xl bg-red-100/80 border border-red-200 text-red-800 text-[11px] font-bold">
                  {gpsError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-slate-500 block">Officer Latitude</span>
                  <span className="font-mono font-bold text-slate-800">
                    {officerLat ? officerLat.toFixed(6) : 'Not captured'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-slate-500 block">Officer Longitude</span>
                  <span className="font-mono font-bold text-slate-800">
                    {officerLng ? officerLng.toFixed(6) : 'Not captured'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-slate-500 block">Distance to Reported</span>
                  <span className="font-mono font-bold text-slate-800">
                    {distanceMeters !== null ? `${distanceMeters} meters` : 'Pending GPS'}
                  </span>
                </div>
              </div>

              {distanceMeters !== null && (
                <div
                  className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold ${
                    distanceMeters <= 250
                      ? 'bg-emerald-100/70 border-emerald-300 text-emerald-900'
                      : 'bg-amber-100 border-amber-300 text-amber-900'
                  }`}
                >
                  {distanceMeters <= 250 ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>✓ Location Verified: Officer is on-site within {distanceMeters}m of reported coordinates.</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>⚠ GPS Discrepancy: Officer is {distanceMeters}m away from citizen reported coordinate.</span>
                    </>
                  )}
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={locationConfirmed}
                  onChange={(e) => setLocationConfirmed(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 border-slate-300"
                />
                <span className="text-slate-800 font-bold">Confirm ground site location matches applicant disaster premises</span>
              </label>
            </div>

            {/* Section 3: Actual Damage Observed */}
            <div>
              <label className="block text-slate-800 font-bold text-xs mb-1.5">
                3. Actual Physical Damage Observed <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={actualDamageObserved}
                onChange={(e) => setActualDamageObserved(e.target.value)}
                placeholder="Detail physical damages: structural wall cracks, roof collapse, water submersion height, destroyed assets, agricultural crop damage percentage, soil erosion..."
                className="w-full p-3.5 rounded-2xl border border-slate-300 bg-white text-slate-900 font-sans focus:ring-2 focus:ring-emerald-500 resize-none text-xs leading-relaxed"
              />
            </div>

            {/* Section 4: Damage Category Selection */}
            <div>
              <label className="block text-slate-800 font-bold text-xs mb-2">
                4. Verified Damage Category <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  {
                    id: 'Fully Destroyed',
                    label: 'Fully Destroyed',
                    desc: 'Structure completely washed away / 100% loss',
                    color: 'border-rose-300 hover:bg-rose-50 text-rose-900'
                  },
                  {
                    id: 'Severely Damaged',
                    label: 'Severely Damaged',
                    desc: 'Major structural fracture, unlivable without rebuild',
                    color: 'border-amber-300 hover:bg-amber-50 text-amber-900'
                  },
                  {
                    id: 'Partially Damaged',
                    label: 'Partially Damaged',
                    desc: 'Minor wall/roof/desilting repair needed (< 50%)',
                    color: 'border-blue-300 hover:bg-blue-50 text-blue-900'
                  },
                  {
                    id: 'No Significant Damage',
                    label: 'No Significant Damage',
                    desc: 'Superficial debris or no verifiable structural loss',
                    color: 'border-slate-300 hover:bg-slate-50 text-slate-800'
                  }
                ].map((cat) => (
                  <label
                    key={cat.id}
                    className={`p-3 rounded-2xl border cursor-pointer flex items-start gap-2.5 transition-all ${
                      damageCategory === cat.id
                        ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500'
                        : cat.color
                    }`}
                  >
                    <input
                      type="radio"
                      name="damageCategory"
                      value={cat.id}
                      checked={damageCategory === cat.id}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDamageCategory(val);
                        if (val === 'Fully Destroyed') setDamagePercentage(100);
                        else if (val === 'Severely Damaged') setDamagePercentage(50);
                        else if (val === 'Partially Damaged') setDamagePercentage(25);
                        else if (val === 'No Significant Damage') setDamagePercentage(5);
                      }}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="font-extrabold text-xs text-slate-900">{cat.label}</div>
                      <div className="text-[11px] text-slate-500 font-normal leading-tight mt-0.5">{cat.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Section 5: Official SDRF Normative Financial Assessment */}
            <div className="p-5 rounded-3xl bg-slate-50/90 border border-slate-200 space-y-5 shadow-xs">
              {/* Header with SDRF Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <Scale className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                      <span>5. SDRF Normative Financial Assessment & Entitlement Calculation</span>
                      <span className="text-red-500">*</span>
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      Standardized statutory assessment under State Disaster Response Fund (SDRF) norms schedule
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-slate-200/80 text-slate-700 border border-slate-300 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-emerald-600" />
                    <span>Rule v{matchedNorm?.rule_version || '2.1'}</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Statutory Norms
                  </span>
                </div>
              </div>

              {/* 5A. Separate Read-Only Citizen Baseline Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                      Claimed Amount (Citizen Application) &bull; Read-Only
                    </span>
                    <div className="text-lg font-mono font-extrabold text-blue-900 mt-0.5">
                      ₹{parseFloat(claim.requested_amount || claim.estimated_loss || 0).toLocaleString('en-IN')}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Baseline entitlement requested in citizen application
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 sm:border-l sm:border-slate-100 sm:pl-4">
                  <div className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                    <Info className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                      Citizen Reported Estimated Loss &bull; Read-Only
                    </span>
                    <div className="text-lg font-mono font-extrabold text-slate-800 mt-0.5">
                      ₹{parseFloat(claim.estimated_loss || 0).toLocaleString('en-IN')}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Unverified initial loss reported by citizen
                    </span>
                  </div>
                </div>
              </div>

              {/* 5B. Field Assessment Inputs (User-Friendly Government SDRF Assessment) */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-2xs">
                {/* Row 1: Category of Loss & Assessed Households / Quantity */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Category of Loss */}
                  <div>
                    <label className="block text-slate-800 font-bold text-xs mb-1.5">
                      Category of Loss
                    </label>
                    <select
                      value={sdrfCategory}
                      onChange={(e) => {
                        const newCat = e.target.value;
                        setSdrfCategory(newCat);
                        const isHouse = newCat.toLowerCase().includes('hous');
                        if (isHouse) {
                          setPropertyType('Residential House');
                        } else {
                          const matchingProps = sdrfNorms
                            .filter((n) => n.damage_category.toLowerCase() === newCat.toLowerCase())
                            .map((n) => n.property_type)
                            .filter((p) => p && p !== 'ALL');
                          if (matchingProps.length > 0) {
                            setPropertyType(matchingProps[0]);
                          }
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500"
                    >
                      {availableCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Assessed Households (HH) / Affected Quantity */}
                  <div>
                    <label className="block text-slate-800 font-bold text-xs mb-1.5 flex items-center justify-between">
                      <span>{sdrfCategory.toLowerCase().includes('hous') ? 'Assessed Households (HH)' : `Affected Quantity (${matchedNorm?.unit || 'Units'})`}</span>
                      {matchedNorm?.max_units && (
                        <span className="text-[10px] font-semibold text-slate-500">
                          Max: {matchedNorm.max_units} {matchedNorm.unit}
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0.1"
                        step={matchedNorm?.unit?.toLowerCase().includes('hectare') ? '0.1' : '1'}
                        value={affectedQuantity}
                        onChange={(e) => setAffectedQuantity(parseFloat(e.target.value) || 0)}
                        required
                        placeholder="1"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white font-mono font-bold text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="absolute right-3 top-2 text-xs font-bold text-slate-400 pointer-events-none">
                        {sdrfCategory.toLowerCase().includes('hous') ? 'HH' : (matchedNorm?.unit || 'Units')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Row 2: House Type & Geographic Zone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* House Type */}
                  <div>
                    <label className="block text-slate-800 font-bold text-xs mb-1.5">
                      {sdrfCategory.toLowerCase().includes('hous') ? 'House Type' : 'Asset / Property Type'}
                    </label>
                    <select
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500"
                    >
                      {availablePropertyTypes.map((prop) => (
                        <option key={prop} value={prop}>
                          {prop}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Geographic Zone */}
                  <div>
                    <label className="block text-slate-800 font-bold text-xs mb-1.5 flex items-center justify-between">
                      <span>Geographic Terrain Zone</span>
                      <span className="text-[10px] text-emerald-700 font-bold">
                        {geographicZone === 'Hilly' ? 'Higher Hilly Rate' : 'Standard Plains Rate'}
                      </span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['Plains', 'Hilly'] as const).map((zone) => (
                        <button
                          type="button"
                          key={zone}
                          onClick={() => setGeographicZone(zone)}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                            geographicZone === zone
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500'
                              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{zone === 'Plains' ? 'Plains Area' : 'Hilly / Altitude'}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Row 3: Damage Severity Threshold (Slider matching reference) */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-slate-800 font-bold text-xs">
                      Damage Severity Threshold
                    </label>
                    <span className="font-mono font-black text-sm text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                      {damagePercentage}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={damagePercentage}
                      onChange={(e) => setDamagePercentage(parseInt(e.target.value) || 0)}
                      className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                    />
                    <span className="text-xs font-mono font-bold text-slate-700 shrink-0 w-10 text-right">
                      {damagePercentage}%
                    </span>
                  </div>
                </div>

                {/* Statutory SDRF Norm Match & Eligibility Status */}
                {matchedNorm && (
                  <div
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                      isEligible
                        ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900'
                        : 'bg-amber-50/80 border-amber-300 text-amber-900'
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-2.5">
                      {isEligible ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                      )}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs">{matchedNorm.norm_title}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/90 border border-slate-200 text-slate-700">
                            {matchedNorm.norm_code}
                          </span>
                        </div>
                        <p className="text-[11px] opacity-85 mt-0.5">
                          {isEligible
                            ? `Observed damage of ${damagePercentage}% meets statutory eligibility threshold (≥ ${matchedNorm.min_damage_percentage || 0}%). Prescribed rate: ₹${parseFloat(String(matchedNorm.rate_per_unit)).toLocaleString('en-IN')} / ${matchedNorm.unit}.`
                            : `Observed damage of ${damagePercentage}% is below minimum statutory eligibility threshold of ${matchedNorm.min_damage_percentage || 0}%. Recommended assistance is ₹0.`
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Recommended SDRF Assistance Result (Strictly Read-Only for Field Officer) */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-200" />
                    <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-100">
                      Recommended SDRF Assistance (₹) &bull; Read-Only
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-mono font-black text-white">
                    ₹{calculatedAssistance.toLocaleString('en-IN')}
                  </div>
                  <p className="text-[11px] text-emerald-100 leading-tight">
                    Computed automatically via official SDRF norms schedule. Forwarded to District Collector for approval.
                  </p>
                </div>

                <div className="shrink-0 bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/20 text-right">
                  <span className="text-[10px] text-emerald-200 block uppercase font-bold">Workflow Forwarding</span>
                  <span className="text-xs font-bold text-white block">Submitted for Collector Review</span>
                  <span className="text-[10px] text-emerald-200/80 block mt-0.5">Final Sanction Authority: District Collector</span>
                </div>
              </div>
            </div>

            {/* Section 6: Officer Remarks */}
            <div>
              <label className="block text-slate-800 font-bold text-xs mb-1.5">
                6. Field Observations & Recommendation Remarks
              </label>
              <textarea
                rows={3}
                value={officerRemarks}
                onChange={(e) => setOfficerRemarks(e.target.value)}
                placeholder="Recommendations for District Collector: eligibility for SDRF assistance, rehabilitation needs, structural vulnerability notes..."
                className="w-full p-3.5 rounded-2xl border border-slate-300 bg-white text-slate-900 font-sans focus:ring-2 focus:ring-emerald-500 resize-none text-xs"
              />
            </div>

            {/* Section 7: Geo-tagged Field Photographs */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-emerald-600" />
                    <span>7. Multiple Field Photographs (Geo-Tagged)</span>
                  </h5>
                  <p className="text-[11px] text-slate-500">Capture structural damage and site context on ground</p>
                </div>

                <label className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose Photos</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Photo Caption / Evidence Description:
                </label>
                <input
                  type="text"
                  value={photoDescription}
                  onChange={(e) => setPhotoDescription(e.target.value)}
                  placeholder="e.g. Ground structural damage verified"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Uploaded Photos Grid */}
              {uploadedOfficerPhotos.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold text-emerald-800 block mb-1.5">Uploaded Evidence Files:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {uploadedOfficerPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        onClick={() => setPreviewMedia({ url: `http://localhost:5000${photo.file_path}`, title: photo.description || 'Field Photo' })}
                        className="group relative rounded-xl overflow-hidden border border-emerald-300 bg-white shadow-xs cursor-pointer"
                      >
                        <img
                          src={`http://localhost:5000${photo.file_path}`}
                          alt="Field Photo"
                          className="w-full h-20 object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="p-1 bg-emerald-950/80 text-white text-[9px] truncate">
                          {photo.description || 'Field photo'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected for Upload Previews */}
              {newFilePreviews.length > 0 && (
                <div className="p-3 bg-white rounded-2xl border border-emerald-300 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900">
                      {newFilePreviews.length} photo(s) ready to attach
                    </span>
                    <button
                      type="button"
                      onClick={handleUploadPhotos}
                      disabled={uploadingPhotos}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
                    >
                      <Upload className={`w-3 h-3 ${uploadingPhotos ? 'animate-spin' : ''}`} />
                      <span>{uploadingPhotos ? 'Uploading...' : 'Save Photos'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {newFilePreviews.map((preview, idx) => (
                      <div key={idx} className="relative rounded-xl overflow-hidden border border-slate-200">
                        <img src={preview} alt="Selected" className="w-full h-20 object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveSelectedFile(idx)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-red-600 text-white hover:bg-red-700 shadow-sm"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Section 8: Applicant Acknowledgement */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <h5 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>8. Applicant Identity & On-Site Acknowledgement</span>
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-white border border-slate-200">
                  <input
                    type="checkbox"
                    checked={applicantPresent}
                    onChange={(e) => setApplicantPresent(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 border-slate-300"
                  />
                  <span className="text-slate-800 font-bold text-[11px]">
                    Applicant / family was physically present
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-white border border-slate-200">
                  <input
                    type="checkbox"
                    checked={identityVerified}
                    onChange={(e) => setIdentityVerified(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 border-slate-300"
                  />
                  <span className="text-slate-800 font-bold text-[11px]">
                    Identity verified against Aadhaar / ID proof
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  Confirmed Applicant Name on Site
                </label>
                <input
                  type="text"
                  value={applicantConfirmedName}
                  onChange={(e) => setApplicantConfirmedName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white font-sans text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  Applicant Acknowledgement Statement / Notes
                </label>
                <input
                  type="text"
                  value={applicantAcknowledgementNotes}
                  onChange={(e) => setApplicantAcknowledgementNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white font-sans text-slate-800"
                />
              </div>
            </div>

            {/* Section 9: Verification Outcome & Action */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-900 to-teal-950 text-white space-y-4">
              <h5 className="font-extrabold text-sm flex items-center justify-between">
                <span>9. Verification Report Outcome</span>
                <span className="text-[10px] uppercase font-mono text-emerald-300 tracking-wider">
                  Mandatory Submission
                </span>
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`p-3.5 rounded-2xl border cursor-pointer flex items-start gap-2.5 transition-all ${
                    reportOutcome === 'VERIFIED'
                      ? 'bg-emerald-800/80 border-emerald-400 ring-2 ring-emerald-400 text-white'
                      : 'bg-white/5 border-white/20 text-emerald-200 hover:bg-white/10'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportOutcome"
                    value="VERIFIED"
                    checked={reportOutcome === 'VERIFIED'}
                    onChange={() => setReportOutcome('VERIFIED')}
                    className="mt-0.5 text-emerald-500"
                  />
                  <div>
                    <div className="font-extrabold text-xs">VERIFIED & RECOMMEND</div>
                    <div className="text-[11px] text-emerald-200/90 font-normal leading-tight mt-0.5">
                      Ground damages confirmed. Forwards dossier to District Collector for official financial sanction.
                    </div>
                  </div>
                </label>

                <label
                  className={`p-3.5 rounded-2xl border cursor-pointer flex items-start gap-2.5 transition-all ${
                    reportOutcome === 'REQUIRES_CORRECTION'
                      ? 'bg-rose-900/80 border-rose-400 ring-2 ring-rose-400 text-white'
                      : 'bg-white/5 border-white/20 text-rose-200 hover:bg-white/10'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportOutcome"
                    value="REQUIRES_CORRECTION"
                    checked={reportOutcome === 'REQUIRES_CORRECTION'}
                    onChange={() => setReportOutcome('REQUIRES_CORRECTION')}
                    className="mt-0.5 text-rose-500"
                  />
                  <div>
                    <div className="font-extrabold text-xs">REQUIRES CORRECTION</div>
                    <div className="text-[11px] text-rose-200/90 font-normal leading-tight mt-0.5">
                      Discrepancies found, survey area mismatch, or missing documents required from citizen.
                    </div>
                  </div>
                </label>
              </div>

              {reportOutcome === 'REQUIRES_CORRECTION' && (
                <div className="space-y-1.5 animate-fadeIn">
                  <label className="block text-rose-200 font-bold">
                    Correction Instructions for Applicant <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={correctionInstructions}
                    onChange={(e) => setCorrectionInstructions(e.target.value)}
                    placeholder="Specify exactly what document or correction is required (e.g., upload revenue land tax receipt, provide correct bank account with passbook copy)..."
                    className="w-full p-3 rounded-xl bg-white text-slate-900 text-xs font-sans focus:ring-2 focus:ring-rose-400 resize-none"
                  />
                </div>
              )}

              {/* STRICT PERMISSION ENFORCEMENT CALLOUT */}
              <div className="p-3 rounded-xl bg-black/30 border border-white/10 text-emerald-200 text-[11px] leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Role-Based Legal Restriction:</strong> As a designated Field Verification Officer, you can only record ground observations and recommend compensation. <strong>Approval of funds, sanctioning orders, and DBT payment disbursement are strictly reserved for the District Collector and State Authority.</strong>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onBack}
                  className="px-4 py-2.5 rounded-xl border border-white/20 text-white hover:bg-white/10 transition-all font-bold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-6 py-2.5 rounded-xl font-black text-white shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 ${
                    reportOutcome === 'VERIFIED'
                      ? 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/30'
                      : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                  }`}
                >
                  {submitting ? (
                    <span>Submitting Report...</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>
                        {reportOutcome === 'VERIFIED'
                          ? 'Submit Verification to Collector'
                          : 'Submit as Requiring Correction'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Lightbox Modal for Media preview */}
      {previewMedia && (
        <div
          onClick={() => setPreviewMedia(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h4 className="font-bold text-sm text-slate-800">{previewMedia.title}</h4>
              <button
                onClick={() => setPreviewMedia(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            <div className="mt-3 flex items-center justify-center max-h-[70vh] overflow-hidden rounded-2xl bg-black">
              <img src={previewMedia.url} alt="Proof" className="max-h-[70vh] object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
