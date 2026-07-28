import { describe, it, expect } from 'vitest';
import {
  getAvailableProfiles,
  resolveAirToGroundAttack,
  resolveGroundDamage,
  applyGroundDamage,
  rollJettisonCheck,
  resolveARMAttack,
  canAttackGroundTargets,
  canAttackTarget,
  getTotalBombPoints,
} from '@engine/rules/bombing';
import {
  requiresFlightPath,
  allowsFreeMovement,
  shouldAbort,
  validateFlightPath,
} from '@engine/rules/raidPlanning';
import { FlightState, GroundUnitState, createEmptyGameState, Waypoint } from '@engine/state/GameState';

function createBomber(overrides: Partial<FlightState> = {}): FlightState {
  return {
    id: 'B-1', side: 'nato', nation: 'US', aircraftType: 'F-4E',
    genericCounterId: null, isVisuallyIdentified: true, isDummy: false,
    hex: { col: 50, row: 5 }, onHexside: false, heading: 0, altitude: 'low',
    throttle: 'combat', speed: 4, mpRemaining: 2, hasMoved: true,
    hasMovedThisPhase: true,
    aircraft: [
      { index: 1, damage: 'none', bombStrength: 5, bombStrengthRemaining: 5,
        ordnance: [], airToAirWeapons: [{ weaponId: 'Gun_M61', depleted: false }],
        crewCount: 2, crewStatus: ['ok', 'ok'] },
      { index: 2, damage: 'none', bombStrength: 5, bombStrengthRemaining: 5,
        ordnance: [], airToAirWeapons: [{ weaponId: 'Gun_M61', depleted: false }],
        crewCount: 2, crewStatus: ['ok', 'ok'] },
    ],
    task: 'bombing', raidId: 'RAID-1', flightPath: null, currentWaypointIndex: 0,
    detected: true, disordered: false, aborted: false, inDefensiveWheel: false,
    isOnGround: false, groundState: null, takeoffTurn: null, landingTurn: null,
    markers: [], pilotQuality: 'veteran', aggressionValue: 1,
    fuelUsed: 0, fuelAllowance: 5, extraFuelUsed: 0,
    ...overrides,
  };
}

function createTarget(overrides: Partial<GroundUnitState> = {}): GroundUnitState {
  return {
    id: 'TGT-1', type: 'artillery', subType: 'FRG_Artillery', side: 'wp',
    hex: { col: 51, row: 5 }, hidden: false, located: true,
    isSAMWarning: false, isDummy: false, radarOn: false,
    ammoRemaining: 0, ammoMax: 0, acquisitions: {},
    phasedArrayArc: null, active: false, concentration: null,
    damage: 'none', radarSuppressedTurns: 0, radarShutdown: false,
    aaaSuppression: 0, organicSmallArms: true, organicLightAAA: false,
    organicMobileAAA: null, organicMobileRadarOn: false,
    ...overrides,
  };
}

describe('Available Attack Profiles', () => {
  it('bomber at Low with bombs can dive bomb and level bomb', () => {
    const flight = createBomber({ altitude: 'low' });
    const state = createEmptyGameState();
    // Add hex data for LOS
    state.hexes['5005'] = { coord: { col: 50, row: 5 }, terrain: ['land'],
      isAirfield: false, airfieldClass: null, airfieldId: null, printedAAA: null, isEastGermany: false };
    state.hexes['5105'] = { coord: { col: 51, row: 5 }, terrain: ['land'],
      isAirfield: false, airfieldClass: null, airfieldId: null, printedAAA: null, isEastGermany: false };

    const profiles = getAvailableProfiles(flight, { col: 51, row: 5 }, state);
    expect(profiles).toContain('diveBombing');
    expect(profiles).toContain('levelBombing');
  });

  it('bomber at Deck can strafe with gun', () => {
    const flight = createBomber({ altitude: 'deck', throttle: 'combat' });
    const state = createEmptyGameState();
    state.hexes['5005'] = { coord: { col: 50, row: 5 }, terrain: ['land'],
      isAirfield: false, airfieldClass: null, airfieldId: null, printedAAA: null, isEastGermany: false };
    state.hexes['5105'] = { coord: { col: 51, row: 5 }, terrain: ['land'],
      isAirfield: false, airfieldClass: null, airfieldId: null, printedAAA: null, isEastGermany: false };

    const profiles = getAvailableProfiles(flight, { col: 51, row: 5 }, state);
    expect(profiles).toContain('strafe');
  });

  it('flight without bombs cannot use bomb profiles', () => {
    const flight = createBomber({
      aircraft: [{ index: 1, damage: 'none', bombStrength: 0, bombStrengthRemaining: 0,
        ordnance: [], airToAirWeapons: [], crewCount: 2, crewStatus: ['ok', 'ok'] }],
    });
    const state = createEmptyGameState();
    state.hexes['5005'] = { coord: { col: 50, row: 5 }, terrain: ['land'],
      isAirfield: false, airfieldClass: null, airfieldId: null, printedAAA: null, isEastGermany: false };

    const profiles = getAvailableProfiles(flight, { col: 51, row: 5 }, state);
    expect(profiles).not.toContain('diveBombing');
    expect(profiles).not.toContain('levelBombing');
  });
});

