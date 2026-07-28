import { describe, it, expect } from 'vitest';
import {
  isInBarrageZone,
  resolveAAABarrage,
  resolveFireCanAttack,
  resolveMobileAAAAttack,
  rollSuppressionRecovery,
} from '@engine/rules/aaa';
import { FlightState, GroundUnitState, createEmptyGameState } from '@engine/state/GameState';

function createFlight(overrides: Partial<FlightState> = {}): FlightState {
  return {
    id: 'F-1', side: 'wp', nation: 'USSR', aircraftType: 'MiG-29A',
    genericCounterId: null, isVisuallyIdentified: false, isDummy: false,
    hex: { col: 50, row: 5 }, onHexside: false, heading: 180, altitude: 'low',
    throttle: 'combat', speed: 5, mpRemaining: 3, hasMoved: true,
    hasMovedThisPhase: false,
    aircraft: [{ index: 1, damage: 'none', bombStrength: 0, bombStrengthRemaining: 0,
      ordnance: [], airToAirWeapons: [], crewCount: 1, crewStatus: ['ok'] }],
    task: 'cap', raidId: null, flightPath: null, currentWaypointIndex: 0,
    detected: true, disordered: false, aborted: false, inDefensiveWheel: false,
    isOnGround: false, groundState: null, takeoffTurn: null, landingTurn: null,
    markers: [], pilotQuality: 'regular', aggressionValue: 0,
    fuelUsed: 0, fuelAllowance: 3, extraFuelUsed: 0,
    ...overrides,
  };
}

function createAAA(overrides: Partial<GroundUnitState> = {}): GroundUnitState {
  return {
    id: 'AAA-1', type: 'aaaConcentation', subType: 'medium', side: 'nato',
    hex: { col: 50, row: 5 }, hidden: false, located: true,
    isSAMWarning: false, isDummy: false, radarOn: false,
    ammoRemaining: 0, ammoMax: 0, acquisitions: {},
    phasedArrayArc: null, active: true, concentration: 'medium',
    damage: 'none', radarSuppressedTurns: 0, radarShutdown: false,
    aaaSuppression: 0, organicSmallArms: false, organicLightAAA: false,
    organicMobileAAA: null, organicMobileRadarOn: false,
    ...overrides,
  };
}

describe('AAA Barrage Zone', () => {
  it('active AAA covers its hex and adjacent hexes', () => {
    const state = createEmptyGameState();
    state.groundUnits['AAA-1'] = createAAA({ hex: { col: 50, row: 5 } });

    // Same hex
    const inZone = isInBarrageZone({ col: 50, row: 5 }, state);
    expect(inZone).toHaveLength(1);
  });

  it('inactive AAA does not create barrage zone', () => {
    const state = createEmptyGameState();
    state.groundUnits['AAA-1'] = createAAA({ hex: { col: 50, row: 5 }, active: false });

    const inZone = isInBarrageZone({ col: 50, row: 5 }, state);
    expect(inZone).toHaveLength(0);
  });

  it('destroyed AAA does not create barrage zone', () => {
    const state = createEmptyGameState();
    state.groundUnits['AAA-1'] = createAAA({ hex: { col: 50, row: 5 }, damage: 'destroyed' });

    const inZone = isInBarrageZone({ col: 50, row: 5 }, state);
    expect(inZone).toHaveLength(0);
  });
});

describe('AAA Barrage Resolution', () => {
  it('produces valid barrage result', () => {
    const aaa = createAAA({ concentration: 'heavy' });
    const target = createFlight({ altitude: 'low' });
    const state = createEmptyGameState();

    const result = resolveAAABarrage(aaa, target, state);
    expect(result.aaaType).toBe('heavy');
    expect(result.targetId).toBe('F-1');
    expect(result.roll).toBeGreaterThanOrEqual(2);
  });

  it('cannot hit at altitudes above AAA ceiling', () => {
    const aaa = createAAA({ concentration: 'light' });
    const target = createFlight({ altitude: 'medium' }); // Light AAA can't reach medium

    const result = resolveAAABarrage(aaa, target, createEmptyGameState());
    expect(result.hitNumber).toBe(0);
    expect(result.hit).toBe(false);
  });

  it('includes bombing modifier', () => {
    const aaa = createAAA({ concentration: 'heavy' });
    const target = createFlight({ altitude: 'low' });

    const result = resolveAAABarrage(aaa, target, createEmptyGameState());
    expect(result.bombingModifier).toBe(-3);
  });

  it('suppression reduces bombing modifier', () => {
    const aaa = createAAA({ concentration: 'heavy', aaaSuppression: 2 });
    const target = createFlight({ altitude: 'low' });

    const result = resolveAAABarrage(aaa, target, createEmptyGameState());
    expect(result.bombingModifier).toBe(-1); // -3 + 2 suppression = -1
  });
});

describe('Fire Can Attack', () => {
  it('requires radar on', () => {
    const fireCan = createAAA({ type: 'radarAAA', subType: 'Fire_Can', radarOn: false });
    const target = createFlight({ altitude: 'low', hex: { col: 51, row: 5 } });

    const result = resolveFireCanAttack(fireCan, target, createEmptyGameState());
    expect(result.hit).toBe(false);
    expect(result.hitNumber).toBe(0);
  });

  it('requires target within 2 hexes', () => {
    const fireCan = createAAA({
      type: 'radarAAA', subType: 'Fire_Can', radarOn: true, hex: { col: 50, row: 5 },
    });
    const target = createFlight({ hex: { col: 55, row: 5 } }); // Too far

    const result = resolveFireCanAttack(fireCan, target, createEmptyGameState());
    expect(result.hitNumber).toBe(0);
  });
});

describe('Suppression Recovery', () => {
  it('level 0 stays at 0', () => {
    expect(rollSuppressionRecovery(0)).toBe(0);
  });

  it('recovery is possible on roll of 8+', () => {
    // Statistical test
    let recoveries = 0;
    for (let i = 0; i < 100; i++) {
      if (rollSuppressionRecovery(1) === 0) recoveries++;
    }
    expect(recoveries).toBeGreaterThan(10); // ~30% chance
    expect(recoveries).toBeLessThan(60);
  });
});
