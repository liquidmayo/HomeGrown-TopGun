/**
 * RS1: Morning Recon — Introductory Scenario
 *
 * This is a solo introductory scenario to help familiarize players with the
 * basics of setup, raid planning, aircraft movement, SAM acquisition, and
 * air-to-air combat.
 *
 * Reference: Scenario Book pages 2-3
 */

export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  background: string;
  date: string;
  timeOfDay: string;
  dayNight: 'day' | 'night';

  // Map bounds
  playArea: {
    minCol: number;
    maxCol: number;
    minRow: number;
    maxRow: number;
  };

  // Front line
  front: { col: number; row: number }[];

  // Detection levels
  natoDetectionLevel: string;
  wpDetectionLevel: string;

  // Weather
  weather: 'clear' | 'roll_good' | 'roll_poor';
  weatherPreset?: string;

  // Max turns
  maxTurns: number | null;

  // Sides
  humanSide: 'nato' | 'wp' | 'either';

  // Special flags
  isIntroductory: boolean;
  isSoloScenario: boolean;

  // Victory conditions (simplified representation)
  victoryType: 'standard' | 'custom';
  victoryDescription: string;
}

export const RS1_SCENARIO: ScenarioDefinition = {
  id: 'rs01',
  name: 'RS1: Morning Recon',
  description: 'Introductory scenario covering setup, movement, SAM acquisition, and air-to-air combat.',
  background:
    'After months of increasing tension along the inner-German border, Warsaw Pact commanders ' +
    'expect to receive the word to start combat operations at any time. WP air commanders authorize ' +
    'high speed reconnaissance flights across the border. Pilots are ordered to get in quickly, ' +
    'gather the required intelligence, and return.',

  date: '12 May 1987',
  timeOfDay: '1030',
  dayNight: 'day',

  playArea: {
    minCol: 39,
    maxCol: 79,
    minRow: 0,
    maxRow: 10,
  },

  front: [
    { col: 63, row: 2 },
    { col: 63, row: 3 },
    { col: 63, row: 4 },
    { col: 63, row: 5 },
    { col: 63, row: 6 },
    { col: 63, row: 7 },
    { col: 63, row: 8 },
    { col: 63, row: 9 },
    { col: 60, row: 10 },
  ],

  natoDetectionLevel: 'A',
  wpDetectionLevel: 'A',

  weather: 'clear',

  maxTurns: 15,

  humanSide: 'either',
  isIntroductory: true,
  isSoloScenario: false,

  victoryType: 'custom',
  victoryDescription:
    'NATO wins by accomplishing four tasks: ' +
    '1) Detection and Visual ID of WP Recon flight. ' +
    '2) Achieve Full SAM Acquisition on WP flight at end of two Admin Phases. ' +
    '3) Conduct successful BVR air-to-air engagement (no shots fired). ' +
    '4) Conduct successful standard air-to-air engagement (no shots fired).',
};

// Scenario-specific data

export const RS1_TARGETS = [
  { type: 'recon', name: 'HAWK Battery', hex: '5303' },
  { type: 'recon', name: 'HQ', hex: '5404' },
  { type: 'recon', name: 'Supply', hex: '4904' },
  { type: 'recon', name: 'HAWK Battery', hex: '5308' },
];

export const RS1_NATO_SETUP = {
  flights: [
    {
      id: 'CAP-1',
      aircraftType: 'FGR2',
      nation: 'UK' as const,
      task: 'cap' as const,
      count: 2,
      aggressionValue: 1,
      setupHex: '4307',        // Adjacent to orbit point
      setupAltitude: 'deck' as const,
    },
  ],
  orbitPoints: ['4307'],
  groundUnits: {
    hawks: [
      { id: 'HAWK-1', subType: 'HAWK_C', hex: '5303' },
      { id: 'HAWK-2', subType: 'HAWK_C', hex: '5308' },
    ],
    ewrs: [
      { id: 'EWR-1', hex: '4706' },
    ],
  },
};

export const RS1_WP_SETUP = {
  flights: [
    {
      id: 'RECON-1',
      aircraftType: 'Su-24MR',
      nation: 'USSR' as const,
      task: 'recon' as const,
      count: 2,
      aggressionValue: 2,
      enterHex: '7706',        // Enter within 1 hex of 7706 on Turn 1
      enterTurn: 1,
    },
  ],
  dummyFlights: 2,
  groundUnits: {
    ewrs: [
      { id: 'EWR-2', hex: '6502' },
    ],
  },
};

export const RS1_SPECIAL_RULES = [
  'Scenario ends at end of Turn 15.',
  'WP Recon flight must follow a flight path passing within 1 hex of each target at Medium or lower altitude.',
  'Ignore Random Events: NATO QRA, NATO Flight in Trouble, WP QRA, WP Flight in Trouble, MANPAD Ambush, SEAD Strike.',
  'Printed AAA at Hoxter (4505), Ballenstedt (7306), and Cochstedt (7503) must remain inactive.',
  'NATO may NOT attack the WP Recon flight. Instead, complete 4 tasks for victory.',
];

export const RS1_RESTRICTIONS = {
  nato: {
    capRestriction: 'Must remain within 1 hex of Orbit Point unless WP flight detected on NATO side of Front.',
    zoneLimit: 'May not voluntarily move within 2 hexes of the Front.',
    noAttack: true,  // NATO cannot attack in this scenario
  },
  wp: {
    zoneLimit: 'May not voluntarily move west of hex column 43xx.',
  },
};