describe('Air-to-Ground Attack Resolution', () => {
  it('produces valid attack result', () => {
    const flight = createBomber();
    const target = createTarget();
    const result = resolveAirToGroundAttack(flight, target, 'diveBombing', 10, 'C', 0, 0);

    expect(result.attackerId).toBe('B-1');
    expect(result.targetId).toBe('TGT-1');
    expect(result.profile).toBe('diveBombing');
    expect(result.attackSuccess).toBeGreaterThanOrEqual(0);
  });

  it('dive bombing has +1 profile modifier', () => {
    const flight = createBomber();
    const target = createTarget();
    const result = resolveAirToGroundAttack(flight, target, 'diveBombing', 10, 'C', 0, 0);
    expect(result.modifiers['profile']).toBe(1);
  });

  it('target profile A gives -4 modifier', () => {
    const flight = createBomber();
    const target = createTarget();
    const result = resolveAirToGroundAttack(flight, target, 'levelBombing', 10, 'A', 0, 0);
    expect(result.modifiers['target_profile']).toBe(-4);
  });

  it('target profile D gives +2 modifier', () => {
    const flight = createBomber();
    const target = createTarget();
    const result = resolveAirToGroundAttack(flight, target, 'levelBombing', 10, 'D', 0, 0);
    expect(result.modifiers['target_profile']).toBe(2);
  });

  it('AAA modifier is applied', () => {
    const flight = createBomber();
    const target = createTarget();
    const result = resolveAirToGroundAttack(flight, target, 'levelBombing', 10, 'C', -3, 0);
    expect(result.modifiers['aaa']).toBe(-3);
  });
});

describe('Ground Target Damage', () => {
  it('attack success 0 = no damage roll', () => {
    const result = resolveGroundDamage('TGT-1', 0);
    expect(result.result).toBe('noEffect');
    expect(result.roll).toBe(0);
  });

  it('positive attack success produces a damage result', () => {
    const result = resolveGroundDamage('TGT-1', 2);
    expect(['noEffect', 'slight', 'heavy', 'totalDestruction']).toContain(result.result);
  });
});

describe('Apply Ground Damage', () => {
  it('slight damage suppresses SAM', () => {
    const sam = createTarget({ type: 'sam', subType: 'SA-6' });
    const result = applyGroundDamage(sam, 'slight');
    expect(result.radarSuppressedTurns).toBeGreaterThan(0);
    expect(result.radarOn).toBe(false);
  });

  it('heavy damage shuts down SAM radar permanently', () => {
    const sam = createTarget({ type: 'sam', subType: 'SA-6', radarOn: true });
    const result = applyGroundDamage(sam, 'heavy');
    expect(result.radarShutdown).toBe(true);
    expect(result.damage).toBe('heavy');
  });

  it('total destruction destroys unit', () => {
    const unit = createTarget();
    const result = applyGroundDamage(unit, 'totalDestruction');
    expect(result.damage).toBe('destroyed');
    expect(result.active).toBe(false);
  });

  it('slight damage suppresses AAA concentration', () => {
    const aaa = createTarget({ type: 'aaaConcentation', aaaSuppression: 0 });
    const result = applyGroundDamage(aaa, 'slight');
    expect(result.aaaSuppression).toBe(1);
  });
});

describe('Ordnance Jettison', () => {
  it('rolls for each aircraft', () => {
    const flight = createBomber();
    const results = rollJettisonCheck(flight);
    expect(results).toHaveLength(2);
    for (const r of results) {
      expect(typeof r.jettisoned).toBe('boolean');
    }
  });

  it('skips aircraft with no ordnance', () => {
    const flight = createBomber({
      aircraft: [{ index: 1, damage: 'none', bombStrength: 0, bombStrengthRemaining: 0,
        ordnance: [], airToAirWeapons: [], crewCount: 1, crewStatus: ['ok'] }],
    });
    const results = rollJettisonCheck(flight);
    expect(results[0].jettisoned).toBe(false);
    expect(results[0].roll).toBe(0);
  });
});

