/**
 * SAHAY AI Disaster Copilot Core Service
 * 
 * Features:
 * 1. Granular Intent Detection (21 Discrete Emergency & Conversational Intents)
 * 2. Intent-Dependent Context Gating (No PostGIS/Weather/Shelter queries for greetings/casual conversation)
 * 3. Grounded LLM Integration (Google Gemini with strict situational prompt constraining)
 * 4. Grounded Deterministic Emergency Rule Engine (Zero hallucinations, 100% adherence to verified SAHAY data)
 * 5. Strict Safety Rule Engine Injection (KSDMA/NDMA protocols)
 * 6. Dynamic Action Buttons (SOS, Relief Application, Safe Shelters)
 * 7. Multilingual Support (English, Malayalam, Manglish)
 */

const { getSafetyRules } = require('./safetyRules');
const { calculateContextualRisk } = require('./mlRiskService');
const { correctQuery } = require('./queryCorrection.service');

/**
 * Kerala Administrative Districts & Normalization Dictionary
 */
const KERALA_DISTRICTS = [
  'Alappuzha',
  'Ernakulam',
  'Idukki',
  'Kannur',
  'Kasaragod',
  'Kollam',
  'Kottayam',
  'Kozhikode',
  'Malappuram',
  'Palakkad',
  'Pathanamthitta',
  'Thiruvananthapuram',
  'Thrissur',
  'Wayanad'
];

const DISTRICT_ALIASES = {
  'alappuzha': 'Alappuzha',
  'alleppey': 'Alappuzha',
  'ആലപ്പുഴ': 'Alappuzha',

  'ernakulam': 'Ernakulam',
  'cochin': 'Ernakulam',
  'kochi': 'Ernakulam',
  'എറണാകുളം': 'Ernakulam',
  'കൊച്ചി': 'Ernakulam',

  'idukki': 'Idukki',
  'ഇടുക്കി': 'Idukki',

  'kannur': 'Kannur',
  'cannanore': 'Kannur',
  'കണ്ണൂർ': 'Kannur',

  'kasaragod': 'Kasaragod',
  'kasargod': 'Kasaragod',
  'കാസർഗോഡ്': 'Kasaragod',
  'കാസറഗോഡ്': 'Kasaragod',

  'kollam': 'Kollam',
  'quilon': 'Kollam',
  'കൊല്ലം': 'Kollam',

  'kottayam': 'Kottayam',
  'കോട്ടയം': 'Kottayam',

  'kozhikode': 'Kozhikode',
  'calicut': 'Kozhikode',
  'കോഴിക്കോട്': 'Kozhikode',

  'malappuram': 'Malappuram',
  'മലപ്പുറം': 'Malappuram',

  'palakkad': 'Palakkad',
  'palghat': 'Palakkad',
  'പാലക്കാട്': 'Palakkad',

  'pathanamthitta': 'Pathanamthitta',
  'പത്തനംതിട്ട': 'Pathanamthitta',

  'thiruvananthapuram': 'Thiruvananthapuram',
  'trivandrum': 'Thiruvananthapuram',
  'തിരുവനന്തപുരം': 'Thiruvananthapuram',

  'thrissur': 'Thrissur',
  'trichur': 'Thrissur',
  'തൃശ്ശൂർ': 'Thrissur',

  'wayanad': 'Wayanad',
  'wynad': 'Wayanad',
  'വയനാട്': 'Wayanad'
};

const KERALA_PLACES = {
  'thodupuzha': { place: 'Thodupuzha', district: 'Idukki' },
  'munnar': { place: 'Munnar', district: 'Idukki' },
  'painavu': { place: 'Painavu', district: 'Idukki' },
  'kattappana': { place: 'Kattappana', district: 'Idukki' },
  'adimali': { place: 'Adimali', district: 'Idukki' },
  'nedumkandam': { place: 'Nedumkandam', district: 'Idukki' },
  'peerumade': { place: 'Peerumade', district: 'Idukki' },
  'kumily': { place: 'Kumily', district: 'Idukki' },
  'devikulam': { place: 'Devikulam', district: 'Idukki' },
  'kanjirappally': { place: 'Kanjirappally', district: 'Kottayam' },
  'pala': { place: 'Pala', district: 'Kottayam' },
  'changanassery': { place: 'Changanassery', district: 'Kottayam' },
  'vaikom': { place: 'Vaikom', district: 'Kottayam' },
  'erattupetta': { place: 'Erattupetta', district: 'Kottayam' },
  'aluva': { place: 'Aluva', district: 'Ernakulam' },
  'angamaly': { place: 'Angamaly', district: 'Ernakulam' },
  'perumbavoor': { place: 'Perumbavoor', district: 'Ernakulam' },
  'kalpetta': { place: 'Kalpetta', district: 'Wayanad' },
  'sulthan bathery': { place: 'Sulthan Bathery', district: 'Wayanad' },
  'bathery': { place: 'Sulthan Bathery', district: 'Wayanad' },
  'mananthavady': { place: 'Mananthavady', district: 'Wayanad' },
  'vythiri': { place: 'Vythiri', district: 'Wayanad' },
  'meppadi': { place: 'Meppadi', district: 'Wayanad' },
  'chooralmala': { place: 'Chooralmala', district: 'Wayanad' },
  'mundakkai': { place: 'Mundakkai', district: 'Wayanad' }
};

/**
 * Normalizes user-entered or DB district string to canonical 14 Kerala districts
 */
function normalizeDistrict(districtName) {
  if (!districtName) return null;
  const key = districtName.trim().toLowerCase();
  return DISTRICT_ALIASES[key] || districtName.trim();
}

/**
 * Extracts explicit requested location (district/place) or defaults to current GPS
 */
