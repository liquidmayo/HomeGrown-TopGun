/**
 * Electronic Countermeasures (ECM/Jamming) rules.
 *
 * Reference: Rules section 19.0
 *
 * Three types of jamming:
 * 1. Defensive Jamming (19.2) - per-flight jammer affecting SAM/AAA attacks on that flight
 * 2. Standoff Jamming (19.3) - area effect from dedicated jamming flights
 * 3. Spot Jamming (19.34) - focused jamming on a specific radar
 *
 * Also covers:
 * - Chaff corridors (19.4) - laid by chaff-equipped flights
 * - Burn-through (19.22) - SAMs defeat noise jammers at close range
 * - Early Warning Jamming (19.35) - degrades enemy detection level
 */

import {
  FlightState, GroundUnitState, GameState, HexCoord, hexToId,
} from '../state/GameState';
import { hexDistance, getArc, isInForwardArc } from '../hex';
import { getAircraftData } from '../../data/aircraft/aircraftDatabase';
import { getSAMType } from '../../data/sams/samDatabase';
import { roll1d10 } from './detection';

// ── Defensive Jamming (19.2) ─────────────────────────────────────

/**
 * Get the effective defensive jamming strength of a flight.
 * Rule 19.2: Strength from ADC, modified by loss conditions (19.21).
 * Returns 0 if jamming is lost.
 */
export function getDefensiveJamStrength(flight: FlightState): number {
  const aircraft = getAircraftData(flight.aircraftType);
  if (!aircraft || aircraft.defensiveJamStrength === 0) return 0;

  // Loss conditions (19.21)
  if (flight.markers.includes('maneuver')) return 0;
  if (flight.markers.includes('antiRadarTactics')) return 0;

  return aircraft.defensiveJamStrength;
}

/**
 * Get the defensive jammer type for a flight.
 */
export function getDefensiveJamType(flight: FlightState): 'noise' | 'deception' | null {
  const aircraft = getAircraftData(flight.aircraftType);
  if (!aircraft || aircraft.defensiveJamStrength === 0) return null;
  return aircraft.defensiveJamType;
}

/**
 * Check if SAM burn-through applies.
 * Rule 19.22: Noise jammers lose effectiveness within burn-through range.
 * 0-2 hexes for normal aircraft, 0-4 hexes for large aircraft.
 * Does NOT apply to deception jammers.
 */
export function isBurnThrough(
  flight: FlightState,
  samHex: HexCoord
): boolean {
  const aircraft = getAircraftData(flight.aircraftType);
  if (!aircraft) return false;
  if (aircraft.defensiveJamType !== 'noise') return false;

  const dist = hexDistance(flight.hex, samHex);
  const burnRange = aircraft.isLargeAircraft ? 4 : 2;

  return dist <= burnRange;
}

// ── Standoff Jamming (19.3) ──────────────────────────────────────

export interface StandoffJammer {
  flightId: string;
  hex: HexCoord;
  arcDirection: number;        // Direction arrow points (heading in degrees)
  strength: number;            // Base jamming strength
  maxRange: number;            // Max effective range
  hasSpotJamming: boolean;
  spotTargets: string[];       // IDs of ground units being spot-jammed
}

/**
 * Jamming strength by range for standoff jammers.
 * Rule 19.31: Strength varies with range, multiplied by undamaged aircraft count.
 */
export function getStandoffJamStrength(
  jammer: StandoffJammer,
  targetHex: HexCoord,
  jammerAircraftCount: number
): number {
  const dist = hexDistance(jammer.hex, targetHex);
  if (dist > jammer.maxRange) return 0;

  // Simplified range-based strength reduction
  let baseStrength = jammer.strength;
  if (dist > 20) baseStrength = Math.max(0, baseStrength - 2);
  else if (dist > 10) baseStrength = Math.max(0, baseStrength - 1);

  return baseStrength * jammerAircraftCount;
}

/**
 * Check if a ground unit (SAM/EWR/AAA) is in a standoff jammer's arc.
 * Rule 19.31: 60-degree arc from jammer in the arrow direction.
 * Units in the arc get full jamming; units outside get half strength.
 */
export function isInJammerArc(
  jammer: StandoffJammer,
  targetHex: HexCoord
): boolean {
  const arc = getArc(jammer.hex, jammer.arcDirection, targetHex);
  // The jammer arc is a single 60° cone in the arrow direction
  // "forward" arc relative to the jammer's arrow direction
  return arc === 'forward';
}

/**
 * Calculate total standoff jamming affecting a specific radar unit.
 * Rule 19.31: Sum all applicable standoff jammers.
 * Max 6 total (3 for Patriot/SA-12).
 */
