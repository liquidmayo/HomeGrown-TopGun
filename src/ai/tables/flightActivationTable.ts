/**
 * Bot Flight Activation Table.
 *
 * Reference: Rules 33.3, Player Aid Card 5
 *
 * Generic bot flights activate into real aircraft when triggered.
 * The activation roll determines what aircraft type appears.
 */

import { roll1d10 } from '../../engine/rules/detection';

export interface FlightActivationResult {
  activated: boolean;
  aircraftType: string | null;
  nation: string | null;
  roll: number;
  modifiers: Record<string, number>;
}

/**
 * Check if a generic bot flight should activate.
 * Triggered when a human player flight enters detection range or
 * other conditions specified in the scenario.
 *
 * @param distToNearestEnemy Distance to nearest detected enemy flight
 * @param realFlightsInPlay Number of real (activated) bot flights already in play
 * @param maxRealFlights Maximum real flights allowed by scenario
 */
export function shouldActivateFlight(
  distToNearestEnemy: number,
  realFlightsInPlay: number,
  maxRealFlights: number
): { activate: boolean; roll: number; needed: number } {
  if (realFlightsInPlay >= maxRealFlights) {
    return { activate: false, roll: 0, needed: 99 };
  }

  const roll = roll1d10();
  let needed = 7; // Base activation threshold

  // Closer enemies = easier activation
  if (distToNearestEnemy <= 5) needed -= 3;
  else if (distToNearestEnemy <= 10) needed -= 2;
  else if (distToNearestEnemy <= 15) needed -= 1;

  // More real flights in play = harder to activate more
  if (realFlightsInPlay >= 3) needed += 2;
  else if (realFlightsInPlay >= 1) needed += 1;

  return { activate: roll >= needed, roll, needed };
}

/**
 * Determine what aircraft type a generic flight activates into.
 * Uses scenario-provided activation tables.
 *
 * @param activationTable Array of [rollRange, aircraftType, nation] entries
 */
export function rollFlightType(
  activationTable: { minRoll: number; maxRoll: number; aircraftType: string; nation: string }[]
): { aircraftType: string; nation: string; roll: number } {
  const roll = roll1d10();

  for (const entry of activationTable) {
    if (roll >= entry.minRoll && roll <= entry.maxRoll) {
      return { aircraftType: entry.aircraftType, nation: entry.nation, roll };
    }
  }

  // Fallback to first entry
  return {
    aircraftType: activationTable[0]?.aircraftType ?? 'MiG-21bis',
    nation: activationTable[0]?.nation ?? 'USSR',
    roll,
  };
}

// ── Common Activation Tables ─────────────────────────────────────

/** Default WP CAP activation table (used in several solo scenarios) */
export const WP_CAP_ACTIVATION_DEFAULT = [
  { minRoll: 1, maxRoll: 2, aircraftType: 'MiG-21bis', nation: 'USSR' },
  { minRoll: 3, maxRoll: 4, aircraftType: 'MiG-23M', nation: 'USSR' },
  { minRoll: 5, maxRoll: 6, aircraftType: 'MiG-23MLA', nation: 'USSR' },
  { minRoll: 7, maxRoll: 8, aircraftType: 'MiG-23MLD', nation: 'USSR' },
  { minRoll: 9, maxRoll: 10, aircraftType: 'MiG-29A', nation: 'USSR' },
];

/** Default NATO CAP activation table */
export const NATO_CAP_ACTIVATION_DEFAULT = [
  { minRoll: 1, maxRoll: 2, aircraftType: 'F-15A', nation: 'US' },
  { minRoll: 3, maxRoll: 6, aircraftType: 'F-15C', nation: 'US' },
  { minRoll: 7, maxRoll: 10, aircraftType: 'F-4E', nation: 'US' },
];
