/**
 * Movement rules for Red Storm.
 *
 * Reference: Rules sections 6.0 - 6.4
 *
 * Key concepts:
 * - Flights move by spending Movement Points (MP)
 * - Speed is determined by aircraft type, altitude, and throttle
 * - Each MP spent allows: Move into hex, Turn, Climb, Dive, or special actions
 * - Free turns are allowed on entering a hex, climbing, or diving
 * - Stacking rules limit where flights can end movement
 */

import { FlightState, AltitudeBand, HexCoord, Throttle, GameState, hexToId } from '../state/GameState';
import { getAircraftData, getSpeed } from '../../data/aircraft/aircraftDatabase';
import {
  getNeighbor, hexDistance, isValidHex, altitudeIndex,
  altitudeFromIndex, normalizeHeading, HexDirection,
} from '../hex';

// ── Turn Table (Rule 6.32) ───────────────────────────────────────

interface TurnLimits {
  freeTurnDay: number;    // Free turn allowance (degrees)
  freeTurnNight: number;
  maxTurnDay: number;     // Max turn in same altitude band (degrees)
  maxTurnNight: number;
}

/**
 * Get turn limits based on flight speed.
 * Reference: Turn Table, rule 6.32
 */
export function getTurnLimits(speed: number): TurnLimits {
  if (speed <= 2) {
    return { freeTurnDay: 90, freeTurnNight: 60, maxTurnDay: 180, maxTurnNight: 60 };
  } else if (speed <= 4) {
    return { freeTurnDay: 60, freeTurnNight: 60, maxTurnDay: 120, maxTurnNight: 60 };
  } else if (speed <= 8) {
    return { freeTurnDay: 30, freeTurnNight: 30, maxTurnDay: 90, maxTurnNight: 60 };
  } else {
    return { freeTurnDay: 0, freeTurnNight: 0, maxTurnDay: 30, maxTurnNight: 30 };
  }
}

// ── Movement Actions ─────────────────────────────────────────────

export type MovementAction =
  | { type: 'move'; direction: HexDirection }
  | { type: 'turn'; degrees: number }     // Positive = clockwise
  | { type: 'climb' }
  | { type: 'dive'; toAltitude: AltitudeBand }
  | { type: 'samAvoidance' }
  | { type: 'antiRadarTactics' }
  | { type: 'removeMarker'; marker: 'maneuver' | 'bvrAvoid' | 'samAvoid' };

// ── Speed Calculation ────────────────────────────────────────────

/**
 * Calculate the legal speed range for a flight.
 * Returns [min, max] inclusive.
 *
 * Rule 6.21: Combat throttle = max combat speed or one less (min 1).
 * Rule 6.22: Dash throttle = between combat and max dash speed.
 */
export function getSpeedRange(
  flight: FlightState,
  throttle: Throttle
): { min: number; max: number } | null {
  const aircraft = getAircraftData(flight.aircraftType);
  if (!aircraft) return null;

  const isLaden = isFlightLaden(flight);
  const maxCombat = getSpeed(aircraft, flight.altitude, 'combat', isLaden);
  if (maxCombat === null) return null;

  if (throttle === 'combat') {
    const min = Math.max(1, maxCombat - 1);
    return { min, max: maxCombat };
  }

  // Dash throttle
  if (flight.aircraft.some((a) => a.damage === 'crippled')) {
    return null; // Crippled aircraft cannot use Dash (rule 6.22)
  }

  const maxDash = getSpeed(aircraft, flight.altitude, 'dash', isLaden);
  if (maxDash === null) return null;

  return { min: maxCombat + 1, max: maxDash };
}

/**
 * Check if a flight is laden (carrying air-to-ground ordnance).
 * Rule 16.2: Flights with any aircraft carrying A2G ordnance are laden.
 * Exception: Shrike ARMs only don't count.
 */
export function isFlightLaden(flight: FlightState): boolean {
  return flight.aircraft.some((a) =>
    a.bombStrengthRemaining > 0 ||
    a.ordnance.some((o) => o.shotsRemaining > 0 && o.type !== 'shrike')
  );
}

/**
 * Get the ordnance speed limit for a flight.
 * Rule 16.23: Various ordnance types limit max speed.
 */
export function getOrdnanceSpeedLimit(flight: FlightState): number {
  let limit = Infinity;

  for (const ac of flight.aircraft) {
    if (ac.bombStrengthRemaining > 0) limit = Math.min(limit, 4);
    for (const ord of ac.ordnance) {
      if (ord.shotsRemaining <= 0) continue;
      switch (ord.type) {
        case 'bombs': case 'arb': case 'cbu': case 'lgb': case 'eogb': case 'chaff':
          limit = Math.min(limit, 4); break;
        case 'rockets': case 'harm': case 'shrike': case 'eogm':
        case 'kh25mp': case 'kh58': case 'kh28m': case 'as37':
        case 'mw1a': case 'mw1b': case 'jp233': case 'kmgu': case 'nuke':
          limit = Math.min(limit, 5); break;
      }
    }
  }

  return limit === Infinity ? 99 : limit;
}

