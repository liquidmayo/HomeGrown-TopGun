/**
 * Detection and Tracking rules for Red Storm.
 *
 * Reference: Rules sections 10.0 - 10.4
 *
 * Detection States:
 * - Undetected: flight counter shows "?" side
 * - Detected: flight counter shows suit icon (Heart/Spade/Diamond)
 *
 * Detection attempts occur in the Detection Phase via:
 * 1. Standard detection (10.2) - 2d10 on Detection Table
 * 2. Visual detection (10.21) - within 4 hexes with LOS
 * 3. Radar search (10.22) - forward arc, radar-equipped
 * 4. EWR detection (10.25) - within 20 hexes (10 at Deck)
 *
 * Tracking (10.3): detected flights may become undetected in Track Phase
 *
 * Visual Identification (10.4): replaces generic counter with actual flight counter
 */

import {
  FlightState, GroundUnitState, GameState, Side,
  AltitudeBand, HexCoord, hexToId,
} from '../state/GameState';
import {
  hexDistance, isInForwardArc, hasLineOfSight,
  altitudeIndex, altitudeDifference,
} from '../hex';
import { getAircraftData } from '../../data/aircraft/aircraftDatabase';

// ── Dice Rolling ─────────────────────────────────────────────────

/** Roll 1d10 (1-10, with 0 read as 10). */
export function roll1d10(): number {
  return Math.floor(Math.random() * 10) + 1;
}

/** Roll 2d10 (2-20). */
export function roll2d10(): number {
  return roll1d10() + roll1d10();
}

// ── Detection Level Columns ──────────────────────────────────────

/**
 * Detection Table base values by Detection Level.
 * To detect: roll 2d10 >= this value (after modifiers).
 * Reference: Detection Table on PAC
 */
const DETECTION_BASE: Record<string, number> = {
  'A': 6,
  'B': 8,
  'C': 10,
  'D': 12,
  'E': 14,
  'F': 16,
};

/** Visual Detection column base value. */
const VISUAL_DETECTION_BASE = 10;

// ── Detection Modifiers ──────────────────────────────────────────

interface DetectionModifiers {
  altitudeMod: number;       // Target altitude modifier
  terrainMod: number;        // Target in rough/mountain at deck
  jamMod: number;            // ECM/jamming modifier
  otherMod: number;          // Miscellaneous
}

/**
 * Calculate standard detection modifiers for a target flight.
 * Rule 10.2: Various modifiers apply.
 */
export function getStandardDetectionModifiers(
  target: FlightState,
  gameState: GameState
): DetectionModifiers {
  let altitudeMod = 0;
  let terrainMod = 0;
  let jamMod = 0;

  // Altitude modifiers
  switch (target.altitude) {
    case 'deck': altitudeMod = -4; break;
    case 'low': altitudeMod = -2; break;
    case 'medium': altitudeMod = 0; break;
    case 'high': altitudeMod = 2; break;
    case 'veryHigh': altitudeMod = 4; break;
  }

  // Terrain modifier: target at Deck in Rough/Mountain
  const hexData = gameState.hexes[hexToId(target.hex)];
  if (target.altitude === 'deck' && hexData) {
    if (hexData.terrain.includes('mountain')) terrainMod = -3;
    else if (hexData.terrain.includes('rough')) terrainMod = -2;
  }

  // Defensive jamming modifier
  const aircraft = getAircraftData(target.aircraftType);
  if (aircraft && aircraft.defensiveJamStrength > 0) {
    // Jamming affects detection unless lost
    if (!target.markers.includes('maneuver')) {
      jamMod = -aircraft.defensiveJamStrength;
    }
  }

  return { altitudeMod, terrainMod, jamMod, otherMod: 0 };
}

// ── Standard Detection (10.2) ────────────────────────────────────

export interface DetectionResult {
  targetId: string;
  detected: boolean;
  roll: number;
  needed: number;
  modifiers: DetectionModifiers;
  totalModifier: number;
  method: 'standard' | 'visual' | 'radar' | 'ewr';
}

/**
 * Attempt standard detection of an enemy flight.
 * Rule 10.2: Roll 2d10 on the Detection Table.
 */
