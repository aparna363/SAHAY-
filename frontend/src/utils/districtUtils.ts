/**
 * District Normalization and Spatial Helpers for SAHAY Kerala Alert System
 */

// Standard list of 14 Kerala Districts in canonical casing
export const KERALA_DISTRICTS_LIST = [
  'Thiruvananthapuram',
  'Kollam',
  'Pathanamthitta',
  'Alappuzha',
  'Kottayam',
  'Idukki',
  'Ernakulam',
  'Thrissur',
  'Palakkad',
  'Malappuram',
  'Kozhikode',
  'Wayanad',
  'Kannur',
  'Kasaragod',
] as const;

export type KeralaDistrict = typeof KERALA_DISTRICTS_LIST[number];

/**
 * Normalizes district names from any case/variant to official canonical name
 * Examples:
 *   "Idukki District" -> "Idukki"
 *   "trivandrum" -> "Thiruvananthapuram"
 *   "CALICUT" -> "Kozhikode"
 */
export function cleanDistrictName(rawDistrict?: string | null): string {
  if (!rawDistrict) return '';

  const cleaned = String(rawDistrict)
    .trim()
    .toLowerCase()
    .replace(/\s+district$/i, '')
    .replace(/[^a-z0-9]/g, '');

  const districtAliasMap: Record<string, string> = {
    thiruvananthapuram: 'Thiruvananthapuram',
    trivandrum: 'Thiruvananthapuram',
    tvm: 'Thiruvananthapuram',

    kollam: 'Kollam',
    quilon: 'Kollam',
    klm: 'Kollam',

    pathanamthitta: 'Pathanamthitta',
    pta: 'Pathanamthitta',

    alappuzha: 'Alappuzha',
    alleppey: 'Alappuzha',
    alp: 'Alappuzha',

    kottayam: 'Kottayam',
    ktm: 'Kottayam',

    idukki: 'Idukki',
    idk: 'Idukki',

    ernakulam: 'Ernakulam',
    cochin: 'Ernakulam',
    kochi: 'Ernakulam',
    ekm: 'Ernakulam',

    thrissur: 'Thrissur',
    trichur: 'Thrissur',
    tcr: 'Thrissur',

    palakkad: 'Palakkad',
    palghat: 'Palakkad',
    pkd: 'Palakkad',

    malappuram: 'Malappuram',
    mlp: 'Malappuram',

    kozhikode: 'Kozhikode',
    calicut: 'Kozhikode',
    kkd: 'Kozhikode',

    wayanad: 'Wayanad',
    wynaad: 'Wayanad',
    wyd: 'Wayanad',

    kannur: 'Kannur',
    cannanore: 'Kannur',
    knr: 'Kannur',

    kasaragod: 'Kasaragod',
    kasargod: 'Kasaragod',
    ksd: 'Kasaragod',
  };

  return districtAliasMap[cleaned] || (rawDistrict.charAt(0).toUpperCase() + rawDistrict.slice(1));
}

// Approximate center lat/lon for all 14 districts
export const DISTRICT_CENTERS: Record<string, { lat: number; lng: number }> = {
  Thiruvananthapuram: { lat: 8.5241, lng: 76.9366 },
  Kollam: { lat: 8.8932, lng: 76.6141 },
  Pathanamthitta: { lat: 9.2648, lng: 76.7870 },
  Alappuzha: { lat: 9.4981, lng: 76.3388 },
  Kottayam: { lat: 9.5916, lng: 76.5222 },
  Idukki: { lat: 9.8497, lng: 76.9804 },
  Ernakulam: { lat: 9.9816, lng: 76.2999 },
  Thrissur: { lat: 10.5276, lng: 76.2144 },
  Palakkad: { lat: 10.7867, lng: 76.6548 },
  Malappuram: { lat: 11.0720, lng: 76.0740 },
  Kozhikode: { lat: 11.2588, lng: 75.7804 },
  Wayanad: { lat: 11.6854, lng: 76.1320 },
  Kannur: { lat: 11.8745, lng: 75.3704 },
  Kasaragod: { lat: 12.5102, lng: 74.9852 },
};

/**
 * Returns color hex code for alert levels
 */
export function getAlertColorHex(alertLevel?: string | null): string {
  switch (String(alertLevel).toUpperCase()) {
    case 'RED':
      return '#dc2626'; // RED: Critical / Severe risk
    case 'ORANGE':
      return '#f97316'; // ORANGE: Warning / High risk
    case 'YELLOW':
      return '#facc15'; // YELLOW: Watch / Moderate risk
    case 'GREEN':
    default:
      return '#16a34a'; // GREEN: Safe / Low to moderate risk
  }
}
