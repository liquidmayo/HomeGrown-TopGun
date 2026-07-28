/**
 * SAM and AAA type database.
 *
 * Reference: SAM Data Table (PAC), Rules 14.0, 15.0
 */

export interface SAMType {
  id: string;
  name: string;
  side: 'nato' | 'wp';
  acquisitionRange: number;
  attackRange: number;
  minRange: number;
  shots: number;
  targetProfile: 'A' | 'B' | 'C' | 'D';
  isMobile: boolean;
  isIR: boolean;
  isPhasedArray: boolean;
  hasLOAL: boolean;
  hasAntiRadar: boolean;
  hasEOTracking: boolean;
  canEngageDeck: boolean;       // Can engage targets at Deck
  canEngageHelicopters: boolean;
  altitudeMax: 'high' | 'veryHigh' | null; // Max altitude it can engage
}

const SAM_DB: Record<string, SAMType> = {};
function reg(s: SAMType) { SAM_DB[s.id] = s; }

// ── NATO SAMs ────────────────────────────────────────────────────

reg({
  id: 'HAWK_C', name: 'HAWK C (MIM-23B)', side: 'nato',
  acquisitionRange: 15, attackRange: 12, minRange: 1, shots: 9,
  targetProfile: 'C', isMobile: false, isIR: false, isPhasedArray: false,
  hasLOAL: false, hasAntiRadar: false, hasEOTracking: true,
  canEngageDeck: true, canEngageHelicopters: false, altitudeMax: 'high',
});

reg({
  id: 'HAWK_D', name: 'HAWK D (MIM-23B Imp.)', side: 'nato',
  acquisitionRange: 18, attackRange: 14, minRange: 1, shots: 9,
  targetProfile: 'C', isMobile: false, isIR: false, isPhasedArray: false,
  hasLOAL: false, hasAntiRadar: false, hasEOTracking: true,
  canEngageDeck: true, canEngageHelicopters: false, altitudeMax: 'high',
});

reg({
  id: 'Patriot', name: 'Patriot (MIM-104)', side: 'nato',
  acquisitionRange: 25, attackRange: 20, minRange: 2, shots: 8,
  targetProfile: 'B', isMobile: false, isIR: false, isPhasedArray: true,
  hasLOAL: false, hasAntiRadar: false, hasEOTracking: false,
  canEngageDeck: false, canEngageHelicopters: false, altitudeMax: 'veryHigh',
});

reg({
  id: 'Nike_Hercules', name: 'Nike Hercules (MIM-14)', side: 'nato',
  acquisitionRange: 20, attackRange: 18, minRange: 3, shots: 6,
  targetProfile: 'C', isMobile: false, isIR: false, isPhasedArray: false,
  hasLOAL: false, hasAntiRadar: false, hasEOTracking: false,
  canEngageDeck: false, canEngageHelicopters: false, altitudeMax: 'veryHigh',
});

reg({
  id: 'Roland_2', name: 'Roland 2', side: 'nato',
  acquisitionRange: 6, attackRange: 4, minRange: 0, shots: 8,
  targetProfile: 'C', isMobile: true, isIR: false, isPhasedArray: false,
  hasLOAL: false, hasAntiRadar: false, hasEOTracking: true,
  canEngageDeck: true, canEngageHelicopters: true, altitudeMax: 'low',
});

reg({
  id: 'Rapier', name: 'Rapier', side: 'nato',
  acquisitionRange: 5, attackRange: 4, minRange: 0, shots: 8,
  targetProfile: 'D', isMobile: true, isIR: false, isPhasedArray: false,
  hasLOAL: false, hasAntiRadar: false, hasEOTracking: true,
  canEngageDeck: true, canEngageHelicopters: true, altitudeMax: 'low',
});

// ── WP SAMs ──────────────────────────────────────────────────────

reg({
  id: 'SA-2', name: 'SA-2 Guideline', side: 'wp',
  acquisitionRange: 20, attackRange: 18, minRange: 3, shots: 6,
  targetProfile: 'C', isMobile: false, isIR: false, isPhasedArray: false,
  hasLOAL: false, hasAntiRadar: false, hasEOTracking: false,
  canEngageDeck: false, canEngageHelicopters: false, altitudeMax: 'veryHigh',
});

reg({
  id: 'SA-4', name: 'SA-4 Ganef', side: 'wp',
  acquisitionRange: 20, attackRange: 16, minRange: 2, shots: 4,
  targetProfile: 'C', isMobile: true, isIR: false, isPhasedArray: false,
  hasLOAL: false, hasAntiRadar: false, hasEOTracking: false,
  canEngageDeck: false, canEngageHelicopters: false, altitudeMax: 'veryHigh',
});

reg({
  id: 'SA-6', name: 'SA-6 Gainful', side: 'wp',
  acquisitionRange: 12, attackRange: 10, minRange: 1, shots: 6,
  targetProfile: 'C', isMobile: true, isIR: false, isPhasedArray: false,
  hasLOAL: false, hasAntiRadar: false, hasEOTracking: false,
  canEngageDeck: true, canEngageHelicopters: false, altitudeMax: 'high',
});

reg({
  id: 'SA-8', name: 'SA-8 Gecko', side: 'wp',
  acquisitionRange: 8, attackRange: 6, minRange: 0, shots: 6,
  targetProfile: 'C', isMobile: true, isIR: false, isPhasedArray: false,
  hasLOAL: false, hasAntiRadar: false, hasEOTracking: true,
  canEngageDeck: true, canEngageHelicopters: true, altitudeMax: 'medium',
});

reg({
  id: 'SA-11', name: 'SA-11 Gadfly', side: 'wp',
  acquisitionRange: 14, attackRange: 12, minRange: 1, shots: 8,
  targetProfile: 'C', isMobile: true, isIR: false, isPhasedArray: false,
  hasLOAL: true, hasAntiRadar: false, hasEOTracking: false,
  canEngageDeck: true, canEngageHelicopters: false, altitudeMax: 'high',
});

reg({
  id: 'SA-12', name: 'SA-12 Gladiator', side: 'wp',
  acquisitionRange: 25, attackRange: 20, minRange: 2, shots: 8,
  targetProfile: 'B', isMobile: false, isIR: false, isPhasedArray: true,
  hasLOAL: false, hasAntiRadar: true, hasEOTracking: false,
  canEngageDeck: false, canEngageHelicopters: false, altitudeMax: 'veryHigh',
});

reg({
  id: 'SA-13', name: 'SA-13 Gopher', side: 'wp',
  acquisitionRange: 0, attackRange: 4, minRange: 0, shots: 8,
  targetProfile: 'D', isMobile: true, isIR: true, isPhasedArray: false,
  hasLOAL: false, hasAntiRadar: false, hasEOTracking: false,
  canEngageDeck: true, canEngageHelicopters: true, altitudeMax: 'low',
});

// ── Lookup ───────────────────────────────────────────────────────

export function getSAMType(id: string): SAMType | undefined {
  return SAM_DB[id];
}

export function getAllSAMTypes(): SAMType[] {
  return Object.values(SAM_DB);
}

export default SAM_DB;