export function attemptStandardDetection(
  target: FlightState,
  detectionLevel: string,
  gameState: GameState
): DetectionResult {
  const base = DETECTION_BASE[detectionLevel] ?? 10;
  const modifiers = getStandardDetectionModifiers(target, gameState);
  const totalMod = modifiers.altitudeMod + modifiers.terrainMod + modifiers.jamMod + modifiers.otherMod;

  const roll = roll2d10();
  const needed = base - totalMod; // Roll >= needed to detect
  const detected = roll >= needed;

  return {
    targetId: target.id,
    detected,
    roll,
    needed,
    modifiers,
    totalModifier: totalMod,
    method: 'standard',
  };
}

// ── Visual Detection (10.21) ─────────────────────────────────────

/**
 * Check if a flight is eligible for visual detection by another flight.
 * Rule 10.21: Within 4 hexes, LOS, non-disordered friendly flight.
 */
export function canAttemptVisualDetection(
  detector: FlightState,
  target: FlightState,
  gameState: GameState
): boolean {
  if (detector.disordered) return false;
  if (detector.side === target.side) return false;
  if (target.detected) return false;

  const dist = hexDistance(detector.hex, target.hex);
  if (dist > 4) return false;

  // Check LOS
  const getTerrain = (hex: HexCoord) => {
    const data = gameState.hexes[hexToId(hex)];
    return data?.terrain ?? ['land'];
  };
  if (!hasLineOfSight(detector.hex, target.hex, detector.altitude, target.altitude, getTerrain)) {
    return false;
  }

  return true;
}

/**
 * Attempt visual detection.
 * Rule 10.21: Roll on Visual column with Visual Detection modifiers.
 */
export function attemptVisualDetection(
  detector: FlightState,
  target: FlightState,
  gameState: GameState
): DetectionResult {
  const dist = hexDistance(detector.hex, target.hex);

  let modifier = 0;

  // Range modifier
  if (dist >= 3) modifier -= 2;
  else if (dist >= 2) modifier -= 1;

  // Altitude difference
  const altDiff = altitudeDifference(detector.altitude, target.altitude);
  if (altDiff >= 2) modifier -= 1;

  // Target at deck
  if (target.altitude === 'deck') modifier -= 2;

  // Target in rough/mountain at deck
  const hexData = gameState.hexes[hexToId(target.hex)];
  if (target.altitude === 'deck' && hexData) {
    if (hexData.terrain.includes('mountain')) modifier -= 2;
    else if (hexData.terrain.includes('rough')) modifier -= 1;
  }

  const roll = roll2d10();
  const needed = VISUAL_DETECTION_BASE - modifier;
  const detected = roll >= needed;

  return {
    targetId: target.id,
    detected,
    roll,
    needed,
    modifiers: { altitudeMod: 0, terrainMod: 0, jamMod: 0, otherMod: modifier },
    totalModifier: modifier,
    method: 'visual',
  };
}

// ── Radar Search Detection (10.22) ───────────────────────────────

/**
 * Check if a flight can attempt radar search detection.
 * Rule 10.22: Radar-equipped, non-disordered, target in forward arc and in range.
 */
export function canAttemptRadarSearch(
  detector: FlightState,
  target: FlightState,
  gameState: GameState
): boolean {
  if (detector.disordered) return false;
  if (detector.side === target.side) return false;
  if (target.detected) return false;

  const aircraft = getAircraftData(detector.aircraftType);
  if (!aircraft?.hasRadar || !aircraft.radarRange) return false;

  const dist = hexDistance(detector.hex, target.hex);
  if (dist > aircraft.radarRange) return false;

  // Must be in forward arc
  if (!isInForwardArc(detector.hex, detector.heading, target.hex)) return false;

  // Lookdown restriction (10.23)
  if (altitudeIndex(target.altitude) < altitudeIndex(detector.altitude)) {
    if (aircraft.lookdown === 'No_LD') return false;
    if (aircraft.lookdown === 'LD_LTD' &&
      (target.altitude === 'deck' || target.altitude === 'low')) return false;
  }

  return true;
}