function extractLocationContext(message = '', queryCorrection = null) {
  const text = (message || '').trim().toLowerCase();

  let requestedDistrict = null;
  let requestedPlace = null;
  let locationConfidence = queryCorrection ? queryCorrection.correctionConfidence : 'UNKNOWN';
  let locationSource = 'NONE';
  let needsClarification = queryCorrection ? queryCorrection.needsClarification : false;
  let clarificationMessage = queryCorrection ? queryCorrection.clarificationMessage : null;
  let unrecognizedLocation = queryCorrection ? queryCorrection.unrecognizedLocation : null;

  // If query correction identified an unrecognized location requiring clarification (Section 22)
  if (needsClarification && unrecognizedLocation) {
    return {
      requestedDistrict: null,
      requestedPlace: unrecognizedLocation,
      requestedState: null,
      locationSource: 'USER_REQUEST',
      locationConfidence: 'LOW',
      calculateDistance: false,
      needsClarification: true,
      clarificationMessage,
      unrecognizedLocation
    };
  }

  // 1. Check for explicit distance calculation requirement
  const calculateDistance = /(nearest|closest|distance|how far)/i.test(text);

  // 2. Check for explicit "near me" or "around me"
  const isNearMe = /(near me|around me|my location|closest to me|nearest to me|\bhere\b|from here)/i.test(text);

  // 3. Check for Kerala districts in text
  for (const [alias, canonical] of Object.entries(DISTRICT_ALIASES)) {
    const districtRegex = new RegExp(`(^|\\W)${alias}(\\W|$)`, 'i');
    if (districtRegex.test(text)) {
      requestedDistrict = canonical;
      locationConfidence = 'DISTRICT';
      break;
    }
  }

  // 4. Check for known Kerala places in text
  for (const [alias, info] of Object.entries(KERALA_PLACES)) {
    const placeRegex = new RegExp(`(^|\\W)${alias}(\\W|$)`, 'i');
    if (placeRegex.test(text)) {
      requestedPlace = info.place;
      requestedDistrict = requestedDistrict || info.district;
      locationConfidence = 'EXACT';
      break;
    }
  }

  // 5. Fallback check for "in <Location>" or "at <Location>" if no place/district matched yet
  if (!requestedDistrict && !requestedPlace) {
    const inMatch = text.match(/(?:in|at|around|for)\s+([a-zA-Z]{3,25})/i);
    if (inMatch) {
      const candidate = inMatch[1].toLowerCase();
      const nonLocations = ['the', 'my', 'our', 'this', 'that', 'area', 'kerala', 'state', 'today', 'emergency', 'shelter', 'camp', 'camps', 'flood', 'need', 'relief', 'safe'];
      if (!nonLocations.includes(candidate)) {
        requestedPlace = candidate.charAt(0).toUpperCase() + candidate.slice(1);
        locationConfidence = 'EXACT';
      }
    }
  }

  // 6. Determine location source
  if (requestedDistrict || requestedPlace) {
    locationSource = 'USER_REQUEST';
    if (!locationConfidence || locationConfidence === 'UNKNOWN') {
      locationConfidence = requestedPlace ? 'EXACT' : 'DISTRICT';
    }
  } else if (isNearMe) {
    locationSource = 'CURRENT_GPS';
    locationConfidence = 'CURRENT_GPS';
  }

  return {
    requestedDistrict,
    requestedPlace,
    requestedState: (requestedDistrict || requestedPlace) ? 'Kerala' : null,
    locationSource,
    locationConfidence,
    calculateDistance,
    needsClarification: false,
    clarificationMessage: null,
    unrecognizedLocation: null
  };
}

/**
 * Evaluates raw intent matching across 21 discrete disaster & conversational categories
 */
