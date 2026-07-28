/**
 * RS Solo Scenario B: Fighter Sweep
 * Reference: Scenario Book page 55
 */
import { ScenarioDefinition } from './scenarioTypes';

export const RS_SOLO_B: ScenarioDefinition = {
  id: 'rs-solo-b',
  name: 'RS Solo B: Fighter Sweep',
  subtitle: 'Mass WP Fighter Sweep',
  description: 'WP launches a mass fighter sweep to knock out NATO fighters. Human plays WP.',
  background: 'Hundreds of Soviet and East German aircraft take off and push toward the border at supersonic speeds. WP planners count on surprise and numbers to overcome NATO technical advantages.',
  category: 'solo', size: 'large',
  date: '15 May 1987', timeOfDay: '1600', dayNight: 'day', moonPhase: null,
  playArea: { minCol: 0, maxCol: 79, minRow: 0, maxRow: 50 },
  front: [
    { col: 63, row: 2 }, { col: 63, row: 9 }, { col: 53, row: 14 },
    { col: 53, row: 16 }, { col: 57, row: 18 }, { col: 57, row: 21 },
    { col: 55, row: 22 }, { col: 55, row: 31 }, { col: 56, row: 31 },
    { col: 56, row: 33 }, { col: 69, row: 40 }, { col: 69, row: 35 },
    { col: 75, row: 38 }, { col: 77, row: 37 },
  ],
  natoDetectionLevel: 'C', wpDetectionLevel: 'B',
  weather: 'clear', maxTurns: 15,
  humanSide: 'wp', isSoloScenario: true,
  closedAirfields: [],
  inherentAAA: { side: 'nato', rangeFromFront: 7 },
  isr: { side: null }, sead: { side: null },
  earlyWarning: { side: null, surpriseAttack: true },
  natoAirDefenseZone: '2ATAF/4ATAF',
  flightRestrictions: [
    { side: 'nato', description: 'NATO flights locked in setup hexes at Deck until detected WP flight on/west of Front.' },
    { side: 'wp', description: 'Once on NATO side, maintain due west heading at High until within 10 hexes of detected NATO flight or engaged. Restriction lifted at hex column 40xx.' },
  ],
  zoneLimits: [
    { side: 'nato', description: 'May not move within 5 hexes of Front.', distFromFront: 5 },
  ],
  natoOOB: {
    flights: [], // 16 generic flights set up per scenario
    groundUnits: [
      { id: 'EWR-1', type: 'ewr', subType: 'EWR', hex: '4706', located: true, radarOn: true },
      { id: 'EWR-2', type: 'ewr', subType: 'EWR', hex: '4215', located: true, radarOn: true },
      { id: 'EWR-3', type: 'ewr', subType: 'EWR', hex: '4224', located: true, radarOn: true },
      { id: 'EWR-4', type: 'ewr', subType: 'EWR', hex: '4239', located: true, radarOn: true },
      { id: 'EWR-5', type: 'ewr', subType: 'EWR', hex: '5748', located: true, radarOn: true },
    ],
    orbitPoints: [{ col: 34, row: 7 }, { col: 34, row: 18 }, { col: 34, row: 29 }, { col: 34, row: 47 }],
    rallyPoints: [],
    dummyFlights: 0,
    pilotQuality: { 'US_UK': 'veteran', 'other': 'regular' },
    botFlightActivation: [{
      task: 'cap', count: 2,
      activationTable: [
        { minRoll: 1, maxRoll: 4, aircraftType: 'F-15C', nation: 'US' },
        { minRoll: 5, maxRoll: 6, aircraftType: 'FGR2', nation: 'UK' },
        { minRoll: 7, maxRoll: 8, aircraftType: 'F-16A', nation: 'BE' },
        { minRoll: 9, maxRoll: 10, aircraftType: 'F-4F', nation: 'FRG' },
      ],
      maxRealFlights: 10,
    }],
  },
  wpOOB: {
    flights: [
      // 4 x OOB Table H (Fighter Sweep) — generated at setup
      { id: 'SWEEP-1', aircraftType: 'MiG-29A', nation: 'USSR', task: 'cap', count: 4, aggressionValue: 1, setupType: 'onMap', setupAltitude: 'high' },
      { id: 'SWEEP-2', aircraftType: 'Su-27', nation: 'USSR', task: 'cap', count: 4, aggressionValue: 1, setupType: 'onMap', setupAltitude: 'high' },
      { id: 'SWEEP-3', aircraftType: 'MiG-23MLD', nation: 'USSR', task: 'cap', count: 4, aggressionValue: 0, setupType: 'onMap', setupAltitude: 'high' },
      { id: 'SWEEP-4', aircraftType: 'MiG-29A', nation: 'USSR', task: 'cap', count: 4, aggressionValue: 1, setupType: 'onMap', setupAltitude: 'high' },
    ],
    groundUnits: [
      { id: 'EWR-W1', type: 'ewr', subType: 'EWR', hex: '6602', located: true, radarOn: true },
      { id: 'EWR-W2', type: 'ewr', subType: 'EWR', hex: '6214', located: true, radarOn: true },
      { id: 'EWR-W3', type: 'ewr', subType: 'EWR', hex: '6124', located: true, radarOn: true },
      { id: 'EWR-W4', type: 'ewr', subType: 'EWR', hex: '6732', located: true, radarOn: true },
    ],
    orbitPoints: [{ col: 73, row: 9 }, { col: 73, row: 15 }, { col: 73, row: 20 }, { col: 73, row: 26 }],
    rallyPoints: [],
    dummyFlights: 0,
    pilotQuality: { 'USSR_MiG29_Su27': 'veteran', 'USSR_other': 'regular', 'GDR': 'trained' },
  },
  ssrs: [
    'Scenario ends at end of Turn 15.',
    'Bot flights that land due to Winchester may rearm/refuel and takeoff again.',
  ],
  victoryType: 'custom',
  victoryDescription: 'Standard VP. WP gets 20VP if all NATO flights disordered/aborted/landed/recovered at end of Turn 15. NATO gets 10VP bonus if 4+ WP aircraft shot down with 3:1+ kill ratio. WP Victory Level Table.',
};
