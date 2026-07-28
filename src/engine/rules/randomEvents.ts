/**
 * Random Events rules.
 * Reference: Rules section 21.0
 */

import { GameState, Side } from '../state/GameState';
import { roll2d10 } from './detection';

export interface RandomEvent {
  id: string;
  name: string;
  description: string;
  effect: (gameState: GameState) => GameState;
}

export interface RandomEventRollResult {
  roll: number;
  event: RandomEvent | null;  // null = no event
}

const RANDOM_EVENTS: Record<number, RandomEvent> = {
  2: { id: 'nato_qra', name: 'NATO QRA', description: 'NATO Quick Reaction Alert flight scrambles.',
    effect: (s) => ({ ...s, eventLog: [...s.eventLog, { turn: s.turn, phase: s.phase, timestamp: Date.now(), type: 'random_event', message: 'NATO QRA: A NATO QRA flight scrambles from a nearby airfield.' }] }) },
  3: { id: 'wp_qra', name: 'WP QRA', description: 'WP Quick Reaction Alert flight scrambles.',
    effect: (s) => ({ ...s, eventLog: [...s.eventLog, { turn: s.turn, phase: s.phase, timestamp: Date.now(), type: 'random_event', message: 'WP QRA: A WP QRA flight scrambles from a nearby airfield.' }] }) },
  4: { id: 'nato_flight_trouble', name: 'NATO Flight in Trouble', description: 'One NATO flight has a mechanical issue.',
    effect: (s) => ({ ...s, eventLog: [...s.eventLog, { turn: s.turn, phase: s.phase, timestamp: Date.now(), type: 'random_event', message: 'NATO Flight in Trouble: One NATO flight suffers a mechanical issue. Roll for affected flight.' }] }) },
  5: { id: 'wp_flight_trouble', name: 'WP Flight in Trouble', description: 'One WP flight has a mechanical issue.',
    effect: (s) => ({ ...s, eventLog: [...s.eventLog, { turn: s.turn, phase: s.phase, timestamp: Date.now(), type: 'random_event', message: 'WP Flight in Trouble: One WP flight suffers a mechanical issue.' }] }) },
  6: { id: 'roe_change', name: 'ROE Change', description: 'Rules of Engagement change — BVR combat may be restricted or allowed.',
    effect: (s) => ({ ...s, eventLog: [...s.eventLog, { turn: s.turn, phase: s.phase, timestamp: Date.now(), type: 'random_event', message: 'ROE Change: Rules of Engagement have changed for this turn.' }] }) },
  7: { id: 'weather_shift', name: 'Weather Shift', description: 'Weather conditions change.',
    effect: (s) => ({ ...s, eventLog: [...s.eventLog, { turn: s.turn, phase: s.phase, timestamp: Date.now(), type: 'random_event', message: 'Weather Shift: Weather conditions have changed. Reroll weather.' }] }) },
  18: { id: 'manpad_ambush', name: 'MANPAD Ambush', description: 'A flight at Deck altitude is attacked by MANPAD.',
    effect: (s) => ({ ...s, eventLog: [...s.eventLog, { turn: s.turn, phase: s.phase, timestamp: Date.now(), type: 'random_event', message: 'MANPAD Ambush: A Deck-altitude flight is attacked by a shoulder-fired SAM.' }] }) },
  19: { id: 'sead_strike', name: 'SEAD Strike', description: 'Off-map SEAD strike suppresses a SAM or AAA.',
    effect: (s) => ({ ...s, eventLog: [...s.eventLog, { turn: s.turn, phase: s.phase, timestamp: Date.now(), type: 'random_event', message: 'SEAD Strike: An off-map SEAD strike suppresses an enemy air defense unit.' }] }) },
  20: { id: 'intel_update', name: 'Intel Update', description: 'Intelligence update improves detection.',
    effect: (s) => ({ ...s, eventLog: [...s.eventLog, { turn: s.turn, phase: s.phase, timestamp: Date.now(), type: 'random_event', message: 'Intel Update: Intelligence update — detection level improved for one turn.' }] }) },
};

/**
 * Roll for a random event.
 * Rule 21.0: Roll 2d10, no event on most rolls (8-17 = no event).
 * No random event on first turn.
 */
export function rollRandomEvent(turn: number): RandomEventRollResult {
  if (turn <= 1) return { roll: 0, event: null };

  const roll = roll2d10();
  const event = RANDOM_EVENTS[roll] ?? null;

  return { roll, event };
}

/**
 * Check if a random event should be ignored per scenario SSR.
 */
export function shouldIgnoreEvent(eventId: string, ignoredEvents: string[]): boolean {
  return ignoredEvents.includes(eventId);
}
