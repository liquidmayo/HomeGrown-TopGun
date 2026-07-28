/**
 * Helicopter rules.
 * Reference: Rules section 25.0
 */

import { FlightState, AltitudeBand } from '../state/GameState';

/** Helicopter movement constraints. Rule 25.1 */
export const HELICOPTER_RULES = {
  combatSpeed: 1,
  canDash: false,
  maxAltitude: 'low' as AltitudeBand,
  hasFullNight: true,
  hasTFR: true,           // Treated as having TFR
  canDefensiveWheel: false,
  maneuverRating: 2,
  aggressionValue: 0,
};

/** Check if a flight is a helicopter. */
export function isHelicopter(aircraftType: string): boolean {
  const heloTypes = ['UH-60', 'CH-47', 'Mi-8', 'Mi-24', 'AH-64', 'SA-342'];
  return heloTypes.some((t) => aircraftType.includes(t));
}

/** Helicopter-specific combat rules. Rule 25.2 */
export function getHelicopterCombatRules() {
  return {
    noScatter: true,
    noMoraleCheck: true,
    noDisorder: true,
    noManeuverMarker: true,
    noBVRAvoid: true,
    noSAMAvoid: true,
    mustDisengage: true,      // Must attempt to disengage
    poorSAMDefense: true,
    noAntiRadarTactics: true,
    crippledIsShotDown: true, // Crippled = Shot Down
  };
}

/** Helicopter landing. Rule 25.1 */
export function canHelicopterLand(flight: FlightState, isOnFriendlySide: boolean): boolean {
  if (flight.altitude !== 'deck') return false;
  // Can land in any hex on friendly side; enemy side only at CSAR/Transport target
  return isOnFriendlySide || flight.task === 'csar' || flight.task === 'transport';
}
