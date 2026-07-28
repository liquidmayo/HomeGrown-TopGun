/**
 * Scenarios RS2 through RS10 — configured as Player (NATO) vs AI (WP).
 *
 * Each scenario uses the Full Solitaire Play rules with the human
 * playing NATO and the bot controlling WP forces.
 *
 * Reference: Scenario Book pages 3-16
 */

import { ScenarioDefinition } from './scenarioTypes';

// ── RS2: Operation Boloski ───────────────────────────────────────

export const RS02: ScenarioDefinition = {
  id: 'rs02',
  name: 'RS2: Operation Boloski',
  subtitle: 'Mass WP Fighter Sweep',
  description: 'WP launches a mass fighter sweep to knock out NATO fighters on the opening day of the war. NATO must scramble to intercept.',
  background: 'On the afternoon of 15 May 1987, hundreds of Soviet and East German aircraft take off and push toward the border. NATO scrambles every available fighter.',
  category: 'standard', size: 'large',
  date: '15 May 1987', timeOfDay: '1300', dayNight: 'day', moonPhase: null,
  playArea: { minCol: 0, maxCol: 79, minRow: 0, maxRow: 50 },
  front: [
    { col: 63, row: 2 }, { col: 63, row: 9 }, { col: 53, row: 14 }, { col: 53, row: 16 },
    { col: 57, row: 18 }, { col: 57, row: 21 }, { col: 55, row: 22 }, { col: 55, row: 31 },
    { col: 56, row: 31 }, { col: 56, row: 33 }, { col: 69, row: 40 }, { col: 69, row: 35 },
    { col: 75, row: 38 }, { col: 77, row: 37 },
  ],
  natoDetectionLevel: 'C', wpDetectionLevel: 'B',
  weather: 'clear', maxTurns: 15,
  humanSide: 'nato', isSoloScenario: false,
  closedAirfields: [],
  inherentAAA: null,
  isr: { side: null }, sead: { side: null },
  earlyWarning: { side: null, surpriseAttack: true },
  natoAirDefenseZone: '2ATAF/4ATAF',
  flightRestrictions: [
    { side: 'nato', description: 'CAP flights must remain within 2 hexes of Orbit Point until detected WP flight on NATO side of Front. QRA may not take off until same condition.' },
  ],
  zoneLimits: [
    { side: 'nato', description: 'May not voluntarily move within 5 hexes of Front.', distFromFront: 5 },
  ],
  natoOOB: {
    flights: [
      // 2ATAF QRA
      { id: 'QRA-1', aircraftType: 'F-4E', nation: 'US', task: 'cap', count: 2, aggressionValue: 1, setupType: 'qra', setupHex: '1603' },
      { id: 'QRA-2', aircraftType: 'FGR2', nation: 'UK', task: 'cap', count: 2, aggressionValue: 1, setupType: 'qra', setupHex: '1908' },
      // 2ATAF CAP
      { id: 'CAP-1', aircraftType: 'F-15C', nation: 'US', task: 'cap', count: 2, aggressionValue: 2, setupType: 'onMap', setupAltitude: 'medium', setupHex: '3407' },
      { id: 'CAP-2', aircraftType: 'F-16A', nation: 'BE', task: 'cap', count: 2, aggressionValue: 1, setupType: 'onMap', setupAltitude: 'medium', setupHex: '3418' },
      // 4ATAF QRA
      { id: 'QRA-3', aircraftType: 'F-4F', nation: 'FRG', task: 'cap', count: 2, aggressionValue: 0, setupType: 'qra', setupHex: '3253' },
      { id: 'QRA-4', aircraftType: 'F-15C', nation: 'US', task: 'cap', count: 2, aggressionValue: 2, setupType: 'qra', setupHex: '2328' },
      // 4ATAF CAP
      { id: 'CAP-3', aircraftType: 'F-15C', nation: 'US', task: 'cap', count: 2, aggressionValue: 2, setupType: 'onMap', setupAltitude: 'medium', setupHex: '3429' },
      { id: 'CAP-4', aircraftType: 'F-4F', nation: 'FRG', task: 'cap', count: 2, aggressionValue: 0, setupType: 'onMap', setupAltitude: 'medium', setupHex: '3447' },
    ],
    groundUnits: [
      { id: 'GEP-1', type: 'mobileAAA', subType: 'Gepard', hex: '4505', located: true, radarOn: false },
      { id: 'GEP-2', type: 'mobileAAA', subType: 'Gepard', hex: '4514', located: true, radarOn: false },
      { id: 'GEP-3', type: 'mobileAAA', subType: 'Gepard', hex: '4521', located: true, radarOn: false },
      { id: 'VUL-1', type: 'mobileAAA', subType: 'Vulcan', hex: '5126', located: true, radarOn: false },
      { id: 'VUL-2', type: 'mobileAAA', subType: 'Vulcan', hex: '5032', located: true, radarOn: false },
      { id: 'VUL-3', type: 'mobileAAA', subType: 'Vulcan', hex: '5536', located: true, radarOn: false },
      { id: 'VUL-4', type: 'mobileAAA', subType: 'Vulcan', hex: '5943', located: true, radarOn: false },
      { id: 'EWR-1', type: 'ewr', subType: 'EWR', hex: '4706', located: true, radarOn: true },
      { id: 'EWR-2', type: 'ewr', subType: 'EWR', hex: '4413', located: true, radarOn: true },
      { id: 'EWR-3', type: 'ewr', subType: 'EWR', hex: '4224', located: true, radarOn: true },
      { id: 'EWR-4', type: 'ewr', subType: 'EWR', hex: '4235', located: true, radarOn: true },
      { id: 'EWR-5', type: 'ewr', subType: 'EWR', hex: '4544', located: true, radarOn: true },
      { id: 'EWR-6', type: 'ewr', subType: 'EWR', hex: '5449', located: true, radarOn: true },
    ],
    orbitPoints: [{ col: 34, row: 7 }, { col: 34, row: 18 }, { col: 34, row: 29 }, { col: 34, row: 47 }],
    rallyPoints: [], dummyFlights: 3,
    pilotQuality: { 'US_F15_F16': 'ace', 'US_UK': 'veteran', 'other': 'regular' },
  },
  wpOOB: {
    flights: [
      { id: 'SWEEP-1', aircraftType: 'MiG-29A', nation: 'USSR', task: 'cap', count: 4, aggressionValue: 1, setupType: 'onMap', setupHex: '7005', setupAltitude: 'high' },
      { id: 'SWEEP-2', aircraftType: 'MiG-29A', nation: 'USSR', task: 'cap', count: 4, aggressionValue: 1, setupType: 'onMap', setupHex: '7014', setupAltitude: 'high' },
      { id: 'SWEEP-3', aircraftType: 'MiG-23MLD', nation: 'USSR', task: 'cap', count: 4, aggressionValue: 0, setupType: 'onMap', setupHex: '7020', setupAltitude: 'high' },
      { id: 'SWEEP-4', aircraftType: 'MiG-21bis', nation: 'GDR', task: 'cap', count: 4, aggressionValue: -1, setupType: 'onMap', setupHex: '7028', setupAltitude: 'high' },
    ],
    groundUnits: [
      { id: 'EWR-W1', type: 'ewr', subType: 'EWR', hex: '6602', located: true, radarOn: true },
      { id: 'EWR-W2', type: 'ewr', subType: 'EWR', hex: '6214', located: true, radarOn: true },
      { id: 'EWR-W3', type: 'ewr', subType: 'EWR', hex: '6124', located: true, radarOn: true },
      { id: 'EWR-W4', type: 'ewr', subType: 'EWR', hex: '6732', located: true, radarOn: true },
    ],
    orbitPoints: [{ col: 70, row: 5 }, { col: 70, row: 14 }, { col: 70, row: 20 }, { col: 70, row: 28 }],
    rallyPoints: [], dummyFlights: 4,
    pilotQuality: { 'USSR_MiG29_Su27': 'veteran', 'USSR_other': 'regular', 'GDR': 'trained' },
  },
  ssrs: ['Scenario ends at end of Turn 15.', 'WP flights must maintain due west heading at High until within 10 hexes of detected NATO flight or engaged. Restriction lifts at hex column 44xx.'],
  victoryType: 'custom',
  victoryDescription: 'Standard VP. WP gets 20VP if all NATO flights disordered/aborted/landed at end of Turn 15. NATO gets 10VP bonus if 4+ WP aircraft downed with 3:1+ kill ratio. WP Victory Level Table.',
};

