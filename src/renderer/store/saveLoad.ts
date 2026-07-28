/**
 * Save/Load game state to JSON files.
 */

import { GameState } from '@engine/state/GameState';

const SAVE_VERSION = 1;

interface SaveFile {
  version: number;
  timestamp: number;
  scenarioId: string;
  scenarioName: string;
  turn: number;
  phase: string;
  gameState: GameState;
}

/** Serialize game state to a save file string. */
export function serializeGameState(gameState: GameState): string {
  const save: SaveFile = {
    version: SAVE_VERSION,
    timestamp: Date.now(),
    scenarioId: gameState.scenarioId,
    scenarioName: gameState.scenarioName,
    turn: gameState.turn,
    phase: gameState.phase,
    gameState,
  };
  return JSON.stringify(save, null, 2);
}

/** Deserialize a save file string back to game state. */
export function deserializeGameState(json: string): GameState {
  const save: SaveFile = JSON.parse(json);
  if (save.version !== SAVE_VERSION) {
    console.warn(`Save file version ${save.version} differs from current ${SAVE_VERSION}`);
  }
  return save.gameState;
}

/** Save game to a file via Electron IPC. */
export async function saveGame(gameState: GameState): Promise<boolean> {
  const data = serializeGameState(gameState);
  const filename = `redstorm_${gameState.scenarioId}_turn${gameState.turn}_${Date.now()}.json`;

  if (window.electronAPI) {
    const result = await window.electronAPI.saveGame(data, filename);
    return result.success;
  }

  // Fallback: localStorage
  try {
    localStorage.setItem('redstorm_save', data);
    return true;
  } catch {
    return false;
  }
}

/** Load game from localStorage (fallback when no Electron). */
export function loadGameFromStorage(): GameState | null {
  try {
    const data = localStorage.getItem('redstorm_save');
    if (!data) return null;
    return deserializeGameState(data);
  } catch {
    return null;
  }
}

/** Get save file metadata without full deserialization. */
export function getSaveMetadata(json: string): {
  scenarioName: string; turn: number; phase: string; timestamp: number;
} | null {
  try {
    const save: SaveFile = JSON.parse(json);
    return {
      scenarioName: save.scenarioName,
      turn: save.turn,
      phase: save.phase,
      timestamp: save.timestamp,
    };
  } catch {
    return null;
  }
}
