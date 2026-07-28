/**
 * Scenario Registry — central catalog of all available scenarios.
 */

import { ScenarioDefinition } from './scenarioTypes';
import { RS_SOLO_A } from './rs-solo-a';
import { RS_SOLO_B } from './rs-solo-b';
import { RS_SOLO_C } from './rs-solo-c';
import { RS_SOLO_D } from './rs-solo-d';
import { RS02, RS03, RS04, RS05, RS06, RS07, RS08, RS09, RS10 } from './rs02-rs10';

export interface ScenarioListEntry {
  id: string;
  name: string;
  subtitle: string;
  category: string;
  size: string;
  humanSide: string;
  date: string;
  dayNight: string;
}

const SCENARIO_DB: Record<string, ScenarioDefinition> = {
  // RS1 is handled by the legacy loader
  // RS2-RS10: NATO vs AI (WP bot)
  'rs02': RS02,
  'rs03': RS03,
  'rs04': RS04,
  'rs05': RS05,
  'rs06': RS06,
  'rs07': RS07,
  'rs08': RS08,
  'rs09': RS09,
  'rs10': RS10,
  // Solo scenarios
  'rs-solo-a': RS_SOLO_A,
  'rs-solo-b': RS_SOLO_B,
  'rs-solo-c': RS_SOLO_C,
  'rs-solo-d': RS_SOLO_D,
};

