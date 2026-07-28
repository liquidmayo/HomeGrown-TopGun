import { describe, it, expect } from 'vitest';
import { executeBotMovementPhase, applyBotMovement } from '@ai/BotController';
import { determineBotAction, buildBotContext } from '@ai/tables/flightActionsTable';
import { shouldActivateFlight, rollFlightType, WP_CAP_ACTIVATION_DEFAULT } from '@ai/tables/flightActivationTable';
import { attemptSAMActivation, determineSAMAction } from '@ai/tables/samActionsTable';
import { attemptAAAActivation, determineAAAAction } from '@ai/tables/aaaActionsTable';
import { FlightState, GroundUnitState, createEmptyGameState } from '@engine/state/GameState';

function createFlight(overrides: Partial<FlightState> = {}): FlightState {
  return {
    id: 'F-1', side: 'wp', nation: 'USSR', aircraftType: 'MiG-29A',
    genericCounterId: null, isVisuallyIdentified: false, isDummy: false,
    hex: { col: 60, row: 5 }, onHexside: false, heading: 180, altitude: 'medium',
    throttle: 'combat', speed: 5, mpRemaining: 5, hasMoved: false,
    hasMovedThisPhase: false,
    aircraft: [
      { index: 1, damage: 'none', bombStrength: 0, bombStrengthRemaining: 0,
        ordnance: [], airToAirWeapons: [{ weaponId: 'R-27R', depleted: false }],
        crewCount: 1, crewStatus: ['ok'] },
    ],
    task: 'cap', raidId: null, flightPath: null, currentWaypointIndex: 0,
    detected: false, disordered: false, aborted: false, inDefensiveWheel: false,
    isOnGround: false, groundState: null, takeoffTurn: null, landingTurn: null,
    markers: [], pilotQuality: 'veteran', aggressionValue: 0,
    fuelUsed: 0, fuelAllowance: 3, extraFuelUsed: 0,
    ...overrides,
  };
}

function createSAM(overrides: Partial<GroundUnitState> = {}): GroundUnitState {
  return {
    id: 'SAM-1', type: 'sam', subType: 'SA-6', side: 'wp',
    hex: { col: 60, row: 5 }, hidden: false, located: true,
    isSAMWarning: false, isDummy: false, radarOn: true,
    ammoRemaining: 6, ammoMax: 6, acquisitions: {},
    phasedArrayArc: null, active: true, concentration: null,
    damage: 'none', radarSuppressedTurns: 0, radarShutdown: false,
    aaaSuppression: 0, organicSmallArms: false, organicLightAAA: true,
    organicMobileAAA: null, organicMobileRadarOn: false,
    ...overrides,
  };
}

describe('Flight Activation', () => {
  it('produces valid activation result', () => {
    const result = shouldActivateFlight(5, 0, 10);
    expect(typeof result.activate).toBe('boolean');
    expect(result.roll).toBeGreaterThanOrEqual(1);
    expect(result.roll).toBeLessThanOrEqual(10);
  });

  it('does not activate when at max real flights', () => {
    const result = shouldActivateFlight(5, 10, 10);
    expect(result.activate).toBe(false);
  });

  it('close enemies increase activation chance', () => {
    let closeActivations = 0;
    let farActivations = 0;
    for (let i = 0; i < 100; i++) {
      if (shouldActivateFlight(3, 0, 10).activate) closeActivations++;
      if (shouldActivateFlight(20, 0, 10).activate) farActivations++;
    }
    expect(closeActivations).toBeGreaterThan(farActivations);
  });

  it('rolls valid aircraft type from table', () => {
    const result = rollFlightType(WP_CAP_ACTIVATION_DEFAULT);
    expect(result.aircraftType).toBeTruthy();
    expect(result.nation).toBe('USSR');
    expect(result.roll).toBeGreaterThanOrEqual(1);
  });
});

describe('Bot Flight Actions', () => {
  it('aborted flight returns to base', () => {
    const flight = createFlight({ aborted: true });
    const state = createEmptyGameState();
    const action = determineBotAction(flight, state);
    expect(action.type).toBe('rtb');
  });

  it('winchester flight returns to base', () => {
    const flight = createFlight({
      aircraft: [{ index: 1, damage: 'none', bombStrength: 0, bombStrengthRemaining: 0,
        ordnance: [], airToAirWeapons: [{ weaponId: 'R-27R', depleted: true }],
        crewCount: 1, crewStatus: ['ok'] }],
    });
    const state = createEmptyGameState();
    const action = determineBotAction(flight, state);
    expect(action.type).toBe('rtb');
  });

  it('CAP moves toward detected enemy within 10 hexes', () => {
    const flight = createFlight({ task: 'cap', hex: { col: 60, row: 5 } });
    const state = createEmptyGameState();
    state.flights['ENEMY'] = createFlight({
      id: 'ENEMY', side: 'nato', hex: { col: 55, row: 5 }, detected: true,
    });
    const action = determineBotAction(flight, state);
    expect(action.type).toBe('moveToward');
  });

  it('flight with no targets patrols', () => {
    const flight = createFlight({ task: 'cap' });
    const state = createEmptyGameState();
    const action = determineBotAction(flight, state);
    expect(action.type).toBe('patrol');
  });
});

