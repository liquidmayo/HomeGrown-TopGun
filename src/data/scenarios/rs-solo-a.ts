/**
 * RS Solo Scenario A: CAS
 * Reference: Scenario Book page 54
 */
import { ScenarioDefinition } from './scenarioTypes';

export const RS_SOLO_A: ScenarioDefinition = {
  id: 'rs-solo-a',
  name: 'RS Solo A: CAS',
  subtitle: 'Close Air Support',
  description: 'NATO CAS aircraft attack WP armored formations along the front. Human plays NATO.',
  background: 'NATO ground commanders call for help to stall Warsaw Pact armor attacks. NATO air forces rush CAS task forces to the VII Corps sector.',
  category: 'solo',
  size: 'large',
  date: '19 May 1987', timeOfDay: '1600', dayNight: 'day', moonPhase: null,
  playArea: { minCol: 56, maxCol: 79, minRow: 31, maxRow: 50 },
  front: [
    { col: 56, row: 37 }, { col: 58, row: 38 }, { col: 60, row: 39 },
    { col: 62, row: 40 }, { col: 64, row: 41 }, { col: 66, row: 42 },
    { col: 68, row: 43 }, { col: 70, row: 44 }, { col: 72, row: 44 },
    { col: 74, row: 43 }, { col: 76, row: 42 }, { col: 77, row: 39 },
  ],
  natoDetectionLevel: 'C', wpDetectionLevel: 'C',
  weather: 'roll_good', maxTurns: 20,
  humanSide: 'nato', isSoloScenario: true,
  closedAirfields: [
    { hex: '5536', aaaActive: false }, { hex: '5943', aaaActive: false }, { hex: '7044', aaaActive: false },
  ],
  inherentAAA: null,
  isr: { side: 'nato' }, sead: { side: 'nato' },
  earlyWarning: { side: 'wp', surpriseAttack: false },
  natoAirDefenseZone: '4ATAF',
  flightRestrictions: [],
  zoneLimits: [],
  natoOOB: {
    flights: [
      // 2 CAS Raids generated per SSR 2 — placeholder with A-10s
      { id: 'CAS-1', aircraftType: 'A-10A', nation: 'US', task: 'bombing', count: 4, aggressionValue: 1, setupType: 'enterTurn', enterTurn: 1 },
      { id: 'CAS-2', aircraftType: 'A-10A', nation: 'US', task: 'bombing', count: 4, aggressionValue: 1, setupType: 'enterTurn', enterTurn: 1 },
      { id: 'CAS-3', aircraftType: 'A-10A', nation: 'US', task: 'bombing', count: 4, aggressionValue: 1, setupType: 'enterTurn', enterTurn: 1 },
      { id: 'CAS-4', aircraftType: 'A-10A', nation: 'US', task: 'bombing', count: 4, aggressionValue: 1, setupType: 'enterTurn', enterTurn: 1 },
      { id: 'CAS-5', aircraftType: 'A-10A', nation: 'US', task: 'bombing', count: 4, aggressionValue: 1, setupType: 'enterTurn', enterTurn: 1 },
      { id: 'CAS-6', aircraftType: 'A-10A', nation: 'US', task: 'bombing', count: 4, aggressionValue: 1, setupType: 'enterTurn', enterTurn: 1 },
      { id: 'FAC-1', aircraftType: 'F-4E', nation: 'US', task: 'fac', count: 2, aggressionValue: 2, setupType: 'enterTurn', enterTurn: 1 },
      { id: 'FAC-2', aircraftType: 'F-4E', nation: 'US', task: 'fac', count: 2, aggressionValue: 2, setupType: 'enterTurn', enterTurn: 1 },
      { id: 'SEAD-1', aircraftType: 'F-4G', nation: 'US', task: 'sead', count: 2, aggressionValue: 1, setupType: 'enterTurn', enterTurn: 1 },
    ],
    groundUnits: [],
    orbitPoints: [{ col: 56, row: 48 }, { col: 60, row: 48 }],
    rallyPoints: [],
    dummyFlights: 0,
    pilotQuality: { 'US_F15_F16': 'ace', 'US_UK': 'veteran', 'other': 'regular' },
  },
  wpOOB: {
    flights: [],
    groundUnits: [
      { id: 'MECH-1', type: 'mech', subType: 'GDR_4th_Mech', hex: '5837', located: true, radarOn: false },
      { id: 'MECH-2', type: 'mech', subType: 'GDR_4th_Mech', hex: '6136', located: true, radarOn: false },
      { id: 'MECH-3', type: 'mech', subType: 'GDR_4th_Mech', hex: '6239', located: true, radarOn: false },
      { id: 'MECH-4', type: 'mech', subType: 'GDR_4th_Mech', hex: '6740', located: true, radarOn: false },
      { id: 'ARMOR-1', type: 'armor', subType: 'GDR_4th_Armor', hex: '6439', located: true, radarOn: false },
      { id: 'ARMOR-2', type: 'armor', subType: 'GDR_4th_Armor', hex: '6641', located: true, radarOn: false },
      { id: 'MECH-5', type: 'mech', subType: 'GDR_11th_Mech', hex: '6942', located: true, radarOn: false },
      { id: 'MECH-6', type: 'mech', subType: 'GDR_11th_Mech', hex: '7040', located: true, radarOn: false },
      { id: 'MECH-7', type: 'mech', subType: 'GDR_11th_Mech', hex: '7240', located: true, radarOn: false },
      { id: 'MECH-8', type: 'mech', subType: 'GDR_11th_Mech', hex: '7439', located: true, radarOn: false },
      { id: 'ARMOR-3', type: 'armor', subType: 'GDR_11th_Armor', hex: '7139', located: true, radarOn: false },
      { id: 'ARMOR-4', type: 'armor', subType: 'GDR_11th_Armor', hex: '7539', located: true, radarOn: false },
      { id: 'SA-11-1', type: 'sam', subType: 'SA-11', hex: '6332', located: true, radarOn: true },
      { id: 'SA-11-2', type: 'sam', subType: 'SA-11', hex: '6934', located: true, radarOn: true },
      { id: 'EWR-1', type: 'ewr', subType: 'EWR', hex: '6632', located: true, radarOn: true },
    ],
    orbitPoints: [],
    rallyPoints: [],
    dummyFlights: 0,
    pilotQuality: {},
    samActivation: {
      zones: [
        {
          name: 'Frontal',
          warningLocations: [
            { hex: '5937', radarOn: false }, { hex: '6138', radarOn: false },
            { hex: '6339', radarOn: false }, { hex: '6440', radarOn: false },
            { hex: '6640', radarOn: false }, { hex: '6842', radarOn: false },
            { hex: '7041', radarOn: false }, { hex: '7239', radarOn: false },
            { hex: '7438', radarOn: false }, { hex: '7637', radarOn: false },
          ],
          typeTable: [
            { minRoll: 1, maxRoll: 7, samType: 'SA-13' },
            { minRoll: 8, maxRoll: 10, samType: 'SA-8' },
          ],
        },
        {
          name: 'Divisional',
          warningLocations: [
            { hex: '5935', radarOn: true }, { hex: '6236', radarOn: true },
            { hex: '6337', radarOn: true }, { hex: '6537', radarOn: true },
            { hex: '6738', radarOn: true }, { hex: '6938', radarOn: true },
            { hex: '7037', radarOn: true }, { hex: '7236', radarOn: true },
            { hex: '7436', radarOn: true },
          ],
          typeTable: [
            { minRoll: 1, maxRoll: 6, samType: 'SA-6' },
            { minRoll: 7, maxRoll: 9, samType: 'SA-8' },
            { minRoll: 10, maxRoll: 10, samType: 'SA-11' },
          ],
        },
      ],
      maxTypes: { 'SA-6': 6, 'SA-8': 5, 'SA-11': 3, 'SA-13': 6 },
    },
    aaaActivation: {
      locations: [
        { hex: '5936' }, { hex: '6137' }, { hex: '6238' }, { hex: '6539' },
        { hex: '6840' }, { hex: '7039' }, { hex: '7339' }, { hex: '7437' },
      ],
      typeTable: [
        { minRoll: 1, maxRoll: 4, aaaType: '2k22' },
        { minRoll: 5, maxRoll: 8, aaaType: 'light', concentration: 'light' },
        { minRoll: 9, maxRoll: 10, aaaType: 'light_firecan', concentration: 'light', hasFireCan: true },
      ],
      maxTypes: { '2k22': 4, 'light': 4, 'fire_can': 2 },
    },
  },
  ssrs: [
    'Large scenario. ISR condition is Average.',
    'Generate two NATO CAS Raids per SSR 2.',
    'NATO Bombing flights do not follow a flight path. Each must attack two identified WP units.',
    'Bombing flights may only attack WP units identified by a NATO FAC flight.',
  ],
  victoryType: 'custom',
  victoryDescription: 'Standard VP. NATO scores raid target VP: Destroyed (4VP), Heavy (3VP), Slight (2VP). NATO Victory Level Table.',
};
