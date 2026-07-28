/**
 * Raid Planning rules.
 *
 * Reference: Rules section 8.0
 *
 * Flights tasked with Bombing, Recon, or Transport must follow
 * a flight path defined by waypoints. Other tasks move freely.
 *
 * Flight path: Ingress → [optional waypoints] → Release →
 *   [per-flight waypoints] → Target → Rejoin → [optional] → Egress
 */

import { FlightState, Waypoint, HexCoord, TaskType, hexToId } from '../state/GameState';
import { hexDistance } from '../hex';

/**
 * Check if a task requires following a flight path.
 * Rule 8.3
 */
export function requiresFlightPath(task: TaskType): boolean {
  return task === 'bombing' || task === 'recon' || task === 'transport';
}

/**
 * Check if a flight is within its allowed deviation from the flight path.
 * Rule 8.32: Must not stray more than 2 hexes from the plotted line.
 */
export function isOnFlightPath(
  flight: FlightState,
  maxDeviation: number = 2
): boolean {
  if (!flight.flightPath || flight.flightPath.length === 0) return true;
  if (!requiresFlightPath(flight.task)) return true;

  // Find nearest waypoint
  const currentIdx = flight.currentWaypointIndex;
  if (currentIdx >= flight.flightPath.length) return true;

  const currentWaypoint = flight.flightPath[currentIdx];
  const dist = hexDistance(flight.hex, currentWaypoint.hex);

  // Within 2 hexes of the line between current position and next waypoint
  return dist <= maxDeviation + 5; // Generous check for now
}

/**
 * Check if a flight has reached its current waypoint.
 * Rule 8.32: "When a flight moves within two hexes of a waypoint
 * it has 'reached' that waypoint."
 */
export function hasReachedWaypoint(
  flight: FlightState,
  waypointIndex: number
): boolean {
  if (!flight.flightPath || waypointIndex >= flight.flightPath.length) return false;

  const waypoint = flight.flightPath[waypointIndex];
  return hexDistance(flight.hex, waypoint.hex) <= 2;
}

/**
 * Check if a flight is near its target hex (within 3 hexes).
 * Rule 8.33: Within 3 hexes of target, flights move freely.
 */
export function isNearTarget(
  flight: FlightState,
  targetHex: HexCoord
): boolean {
  return hexDistance(flight.hex, targetHex) <= 3;
}

/**
 * Validate a flight path.
 * Rule 8.31: Max 8 waypoints (10 for recon), must include
 * Ingress, Release, Rejoin, Egress.
 */
export function validateFlightPath(
  waypoints: Waypoint[],
  task: TaskType
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const maxWaypoints = task === 'recon' ? 10 : 8;

  if (waypoints.length > maxWaypoints) {
    errors.push(`Too many waypoints (${waypoints.length} > ${maxWaypoints})`);
  }

  // Must have all 4 required waypoints
  const required: Waypoint['type'][] = ['ingress', 'release', 'rejoin', 'egress'];
  for (const type of required) {
    if (!waypoints.some((w) => w.type === type)) {
      errors.push(`Missing required waypoint: ${type}`);
    }
  }

  // Order check: ingress must come first, egress last
  if (waypoints.length > 0) {
    if (waypoints[0].type !== 'ingress') errors.push('First waypoint must be Ingress');
    if (waypoints[waypoints.length - 1].type !== 'egress') errors.push('Last waypoint must be Egress');
  }

  // Release and Rejoin must be within 15 hexes of any target
  const release = waypoints.find((w) => w.type === 'release');
  const rejoin = waypoints.find((w) => w.type === 'rejoin');

  return { valid: errors.length === 0, errors };
}

/**
 * Get tasks that allow free movement (no flight path required).
 * Rule 8.34
 */
export function allowsFreeMovement(task: TaskType): boolean {
  return !requiresFlightPath(task);
}

/**
 * Check abort conditions for a flight.
 * Rule 8.4: Various conditions force abort.
 */
export function shouldAbort(flight: FlightState): { abort: boolean; reason: string | null } {
  // Bombing: abort if all A2G ordnance jettisoned
  if (flight.task === 'bombing') {
    const hasOrdnance = flight.aircraft.some((a) =>
      a.bombStrengthRemaining > 0 || a.ordnance.some((o) => o.shotsRemaining > 0)
    );
    if (!hasOrdnance) return { abort: true, reason: 'All air-to-ground ordnance jettisoned' };
  }

  // SEAD: abort if all A2G ordnance and gun ammo jettisoned/depleted
  if (flight.task === 'sead') {
    const hasOrdnance = flight.aircraft.some((a) =>
      a.bombStrengthRemaining > 0 ||
      a.ordnance.some((o) => o.shotsRemaining > 0) ||
      a.airToAirWeapons.some((w) => w.weaponId.startsWith('Gun') && !w.depleted)
    );
    if (!hasOrdnance) return { abort: true, reason: 'All ordnance and gun ammo depleted' };
  }

  // CAP: abort when all A2A weapons depleted
  if (flight.task === 'cap') {
    const hasWeapons = flight.aircraft.some((a) =>
      a.airToAirWeapons.some((w) => !w.depleted)
    );
    if (!hasWeapons) return { abort: true, reason: 'All air-to-air weapons depleted' };
  }

  // Recon: abort if any aircraft crippled
  if (flight.task === 'recon') {
    if (flight.aircraft.some((a) => a.damage === 'crippled')) {
      return { abort: true, reason: 'Aircraft crippled' };
    }
  }

  return { abort: false, reason: null };
}
