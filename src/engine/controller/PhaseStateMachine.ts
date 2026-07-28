/**
 * Phase State Machine for Red Storm.
 *
 * Enforces the strict phase sequence from rule 3.2:
 * Random Event -> Jamming -> Detection -> Movement ->
 * Fuel -> SAM Location -> Track -> SAM Acquisition -> Admin
 *
 * The first turn skips Random Event.
 */

import { GamePhase, GameState } from '../state/GameState';

const PHASE_ORDER: GamePhase[] = [
  'randomEvent',
  'jamming',
  'detection',
  'movement',
  'fuel',
  'samLocation',
  'track',
  'samAcquisition',
  'admin',
];

/**
 * Get the next phase in the sequence.
 * Returns null if the scenario is completed.
 */
export function getNextPhase(
  currentPhase: GamePhase,
  turn: number,
  maxTurns: number | null
): GamePhase | null {
  if (currentPhase === 'completed') return null;

  if (currentPhase === 'setup') {
    // After setup, begin with Random Event (or skip on turn 1)
    return turn === 1 ? 'jamming' : 'randomEvent';
  }

  const currentIndex = PHASE_ORDER.indexOf(currentPhase);
  if (currentIndex === -1) return null;

  if (currentIndex < PHASE_ORDER.length - 1) {
    // Advance to next phase in the sequence
    const nextPhase = PHASE_ORDER[currentIndex + 1];

    // Skip Random Event on first turn (rule 3.2)
    if (nextPhase === 'randomEvent' && turn === 1) {
      return 'jamming';
    }

    return nextPhase;
  }

  // After Admin, start a new turn
  return null; // Signal to advance turn
}

/**
 * Advance to the next phase, potentially advancing the turn.
 * Returns the updated game state.
 */
export function advancePhase(gameState: GameState): GameState {
  const nextPhase = getNextPhase(
    gameState.phase,
    gameState.turn,
    gameState.maxTurns
  );

  if (nextPhase !== null) {
    return {
      ...gameState,
      phase: nextPhase,
      // Reset per-phase flight state when entering movement
      ...(nextPhase === 'movement'
        ? {
            flights: resetFlightsForMovement(gameState.flights),
            initiative: {
              winner: null,
              currentDrawer: null,
              chitValue: null,
              flightsMovedThisChit: 0,
              allFlightsMoved: false,
            },
          }
        : {}),
    };
  }

  // End of Admin phase: advance turn
  const newTurn = gameState.turn + 1;

  // Check if scenario is complete
  if (gameState.maxTurns !== null && newTurn > gameState.maxTurns) {
    return {
      ...gameState,
      phase: 'completed',
    };
  }

  // New turn starts with Random Event (or Jamming on turn 1)
  const firstPhase = newTurn === 1 ? 'jamming' : 'randomEvent';

  return {
    ...gameState,
    turn: newTurn,
    phase: firstPhase,
    flights: resetFlightsForNewTurn(gameState.flights),
  };
}

/**
 * Reset flight movement state at the start of the Movement Phase.
 */
function resetFlightsForMovement(
  flights: Record<string, import('../state/GameState').FlightState>
): Record<string, import('../state/GameState').FlightState> {
  const updated: Record<string, import('../state/GameState').FlightState> = {};
  for (const [id, flight] of Object.entries(flights)) {
    updated[id] = {
      ...flight,
      hasMovedThisPhase: false,
      mpRemaining: 0,
      speed: 0,
    };
  }
  return updated;
}

/**
 * Reset flight state at the start of a new turn.
 */
function resetFlightsForNewTurn(
  flights: Record<string, import('../state/GameState').FlightState>
): Record<string, import('../state/GameState').FlightState> {
  const updated: Record<string, import('../state/GameState').FlightState> = {};
  for (const [id, flight] of Object.entries(flights)) {
    updated[id] = {
      ...flight,
      hasMoved: false,
      hasMovedThisPhase: false,
      mpRemaining: 0,
      speed: 0,
      // Remove end-of-turn markers (rule 3.2 Admin Phase)
      markers: flight.markers.filter(
        (m) => m !== 'zoomClimb' && m !== 'maxTurn' && m !== 'antiRadarTactics'
      ),
    };
  }
  return updated;
}

/**
 * Get a human-readable label for a phase.
 */
export function getPhaseLabel(phase: GamePhase): string {
  const labels: Record<GamePhase, string> = {
    setup: 'Setup',
    randomEvent: 'Random Event',
    jamming: 'Jamming',
    detection: 'Detection',
    movement: 'Movement',
    fuel: 'Fuel',
    samLocation: 'SAM Location',
    track: 'Track',
    samAcquisition: 'SAM Acquisition',
    admin: 'Admin',
    completed: 'Scenario Complete',
  };
  return labels[phase];
}

/**
 * Get the index of a phase in the sequence (for progress display).
 */
export function getPhaseIndex(phase: GamePhase): number {
  if (phase === 'setup') return -1;
  if (phase === 'completed') return PHASE_ORDER.length;
  return PHASE_ORDER.indexOf(phase);
}
