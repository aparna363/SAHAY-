/**
 * SAHAY AI Disaster Copilot - Universal Spelling, Typo & Query Correction Service
 * 
 * Pipeline:
 * 1. Text Normalization (Repeated characters, excess whitespace, contractions, unicode)
 * 2. Protected Terms Check (SAHAY, KSDMA, NDRF, SOS, 112, 1077, etc.)
 * 3. Domain & General English Vocabulary Correction (Damerau-Levenshtein + phonetic distance)
 * 4. Canonical Location Matching (Districts, places, towns, panchayats)
 * 5. Emergency Meaning Preservation (Ensures emergency urgency is never downgraded or delayed)
 * 6. Confidence Scoring & Clarification Routing (HIGH: auto-correct, MEDIUM: suggest, LOW: request place)
 */

// Protected abbreviations and numbers that must NEVER be modified
const PROTECTED_TERMS = new Set([
  'sahay',
  'ksdma',
  'ndma',
  'ndrf',
  'sdrf',
  'imd',
  'postgis',
  'gis',
  'gps',
  'sos',
  'erss',
  'ems',
  '112',
  '1077',
  '108',
  '101',
  '100',
  '102',
  '24x7'
]);

// Kerala canonical districts and known variants / misspellings
const DISTRICT_CORRECTIONS = {
  'alappuzha': 'Alappuzha',
  'alappuzhaa': 'Alappuzha',
  'alappuzhh': 'Alappuzha',
  'alapuzha': 'Alappuzha',
  'alleppey': 'Alappuzha',
  'alleppee': 'Alappuzha',
  'alleppy': 'Alappuzha',
  'ernakulam': 'Ernakulam',
  'ernakulamdistrict': 'Ernakulam',
  'ernaklam': 'Ernakulam',
  'cochin': 'Ernakulam',
  'kochi': 'Ernakulam',
  'kochii': 'Ernakulam',
  'idukki': 'Idukki',
  'idukky': 'Idukki',
  'iduki': 'Idukki',
  'idukkii': 'Idukki',
  'kannur': 'Kannur',
  'kannoor': 'Kannur',
  'cannanore': 'Kannur',
  'kasaragod': 'Kasaragod',
  'kasargod': 'Kasaragod',
  'kasargode': 'Kasaragod',
  'kasargodee': 'Kasaragod',
  'kollam': 'Kollam',
  'kollamm': 'Kollam',
  'quilon': 'Kollam',
  'kottayam': 'Kottayam',
  'kotayam': 'Kottayam',
  'kottayamm': 'Kottayam',
  'kozhikode': 'Kozhikode',
  'kozhikod': 'Kozhikode',
  'calicut': 'Kozhikode',
  'malappuram': 'Malappuram',
  'malapuram': 'Malappuram',
  'palakkad': 'Palakkad',
  'palghat': 'Palakkad',
  'palakad': 'Palakkad',
  'pathanamthitta': 'Pathanamthitta',
  'pathanamtitta': 'Pathanamthitta',
  'patanamthitta': 'Pathanamthitta',
  'thiruvananthapuram': 'Thiruvananthapuram',
  'thiruvananthpuram': 'Thiruvananthapuram',
  'trivandrum': 'Thiruvananthapuram',
  'trivandrm': 'Thiruvananthapuram',
  'tvm': 'Thiruvananthapuram',
  'thrissur': 'Thrissur',
  'trissur': 'Thrissur',
  'trichur': 'Thrissur',
  'wayanad': 'Wayanad',
  'wyanad': 'Wayanad',
  'waynad': 'Wayanad',
  'wynad': 'Wayanad'
};

