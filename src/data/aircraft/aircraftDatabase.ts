/**
 * Aircraft Data Charts (ADC) database.
 *
 * Each entry contains all performance data for an aircraft type,
 * derived from the Aircraft Data Charts PDF.
 *
 * Speed values are [Low/Deck, Medium, High, VeryHigh].
 * null means the aircraft cannot operate at that altitude.
 *
 * Reference: Rules section 2.8, ADC charts
 */

export interface AircraftData {
  id: string;
  name: string;
  fullName: string;
  side: 'nato' | 'wp';
  nation: string;

  // Crew & airfield
  crew: number;
  runwayRating: number;         // Minimum airfield class for takeoff/landing

  // Fuel
  fuelAllowance: number;        // Max turns at Dash or in Standard combat

  // Bomb capability
  bombStrength: number;          // Per-aircraft bomb attack strength
  bombStrengthDeepStrike: number | null; // Lower value for deep strike raids
  bombsightModifier: number;     // Modifier for bombing accuracy

  // Radar Warning Receiver
  rwrRating: number;             // RWR detection range modifier

  // Defensive Jamming
  defensiveJamStrength: number;  // 0 = no jammer
  defensiveJamType: 'noise' | 'deception' | null;

  // Search Radar
  hasRadar: boolean;
  radarRange: number | null;      // Max radar search range in hexes
  radarModifiers: { range: number; modifier: number }[]; // Range-based modifiers
  lookdown: 'LD' | 'LD_LTD' | 'No_LD' | null;
  trackWhileScan: boolean;

  // Speed: [Low/Deck, Medium, High, VeryHigh] - null = cannot use
  combatThrottleClean: (number | null)[];
  combatThrottleLaden: (number | null)[];
  dashThrottleClean: (number | null)[];
  dashThrottleLaden: (number | null)[];

  // Maneuver rating: [Low/Deck, Medium, High, VeryHigh]
  maneuverClean: (number | null)[];
  maneuverLaden: (number | null)[];

  // Capabilities
  capabilities: string[];

  // Air-to-air weapons available (weapon IDs)
  airToAirOptions: string[][];   // Each sub-array is one valid loadout option

  // Ordnance options
  ordnanceOptions: string[];     // Types of ordnance this aircraft can carry

  // Special flags
  isLargeAircraft: boolean;
  isMultirole: boolean;
  hasNightCapability: boolean;
  hasLimitedNight: boolean;
  hasTFR: boolean;               // Terrain Following Radar
  hasFLIR: boolean;              // Forward Looking Infrared
  hasIRST: boolean;              // Infrared Search and Track
  canDefensiveWheel: boolean;
  poorSAMDefense: boolean;

  // ADC notes applicable
  notes: string[];
}

// ── Aircraft Database ────────────────────────────────────────────

const AIRCRAFT_DB: Record<string, AircraftData> = {};

function register(aircraft: AircraftData): void {
  AIRCRAFT_DB[aircraft.id] = aircraft;
}

// ── NATO Aircraft ────────────────────────────────────────────────

register({
  id: 'FGR2',
  name: 'FGR.2',
  fullName: 'McDonnell Douglas Phantom FGR.2',
  side: 'nato',
  nation: 'UK',
  crew: 2,
  runwayRating: 4,
  fuelAllowance: 5,
  bombStrength: 4,
  bombStrengthDeepStrike: null,
  bombsightModifier: 0,
  rwrRating: 8,
  defensiveJamStrength: 2,
  defensiveJamType: 'noise',
  hasRadar: true,
  radarRange: 12,
  radarModifiers: [{ range: 10, modifier: -1 }],
  lookdown: 'No_LD',
  trackWhileScan: false,
  combatThrottleClean: [4, 5, 5, null],
  combatThrottleLaden: [3, 4, 4, null],
  dashThrottleClean: [5, 6, 7, null],
  dashThrottleLaden: [4, 5, 5, null],
  maneuverClean: [5, 5, 4, null],
  maneuverLaden: [4, 4, 3, null],
  capabilities: ['Radar', 'Night (Ltd)'],
  airToAirOptions: [
    ['AIM-7E2', 'AIM-9G'],
    ['Skyflash', 'AIM-9G'],
  ],
  ordnanceOptions: ['Bombs', 'CBU_AP', 'Rockets'],
  isLargeAircraft: false,
  isMultirole: false,
  hasNightCapability: false,
  hasLimitedNight: true,
  hasTFR: false,
  hasFLIR: false,
  hasIRST: false,
  canDefensiveWheel: true,
  poorSAMDefense: false,
  notes: ['B', 'C'],
});