// ── RS3: First Strike ────────────────────────────────────────────

export const RS03: ScenarioDefinition = {
  id: 'rs03', name: 'RS3: First Strike', subtitle: 'WP Ground Attack Wave',
  description: 'WP sends a massive ground attack wave against NATO rear area targets. NATO must intercept with CAP and SEAD.',
  background: 'Right behind the fighter sweep, WP commanders send ground attack missions striking rear area reserves, headquarters, artillery, and supply centers.',
  category: 'standard', size: 'large',
  date: '15 May 1987', timeOfDay: '1500', dayNight: 'day', moonPhase: null,
  playArea: { minCol: 25, maxCol: 79, minRow: 10, maxRow: 30 },
  front: [{ col: 63, row: 10 }, { col: 53, row: 14 }, { col: 53, row: 16 }, { col: 57, row: 18 }, { col: 57, row: 21 }, { col: 55, row: 22 }, { col: 55, row: 30 }],
  natoDetectionLevel: 'D', wpDetectionLevel: 'B',
  weather: 'clear', maxTurns: 15,
  humanSide: 'nato', isSoloScenario: false,
  closedAirfields: [], inherentAAA: null,
  isr: { side: null }, sead: { side: null },
  earlyWarning: { side: null, surpriseAttack: true },
  natoAirDefenseZone: '2ATAF/4ATAF',
  flightRestrictions: [{ side: 'nato', description: 'CAP must stay within 2 hexes of orbit until WP detected on NATO side.' }],
  zoneLimits: [{ side: 'nato', description: 'May not move within 5 hexes of Front.', distFromFront: 5 }],
  natoOOB: {
    flights: [
      { id: 'CAP-1', aircraftType: 'F-15C', nation: 'US', task: 'cap', count: 2, aggressionValue: 2, setupType: 'onMap', setupAltitude: 'medium', setupHex: '3515' },
      { id: 'CAP-2', aircraftType: 'F-15C', nation: 'US', task: 'cap', count: 2, aggressionValue: 2, setupType: 'onMap', setupAltitude: 'medium', setupHex: '3525' },
      { id: 'CAP-3', aircraftType: 'F-4F', nation: 'FRG', task: 'cap', count: 2, aggressionValue: 0, setupType: 'onMap', setupAltitude: 'medium', setupHex: '3520' },
      { id: 'QRA-1', aircraftType: 'F-16A', nation: 'BE', task: 'cap', count: 2, aggressionValue: 1, setupType: 'qra', setupHex: '2533' },
    ],
    groundUnits: [
      { id: 'HAWK-1', type: 'sam', subType: 'HAWK_C', hex: '4516', located: true, radarOn: true },
      { id: 'HAWK-2', type: 'sam', subType: 'HAWK_C', hex: '4520', located: true, radarOn: true },
      { id: 'HAWK-3', type: 'sam', subType: 'HAWK_D', hex: '4225', located: true, radarOn: true },
      { id: 'EWR-1', type: 'ewr', subType: 'EWR', hex: '4413', located: true, radarOn: true },
      { id: 'EWR-2', type: 'ewr', subType: 'EWR', hex: '4224', located: true, radarOn: true },
      { id: 'GEP-1', type: 'mobileAAA', subType: 'Gepard', hex: '4712', located: true, radarOn: false },
      { id: 'GEP-2', type: 'mobileAAA', subType: 'Gepard', hex: '4818', located: true, radarOn: false },
    ],
    orbitPoints: [{ col: 35, row: 15 }, { col: 35, row: 25 }],
    rallyPoints: [], dummyFlights: 2,
    pilotQuality: { 'US_F15_F16': 'ace', 'US_UK': 'veteran', 'other': 'regular' },
  },
  wpOOB: {
    flights: [
      { id: 'STRIKE-1', aircraftType: 'Su-24MR', nation: 'USSR', task: 'bombing', count: 4, aggressionValue: 0, setupType: 'onMap', setupHex: '7015', setupAltitude: 'low' },
      { id: 'STRIKE-2', aircraftType: 'MiG-27', nation: 'USSR', task: 'bombing', count: 4, aggressionValue: 0, setupType: 'onMap', setupHex: '7020', setupAltitude: 'low' },
      { id: 'ESCORT-1', aircraftType: 'MiG-29A', nation: 'USSR', task: 'cap', count: 2, aggressionValue: 1, setupType: 'onMap', setupHex: '7012', setupAltitude: 'medium' },
      { id: 'ESCORT-2', aircraftType: 'MiG-23MLD', nation: 'USSR', task: 'cap', count: 4, aggressionValue: 0, setupType: 'onMap', setupHex: '7022', setupAltitude: 'medium' },
      { id: 'SEAD-1', aircraftType: 'MiG-25BM', nation: 'USSR', task: 'sead', count: 2, aggressionValue: 0, setupType: 'onMap', setupHex: '7018', setupAltitude: 'high' },
    ],
    groundUnits: [
      { id: 'SA-6-1', type: 'sam', subType: 'SA-6', hex: '5815', located: true, radarOn: true },
      { id: 'SA-11-1', type: 'sam', subType: 'SA-11', hex: '6018', located: true, radarOn: true },
      { id: 'EWR-W1', type: 'ewr', subType: 'EWR', hex: '6214', located: true, radarOn: true },
      { id: 'EWR-W2', type: 'ewr', subType: 'EWR', hex: '6124', located: true, radarOn: true },
    ],
    orbitPoints: [{ col: 70, row: 15 }, { col: 70, row: 20 }],
    rallyPoints: [], dummyFlights: 3,
    pilotQuality: { 'USSR_MiG29_Su27': 'veteran', 'USSR_other': 'regular', 'GDR': 'trained' },
  },
  ssrs: ['Scenario ends at end of Turn 15.'],
  victoryType: 'standard', victoryDescription: 'Standard VP. WP scores raid target VP for ground hits. WP Victory Level Table.',
};