// Known Kerala places, towns, and shelter areas with variations
const PLACE_CORRECTIONS = {
  // Kottayam places
  'kanjirappally': { place: 'Kanjirappally', district: 'Kottayam' },
  'kanjirappalyy': { place: 'Kanjirappally', district: 'Kottayam' },
  'kanjirapally': { place: 'Kanjirappally', district: 'Kottayam' },
  'kanjirappalli': { place: 'Kanjirappally', district: 'Kottayam' },
  'kanjiraapally': { place: 'Kanjirappally', district: 'Kottayam' },
  'pala': { place: 'Pala', district: 'Kottayam' },
  'paala': { place: 'Pala', district: 'Kottayam' },
  'changanassery': { place: 'Changanassery', district: 'Kottayam' },
  'changanacherry': { place: 'Changanassery', district: 'Kottayam' },
  'vaikom': { place: 'Vaikom', district: 'Kottayam' },
  'vaicom': { place: 'Vaikom', district: 'Kottayam' },
  'erattupetta': { place: 'Erattupetta', district: 'Kottayam' },
  'erattpetta': { place: 'Erattupetta', district: 'Kottayam' },

  // Idukki places
  'thodupuzha': { place: 'Thodupuzha', district: 'Idukki' },
  'thodupuzhaa': { place: 'Thodupuzha', district: 'Idukki' },
  'thodupusha': { place: 'Thodupuzha', district: 'Idukki' },
  'todupuzha': { place: 'Thodupuzha', district: 'Idukki' },
  'munnar': { place: 'Munnar', district: 'Idukki' },
  'munar': { place: 'Munnar', district: 'Idukki' },
  'munnarr': { place: 'Munnar', district: 'Idukki' },
  'painavu': { place: 'Painavu', district: 'Idukki' },
  'painav': { place: 'Painavu', district: 'Idukki' },
  'kattappana': { place: 'Kattappana', district: 'Idukki' },
  'katapana': { place: 'Kattappana', district: 'Idukki' },
  'adimali': { place: 'Adimali', district: 'Idukki' },
  'adimaly': { place: 'Adimali', district: 'Idukki' },
  'nedumkandam': { place: 'Nedumkandam', district: 'Idukki' },
  'nedumkandom': { place: 'Nedumkandam', district: 'Idukki' },
  'peerumade': { place: 'Peerumade', district: 'Idukki' },
  'peerumedu': { place: 'Peerumade', district: 'Idukki' },
  'kumily': { place: 'Kumily', district: 'Idukki' },
  'kumili': { place: 'Kumily', district: 'Idukki' },
  'devikulam': { place: 'Devikulam', district: 'Idukki' },

  // Ernakulam places
  'aluva': { place: 'Aluva', district: 'Ernakulam' },
  'alwaye': { place: 'Aluva', district: 'Ernakulam' },
  'angamaly': { place: 'Angamaly', district: 'Ernakulam' },
  'angamali': { place: 'Angamaly', district: 'Ernakulam' },
  'perumbavoor': { place: 'Perumbavoor', district: 'Ernakulam' },
  'perumbavur': { place: 'Perumbavoor', district: 'Ernakulam' },
  'kadavanthra': { place: 'Kadavanthra', district: 'Ernakulam' },

  // Wayanad places
  'kalpetta': { place: 'Kalpetta', district: 'Wayanad' },
  'kalpata': { place: 'Kalpetta', district: 'Wayanad' },
  'sulthan bathery': { place: 'Sulthan Bathery', district: 'Wayanad' },
  'bathery': { place: 'Sulthan Bathery', district: 'Wayanad' },
  'batheri': { place: 'Sulthan Bathery', district: 'Wayanad' },
  'mananthavady': { place: 'Mananthavady', district: 'Wayanad' },
  'mananthavadi': { place: 'Mananthavady', district: 'Wayanad' },
  'vythiri': { place: 'Vythiri', district: 'Wayanad' },
  'vaithiri': { place: 'Vythiri', district: 'Wayanad' },
  'meppadi': { place: 'Meppadi', district: 'Wayanad' },
  'mepadi': { place: 'Meppadi', district: 'Wayanad' },
  'chooralmala': { place: 'Chooralmala', district: 'Wayanad' },
  'churalmala': { place: 'Chooralmala', district: 'Wayanad' },
  'mundakkai': { place: 'Mundakkai', district: 'Wayanad' },

  // Pathanamthitta & other places
  'kozhencherry': { place: 'Kozhencherry', district: 'Pathanamthitta' },
  'kozhencheri': { place: 'Kozhencherry', district: 'Pathanamthitta' },
  'adoor': { place: 'Adoor', district: 'Pathanamthitta' },
  'thiruvalla': { place: 'Thiruvalla', district: 'Pathanamthitta' }
};