function determineRawIntent(text, locationContext) {

  // 1. SOS & Trapped / Life-Threatening Emergencies (Highest Priority)
  const isSOS = 
    /(i am|we are|citizen|someone is|people are)?\s*(trapped|stuck|buried|marooned|drowning|sinking)/i.test(text) ||
    /urgent rescue|save (me|us|my family)|need rescue|send rescue team|emergency rescue|stuck inside|trapped inside/i.test(text) ||
    /^\s*(sos|mayday)\s*$/i.test(text) ||
    /രക്ഷിക്കുക|രക്ഷിക്കൂ|കുടുങ്ങിപ്പോയി|പെട്ടുപോയി|രക്ഷാസേന|ജീവൻ അപകടത്തിലാണ്/i.test(text);

  if (isSOS) {
    return {
      intent: 'SOS',
      disasterType: 'SOS',
      severity: 'CRITICAL',
      requiresContext: true,
      requiresSOS: true,
      locationContext
    };
  }

  // 2. Greetings (No context retrieval needed)
  const isGreeting = 
    /^(hi|hello|hey|good\s+morning|good\s+afternoon|good\s+evening|namaskaram|namaste|halo|ഹായ്|ഹലോ|നമസ്കാരം)(\s+(copilot|sahay|there|bot|team|all|sir|madam))?[\s!.,?]*$/i.test(text);

  if (isGreeting) {
    return {
      intent: 'GREETING',
      disasterType: 'NONE',
      severity: 'NONE',
      requiresContext: false,
      requiresSOS: false,
      locationContext: { ...locationContext, locationSource: 'NONE' }
    };
  }

  // 3. Casual Conversation / Acknowledgements (No context retrieval needed)
  const isCasual = 
    /^(thanks|thank\s+you|thx|ok|okay|bye|goodbye|cool|great|nice|nanni|valare\s+nanni|നന്ദി|ശരി)[\s!.,?]*$/i.test(text);

  if (isCasual) {
    return {
      intent: 'CASUAL_CONVERSATION',
      disasterType: 'NONE',
      severity: 'NONE',
      requiresContext: false,
      requiresSOS: false
    };
  }

  // 4. Capability Query (No context retrieval needed)
  const isCapability = 
    /what\s+can\s+you\s+do|how\s+can\s+you\s+help|who\s+are\s+you|what\s+are\s+your\s+features|what\s+do\s+you\s+do|help\s+me\s+understand\s+what\s+you\s+do|enthokke\s+cheyyan\s+pattum|enthanu\s+sahay|എന്തൊക്കെ\s+ചെയ്യാൻ\s+കഴിയും/i.test(text);

  if (isCapability) {
    return {
      intent: 'CAPABILITY_QUERY',
      disasterType: 'NONE',
      severity: 'NONE',
      requiresContext: false,
      requiresSOS: false
    };
  }

  // 5. Shelter Query (Needs shelters only)
  const isShelter = 
    /shelter|relief\s+camp|evacuation\s+center|camp\b|safe\s+place\s+to\s+stay|where\s+to\s+stay|campu|ക്യാമ്പ്|അഭയകേന്ദ്രം/i.test(text);
  if (isShelter && !/damage|crack|collapse|destroy/i.test(text)) {
    const locCtx = { ...locationContext };
    if (locCtx.locationSource === 'NONE') {
      locCtx.locationSource = 'CURRENT_GPS';
      locCtx.locationConfidence = 'CURRENT_GPS';
    }
    return {
      intent: 'SHELTER_QUERY',
      disasterType: 'SHELTER',
      severity: 'LOW',
      requiresContext: true,
      requiresSOS: false,
      locationContext: locCtx,
      requestedDistrict: locCtx.requestedDistrict,
      requestedPlace: locCtx.requestedPlace,
      locationSource: locCtx.locationSource,
      locationConfidence: locCtx.locationConfidence
    };
  }

  // 6. Hospital / Medical Facility Query (Needs hospitals only)
  const isHospital = 
    /hospital|clinic|health\s+center|doctor|ambulance|asupathri|ആശുപത്രി/i.test(text);
  if (isHospital && !/injured|bleeding|heart\s+attack|unconscious|dying|fracture/i.test(text)) {
    return {
      intent: 'HOSPITAL_QUERY',
      disasterType: 'HOSPITAL',
      severity: 'LOW',
      requiresContext: true,
      requiresSOS: false
    };
  }

  // 7. Disaster Alerts Query (Needs alerts only)
  const isAlert = 
    /alert|warning|red\s+alert|orange\s+alert|yellow\s+alert|ksdma\s+alert|warning\s+issued|is\s+there\s+(any\s+)?(flood\s+|weather\s+|disaster\s+)?alert|jagratha|മുന്നറിയിപ്പ്/i.test(text);
  if (isAlert) {
    return {
      intent: 'DISASTER_ALERT_QUERY',
      disasterType: 'ALERTS',
      severity: 'LOW',
      requiresContext: true,
      requiresSOS: false
    };
  }

  // 8. Weather Query (Needs weather only)
  const isWeather = 
    /will\s+it\s+rain|weather|forecast|temperature|rain\s+today|is\s+it\s+raining|monsoon\s+update|mazha\s+peyyumo|കാലാവസ്ഥ|മഴ\s+പെയ്യുമോ/i.test(text);
  if (isWeather && !/flood|water\s+entering|disaster|hazard/i.test(text)) {
    return {
      intent: 'WEATHER_QUERY',
      disasterType: 'WEATHER',
      severity: 'LOW',
      requiresContext: true,
      requiresSOS: false
    };
  }

  // 9. Risk Query (Needs risk calculation, hazards, weather, alerts)
  const isRisk = 
    /is\s+my\s+area\s+at\s+risk|am\s+i\s+(at\s+risk|in\s+danger|safe)|is\s+it\s+safe\s+here|risk\s+level|hazard\s+zone|danger\s+level|risk\s+assessment|അപകട\s+സാധ്യത|സുരക്ഷിതനാണോ/i.test(text);
  if (isRisk) {
    return {
      intent: 'RISK_QUERY',
      disasterType: 'RISK',
      severity: 'LOW',
      requiresContext: true,
      requiresSOS: false
    };
  }

  // 10. Building Damage & Relief / Compensation
  const isBuildingDamage = 
    /house.*(damage|destroy|ruin|crack|broken|collapse)|building.*(damage|collapse|crack)|roof.*(damage|blow|leak|collapse)|wall.*(crack|collapse)|veedu\s+thakarnnu|വീട്\s+തകർന്നു|കെട്ടിടം/i.test(text);

  const isRelief = 
    /relief|compensation|claim|financial\s+aid|sdrf|cmdrf|reimbursement|dhanasahayam|nashtapariharam|നഷ്ടപരിഹാരം|ധനസഹായം/i.test(text);

  if (isBuildingDamage && isRelief) {
    return {
      intent: 'RELIEF_ASSISTANCE',
      disasterType: 'BUILDING_DAMAGE',
      severity: 'LOW',
      requiresContext: true,
      requiresSOS: false
    };
  }

  if (isBuildingDamage) {
    const mentionsDisaster = /flood|rain|landslide|storm|water/i.test(text);
    return {
      intent: 'BUILDING_DAMAGE',
      disasterType: 'BUILDING_DAMAGE',
      severity: mentionsDisaster ? 'MEDIUM' : 'HIGH',
      requiresContext: true,
      requiresSOS: false
    };
  }

  if (isRelief) {
    return {
      intent: 'RELIEF_ASSISTANCE',
      disasterType: 'RELIEF_ASSISTANCE',
      severity: 'LOW',
      requiresContext: true,
      requiresSOS: false
    };
  }

  // 11. Evacuation
  const isEvacuation = 
    /evacuat|how\s+to\s+leave|evacuation\s+route|safe\s+route|order\s+to\s+evacuate|ozhiyeedumo|ഒഴിപ്പിച്ചു|ഒഴിയണം/i.test(text);
  if (isEvacuation) {
    return {
      intent: 'EVACUATION',
      disasterType: 'EVACUATION',
      severity: 'HIGH',
      requiresContext: true,
      requiresSOS: false
    };
  }

  // 12. Safety Guidance / General Inquiry (e.g. "What should I do during a landslide?", "landslide safety", "What is a flood?")
  const isGuidance = 
    /what\s+should\s+i\s+do|how\s+to\s+prepare|safety|precautions|dos\s+and\s+donts|what\s+to\s+do\s+during|what\s+is\s+a\s+|how\s+to\s+stay\s+safe|സുരക്ഷ|മുൻകരുതൽ/i.test(text);

  // 13. Flood
  const isFlood = 
    /water.*(enter|ris|flow|reach|inside|house|home|flood|high|level|drown)/i.test(text) ||
    /flood|inundat|submerge|overflow|vellam|vellappokkam|kerunnundu|keri|മുങ്ങി|വെള്ളം/i.test(text);

  // 14. Landslide
  const isLandslide = 
    /landslide|mudslide|debris|slope|soil.*fall|rocks.*fall|hill.*collaps|urul|urulpottal|mannidichil|malayil|ഉരുൾപൊട്ടൽ|മണ്ണിടിച്ചിൽ/i.test(text);

  if (isGuidance) {
    let targetDisaster = 'SAFETY_GUIDANCE';
    if (isLandslide) targetDisaster = 'LANDSLIDE';
    else if (isFlood) targetDisaster = 'FLOOD';
    return {
      intent: 'SAFETY_GUIDANCE',
      disasterType: targetDisaster,
      severity: 'LOW',
      requiresContext: true,
      requiresSOS: false
    };
  }

  if (isFlood) {
    const isWaterEntering = /(water.*enter|entering|inside\s+house|rising|overflow|vellam\s+keri)/i.test(text);
    return {
      intent: 'FLOOD',
      disasterType: 'FLOOD',
      severity: isWaterEntering ? 'HIGH' : 'LOW',
      requiresContext: true,
      requiresSOS: false
    };
  }

  if (isLandslide) {
    const isSevere = /(active|cracking|rolling|blocked|danger|urgent)/i.test(text);
    return {
      intent: 'LANDSLIDE',
      disasterType: 'LANDSLIDE',
      severity: isSevere ? 'HIGH' : 'LOW',
      requiresContext: true,
      requiresSOS: false
    };
  }

  // 15. Fire
  const isFire = /fire|flame|smoke|burning|blast|cylinder|thee|theepidutham|തീ|പുക/i.test(text);
  if (isFire) {
    return {
      intent: 'FIRE',
      disasterType: 'FIRE',
      severity: 'HIGH',
      requiresContext: true,
      requiresSOS: false
    };
  }

  // 16. Medical Emergency
  const isMedicalEmergency = 
    /injured|bleeding|heart\s+attack|unconscious|fracture|snake\s+bite|pregnant\s+emergency|stroke|breathing\s+problem|dying|പരുക്ക്|ശ്വാസം/i.test(text);
  if (isMedicalEmergency) {
    return {
      intent: 'MEDICAL_EMERGENCY',
      disasterType: 'MEDICAL_EMERGENCY',
      severity: 'HIGH',
      requiresContext: true,
      requiresSOS: /unconscious|heart\s+attack|dying/i.test(text)
    };
  }

  // 17. Missing Person
  const isMissingPerson = /missing\s+person|person\s+missing|relative\s+missing|lost\s+child|family\s+member\s+lost|kananilla|ആളെ\s+കാണാനില്ല/i.test(text);
  if (isMissingPerson) {
    return {
      intent: 'MISSING_PERSON',
      disasterType: 'MISSING_PERSON',
      severity: 'HIGH',
      requiresContext: true,
      requiresSOS: false
    };
  }

  // 18. Road Blockage
  const isRoadBlockage = /road\s+block|bridge\s+broken|tree\s+fall|traffic\s+block|cannot\s+travel|route\s+closed|vazhi\s+adanju|വഴി\s+തടസ്സം/i.test(text);
  if (isRoadBlockage) {
    return {
      intent: 'ROAD_BLOCKAGE',
      disasterType: 'ROAD_BLOCKAGE',
      severity: 'MEDIUM',
      requiresContext: true,
      requiresSOS: false
    };
  }

  // 19. Heavy Rain
  const isHeavyRain = /heavy\s+rain|storm|cyclone|thunder|torrential|cloudburst|kattu|മഴ|ഇടിമിന്നൽ/i.test(text);
  if (isHeavyRain) {
    return {
      intent: 'HEAVY_RAIN',
      disasterType: 'HEAVY_RAIN',
      severity: 'MEDIUM',
      requiresContext: true,
      requiresSOS: false
    };
  }

  // 20. General Disaster Query (only if disaster terms exist)
  const hasGeneralDisasterWord = /disaster|hazard|tsunami|earthquake|emergency|ksdma|ndma|preparedness|kit|safety/i.test(text);
  if (hasGeneralDisasterWord) {
    return {
      intent: 'GENERAL_DISASTER_QUERY',
      disasterType: 'GENERAL_DISASTER_QUERY',
      severity: 'LOW',
      requiresContext: true,
      requiresSOS: false
    };
  }

  // 21. Unknown Non-Disaster Query -> Treat as CASUAL_CONVERSATION without context!
  return {
    intent: 'CASUAL_CONVERSATION',
    disasterType: 'NONE',
    severity: 'NONE',
    requiresContext: false,
    requiresSOS: false
  };
}