register({
  id: 'F-15C',
  name: 'F-15C',
  fullName: 'McDonnell Douglas F-15C Eagle',
  side: 'nato',
  nation: 'US',
  crew: 1,
  runwayRating: 4,
  fuelAllowance: 5,
  bombStrength: 0,
  bombStrengthDeepStrike: null,
  bombsightModifier: 0,
  rwrRating: 10,
  defensiveJamStrength: 3,
  defensiveJamType: 'deception',
  hasRadar: true,
  radarRange: 20,
  radarModifiers: [{ range: 16, modifier: -1 }],
  lookdown: 'LD',
  trackWhileScan: true,
  combatThrottleClean: [4, 5, 5, null],
  combatThrottleLaden: [4, 5, 5, null],
  dashThrottleClean: [5, 7, 7, null],
  dashThrottleLaden: [5, 7, 7, null],
  maneuverClean: [7, 7, 6, null],
  maneuverLaden: [7, 7, 6, null],
  capabilities: ['Radar', 'TS', 'LD', 'Night (Ltd)'],
  airToAirOptions: [
    ['AIM-7M', 'AIM-9M'],
    ['AIM-7F', 'AIM-9L'],
  ],
  ordnanceOptions: [],
  isLargeAircraft: false,
  isMultirole: false,
  hasNightCapability: false,
  hasLimitedNight: true,
  hasTFR: false,
  hasFLIR: false,
  hasIRST: false,
  canDefensiveWheel: true,
  poorSAMDefense: false,
  notes: ['A'],
});

register({
  id: 'F-4E',
  name: 'F-4E',
  fullName: 'McDonnell Douglas F-4E Phantom II',
  side: 'nato',
  nation: 'US',
  crew: 2,
  runwayRating: 4,
  fuelAllowance: 5,
  bombStrength: 5,
  bombStrengthDeepStrike: 3,
  bombsightModifier: 0,
  rwrRating: 8,
  defensiveJamStrength: 2,
  defensiveJamType: 'noise',
  hasRadar: true,
  radarRange: 12,
  radarModifiers: [{ range: 8, modifier: -1 }],
  lookdown: 'No_LD',
  trackWhileScan: false,
  combatThrottleClean: [4, 5, 5, null],
  combatThrottleLaden: [3, 4, 4, null],
  dashThrottleClean: [5, 6, 7, null],
  dashThrottleLaden: [4, 5, 5, null],
  maneuverClean: [5, 5, 4, null],
  maneuverLaden: [4, 4, 3, null],
  capabilities: ['Radar', 'Night (Ltd)'],
  airToAirOptions: [
    ['AIM-7E2', 'AIM-9L', 'Gun_M61'],
    ['AIM-7F', 'AIM-9L', 'Gun_M61'],
  ],
  ordnanceOptions: ['Bombs', 'CBU_AP', 'CBU_AT', 'Rockets', 'EOGM', 'LGB'],
  isLargeAircraft: false,
  isMultirole: false,
  hasNightCapability: false,
  hasLimitedNight: true,
  hasTFR: false,
  hasFLIR: false,
  hasIRST: false,
  canDefensiveWheel: true,
  poorSAMDefense: false,
  notes: ['B', 'C'],
});

