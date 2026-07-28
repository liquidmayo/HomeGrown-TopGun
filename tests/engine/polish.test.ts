import { describe, it, expect } from 'vitest';
import { serializeGameState, deserializeGameState, getSaveMetadata } from '@renderer/store/saveLoad';
import { pushUndoState, popUndoState, canUndo, getUndoDepth } from '@engine/controller/UndoManager';
import { createEmptyGameState } from '@engine/state/GameState';
import { loadScenario } from '@engine/scenarioLoader';

describe('Save/Load', () => {
  it('serializes and deserializes game state', () => {
    const state = loadScenario('rs01');
    const json = serializeGameState(state);
    const restored = deserializeGameState(json);

    expect(restored.scenarioId).toBe(state.scenarioId);
    expect(restored.turn).toBe(state.turn);
    expect(Object.keys(restored.flights)).toEqual(Object.keys(state.flights));
    expect(Object.keys(restored.groundUnits)).toEqual(Object.keys(state.groundUnits));
  });

  it('preserves flight data through serialization', () => {
    const state = loadScenario('rs01');
    const json = serializeGameState(state);
    const restored = deserializeGameState(json);

    const cap = restored.flights['CAP-1'];
    expect(cap.aircraftType).toBe('FGR2');
    expect(cap.aircraft).toHaveLength(2);
    expect(cap.aggressionValue).toBe(1);
  });

  it('extracts save metadata', () => {
    const state = loadScenario('rs01');
    const json = serializeGameState(state);
    const meta = getSaveMetadata(json);

    expect(meta).not.toBeNull();
    expect(meta!.scenarioName).toContain('Morning Recon');
    expect(meta!.turn).toBe(1);
    expect(meta!.timestamp).toBeGreaterThan(0);
  });

  it('handles invalid JSON gracefully', () => {
    expect(getSaveMetadata('not json')).toBeNull();
  });
});

describe('Undo Manager', () => {
  it('starts with no undo available', () => {
    const state = createEmptyGameState();
    expect(canUndo(state)).toBe(false);
    expect(getUndoDepth(state)).toBe(0);
  });

  it('pushes state snapshots', () => {
    let state = createEmptyGameState();
    state = pushUndoState(state);
    expect(canUndo(state)).toBe(true);
    expect(getUndoDepth(state)).toBe(1);
  });

  it('pops to restore previous state', () => {
    let state = createEmptyGameState();
    state.turn = 1;
    state = pushUndoState(state);
    state.turn = 2; // Change after snapshot

    const restored = popUndoState(state);
    expect(restored).not.toBeNull();
    expect(restored!.turn).toBe(1);
  });

  it('returns null when no undo available', () => {
    const state = createEmptyGameState();
    expect(popUndoState(state)).toBeNull();
  });

  it('maintains undo stack through multiple pushes', () => {
    let state = createEmptyGameState();
    state.turn = 1;
    state = pushUndoState(state);
    state.turn = 2;
    state = pushUndoState(state);
    state.turn = 3;
    state = pushUndoState(state);
    state.turn = 4;

    expect(getUndoDepth(state)).toBe(3);

    // Pop back to turn 3
    const r1 = popUndoState(state)!;
    expect(r1.turn).toBe(3);

    // Pop back to turn 2
    const r2 = popUndoState(r1)!;
    expect(r2.turn).toBe(2);

    // Pop back to turn 1
    const r3 = popUndoState(r2)!;
    expect(r3.turn).toBe(1);

    // No more undo
    expect(popUndoState(r3)).toBeNull();
  });

  it('caps undo depth at 20', () => {
    let state = createEmptyGameState();
    for (let i = 0; i < 30; i++) {
      state = pushUndoState(state);
      state.turn = i + 1;
    }
    expect(getUndoDepth(state)).toBeLessThanOrEqual(20);
  });
});
