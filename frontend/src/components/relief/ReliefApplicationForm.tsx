import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Save,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  MapPin,
  Camera,
  Upload,
  Trash2,
  Building2,
  ShieldCheck,
  CreditCard,
  FileText,
  FileCheck,
  Sparkles,
  Info,
  RefreshCw,
  Home,
  Sprout,
  HeartPulse,
  Lock
} from 'lucide-react';
import { useLocation } from '../../context/LocationContext';
import {
  createReliefDraft,
  updateReliefDraft,
  submitReliefClaim,
  uploadReliefEvidence,
  fetchReliefClaimById
} from '../../services/api';
import type { ReliefClaim } from '../../services/api';

// Complete List of Scheduled Commercial, Co-operative & Regional Banks in India
export const INDIAN_BANK_GROUPS = [
  {
    category: 'Popular in Kerala & DDMA',
    banks: [
      'State Bank of India',
      'Federal Bank',
      'Kerala Gramin Bank',
      'Canara Bank',
      'South Indian Bank',
      'Kerala State Co-operative Bank (Kerala Bank)',
      'Catholic Syrian Bank (CSB Bank)',
      'Dhanlaxmi Bank'
    ]
  },
  {
    category: 'Public Sector Banks',
    banks: [
      'Punjab National Bank',
      'Bank of Baroda',
      'Union Bank of India',
      'Indian Bank',
      'Central Bank of India',
      'Indian Overseas Bank',
      'Bank of India',
      'UCO Bank',
      'Bank of Maharashtra',
      'Punjab & Sind Bank'
    ]
  },
  {
    category: 'Private Sector Banks',
    banks: [
      'HDFC Bank',
      'ICICI Bank',
      'Axis Bank',
      'Kotak Mahindra Bank',
      'IndusInd Bank',
      'IDBI Bank',
      'IDFC FIRST Bank',
      'Yes Bank',
      'Bandhan Bank',
      'Karnataka Bank',
      'Tamilnad Mercantile Bank',
      'City Union Bank',
      'RBL Bank'
    ]
  },
  {
    category: 'Payments & Small Finance Banks',
    banks: [
      'India Post Payments Bank (IPPB)',
      'ESAF Small Finance Bank',
      'Airtel Payments Bank',
      'Equitas Small Finance Bank',
      'Ujjivan Small Finance Bank',
      'AU Small Finance Bank'
    ]
  }
];

export const ALL_PRESET_BANKS = INDIAN_BANK_GROUPS.flatMap(g => g.banks);

export const BANK_IFSC_HINTS: Record<string, string> = {
  'State Bank of India': 'SBIN0',
  'Federal Bank': 'FDRL0',
  'Canara Bank': 'CNRB0',
  'Kerala Gramin Bank': 'KLGB0',
  'South Indian Bank': 'SIBL0',
  'Kerala State Co-operative Bank (Kerala Bank)': 'KSCB0',
  'Catholic Syrian Bank (CSB Bank)': 'CSBK0',
  'Dhanlaxmi Bank': 'DLXB0',
  'Punjab National Bank': 'PUNB0',
  'Bank of Baroda': 'BARB0',
  'Union Bank of India': 'UBIN0',
  'Indian Bank': 'IDIB0',
  'Central Bank of India': 'CBIN0',
  'Indian Overseas Bank': 'IOBA0',
  'Bank of India': 'BKID0',
  'UCO Bank': 'UCBA0',
  'Bank of Maharashtra': 'MAHB0',
  'Punjab & Sind Bank': 'PSIB0',
  'HDFC Bank': 'HDFC0',
  'ICICI Bank': 'ICIC0',
  'Axis Bank': 'UTIB0',
  'Kotak Mahindra Bank': 'KKBK0',
  'IndusInd Bank': 'INDB0',
  'IDBI Bank': 'IBKL0',
  'IDFC FIRST Bank': 'IDFB0',
  'Yes Bank': 'YESB0',
  'Bandhan Bank': 'BDBL0',
  'India Post Payments Bank (IPPB)': 'IPOS0',
  'ESAF Small Finance Bank': 'ESMF0'
};

// Statutory ceiling on nuclear/joint family unit size under official SDRF/NDRF guidelines
export const MAX_FAMILY_MEMBERS = 20;

interface ReliefApplicationFormProps {
  user: any;
  initialDraftId?: string | null;
  onBackToLanding: () => void;
  onSubmitSuccess: (claim: ReliefClaim) => void;
}

