import { describe, it, expect } from 'vitest';
import {
  canAttemptAcquisition,
  resolveAcquisition,
  canSAMFire,
  resolveSAMAttack,
  attemptSAMLocation,
  applyAcquisitionResults,
} from '@engine/rules/sam';
import { getSAMType } from '@data/sams/samDatabase';
import { FlightState, GroundUnitState, createEmptyGameState } from '@engine/state/GameState';

function createFlight(overrides: Partial<FlightState> = {}): FlightState {
  return {
    id: 'F-1', side: 'wp', nation: 'USSR', aircraftType: 'Su-24MR',
    genericCounterId: null, isVisuallyIdentified: false, isDummy: false,
    hex: { col: 55, row: 5 }, onHexside: false, heading: 180, altitude: 'medium',
    throttle: 'combat', speed: 5, mpRemaining: 3, hasMoved: true,
    hasMovedThisPhase: false,
    aircraft: [{ index: 1, damage: 'none', bombStrength: 0, bombStrengthRemaining: 0,
      ordnance: [], airToAirWeapons: [], crewCount: 2, crewStatus: ['ok', 'ok'] }],
    task: 'recon', raidId: null, flightPath: null, currentWaypointIndex: 0,
    detected: true, disordered: false, aborted: false, inDefensiveWheel: false,
    isOnGround: false, groundState: null, takeoffTurn: null, landingTurn: null,
    markers: [], pilotQuality: 'regular', aggressionValue: 0,
    fuelUsed: 0, fuelAllowance: 4, extraFuelUsed: 0,
    ...overrides,
  };
}

function createSAM(overrides: Partial<GroundUnitState> = {}): GroundUnitState {
  return {
    id: 'SAM-1', type: 'sam', subType: 'HAWK_C', side: 'nato',
    hex: { col: 53, row: 3 }, hidden: false, located: true,
    isSAMWarning: false, isDummy: false, radarOn: true,
    ammoRemaining: 9, ammoMax: 9, acquisitions: {},
    phasedArrayArc: null, active: true, concentration: null,
    damage: 'none', radarSuppressedTurns: 0, radarShutdown: false,
    aaaSuppression: 0, organicSmallArms: false, organicLightAAA: true,
    organicMobileAAA: null, organicMobileRadarOn: false,
    ...overrides,
  };
}

function gameWithHexes() {
  const state = createEmptyGameState();
  // Add hex data for terrain checks
  for (let c = 50; c <= 60; c++) {
    for (let r = 0; r <= 10; r++) {
      const id = `${c.toString().padStart(2, '0')}${r.toString().padStart(2, '0')}`;
      state.hexes[id] = {
        coord: { col: c, row: r }, terrain: ['land'],
        isAirfield: false, airfieldClass: null, airfieldId: null,
        printedAAA: null, isEastGermany: c >= 58,
      };
    }
  }
  return state;
}

describe('SAM Database', () => {
  it('HAWK_C has correct stats', () => {
    const hawk = getSAMType('HAWK_C')!;
    expect(hawk.acquisitionRange).toBe(15);
    expect(hawk.attackRange).toBe(12);
    expect(hawk.shots).toBe(9);
    expect(hawk.canEngageDeck).toBe(true);
    expect(hawk.isIR).toBe(false);
  });

  it('SA-13 is an IR SAM', () => {
    const sa13 = getSAMType('SA-13')!;
    expect(sa13.isIR).toBe(true);
    expect(sa13.acquisitionRange).toBe(0);
  });

  it('Patriot has phased array radar', () => {
    const patriot = getSAMType('Patriot')!;
    expect(patriot.isPhasedArray).toBe(true);
  });

  it('SA-12 has anti-radar capability', () => {
    const sa12 = getSAMType('SA-12')!;
    expect(sa12.hasAntiRadar).toBe(true);
  });
});

describe('SAM Acquisition Eligibility', () => {
  it('HAWK can acquire target within range', () => {
    const sam = createSAM();
    const target = createFlight({ hex: { col: 55, row: 5 }, altitude: 'medium' });
    const state = gameWithHexes();
    const check = canAttemptAcquisition(sam, target, state);
    expect(check.canAcquire).toBe(true);
  });

  it('cannot acquire if out of range', () => {
    const sam = createSAM();
    const target = createFlight({ hex: { col: 70, row: 5 } }); // Way out of range
    const state = gameWithHexes();
    const check = canAttemptAcquisition(sam, target, state);
    expect(check.canAcquire).toBe(false);
  });

  it('cannot acquire if radar off', () => {
    const sam = createSAM({ radarOn: false });
    const target = createFlight();
    const state = gameWithHexes();
    const check = canAttemptAcquisition(sam, target, state);
    expect(check.canAcquire).toBe(false);
  });

  it('cannot acquire if SAM destroyed', () => {
    const sam = createSAM({ damage: 'destroyed' });
    const target = createFlight();
    const state = gameWithHexes();
    const check = canAttemptAcquisition(sam, target, state);
    expect(check.canAcquire).toBe(false);
  });

  it('cannot acquire if radar suppressed', () => {
    const sam = createSAM({ radarSuppressedTurns: 3 });
    const target = createFlight();
    const state = gameWithHexes();
    const check = canAttemptAcquisition(sam, target, state);
    expect(check.canAcquire).toBe(false);
  });
});

