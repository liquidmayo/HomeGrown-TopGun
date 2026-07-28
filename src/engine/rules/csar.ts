/**
 * Combat Search and Rescue (CSAR) rules.
 * Reference: Rules section 26.0
 */

import { HexCoord, Side } from '../state/GameState';
import { roll1d10 } from './detection';

/** Bailout roll. Rule 26.1: 1d10, 5+ = bailed out, 1-4 = KIA. */
export function rollBailout(): { roll: number; survived: boolean; flyDistance: number } {
  const roll = roll1d10();
  const survived = roll >= 5;
  const flyDistance = roll === 10 ? roll1d10() : 0; // Roll of 10 = fly distance
  return { roll, survived, flyDistance };
}

/** Parachute landing time by altitude. Rule 26.1 */
export function getLandingTurns(altitude: string): number {
  if (altitude === 'deck') return 0;
  if (altitude === 'low') return 2;
  return 10; // Medium, High, Very High
}

/** Auto rescue/capture check. Rule 26.11 */
export function checkAutoRescueCapture(
  crewHex: HexCoord, isOnFriendlySide: boolean,
  isUrbanRoadOrAirfield: boolean, hasEnemyUnit: boolean
): 'rescued' | 'captured' | 'pending' {
  if (isOnFriendlySide) return 'rescued';
  if (isUrbanRoadOrAirfield || hasEnemyUnit) return 'captured';
  return 'pending';
}

/** Simple CSAR resolution. Rule 26.2 */
export function rollSimpleCSAR(
  side: Side, isOnEnemySide: boolean, isAdjacentUrban: boolean,
  isNight: boolean
): { roll: number; rescued: boolean } {
  const roll = roll1d10();
  let modifier = 0;
  if (isOnEnemySide && isAdjacentUrban) modifier -= 2;
  if (isNight) modifier += 2;

  const needed = side === 'nato' ? 7 : 8;
  return { roll, rescued: (roll + modifier) >= needed };
}

/** Detailed CSAR trigger. Rule 26.3 */
export function rollCSARTrigger(isNight: boolean): { roll: number; triggered: boolean } {
  const roll = roll1d10();
  const modifier = isNight ? 3 : 0;
  return { roll, triggered: (roll + modifier) >= 6 };
}

/** Helicopter crew pickup. Rule 26.43 */
export function rollCrewPickup(): { roll: number; pickedUp: boolean } {
  const roll = roll1d10();
  return { roll, pickedUp: roll >= 4 };
}