describe('Bot Context', () => {
  it('finds nearest enemy flight', () => {
    const flight = createFlight({ hex: { col: 60, row: 5 } });
    const state = createEmptyGameState();
    state.flights['E1'] = createFlight({
      id: 'E1', side: 'nato', hex: { col: 55, row: 5 }, detected: true,
    });
    state.flights['E2'] = createFlight({
      id: 'E2', side: 'nato', hex: { col: 50, row: 5 }, detected: true,
    });
    const ctx = buildBotContext(flight, state);
    expect(ctx.nearestEnemyFlight?.id).toBe('E1');
  });

  it('detects winchester status', () => {
    const flight = createFlight({
      aircraft: [{ index: 1, damage: 'none', bombStrength: 0, bombStrengthRemaining: 0,
        ordnance: [], airToAirWeapons: [{ weaponId: 'R-27R', depleted: true }],
        crewCount: 1, crewStatus: ['ok'] }],
    });
    const state = createEmptyGameState();
    const ctx = buildBotContext(flight, state);
    expect(ctx.isWinchester).toBe(true);
    expect(ctx.hasWeapons).toBe(false);
  });
});

describe('SAM Activation', () => {
  it('produces valid activation result', () => {
    const table = [
      { minRoll: 1, maxRoll: 5, samType: 'SA-6' },
      { minRoll: 6, maxRoll: 10, samType: 'SA-8' },
    ];
    const result = attemptSAMActivation('SW-1', 5, 0, table);
    expect(result.samWarningId).toBe('SW-1');
    if (result.activated) {
      expect(['SA-6', 'SA-8']).toContain(result.samType);
    }
  });

  it('many real SAMs reduce activation chance', () => {
    const table = [{ minRoll: 1, maxRoll: 10, samType: 'SA-6' }];
    let fewActivations = 0;
    let manyActivations = 0;
    for (let i = 0; i < 100; i++) {
      if (attemptSAMActivation('SW-1', 5, 0, table).activated) fewActivations++;
      if (attemptSAMActivation('SW-1', 5, 6, table).activated) manyActivations++;
    }
    expect(fewActivations).toBeGreaterThan(manyActivations);
  });
});

describe('SAM Bot Actions', () => {
  it('fires at fully acquired target in range', () => {
    const sam = createSAM({ acquisitions: { 'F-1': 'full' } });
    const state = createEmptyGameState();
    state.flights['F-1'] = createFlight({
      id: 'F-1', side: 'nato', hex: { col: 55, row: 5 },
    });
    const action = determineSAMAction(sam, state);
    expect(action.type).toBe('fireAtTarget');
  });

  it('acquires nearest enemy if no current acquisition', () => {
    const sam = createSAM();
    const state = createEmptyGameState();
    state.flights['F-1'] = createFlight({
      id: 'F-1', side: 'nato', hex: { col: 55, row: 5 }, detected: true,
    });
    const action = determineSAMAction(sam, state);
    expect(action.type).toBe('acquireTarget');
  });

  it('holds fire with no targets', () => {
    const sam = createSAM();
    const state = createEmptyGameState();
    const action = determineSAMAction(sam, state);
    expect(action.type).toBe('holdFire');
  });

  it('switches radar off when out of ammo', () => {
    const sam = createSAM({ ammoRemaining: 0 });
    const state = createEmptyGameState();
    const action = determineSAMAction(sam, state);
    expect(action.type).toBe('switchRadarOff');
  });
});

describe('AAA Activation', () => {
  it('produces valid activation result', () => {
    const table = [
      { minRoll: 1, maxRoll: 5, aaaType: '2k22' },
      { minRoll: 6, maxRoll: 10, aaaType: 'light', concentration: 'light' },
    ];
    const result = attemptAAAActivation('IA-1', 3, 0, table);
    expect(result.inactiveAAAId).toBe('IA-1');
  });
});

describe('AAA Bot Actions', () => {
  it('Fire Can fires at enemy within 2 hexes', () => {
    const aaa = createSAM({
      type: 'radarAAA', subType: 'Fire_Can', radarOn: true, hex: { col: 50, row: 5 },
    }) as any;
    const enemy = createFlight({ side: 'nato', hex: { col: 51, row: 5 } });
    const action = determineAAAAction(aaa, enemy, createEmptyGameState());
    expect(action.type).toBe('fireRadarAAA');
  });

  it('Fire Can holds fire if radar off', () => {
    const aaa = createSAM({
      type: 'radarAAA', subType: 'Fire_Can', radarOn: false, hex: { col: 50, row: 5 },
    }) as any;
    const enemy = createFlight({ side: 'nato', hex: { col: 51, row: 5 } });
    const action = determineAAAAction(aaa, enemy, createEmptyGameState());
    expect(action.type).toBe('holdFire');
  });
});

describe('Full Bot Movement Phase', () => {
  it('executes without errors', () => {
    const state = createEmptyGameState();
    state.flights['BOT-1'] = createFlight({
      id: 'BOT-1', side: 'wp', task: 'cap',
    });
    state.flights['HUMAN-1'] = createFlight({
      id: 'HUMAN-1', side: 'nato', hex: { col: 50, row: 5 }, detected: true,
    });
    state.botState = { realSAMsInPlay: 0, realAAAInPlay: 0, realFlightsInPlay: 1, maxRealFlights: 4 };

    const result = executeBotMovementPhase(state, 'wp');
    expect(result.flightActions.length).toBeGreaterThan(0);
    expect(result.log.length).toBeGreaterThan(0);
  });

  it('applies bot movement to game state', () => {
    const state = createEmptyGameState();
    state.flights['BOT-1'] = createFlight({
      id: 'BOT-1', side: 'wp', task: 'cap', hex: { col: 60, row: 5 },
    });

    const botResult = executeBotMovementPhase(state, 'wp');
    const newState = applyBotMovement(state, botResult);

    expect(newState.flights['BOT-1'].hasMovedThisPhase).toBe(true);
    expect(newState.flights['BOT-1'].mpRemaining).toBe(0);
  });
});