describe('Task Restrictions', () => {
  it('bombing task allows ground attacks', () => {
    const flight = createBomber({ task: 'bombing' });
    expect(canAttackGroundTargets(flight)).toBe(true);
  });

  it('CAP task does not allow ground attacks', () => {
    const flight = createBomber({ task: 'cap' });
    expect(canAttackGroundTargets(flight)).toBe(false);
  });

  it('bombing can attack targets in raid hex', () => {
    const flight = createBomber({ task: 'bombing' });
    expect(canAttackTarget(flight, 'artillery', true, 0)).toBe(true);
  });

  it('bombing can attack AAA/SAM within 2 hexes of raid target', () => {
    const flight = createBomber({ task: 'bombing' });
    expect(canAttackTarget(flight, 'sam', false, 2)).toBe(true);
    expect(canAttackTarget(flight, 'sam', false, 3)).toBe(false);
  });

  it('SEAD can attack any AAA/SAM/EWR', () => {
    const flight = createBomber({ task: 'sead' });
    expect(canAttackTarget(flight, 'sam', false, 20)).toBe(true);
    expect(canAttackTarget(flight, 'ewr', false, 20)).toBe(true);
    expect(canAttackTarget(flight, 'armor', false, 20)).toBe(false);
  });
});

describe('Bomb Points', () => {
  it('calculates total bomb points', () => {
    const flight = createBomber();
    expect(getTotalBombPoints(flight)).toBe(10); // 2 aircraft × 5 points
  });
});

describe('Raid Planning', () => {
  it('bombing requires flight path', () => {
    expect(requiresFlightPath('bombing')).toBe(true);
    expect(requiresFlightPath('recon')).toBe(true);
  });

  it('CAP allows free movement', () => {
    expect(allowsFreeMovement('cap')).toBe(true);
    expect(allowsFreeMovement('sead')).toBe(true);
  });

  it('validates flight path waypoints', () => {
    const waypoints: Waypoint[] = [
      { hex: { col: 30, row: 5 }, type: 'ingress' },
      { hex: { col: 40, row: 5 }, type: 'release' },
      { hex: { col: 45, row: 5 }, type: 'rejoin' },
      { hex: { col: 30, row: 5 }, type: 'egress' },
    ];
    const result = validateFlightPath(waypoints, 'bombing');
    expect(result.valid).toBe(true);
  });

  it('rejects flight path missing required waypoints', () => {
    const waypoints: Waypoint[] = [
      { hex: { col: 30, row: 5 }, type: 'ingress' },
      { hex: { col: 30, row: 5 }, type: 'egress' },
    ];
    const result = validateFlightPath(waypoints, 'bombing');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('Abort Conditions', () => {
  it('bomber aborts when all ordnance jettisoned', () => {
    const flight = createBomber({
      task: 'bombing',
      aircraft: [{ index: 1, damage: 'none', bombStrength: 0, bombStrengthRemaining: 0,
        ordnance: [], airToAirWeapons: [], crewCount: 1, crewStatus: ['ok'] }],
    });
    expect(shouldAbort(flight).abort).toBe(true);
  });

  it('bomber does not abort with ordnance remaining', () => {
    expect(shouldAbort(createBomber()).abort).toBe(false);
  });

  it('CAP aborts when all weapons depleted', () => {
    const flight = createBomber({
      task: 'cap',
      aircraft: [{ index: 1, damage: 'none', bombStrength: 0, bombStrengthRemaining: 0,
        ordnance: [], airToAirWeapons: [{ weaponId: 'AIM-7M', depleted: true }],
        crewCount: 1, crewStatus: ['ok'] }],
    });
    expect(shouldAbort(flight).abort).toBe(true);
  });

  it('recon aborts if aircraft crippled', () => {
    const flight = createBomber({
      task: 'recon',
      aircraft: [{ index: 1, damage: 'crippled', bombStrength: 0, bombStrengthRemaining: 0,
        ordnance: [], airToAirWeapons: [], crewCount: 1, crewStatus: ['ok'] }],
    });
    expect(shouldAbort(flight).abort).toBe(true);
  });
});

describe('ARM Attack', () => {
  it('produces valid ARM attack result', () => {
    const flight = createBomber();
    const target = createTarget({ type: 'sam', subType: 'SA-6', radarOn: true });
    const result = resolveARMAttack(flight, target, 'HARM', false);
    expect(result.attackerId).toBe('B-1');
    expect(result.attackSuccess).toBeGreaterThanOrEqual(0);
  });

  it('shutdown target gets -4 modifier', () => {
    const flight = createBomber();
    const target = createTarget({ type: 'sam', subType: 'SA-6' });
    const result = resolveARMAttack(flight, target, 'HARM', true);
    expect(result.modifiers['shutdown']).toBe(-4);
  });
});
