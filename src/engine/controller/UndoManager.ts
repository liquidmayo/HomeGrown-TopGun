/**
 * Undo Manager — stores game state snapshots for undo functionality.
 */

import { GameState } from '../state/GameState';

const MAX_UNDO_DEPTH = 20;

/**
 * Push a state snapshot onto the undo stack.
 * Returns the updated game state with the snapshot added.
 */
export function pushUndoState(gameState: GameState): GameState {
  const snapshot = JSON.stringify({
    ...gameState,
    undoStack: [], // Don't nest undo stacks
  });

  const stack = [...gameState.undoStack, snapshot];
  // Trim to max depth
  while (stack.length > MAX_UNDO_DEPTH) stack.shift();

  return { ...gameState, undoStack: stack };
}

/**
 * Pop the most recent state from the undo stack.
 * Returns the restored state, or null if no undo available.
 */
export function popUndoState(gameState: GameState): GameState | null {
  if (gameState.undoStack.length === 0) return null;

  const stack = [...gameState.undoStack];
  const snapshot = stack.pop()!;

  const restored: GameState = JSON.parse(snapshot);
  restored.undoStack = stack; // Preserve remaining undo history

  return restored;
}

/** Check if undo is available. */
export function canUndo(gameState: GameState): boolean {
  return gameState.undoStack.length > 0;
}

/** Get the number of undo steps available. */
export function getUndoDepth(gameState: GameState): number {
  return gameState.undoStack.length;
}