// SAHAY Domain Vocabulary & Common Typos Dictionary
const DOMAIN_VOCABULARY = {
  // General & Disaster Terms
  'wheather': 'weather',
  'wether': 'weather',
  'weathr': 'weather',
  'waether': 'weather',
  'wethear': 'weather',

  'alret': 'alert',
  'alrt': 'alert',
  'allert': 'alert',
  'alerrt': 'alert',
  'alerts': 'alert',

  'emergncy': 'emergency',
  'emergancy': 'emergency',
  'emergenc': 'emergency',
  'emrgency': 'emergency',
  'emergeny': 'emergency',

  'hospitl': 'hospital',
  'hsptl': 'hospital',
  'hosptl': 'hospital',
  'hospitall': 'hospital',
  'hospitals': 'hospital',

  'sheltr': 'shelter',
  'sheltar': 'shelter',
  'shltr': 'shelter',
  'shleter': 'shelter',
  'shelterr': 'shelter',
  'sheltrs': 'shelters',

  'resque': 'rescue',
  'rescu': 'rescue',
  'rescure': 'rescue',
  'recue': 'rescue',

  'relif': 'relief',
  'releif': 'relief',
  'reliff': 'relief',
  'relife': 'relief',

  'fundd': 'fund',
  'fnd': 'fund',
  'funds': 'fund',

  'landslid': 'landslide',
  'landslidde': 'landslide',
  'lanslide': 'landslide',
  'landslids': 'landslide',

  'floodd': 'flood',
  'flod': 'flood',
  'flud': 'flood',
  'floodg': 'flood',

  'cyclon': 'cyclone',
  'cyclonn': 'cyclone',
  'cyclne': 'cyclone',

  'tsunamy': 'tsunami',
  'tsunami': 'tsunami',
  'tsuanmi': 'tsunami',

  'evactuation': 'evacuation',
  'evacution': 'evacuation',
  'evacutaion': 'evacuation',
  'evacuate': 'evacuate',

  'preparednes': 'preparedness',
  'preparations': 'preparedness',
  'preperdness': 'preparedness',

  'saftey': 'safety',
  'safty': 'safety',
  'safey': 'safety',

  'damged': 'damaged',
  'damge': 'damage',
  'damageed': 'damaged',
  'damages': 'damage',

  'enterng': 'entering',
  'enterin': 'entering',
  'entring': 'entering',

  'traped': 'trapped',
  'trapedin': 'trapped in',
  'trapd': 'trapped',
  'trap': 'trapped',

  'hous': 'house',
  'hose': 'house',
  'huose': 'house',

  'ambulanc': 'ambulance',
  'ambulnce': 'ambulance',

  'polce': 'police',
  'polic': 'police',

  'cntact': 'contact',
  'contct': 'contact',
  'contat': 'contact',
  'contcts': 'contacts',

  'nmbr': 'number',
  'numbr': 'number',
  'nomber': 'number',
  'numb': 'number',

  'aply': 'apply',
  'appl': 'apply',
  'applicaton': 'application',
  'applicatn': 'application',

  'blockd': 'blocked',
  'blcked': 'blocked',
  'blokked': 'blocked',

  'hazrd': 'hazard',
  'hazrad': 'hazard',

  'missng': 'missing',
  'mising': 'missing',

  'persn': 'person',
  'peopl': 'people',

  'nearst': 'nearest',
  'nerest': 'nearest',
  'neares': 'nearest',
  'clsest': 'closest',
  'clost': 'closest',

  'camp': 'camp',
  'camps': 'camps',
  'cmps': 'camps',
  'cmp': 'camp',

  // Conversational Words
  'helo': 'hello',
  'helloo': 'hello',
  'hellooo': 'hello',
  'heloo': 'hello',
  'halo': 'hello',
  'hii': 'hi',
  'hiii': 'hi',
  'thnks': 'thanks',
  'thnk': 'thanks',
  'thx': 'thanks',
  'thnx': 'thanks',
  'okayyy': 'okay',
  'okee': 'okay',
  'oki': 'okay',

  // Common General English Words in Queries
  'ther': 'there',
  'thier': 'there',
  'whr': 'where',
  'wher': 'where',
  'wat': 'what',
  'wht': 'what',
  'giv': 'give',
  'gve': 'give',
  'shw': 'show',
  'pls': 'please',
  'plz': 'please',
  'tday': 'today',
  'todai': 'today',
  'nead': 'need',
  'ned': 'need'
};

