import { create } from 'zustand';
import { GameState, createEmptyGameState, GamePhase } from '@engine/state/GameState';

interface GameStore {
  /** The master game state */
  gameState: GameState;

  /** Whether a game is currently loaded/in progress */
  gameActive: boolean;

  /** Start a new game with the given state */
  startGame: (state: GameState) => void;

  /** Update the game state (used by the game controller) */
  updateGameState: (updater: (state: GameState) => GameState) => void;

  /** Set the current phase */
  setPhase: (phase: GamePhase) => void;

  /** Advance to the next turn */
  advanceTurn: () => void;

  /** Reset to no active game */
  resetGame: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  gameState: createEmptyGameState(),
  gameActive: false,

  startGame: (state) =>
    set({ gameState: state, gameActive: true }),

  updateGameState: (updater) =>
    set((store) => ({ gameState: updater(store.gameState) })),

  setPhase: (phase) =>
    set((store) => ({
      gameState: { ...store.gameState, phase },
    })),

  advanceTurn: () =>
    set((store) => ({
      gameState: { ...store.gameState, turn: store.gameState.turn + 1 },
    })),

  resetGame: () =>
    set({ gameState: createEmptyGameState(), gameActive: false }),
}));
