import { describe, it, expect } from 'vitest';
import {
  getTurnLimits,
  getSpeedRange,
  isFlightLaden,
  getValidActions,
  applyMovementAction,
  canEndMovementInHex,
  initializeMovement,
} from '@engine/rules/movement';
import { FlightState, GameState, createEmptyGameState } from '@engine/state/GameState';

// Helper: create a minimal flight for testing
function createTestFlight(overrides: Partial<FlightState> = {}): FlightState {
  return {
    id: 'TEST-1',
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
    speed: 5,
    mpRemaining: 5,
    hasMoved: false,
    hasMovedThisPhase: false,
    aircraft: [
      {
        index: 1, damage: 'none',
        bombStrength: 0, bombStrengthRemaining: 0,
        ordnance: [], airToAirWeapons: [{ weaponId: 'AIM-7M', depleted: false }],
        crewCount: 1, crewStatus: ['ok'],
      },
      {
        index: 2, damage: 'none',
        bombStrength: 0, bombStrengthRemaining: 0,
        ordnance: [], airToAirWeapons: [{ weaponId: 'AIM-7M', depleted: false }],
        crewCount: 1, crewStatus: ['ok'],
      },
    ],
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
    pilotQuality: 'ace',
    aggressionValue: 2,
    fuelUsed: 0,
    fuelAllowance: 5,
    extraFuelUsed: 0,
    ...overrides,
  };
}

describe('Turn Table (Rule 6.32)', () => {
  it('speed 1-2: 90° free turn day, 180° max', () => {
    const limits = getTurnLimits(1);
    expect(limits.freeTurnDay).toBe(90);
    expect(limits.maxTurnDay).toBe(180);
  });

  it('speed 3-4: 60° free turn day, 120° max', () => {
    const limits = getTurnLimits(3);
    expect(limits.freeTurnDay).toBe(60);
    expect(limits.maxTurnDay).toBe(120);
  });

  it('speed 5-8: 30° free turn day, 90° max', () => {
    const limits = getTurnLimits(5);
    expect(limits.freeTurnDay).toBe(30);
    expect(limits.maxTurnDay).toBe(90);
  });

  it('speed 9+: 0° free turn day, 30° max', () => {
    const limits = getTurnLimits(9);
    expect(limits.freeTurnDay).toBe(0);
    expect(limits.maxTurnDay).toBe(30);
  });

  it('night: max 60° (or 30° at speed 9+)', () => {
    expect(getTurnLimits(5).maxTurnNight).toBe(60);
    expect(getTurnLimits(9).maxTurnNight).toBe(30);
  });
});

describe('Speed Range', () => {
  it('F-15C combat throttle at medium gives correct range', () => {
    const flight = createTestFlight({ altitude: 'medium' });
    const range = getSpeedRange(flight, 'combat');
    expect(range).not.toBeNull();
    expect(range!.max).toBe(5); // F-15C combat medium clean = 5
    expect(range!.min).toBe(4); // Max - 1
  });

  it('F-15C dash throttle at medium gives correct range', () => {
    const flight = createTestFlight({ altitude: 'medium' });
    const range = getSpeedRange(flight, 'dash');
    expect(range).not.toBeNull();
    expect(range!.max).toBe(7); // F-15C dash medium clean = 7
    expect(range!.min).toBe(6); // Combat max + 1
  });

  it('crippled aircraft cannot use dash throttle', () => {
    const flight = createTestFlight({
      aircraft: [
        {
          index: 1, damage: 'crippled',
          bombStrength: 0, bombStrengthRemaining: 0,
          ordnance: [], airToAirWeapons: [],
          crewCount: 1, crewStatus: ['ok'],
        },
      ],
    });
    const range = getSpeedRange(flight, 'dash');
    expect(range).toBeNull();
  });
});

describe('Laden Status', () => {
  it('flight without ordnance is not laden', () => {
    const flight = createTestFlight();
    expect(isFlightLaden(flight)).toBe(false);
  });

  it('flight with bomb points is laden', () => {
    const flight = createTestFlight({
      aircraft: [
        {
          index: 1, damage: 'none',
          bombStrength: 3, bombStrengthRemaining: 3,
          ordnance: [], airToAirWeapons: [],
          crewCount: 1, crewStatus: ['ok'],
        },
      ],
    });
    expect(isFlightLaden(flight)).toBe(true);
  });
});