/**
 * Attempt radar search detection.
 * Rule 10.22: Roll on Radar Search column.
 */
export function attemptRadarSearch(
  detector: FlightState,
  target: FlightState,
  gameState: GameState
): DetectionResult {
  const aircraft = getAircraftData(detector.aircraftType);
  if (!aircraft) {
    return {
      targetId: target.id, detected: false, roll: 0, needed: 99,
      modifiers: { altitudeMod: 0, terrainMod: 0, jamMod: 0, otherMod: 0 },
      totalModifier: 0, method: 'radar',
    };
  }

  const dist = hexDistance(detector.hex, target.hex);
  let modifier = 0;

  // Range-based radar modifiers from ADC
  for (const rm of aircraft.radarModifiers) {
    if (dist >= rm.range) {
      modifier += rm.modifier;
    }
  }

  // Target altitude
  if (target.altitude === 'deck') modifier -= 3;
  else if (target.altitude === 'low') modifier -= 1;
  else if (target.altitude === 'high') modifier += 1;
  else if (target.altitude === 'veryHigh') modifier += 2;

  // Target terrain at deck
  const hexData = gameState.hexes[hexToId(target.hex)];
  if (target.altitude === 'deck' && hexData) {
    if (hexData.terrain.includes('mountain')) modifier -= 3;
    else if (hexData.terrain.includes('rough')) modifier -= 2;
  }

  // Defensive jamming
  const targetAircraft = getAircraftData(target.aircraftType);
  if (targetAircraft && targetAircraft.defensiveJamStrength > 0) {
    if (!target.markers.includes('maneuver')) {
      modifier -= targetAircraft.defensiveJamStrength;
    }
  }

  const base = 8; // Radar search base value
  const roll = roll2d10();
  const needed = base - modifier;
  const detected = roll >= needed;

  return {
    targetId: target.id,
    detected,
    roll,
    needed,
    modifiers: { altitudeMod: 0, terrainMod: 0, jamMod: 0, otherMod: modifier },
    totalModifier: modifier,
    method: 'radar',
  };
}

// ── EWR Detection (10.25) ────────────────────────────────────────

/**
 * Check if an EWR can attempt detection on a target.
 * Rule 10.25: Within 20 hexes (10 at Deck), radar on.
 */
export function canAttemptEWRDetection(
  ewr: GroundUnitState,
  target: FlightState
): boolean {
  if (target.detected) return false;
  if (ewr.side === target.side) return false;
  if (!ewr.radarOn) return false;
  if (ewr.damage === 'destroyed' || ewr.damage === 'heavy') return false;
  if (ewr.radarShutdown || ewr.radarSuppressedTurns > 0) return false;

  const dist = hexDistance(ewr.hex, target.hex);
  const maxRange = target.altitude === 'deck' ? 10 : 20;

  return dist <= maxRange;
}

/**
 * Attempt EWR detection.
 * Rule 10.25: Roll on B column with EWR modifiers.
 */
export function attemptEWRDetection(
  ewr: GroundUnitState,
  target: FlightState,
  gameState: GameState
): DetectionResult {
  let modifier = 0;

  // Target altitude
  if (target.altitude === 'deck') modifier -= 4;
  else if (target.altitude === 'low') modifier -= 2;
  else if (target.altitude === 'high') modifier += 2;
  else if (target.altitude === 'veryHigh') modifier += 4;

  // Target terrain at deck
  const hexData = gameState.hexes[hexToId(target.hex)];
  if (target.altitude === 'deck' && hexData) {
    if (hexData.terrain.includes('mountain')) modifier -= 3;
    else if (hexData.terrain.includes('rough')) modifier -= 2;
  }

  // Defensive jamming
  const aircraft = getAircraftData(target.aircraftType);
  if (aircraft && aircraft.defensiveJamStrength > 0) {
    if (!target.markers.includes('maneuver')) {
      modifier -= aircraft.defensiveJamStrength;
    }
  }

  const base = DETECTION_BASE['B']; // EWR uses B column
  const roll = roll2d10();
  const needed = base - modifier;
  const detected = roll >= needed;

  return {
    targetId: target.id,
    detected,
    roll,
    needed,
    modifiers: { altitudeMod: 0, terrainMod: 0, jamMod: 0, otherMod: modifier },
    totalModifier: modifier,
    method: 'ewr',
  };
}