// ── RS4-RS10: Concise definitions ────────────────────────────────

export const RS04: ScenarioDefinition = {
  id: 'rs04', name: 'RS4: Opening Rounds', subtitle: 'WP Airfield Strike',
  description: 'WP strikes NATO airfields to destroy aircraft on the ground.',
  background: 'WP commanders target NATO airfields to gain air superiority by destroying aircraft before they can take off.',
  category: 'standard', size: 'large',
  date: '16 May 1987', timeOfDay: '0600', dayNight: 'day', moonPhase: null,
  playArea: { minCol: 25, maxCol: 79, minRow: 10, maxRow: 22 },
  front: [{ col: 63, row: 10 }, { col: 53, row: 14 }, { col: 53, row: 16 }, { col: 57, row: 18 }, { col: 57, row: 21 }, { col: 55, row: 22 }],
  natoDetectionLevel: 'D', wpDetectionLevel: 'B', weather: 'roll_good', maxTurns: 15,
  humanSide: 'nato', isSoloScenario: false,
  closedAirfields: [{ hex: '5126', aaaActive: true }, { hex: '5032', aaaActive: true }],
  inherentAAA: null, isr: { side: null }, sead: { side: null },
  earlyWarning: { side: null, surpriseAttack: true }, natoAirDefenseZone: '2ATAF',
  flightRestrictions: [{ side: 'nato', description: 'CAP locked until WP detected on NATO side of Front.' }],
  zoneLimits: [{ side: 'nato', description: 'May not move within 5 hexes of Front.', distFromFront: 5 }],
  natoOOB: {
    flights: [
      { id: 'CAP-1', aircraftType: 'F-15C', nation: 'US', task: 'cap', count: 2, aggressionValue: 2, setupType: 'onMap', setupAltitude: 'medium', setupHex: '3515' },
      { id: 'CAP-2', aircraftType: 'F-4F', nation: 'FRG', task: 'cap', count: 2, aggressionValue: 0, setupType: 'onMap', setupAltitude: 'medium', setupHex: '3518' },
      { id: 'QRA-1', aircraftType: 'F-15C', nation: 'US', task: 'cap', count: 2, aggressionValue: 2, setupType: 'qra', setupHex: '4521' },
    ],
    groundUnits: [
      { id: 'HAWK-1', type: 'sam', subType: 'HAWK_C', hex: '4516', located: true, radarOn: true },
      { id: 'HAWK-2', type: 'sam', subType: 'HAWK_D', hex: '4020', located: true, radarOn: true },
      { id: 'EWR-1', type: 'ewr', subType: 'EWR', hex: '4413', located: true, radarOn: true },
    ],
    orbitPoints: [{ col: 35, row: 15 }, { col: 35, row: 18 }], rallyPoints: [], dummyFlights: 2,
    pilotQuality: { 'US_F15_F16': 'ace', 'US_UK': 'veteran', 'other': 'regular' },
  },
  wpOOB: {
    flights: [
      { id: 'BOMB-1', aircraftType: 'Su-24MR', nation: 'USSR', task: 'bombing', count: 4, aggressionValue: 0, setupType: 'onMap', setupHex: '7015', setupAltitude: 'low' },
      { id: 'BOMB-2', aircraftType: 'MiG-27', nation: 'USSR', task: 'bombing', count: 4, aggressionValue: 0, setupType: 'onMap', setupHex: '7018', setupAltitude: 'low' },
      { id: 'ESC-1', aircraftType: 'MiG-29A', nation: 'USSR', task: 'cap', count: 2, aggressionValue: 1, setupType: 'onMap', setupHex: '7013', setupAltitude: 'high' },
      { id: 'ESC-2', aircraftType: 'MiG-23MLD', nation: 'USSR', task: 'closeEscort', count: 4, aggressionValue: 0, setupType: 'onMap', setupHex: '7016', setupAltitude: 'medium' },
    ],
    groundUnits: [
      { id: 'SA-6-1', type: 'sam', subType: 'SA-6', hex: '5815', located: true, radarOn: true },
      { id: 'EWR-W1', type: 'ewr', subType: 'EWR', hex: '6214', located: true, radarOn: true },
    ],
    orbitPoints: [{ col: 70, row: 15 }], rallyPoints: [], dummyFlights: 2,
    pilotQuality: { 'USSR_MiG29_Su27': 'veteran', 'USSR_other': 'regular', 'GDR': 'trained' },
  },
  ssrs: ['Scenario ends at end of Turn 15.'], victoryType: 'standard', victoryDescription: 'Standard VP. WP scores for airfield damage. NATO Victory Level Table.',
};