register({
  id: 'F-4F',
  name: 'F-4F',
  fullName: 'McDonnell Douglas F-4F Phantom II (FRG)',
  side: 'nato', nation: 'FRG',
  crew: 2, runwayRating: 4, fuelAllowance: 5,
  bombStrength: 4, bombStrengthDeepStrike: null, bombsightModifier: 0,
  rwrRating: 8, defensiveJamStrength: 2, defensiveJamType: 'noise',
  hasRadar: true, radarRange: 10, radarModifiers: [{ range: 8, modifier: -1 }],
  lookdown: 'No_LD', trackWhileScan: false,
  combatThrottleClean: [4, 5, 5, null], combatThrottleLaden: [3, 4, 4, null],
  dashThrottleClean: [5, 6, 7, null], dashThrottleLaden: [4, 5, 5, null],
  maneuverClean: [5, 5, 4, null], maneuverLaden: [4, 4, 3, null],
  capabilities: ['Radar', 'Night (Ltd)'],
  airToAirOptions: [['AIM-9L', 'Gun_M61']],
  ordnanceOptions: ['Bombs', 'CBU_AP', 'Rockets'],
  isLargeAircraft: false, isMultirole: false,
  hasNightCapability: false, hasLimitedNight: true,
  hasTFR: false, hasFLIR: false, hasIRST: false,
  canDefensiveWheel: true, poorSAMDefense: false, notes: ['B', 'C'],
});

register({
  id: 'F-16A',
  name: 'F-16A',
  fullName: 'General Dynamics F-16A Fighting Falcon',
  side: 'nato', nation: 'BE',
  crew: 1, runwayRating: 3, fuelAllowance: 4,
  bombStrength: 3, bombStrengthDeepStrike: null, bombsightModifier: 0,
  rwrRating: 10, defensiveJamStrength: 2, defensiveJamType: 'deception',
  hasRadar: true, radarRange: 12, radarModifiers: [{ range: 10, modifier: -1 }],
  lookdown: 'LD_LTD', trackWhileScan: false,
  combatThrottleClean: [4, 5, 5, null], combatThrottleLaden: [3, 4, 4, null],
  dashThrottleClean: [5, 7, 7, null], dashThrottleLaden: [4, 5, 6, null],
  maneuverClean: [7, 7, 5, null], maneuverLaden: [5, 5, 4, null],
  capabilities: ['Radar', 'LD (LTD)', 'Night (Ltd)'],
  airToAirOptions: [['AIM-9L', 'Gun_M61']],
  ordnanceOptions: ['Bombs', 'CBU_AP', 'Rockets', 'EOGM'],
  isLargeAircraft: false, isMultirole: true,
  hasNightCapability: false, hasLimitedNight: true,
  hasTFR: false, hasFLIR: false, hasIRST: false,
  canDefensiveWheel: true, poorSAMDefense: false, notes: [],
});

register({
  id: 'A-10A',
  name: 'A-10A',
  fullName: 'Fairchild Republic A-10A Thunderbolt II',
  side: 'nato', nation: 'US',
  crew: 1, runwayRating: 3, fuelAllowance: 6,
  bombStrength: 6, bombStrengthDeepStrike: null, bombsightModifier: 1,
  rwrRating: 6, defensiveJamStrength: 0, defensiveJamType: null,
  hasRadar: false, radarRange: null, radarModifiers: [],
  lookdown: null, trackWhileScan: false,
  combatThrottleClean: [2, 2, null, null], combatThrottleLaden: [2, 2, null, null],
  dashThrottleClean: [3, 3, null, null], dashThrottleLaden: [3, 3, null, null],
  maneuverClean: [4, 3, null, null], maneuverLaden: [3, 2, null, null],
  capabilities: ['Night (Ltd)'],
  airToAirOptions: [['AIM-9L', 'Gun_GAU8']],
  ordnanceOptions: ['Bombs', 'CBU_AP', 'CBU_AT', 'Rockets', 'EOGM'],
  isLargeAircraft: false, isMultirole: false,
  hasNightCapability: false, hasLimitedNight: true,
  hasTFR: false, hasFLIR: false, hasIRST: false,
  canDefensiveWheel: false, poorSAMDefense: true, notes: [],
});