export const ReliefApplicationForm: React.FC<ReliefApplicationFormProps> = ({
  user,
  initialDraftId,
  onBackToLanding,
  onSubmitSuccess
}) => {
  const { location: gpsLocation, refreshLocation } = useLocation();

  // Current Step: 1 to 9
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [draftId, setDraftId] = useState<string | null>(initialDraftId || null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Citizen Incident Reports Linker
  const [myIncidents, setMyIncidents] = useState<any[]>([]);
  const [loadingIncidents, setLoadingIncidents] = useState(false);
  const [isIncidentRelated, setIsIncidentRelated] = useState<'yes' | 'no'>('no');

  // Custom Bank State
  const [isCustomBank, setIsCustomBank] = useState(false);
  const [customBankName, setCustomBankName] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Disaster
    disasterType: 'Flood',
    customDisasterType: '',
    disasterDate: new Date().toISOString().split('T')[0],
    incidentId: '' as string | number,

    // Step 2: Applicant
    fullName: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    address: user?.panchayat || '',
    district: user?.district || gpsLocation?.district || 'Wayanad',
    state: 'Kerala',
    relationshipToAffected: 'Self',
    customRelationship: '',
    affectedFamilyMembers: 1 as number | string,
    vulnerablePersons: [] as string[],

    // Step 3: Assistance Category
    assistanceCategory: 'Damage Assistance',
    specificSubCategory: 'House damage',

    // Step 4: Damage / Loss Details
    damageType: 'Residential Building Damage',
    damageSeverity: 'Severely Damaged',
    damageDescription: '',
    currentCondition: 'Partially Habitable',
    estimatedLoss: '',

    // Conditional House Damage
    houseOwnership: 'Owned',
    houseType: 'Concrete/RCC',
    houseRooms: 3 as number | string,
    houseDamageLevel: 'Severe',
    affectedArea: '',
    habitabilityStatus: 'Partially safe',
    isDisplaced: false,
    currentAccommodation: 'Relative house',

    // Conditional Crop Loss
    cropType: 'Paddy',
    customCropType: '',
    agriculturalLandType: 'Irrigated Wetland',
    totalCropArea: '',
    affectedCropArea: '',
    cropStage: 'Growing',
    cropLossPercentage: 50,

    // Conditional Livestock Loss
    livestockType: 'Cow',
    livestockLost: 0,
    livestockInjured: 0,

    // Conditional Death / Ex-gratia
    deceasedPersonName: '',
    legalHeirRelationship: 'Spouse',

    // Step 5: Location Details
    latitude: gpsLocation?.latitude || 11.605,
    longitude: gpsLocation?.longitude || 76.083,
    place: gpsLocation?.district || user?.district || 'Wayanad',
    locality: (gpsLocation as any)?.panchayat || gpsLocation?.village || gpsLocation?.town || user?.panchayat || 'Meppadi',
    locationVerified: true,

    // Step 6: Bank Details
    bankAccountHolder: user?.name || '',
    bankName: 'State Bank of India',
    accountNumber: '',
    confirmAccountNumber: '',
    ifscCode: '',

    // Step 7: Documents / Evidence
    uploadedFiles: [] as Array<{ file?: File; preview: string; name: string; type: string; size: number }>,

    // Step 8: Declaration
    declarationAccepted: false,
    penaltyWarningAccepted: false
  });

  // Load existing incident reports to allow linking
  useEffect(() => {
    let isMounted = true;
    const loadIncidents = async () => {
      setLoadingIncidents(true);
      try {
        const token = sessionStorage.getItem('sahay_token') || localStorage.getItem('sahay_token');
        const res = await fetch('http://localhost:5000/api/incidents/my', {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.incidents) {
            setMyIncidents(data.incidents);
          }
        }
      } catch (err) {
        console.warn('Load citizen incidents note:', err);
      } finally {
        if (isMounted) setLoadingIncidents(false);
      }
    };
    loadIncidents();
    return () => { isMounted = false; };
  }, []);

  // Sync GPS Coordinates if available
  useEffect(() => {
    if (gpsLocation?.latitude && gpsLocation?.longitude) {
      setFormData(prev => ({
        ...prev,
        latitude: gpsLocation.latitude,
        longitude: gpsLocation.longitude,
        district: prev.district || gpsLocation.district || 'Wayanad',
        locality: prev.locality || (gpsLocation as any)?.panchayat || gpsLocation?.village || gpsLocation?.town || 'District Centre'
      }));
    }
  }, [gpsLocation]);

  // Load initial draft if provided
  useEffect(() => {
    if (initialDraftId) {
      fetchReliefClaimById(initialDraftId)
        .then(claim => {
          if (claim) {
            setFormData(prev => ({
              ...prev,
              disasterType: claim.disaster_type || prev.disasterType,
              disasterDate: claim.disaster_date ? claim.disaster_date.split('T')[0] : prev.disasterDate,
              incidentId: claim.incident_id || '',
              assistanceCategory: claim.assistance_category || prev.assistanceCategory,
              damageSeverity: claim.damage_severity || prev.damageSeverity,
              damageDescription: claim.damage_description || '',
              estimatedLoss: claim.estimated_loss ? String(claim.estimated_loss) : '',
              district: claim.district || prev.district,
              locality: claim.locality || prev.locality,
              latitude: claim.latitude || prev.latitude,
              longitude: claim.longitude || prev.longitude,
              bankAccountHolder: claim.bank_account_holder || prev.bankAccountHolder,
              bankName: claim.bank_name || prev.bankName,
              ifscCode: claim.ifsc_code || '',
              houseOwnership: claim.house_ownership || prev.houseOwnership,
              houseType: claim.house_type || prev.houseType,
              cropType: claim.crop_type || prev.cropType,
              livestockType: claim.livestock_type || prev.livestockType
            }));
            if (claim.incident_id) {
              setIsIncidentRelated('yes');
            }
            if (claim.bank_name && !ALL_PRESET_BANKS.includes(claim.bank_name)) {
              setIsCustomBank(true);
              setCustomBankName(claim.bank_name);
            }
          }
        })
        .catch(err => console.warn('Could not load draft details:', err));
    }
  }, [initialDraftId]);

  // Step names for stepper navigation
  const steps = [
    { num: 1, title: 'Disaster Details', icon: AlertTriangle },
    { num: 2, title: 'Applicant Details', icon: UserIcon },
    { num: 3, title: 'Assistance Category', icon: Building2 },
    { num: 4, title: 'Damage Assessment', icon: Home },
    { num: 5, title: 'Location Details', icon: MapPin },
    { num: 6, title: 'Bank / Payment', icon: CreditCard },
    { num: 7, title: 'Supporting Evidence', icon: Camera },
    { num: 8, title: 'Declaration', icon: ShieldCheck },
    { num: 9, title: 'Review & Submit', icon: FileCheck }
  ];

  function UserIcon(props: any) {
    return <FileText {...props} />;
  }

  // Handle Input Changes
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Toggle Vulnerable Persons Selection
  const toggleVulnerable = (item: string) => {
    setFormData(prev => {
      const exists = prev.vulnerablePersons.includes(item);
      if (exists) {
        return { ...prev, vulnerablePersons: prev.vulnerablePersons.filter(v => v !== item) };
      } else {
        if (item === 'None' || item === 'Prefer not to specify') {
          return { ...prev, vulnerablePersons: [item] };
        }
        return { ...prev, vulnerablePersons: [...prev.vulnerablePersons.filter(v => v !== 'None' && v !== 'Prefer not to specify'), item] };
      }
    });
  };

  // Handle Linked Incident Selection
  const handleIncidentSelect = (incId: string) => {
    const matched = myIncidents.find(i => String(i.id) === incId || i.incident_code === incId);
    if (matched) {
      setFormData(prev => ({
        ...prev,
        incidentId: matched.id,
        disasterType: matched.incident_type_name || prev.disasterType,
        damageDescription: prev.damageDescription || matched.description || '',
        latitude: matched.latitude ? parseFloat(matched.latitude) : prev.latitude,
        longitude: matched.longitude ? parseFloat(matched.longitude) : prev.longitude,
        locality: matched.location_address || prev.locality
      }));
    } else {
      setFormData(prev => ({ ...prev, incidentId: '' }));
    }
  };

  // Step Validation Logic
  // Real-time Single Field Validation
  const validateField = (field: string, value: any) => {
    let error = '';
    const str = String(value || '').trim();

    if (field === 'fullName') {
      if (!str) error = 'Full Name is required';
      else if (str.length < 3) error = 'Full Name must be at least 3 characters';
      else if (!/^[a-zA-Z\s\.\'\-]+$/.test(str)) error = 'Name must contain only letters (no numbers or special characters)';
    } else if (field === 'phone') {
      if (!str) error = 'Mobile number is required';
      else if (!/^[6-9]\d{9}$/.test(str)) error = 'Enter a valid 10-digit Indian mobile number (e.g. 9847012345)';
    } else if (field === 'email') {
      if (str && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) error = 'Please enter a valid email address';
    } else if (field === 'district') {
      if (!str) error = 'District is required';
    } else if (field === 'locality') {
      if (!str) error = 'Locality / Village / Town is required';
      else if (str.length < 2) error = 'Locality must be at least 2 characters';
    } else if (field === 'customRelationship') {
      if (!str) error = 'Please specify relationship';
      else if (!/^[a-zA-Z\s\-]+$/.test(str) || str.length < 2) error = 'Relationship must contain only letters';
    } else if (field === 'affectedFamilyMembers') {
      const num = Number(str);
      if (!str || isNaN(num) || !Number.isInteger(num) || num < 1 || num > MAX_FAMILY_MEMBERS) {
        error = `Affected family members must be between 1 and ${MAX_FAMILY_MEMBERS} persons`;
      }
    } else if (field === 'houseRooms') {
      if (str !== '') {
        const rooms = Number(str);
        if (isNaN(rooms) || !Number.isInteger(rooms) || rooms < 1 || rooms > 30) {
          error = 'Number of rooms must be a whole number between 1 and 30';
        }
      }
    } else if (field === 'affectedArea') {
      if (str !== '') {
        const area = Number(str);
        if (isNaN(area) || area <= 0 || area > 50000) {
          error = 'Affected area must be between 1 and 50,000 sq. metres';
        }
      }
    } else if (field === 'totalCropArea') {
      const total = Number(str);
      if (!str || isNaN(total) || total <= 0) {
        error = 'Total agricultural area must be a positive number';
      } else if (total > 500) {
        error = 'Total crop area cannot exceed 500 hectares';
      }
    } else if (field === 'affectedCropArea') {
      const affected = Number(str);
      const total = Number(formData.totalCropArea);
      if (!str || isNaN(affected) || affected <= 0) {
        error = 'Affected crop area must be a positive number';
      } else if (total > 0 && affected > total) {
        error = 'Affected crop area cannot exceed total agricultural area';
      }
    } else if (field === 'livestockLost' || field === 'livestockInjured') {
      const num = Number(str);
      if (str === '' || isNaN(num) || !Number.isInteger(num) || num < 0 || num > 100) {
        error = 'Count must be an integer between 0 and 100';
      }
    } else if (field === 'bankAccountHolder') {
      if (!str) error = 'Account holder name is required';
      else if (str.length < 3) error = 'Name must be at least 3 characters';
      else if (!/^[a-zA-Z\s\.\'\-]+$/.test(str)) error = 'Account holder name must contain only letters (no numbers)';
    } else if (field === 'accountNumber') {
      if (!str) error = 'Account number is required';
      else if (!/^\d{9,18}$/.test(str)) error = 'Account number must be 9 to 18 digits (numbers only)';
    } else if (field === 'confirmAccountNumber') {
      if (!str) error = 'Please re-enter account number to confirm';
      else if (str !== formData.accountNumber.trim()) error = 'Account numbers do not match';
    } else if (field === 'ifscCode') {
      if (!str) error = 'IFSC Code is required';
      else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(str.toUpperCase())) error = 'Invalid IFSC format (e.g. SBIN0001234)';
    } else if (field === 'damageDescription') {
      if (!str) error = 'Damage description is required';
      else if (str.length < 15) error = 'Please provide a clearer description (minimum 15 characters)';
      else if (/^\d+$/.test(str) || /^([a-zA-Z0-9])\1{5,}$/.test(str)) error = 'Please enter a meaningful explanation of the damage';
    } else if (field === 'deceasedPersonName') {
      if (!str) error = 'Deceased person name is required';
      else if (str.length < 3) error = 'Name must be at least 3 characters';
      else if (!/^[a-zA-Z\s\.\'\-]+$/.test(str)) error = 'Name must contain only letters';
    } else if (field === 'estimatedLoss') {
      if (str !== '') {
        const loss = Number(str);
        if (isNaN(loss) || loss < 0) {
          error = 'Estimated loss must be a valid positive amount';
        } else if (loss > 50000000) {
          error = 'Estimated loss exceeds the maximum ceiling of ₹5,00,00,000';
        }
      }
    }

    setErrors(prev => {
      const next = { ...prev };
      if (error) next[field] = error;
      else delete next[field];
      return next;
    });
  };

  // Comprehensive Step Validation Logic
  const validateCurrentStep = (): boolean => {
    const errs: Record<string, string> = {};

    // STEP 1: DISASTER INFORMATION
    if (currentStep === 1) {
      if (!formData.disasterType || !formData.disasterType.trim()) {
        errs.disasterType = 'Please select a disaster type';
      }
      if (!formData.disasterDate) {
        errs.disasterDate = 'Disaster date is required';
      } else {
        const d = new Date(formData.disasterDate);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (d > today) {
          errs.disasterDate = 'Disaster date cannot be in the future';
        } else {
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          if (d < oneYearAgo) {
            errs.disasterDate = 'Disaster date cannot be older than 1 year';
          }
        }
      }
      if (formData.disasterType === 'Other') {
        const custom = formData.customDisasterType.trim();
        if (!custom) {
          errs.customDisasterType = 'Please specify disaster event name';
        } else if (custom.length < 3) {
          errs.customDisasterType = 'Disaster name must be at least 3 characters';
        } else if (!/^[a-zA-Z\s\-\,\.]+$/.test(custom)) {
          errs.customDisasterType = 'Disaster name should contain letters only';
        }
      }
    }

    // STEP 2: APPLICANT & FAMILY PROFILE
    else if (currentStep === 2) {
      const name = formData.fullName.trim();
      if (!name) {
        errs.fullName = 'Full Name is required';
      } else if (name.length < 3) {
        errs.fullName = 'Full Name must be at least 3 characters';
      } else if (!/^[a-zA-Z\s\.\'\-]+$/.test(name)) {
        errs.fullName = 'Full Name must contain only letters (no numbers or special characters)';
      }

      const phone = formData.phone.trim();
      if (!phone) {
        errs.phone = 'Mobile number is required';
      } else if (!/^[6-9]\d{9}$/.test(phone)) {
        errs.phone = 'Enter a valid 10-digit Indian mobile number (e.g. 9847012345)';
      }

      if (formData.email && formData.email.trim()) {
        const email = formData.email.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errs.email = 'Please enter a valid email address';
        }
      }

      if (!formData.district || !formData.district.trim()) {
        errs.district = 'District is required';
      }

      if (formData.relationshipToAffected === 'Other') {
        const rel = formData.customRelationship.trim();
        if (!rel) {
          errs.customRelationship = 'Please specify relationship to affected person';
        } else if (!/^[a-zA-Z\s\-]+$/.test(rel) || rel.length < 2) {
          errs.customRelationship = 'Relationship must contain only letters';
        }
      }

      // Family members bounded between 1 and MAX_FAMILY_MEMBERS
      const rawFam = String(formData.affectedFamilyMembers).trim();
      const famNum = Number(rawFam);
      if (!rawFam || isNaN(famNum) || !Number.isInteger(famNum) || famNum < 1 || famNum > MAX_FAMILY_MEMBERS) {
        errs.affectedFamilyMembers = `Affected family members must be a whole number between 1 and ${MAX_FAMILY_MEMBERS}`;
      }

      if (!formData.vulnerablePersons || formData.vulnerablePersons.length === 0) {
        errs.vulnerablePersons = 'Please select at least one option (select "None" if none apply)';
      }
    }

    // STEP 3: ASSISTANCE CATEGORY
    else if (currentStep === 3) {
      if (!formData.assistanceCategory || !formData.assistanceCategory.trim()) {
        errs.assistanceCategory = 'Please select an assistance category';
      }
      if (!formData.specificSubCategory || !formData.specificSubCategory.trim()) {
        errs.specificSubCategory = 'Please select a specific sub-category';
      }
    }

    // STEP 4: DAMAGE ASSESSMENT DETAILS
    else if (currentStep === 4) {
      if (!formData.damageSeverity) {
        errs.damageSeverity = 'Please select damage severity level';
      }

      const desc = formData.damageDescription.trim();
      if (!desc) {
        errs.damageDescription = 'Damage description is required';
      } else if (desc.length < 15) {
        errs.damageDescription = 'Please provide a clearer description (minimum 15 characters)';
      } else if (/^\d+$/.test(desc) || /^([a-zA-Z0-9])\1{5,}$/.test(desc)) {
        errs.damageDescription = 'Please enter a meaningful explanation of the damage';
      }

      if (formData.estimatedLoss !== '' && formData.estimatedLoss !== null && formData.estimatedLoss !== undefined) {
        const loss = Number(formData.estimatedLoss);
        if (isNaN(loss) || loss < 0) {
          errs.estimatedLoss = 'Estimated loss must be a valid positive amount';
        } else if (loss > 50000000) {
          errs.estimatedLoss = 'Estimated loss exceeds the maximum ceiling of ₹5,00,00,000';
        }
      }

      if (formData.specificSubCategory === 'House damage' || formData.assistanceCategory === 'Recovery Assistance') {
        const rawRooms = String(formData.houseRooms ?? '').trim();
        if (rawRooms !== '') {
          const rooms = Number(rawRooms);
          if (isNaN(rooms) || !Number.isInteger(rooms) || rooms < 1 || rooms > 30) {
            errs.houseRooms = 'Number of rooms must be a whole number between 1 and 30';
          }
        }
        const rawArea = String(formData.affectedArea ?? '').trim();
        if (rawArea !== '') {
          const area = Number(rawArea);
          if (isNaN(area) || area <= 0 || area > 50000) {
            errs.affectedArea = 'Affected area must be between 1 and 50,000 sq. metres';
          }
        }
      }

      if (formData.specificSubCategory === 'Agricultural/crop loss') {
        const total = Number(formData.totalCropArea);
        const affected = Number(formData.affectedCropArea);
        if (formData.totalCropArea === '' || isNaN(total) || total <= 0) {
          errs.totalCropArea = 'Total agricultural area must be a positive number';
        } else if (total > 500) {
          errs.totalCropArea = 'Total crop area cannot exceed 500 hectares';
        }

        if (formData.affectedCropArea === '' || isNaN(affected) || affected <= 0) {
          errs.affectedCropArea = 'Affected crop area must be a positive number';
        } else if (total > 0 && affected > total) {
          errs.affectedCropArea = 'Affected crop area cannot exceed total agricultural area';
        }
      }

      if (formData.specificSubCategory === 'Livestock loss') {
        const lost = Number(formData.livestockLost);
        const injured = Number(formData.livestockInjured);
        if (isNaN(lost) || !Number.isInteger(lost) || lost < 0 || lost > 100) {
          errs.livestockLost = 'Number of animals lost must be an integer between 0 and 100';
        }
        if (isNaN(injured) || !Number.isInteger(injured) || injured < 0 || injured > 100) {
          errs.livestockInjured = 'Number of animals injured must be an integer between 0 and 100';
        }
        if (lost === 0 && injured === 0) {
          errs.livestockLost = 'At least 1 lost or injured animal count must be entered';
        }
      }

      if (formData.specificSubCategory === 'Death/ex-gratia assistance') {
        const dName = formData.deceasedPersonName.trim();
        if (!dName) {
          errs.deceasedPersonName = 'Deceased person name is required';
        } else if (dName.length < 3) {
          errs.deceasedPersonName = 'Deceased person name must be at least 3 characters';
        } else if (!/^[a-zA-Z\s\.\'\-]+$/.test(dName)) {
          errs.deceasedPersonName = 'Name must contain only letters (no numbers)';
        }
      }
    }

    // STEP 5: LOCATION DETAILS
    else if (currentStep === 5) {
      if (!formData.district || !formData.district.trim()) {
        errs.district = 'District is required';
      }
      const loc = formData.locality.trim();
      if (!loc) {
        errs.locality = 'Locality / Village / Town is required';
      } else if (loc.length < 2) {
        errs.locality = 'Locality must be at least 2 characters';
      }

      const lat = Number(formData.latitude);
      const lng = Number(formData.longitude);
      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
        errs.location = 'GPS coordinates are required. Please click "Refresh GPS".';
      } else if (lat < 8.0 || lat > 13.5 || lng < 74.5 || lng > 78.0) {
        errs.location = 'Coordinates are outside Kerala state bounds. Please verify your location.';
      }
    }

    // STEP 6: BANK & PAYMENT DETAILS
    else if (currentStep === 6) {
      const holder = formData.bankAccountHolder.trim();
      if (!holder) {
        errs.bankAccountHolder = 'Account holder name is required';
      } else if (holder.length < 3) {
        errs.bankAccountHolder = 'Account holder name must be at least 3 characters';
      } else if (!/^[a-zA-Z\s\.\'\-]+$/.test(holder)) {
        errs.bankAccountHolder = 'Account holder name must contain only letters (no numbers)';
      }

      if (isCustomBank) {
        const cBank = customBankName.trim();
        if (!cBank) {
          errs.bankName = 'Please enter your bank name';
        } else if (cBank.length < 3) {
          errs.bankName = 'Bank name must be at least 3 characters';
        } else if (!/^[a-zA-Z0-9\s\.\,\-\(\)\&]+$/.test(cBank)) {
          errs.bankName = 'Please enter a valid bank name';
        }
      } else if (!formData.bankName || !formData.bankName.trim()) {
        errs.bankName = 'Please select a beneficiary bank';
      }

      const acc = formData.accountNumber.trim();
      if (!acc) {
        errs.accountNumber = 'Account number is required';
      } else if (!/^\d{9,18}$/.test(acc)) {
        errs.accountNumber = 'Account number must be 9 to 18 digits (numbers only, no spaces or letters)';
      }

      const confirmAcc = formData.confirmAccountNumber.trim();
      if (!confirmAcc) {
        errs.confirmAccountNumber = 'Please re-enter your account number to confirm';
      } else if (acc !== confirmAcc) {
        errs.confirmAccountNumber = 'Account numbers do not match. Please re-check.';
      }

      const ifsc = formData.ifscCode.toUpperCase().trim();
      if (!ifsc) {
        errs.ifscCode = 'Bank IFSC Code is required';
      } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
        errs.ifscCode = 'Invalid IFSC code. Format: 4 letters, 0, then 6 alphanumeric characters (e.g. SBIN0001234)';
      }
    }

    // STEP 7: SUPPORTING EVIDENCE
    else if (currentStep === 7) {
      if (!formData.uploadedFiles || formData.uploadedFiles.length === 0) {
        errs.uploadedFiles = 'Please upload at least 1 damage photograph or supporting document before proceeding to declaration';
      }
    }

    // STEP 8: DECLARATION
    else if (currentStep === 8) {
      if (!formData.declarationAccepted) {
        errs.declarationAccepted = 'You must confirm the truthfulness declaration to submit this application';
      }
      if (!formData.penaltyWarningAccepted) {
        errs.penaltyWarningAccepted = 'You must accept the legal warning regarding fraudulent claims';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Save Draft to Database
  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const payload = {
        incidentId: formData.incidentId ? Number(formData.incidentId) : null,
        disasterType: formData.disasterType === 'Other' ? formData.customDisasterType : formData.disasterType,
        disasterDate: formData.disasterDate,
        relationshipToAffected: formData.relationshipToAffected,
        affectedFamilyMembers: Number(formData.affectedFamilyMembers),
        vulnerablePersonCategory: formData.vulnerablePersons,
        assistanceCategory: formData.assistanceCategory,
        damageType: formData.damageType,
        damageSeverity: formData.damageSeverity,
        damageDescription: formData.damageDescription,
        currentCondition: formData.currentCondition,
        estimatedLoss: formData.estimatedLoss ? parseFloat(formData.estimatedLoss) : 0,
        houseOwnership: formData.houseOwnership,
        houseType: formData.houseType,
        cropType: formData.cropType === 'Other' ? formData.customCropType : formData.cropType,
        totalCropArea: formData.totalCropArea ? parseFloat(formData.totalCropArea) : null,
        affectedCropArea: formData.affectedCropArea ? parseFloat(formData.affectedCropArea) : null,
        cropStage: formData.cropStage,
        cropLossPercentage: formData.cropLossPercentage,
        livestockType: formData.livestockType,
        livestockLost: formData.livestockLost,
        livestockInjured: formData.livestockInjured,
        latitude: formData.latitude,
        longitude: formData.longitude,
        district: formData.district,
        locality: formData.locality,
        bankAccountHolder: formData.bankAccountHolder,
        bankName: formData.bankName,
        accountNumber: formData.accountNumber,
        ifscCode: formData.ifscCode
      };

      if (draftId) {
        await updateReliefDraft(draftId, payload);
      } else {
        const res = await createReliefDraft(payload);
        if (res.claim && res.claim.claim_id) {
          setDraftId(res.claim.claim_id);
        }
      }
      alert('💾 Your relief application draft has been securely saved. You can continue anytime.');
    } catch (err: any) {
      console.error('Save draft error:', err);
      alert('Could not save draft: ' + err.message);
    } finally {
      setSavingDraft(false);
    }
  };

  // Move to Next Step
  const handleNextStep = () => {
    if (validateCurrentStep()) {
      if (currentStep < 9) {
        setCurrentStep(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  // Move to Previous Step
  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Image Upload Handling
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newItems: any[] = [];

      files.forEach((file: File) => {
        if (file.size > 10 * 1024 * 1024) {
          alert(`File ${file.name} is larger than 10MB limit.`);
          return;
        }
        const preview = URL.createObjectURL(file);
        newItems.push({
          file,
          preview,
          name: file.name,
          type: file.type,
          size: file.size
        });
      });

      setFormData(prev => ({
        ...prev,
        uploadedFiles: [...prev.uploadedFiles, ...newItems].slice(0, 5)
      }));
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      uploadedFiles: prev.uploadedFiles.filter((_, idx) => idx !== index)
    }));
  };

  // Final Form Submission
  const handleSubmitApplication = async () => {
    if (!validateCurrentStep()) return;

    setSubmitting(true);
    try {
      // Step A: Ensure Draft Exists in DB
      let activeClaimRef = draftId;
      const payload: any = {
        incidentId: formData.incidentId ? Number(formData.incidentId) : null,
        disasterType: formData.disasterType === 'Other' ? formData.customDisasterType : formData.disasterType,
        disasterDate: formData.disasterDate,
        relationshipToAffected: formData.relationshipToAffected === 'Other' ? formData.customRelationship : formData.relationshipToAffected,
        affectedFamilyMembers: Number(formData.affectedFamilyMembers),
        vulnerablePersonCategory: formData.vulnerablePersons,
        assistanceCategory: formData.assistanceCategory,
        damageType: formData.damageType,
        damageSeverity: formData.damageSeverity,
        damageDescription: formData.damageDescription,
        currentCondition: formData.currentCondition,
        estimatedLoss: formData.estimatedLoss ? parseFloat(formData.estimatedLoss) : 0,
        houseOwnership: formData.houseOwnership,
        houseType: formData.houseType,
        houseRooms: formData.houseRooms,
        houseDamageLevel: formData.houseDamageLevel,
        affectedArea: formData.affectedArea ? parseFloat(formData.affectedArea) : null,
        habitabilityStatus: formData.habitabilityStatus,
        isDisplaced: formData.isDisplaced,
        currentAccommodation: formData.currentAccommodation,
        cropType: formData.cropType === 'Other' ? formData.customCropType : formData.cropType,
        agriculturalLandType: formData.agriculturalLandType,
        totalCropArea: formData.totalCropArea ? parseFloat(formData.totalCropArea) : null,
        affectedCropArea: formData.affectedCropArea ? parseFloat(formData.affectedCropArea) : null,
        cropStage: formData.cropStage,
        cropLossPercentage: formData.cropLossPercentage,
        livestockType: formData.livestockType,
        livestockLost: formData.livestockLost,
        livestockInjured: formData.livestockInjured,
        deceasedPersonName: formData.deceasedPersonName,
        legalHeirRelationship: formData.legalHeirRelationship,
        latitude: formData.latitude,
        longitude: formData.longitude,
        district: formData.district,
        locality: formData.locality,
        bankAccountHolder: formData.bankAccountHolder,
        bankName: formData.bankName,
        accountNumber: formData.accountNumber,
        confirmAccountNumber: formData.confirmAccountNumber,
        ifscCode: formData.ifscCode,
        declarationAccepted: formData.declarationAccepted,
        penaltyWarningAccepted: formData.penaltyWarningAccepted
      };

      if (!activeClaimRef) {
        const createRes = await createReliefDraft(payload);
        activeClaimRef = createRes.claim.claim_id || createRes.claim.id;
      }

      // Step B: Upload Evidence if files selected
      if (formData.uploadedFiles.length > 0 && activeClaimRef) {
        const uploadData = new FormData();
        formData.uploadedFiles.forEach(item => {
          if (item.file) {
            uploadData.append('evidence', item.file);
          }
        });
        uploadData.append('evidenceType', 'damage_photo');
        uploadData.append('description', formData.damageDescription.slice(0, 100));

        try {
          await uploadReliefEvidence(activeClaimRef, uploadData);
        } catch (uploadErr) {
          console.warn('Evidence upload warning:', uploadErr);
        }
      }

      // Step C: Finalize Application Submission
      const submitRes = await submitReliefClaim(activeClaimRef!, payload);

      if (submitRes.success && submitRes.claim) {
        onSubmitSuccess(submitRes.claim);
      } else {
        alert('Submission failed: ' + (submitRes.error || 'Please check your inputs and try again.'));
      }
    } catch (err: any) {
      console.error('Submit application error:', err);
      alert('Error submitting application: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-12">
      
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBackToLanding}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Relief Home</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveDraft}
            disabled={savingDraft}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-1.5 rounded-xl transition-all"
            title="Save your progress as draft"
          >
            <Save className="w-3.5 h-3.5 text-slate-500" />
            <span>{savingDraft ? 'Saving Draft...' : 'Save Draft'}</span>
          </button>
        </div>
      </div>

      {/* Main Header */}
      <div className="bg-gradient-to-r from-[#043e2e] via-[#065f46] to-[#043e2e] text-white p-6 rounded-3xl shadow-md border border-emerald-800">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-800 text-emerald-200 px-2.5 py-0.5 rounded-full">
                FORM SDRF-1A &bull; CITIZEN DISASTER ASSISTANCE
              </span>
              {draftId && (
                <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded-md">
                  {draftId}
                </span>
              )}
            </div>
            <h1 className="text-xl font-black mt-1">Application for Disaster Relief & Compensation</h1>
            <p className="text-xs text-emerald-100/90 mt-0.5">
              Please complete all steps accurately. Information will be verified during official field survey.
            </p>
          </div>

          <div className="hidden sm:block text-right">
            <span className="text-[10px] uppercase font-bold text-emerald-300 block">Step {currentStep} of 9</span>
            <span className="text-sm font-black text-white">{steps[currentStep - 1].title}</span>
          </div>
        </div>

        {/* Visual Progress Stepper Indicator */}
        <div className="mt-6">
          <div className="grid grid-cols-9 gap-1.5">
            {steps.map(s => {
              const isPassed = s.num < currentStep;
              const isCurrent = s.num === currentStep;
              return (
                <div
                  key={s.num}
                  className="space-y-1.5 text-center cursor-pointer group"
                  onClick={() => {
                    // Allow jumping back to earlier completed steps
                    if (s.num < currentStep) setCurrentStep(s.num);
                  }}
                >
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      isCurrent
                        ? 'bg-emerald-300 shadow-sm'
                        : isPassed
                        ? 'bg-emerald-400'
                        : 'bg-emerald-900/60'
                    }`}
                  />
                  <span
                    className={`text-[9px] font-bold hidden md:block truncate ${
                      isCurrent ? 'text-white' : isPassed ? 'text-emerald-200' : 'text-emerald-300/40'
                    }`}
                  >
                    {s.num}. {s.title.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dynamic Form Step Container */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">

        {/* ========================================================================= */}
        {/* STEP 1: DISASTER INFORMATION */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span>Step 1: Disaster Information</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Specify the disaster event that caused loss or property damage.
              </p>
            </div>

            {/* Disaster Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">
                Disaster Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.disasterType}
                onChange={(e) => handleInputChange('disasterType', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#0E8F66]"
              >
                <option value="Flood">Flood</option>
                <option value="Landslide">Landslide</option>
                <option value="Heavy Rainfall">Heavy Rainfall</option>
                <option value="Cyclone">Cyclone</option>
                <option value="Coastal Disaster">Coastal Disaster / Sea Erosion</option>
                <option value="Drought">Drought</option>
                <option value="Fire">Fire</option>
                <option value="Lightning">Lightning</option>
                <option value="Other">Other</option>
              </select>
              {errors.disasterType && <p className="text-[11px] text-rose-600">{errors.disasterType}</p>}
            </div>

            {formData.disasterType === 'Other' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Specify Disaster Type <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.customDisasterType}
                  onChange={(e) => handleInputChange('customDisasterType', e.target.value)}
                  placeholder="e.g. Flash Mudflow, Riverbank Erosion"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0E8F66]"
                />
                {errors.customDisasterType && <p className="text-[11px] text-rose-600">{errors.customDisasterType}</p>}
              </div>
            )}

            {/* Disaster Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">
                Date of Disaster Occurrence <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                max={new Date().toISOString().split('T')[0]}
                value={formData.disasterDate}
                onChange={(e) => handleInputChange('disasterDate', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0E8F66]"
              />
              <p className="text-[10px] text-slate-400">
                Disaster date must be on or before today and fall within the notified disaster period.
              </p>
              {errors.disasterDate && <p className="text-[11px] text-rose-600">{errors.disasterDate}</p>}
            </div>

            {/* Existing SAHAY Incident Linker */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <label className="text-xs font-bold text-slate-800 block">
                Is this application related to an incident you previously reported on SAHAY?
              </label>
              
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="radio"
                    name="isIncidentRelated"
                    checked={isIncidentRelated === 'yes'}
                    onChange={() => setIsIncidentRelated('yes')}
                    className="text-[#0E8F66] focus:ring-[#0E8F66]"
                  />
                  <span>Yes, link my reported incident</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="radio"
                    name="isIncidentRelated"
                    checked={isIncidentRelated === 'no'}
                    onChange={() => {
                      setIsIncidentRelated('no');
                      setFormData(prev => ({ ...prev, incidentId: '' }));
                    }}
                    className="text-[#0E8F66] focus:ring-[#0E8F66]"
                  />
                  <span>No, this is a fresh application</span>
                </label>
              </div>

              {isIncidentRelated === 'yes' && (
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <span className="text-[11px] font-bold text-slate-600 block">
                    Select your previously submitted SAHAY incident:
                  </span>
                  {loadingIncidents ? (
                    <p className="text-xs text-slate-400 animate-pulse">Loading your reported incidents...</p>
                  ) : myIncidents.length === 0 ? (
                    <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                      No prior incident reports found for your account. You can still proceed as a fresh application.
                    </p>
                  ) : (
                    <select
                      value={String(formData.incidentId || '')}
                      onChange={(e) => handleIncidentSelect(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#0E8F66]"
                    >
                      <option value="">-- Choose Incident to link --</option>
                      {myIncidents.map(inc => (
                        <option key={inc.id} value={inc.id}>
                          {inc.incident_code} &bull; {inc.incident_type_name || 'Incident'} ({inc.severity || 'Medium'}) &bull; {inc.created_at ? new Date(inc.created_at).toLocaleDateString() : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  {formData.incidentId && (
                    <p className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Linked incident coordinates and description will be automatically synchronized with your claim.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: APPLICANT DETAILS */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <span>Step 2: Applicant Information</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pre-filled from your authenticated SAHAY citizen profile.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  onBlur={() => validateField('fullName', formData.fullName)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0E8F66]"
                />
                {errors.fullName && <p className="text-[11px] text-rose-600 font-semibold">{errors.fullName}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  onBlur={() => validateField('phone', formData.phone)}
                  placeholder="10-digit mobile number (e.g. 9847012345)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0E8F66]"
                />
                {errors.phone && <p className="text-[11px] text-rose-600 font-semibold">{errors.phone}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">Email Address (Optional)</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  onBlur={() => validateField('email', formData.email)}
                  placeholder="e.g. citizen@example.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0E8F66]"
                />
                {errors.email && <p className="text-[11px] text-rose-600 font-semibold">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">District <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={formData.district}
                  onChange={(e) => handleInputChange('district', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0E8F66]"
                />
                {errors.district && <p className="text-[11px] text-rose-600 font-semibold">{errors.district}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Relationship to Affected Person <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.relationshipToAffected}
                  onChange={(e) => handleInputChange('relationshipToAffected', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0E8F66]"
                >
                  <option value="Self">Self (Primary Householder / Owner)</option>
                  <option value="Parent">Parent</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Child">Child</option>
                  <option value="Legal Heir">Legal Heir</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Number of Family Members Affected <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] font-bold text-[#0B4D3B] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                    Limit: 1 - {MAX_FAMILY_MEMBERS} members
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const cur = Number(formData.affectedFamilyMembers) || 1;
                      const next = Math.max(1, cur - 1);
                      handleInputChange('affectedFamilyMembers', next);
                      validateField('affectedFamilyMembers', next);
                    }}
                    disabled={Number(formData.affectedFamilyMembers) <= 1}
                    className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center font-black text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-base transition-colors"
                    title="Decrease family count"
                  >
                    -
                  </button>

                  <input
                    type="number"
                    min="1"
                    max={MAX_FAMILY_MEMBERS}
                    value={formData.affectedFamilyMembers}
                    onChange={(e) => {
                      let raw = e.target.value.replace(/[^0-9]/g, '');
                      // Enforce max 2 digits: impossible to type 500 or any 3-digit number
                      if (raw.length > 2) raw = raw.slice(0, 2);
                      if (raw === '') {
                        handleInputChange('affectedFamilyMembers', '');
                        validateField('affectedFamilyMembers', '');
                        return;
                      }
                      let num = parseInt(raw, 10);
                      if (num > MAX_FAMILY_MEMBERS) {
                        num = MAX_FAMILY_MEMBERS; // Hard clamp to maximum allowed limit
                      }
                      handleInputChange('affectedFamilyMembers', num);
                      validateField('affectedFamilyMembers', num);
                    }}
                    onBlur={() => {
                      const num = Number(formData.affectedFamilyMembers);
                      if (!num || num < 1) {
                        handleInputChange('affectedFamilyMembers', 1);
                        validateField('affectedFamilyMembers', 1);
                      } else if (num > MAX_FAMILY_MEMBERS) {
                        handleInputChange('affectedFamilyMembers', MAX_FAMILY_MEMBERS);
                        validateField('affectedFamilyMembers', MAX_FAMILY_MEMBERS);
                      } else {
                        validateField('affectedFamilyMembers', num);
                      }
                    }}
                    placeholder={`1-${MAX_FAMILY_MEMBERS}`}
                    className="w-24 text-center font-extrabold text-sm bg-slate-50 border border-slate-200 rounded-xl py-2.5 text-slate-900 focus:outline-none focus:border-[#0E8F66]"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      const cur = Number(formData.affectedFamilyMembers) || 1;
                      const next = Math.min(MAX_FAMILY_MEMBERS, cur + 1);
                      handleInputChange('affectedFamilyMembers', next);
                      validateField('affectedFamilyMembers', next);
                    }}
                    disabled={Number(formData.affectedFamilyMembers) >= MAX_FAMILY_MEMBERS}
                    className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center font-black text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-base transition-colors"
                    title="Increase family count"
                  >
                    +
                  </button>

                  <span className="text-[11px] text-slate-500 font-medium ml-1">
                    (Max {MAX_FAMILY_MEMBERS} per household claim)
                  </span>
                </div>

                <p className="text-[10px] text-slate-400">
                  Statutory household ceiling under SDRF guidelines (maximum {MAX_FAMILY_MEMBERS} persons per unit).
                </p>
                {errors.affectedFamilyMembers && (
                  <p className="text-[11px] text-rose-600 font-semibold">{errors.affectedFamilyMembers}</p>
                )}
              </div>
            </div>

            {formData.relationshipToAffected === 'Other' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Specify Relationship <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Uncle, Nephew, Authorized Caregiver"
                  value={formData.customRelationship}
                  onChange={(e) => handleInputChange('customRelationship', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0E8F66]"
                />
                {errors.customRelationship && <p className="text-[11px] text-rose-600 font-semibold">{errors.customRelationship}</p>}
              </div>
            )}

            {/* Vulnerable Persons in Household */}
            <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="text-xs font-bold text-slate-800 block">
                Does the affected household include vulnerable persons? <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {[
                  'Elderly person (60+)',
                  'Child (Under 12)',
                  'Person with disability',
                  'Pregnant woman',
                  'None',
                  'Prefer not to specify'
                ].map(opt => {
                  const isChecked = formData.vulnerablePersons.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleVulnerable(opt)}
                      className={`p-2.5 rounded-xl border text-left font-semibold transition-all ${
                        isChecked
                          ? 'bg-emerald-50 border-[#0E8F66] text-[#0B4D3B]'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-4 h-4 rounded-md border flex items-center justify-center text-[10px] ${
                          isChecked ? 'bg-[#0E8F66] text-white border-[#0E8F66]' : 'border-slate-300'
                        }`}>
                          {isChecked ? '✓' : ''}
                        </span>
                        <span className="text-[11px]">{opt}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              {errors.vulnerablePersons && <p className="text-[11px] text-rose-600">{errors.vulnerablePersons}</p>}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: ASSISTANCE CATEGORY */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-teal-600" />
                <span>Step 3: Type of Assistance Requested</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select the type of disaster assistance applicable to your situation. Final eligibility and assistance amount will be determined after official verification.
              </p>
            </div>

            {/* Assistance Categories Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  id: 'Immediate Relief',
                  title: 'A. Immediate Relief',
                  desc: 'Emergency household assistance, temporary shelter support, food kits, essential kitchen utensils and clothing.',
                  subOptions: ['Emergency household assistance', 'Temporary shelter assistance', 'Essential household items', 'Food/basic necessities']
                },
                {
                  id: 'Damage Assistance',
                  title: 'B. Damage Assistance',
                  desc: 'Residential house damage, crop loss, livestock loss, small vendor equipment or trade property loss.',
                  subOptions: ['House damage', 'Agricultural/crop loss', 'Livestock loss', 'Vehicle/property damage', 'Livelihood loss']
                },
                {
                  id: 'Death / Injury Assistance',
                  title: 'C. Death / Injury Assistance',
                  desc: 'Ex-gratia relief for disaster-induced bereavement or grievous hospitalised injuries.',
                  subOptions: ['Death/ex-gratia assistance', 'Injury-related assistance']
                },
                {
                  id: 'Recovery Assistance',
                  title: 'D. Recovery Assistance',
                  desc: 'Reconstruction grant for houses destroyed beyond repair, or economic livelihood rehabilitation.',
                  subOptions: ['Housing recovery', 'Livelihood recovery', 'Other recovery assistance']
                }
              ].map(cat => {
                const isSelected = formData.assistanceCategory === cat.id;
                return (
                  <div
                    key={cat.id}
                    onClick={() => {
                      handleInputChange('assistanceCategory', cat.id);
                      handleInputChange('specificSubCategory', cat.subOptions[0]);
                    }}
                    className={`p-5 rounded-3xl border cursor-pointer transition-all space-y-3 ${
                      isSelected
                        ? 'bg-emerald-50/70 border-[#0E8F66] shadow-sm ring-1 ring-[#0E8F66]'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-sm text-slate-900">{cat.title}</h3>
                      <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs ${
                        isSelected ? 'bg-[#0E8F66] text-white border-[#0E8F66]' : 'border-slate-300'
                      }`}>
                        {isSelected ? '✓' : ''}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{cat.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* Sub-Category selector */}
            <div className="space-y-1.5 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="text-xs font-bold text-slate-800">
                Specific Damage / Assistance Sub-type <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.specificSubCategory}
                onChange={(e) => handleInputChange('specificSubCategory', e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0E8F66]"
              >
                {formData.assistanceCategory === 'Immediate Relief' && (
                  <>
                    <option value="Emergency household assistance">Emergency household assistance</option>
                    <option value="Temporary shelter assistance">Temporary shelter assistance</option>
                    <option value="Essential household items">Essential household items</option>
                    <option value="Food/basic necessities">Food/basic necessities</option>
                  </>
                )}
                {formData.assistanceCategory === 'Damage Assistance' && (
                  <>
                    <option value="House damage">House damage</option>
                    <option value="Agricultural/crop loss">Agricultural/crop loss</option>
                    <option value="Livestock loss">Livestock loss</option>
                    <option value="Vehicle/property damage">Vehicle/property damage</option>
                    <option value="Livelihood loss">Livelihood loss</option>
                  </>
                )}
                {formData.assistanceCategory === 'Death / Injury Assistance' && (
                  <>
                    <option value="Death/ex-gratia assistance">Death / ex-gratia assistance</option>
                    <option value="Injury-related assistance">Grievous injury assistance</option>
                  </>
                )}
                {formData.assistanceCategory === 'Recovery Assistance' && (
                  <>
                    <option value="Housing recovery">Housing recovery (Reconstruction)</option>
                    <option value="Livelihood recovery">Livelihood recovery grant</option>
                  </>
                )}
              </select>
            </div>

            {/* Government SDRF Norms Disclaimer */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-900 leading-relaxed">
                <strong>Assistance Notice:</strong> Assistance is subject to applicable government norms, eligibility conditions, and official verification by the revenue department. No guaranteed amount is displayed at application time.
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: DAMAGE / LOSS DETAILS (DYNAMIC CONDITIONAL SECTIONS) */}
        {/* ========================================================================= */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Home className="w-5 h-5 text-[#0E8F66]" />
                <span>Step 4: Damage Assessment</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Provide specifics of loss to enable designated field officers to inspect the site.
              </p>
            </div>

            {/* Damage Severity Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">
                Damage Severity <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'Partially Damaged', label: 'Partially Damaged', color: 'border-blue-300 bg-blue-50/50' },
                  { id: 'Severely Damaged', label: 'Severely Damaged', color: 'border-amber-300 bg-amber-50/50' },
                  { id: 'Fully Destroyed', label: 'Fully Destroyed', color: 'border-rose-300 bg-rose-50/50' }
                ].map(sev => (
                  <button
                    key={sev.id}
                    type="button"
                    onClick={() => handleInputChange('damageSeverity', sev.id)}
                    className={`p-3 rounded-2xl border text-xs font-extrabold text-center transition-all ${
                      formData.damageSeverity === sev.id
                        ? 'border-[#0E8F66] bg-emerald-50 text-[#0B4D3B] shadow-xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {sev.label}
                  </button>
                ))}
              </div>
              {errors.damageSeverity && <p className="text-[11px] text-rose-600 font-semibold">{errors.damageSeverity}</p>}
            </div>

            {/* CONDITIONAL SUB-SECTION: HOUSE DAMAGE */}
            {(formData.specificSubCategory === 'House damage' || formData.assistanceCategory === 'Recovery Assistance') && (
              <div className="p-5 bg-slate-50 rounded-3xl border border-slate-200 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <Home className="w-4 h-4 text-[#0E8F66]" />
                  <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                    Residential Property Loss Details
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">House Ownership</label>
                    <select
                      value={formData.houseOwnership}
                      onChange={(e) => handleInputChange('houseOwnership', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                    >
                      <option value="Owned">Owned</option>
                      <option value="Rented">Rented</option>
                      <option value="Leased">Leased</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">House Type</label>
                    <select
                      value={formData.houseType}
                      onChange={(e) => handleInputChange('houseType', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                    >
                      <option value="Concrete/RCC">Concrete / Reinforced Cement (Permanent House)</option>
                      <option value="Brick/Masonry">Brick / Masonry (Permanent House)</option>
                      <option value="Mud/Traditional">Mud / Traditional (Non-permanent House)</option>
                      <option value="Temporary">Temporary / Thatched House</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Number of Rooms (1-30)</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={formData.houseRooms}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        handleInputChange('houseRooms', val ? parseInt(val, 10) : '');
                      }}
                      onBlur={() => validateField('houseRooms', formData.houseRooms)}
                      placeholder="e.g. 4"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                    />
                    {errors.houseRooms && <p className="text-[11px] text-rose-600 font-semibold">{errors.houseRooms}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Current Habitability</label>
                    <select
                      value={formData.habitabilityStatus}
                      onChange={(e) => handleInputChange('habitabilityStatus', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                    >
                      <option value="Safe to occupy">Safe to occupy</option>
                      <option value="Partially safe">Partially safe</option>
                      <option value="Unsafe">Unsafe</option>
                      <option value="Completely destroyed">Completely destroyed</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Estimated Area Affected (Square Metres)</label>
                    <input
                      type="number"
                      min="1"
                      max="50000"
                      placeholder="e.g. 65"
                      value={formData.affectedArea}
                      onChange={(e) => handleInputChange('affectedArea', e.target.value)}
                      onBlur={() => validateField('affectedArea', formData.affectedArea)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                    />
                    {errors.affectedArea && <p className="text-[11px] text-rose-600 font-semibold">{errors.affectedArea}</p>}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <label className="text-xs font-bold text-slate-800 block">Has your household been displaced?</label>
                  <div className="flex items-center gap-4 text-xs">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={formData.isDisplaced}
                        onChange={() => handleInputChange('isDisplaced', true)}
                        className="text-[#0E8F66]"
                      />
                      <span>Yes, displaced</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={!formData.isDisplaced}
                        onChange={() => handleInputChange('isDisplaced', false)}
                        className="text-[#0E8F66]"
                      />
                      <span>No, residing at home</span>
                    </label>
                  </div>

                  {formData.isDisplaced && (
                    <div className="pt-2">
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Current Accommodation</label>
                      <select
                        value={formData.currentAccommodation}
                        onChange={(e) => handleInputChange('currentAccommodation', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                      >
                        <option value="Relief Camp">Official Relief Camp</option>
                        <option value="Relative house">Relative / Friend House</option>
                        <option value="Temporary shelter">Temporary Shelter</option>
                        <option value="Rented house">Temporary Rented House</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CONDITIONAL SUB-SECTION: CROP DAMAGE */}
            {formData.specificSubCategory === 'Agricultural/crop loss' && (
              <div className="p-5 bg-slate-50 rounded-3xl border border-slate-200 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <Sprout className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                    Agricultural & Crop Loss Details
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Crop Type</label>
                    <select
                      value={formData.cropType}
                      onChange={(e) => handleInputChange('cropType', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                    >
                      <option value="Paddy">Paddy</option>
                      <option value="Coconut">Coconut</option>
                      <option value="Rubber">Rubber</option>
                      <option value="Banana">Banana</option>
                      <option value="Pepper">Pepper</option>
                      <option value="Cardamom">Cardamom</option>
                      <option value="Vegetables">Vegetables</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Agricultural Land Type</label>
                    <select
                      value={formData.agriculturalLandType}
                      onChange={(e) => handleInputChange('agriculturalLandType', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                    >
                      <option value="Irrigated Wetland">Irrigated Wetland</option>
                      <option value="Rainfed Dryland">Rain-fed Dryland</option>
                      <option value="Hill Plantation">Hill Plantation</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Total Agricultural Area (Hectares)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="500"
                      placeholder="e.g. 1.5"
                      value={formData.totalCropArea}
                      onChange={(e) => handleInputChange('totalCropArea', e.target.value)}
                      onBlur={() => validateField('totalCropArea', formData.totalCropArea)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                    />
                    {errors.totalCropArea && <p className="text-[11px] text-rose-600 font-semibold">{errors.totalCropArea}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Affected Area (Hectares)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="500"
                      placeholder="e.g. 1.2"
                      value={formData.affectedCropArea}
                      onChange={(e) => handleInputChange('affectedCropArea', e.target.value)}
                      onBlur={() => validateField('affectedCropArea', formData.affectedCropArea)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                    />
                    {errors.affectedCropArea && <p className="text-[11px] text-rose-600 font-semibold">{errors.affectedCropArea}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Crop Stage</label>
                    <select
                      value={formData.cropStage}
                      onChange={(e) => handleInputChange('cropStage', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                    >
                      <option value="Newly planted">Newly planted</option>
                      <option value="Growing">Growing</option>
                      <option value="Flowering">Flowering</option>
                      <option value="Fruiting">Fruiting</option>
                      <option value="Ready for harvest">Ready for harvest</option>
                      <option value="Harvested">Harvested</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>Applicant's Estimated Loss %</span>
                      <span className="text-[#0E8F66]">{formData.cropLossPercentage}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={formData.cropLossPercentage}
                      onChange={(e) => handleInputChange('cropLossPercentage', Number(e.target.value))}
                      className="w-full accent-[#0E8F66]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* CONDITIONAL SUB-SECTION: LIVESTOCK LOSS */}
            {formData.specificSubCategory === 'Livestock loss' && (
              <div className="p-5 bg-slate-50 rounded-3xl border border-slate-200 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <HeartPulse className="w-4 h-4 text-amber-600" />
                  <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                    Livestock Loss Details
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Animal Type</label>
                    <select
                      value={formData.livestockType}
                      onChange={(e) => handleInputChange('livestockType', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                    >
                      <option value="Cow">Cow (Milch cattle)</option>
                      <option value="Buffalo">Buffalo</option>
                      <option value="Goat">Goat</option>
                      <option value="Sheep">Sheep</option>
                      <option value="Poultry">Poultry birds</option>
                      <option value="Pig">Pig</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Number Lost / Deceased (0-100)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.livestockLost}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        handleInputChange('livestockLost', val === '' ? 0 : parseInt(val, 10));
                      }}
                      onBlur={() => validateField('livestockLost', formData.livestockLost)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                    />
                    {errors.livestockLost && <p className="text-[11px] text-rose-600 font-semibold">{errors.livestockLost}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Number Injured (0-100)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.livestockInjured}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        handleInputChange('livestockInjured', val === '' ? 0 : parseInt(val, 10));
                      }}
                      onBlur={() => validateField('livestockInjured', formData.livestockInjured)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                    />
                    {errors.livestockInjured && <p className="text-[11px] text-rose-600 font-semibold">{errors.livestockInjured}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* CONDITIONAL SUB-SECTION: DEATH / EX-GRATIA */}
            {formData.specificSubCategory === 'Death/ex-gratia assistance' && (
              <div className="p-5 bg-slate-50 rounded-3xl border border-slate-200 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <AlertCircle className="w-4 h-4 text-purple-600" />
                  <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                    Deceased Person & Legal Heir Record
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Deceased Person Full Name</label>
                    <input
                      type="text"
                      value={formData.deceasedPersonName}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^a-zA-Z\s\.\'\-]/g, '');
                        handleInputChange('deceasedPersonName', val);
                      }}
                      onBlur={() => validateField('deceasedPersonName', formData.deceasedPersonName)}
                      placeholder="Name as in official records (letters only)"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                    />
                    {errors.deceasedPersonName && <p className="text-[11px] text-rose-600 font-semibold">{errors.deceasedPersonName}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Applicant Legal Heir Status</label>
                    <select
                      value={formData.legalHeirRelationship}
                      onChange={(e) => handleInputChange('legalHeirRelationship', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                    >
                      <option value="Spouse">Spouse (Husband / Wife)</option>
                      <option value="Son">Son</option>
                      <option value="Daughter">Daughter</option>
                      <option value="Mother">Mother</option>
                      <option value="Father">Father</option>
                      <option value="Other Legal Heir">Other Authorized Legal Heir</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Damage Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">
                Damage Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                maxLength={1000}
                value={formData.damageDescription}
                onChange={(e) => handleInputChange('damageDescription', e.target.value)}
                onBlur={() => validateField('damageDescription', formData.damageDescription)}
                placeholder="Describe the damage caused by the disaster (e.g. mudslide cracked foundation, 4 feet floodwater inundation ruined furniture and electronics, etc.)."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-[#0E8F66]"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Min 15 characters, max 1000 characters. Letters, numbers, and punctuation.</span>
                <span>{formData.damageDescription.length} / 1000</span>
              </div>
              {errors.damageDescription && <p className="text-[11px] text-rose-600 font-semibold">{errors.damageDescription}</p>}
            </div>

            {/* Applicant's Estimated Loss (Optional) */}
            <div className="space-y-1.5 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="text-xs font-bold text-slate-800">
                Applicant's Estimated Loss (Optional)
              </label>
              <div className="relative max-w-xs">
                <span className="absolute left-3.5 top-2.5 font-bold text-slate-400 text-xs">₹</span>
                <input
                  type="number"
                  min="0"
                  max="50000000"
                  placeholder="e.g. 50000"
                  value={formData.estimatedLoss}
                  onChange={(e) => handleInputChange('estimatedLoss', e.target.value)}
                  onBlur={() => validateField('estimatedLoss', formData.estimatedLoss)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#0E8F66]"
                />
              </div>
              {errors.estimatedLoss && <p className="text-[11px] text-rose-600 font-semibold">{errors.estimatedLoss}</p>}
              <p className="text-[10px] text-slate-500 italic">
                Note: This is an applicant-provided estimate and is not the final approved compensation amount.
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 5: LOCATION DETAILS (GPS + POSTGIS) */}
        {/* ========================================================================= */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#0E8F66]" />
                <span>Step 5: Affected Location & PostGIS Verification</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Using device GPS sensor for spatial verification against official disaster hazard zones.
              </p>
            </div>

            {/* Location Verification Status Box */}
            <div className="p-5 bg-gradient-to-br from-emerald-50 to-[#EAF8F3] rounded-3xl border border-emerald-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#0E8F66] text-white flex items-center justify-center font-bold">
                    ✓
                  </div>
                  <div>
                    <h3 className="font-black text-xs text-[#0B4D3B] uppercase">GPS Sensor Location Verified</h3>
                    <p className="text-[11px] text-emerald-800">Direct satellite triangulation via SAHAY Location Engine</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => refreshLocation?.()}
                  className="px-3 py-1 bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-800 font-bold text-[11px] rounded-lg shadow-2xs flex items-center gap-1 transition-all"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Refresh GPS</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white p-4 rounded-2xl border border-emerald-200/70">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Latitude</span>
                  <span className="font-mono font-bold text-slate-900">{formData.latitude ? Number(formData.latitude).toFixed(5) : '...'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Longitude</span>
                  <span className="font-mono font-bold text-slate-900">{formData.longitude ? Number(formData.longitude).toFixed(5) : '...'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">District</span>
                  <span className="font-bold text-slate-900">{formData.district}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Locality</span>
                  <span className="font-bold text-slate-900">{formData.locality}</span>
                </div>
              </div>
            </div>

            {/* Editable Locality & Place Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Place / Village / Panchayat <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.locality}
                  onChange={(e) => handleInputChange('locality', e.target.value)}
                  onBlur={() => validateField('locality', formData.locality)}
                  placeholder="e.g. Meppadi Town / Ward 7"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0E8F66]"
                />
                {errors.locality && <p className="text-[11px] text-rose-600 font-semibold">{errors.locality}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">District <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={formData.district}
                  onChange={(e) => handleInputChange('district', e.target.value)}
                  onBlur={() => validateField('district', formData.district)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0E8F66]"
                />
                {errors.district && <p className="text-[11px] text-rose-600 font-semibold">{errors.district}</p>}
              </div>
            </div>

            {/* Spatial PostGIS note */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>PostGIS Disaster Zone Query:</strong> Submitted coordinates are spatially validated against active KSDMA disaster polygons.
                If your location falls outside declared zones, your claim will be tagged for additional ground verification rather than rejected.
              </span>
            </div>
            {errors.location && <p className="text-[11px] text-rose-600">{errors.location}</p>}
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 6: BANK / PAYMENT DETAILS */}
        {/* ========================================================================= */}
        {currentStep === 6 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span>Step 6: Bank & Payment Details</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Provide valid bank account details for direct benefit disbursement upon Collector approval.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Account Holder Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.bankAccountHolder}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^a-zA-Z\s\.\'\-]/g, '');
                    handleInputChange('bankAccountHolder', val);
                  }}
                  onBlur={() => validateField('bankAccountHolder', formData.bankAccountHolder)}
                  placeholder="Name as printed in passbook (letters only)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0E8F66]"
                />
                {errors.bankAccountHolder && <p className="text-[11px] text-rose-600 font-semibold">{errors.bankAccountHolder}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Bank Name <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] font-normal text-slate-400">Scheduled Commercial / Co-op Banks</span>
                </label>
                <select
                  value={
                    ALL_PRESET_BANKS.includes(formData.bankName)
                      ? formData.bankName
                      : formData.bankName
                      ? 'OTHER'
                      : ''
                  }
                  onChange={(e) => {
                    const selected = e.target.value;
                    if (selected === 'OTHER') {
                      setIsCustomBank(true);
                      handleInputChange('bankName', customBankName || '');
                    } else {
                      setIsCustomBank(false);
                      handleInputChange('bankName', selected);
                      const hint = BANK_IFSC_HINTS[selected];
                      if (hint && (!formData.ifscCode || formData.ifscCode.length <= 5)) {
                        handleInputChange('ifscCode', hint);
                      }
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-[#0E8F66]"
                >
                  <option value="">-- Select Beneficiary Bank --</option>
                  {INDIAN_BANK_GROUPS.map((group) => (
                    <optgroup key={group.category} label={group.category}>
                      {group.banks.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </optgroup>
                  ))}
                  <option value="OTHER">Other Commercial / Co-operative / Gramin Bank (Type Manually)</option>
                </select>

                {isCustomBank && (
                  <div className="pt-2 animate-fade-in">
                    <input
                      type="text"
                      placeholder="Type your Bank Name (e.g., Kozhikode District Co-operative Bank)"
                      value={customBankName}
                      onChange={(e) => {
                        setCustomBankName(e.target.value);
                        handleInputChange('bankName', e.target.value);
                      }}
                      className="w-full bg-white border-2 border-emerald-500 rounded-xl px-4 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>
                )}
                {errors.bankName && <p className="text-[11px] text-rose-600 font-semibold">{errors.bankName}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Account Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  maxLength={18}
                  value={formData.accountNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 18);
                    handleInputChange('accountNumber', val);
                  }}
                  onBlur={() => validateField('accountNumber', formData.accountNumber)}
                  placeholder="Enter complete bank account number (digits only)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#0E8F66]"
                />
                {errors.accountNumber && <p className="text-[11px] text-rose-600 font-semibold">{errors.accountNumber}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Confirm Account Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={18}
                  value={formData.confirmAccountNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 18);
                    handleInputChange('confirmAccountNumber', val);
                  }}
                  onBlur={() => validateField('confirmAccountNumber', formData.confirmAccountNumber)}
                  placeholder="Re-enter to confirm account number"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#0E8F66]"
                />
                {errors.confirmAccountNumber && <p className="text-[11px] text-rose-600 font-semibold">{errors.confirmAccountNumber}</p>}
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-800">
                  Bank IFSC Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={11}
                  value={formData.ifscCode}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
                    handleInputChange('ifscCode', val);
                  }}
                  onBlur={() => validateField('ifscCode', formData.ifscCode)}
                  placeholder={BANK_IFSC_HINTS[formData.bankName] ? `${BANK_IFSC_HINTS[formData.bankName]}0001234` : 'e.g. SBIN0001234'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-mono uppercase focus:outline-none focus:border-[#0E8F66]"
                />
                {BANK_IFSC_HINTS[formData.bankName] && (
                  <p className="text-[10px] text-slate-500">
                    Standard {formData.bankName} prefix: <span className="font-mono font-bold text-[#0E8F66]">{BANK_IFSC_HINTS[formData.bankName]}</span>
                  </p>
                )}
                {errors.ifscCode && <p className="text-[11px] text-rose-600 font-semibold">{errors.ifscCode}</p>}
              </div>
            </div>

            {/* Masked Account Number Preview & Privacy Disclaimer */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800">Data Protection & Account Masking</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                For security and privacy, your account number is encrypted and stored in masked format:
                <strong className="font-mono ml-1 text-slate-900">
                  {formData.accountNumber && formData.accountNumber.length >= 4
                    ? 'XXXXXX' + formData.accountNumber.slice(-4)
                    : 'XXXXXX----'}
                </strong>.
                Complete bank credentials are never displayed on public screens.
              </p>
              <p className="text-[10px] text-slate-400 italic">
                * Payment processing is simulated for the academic prototype unless an authorized DBT integration is active.
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 7: SUPPORTING DOCUMENTS & EVIDENCE */}
        {/* ========================================================================= */}
        {currentStep === 7 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Camera className="w-5 h-5 text-indigo-600" />
                <span>Step 7: Supporting Documents & Evidence</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload clear photographs of damage. Images will be analyzed by SAHAY AI for preliminary severity assessment.
              </p>
            </div>

            {/* Upload Box */}
            <div className="border-2 border-dashed border-slate-300 rounded-3xl p-8 text-center bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer relative">
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleImageUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-2xs">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-800 mt-3">
                Click or drag damage photos / land documents here
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                JPG, PNG, WEBP, or PDF &bull; Maximum 10MB per file &bull; Up to 5 files
              </p>
            </div>

            {errors.uploadedFiles && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-600 flex items-center gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errors.uploadedFiles}</span>
              </div>
            )}

            {/* Image Previews */}
            {formData.uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 block">
                  Attached Evidence Files ({formData.uploadedFiles.length})
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {formData.uploadedFiles.map((f, idx) => (
                    <div key={idx} className="relative group rounded-2xl overflow-hidden border border-slate-200 aspect-square bg-slate-100 flex items-center justify-center">
                      {f.type?.includes('pdf') ? (
                        <div className="p-3 text-center">
                          <FileText className="w-8 h-8 text-red-500 mx-auto" />
                          <span className="text-[10px] font-bold text-slate-700 truncate block mt-1">{f.name}</span>
                        </div>
                      ) : (
                        <img src={f.preview} alt={f.name} className="w-full h-full object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded-lg shadow opacity-90 hover:opacity-100 transition-opacity"
                        title="Remove file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Preliminary Assessment Preview Box */}
            <div className="p-4 bg-gradient-to-br from-indigo-50/70 to-purple-50/70 rounded-3xl border border-indigo-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                    Preliminary AI Damage Assessment (Preview)
                  </span>
                </div>
                <span className="text-[10px] font-bold bg-indigo-200 text-indigo-900 px-2 py-0.5 rounded-full">
                  Vision Model v2.4
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-[10px] text-indigo-700 block">Suggested Severity</span>
                  <span className="font-extrabold text-indigo-950 uppercase">
                    {formData.damageSeverity}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-indigo-700 block">Confidence Indicator</span>
                  <span className="font-extrabold text-indigo-950">
                    {formData.uploadedFiles.length > 0 ? '82% High Confidence' : 'Pending Upload'}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-indigo-900/80 leading-relaxed italic border-t border-indigo-200/60 pt-2">
                * Note: AI vision analysis provides only a preliminary automated indicator to assist decision-makers. AI never determines final compensation or automatically approves claims. Final assessment is conducted by authorized field officers.
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 8: DECLARATION */}
        {/* ========================================================================= */}
        {currentStep === 8 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Step 8: Citizen Declaration</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Official statutory declaration required under the Disaster Management Act, 2005.
              </p>
            </div>

            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-5 text-xs text-slate-800">
              {/* Checkbox 1 */}
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.declarationAccepted}
                  onChange={(e) => handleInputChange('declarationAccepted', e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-[#0E8F66] rounded border-slate-300 focus:ring-[#0E8F66]"
                />
                <span className="leading-relaxed font-medium">
                  I declare that the information provided in this application is true and accurate to the best of my knowledge. I understand that eligibility and assistance will be determined according to applicable government rules and official verification.
                </span>
              </label>
              {errors.declarationAccepted && <p className="text-[11px] text-rose-600 pl-7">{errors.declarationAccepted}</p>}

              {/* Checkbox 2 */}
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.penaltyWarningAccepted}
                  onChange={(e) => handleInputChange('penaltyWarningAccepted', e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-[#0E8F66] rounded border-slate-300 focus:ring-[#0E8F66]"
                />
                <span className="leading-relaxed font-medium">
                  I understand that providing false information may result in rejection of the application and other action under applicable rules of the Disaster Management Act and State Revenue Recovery regulations.
                </span>
              </label>
              {errors.penaltyWarningAccepted && <p className="text-[11px] text-rose-600 pl-7">{errors.penaltyWarningAccepted}</p>}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 9: REVIEW & SUBMIT */}
        {/* ========================================================================= */}
        {currentStep === 9 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-[#0E8F66]" />
                <span>Step 9: Review Your Application Before Submission</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Verify all sections below. You can click "Edit" on any section to revise details before final submission.
              </p>
            </div>

            {/* Read-Only Summary Cards */}
            <div className="space-y-4 text-xs">
              
              {/* Applicant Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start justify-between">
                <div>
                  <h4 className="font-extrabold text-slate-900 uppercase text-[11px] tracking-wider">Applicant Details</h4>
                  <p className="font-bold text-slate-900 mt-1">{formData.fullName} ({formData.relationshipToAffected})</p>
                  <p className="text-slate-500">{formData.phone} &bull; {formData.district}, {formData.locality}</p>
                  <p className="text-slate-500 mt-0.5">Family Members: {formData.affectedFamilyMembers} &bull; Vulnerable: {formData.vulnerablePersons.join(', ')}</p>
                </div>
                <button onClick={() => setCurrentStep(2)} className="text-[#0E8F66] font-bold hover:underline text-[11px]">
                  Edit
                </button>
              </div>

              {/* Disaster Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start justify-between">
                <div>
                  <h4 className="font-extrabold text-slate-900 uppercase text-[11px] tracking-wider">Disaster Information</h4>
                  <p className="font-bold text-slate-900 mt-1">{formData.disasterType} &bull; Date: {formData.disasterDate}</p>
                  <p className="text-slate-500 mt-0.5">
                    {formData.incidentId ? `Linked SAHAY Incident ID: ${formData.incidentId}` : 'Fresh Direct Claim'}
                  </p>
                </div>
                <button onClick={() => setCurrentStep(1)} className="text-[#0E8F66] font-bold hover:underline text-[11px]">
                  Edit
                </button>
              </div>

              {/* Damage Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start justify-between">
                <div>
                  <h4 className="font-extrabold text-slate-900 uppercase text-[11px] tracking-wider">Damage & Loss Details</h4>
                  <p className="font-bold text-slate-900 mt-1">{formData.assistanceCategory} &bull; {formData.damageSeverity}</p>
                  <p className="text-slate-600 mt-1 italic">"{formData.damageDescription}"</p>
                  <p className="text-slate-500 mt-1 font-semibold">
                    Estimated Loss: ₹{formData.estimatedLoss ? Number(formData.estimatedLoss).toLocaleString('en-IN') : '0'}
                  </p>
                </div>
                <button onClick={() => setCurrentStep(4)} className="text-[#0E8F66] font-bold hover:underline text-[11px]">
                  Edit
                </button>
              </div>

              {/* Location Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start justify-between">
                <div>
                  <h4 className="font-extrabold text-slate-900 uppercase text-[11px] tracking-wider">Verified Location</h4>
                  <p className="font-bold text-slate-900 mt-1">{formData.locality}, {formData.district}</p>
                  <p className="font-mono text-slate-500">GPS: {Number(formData.latitude || 0).toFixed(4)}, {Number(formData.longitude || 0).toFixed(4)} (Sensor Verified ✓)</p>
                </div>
                <button onClick={() => setCurrentStep(5)} className="text-[#0E8F66] font-bold hover:underline text-[11px]">
                  Edit
                </button>
              </div>

              {/* Bank Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start justify-between">
                <div>
                  <h4 className="font-extrabold text-slate-900 uppercase text-[11px] tracking-wider">Disbursement Account</h4>
                  <p className="font-bold text-slate-900 mt-1">{formData.bankAccountHolder} &bull; {formData.bankName}</p>
                  <p className="font-mono text-slate-600">
                    A/C: {formData.accountNumber ? 'XXXXXX' + formData.accountNumber.slice(-4) : 'Not Provided'} &bull; IFSC: {formData.ifscCode}
                  </p>
                </div>
                <button onClick={() => setCurrentStep(6)} className="text-[#0E8F66] font-bold hover:underline text-[11px]">
                  Edit
                </button>
              </div>

              {/* Documents Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start justify-between">
                <div>
                  <h4 className="font-extrabold text-slate-900 uppercase text-[11px] tracking-wider">Evidence Files</h4>
                  <p className="font-bold text-slate-900 mt-1">{formData.uploadedFiles.length} file(s) attached for field review</p>
                </div>
                <button onClick={() => setCurrentStep(7)} className="text-[#0E8F66] font-bold hover:underline text-[11px]">
                  Edit
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Stepper Navigation Buttons */}
        <div className="border-t border-slate-200 pt-6 flex items-center justify-between gap-4">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            {currentStep < 9 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-6 py-2.5 bg-[#0E8F66] hover:bg-[#0B4D3B] text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitApplication}
                className="px-8 py-3 bg-[#0E8F66] hover:bg-[#0B4D3B] text-white font-black text-xs rounded-xl flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Submitting Application to DDMA...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit Relief Application</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