export const RS05: ScenarioDefinition = {
  id: 'rs05', name: 'RS5: Vertical Envelopment', subtitle: 'WP Air Assault',
  description: 'WP conducts an air assault with helicopter transport, covered by fighter escort. NATO must intercept.',
  background: 'WP airborne forces attempt a vertical envelopment behind NATO lines using helicopter transport.',
  category: 'standard', size: 'large',
  date: '16 May 1987', timeOfDay: '1000', dayNight: 'day', moonPhase: null,
  playArea: { minCol: 25, maxCol: 79, minRow: 10, maxRow: 22 },
  front: [{ col: 63, row: 10 }, { col: 53, row: 14 }, { col: 53, row: 16 }, { col: 57, row: 18 }, { col: 57, row: 21 }, { col: 55, row: 22 }],
  natoDetectionLevel: 'D', wpDetectionLevel: 'B', weather: 'roll_good', maxTurns: 15,
  humanSide: 'nato', isSoloScenario: false,
  closedAirfields: [{ hex: '5126', aaaActive: true }, { hex: '5032', aaaActive: true }],
  inherentAAA: null, isr: { side: null }, sead: { side: null },
  earlyWarning: { side: null, surpriseAttack: false }, natoAirDefenseZone: '2ATAF',
  flightRestrictions: [], zoneLimits: [{ side: 'nato', description: 'May not move within 3 hexes of Front.', distFromFront: 3 }],
  natoOOB: {
    flights: [
      { id: 'CAP-1', aircraftType: 'F-15C', nation: 'US', task: 'cap', count: 2, aggressionValue: 2, setupType: 'onMap', setupAltitude: 'medium', setupHex: '3515' },
      { id: 'CAP-2', aircraftType: 'F-4E', nation: 'US', task: 'cap', count: 2, aggressionValue: 1, setupType: 'onMap', setupAltitude: 'medium', setupHex: '3520' },
      { id: 'CAP-3', aircraftType: 'F-4F', nation: 'FRG', task: 'cap', count: 2, aggressionValue: 0, setupType: 'onMap', setupAltitude: 'low', setupHex: '4015' },
    ],
    groundUnits: [
      { id: 'HAWK-1', type: 'sam', subType: 'HAWK_C', hex: '4516', located: true, radarOn: true },
      { id: 'HAWK-2', type: 'sam', subType: 'HAWK_C', hex: '4520', located: true, radarOn: true },
      { id: 'EWR-1', type: 'ewr', subType: 'EWR', hex: '4413', located: true, radarOn: true },
    ],
    orbitPoints: [{ col: 35, row: 15 }, { col: 40, row: 15 }], rallyPoints: [], dummyFlights: 2,
    pilotQuality: { 'US_F15_F16': 'ace', 'US_UK': 'veteran', 'other': 'regular' },
  },
  wpOOB: {
    flights: [
      { id: 'ESC-1', aircraftType: 'MiG-29A', nation: 'USSR', task: 'cap', count: 2, aggressionValue: 1, setupType: 'onMap', setupHex: '6515', setupAltitude: 'high' },
      { id: 'ESC-2', aircraftType: 'MiG-23MLD', nation: 'USSR', task: 'closeEscort', count: 4, aggressionValue: 0, setupType: 'onMap', setupHex: '6518', setupAltitude: 'medium' },
      { id: 'TRANS-1', aircraftType: 'Mi-8', nation: 'USSR', task: 'transport', count: 4, aggressionValue: 0, setupType: 'onMap', setupHex: '6520', setupAltitude: 'deck' },
      { id: 'TRANS-2', aircraftType: 'Mi-8', nation: 'USSR', task: 'transport', count: 4, aggressionValue: 0, setupType: 'onMap', setupHex: '6522', setupAltitude: 'deck' },
    ],
    groundUnits: [
      { id: 'SA-8-1', type: 'sam', subType: 'SA-8', hex: '5815', located: true, radarOn: true },
      { id: 'SA-13-1', type: 'sam', subType: 'SA-13', hex: '5618', located: true, radarOn: false },
      { id: 'EWR-W1', type: 'ewr', subType: 'EWR', hex: '6214', located: true, radarOn: true },
    ],
    orbitPoints: [{ col: 65, row: 15 }], rallyPoints: [], dummyFlights: 2,
    pilotQuality: { 'USSR_MiG29_Su27': 'veteran', 'USSR_other': 'regular', 'GDR': 'trained' },
  },
  ssrs: ['Scenario ends at end of Turn 15.', 'WP Transport helicopters must reach hex column 48xx or west to deliver troops.'],
  victoryType: 'custom', victoryDescription: 'WP scores 5VP per surviving helicopter that reaches target zone. Standard air-to-air VP. NATO Victory Level Table.',
};