describe('SAM Acquisition Resolution', () => {
  it('produces valid acquisition result', () => {
    const sam = createSAM();
    const target = createFlight({ detected: true });
    const state = gameWithHexes();
    const result = resolveAcquisition(sam, target, state);

    expect(result.samId).toBe('SAM-1');
    expect(result.targetId).toBe('F-1');
    expect(['none', 'partial', 'full']).toContain(result.result);
  });

  it('detected targets are easier to acquire', () => {
    // Statistical test: detected should succeed more often
    let detectedAcqs = 0;
    let undetectedAcqs = 0;

    for (let i = 0; i < 100; i++) {
      const sam1 = createSAM();
      const det = createFlight({ detected: true });
      const state = gameWithHexes();
      if (resolveAcquisition(sam1, det, state).result !== 'none') detectedAcqs++;

      const sam2 = createSAM();
      const undet = createFlight({ detected: false });
      if (resolveAcquisition(sam2, undet, state).result !== 'none') undetectedAcqs++;
    }

    expect(detectedAcqs).toBeGreaterThan(undetectedAcqs);
  });
});

describe('SAM Fire Prerequisites', () => {
  it('can fire with full acquisition in range', () => {
    const sam = createSAM({ acquisitions: { 'F-1': 'full' } });
    const target = createFlight({ hex: { col: 55, row: 5 } });
    const state = gameWithHexes();
    const check = canSAMFire(sam, target, state, 0);
    expect(check.canFire).toBe(true);
  });

  it('cannot fire without acquisition', () => {
    const sam = createSAM();
    const target = createFlight();
    const state = gameWithHexes();
    const check = canSAMFire(sam, target, state, 0);
    expect(check.canFire).toBe(false);
  });

  it('cannot fire with no ammo', () => {
    const sam = createSAM({ ammoRemaining: 0, acquisitions: { 'F-1': 'full' } });
    const target = createFlight();
    const state = gameWithHexes();
    const check = canSAMFire(sam, target, state, 0);
    expect(check.canFire).toBe(false);
  });

  it('max 2 SAM attacks per flight per turn', () => {
    const sam = createSAM({ acquisitions: { 'F-1': 'full' } });
    const target = createFlight();
    const state = gameWithHexes();
    const check = canSAMFire(sam, target, state, 2);
    expect(check.canFire).toBe(false);
  });
});

describe('SAM Attack Resolution', () => {
  it('produces valid attack result', () => {
    const sam = createSAM({ acquisitions: { 'F-1': 'full' } });
    const target = createFlight({ hex: { col: 55, row: 5 } });
    const state = gameWithHexes();
    const result = resolveSAMAttack(sam, target, state);

    expect(result.samId).toBe('SAM-1');
    expect(['possibleHit', 'miss']).toContain(result.attackResult);
    expect(result.ammoUsed).toBe(1);
  });

  it('salvo uses 2 ammo', () => {
    const sam = createSAM({ acquisitions: { 'F-1': 'full' } });
    const target = createFlight({ hex: { col: 55, row: 5 } });
    const state = gameWithHexes();
    const result = resolveSAMAttack(sam, target, state, true);

    expect(result.salvoFired).toBe(true);
    expect(result.ammoUsed).toBe(2);
  });
});

describe('SAM Location', () => {
  it('produces valid location result', () => {
    const sam = createSAM({ located: false, isSAMWarning: true });
    const flight = createFlight({
      side: 'nato', aircraftType: 'F-15C', hex: { col: 55, row: 5 },
    });
    const result = attemptSAMLocation(sam, flight);
    expect(result.samId).toBe('SAM-1');
    expect(typeof result.located).toBe('boolean');
  });
});

describe('Apply Acquisition Results', () => {
  it('updates SAM acquisitions in game state', () => {
    const state = gameWithHexes();
    state.groundUnits['SAM-1'] = createSAM();

    const results = [{
      samId: 'SAM-1', targetId: 'F-1', roll: 15, modifiers: {},
      needed: 10, result: 'full' as const, previousLevel: 'none' as const,
    }];

    const newState = applyAcquisitionResults(state, results);
    expect(newState.groundUnits['SAM-1'].acquisitions['F-1']).toBe('full');
  });
});