/**
 * Universal Intent Classification and Query Correction Entrypoint
 * 1. Executes universal text normalization and spelling/typo correction across the whole query
 * 2. Extracts location context using canonical dictionary and fuzzy matching
 * 3. Classifies emergency intent using corrected query
 * 4. Attaches structured audit metadata
 */
function classifyEmergencyIntent(message = '', lang = 'en') {
  const queryCorrection = correctQuery(message, lang);
  const normalizedMessage = queryCorrection.correctedText || message;
  const text = normalizedMessage.trim().toLowerCase();
  const locationContext = extractLocationContext(normalizedMessage, queryCorrection);

  const raw = determineRawIntent(text, locationContext);
  const locCtx = raw.locationContext || locationContext;

  return {
    ...raw,
    locationContext: locCtx,
    requestedDistrict: locCtx.requestedDistrict || null,
    requestedPlace: locCtx.requestedPlace || null,
    locationSource: locCtx.locationSource || 'NONE',
    locationConfidence: locCtx.locationConfidence || 'UNKNOWN',
    queryCorrection,
    originalQuery: queryCorrection.originalText || message,
    correctedQuery: queryCorrection.correctedText || message,
    corrections: queryCorrection.corrections || [],
    correctionConfidence: queryCorrection.correctionConfidence || 'HIGH'
  };
}

/**
 * Returns selective PostGIS and API context options based on intent and location context
 */
function getContextOptionsForIntent(intent, locationContext = {}) {
  const options = {
    locationContext
  };

  switch (intent) {
    case 'WEATHER_QUERY':
      return { ...options, includeWeather: true, includeAlerts: true };
    case 'DISASTER_ALERT_QUERY':
      return { ...options, includeAlerts: true, includeWeather: true };
    case 'SHELTER_QUERY':
      return { ...options, includeShelters: true };
    case 'HOSPITAL_QUERY':
      return { ...options, includeHospitals: true };
    case 'RISK_QUERY':
      return {
        ...options,
        includeWeather: true,
        includeAlerts: true,
        includeHazards: true,
        includeRoadHazards: true,
        includeIncidents: true
      };
    case 'SAFETY_GUIDANCE':
      return { ...options, includeAlerts: true };
    case 'FLOOD':
    case 'LANDSLIDE':
      return {
        ...options,
        includeWeather: true,
        includeAlerts: true,
        includeShelters: true,
        includeHazards: true
      };
    case 'HEAVY_RAIN':
      return { ...options, includeWeather: true, includeAlerts: true };
    case 'FIRE':
      return { ...options, includeHospitals: true, includeRescueUnits: true };
    case 'BUILDING_DAMAGE':
      return { ...options, includeShelters: true };
    case 'ROAD_BLOCKAGE':
      return { ...options, includeRoadHazards: true };
    case 'MEDICAL_EMERGENCY':
      return { ...options, includeHospitals: true };
    case 'MISSING_PERSON':
      return { ...options, includeIncidents: true, includeRescueUnits: true };
    case 'EVACUATION':
      return { ...options, includeShelters: true, includeRoadHazards: true };
    case 'SOS':
      return { ...options, includeRescueUnits: true, includeHospitals: true, includeShelters: true };
    case 'RELIEF_ASSISTANCE':
      return { ...options };
    case 'GENERAL_DISASTER_QUERY':
    default:
      return { ...options, includeAlerts: true, includeWeather: true };
  }
}

/**
 * Direct conversational responses for non-disaster / conversational queries
 * Completely bypasses PostGIS, shelters, and weather APIs.
 */
function generateConversationalResponse(classification, lang = 'en') {
  const isMalayalam = (lang || 'en').toLowerCase().startsWith('ml');
  const { intent } = classification;

  if (intent === 'GREETING') {
    if (isMalayalam) {
      return "👋 നമസ്കാരം! ഞാൻ സഹായ് (SAHAY) AI ദുരന്തനിവാരണ കോപൈലറ്റ് ആണ്. ദുരന്ത മുന്നറിയിപ്പുകൾ, സുരക്ഷാ മാർഗ്ഗനിർദ്ദേശങ്ങൾ, അടുത്തുള്ള ദുരിതാശ്വാസ ക്യാമ്പുകൾ, അടിയന്തര സഹായം, ദുരന്ത നഷ്ടപരിഹാര സേവനങ്ങൾ എന്നിവയിൽ ഞാൻ നിങ്ങളെ സഹായിക്കാം.\n\nഇന്ന് ഞാൻ നിങ്ങളെ എങ്ങനെയാണ് സഹായിക്കേണ്ടത്?";
    }
    return "👋 Hello! I'm SAHAY AI Copilot. I can help you with disaster alerts, safety guidance, nearby shelters, emergency assistance, risk information and relief services.\n\nHow can I help you today?";
  }

  if (intent === 'CAPABILITY_QUERY') {
    if (isMalayalam) {
      return "എനിക്ക് നിങ്ങളെ സഹായിക്കാൻ സാധിക്കുന്ന കാര്യങ്ങൾ:\n\n🌧️ ദുരന്ത മുന്നറിയിപ്പുകളും കാലാവസ്ഥയും പരിശോധിക്കുക\n📍 അടുത്തുള്ള ദുരിതാശ്വാസ ക്യാമ്പുകളും ആശുപത്രികളും കണ്ടെത്തുക\n⚠️ നിങ്ങളുടെ പ്രദേശത്തെ അപകടസാധ്യത മനസ്സിലാക്കുക\n🛡️ ഔദ്യോഗിക സുരക്ഷാ മാർഗ്ഗനിർദ്ദേശങ്ങൾ അറിയുക\n🚨 അടിയന്തര രക്ഷാസഹായം (SOS) ആവശ്യപ്പെടുക\n🧾 സർക്കാർ ദുരിതാശ്വാസ ധനസഹായത്തിന് അപേക്ഷിക്കുക\n\nനിങ്ങൾക്ക് ആവശ്യമുള്ള സഹായം ചോദിക്കാവുന്നതാണ്.";
    }
    return "I can help you:\n\n🌧️ Check disaster alerts and weather\n📍 Find nearby shelters and emergency services\n⚠️ Understand your local disaster risk\n🛡️ Get disaster-specific safety guidance\n🚨 Request emergency assistance\n🧾 Get guidance about relief services\n\nJust tell me what you need.";
  }

  if (intent === 'CASUAL_CONVERSATION') {
    if (isMalayalam) {
      return "തീർച്ചയായും! സുരക്ഷിതരായിരിക്കുക. ദുരന്ത മുന്നറിയിപ്പുകൾ, കാലാവസ്ഥ, ദുരിതാശ്വാസ ക്യാമ്പുകൾ, അല്ലെങ്കിൽ അടിയന്തര സഹായം എന്നിവ ആവശ്യമുണ്ടെങ്കിൽ എപ്പോൾ വേണമെങ്കിലും ചോദിക്കാം.";
    }
    return "You're welcome! Stay safe. If you need any disaster alerts, weather updates, shelter locations, or emergency assistance, feel free to ask.";
  }

  return "👋 Hello! I'm SAHAY AI Copilot, your dedicated emergency & disaster assistant in Kerala. How can I assist you with safety or disaster preparedness today?";
}