export const RS06: ScenarioDefinition = {
  id: 'rs06', name: 'RS6: Sanitized Corridors', subtitle: 'WP SEAD Corridor',
  description: 'WP SEAD aircraft attempt to suppress NATO air defenses to create safe corridors for follow-on strikes.',
  background: 'WP SEAD doctrine requires creating "sanitized corridors" through NATO\'s HAWK belt using chaff, jamming, and ARM barrages.',
  category: 'standard', size: 'large',
  date: '16 May 1987', timeOfDay: '1200', dayNight: 'day', moonPhase: null,
  playArea: { minCol: 25, maxCol: 79, minRow: 0, maxRow: 22 },
  front: [{ col: 63, row: 2 }, { col: 63, row: 9 }, { col: 53, row: 14 }, { col: 53, row: 16 }, { col: 57, row: 18 }, { col: 57, row: 21 }, { col: 55, row: 22 }],
  natoDetectionLevel: 'D', wpDetectionLevel: 'C', weather: 'roll_good', maxTurns: null,
  humanSide: 'nato', isSoloScenario: false,
  closedAirfields: [], inherentAAA: { side: 'nato', rangeFromFront: 5 },
  isr: { side: 'wp' }, sead: { side: null },
  earlyWarning: { side: null, surpriseAttack: true }, natoAirDefenseZone: '2ATAF',
  flightRestrictions: [{ side: 'nato', description: 'Locked until WP on/west of hex column 50xx.' }],
  zoneLimits: [{ side: 'nato', description: 'May not move within 5 hexes of Front.', distFromFront: 5 }],
  natoOOB: {
    flights: [
      { id: 'CAP-1', aircraftType: 'F-15C', nation: 'US', task: 'cap', count: 2, aggressionValue: 2, setupType: 'onMap', setupAltitude: 'deck', setupHex: '3010' },
      { id: 'CAP-2', aircraftType: 'F-4F', nation: 'FRG', task: 'cap', count: 2, aggressionValue: 0, setupType: 'onMap', setupAltitude: 'deck', setupHex: '3015' },
      { id: 'CAP-3', aircraftType: 'FGR2', nation: 'UK', task: 'cap', count: 2, aggressionValue: 1, setupType: 'onMap', setupAltitude: 'deck', setupHex: '3005' },
    ],
    groundUnits: [
      { id: 'HAWK-1', type: 'sam', subType: 'HAWK_C', hex: '4404', located: true, radarOn: true },
      { id: 'HAWK-2', type: 'sam', subType: 'HAWK_C', hex: '4408', located: true, radarOn: true },
      { id: 'HAWK-3', type: 'sam', subType: 'HAWK_D', hex: '4013', located: true, radarOn: true },
      { id: 'HAWK-4', type: 'sam', subType: 'HAWK_D', hex: '4512', located: true, radarOn: true },
      { id: 'PAT-1', type: 'sam', subType: 'Patriot', hex: '4004', located: true, radarOn: true },
      { id: 'EWR-1', type: 'ewr', subType: 'EWR', hex: '4706', located: true, radarOn: true },
      { id: 'EWR-2', type: 'ewr', subType: 'EWR', hex: '4215', located: true, radarOn: true },
    ],
    orbitPoints: [{ col: 30, row: 10 }, { col: 30, row: 15 }], rallyPoints: [], dummyFlights: 2,
    pilotQuality: { 'US_F15_F16': 'ace', 'US_UK': 'veteran', 'other': 'regular' },
  },
  wpOOB: {
    flights: [
      { id: 'SEAD-1', aircraftType: 'MiG-25BM', nation: 'USSR', task: 'sead', count: 2, aggressionValue: 0, setupType: 'onMap', setupHex: '7010', setupAltitude: 'high' },
      { id: 'SEAD-2', aircraftType: 'Su-24MR', nation: 'USSR', task: 'sead', count: 4, aggressionValue: 0, setupType: 'onMap', setupHex: '7008', setupAltitude: 'medium' },
      { id: 'ESC-1', aircraftType: 'MiG-29A', nation: 'USSR', task: 'cap', count: 2, aggressionValue: 1, setupType: 'onMap', setupHex: '7005', setupAltitude: 'high' },
      { id: 'ESC-2', aircraftType: 'MiG-23MLD', nation: 'USSR', task: 'cap', count: 4, aggressionValue: 0, setupType: 'onMap', setupHex: '7012', setupAltitude: 'high' },
    ],
    groundUnits: [
      { id: 'SA-12-1', type: 'sam', subType: 'SA-12', hex: '7310', located: true, radarOn: true },
      { id: 'SA-12-2', type: 'sam', subType: 'SA-12', hex: '7005', located: true, radarOn: true },
      { id: 'EWR-W1', type: 'ewr', subType: 'EWR', hex: '6802', located: true, radarOn: true },
    ],
    orbitPoints: [{ col: 70, row: 8 }], rallyPoints: [], dummyFlights: 2,
    pilotQuality: { 'USSR_MiG29_Su27': 'veteran', 'USSR_other': 'regular', 'GDR': 'trained' },
  },
  ssrs: ['WP SEAD flights target NATO HAWK and Patriot sites.'],
  victoryType: 'standard', victoryDescription: 'Standard VP with SAM target VP per 32.11. WP Victory Level Table.',
};