// ── Track Phase (10.3) ───────────────────────────────────────────

/**
 * Determine which detected flights automatically become undetected
 * at the start of the Track Phase.
 *
 * Rule 10.3:
 * - All NATO detected flights at Deck in Rough hex
 * - All detected flights at Deck in/adjacent to Mountain hex
 * - All detected helicopter/cruise missile flights at Deck
 */
export function getAutoUndetectedFlights(gameState: GameState): string[] {
  const result: string[] = [];

  for (const flight of Object.values(gameState.flights)) {
    if (!flight.detected) continue;
    if (flight.altitude !== 'deck') continue;

    const hexData = gameState.hexes[hexToId(flight.hex)];
    if (!hexData) continue;

    // NATO flights at Deck in Rough
    if (flight.side === 'nato' && hexData.terrain.includes('rough')) {
      result.push(flight.id);
      continue;
    }

    // Any flight at Deck in Mountain
    if (hexData.terrain.includes('mountain')) {
      result.push(flight.id);
      continue;
    }

    // Check adjacent hexes for Mountain
    // (Simplified: would need to check all 6 neighbors)
  }

  return result;
}

/**
 * Track Table result: determines which suit symbols become undetected.
 * Rule 10.3: Roll 2d10 on Track Table by detection level.
 *
 * Returns list of suit symbols that become undetected.
 * Suits: 'heart', 'spade', 'diamond'
 * In curly brackets = only applies to Deck, chaff, or Low on own side.
 */
export interface TrackResult {
  roll: number;
  symbols: string[];
  restrictedSymbols: string[]; // Only apply to Deck/chaff/Low-own-side
}

/**
 * Roll on the Track Table.
 * Simplified: returns which generic suit categories become undetected.
 */
export function rollTrackTable(detectionLevel: string): TrackResult {
  const roll = roll2d10();
  const symbols: string[] = [];
  const restrictedSymbols: string[] = [];

  // Simplified track table results based on detection level
  // Better detection = harder to lose track
  const base = DETECTION_BASE[detectionLevel] ?? 10;

  if (roll <= base - 6) {
    symbols.push('heart', 'spade', 'diamond'); // All become undetected
  } else if (roll <= base - 3) {
    symbols.push('heart', 'spade');
  } else if (roll <= base) {
    restrictedSymbols.push('heart'); // Only restricted flights
  }
  // else: no effect

  return { roll, symbols, restrictedSymbols };
}

// ── Visual Identification (10.4) ─────────────────────────────────

/**
 * Check if a flight should be visually identified.
 * Rule 10.4: Occurs when:
 * a) Flight enters standard air-to-air combat
 * b) Non-disordered enemy flight within 1 hex, LOS, within 1 altitude band
 * c) Enemy AAA/SAM/Army unit within 1 hex with LOS
 */
export function shouldVisuallyIdentify(
  flight: FlightState,
  gameState: GameState
): boolean {
  if (flight.isVisuallyIdentified) return false;

  // Check for nearby enemy flights (condition b)
  for (const other of Object.values(gameState.flights)) {
    if (other.side === flight.side) continue;
    if (other.disordered) continue;

    const dist = hexDistance(flight.hex, other.hex);
    if (dist > 1) continue;

    const altDiff = altitudeDifference(flight.altitude, other.altitude);
    if (altDiff > 1) continue;

    // Check LOS
    const getTerrain = (hex: HexCoord) => {
      const data = gameState.hexes[hexToId(hex)];
      return data?.terrain ?? ['land'];
    };
    if (hasLineOfSight(flight.hex, other.hex, flight.altitude, other.altitude, getTerrain)) {
      return true;
    }
  }

  // Check for nearby enemy ground units (condition c)
  for (const unit of Object.values(gameState.groundUnits)) {
    if (unit.side === flight.side) continue;
    if (unit.hidden) continue;

    const dist = hexDistance(flight.hex, unit.hex);
    if (dist > 1) continue;

    const getTerrain = (hex: HexCoord) => {
      const data = gameState.hexes[hexToId(hex)];
      return data?.terrain ?? ['land'];
    };
    if (hasLineOfSight(flight.hex, unit.hex, flight.altitude, 'deck', getTerrain)) {
      return true;
    }
  }

  return false;
}