// ── Movement Validation ──────────────────────────────────────────

/**
 * Get all valid movement actions for a flight in its current state.
 */
export function getValidActions(
  flight: FlightState,
  gameState: GameState,
  isNight: boolean
): MovementAction[] {
  const actions: MovementAction[] = [];

  if (flight.mpRemaining <= 0) return actions;

  // Must remove markers first (rule 6.38)
  if (flight.markers.includes('maneuver')) {
    // Maneuver marker costs half MP (rounded up) to remove
    actions.push({ type: 'removeMarker', marker: 'maneuver' });
    return actions; // Can only do this until marker is removed
  }
  if (flight.markers.includes('bvrAvoid')) {
    actions.push({ type: 'removeMarker', marker: 'bvrAvoid' });
    return actions;
  }
  if (flight.markers.includes('samAvoid')) {
    actions.push({ type: 'removeMarker', marker: 'samAvoid' });
    return actions;
  }

  const turnLimits = getTurnLimits(flight.speed);
  const freeTurn = isNight ? turnLimits.freeTurnNight : turnLimits.freeTurnDay;

  // Move: enter adjacent hex in facing direction
  const moveActions = getMoveDirections(flight);
  for (const dir of moveActions) {
    const targetHex = getHexInDirection(flight.hex, flight.heading, dir);
    if (targetHex && isValidHex(targetHex)) {
      // Check mountain restriction at Deck (rule 6.34)
      const hexData = gameState.hexes[hexToId(targetHex)];
      if (flight.altitude === 'deck' && hexData?.terrain.includes('mountain')) {
        const aircraft = getAircraftData(flight.aircraftType);
        if (!aircraft?.hasTFR) continue; // Cannot enter mountain at Deck without TFR
      }
      actions.push({ type: 'move', direction: dir });
    }
  }

  // Turn: costs 1 MP (rule 6.31)
  const maxTurn = isNight ? turnLimits.maxTurnNight : turnLimits.maxTurnDay;
  if (maxTurn > 0) {
    // Can turn clockwise or counter-clockwise in 30-degree increments
    for (let deg = 30; deg <= maxTurn; deg += 30) {
      actions.push({ type: 'turn', degrees: deg });
      actions.push({ type: 'turn', degrees: -deg });
    }
  }

  // Climb: costs 1 MP (first climb), 2 MP (subsequent = zoom climb)
  const currentAltIdx = altitudeIndex(flight.altitude);
  if (currentAltIdx < 4) { // Can't climb above Very High
    const nextAlt = altitudeFromIndex(currentAltIdx + 1);
    const aircraft = getAircraftData(flight.aircraftType);

    // Check if aircraft can operate at next altitude
    if (aircraft) {
      const speedAtNext = getSpeed(aircraft, nextAlt, flight.throttle, isFlightLaden(flight));
      if (speedAtNext !== null) {
        const hasClimbedThisTurn = flight.markers.includes('zoomClimb');
        const climbCost = hasClimbedThisTurn ? 2 : 1; // Zoom climb costs 2 MP

        if (flight.mpRemaining >= climbCost) {
          // Zoom climb restrictions (rule 6.33)
          if (hasClimbedThisTurn) {
            // Cannot zoom climb if laden or at combat throttle
            if (!isFlightLaden(flight) && flight.throttle === 'dash') {
              actions.push({ type: 'climb' });
            }
          } else {
            actions.push({ type: 'climb' });
          }
        }
      }
    }
  }

  // Dive: costs 1 MP, can dive to any lower altitude (rule 6.31)
  if (currentAltIdx > 0) {
    for (let i = currentAltIdx - 1; i >= 0; i--) {
      const targetAlt = altitudeFromIndex(i);
      // Cannot dive to Deck in Mountain hex without TFR (rule 6.34)
      if (targetAlt === 'deck') {
        const hexData = gameState.hexes[hexToId(flight.hex)];
        if (hexData?.terrain.includes('mountain')) {
          const aircraft = getAircraftData(flight.aircraftType);
          if (!aircraft?.hasTFR) continue;
        }
      }
      actions.push({ type: 'dive', toAltitude: targetAlt });
    }
  }

  return actions;
}

/**
 * Get the hex directions the flight can move into based on its heading.
 * A flight moves into the hex directly ahead.
 */
