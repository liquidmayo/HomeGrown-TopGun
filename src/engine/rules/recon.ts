/**
 * Reconnaissance rules.
 * Reference: Rules section 24.0
 */

import { FlightState, HexCoord, AltitudeBand, WeatherState } from '../state/GameState';
import { hexDistance } from '../hex';
import { getAircraftData } from '../../data/aircraft/aircraftDatabase';
import { isInHaze, isInMist } from './weather';

/** Check if a flight can conduct a recon run. Rule 24.1 */
export function canConductReconRun(
  flight: FlightState, targetHex: HexCoord, turnsAfterLastAttack: number,
  weather: WeatherState
): { canRecon: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (flight.task !== 'recon') reasons.push('Not a recon-tasked flight');
  if (flight.disordered) reasons.push('Flight is disordered');
  if (flight.markers.includes('bvrAvoid')) reasons.push('BVR Avoid marker');
  if (flight.markers.includes('samAvoid')) reasons.push('SAM Avoid marker');

  // Must be 2+ turns after last attack on target
  if (turnsAfterLastAttack < 2) reasons.push('Must wait 2 turns after last attack');

  // Altitude restriction
  const validAlts: AltitudeBand[] = ['deck', 'low', 'medium'];
  if (!validAlts.includes(flight.altitude)) reasons.push('Must be at Deck, Low, or Medium altitude');

  // Haze/mist restriction
  if ((isInHaze(flight.altitude, weather) || isInMist(flight.altitude, weather)) &&
      flight.altitude !== 'deck') {
    reasons.push('Haze/mist requires Deck altitude for recon');
  }

  // IP must be 2 hexes from target
  const dist = hexDistance(flight.hex, targetHex);
  if (dist > 4) reasons.push('Too far from target (IP must be 2 hexes away)');

  return { canRecon: reasons.length === 0, reasons };
}

/** Check if SAR (Synthetic Aperture Radar) recon is available. Rule 24.2 */
export function canUseSAR(flight: FlightState): boolean {
  const ac = getAircraftData(flight.aircraftType);
  return ac?.capabilities.includes('SAR') === true && flight.altitude === 'medium';
}

/** Max recon targets per flight. Rule 24.3 */
export const MAX_RECON_TARGETS = 4;

/** Side-looking camera offset range by altitude. Rule 24.11 */
export function getSideLookingOffset(altitude: AltitudeBand): number {
  if (altitude === 'medium') return 3;
  if (altitude === 'low') return 1;
  return 0; // Deck = no side-looking
}
