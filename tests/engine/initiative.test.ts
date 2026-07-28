import { describe, it, expect } from 'vitest';
import {
  rollInitiative,
  drawChit,
  countAirborneFlights,
  countUnmovedFlights,
  getMovableFlights,
  executeChitDraw,
  isMovementPhaseComplete,
  getNextChitDrawSide,
} from '@engine/rules/initiative';
import { createEmptyGameState, FlightState } from '@engine/state/GameState';

function createTestFlight(overrides: Partial<FlightState> = {}): FlightState {
  return {
    id: 'F-1',
    side: 'nato',
    nation: 'US',
    aircraftType: 'F-15C',
    genericCounterId: null,
    isVisuallyIdentified: true,
    isDummy: false,
    hex: { col: 50, row: 5 },
    onHexside: false,
    heading: 0,
    altitude: 'medium',
    throttle: 'combat',
    speed: 0,
    mpRemaining: 0,
    hasMoved: false,
    hasMovedThisPhase: false,
    aircraft: [],
    task: 'cap',
    raidId: null,
    flightPath: null,
    currentWaypointIndex: 0,
    detected: false,
    disordered: false,
    aborted: false,
    inDefensiveWheel: false,
    isOnGround: false,
    groundState: null,
    takeoffTurn: null,
    landingTurn: null,
    markers: [],
    pilotQuality: 'veteran',
    aggressionValue: 0,
    fuelUsed: 0,
    fuelAllowance: 5,
    extraFuelUsed: 0,
    ...overrides,
  };
}

describe('Initiative Roll', () => {
  it('returns nato or wp as winner', () => {
    // Run multiple times to verify both outcomes are possible
    const results = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const { winner } = rollInitiative();
      results.add(winner);
    }
    expect(results.has('nato')).toBe(true);
    expect(results.has('wp')).toBe(true);
  });

  it('roll is between 1 and 10', () => {
    for (let i = 0; i < 50; i++) {
      const { roll } = rollInitiative();
      expect(roll).toBeGreaterThanOrEqual(1);
      expect(roll).toBeLessThanOrEqual(10);
    }
  });
});

describe('Chit Draw', () => {
  it('small force chits are 0-4', () => {
    for (let i = 0; i < 50; i++) {
      const value = drawChit(5);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(4);
    }
  });

  it('large force chits are 0-5', () => {
    for (let i = 0; i < 50; i++) {
      const value = drawChit(12);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(5);
    }
  });
});

describe('Flight Counting', () => {
  it('counts airborne flights for a side', () => {
    const gameState = createEmptyGameState();
    gameState.flights['F-1'] = createTestFlight({ id: 'F-1', side: 'nato' });
    gameState.flights['F-2'] = createTestFlight({ id: 'F-2', side: 'nato' });
    gameState.flights['F-3'] = createTestFlight({ id: 'F-3', side: 'wp' });

    expect(countAirborneFlights(gameState, 'nato')).toBe(2);
    expect(countAirborneFlights(gameState, 'wp')).toBe(1);
  });

  it('does not count flights on the ground', () => {
    const gameState = createEmptyGameState();
    gameState.flights['F-1'] = createTestFlight({ id: 'F-1', side: 'nato', isOnGround: true });
    gameState.flights['F-2'] = createTestFlight({ id: 'F-2', side: 'nato' });

    expect(countAirborneFlights(gameState, 'nato')).toBe(1);
  });

  it('counts unmoved flights', () => {
    const gameState = createEmptyGameState();
    gameState.flights['F-1'] = createTestFlight({ id: 'F-1', side: 'nato', hasMovedThisPhase: false });
    gameState.flights['F-2'] = createTestFlight({ id: 'F-2', side: 'nato', hasMovedThisPhase: true });

    expect(countUnmovedFlights(gameState, 'nato')).toBe(1);
  });
});

describe('Movement Phase Completion', () => {
  it('is complete when all flights have moved', () => {
    const gameState = createEmptyGameState();
    gameState.flights['F-1'] = createTestFlight({ side: 'nato', hasMovedThisPhase: true });
    gameState.flights['F-2'] = createTestFlight({ id: 'F-2', side: 'wp', hasMovedThisPhase: true });

    expect(isMovementPhaseComplete(gameState)).toBe(true);
  });

  it('is not complete with unmoved flights', () => {
    const gameState = createEmptyGameState();
    gameState.flights['F-1'] = createTestFlight({ side: 'nato', hasMovedThisPhase: true });
    gameState.flights['F-2'] = createTestFlight({ id: 'F-2', side: 'wp', hasMovedThisPhase: false });

    expect(isMovementPhaseComplete(gameState)).toBe(false);
  });
});

describe('Next Chit Draw Side', () => {
  it('returns null when movement is complete', () => {
    const gameState = createEmptyGameState();
    gameState.flights['F-1'] = createTestFlight({ side: 'nato', hasMovedThisPhase: true });
    gameState.flights['F-2'] = createTestFlight({ id: 'F-2', side: 'wp', hasMovedThisPhase: true });

    expect(getNextChitDrawSide(gameState, null, 'nato')).toBeNull();
  });

  it('returns the other side if one side is done', () => {
    const gameState = createEmptyGameState();
    gameState.flights['F-1'] = createTestFlight({ side: 'nato', hasMovedThisPhase: true });
    gameState.flights['F-2'] = createTestFlight({ id: 'F-2', side: 'wp', hasMovedThisPhase: false });

    expect(getNextChitDrawSide(gameState, 'nato', 'nato')).toBe('wp');
  });

  it('alternates between sides', () => {
    const gameState = createEmptyGameState();
    gameState.flights['F-1'] = createTestFlight({ side: 'nato', hasMovedThisPhase: false });
    gameState.flights['F-2'] = createTestFlight({ id: 'F-2', side: 'wp', hasMovedThisPhase: false });

    expect(getNextChitDrawSide(gameState, 'nato', 'nato')).toBe('wp');
    expect(getNextChitDrawSide(gameState, 'wp', 'nato')).toBe('nato');
  });
});
