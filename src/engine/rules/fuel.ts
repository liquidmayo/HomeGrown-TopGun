/**
 * Fuel and Recovery rules.
 * Reference: Rules sections 20.0
 */

import { FlightState, AircraftState } from '../state/GameState';
import { roll2d10 } from './detection';

/**
 * Mark fuel usage for a flight.
 * Rule 20.1: Mark 1 fuel point in Fuel Phase if flight used Dash or engaged in Standard combat.
 */
export function shouldMarkFuel(flight: FlightState, usedDash: boolean, engagedInCombat: boolean): number {
  let points = 0;
  if (usedDash) points++;
  if (engagedInCombat) points++;
  return points;
}

/**
 * Check if a flight has exceeded its fuel allowance.
 * Rule 20.1
 */
export function hasExceededFuel(flight: FlightState): boolean {
  return flight.fuelUsed > flight.fuelAllowance;
}

/**
 * Roll for fuel exhaustion when exceeding allowance.
 * Rule 20.1 (errata): Roll 1d10 per aircraft. 1 or less = crash.
 * -1 per extra box used.
 */
export function rollFuelExhaustion(extraBoxes: number): { roll: number; crashed: boolean } {
  const roll = Math.floor(Math.random() * 10) + 1;
  return { roll, crashed: (roll - extraBoxes) <= 1 };
}

/**
 * Recovery roll for aircraft at end of scenario.
 * Rule 20.2: Roll 2d10 per aircraft. 2+ = recovers safely.
 */
export interface RecoveryResult {
  aircraftIndex: number;
  roll: number;
  modifiers: Record<string, number>;
  recovered: boolean;
}

export function rollRecovery(
  aircraft: AircraftState,
  fuelExceeded: boolean,
  exitedWrongEdge: boolean,
  isDamaged: boolean,
  isCrippled: boolean
): RecoveryResult {
  const mods: Record<string, number> = {};

  if (fuelExceeded) mods['fuel_exceeded'] = -2;
  if (exitedWrongEdge) mods['wrong_edge'] = -2;
  if (isDamaged) mods['damaged'] = -1;
  if (isCrippled) mods['crippled'] = -3;

  const roll = roll2d10();
  const totalMod = Object.values(mods).reduce((s, v) => s + v, 0);

  return {
    aircraftIndex: aircraft.index,
    roll,
    modifiers: mods,
    recovered: (roll + totalMod) >= 2,
  };
}

/** Automatic recovery conditions. Rule 20.2 */
export function autoRecovers(flight: FlightState): boolean {
  // Lands at friendly airfield = auto recover
  if (flight.isOnGround && flight.groundState === 'unready') return true;
  // No adverse conditions
  if (!hasExceededFuel(flight) &&
      !flight.aircraft.some((a) => a.damage === 'damaged' || a.damage === 'crippled')) {
    return true;
  }
  return false;
}