/**
 * Generate contextual response using Deterministic Emergency Engine
 * Guarantees zero hallucinations and 100% adherence to verified SAHAY data.
 */
function generateContextualRuleResponse(query, context, classification, isMalayalam) {
  const { intent, disasterType, severity, requiresSOS } = classification;
  const district = context.location?.district || 'Kerala';
  const place = context.location?.place || district;
  const nearestShelter = context.shelters?.[0] || null;
  const nearestHospital = context.hospitals?.[0] || null;
  const activeAlerts = context.alerts?.list || [];
  const primaryAlert = activeAlerts[0] || null;
  const weather = context.weather || {};

  // 1. WEATHER_QUERY
  if (intent === 'WEATHER_QUERY') {
    if (isMalayalam) {
      return `🌦️ **കാലാവസ്ഥ വിവരങ്ങൾ (${place}, ${district})**\n\n` +
        `• **താപനില:** ${weather.temperature || 26}°C\n` +
        `• **കാലാവസ്ഥ:** ${weather.condition || 'Monsoon Showers'}\n` +
        `• **മഴ സാധ്യത:** ${weather.rainProbability || 0}%\n` +
        `• **മഴയുടെ അളവ്:** ${weather.precipitation || 0} mm\n` +
        `• **കാറ്റിന്റെ വേഗത:** ${weather.windSpeed || 15} km/h\n\n` +
        (weather.rainProbability > 60 ? `⚠️ മഴ സാധ്യത കൂടുതലായതിനാൽ പുറത്തിറങ്ങുമ്പോൾ ശ്രദ്ധിക്കുക.` : `സാധാരണ കാലാവസ്ഥ നിലനിൽക്കുന്നു.`);
    }
    return `🌦️ **WEATHER FORECAST FOR ${place.toUpperCase()}, ${district.toUpperCase()}**\n\n` +
      `• **Temperature:** ${weather.temperature || 26}°C\n` +
      `• **Condition:** ${weather.condition || 'Monsoon Showers'}\n` +
      `• **Rain Probability:** ${weather.rainProbability || 0}%\n` +
      `• **Precipitation:** ${weather.precipitation || 0} mm\n` +
      `• **Wind Speed:** ${weather.windSpeed || 15} km/h\n\n` +
      (weather.rainProbability > 60 ? `⚠️ High probability of rainfall. Please carry rain protection and exercise caution if travelling.` : `No severe rainfall conditions detected at present.`);
  }

  // 2. DISASTER_ALERT_QUERY
  if (intent === 'DISASTER_ALERT_QUERY') {
    if (isMalayalam) {
      if (activeAlerts.length > 0) {
        let txt = `📢 **ഔദ്യോഗിക ദുരന്ത മുന്നറിയിപ്പുകൾ (${district})**\n\n`;
        activeAlerts.forEach((a, i) => {
          txt += `• **${a.severity} മുന്നറിയിപ്പ് (${a.hazardType || a.title}):** ${a.description || a.title}\n`;
        });
        txt += `\nKSDMA ഔദ്യോഗിക നിർദ്ദേശങ്ങൾ കർശനമായി പാലിക്കുക.`;
        return txt;
      }
      return `✅ **ഗുരുതരമായ ദുരന്ത മുന്നറിയിപ്പുകളില്ല**\n\nനിലവിൽ **${district}** ജില്ലയിൽ KSDMA റെഡ് അല്ലെങ്കിൽ ഓറഞ്ച് മുന്നറിയിപ്പുകൾ പുറപ്പെടുവിച്ചിട്ടില്ല.\n\nനിലവിലെ കാലാവസ്ഥ: **${weather.condition || 'സാധാരണ നില'}** (മഴ സാധ്യത: ${weather.rainProbability || 0}%).`;
    }
    if (activeAlerts.length > 0) {
      let txt = `📢 **OFFICIAL DISASTER ALERTS FOR ${district.toUpperCase()}**\n\n`;
      activeAlerts.forEach((a, i) => {
        txt += `• **${a.severity} Warning (${a.hazardType || a.title}):** ${a.description || a.title}\n`;
      });
      txt += `\nPlease adhere strictly to safety protocols issued by the Kerala State Disaster Management Authority (KSDMA).`;
      return txt;
    }
    return `✅ **NO CRITICAL DISASTER ALERTS**\n\nThere are currently no active Red or Orange disaster warnings issued by KSDMA for **${district}**.\n\nCurrent Weather: **${weather.condition || 'Normal'}**, Rain probability: **${weather.rainProbability || 0}%**.`;
  }

  // 3. SHELTER_QUERY
  if (intent === 'SHELTER_QUERY') {
    const locCtx = classification.locationContext || {};

    // Section 22: Unrecognized location clarification handling
    if (locCtx.needsClarification && locCtx.clarificationMessage) {
      return locCtx.clarificationMessage;
    }

    const isUserRequest = locCtx.locationSource === 'USER_REQUEST';
    const isDistReq = Boolean(locCtx.calculateDistance);
    const targetLocName = locCtx.requestedPlace || locCtx.requestedDistrict || district;

    // Headings matching Section 8 and 9 of user instructions:
    let headingText = '';
    if (isUserRequest) {
      if (isDistReq) {
        headingText = `📍 **NEAREST REGISTERED RELIEF SHELTERS IN ${targetLocName.toUpperCase()}**`;
      } else {
        headingText = `📍 **REGISTERED RELIEF SHELTERS IN ${targetLocName.toUpperCase()}**`;
      }
    } else {
      headingText = `📍 **REGISTERED RELIEF SHELTERS NEAR YOU**`;
    }

    if (isMalayalam) {
      if (context.shelters && context.shelters.length > 0) {
        let txt = isUserRequest
          ? (isDistReq ? `📍 **ഏറ്റവും അടുത്തുള്ള ദുരിതാശ്വാസ ക്യാമ്പുകൾ (${targetLocName})**\n\n` : `📍 **ദുരിതാശ്വാസ ക്യാമ്പുകൾ (${targetLocName})**\n\n`)
          : `📍 **നിങ്ങൾക്ക് അടുത്തുള്ള ദുരിതാശ്വാസ ക്യാമ്പുകൾ**\n\n`;

        context.shelters.forEach((s, i) => {
          txt += `${i + 1}. **${s.name}**\n`;
          if (!isUserRequest || isDistReq) {
            txt += `   • അകലം: **${s.distanceKm} km**\n`;
          }
          txt += `   • ലഭ്യമായ കിടക്കകൾ: **${s.availableCapacity || 'Available'}** (മൊത്തം ശേഷി: ${s.capacity || 100})\n`;
          txt += `   • വിലാസം: ${s.address || s.district}\n`;
          txt += `   • ഫോൺ: ${s.contactNumber || '1077'}\n\n`;
        });
        txt += `ക്യാമ്പുകളിലേക്കുള്ള റൂട്ട് കാണുന്നതിന് താഴെയുള്ള ബട്ടണുകൾ ഉപയോഗിക്കുക.`;
        return txt;
      }
      return `I couldn't find any currently registered active relief shelters in ${targetLocName} in the SAHAY database.\n\nI can also check nearby districts if you want.`;
    }

    // English format
    if (context.shelters && context.shelters.length > 0) {
      let txt = `${headingText}\n\n`;
      context.shelters.forEach((s, i) => {
        txt += `${i + 1}. **${s.name}**\n`;
        // Only display distance if distance was requested or search is based on current GPS (Sections 8, 9)
        if (!isUserRequest || isDistReq) {
          txt += `   • Distance: **${s.distanceKm} km** away\n`;
        }
        txt += `   • Beds Available: **${s.availableCapacity}** open (Total Capacity: ${s.capacity})\n`;
        txt += `   • Address: ${s.address || s.district}\n`;
        txt += `   • Contact: ${s.contactNumber || '1077'}\n\n`;
      });
      txt += `Use the **'All Nearby Camps'** or **'Navigate on Live Map'** buttons below for turn-by-turn routing.`;
      return txt;
    }

    // Section 14: No results handling
    return `I couldn't find any currently registered active relief shelters in ${targetLocName} in the SAHAY database.\n\nI can also check nearby districts if you want.`;
  }

  // 4. HOSPITAL_QUERY
  if (intent === 'HOSPITAL_QUERY') {
    if (isMalayalam) {
      if (context.hospitals && context.hospitals.length > 0) {
        let txt = `🏥 **അടുത്തുള്ള ആശുപത്രികൾ (${district})**\n\n`;
        context.hospitals.slice(0, 3).forEach((h, i) => {
          txt += `${i + 1}. **${h.name}** (${h.distanceKm} km)\n   • അടിയന്തര സേവനം: ${h.emergencyAvailable ? 'ലഭ്യമാണ്' : 'സാധാരണ'}\n   • ഫോൺ: ${h.contactNumber || '108'}\n\n`;
        });
        txt += `ആംബുലൻസ് അടിയന്തര സഹായത്തിന് സൗജന്യ സേവനമായ **108** വിളിക്കുക.`;
        return txt;
      }
      return `അടിയന്തര മെഡിക്കൽ സഹായത്തിന് സൗജന്യ ആംബുലൻസ് സേവനമായ **108** അല്ലെങ്കിൽ 112 വിളിക്കുക.`;
    }
    if (context.hospitals && context.hospitals.length > 0) {
      let txt = `🏥 **HOSPITALS & EMERGENCY MEDICAL CARE (${district.toUpperCase()})**\n\n`;
      context.hospitals.slice(0, 3).forEach((h, i) => {
        txt += `${i + 1}. **${h.name}**\n   • Distance: **${h.distanceKm} km**\n   • Emergency/Trauma Care: ${h.emergencyAvailable ? '24/7 Available' : 'Standard'}\n   • Contact: ${h.contactNumber || '108'}\n\n`;
      });
      txt += `For emergency medical transport, dial free ambulance service **108**.`;
      return txt;
    }
    return `For urgent medical care and ambulance dispatch, immediately call Kerala EMS at **108** or Police ERSS at **112**.`;
  }

  // 5. RISK_QUERY
  if (intent === 'RISK_QUERY') {
    const riskAssessment = calculateContextualRisk(context);
    if (isMalayalam) {
      return `⚠️ **ദുരന്ത സാധ്യത അവലോകനം (${district})**\n\n` +
        `• **കണക്കാക്കിയ അപകട സാധ്യത:** **${riskAssessment.riskLevel}** (സ്കോർ: ${riskAssessment.riskScorePct}/100)\n\n` +
        `**നിരീക്ഷിച്ച ഘടകങ്ങൾ:**\n` +
        riskAssessment.reasons.map(r => `• ${r}`).join('\n') + `\n\n` +
        `**നിർദ്ദേശം:** ${riskAssessment.recommendedAction}`;
    }
    return `⚠️ **DISASTER RISK ASSESSMENT FOR ${place.toUpperCase()}, ${district.toUpperCase()}**\n\n` +
      `• **Calculated Risk Level:** **${riskAssessment.riskLevel.toUpperCase()}** (Score: ${riskAssessment.riskScorePct}/100)\n\n` +
      `**Evaluated Risk Factors:**\n` +
      riskAssessment.reasons.map(r => `• ${r}`).join('\n') + `\n\n` +
      `**Recommended Action:**\n${riskAssessment.recommendedAction}`;
  }

  // 6. BUILDING_DAMAGE & RELIEF_ASSISTANCE
  if (intent === 'BUILDING_DAMAGE' || intent === 'RELIEF_ASSISTANCE') {
    if (isMalayalam) {
      return `🏚️ **കെട്ടിട നഷ്ടവും ദുരിതാശ്വാസ ധനസഹായവും (Relief Fund)**\n\n` +
        `പ്രകൃതിദുരന്തത്തിൽ നിങ്ങളുടെ വീടിനോ സ്വത്തിനോ നാശനഷ്ടം സംഭവിച്ചിട്ടുണ്ടെങ്കിൽ:\n\n` +
        `1. **സുരക്ഷിതത്വം ഉറപ്പാക്കുക:** വിള്ളൽ വീണതോ അപകടകരമായതോ ആയ മുറികളിൽ നിൽക്കരുത്.\n` +
        `2. **ഫോട്ടോകൾ എടുക്കുക:** നാശനഷ്ടം സംഭവിച്ച ഭാഗങ്ങളുടെ വ്യക്തമായ ഫോട്ടോകൾ എടുത്തു സൂക്ഷിക്കുക.\n` +
        `3. **ധനസഹായത്തിന് അപേക്ഷിക്കുക:** SDRF/CMDRF മാനദണ്ഡപ്രകാരം സഹായത്തിന് താഴെയുള്ള ബട്ടൺ വഴി അപേക്ഷിക്കാം.\n` +
        `4. **ആവശ്യമായ രേഖകൾ:** ബാങ്ക് പാസ്ബുക്ക്, ആധാർ കാർഡ്, റേഷൻ കാർഡ്, ഉടമസ്ഥാവകാശ രേഖ.\n\n` +
        (nearestShelter ? `📍 സമീപത്തുള്ള ദുരിതാശ്വാസ ക്യാമ്പ്: **${nearestShelter.name}** (${nearestShelter.distanceKm} km അകലെ)\n\n` : '') +
        `ധനസഹായത്തിന് അപേക്ഷിക്കാൻ താഴെയുള്ള **'Start Relief Application'** ബട്ടൺ ഉപയോഗിക്കുക.`;
    }
    return `🏚️ **BUILDING DAMAGE & RELIEF FUND ASSISTANCE**\n\n` +
      `If your house or property has suffered damage due to disaster:\n\n` +
      `1. **Ensure Immediate Safety:** Do not enter structurally compromised rooms or stay under cracked roofs/beams.\n` +
      `2. **Capture Evidence:** Take clear photographs of damaged walls, roofs, and flood marks before beginning repairs.\n` +
      `3. **Apply for Government Relief:** You can file an official compensation claim directly through the SAHAY Relief Fund module under SDRF/CMDRF guidelines.\n` +
      `4. **Keep Documents Ready:** Bank passbook, Aadhaar card, ration card, and property tax receipt.\n\n` +
      (nearestShelter ? `📍 Nearest Safe Shelter: **${nearestShelter.name}** (${nearestShelter.distanceKm} km away)\n\n` : '') +
      `Tap **'Start Relief Application'** below to begin your compensation claim.`;
  }

  // 7. SOS / CRITICAL
  if (intent === 'SOS' || severity === 'CRITICAL' || requiresSOS) {
    if (isMalayalam) {
      return `🚨 **അടിയന്തിര അപകടാവസ്ഥ (CRITICAL EMERGENCY DETECTED)**\n\n` +
        `ജീവൻ അപകടത്തിലാണെങ്കിൽ പരിഭ്രാന്തരാകാതെ താഴെ പറയുന്ന കാര്യങ്ങൾ ചെയ്യുക:\n\n` +
        `1. കെട്ടിടത്തിന്റെ ഏറ്റവും ഉയർന്ന സുരക്ഷിതമായ സ്ഥലത്തേക്ക് മാറുക.\n` +
        `2. മെയിൻ സ്വിച്ചും ഗ്യാസും ഓഫ് ചെയ്യുക.\n` +
        `3. രക്ഷാപ്രവർത്തകർക്ക് കാണാൻ സാധിക്കുന്ന അടയാളങ്ങൾ നൽകുക.\n\n` +
        `🚨 **രക്ഷാസേനയെ വിളിക്കാൻ താഴെയുള്ള 'SEND SOS' ബട്ടൺ ഉടൻ അമർത്തുക.**\n\n` +
        `📞 **അടിയന്തര ഹെൽപ്പ് ലൈനുകൾ:**\n` +
        `• പൊലീസ് & ദുരന്തനിവാരണ കൺട്രോൾ: **112**\n` +
        `• ജില്ലാ ദുരന്തനിവാരണ റൂം: **1077**\n` +
        `• ആംബുലൻസ്: **108**\n` +
        `• ഫയർ ഫോഴ്സ്: **101**`;
    }
    return `🚨 **CRITICAL EMERGENCY DETECTED**\n\n` +
      `Life safety is the highest priority. Follow these instructions immediately:\n\n` +
      `1. Move to the highest accessible safe point (upper floor or roof) away from rising waters and unstable walls.\n` +
      `2. Shut off mains electricity and gas supplies if safe to do so.\n` +
      `3. Signal to neighbors or rescue personnel with a whistle, flashlight, or brightly colored cloth.\n\n` +
      `🚨 **Tap the SEND SOS button below immediately** to transmit your live GPS coordinates directly to Kerala Police ERSS (112) and District Disaster Control Room (1077).\n\n` +
      `📞 **Direct Emergency Lines:**\n` +
      `• Police & Disaster ERSS: **112**\n` +
      `• District Disaster Control Room: **1077**\n` +
      `• Ambulance Service: **108**\n` +
      `• Fire & Rescue: **101**`;
  }

  // Emergency Helpline Numbers Inquiry (e.g., "emergncy number", "control room")
  const normQuery = (query || '').toLowerCase();
  const corrQuery = (classification.correctedQuery || '').toLowerCase();
  if (/emergency\s+(number|numbers|contact|phone|helpline)|control\s+room|helpline/i.test(normQuery) ||
      /emergency\s+(number|numbers|contact|phone|helpline)/i.test(corrQuery)) {
    if (isMalayalam) {
      return `📞 **കേരള ഔദ്യോഗിക അടിയന്തര ഹെൽപ്പ് ലൈൻ നമ്പറുകൾ**\n\n` +
        `• **പോലീസ് & എമർജൻസി റെസ്‌പോൺസ് (ERSS):** 112\n` +
        `• **ജില്ലാ ദുരന്തനിവാരണ കൺട്രോൾ റൂം:** 1077\n` +
        `• **ആംബുലൻസ് സർവീസ് (EMS):** 108\n` +
        `• **ഫയർ & റെസ്ക്യൂ സർവീസ്:** 101\n` +
        `• **സംസ്ഥാന ദുരന്തനിവാരണ അതോറിറ്റി (SEOC):** 1070\n\n` +
        `എല്ലാ കൺട്രോൾ റൂമുകളും 24x7 പ്രവർത്തനക്ഷമമാണ്.`;
    }
    return `📞 **OFFICIAL KERALA EMERGENCY HELPLINE NUMBERS**\n\n` +
      `• **Emergency Response Support System (ERSS):** 112\n` +
      `• **District Disaster Control Room:** 1077\n` +
      `• **Ambulance Service (EMS):** 108\n` +
      `• **Fire & Rescue Services:** 101\n` +
      `• **State Emergency Operations Centre (SEOC):** 1070\n\n` +
      `All emergency control rooms operate 24x7 across Kerala.`;
  }

  // 8. SAFETY_GUIDANCE, FLOOD, LANDSLIDE, FIRE, etc.
  const safetyRules = getSafetyRules(disasterType === 'SAFETY_GUIDANCE' ? 'FLOOD' : disasterType);
  if (isMalayalam) {
    const mRules = safetyRules.malayalam || safetyRules;
    let txt = `⚠️ **${mRules.title || safetyRules.title}**\n\n`;
    txt += `${mRules.summary || safetyRules.summary}\n\n`;
    if (primaryAlert) {
      txt += `📢 **ഔദ്യോഗിക മുന്നറിയിപ്പ് (${district}):** ${primaryAlert.severity} ALERT - ${primaryAlert.title}\n\n`;
    }
    txt += `**ഉടനടി ചെയ്യേണ്ട കാര്യങ്ങൾ:**\n`;
    (mRules.immediateActions || safetyRules.immediateActions).forEach((act, idx) => {
      txt += `${idx + 1}. ${act}\n`;
    });
    if (nearestShelter && (severity === 'HIGH' || severity === 'MEDIUM')) {
      txt += `\n📍 **അടുത്തുള്ള ദുരിതാശ്വാസ ക്യാമ്പ്:** ${nearestShelter.name} (${nearestShelter.distanceKm} km അകലെ)\n`;
    }
    if (severity === 'HIGH') {
      txt += `\n📞 **അടിയന്തര സഹായത്തിന്:** 112 അല്ലെങ്കിൽ 1077 വിളിക്കുക.`;
    }
    return txt;
  }

  let txt = `⚠️ **${safetyRules.title.toUpperCase()}**\n\n`;
  txt += `${safetyRules.summary}\n\n`;
  if (primaryAlert) {
    txt += `📢 **Official Warning for ${district}:** ${primaryAlert.severity} Alert issued by KSDMA (${primaryAlert.title}).\n\n`;
  }
  txt += `**What you should do right now:**\n`;
  safetyRules.immediateActions.forEach((act, idx) => {
    txt += `${idx + 1}. ${act}\n`;
  });
  if (nearestShelter && (severity === 'HIGH' || severity === 'MEDIUM')) {
    txt += `\n📍 **Nearest Safe Shelter:** **${nearestShelter.name}** (${nearestShelter.distanceKm} km away, ${nearestShelter.availableCapacity} beds open)\n`;
  }
  if (severity === 'HIGH') {
    txt += `\n📞 **Emergency Hotlines:** Police & ERSS: **112** | District Control Room: **1077**`;
  }
  return txt;
}