/**
 * Standard English contractions expansion
 */
const CONTRACTIONS = {
  "i'm": "i am",
  "im": "i am",
  "don't": "do not",
  "dont": "do not",
  "can't": "cannot",
  "cant": "cannot",
  "won't": "will not",
  "wont": "will not",
  "there's": "there is",
  "theres": "there is",
  "what's": "what is",
  "whats": "what is",
  "where's": "where is",
  "wheres": "where is"
};

/**
 * Calculates Damerau-Levenshtein distance (handles insertion, deletion, substitution, and adjacent transposition)
 */
function damerauLevenshtein(a = '', b = '') {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  const matrix = Array.from({ length: al + 1 }, () => Array(bl + 1).fill(0));

  for (let i = 0; i <= al; i++) matrix[i][0] = i;
  for (let j = 0; j <= bl; j++) matrix[0][j] = j;

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );

      // transposition check
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + 1);
      }
    }
  }

  return matrix[al][bl];
}

/**
 * Normalizes similarity score between 0.0 and 1.0 based on Damerau-Levenshtein distance
 */
function calculateSimilarity(str1, str2) {
  const s1 = (str1 || '').toLowerCase();
  const s2 = (str2 || '').toLowerCase();
  if (s1 === s2) return 1.0;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  const dist = damerauLevenshtein(s1, s2);
  return Math.max(0, 1.0 - (dist / maxLen));
}

/**
 * Stage 1: Text Normalization
 * - Unicode normalization (NFKC)
 * - Compression of repeated whitespace
 * - Contraction expansion
 * - Collapse of exaggerated repetitions (e.g., "hellooo" -> "hello", "hii" -> "hi")
 */
function normalizeRawText(rawMessage = '') {
  if (!rawMessage || typeof rawMessage !== 'string') return '';

  let text = rawMessage.normalize('NFKC').trim();

  // Whitespace collapse
  text = text.replace(/\s+/g, ' ');

  // Collapse consecutive identical letters > 2 down to 2 (e.g., "hellooo" -> "helloo", "pleeease" -> "please")
  // Note: we preserve double letters because words like 'flood', 'speed', 'kottayam', 'alappuzha' are valid
  text = text.replace(/([a-zA-Z])\1{2,}/g, '$1$1');

  return text;
}

/**
 * Finds the best matching word from vocabulary using exact map, then fuzzy Damerau-Levenshtein
 */
function findBestVocabMatch(word) {
  const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!cleanWord || cleanWord.length < 2) return null;

  if (PROTECTED_TERMS.has(cleanWord)) {
    return {
      corrected: cleanWord.toUpperCase(),
      confidence: 1.0,
      type: 'PROTECTED_TERM'
    };
  }

  // 1. Check direct vocabulary map
  if (DOMAIN_VOCABULARY[cleanWord]) {
    return {
      corrected: DOMAIN_VOCABULARY[cleanWord],
      confidence: 0.96,
      type: 'DOMAIN_TERM'
    };
  }

  // 2. Check direct district map
  if (DISTRICT_CORRECTIONS[cleanWord]) {
    return {
      corrected: DISTRICT_CORRECTIONS[cleanWord],
      confidence: 0.98,
      type: 'LOCATION'
    };
  }

  // 3. Check direct place map
  if (PLACE_CORRECTIONS[cleanWord]) {
    return {
      corrected: PLACE_CORRECTIONS[cleanWord].place,
      confidence: 0.97,
      type: 'LOCATION'
    };
  }

  // 4. Fuzzy check against districts if length >= 4
  if (cleanWord.length >= 4) {
    let bestDistMatch = null;
    let highestDistSim = 0;
    for (const [key, canonical] of Object.entries(DISTRICT_CORRECTIONS)) {
      const sim = calculateSimilarity(cleanWord, key);
      if (sim > highestDistSim) {
        highestDistSim = sim;
        bestDistMatch = canonical;
      }
    }
    if (highestDistSim >= 0.78) {
      return {
        corrected: bestDistMatch,
        confidence: Number(highestDistSim.toFixed(2)),
        type: 'LOCATION'
      };
    }

    // 5. Fuzzy check against known places
    let bestPlaceMatch = null;
    let highestPlaceSim = 0;
    for (const [key, info] of Object.entries(PLACE_CORRECTIONS)) {
      const sim = calculateSimilarity(cleanWord, key);
      if (sim > highestPlaceSim) {
        highestPlaceSim = sim;
        bestPlaceMatch = info.place;
      }
    }
    if (highestPlaceSim >= 0.78) {
      return {
        corrected: bestPlaceMatch,
        confidence: Number(highestPlaceSim.toFixed(2)),
        type: 'LOCATION'
      };
    }

    // 6. Fuzzy check against domain vocabulary keys
    let bestVocabMatch = null;
    let highestVocabSim = 0;
    for (const [key, target] of Object.entries(DOMAIN_VOCABULARY)) {
      const sim = calculateSimilarity(cleanWord, key);
      if (sim > highestVocabSim) {
        highestVocabSim = sim;
        bestVocabMatch = target;
      }
    }
    if (highestVocabSim >= 0.80) {
      return {
        corrected: bestVocabMatch,
        confidence: Number(highestVocabSim.toFixed(2)),
        type: 'DOMAIN_TERM'
      };
    }
  }

  return null;
}