describe('Movement Actions', () => {
  it('flight with maneuver marker can only remove it', () => {
    const flight = createTestFlight({ markers: ['maneuver'] });
    const gameState = createEmptyGameState();
    const actions = getValidActions(flight, gameState, false);
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe('removeMarker');
  });

  it('flight with MP can move, turn, climb, and dive', () => {
    const flight = createTestFlight({ mpRemaining: 5, speed: 5 });
    const gameState = createEmptyGameState();
    const actions = getValidActions(flight, gameState, false);

    const types = actions.map((a) => a.type);
    expect(types).toContain('move');
    expect(types).toContain('turn');
    expect(types).toContain('climb');
    expect(types).toContain('dive');
  });

  it('flight with 0 MP has no actions', () => {
    const flight = createTestFlight({ mpRemaining: 0 });
    const gameState = createEmptyGameState();
    const actions = getValidActions(flight, gameState, false);
    expect(actions).toHaveLength(0);
  });
});

describe('Apply Movement', () => {
  it('moving reduces MP by 1', () => {
    const flight = createTestFlight({ mpRemaining: 5, heading: 0 });
    const gameState = createEmptyGameState();
    const result = applyMovementAction(flight, { type: 'move', direction: 0 }, gameState, false);
    expect(result.mpRemaining).toBe(4);
    expect(result.hasMoved).toBe(true);
  });

  it('turning changes heading', () => {
    const flight = createTestFlight({ heading: 0, mpRemaining: 5 });
    const gameState = createEmptyGameState();
    const result = applyMovementAction(flight, { type: 'turn', degrees: 60 }, gameState, false);
    expect(result.heading).toBe(60);
    expect(result.mpRemaining).toBe(4);
  });

  it('climbing increases altitude', () => {
    const flight = createTestFlight({ altitude: 'medium', mpRemaining: 5 });
    const gameState = createEmptyGameState();
    const result = applyMovementAction(flight, { type: 'climb' }, gameState, false);
    expect(result.altitude).toBe('high');
    expect(result.mpRemaining).toBe(4);
  });

  it('diving decreases altitude', () => {
    const flight = createTestFlight({ altitude: 'medium', mpRemaining: 5 });
    const gameState = createEmptyGameState();
    const result = applyMovementAction(
      flight, { type: 'dive', toAltitude: 'low' }, gameState, false
    );
    expect(result.altitude).toBe('low');
    expect(result.mpRemaining).toBe(4);
  });

  it('removing maneuver marker costs half MP rounded up', () => {
    const flight = createTestFlight({ speed: 5, mpRemaining: 5, markers: ['maneuver'] });
    const gameState = createEmptyGameState();
    const result = applyMovementAction(
      flight, { type: 'removeMarker', marker: 'maneuver' }, gameState, false
    );
    expect(result.mpRemaining).toBe(2); // 5 - ceil(5/2) = 5 - 3 = 2
    expect(result.markers).not.toContain('maneuver');
  });
});

describe('Stacking (Rule 6.4)', () => {
  it('allows stacking with enemy flights', () => {
    const flight = createTestFlight({ side: 'nato' });
    const gameState = createEmptyGameState();
    gameState.flights['ENEMY-1'] = createTestFlight({
      id: 'ENEMY-1', side: 'wp', hex: { col: 50, row: 5 },
    });
    expect(canEndMovementInHex(flight, { col: 50, row: 5 }, 'medium', gameState)).toBe(true);
  });

  it('prevents stacking with friendly flights at same altitude', () => {
    const flight = createTestFlight({ id: 'TEST-1', side: 'nato' });
    const gameState = createEmptyGameState();
    gameState.flights['FRIEND-1'] = createTestFlight({
      id: 'FRIEND-1', side: 'nato', hex: { col: 50, row: 5 }, altitude: 'medium',
    });
    expect(canEndMovementInHex(flight, { col: 50, row: 5 }, 'medium', gameState)).toBe(false);
  });

  it('allows stacking at different altitudes', () => {
    const flight = createTestFlight({ side: 'nato', altitude: 'high' });
    const gameState = createEmptyGameState();
    gameState.flights['FRIEND-1'] = createTestFlight({
      id: 'FRIEND-1', side: 'nato', hex: { col: 50, row: 5 }, altitude: 'medium',
    });
    expect(canEndMovementInHex(flight, { col: 50, row: 5 }, 'high', gameState)).toBe(true);
  });
});

describe('Initialize Movement', () => {
  it('sets throttle, speed, and MP', () => {
    const flight = createTestFlight();
    const result = initializeMovement(flight, 'dash', 7);
    expect(result.throttle).toBe('dash');
    expect(result.speed).toBe(7);
    expect(result.mpRemaining).toBe(7);
    expect(result.hasMovedThisPhase).toBe(false);
  });
});
