/**
 * Airfield Operations rules.
 * Reference: Rules section 9.0
 */

import { FlightState, HexCoord, hexToId, GameState } from '../state/GameState';
import { getAircraftData } from '../../data/aircraft/aircraftDatabase';

/** Check if a flight can take off from an airfield. Rule 9.13 */
export function canTakeOff(
  flight: FlightState, airfieldHex: HexCoord, airfieldClass: number,
  gameState: GameState
): { canTakeOff: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const ac = getAircraftData(flight.aircraftType);

  if (!ac) { reasons.push('Unknown aircraft type'); return { canTakeOff: false, reasons }; }
  if (flight.groundState !== 'ready') reasons.push('Flight is not Ready');
  if (ac.runwayRating > airfieldClass) reasons.push(`Runway too short (need class ${ac.runwayRating}, have ${airfieldClass})`);

  // Check airfield isn't closed
  const hexData = gameState.hexes[hexToId(airfieldHex)];
  if (!hexData?.isAirfield) reasons.push('Not an airfield hex');

  // Only one takeoff or landing per airfield per turn
  // (would need to track this in game state)

  return { canTakeOff: reasons.length === 0, reasons };
}

/** Check if a flight can land at an airfield. Rule 9.14 */
export function canLand(
  flight: FlightState, airfieldHex: HexCoord, airfieldClass: number
): { canLand: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const ac = getAircraftData(flight.aircraftType);

  if (!ac) { reasons.push('Unknown aircraft type'); return { canLand: false, reasons }; }
  if (flight.altitude !== 'deck') reasons.push('Must be at Deck altitude');
  if (flight.throttle !== 'combat') reasons.push('Must be at Combat throttle');
  if (ac.runwayRating > airfieldClass) reasons.push(`Runway too short (need class ${ac.runwayRating})`);

  return { canLand: reasons.length === 0, reasons };
}

/** Takeoff sequence state. Rule 9.13: Takes 2 game turns. */
export type TakeoffState = 'ground' | 'turn1' | 'turn2' | 'airborne';

/** Landing sequence state. Rule 9.14: Takes 3 game turns. */
export type LandingState = 'approach' | 'adjacent' | 'entering' | 'landed';

/** Flight readiness cycle times. Rule 9.12 */
export const READINESS_TURNS = {
  revetToUnready: 5,
  unreadyToRevetted: 5,
  unreadyToReady: 5,
};

/** Refuel/Rearm check. Rule 9.16: Only CAP flights can rearm. */
export function canRefuelRearm(flight: FlightState, airfieldClass: number): boolean {
  if (flight.task !== 'cap') return false;
  if (airfieldClass < 2) return false;
  if (flight.aircraft.some((a) => a.damage === 'damaged' || a.damage === 'crippled')) return false;
  return true;
}

/** Takeoff maneuver restriction. Rule 9.15 */
export function getTakeoffManeuverRating(): number {
  return 1; // Reduced to 1 during takeoff
}