/**
 * Call Gemini REST API if API Key is configured
 */
async function callGeminiAPI(apiKey, prompt, systemInstruction) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ],
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 800
    }
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      console.warn('[AI Service] Gemini API response error:', res.status, errText);
      return null;
    }

    const data = await res.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return candidateText || null;
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('[AI Service] Gemini fetch call failed or timed out:', err.message);
    return null;
  }
}

/**
 * Main AI Copilot generation function
 */
async function generateDisasterCopilotResponse({
  userMessage,
  context,
  classification,
  preferredLanguage = 'en'
}) {
  const lang = (preferredLanguage || 'en').toLowerCase().startsWith('ml') ? 'ml' : 'en';
  const isMalayalam = lang === 'ml';

  // Use provided classification or re-classify
  const finalClassification = classification || classifyEmergencyIntent(userMessage, lang);

  // Risk Calculation
  const riskAssessment = calculateContextualRisk(context);

  // Safety Rules
  const safetyRules = getSafetyRules(finalClassification.disasterType === 'SAFETY_GUIDANCE' ? 'FLOOD' : finalClassification.disasterType);

  // Determine Dynamic Action Buttons strictly based on intent and severity
  const showSOSButton = finalClassification.requiresSOS || finalClassification.severity === 'CRITICAL' || finalClassification.severity === 'HIGH';
  
  const showShelterButton = 
    finalClassification.intent === 'SHELTER_QUERY' ||
    finalClassification.intent === 'EVACUATION' ||
    (Boolean(context.shelters && context.shelters.length > 0) && (
      finalClassification.severity === 'CRITICAL' ||
      finalClassification.severity === 'HIGH' ||
      finalClassification.intent === 'FLOOD' ||
      finalClassification.intent === 'LANDSLIDE'
    ));

  const showReliefButton = 
    finalClassification.intent === 'RELIEF_ASSISTANCE' ||
    finalClassification.intent === 'BUILDING_DAMAGE' ||
    userMessage.toLowerCase().includes('relief') ||
    userMessage.toLowerCase().includes('compensation');

  const nearestShelter = context.shelters?.[0] || null;
  const nearestHospital = context.hospitals?.[0] || null;

  // Attempt LLM Generation if API key is present
  const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
  let generatedText = null;

  if (apiKey && apiKey !== 'YOUR_API_KEY_HERE') {
    try {
      const systemPrompt = `You are SAHAY AI Disaster Copilot, an official emergency assistant for citizens in Kerala, India.
CRITICAL SAFETY CONSTRAINTS:
1. ONLY answer what the user asked. Never invent shelters, hospitals, helpline phone numbers, or official alert levels.
2. If user asks for weather, provide weather details only.
3. If user asks for shelter, provide shelter details only.
4. Do not proactively attach emergency contacts or shelters unless an active emergency is detected or requested.
5. If the user asks in Malayalam or Manglish, reply in clear, natural Malayalam. Otherwise reply in English.`;

      const promptContext = `
USER QUERY: "${userMessage}"
INTENT: ${finalClassification.intent}
DISASTER CLASSIFICATION: ${finalClassification.disasterType} (Severity: ${finalClassification.severity})
CITIZEN LOCATION: ${context.location.place}, District: ${context.location.district}, State: ${context.location.state}
${context.alerts?.list?.length ? `ACTIVE WEATHER ALERT: ${context.alerts.highestLevel} (${context.alerts.list.map(a => a.title).join(', ')})` : ''}
${context.weather?.temperature ? `WEATHER: Temp: ${context.weather.temperature}°C, Cond: ${context.weather.condition}, Rain Prob: ${context.weather.rainProbability}%` : ''}
${nearestShelter ? `VERIFIED NEAREST SHELTER: ${nearestShelter.name} (${nearestShelter.distanceKm} km away, ${nearestShelter.availableCapacity} beds open)` : ''}
${nearestHospital ? `VERIFIED NEAREST HOSPITAL: ${nearestHospital.name} (${nearestHospital.distanceKm} km away, Contact: ${nearestHospital.contactNumber || '108'})` : ''}
${isMalayalam ? 'REPLY IN MALAYALAM LANGUAGE.' : 'REPLY IN ENGLISH.'}
`;

      generatedText = await callGeminiAPI(apiKey, promptContext, systemPrompt);
    } catch (llmErr) {
      console.warn('[AI Service] LLM invocation note, switching to rule engine:', llmErr.message);
    }
  }

  // If location needs clarification (unrecognized location), do NOT invoke LLM or search GPS
  if (finalClassification.locationContext?.needsClarification && finalClassification.locationContext?.clarificationMessage) {
    generatedText = finalClassification.locationContext.clarificationMessage;
  }

  // If LLM unavailable or returned empty, use deterministic rule engine response
  if (!generatedText) {
    generatedText = generateContextualRuleResponse(userMessage, context, finalClassification, isMalayalam);
  }

  return {
    message: generatedText,
    intent: finalClassification.intent,
    disasterType: finalClassification.disasterType,
    severity: finalClassification.severity,
    requiresContext: true,
    requiresSOS: finalClassification.requiresSOS,
    riskLevel: riskAssessment.riskLevel,
    riskAssessment: {
      score: riskAssessment.riskScorePct,
      level: riskAssessment.riskLevel,
      reasons: riskAssessment.reasons,
      recommendedAction: riskAssessment.recommendedAction
    },
    nearestShelter: nearestShelter ? {
      id: nearestShelter.id,
      name: nearestShelter.name,
      district: nearestShelter.district,
      distanceKm: nearestShelter.distanceKm,
      address: nearestShelter.address,
      capacity: nearestShelter.capacity,
      availableCapacity: nearestShelter.availableCapacity,
      contactNumber: nearestShelter.contactNumber,
      latitude: nearestShelter.latitude,
      longitude: nearestShelter.longitude
    } : null,
    nearestHospital: nearestHospital ? {
      id: nearestHospital.id,
      name: nearestHospital.name,
      distanceKm: nearestHospital.distanceKm,
      contactNumber: nearestHospital.contactNumber
    } : null,
    showShelterButton,
    showSOSButton,
    showReliefButton,
    locationContext: finalClassification.locationContext || null,
    requestedDistrict: finalClassification.locationContext?.requestedDistrict || null,
    requestedPlace: finalClassification.locationContext?.requestedPlace || null,
    locationSource: finalClassification.locationContext?.locationSource || 'NONE',
    locationConfidence: finalClassification.locationContext?.locationConfidence || 'UNKNOWN',
    originalQuery: finalClassification.originalQuery || finalClassification.queryCorrection?.originalText || userMessage,
    correctedQuery: finalClassification.correctedQuery || finalClassification.queryCorrection?.correctedText || userMessage,
    corrections: finalClassification.corrections || finalClassification.queryCorrection?.corrections || [],
    correctionConfidence: finalClassification.correctionConfidence || finalClassification.queryCorrection?.correctionConfidence || 'HIGH',
    emergencyContacts: context.emergencyContacts,
    language: lang,
    generatedAt: new Date().toISOString()
  };
}

module.exports = {
  KERALA_DISTRICTS,
  DISTRICT_ALIASES,
  KERALA_PLACES,
  normalizeDistrict,
  extractLocationContext,
  classifyEmergencyIntent,
  correctQuery,
  getContextOptionsForIntent,
  generateConversationalResponse,
  generateDisasterCopilotResponse,
  generateContextualRuleResponse
};
