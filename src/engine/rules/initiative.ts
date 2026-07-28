/**
 * Initiative and chit draw system.
 *
 * Reference: Rules section 5.0
 *
 * The initiative system determines the order flights move each turn:
 * 1. Roll a die to determine initiative winner (1-5 NATO, 6-10 WP)
 *    Correction: 1-6 NATO, 7+ WP (rule 5.2)
 * 2. Initiative winner chooses who draws first
 * 3. Players alternate drawing chits from their pool
 * 4. Each chit value = number of flights that player must move
 * 5. Continue until all flights have moved
 */

import { Side, GameState } from '../state/GameState';

// ── Chit Pool ────────────────────────────────────────────────────

/**
 * Chit pool values.
 * The pool contains chits numbered with different movement values.
 * Large Force side: 10+ flights; Small Force side: 9 or fewer flights.
 *
 * Rule 5.1: Chits have values from 0 to 5.
 * The exact chit distribution follows the physical game components.
 */

// Small Force chit values (9 or fewer flights)
const SMALL_FORCE_CHITS = [0, 1, 1, 1, 2, 2, 2, 3, 3, 4];

// Large Force chit values (10+ flights)
const LARGE_FORCE_CHITS = [0, 1, 1, 2, 2, 3, 3, 4, 4, 5];

/**
 * Draw a random chit from the appropriate pool.
 */
export function drawChit(flightCount: number): number {
  const pool = flightCount >= 10 ? LARGE_FORCE_CHITS : SMALL_FORCE_CHITS;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}

// ── Initiative Roll ──────────────────────────────────────────────

/**
 * Roll for initiative at the start of the Movement Phase.
 * Rule 5.2: Roll 1d10. 1-6 = NATO has initiative. 7+ = WP has initiative.
 *
 * @returns The side that wins initiative
 */
export function rollInitiative(): { winner: Side; roll: number } {
  const roll = Math.floor(Math.random() * 10) + 1; // 1-10
  const winner: Side = roll <= 6 ? 'nato' : 'wp';
  return { winner, roll };
}

// ── Flight Counting ──────────────────────────────────────────────

/**
 * Count the number of airborne flights (including dummies) for a side.
 * Rule 5.22: Count all airborne flight counters including dummies
 * and flights placed off-map set to enter this turn.
 * Flights on the ground don't count until airborne.
 */
export function countAirborneFlights(
  gameState: GameState,
  side: Side
): number {
  return Object.values(gameState.flights).filter(
    (f) => f.side === side && !f.isOnGround
  ).length;
}

/**
 * Count flights that still need to move this Movement Phase.
 */
export function countUnmovedFlights(
  gameState: GameState,
  side: Side
): number {
  return Object.values(gameState.flights).filter(
    (f) =>
      f.side === side &&
      !f.isOnGround &&
      !f.hasMovedThisPhase &&
      !f.inDefensiveWheel // Flights in defensive wheels don't move
  ).length;
}

/**
 * Get the list of flights that can be selected for movement.
 */
export function getMovableFlights(
  gameState: GameState,
  side: Side
): string[] {
  return Object.values(gameState.flights)
    .filter(
      (f) =>
        f.side === side &&
        !f.isOnGround &&
        !f.hasMovedThisPhase &&
        !f.inDefensiveWheel
    )
    .map((f) => f.id);
}

// ── Initiative State Machine ─────────────────────────────────────

export interface InitiativeResult {
  winner: Side;
  roll: number;
}

export interface ChitDrawResult {
  side: Side;
  value: number;
  flightsToMove: number;
  isLargeForce: boolean;
}

/**
 * Execute a chit draw for a side.
 */
export function executeChitDraw(
  gameState: GameState,
  side: Side
): ChitDrawResult {
  const flightCount = countAirborneFlights(gameState, side);
  const isLargeForce = flightCount >= 10;
  const value = drawChit(flightCount);

  // The chit value is the number of flights to move,
  // but can't exceed the number of unmoved flights
  const unmoved = countUnmovedFlights(gameState, side);
  const flightsToMove = Math.min(value, unmoved);

  return {
    side,
    value,
    flightsToMove,
    isLargeForce,
  };
}

/**
 * Check if the Movement Phase is complete.
 * All flights on both sides have moved.
 */
export function isMovementPhaseComplete(gameState: GameState): boolean {
  const natoUnmoved = countUnmovedFlights(gameState, 'nato');
  const wpUnmoved = countUnmovedFlights(gameState, 'wp');
  return natoUnmoved === 0 && wpUnmoved === 0;
}

/**
 * Determine whose turn it is to draw a chit.
 * If all flights on one side have moved, the other side moves all remaining.
 */
export function getNextChitDrawSide(
  gameState: GameState,
  lastDrawSide: Side | null,
  initiativeWinner: Side
): Side | null {
  const natoUnmoved = countUnmovedFlights(gameState, 'nato');
  const wpUnmoved = countUnmovedFlights(gameState, 'wp');

  if (natoUnmoved === 0 && wpUnmoved === 0) return null; // Phase complete

  // If one side is done, the other moves all remaining
  if (natoUnmoved === 0) return 'wp';
  if (wpUnmoved === 0) return 'nato';

  // Alternate between sides
  if (lastDrawSide === null) {
    // First draw: initiative winner chooses who goes first
    // For simplicity, the winner draws first (can be enhanced with UI choice)
    return initiativeWinner;
  }

  return lastDrawSide === 'nato' ? 'wp' : 'nato';
}
