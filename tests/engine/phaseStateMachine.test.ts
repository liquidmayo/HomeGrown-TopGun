import { describe, it, expect } from 'vitest';
import { getNextPhase, advancePhase, getPhaseLabel } from '@engine/controller/PhaseStateMachine';
import { createEmptyGameState } from '@engine/state/GameState';

describe('Phase State Machine', () => {
  it('setup advances to jamming on turn 1 (skips random event)', () => {
    expect(getNextPhase('setup', 1, null)).toBe('jamming');
  });

  it('setup advances to random event on turn 2+', () => {
    expect(getNextPhase('setup', 2, null)).toBe('randomEvent');
  });

  it('follows correct phase order', () => {
    const expectedOrder = [
      'jamming', 'detection', 'movement', 'fuel',
      'samLocation', 'track', 'samAcquisition', 'admin',
    ];

    let phase = getNextPhase('setup', 1, null)!;
    for (const expected of expectedOrder) {
      expect(phase).toBe(expected);
      phase = getNextPhase(phase, 1, null)!;
    }
  });

  it('admin phase returns null (signals end of turn)', () => {
    expect(getNextPhase('admin', 1, null)).toBeNull();
  });

  it('completed phase returns null', () => {
    expect(getNextPhase('completed', 1, null)).toBeNull();
  });

  it('advancePhase progresses through a full turn', () => {
    let state = createEmptyGameState();
    state.turn = 1;
    state.phase = 'setup';

    // Setup -> Jamming (skip random event on turn 1)
    state = advancePhase(state);
    expect(state.phase).toBe('jamming');

    // Walk through all phases
    state = advancePhase(state);
    expect(state.phase).toBe('detection');

    state = advancePhase(state);
    expect(state.phase).toBe('movement');

    state = advancePhase(state);
    expect(state.phase).toBe('fuel');

    state = advancePhase(state);
    expect(state.phase).toBe('samLocation');

    state = advancePhase(state);
    expect(state.phase).toBe('track');

    state = advancePhase(state);
    expect(state.phase).toBe('samAcquisition');

    state = advancePhase(state);
    expect(state.phase).toBe('admin');

    // Admin -> new turn (turn 2, starts with random event)
    state = advancePhase(state);
    expect(state.turn).toBe(2);
    expect(state.phase).toBe('randomEvent');
  });

  it('ends scenario when max turns exceeded', () => {
    let state = createEmptyGameState();
    state.turn = 15;
    state.maxTurns = 15;
    state.phase = 'admin';

    state = advancePhase(state);
    expect(state.phase).toBe('completed');
  });

  it('getPhaseLabel returns human-readable labels', () => {
    expect(getPhaseLabel('movement')).toBe('Movement');
    expect(getPhaseLabel('samAcquisition')).toBe('SAM Acquisition');
    expect(getPhaseLabel('completed')).toBe('Scenario Complete');
  });
});