export const RS07: ScenarioDefinition = {
  id: 'rs07', name: 'RS7: Aerial Blockade', subtitle: 'NATO Air Superiority',
  description: 'NATO CAP flights attempt to establish air superiority over the front, blocking WP air operations.',
  background: 'NATO commanders order a maximum effort CAP mission to establish air superiority and block WP air operations over the front.',
  category: 'standard', size: 'large',
  date: '17 May 1987', timeOfDay: '0800', dayNight: 'day', moonPhase: null,
  playArea: { minCol: 41, maxCol: 79, minRow: 0, maxRow: 50 },
  front: [{ col: 63, row: 2 }, { col: 63, row: 9 }, { col: 53, row: 14 }, { col: 53, row: 16 }, { col: 57, row: 18 }, { col: 57, row: 21 }, { col: 55, row: 22 }, { col: 55, row: 31 }, { col: 56, row: 33 }, { col: 69, row: 40 }],
  natoDetectionLevel: 'C', wpDetectionLevel: 'C', weather: 'roll_good', maxTurns: 15,
  humanSide: 'nato', isSoloScenario: false,
  closedAirfields: [], inherentAAA: { side: 'nato', rangeFromFront: 5 },
  isr: { side: null }, sead: { side: null },
  earlyWarning: { side: 'nato', surpriseAttack: false }, natoAirDefenseZone: '2ATAF/4ATAF',
  flightRestrictions: [], zoneLimits: [],
  natoOOB: {
    flights: [
      { id: 'CAP-1', aircraftType: 'F-15C', nation: 'US', task: 'cap', count: 2, aggressionValue: 2, setupType: 'onMap', setupAltitude: 'high', setupHex: '4810' },
      { id: 'CAP-2', aircraftType: 'F-15C', nation: 'US', task: 'cap', count: 2, aggressionValue: 2, setupType: 'onMap', setupAltitude: 'high', setupHex: '4820' },
      { id: 'CAP-3', aircraftType: 'F-4E', nation: 'US', task: 'cap', count: 2, aggressionValue: 1, setupType: 'onMap', setupAltitude: 'medium', setupHex: '4830' },
      { id: 'CAP-4', aircraftType: 'FGR2', nation: 'UK', task: 'cap', count: 2, aggressionValue: 1, setupType: 'onMap', setupAltitude: 'medium', setupHex: '4815' },
      { id: 'CAP-5', aircraftType: 'F-16A', nation: 'BE', task: 'cap', count: 2, aggressionValue: 1, setupType: 'onMap', setupAltitude: 'medium', setupHex: '4825' },
    ],
    groundUnits: [
      { id: 'HAWK-1', type: 'sam', subType: 'HAWK_C', hex: '4516', located: true, radarOn: true },
      { id: 'HAWK-2', type: 'sam', subType: 'HAWK_C', hex: '4520', located: true, radarOn: true },
      { id: 'EWR-1', type: 'ewr', subType: 'EWR', hex: '4706', located: true, radarOn: true },
      { id: 'EWR-2', type: 'ewr', subType: 'EWR', hex: '4544', located: true, radarOn: true },
    ],
    orbitPoints: [{ col: 48, row: 10 }, { col: 48, row: 20 }, { col: 48, row: 30 }],
    rallyPoints: [], dummyFlights: 3,
    pilotQuality: { 'US_F15_F16': 'ace', 'US_UK': 'veteran', 'other': 'regular' },
  },
  wpOOB: {
    flights: [
      { id: 'CAP-W1', aircraftType: 'MiG-29A', nation: 'USSR', task: 'cap', count: 4, aggressionValue: 1, setupType: 'onMap', setupHex: '6510', setupAltitude: 'high' },
      { id: 'CAP-W2', aircraftType: 'MiG-29A', nation: 'USSR', task: 'cap', count: 4, aggressionValue: 1, setupType: 'onMap', setupHex: '6520', setupAltitude: 'high' },
      { id: 'CAP-W3', aircraftType: 'MiG-23MLD', nation: 'USSR', task: 'cap', count: 4, aggressionValue: 0, setupType: 'onMap', setupHex: '6530', setupAltitude: 'medium' },
      { id: 'CAP-W4', aircraftType: 'MiG-21bis', nation: 'GDR', task: 'cap', count: 4, aggressionValue: -1, setupType: 'onMap', setupHex: '6515', setupAltitude: 'medium' },
      { id: 'CAP-W5', aircraftType: 'MiG-23M', nation: 'USSR', task: 'cap', count: 4, aggressionValue: -1, setupType: 'onMap', setupHex: '6525', setupAltitude: 'medium' },
    ],
    groundUnits: [
      { id: 'SA-6-1', type: 'sam', subType: 'SA-6', hex: '5815', located: true, radarOn: true },
      { id: 'SA-11-1', type: 'sam', subType: 'SA-11', hex: '5825', located: true, radarOn: true },
      { id: 'EWR-W1', type: 'ewr', subType: 'EWR', hex: '6602', located: true, radarOn: true },
      { id: 'EWR-W2', type: 'ewr', subType: 'EWR', hex: '6732', located: true, radarOn: true },
    ],
    orbitPoints: [{ col: 65, row: 10 }, { col: 65, row: 20 }, { col: 65, row: 30 }],
    rallyPoints: [], dummyFlights: 4,
    pilotQuality: { 'USSR_MiG29_Su27': 'veteran', 'USSR_other': 'regular', 'GDR': 'trained' },
  },
  ssrs: ['Scenario ends at end of Turn 15.'],
  victoryType: 'standard', victoryDescription: 'Standard VP. NATO Victory Level Table.',
};

export const RS08: ScenarioDefinition = {
  id: 'rs08', name: 'RS8: Runway Busting', subtitle: 'NATO Airfield Attack',
  description: 'NATO strikes WP airfields with anti-runway munitions to shut down WP air operations.',
  background: 'NATO plans a deep strike mission against WP airfields using JP233 and Durandal anti-runway weapons.',
  category: 'standard', size: 'large',
  date: '17 May 1987', timeOfDay: '1000', dayNight: 'day', moonPhase: null,
  playArea: { minCol: 25, maxCol: 79, minRow: 0, maxRow: 15 },
  front: [{ col: 63, row: 2 }, { col: 63, row: 9 }, { col: 53, row: 14 }, { col: 53, row: 15 }],
  natoDetectionLevel: 'C', wpDetectionLevel: 'C', weather: 'roll_good', maxTurns: null,
  humanSide: 'nato', isSoloScenario: false,
  closedAirfields: [], inherentAAA: { side: 'wp', rangeFromFront: 5 },
  isr: { side: 'nato' }, sead: { side: 'nato' },
  earlyWarning: { side: 'wp', surpriseAttack: false }, natoAirDefenseZone: '2ATAF',
  flightRestrictions: [], zoneLimits: [],
  natoOOB: {
    flights: [
      { id: 'BOMB-1', aircraftType: 'F-4E', nation: 'US', task: 'bombing', count: 4, aggressionValue: 1, setupType: 'enterTurn', enterTurn: 1, enterHex: '2510' },
      { id: 'BOMB-2', aircraftType: 'FGR2', nation: 'UK', task: 'bombing', count: 4, aggressionValue: 1, setupType: 'enterTurn', enterTurn: 1, enterHex: '2508' },
      { id: 'SEAD-1', aircraftType: 'F-4E', nation: 'US', task: 'sead', count: 2, aggressionValue: 1, setupType: 'enterTurn', enterTurn: 1, enterHex: '2509' },
      { id: 'CAP-1', aircraftType: 'F-15C', nation: 'US', task: 'cap', count: 2, aggressionValue: 2, setupType: 'onMap', setupAltitude: 'high', setupHex: '4005' },
      { id: 'CAP-2', aircraftType: 'F-15C', nation: 'US', task: 'cap', count: 2, aggressionValue: 2, setupType: 'onMap', setupAltitude: 'high', setupHex: '4010' },
    ],
    groundUnits: [
      { id: 'HAWK-1', type: 'sam', subType: 'HAWK_C', hex: '4505', located: true, radarOn: true },
      { id: 'EWR-1', type: 'ewr', subType: 'EWR', hex: '4706', located: true, radarOn: true },
    ],
    orbitPoints: [{ col: 40, row: 5 }, { col: 40, row: 10 }], rallyPoints: [{ col: 45, row: 5 }], dummyFlights: 2,
    pilotQuality: { 'US_F15_F16': 'ace', 'US_UK': 'veteran', 'other': 'regular' },
  },
  wpOOB: {
    flights: [
      { id: 'CAP-W1', aircraftType: 'MiG-29A', nation: 'USSR', task: 'cap', count: 2, aggressionValue: 1, setupType: 'onMap', setupHex: '7005', setupAltitude: 'high' },
      { id: 'CAP-W2', aircraftType: 'MiG-23MLD', nation: 'USSR', task: 'cap', count: 4, aggressionValue: 0, setupType: 'onMap', setupHex: '7010', setupAltitude: 'medium' },
      { id: 'CAP-W3', aircraftType: 'MiG-21bis', nation: 'GDR', task: 'cap', count: 4, aggressionValue: -1, setupType: 'onMap', setupHex: '7308', setupAltitude: 'medium' },
    ],
    groundUnits: [
      { id: 'SA-2-1', type: 'sam', subType: 'SA-2', hex: '6805', located: true, radarOn: true },
      { id: 'SA-6-1', type: 'sam', subType: 'SA-6', hex: '6010', located: true, radarOn: true },
      { id: 'SA-11-1', type: 'sam', subType: 'SA-11', hex: '6505', located: true, radarOn: true },
      { id: 'EWR-W1', type: 'ewr', subType: 'EWR', hex: '6602', located: true, radarOn: true },
    ],
    orbitPoints: [{ col: 70, row: 5 }, { col: 73, row: 8 }], rallyPoints: [], dummyFlights: 3,
    pilotQuality: { 'USSR_MiG29_Su27': 'veteran', 'USSR_other': 'regular', 'GDR': 'trained' },
  },
  ssrs: ['NATO bombing targets: WP airfields Ballenstedt (7306), Cochstedt (7503).', 'Anti-runway bombs triple strength vs runways.'],
  victoryType: 'standard', victoryDescription: 'Standard VP. NATO scores for airfield runway damage. NATO Victory Level Table.',
};