register({
  id: 'MiG-23MLD',
  name: 'MiG-23MLD',
  fullName: 'Mikoyan-Gurevich MiG-23MLD Flogger-K',
  side: 'wp', nation: 'USSR',
  crew: 1, runwayRating: 3, fuelAllowance: 3,
  bombStrength: 2, bombStrengthDeepStrike: null, bombsightModifier: -1,
  rwrRating: 8, defensiveJamStrength: 2, defensiveJamType: 'noise',
  hasRadar: true, radarRange: 10, radarModifiers: [{ range: 8, modifier: -1 }],
  lookdown: 'LD_LTD', trackWhileScan: false,
  combatThrottleClean: [4, 5, 5, null], combatThrottleLaden: [3, 4, 4, null],
  dashThrottleClean: [5, 6, 6, null], dashThrottleLaden: [4, 5, 5, null],
  maneuverClean: [5, 5, 4, null], maneuverLaden: [4, 4, 3, null],
  capabilities: ['Radar', 'LD (LTD)'],
  airToAirOptions: [['R-23R', 'R-60M', 'Gun_GSh-23']],
  ordnanceOptions: ['Bombs', 'Rockets'],
  isLargeAircraft: false, isMultirole: false,
  hasNightCapability: false, hasLimitedNight: false,
  hasTFR: false, hasFLIR: false, hasIRST: false,
  canDefensiveWheel: true, poorSAMDefense: false, notes: [],
});

register({
  id: 'MiG-27',
  name: 'MiG-27',
  fullName: 'Mikoyan-Gurevich MiG-27 Flogger-D',
  side: 'wp', nation: 'USSR',
  crew: 1, runwayRating: 3, fuelAllowance: 3,
  bombStrength: 4, bombStrengthDeepStrike: 3, bombsightModifier: 0,
  rwrRating: 6, defensiveJamStrength: 0, defensiveJamType: null,
  hasRadar: false, radarRange: null, radarModifiers: [],
  lookdown: null, trackWhileScan: false,
  combatThrottleClean: [3, 4, 4, null], combatThrottleLaden: [3, 4, 4, null],
  dashThrottleClean: [4, 5, 5, null], dashThrottleLaden: [4, 5, 5, null],
  maneuverClean: [3, 3, 2, null], maneuverLaden: [2, 2, 1, null],
  capabilities: [],
  airToAirOptions: [['R-60', 'Gun_GSh6-23']],
  ordnanceOptions: ['Bombs', 'CBU_AP', 'Rockets', 'EOGM', 'LGB'],
  isLargeAircraft: false, isMultirole: false,
  hasNightCapability: false, hasLimitedNight: false,
  hasTFR: false, hasFLIR: false, hasIRST: false,
  canDefensiveWheel: false, poorSAMDefense: false, notes: [],
});

register({
  id: 'MiG-25BM',
  name: 'MiG-25BM',
  fullName: 'Mikoyan-Gurevich MiG-25BM Foxbat-F',
  side: 'wp', nation: 'USSR',
  crew: 1, runwayRating: 4, fuelAllowance: 3,
  bombStrength: 0, bombStrengthDeepStrike: null, bombsightModifier: 0,
  rwrRating: 8, defensiveJamStrength: 3, defensiveJamType: 'deception',
  hasRadar: true, radarRange: 12, radarModifiers: [],
  lookdown: 'No_LD', trackWhileScan: false,
  combatThrottleClean: [4, 5, 5, null], combatThrottleLaden: [4, 5, 5, null],
  dashThrottleClean: [5, 7, 8, null], dashThrottleLaden: [5, 7, 8, null],
  maneuverClean: [2, 2, 2, null], maneuverLaden: [2, 2, 2, null],
  capabilities: ['Radar', 'Standoff', 'Spot'],
  airToAirOptions: [['R-60M']],
  ordnanceOptions: ['Kh-58'],
  isLargeAircraft: false, isMultirole: false,
  hasNightCapability: false, hasLimitedNight: false,
  hasTFR: false, hasFLIR: false, hasIRST: false,
  canDefensiveWheel: false, poorSAMDefense: false, notes: [],
});

