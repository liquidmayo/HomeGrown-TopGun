/**
 * RS Solo Scenario C: HAWK Belt
 * Reference: Scenario Book page 57
 */
import { ScenarioDefinition } from './scenarioTypes';

export const RS_SOLO_C: ScenarioDefinition = {
  id: 'rs-solo-c',
  name: 'RS Solo C: HAWK Belt',
  subtitle: 'WP SEAD Against NATO HAWKs',
  description: 'WP SEAD aircraft target NATO HAWK sites behind the front. Human plays WP.',
  background: 'WP SEAD doctrine requires a mass approach: chaff, jamming, and ARM barrages to create sanitized corridors for follow-up deep strikes.',
  category: 'solo', size: 'large',
  date: '16 May 1987', timeOfDay: '1300', dayNight: 'day', moonPhase: null,
  playArea: { minCol: 24, maxCol: 79, minRow: 0, maxRow: 16 },
  front: [
    { col: 63, row: 2 }, { col: 63, row: 9 }, { col: 53, row: 14 }, { col: 53, row: 16 },
  ],
  natoDetectionLevel: 'D', wpDetectionLevel: 'C',
  weather: 'roll_good', maxTurns: null,
  humanSide: 'wp', isSoloScenario: true,
  closedAirfields: [],
  inherentAAA: { side: 'nato', rangeFromFront: 5 },
  isr: { side: 'wp' }, sead: { side: null },
  earlyWarning: { side: null, surpriseAttack: true },
  natoAirDefenseZone: '2ATAF',
  flightRestrictions: [
    { side: 'wp', description: 'May not fly at Low or Deck within 5 hexes of Front.' },
    { side: 'nato', description: 'Locked in setup hexes at Deck until WP flight enters hex column 50xx or west.' },
  ],
  zoneLimits: [
    { side: 'nato', description: 'May not move within 5 hexes of Front.', distFromFront: 5 },
  ],
  natoOOB: {
    flights: [],
    groundUnits: [
      { id: 'HAWK-C1', type: 'sam', subType: 'HAWK_C', hex: '4404', located: true, radarOn: true },
      { id: 'HAWK-C2', type: 'sam', subType: 'HAWK_C', hex: '4408', located: true, radarOn: true },
      { id: 'HAWK-D1', type: 'sam', subType: 'HAWK_D', hex: '4013', located: true, radarOn: true },
      { id: 'HAWK-D2', type: 'sam', subType: 'HAWK_D', hex: '4512', located: true, radarOn: true },
      { id: 'PAT-1', type: 'sam', subType: 'Patriot', hex: '4004', located: true, radarOn: true },
      { id: 'EWR-1', type: 'ewr', subType: 'EWR', hex: '4706', located: true, radarOn: true },
      { id: 'EWR-2', type: 'ewr', subType: 'EWR', hex: '4215', located: true, radarOn: true },
    ],
    orbitPoints: [{ col: 28, row: 5 }, { col: 28, row: 12 }],
    rallyPoints: [],
    dummyFlights: 0,
    pilotQuality: { 'US_F15_F16': 'ace', 'US_UK': 'veteran', 'other': 'regular' },
    botFlightActivation: [{
      task: 'cap', count: 2,
      activationTable: [
        { minRoll: 1, maxRoll: 2, aircraftType: 'F-15C', nation: 'US' },
        { minRoll: 3, maxRoll: 5, aircraftType: 'FGR2', nation: 'UK' },
        { minRoll: 6, maxRoll: 7, aircraftType: 'F-16A', nation: 'BE' },
        { minRoll: 8, maxRoll: 10, aircraftType: 'F-4F', nation: 'FRG' },
      ],
      maxRealFlights: 4,
    }],
    samActivation: {
      zones: [
        { name: 'Frontal', warningLocations: [
          { hex: '5303', radarOn: true }, { hex: '5105', radarOn: true },
          { hex: '5308', radarOn: true }, { hex: '5111', radarOn: true },
          { hex: '5215', radarOn: true },
        ], typeTable: [
          { minRoll: 1, maxRoll: 7, samType: 'Roland_2' },
          { minRoll: 8, maxRoll: 10, samType: 'HAWK_C' },
        ]},
        { name: 'Divisional', warningLocations: [
          { hex: '4703', radarOn: true }, { hex: '4608', radarOn: true },
          { hex: '4611', radarOn: true }, { hex: '4515', radarOn: true },
          { hex: '4106', radarOn: true }, { hex: '4010', radarOn: true },
          { hex: '4015', radarOn: true },
        ], typeTable: [
          { minRoll: 1, maxRoll: 5, samType: 'HAWK_C' },
          { minRoll: 6, maxRoll: 8, samType: 'HAWK_D' },
          { minRoll: 9, maxRoll: 10, samType: 'Rapier' },
        ]},
        { name: 'Corps/Army', warningLocations: [
          { hex: '2503', radarOn: true }, { hex: '2706', radarOn: true },
          { hex: '2509', radarOn: true }, { hex: '2612', radarOn: true },
        ], typeTable: [
          { minRoll: 1, maxRoll: 8, samType: 'Nike_Hercules' },
          { minRoll: 9, maxRoll: 10, samType: 'Patriot' },
        ]},
      ],
      maxTypes: { 'Nike_Hercules': 2, 'Patriot': 2, 'HAWK_C': 8, 'HAWK_D': 8, 'Roland_2': 5, 'Rapier': 2 },
    },
  },
  wpOOB: {
    flights: [],  // Generated from OOB Tables H and J
    groundUnits: [
      { id: 'SA-12-1', type: 'sam', subType: 'SA-12', hex: '7310', located: true, radarOn: true },
      { id: 'SA-12-2', type: 'sam', subType: 'SA-12', hex: '7005', located: true, radarOn: true },
      { id: 'EWR-W1', type: 'ewr', subType: 'EWR', hex: '6802', located: true, radarOn: true },
      { id: 'EWR-W2', type: 'ewr', subType: 'EWR', hex: '6515', located: true, radarOn: true },
    ],
    orbitPoints: [{ col: 66, row: 5 }, { col: 66, row: 12 }],
    rallyPoints: [{ col: 40, row: 5 }, { col: 40, row: 12 }],
    dummyFlights: 0,
    pilotQuality: { 'USSR_MiG29_Su27': 'veteran', 'USSR_other': 'regular', 'GDR': 'trained' },
  },
  ssrs: [
    'Large scenario. Only SAMs on/east of hex column 40xx may be checked during ISR.',
    'HAWK Sites have sub-targets: Command Center (B), Launchers (C), Fire Control Radar (D).',
    'Pre-Game Chaff Laying: WP may place one bloomed chaff corridor on/east of hex column 48xx.',
    'Bot flights that land due to Winchester may rearm/refuel and takeoff again.',
  ],
  victoryType: 'standard',
  victoryDescription: 'Standard VP. See 32.11 for SAM target VP. WP Victory Level Table.',
};