export function calculateTotalStandoffJamming(
  radarUnit: GroundUnitState,
  jammers: StandoffJammer[],
  flights: Record<string, FlightState>,
  isPhasedArray: boolean = false
): number {
  let total = 0;

  for (const jammer of jammers) {
    const flight = flights[jammer.flightId];
    if (!flight) continue;

    const undamagedCount = flight.aircraft.filter((a) => a.damage === 'none').length;
    if (undamagedCount === 0) continue;

    let strength = getStandoffJamStrength(jammer, radarUnit.hex, undamagedCount);

    // Half strength if radar unit is outside jammer arc
    if (!isInJammerArc(jammer, radarUnit.hex)) {
      strength = Math.ceil(strength / 2);
    }

    // Double strength if spot jamming this unit
    if (jammer.spotTargets.includes(radarUnit.id)) {
      strength *= 2;
    }

    total += strength;
  }

  // Cap at 6 (or 3 for phased array)
  const cap = isPhasedArray ? 3 : 6;
  return Math.min(total, cap);
}

// ── Standoff Jammer Placement (19.32) ────────────────────────────

/**
 * Check if a flight can place a standoff jamming marker.
 * Rule 19.32: Must be at Medium+ altitude, not disordered/aborted,
 * no damaged/crippled aircraft, correct task.
 */
export function canPlaceStandoffJammer(flight: FlightState): {
  canPlace: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  if (flight.task !== 'standoffJamming' && flight.task !== 'escortJamming') {
    reasons.push('Must be tasked with Standoff or Escort Jamming');
  }

  const altOrder = ['deck', 'low', 'medium', 'high', 'veryHigh'];
  if (altOrder.indexOf(flight.altitude) < 2) {
    reasons.push('Must be at Medium altitude or higher');
  }

  if (flight.disordered) reasons.push('Flight is disordered');
  if (flight.aborted) reasons.push('Flight is aborted');
  if (flight.markers.includes('maneuver')) reasons.push('Maneuver marker present');
  if (flight.markers.includes('samAvoid')) reasons.push('SAM Avoid marker present');
  if (flight.markers.includes('bvrAvoid')) reasons.push('BVR Avoid marker present');

  if (flight.aircraft.some((a) => a.damage === 'damaged' || a.damage === 'crippled')) {
    reasons.push('Damaged or crippled aircraft in flight');
  }

  return { canPlace: reasons.length === 0, reasons };
}

/**
 * Conditions that remove a standoff jamming marker.
 * Rule 19.32
 */
export function shouldRemoveStandoffJammer(flight: FlightState): {
  remove: boolean;
  reason: string | null;
} {
  if (flight.disordered) return { remove: true, reason: 'Flight disordered' };
  if (flight.aborted) return { remove: true, reason: 'Flight aborted' };
  if (flight.markers.includes('maneuver')) return { remove: true, reason: 'Maneuver marker' };
  if (flight.markers.includes('samAvoid')) return { remove: true, reason: 'SAM Avoid' };
  if (flight.markers.includes('bvrAvoid')) return { remove: true, reason: 'BVR Avoid' };
  if (flight.aircraft.some((a) => a.damage !== 'none')) return { remove: true, reason: 'Aircraft damaged' };
  return { remove: false, reason: null };
}

// ── Spot Jamming (19.34) ─────────────────────────────────────────

/**
 * Check if a jammer can place a spot jamming marker on a radar unit.
 * Rule 19.34: Must have spot capability, target in jammer arc, radar on,
 * within max standoff jamming range.
 */
export function canSpotJam(
  jammer: StandoffJammer,
  targetUnit: GroundUnitState
): boolean {
  if (!jammer.hasSpotJamming) return false;
  if (!targetUnit.radarOn) return false;
  if (!isInJammerArc(jammer, targetUnit.hex)) return false;

  const dist = hexDistance(jammer.hex, targetUnit.hex);
  if (dist > jammer.maxRange) return false;

  return true;
}

// ── Chaff Corridors (19.4) ───────────────────────────────────────

export interface ChaffCorridor {
  hexes: HexCoord[];
  altitude: 'medium' | 'high' | 'veryHigh';
  placedTurn: number;
  bloomedTurn: number;         // Blooms 2 turns after placement
  expiresTurn: number;         // Removed 25 turns after laying
  isBloomed: boolean;
}

/**
 * Check if a flight is in a chaff corridor.
 * Rule 19.4: Must be in corridor hex at corridor altitude.
 */