/** Placeholder entries for scenarios not yet fully entered */
const PLACEHOLDER_SCENARIOS: ScenarioListEntry[] = [
  { id: 'rs01', name: 'RS1: Morning Recon', subtitle: 'Introductory', category: 'introductory', size: 'small', humanSide: 'either', date: '12 May', dayNight: 'day' },
  { id: 'rs02', name: 'RS2: Operation Boloski', subtitle: 'Fighter Sweep', category: 'standard', size: 'large', humanSide: 'either', date: '15 May', dayNight: 'day' },
  { id: 'rs03', name: 'RS3: First Strike', subtitle: 'WP Ground Attack', category: 'standard', size: 'large', humanSide: 'either', date: '15 May', dayNight: 'day' },
  { id: 'rs04', name: 'RS4: Opening Rounds', subtitle: 'WP Airfield Strike', category: 'standard', size: 'large', humanSide: 'either', date: '16 May', dayNight: 'day' },
  { id: 'rs05', name: 'RS5: Vertical Envelopment', subtitle: 'WP Air Assault', category: 'standard', size: 'large', humanSide: 'either', date: '16 May', dayNight: 'day' },
  { id: 'rs06', name: 'RS6: Sanitized Corridors', subtitle: 'WP SEAD', category: 'standard', size: 'large', humanSide: 'either', date: '16 May', dayNight: 'day' },
  { id: 'rs07', name: 'RS7: Aerial Blockade', subtitle: 'NATO Air Superiority', category: 'standard', size: 'large', humanSide: 'either', date: '17 May', dayNight: 'day' },
  { id: 'rs08', name: 'RS8: Runway Busting', subtitle: 'NATO Airfield Attack', category: 'standard', size: 'large', humanSide: 'either', date: '17 May', dayNight: 'day' },
  { id: 'rs09', name: 'RS9: Nighthawks', subtitle: 'Night Strike', category: 'standard', size: 'medium', humanSide: 'either', date: '17 May', dayNight: 'night' },
  { id: 'rs10', name: 'RS10: Frontal Aviation', subtitle: 'CAS', category: 'standard', size: 'large', humanSide: 'either', date: '18 May', dayNight: 'day' },
  { id: 'rs11', name: 'RS11: Red Flag', subtitle: 'Air Superiority', category: 'standard', size: 'large', humanSide: 'either', date: '18 May', dayNight: 'day' },
  { id: 'rs12', name: 'RS12: Second Echelon', subtitle: 'Deep Strike', category: 'standard', size: 'large', humanSide: 'either', date: '19 May', dayNight: 'day' },
  { id: 'rs13', name: 'RS13: Night Shift', subtitle: 'Night Interdiction', category: 'standard', size: 'medium', humanSide: 'either', date: '19 May', dayNight: 'night' },
  { id: 'rs14', name: 'RS14: Offensive Counter-Air', subtitle: 'OCA', category: 'standard', size: 'large', humanSide: 'either', date: '20 May', dayNight: 'day' },
  { id: 'rs15', name: 'RS15: Search and Destroy', subtitle: 'SEAD', category: 'standard', size: 'large', humanSide: 'either', date: '20 May', dayNight: 'day' },
  { id: 'rs16', name: 'RS16: Hitting Back Hard', subtitle: 'NATO Counter-attack', category: 'standard', size: 'large', humanSide: 'either', date: '21 May', dayNight: 'day' },
  { id: 'rs17', name: 'RS17: Desantniki', subtitle: 'Airborne Assault', category: 'standard', size: 'large', humanSide: 'either', date: '22 May', dayNight: 'day' },
  { id: 'rs18', name: 'RS18: Dance of the Vampires', subtitle: 'Cruise Missiles', category: 'standard', size: 'large', humanSide: 'either', date: '25 May', dayNight: 'night' },
  { id: 'rs19', name: 'RS19: Air Interdiction', subtitle: 'Deep Strike', category: 'standard', size: 'large', humanSide: 'either', date: '27 May', dayNight: 'day' },
  { id: 'rs20', name: 'RS20: Birds of Prey', subtitle: 'Air Superiority', category: 'standard', size: 'large', humanSide: 'either', date: '28 May', dayNight: 'day' },
  { id: 'rs21', name: 'RS21: Breakthrough', subtitle: 'Ground Support', category: 'standard', size: 'large', humanSide: 'either', date: '30 May', dayNight: 'day' },
  { id: 'rs22', name: 'RS22: BUFFs', subtitle: 'Strategic Bombers', category: 'standard', size: 'large', humanSide: 'either', date: '1 Jun', dayNight: 'day' },
  { id: 'rs23', name: 'RS23: Bridge Busting', subtitle: 'Rhine Bridges', category: 'standard', size: 'large', humanSide: 'either', date: '2 Jun', dayNight: 'day' },
  { id: 'rs24', name: 'RS24: I Must Break You', subtitle: 'Air Supremacy', category: 'standard', size: 'large', humanSide: 'either', date: '5 Jun', dayNight: 'day' },
  { id: 'rs25', name: 'RS25: Day of Days', subtitle: 'Maximum Effort', category: 'standard', size: 'large', humanSide: 'either', date: '8 Jun', dayNight: 'day' },
  { id: 'rs26', name: 'RS26: Belgian Barrage', subtitle: 'Belgian Air Force', category: 'standard', size: 'medium', humanSide: 'either', date: '10 Jun', dayNight: 'day' },
  { id: 'rs27', name: 'RS27: High Speed Recon', subtitle: 'Reconnaissance', category: 'standard', size: 'medium', humanSide: 'either', date: '12 Jun', dayNight: 'day' },
  { id: 'rs28', name: 'RS28: Special Weapons', subtitle: 'Nuclear', category: 'standard', size: 'large', humanSide: 'either', date: '15 Jun', dayNight: 'day' },
  { id: 'rs29', name: 'RS29: 99 Red Balloons', subtitle: 'Mass Air Battle', category: 'standard', size: 'large', humanSide: 'either', date: '15 Jun', dayNight: 'day' },
  { id: 'rs30', name: 'RS30: The Final Countdown', subtitle: 'Endgame', category: 'standard', size: 'large', humanSide: 'either', date: '15 Jun', dayNight: 'day' },
];

export function getScenario(id: string): ScenarioDefinition | undefined {
  return SCENARIO_DB[id];
}

export function getScenarioList(): ScenarioListEntry[] {
  // Full definitions first
  const full = Object.values(SCENARIO_DB).map((s) => ({
    id: s.id, name: s.name, subtitle: s.subtitle, category: s.category,
    size: s.size, humanSide: s.humanSide, date: s.date, dayNight: s.dayNight,
  }));

  // Add placeholders for scenarios not yet fully entered
  const fullIds = new Set(full.map((s) => s.id));
  const placeholders = PLACEHOLDER_SCENARIOS.filter((s) => !fullIds.has(s.id));

  return [
    ...PLACEHOLDER_SCENARIOS.filter((s) => s.id === 'rs01'), // RS1 first
    ...full,
    ...placeholders,
  ];
}

export function getPlayableScenarios(): ScenarioListEntry[] {
  // RS1, RS2-RS10, and solo scenarios are playable
  const playableIds = new Set(Object.keys(SCENARIO_DB));
  playableIds.add('rs01');
  return getScenarioList().filter((s) => playableIds.has(s.id));
}