register({
  id: 'MiG-23M',
  name: 'MiG-23M',
  fullName: 'Mikoyan-Gurevich MiG-23M Flogger-B',
  side: 'wp', nation: 'USSR',
  crew: 1, runwayRating: 3, fuelAllowance: 3,
  bombStrength: 2, bombStrengthDeepStrike: null, bombsightModifier: -1,
  rwrRating: 6, defensiveJamStrength: 0, defensiveJamType: null,
  hasRadar: true, radarRange: 8, radarModifiers: [{ range: 6, modifier: -2 }],
  lookdown: 'No_LD', trackWhileScan: false,
  combatThrottleClean: [4, 5, 5, null], combatThrottleLaden: [3, 4, 4, null],
  dashThrottleClean: [5, 6, 6, null], dashThrottleLaden: [4, 5, 5, null],
  maneuverClean: [4, 4, 3, null], maneuverLaden: [3, 3, 2, null],
  capabilities: ['Radar'],
  airToAirOptions: [['R-23R', 'R-60', 'Gun_GSh-23']],
  ordnanceOptions: ['Bombs', 'Rockets'],
  isLargeAircraft: false, isMultirole: false,
  hasNightCapability: false, hasLimitedNight: false,
  hasTFR: false, hasFLIR: false, hasIRST: false,
  canDefensiveWheel: true, poorSAMDefense: false, notes: [],
});

register({
  id: 'MiG-23MLA',
  name: 'MiG-23MLA',
  fullName: 'Mikoyan-Gurevich MiG-23MLA Flogger-G',
  side: 'wp', nation: 'USSR',
  crew: 1, runwayRating: 3, fuelAllowance: 3,
  bombStrength: 2, bombStrengthDeepStrike: null, bombsightModifier: -1,
  rwrRating: 8, defensiveJamStrength: 2, defensiveJamType: 'noise',
  hasRadar: true, radarRange: 10, radarModifiers: [{ range: 8, modifier: -1 }],
  lookdown: 'No_LD', trackWhileScan: false,
  combatThrottleClean: [4, 5, 5, null], combatThrottleLaden: [3, 4, 4, null],
  dashThrottleClean: [5, 6, 6, null], dashThrottleLaden: [4, 5, 5, null],
  maneuverClean: [5, 5, 3, null], maneuverLaden: [4, 4, 2, null],
  capabilities: ['Radar'],
  airToAirOptions: [['R-23R', 'R-60M', 'Gun_GSh-23']],
  ordnanceOptions: ['Bombs', 'Rockets'],
  isLargeAircraft: false, isMultirole: false,
  hasNightCapability: false, hasLimitedNight: false,
  hasTFR: false, hasFLIR: false, hasIRST: false,
  canDefensiveWheel: true, poorSAMDefense: false, notes: [],
});