export const RS09: ScenarioDefinition = {
  id: 'rs09', name: 'RS9: Nighthawks', subtitle: 'Night Strike',
  description: 'NATO conducts a night strike deep into WP territory. Only night-capable aircraft can fly.',
  background: 'Under cover of darkness, NATO sends night-capable strike aircraft deep behind WP lines to hit critical targets.',
  category: 'standard', size: 'medium',
  date: '17 May 1987', timeOfDay: '2330', dayNight: 'night', moonPhase: 'full',
  playArea: { minCol: 41, maxCol: 79, minRow: 0, maxRow: 50 },
  front: [{ col: 63, row: 2 }, { col: 63, row: 9 }, { col: 53, row: 14 }, { col: 53, row: 16 }, { col: 57, row: 18 }, { col: 57, row: 21 }, { col: 55, row: 22 }, { col: 55, row: 31 }],
  natoDetectionLevel: 'C', wpDetectionLevel: 'F', weather: 'clear', maxTurns: 15,
  humanSide: 'nato', isSoloScenario: false,
  closedAirfields: [], inherentAAA: { side: 'wp', rangeFromFront: 5 },
  isr: { side: null }, sead: { side: null },
  earlyWarning: { side: 'wp', surpriseAttack: false }, natoAirDefenseZone: '2ATAF/4ATAF',
  flightRestrictions: [{ side: 'nato', description: 'Only Night or Limited Night capable aircraft.' }],
  zoneLimits: [],
  natoOOB: {
    flights: [
      { id: 'STRIKE-1', aircraftType: 'F-4E', nation: 'US', task: 'bombing', count: 4, aggressionValue: 1, setupType: 'enterTurn', enterTurn: 1, enterHex: '4110' },
      { id: 'STRIKE-2', aircraftType: 'FGR2', nation: 'UK', task: 'bombing', count: 4, aggressionValue: 1, setupType: 'enterTurn', enterTurn: 1, enterHex: '4120' },
      { id: 'CAP-1', aircraftType: 'F-15C', nation: 'US', task: 'cap', count: 2, aggressionValue: 2, setupType: 'onMap', setupAltitude: 'high', setupHex: '4815' },
    ],
    groundUnits: [
      { id: 'EWR-1', type: 'ewr', subType: 'EWR', hex: '4706', located: true, radarOn: true },
    ],
    orbitPoints: [{ col: 48, row: 15 }], rallyPoints: [], dummyFlights: 2,
    pilotQuality: { 'US_F15_F16': 'ace', 'US_UK': 'veteran', 'other': 'regular' },
  },
  wpOOB: {
    flights: [
      { id: 'CAP-W1', aircraftType: 'MiG-29A', nation: 'USSR', task: 'cap', count: 2, aggressionValue: 1, setupType: 'onMap', setupHex: '6515', setupAltitude: 'high' },
      { id: 'CAP-W2', aircraftType: 'MiG-23MLD', nation: 'USSR', task: 'cap', count: 2, aggressionValue: 0, setupType: 'onMap', setupHex: '6525', setupAltitude: 'medium' },
    ],
    groundUnits: [
      { id: 'SA-6-1', type: 'sam', subType: 'SA-6', hex: '5815', located: true, radarOn: true },
      { id: 'SA-11-1', type: 'sam', subType: 'SA-11', hex: '6020', located: true, radarOn: true },
      { id: 'EWR-W1', type: 'ewr', subType: 'EWR', hex: '6602', located: true, radarOn: true },
    ],
    orbitPoints: [{ col: 65, row: 15 }, { col: 65, row: 25 }], rallyPoints: [], dummyFlights: 2,
    pilotQuality: { 'USSR_MiG29_Su27': 'veteran', 'USSR_other': 'regular', 'GDR': 'trained' },
  },
  ssrs: ['Night scenario — Full Moon.', 'Only Night/Limited Night capable aircraft.', 'Night turn limits: max 60° (30° at speed 9+).', 'Night visual detection: NATO 2 hexes, WP IRST only.'],
  victoryType: 'standard', victoryDescription: 'Standard VP. NATO Victory Level Table.',
};

