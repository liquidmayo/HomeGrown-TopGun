/**
 * Night rules.
 * Reference: Rules section 23.0
 */

import { FlightState, AltitudeBand } from '../state/GameState';
import { getAircraftData } from '../../data/aircraft/aircraftDatabase';
import { roll2d10 } from './detection';

export type MoonPhase = 'full' | 'none';

/** Check if an aircraft can fly at night. Rule 23.2 */
export function canFlyAtNight(aircraftType: string, task: string, moonPhase: MoonPhase): boolean {
  const ac = getAircraftData(aircraftType);
  if (!ac) return false;
  if (ac.hasNightCapability) return true;
  if (ac.hasLimitedNight) {
    if (task === 'cap' || task === 'closeEscort') return true;
    return moonPhase === 'full'; // Other tasks only in clear/full moon
  }
  return false;
}

/** Night turn limits. Rule 23.21: max 60° (30° at speed 9+). */
export function getNightMaxTurn(speed: number): number {
  return speed >= 9 ? 30 : 60;
}

/**
 * Ground collision check for flights at Deck at night or in mist.
 * Rule 23.22: Roll 2d10 per aircraft, 3 or less = crash.
 * DRMs: -2 night, -1 no moon, -1 rough hex.
 */
export function rollGroundCollision(
  hasTFR: boolean, isNight: boolean, moonPhase: MoonPhase | null,
  isRoughHex: boolean
): { roll: number; crashed: boolean } {
  if (hasTFR) return { roll: 99, crashed: false }; // TFR-equipped immune

  const roll = roll2d10();
  let modifier = 0;
  if (isNight) modifier -= 2;
  if (isNight && moonPhase === 'none') modifier -= 1;
  if (isRoughHex) modifier -= 1;

  return { roll, crashed: (roll + modifier) <= 3 };
}

/** Night visual detection range. Rule 23.12 */
export function getNightVisualDetectionRange(side: 'nato' | 'wp', hasIRST: boolean): number {
  if (side === 'nato') return 2; // NATO: 2 hexes at night
  return hasIRST ? 4 : 0; // WP: only IRST flights, 4 hexes, forward arc only
}

/** Night bombing profile restrictions. Rule 23.33 */
export function canUseBombingProfileAtNight(
  profile: string, moonPhase: MoonPhase, hasFLIR: boolean
): boolean {
  switch (profile) {
    case 'radarBombing': case 'tossBombing': return true; // Blind profiles unrestricted
    case 'diveBombing': case 'strafe': return moonPhase === 'full';
    case 'levelBombing': return moonPhase === 'full';
    case 'lgbLevel': case 'lgbToss': return true; // Night modifier applies (NA with FLIR)
    case 'eogm': case 'eogb': return true; // IR-guided only for NATO
    default: return false;
  }
}
