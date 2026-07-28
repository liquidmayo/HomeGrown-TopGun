/**
 * Bot Controller — orchestrates all AI behavior for the FSP bot side.
 *
 * Reference: Rules 33.2 - 33.5
 *
 * The bot controller is called during each phase to determine
 * actions for bot-side flights, SAMs, and AAA.
 */

import { GameState, FlightState, Side, hexToId } from '../engine/state/GameState';
import { hexDistance, getNeighbor, normalizeHeading, hexBearing } from '../engine/hex';
import { getAircraftData, getSpeed } from '../data/aircraft/aircraftDatabase';
import {
  determineBotAction, resolveBotMovement, buildBotContext, BotAction,
} from './tables/flightActionsTable';
import {
  shouldActivateFlight, rollFlightType,
} from './tables/flightActivationTable';
import {
  determineSAMAction, attemptSAMActivation, SAMBotAction,
} from './tables/samActionsTable';
import {
  determineAAAAction, attemptAAAActivation, AAABotAction,
} from './tables/aaaActionsTable';
import { initializeMovement } from '../engine/rules/movement';

export interface BotTurnResult {
  flightActions: { flightId: string; action: BotAction; movement: ReturnType<typeof resolveBotMovement> }[];
  samActions: { samId: string; action: SAMBotAction }[];
  activations: {
    flights: { genericId: string; activated: boolean; type: string | null }[];
    sams: { warningId: string; activated: boolean; type: string | null }[];
  };
  log: string[];
}

/**
 * Execute a full bot turn during the Movement Phase.
 * Activates generic flights, moves all bot flights, and handles SAM/AAA.
 */
export function executeBotMovementPhase(
  gameState: GameState,
  botSide: Side
): BotTurnResult {
  const log: string[] = [];
  const flightActions: BotTurnResult['flightActions'] = [];
  const samActions: BotTurnResult['samActions'] = [];
  const activatedFlights: BotTurnResult['activations']['flights'] = [];
  const activatedSAMs: BotTurnResult['activations']['sams'] = [];

  // 1. Check for flight activations
  const genericFlights = Object.values(gameState.flights).filter(
    (f) => f.side === botSide && f.genericCounterId !== null && !f.isOnGround
  );

  const realFlightsCount = Object.values(gameState.flights).filter(
    (f) => f.side === botSide && f.genericCounterId === null && !f.isOnGround
  ).length;

  const maxReal = gameState.botState?.maxRealFlights ?? 10;

  for (const generic of genericFlights) {
    // Find nearest enemy
    let nearestDist = Infinity;
    for (const enemy of Object.values(gameState.flights)) {
      if (enemy.side === botSide) continue;
      if (enemy.isOnGround) continue;
      const d = hexDistance(generic.hex, enemy.hex);
      if (d < nearestDist) nearestDist = d;
    }

    const activationCheck = shouldActivateFlight(nearestDist, realFlightsCount, maxReal);
    activatedFlights.push({
      genericId: generic.id,
      activated: activationCheck.activate,
      type: activationCheck.activate ? 'activated' : null,
    });

    if (activationCheck.activate) {
      log.push(`${generic.id}: Activated (roll ${activationCheck.roll} vs ${activationCheck.needed})`);
    }
  }

  // 2. Determine actions for all bot flights
  const botFlights = Object.values(gameState.flights).filter(
    (f) => f.side === botSide && !f.isOnGround && !f.hasMovedThisPhase
  );

  for (const flight of botFlights) {
    const context = buildBotContext(flight, gameState);
    const action = determineBotAction(flight, gameState, context);
    const movement = resolveBotMovement(flight, action, gameState);

    flightActions.push({ flightId: flight.id, action, movement });
    log.push(`${flight.id}: ${action.reason} → hdg ${movement.heading}°, ${movement.throttle} spd ${movement.speed}`);
  }

  // 3. Determine SAM actions
  const botSAMs = Object.values(gameState.groundUnits).filter(
    (u) => u.side === botSide && u.type === 'sam' && u.damage !== 'destroyed'
  );

  for (const sam of botSAMs) {
    if (sam.isSAMWarning) continue; // Warnings handled separately
    const action = determineSAMAction(sam, gameState);
    samActions.push({ samId: sam.id, action });
    if (action.type !== 'holdFire') {
      log.push(`SAM ${sam.id}: ${action.reason}`);
    }
  }

  return {
    flightActions,
    samActions,
    activations: { flights: activatedFlights, sams: activatedSAMs },
    log,
  };
}

/**
 * Apply bot movement results to the game state.
 * Moves each bot flight according to its determined heading and speed.
 */
export function applyBotMovement(
  gameState: GameState,
  botResult: BotTurnResult
): GameState {
  let state = { ...gameState, flights: { ...gameState.flights } };

  for (const fa of botResult.flightActions) {
    const flight = state.flights[fa.flightId];
    if (!flight) continue;

    // Initialize movement
    let updated = initializeMovement(flight, fa.movement.throttle, fa.movement.speed);

    // Set heading
    updated = { ...updated, heading: fa.movement.heading };

    // Simple movement: move forward spending all MP
    for (let mp = 0; mp < updated.speed; mp++) {
      // Move one hex in current heading direction
      const headingToDir: Record<number, 0 | 1 | 2 | 3 | 4 | 5> = {
        0: 0, 60: 5, 120: 4, 180: 3, 240: 2, 300: 1,
      };

      const dir = headingToDir[normalizeHeading(updated.heading)];
      if (dir !== undefined) {
        const nextHex = getNeighbor(updated.hex, dir);
        // Basic bounds check
        if (nextHex.col >= 0 && nextHex.col <= 79 && nextHex.row >= 0 && nextHex.row <= 50) {
          updated = { ...updated, hex: nextHex };
        }
      }
      updated = { ...updated, mpRemaining: updated.mpRemaining - 1 };
    }

    // Mark as moved
    updated = {
      ...updated,
      hasMovedThisPhase: true,
      hasMoved: true,
      mpRemaining: 0,
    };

    state.flights[fa.flightId] = updated;
  }

  return state;
}

/**
 * Execute bot SAM acquisition phase.
 */
export function executeBotSAMAcquisition(
  gameState: GameState,
  botSide: Side
): { actions: { samId: string; action: SAMBotAction }[]; log: string[] } {
  const actions: { samId: string; action: SAMBotAction }[] = [];
  const log: string[] = [];

  const botSAMs = Object.values(gameState.groundUnits).filter(
    (u) => u.side === botSide && u.type === 'sam' && u.damage !== 'destroyed' && u.radarOn
  );

  for (const sam of botSAMs) {
    if (sam.isSAMWarning) continue;
    const action = determineSAMAction(sam, gameState);
    actions.push({ samId: sam.id, action });
    if (action.type !== 'holdFire') {
      log.push(`SAM ${sam.id}: ${action.reason}`);
    }
  }

  return { actions, log };
}