export function isInChaffCorridor(
  flight: FlightState,
  corridors: ChaffCorridor[]
): boolean {
  for (const corridor of corridors) {
    if (!corridor.isBloomed) continue;
    if (flight.altitude !== corridor.altitude) continue;
    if (corridor.hexes.some((h) => h.col === flight.hex.col && h.row === flight.hex.row)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a flight can lay chaff.
 * Rule 19.41: Must have chaff ordnance, correct task, not disordered,
 * at Medium+ altitude.
 */
export function canLayChaff(flight: FlightState): boolean {
  if (flight.disordered) return false;

  const validTasks = ['escortJamming', 'standoffJamming', 'chaffLaying'];
  if (!validTasks.includes(flight.task)) return false;

  const altOrder = ['deck', 'low', 'medium', 'high', 'veryHigh'];
  if (altOrder.indexOf(flight.altitude) < 2) return false;

  const hasChaff = flight.aircraft.some((a) =>
    a.ordnance.some((o) => o.type === 'chaff' && o.shotsRemaining > 0)
  );
  return hasChaff;
}

/**
 * Create a chaff corridor from a flight's path.
 * Rule 19.41: Up to 20 hexes of chaff regardless of aircraft count.
 */
export function createChaffCorridor(
  hexes: HexCoord[],
  altitude: 'medium' | 'high' | 'veryHigh',
  currentTurn: number
): ChaffCorridor {
  return {
    hexes: hexes.slice(0, 20), // Max 20 hexes
    altitude,
    placedTurn: currentTurn,
    bloomedTurn: currentTurn + 2,
    expiresTurn: currentTurn + 25,
    isBloomed: false,
  };
}

// ── Early Warning Jamming (19.35) ────────────────────────────────

/**
 * Roll for Early Warning Jamming effect.
 * Rule 19.35: Each aircraft in EW Jamming flights rolls 1d10.
 * On 6+, reduce enemy Detection Level by one for the turn.
 *
 * @returns Number of detection level reductions this turn
 */
export function rollEarlyWarningJamming(
  ewJammerAircraftCount: number
): { reductions: number; rolls: number[] } {
  const rolls: number[] = [];
  let reductions = 0;

  for (let i = 0; i < ewJammerAircraftCount; i++) {
    const roll = roll1d10();
    rolls.push(roll);
    if (roll >= 6) reductions++;
  }

  return { reductions, rolls };
}

/**
 * Apply detection level reduction from EW Jamming.
 * Rule 19.35: Each reduction shifts the Detection Level one step worse.
 */
export function applyDetectionLevelReduction(
  currentLevel: string,
  reductions: number
): string {
  const levels = ['A', 'B', 'C', 'D', 'E', 'F'];
  const currentIdx = levels.indexOf(currentLevel);
  if (currentIdx === -1) return currentLevel;

  const newIdx = Math.min(levels.length - 1, currentIdx + reductions);
  return levels[newIdx];
}

// ── Jamming Phase Runner ─────────────────────────────────────────

export interface JammingPhaseResult {
  standoffJammersPlaced: string[];
  standoffJammersRemoved: string[];
  spotJammersPlaced: { jammerId: string; targetId: string }[];
  ewJammingReductions: number;
  ewJammingRolls: number[];
}

/**
 * Process the Jamming Phase.
 * Rule 3.2: Place/adjust Standoff and Spot Jamming markers,
 * roll for Early Warning Jamming.
 */
export function processJammingPhase(
  gameState: GameState,
  standoffJammers: StandoffJammer[],
  ewJammerAircraftCount: number
): JammingPhaseResult {
  const placed: string[] = [];
  const removed: string[] = [];
  const spotPlaced: { jammerId: string; targetId: string }[] = [];

  // Check each standoff jammer for removal conditions
  for (const jammer of standoffJammers) {
    const flight = gameState.flights[jammer.flightId];
    if (!flight) {
      removed.push(jammer.flightId);
      continue;
    }

    const check = shouldRemoveStandoffJammer(flight);
    if (check.remove) {
      removed.push(jammer.flightId);
    }
  }

  // Check for new standoff jammer placement
  for (const flight of Object.values(gameState.flights)) {
    if (flight.task !== 'standoffJamming' && flight.task !== 'escortJamming') continue;
    const check = canPlaceStandoffJammer(flight);
    if (check.canPlace) {
      placed.push(flight.id);
    }
  }

  // EW Jamming
  const ew = rollEarlyWarningJamming(ewJammerAircraftCount);

  return {
    standoffJammersPlaced: placed,
    standoffJammersRemoved: removed,
    spotJammersPlaced: spotPlaced,
    ewJammingReductions: ew.reductions,
    ewJammingRolls: ew.rolls,
  };
}
