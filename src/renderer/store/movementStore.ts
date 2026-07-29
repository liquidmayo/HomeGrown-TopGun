/**
 * Movement Phase UI state.
 *
 * Manages the step-by-step flow during the Movement Phase:
 * 1. Roll initiative
 * 2. Draw chit (determines how many flights to move)
 * 3. Select a flight to move
 * 4. Choose throttle and speed
 * 5. Move the flight hex by hex (spending MP)
 * 6. Repeat until all flights moved
 */

import { create } from 'zustand';
import { Side, HexCoord, AltitudeBand } from '@engine/state/GameState';

export type MovementStep =
  | 'idle'                    // Not in movement phase
  | 'rollInitiative'         // Need to roll for initiative
  | 'chitDraw'               // Drawing a chit
  | 'selectFlight'           // Player selects which flight to move
  | 'setSpeed'               // Player chooses throttle and speed
  | 'moving'                 // Flight is spending MP
  | 'flightDone'             // Flight finished moving
  | 'phaseComplete';         // All flights moved

export interface ValidMoveHex {
  hex: HexCoord;
  direction: number;
  actionType: 'move';
}

interface MovementStore {
  // Current step in the movement flow
  step: MovementStep;

  // Initiative
  initiativeWinner: Side | null;
  initiativeRoll: number | null;

  // Current chit draw
  currentDrawSide: Side | null;
  chitValue: number | null;
  flightsToMoveThisChit: number;
  flightsMovedThisChit: number;

  // Active flight being moved
  activeFlightId: string | null;

  // Valid move destinations (highlighted on map)
  validMoveHexes: ValidMoveHex[];

  // Movement log for current flight
  movementLog: string[];

  // Undo stack: snapshots of game state after each MP spent
  movementUndoStack: string[];

  // Actions
  setStep: (step: MovementStep) => void;
  setInitiativeResult: (winner: Side, roll: number) => void;
  setChitResult: (side: Side, value: number, flightsToMove: number) => void;
  setActiveFlight: (flightId: string | null) => void;
  setValidMoveHexes: (hexes: ValidMoveHex[]) => void;
  addMovementLog: (message: string) => void;
  pushUndoSnapshot: (stateJson: string) => void;
  popUndoSnapshot: () => string | null;
  flightMoved: () => void;
  reset: () => void;
}

export const useMovementStore = create<MovementStore>((set) => ({
  step: 'idle',
  initiativeWinner: null,
  initiativeRoll: null,
  currentDrawSide: null,
  chitValue: null,
  flightsToMoveThisChit: 0,
  flightsMovedThisChit: 0,
  activeFlightId: null,
  validMoveHexes: [],
  movementLog: [],
  movementUndoStack: [],

  setStep: (step) => set({ step }),

  setInitiativeResult: (winner, roll) =>
    set({ initiativeWinner: winner, initiativeRoll: roll }),

  setChitResult: (side, value, flightsToMove) =>
    set({
      currentDrawSide: side,
      chitValue: value,
      flightsToMoveThisChit: flightsToMove,
      flightsMovedThisChit: 0,
    }),

  setActiveFlight: (flightId) =>
    set({ activeFlightId: flightId, validMoveHexes: [], movementLog: [] }),

  setValidMoveHexes: (hexes) => set({ validMoveHexes: hexes }),

  addMovementLog: (message) =>
    set((s) => ({ movementLog: [...s.movementLog, message] })),

  pushUndoSnapshot: (stateJson) =>
    set((s) => ({ movementUndoStack: [...s.movementUndoStack, stateJson] })),

  popUndoSnapshot: () => {
    const store = useMovementStore.getState();
    const stack = [...store.movementUndoStack];
    if (stack.length === 0) return null;
    const snapshot = stack.pop()!;
    useMovementStore.setState({ movementUndoStack: stack });
    return snapshot;
  },

  flightMoved: () =>
    set((s) => ({ flightsMovedThisChit: s.flightsMovedThisChit + 1 })),

  reset: () =>
    set({
      step: 'idle',
      initiativeWinner: null,
      initiativeRoll: null,
      currentDrawSide: null,
      chitValue: null,
      flightsToMoveThisChit: 0,
      flightsMovedThisChit: 0,
      activeFlightId: null,
      validMoveHexes: [],
      movementLog: [],
    }),
}));