register({
  id: 'MiG-21MF',
  name: 'MiG-21MF',
  fullName: 'Mikoyan-Gurevich MiG-21MF Fishbed-J (GDR)',
  side: 'wp', nation: 'GDR',
  crew: 1, runwayRating: 3, fuelAllowance: 3,
  bombStrength: 2, bombStrengthDeepStrike: null, bombsightModifier: -1,
  rwrRating: 4, defensiveJamStrength: 0, defensiveJamType: null,
  hasRadar: true, radarRange: 6, radarModifiers: [{ range: 4, modifier: -2 }],
  lookdown: 'No_LD', trackWhileScan: false,
  combatThrottleClean: [4, 5, 5, null], combatThrottleLaden: [3, 4, 4, null],
  dashThrottleClean: [5, 6, 6, null], dashThrottleLaden: [4, 5, 5, null],
  maneuverClean: [4, 4, 3, null], maneuverLaden: [3, 3, 2, null],
  capabilities: ['Radar'],
  airToAirOptions: [['R-3S', 'Gun_GSh-23']],
  ordnanceOptions: ['Bombs', 'Rockets'],
  isLargeAircraft: false, isMultirole: false,
  hasNightCapability: false, hasLimitedNight: false,
  hasTFR: false, hasFLIR: false, hasIRST: false,
  canDefensiveWheel: true, poorSAMDefense: false, notes: [],
});

// Also add GAU-8 gun for A-10
// (already registered in weapons as Gun_M61, A-10 uses GAU-8 which is similar)

// ── Warsaw Pact Aircraft ─────────────────────────────────────────

register({
  id: 'Su-24MR',
  name: 'Su-24MR',
  fullName: 'Sukhoi Su-24MR Fencer E',
  side: 'wp',
  nation: 'USSR',
  crew: 2,
  runwayRating: 4,
  fuelAllowance: 4,
  bombStrength: 0,
  bombStrengthDeepStrike: null,
  bombsightModifier: 0,
  rwrRating: 8,
  defensiveJamStrength: 3,
  defensiveJamType: 'deception',
  hasRadar: false,
  radarRange: null,
  radarModifiers: [],
  lookdown: null,
  trackWhileScan: false,
  combatThrottleClean: [4, 5, 5, null],
  combatThrottleLaden: [4, 5, 5, null],
  dashThrottleClean: [5, 5, 6, null],
  dashThrottleLaden: [5, 5, 6, null],
  maneuverClean: [3, 3, 2, null],
  maneuverLaden: [3, 3, 2, null],
  capabilities: ['Recon', 'SAR', 'Night', 'TFR'],
  airToAirOptions: [
    ['R-60', 'Gun_GSh6-23'],
  ],
  ordnanceOptions: [],
  isLargeAircraft: false,
  isMultirole: false,
  hasNightCapability: true,
  hasLimitedNight: false,
  hasTFR: true,
  hasFLIR: false,
  hasIRST: false,
  canDefensiveWheel: false,
  poorSAMDefense: false,
  notes: ['E', 'L'],
});

register({
  id: 'MiG-21bis',
  name: 'MiG-21bis',
  fullName: 'Mikoyan-Gurevich MiG-21bis Fishbed-N',
  side: 'wp',
  nation: 'USSR',
  crew: 1,
  runwayRating: 3,
  fuelAllowance: 3,
  bombStrength: 2,
  bombStrengthDeepStrike: null,
  bombsightModifier: -1,
  rwrRating: 6,
  defensiveJamStrength: 0,
  defensiveJamType: null,
  hasRadar: true,
  radarRange: 6,
  radarModifiers: [{ range: 4, modifier: -2 }],
  lookdown: 'No_LD',
  trackWhileScan: false,
  combatThrottleClean: [4, 5, 5, null],
  combatThrottleLaden: [3, 4, 4, null],
  dashThrottleClean: [5, 6, 6, null],
  dashThrottleLaden: [4, 5, 5, null],
  maneuverClean: [5, 4, 3, null],
  maneuverLaden: [4, 3, 2, null],
  capabilities: ['Radar'],
  airToAirOptions: [
    ['R-60', 'Gun_GSh-23'],
    ['R-3S', 'Gun_GSh-23'],
  ],
  ordnanceOptions: ['Bombs', 'Rockets'],
  isLargeAircraft: false,
  isMultirole: false,
  hasNightCapability: false,
  hasLimitedNight: false,
  hasTFR: false,
  hasFLIR: false,
  hasIRST: false,
  canDefensiveWheel: true,
  poorSAMDefense: false,
  notes: [],
});