function getMoveDirections(flight: FlightState): HexDirection[] {
  // Map heading to hex direction
  // Heading 0 (east) = direction 0, heading 60 (SE) = 5, etc.
  // For flat-top hexes: 0°=E, 60°=SE, 120°=SW, 180°=W, 240°=NW, 300°=NE
  const headingToDir: Record<number, HexDirection> = {
    0: 0,     // E
    60: 5,    // SE
    120: 4,   // SW
    180: 3,   // W
    240: 2,   // NW
    300: 1,   // NE
  };

  const dir = headingToDir[normalizeHeading(flight.heading)];
  if (dir !== undefined) return [dir];

  // If heading is at 30-degree offset (on a hexside), flight can move into either adjacent hex
  // Heading 30 -> between E(0) and NE(1) -> can enter either
  const h = normalizeHeading(flight.heading);
  const between: Record<number, HexDirection[]> = {
    30: [0, 1],   // Between E and NE
    90: [0, 5],   // Between E and SE
    150: [5, 4],  // Between SE and SW
    210: [4, 3],  // Between SW and W
    270: [3, 2],  // Between W and NW
    330: [2, 1],  // Between NW and NE
  };

  return between[h] ?? [];
}

/**
 * Get the target hex when moving in a direction from a given hex.
 */
function getHexInDirection(
  hex: HexCoord,
  heading: number,
  direction: HexDirection
): HexCoord | null {
  return getNeighbor(hex, direction);
}

// ── Apply Movement ───────────────────────────────────────────────

/**
 * Apply a movement action to a flight and return the updated flight state.
 * This is a pure function — it does not modify the input.
 */
export function applyMovementAction(
  flight: FlightState,
  action: MovementAction,
  gameState: GameState,
  isNight: boolean
): FlightState {
  const updated = { ...flight, markers: [...flight.markers] };

  switch (action.type) {
    case 'move': {
      const targetHex = getNeighbor(flight.hex, action.direction);
      updated.hex = targetHex;
      updated.mpRemaining -= 1;
      updated.hasMoved = true;
      updated.hasMovedThisPhase = true;
      break;
    }

    case 'turn': {
      updated.heading = normalizeHeading(flight.heading + action.degrees);
      updated.mpRemaining -= 1;
      break;
    }

    case 'climb': {
      const currentIdx = altitudeIndex(flight.altitude);
      const hasClimbed = flight.markers.includes('zoomClimb');
      updated.altitude = altitudeFromIndex(currentIdx + 1);
      updated.mpRemaining -= hasClimbed ? 2 : 1;
      if (hasClimbed || updated.markers.includes('zoomClimb')) {
        // Already has zoom climb marker
      } else if (currentIdx + 1 > altitudeIndex(flight.altitude)) {
        // Will need zoom climb marker for next climb
      }
      // Mark that we've climbed (for zoom climb tracking)
      if (!updated.markers.includes('zoomClimb')) {
        // First climb this turn - no marker yet, but track for next climb
      }
      updated.hasMoved = true;
      break;
    }

    case 'dive': {
      updated.altitude = action.toAltitude;
      updated.mpRemaining -= 1;
      updated.hasMoved = true;
      break;
    }

    case 'removeMarker': {
      if (action.marker === 'maneuver') {
        // Costs half MP rounded up (rule 6.35)
        const cost = Math.ceil(flight.speed / 2);
        updated.mpRemaining -= cost;
        updated.markers = updated.markers.filter((m) => m !== 'maneuver');
      } else {
        // BVR Avoid and SAM Avoid cost 1 MP each (rules 6.36, 6.37)
        updated.mpRemaining -= 1;
        updated.markers = updated.markers.filter((m) => m !== action.marker);
      }
      break;
    }

    case 'samAvoidance':
    case 'antiRadarTactics':
      // These will be fully implemented in Phase 5
      updated.mpRemaining -= 1;
      break;
  }

  return updated;
}

// ── Stacking Validation ──────────────────────────────────────────

/**
 * Check if a flight can end movement in a given hex.
 * Rule 6.4: Cannot stack with friendly flights at end of movement
 * (exceptions for scatter, SAM avoidance, defensive wheel).
 */
export function canEndMovementInHex(
  flight: FlightState,
  hex: HexCoord,
  altitude: AltitudeBand,
  gameState: GameState
): boolean {
  const flights = Object.values(gameState.flights);

  for (const other of flights) {
    if (other.id === flight.id) continue;
    if (other.side !== flight.side) continue; // Enemy stacking OK
    if (other.hex.col !== hex.col || other.hex.row !== hex.row) continue;
    if (other.altitude !== altitude) continue;

    // Same hex, same altitude, same side = stacking violation
    // Exception: defensive wheels
    if (other.inDefensiveWheel && flight.inDefensiveWheel) continue;

    return false;
  }

  return true;
}

// ── Initialize Movement for a Flight ─────────────────────────────

/**
 * Set up a flight for movement at the start of its activation.
 * Sets throttle and speed.
 */
export function initializeMovement(
  flight: FlightState,
  throttle: Throttle,
  speed: number
): FlightState {
  return {
    ...flight,
    throttle,
    speed,
    mpRemaining: speed,
    hasMovedThisPhase: false,
  };
}