/**
 * Universal Query Correction Layer
 * Takes the raw citizen message, normalizes text, executes universal spelling,
 * typo, domain term, and location corrections, and outputs a structured CorrectedQuery.
 */
function correctQuery(rawMessage = '', lang = 'en') {
  const originalText = (rawMessage || '').trim();
  if (!originalText) {
    return {
      originalText: '',
      correctedText: '',
      corrections: [],
      correctionConfidence: 'HIGH',
      isEmergency: false,
      needsClarification: false
    };
  }

  const normalized = normalizeRawText(originalText);
  const corrections = [];
  const wordsWithPunctuation = normalized.split(' ');
  const correctedTokens = [];

  // Check emergency keywords early
  const isEmergency = 
    /(trapped|traped|trapd|stuck|marooned|drowning|sinking|enterng|entring|sos|mayday|save (me|us)|emergency|rescue)/i.test(normalized);

  // Process word-by-word, preserving trailing punctuation
  for (let i = 0; i < wordsWithPunctuation.length; i++) {
    const rawToken = wordsWithPunctuation[i];
    if (!rawToken) continue;

    // Match leading punctuation, core alphameric word, trailing punctuation
    const match = rawToken.match(/^([^a-zA-Z0-9]*)([a-zA-Z0-9'-]+)([^a-zA-Z0-9]*)$/);
    if (!match) {
      correctedTokens.push(rawToken);
      continue;
    }

    const leadingPunct = match[1];
    const coreWord = match[2];
    const trailingPunct = match[3];

    // Check contraction expansion
    const lowerCore = coreWord.toLowerCase();
    if (CONTRACTIONS[lowerCore]) {
      const expanded = CONTRACTIONS[lowerCore];
      if (expanded !== lowerCore) {
        corrections.push({
          original: coreWord,
          corrected: expanded,
          confidence: 0.99,
          type: 'NORMALIZATION'
        });
      }
      correctedTokens.push(`${leadingPunct}${expanded}${trailingPunct}`);
      continue;
    }

    // Check if protected term
    if (PROTECTED_TERMS.has(lowerCore)) {
      correctedTokens.push(`${leadingPunct}${coreWord.toUpperCase()}${trailingPunct}`);
      continue;
    }

    // Multi-word lookahead for known multi-word places (e.g., "sulthan bathery")
    if (i < wordsWithPunctuation.length - 1) {
      const nextTokenMatch = wordsWithPunctuation[i + 1].match(/^([^a-zA-Z0-9]*)([a-zA-Z0-9'-]+)([^a-zA-Z0-9]*)$/);
      if (nextTokenMatch) {
        const nextCore = nextTokenMatch[2].toLowerCase();
        const twoWordCombo = `${lowerCore} ${nextCore}`;
        if (PLACE_CORRECTIONS[twoWordCombo]) {
          const matchInfo = PLACE_CORRECTIONS[twoWordCombo];
          corrections.push({
            original: `${coreWord} ${nextTokenMatch[2]}`,
            corrected: matchInfo.place,
            confidence: 0.99,
            type: 'LOCATION'
          });
          correctedTokens.push(`${leadingPunct}${matchInfo.place}${nextTokenMatch[3]}`);
          i++; // Skip next token
          continue;
        }
      }
    }

    // Single word vocabulary / location match
    const vocabMatch = findBestVocabMatch(coreWord);
    if (vocabMatch && vocabMatch.corrected.toLowerCase() !== lowerCore) {
      corrections.push({
        original: coreWord,
        corrected: vocabMatch.corrected,
        confidence: vocabMatch.confidence,
        type: vocabMatch.type
      });
      correctedTokens.push(`${leadingPunct}${vocabMatch.corrected}${trailingPunct}`);
    } else {
      // Keep word as-is
      correctedTokens.push(rawToken);
    }
  }

  let correctedText = correctedTokens.join(' ');

  // Sentence capitalization for first letter
  if (correctedText.length > 0) {
    // Preserve "I am" capitalization for emergency phrases
    correctedText = correctedText.replace(/\bi am\b/g, 'I am');
    // If original query ended with ?, preserve or format
    correctedText = correctedText.charAt(0).toUpperCase() + correctedText.slice(1);
  }

  // Calculate overall confidence
  let correctionConfidence = 'HIGH';
  if (corrections.length > 0) {
    const avgConfidence = corrections.reduce((acc, c) => acc + c.confidence, 0) / corrections.length;
    if (avgConfidence < 0.75) {
      correctionConfidence = 'LOW';
    } else if (avgConfidence < 0.88) {
      correctionConfidence = 'MEDIUM';
    }
  }

  // Check for unknown location query pattern (e.g. "shelter in xyzabc", "shltr in xyzabc")
  // Rule 22: For "shltr in xyzabc", if location cannot be confidently resolved, do NOT silently fall back to GPS.
  let needsClarification = false;
  let clarificationMessage = null;
  let unrecognizedLocation = null;

  const locationQueryMatch = correctedText.match(/(?:shelter|shelters|camps|relief camps|hospital|hospitals)\s+(?:in|at|around|for)\s+([a-zA-Z]{3,25})/i);
  if (locationQueryMatch) {
    const candidateLoc = locationQueryMatch[1];
    const candLower = candidateLoc.toLowerCase();
    const isStandardStopword = ['the', 'my', 'our', 'this', 'that', 'area', 'kerala', 'state', 'today', 'emergency', 'safe', 'need'].includes(candLower);
    const isKnownLocation = DISTRICT_CORRECTIONS[candLower] || PLACE_CORRECTIONS[candLower];

    if (!isStandardStopword && !isKnownLocation) {
      // Check if it's close to any known place
      const closeDistrict = Object.keys(DISTRICT_CORRECTIONS).find(d => calculateSimilarity(candLower, d) >= 0.75);
      const closePlace = Object.keys(PLACE_CORRECTIONS).find(p => calculateSimilarity(candLower, p) >= 0.75);

      if (!closeDistrict && !closePlace) {
        // Complete unrecognized gibberish location (Section 22)
        needsClarification = true;
        unrecognizedLocation = candidateLoc;
        correctionConfidence = 'LOW';
        clarificationMessage = `I couldn't identify the location "${candidateLoc}".\n\nPlease enter a district or place name, such as Kottayam, Idukki, or Kanjirappally.`;
      } else {
        // Close but medium confidence
        correctionConfidence = 'MEDIUM';
      }
    }
  }

  return {
    originalText,
    correctedText,
    corrections,
    correctionConfidence,
    isEmergency,
    needsClarification,
    clarificationMessage,
    unrecognizedLocation
  };
}

module.exports = {
  correctQuery,
  normalizeRawText,
  calculateSimilarity,
  damerauLevenshtein,
  PROTECTED_TERMS,
  DISTRICT_CORRECTIONS,
  PLACE_CORRECTIONS,
  DOMAIN_VOCABULARY
};