register({
  id: 'MiG-29A',
  name: 'MiG-29A',
  fullName: 'Mikoyan MiG-29A Fulcrum-A',
  side: 'wp',
  nation: 'USSR',
  crew: 1,
  runwayRating: 3,
  fuelAllowance: 3,
  bombStrength: 2,
  bombStrengthDeepStrike: null,
  bombsightModifier: 0,
  rwrRating: 10,
  defensiveJamStrength: 2,
  defensiveJamType: 'deception',
  hasRadar: true,
  radarRange: 14,
  radarModifiers: [{ range: 10, modifier: -1 }],
  lookdown: 'LD_LTD',
  trackWhileScan: true,
  combatThrottleClean: [4, 5, 5, null],
  combatThrottleLaden: [3, 4, 4, null],
  dashThrottleClean: [5, 7, 7, null],
  dashThrottleLaden: [4, 5, 6, null],
  maneuverClean: [7, 7, 5, null],
  maneuverLaden: [5, 5, 4, null],
  capabilities: ['Radar', 'TS', 'LD (LTD)', 'IRST', 'Night (Ltd)'],
  airToAirOptions: [
    ['R-27R', 'R-60M', 'Gun_GSh-301'],
    ['R-27R', 'R-73', 'Gun_GSh-301'],
  ],
  ordnanceOptions: ['Bombs', 'Rockets'],
  isLargeAircraft: false,
  isMultirole: true,
  hasNightCapability: false,
  hasLimitedNight: true,
  hasTFR: false,
  hasFLIR: false,
  hasIRST: true,
  canDefensiveWheel: true,
  poorSAMDefense: false,
  notes: ['A'],
});

// ── Register Additional Aircraft from ADC Charts ─────────────────
import { ADDITIONAL_AIRCRAFT } from './additionalAircraft';
for (const ac of ADDITIONAL_AIRCRAFT) {
  if (!AIRCRAFT_DB[ac.id]) register(ac);
}

// ── Lookup Functions ─────────────────────────────────────────────

export function getAircraftData(id: string): AircraftData | undefined {
  return AIRCRAFT_DB[id];
}

export function getAllAircraft(): AircraftData[] {
  return Object.values(AIRCRAFT_DB);
}

export function getAircraftForSide(side: 'nato' | 'wp'): AircraftData[] {
  return Object.values(AIRCRAFT_DB).filter((a) => a.side === side);
}

/**
 * Get the speed value for an aircraft at a given altitude and throttle setting.
 * Returns null if the aircraft cannot operate at that altitude.
 */
export function getSpeed(
  aircraft: AircraftData,
  altitude: 'deck' | 'low' | 'medium' | 'high' | 'veryHigh',
  throttle: 'combat' | 'dash',
  isLaden: boolean
): number | null {
  const altIndex = altitude === 'deck' ? 0 :
    altitude === 'low' ? 0 :
    altitude === 'medium' ? 1 :
    altitude === 'high' ? 2 : 3;

  const speeds = throttle === 'combat'
    ? (isLaden ? aircraft.combatThrottleLaden : aircraft.combatThrottleClean)
    : (isLaden ? aircraft.dashThrottleLaden : aircraft.dashThrottleClean);

  return speeds[altIndex];
}

/**
 * Get the maneuver rating for an aircraft at a given altitude.
 */
export function getManeuverRating(
  aircraft: AircraftData,
  altitude: 'deck' | 'low' | 'medium' | 'high' | 'veryHigh',
  isLaden: boolean
): number | null {
  const altIndex = altitude === 'deck' ? 0 :
    altitude === 'low' ? 0 :
    altitude === 'medium' ? 1 :
    altitude === 'high' ? 2 : 3;

  const maneuver = isLaden ? aircraft.maneuverLaden : aircraft.maneuverClean;
  return maneuver[altIndex];
}

export default AIRCRAFT_DB;