export const RS10: ScenarioDefinition = {
  id: 'rs10', name: 'RS10: Frontal Aviation', subtitle: 'WP Close Air Support',
  description: 'WP Frontal Aviation provides close air support along the front. NATO intercepts with CAP and ground defenses.',
  background: 'As the ground battle intensifies, WP Frontal Aviation units fly CAS missions along the front to support advancing ground forces.',
  category: 'standard', size: 'large',
  date: '18 May 1987', timeOfDay: '0600', dayNight: 'day', moonPhase: null,
  playArea: { minCol: 23, maxCol: 79, minRow: 10, maxRow: 30 },
  front: [{ col: 51, row: 10 }, { col: 51, row: 14 }, { col: 53, row: 16 }, { col: 57, row: 18 }, { col: 57, row: 21 }, { col: 55, row: 22 }, { col: 55, row: 30 }],
  natoDetectionLevel: 'C', wpDetectionLevel: 'C', weather: 'roll_good', maxTurns: 20,
  humanSide: 'nato', isSoloScenario: false,
  closedAirfields: [{ hex: '4505', aaaActive: false }, { hex: '4514', aaaActive: false }],
  inherentAAA: { side: 'nato', rangeFromFront: 7 },
  isr: { side: null }, sead: { side: null },
  earlyWarning: { side: 'nato', surpriseAttack: false }, natoAirDefenseZone: '2ATAF/4ATAF',
  flightRestrictions: [], zoneLimits: [],
  natoOOB: {
    flights: [
      { id: 'CAP-1', aircraftType: 'F-15C', nation: 'US', task: 'cap', count: 2, aggressionValue: 2, setupType: 'onMap', setupAltitude: 'high', setupHex: '4015' },
      { id: 'CAP-2', aircraftType: 'F-15C', nation: 'US', task: 'cap', count: 2, aggressionValue: 2, setupType: 'onMap', setupAltitude: 'high', setupHex: '4025' },
      { id: 'CAP-3', aircraftType: 'F-4E', nation: 'US', task: 'cap', count: 2, aggressionValue: 1, setupType: 'onMap', setupAltitude: 'medium', setupHex: '4020' },
      { id: 'CAP-4', aircraftType: 'F-4F', nation: 'FRG', task: 'cap', count: 2, aggressionValue: 0, setupType: 'onMap', setupAltitude: 'medium', setupHex: '4518' },
    ],
    groundUnits: [
      { id: 'HAWK-1', type: 'sam', subType: 'HAWK_C', hex: '4516', located: true, radarOn: true },
      { id: 'HAWK-2', type: 'sam', subType: 'HAWK_C', hex: '4520', located: true, radarOn: true },
      { id: 'HAWK-3', type: 'sam', subType: 'HAWK_D', hex: '4225', located: true, radarOn: true },
      { id: 'EWR-1', type: 'ewr', subType: 'EWR', hex: '4413', located: true, radarOn: true },
      { id: 'EWR-2', type: 'ewr', subType: 'EWR', hex: '4235', located: true, radarOn: true },
      { id: 'GEP-1', type: 'mobileAAA', subType: 'Gepard', hex: '4812', located: true, radarOn: false },
      { id: 'GEP-2', type: 'mobileAAA', subType: 'Gepard', hex: '4818', located: true, radarOn: false },
      { id: 'GEP-3', type: 'mobileAAA', subType: 'Gepard', hex: '4822', located: true, radarOn: false },
    ],
    orbitPoints: [{ col: 40, row: 15 }, { col: 40, row: 25 }], rallyPoints: [], dummyFlights: 3,
    pilotQuality: { 'US_F15_F16': 'ace', 'US_UK': 'veteran', 'other': 'regular' },
  },
  wpOOB: {
    flights: [
      { id: 'CAS-1', aircraftType: 'MiG-27', nation: 'USSR', task: 'bombing', count: 4, aggressionValue: 0, setupType: 'onMap', setupHex: '6015', setupAltitude: 'low' },
      { id: 'CAS-2', aircraftType: 'MiG-27', nation: 'USSR', task: 'bombing', count: 4, aggressionValue: 0, setupType: 'onMap', setupHex: '6020', setupAltitude: 'low' },
      { id: 'CAS-3', aircraftType: 'Su-24MR', nation: 'USSR', task: 'bombing', count: 4, aggressionValue: 0, setupType: 'onMap', setupHex: '6025', setupAltitude: 'low' },
      { id: 'ESC-1', aircraftType: 'MiG-29A', nation: 'USSR', task: 'cap', count: 2, aggressionValue: 1, setupType: 'onMap', setupHex: '6012', setupAltitude: 'high' },
      { id: 'ESC-2', aircraftType: 'MiG-29A', nation: 'USSR', task: 'cap', count: 2, aggressionValue: 1, setupType: 'onMap', setupHex: '6022', setupAltitude: 'high' },
      { id: 'ESC-3', aircraftType: 'MiG-23MLD', nation: 'USSR', task: 'closeEscort', count: 4, aggressionValue: 0, setupType: 'onMap', setupHex: '6018', setupAltitude: 'medium' },
    ],
    groundUnits: [
      { id: 'SA-6-1', type: 'sam', subType: 'SA-6', hex: '5415', located: true, radarOn: true },
      { id: 'SA-6-2', type: 'sam', subType: 'SA-6', hex: '5420', located: true, radarOn: true },
      { id: 'SA-8-1', type: 'sam', subType: 'SA-8', hex: '5318', located: true, radarOn: true },
      { id: 'SA-11-1', type: 'sam', subType: 'SA-11', hex: '5612', located: true, radarOn: true },
      { id: 'SA-13-1', type: 'sam', subType: 'SA-13', hex: '5316', located: true, radarOn: false },
      { id: 'SA-13-2', type: 'sam', subType: 'SA-13', hex: '5322', located: true, radarOn: false },
      { id: 'EWR-W1', type: 'ewr', subType: 'EWR', hex: '6214', located: true, radarOn: true },
      { id: 'EWR-W2', type: 'ewr', subType: 'EWR', hex: '6124', located: true, radarOn: true },
    ],
    orbitPoints: [{ col: 60, row: 15 }, { col: 60, row: 20 }, { col: 60, row: 25 }],
    rallyPoints: [], dummyFlights: 4,
    pilotQuality: { 'USSR_MiG29_Su27': 'veteran', 'USSR_other': 'regular', 'GDR': 'trained' },
  },
  ssrs: ['Scenario ends at end of Turn 20.', 'WP CAS flights target NATO front-line ground units within 3 hexes of Front.'],
  victoryType: 'standard', victoryDescription: 'Standard VP. NATO scores for WP aircraft downed. WP scores for ground target damage. NATO Victory Level Table.',
};