// ── Run Full Detection Phase ─────────────────────────────────────

/**
 * Execute the full Detection Phase for all undetected enemy flights.
 * Returns all detection results.
 */
export function runDetectionPhase(gameState: GameState): DetectionResult[] {
  const results: DetectionResult[] = [];

  for (const target of Object.values(gameState.flights)) {
    if (target.detected) continue;
    if (target.isDummy) continue; // Dummies detected = removed

    const detectingSide: Side = target.side === 'nato' ? 'wp' : 'nato';
    const detectionLevel = detectingSide === 'nato'
      ? gameState.natoDetectionLevel
      : gameState.wpDetectionLevel;

    // 1. Standard detection
    const stdResult = attemptStandardDetection(target, detectionLevel, gameState);
    results.push(stdResult);
    if (stdResult.detected) continue; // Already detected, skip other methods

    // 2. Visual detection - find best eligible detector
    const detectors = Object.values(gameState.flights).filter(
      (f) => f.side === detectingSide && canAttemptVisualDetection(f, target, gameState)
    );
    if (detectors.length > 0) {
      // Use closest detector (rule 10.21: make only one attempt per enemy flight)
      const closest = detectors.sort(
        (a, b) => hexDistance(a.hex, target.hex) - hexDistance(b.hex, target.hex)
      )[0];
      const visResult = attemptVisualDetection(closest, target, gameState);
      results.push(visResult);
      if (visResult.detected) continue;
    }

    // 3. Radar search - find best eligible searcher
    const radarSearchers = Object.values(gameState.flights).filter(
      (f) => f.side === detectingSide && canAttemptRadarSearch(f, target, gameState)
    );
    if (radarSearchers.length > 0) {
      const best = radarSearchers[0]; // One attempt per enemy flight
      const radarResult = attemptRadarSearch(best, target, gameState);
      results.push(radarResult);
      if (radarResult.detected) continue;
    }

    // 4. EWR detection
    const ewrs = Object.values(gameState.groundUnits).filter(
      (u) => u.type === 'ewr' && u.side === detectingSide && canAttemptEWRDetection(u, target)
    );
    if (ewrs.length > 0) {
      const ewr = ewrs[0]; // One EWR attempt per enemy flight
      const ewrResult = attemptEWRDetection(ewr, target, gameState);
      results.push(ewrResult);
    }
  }

  return results;
}

/**
 * Apply detection results to the game state.
 */
export function applyDetectionResults(
  gameState: GameState,
  results: DetectionResult[]
): GameState {
  const flights = { ...gameState.flights };

  for (const result of results) {
    if (result.detected && flights[result.targetId]) {
      flights[result.targetId] = {
        ...flights[result.targetId],
        detected: true,
      };
    }
  }

  return { ...gameState, flights };
}

/**
 * Apply Track Phase results.
 */
export function applyTrackPhase(gameState: GameState): {
  state: GameState;
  autoUndetected: string[];
  trackResult: TrackResult;
} {
  const flights = { ...gameState.flights };

  // Auto-undetect flights at Deck in Rough/Mountain
  const autoUndetected = getAutoUndetectedFlights(gameState);
  for (const fid of autoUndetected) {
    if (flights[fid]) {
      flights[fid] = { ...flights[fid], detected: false };
    }
  }

  // Roll Track Table for NATO detection level (tracking WP flights)
  const natoTrack = rollTrackTable(gameState.natoDetectionLevel);
  // Roll Track Table for WP detection level (tracking NATO flights)
  const wpTrack = rollTrackTable(gameState.wpDetectionLevel);

  // Apply track results (simplified: use symbols to undetect matching flights)
  // In full implementation, each flight counter has a suit symbol

  return {
    state: { ...gameState, flights },
    autoUndetected,
    trackResult: natoTrack, // Return NATO's track for display
  };
}
