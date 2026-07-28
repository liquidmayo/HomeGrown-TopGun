/**
 * RS Solo Scenario D: Interdiction
 * Reference: Scenario Book page 59
 */
import { ScenarioDefinition } from './scenarioTypes';

export const RS_SOLO_D: ScenarioDefinition = {
  id: 'rs-solo-d',
  name: 'RS Solo D: Interdiction',
  subtitle: 'NATO Deep Strike',
  description: 'NATO attacks WP communication nodes, bridges, supply dumps, and reserves. Human plays NATO.',
  background: 'As the ground battle rages, NATO and WP air forces fight for control of the air. Ground commanders demand attacks behind enemy lines.',
  category: 'solo', size: 'large',
  date: '19 May 1987', timeOfDay: '1600', dayNight: 'day', moonPhase: null,
  playArea: { minCol: 29, maxCol: 79, minRow: 0, maxRow: 17 },
  front: [
    { col: 51, row: 2 }, { col: 51, row: 7 }, { col: 53, row: 8 },
    { col: 53, row: 15 }, { col: 49, row: 17 },
  ],
  natoDetectionLevel: 'C', wpDetectionLevel: 'C',
  weather: 'roll_good', maxTurns: null,
  humanSide: 'nato', isSoloScenario: true,
  closedAirfields: [
    { hex: '4505', aaaActive: false }, { hex: '4514', aaaActive: false },
  ],
  inherentAAA: { side: 'wp', rangeFromFront: 5 },
  isr: { side: 'nato' }, sead: { side: 'nato' },
  earlyWarning: { side: 'wp', surpriseAttack: false },
  natoAirDefenseZone: '2ATAF',
  flightRestrictions: [],
  zoneLimits: [],
  natoOOB: {
    flights: [], // Generated from OOB Tables B and C
    groundUnits: [
      { id: 'HAWK-1', type: 'sam', subType: 'HAWK_C', hex: '4003', located: true, radarOn: true },
      { id: 'HAWK-2', type: 'sam', subType: 'HAWK_C', hex: '4008', located: true, radarOn: true },
      { id: 'HAWK-3', type: 'sam', subType: 'HAWK_C', hex: '4013', located: true, radarOn: true },
      { id: 'EWR-N1', type: 'ewr', subType: 'EWR', hex: '3510', located: true, radarOn: true },
    ],
    orbitPoints: [{ col: 36, row: 5 }, { col: 36, row: 12 }],
    rallyPoints: [],
    dummyFlights: 0,
    pilotQuality: { 'US_F15_F16': 'ace', 'US_UK': 'veteran', 'other': 'regular' },
  },
  wpOOB: {
    flights: [],
    groundUnits: [
      { id: 'MIS-1', type: 'missile', subType: 'WP_Missile', hex: '5808', located: true, radarOn: false },
      { id: 'MIS-2', type: 'missile', subType: 'WP_Missile', hex: '5711', located: true, radarOn: false },
      { id: 'MIS-3', type: 'missile', subType: 'WP_Missile', hex: '6014', located: true, radarOn: false },
      { id: 'SUP-1', type: 'supply', subType: 'WP_Supply', hex: '5804', located: true, radarOn: false },
      { id: 'SUP-2', type: 'supply', subType: 'WP_Supply', hex: '6008', located: true, radarOn: false },
      { id: 'SUP-3', type: 'supply', subType: 'WP_Supply', hex: '6211', located: true, radarOn: false },
      { id: 'HQ-1', type: 'hq', subType: 'WP_HQ', hex: '5706', located: true, radarOn: false },
      { id: 'HQ-2', type: 'hq', subType: 'WP_HQ', hex: '5912', located: true, radarOn: false },
      { id: 'SA-2-1', type: 'sam', subType: 'SA-2', hex: '7210', located: true, radarOn: true },
      { id: 'EWR-W1', type: 'ewr', subType: 'EWR', hex: '6311', located: true, radarOn: true },
    ],
    orbitPoints: [{ col: 70, row: 3 }, { col: 70, row: 8 }, { col: 70, row: 14 }],
    rallyPoints: [],
    dummyFlights: 0,
    pilotQuality: { 'USSR_MiG29_Su27': 'veteran', 'USSR_other': 'regular', 'GDR': 'trained' },
    botFlightActivation: [{
      task: 'cap', count: 2,
      activationTable: [
        { minRoll: 1, maxRoll: 2, aircraftType: 'MiG-21bis', nation: 'USSR' },
        { minRoll: 3, maxRoll: 4, aircraftType: 'MiG-23M', nation: 'USSR' },
        { minRoll: 5, maxRoll: 6, aircraftType: 'MiG-23MLA', nation: 'USSR' },
        { minRoll: 7, maxRoll: 8, aircraftType: 'MiG-23MLD', nation: 'USSR' },
        { minRoll: 9, maxRoll: 10, aircraftType: 'MiG-29A', nation: 'USSR' },
      ],
      maxRealFlights: 4,
    }],
    samActivation: {
      zones: [
        { name: 'Frontal', warningLocations: [
          { hex: '5302', radarOn: true }, { hex: '5305', radarOn: true },
          { hex: '5507', radarOn: true }, { hex: '5509', radarOn: true },
          { hex: '5511', radarOn: true }, { hex: '5514', radarOn: true },
          { hex: '5416', radarOn: true },
        ], typeTable: [
          { minRoll: 1, maxRoll: 7, samType: 'SA-13' },
          { minRoll: 8, maxRoll: 10, samType: 'SA-8' },
        ]},
        { name: 'Divisional', warningLocations: [
          { hex: '5604', radarOn: true }, { hex: '5708', radarOn: true },
          { hex: '5805', radarOn: true }, { hex: '5610', radarOn: true },
          { hex: '5613', radarOn: true }, { hex: '5715', radarOn: true },
          { hex: '5902', radarOn: true }, { hex: '5909', radarOn: true },
          { hex: '5913', radarOn: true },
        ], typeTable: [
          { minRoll: 1, maxRoll: 4, samType: 'SA-8' },
          { minRoll: 5, maxRoll: 10, samType: 'SA-11' },
        ]},
        { name: 'Corps/Army', warningLocations: [
          { hex: '6202', radarOn: true }, { hex: '6215', radarOn: true },
          { hex: '6310', radarOn: true }, { hex: '6503', radarOn: true },
          { hex: '6509', radarOn: true }, { hex: '6513', radarOn: true },
        ], typeTable: [
          { minRoll: 1, maxRoll: 7, samType: 'SA-4' },
          { minRoll: 8, maxRoll: 10, samType: 'SA-12' },
        ]},
      ],
      maxTypes: { 'SA-2': 1, 'SA-4': 4, 'SA-8': 3, 'SA-11': 3, 'SA-12': 1, 'SA-13': 6 },
    },
    aaaActivation: {
      locations: [
        { hex: '5505' }, { hex: '5508' }, { hex: '5512' }, { hex: '5603' },
        { hex: '5905' }, { hex: '5911' }, { hex: '6110' },
      ],
      typeTable: [
        { minRoll: 1, maxRoll: 3, aaaType: '2k22' },
        { minRoll: 4, maxRoll: 6, aaaType: 'concentration' },
        { minRoll: 7, maxRoll: 10, aaaType: 'concentration_firecan', hasFireCan: true },
      ],
      maxTypes: {},
    },
  },
  ssrs: [
    'Large scenario. ISR condition is Exceptional.',
    'Bot flights that land due to Winchester may rearm/refuel and takeoff again.',
  ],
  victoryType: 'standard',
  victoryDescription: 'Standard VP. NATO Victory Level Table.',
};
